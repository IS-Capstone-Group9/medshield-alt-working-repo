"""
Unit tests for MedShield Product Prioritization & ABC-VEN Scenario Engine.
"""

import unittest
from services.analytics_service.product_priority import (
    calculate_product_priorities,
    classify_abc_ven_category,
    get_default_mcda_weights,
    match_catalog_item,
    load_catalog
)

class TestProductPriority(unittest.TestCase):
    def setUp(self):
        self.sample_products = [
            {"product": "AMLODIPINE 5MG", "revenue": 5000000.0, "quantity": 100000}, # Class A, VEN E -> AE -> Cat I
            {"product": "MULTIVITAMINS + ZINC", "revenue": 3000000.0, "quantity": 50000}, # Class A/B, VEN N -> AN/BN -> Cat II/III
            {"product": "SALBUTAMOL 2MG/5ML SYRUP", "revenue": 1000000.0, "quantity": 20000}, # Class B, VEN E -> BE -> Cat II
            {"product": "PARACETAMOL 500MG", "revenue": 100000.0, "quantity": 40000}, # Class C, VEN V -> CV -> Cat I (Vital!)
            {"product": "ORAL REHYDRATION SALTS", "revenue": 50000.0, "quantity": 5000}, # Class C, VEN V -> CV -> Cat I (Vital!)
            {"product": "DOXYCYCLINE 100MG", "revenue": 80000.0, "quantity": 10000}, # Class C, VEN V -> CV -> Cat I (Vital!)
            {"product": "SANOMAX-FA", "revenue": 20000.0, "quantity": 1000}, # Class C, VEN N -> CN -> Cat III
        ]

    def test_abc_ven_category_mapping(self):
        self.assertEqual(classify_abc_ven_category("A", "V")[0], "Category I")
        self.assertEqual(classify_abc_ven_category("B", "V")[0], "Category I")
        self.assertEqual(classify_abc_ven_category("C", "V")[0], "Category I")
        self.assertEqual(classify_abc_ven_category("A", "E")[0], "Category I")
        
        self.assertEqual(classify_abc_ven_category("B", "E")[0], "Category II")
        self.assertEqual(classify_abc_ven_category("C", "E")[0], "Category II")
        self.assertEqual(classify_abc_ven_category("A", "N")[0], "Category II")
        
        self.assertEqual(classify_abc_ven_category("B", "N")[0], "Category III")
        self.assertEqual(classify_abc_ven_category("C", "N")[0], "Category III")

    def test_cv_item_elevation_in_outbreak(self):
        """
        Critical thesis test: Low-revenue, low-cost life-saving items (Paracetamol, ORS, Doxycycline)
        must be classified as Category I (Critical) and rank highly under Outbreak/Weather scenarios.
        """
        result_normal = calculate_product_priorities(self.sample_products, scenario="normal")
        result_outbreak = calculate_product_priorities(self.sample_products, scenario="outbreak")

        # Find Paracetamol
        p_normal = next(p for p in result_normal["products"] if "PARACETAMOL" in p["name"])
        p_outbreak = next(p for p in result_outbreak["products"] if "PARACETAMOL" in p["name"])

        # In both, it is Category I because it's CV (Class C revenue, Vital clinical rating)
        self.assertEqual(p_normal["category"], "Category I")
        self.assertEqual(p_normal["matrix_code"], "CV")
        self.assertEqual(p_outbreak["category"], "Category I")

        # In outbreak scenario, outbreak MCDA score must be significantly higher due to surge + clinical weight
        self.assertGreater(p_outbreak["mcda_score"], p_normal["mcda_score"])
        self.assertLessEqual(p_outbreak["priority_rank"], 3)

    def test_typhoon_weather_scenario_surge(self):
        result_weather = calculate_product_priorities(self.sample_products, scenario="weather")
        doxy = next(p for p in result_weather["products"] if "DOXYCYCLINE" in p["name"])
        self.assertEqual(doxy["category"], "Category I")
        self.assertEqual(doxy["ven"], "V")
        self.assertEqual(doxy["therapeutic_cluster"], "Waterborne (Flood/Lepto)")
        self.assertGreaterEqual(doxy["surge_multiplier"], 2.0)

    def test_summary_and_matrix_aggregates(self):
        result = calculate_product_priorities(self.sample_products, scenario="normal")
        summary = result["summary"]
        total_skus = summary["total_skus"]
        self.assertEqual(total_skus, len(self.sample_products))
        
        cat_count_sum = summary["category_1"]["count"] + summary["category_2"]["count"] + summary["category_3"]["count"]
        self.assertEqual(cat_count_sum, total_skus)
        
        matrix = result["matrix"]
        matrix_count_sum = sum(cell["count"] for cell in matrix.values())
        self.assertEqual(matrix_count_sum, total_skus)

    def test_custom_mcda_weights(self):
        custom_weights = {"volume": 10.0, "clinical": 80.0, "surge": 10.0}
        result = calculate_product_priorities(self.sample_products, scenario="normal", weights=custom_weights)
        top_product = result["products"][0]
        # With 80% clinical weight, top product must be Vital (V)
        self.assertEqual(top_product["ven"], "V")

if __name__ == "__main__":
    unittest.main()
