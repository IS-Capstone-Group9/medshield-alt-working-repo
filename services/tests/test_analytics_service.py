import unittest

from services.analytics_service.app import app


class AnalyticsServiceContractTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_sales_status_and_pagination_contract(self):
        status = self.client.get("/sales/status")
        self.assertEqual(status.status_code, 200)
        self.assertEqual(status.get_json()["canonical_columns"], [
            "area",
            "dr_number",
            "date_delivered",
            "product",
            "quantity",
            "unit_cost",
            "total_cost",
            "discount",
            "net_cost",
            "trade_price_unit",
            "total_trade_price",
            "net_income",
            "margin_pct",
        ])

        page = self.client.get("/sales/transactions?year=all&page=1&page_size=10")
        self.assertEqual(page.status_code, 200)
        self.assertEqual(page.get_json()["pagination"]["page_size"], 10)
        self.assertGreater(page.get_json()["pagination"]["total_rows"], 0)

        summary = self.client.get("/sales/summary?year=all")
        self.assertEqual(summary.status_code, 200)
        self.assertIn("sums", summary.get_json())
        self.assertIn("averages", summary.get_json())
        self.assertIn("sku_count", summary.get_json()["counts"])

    def test_invalid_year_is_rejected(self):
        response = self.client.get("/sales/transactions?year=25")
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
