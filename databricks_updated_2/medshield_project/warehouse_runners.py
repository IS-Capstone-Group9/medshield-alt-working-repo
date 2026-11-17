"""Spark/Delta runners for the staged upload pipeline: one Job task per stage plus promotion.

All consequential rules live in ``warehouse_pipeline`` (pure, unit-tested). These runners only move
data through Delta tables and immutable volume receipts. Serving objects are never written:
uploads stay candidate-only in ``<catalog>.medshield_intake`` until ``run_promote`` builds a NEW
versioned release in ``<catalog>.medshield_warehouse`` from an exactly approved plan hash.
"""
import json
import re
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent if "__file__" in globals() else None
if HERE is not None and str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
import controlled_sales_intake as intake  # noqa: E402
import warehouse_pipeline as wp  # noqa: E402
from warehouse_pipeline import CENT, MEASURES, PipelineError, require  # noqa: E402

STAGES = ("bronze", "silver", "gold")
LAYER_TABLES = {"bronze": "wh_bronze_lines", "silver": "wh_silver_rows", "fact": "wh_gold_fact_sales_line", "dim_date": "wh_gold_dim_date",
                "dim_area": "wh_gold_dim_area", "dim_product": "wh_gold_dim_product", "mart_monthly": "wh_gold_mart_monthly",
                "mart_area_monthly": "wh_gold_mart_area_monthly"}
GOLD_KEYS = {"fact": lambda r: r["sales_line_id"], "dim_date": lambda r: r["date_key"], "dim_area": lambda r: r["area_key"],
             "dim_product": lambda r: r["product_key"], "mart_monthly": lambda r: f"{r['calendar_month']}|{r['product_category']}",
             "mart_area_monthly": lambda r: f"{r['calendar_month']}|{r['area_key']}|{r['product_category']}"}
FACT_COLUMNS = (("sales_line_id", "string"), ("ingestion_id", "string"), ("source_record_id", "string"), ("delivery_date", "date"),
                ("calendar_month", "string"), ("date_key", "int"), ("area_key", "string"), ("area", "string"), ("product_key", "string"),
                ("product", "string"), ("product_category", "string"), ("category_status", "string"), ("dr_number", "string"),
                *((name, "decimal") for name in MEASURES), ("candidate_only", "bool"), ("forecast_eligible", "bool"),
                ("source_unit_approved", "bool"), ("financial_release_approved", "bool"), ("publication_status", "string"),
                ("is_margin_eligible", "bool"))  # append only: earlier releases are read positionally
MART_MEASURES = (("record_count", "int"), ("net_sales", "decimal"), ("margin_record_count", "int"), ("margin_net_sales", "decimal"), ("gross_margin", "decimal"))
DIM_COLUMNS = {"dim_date": (("date_key", "int"), ("date", "date"), ("year", "int"), ("month", "int"), ("quarter", "int"), ("calendar_month", "string"), ("has_sales", "bool")),
               "dim_area": (("area_key", "string"), ("area", "string"), ("province", "string"), ("region", "string"), ("province_psgc_code", "string"),
                            ("territory_id", "string"), ("delivery_status", "string"), ("is_external_join_ready", "bool")),
               "dim_product": (("product_key", "string"), ("product", "string"), ("product_category", "string"), ("category_status", "string")),
               "mart_monthly": (("calendar_month", "string"), ("product_category", "string"), *MART_MEASURES),
               "mart_area_monthly": (("calendar_month", "string"), ("area_key", "string"), ("territory_id", "string"), ("product_category", "string"), *MART_MEASURES)}
POINTER_COLUMNS = (("release_id", "string"), ("previous_release_id", "string"), ("ingestion_id", "string"), ("plan_sha256", "string"),
                   ("source_sha256", "string"), ("declared_first_month", "string"), ("declared_last_month", "string"), ("records", "int"),
                   ("net_sales", "decimal"), ("business_approval", "bool"), ("dashboard_serving_changed", "bool"))


# ---- candidate-schema envelopes (reuse the intake's insert-only, conflict-checked, read-back merge)
def envelope(ingestion_id, source_hash, key, payload, amount=None):
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    cents = None if amount is None else Decimal(amount).quantize(CENT)
    return (ingestion_id, str(key), source_hash, intake.POLICY, intake.MASTER_HASH, intake.digest(encoded.encode()), encoded, cents)


def persist_layer(spark, schema, name, ingestion_id, source_hash, keyed_rows, amount=None):
    envelopes = [envelope(ingestion_id, source_hash, key, row, amount(row) if amount else None) for key, row in keyed_rows]
    require(len({e[1] for e in envelopes}) == len(envelopes), "Duplicate record keys in " + name)
    intake.merge_layer(spark, f"{schema}.{LAYER_TABLES[name]}", intake.envelope_fields(), envelopes, ingestion_id)


def read_layer(spark, schema, name, ingestion_id):
    rows = spark.table(f"{schema}.{LAYER_TABLES[name]}").where(f"ingestion_id = '{ingestion_id}'").select("record_key", "payload_sha256", "payload_json").collect()
    result = []
    for _, payload_sha, payload in rows:
        require(intake.digest(payload.encode()) == payload_sha, "Stored payload checksum mismatch in " + name)
        result.append(json.loads(payload))
    require(result, "Previous stage produced no rows; run stages in order")
    return result


# ---- stage receipts (immutable, hash-chained, written to the submission folder)
def load_regions(volume):
    return wp.load_regions((Path(volume) / "references" / "regional_delivery_mapping.json").read_bytes())


def stage_receipt(stage, ingestion_id, source_hash, previous, **fields):
    return {"schema_version": 1, "pipeline_version": wp.PIPELINE_VERSION, "stage": stage, "state": "SUCCEEDED", "ingestion_id": ingestion_id,
            "source_sha256": source_hash, "category_reference_sha256": intake.MASTER_HASH, "candidate_only": True, "published": False,
            "previous_receipt_sha256": previous, **fields}


def write_receipt(base, stage, receipt):
    folder = base / "stages"
    folder.mkdir(exist_ok=True)
    content = json.dumps(receipt, sort_keys=True).encode("utf-8")
    intake.write_artifacts(folder, {f"stage_{stage}.json": content})
    return intake.digest(content)


def read_receipt(base, stage):
    path = base / "stages" / f"stage_{stage}.json"
    require(path.exists(), f"Previous stage '{stage}' has no receipt; run stages in order")
    content = path.read_bytes()
    receipt = json.loads(content)
    require(receipt.get("state") == "SUCCEEDED" and receipt.get("stage") == stage, "Previous stage receipt is not successful")
    return receipt, intake.digest(content)


def run_stage(spark, dbutils, stage, as_of=None):
    """Execute exactly one stage for one immutable submission. Idempotent; never touches serving objects."""
    require(stage in STAGES, "Unknown stage")
    for key in ("ingestion_id", "volume", "candidate_schema"):
        dbutils.widgets.text(key, "")
    ingestion_id, volume, schema = [dbutils.widgets.get(k) for k in ("ingestion_id", "volume", "candidate_schema")]
    intake.valid_parameters(ingestion_id, volume, schema)
    base, manifest, data, source_hash = intake.load_submission(volume, ingestion_id)
    if stage == "bronze":
        when = as_of or date.today()
        fmt, rows = wp.bronze_rows(data, ingestion_id, source_hash, when)
        if fmt == "template":
            require(len(rows) - 1 == manifest["record_count"], "Source count mismatch")
        if "source_format" in manifest:
            require(manifest["source_format"] == fmt == "client_export" and len(rows) == manifest["record_count"], "Source format or count mismatch")
        persist_layer(spark, schema, "bronze", ingestion_id, source_hash, [(r["source_record_id"], r) for r in rows])
        receipt, previous_hash = stage_receipt("bronze", ingestion_id, source_hash, None, source_format=fmt, as_of=when.isoformat(), counts={"records": len(rows)}), None
    else:
        previous_stage = "bronze" if stage == "silver" else "silver"
        previous, previous_hash = read_receipt(base, previous_stage)
        when, fmt = date.fromisoformat(previous["as_of"]), previous["source_format"]
        if stage == "silver":
            bronze = sorted(read_layer(spark, schema, "bronze", ingestion_id), key=lambda r: r["source_row_number"])
            rows = wp.silver_rows(fmt, bronze, data, when)
            persist_layer(spark, schema, "silver", ingestion_id, source_hash, [(r["source_record_id"], r) for r in rows],
                          amount=lambda r: r["net_sales"] if r["quality_status"] == "ACCEPTED" else None)
            receipt = stage_receipt("silver", ingestion_id, source_hash, previous_hash, source_format=fmt, as_of=when.isoformat(), counts=wp.silver_counts(rows))
        else:
            silver = sorted(read_layer(spark, schema, "silver", ingestion_id), key=lambda r: r["source_row_number"])
            categories = intake.load_categories((Path(volume) / "references" / "accepted_product_master.csv").read_bytes())
            gold = wp.build_gold(silver, categories, ingestion_id, source_hash, load_regions(volume))
            result = wp.report_result(silver, gold)
            if fmt == "template" or "source_format" in manifest:
                require(result["counts"]["received"] == manifest["record_count"], "Source count mismatch")
            for name, key in GOLD_KEYS.items():
                persist_layer(spark, schema, name, ingestion_id, source_hash, [(key(r), r) for r in (gold["fact"] if name == "fact" else gold[name])],
                              amount=(lambda r: r["net_sales"]) if name in ("fact", "mart_monthly", "mart_area_monthly") else None)
            receipt = stage_receipt("gold", ingestion_id, source_hash, previous_hash, source_format=fmt, as_of=when.isoformat(), counts=result["counts"],
                                    net_sales_candidate=result["net_sales_candidate"], status=result["status"],
                                    tables={name: f"{schema}.{table}" for name, table in LAYER_TABLES.items()})
            write_receipt(base, "gold", receipt)
            report, artifacts = intake.report_artifacts(result, ingestion_id, source_hash)
            intake.write_artifacts(base, artifacts)  # report.json is ordered last
            dbutils.notebook.exit(json.dumps(report))
            return report
    write_receipt(base, stage, receipt)
    dbutils.notebook.exit(json.dumps(receipt))
    return receipt


# ---- typed warehouse release
def spark_type(kind):
    from pyspark.sql import types as T
    return {"string": T.StringType(), "int": T.IntegerType(), "date": T.DateType(), "decimal": T.DecimalType(24, 6), "bool": T.BooleanType()}[kind]


def typed_schema(columns):
    from pyspark.sql import types as T
    return T.StructType([T.StructField(name, spark_type(kind), True) for name, kind in columns])


def to_tuple(row, columns):
    return tuple(None if row.get(name) is None else date.fromisoformat(row[name]) if kind == "date" else Decimal(row[name]) if kind == "decimal" else row[name]
                 for name, kind in columns)


def from_tuple(values, columns):
    return {name: None if value is None else value.isoformat() if kind == "date" else wp.fixed(value) if kind == "decimal" else value
            for (name, kind), value in zip(columns, values)}


def create_or_verify(spark, table, rows, columns):
    """Create an immutable release table, or verify an existing one holds exactly the recomputed rows. Never overwrites."""
    frame = spark.createDataFrame([to_tuple(r, columns) for r in rows], typed_schema(columns))
    if spark.catalog.tableExists(table):
        existing = spark.table(table)
        require(existing.count() == len(rows) and existing.exceptAll(frame).count() == 0 and frame.exceptAll(existing).count() == 0,
                "Existing release table conflicts with the recomputed release")
        return
    frame.write.format("delta").saveAsTable(table)
    saved = spark.table(table)
    require(saved.count() == len(rows) and saved.exceptAll(frame).count() == 0 and frame.exceptAll(saved).count() == 0, "Release readback failed")


def release_table(schema, release_id, name):
    return f"{schema}.release_{release_id}_{name}"


def current_head(spark, schema):
    """(pointer rows, current release id or None). The head is the one release no later release names as its predecessor."""
    pointer = f"{schema}.release_pointer"
    if not spark.catalog.tableExists(pointer):
        return [], None
    rows = [from_tuple(r, POINTER_COLUMNS) for r in spark.table(pointer).collect()]
    require(len({p["release_id"] for p in rows}) == len(rows), "Release pointer is inconsistent")
    named = {p["previous_release_id"] for p in rows}
    heads = [p["release_id"] for p in rows if p["release_id"] not in named]
    require(len(heads) == 1, "Release pointer has no single current head")
    return rows, heads[0]


def run_promote(spark, dbutils):
    """Build a NEW versioned warehouse release replacing only the declared months, from an approved plan hash.

    The pointer row is written last. The dashboard gateway does not read this schema and no business
    approval is implied; the manifest says so explicitly.
    """
    names = ("ingestion_id", "volume", "candidate_schema", "release_schema", "base_release_id", "first_month", "last_month", "approved_plan_sha256", "mode", "acknowledge_warnings")
    for key in names:
        dbutils.widgets.text(key, "")
    ingestion_id, volume, schema, release_schema, base_id, first, last, approved, mode, acknowledge = [dbutils.widgets.get(k) for k in names]
    require(mode in ("plan", "apply"), "mode must be 'plan' or 'apply'")
    require(acknowledge in ("", "true"), "acknowledge_warnings must be empty or 'true'")
    intake.valid_parameters(ingestion_id, volume, schema)
    require(re.fullmatch(r"[A-Za-z_]\w*\.medshield_warehouse", release_schema or ""), "Invalid release schema")
    require(base_id == "NONE" or re.fullmatch(r"[a-f0-9]{16}", base_id or ""), "Invalid base release id")
    base, manifest, data, source_hash = intake.load_submission(volume, ingestion_id)
    gold_receipt, _ = read_receipt(base, "gold")
    report = json.loads((base / "report.json").read_bytes())
    # Held rows no longer block on their own: they travel in the plan as a hash-bound warning. Unmapped products still block.
    require(report["status"] in ("READY_FOR_APPROVAL", "NEEDS_REVIEW") and not report["counts"].get("category_unmapped"),
            "Candidate has products missing from the approved category reference")
    require(report["source_sha256"] == source_hash == gold_receipt["source_sha256"], "Candidate identity mismatch")
    held = wp.held_summary(read_layer(spark, schema, "silver", ingestion_id))
    candidate = sorted(read_layer(spark, schema, "fact", ingestion_id), key=lambda r: r["sales_line_id"])
    pointers, latest = current_head(spark, release_schema)
    # A completed promotion retried with its original base and approval is a replay, not a conflict.
    done = [p for p in pointers if p["ingestion_id"] == ingestion_id and p["previous_release_id"] == base_id and p["plan_sha256"] == approved]
    if mode == "apply" and done:
        require((first, last) == (done[0]["declared_first_month"], done[0]["declared_last_month"]), "Replay period differs from the approved plan")
        result = {"release_id": done[0]["release_id"], "idempotent_replay": True}
        dbutils.notebook.exit(json.dumps(result))
        return result
    require((latest or "NONE") == base_id, "Base release is not the current release; review again against the current release")
    base_rows = [] if latest is None else [from_tuple(r, FACT_COLUMNS) for r in spark.table(release_table(release_schema, latest, "fact_sales_line")).collect()]
    new_rows, controls = wp.replace_months(base_rows, candidate, first, last, ingestion_id, source_hash, held)
    controls["plan_sha256"] = wp.digest_json({
        "controls_sha256": controls["plan_sha256"], "release_schema": release_schema, "base_release_id": base_id,
        "regional_mapping_sha256": wp.REGIONAL_MAPPING_HASH,
        "base_rows_sha256": wp.digest_json(sorted(base_rows, key=lambda r: r["sales_line_id"])),
        "candidate_rows_sha256": wp.digest_json(candidate),
    })
    plan = {"mode": "plan", "ingestion_id": ingestion_id, "base_release_id": base_id, "plan_sha256": controls["plan_sha256"], "controls": controls,
            "release_authorized": False, "business_approval": False, "warehouse_release_created": False}
    folder = base / "promotions"
    plan_name = f"plan_{controls['plan_sha256']}.json"
    plan_bytes = json.dumps(plan, sort_keys=True).encode("utf-8")
    if mode == "plan":
        # Read-only preview: record the exact controls and hash an operator may approve. No release table or pointer is written.
        folder.mkdir(exist_ok=True)
        intake.write_artifacts(folder, {plan_name: plan_bytes})
        dbutils.notebook.exit(json.dumps(plan))
        return plan
    wp.assert_approved_plan(approved, controls, acknowledge == "true")
    plan_path = folder / plan_name
    require(plan_path.is_file() and plan_path.stat().st_size == len(plan_bytes) and plan_path.read_bytes() == plan_bytes,
            "Saved promotion preview is missing or differs from the approved plan")
    release_id = wp.release_identity(base_id, ingestion_id, controls["plan_sha256"])
    dimensions = wp.derive_dimensions(new_rows, load_regions(volume))
    create_or_verify(spark, release_table(release_schema, release_id, "fact_sales_line"), new_rows, FACT_COLUMNS)
    for name, columns in DIM_COLUMNS.items():
        create_or_verify(spark, release_table(release_schema, release_id, name), dimensions[name], columns)
    summary = {"release_id": release_id, "previous_release_id": latest, "ingestion_id": ingestion_id, "plan_sha256": controls["plan_sha256"],
               "controls": {k: controls[k] for k in ("before", "removed", "added", "after", "warnings")}, "warehouse_release_created": True,
               "business_approval": False, "dashboard_serving_changed": False}
    intake.write_artifacts(folder, {f"release_{release_id}.json": json.dumps(summary, sort_keys=True).encode("utf-8")})
    pointer_row = dict(release_id=release_id, previous_release_id=latest or "NONE", ingestion_id=ingestion_id, plan_sha256=controls["plan_sha256"],
                       source_sha256=source_hash, declared_first_month=first, declared_last_month=last, records=controls["after"]["records"],
                       net_sales=controls["after"]["net_sales"], business_approval=False, dashboard_serving_changed=False)
    pointer = spark.createDataFrame([to_tuple(pointer_row, POINTER_COLUMNS)], typed_schema(POINTER_COLUMNS))
    pointer.write.format("delta").mode("append").saveAsTable(f"{release_schema}.release_pointer")  # last: makes the release current
    dbutils.notebook.exit(json.dumps(summary))
    return summary


# ---- history seed
def read_seed_rows(spark):
    return [row.asDict() for row in spark.sql(f"SELECT * FROM {wp.SEED_TABLE} VERSION AS OF {wp.SEED_DELTA_VERSION}").collect()]


def run_seed(spark, dbutils):
    """Load the pinned itemized history as a NEW release: plan first, then apply an exact approved hash.

    The Gold table is only read. Dashboard reads are unchanged, and no business approval is implied.
    """
    names = ("volume", "release_schema", "base_release_id", "approved_plan_sha256", "mode", "acknowledge_warnings")
    for key in names:
        dbutils.widgets.text(key, "")
    volume, release_schema, base_id, approved, mode, acknowledge = [dbutils.widgets.get(k) for k in names]
    require(mode in ("plan", "apply"), "mode must be 'plan' or 'apply'")
    require(acknowledge in ("", "true"), "acknowledge_warnings must be empty or 'true'")
    require(re.fullmatch(r"/Volumes/[A-Za-z_]\w*/[A-Za-z_]\w*/[A-Za-z_]\w*", volume or ""), "Invalid volume")
    require(re.fullmatch(r"[A-Za-z_]\w*\.medshield_warehouse", release_schema or ""), "Invalid release schema")
    require(base_id == "NONE" or re.fullmatch(r"[a-f0-9]{16}", base_id or ""), "Invalid base release id")
    pointers, latest = current_head(spark, release_schema)
    done = [p for p in pointers if p["ingestion_id"] == wp.SEED_INGESTION_ID and p["previous_release_id"] == base_id and p["plan_sha256"] == approved]
    if mode == "apply" and done:
        result = {"release_id": done[0]["release_id"], "idempotent_replay": True}
        dbutils.notebook.exit(json.dumps(result))
        return result
    require((latest or "NONE") == base_id, "Base release is not the current release; review again against the current release")
    base_rows = [] if latest is None else [from_tuple(r, FACT_COLUMNS) for r in spark.table(release_table(release_schema, latest, "fact_sales_line")).collect()]
    facts, held = wp.seed_facts(read_seed_rows(spark))
    new_rows, controls = wp.seed_replacement(base_rows, facts, held)
    controls["plan_sha256"] = wp.digest_json({"policy": wp.SEED_POLICY, "dataset_id": wp.SEED_DATASET_ID, "delta_version": wp.SEED_DELTA_VERSION, "release_schema": release_schema,
                                              "base_release_id": base_id, "regional_mapping_sha256": wp.REGIONAL_MAPPING_HASH, "controls": controls,
                                              "base_rows_sha256": wp.digest_json(sorted(base_rows, key=lambda r: r["sales_line_id"])), "seed_rows_sha256": wp.digest_json(new_rows)})
    plan = {"mode": "plan", "policy": wp.SEED_POLICY, "base_release_id": base_id, "plan_sha256": controls["plan_sha256"], "controls": controls,
            "release_authorized": False, "business_approval": False, "warehouse_release_created": False}
    folder = Path(volume) / "seed"
    plan_name, plan_bytes = f"plan_{controls['plan_sha256']}.json", json.dumps(plan, sort_keys=True).encode("utf-8")
    if mode == "plan":
        folder.mkdir(exist_ok=True)
        intake.write_artifacts(folder, {plan_name: plan_bytes})
        dbutils.notebook.exit(json.dumps(plan))
        return plan
    wp.assert_approved_plan(approved, controls, acknowledge == "true")
    plan_path = folder / plan_name
    require(plan_path.is_file() and plan_path.read_bytes() == plan_bytes, "Saved seed preview is missing or differs from the approved plan")
    release_id = wp.release_identity(base_id, wp.SEED_INGESTION_ID, controls["plan_sha256"])
    dimensions = wp.derive_dimensions(new_rows, load_regions(volume))
    create_or_verify(spark, release_table(release_schema, release_id, "fact_sales_line"), new_rows, FACT_COLUMNS)
    for name, columns in DIM_COLUMNS.items():
        create_or_verify(spark, release_table(release_schema, release_id, name), dimensions[name], columns)
    summary = {"release_id": release_id, "previous_release_id": latest, "policy": wp.SEED_POLICY, "plan_sha256": controls["plan_sha256"], "controls": controls,
               "warehouse_release_created": True, "business_approval": False, "dashboard_serving_changed": False}
    intake.write_artifacts(folder, {f"release_{release_id}.json": json.dumps(summary, sort_keys=True).encode("utf-8")})
    pointer_row = dict(release_id=release_id, previous_release_id=latest or "NONE", ingestion_id=wp.SEED_INGESTION_ID, plan_sha256=controls["plan_sha256"], source_sha256=wp.SEED_DATASET_ID,
                       declared_first_month=controls["declared_first_month"], declared_last_month=controls["declared_last_month"], records=controls["after"]["records"],
                       net_sales=controls["after"]["net_sales"], business_approval=False, dashboard_serving_changed=False)
    pointer = spark.createDataFrame([to_tuple(pointer_row, POINTER_COLUMNS)], typed_schema(POINTER_COLUMNS))
    pointer.write.format("delta").mode("append").saveAsTable(f"{release_schema}.release_pointer")  # last: makes the release current
    dbutils.notebook.exit(json.dumps(summary))
    return summary


# ---- derived analytical marts for the current release
DERIVED_COLUMNS = {
    "mart_yearly": (("year", "int"), ("product_category", "string"), ("months_with_sales", "int"), *MART_MEASURES),
    "mart_yoy": (("year", "int"), ("compared_months", "int"), ("months_list", "string"), ("net_sales", "decimal"), ("previous_net_sales", "decimal"), ("change_pct", "decimal")),
    "mart_seasonal": (("month_of_year", "int"), ("years_observed", "int"), ("average_net_sales", "decimal"), ("min_net_sales", "decimal"), ("max_net_sales", "decimal")),
    "mart_territory_monthly": (("territory_id", "string"), ("calendar_month", "string"), *MART_MEASURES),
    "territory_signal_monthly": (("territory_id", "string"), ("calendar_month", "string"), ("period", "string"), ("signal_family", "string"), ("signal", "string"),
                                 ("signal_value", "decimal"), ("unit", "string"), ("source", "string"), ("station_name", "string"), ("observation_status", "string"),
                                 ("mapping_status", "string"), ("is_external_join_ready", "bool")),
}
SIGNALS_VIEW = "workspace.medshield_gold.vw_dss_external_signals_candidate"


def read_signals(spark):
    return [row.asDict() for row in spark.sql(f"SELECT {', '.join(wp.SIGNAL_FIELDS)} FROM {SIGNALS_VIEW}").collect()]


def run_marts(spark, dbutils):
    """Build the derived marts for the current release. Read-only on facts and signals; new tables only; pointer unchanged."""
    for key in ("volume", "release_schema"):
        dbutils.widgets.text(key, "")
    volume, release_schema = dbutils.widgets.get("volume"), dbutils.widgets.get("release_schema")
    require(re.fullmatch(r"[A-Za-z_]\w*\.medshield_warehouse", release_schema or ""), "Invalid release schema")
    _, latest = current_head(spark, release_schema)
    require(latest, "No current release")
    facts = [from_tuple(r, FACT_COLUMNS) for r in spark.table(release_table(release_schema, latest, "fact_sales_line")).collect()]
    marts = wp.derived_marts(facts, load_regions(volume), read_signals(spark))
    for name, columns in DERIVED_COLUMNS.items():
        create_or_verify(spark, release_table(release_schema, latest, name), marts[name], columns)
    summary = {"release_id": latest, "tables": {name: len(rows) for name, rows in marts.items()}, "dashboard_serving_changed": False}
    dbutils.notebook.exit(json.dumps(summary))
    return summary


# ---- signal indices v2 (DII, RSI, approved stations)
NASA_VIEW = "workspace.medshield_gold.vw_weather_nasa_power_monthly_candidate"
DERIVED_COLUMNS["territory_signal_monthly_v2"] = DERIVED_COLUMNS["territory_signal_monthly"]
DERIVED_COLUMNS["territory_population_yearly"] = (("territory_id", "string"), ("year", "int"), ("mid_year_population", "decimal"), ("basis", "string"))


def read_nasa(spark):
    return [row.asDict() for row in spark.sql(f"SELECT territory, period_start, rainfall_severity_proxy FROM {NASA_VIEW}").collect()]


def load_population(volume):
    return wp.load_population((Path(volume) / "references" / "territory_population.csv").read_bytes())


_base_derived_marts = wp.derived_marts


def _derived_with_indices(facts, regions, signals, nasa=None, population=None):
    marts = _base_derived_marts(facts, regions, signals)
    if population is not None:
        marts["territory_signal_monthly_v2"] = wp.signals_v2(signals, nasa or [], population, regions)
        marts["territory_population_yearly"] = [dict(territory_id=t, year=y, mid_year_population=wp.fixed(v[0]), basis=v[1]) for (t, y), v in sorted(population.items())]
    return marts


def run_marts(spark, dbutils):  # noqa: F811  (extends the earlier definition with indices)
    for key in ("volume", "release_schema"):
        dbutils.widgets.text(key, "")
    volume, release_schema = dbutils.widgets.get("volume"), dbutils.widgets.get("release_schema")
    require(re.fullmatch(r"[A-Za-z_]\w*\.medshield_warehouse", release_schema or ""), "Invalid release schema")
    _, latest = current_head(spark, release_schema)
    require(latest, "No current release")
    facts = [from_tuple(r, FACT_COLUMNS) for r in spark.table(release_table(release_schema, latest, "fact_sales_line")).collect()]
    marts = _derived_with_indices(facts, load_regions(volume), read_signals(spark), read_nasa(spark), load_population(volume))
    for name, columns in DERIVED_COLUMNS.items():
        create_or_verify(spark, release_table(release_schema, latest, name), marts[name], columns)
    summary = {"release_id": latest, "tables": {name: len(rows) for name, rows in marts.items()}, "dashboard_serving_changed": False}
    dbutils.notebook.exit(json.dumps(summary))
    return summary
