from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from services.analytics_service.jobs.certify_sales_dataset import build_certification_candidate


HEADER = "Area,DR Number,Date Delivered,Product,Qty,CP,Total CP,Disc,Net CP,TP/UNIT,TOTAL TP,Net Income,%\n"


class SalesCertificationTests(unittest.TestCase):
    def test_candidate_reconciles_and_quarantines_duplicates_and_rejects(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source_dir = root / "source"
            output_dir = root / "output"
            source_dir.mkdir()
            (source_dir / "medshield_data_2017.csv").write_text(
                HEADER
                + "Quezon,1,2017-01-01,Medicine A,10,5,50,0,50,8,80,30,37.5%\n"
                + "Quezon,1,2017-01-01,Medicine A,10,5,50,0,50,8,80,30,37.5%\n"
                + "Quezon,2,2017-02-01,#REF!,1,5,5,0,5,8,8,3,37.5%\n"
                + "Quezon,3,2017-03-01,#REF!,1,5,5,0,5,8,8,3,37.5%\n",
                encoding="utf-8",
            )

            report = build_certification_candidate(
                source_dir,
                output_dir,
                generated_at="2026-01-01T00:00:00+00:00",
            )

            rows = report["row_reconciliation"]
            self.assertEqual(rows["extracted_rows"], 4)
            self.assertTrue(rows["extracted_equals_accepted_plus_rejected"])
            self.assertTrue(rows["accepted_equals_valid_plus_warning"])
            self.assertEqual(rows["duplicate_occurrences"], 1)
            self.assertEqual(rows["publication_candidate_rows"], 0)
            self.assertEqual(report["year_assessment"]["2017"]["quality_eligible_rows"], 1)
            self.assertEqual(report["year_assessment"]["2017"]["trust_grade"], "excluded")
            self.assertTrue((output_dir / "sales_2017_2025_v1_manifest.json").exists())
            self.assertTrue((output_dir / "sales_2017_2025_v1_candidate.json.gz").exists())


if __name__ == "__main__":
    unittest.main()
