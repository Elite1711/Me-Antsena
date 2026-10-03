import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import main


class FakeCollaborativeModel:
    item_popularity_rank = [9, 8]

    def is_known_user(self, user_id):
        return True

    def predict(self, user_id, top_k, cold_start_fallback):
        return [(1, 0.9), (2, 0.8)]


class FakeContentModel:
    product_features = object()

    def __init__(self):
        self.seed_ids = None
        self.excluded_ids = None

    def recommend_from_history(self, seed_ids, top_k, exclude_product_ids):
        self.seed_ids = seed_ids
        self.excluded_ids = exclude_product_ids
        return [(3, 0.7)]


class FakeHybridModel:
    def recommend(self, collaborative, content, top_k):
        return [(3, 0.8)]


class RecommendationSeedTests(unittest.TestCase):
    def test_known_users_use_recent_interactions_as_content_seeds(self):
        collaborative = FakeCollaborativeModel()
        content = FakeContentModel()
        interactions = [
            {"product_id": 12, "type": "view"},
            {"product_id": 11, "type": "favorite"},
            {"product_id": None, "type": "search"},
        ]
        with (
            patch.dict(main.state, {"cf": collaborative, "cb": content, "hybrid": FakeHybridModel()}),
            patch.object(main, "get_supabase_client", return_value=object()),
            patch.object(main, "fetch_user_interactions", return_value=interactions),
        ):
            result = main.get_recommendations("known-user", top_k=2)

        self.assertEqual(content.seed_ids, [12, 11])
        self.assertEqual(content.excluded_ids, [12, 11])
        self.assertEqual([item.product_id for item in result.content], [3])
