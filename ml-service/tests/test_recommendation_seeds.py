import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import main
from data import recently_viewed_product_ids


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


class UnknownCollaborativeModel(FakeCollaborativeModel):
    def is_known_user(self, user_id):
        return False


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
        self.assertEqual(
            [(item.product_id, item.is_recently_viewed) for item in result.content],
            [(12, True), (3, False)],
        )

    def test_recently_viewed_ids_include_only_the_newest_distinct_viewed_products(self):
        interactions = [
            {"product_id": 12, "type": "view"},
            {"product_id": 12, "type": "view"},
            {"product_id": 11, "type": "favorite"},
            {"product_id": 10, "type": "view"},
            {"product_id": None, "type": "view"},
        ]

        self.assertEqual(recently_viewed_product_ids(interactions), [12, 10])

    def test_cold_start_content_response_includes_recent_view_as_ml_content_item(self):
        collaborative = UnknownCollaborativeModel()
        content = FakeContentModel()
        interactions = [{"product_id": 12, "type": "view"}]
        with (
            patch.dict(main.state, {"cf": collaborative, "cb": content}),
            patch.object(main, "get_supabase_client", return_value=object()),
            patch.object(main, "fetch_user_interactions", return_value=interactions),
        ):
            result = main.get_recommendations("new-user", top_k=2)

        self.assertEqual(result.source, "content_cold_start")
        self.assertEqual(
            [(item.product_id, item.is_recently_viewed) for item in result.content],
            [(12, True), (3, False)],
        )

    def test_popularity_fallback_does_not_claim_content_recommendations(self):
        class EmptyContentModel(FakeContentModel):
            def recommend_from_history(self, seed_ids, top_k, exclude_product_ids):
                return []

        interactions = [{"product_id": None, "type": "search"}]
        with (
            patch.dict(main.state, {"cf": UnknownCollaborativeModel(), "cb": EmptyContentModel()}),
            patch.object(main, "get_supabase_client", return_value=object()),
            patch.object(main, "fetch_user_interactions", return_value=interactions),
        ):
            result = main.get_recommendations("new-user", top_k=2)

        self.assertEqual(result.source, "popularity_fallback")
        self.assertEqual(result.content, [])
