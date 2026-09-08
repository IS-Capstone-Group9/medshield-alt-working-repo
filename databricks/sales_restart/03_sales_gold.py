# Databricks notebook source
# Cell 1 — Validate the current Bronze/Silver run before building sales Gold.
from datetime import date
from decimal import Decimal
import csv
import hashlib
import io
from pathlib import Path
import re

from pyspark.sql import functions as F
from pyspark.sql.types import BooleanType, StringType, StructField, StructType

CATALOG = "workspace"
BRONZE_SCHEMA = f"{CATALOG}.medshield_bronze"
SILVER_SCHEMA = f"{CATALOG}.medshield_silver"
GOLD_SCHEMA = f"{CATALOG}.medshield_gold"
AUDIT_SCHEMA = f"{CATALOG}.medshield_audit"
REFERENCE_PATH = (
    "/Workspace/medshield/medshield_reference_csv/"
    "likely_non_medical_product_candidates.csv"
)
POLICY_VERSION = "sales_restart_gold_v1"
PUBLICATION_STATUS = "CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW"
KEEP_DISPOSITIONS = (
    "KEEP_SOURCE_YEAR_ALIGNED", "KEEP_HISTORICAL_BACKFILL_CANDIDATE"
)

manifest = spark.table(f"{BRONZE_SCHEMA}.sales_restart_manifest_candidate")
bronze_rows = spark.table(f"{BRONZE_SCHEMA}.sales_restart_rows_candidate")
assessed = spark.table(f"{SILVER_SCHEMA}.sales_restart_assessed_candidate")
clean = spark.table(f"{SILVER_SCHEMA}.sales_restart_clean_candidate")


def assert_unique(frame, keys, label):
    null_condition = F.lit(False)
    for key in keys:
        null_condition = null_condition | F.col(key).isNull()
    assert frame.filter(null_condition).limit(1).count() == 0, f"{label}: null keys"
    assert frame.groupBy(*keys).count().filter("count != 1").limit(1).count() == 0, (
        f"{label}: duplicate keys"
    )


def same_keys(left, right, keys, label):
    assert left.select(*keys).join(right.select(*keys), keys, "left_anti").limit(1).count() == 0, label
    assert right.select(*keys).join(left.select(*keys), keys, "left_anti").limit(1).count() == 0, label


def dataset_of(frame, label):
    values = frame.select("dataset_id").distinct().collect()
    assert len(values) == 1 and values[0]["dataset_id"], f"{label}: expected one nonnull dataset_id"
    return values[0]["dataset_id"]


required = {
    "dataset_id", "source_record_id", "source_workbook", "data_source_year",
    "source_row_number", "source_file_sha256", "source_path", "raw_csv_line",
    "area", "product", "dr_number", "date_delivered", "quantity",
    "unit_selling_price", "gross_sales", "discount_amount", "net_sales",
    "unit_acquisition_cost", "total_acquisition_cost", "gross_margin_amount",
    "margin_pct", "net_value_source", "quality_rule_codes", "record_kind",
    "disposition", "is_analysis_candidate", "business_fingerprint",
    "snapshot_reference_source_record_id",
}
assert required <= set(assessed.columns), f"Missing assessed fields: {sorted(required - set(assessed.columns))}"
assert required <= set(clean.columns), f"Missing clean fields: {sorted(required - set(clean.columns))}"
DATASET_ID = dataset_of(manifest, "Bronze manifest")
assert dataset_of(bronze_rows, "Bronze rows") == DATASET_ID
assert dataset_of(assessed, "Silver ledger") == DATASET_ID
assert dataset_of(clean, "Silver clean") == DATASET_ID
assert_unique(manifest, ["source_workbook"], "Bronze manifest")
assert_unique(bronze_rows, ["source_record_id"], "Bronze rows")
assert_unique(assessed, ["source_record_id"], "Silver ledger")
assert_unique(clean, ["source_record_id"], "Silver clean")
same_keys(bronze_rows, assessed, ["source_record_id"], "Silver must account for every original Bronze source key")
assert assessed.filter(F.col("disposition").isNull() | F.col("is_analysis_candidate").isNull()
    | F.col("record_kind").isNull() | F.col("quality_rule_codes").isNull()
    | (F.col("is_analysis_candidate") != F.col("disposition").isin(*KEEP_DISPOSITIONS))
).limit(1).count() == 0, "Silver has missing or inconsistent dispositions"
assert clean.filter(
    F.col("disposition").isNull() | ~F.col("disposition").isin(*KEEP_DISPOSITIONS)
    | ~F.col("is_analysis_candidate") | F.col("is_analysis_candidate").isNull()
    | F.col("date_delivered").isNull() | F.col("product").isNull()
    | F.col("area").isNull() | F.col("quality_rule_codes").isNull()
).limit(1).count() == 0, "Clean source contains non-analysis rows or missing required values"
same_keys(clean, assessed.filter("is_analysis_candidate = true"), ["source_record_id"], "Silver survivor keys differ")
source_counts = assessed.groupBy("source_workbook", "source_file_sha256").count()
expected_counts = manifest.select("source_workbook", "source_file_sha256", "raw_line_count")
file_reconciliation = expected_counts.join(source_counts, ["source_workbook", "source_file_sha256"], "full")
assert file_reconciliation.filter(
    F.col("count").isNull() | F.col("raw_line_count").isNull()
    | (F.col("count") != F.col("raw_line_count"))
).limit(1).count() == 0, "Silver ledger does not reconcile to every Bronze file"
assert clean.count() > 0, "No analysis candidates; review Silver before Gold"
display(file_reconciliation.orderBy("source_workbook"))
print(f"GOLD INPUT CONTRACT: PASS | dataset_id={DATASET_ID}")

# COMMAND ----------
# Cell 2 — Load the review reference and classify labels without approving medicines.
# These pure helpers can also be tested locally without Spark.
CONTRACT_PREFIX_PATTERN = (
    r"^(PAGBILAO|QMC|PPDC|TOURISM|PROVINCIAL\s+TOURISM\s+OFFICE|"
    r"MARINDUQUE|GULANG\s+GULANG|PESO|PESO\s+PROVINCIAL|PHO|"
    r"ABOITIZ|PADRE\s+BURGOS|PPOC)\s*#"
)


def normalize_label(value):
    return re.sub(r"\s+", " ", (value or "").strip()).upper()


def classify_product_label(value, reference_keys):
    label = normalize_label(value)
    if not label:
        return "MISSING_PRODUCT_IDENTITY"
    if re.search(CONTRACT_PREFIX_PATTERN, label):
        return "CONTRACT_LABEL_CANDIDATE"
    if "#" in label:
        return "HASHTAG_LABEL_REQUIRES_REVIEW"
    if label in reference_keys:
        return "NONMEDICAL_REFERENCE_REQUIRES_REVIEW"
    return "PRODUCT_MASTER_PENDING"


reference_file = Path(REFERENCE_PATH)
assert reference_file.is_file(), f"Upload the nonmedical review CSV to {REFERENCE_PATH}, or edit REFERENCE_PATH in Cell 1."
assert 0 < reference_file.stat().st_size <= 5_000_000, "Reference CSV missing, empty, or unexpectedly large"
reference_bytes = reference_file.read_bytes()
REFERENCE_SHA256 = hashlib.sha256(reference_bytes).hexdigest()
reference_reader = csv.DictReader(io.StringIO(reference_bytes.decode("utf-8-sig")))
reference_required = {"raw_product", "proposed_category", "forecast_eligible", "mapping_status", "review_notes"}
assert reference_required <= set(reference_reader.fieldnames or []), "Reference CSV schema changed"
reference_records = list(reference_reader)
assert 0 < len(reference_records) <= 10_000, "Unexpected reference row count"
reference_rows = []
reference_keys = set()
for row in reference_records:
    key = normalize_label(row["raw_product"])
    assert key and key not in reference_keys, f"Empty or duplicated normalized reference product: {key}"
    eligibility = row["forecast_eligible"].strip().lower()
    assert eligibility in {"true", "false"}, f"Invalid reference forecast_eligible for {key}"
    reference_keys.add(key)
    reference_rows.append((key, row["proposed_category"], eligibility == "true", row["mapping_status"], row["review_notes"]))
reference_schema = StructType([
    StructField("normalized_product", StringType(), False),
    StructField("reference_proposed_category", StringType(), True),
    StructField("reference_forecast_eligible", BooleanType(), False),
    StructField("reference_mapping_status", StringType(), True),
    StructField("reference_review_notes", StringType(), True),
])
product_reference = spark.createDataFrame(reference_rows, reference_schema)
print(f"PRODUCT REFERENCE: {len(reference_rows)} review labels | sha256={REFERENCE_SHA256}")
print("Reference labels are candidate classifications; an unmatched label is not an approved medicine.")

# COMMAND ----------
# Cell 3 — Keep one fact per accepted source record and govern each metric separately.
def has_rule(code):
    return F.coalesce(F.array_contains(F.col("quality_rule_codes"), code), F.lit(False))


fact = (
    clean
    .withColumn("sales_fact_id", F.col("source_record_id"))
    .withColumn("normalized_product", F.upper(F.trim(F.regexp_replace("product", r"\s+", " "))))
    .withColumn("normalized_area", F.upper(F.trim(F.regexp_replace("area", r"\s+", " "))))
    .join(product_reference, "normalized_product", "left")
    .withColumn("product_key", F.sha2("normalized_product", 256))
    .withColumn("area_key", F.sha2("normalized_area", 256))
    .withColumn("date_key", F.date_format("date_delivered", "yyyyMMdd").cast("int"))
    .withColumn("month_start", F.trunc("date_delivered", "month").cast("date"))
    .withColumn("calendar_year", F.year("date_delivered"))
    .withColumn("is_contract_label", F.col("normalized_product").rlike(CONTRACT_PREFIX_PATTERN))
    .withColumn("product_scope_status", F.when(F.col("is_contract_label"), "CONTRACT_LABEL_CANDIDATE")
        .when(F.col("normalized_product").contains("#"), "HASHTAG_LABEL_REQUIRES_REVIEW")
        .when(F.col("reference_forecast_eligible").isNotNull(), "NONMEDICAL_REFERENCE_REQUIRES_REVIEW")
        .otherwise("PRODUCT_MASTER_PENDING"))
    .withColumn("is_low_trust_2017", (F.col("calendar_year") == 2017) | (F.col("data_source_year") == 2017))
    .withColumn("is_historical_backfill_candidate", F.col("disposition") == "KEEP_HISTORICAL_BACKFILL_CANDIDATE")
    .withColumn("is_product_ranking_candidate", F.col("product_scope_status").isin(
        "PRODUCT_MASTER_PENDING", "NONMEDICAL_REFERENCE_REQUIRES_REVIEW"))
    .withColumn("is_approved_medical_demand_eligible", F.lit(False))
    .withColumn("is_quantity_observation_eligible", F.col("quantity").isNotNull()
        & ~has_rule("2017_QUANTITY_CANDIDATES_DISAGREE") & ~has_rule("INVALID_OR_MISSING_QUANTITY"))
    .withColumn("is_gross_sales_eligible", F.col("gross_sales").isNotNull() & ~has_rule("GROSS_VALUE_FORMULA_MISMATCH"))
    .withColumn("is_net_sales_eligible", F.col("net_sales").isNotNull() & ~has_rule("NET_VALUE_FORMULA_MISMATCH"))
    .withColumn("is_acquisition_cost_eligible", F.col("total_acquisition_cost").isNotNull() & ~has_rule("TRANSFER_VALUE_FORMULA_MISMATCH"))
    .withColumn("is_gross_margin_eligible", F.col("gross_margin_amount").isNotNull()
        & F.col("is_net_sales_eligible") & F.col("is_acquisition_cost_eligible") & ~has_rule("GROSS_MARGIN_FORMULA_MISMATCH"))
    .withColumn("is_positive_delivery_quantity_eligible", F.col("is_quantity_observation_eligible")
        & (F.col("quantity") > 0) & F.col("is_product_ranking_candidate"))
    .withColumn("is_return_quantity_eligible", F.col("is_quantity_observation_eligible") & (F.col("quantity") < 0))
    .withColumn("return_quantity_abs", F.when(F.col("is_return_quantity_eligible"), F.abs("quantity")))
    .withColumn("is_provisional_product_demand_eligible", F.col("is_positive_delivery_quantity_eligible")
        & (F.col("product_scope_status") == "PRODUCT_MASTER_PENDING")
        & ~F.col("is_low_trust_2017") & ~F.col("is_historical_backfill_candidate"))
    .withColumn("financial_review_required", F.col("net_sales").isNull() | (F.col("net_sales") <= 0)
        | ~F.col("is_net_sales_eligible"))
    .withColumn("transaction_quantity_status", F.when(F.col("quantity").isNull(), "MISSING_QUANTITY")
        .when(F.col("quantity") < 0, "RETURN_OR_CREDIT_CANDIDATE")
        .when(F.col("quantity") == 0, "ZERO_REPORTED_QUANTITY").otherwise("POSITIVE_REPORTED_QUANTITY"))
    .withColumn("contract_prefix", F.when(F.col("is_contract_label"), F.trim(F.regexp_extract("normalized_product", r"^([^#]+)\s*#", 1))))
    .withColumn("contract_label_group_key", F.when(F.col("is_contract_label"), F.sha2("normalized_product", 256)))
    .withColumn("product_reference_sha256", F.lit(REFERENCE_SHA256))
    .withColumn("publication_status", F.lit(PUBLICATION_STATUS))
    .withColumn("policy_version", F.lit(POLICY_VERSION))
)
assert_unique(fact, ["sales_fact_id"], "Gold fact")
same_keys(clean, fact, ["source_record_id"], "Gold must preserve exactly the Silver survivors")
eligibility_nulls = F.lit(False)
for column in fact.columns:
    if column.startswith("is_"):
        eligibility_nulls = eligibility_nulls | F.col(column).isNull()
assert fact.filter(eligibility_nulls).limit(1).count() == 0, "Gold eligibility flags must not be null"
assert fact.filter("is_approved_medical_demand_eligible = true").count() == 0
assert fact.filter("is_provisional_product_demand_eligible = true").filter(
    F.col("is_low_trust_2017") | F.col("is_historical_backfill_candidate")
    | (F.col("product_scope_status") != "PRODUCT_MASTER_PENDING") | (F.col("quantity") <= 0)
).count() == 0
display(fact.groupBy("product_scope_status", "transaction_quantity_status").count().orderBy("product_scope_status"))

# COMMAND ----------
# Cell 4 — Dimensions keep raw labels distinct from approved products or territories.
source_years = [row["data_source_year"] for row in manifest.select("data_source_year").distinct().collect()]
delivery_bounds = fact.agg(F.min("date_delivered").alias("first"), F.max("date_delivered").alias("last")).first()
first_year = min(min(source_years), delivery_bounds["first"].year)
last_year = max(max(source_years), delivery_bounds["last"].year)
calendar_start, calendar_end = date(first_year, 1, 1), date(last_year, 12, 31)
dim_date = (
    spark.range(1).select(F.explode(F.sequence(F.lit(calendar_start), F.lit(calendar_end), F.expr("interval 1 day"))).alias("date_delivered"))
    .withColumn("date_key", F.date_format("date_delivered", "yyyyMMdd").cast("int"))
    .withColumn("month_start", F.trunc("date_delivered", "month").cast("date"))
    .withColumn("calendar_year", F.year("date_delivered"))
    .withColumn("calendar_month", F.month("date_delivered"))
    .withColumn("calendar_quarter", F.quarter("date_delivered"))
)
dim_area = fact.groupBy("area_key", "normalized_area").agg(
    F.min("area").alias("area_label"), F.count("*").alias("source_record_count"),
    F.min("date_delivered").alias("first_observed_delivery"), F.max("date_delivered").alias("last_observed_delivery"),
).withColumn("area_master_status", F.lit("GEOGRAPHIC_CUSTOMER_OR_BUSINESS_CLASSIFICATION_PENDING"))
dim_product = fact.groupBy("product_key", "normalized_product", "product_scope_status").agg(
    F.min("product").alias("product_label"), F.count("*").alias("source_record_count"),
    F.min("reference_proposed_category").alias("reference_proposed_category"),
    F.min("date_delivered").alias("first_observed_delivery"), F.max("date_delivered").alias("last_observed_delivery"),
).withColumn("product_master_status", F.lit("PENDING_APPROVAL"))
for dimension, keys in [(dim_date, ["date_key"]), (dim_area, ["area_key"]), (dim_product, ["product_key"])]:
    assert_unique(dimension, keys, "Gold dimension")
    assert fact.select(*keys).join(dimension.select(*keys), keys, "left_anti").count() == 0

# COMMAND ----------
# Cell 5 — Reusable metric definitions and sales marts; missing observations stay null.
# Source measures remain signed. A conditional sum deliberately has no otherwise(0).
# Positive product units are heterogeneous source units, not standardized packs or doses.
METRICS = {
    "signed_quantity": ("quantity", "is_quantity_observation_eligible"),
    "positive_delivered_quantity": ("quantity", "is_positive_delivery_quantity_eligible"),
    "return_quantity_abs": ("return_quantity_abs", "is_return_quantity_eligible"),
    "provisional_product_demand_quantity": ("quantity", "is_provisional_product_demand_eligible"),
    "gross_sales": ("gross_sales", "is_gross_sales_eligible"),
    "net_sales": ("net_sales", "is_net_sales_eligible"),
    "total_acquisition_cost": ("total_acquisition_cost", "is_acquisition_cost_eligible"),
    "gross_margin_amount": ("gross_margin_amount", "is_gross_margin_eligible"),
    "margin_net_sales_basis": ("net_sales", "is_gross_margin_eligible"),
}


def metric_aggregations():
    result = [F.count("*").alias("transaction_count"), F.countDistinct("product_key").alias("distinct_source_product_labels"),
        F.sum(F.col("is_contract_label").cast("long")).alias("contract_label_transaction_count"),
        F.sum(F.col("is_low_trust_2017").cast("long")).alias("low_trust_2017_transaction_count"),
        F.sum(F.col("is_historical_backfill_candidate").cast("long")).alias("historical_backfill_transaction_count"),
        F.sum(F.col("financial_review_required").cast("long")).alias("financial_review_transaction_count")]
    for name, (value, eligible) in METRICS.items():
        result.extend([F.sum(F.when(F.col(eligible), F.col(value))).alias(name),
            F.count(F.when(F.col(eligible), F.col(value))).alias(f"{name}_observation_count")])
    return result


def with_margin_rate(frame):
    return frame.withColumn("weighted_gross_margin_pct", F.when(
        F.col("margin_net_sales_basis").isNotNull() & (F.col("margin_net_sales_basis") != 0),
        F.round(F.col("gross_margin_amount") / F.col("margin_net_sales_basis") * 100, 4)
    ))


def aggregate_sales(frame, keys):
    return with_margin_rate(frame.groupBy(*keys).agg(*metric_aggregations()))


month_spine = dim_date.select("month_start", "calendar_year", "calendar_month").distinct()
monthly = month_spine.join(aggregate_sales(fact, ["month_start"]), "month_start", "left")
COUNT_COLUMNS = [name for name in monthly.columns if name.endswith("_count") or name == "distinct_source_product_labels"]
monthly = monthly.fillna(0, subset=COUNT_COLUMNS).withColumn(
    "observation_status", F.when(F.col("transaction_count") == 0, "NO_OBSERVED_RECORDS").otherwise("OBSERVED_RECORDS")
).withColumn("source_completeness_status", F.lit("NOT_ESTABLISHED_BY_TRANSACTION_PRESENCE"))
year_coverage = monthly.groupBy("calendar_year").agg(
    F.count("*").alias("calendar_month_count"),
    F.sum(F.when(F.col("transaction_count") > 0, 1).otherwise(0)).alias("observed_month_count"),
    F.sum(F.when(F.col("transaction_count") == 0, 1).otherwise(0)).alias("unobserved_month_count"),
)
yearly = year_coverage.join(aggregate_sales(fact, ["calendar_year"]), "calendar_year", "left").fillna(0, subset=COUNT_COLUMNS).withColumn(
    "source_completeness_status", F.lit("NOT_ESTABLISHED_BY_TRANSACTION_PRESENCE")
)
area_yearly = aggregate_sales(fact, ["calendar_year", "area_key", "normalized_area"])
product_yearly = aggregate_sales(fact.filter("is_provisional_product_demand_eligible = true"),
    ["calendar_year", "product_key", "normalized_product", "product_scope_status"])
contract_labels = aggregate_sales(fact.filter("is_contract_label = true"),
    ["contract_label_group_key", "normalized_product", "contract_prefix"]).withColumn(
    "grouping_meaning", F.lit("EXACT_NORMALIZED_LABEL_ONLY_NOT_A_VERIFIED_CONTRACT_ID")
)
label_partition = aggregate_sales(fact, ["product_scope_status"])
for frame, keys in [(monthly, ["month_start"]), (yearly, ["calendar_year"]),
    (area_yearly, ["calendar_year", "area_key"]), (product_yearly, ["calendar_year", "product_key"]),
    (contract_labels, ["contract_label_group_key"]), (label_partition, ["product_scope_status"])]:
    assert_unique(frame, keys, "Sales mart")
assert monthly.count() == (last_year - first_year + 1) * 12
assert monthly.filter("observation_status = 'NO_OBSERVED_RECORDS'").filter(
    F.col("net_sales").isNotNull() | F.col("positive_delivered_quantity").isNotNull()
    | F.col("provisional_product_demand_quantity").isNotNull()
).count() == 0, "Unobserved months must not be imputed as zero sales or demand"
display(yearly.orderBy("calendar_year"))

# COMMAND ----------
# Cell 6 — Every exclusion remains visible; unlinked continuation rows are evidence.
disposition_audit = assessed.groupBy("data_source_year", "record_kind", "disposition", "is_analysis_candidate").agg(
    F.count("*").alias("source_record_count")
)
quality_audit = assessed.select("source_record_id", "data_source_year", "disposition",
    F.explode("quality_rule_codes").alias("quality_rule_code")).groupBy(
    "data_source_year", "disposition", "quality_rule_code"
).agg(F.countDistinct("source_record_id").alias("affected_source_records"))
returns_audit = fact.filter("is_return_quantity_eligible = true")
contract_evidence_audit = (
    assessed.withColumn("normalized_evidence_product", F.upper(F.trim(F.regexp_replace("product", r"\s+", " "))))
    .filter(F.coalesce(F.col("normalized_evidence_product").rlike(CONTRACT_PREFIX_PATTERN), F.lit(False))
        | (F.col("record_kind") == "CONTINUATION_OR_MISSING_IDENTITY"))
    .withColumn("evidence_status", F.when(F.col("normalized_evidence_product").rlike(CONTRACT_PREFIX_PATTERN),
        "CONTRACT_LABEL_SOURCE_RECORD").otherwise("UNLINKED_CONTINUATION_OR_MISSING_IDENTITY"))
    .withColumn("link_status", F.lit("NO_CONTRACT_LINK_INFERRED"))
    .withColumn("allocated_quantity", F.lit(None).cast("decimal(20,6)"))
    .withColumn("allocated_net_sales", F.lit(None).cast("decimal(20,6)"))
)
assert disposition_audit.agg(F.sum("source_record_count")).first()[0] == assessed.count()
assert returns_audit.filter("quantity >= 0 OR return_quantity_abs <= 0").count() == 0


def assert_metric_reconciliation(source_fact, mart, label):
    expected = source_fact.agg(*metric_aggregations()).first().asDict()
    sums = [F.sum("transaction_count").alias("transaction_count")]
    for metric in METRICS:
        sums.extend([F.sum(metric).alias(metric), F.sum(f"{metric}_observation_count").alias(f"{metric}_observation_count")])
    observed = mart.agg(*sums).first().asDict()
    assert (observed["transaction_count"] or 0) == expected["transaction_count"], f"{label}: row total mismatch"
    for metric in METRICS:
        assert (observed[f"{metric}_observation_count"] or 0) == expected[f"{metric}_observation_count"], f"{label}: {metric} observation count"
        target, actual = expected[metric], observed[metric]
        assert (target is None) == (actual is None), f"{label}: {metric} null meaning changed"
        if target is not None:
            assert abs(Decimal(str(target)) - Decimal(str(actual))) <= Decimal("0.000001"), f"{label}: {metric} sum changed"
    for metric in METRICS:
        assert mart.filter(
            ((F.col(f"{metric}_observation_count") == 0) & F.col(metric).isNotNull())
            | ((F.col(f"{metric}_observation_count") > 0) & F.col(metric).isNull())
        ).count() == 0, f"{label}: {metric} observation/null mismatch"


for mart, label in [(monthly, "monthly"), (yearly, "yearly"), (area_yearly, "area yearly"), (label_partition, "label partition")]:
    assert_metric_reconciliation(fact, mart, label)
assert_metric_reconciliation(fact.filter("is_provisional_product_demand_eligible = true"), product_yearly, "product yearly")
assert_metric_reconciliation(fact.filter("is_contract_label = true"), contract_labels, "exact contract labels")
print("GOLD PREPUBLICATION: PASS | Metric sums, eligible observation counts, null meaning, and dispositions reconciled")

# COMMAND ----------
# Cell 7 — Publish isolated restart candidates, then validate persisted values and keys.
# Each table write is atomic; the complete group is not. Rerun from Cell 1 if a write fails.
outputs = {
    f"{GOLD_SCHEMA}.sales_restart_fact_candidate": (fact, ["sales_fact_id"]),
    f"{GOLD_SCHEMA}.sales_restart_dim_date_candidate": (dim_date, ["date_key"]),
    f"{GOLD_SCHEMA}.sales_restart_dim_area_candidate": (dim_area, ["area_key"]),
    f"{GOLD_SCHEMA}.sales_restart_dim_product_candidate": (dim_product, ["product_key"]),
    f"{GOLD_SCHEMA}.sales_restart_monthly_candidate": (monthly, ["month_start"]),
    f"{GOLD_SCHEMA}.sales_restart_yearly_candidate": (yearly, ["calendar_year"]),
    f"{GOLD_SCHEMA}.sales_restart_area_yearly_candidate": (area_yearly, ["calendar_year", "area_key"]),
    f"{GOLD_SCHEMA}.sales_restart_product_yearly_candidate": (product_yearly, ["calendar_year", "product_key"]),
    f"{GOLD_SCHEMA}.sales_restart_contract_labels_candidate": (contract_labels, ["contract_label_group_key"]),
    f"{GOLD_SCHEMA}.sales_restart_label_partition_candidate": (label_partition, ["product_scope_status"]),
    f"{AUDIT_SCHEMA}.sales_restart_gold_disposition_candidate": (disposition_audit, ["data_source_year", "record_kind", "disposition", "is_analysis_candidate"]),
    f"{AUDIT_SCHEMA}.sales_restart_gold_quality_candidate": (quality_audit, ["data_source_year", "disposition", "quality_rule_code"]),
    f"{AUDIT_SCHEMA}.sales_restart_returns_candidate": (returns_audit, ["source_record_id"]),
    f"{AUDIT_SCHEMA}.sales_restart_contract_evidence_candidate": (contract_evidence_audit, ["source_record_id"]),
}
publication_rows = []
for name, (frame, keys) in outputs.items():
    assert name.split(".")[-1].startswith("sales_restart_") and name.endswith("_candidate")
    target = frame.withColumn("dataset_id", F.lit(DATASET_ID)).withColumn("policy_version", F.lit(POLICY_VERSION)).withColumn(
        "publication_status", F.lit(PUBLICATION_STATUS)
    ).withColumn("product_reference_sha256", F.lit(REFERENCE_SHA256)).withColumn("gold_published_at", F.current_timestamp())
    assert_unique(target, keys, name)
    expected_count = target.count()
    target.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(name)
    saved = spark.table(name)
    assert saved.count() == expected_count, f"{name}: persisted row count mismatch"
    assert_unique(saved, keys, name)
    same_keys(target, saved, keys, f"{name}: persisted key mismatch")
    if expected_count:
        assert dataset_of(saved, name) == DATASET_ID
    compare_columns = [column for column in target.columns if column != "gold_published_at"]
    assert target.select(*compare_columns).exceptAll(saved.select(*compare_columns)).limit(1).count() == 0, f"{name}: persisted values differ"
    assert saved.select(*compare_columns).exceptAll(target.select(*compare_columns)).limit(1).count() == 0, f"{name}: persisted values differ"
    publication_rows.append((name, expected_count, "PASS"))

saved_fact = spark.table(f"{GOLD_SCHEMA}.sales_restart_fact_candidate")
for suffix in ["monthly", "yearly", "area_yearly", "label_partition"]:
    assert_metric_reconciliation(saved_fact, spark.table(f"{GOLD_SCHEMA}.sales_restart_{suffix}_candidate"), f"persisted {suffix}")
publication_audit = spark.createDataFrame(publication_rows, "table_name string, saved_rows long, status string").withColumn(
    "dataset_id", F.lit(DATASET_ID)
).withColumn("policy_version", F.lit(POLICY_VERSION)).withColumn("validated_at", F.current_timestamp())
publication_audit.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{AUDIT_SCHEMA}.sales_restart_gold_publication_candidate"
)
display(publication_audit.orderBy("table_name"))
print("SALES GOLD RESTART: PASS_CANDIDATE")
print(f"Dataset: {DATASET_ID}")
print(f"Policy: {POLICY_VERSION}; product reference sha256: {REFERENCE_SHA256}")
print(f"Fact source records: {saved_fact.count():,}; published data tables: {len(outputs)}")
print("Original measures preserved; each reported aggregate uses its explicit eligibility flag.")
print("No-observation months remain unknown. Product master, historical backfills, and contract links need review.")
print("Provisional product demand is not approved medical demand; no forecasting or external integration was run.")
