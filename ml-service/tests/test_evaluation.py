"""Tests for chronological recommendation evaluation without a Supabase connection."""

import os
import random
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from evaluation import (
    METHOD_NAMES,
    _ranking_metrics,
    chronological_train_validation_test_split,
    run_evaluation,
)
from models import HybridRecommender


def make_synthetic_data(seed: int = 0):
    rng = random.Random(seed)
    products = [
        {"id": product_id, "name": f"Product audio {product_id}", "category_name": "Electronics"}
        for product_id in range(1, 21)
    ]
    interactions = []
    for group_name, product_ids in (
        ("A", list(range(1, 11))),
        ("B", list(range(11, 21))),
    ):
        for user_index in range(20):
            chosen = rng.sample(product_ids, 7)
            for product_id in chosen[:4]:
                interactions.append(
                    {
                        "user_id": f"user{group_name}{user_index}",
                        "product_id": product_id,
                        "type": rng.choice(["favorite", "purchase", "add_to_cart"]),
                        "created_at": "2025-01-01T00:00:00Z",
                    }
                )
            interactions.append(
                {
                    "user_id": f"user{group_name}{user_index}",
                    "product_id": chosen[4],
                    "type": rng.choice(["favorite", "purchase", "add_to_cart"]),
                    "created_at": "2025-02-01T00:00:00Z",
                }
            )
            for product_id in chosen[5:]:
                interactions.append(
                    {
                        "user_id": f"user{group_name}{user_index}",
                        "product_id": product_id,
                        "type": rng.choice(["favorite", "purchase", "add_to_cart"]),
                        "created_at": "2025-03-01T00:00:00Z",
                    }
                )
    return products, interactions


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

    def test_evaluation_compares_four_methods_reproducibly(self):
        products, interactions = make_synthetic_data()
        with (
            patch("evaluation.get_supabase_client", return_value=object()),
            patch("evaluation.fetch_products", return_value=products),
            patch("evaluation.fetch_interactions", return_value=interactions),
        ):
            first = run_evaluation(k=5, test_ratio=0.25, seed=17)
            second = run_evaluation(k=5, test_ratio=0.25, seed=17)

        from main import EvaluationResponse

        response = EvaluationResponse(**first)
        self.assertEqual(first, second)
        self.assertEqual(first["protocol"], "per_user_train_validation_test_v3")
        self.assertEqual(set(first["methods"]), set(METHOD_NAMES))
        self.assertEqual(set(response.methods), set(METHOD_NAMES))
        self.assertEqual(
            first["tuning"]["selection_metric"], "validation_hybrid_ndcg_at_k"
        )
        self.assertEqual(
            first["tuning"]["selected_cf_weight"]
            + first["tuning"]["selected_cb_weight"],
            1.0,
        )
        self.assertEqual(first["tuning"]["status"], "selected")
        self.assertEqual(first["n_users_with_three_periods"], 40)
        self.assertEqual(first["n_users_evaluated_precision_recall"], 40)
        self.assertGreater(first["n_relevant_items_evaluated"], 0)
        for metrics in first["methods"].values():
            self.assertTrue(0.0 <= metrics["precision_at_k"] <= 1.0)
            self.assertTrue(0.0 <= metrics["recall_at_k"] <= 1.0)
            self.assertTrue(0.0 <= metrics["ndcg_at_k"] <= 1.0)

    def test_tuning_does_not_claim_a_winner_with_too_few_validation_users(self):
        products, interactions = make_synthetic_data()
        eligible_users = {"userA0", "userA1", "userB0", "userB1"}
        interactions = [
            interaction
            for interaction in interactions
            if interaction["user_id"] in eligible_users
        ]
        with (
            patch("evaluation.get_supabase_client", return_value=object()),
            patch("evaluation.fetch_products", return_value=products),
            patch("evaluation.fetch_interactions", return_value=interactions),
        ):
            result = run_evaluation(k=5, test_ratio=0.25, seed=17)

        self.assertEqual(result["tuning"]["status"], "insufficient_validation_users")
        self.assertIsNone(result["tuning"]["selected_cf_weight"])
        self.assertEqual(
            result["tuning"]["test_weights_used"]["source"], "default_fallback"
        )

    def test_evaluation_reports_missing_validation_relevance_without_error(self):
        products, interactions = make_synthetic_data()
        interactions = [
            {
                **interaction,
                "type": "view" if interaction["created_at"] == "2025-02-01T00:00:00Z"
                else interaction["type"],
            }
            for interaction in interactions
        ]
        with (
            patch("evaluation.get_supabase_client", return_value=object()),
            patch("evaluation.fetch_products", return_value=products),
            patch("evaluation.fetch_interactions", return_value=interactions),
        ):
            result = run_evaluation(k=5, test_ratio=0.25, seed=17)

        self.assertEqual(result["tuning"]["status"], "no_validation_relevant_users")
        self.assertEqual(result["tuning"]["n_users_evaluated"], 0)
        self.assertEqual(
            result["tuning"]["test_weights_used"]["source"], "default_fallback"
        )


if __name__ == "__main__":
    unittest.main()
