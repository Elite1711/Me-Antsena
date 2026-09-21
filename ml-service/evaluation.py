"""Évaluation quantitative du moteur de recommandation.

Implémente le protocole expérimental exigé par le cahier des charges
(Chapitre 2 : séparation entraînement/test ; Chapitre 4 : résultats) :
  - split train/test des interactions
  - Precision@K et Recall@K sur les items jugés pertinents du test set
  - RMSE entre score prédit et poids d'interaction réel

Ce module entraîne un modèle collaboratif *temporaire* sur le split
d'entraînement, séparé des artefacts de production (qui restent entraînés
sur 100 % des données pour servir les vraies recommandations).
"""

import random
from typing import Dict, List, Tuple

import numpy as np

from data import build_interaction_matrix, fetch_interactions, fetch_products, get_supabase_client
from models import CollaborativeFilteringModel

# Poids reflétant l'intensité de chaque type d'interaction (identique à data.py).
INTERACTION_WEIGHTS = {"view": 1.0, "favorite": 2.0, "add_to_cart": 2.5, "purchase": 5.0}

# Une simple vue est trop faible pour juger la pertinence d'une recommandation :
# seules les interactions à engagement fort comptent comme "pertinentes" pour Precision/Recall.
RELEVANT_TYPES = ("favorite", "add_to_cart", "purchase")


def train_test_split_interactions(
    interactions: List[dict], test_ratio: float = 0.2, seed: int = 42
) -> Tuple[List[dict], List[dict]]:
    """Sépare les interactions en ensembles d'entraînement et de test (split aléatoire par interaction)."""
    rng = random.Random(seed)
    shuffled = interactions[:]
    rng.shuffle(shuffled)
    n_test = int(len(shuffled) * test_ratio)
    test = shuffled[:n_test]
    train = shuffled[n_test:]
    return train, test


def _relevant_items_by_user(test_interactions: List[dict]) -> Dict[str, set]:
    """Pour chaque utilisateur du test set, l'ensemble des produits jugés pertinents."""
    relevant: Dict[str, set] = {}
    for it in test_interactions:
        uid = str(it.get("user_id"))
        pid = it.get("product_id")
        t = (it.get("type") or "").lower()
        if pid is None or t not in RELEVANT_TYPES:
            continue
        relevant.setdefault(uid, set()).add(int(pid))
    return relevant


def precision_recall_at_k(
    cf: CollaborativeFilteringModel, test_interactions: List[dict], k: int = 10
) -> Tuple[float, float, int]:
    """Precision@K et Recall@K moyennés sur les utilisateurs du test set connus du modèle.

    Un utilisateur absent du train set (cold-start) est hors périmètre de cette
    évaluation : le cahier des charges traite le cold-start comme une limite
    distincte (cf. Chapitre 4), pas comme un échec du modèle collaboratif.
    """
    relevant_by_user = _relevant_items_by_user(test_interactions)

    precisions: List[float] = []
    recalls: List[float] = []
    for uid, relevant_items in relevant_by_user.items():
        if cf.user_embeddings is None or uid not in cf.user_index or not relevant_items:
            continue

        recommended = [pid for pid, _ in cf.predict(uid, top_k=k, cold_start_fallback=False)]
        if not recommended:
            continue

        hits = len(set(recommended) & relevant_items)
        precisions.append(hits / len(recommended))
        recalls.append(hits / len(relevant_items))

    if not precisions:
        return 0.0, 0.0, 0
    return float(np.mean(precisions)), float(np.mean(recalls)), len(precisions)


def rmse(cf: CollaborativeFilteringModel, test_interactions: List[dict]) -> Tuple[float, int]:
    """RMSE entre le score prédit (produit scalaire des embeddings) et le poids d'interaction réel.

    Calculé uniquement sur les couples (utilisateur, produit) du test set qui
    étaient déjà dans le vocabulaire du modèle entraîné sur le train set.
    """
    squared_errors: List[float] = []
    for it in test_interactions:
        uid = str(it.get("user_id"))
        pid = it.get("product_id")
        t = (it.get("type") or "view").lower()
        if pid is None:
            continue
        pid = int(pid)

        if cf.user_embeddings is None or uid not in cf.user_index or pid not in cf.item_index:
            continue

        u_idx = cf.user_index[uid]
        i_idx = cf.item_index[pid]
        predicted = float(np.dot(cf.user_embeddings[u_idx], cf.item_embeddings[i_idx]))
        actual = INTERACTION_WEIGHTS.get(t, 1.0)
        squared_errors.append((predicted - actual) ** 2)

    if not squared_errors:
        return 0.0, 0
    return float(np.sqrt(np.mean(squared_errors))), len(squared_errors)


def run_evaluation(k: int = 10, test_ratio: float = 0.2, epochs: int = 20, seed: int = 42) -> dict:
    """Pipeline complet : récupère les données Supabase, split train/test, entraîne un modèle
    temporaire sur le train, évalue sur le test set. Ne touche pas aux artefacts de production.
    """
    supabase = get_supabase_client()
    products = fetch_products(supabase)  # noqa: F841 - récupéré pour cohérence future (features contenu)
    interactions = fetch_interactions(supabase)

    train_interactions, test_interactions = train_test_split_interactions(
        interactions, test_ratio=test_ratio, seed=seed
    )

    mat, user_ids, item_ids = build_interaction_matrix(train_interactions)
    if mat.size == 0:
        raise ValueError("Pas assez de données d'entraînement pour évaluer le modèle.")

    cf_eval = CollaborativeFilteringModel()
    cf_eval.fit(mat, user_ids, item_ids, epochs=epochs)

    precision, recall, n_users_eval = precision_recall_at_k(cf_eval, test_interactions, k=k)
    rmse_value, n_pairs_eval = rmse(cf_eval, test_interactions)

    return {
        "k": k,
        "test_ratio": test_ratio,
        "n_train_interactions": len(train_interactions),
        "n_test_interactions": len(test_interactions),
        "precision_at_k": round(precision, 4),
        "recall_at_k": round(recall, 4),
        "n_users_evaluated_precision_recall": n_users_eval,
        "rmse": round(rmse_value, 4),
        "n_pairs_evaluated_rmse": n_pairs_eval,
    }
