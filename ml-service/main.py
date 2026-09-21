"""Service FastAPI exposant le moteur de recommandation hybride Me-Antsena.

Endpoints :
  GET  /health                     - état du service et des modèles chargés
  GET  /recommendations/{user_id}  - top-K recommandations hybrides pour un utilisateur
  GET  /similar/{product_id}       - top-K produits similaires (content-based)
  POST /train                      - relance l'entraînement depuis Supabase et recharge les modèles
  GET  /evaluate                   - Precision@K, Recall@K, RMSE sur un split train/test

Gestion du démarrage à froid (cold-start) :
  - Utilisateur inconnu du modèle collaboratif mais ayant déjà quelques
    interactions live (pas encore prises en compte par le dernier /train) :
    repli sur le content-based à partir de ces interactions récentes
    (source = "content_cold_start").
  - Utilisateur totalement inconnu (zéro interaction) : repli sur la
    popularité globale, calculée par le modèle collaboratif lui-même
    (source = "popularity_fallback").
  - Produit inconnu du modèle content-based (créé après le dernier /train) :
    indexé à la volée avec le vectoriseur déjà entraîné, sans ré-entraînement
    complet (voir `ContentBasedModel.add_product`).
"""

import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data import fetch_product_by_id, fetch_products, fetch_user_interactions, get_supabase_client
from evaluation import run_evaluation
from models import HybridRecommender
from train import load_artifacts, train_and_save

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("me-antsena-ml")

state = {
    "cf": None,
    "cb": None,
    "hybrid": HybridRecommender(),
    "products_by_id": {},
}


def _refresh_state() -> None:
    """Recharge les modèles depuis les artefacts pkl et rafraîchit le catalogue produits."""
    cf, cb = load_artifacts()
    state["cf"] = cf
    state["cb"] = cb
    try:
        supabase = get_supabase_client()
        products = fetch_products(supabase)
        state["products_by_id"] = {int(p["id"]): p for p in products}
    except Exception as exc:  # noqa: BLE001 - le service doit rester utilisable sans catalogue frais
        logger.warning("Impossible de rafraîchir le catalogue produits au démarrage: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _refresh_state()
    yield


app = FastAPI(
    title="Me-Antsena ML Service",
    description="Moteur de recommandation hybride (filtrage collaboratif + basé contenu)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecommendationItem(BaseModel):
    product_id: int
    score: float


class RecommendationResponse(BaseModel):
    user_id: str
    source: str  # "hybrid" | "content_cold_start" | "popularity_fallback"
    items: List[RecommendationItem]
    # Décomposition par approche, pour la comparaison pédagogique (page Recommandations du frontend)
    collaborative: List[RecommendationItem] = []
    content: List[RecommendationItem] = []
    hybrid: List[RecommendationItem] = []


class SimilarResponse(BaseModel):
    product_id: int
    items: List[RecommendationItem]


class TrainResponse(BaseModel):
    status: str
    n_users: int
    n_items: int


class EvaluationResponse(BaseModel):
    k: int
    test_ratio: float
    n_train_interactions: int
    n_test_interactions: int
    precision_at_k: float
    recall_at_k: float
    n_users_evaluated_precision_recall: int
    rmse: float
    n_pairs_evaluated_rmse: int


EVALUATION_HISTORY_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "artifacts", "evaluation_history.json"
)


def _append_evaluation_history(result: dict) -> None:
    """Archive chaque évaluation avec un horodatage, pour pouvoir citer l'évolution
    des métriques dans le mémoire (Chapitre 4) sans avoir à relancer les calculs."""
    history = []
    if os.path.exists(EVALUATION_HISTORY_PATH):
        try:
            with open(EVALUATION_HISTORY_PATH, "r", encoding="utf-8") as f:
                history = json.load(f)
        except (json.JSONDecodeError, OSError):
            history = []
    history.append({"timestamp": datetime.now(timezone.utc).isoformat(), **result})
    os.makedirs(os.path.dirname(EVALUATION_HISTORY_PATH), exist_ok=True)
    with open(EVALUATION_HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


@app.get("/health")
def health():
    cf, cb = state["cf"], state["cb"]
    return {
        "status": "ok",
        "collaborative_loaded": cf is not None and cf.user_embeddings is not None,
        "content_based_loaded": cb is not None and cb.product_features is not None,
        "n_products_cached": len(state["products_by_id"]),
    }


def _popularity_items(cf, top_k: int) -> List[RecommendationItem]:
    ranked = cf.item_popularity_rank[:top_k] if cf is not None else []
    return [RecommendationItem(product_id=pid, score=0.0) for pid in ranked]


@app.get("/recommendations/{user_id}", response_model=RecommendationResponse)
def get_recommendations(user_id: str, top_k: int = Query(10, ge=1, le=50)):
    """Renvoie les 3 approches séparément (collaboratif, contenu, hybride), pour la page
    de comparaison pédagogique du frontend, en plus de `items` (= la meilleure vue disponible)."""
    cf, cb = state["cf"], state["cb"]
    if cf is None or cb is None:
        raise HTTPException(503, "Modèles non entraînés. Appeler POST /train d'abord.")

    if cf.is_known_user(user_id):
        cf_preds = cf.predict(user_id, top_k=top_k * 2, cold_start_fallback=False)
        cf_items = [RecommendationItem(product_id=pid, score=score) for pid, score in cf_preds[:top_k]]

        cb_preds: List[tuple] = []
        if cb.product_features is not None and cf_preds:
            seed_ids = [pid for pid, _ in cf_preds[:top_k]]
            cb_preds = cb.recommend_from_history(seed_ids, top_k=top_k * 2)
        cb_items = [RecommendationItem(product_id=pid, score=score) for pid, score in cb_preds[:top_k]]

        combined = state["hybrid"].recommend(cf_preds, cb_preds, top_k=top_k)
        if combined:
            hybrid_items = [RecommendationItem(product_id=pid, score=score) for pid, score in combined]
        else:
            hybrid_items = _popularity_items(cf, top_k)

        return RecommendationResponse(
            user_id=user_id,
            source="hybrid",
            items=hybrid_items,
            collaborative=cf_items or _popularity_items(cf, top_k),
            content=cb_items or _popularity_items(cf, top_k),
            hybrid=hybrid_items,
        )

    # --- Cold-start utilisateur : inconnu du modèle collaboratif entraîné ---
    # On tente d'abord un vrai repli content-based à partir des interactions
    # live de l'utilisateur (ex. inscrit puis a mis 2 favoris avant le prochain
    # /train) : c'est une recommandation personnalisée, pas de la popularité.
    seed_ids: List[int] = []
    try:
        supabase = get_supabase_client()
        recent = fetch_user_interactions(supabase, user_id)
        seed_ids = [int(it["product_id"]) for it in recent if it.get("product_id") is not None]
    except Exception as exc:  # noqa: BLE001
        logger.warning("Impossible de récupérer les interactions live de %s: %s", user_id, exc)

    cb_preds = (
        cb.recommend_from_history(seed_ids, top_k=top_k)
        if seed_ids and cb.product_features is not None
        else []
    )

    popularity_items = _popularity_items(cf, top_k)

    if cb_preds:
        cb_items = [RecommendationItem(product_id=pid, score=score) for pid, score in cb_preds]
        return RecommendationResponse(
            user_id=user_id,
            source="content_cold_start",
            items=cb_items,
            collaborative=popularity_items,  # le collaboratif n'a structurellement aucun signal ici
            content=cb_items,
            hybrid=cb_items,
        )

    # Aucune interaction connue, même live : repli popularité pur.
    return RecommendationResponse(
        user_id=user_id,
        source="popularity_fallback",
        items=popularity_items,
        collaborative=popularity_items,
        content=popularity_items,
        hybrid=popularity_items,
    )


@app.get("/similar/{product_id}", response_model=SimilarResponse)
def get_similar(product_id: int, top_k: int = Query(10, ge=1, le=50)):
    cb = state["cb"]
    if cb is None or cb.product_features is None:
        raise HTTPException(503, "Modèle content-based non entraîné. Appeler POST /train d'abord.")

    if product_id not in cb.product_index:
        # Cold-start produit : créé après le dernier /train. On l'indexe à la
        # volée avec le vectoriseur déjà entraîné, sans tout ré-entraîner.
        try:
            supabase = get_supabase_client()
            product = fetch_product_by_id(supabase, product_id)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(502, f"Impossible de récupérer le produit {product_id}: {exc}") from exc
        if product is None:
            raise HTTPException(404, f"Produit {product_id} introuvable.")
        cb.add_product(product)

    preds = cb.get_similar_products(product_id, top_k=top_k)
    items = [RecommendationItem(product_id=pid, score=score) for pid, score in preds]
    return SimilarResponse(product_id=product_id, items=items)


@app.post("/train", response_model=TrainResponse)
def train():
    try:
        n_users, n_items = train_and_save()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Échec de l'entraînement")
        raise HTTPException(500, f"Échec de l'entraînement: {exc}") from exc

    _refresh_state()
    return TrainResponse(status="trained", n_users=n_users, n_items=n_items)


@app.get("/evaluate", response_model=EvaluationResponse)
def evaluate(
    k: int = Query(10, ge=1, le=50),
    test_ratio: float = Query(0.2, gt=0.0, lt=0.9),
):
    """Split train/test, entraîne un modèle temporaire et calcule Precision@K, Recall@K, RMSE.

    Utilise `cold_start_fallback=False` en interne (via evaluation.py) : seuls les
    utilisateurs réellement connus du modèle entraîné sur le train set sont notés,
    pour ne pas fausser les métriques avec des recommandations de repli.
    N'affecte pas les artefacts de production servis par /recommendations.
    Chaque appel est archivé dans artifacts/evaluation_history.json.
    """
    try:
        result = run_evaluation(k=k, test_ratio=test_ratio)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Échec de l'évaluation")
        raise HTTPException(500, f"Échec de l'évaluation: {exc}") from exc

    _append_evaluation_history(result)
    return EvaluationResponse(**result)
