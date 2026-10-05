"""Accès aux données Supabase (catalogue produits + interactions) pour l'entraînement."""
import os
from typing import List, Optional, Tuple

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))  # charge les variables d'environnement du fichier .env


import numpy as np
from supabase import create_client

INTERACTION_WEIGHTS = {
    "view": 1.0,
    "recommendation_click": 1.5,
    "favorite": 2.0,
    "add_to_cart": 2.5,
    "purchase": 5.0,
}
CONTENT_SEED_TYPES = frozenset(INTERACTION_WEIGHTS)


def get_supabase_client():
    """Crée le client Supabase à partir des variables d'environnement.

    SUPABASE_KEY doit être la clé `service_role` (jamais l'anon key), car ce
    service lit l'ensemble des utilisateurs/interactions en contournant RLS.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise EnvironmentError(
            "Variables d'environnement SUPABASE_URL et SUPABASE_KEY (service_role) requises."
        )
    return create_client(url, key)


def fetch_products(supabase_client) -> List[dict]:
    """Récupère le catalogue produits avec le nom de catégorie résolu."""
    resp = supabase_client.table("products").select(
        "id, name, brand, description, price, stock, category_id, tags, category:categories(id,name)"
    ).execute()
    error = getattr(resp, "error", None)
    if error:
        raise RuntimeError(f"Erreur Supabase (products): {getattr(error, 'message', error)}")

    products = getattr(resp, "data", None) or []
    for product in products:
        if isinstance(product.get("category"), dict):
            product["category_name"] = product["category"].get("name")
        else:
            product["category_name"] = None
        product["category_raw"] = product.get("category_name") or ""
        product["brand"] = product.get("brand") or ""
    return products


def fetch_interactions(supabase_client) -> List[dict]:
    """Récupère les interactions produit utilisées par l'entraînement et l'évaluation."""
    resp = (
        supabase_client.table("interactions")
        .select("user_id, product_id, type")
        .in_("type", sorted(INTERACTION_WEIGHTS))
        .execute()
    )
    error = getattr(resp, "error", None)
    if error:
        raise RuntimeError(f"Erreur Supabase (interactions): {getattr(error, 'message', error)}")
    return [
        interaction
        for interaction in (getattr(resp, "data", None) or [])
        if interaction.get("product_id") is not None
        and (interaction.get("type") or "view").lower() in INTERACTION_WEIGHTS
    ]


def fetch_user_interactions(supabase_client, user_id: str) -> List[dict]:
    """Récupère les interactions d'UN utilisateur, en direct (pas depuis le train set en mémoire).

    Utilisé pour le cold-start : un utilisateur peut avoir quelques interactions
    très récentes (postérieures au dernier /train) qui ne sont pas encore dans
    le modèle collaboratif, mais qui suffisent à alimenter une recommandation
    content-based pertinente sans attendre le prochain entraînement.
    """
    resp = (
        supabase_client.table("interactions")
        .select("product_id, type, created_at")
        .eq("user_id", user_id)
        .in_("type", sorted(CONTENT_SEED_TYPES))
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    error = getattr(resp, "error", None)
    if error:
        raise RuntimeError(f"Erreur Supabase (interactions utilisateur): {getattr(error, 'message', error)}")
    return getattr(resp, "data", None) or []


def content_seed_product_ids(interactions: List[dict]) -> List[int]:
    """Returns distinct product IDs in the given newest-first interaction sequence."""
    product_ids = []
    seen = set()
    for interaction in interactions:
        if (interaction.get("type") or "").lower() not in CONTENT_SEED_TYPES:
            continue
        try:
            product_id = int(interaction["product_id"])
        except (KeyError, TypeError, ValueError):
            continue
        if product_id not in seen:
            seen.add(product_id)
            product_ids.append(product_id)
    return product_ids


def fetch_product_by_id(supabase_client, product_id: int) -> Optional[dict]:
    """Récupère un produit unique (pour l'indexation à la volée d'un item cold-start)."""
    resp = (
        supabase_client.table("products")
        .select("id, name, brand, description, price, category_id, tags, category:categories(id,name)")
        .eq("id", product_id)
        .limit(1)
        .execute()
    )
    error = getattr(resp, "error", None)
    if error:
        raise RuntimeError(f"Erreur Supabase (product): {getattr(error, 'message', error)}")
    rows = getattr(resp, "data", None) or []
    if not rows:
        return None
    product = rows[0]
    if isinstance(product.get("category"), dict):
        product["category_name"] = product["category"].get("name")
    else:
        product["category_name"] = None
    product["category_raw"] = product.get("category_name") or ""
    product["brand"] = product.get("brand") or ""
    return product


def build_interaction_matrix(interactions: List[dict]) -> Tuple[np.ndarray, List[str], List[int]]:
    """Construit la matrice utilisateurs x produits pondérée par type d'interaction."""
    product_interactions = []
    for interaction in interactions:
        interaction_type = (interaction.get("type") or "view").lower()
        if interaction_type not in INTERACTION_WEIGHTS:
            continue
        if interaction.get("user_id") is None or interaction.get("product_id") is None:
            continue
        try:
            product_id = int(interaction["product_id"])
        except (TypeError, ValueError):
            continue
        product_interactions.append((interaction, interaction_type, product_id))

    user_ids = sorted({str(interaction["user_id"]) for interaction, _, _ in product_interactions})
    item_ids = sorted({product_id for _, _, product_id in product_interactions})

    user_index = {u: idx for idx, u in enumerate(user_ids)}
    item_index = {p: idx for idx, p in enumerate(item_ids)}

    if not user_ids or not item_ids:
        return np.zeros((0, 0)), user_ids, item_ids

    mat = np.zeros((len(user_ids), len(item_ids)), dtype=float)

    for it, interaction_type, p in product_interactions:
        u = str(it["user_id"])
        if u not in user_index or p not in item_index:
            continue
        mat[user_index[u], item_index[p]] += INTERACTION_WEIGHTS[interaction_type]

    return mat, user_ids, item_ids
