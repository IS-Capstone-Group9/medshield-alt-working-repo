import csv
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

from services.analytics_service.jobs import prepare_external_sources as external


class ExternalSourcePreparationTests(unittest.TestCase):
    def test_doh_classification_groups_fail_closed(self):
        self.assertEqual(external.classification_group("Confirmed"), "CONFIRMED")
        self.assertEqual(external.classification_group("P"), "PROBABLE")
        self.assertEqual(external.classification_group("S"), "SUSPECT_OR_COMPATIBLE")
        self.assertEqual(external.classification_group("Discarded case"), "EXCLUDED_DISCARDED")
        self.assertEqual(external.classification_group("Pending"), "PENDING_REVIEW")
        self.assertEqual(external.classification_group("Unmapped code"), "OTHER_REVIEW")

    def test_pagasa_numeric_sentinels_and_ranges_become_missing(self):
        audit = Counter()
        self.assertIsNone(external.numeric("-999", 0, None, audit, "rainfall"))
        self.assertIsNone(external.numeric("101", 0, 100, audit, "humidity"))
        self.assertEqual(external.numeric("82.5", 0, 100, audit, "humidity"), 82.5)
        self.assertEqual(audit["rainfall_missing_sentinel"], 1)
        self.assertEqual(audit["humidity_out_of_range"], 1)

    def test_doh_candidate_excludes_discarded_partial_and_out_of_scope_rows(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "raw"
            source.mkdir()
            raw = source / "Dengue_20260914.csv"
            columns = [
                "Date of Onset", "Region", "Province", "Municipality_City", "Age",
                "Admission Status", "Case Classification", "Number of Cases",
            ]
            with raw.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=columns)
                writer.writeheader()
                writer.writerows([
                    {"Date of Onset": "2018-01-01", "Region": "R4A", "Province": "QUEZON", "Municipality_City": "A", "Case Classification": "SUSPECT", "Number of Cases": "2"},
                    {"Date of Onset": "2018-01-02", "Region": "R4A", "Province": "QUEZON", "Municipality_City": "A", "Case Classification": "DISCARDED", "Number of Cases": "3"},
                    {"Date of Onset": "2017-01-01", "Region": "R4A", "Province": "QUEZON", "Municipality_City": "A", "Case Classification": "SUSPECT", "Number of Cases": "4"},
                    {"Date of Onset": "2026-01-01", "Region": "R4A", "Province": "QUEZON", "Municipality_City": "A", "Case Classification": "SUSPECT", "Number of Cases": "5"},
                ])
            clean = root / "clean.csv"
            candidate = root / "candidate.csv"
            territory = {
                "QUEZON": {
                    "territory": "Quezon",
                    "territory_id": "PH-PROVINCE-QUEZON",
                    "external_mapping_status": "pending",
                }
            }
            with patch.multiple(
                external,
                ROOT=root,
                DOH_ROOT=source,
                DOH_CLEAN=clean,
                DOH_TERRITORY_CANDIDATE=candidate,
            ):
                result = external.prepare_doh(territory)
            self.assertEqual(result["clean_rows"], 4)
            self.assertEqual(result["territory_candidate_rows"], 1)
            with candidate.open(encoding="utf-8", newline="") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(rows[0]["period"], "2018-01")
            self.assertEqual(rows[0]["value"], "2")
            self.assertEqual(rows[0]["is_external_join_ready"], "false")


if __name__ == "__main__":
    unittest.main()
