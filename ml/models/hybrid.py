"""Hybrid recommendation model combining multiple strategies."""

from typing import List, Tuple


class HybridRecommender:
    """Hybrid recommender combining collaborative and content-based approaches."""

    def __init__(self, cf_weight: float = 0.55, cb_weight: float = 0.45):
        self.cf_weight = cf_weight
        self.cb_weight = cb_weight

    def recommend(
        self,
        cf_predictions: List[Tuple[int, float]],
        cb_predictions: List[Tuple[int, float]],
        top_k: int = 10,
    ) -> List[Tuple[int, float]]:
        """Combine collaborative filtering and content-based predictions."""
        cf_dict = {item_id: score for item_id, score in cf_predictions}
        cb_dict = {item_id: score for item_id, score in cb_predictions}
        all_items = set(cf_dict) | set(cb_dict)

        cf_max = max(cf_dict.values()) if cf_dict else 1.0
        cb_max = max(cb_dict.values()) if cb_dict else 1.0

        combined_scores: dict[int, float] = {}
        for item_id in all_items:
            cf_score = (cf_dict.get(item_id, 0.0) / cf_max) * self.cf_weight
            cb_score = (cb_dict.get(item_id, 0.0) / cb_max) * self.cb_weight
            combined_scores[item_id] = cf_score + cb_score

        return sorted(combined_scores.items(), key=lambda item: item[1], reverse=True)[:top_k]
