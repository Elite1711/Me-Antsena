"""Accès aux données Supabase (catalogue produits + interactions) pour l'entraînement."""
import os
from typing import List, Optional, Tuple

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))  # charge les variables d'environnement du fichier .env


import numpy as np
from supabase import create_client


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
        "id, name, description, category_id, tags, category:categories(id,name)"
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
        product["brand"] = ""
    return products


def fetch_interactions(supabase_client) -> List[dict]:
    """Récupère les interactions utilisateur-produit (vue, favori, panier, achat)."""
    resp = supabase_client.table("interactions").select("user_id, product_id, type").execute()
    error = getattr(resp, "error", None)
    if error:
        raise RuntimeError(f"Erreur Supabase (interactions): {getattr(error, 'message', error)}")
    return getattr(resp, "data", None) or []


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
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    error = getattr(resp, "error", None)
    if error:
        raise RuntimeError(f"Erreur Supabase (interactions utilisateur): {getattr(error, 'message', error)}")
    return getattr(resp, "data", None) or []


def fetch_product_by_id(supabase_client, product_id: int) -> Optional[dict]:
    """Récupère un produit unique (pour l'indexation à la volée d'un item cold-start)."""
    resp = (
        supabase_client.table("products")
        .select("id, name, description, category_id, tags, category:categories(id,name)")
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
    product["brand"] = ""
    return product


def build_interaction_matrix(interactions: List[dict]) -> Tuple[np.ndarray, List[str], List[int]]:
    """Construit la matrice utilisateurs x produits pondérée par type d'interaction."""
    user_ids = sorted({str(i["user_id"]) for i in interactions if i.get("user_id") is not None})
    item_ids = sorted({int(i["product_id"]) for i in interactions if i.get("product_id") is not None})

    user_index = {u: idx for idx, u in enumerate(user_ids)}
    item_index = {p: idx for idx, p in enumerate(item_ids)}

    if not user_ids or not item_ids:
        return np.zeros((0, 0)), user_ids, item_ids

    mat = np.zeros((len(user_ids), len(item_ids)), dtype=float)
    # Pondération : un achat compte bien plus qu'une simple vue.
    weight_map = {"view": 1.0, "favorite": 2.0, "add_to_cart": 2.5, "purchase": 5.0}

    for it in interactions:
        try:
            u = str(it.get("user_id"))
            p = int(it.get("product_id"))
        except (TypeError, ValueError):
            continue
        if u not in user_index or p not in item_index:
            continue
        t = (it.get("type") or "view").lower()
        mat[user_index[u], item_index[p]] += weight_map.get(t, 1.0)

    return mat, user_ids, item_ids
