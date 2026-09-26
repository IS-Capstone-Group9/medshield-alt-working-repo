# Databricks notebook source
# Run after corrected Gold. Job environment requires numpy and statsmodels.
# Candidate publication only; this notebook cannot record CEO approval.
import hashlib
import json
import math
import numpy as np
import statsmodels
from statsmodels.tsa.seasonal import STL
from pyspark.sql import functions as F

def month_index(period: str) -> int:
    year, month = map(int, period.split("-"))
    if not 1 <= month <= 12:
        raise ValueError(f"Invalid month: {period}")
    return year * 12 + month - 1


def decompose(rows: list[dict], minimum_months: int = 36) -> dict:
    if minimum_months < 24:
        raise ValueError("At least two complete annual cycles are required by this job")
    periods = [str(row["period"]) for row in rows]
    if len(set(periods)) != len(periods):
        raise ValueError("Duplicate monthly aggregates cannot be decomposed")
    ordered = sorted(rows, key=lambda row: month_index(row["period"]))
    segments: list[list[dict]] = []
    current: list[dict] = []
    for row in ordered:
        value = row.get("revenue")
        observed = (value is not None and math.isfinite(float(value))
                    and not row.get("missing") and row.get("evidence") != "estimate")
        consecutive = not current or month_index(row["period"]) == month_index(current[-1]["period"]) + 1
        if (not observed or not consecutive) and current:
            segments.append(current)
            current = []
        if observed:
            current.append(row)
    if current:
        segments.append(current)
    outputs = []
    excluded = []
    for segment in segments:
        if len(segment) < minimum_months:
            excluded.extend(row["period"] for row in segment)
            continue
        values = np.array([float(row["revenue"]) for row in segment])
        fit = STL(values, period=12, seasonal=13, robust=True).fit()
        components = []
        for i, row in enumerate(segment):
            components.append({
                "period": row["period"], "observed": float(values[i]),
                "trend": float(fit.trend[i]), "seasonal": float(fit.seasonal[i]),
                "residual": float(fit.resid[i]),
            })
        error = float(np.max(np.abs(values - fit.trend - fit.seasonal - fit.resid)))
        if not np.all(np.isfinite(fit.trend + fit.seasonal + fit.resid)) or error > 0.000001:
            raise ValueError("STL components failed reconstruction")
        outputs.append({"start": segment[0]["period"], "end": segment[-1]["period"],
                        "months": len(segment), "max_reconstruction_error": error, "components": components})
    return {
        "status": "candidate" if outputs else "insufficient_contiguous_history",
        "metric": "eligible_net_sales_php", "method": "STL", "period": 12,
        "seasonal_window": 13, "robust": True, "minimum_contiguous_months": minimum_months,
        "missing_policy": "no_imputation_split_at_gaps", "statsmodels_version": statsmodels.__version__,
        "unavailable_periods": [row["period"] for row in ordered if row.get("revenue") is None or row.get("missing")],
        "short_segment_periods": excluded, "segments": outputs,
        "limitations": ["Describes this candidate sales series; does not prove recurring disease-driven demand.",
                        "Observed months do not establish source completeness.",
                        "Publication and product identity gates remain separate."],
    }


FACT = "workspace.medshield_gold.sales_restart_fact_candidate"
OUTPUT = "workspace.medshield_gold.sales_restart_stl_candidate"
version = int(spark.sql(f"DESCRIBE HISTORY {FACT} LIMIT 1").first()["version"])
identity = spark.sql(f"SELECT DISTINCT dataset_id, policy_version, area_mapping_sha256, product_master_sha256 FROM {FACT} VERSION AS OF {version}").collect()
assert len(identity) == 1, "Ambiguous source identity"
identity = identity[0].asDict()
assert identity["policy_version"] == "sales_restart_gold_v6_reviewed_source_provenance", "Correct provenance before STL publication"
# The same historical population as the gateway. Retained contract evidence is not product sales.
excluded = "(is_contract_label = TRUE OR UPPER(TRIM(normalized_product)) RLIKE '^(PAGBILAO|QMC|PPDC|TOURISM|PROVINCIAL[[:space:]]+TOURISM[[:space:]]+OFFICE|MARINDUQUE|GULANG[[:space:]]+GULANG|PESO|PESO[[:space:]]+PROVINCIAL|PHO|ABOITIZ|PADRE[[:space:]]+BURGOS|PPOC)([[:space:]]*#|[[:space:]]+[0-9])|^DR[[:space:]]*#|^PR[[:space:]]+[0-9]')"
monthly = spark.sql(f"""SELECT DATE_FORMAT(month_start,'yyyy-MM') AS period,
  CAST(SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS DOUBLE) AS revenue
  FROM {FACT} VERSION AS OF {version}
  WHERE is_analysis_candidate AND NOT {excluded}
  GROUP BY month_start ORDER BY month_start""")
assert monthly.count() <= 2400, "Review oversized STL input before driver collection"
rows = [row.asDict() for row in monthly.collect()]
result = decompose(rows)
assert result["segments"], "No qualifying contiguous segment; STL remains unavailable"
parameters = {k:v for k,v in result.items() if k != "segments"}
receipt = hashlib.sha256(json.dumps({"identity":identity,"version":version,"parameters":parameters,"rows":rows},sort_keys=True).encode()).hexdigest()
records = []
for segment in result["segments"]:
    for component in segment["components"]:
        records.append({**component, **identity, "fact_delta_version":version,
            "segment_start":segment["start"], "segment_end":segment["end"],
            "parameters_json":json.dumps(parameters,sort_keys=True), "input_sha256":receipt,
            "method":"STL", "publication_status":"CANDIDATE_PENDING_BUSINESS_REVIEW"})
# Immutable fact version was used throughout; a concurrent Gold update requires a new run.
assert int(spark.sql(f"DESCRIBE HISTORY {FACT} LIMIT 1").first()["version"]) == version, "Gold changed during STL computation"
output = spark.createDataFrame(records).withColumn("generated_at", F.current_timestamp())
output.write.format("delta").mode("overwrite").option("overwriteSchema","true").saveAsTable(OUTPUT)
assert spark.table(OUTPUT).count() == len(records)
print(json.dumps({"table":OUTPUT,"source_fact_version":version,"input_sha256":receipt,"rows":len(records),"status":"candidate_not_approved"}))
