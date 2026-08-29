from __future__ import annotations

import csv
import gzip
import json
import os
import tempfile
import unittest
from pathlib import Path

from services.analytics_service.commercial_mcda import build_commercial_mcda


class CommercialMcdaTests(unittest.TestCase):
    def test_uses_only_publication_eligible_rows_and_approved_territories(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate_path = root / "candidate.json.gz"
            area_master_path = root / "area_master.csv"

            rows = [
                {"publication_eligible": True, "area": "Alpha", "date_delivered": "2025-01-01", "net_cost": 120},
                {"publication_eligible": True, "area": "Alpha", "date_delivered": "2025-03-01", "net_cost": 80},
                {"publication_eligible": True, "area": "Beta", "date_delivered": "2025-02-01", "net_cost": 100},
                {"publication_eligible": False, "area": "Beta", "date_delivered": "2025-03-01", "net_cost": 900},
                {"publication_eligible": True, "area": "Unmapped", "date_delivered": "2025-03-01", "net_cost": 900},
            ]
            with gzip.open(candidate_path, "wt", encoding="utf-8") as handle:
                json.dump({"metadata": {"dataset_id": "test_candidate"}, "rows": rows}, handle)

            with area_master_path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=[
                    "raw_area", "standard_area", "area_type", "mapping_status"
                ])
                writer.writeheader()
                writer.writerows([
                    {"raw_area": "ALPHA", "standard_area": "Alpha", "area_type": "territory", "mapping_status": "approved"},
                    {"raw_area": "BETA", "standard_area": "Beta", "area_type": "territory", "mapping_status": "approved"},
                    {"raw_area": "UNMAPPED", "standard_area": "Unmapped", "area_type": "unmapped", "mapping_status": "unmapped"},
                ])

            result = build_commercial_mcda(candidate_path, area_master_path)

            self.assertEqual(result["model_code"], "COMMERCIAL_MCDA_V2")
            self.assertEqual(result["weights"], {"sales_value": 0.60, "activity_coverage": 0.40})
            self.assertEqual([row["territory"] for row in result["territories"]], ["Alpha", "Beta"])
            self.assertEqual(result["territories"][0]["sales_value"], 200.0)
            self.assertEqual(result["territories"][1]["sales_value"], 100.0)
            self.assertEqual(result["territories"][0]["active_months"], 2)
            self.assertEqual(result["territories"][1]["active_months"], 1)
            self.assertIn("P7", result["excluded_criteria"]["outbreak_risk"])
            self.assertIn("P8", result["excluded_criteria"]["supplier_lead_time"])

            rows[0]["net_cost"] = 320
            with gzip.open(candidate_path, "wt", encoding="utf-8") as handle:
                json.dump({"metadata": {"dataset_id": "test_candidate"}, "rows": rows}, handle)
            next_mtime = candidate_path.stat().st_mtime_ns + 1_000_000
            os.utime(candidate_path, ns=(next_mtime, next_mtime))

            refreshed = build_commercial_mcda(candidate_path, area_master_path)
            alpha = next(row for row in refreshed["territories"] if row["territory"] == "Alpha")
            self.assertEqual(alpha["sales_value"], 400.0)


if __name__ == "__main__":
    unittest.main()
