from __future__ import annotations

import gzip
import json
import tempfile
import unittest
from pathlib import Path

from services.analytics_service.jobs.reconcile_financial_metrics import reconcile_financial_metrics


class FinancialReconciliationTests(unittest.TestCase):
    def test_selects_mapping_that_reconciles_to_workbook_income(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = root / "candidate.json.gz"
            rows = [
                {
                    "publication_eligible": True,
                    "source_hash": "a",
                    "year": 2025,
                    "source_workbook": "sales.csv",
                    "source_row_number": 2,
                    "quantity": 10,
                    "net_cost": 100,
                    "total_trade_price": 60,
                    "net_income": 40,
                },
                {
                    "publication_eligible": False,
                    "source_hash": "blocked",
                    "year": 2017,
                    "quantity": 1,
                    "net_cost": 50,
                    "total_trade_price": 20,
                    "net_income": 30,
                },
            ]
            with gzip.open(candidate, "wt", encoding="utf-8") as handle:
                json.dump({"metadata": {"dataset_id": "test"}, "rows": rows}, handle)

            report = reconcile_financial_metrics(
                candidate,
                root,
                generated_at="2026-01-01T00:00:00+00:00",
            )

            self.assertEqual(report["rows_evaluated"], 1)
            self.assertEqual(
                report["proposed_mapping"],
                "net_cost_as_sales_value_and_total_trade_price_as_cost_basis",
            )
            self.assertEqual(
                report["mapping_comparison"]["workbook_supported_candidate"]["match_rate"],
                1.0,
            )
            self.assertEqual(report["reconciled_rows"], 1)


if __name__ == "__main__":
    unittest.main()
