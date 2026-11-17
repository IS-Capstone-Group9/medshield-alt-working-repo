"""Explicit source-change contract for isolated Bronze/Silver/Gold candidates.

This contract never authorizes serving activation or changes catalog approvals.
"""
import hashlib
import json
from pathlib import Path
import re

SOURCE_MODE = "isolated_source_rebuild_candidate"
BASELINE_TABLE = "workspace.medshield_gold.sales_restart_fact_candidate"
REFERENCE_KEYS = {"product_master_sha256", "transaction_evidence_sha256", "catalog_helper_sha256", "area_mapping_sha256", "product_reference_sha256"}
SOURCE_CHANGE_FIELDS = {"dataset_id", "silver_version", "policy_version", "gold_published_at"}


def digest_identity(manifest):
    identity = sorted((r["source_workbook"], r["source_file_sha256"]) for r in manifest)
    return hashlib.sha256(json.dumps(identity, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def validate_contract(contract):
    if contract.get("schema_version") != 1 or contract.get("mode") != SOURCE_MODE:
        raise ValueError("Expected an isolated source-rebuild candidate contract")
    batch = contract.get("batch", "")
    if not re.fullmatch(r"source_\d{8}", batch):
        raise ValueError("Invalid isolated source batch")
    expected_schemas = {layer: f"workspace.medshield_{layer}_{batch}" for layer in ("bronze", "silver", "gold", "audit")}
    if contract.get("target_schemas") != expected_schemas:
        raise ValueError("Source rebuild must target four isolated batch schemas")
    if contract.get("baseline_table") != BASELINE_TABLE or type(contract.get("baseline_fact_version")) is not int or contract["baseline_fact_version"] < 0:
        raise ValueError("Invalid serving predecessor")
    if contract.get("activate_serving") is not False or contract.get("business_approval") is not False or contract.get("train_models") is not False:
        raise ValueError("Source ingestion cannot activate serving, train or grant approval")
    if set(contract.get("reference_hashes", {})) != REFERENCE_KEYS:
        raise ValueError("Incomplete source-rebuild reference identity")
    for value in contract["reference_hashes"].values():
        if not isinstance(value, str) or not re.fullmatch(r"[a-f0-9]{64}", value):
            raise ValueError("Invalid source-rebuild reference hash")
    sources = contract.get("source_manifest", [])
    names = [r.get("source_workbook", "") for r in sources]
    if not sources or len(names) != len(set(names)) or not all(re.fullmatch(r"medshield_data_20\d{2}\.csv", name) for name in names):
        raise ValueError("Invalid source inventory")
    if not {f"medshield_data_{y}.csv" for y in range(2017, 2026)} < set(names):
        raise ValueError("Source rebuild must preserve the nine-year baseline and add a source")
    baseline_sources = contract.get("baseline_sources", [])
    if {r.get("source_workbook") for r in baseline_sources} != {f"medshield_data_{y}.csv" for y in range(2017, 2026)}:
        raise ValueError("Expected the source-bound nine-year predecessor")
    proposed = {r["source_workbook"]: r for r in sources}
    for item in sources:
        if not re.fullmatch(r"[a-f0-9]{64}", item.get("source_file_sha256", "")) or type(item.get("raw_line_count")) is not int or item["raw_line_count"] <= 0:
            raise ValueError("Invalid source hash or physical-line count")
    for old in baseline_sources:
        current = proposed[old["source_workbook"]]
        if any(current.get(k) != old.get(k) for k in ("source_file_sha256", "source_data_status", "source_adjustment_policy", "raw_line_count")):
            raise ValueError("Source rebuild cannot replace a baseline export")
    if digest_identity(sources) != contract.get("dataset_id"):
        raise ValueError("Source rebuild dataset identity differs from its manifest")
    baseline_identity = contract.get("baseline_identity", {})
    if digest_identity(baseline_sources) != baseline_identity.get("dataset_id"):
        raise ValueError("Predecessor identity differs from its source inventory")
    if contract.get("baseline_records") != 37728 or baseline_identity.get("policy_version") != "sales_restart_gold_v7_independent_catalog":
        raise ValueError("Unexpected predecessor population/policy; prepare a new reviewed protocol")
    return contract


def load_contract(path):
    path = Path(path)
    if path.parent != Path("/Workspace/medshield/medshield_project/references") or not re.fullmatch(r"source_rebuild_\d{8}\.json", path.name):
        raise ValueError("Expected the exact workspace references source-rebuild path")
    return validate_contract(json.loads(path.read_text(encoding="utf-8")))


def validate_manifest(contract, manifest):
    validate_contract(contract)
    keys = ("source_workbook", "source_file_sha256", "source_file_bytes", "raw_line_count", "source_data_status", "source_adjustment_policy", "data_source_year")
    actual = sorted(tuple(r.get(k) for k in keys) for r in manifest)
    expected = sorted(tuple(r.get(k) for k in keys) for r in contract["source_manifest"])
    if actual != expected or digest_identity(manifest) != contract["dataset_id"]:
        raise ValueError("Uploaded sources differ from the bound source-rebuild manifest")


def assert_predecessor(spark, contract):
    """Check the serving predecessor on every stage and immediately before writes."""
    validate_contract(contract)
    history = spark.sql(f"DESCRIBE HISTORY {BASELINE_TABLE} LIMIT 1").first()
    if history["version"] != contract["baseline_fact_version"]:
        raise ValueError("Serving fact changed since capture; recapture before source ingestion")
    baseline = spark.sql(f"SELECT * FROM {BASELINE_TABLE} VERSION AS OF {contract['baseline_fact_version']}")
    identity = baseline.select(*contract["baseline_identity"]).distinct().collect()
    if len(identity) != 1 or identity[0].asDict() != contract["baseline_identity"] or baseline.count() != contract["baseline_records"]:
        raise ValueError("Serving predecessor identity/count changed")
    return baseline


def assert_target(spark, contract, table):
    """Allow writes only to this batch and reject unrelated prior contents."""
    validate_contract(contract)
    if table.rsplit(".", 1)[0] not in contract["target_schemas"].values() or not re.fullmatch(r"sales_restart_[a-z_]+_candidate", table.rsplit(".", 1)[-1]):
        raise ValueError("Source rebuild attempted a write outside its isolated batch")
    if spark.catalog.tableExists(table):
        identities = spark.table(table).select("dataset_id").distinct().collect()
        if any(row["dataset_id"] != contract["dataset_id"] for row in identities):
            raise ValueError("Isolated target belongs to another dataset; preserve it and prepare a new batch")


def validate_preserved_rows(before, after):
    """Pure oracle for historical source preservation, including nulls and signs."""
    def keyed(rows):
        result = {r["source_record_id"]: r for r in rows}
        if len(result) != len(rows):
            raise ValueError("Duplicate source keys")
        return result
    old, new = keyed(before), keyed(after)
    if not set(old) <= set(new):
        raise ValueError("Source rebuild lost predecessor transactions")
    for key, row in old.items():
        if set(row) != set(new[key]) or any(value != new[key][field] for field, value in row.items() if field not in SOURCE_CHANGE_FIELDS):
            raise ValueError("Source rebuild changed a predecessor source/financial/catalog value")
