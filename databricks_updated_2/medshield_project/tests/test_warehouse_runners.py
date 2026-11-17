"""Offline orchestration tests for stage runners and promotion with a fake Spark.

These check stage order, receipts, idempotent retry, base-release and approval gates. They do NOT
execute Spark or Delta and are not evidence that a deployed Databricks Job works.
"""
import json
import sys
import tempfile
import types
import unittest
from collections import Counter
from datetime import date
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT))
import controlled_sales_intake as intake  # noqa: E402
import warehouse_pipeline as wp  # noqa: E402
import warehouse_runners as wr  # noqa: E402

AS_OF = date(2026, 11, 30)
VOLUME, SCHEMA, RELEASE = "/Volumes/catalog/intake/files", "catalog.medshield_intake", "catalog.medshield_warehouse"
ENVELOPE = ["ingestion_id", "record_key", "source_sha256", "policy_version", "category_reference_sha256", "payload_sha256", "payload_json", "net_sales"]
CATEGORIES = {"MEDICINE": "medicine", "MYSTERY": "unclassified"}


def template(*records):
    return ("\n".join([",".join(intake.COLUMNS)] + list(records)) + "\n").encode("utf-8")


class Field:
    def __init__(self, name, kind, *args):
        self.name, self.kind = name, kind


class Struct(list):
    def fieldNames(self):
        return [f.name for f in self]


class Frame:
    def __init__(self, spark, rows, columns=None):
        self.spark, self.rows, self.columns = spark, list(rows), columns
        self.write = Writer(self)

    def createOrReplaceTempView(self, name):
        self.spark.current = self.rows

    def where(self, predicate):
        value = predicate.split("'")[1]
        return Frame(self.spark, [r for r in self.rows if r[0] == value], self.columns)

    def select(self, *names):
        return Frame(self.spark, [tuple(r[self.columns.index(n)] for n in names) for r in self.rows], list(names))

    def collect(self):
        rows = list(self.rows)
        if self.spark.corrupt_envelope and rows and self.columns == ENVELOPE:
            rows[0] = rows[0][:2] + ("wrong",) + rows[0][3:]
        return rows

    def count(self):
        return len(self.rows)

    def exceptAll(self, other):
        return Frame(self.spark, list((Counter(self.rows) - Counter(other.rows)).elements()))


class Writer:
    def __init__(self, frame):
        self.frame, self.append = frame, False

    def format(self, name):
        return self

    def mode(self, name):
        self.append = name == "append"
        return self

    def saveAsTable(self, name):
        tables = self.frame.spark.tables
        if name in tables and not self.append:
            raise AssertionError("overwrite attempted: " + name)
        tables.setdefault(name, []).extend(self.frame.rows)
        self.frame.spark.typed[name] = self.frame.columns


class Spark:
    def __init__(self):
        self.tables, self.typed, self.current, self.commands, self.corrupt_envelope = {}, {}, [], [], False
        self.catalog = types.SimpleNamespace(tableExists=lambda name: name in self.tables)

    def createDataFrame(self, rows, schema):
        return Frame(self, rows, schema.fieldNames())

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
        return Frame(self, self.tables[name], ENVELOPE if name.startswith(SCHEMA) else self.typed[name])


def fake_pyspark():
    fake = types.ModuleType("pyspark.sql.types")
    fake.StructType = Struct
    fake.StructField = lambda name, kind, nullable=True: Field(name, kind)
    for name in ("StringType", "IntegerType", "DateType", "BooleanType", "DecimalType"):
        setattr(fake, name, lambda *a, _n=name: _n)
    sql = types.ModuleType("pyspark.sql")
    sql.types = fake
    return {"pyspark": types.ModuleType("pyspark"), "pyspark.sql": sql, "pyspark.sql.types": fake}


class Harness:
    """One shared fake volume + Spark; each call patches the volume root exactly like the intake tests."""

    def __init__(self, testcase):
        directory = tempfile.TemporaryDirectory()
        testcase.addCleanup(directory.cleanup)
        self.root, self.spark = Path(directory.name), Spark()
        (self.root / "references").mkdir()
        (self.root / "references" / "accepted_product_master.csv").write_bytes(b"fixture")
        (self.root / "references" / "regional_delivery_mapping.json").write_bytes((PROJECT / "references/regional_delivery_mapping_4c5f44013464395e.json").read_bytes())

    def submit(self, data, account=1):
        identifier = intake.digest(f"{intake.POLICY}:{account}:{intake.digest(data)}".encode())
        base = self.root / "submissions" / identifier
        base.mkdir(parents=True)
        (base / "source.csv").write_bytes(data)
        manifest = {"schema_version": 1, "policy_version": intake.POLICY, "ingestion_id": identifier, "account_id": account,
                    "source_sha256": intake.digest(data), "source_bytes": len(data), "record_count": data.count(b"\n") - 1}
        (base / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        return identifier, base

    def run(self, function, identifier, **extra):
        values = {"volume": VOLUME, "ingestion_id": identifier, "candidate_schema": SCHEMA, "release_schema": RELEASE, **extra}
        exits = []
        dbutils = types.SimpleNamespace(widgets=types.SimpleNamespace(text=lambda *a: None, get=lambda k: values.get(k, "")),
                                        notebook=types.SimpleNamespace(exit=exits.append))
        with patch.object(intake, "Path", return_value=self.root), patch.object(wr, "Path", return_value=self.root), \
                patch.object(intake, "load_categories", return_value=CATEGORIES), patch.dict(sys.modules, fake_pyspark()):
            return function(self.spark, dbutils), exits

    def stages(self, identifier):
        for stage in wr.STAGES:
            self.run(lambda s, d, stage=stage: wr.run_stage(s, d, stage, as_of=AS_OF), identifier)

    def plan(self, identifier, base="NONE", first="2026-10", last="2026-10"):
        result, _ = self.promote(identifier, "", base=base, mode="plan", first=first, last=last)
        return result["plan_sha256"]

    def promote(self, identifier, approved, base="NONE", first="2026-10", last="2026-10", mode="apply", acknowledge=""):
        return self.run(wr.run_promote, identifier, base_release_id=base, first_month=first, last_month=last, approved_plan_sha256=approved, mode=mode, acknowledge_warnings=acknowledge)


OCT_A = template("r1,2026-10-01,DR-1,Medicine,Bicol,2,100.00,20.00")
OCT_B = template("r1,2026-10-02,DR-9,Medicine,Bicol,1,40.00,10.00")


class StageTests(unittest.TestCase):
    def test_client_export_manifest_count_matches_report_and_blocks_mismatch(self):
        h = Harness(self)
        data = (b"Area,DR Number,Date Delivered,Product,Qty,CP,Total CP,Disc,Net CP,TP Unit,Total TP,Net Income\r\n"
                b"Bicol,DR-1,2026-10-01,Medicine,1,10,10,0,10,8,8,2\r\n")
        identifier, base = h.submit(data)
        manifest_path = base / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest.update(source_format="client_export", record_count=2)
        manifest_path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(wp.PipelineError, "Source format or count mismatch"):
            h.run(lambda s, d: wr.run_stage(s, d, "bronze", as_of=AS_OF), identifier)
        self.assertEqual({}, h.spark.tables)
        manifest["record_count"] = 3
        manifest_path.write_text(json.dumps(manifest))
        h.stages(identifier)
        report = json.loads((base / "report.json").read_text())
        self.assertEqual("READY_FOR_APPROVAL", report["status"])
        self.assertEqual({"received": 3, "accepted": 1, "rejected": 0, "non_transaction": 2, "category_review": 0, "category_unmapped": 0}, report["counts"])

    def test_stages_run_in_order_write_chained_receipts_and_report_last(self):
        h = Harness(self)
        identifier, base = h.submit(OCT_A)
        h.stages(identifier)
        receipts = {s: json.loads((base / "stages" / f"stage_{s}.json").read_bytes()) for s in wr.STAGES}
        self.assertEqual(["bronze", "silver", "gold"], [receipts[s]["stage"] for s in wr.STAGES])
        self.assertIsNone(receipts["bronze"]["previous_receipt_sha256"])
        self.assertEqual(intake.digest((base / "stages" / "stage_bronze.json").read_bytes()), receipts["silver"]["previous_receipt_sha256"])
        self.assertEqual(intake.digest((base / "stages" / "stage_silver.json").read_bytes()), receipts["gold"]["previous_receipt_sha256"])
        report = json.loads((base / "report.json").read_bytes())
        self.assertEqual({"READY_FOR_APPROVAL", "100.00", False}, {report["status"], report["net_sales_candidate"], report["published"]})
        self.assertTrue(all(r["candidate_only"] and not r["published"] for r in receipts.values()))
        self.assertTrue(all(SCHEMA in sql for sql in h.spark.commands))  # only the isolated intake schema is written

    def test_rerun_is_idempotent_and_does_not_duplicate_rows(self):
        h = Harness(self)
        identifier, _ = h.submit(OCT_A)
        h.stages(identifier)
        before = {name: list(rows) for name, rows in h.spark.tables.items()}
        h.stages(identifier)
        self.assertEqual(before, h.spark.tables)

    def test_later_stage_before_earlier_stage_is_blocked_without_writes(self):
        h = Harness(self)
        identifier, base = h.submit(OCT_A)
        with self.assertRaisesRegex(wp.PipelineError, "no receipt"):
            h.run(lambda s, d: wr.run_stage(s, d, "silver"), identifier)
        self.assertEqual([], h.spark.commands)
        self.assertFalse((base / "report.json").exists())

    def test_tampered_manifest_blocks_every_stage(self):
        h = Harness(self)
        identifier, base = h.submit(OCT_A)
        manifest = json.loads((base / "manifest.json").read_text())
        (base / "manifest.json").write_text(json.dumps({**manifest, "source_sha256": "0" * 64}))
        with self.assertRaises(ValueError):
            h.run(lambda s, d: wr.run_stage(s, d, "bronze", as_of=AS_OF), identifier)
        self.assertEqual([], h.spark.commands)

    def test_corrupt_readback_blocks_stage_receipt(self):
        h = Harness(self)
        identifier, base = h.submit(OCT_A)
        h.spark.corrupt_envelope = True
        with self.assertRaisesRegex(ValueError, "readback failed"):
            h.run(lambda s, d: wr.run_stage(s, d, "bronze", as_of=AS_OF), identifier)
        self.assertFalse((base / "stages").exists())

    def test_category_review_leaves_candidate_needing_review(self):
        h = Harness(self)
        identifier, base = h.submit(template("r1,2026-10-01,DR-1,Unknown Drug,Bicol,2,100.00,20.00"))
        h.stages(identifier)
        report = json.loads((base / "report.json").read_bytes())
        self.assertEqual(("NEEDS_REVIEW", 1), (report["status"], report["counts"]["category_review"]))


class PromotionTests(unittest.TestCase):
    def prepared(self, data=OCT_A):
        h = Harness(self)
        identifier, base = h.submit(data)
        h.stages(identifier)
        return h, identifier, base

    def test_first_release_is_new_versioned_and_pointer_is_last(self):
        h, identifier, base = self.prepared()
        result, _ = h.promote(identifier, h.plan(identifier))
        release = result["release_id"]
        self.assertEqual(("2026-10", False, False, True), ("2026-10", result["business_approval"], result["dashboard_serving_changed"], result["warehouse_release_created"]))
        self.assertEqual({"1", "100.000000"}, {str(result["controls"]["after"]["records"]), result["controls"]["after"]["net_sales"]})
        for name in ("fact_sales_line", "dim_date", "dim_area", "dim_product", "mart_monthly", "mart_area_monthly"):
            self.assertIn(f"{RELEASE}.release_{release}_{name}", h.spark.tables)
        self.assertEqual(1, len(h.spark.tables[f"{RELEASE}.release_pointer"]))
        self.assertTrue((base / "promotions" / f"release_{release}.json").exists())
        self.assertFalse(any(name.startswith("workspace.medshield_gold") for name in h.spark.tables))  # serving untouched

    def test_plan_mode_is_read_only_and_yields_the_hash_to_approve(self):
        h, identifier, base = self.prepared()
        before = {k: list(v) for k, v in h.spark.tables.items()}
        plan, _ = h.promote(identifier, "", mode="plan")
        self.assertEqual(h.plan(identifier), plan["plan_sha256"])
        self.assertEqual((False, False, False), (plan["release_authorized"], plan["business_approval"], plan["warehouse_release_created"]))
        self.assertEqual(before, h.spark.tables)  # no release table, no pointer
        self.assertTrue((base / "promotions" / f"plan_{plan['plan_sha256']}.json").exists())
        applied, _ = h.promote(identifier, plan["plan_sha256"])  # the previewed hash is exactly what apply accepts
        self.assertTrue(applied["warehouse_release_created"])

    def test_mode_is_required_and_validated(self):
        h, identifier, _ = self.prepared()
        for mode in ("", "delete", "APPLY"):
            with self.assertRaisesRegex(wp.PipelineError, "mode must be"):
                h.promote(identifier, "0" * 64, mode=mode)

    def test_replay_is_idempotent(self):
        h, identifier, _ = self.prepared()
        approved = h.plan(identifier)
        first, _ = h.promote(identifier, approved)
        tables = {k: list(v) for k, v in h.spark.tables.items()}
        again, _ = h.promote(identifier, approved)
        self.assertEqual(first["release_id"], again["release_id"])
        self.assertTrue(again["idempotent_replay"])
        with self.assertRaisesRegex(wp.PipelineError, "Replay period"):
            h.promote(identifier, approved, last="2026-11")
        self.assertEqual(tables, h.spark.tables)  # nothing rewritten, no second pointer row

    def test_missing_or_tampered_preview_blocks_apply(self):
        h, identifier, base = self.prepared()
        approved = h.plan(identifier)
        preview = base / "promotions" / f"plan_{approved}.json"
        preview.write_text("{}", encoding="utf-8")
        with self.assertRaisesRegex(wp.PipelineError, "Saved promotion preview"):
            h.promote(identifier, approved)
        preview.unlink()
        with self.assertRaisesRegex(wp.PipelineError, "Saved promotion preview"):
            h.promote(identifier, approved)
        self.assertFalse(any("release_" in name for name in h.spark.tables))

    def test_wrong_or_stale_approved_plan_writes_nothing(self):
        h, identifier, _ = self.prepared()
        before = dict(h.spark.tables)
        for approved in ("0" * 64, "", "not-a-hash"):
            with self.assertRaisesRegex(wp.PipelineError, "approved plan"):
                h.promote(identifier, approved)
        self.assertEqual(before, h.spark.tables)

    def test_second_upload_replaces_only_declared_month_hand_computed(self):
        h, id_a, _ = self.prepared(OCT_A)
        first, _ = h.promote(id_a, h.plan(id_a))
        id_b, _ = h.submit(OCT_B)
        h.stages(id_b)
        plan = h.plan(id_b, base=first["release_id"])
        with self.assertRaisesRegex(wp.PipelineError, "acknowledgement: MONTH_SHRINK"):
            h.promote(id_b, plan, base=first["release_id"])
        second, _ = h.promote(id_b, plan, base=first["release_id"], acknowledge="true")
        c = second["controls"]
        self.assertEqual(({"records": 1, "net_sales": "100.000000"}, {"records": 1, "net_sales": "100.000000"}, {"records": 1, "net_sales": "40.000000"}, {"records": 1, "net_sales": "40.000000"}),
                         (c["before"], c["removed"], c["added"], c["after"]))
        self.assertEqual(first["release_id"], second["previous_release_id"])
        self.assertIn(f"{RELEASE}.release_{first['release_id']}_fact_sales_line", h.spark.tables)  # earlier release retained

    def test_base_must_be_the_current_release(self):
        h, id_a, _ = self.prepared(OCT_A)
        first, _ = h.promote(id_a, h.plan(id_a))
        id_b, _ = h.submit(OCT_B)
        h.stages(id_b)
        with self.assertRaisesRegex(wp.PipelineError, "not the current release"):
            h.promote(id_b, "0" * 64, base="NONE")
        self.assertEqual(1, len(h.spark.tables[f"{RELEASE}.release_pointer"]))

    def test_candidate_needing_review_cannot_be_promoted(self):
        h, identifier, _ = self.prepared(template("r1,2026-10-01,DR-1,Unknown Drug,Bicol,2,100.00,20.00"))
        with self.assertRaisesRegex(wp.PipelineError, "approved category reference"):
            h.promote(identifier, "0" * 64)
        with self.assertRaisesRegex(wp.PipelineError, "approved category reference"):
            h.promote(identifier, "", mode="plan")
        self.assertFalse(any("release_" in name for name in h.spark.tables))

    def test_release_area_dimension_carries_the_confirmed_territory_only(self):
        data = template("r1,2026-10-01,DR-1,Medicine,Batangas,2,100.00,20.00", "r2,2026-10-02,DR-2,Medicine,Government,1,50.00,10.00")
        h, identifier, _ = self.prepared(data)
        result, _ = h.promote(identifier, h.plan(identifier))
        columns = dict(enumerate(name for name, _ in wr.DIM_COLUMNS["dim_area"]))
        areas = [dict(zip(columns.values(), row)) for row in h.spark.tables[f"{RELEASE}.release_{result['release_id']}_dim_area"]]
        by_area = {a["area"]: (a["territory_id"], a["delivery_status"]) for a in areas}
        self.assertEqual({"BATANGAS": ("PH-PROVINCE-BATANGAS", "confirmed_delivery_area"), "GOVERNMENT": (None, "unallocated")}, by_area)

    def test_tampered_regional_mapping_blocks_gold(self):
        h = Harness(self)
        (h.root / "references" / "regional_delivery_mapping.json").write_bytes(b"{}")
        identifier, base = h.submit(OCT_A)
        with self.assertRaisesRegex(wp.PipelineError, "hash mismatch"):
            h.stages(identifier)
        self.assertFalse((base / "report.json").exists())

    def test_release_built_on_an_older_release_schema_still_works(self):
        h, id_a, _ = self.prepared(OCT_A)
        first, _ = h.promote(id_a, h.plan(id_a))
        table = f"{RELEASE}.release_{first['release_id']}_fact_sales_line"
        h.spark.tables[table] = [row[:-1] for row in h.spark.tables[table]]  # as written before is_margin_eligible existed
        id_b, _ = h.submit(template("r1,2026-11-02,DR-9,Medicine,Bicol,1,40.00,10.00"))
        h.stages(id_b)
        second, _ = h.promote(id_b, h.plan(id_b, first["release_id"], "2026-11", "2026-11"), base=first["release_id"], first="2026-11", last="2026-11")
        self.assertEqual({"records": 2, "net_sales": "140.000000"}, second["controls"]["after"])

    def test_held_rows_need_acknowledgement_and_are_recorded(self):
        data = template("r1,2026-10-01,DR-1,Medicine,Bicol,2,100.00,20.00", "r2,not-a-date,DR-2,Medicine,Bicol,1,10.00,2.00")
        h, identifier, _ = self.prepared(data)
        approved = h.plan(identifier)
        with self.assertRaisesRegex(wp.PipelineError, "acknowledgement: HELD_ROWS"):
            h.promote(identifier, approved)
        self.assertFalse(any("release_" in name for name in h.spark.tables))
        result, _ = h.promote(identifier, approved, acknowledge="true")
        warning = result["controls"]["warnings"][0]
        self.assertEqual(("HELD_ROWS", 1, "INVALID_DELIVERY_DATE"), (warning["code"], warning["records"], next(iter(warning["by_reason"]))))
        self.assertEqual(1, result["controls"]["after"]["records"])  # the held row never entered the release

    def test_recorded_unclassified_rows_promote_only_with_acknowledgement(self):
        h, identifier, base = self.prepared(template("r1,2026-10-01,DR-1,Mystery,Bicol,2,100.00,20.00"))
        self.assertEqual("NEEDS_REVIEW", json.loads((base / "report.json").read_bytes())["status"])
        approved = h.plan(identifier)
        with self.assertRaisesRegex(wp.PipelineError, "acknowledgement: UNCLASSIFIED_ROWS"):
            h.promote(identifier, approved)
        self.assertTrue(h.promote(identifier, approved, acknowledge="true")[0]["warehouse_release_created"])

    def test_invalid_acknowledgement_value_rejected(self):
        h, identifier, _ = self.prepared()
        with self.assertRaisesRegex(wp.PipelineError, "acknowledge_warnings"):
            h.promote(identifier, "0" * 64, acknowledge="yes")

    def test_declared_period_not_covering_candidate_months_is_blocked(self):
        h, identifier, _ = self.prepared()
        with self.assertRaisesRegex(wp.PipelineError, "outside the declared"):
            h.promote(identifier, "0" * 64, first="2026-11", last="2026-11")
        self.assertFalse(any("release_" in name for name in h.spark.tables))

    def test_invalid_release_schema_and_base_id_rejected(self):
        h, identifier, _ = self.prepared()
        with self.assertRaisesRegex(wp.PipelineError, "base release id"):
            h.promote(identifier, "0" * 64, base="../etc")


def seed_row(record, net="100.00", dr="DR-1", eligible=True):
    return dict(source_record_id=record, dataset_id=wp.SEED_DATASET_ID, record_kind="itemized_sale", date_delivered=date(2026, 9, 1), area="BATANGAS", dr_number=dr, normalized_product="MEDICINE",
                product_key="k" * 64, product_category="medicine", recorded_quantity=Decimal("2"), gross_sales=Decimal(net) if net else None, discount_amount=Decimal(0), net_sales=Decimal(net) if net else None,
                acquisition_cost=Decimal("60.00"), gross_margin_amount=Decimal("40.00"), is_net_sales_technically_eligible=eligible, is_gross_margin_technically_eligible=eligible)


class SeedRunnerTests(unittest.TestCase):
    ROWS = [seed_row("s1"), seed_row("s2", net=None, eligible=False)]
    CONTROLS = {"records": 2, "eligible_records": 1, "eligible_net": Decimal("100.00"), "margin_records": 1, "margin_net": Decimal("100.00"), "gross_margin": Decimal("40.00")}

    def setUp(self):
        for patcher in (patch.object(wp, "SEED_CONTROLS", self.CONTROLS), patch.object(wr, "read_seed_rows", return_value=self.ROWS)):
            patcher.start()
            self.addCleanup(patcher.stop)

    def seed(self, h, approved="", base="NONE", mode="plan", acknowledge=""):
        return h.run(wr.run_seed, "", base_release_id=base, approved_plan_sha256=approved, mode=mode, acknowledge_warnings=acknowledge)[0]

    def test_plan_is_read_only_and_apply_needs_hash_and_acknowledgement(self):
        h = Harness(self)
        plan = self.seed(h)
        self.assertEqual({}, h.spark.tables)
        with self.assertRaisesRegex(wp.PipelineError, "approved plan"):
            self.seed(h, "0" * 64, mode="apply", acknowledge="true")
        with self.assertRaisesRegex(wp.PipelineError, "acknowledgement: HELD_ROWS"):
            self.seed(h, plan["plan_sha256"], mode="apply")
        self.assertEqual({}, h.spark.tables)
        result = self.seed(h, plan["plan_sha256"], mode="apply", acknowledge="true")
        self.assertEqual({"records": 1, "net_sales": "100.000000"}, result["controls"]["after"])
        self.assertEqual((False, False), (result["business_approval"], result["dashboard_serving_changed"]))
        self.assertEqual(1, len(h.spark.tables[f"{RELEASE}.release_pointer"]))
        self.assertTrue(self.seed(h, plan["plan_sha256"], mode="apply", acknowledge="true")["idempotent_replay"])

    def test_seed_clears_a_test_chain_but_never_real_rows(self):
        h = Harness(self)
        identifier, _ = h.submit(template("r1,2026-10-01,SYNTH-1,Medicine,Bicol,2,100.00,20.00"))
        h.stages(identifier)
        first = h.promote(identifier, h.plan(identifier))[0]["release_id"]
        plan = self.seed(h, base=first)
        seeded = self.seed(h, plan["plan_sha256"], base=first, mode="apply", acknowledge="true")
        self.assertEqual(["2026-09"], sorted({row[wr.FACT_COLUMNS.index(("calendar_month", "string"))] for row in h.spark.tables[f"{RELEASE}.release_{seeded['release_id']}_fact_sales_line"]}))
        with self.assertRaisesRegex(wp.PipelineError, "real rows"):
            self.seed(h, base=seeded["release_id"])

    def test_stale_base_and_changed_source_are_refused(self):
        h = Harness(self)
        with self.assertRaisesRegex(wp.PipelineError, "not the current release"):
            self.seed(h, base="a" * 16)
        with patch.object(wr, "read_seed_rows", return_value=self.ROWS[:1]), self.assertRaisesRegex(wp.PipelineError, "pinned baseline"):
            self.seed(h)


class DeploymentArtifactTests(unittest.TestCase):
    JOBS = PROJECT.parent / "jobs"

    def test_notebooks_are_valid_source_and_call_only_their_stage(self):
        import ast
        for stage in wr.STAGES:
            text = (PROJECT / f"intake_stage_{stage}.py").read_text(encoding="utf-8")
            ast.parse(text)
            self.assertTrue(text.startswith("# Databricks notebook source"))
            self.assertIn(f'run_stage(spark, dbutils, "{stage}")', text)
            self.assertNotIn("medshield_gold", text)
        promote = (PROJECT / "intake_promote.py").read_text(encoding="utf-8")
        ast.parse(promote)
        self.assertIn("run_promote(spark, dbutils)", promote)

    def test_upload_job_chains_stages_and_promotion_is_a_separate_single_writer_job(self):
        upload = json.loads((self.JOBS / "medshield_upload_pipeline.job.json").read_text(encoding="utf-8"))
        tasks = {t["task_key"]: t for t in upload["tasks"]}
        self.assertEqual(["bronze", "silver", "gold"], [t["task_key"] for t in upload["tasks"]])
        self.assertEqual([{"task_key": "bronze"}], tasks["silver"]["depends_on"])
        self.assertEqual([{"task_key": "silver"}], tasks["gold"]["depends_on"])
        self.assertNotIn("promote", tasks)
        promote = json.loads((self.JOBS / "medshield_promote_release.job.json").read_text(encoding="utf-8"))
        self.assertEqual(1, promote["max_concurrent_runs"])
        self.assertTrue(upload["queue"]["enabled"] and promote["queue"]["enabled"])
        for job in (upload, promote):
            declared = {p["name"] for p in job["parameters"]}
            used = {v[len("{{job.parameters."):-2] for t in job["tasks"] for v in t["notebook_task"]["base_parameters"].values()}
            self.assertLessEqual(used, declared)


if __name__ == "__main__":
    unittest.main()
