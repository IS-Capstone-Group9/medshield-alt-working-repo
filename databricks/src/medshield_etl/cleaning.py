"""Silver standardization, data-quality rules, and quarantine disposition."""

from __future__ import annotations

from collections.abc import Iterable

from pyspark.sql import Column, DataFrame, SparkSession, Window
from pyspark.sql import functions as F
from pyspark.sql.types import DecimalType

from medshield_etl.config import PipelineConfig
from medshield_etl.contracts import (
    AREA_ALIASES,
    BUSINESS_COLUMNS,
    CANONICAL_COLUMNS,
    GEOGRAPHIC_AREAS,
    INVALID_TEXT_TOKENS,
    NON_GEOGRAPHIC_AREAS,
    TECHNICAL_COLUMNS,
)
from medshield_etl.tables import append_batch

_DECIMAL = DecimalType(20, 6)


def _clean_text(column: Column, *, upper: bool = False) -> Column:
    cleaned = F.trim(F.regexp_replace(column.cast("string"), r"\s+", " "))
    invalid = F.upper(cleaned).isin(*sorted(INVALID_TEXT_TOKENS))
    result = F.when(cleaned.isNull() | (cleaned == "") | invalid, F.lit(None)).otherwise(cleaned)
    return F.upper(result) if upper else result


def _clean_number(column_name: str) -> Column:
    original = F.trim(F.col(column_name).cast("string"))
    parsed = F.expr(
        f"try_cast(nullif(regexp_replace(regexp_replace(trim(`{column_name}`), "
        "'[^0-9eE+().\\-]', ''), '[()]', ''), '') AS DECIMAL(20, 6))"
    )
    return F.when(
        original.startswith("(") & original.endswith(")"),
        -F.abs(parsed),
    ).otherwise(parsed)


def _clean_percent(column_name: str) -> Column:
    original = F.trim(F.col(column_name).cast("string"))
    parsed = _clean_number(column_name)
    return (
        F.when(parsed.isNull(), F.lit(None).cast(_DECIMAL))
        .when(original.contains("%") | (F.abs(parsed) > F.lit(2)), parsed / F.lit(100))
        .otherwise(parsed)
        .cast(_DECIMAL)
    )


def _date_with_format(pattern: str) -> Column:
    return F.expr(f"try_to_timestamp(date_delivered_raw, '{pattern}')").cast("date")


def _clean_date() -> Column:
    excel_serial = F.when(
        F.trim(F.col("date_delivered_raw")).rlike(r"^[0-9]{5}$"),
        F.expr("date_add(DATE '1899-12-30', try_cast(date_delivered_raw AS INT))"),
    )
    year = F.col("data_source_year")
    month_first = F.coalesce(
        _date_with_format("M/d/yy"),
        _date_with_format("M/d/yyyy"),
    )
    day_first = F.coalesce(
        _date_with_format("d/M/yyyy"),
        _date_with_format("d-M-yyyy"),
        _date_with_format("d-MMM-yy"),
        _date_with_format("d-MMM-yyyy"),
    )
    general = F.coalesce(
        _date_with_format("yyyy-MM-dd"),
        day_first,
        month_first,
        excel_serial,
    )
    return (
        F.when(year == 2017, F.coalesce(month_first, general))
        .when(year >= 2018, F.coalesce(day_first, general))
        .otherwise(general)
    )


def _area_mapping() -> Column:
    mapping_entries: list[Column] = []
    for source, target in AREA_ALIASES.items():
        mapping_entries.extend((F.lit(source), F.lit(target)))
    return F.create_map(*mapping_entries)


def _clean_area() -> Column:
    source = _clean_text(F.col("area_raw"), upper=True)
    mapped = F.element_at(_area_mapping(), source)
    return F.when(source.isNull(), F.lit(None)).otherwise(F.coalesce(mapped, F.initcap(F.lower(source))))


def _clean_dr_number() -> Column:
    source = _clean_text(F.col("dr_number_raw"), upper=True)
    normalized = F.regexp_replace(source, "[‐‑‒–—−]", "-")
    normalized = F.regexp_replace(
        normalized,
        r"^(DR\s*NUMBER|DR\s*NO\.?|D\.R\.|DR)\s*[:#-]?\s*",
        "DR-",
    )
    normalized = F.regexp_replace(normalized, r"\s*-\s*", "-")
    normalized = F.regexp_replace(normalized, r"\s+", "")
    normalized = F.regexp_replace(normalized, r"-{2,}", "-")
    normalized = F.regexp_replace(normalized, r"^-|-$", "")
    return F.when(source.isNull(), F.lit(None)).when(
        normalized.rlike(r"^[0-9]+$"),
        F.concat(F.lit("DR-"), normalized),
    ).otherwise(normalized)


def _compact_array(expressions: Iterable[Column]) -> Column:
    return F.filter(F.array(*list(expressions)), lambda value: value.isNotNull())


def _issue(condition: Column, code: str) -> Column:
    return F.when(condition, F.lit(code))


def _financial_mismatch(
    actual: Column,
    expected: Column,
    tolerance: float,
) -> Column:
    return actual.isNotNull() & expected.isNotNull() & (F.abs(actual - expected) > F.lit(tolerance))


def build_clean_dataframe(staging: DataFrame, config: PipelineConfig) -> DataFrame:
    quantity_primary = _clean_number("quantity_primary_raw")
    quantity_secondary = _clean_number("quantity_secondary_raw")
    quantity = F.when(
        F.col("data_source_year") == 2017,
        F.coalesce(quantity_secondary, quantity_primary),
    ).otherwise(quantity_primary)

    gross_contract_value = _clean_number("gross_contract_value_raw")
    discount_amount = _clean_number("discount_amount_raw")
    source_net_contract_value = _clean_number("net_contract_value_raw")
    derived_net_contract_value = gross_contract_value - F.coalesce(
        discount_amount, F.lit(0).cast(_DECIMAL)
    )
    net_contract_value = F.coalesce(source_net_contract_value, derived_net_contract_value)
    gross_margin_amount = _clean_number("gross_margin_amount_raw")
    source_margin_pct = _clean_percent("gross_margin_pct_raw")
    derived_margin_pct = F.when(
        net_contract_value.isNotNull() & (net_contract_value != 0),
        gross_margin_amount / net_contract_value,
    ).cast(_DECIMAL)

    standardized = staging.select(
        "import_batch_id",
        _clean_area().alias("area"),
        _clean_dr_number().alias("dr_number"),
        _clean_date().alias("date_delivered"),
        _clean_text(F.col("product_raw"), upper=True).alias("product"),
        quantity.cast(_DECIMAL).alias("quantity"),
        _clean_number("contract_price_unit_raw").alias("contract_price_unit"),
        gross_contract_value.alias("gross_contract_value"),
        _clean_percent("discount_rate_raw").alias("discount_rate"),
        discount_amount.alias("discount_amount"),
        net_contract_value.cast(_DECIMAL).alias("net_contract_value"),
        _clean_number("transfer_price_unit_raw").alias("transfer_price_unit"),
        _clean_number("total_transfer_price_raw").alias("total_transfer_price"),
        gross_margin_amount.alias("gross_margin_amount"),
        F.coalesce(source_margin_pct, derived_margin_pct).cast(_DECIMAL).alias("gross_margin_pct"),
        "data_source_year",
        "source_workbook",
        "source_sheet",
        "source_row_number",
        "source_file_sha256",
        "raw_csv_line",
        "corrupt_record",
        "ingested_at",
        quantity_primary.alias("quantity_primary"),
        quantity_secondary.alias("quantity_secondary"),
        source_net_contract_value.alias("source_net_contract_value"),
        F.upper(F.trim(F.col("product_raw"))).alias("product_raw_upper"),
        _compact_array(
            (
                _issue(_clean_area() != F.col("area_raw"), "area_standardized"),
                _issue(_clean_dr_number() != F.col("dr_number_raw"), "dr_number_standardized"),
                _issue(F.col("date_delivered_raw").isNotNull(), "date_parsed"),
                _issue(
                    (F.col("data_source_year") == 2017) & quantity_secondary.isNotNull(),
                    "2017_quantity_reconciled",
                ),
                _issue(
                    source_net_contract_value.isNull() & gross_contract_value.isNotNull(),
                    "net_contract_value_derived",
                ),
                _issue(source_margin_pct.isNull() & derived_margin_pct.isNotNull(), "margin_pct_derived"),
            )
        ).alias("standardization_applied"),
    )

    standardized = (
        standardized.withColumn("year", F.year("date_delivered"))
        .withColumn(
            "in_analysis_range",
            F.col("year").between(config.year_min, config.year_max),
        )
        .withColumn(
            "area_type",
            F.when(F.col("area").isin(*sorted(GEOGRAPHIC_AREAS)), F.lit("geographic"))
            .when(F.col("area").isin(*sorted(NON_GEOGRAPHIC_AREAS)), F.lit("non_geographic"))
            .otherwise(F.lit("unmapped")),
        )
        .withColumn(
            "source_hash",
            F.sha2(
                F.concat_ws(
                    "|",
                    F.col("source_file_sha256"),
                    F.col("source_row_number").cast("string"),
                    F.col("raw_csv_line"),
                ),
                256,
            ),
        )
    )

    business_values = [
        F.coalesce(F.col(column).cast("string"), F.lit("")) for column in BUSINESS_COLUMNS
    ]
    standardized = standardized.withColumn(
        "business_hash",
        F.sha2(F.concat_ws("|", *business_values), 256),
    )
    duplicate_window = Window.partitionBy("business_hash").orderBy(
        "source_workbook", "source_row_number"
    )
    standardized = standardized.withColumn(
        "duplicate",
        F.row_number().over(duplicate_window) > 1,
    )

    expected_gross = F.col("quantity") * F.col("contract_price_unit")
    expected_net = F.col("gross_contract_value") - F.coalesce(
        F.col("discount_amount"), F.lit(0).cast(_DECIMAL)
    )
    expected_transfer = F.col("quantity") * F.col("transfer_price_unit")
    expected_margin = F.col("net_contract_value") - F.col("total_transfer_price")
    is_non_transaction = (
        F.col("product_raw_upper").contains("SALES SUMM")
        | F.col("product_raw_upper").contains("DISCREPANCY")
        | (F.col("product_raw_upper") == "TOTAL")
    )

    issue_conditions = (
        (F.col("area").isNull(), "missing_area"),
        (F.col("date_delivered").isNull(), "invalid_or_missing_date"),
        (F.col("product").isNull(), "missing_or_invalid_product"),
        (
            F.col("year").isNotNull() & ~F.col("in_analysis_range"),
            "delivery_year_outside_analysis_range",
        ),
        (
            F.col("year").isNotNull() & (F.col("year") != F.col("data_source_year")),
            "source_year_mismatch",
        ),
        (F.col("dr_number").isNull(), "missing_dr_number"),
        (F.col("quantity").isNull(), "missing_or_invalid_quantity"),
        (F.col("quantity") < 0, "negative_quantity"),
        (
            (F.col("data_source_year") == 2017)
            & F.col("quantity_primary").isNotNull()
            & F.col("quantity_secondary").isNotNull()
            & (F.col("quantity_primary") != F.col("quantity_secondary")),
            "2017_quantity_candidates_disagree",
        ),
        (
            _financial_mismatch(
                F.col("gross_contract_value"), expected_gross, config.financial_tolerance
            ),
            "gross_contract_value_mismatch",
        ),
        (
            _financial_mismatch(
                F.col("net_contract_value"), expected_net, config.financial_tolerance
            ),
            "net_contract_value_mismatch",
        ),
        (
            _financial_mismatch(
                F.col("total_transfer_price"), expected_transfer, config.financial_tolerance
            ),
            "total_transfer_price_mismatch",
        ),
        (
            _financial_mismatch(
                F.col("gross_margin_amount"), expected_margin, config.financial_tolerance
            ),
            "gross_margin_amount_mismatch",
        ),
        (
            F.col("gross_margin_pct").isNotNull()
            & ((F.col("gross_margin_pct") < -0.5) | (F.col("gross_margin_pct") > 1.5)),
            "gross_margin_pct_outside_expected_range",
        ),
        (F.col("area_type") == "unmapped", "unmapped_area"),
        (F.col("corrupt_record").isNotNull(), "corrupt_csv_record"),
        (is_non_transaction, "non_transaction_report_row"),
        (F.col("duplicate"), "exact_duplicate_candidate"),
    )
    standardized = standardized.withColumn(
        "quality_rule_codes",
        _compact_array(_issue(condition, code) for condition, code in issue_conditions),
    )

    blocking_codes = F.array(
        F.lit("missing_area"),
        F.lit("invalid_or_missing_date"),
        F.lit("missing_or_invalid_product"),
        F.lit("delivery_year_outside_analysis_range"),
        F.lit("corrupt_csv_record"),
        F.lit("non_transaction_report_row"),
    )
    has_blocking_issue = F.size(F.array_intersect(F.col("quality_rule_codes"), blocking_codes)) > 0
    standardized = (
        standardized.withColumn(
            "quality_status",
            F.when(has_blocking_issue, F.lit("rejected"))
            .when(F.size(F.col("quality_rule_codes")) > 0, F.lit("warning"))
            .otherwise(F.lit("valid")),
        )
        .withColumn("quality_notes", F.concat_ws("; ", F.col("quality_rule_codes")))
        .withColumn("input_stage", F.lit("silver_clean_v1"))
    )

    return standardized.select(*CANONICAL_COLUMNS, *TECHNICAL_COLUMNS)


def clean_and_quarantine(
    spark: SparkSession,
    config: PipelineConfig,
    import_batch_id: str,
) -> dict[str, int]:
    staging_table = config.table("silver", "sales_staging")
    staging = spark.table(staging_table).where(F.col("import_batch_id") == import_batch_id)
    if staging.limit(1).count() == 0:
        raise ValueError(f"No Silver staging records found for batch {import_batch_id!r}")

    assessed = build_clean_dataframe(staging, config).cache()
    clean = assessed.where((F.col("quality_status") != "rejected") & ~F.col("duplicate"))
    quarantine = assessed.where((F.col("quality_status") == "rejected") | F.col("duplicate"))

    append_batch(
        spark,
        clean,
        config.table("silver", "sales_clean"),
        import_batch_id,
        partition_by=("year",),
    )
    append_batch(
        spark,
        quarantine,
        config.table("audit", "sales_quarantine"),
        import_batch_id,
        partition_by=("data_source_year",),
    )
    result = {
        "assessed_rows": assessed.count(),
        "clean_rows": clean.count(),
        "quarantine_rows": quarantine.count(),
        "valid_rows": assessed.where(F.col("quality_status") == "valid").count(),
        "warning_rows": assessed.where(F.col("quality_status") == "warning").count(),
        "rejected_rows": assessed.where(F.col("quality_status") == "rejected").count(),
        "duplicate_candidates": assessed.where(F.col("duplicate")).count(),
    }
    assessed.unpersist()
    return result
