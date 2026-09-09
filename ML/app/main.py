from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import Client, create_client

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env.local")
load_dotenv(BASE_DIR / ".env")

WEIGHTS = {
    "view": 0.35,
    "add_to_cart": 0.8,
    "purchase": 1.6,
    "review": 1.2,
    "favorite": 0.7,
}

DEFAULT_IMAGE = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"

app = FastAPI(title="Me-Antsena Recommendation Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _normalize_id(value: Any) -> str:
    return str(value).strip()


def _parse_json(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value if v is not None]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(v) for v in parsed if v is not None]
        except Exception:
            pass
        return [part.strip() for part in value.split(",") if part.strip()]
    return [str(value)]


def _fallback_products() -> List[Dict[str, Any]]:
    return [
        {"id": 1, "name": "Casque Bluetooth SoundPro X1", "description": "Casque sans fil confortable avec réduction de bruit.", "category": "Électronique", "price": 120000, "stock": 45, "tags": ["audio", "bluetooth", "casque"], "images": ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"]},
        {"id": 2, "name": "Sac à dos tendance", "description": "Sac pratique pour le travail, les études et les sorties quotidiennes.", "category": "Mode", "price": 85000, "stock": 30, "tags": ["sac", "mode", "quotidien"], "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80"]},
        {"id": 3, "name": "Montre connectée Fit 3", "description": "Montre connectée, suivi d'activité et notifications.", "category": "Électronique", "price": 110000, "stock": 20, "tags": ["montre", "sport", "smartwatch"], "images": ["https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80"]},
        {"id": 4, "name": "Lampe LED moderne", "description": "Lampe LED minimaliste pour bureau ou chambre.", "category": "Maison", "price": 45000, "stock": 60, "tags": ["lampe", "bureau", "maison"], "images": ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80"]},
        {"id": 5, "name": "Baskets Urban Run", "description": "Baskets légères pensées pour la marche et le running.", "category": "Sports", "price": 165000, "stock": 18, "tags": ["chaussures", "sport", "running"], "images": ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"]},
        {"id": 6, "name": "Montre classique Élégance", "description": "Montre au design intemporel et élégant.", "category": "Mode", "price": 98000, "stock": 12, "tags": ["montre", "élégance", "mode"], "images": ["https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80"]},
        {"id": 7, "name": "Sneakers Nova", "description": "Sneakers confortables, semelle souple et style urbain.", "category": "Sports", "price": 145000, "stock": 25, "tags": ["sneakers", "sport", "mode"], "images": ["https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80"]},
        {"id": 8, "name": "Sac cuir Premium", "description": "Sac premium avec finition élégante et compartiments pratiques.", "category": "Mode", "price": 185000, "stock": 8, "tags": ["cuir", "sac", "premium"], "images": ["https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=80"]},
        {"id": 9, "name": "T-shirt Essential", "description": "T-shirt confortable en coton, facile à porter au quotidien.", "category": "Mode", "price": 55000, "stock": 100, "tags": ["tshirt", "mode", "essentiel"], "images": ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"]},
        {"id": 10, "name": "Clavier mécanique", "description": "Clavier mécanique compact pour le travail et le gaming.", "category": "Électronique", "price": 135000, "stock": 16, "tags": ["clavier", "gaming", "ordinateur"], "images": ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80"]},
    ]


def _get_supabase_client() -> Client | None:
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
    if not url or not key:
        return None
    try:
        return create_client(url, key)
    except Exception:
        return None


def _load_live_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    client = _get_supabase_client()
    if client is None:
        return pd.DataFrame(), pd.DataFrame()

    try:
        products_response = client.table("products").select(
            "id,name,description,price,stock,category_id,tags,images,created_at,category:categories(name)"
        ).execute()
        interactions_response = client.table("interactions").select(
            "user_id,product_id,type,value,created_at"
        ).execute()
    except Exception:
        return pd.DataFrame(), pd.DataFrame()

    products = products_response.data or []
    interactions = interactions_response.data or []

    products_df = pd.DataFrame(products)
    if not products_df.empty:
        products_df["id"] = products_df["id"].astype(str)
        products_df["category"] = products_df.apply(
            lambda row: (row.get("category") or {}).get("name") or "Autres",
            axis=1,
        )
        products_df["tags"] = products_df["tags"].apply(_parse_json)
        products_df["images"] = products_df["images"].apply(_parse_json)
        products_df["name"] = products_df["name"].fillna("")
        products_df["description"] = products_df["description"].fillna("")

    interactions_df = pd.DataFrame(interactions)
    if not interactions_df.empty:
        interactions_df["user_id"] = interactions_df["user_id"].fillna("anonymous").astype(str)
        interactions_df["product_id"] = interactions_df["product_id"].fillna(0).astype(str)
        interactions_df["type"] = interactions_df["type"].fillna("view").astype(str)
        interactions_df["value"] = pd.to_numeric(interactions_df["value"], errors="coerce").fillna(1.0)

    return products_df, interactions_df


def _fallback_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    products = pd.DataFrame(_fallback_products())
    products["id"] = products["id"].astype(str)
    products["category"] = products["category"].fillna("Autres")
    products["tags"] = products["tags"].apply(lambda tags: list(tags) if isinstance(tags, list) else [tags])
    products["images"] = products["images"].apply(lambda imgs: list(imgs) if isinstance(imgs, list) else [imgs])
    products["name"] = products["name"].fillna("")
    products["description"] = products["description"].fillna("")

    interactions = pd.DataFrame(
        [
            {"user_id": "u-1", "product_id": "1", "type": "view", "value": 1.0},
            {"user_id": "u-1", "product_id": "2", "type": "add_to_cart", "value": 1.0},
            {"user_id": "u-1", "product_id": "3", "type": "purchase", "value": 1.0},
            {"user_id": "u-2", "product_id": "1", "type": "view", "value": 1.0},
            {"user_id": "u-2", "product_id": "3", "type": "view", "value": 1.0},
            {"user_id": "u-2", "product_id": "5", "type": "review", "value": 5.0},
            {"user_id": "u-3", "product_id": "5", "type": "view", "value": 1.0},
            {"user_id": "u-3", "product_id": "7", "type": "add_to_cart", "value": 1.0},
            {"user_id": "u-3", "product_id": "10", "type": "purchase", "value": 1.0},
            {"user_id": "u-4", "product_id": "9", "type": "view", "value": 1.0},
            {"user_id": "u-4", "product_id": "2", "type": "view", "value": 1.0},
            {"user_id": "u-4", "product_id": "8", "type": "favorite", "value": 1.0},
        ]
    )
    return products, interactions


def _get_dataset() -> tuple[pd.DataFrame, pd.DataFrame]:
    products_df, interactions_df = _load_live_data()
    if products_df.empty or interactions_df.empty:
        return _fallback_data()
    return products_df, interactions_df


def _normalize_series(series: pd.Series) -> pd.Series:
    s = series.copy().astype(float)
    if s.empty:
        return s
    if s.max() == s.min():
        return s / (s.max() if s.max() != 0 else 1.0)
    return (s - s.min()) / (s.max() - s.min())


def _build_feature_text(row: pd.Series) -> str:
    payload = [
        str(row.get("name", "")),
        str(row.get("description", "")),
        str(row.get("category", "")),
        " ".join(_parse_json(row.get("tags"))),
    ]
    return " ".join(part for part in payload if part).lower()


def _format_product(row: pd.Series, score: float, reason: str) -> Dict[str, Any]:
    images = _parse_json(row.get("images"))
    tags = _parse_json(row.get("tags"))
    product_id = row.get("id", row.name)
    product = {
        "id": int(product_id) if str(product_id).isdigit() else product_id,
        "name": row.get("name") or "Produit",
        "description": row.get("description") or "",
        "price": float(row.get("price", 0) or 0),
        "category": row.get("category") or "Autres",
        "stock": int(row.get("stock", 0) or 0),
        "image": images[0] if images else DEFAULT_IMAGE,
        "images": images or [DEFAULT_IMAGE],
        "tags": tags,
        "rating": float(row.get("rating", 0) or 0),
        "reviews": int(row.get("reviews", 0) or 0),
        "oldPrice": max(float(row.get("price", 0) or 0), float(row.get("price", 0) or 0)),
        "score": float(score),
        "reason": reason,
    }
    return product


def _collaborative_scores(user_id: str, products_df: pd.DataFrame, interactions_df: pd.DataFrame) -> pd.Series:
    interactions_df = interactions_df.copy()
    interactions_df["weighted"] = interactions_df["type"].map(WEIGHTS).fillna(0.2) * pd.to_numeric(interactions_df["value"], errors="coerce").fillna(1.0)
    user_product = interactions_df.groupby(["user_id", "product_id"], as_index=False)["weighted"].sum()
    matrix = user_product.pivot(index="user_id", columns="product_id", values="weighted").fillna(0.0)

    if matrix.empty or user_id not in matrix.index:
        return pd.Series(dtype=float)

    similarity_matrix = cosine_similarity(matrix.values)
    user_index = matrix.index.get_loc(user_id)
    user_similarity = similarity_matrix[user_index]
    ranked_users = np.argsort(user_similarity)[::-1]

    scores = np.zeros(len(matrix.columns), dtype=float)
    seen_products = matrix.loc[user_id].to_numpy() > 0
    for other_index in ranked_users:
        if other_index == user_index:
            continue
        similarity = float(user_similarity[other_index])
        if similarity <= 0:
            continue
        user_vector = matrix.iloc[other_index].to_numpy()
        scores += similarity * user_vector

    scores[seen_products] = 0.0
    result = pd.Series(scores, index=matrix.columns, dtype=float)
    return result.reindex(products_df["id"].astype(str), fill_value=0.0)


def _content_scores(user_id: str, products_df: pd.DataFrame, interactions_df: pd.DataFrame) -> pd.Series:
    if products_df.empty:
        return pd.Series(dtype=float)

    products_df = products_df.copy()
    products_df["content_text"] = products_df.apply(_build_feature_text, axis=1)
    tfidf = TfidfVectorizer(stop_words=["de", "la", "le", "les", "et", "pour", "dans", "avec"], lowercase=True)
    vectors = tfidf.fit_transform(products_df["content_text"])
    product_ids = products_df["id"].astype(str)

    seen = interactions_df[interactions_df["user_id"] == user_id]["product_id"].astype(str).dropna().unique()
    if len(seen) == 0:
        popularity = interactions_df.groupby("product_id").size().reindex(product_ids, fill_value=0).astype(float)
        return popularity

    seen_mask = product_ids.isin(seen)
    if seen_mask.any():
        user_profile = vectors[seen_mask.to_numpy()].mean(axis=0)
        scores = cosine_similarity(np.asarray(user_profile), vectors).ravel()
    else:
        scores = np.zeros(len(products_df), dtype=float)

    result = pd.Series(scores, index=product_ids, dtype=float)
    result = result.reindex(product_ids, fill_value=0.0)
    return result


def _build_reason_for_collaborative(product_id: str, products_df: pd.DataFrame, interactions_df: pd.DataFrame) -> str:
    history = interactions_df[interactions_df["product_id"] == product_id]
    if history.empty:
        return "Utilisateurs similaires ont apprécié ce produit"
    top_pairs = history.sort_values("value", ascending=False).head(1)
    return f"Les utilisateurs similaires ont aimé {top_pairs['product_id'].iloc[0]}"


def _build_reason_for_content(user_id: str, product_id: str, interactions_df: pd.DataFrame) -> str:
    if user_id in interactions_df["user_id"].values:
        history = interactions_df[(interactions_df["user_id"] == user_id) & (interactions_df["product_id"] != product_id)]
        if not history.empty:
            first = history.sort_values("value", ascending=False).head(1)
            return f"Recommandé car vous avez consulté {first['product_id'].iloc[0]}"
    return "Recommandé selon vos dernières consultations"


def _build_choices(user_id: str, products_df: pd.DataFrame, interactions_df: pd.DataFrame, limit: int = 6) -> Dict[str, List[Dict[str, Any]]]:
    product_index = products_df.copy()
    product_index["id"] = product_index["id"].astype(str)

    collaborative_scores = _collaborative_scores(user_id, product_index, interactions_df)
    content_scores = _content_scores(user_id, product_index, interactions_df)

    if collaborative_scores.empty:
        collaborative_scores = pd.Series(0.0, index=product_index["id"].astype(str), dtype=float)
    if content_scores.empty:
        content_scores = pd.Series(0.0, index=product_index["id"].astype(str), dtype=float)

    collaborative_norm = _normalize_series(collaborative_scores)
    content_norm = _normalize_series(content_scores)
    hybrid_scores = 0.65 * collaborative_norm + 0.35 * content_norm

    def rank_records(title: str, series: pd.Series, reason_builder: callable, fallback_reason: str) -> List[Dict[str, Any]]:
        candidates = product_index.set_index("id").join(series.rename("score").to_frame())
        candidates = candidates[candidates["score"] > 0].sort_values("score", ascending=False).head(limit)
        if candidates.empty:
            candidates = product_index.head(limit).copy()
            candidates["score"] = 1.0 / np.arange(1, len(candidates) + 1)
        output = []
        for _, row in candidates.iterrows():
            score = float(row.get("score", 0.0))
            product_id = str(row.name if row.name is not None else row.get("id", ""))
            reason = reason_builder(user_id, product_id, interactions_df) if callable(reason_builder) else fallback_reason
            output.append(_format_product(row, score, reason))
        return output

    collaborative_list = rank_records(
        "collaborative",
        collaborative_norm,
        lambda uid, product_id, df: f"Les utilisateurs similaires ont aimé la sélection {product_id}",
        "Les utilisateurs similaires ont apprécié ce produit",
    )
    content_list = rank_records(
        "content",
        content_norm,
        lambda uid, product_id, df: _build_reason_for_content(uid, product_id, df),
        "Recommandé selon vos consultations récentes",
    )
    hybrid_list = rank_records(
        "hybrid",
        hybrid_scores,
        lambda uid, product_id, df: _build_reason_for_content(uid, product_id, df),
        "Score hybride optimisé entre contenu et similarité",
    )

    return {
        "collaborative": collaborative_list,
        "content": content_list,
        "hybrid": hybrid_list,
    }


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/recommendations")
def get_recommendations_endpoint(user_id: str = Query(default="demo-user"), limit: int = Query(default=6, ge=1, le=12)) -> Dict[str, Any]:
    products_df, interactions_df = _get_dataset()
    if products_df.empty:
        return {"user_id": user_id, "cold_start": True, "collaborative": [], "content": [], "hybrid": []}
    recommendations = _build_choices(user_id, products_df, interactions_df, limit=limit)
    return {"user_id": user_id, "cold_start": user_id not in set(interactions_df["user_id"].astype(str).unique()), "generated_at": datetime.now(timezone.utc).isoformat(), **recommendations}


@app.get("/recommendations/{user_id}")
def get_recommendations_by_user(user_id: str, limit: int = Query(default=6, ge=1, le=12)) -> Dict[str, Any]:
    return get_recommendations_endpoint(user_id=user_id, limit=limit)


@app.get("/demo")
def demo() -> Dict[str, Any]:
    products_df, interactions_df = _fallback_data()
    return _build_choices("u-1", products_df, interactions_df, limit=6)


def _evaluate_leave_one_out(interactions_df: pd.DataFrame, products_df: pd.DataFrame, k_values=(1,3,5,10)) -> Dict[str, Any]:
    """Compute Precision@K and Recall@K using a simple leave-one-out strategy.
    We treat interactions of type 'purchase' as ground-truth positives; if none exist for a user we skip that user.
    """
    if interactions_df.empty:
        return {"error": "no interactions"}

    results = {f"P@{k}": [] for k in k_values}
    results.update({f"R@{k}": [] for k in k_values})
    users = interactions_df["user_id"].astype(str).unique()

    for user in users:
        user_hist = interactions_df[interactions_df["user_id"].astype(str) == user]
        # consider only purchases as ground truth
        purchases = user_hist[user_hist["type"] == "purchase"]["product_id"].astype(str).unique()
        if len(purchases) == 0:
            continue
        # if user has only one purchase, proceed with leave-one-out if they have other interactions
        if len(purchases) < 1:
            continue
        # choose a holdout purchase (last one by created_at if available)
        holdout = purchases[-1]
        # build train interactions by removing the holdout purchase row (only one instance)
        mask = ~((interactions_df["user_id"].astype(str) == user) & (interactions_df["product_id"].astype(str) == holdout) & (interactions_df["type"] == "purchase"))
        train_interactions = interactions_df[mask]
        # generate recommendations using train set
        try:
            recs = _build_choices(user, products_df, train_interactions, limit=max(k_values))
        except Exception:
            continue
        # flatten recommended ids from hybrid (use hybrid for evaluation)
        rec_ids = [str(p["id"]) for p in recs.get("hybrid", [])]
        for k in k_values:
            topk = rec_ids[:k]
            hit = 1 if str(holdout) in topk else 0
            results[f"P@{k}"].append(hit)
            # recall is hit divided by number of relevant items (we use 1 since we held out one)
            results[f"R@{k}"].append(hit)

    summary = {}
    for k in k_values:
        p_list = results[f"P@{k}"]
        r_list = results[f"R@{k}"]
        summary[f"P@{k}"] = float(np.mean(p_list)) if p_list else None
        summary[f"R@{k}"] = float(np.mean(r_list)) if r_list else None
        summary[f"n_eval_users@{k}"] = len(p_list)

    return summary


@app.get("/eval")
def eval_endpoint(limit: int = Query(default=5, ge=1, le=20)) -> Dict[str, Any]:
    """Run a quick offline evaluation and return Precision@K / Recall@K for the demo/live dataset."""
    products_df, interactions_df = _get_dataset()
    if interactions_df.empty:
        return {"error": "no interactions available for evaluation"}
    k_values = (1, 3, 5, limit)
    metrics = _evaluate_leave_one_out(interactions_df, products_df, k_values=k_values)
    return {"metrics": metrics, "dataset_users": int(interactions_df["user_id"].nunique()), "dataset_interactions": int(len(interactions_df))}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("ML.app.main:app", host="0.0.0.0", port=8000, reload=True)
