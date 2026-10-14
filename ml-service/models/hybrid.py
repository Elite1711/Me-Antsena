"""Hybrid recommendation model combining multiple strategies."""

from typing import List, Tuple


class HybridRecommender:
    """Hybrid recommender combining collaborative and content-based approaches."""

    def __init__(self, cf_weight: float = 0.55, cb_weight: float = 0.45):
        self.cf_weight = cf_weight
        self.cb_weight = cb_weight
        self.rank_constant = 60

    def recommend(
        self,
        cf_predictions: List[Tuple[int, float]],
        cb_predictions: List[Tuple[int, float]],
        top_k: int = 10,
    ) -> List[Tuple[int, float]]:
        """Combine collaborative filtering and content-based predictions."""
        combined_scores: dict[int, float] = {}
        for weight, predictions in (
            (self.cf_weight, cf_predictions),
            (self.cb_weight, cb_predictions),
        ):
            for rank, (item_id, _) in enumerate(predictions, start=1):
                combined_scores[item_id] = combined_scores.get(item_id, 0.0) + (
                    weight / (self.rank_constant + rank)
                )

        return sorted(
            combined_scores.items(),
            key=lambda item: (-item[1], item[0]),
        )[:top_k]
