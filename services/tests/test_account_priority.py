import unittest
import json
from pathlib import Path
import subprocess
import sys
import tempfile

from services.analytics_service.account_priority import (
    abc_xyz_review, account_inactivity_review, join_reviewed_accounts,
)


class AccountPriorityTests(unittest.TestCase):
    def test_account_join_preserves_signed_values_and_repeated_lines(self):
        rows = [{"area": "Hospital", "net_sales": "10.01"},
                {"area": "Hospital", "net_sales": "10.01"},
                {"area": "Named Hospital", "net_sales": "-2.02"}]
        mappings = [{"raw_label": "Named Hospital", "derived_account_key": "review:1",
                     "match_confidence": "exact_reference_match", "review_evidence": "reference-v1"}]
        result = join_reviewed_accounts(rows, mappings, dataset_id="d", policy_version="p")
        self.assertEqual(result["audit"]["input_count"], 3)
        self.assertEqual(result["audit"]["net_sales_after"], "18.00")
        self.assertIsNone(result["rows"][0]["derived_account_key"])
        self.assertEqual(result["rows"][2]["derived_account_key"], "review:1")

    def test_ambiguous_aliases_and_unreviewed_fuzzy_matches_rejected(self):
        mapping = {"raw_label": "Named Hospital", "derived_account_key": "a",
                   "match_confidence": "reviewed_alias_match", "review_evidence": "review-v1"}
        with self.assertRaises(ValueError):
            join_reviewed_accounts([], [mapping, mapping], dataset_id="d", policy_version="p")
        with self.assertRaises(ValueError):
            join_reviewed_accounts([], [{**mapping, "review_evidence": ""}], dataset_id="d", policy_version="p")
        with self.assertRaises(ValueError):
            join_reviewed_accounts([], [{**mapping, "raw_label": "HOSPITAL"}], dataset_id="d", policy_version="p")

    def test_abc_boundary_crossing_and_exact_signed_total(self):
        records = [{"product": p, "period": "2026-01", "net_sales": n,
                    "quantity": 1, "unit_scope": "ampoule"}
                   for p, n in [("a", 80), ("b", 15), ("c", 5), ("return", -2)]]
        result = abc_xyz_review(records, dataset_id="d", policy_version="p")
        self.assertEqual([r["abc"] for r in result["products"]], ["A", "B", "C", "Unclassified"])
        self.assertEqual(result["net_sales"], "98")

    def test_xyz_known_population_cv_and_unit_guard(self):
        rows = [{"product": "a", "period": f"2026-{m:02}", "net_sales": 1,
                 "quantity": 2 if m <= 3 else 6, "unit_scope": "ampoule"} for m in range(1, 7)]
        result = abc_xyz_review(rows, dataset_id="d", policy_version="p")["products"][0]
        # Mean 4, population SD 2: threshold CV .50 belongs to Y.
        self.assertEqual(result["coefficient_of_variation"], .5)
        self.assertEqual(result["xyz"], "Y")
        rows[-1]["unit_scope"] = "box"
        self.assertEqual(abc_xyz_review(rows, dataset_id="d", policy_version="p")["products"][0]["xyz"],
                         "Unresolved_Presentation")

    def test_missing_history_and_explicit_zero_fill(self):
        rows = [{"product": "a", "period": f"2025-{m:02}", "net_sales": 1,
                 "quantity": 10, "unit_scope": "ampoule"} for m in range(1, 7)]
        natural = abc_xyz_review(rows, dataset_id="d", policy_version="p")["products"][0]
        sensitivity = abc_xyz_review(rows, dataset_id="d", policy_version="p",
                                    calendar_months=[f"2025-{m:02}" for m in range(1, 13)])["products"][0]
        self.assertEqual(natural["xyz"], "X")
        self.assertEqual(sensitivity["xyz"], "Z")
        rows[0]["quantity"] = None
        self.assertEqual(abc_xyz_review(rows, dataset_id="d", policy_version="p")["products"][0]["xyz"],
                         "Missing_Quantity")

    def test_inactivity_uses_six_closed_months_and_order_references(self):
        rows = [{"period": f"2025-0{m}", "net_sales": 10, "order_id": f"dr{m}",
                 "derived_account_key": "a", "dataset_id": "d", "policy_version": "p"} for m in range(1, 4)]
        self.assertTrue(account_inactivity_review(rows, last_closed_month="2025-09")[0]["inactive_review_candidate"])
        self.assertFalse(account_inactivity_review(rows, last_closed_month="2025-08")[0]["inactive_review_candidate"])

    def test_job_creates_source_bound_review_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            records, mappings, output = root / "records.json", root / "map.json", root / "result.json"
            records.write_text(json.dumps([{"product": "a", "area": "Hospital", "period": "2026-01",
                                           "net_sales": "12.34", "quantity": 1, "unit_scope": None}]), encoding="utf-8")
            mappings.write_text("[]", encoding="utf-8")
            command = [sys.executable, "-m", "services.analytics_service.jobs.build_account_and_abc_xyz_review",
                       "--records", str(records), "--reviewed-mappings", str(mappings), "--dataset-id", "fixture",
                       "--policy-version", "test", "--last-closed-month", "2026-09", "--output", str(output)]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            artifact = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(artifact["account_join_audit"]["net_sales_after"], "12.34")
            self.assertFalse(artifact["operational_approval"])
            original = output.read_bytes()
            self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)
            self.assertEqual(original, output.read_bytes())

    def test_account_inactivity_rejects_mixed_or_missing_identity(self):
        row = dict(period='2025-01', net_sales=1, order_id='d', derived_account_key='a', dataset_id='old', policy_version='p')
        for changed in (dict(row, dataset_id='new'), dict(row, policy_version=None)):
            with self.assertRaises(ValueError):
                account_inactivity_review([row, changed], last_closed_month='2025-09')


if __name__ == "__main__":
    unittest.main()
