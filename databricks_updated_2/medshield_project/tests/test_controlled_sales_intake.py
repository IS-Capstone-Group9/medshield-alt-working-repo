"""Offline contract tests. Fake Spark checks orchestration, not Delta execution."""
import csv
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / "controlled_sales_intake.py"
spec = importlib.util.spec_from_file_location("controlled_intake", SOURCE)
intake = importlib.util.module_from_spec(spec)
spec.loader.exec_module(intake)


def encoded(rows):
    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow(intake.COLUMNS)
    writer.writerows(rows)
    return output.getvalue().encode("utf-8-sig")


def row(identifier="r1", product="Medicine", net="100.00", profit="20.00", quantity="2", delivery="2026-10-01"):
    return [identifier, delivery, "DR-1", product, "Cavite", quantity, net, profit]


class IntakeAssessmentTests(unittest.TestCase):
    def test_signed_money_zero_and_missing_values_conserve_without_unit_claim(self):
        result = intake.assess(encoded([row(), row("r2", net="-10.50", profit="-2.10", quantity="-1"),
                                        row("r3", net="0", profit="", quantity="")]), {"MEDICINE": "medicine"})
        self.assertEqual(result["counts"], {"received": 3, "accepted": 3, "rejected": 0, "category_review": 0})
        self.assertEqual(result["net_sales_candidate"], "89.50")
        self.assertEqual(result["gold"][0]["gross_profit"], "17.90")
        self.assertEqual(result["gold"][0]["gross_profit_record_count"], 2)
        self.assertIsNone(result["silver"][2]["reported_quantity"])
        self.assertEqual(result["silver"][0]["dr_number"], "DR-1")
        self.assertFalse(any(r["forecast_eligible"] for r in result["silver"]))

    def test_duplicate_ids_rejected_but_legitimate_repeated_rows_retained(self):
        result = intake.assess(encoded([row("same"), row("same"), row("distinct")]), {"MEDICINE": "medicine"})
        self.assertEqual(result["counts"]["received"], 3)
        self.assertEqual(result["counts"]["accepted"], 1)
        self.assertEqual(result["counts"]["rejected"], 2)
        self.assertEqual(len(result["bronze"]), 3)
        self.assertEqual(result["net_sales_candidate"], "100.00")
        repeated = intake.assess(encoded([row("r1"), row("r2")]), {"MEDICINE": "medicine"})
        self.assertEqual(repeated["net_sales_candidate"], "200.00")
        self.assertEqual(repeated["gold"][0]["record_count"], 2)

    def test_unknown_categories_are_preserved_and_need_review(self):
        result = intake.assess(encoded([row(product="Unknown")]), {})
        self.assertEqual(result["counts"]["accepted"], 1)
        self.assertEqual(result["counts"]["category_review"], 1)
        self.assertEqual(result["status"], "NEEDS_REVIEW")
        self.assertEqual(result["silver"][0]["product_category"], "unclassified")

    def test_arbitrary_years_supported_without_missing_month_imputation(self):
        result = intake.assess(encoded([row("r1", delivery="2017-01-01"), row("r2", delivery="2031-12-31")]), {"MEDICINE": "medicine"})
        self.assertEqual([r["calendar_month"] for r in result["gold"]], ["2017-01", "2031-12"])

    def test_invalid_row_fields_have_explicit_dispositions(self):
        cases = [row(delivery="2026-02-30"), row(product=" "), row(net="1,000"), row(profit="NaN"), row(quantity="1e3"), row(net="١٠")]
        for cells in cases:
            with self.subTest(cells=cells):
                result = intake.assess(encoded([cells]), {"MEDICINE": "medicine"})
                self.assertEqual(result["counts"]["rejected"], 1)
                self.assertEqual(result["gold"], [])
                self.assertEqual(result["status"], "NEEDS_REVIEW")
                self.assertTrue(result["silver"][0]["issues"])

    def test_quoted_embedded_comma_newline_and_quote_round_trip(self):
        product = 'Medicine, "Pack"\nVariant'
        result = intake.assess(encoded([row(product=product)]), {})
        self.assertEqual(result["bronze"][0]["raw"]["product"], product)

    def test_malformed_csv_rejected_before_any_candidate(self):
        header = ",".join(intake.COLUMNS).encode() + b"\n"
        bad = [b"", b"\xff", header, header + b"\n", header + b'1,2026-01-01,DR,Med"icine,Area,1,2,3',
               header + b'1,2026-01-01,DR,"Medicine"x,Area,1,2,3', header + b'1,2026-01-01,DR,"Medicine,Area,1,2,3',
               header + b'1,2026-01-01,DR,Med\0,Area,1,2,3', encoded([row(product="x" * 10001)]),
               b"x" * (10 * 1024 * 1024 + 1)]
        for data in bad:
            with self.subTest(length=len(data)):
                with self.assertRaises((ValueError, UnicodeDecodeError, csv.Error)):
                    intake.assess(data, {})

    def test_reference_requires_exact_approved_hash_and_nonconflicting_categories(self):
        data = b"raw_product,product_category,category_status\nMedicine,medicine,approved\nIgnore,medical_supply,proposed\n"
        self.assertEqual(intake.load_categories(data, intake.digest(data)), {"MEDICINE": "medicine"})
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            intake.load_categories(data)
        conflict = data + b"MEDICINE,medical_supply,approved\n"
        with self.assertRaisesRegex(ValueError, "Conflicting"):
            intake.load_categories(conflict, intake.digest(conflict))

    def test_current_approved_reference_matches_intake_binding(self):
        reference = SOURCE.parents[1] / "category_releases" / "category_b160d6aad4376d64" / "accepted_product_master.csv"
        categories = intake.load_categories(reference.read_bytes())
        self.assertTrue(categories)
        self.assertTrue(set(categories.values()).issubset(intake.CATEGORIES))

    def test_report_csv_is_formula_safe_and_exact_byte_bound(self):
        result = intake.assess(encoded([row(identifier="=1+1", product="@danger")]), {})
        report, files = intake.report_artifacts(result, "a" * 64, "b" * 64)
        self.assertIn(b"'@danger", files["classifications.csv"])
        self.assertIn(b"'=1+1", files["issues.csv"])
        self.assertEqual(result["bronze"][0]["raw"]["product"], "@danger")
        for kind in ("issues", "classifications"):
            self.assertEqual(report["reports"][kind], {"sha256": intake.digest(files[kind + ".csv"]), "bytes": len(files[kind + ".csv"])})
        self.assertTrue(report["candidate_only"])
        self.assertIs(report["published"], False)
        self.assertEqual(json.loads(files["report.json"]), report)

    def test_immutable_artifacts_retry_and_conflict_never_publish_valid_report(self):
        result = intake.assess(encoded([row()]), {"MEDICINE": "medicine"})
        _, files = intake.report_artifacts(result, "a" * 64, "b" * 64)
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            (base / "classifications.csv").write_bytes(b"partial")
            with self.assertRaisesRegex(ValueError, "identity conflict"):
                intake.write_artifacts(base, files)
            self.assertFalse((base / "report.json").exists())
            (base / "classifications.csv").unlink()
            intake.write_artifacts(base, files)
            intake.write_artifacts(base, files)
            self.assertEqual({p.name: p.read_bytes() for p in base.iterdir()}, files)


class FakeField:
    def __init__(self, name, *args):
        self.name = name


class FakeStruct(list):
    def fieldNames(self):
        return [field.name for field in self]


class FakeFrame:
    def __init__(self, spark, rows):
        self.spark, self.rows = spark, rows

    def createOrReplaceTempView(self, name):
        self.spark.current = self.rows

    def where(self, predicate):
        return self

    def select(self, *names):
        return self

    def collect(self):
        rows = list(self.rows)
        if self.spark.corrupt and rows:
            changed = list(rows[0])
            changed[2] = "wrong-source-hash"
            rows[0] = tuple(changed)
        return rows


class FakeSpark:
    def __init__(self, corrupt=False):
        self.corrupt, self.tables, self.current, self.commands = corrupt, {}, [], []

    def createDataFrame(self, rows, schema):
        return FakeFrame(self, rows)

    def sql(self, statement):
        self.commands.append(statement)
        if statement.startswith("CREATE TABLE"):
            self.tables.setdefault(statement.split()[5], [])
        elif statement.startswith("SELECT"):
            return types.SimpleNamespace(count=lambda: 0)
        elif statement.startswith("MERGE"):
            rows = self.tables[statement.split()[2]]
            for row in self.current:
                if not any(saved[:2] == row[:2] for saved in rows):
                    rows.append(row)

    def table(self, name):
        return FakeFrame(self, self.tables[name])


class IntakeOrchestrationTests(unittest.TestCase):
    def run_fixture(self, corrupt=False, manifest_change=None):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        volume = "/Volumes/catalog/intake/files"
        data = encoded([row()])
        identifier = intake.digest(f"{intake.POLICY}:1:{intake.digest(data)}".encode())
        base = root / "submissions" / identifier
        base.mkdir(parents=True)
        (base / "source.csv").write_bytes(data)
        manifest = {"schema_version": 1, "policy_version": intake.POLICY, "ingestion_id": identifier,
                    "account_id": 1, "source_sha256": intake.digest(data), "source_bytes": len(data), "record_count": 1}
        if manifest_change:
            manifest.update(manifest_change)
        (base / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        (root / "references").mkdir()
        (root / "references" / "accepted_product_master.csv").write_bytes(b"fixture")
        values = {"volume": volume, "ingestion_id": identifier, "candidate_schema": "catalog.medshield_intake"}
        dbutils = types.SimpleNamespace(widgets=types.SimpleNamespace(text=lambda *args: None, get=values.get),
                                        notebook=types.SimpleNamespace(exit=lambda value: value))
        spark = FakeSpark(corrupt)
        fake_types = types.ModuleType("pyspark.sql.types")
        fake_types.StructType, fake_types.StructField = FakeStruct, FakeField
        fake_types.StringType = lambda: None
        fake_types.DecimalType = lambda *args: None
        def execute():
            with patch.object(intake, "Path", return_value=root), patch.object(intake, "load_categories", return_value={"MEDICINE": "medicine"}), patch.dict(sys.modules, {"pyspark": types.ModuleType("pyspark"), "pyspark.sql": types.ModuleType("pyspark.sql"), "pyspark.sql.types": fake_types}):
                intake.run_intake(spark, dbutils)
        return base, spark, execute

    def test_fake_spark_stage_retry_and_report_last(self):
        base, spark, execute = self.run_fixture()
        execute()
        execute()
        self.assertEqual(len(spark.tables), 3)
        self.assertTrue(all(len(rows) == 1 for rows in spark.tables.values()))
        report = json.loads((base / "report.json").read_bytes())
        self.assertEqual(report["status"], "READY_FOR_APPROVAL")
        self.assertFalse(report["published"])
        self.assertTrue(all("catalog.medshield_intake." in sql for sql in spark.commands))
        for kind in ("issues", "classifications"):
            self.assertEqual(intake.digest((base / (kind + ".csv")).read_bytes()), report["reports"][kind]["sha256"])

    def test_corrupt_provenance_readback_blocks_report(self):
        base, _, execute = self.run_fixture(corrupt=True)
        with self.assertRaisesRegex(ValueError, "readback failed"):
            execute()
        self.assertFalse((base / "report.json").exists())

    def test_bad_manifest_blocks_all_candidate_writes(self):
        for mutation in ({"schema_version": 2}, {"account_id": True}, {"record_count": 2}, {"source_sha256": "0" * 64}):
            with self.subTest(mutation=mutation):
                base, spark, execute = self.run_fixture(manifest_change=mutation)
                with self.assertRaises(ValueError):
                    execute()
                self.assertEqual(spark.commands, [])
                self.assertFalse((base / "report.json").exists())

    def test_source_bytes_hashed_once_per_run_not_once_per_candidate_record(self):
        base, _, execute = self.run_fixture()
        data = (base / "source.csv").read_bytes()
        with patch.object(intake, "digest", wraps=intake.digest) as digest:
            execute()
        self.assertEqual(sum(args[0] == data for args, _ in digest.call_args_list), 1)


if __name__ == "__main__":
    unittest.main()
