import unittest
import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data import (
    SYNTHETIC_EVALUATION_SOURCE,
    build_interaction_matrix,
    content_seed_product_ids,
    fetch_interactions,
)
from evaluation import _relevant_items_by_user


class InteractionSignalTests(unittest.TestCase):
    def test_synthetic_interactions_are_opt_in_and_tagged(self):
        class FakeQuery:
            def __init__(self):
                self.filters = []

            def select(self, *_args):
                return self

            def in_(self, *_args):
                return self

            def or_(self, expression):
                self.filters.append(("or", expression))
                return self

            def eq(self, field, value):
                self.filters.append(("eq", field, value))
                return self

            def execute(self):
                rows = [
                    {"user_id": "real", "product_id": 1, "type": "view"},
                    {
                        "user_id": "synthetic",
                        "product_id": 2,
                        "type": "view",
                        "recommendation_source": SYNTHETIC_EVALUATION_SOURCE,
                    },
                ]
                if any(
                    filter_item[:2] == ("eq", "recommendation_source")
                    for filter_item in self.filters
                ):
                    rows = [rows[1]]
                else:
                    rows = [rows[0]]
                return SimpleNamespace(data=rows, error=None)

        class FakeClient:
            def table(self, _table_name):
                return FakeQuery()

        client = FakeClient()
        real_rows = fetch_interactions(client)
        synthetic_rows = fetch_interactions(client, include_synthetic_evaluation=True)

        self.assertEqual([row["user_id"] for row in real_rows], ["real"])
        self.assertEqual([row["user_id"] for row in synthetic_rows], ["synthetic"])

    def test_search_events_do_not_create_matrix_users_or_items(self):
        interactions = [
            {"user_id": "buyer", "product_id": 12, "type": "recommendation_click"},
            {"user_id": "searcher", "product_id": None, "type": "search"},
        ]

        matrix, user_ids, item_ids = build_interaction_matrix(interactions)

        self.assertEqual(user_ids, ["buyer"])
        self.assertEqual(item_ids, [12])
        self.assertEqual(matrix.tolist(), [[1.5]])

    def test_content_seeds_are_recent_distinct_product_interactions_only(self):
        interactions = [
            {"product_id": 12, "type": "recommendation_click"},
            {"product_id": 12, "type": "view"},
            {"product_id": None, "type": "search"},
            {"product_id": 7, "type": "purchase"},
            {"product_id": 5, "type": "unknown"},
        ]

        self.assertEqual(content_seed_product_ids(interactions), [12, 7])

    def test_recommendation_click_is_not_a_strong_relevance_label(self):
        interactions = [
            {"user_id": "buyer", "product_id": 12, "type": "recommendation_click"},
            {"user_id": "buyer", "product_id": 7, "type": "purchase"},
        ]

        relevant, excluded = _relevant_items_by_user(
            interactions,
            seen_by_user={"buyer": set()},
            candidate_ids={7, 12},
        )
        self.assertEqual(relevant, {"buyer": {7}})
        self.assertEqual(excluded, 0)

    def test_evaluation_excludes_seen_items_and_users_without_training_history(self):
        interactions = [
            {"user_id": "known", "product_id": 12, "type": "purchase"},
            {"user_id": "known", "product_id": 7, "type": "favorite"},
            {"user_id": "new", "product_id": 7, "type": "purchase"},
        ]

        relevant, excluded = _relevant_items_by_user(
            interactions,
            seen_by_user={"known": {12}},
            candidate_ids={7, 12},
        )

        self.assertEqual(relevant, {"known": {7}})
        self.assertEqual(excluded, 2)
