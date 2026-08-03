from __future__ import annotations

import gzip
import json
import tempfile
import unittest
from pathlib import Path

from services.analytics_service.jobs.build_medical_demand_dataset import build_split


class MedicalDemandDatasetTests(unittest.TestCase):
    def test_split_excludes_candidate_and_fallback_non_medical_products(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            full_sales_path = root / "sales.json.gz"
            candidate_path = root / "candidates.csv"
            medical_output_path = root / "medical.json.gz"
            excluded_output_path = root / "excluded.json.gz"
            report_dir = root / "report"

            payload = {
                "metadata": {"dataset_name": "test"},
                "rows": [
                    {"product": "Medicine A", "quantity": 10, "total_trade_price": 100, "net_cost": 60, "net_income": 40},
                    {"product": "Correction Tape Joy", "quantity": 2, "total_trade_price": 20, "net_cost": 12, "net_income": 8},
                    {"product": "Hard Copy Sub#20", "quantity": 3, "total_trade_price": 30, "net_cost": 18, "net_income": 12},
                ],
            }
            with gzip.open(full_sales_path, "wt", encoding="utf-8") as handle:
                json.dump(payload, handle)

            candidate_path.write_text(
                "raw_product,proposed_category,forecast_eligible,mapping_status,review_notes\n"
                "CORRECTION TAPE JOY,office_stationery,false,needs_review,office item\n",
                encoding="utf-8",
            )

            report = build_split(full_sales_path, candidate_path, medical_output_path, excluded_output_path, report_dir)

            self.assertEqual(report["medical_demand"]["rows"], 1)
            self.assertEqual(report["excluded_non_medical"]["rows"], 2)
            self.assertEqual(report["reconciliation"]["total_trade_price"]["delta"], 0.0)

            with gzip.open(medical_output_path, "rt", encoding="utf-8") as handle:
                medical = json.load(handle)
            self.assertEqual([row["product"] for row in medical["rows"]], ["Medicine A"])


if __name__ == "__main__":
    unittest.main()
