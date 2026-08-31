"""Batch reconciliation and publication gates."""

from __future__ import annotations

from datetime import datetime, timezone

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    ArrayType,
    BooleanType,
    LongType,
    StringType,
    StructField,
    StructType,
    TimestampType,
)

from medshield_etl.config import PipelineConfig

_RUN_SCHEMA = StructType(
    [
        StructField("import_batch_id", StringType(), False),
        StructField("validated_at", TimestampType(), False),
        StructField("status", StringType(), False),
        StructField("source_files", LongType(), False),
        StructField("bronze_lines", LongType(), False),
        StructField("staged_rows", LongType(), False),
        StructField("clean_rows", LongType(), False),
        StructField("quarantine_rows", LongType(), False),
        StructField("out_of_range_clean_rows", LongType(), False),
        StructField("staging_reconciled", BooleanType(), False),
        StructField("expected_years_present", BooleanType(), False),
        StructField("gold_candidate_reconciled", BooleanType(), False),
        StructField("blocking_reasons", ArrayType(StringType()), False),
    ]
)


def validate_batch(
    spark: SparkSession,
    config: PipelineConfig,
    import_batch_id: str,
) -> dict[str, object]:
    bronze = spark.table(config.table("bronze", "sales_raw_lines")).where(
        F.col("import_batch_id") == import_batch_id
    )
    staging = spark.table(config.table("silver", "sales_staging")).where(
        F.col("import_batch_id") == import_batch_id
    )
    clean = spark.table(config.table("silver", "sales_clean")).where(
        F.col("import_batch_id") == import_batch_id
    )
    quarantine = spark.table(config.table("audit", "sales_quarantine")).where(
        F.col("import_batch_id") == import_batch_id
    )

    source_files = bronze.select("source_workbook").distinct().count()
    bronze_lines = bronze.count()
    staged_rows = staging.count()
    clean_rows = clean.count()
    quarantine_rows = quarantine.count()
    out_of_range_clean_rows = clean.where(~F.col("year").between(config.year_min, config.year_max)).count()
    discovered_years = {
        int(row["data_source_year"])
        for row in bronze.select("data_source_year").where(F.col("data_source_year").isNotNull()).distinct().collect()
    }
    staging_reconciled = staged_rows == clean_rows + quarantine_rows
    expected_years_present = config.expected_years.issubset(discovered_years)

    gold_table = config.table("gold", "sales_monthly_candidate")
    gold_candidate_reconciled = False
    if spark.catalog.tableExists(gold_table):
        all_quality_eligible_silver = spark.table(config.table("silver", "sales_clean")).where(
            (F.col("quality_status").isin("valid", "warning"))
            & F.col("in_analysis_range")
            & ~F.col("duplicate")
        )
        silver_totals = all_quality_eligible_silver.agg(
            F.sum("net_contract_value").alias("net_contract_value"),
            F.sum("gross_margin_amount").alias("gross_margin_amount"),
        ).first()
        gold_totals = spark.table(gold_table).agg(
            F.sum("net_contract_value").alias("net_contract_value"),
            F.sum("gross_margin_amount").alias("gross_margin_amount"),
        ).first()
        silver_net = float(silver_totals["net_contract_value"] or 0)
        gold_net = float(gold_totals["net_contract_value"] or 0)
        silver_margin = float(silver_totals["gross_margin_amount"] or 0)
        gold_margin = float(gold_totals["gross_margin_amount"] or 0)
        gold_candidate_reconciled = (
            abs(silver_net - gold_net) <= config.financial_tolerance
            and abs(silver_margin - gold_margin) <= config.financial_tolerance
        )

    blocking_reasons: list[str] = []
    if not staging_reconciled:
        blocking_reasons.append("staging_count_does_not_equal_clean_plus_quarantine")
    if not expected_years_present:
        blocking_reasons.append("one_or_more_expected_source_years_are_missing")
    if out_of_range_clean_rows:
        blocking_reasons.append("out_of_range_year_present_in_clean_table")
    if clean_rows == 0:
        blocking_reasons.append("clean_table_is_empty")
    if not gold_candidate_reconciled:
        blocking_reasons.append("gold_candidate_totals_do_not_match_clean_silver")

    status = "passed" if not blocking_reasons else "failed"
    result: dict[str, object] = {
        "import_batch_id": import_batch_id,
        "validated_at": datetime.now(timezone.utc),
        "status": status,
        "source_files": source_files,
        "bronze_lines": bronze_lines,
        "staged_rows": staged_rows,
        "clean_rows": clean_rows,
        "quarantine_rows": quarantine_rows,
        "out_of_range_clean_rows": out_of_range_clean_rows,
        "staging_reconciled": staging_reconciled,
        "expected_years_present": expected_years_present,
        "gold_candidate_reconciled": gold_candidate_reconciled,
        "blocking_reasons": blocking_reasons,
    }

    run_table = config.table("audit", "pipeline_runs")
    spark.createDataFrame([result], schema=_RUN_SCHEMA).write.format("delta").mode("append").saveAsTable(
        run_table
    )
    if blocking_reasons:
        raise AssertionError(f"Publication validation failed: {blocking_reasons}")
    return result
