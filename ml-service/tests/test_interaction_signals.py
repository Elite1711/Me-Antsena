import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data import build_interaction_matrix, content_seed_product_ids
from evaluation import _relevant_items_by_user


class InteractionSignalTests(unittest.TestCase):
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

        self.assertEqual(_relevant_items_by_user(interactions), {"buyer": {7}})
