# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# dependencies = ["statsmodels"]
# ///
# MAGIC %pip install statsmodels

# COMMAND ----------

"""Monthly company-PHP diagnostic STL for the isolated 2026 source.

Preserves the exported historical 06 and its output. This is a candidate
decomposition, not territory medicine demand, a forecast, or model approval.
"""
import hashlib
import json
import math
import re
from pathlib import Path
import numpy as np
import statsmodels
from statsmodels.tsa.seasonal import STL
from pyspark.sql import functions as F

SOURCE_POLICY = "sales_restart_gold_v8_isolated_source_rebuild"
POPULATION_VERSION = "dashboard_observed_fact_v1"
NON_PRODUCT_LABEL = "(is_contract_label = TRUE OR UPPER(TRIM(normalized_product)) RLIKE\n  '^(PAGBILAO|QMC|PPDC|TOURISM|PROVINCIAL[[:space:]]+TOURISM[[:space:]]+OFFICE|MARINDUQUE|GULANG[[:space:]]+GULANG|PESO|PESO[[:space:]]+PROVINCIAL|PHO|ABOITIZ|PADRE[[:space:]]+BURGOS|PPOC)([[:space:]]*#|[[:space:]]+[0-9])|^DR[[:space:]]*#|^PR[[:space:]]+[0-9]')"
OBSERVED_FACT = "is_analysis_candidate = TRUE AND NOT " + NON_PRODUCT_LABEL
IDENTITY_FIELDS = ("dataset_id", "policy_version", "area_mapping_sha256", "product_master_sha256",
                   "transaction_evidence_sha256", "catalog_helper_sha256")


def month_index(period):
    if not isinstance(period, str) or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", period):
        raise ValueError("Invalid monthly period")
    year, number = map(int, period.split("-"))
    return year * 12 + number - 1


def normalize_monthly_rows(rows):
    if not rows or len(rows) > 2400:
        raise ValueError("A bounded nonempty monthly source is required")
    supplied = {}
    for row in rows:
        key = row.get("period")
        month_index(key)
        if key in supplied:
            raise ValueError("Duplicate monthly source")
        value = row.get("revenue")
        if value is not None and (isinstance(value, bool) or not math.isfinite(float(value))):
            raise ValueError("Monthly revenue must be finite or unavailable")
        observed = value is not None and row.get("missing") is not True and row.get("evidence") != "estimate"
        supplied[key] = {"period": key, "revenue": float(value) if observed else None, "missing": not observed}
    first_year = int(min(supplied)[:4])
    last_year = int(max(supplied)[:4])
    if (last_year - first_year + 1) * 12 > 2400:
        raise ValueError("Monthly calendar exceeds safety bound")
    return [supplied.get(f"{year:04d}-{number:02d}",
                         {"period": f"{year:04d}-{number:02d}", "revenue": None, "missing": True})
            for year in range(first_year, last_year + 1) for number in range(1, 13)]


def decompose(rows, minimum_months=36):
    if isinstance(minimum_months, bool) or not isinstance(minimum_months, int) or minimum_months < 36:
        raise ValueError("This candidate requires at least 36 contiguous observed months")
    ordered = normalize_monthly_rows(rows)
    segments, current = [], []
    for row in ordered:
        if row["missing"]:
            if current:
                segments.append(current)
                current = []
        else:
            current.append(row)
    if current:
        segments.append(current)
    outputs, short = [], []
    for segment in segments:
        if len(segment) < minimum_months:
            short.extend(row["period"] for row in segment)
            continue
        values = np.array([row["revenue"] for row in segment], dtype=float)
        fit = STL(values, period=12, seasonal=13, robust=True).fit()
        error = float(np.max(np.abs(values - fit.trend - fit.seasonal - fit.resid)))
        if not np.all(np.isfinite(fit.trend + fit.seasonal + fit.resid)) or error > 0.000001:
            raise ValueError("STL reconstruction failed")
        components = [{"period": row["period"], "observed": float(values[i]), "trend": float(fit.trend[i]),
                       "seasonal": float(fit.seasonal[i]), "residual": float(fit.resid[i])}
                      for i, row in enumerate(segment)]
        outputs.append({"start": segment[0]["period"], "end": segment[-1]["period"], "months": len(segment),
                        "max_reconstruction_error": error, "components": components})
    return {"status": "candidate" if outputs else "insufficient_contiguous_history",
            "method": "STL", "metric": "eligible_net_sales_php", "period": 12,
            "seasonal_window": 13, "robust": True, "minimum_contiguous_months": minimum_months,
            "missing_policy": "no_imputation_split_at_gaps", "statsmodels_version": statsmodels.__version__,
            "unavailable_periods": [row["period"] for row in ordered if row["missing"]],
            "short_segment_periods": short, "segments": outputs,
            "limitations": ["Company monthly recorded PHP; not daily territory medicine quantities.",
                            "Full-series STL is diagnostic and is not an origin-safe forecast feature.",
                            "Source completeness is user-attested, not independently verified.",
                            "Candidate output does not approve product units, model publication or procurement."]}


def validate_stl_source(contract, identity, fact_version, target):
    if isinstance(fact_version, bool) or not isinstance(fact_version, int) or fact_version != 0:
        raise ValueError("This isolated source package requires fact Delta 0")
    batch = contract.get("batch", "")
    if (contract.get("schema_version") != 1 or contract.get("mode") != "isolated_source_rebuild_candidate"
            or not re.fullmatch(r"source_\d{8}", batch)):
        raise ValueError("A reviewed isolated-source descriptor is required")
    gold = "workspace.medshield_gold_" + batch
    if contract.get("target_schemas", {}).get("gold") != gold or target != gold + ".sales_restart_stl_candidate":
        raise ValueError("STL output must remain in its isolated source schema")
    if identity.get("dataset_id") != contract.get("dataset_id") or identity.get("policy_version") != SOURCE_POLICY:
        raise ValueError("STL source identity differs from the source descriptor")
    for key in IDENTITY_FIELDS:
        if key == "policy_version":
            continue
        if not re.fullmatch(r"[a-f0-9]{64}", str(identity.get(key, ""))):
            raise ValueError("Invalid source identity hash: " + key)
    for key in ("area_mapping_sha256", "product_master_sha256", "transaction_evidence_sha256", "catalog_helper_sha256"):
        if identity[key] != contract.get("reference_hashes", {}).get(key):
            raise ValueError("STL source reference differs: " + key)
    return gold + ".sales_restart_fact_candidate"


def build_stl_records(rows, identity, fact_version, source_table):
    if (isinstance(fact_version, bool) or not isinstance(fact_version, int) or fact_version != 0
            or not re.fullmatch(r"workspace\.medshield_gold_source_\d{8}\.sales_restart_fact_candidate", source_table)
            or identity.get("policy_version") != SOURCE_POLICY):
        raise ValueError("An immutable isolated v8 source is required")
    metadata = {key: identity.get(key) for key in IDENTITY_FIELDS}
    if any(not isinstance(value, str) or not value for value in metadata.values()):
        raise ValueError("Complete source identity is required")
    for key in IDENTITY_FIELDS:
        if key != "policy_version" and not re.fullmatch(r"[a-f0-9]{64}", metadata[key]):
            raise ValueError("Invalid source identity hash: " + key)
    normalized = normalize_monthly_rows(rows)
    result = decompose(normalized)
    if not result["segments"]:
        raise ValueError("No qualifying contiguous source segment; STL remains unavailable")
    parameters = {key: value for key, value in result.items() if key != "segments"}
    population_hash = hashlib.sha256(OBSERVED_FACT.encode()).hexdigest()
    material = {"identity": metadata, "fact_delta_version": fact_version, "source_table": source_table,
                "population_version": POPULATION_VERSION, "population_sha256": population_hash,
                "parameters": parameters, "rows": normalized}
    material_json = json.dumps(material, sort_keys=True, separators=(",", ":"), allow_nan=False)
    input_hash = hashlib.sha256(material_json.encode()).hexdigest()
    parameters_json = json.dumps(parameters, sort_keys=True, separators=(",", ":"), allow_nan=False)
    records = []
    for segment in result["segments"]:
        for component in segment["components"]:
            records.append({**component, **metadata, "fact_delta_version": fact_version, "source_table": source_table,
                            "segment_start": segment["start"], "segment_end": segment["end"],
                            "population_version": POPULATION_VERSION, "population_sha256": population_hash,
                            "parameters_json": parameters_json, "input_sha256": input_hash, "method": "STL",
                            "publication_status": "CANDIDATE_PENDING_BUSINESS_REVIEW"})
    return {"schema_version": "medshield.monthly_stl.v1", "identity": metadata,
            "fact_delta_version": fact_version, "source_table": source_table,
            "output_table": source_table.rsplit(".", 1)[0] + ".sales_restart_stl_candidate",
            "population_version": POPULATION_VERSION, "population_sha256": population_hash,
            "parameters": parameters, "input_rows": normalized, "input_material_json": material_json,
            "input_sha256": input_hash, "records": records}

# COMMAND ----------

# Prepare from the exact descriptor and immutable Gold. Neither an old fact nor
# a different batch can be selected by changing only the output table.
contract = json.loads(Path("/Workspace/medshield/medshield_project/references/source_rebuild_20261022.json").read_text())
FACT_VERSION = 0
FACT = contract["target_schemas"]["gold"] + ".sales_restart_fact_candidate"
OUTPUT = contract["target_schemas"]["gold"] + ".sales_restart_stl_candidate"
assert re.fullmatch(r"workspace\.medshield_gold_source_\d{8}\.sales_restart_fact_candidate", FACT)
identity_rows = spark.sql(f"SELECT DISTINCT {','.join(IDENTITY_FIELDS)} FROM {FACT} VERSION AS OF {FACT_VERSION}").limit(2).collect()
assert len(identity_rows) == 1, "Ambiguous STL source identity"
identity = identity_rows[0].asDict()
assert validate_stl_source(contract, identity, FACT_VERSION, OUTPUT) == FACT
before = int(spark.sql(f"DESCRIBE HISTORY {FACT} LIMIT 1").first()["version"])
assert before == FACT_VERSION, "Source changed; prepare a current bound STL package"
audit_schema = contract["target_schemas"]["audit"]
assert audit_schema == contract["target_schemas"]["gold"].replace("medshield_gold_", "medshield_audit_")
gold_names = ["fact", "dim_date", "dim_area", "dim_product", "dim_canonical_product", "monthly", "yearly", "area_yearly", "product_yearly", "business_product_yearly", "territory_yearly", "medical_monthly", "external_input", "contract_labels", "label_partition"]
audit_names = ["area_coverage", "scope", "provisional_year", "gold_disposition", "gold_quality", "returns", "contract_evidence"]
expected_tables = {contract["target_schemas"]["gold"] + ".sales_restart_" + name + "_candidate" for name in gold_names}
expected_tables |= {audit_schema + ".sales_restart_" + name + "_candidate" for name in audit_names}
audit = [r.asDict() for r in spark.table(audit_schema + ".sales_restart_gold_publication_candidate").limit(23).collect()]
assert len(audit) == 22 and {r["table_name"] for r in audit} == expected_tables
assert all(r["status"] == "PASS" and r["dataset_id"] == identity["dataset_id"] and r["policy_version"] == SOURCE_POLICY for r in audit)
fact_count = spark.sql(f"SELECT COUNT(*) AS n, COUNT(DISTINCT source_record_id) AS unique_n FROM {FACT} VERSION AS OF {FACT_VERSION}").first()
assert fact_count["n"] == fact_count["unique_n"] == next(r["saved_rows"] for r in audit if r["table_name"] == FACT)
monthly = spark.sql(f"SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period, CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS DOUBLE) AS revenue FROM {FACT} VERSION AS OF {FACT_VERSION} WHERE {OBSERVED_FACT} GROUP BY month_start ORDER BY month_start")
assert monthly.count() <= 2400, "Review oversized monthly source"
payload = build_stl_records([r.asDict() for r in monthly.collect()], identity, FACT_VERSION, FACT)
assert int(spark.sql(f"DESCRIBE HISTORY {FACT} LIMIT 1").first()["version"]) == before

# COMMAND ----------

# An existing different candidate is never overwritten. Repeating identical
# preparation verifies the existing rows instead of changing its Delta version.
candidate = spark.createDataFrame(payload["records"])
if spark.catalog.tableExists(OUTPUT):
    saved = spark.table(OUTPUT).select(*candidate.columns)
    assert saved.count() == candidate.count(), "Existing STL population differs; prepare a separate reviewed correction"
    assert saved.exceptAll(candidate).limit(1).count() == 0 and candidate.exceptAll(saved).limit(1).count() == 0, "Existing STL candidate differs; no overwrite allowed"
else:
    candidate.withColumn("generated_at", F.current_timestamp()).write.format("delta").mode("errorifexists").saveAsTable(OUTPUT)
saved = spark.table(OUTPUT).select(*candidate.columns)
assert saved.count() == len(payload["records"])
assert saved.exceptAll(candidate).limit(1).count() == 0 and candidate.exceptAll(saved).limit(1).count() == 0
print(json.dumps({"status": "candidate_not_approved", "table": OUTPUT, "source_table": FACT,
                  "source_fact_version": FACT_VERSION, "input_sha256": payload["input_sha256"],
                  "records": len(payload["records"]), "business_approval": False, "model_publication": False}))
