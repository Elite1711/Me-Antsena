"""Test de fumée du module d'évaluation (evaluation.py), sur données synthétiques.

Ne nécessite pas de connexion Supabase : sert à vérifier que le calcul de
Precision@K, Recall@K et RMSE fonctionne correctement avant de le lancer sur
les vraies données de production.

Exécution :
    python tests/test_evaluation.py
"""

import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data import build_interaction_matrix
from evaluation import precision_recall_at_k, rmse, train_test_split_interactions
from models import CollaborativeFilteringModel


def make_synthetic_interactions(seed: int = 0):
    """Génère deux groupes d'utilisateurs aux goûts homogènes, pour produire un vrai
    signal collaboratif exploitable (contrairement à des préférences purement aléatoires)."""
    rng = random.Random(seed)
    cluster_a_items = list(range(1, 11))
    cluster_b_items = list(range(11, 21))

    interactions = []
    for i in range(20):
        uid = f"userA{i}"
        for pid in rng.sample(cluster_a_items, 7):
            interactions.append(
                {"user_id": uid, "product_id": pid, "type": rng.choice(["favorite", "purchase", "add_to_cart"])}
            )
    for i in range(20):
        uid = f"userB{i}"
        for pid in rng.sample(cluster_b_items, 7):
            interactions.append(
                {"user_id": uid, "product_id": pid, "type": rng.choice(["favorite", "purchase", "add_to_cart"])}
            )
    return interactions


def main():
    interactions = make_synthetic_interactions()
    train, test = train_test_split_interactions(interactions, test_ratio=0.25, seed=1)

    mat, user_ids, item_ids = build_interaction_matrix(train)
    assert mat.size > 0, "La matrice d'entraînement ne doit pas être vide"

    cf = CollaborativeFilteringModel()
    cf.fit(mat, user_ids, item_ids, epochs=40)

    precision, recall, n_users = precision_recall_at_k(cf, test, k=5)
    rmse_value, n_pairs = rmse(cf, test)

    print(f"Precision@5 = {precision:.4f}")
    print(f"Recall@5    = {recall:.4f}")
    print(f"RMSE        = {rmse_value:.4f}")
    print(f"Utilisateurs évalués (precision/recall) = {n_users}")
    print(f"Paires évaluées (rmse)                  = {n_pairs}")

    # Avec un signal collaboratif clair entre utilisateurs d'un même groupe, on
    # s'attend à un rappel nettement supérieur à ce que donnerait un tirage aléatoire.
    assert n_users > 0, "Aucun utilisateur évalué : split ou données insuffisantes"
    assert n_pairs > 0, "Aucune paire évaluée pour le RMSE"
    assert recall > 0.2, f"Rappel anormalement bas pour un signal collaboratif clair: {recall}"
    assert 0.0 <= precision <= 1.0
    assert rmse_value >= 0.0

    print("\nOK — le module d'évaluation fonctionne correctement.")


if __name__ == "__main__":
    main()
