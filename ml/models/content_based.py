"""Content-based filtering model."""

import os
import pickle
from typing import Iterable, List, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class ContentBasedModel:
    """Content-based filtering using TF-IDF and cosine similarity."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=5000, stop_words="english")
        self.product_features = None
        self.product_ids: list[int] = []
        self.product_index: dict[int, int] = {}

    def _build_text(self, product: dict) -> str:
        tags = product.get("tags") or []
        if isinstance(tags, list):
            tags = " ".join(str(tag) for tag in tags if tag)

        category = product.get("category")
        if isinstance(category, dict):
            category = category.get("name") or category.get("category") or category.get("label") or ""

        brand = product.get("brand") or ""
        category_raw = product.get("category_raw") or ""

        return " ".join(
            [
                str(product.get("name") or ""),
                str(brand),
                str(category or ""),
                str(category_raw),
                str(product.get("description") or ""),
                str(tags or ""),
            ]
        )

    def fit(self, products: List[dict]):
        """Train the model on rich product text."""
        texts = [self._build_text(product) for product in products]
        self.product_ids = [int(product["id"]) for product in products]
        self.product_index = {product_id: idx for idx, product_id in enumerate(self.product_ids)}
        self.product_features = self.vectorizer.fit_transform(texts)

    def get_similar_products(self, product_id: int, top_k: int = 10) -> List[Tuple[int, float]]:
        """Get similar products for a product id."""
        if self.product_features is None or product_id not in self.product_index:
            return []

        product_idx = self.product_index[product_id]
        similarities = cosine_similarity(self.product_features[product_idx], self.product_features)[0]
        similar_indices = np.argsort(similarities)[::-1]

        recommendations: list[Tuple[int, float]] = []
        for idx in similar_indices:
            candidate_id = self.product_ids[idx]
            if candidate_id == product_id:
                continue
            recommendations.append((candidate_id, float(similarities[idx])))
            if len(recommendations) >= top_k:
                break
        return recommendations

    def recommend_from_history(
        self,
        seed_product_ids: Iterable[int],
        top_k: int = 10,
        exclude_product_ids: Iterable[int] | None = None,
    ) -> List[Tuple[int, float]]:
        """Blend similarity across a user's interacted products."""
        if self.product_features is None:
            return []

        exclude = set(int(product_id) for product_id in (exclude_product_ids or []))
        seed_indices = [
            self.product_index[int(product_id)]
            for product_id in seed_product_ids
            if int(product_id) in self.product_index
        ]
        if not seed_indices:
            return []

        seed_matrix = self.product_features[seed_indices]
        similarities = cosine_similarity(seed_matrix, self.product_features).mean(axis=0)
        ranked = np.argsort(similarities)[::-1]

        recommendations: list[Tuple[int, float]] = []
        for idx in ranked:
            candidate_id = self.product_ids[idx]
            if candidate_id in exclude:
                continue
            recommendations.append((candidate_id, float(similarities[idx])))
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
