"""Collaborative filtering model."""

import os
import pickle
from typing import Iterable, List, Tuple

import numpy as np


class CollaborativeFilteringModel:
    """Collaborative filtering using matrix factorization."""

    def __init__(self, embedding_dim: int = 32, learning_rate: float = 0.02, regularization: float = 0.01):
        self.embedding_dim = embedding_dim
        self.learning_rate = learning_rate
        self.regularization = regularization
        self.user_embeddings = None
        self.item_embeddings = None
        self.user_ids: list[int] = []
        self.item_ids: list[int] = []
        self.user_index: dict[int, int] = {}
        self.item_index: dict[int, int] = {}
        self.interaction_matrix = None

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

        self.user_embeddings = np.random.normal(0, 0.1, (n_users, self.embedding_dim))
        self.item_embeddings = np.random.normal(0, 0.1, (n_items, self.embedding_dim))

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

    def predict(
        self,
        user_id: int | str,
        top_k: int = 10,
        exclude_item_ids: Iterable[int] | None = None,
    ) -> List[Tuple[int, float]]:
        """Get top-k predictions for a user id."""
        if self.user_embeddings is None or str(user_id) not in self.user_index:
            return []

        exclude = {int(item_id) for item_id in (exclude_item_ids or [])}
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
