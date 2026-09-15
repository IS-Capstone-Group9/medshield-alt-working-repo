import unittest
from unittest.mock import patch
from services.analytics_service.sales_heatmap import build_heatmap
from services.analytics_service.app import app


def sale(product="A", quantity=10, period="2025-01", **extra):
    return dict(product=product, quantity=quantity, date_delivered=period+"-01",
                quality_status="valid", area="Quezon", **extra)


class SalesHeatmapTests(unittest.TestCase):
    def test_granular_aggregation_preserves_product_area_and_zero(self):
        result = build_heatmap([sale(), sale(quantity=5), sale("B", 900), sale(quantity=0, period="2025-02")], [], {}, "test")
        self.assertEqual(result["monthly"][0]["quantity"], 15)
        self.assertEqual(result["monthly"][1]["quantity"], 0)
        self.assertEqual(len(result["monthly"]), 3)  # Missing months are not manufactured.
        self.assertEqual(result["daily"][0]["period"], "2025-01-01")
        self.assertEqual(result["source"]["included_rows"], 4)

    def test_exclusions_and_unapproved_category_do_not_merge_aliases(self):
        rows = [sale(), sale("A-alias"), sale(estimated=True), sale(is_estimated_date=True), sale("#CONTRACT"), sale(quantity=-1)]
        mapping = [{"raw_product":"A", "canonical_sku":"A", "product_category":"Analgesics", "mapping_status":"proposed"},
                   {"raw_product":"A-alias", "canonical_sku":"A", "product_category":"Analgesics", "mapping_status":"approved"}]
        result = build_heatmap(rows, mapping, {}, "test")
        self.assertEqual(len(result["products"]), 2)
        self.assertEqual(result["products"][0]["category"], "Analgesics (proposed)")
        self.assertEqual(result["source"]["excluded"]["estimated"], 2)
        self.assertEqual(result["source"]["included_rows"], 2)

    def test_endpoint_has_no_demo_fallback_on_failure(self):
        with patch("services.analytics_service.app.load_heatmap", side_effect=ValueError("Outdated snapshot")):
            result = app.test_client().get('/sales/heatmap')
        self.assertEqual(result.status_code, 503)
        self.assertEqual(result.get_json(), {"error":"Outdated snapshot"})

    def test_duplicates_are_excluded_and_quantities_reconcile(self):
        result = build_heatmap([sale(), sale(duplicate=True), sale(quantity=20)], [], {}, "test")
        self.assertEqual(result["source"]["excluded"]["duplicate"], 1)
        self.assertEqual(sum(row["quantity"] for row in result["monthly"]), 30)
        self.assertEqual(result["source"]["included_rows"] + sum(result["source"]["excluded"].values()), 3)
