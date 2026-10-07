from __future__ import annotations

import gzip
import json
import tempfile
import unittest
from pathlib import Path

from services.analytics_service.jobs.build_master_data_candidates import build_master_data_candidates


class MasterDataCandidateTests(unittest.TestCase):
    def test_only_approved_mappings_enable_forecasting_and_weather(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            candidate = root / "candidate.json.gz"
            with gzip.open(candidate, "wt", encoding="utf-8") as handle:
                json.dump({
                    "metadata": {"dataset_id": "test"},
                    "rows": [
                        {"publication_eligible": True, "product": "Medicine A", "area": "Quezon", "quantity": 10},
                        {"publication_eligible": True, "product": "Medicine B", "area": "Government", "quantity": 5},
                    ],
                }, handle)
            product_map = root / "products.csv"
            product_map.write_text(
                "raw_product,canonical_sku,is_medicine,forecast_eligible,mapping_status\n"
                "Medicine A,MEDICINE A,true,true,approved\n"
                "Medicine B,MEDICINE B,true,true,needs_review\n",
                encoding="utf-8",
            )
            area_map = root / "areas.csv"
            area_map.write_text(
                "raw_area,standard_area,area_type,territory,weather_eligible,forecast_eligible,mapping_status\n"
                "Quezon,Quezon,territory,Quezon,true,true,approved\n"
                "Government,Government,customer_type,,false,false,needs_review\n",
                encoding="utf-8",
            )

            report = build_master_data_candidates(
                candidate, product_map, area_map, root, generated_at="2026-01-01T00:00:00+00:00"
            )

            self.assertEqual(report["product_master"]["forecast_eligible_products"], 1)
            self.assertEqual(report["area_master"]["weather_eligible_areas"], 1)
            self.assertEqual(report["area_master"]["approved_territories"], 1)


if __name__ == "__main__":
    unittest.main()
