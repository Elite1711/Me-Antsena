import os
import sys
import unittest
from unittest.mock import patch

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import main


class FakeCollaborativeModel:
    item_ids = [101, 102, 103, 104]
    interaction_matrix = np.array(
        [
            [5.0, 2.0, 9.0, 0.0],
            [1.0, 3.0, 0.0, 0.0],
        ]
    )


class TrendingTests(unittest.TestCase):
    def test_trending_ranks_by_weighted_interaction_volume_and_skips_unavailable(self):
        products = {
            101: {"stock": 3},
            102: {"stock": 0},
            103: {"stock": 2},
            104: {"stock": 4},
        }

        with patch.dict(main.state, {"cf": FakeCollaborativeModel(), "products_by_id": products}):
            result = main.get_trending(top_k=3)

        self.assertEqual(result.source, "interaction_popularity")
        self.assertEqual(
            [(item.product_id, item.score) for item in result.items],
            [(103, 9.0), (101, 6.0)],
        )

    def test_trending_rejects_when_collaborative_model_is_unavailable(self):
        with patch.dict(main.state, {"cf": None}):
            with self.assertRaises(main.HTTPException) as error:
                main.get_trending(top_k=5)

        self.assertEqual(error.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
