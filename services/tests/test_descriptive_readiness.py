import unittest

from services.analytics_service.descriptive_readiness import build_descriptive_readiness, period_name


def sale(period_number, region="CALABARZON", quantity=10, product="SKU-A"):
    return {
        "period": period_name(period_number),
        "quantity": quantity,
        "canonical_sku": product,
        "product_mapping_status": "proposed",
        "product_forecast_eligible": True,
        "region": region,
    }


class DescriptiveReadinessTests(unittest.TestCase):
    def test_zero_is_observed_but_missing_month_is_unknown_and_blocks_series(self):
        start = 2023 * 12
        rows = [sale(start + index, quantity=0 if index == 4 else 10) for index in range(25) if index != 12]
        result = build_descriptive_readiness(rows)
        series = next(
            item for item in result["eligibility_rows"]
            if item["canonical_sku"] == "SKU-A" and item["region"] == "CALABARZON"
        )
        calendar = [
            item for item in result["calendar_rows"]
            if item["canonical_sku"] == "SKU-A" and item["region"] == "CALABARZON"
        ]
        self.assertEqual(next(item for item in calendar if item["period"] == period_name(start + 4))["observation_status"], "observed_zero")
        missing = next(item for item in calendar if item["period"] == period_name(start + 12))
        self.assertEqual(missing["observation_status"], "missing_unknown")
        self.assertIsNone(missing["quantity"])
        self.assertFalse(series["forecast_eligible"])
        self.assertEqual(series["status"], "Insufficient history")

    def test_gap_free_single_product_series_produces_real_stl_components(self):
        start = 2023 * 12
        rows = [sale(start + index, quantity=100 + index + 20 * (index % 12 == 7)) for index in range(30)]
        rows.extend([sale(start, region="MIMAROPA"), sale(start, region="Bicol")])
        result = build_descriptive_readiness(rows)
        series = next(
            item for item in result["eligibility_rows"]
            if item["canonical_sku"] == "SKU-A" and item["region"] == "CALABARZON"
        )
        components = [
            item for item in result["stl_rows"]
            if item["canonical_sku"] == "SKU-A" and item["region"] == "CALABARZON"
        ]
        self.assertTrue(series["forecast_eligible"])
        self.assertEqual(series["evaluation_months"], 30)
        self.assertEqual(series["unresolved_evaluation_gaps"], 0)
        self.assertEqual(series["method"], "STL(period=12, robust=True)")
        self.assertEqual(len(components), 30)
        self.assertTrue(all(component["trend"] is not None for component in components))
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["study_regions"], ["CALABARZON", "MIMAROPA", "Bicol"])

    def test_products_are_never_combined_into_one_quantity_series(self):
        start = 2023 * 12
        rows = [sale(start + index, product=product) for product in ("SKU-A", "SKU-B") for index in range(24)]
        result = build_descriptive_readiness(rows)
        calabarzon = [
            item for item in result["eligibility_rows"]
            if item["region"] == "CALABARZON"
        ]
        self.assertEqual({item["canonical_sku"] for item in calabarzon}, {"SKU-A", "SKU-B"})
        self.assertTrue(all(item["measure"] == "quantity" for item in calabarzon))


if __name__ == "__main__":
    unittest.main()
