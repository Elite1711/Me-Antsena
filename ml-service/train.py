"""Entraînement des modèles de recommandation à partir de Supabase, et chargement des artefacts."""

import os
import pickle
from typing import Optional, Tuple

from data import build_interaction_matrix, fetch_interactions, fetch_products, get_supabase_client
from models import CollaborativeFilteringModel, ContentBasedModel

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts")
CF_PATH = os.path.join(ARTIFACTS_DIR, "collaborative.pkl")
CB_PATH = os.path.join(ARTIFACTS_DIR, "content_based.pkl")


def _save(obj, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        pickle.dump(obj, f)


def train_and_save(epochs: int = 20) -> Tuple[int, int]:
    """Récupère les données depuis Supabase, entraîne les 2 modèles et sauvegarde les artefacts.

    Le classement de popularité utilisé pour le repli cold-start est calculé et
    stocké directement dans le modèle collaboratif (voir
    `CollaborativeFilteringModel.item_popularity_rank`) : pas de fichier séparé
    à maintenir en cohérence avec le train set.

    Retourne (nb_utilisateurs, nb_produits) pour information.
    """
    supabase = get_supabase_client()
    products = fetch_products(supabase)
    interactions = fetch_interactions(supabase)

    cb = ContentBasedModel()
    if products:
        cb.fit(products)
        _save(cb, CB_PATH)

    mat, user_ids, item_ids = build_interaction_matrix(interactions)
    cf = CollaborativeFilteringModel()
    if mat.size != 0:
        cf.fit(mat, user_ids, item_ids, epochs=epochs)
        _save(cf, CF_PATH)

    return len(user_ids), len(item_ids)


def load_artifacts() -> Tuple[Optional[CollaborativeFilteringModel], Optional[ContentBasedModel]]:
    cf = None
    cb = None
    if os.path.exists(CF_PATH):
        with open(CF_PATH, "rb") as f:
            cf = pickle.load(f)
    if os.path.exists(CB_PATH):
        with open(CB_PATH, "rb") as f:
            cb = pickle.load(f)
    return cf, cb
