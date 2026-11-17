"""2026 intake contracts: hand-solvable records, source identity and write isolation."""
from collections import Counter
import copy
import csv
from decimal import Decimal
import hashlib
import importlib.util
import io
from pathlib import Path
import unittest

from test_restart import pure_notebook_namespace

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]
spec = importlib.util.spec_from_file_location("source_rebuild", PROJECT / "source_rebuild.py")
source_api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source_api)


def contract_fixture():
    baseline = [{"source_workbook": f"medshield_data_{y}.csv", "source_file_sha256": hashlib.sha256(str(y).encode()).hexdigest(),
                 "raw_line_count": 2, "source_data_status": "ORIGINAL_SOURCE_EXPORT", "source_adjustment_policy": None} for y in range(2017, 2026)]
    manifest = baseline + [{"source_workbook": "medshield_data_2026.csv", "source_file_sha256": "a" * 64, "raw_line_count": 3,
                            "source_data_status": "UNREVIEWED_SOURCE_EXPORT", "source_adjustment_policy": None}]
    return {"schema_version": 1, "mode": source_api.SOURCE_MODE, "batch": "source_20261022",
            "baseline_table": source_api.BASELINE_TABLE, "baseline_fact_version": 20, "baseline_records": 37728,
            "baseline_identity": {"dataset_id": source_api.digest_identity(baseline), "policy_version": "sales_restart_gold_v7_independent_catalog"},
            "baseline_sources": baseline, "source_manifest": manifest, "dataset_id": source_api.digest_identity(manifest),
            "reference_hashes": {k: "b" * 64 for k in source_api.REFERENCE_KEYS},
            "target_schemas": {layer: f"workspace.medshield_{layer}_source_20261022" for layer in ("bronze", "silver", "gold", "audit")},
            "activate_serving": False, "business_approval": False, "train_models": False}


class SourceContractTests(unittest.TestCase):
    def test_valid_source_contract_and_exact_manifest(self):
        contract = contract_fixture()
        self.assertIs(source_api.validate_contract(contract), contract)
        source_api.validate_manifest(contract, contract["source_manifest"])
        changed = copy.deepcopy(contract["source_manifest"])
        changed[-1]["raw_line_count"] += 1
        with self.assertRaisesRegex(ValueError, "Uploaded sources"):
            source_api.validate_manifest(contract, changed)

    def test_serving_schema_and_approval_escalation_are_rejected(self):
        for change in ("schema", "activate_serving", "business_approval", "train_models"):
            contract = contract_fixture()
            if change == "schema":
                contract["target_schemas"]["gold"] = "workspace.medshield_gold"
            else:
                contract[change] = True
            with self.subTest(change=change), self.assertRaises(ValueError):
                source_api.validate_contract(contract)

    def test_baseline_source_replacement_and_dataset_tamper_are_rejected(self):
        for change in ("baseline", "identity"):
            contract = copy.deepcopy(contract_fixture())
            if change == "baseline":
                contract["source_manifest"][0]["source_file_sha256"] = "c" * 64
                contract["dataset_id"] = source_api.digest_identity(contract["source_manifest"])
            else:
                contract["dataset_id"] = "c" * 64
            with self.subTest(change=change), self.assertRaises(ValueError):
                source_api.validate_contract(contract)

    def test_historical_values_nulls_and_keys_cannot_change(self):
        before = [{"source_record_id": "old", "net_sales": Decimal("-1.25"), "quantity": None, "dataset_id": "old"}]
        after = [{**before[0], "dataset_id": "new"}, {**before[0], "source_record_id": "added", "dataset_id": "new"}]
        source_api.validate_preserved_rows(before, after)
        for changed in ([], [{**after[0], "net_sales": Decimal("1.25")}], [{**after[0], "quantity": Decimal(0)}], [after[0], after[0]]):
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                source_api.validate_preserved_rows(before, changed)

    def test_write_guard_rejects_main_schema_and_other_dataset(self):
        class Catalog:
            def tableExists(self, table): return True
        class Frame:
            def select(self, *args): return self
            def distinct(self): return self
            def collect(self): return [{"dataset_id": "other"}]
        class Spark:
            catalog = Catalog()
            def table(self, table): return Frame()
        contract = contract_fixture()
        with self.assertRaisesRegex(ValueError, "outside"):
            source_api.assert_target(Spark(), contract, source_api.BASELINE_TABLE)
        with self.assertRaisesRegex(ValueError, "another dataset"):
            source_api.assert_target(Spark(), contract, contract["target_schemas"]["gold"] + ".sales_restart_fact_candidate")

    def test_changed_live_predecessor_version_is_rejected_before_reading_rows(self):
        class History:
            def first(self): return {"version": 21}
        class Spark:
            def sql(self, statement):
                self.assert_read_only = statement.startswith("DESCRIBE HISTORY")
                return History()
        with self.assertRaisesRegex(ValueError, "changed since capture"):
            source_api.assert_predecessor(Spark(), contract_fixture())


class GroupedSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bronze = pure_notebook_namespace("01_sales_bronze.py")
        cls.silver = pure_notebook_namespace("02_sales_silver.py")

    def assess(self, product="MEDICINE", delivery="September 09, 2026", cost_quantity="1", subheader=True):
        top = ["MO", "DATE", "AREA", "DR NUMBER", "DATE DELIVERED", "DOCTOR", "PRODUCT", "GROSS SALES", "", "", "NET SALES", "", "", "COST OF SALES", "", "", "GROSS INCOME"]
        secondary = ["", "", "", "", "", "", "", "QUANTITY", "CP/UNIT", "TOTAL SALES", "% DISCOUNT", "DISCOUNT", "NET SALES", "QUANTITY", "TP/UNIT", "TOTAL COST", ""]
        if not subheader:
            secondary[13] = "SALES UNITS"
        row = ["9", "09/10/26", "AREA", "DR-1", delivery, "", product, "2", "100", "200", "", "-", "200", cost_quantity, "50", "50", "150"]
        stream = io.StringIO(newline="")
        csv.writer(stream, lineterminator="\n").writerows([top, secondary, row])
        text = stream.getvalue()
        digest = hashlib.sha256(text.encode()).hexdigest()
        sources = [{"dataset_id": "fixture", "source_record_id": self.bronze["source_record_key"]("medshield_data_2026.csv", digest, i),
                    "source_workbook": "medshield_data_2026.csv", "source_file_sha256": digest, "data_source_year": 2026,
                    "source_row_number": i, "raw_csv_line": line, "source_path": "fixture"} for i, line in enumerate(text.split("\n"), 1)]
        return sources, self.silver["assess_sales_records"](sources)

    def test_two_quantities_and_net_margin_are_not_interchanged(self):
        sources, assessed = self.assess()
        row = next(r for r in assessed if r["record_kind"] == "TRANSACTION_CANDIDATE")
        self.assertEqual((row["quantity"], row["quantity_secondary_candidate"]), (Decimal(2), Decimal(1)))
        self.assertEqual(row["net_sales"], Decimal(200))
        self.assertEqual(row["date_delivered"].isoformat(), "2026-09-09")
        self.assertIn("SALES_AND_COST_QUANTITIES_DIFFER", row["quality_rule_codes"])
        self.assertNotIn("TRANSFER_VALUE_FORMULA_MISMATCH", row["quality_rule_codes"])
        self.assertNotIn("GROSS_MARGIN_FORMULA_MISMATCH", row["quality_rule_codes"])

    def test_no_date_never_uses_posting_date_or_month(self):
        _, assessed = self.assess(delivery="NO DATE")
        row = next(r for r in assessed if r["record_kind"] == "TRANSACTION_CANDIDATE")
        self.assertIsNone(row["date_delivered"])
        self.assertFalse(row["is_analysis_candidate"])
        self.assertIn("EXPLICIT_NO_DELIVERY_DATE", row["quality_rule_codes"])

    def test_multiline_cell_preserves_every_physical_key_once(self):
        sources, assessed = self.assess(product="MEDICINE\nBETA")
        self.assertEqual(Counter(r["source_record_id"] for r in sources), Counter(r["source_record_id"] for r in assessed))
        continuation = [r for r in assessed if r["disposition"] == "EXCLUDE_MULTILINE_CSV_CONTINUATION"]
        self.assertEqual(len(continuation), 1)
        kept = [r for r in assessed if r["is_analysis_candidate"]]
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]["product"], "MEDICINE BETA")
        self.assertEqual(continuation[0]["source_row_number"], kept[0]["source_row_number"] + 1)

    def test_changed_cost_subheader_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "subheader"):
            self.assess(subheader=False)

    def test_reviewed_2026_bytes_and_unreviewed_provenance(self):
        path = PROJECT.parent / "medshield_project_csv/medshield_data_2026.csv"
        if not path.is_file(): self.skipTest("2026 intake source not installed")
        payload = path.read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        lines = self.bronze["decode_csv_source"](payload, path.name)
        self.assertEqual(len(lines), 3431)
        self.assertEqual(self.bronze["source_provenance"](path.name, digest), ("UNREVIEWED_SOURCE_EXPORT", None))
        with self.assertRaises(ValueError): self.bronze["source_provenance"](path.name, "changed")
        with self.assertRaises(ValueError): self.bronze["decode_csv_source"](payload, "unreviewed.csv")


if __name__ == "__main__":
    unittest.main()
