"""Tests for chronological recommendation evaluation without a Supabase connection."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from evaluation import (
    _ranking_metrics,
    chronological_train_validation_test_split,
)
from models import HybridRecommender


class EvaluationTests(unittest.TestCase):
    def test_three_way_split_keeps_equal_timestamps_together(self):
        interactions = [
            {"user_id": "user", "created_at": "2025-03-01T00:00:00Z", "id": 4},
            {"user_id": "user", "created_at": "2025-01-01T00:00:00Z", "id": 1},
            {"user_id": "user", "created_at": "2025-03-01T00:00:00Z", "id": 5},
            {"user_id": "user", "created_at": "2025-02-01T00:00:00Z", "id": 3},
            {"user_id": "user", "created_at": "2025-01-01T00:00:00Z", "id": 2},
        ]

        train, validation, test, metadata = chronological_train_validation_test_split(
            interactions, test_ratio=0.25
        )

        self.assertEqual([item["id"] for item in train], [1, 2])
        self.assertEqual([item["id"] for item in validation], [3])
        self.assertEqual([item["id"] for item in test], [4, 5])
        self.assertEqual(metadata["validation_timestamp"], "2025-02-01")
        self.assertEqual(metadata["test_timestamp"], "2025-03-01")

    def test_three_way_split_requires_timestamps(self):
        with self.assertRaisesRegex(ValueError, "created_at"):
            chronological_train_validation_test_split([{"id": 1}, {"id": 2}])

    def test_interactions_from_one_day_cannot_fill_three_temporal_periods(self):
        interactions = [
            {
                "user_id": "same-day-user",
                "product_id": product_id,
                "type": "view",
                "created_at": f"2025-01-01T00:00:{second:02d}Z",
            }
            for product_id, second in enumerate((1, 2, 3), start=1)
        ]

        with self.assertRaisesRegex(ValueError, "trois périodes temporelles"):
            chronological_train_validation_test_split(interactions)

    def test_ranking_metrics_calculate_precision_recall_and_ndcg(self):
        precision, recall, ndcg = _ranking_metrics([7, 8, 9], {7, 9}, k=3)

        self.assertAlmostEqual(precision, 2 / 3)
        self.assertEqual(recall, 1.0)
        self.assertGreater(ndcg, 0.9)
        self.assertLessEqual(ndcg, 1.0)

    def test_hybrid_fuses_rankings_without_comparing_incompatible_scores(self):
        result = HybridRecommender(cf_weight=1.0, cb_weight=0.0).recommend(
            [(1, -2.0), (2, -1.0)], [], top_k=2
        )

        self.assertEqual([product_id for product_id, _ in result], [1, 2])


if __name__ == "__main__":
    unittest.main()
