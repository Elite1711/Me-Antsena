"""Collaborative filtering model, avec repli popularité intégré pour le cold-start utilisateur."""

import os
import pickle
from typing import Iterable, List, Tuple

import numpy as np


class CollaborativeFilteringModel:
    """Collaborative filtering using matrix factorization.

    Gère le démarrage à froid (utilisateur inconnu du modèle) directement dans
    `predict()` : au lieu de renvoyer une liste vide, un repli par popularité
    globale (calculée à partir de la matrice d'interactions d'entraînement) est
    utilisé. Ce comportement peut être désactivé via `cold_start_fallback=False`
    (utile pour l'évaluation Precision@K/Recall@K, qui doit rester honnête sur
    ce que le modèle collaboratif sait vraiment prédire).
    """

    def __init__(self, embedding_dim: int = 16, learning_rate: float = 0.02, regularization: float = 0.01):
        self.embedding_dim = embedding_dim
        self.learning_rate = learning_rate
        self.regularization = regularization
        self.effective_dim: int | None = None
        self.user_embeddings = None
        self.item_embeddings = None
        self.user_ids: list[int] = []
        self.item_ids: list[int] = []
        self.user_index: dict[int, int] = {}
        self.item_index: dict[int, int] = {}
        self.interaction_matrix = None
        self.item_popularity_rank: list[int] = []

    def fit(
        self,
        interaction_matrix: np.ndarray,
        user_ids: Iterable[object],
        item_ids: Iterable[int],
        epochs: int = 40,
    ):
        """Train the model using simple matrix factorization."""
        n_users, n_items = interaction_matrix.shape
        if n_users == 0 or n_items == 0:
            self.user_embeddings = None
            self.item_embeddings = None
            self.interaction_matrix = interaction_matrix
            return

        self.user_ids = [str(user_id) for user_id in user_ids]
        self.item_ids = [int(item_id) for item_id in item_ids]
        self.user_index = {user_id: idx for idx, user_id in enumerate(self.user_ids)}
        self.item_index = {item_id: idx for idx, item_id in enumerate(self.item_ids)}
        self.interaction_matrix = interaction_matrix

        # La dimension des embeddings ne doit pas dépasser ce que les données
        # peuvent réellement contraindre : avec peu d'utilisateurs/produits ou
        # peu d'interactions non-nulles, un embedding_dim fixe et trop grand
        # (ex. 32 sur un catalogue de 100 produits et quelques interactions par
        # utilisateur) laisse le modèle sous-déterminé — il "invente" des
        # valeurs plutôt que d'apprendre un vrai signal. On plafonne donc la
        # dimension effective par min(embedding_dim, n_users-1, n_items-1, et
        # le nombre moyen d'interactions connues par utilisateur).
        n_known = int(np.count_nonzero(interaction_matrix))
        avg_interactions_per_user = max(1, n_known // max(1, n_users))
        self.effective_dim = max(
            2,
            min(
                self.embedding_dim,
                n_users - 1 if n_users > 1 else self.embedding_dim,
                n_items - 1 if n_items > 1 else self.embedding_dim,
                avg_interactions_per_user * 2,
            ),
        )

        # Popularité par produit = somme des poids d'interaction sur l'ensemble
        # des utilisateurs du train set. Sert de repli cold-start auto-suffisant :
        # le modèle n'a besoin d'aucune donnée externe pour dégrader proprement.
        popularity_scores = interaction_matrix.sum(axis=0)
        popularity_order = np.argsort(popularity_scores)[::-1]
        self.item_popularity_rank = [self.item_ids[idx] for idx in popularity_order]

        self.user_embeddings = np.random.normal(0, 0.1, (n_users, self.effective_dim))
        self.item_embeddings = np.random.normal(0, 0.1, (n_items, self.effective_dim))

        user_indices, item_indices = np.nonzero(interaction_matrix)
        for _ in range(epochs):
            for user_idx, item_idx in zip(user_indices, item_indices):
                prediction = np.dot(self.user_embeddings[user_idx], self.item_embeddings[item_idx])
                error = interaction_matrix[user_idx, item_idx] - prediction

                user_vector = self.user_embeddings[user_idx].copy()
                item_vector = self.item_embeddings[item_idx].copy()

                self.user_embeddings[user_idx] += self.learning_rate * (
                    error * item_vector - self.regularization * user_vector
                )
                self.item_embeddings[item_idx] += self.learning_rate * (
                    error * user_vector - self.regularization * item_vector
                )

    def is_known_user(self, user_id: int | str) -> bool:
        """Indique si l'utilisateur était présent dans les données d'entraînement."""
        return self.user_embeddings is not None and str(user_id) in self.user_index

    def _popularity_fallback(
        self, top_k: int, exclude: set[int]
    ) -> List[Tuple[int, float]]:
        ranked = [item_id for item_id in self.item_popularity_rank if item_id not in exclude][:top_k]
        # Score à 0.0 : signale explicitement "pas une vraie prédiction personnalisée",
        # utile pour que l'appelant distingue un repli d'une recommandation apprise.
        return [(item_id, 0.0) for item_id in ranked]

    def predict(
        self,
        user_id: int | str,
        top_k: int = 10,
        exclude_item_ids: Iterable[int] | None = None,
        cold_start_fallback: bool = True,
    ) -> List[Tuple[int, float]]:
        """Get top-k predictions for a user id.

        Si `user_id` est inconnu du modèle et `cold_start_fallback=True` (par
        défaut), renvoie un classement par popularité globale au lieu d'une
        liste vide. Mettre `cold_start_fallback=False` pour obtenir le
        comportement "strict" (utilisé par l'évaluation Precision@K/Recall@K).
        """
        exclude = {int(item_id) for item_id in (exclude_item_ids or [])}

        if self.user_embeddings is None or str(user_id) not in self.user_index:
            if cold_start_fallback:
                return self._popularity_fallback(top_k, exclude)
            return []

        user_idx = self.user_index[str(user_id)]
        user_embedding = self.user_embeddings[user_idx]
        scores = np.dot(self.item_embeddings, user_embedding)
        ranked = np.argsort(scores)[::-1]

        recommendations: list[Tuple[int, float]] = []
        for idx in ranked:
            item_id = self.item_ids[idx]
            if item_id in exclude:
                continue
            recommendations.append((item_id, float(scores[idx])))
            if len(recommendations) >= top_k:
                break
        return recommendations

    def save(self, path: str):
        """Save model to disk."""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as file_obj:
            pickle.dump(self, file_obj)

    @staticmethod
    def load(path: str):
        """Load model from disk."""
        with open(path, "rb") as file_obj:
            return pickle.load(file_obj)

