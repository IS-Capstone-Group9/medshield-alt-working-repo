"""Source-version parsing from immutable Bronze lines to Silver staging."""

from __future__ import annotations

from functools import reduce

from pyspark.sql import Column, DataFrame, SparkSession, Window
from pyspark.sql import functions as F
from pyspark.sql.types import StringType, StructField, StructType

from medshield_etl.config import PipelineConfig
from medshield_etl.contracts import SOURCE_LAYOUTS
from medshield_etl.tables import append_batch

_WIDE_CSV_SCHEMA = StructType(
    [StructField(f"_c{index}", StringType(), True) for index in range(21)]
    + [StructField("_corrupt_record", StringType(), True)]
)

_CSV_OPTIONS = {
    "mode": "PERMISSIVE",
    "quote": '"',
    "escape": '"',
    "columnNameOfCorruptRecord": "_corrupt_record",
}

_RAW_FIELDS = tuple(next(iter(SOURCE_LAYOUTS.values())).keys())


def _column_for_year(field_name: str) -> Column:
    expression: Column | None = None
    for year, layout in sorted(SOURCE_LAYOUTS.items()):
        position = layout[field_name]
        value = F.lit(None).cast("string") if position is None else F.col(f"_c{position}")
        expression = F.when(F.col("data_source_year") == year, value) if expression is None else expression.when(
            F.col("data_source_year") == year, value
        )
    assert expression is not None
    return expression.otherwise(F.lit(None).cast("string")).alias(field_name)


def build_staging_dataframe(bronze: DataFrame) -> DataFrame:
    parsed = bronze.withColumn(
        "_parsed",
        F.from_csv(F.col("raw_csv_line"), _WIDE_CSV_SCHEMA, _CSV_OPTIONS),
    ).select("*", "_parsed.*").drop("_parsed")

    normalized_line = F.lower(F.regexp_replace(F.col("raw_csv_line"), "[^a-zA-Z]", ""))
    is_header = (
        normalized_line.contains("product")
        & normalized_line.contains("date")
        & (normalized_line.contains("qty") | normalized_line.contains("grosssales"))
    )
    source_window = Window.partitionBy("import_batch_id", "source_workbook")
    parsed = parsed.withColumn(
        "source_header_row_number",
        F.min(F.when(is_header, F.col("source_row_number"))).over(source_window),
    )

    nonempty_fields = [
        F.length(F.trim(F.coalesce(F.col(f"_c{index}"), F.lit("")))) > 0
        for index in range(21)
    ]
    has_values = reduce(lambda left, right: left | right, nonempty_fields)
    transaction_region = parsed.where(
        F.col("source_header_row_number").isNotNull()
        & (F.col("source_row_number") > F.col("source_header_row_number"))
        & has_values
    )

    return transaction_region.select(
        "import_batch_id",
        "data_source_year",
        "source_workbook",
        F.lit("CSV").alias("source_sheet"),
        "source_row_number",
        "source_header_row_number",
        "source_file_sha256",
        "raw_csv_line",
        "ingested_at",
        *[_column_for_year(field_name) for field_name in _RAW_FIELDS],
        F.col("_corrupt_record").alias("corrupt_record"),
        F.lit("bronze_csv").alias("input_stage"),
        F.lit("source_layout_v1").alias("parser_version"),
    )


def stage_sales(
    spark: SparkSession,
    config: PipelineConfig,
    import_batch_id: str,
) -> dict[str, int]:
    bronze_table = config.table("bronze", "sales_raw_lines")
    bronze = spark.table(bronze_table).where(F.col("import_batch_id") == import_batch_id)
    if bronze.limit(1).count() == 0:
        raise ValueError(f"No Bronze records found for batch {import_batch_id!r}")

    dataframe = build_staging_dataframe(bronze).cache()
    missing_headers = (
        bronze.select("source_workbook")
        .distinct()
        .join(
            dataframe.select("source_workbook").distinct(),
            on="source_workbook",
            how="left_anti",
        )
        .collect()
    )
    if missing_headers:
        names = [row["source_workbook"] for row in missing_headers]
        raise ValueError(f"No transaction header detected for source files: {names}")

    table_name = config.table("silver", "sales_staging")
    append_batch(
        spark,
        dataframe,
        table_name,
        import_batch_id,
        partition_by=("data_source_year",),
    )
    result = {
        "files": dataframe.select("source_workbook").distinct().count(),
        "staged_rows": dataframe.count(),
    }
    dataframe.unpersist()
    return result
