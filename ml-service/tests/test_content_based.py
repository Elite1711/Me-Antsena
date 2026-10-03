import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import ContentBasedModel


class ContentBasedFeatureTests(unittest.TestCase):
    def test_older_pickled_models_without_price_thresholds_remain_usable(self):
        model = object.__new__(ContentBasedModel)

        self.assertEqual(model._price_feature(10000), "")

    def test_features_include_normalized_brand_tags_and_catalog_price_tier(self):
        products = [
            {
                "id": 1,
                "name": "Écouteurs sans fil",
                "brand": "Étoile Audio",
                "description": "Casque audio Bluetooth",
                "category_name": "Électronique",
                "tags": ["Audio premium", "Sans-fil"],
                "price": 10000,
            },
            {
                "id": 2,
                "name": "Casque bluetooth",
                "brand": "Etoile Audio",
                "description": "Audio sans fil",
                "category_name": "Électronique",
                "tags": ["audio", "Bluetooth"],
                "price": 12000,
            },
            {
                "id": 3,
                "name": "Casserole acier",
                "brand": "Maison",
                "description": "Ustensile de cuisine",
                "category_name": "Maison",
                "tags": ["Cuisine"],
                "price": 20000,
            },
            {
                "id": 4,
                "name": "Montre élégante",
                "brand": "Temps",
                "description": "Montre connectée",
                "category_name": "Accessoires",
                "tags": ["Montre"],
                "price": 80000,
            },
        ]
        model = ContentBasedModel()
        model.fit(products)

        text = model._build_text(products[0])

        self.assertIn("etoile audio", text)
        self.assertIn("audio premium", text)
        self.assertIn("sans fil", text)
        self.assertIn("priceband_budget", text)
        self.assertEqual(model.get_similar_products(1, top_k=1)[0][0], 2)
