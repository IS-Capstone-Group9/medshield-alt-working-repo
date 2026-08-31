"""Immutable Bronze ingestion for MedShield CSV source files."""

from __future__ import annotations

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F

from medshield_etl.config import PipelineConfig
from medshield_etl.tables import append_batch


def build_bronze_dataframe(
    spark: SparkSession,
    config: PipelineConfig,
    import_batch_id: str,
) -> DataFrame:
    files = (
        spark.read.format("binaryFile")
        .load(config.input_glob)
        .where(F.lower(F.col("path")).endswith(".csv"))
    )
    if files.limit(1).count() == 0:
        raise FileNotFoundError(f"No MedShield CSV files found at {config.input_glob}")

    discovered_years = {
        int(row["source_year"])
        for row in (
            files.select(
                F.regexp_extract(F.col("path"), r"medshield_data_(20\d{2})\.csv$", 1)
                .cast("int")
                .alias("source_year")
            )
            .where(F.col("source_year").isNotNull())
            .distinct()
            .collect()
        )
    }
    missing_years = sorted(config.expected_years - discovered_years)
    if missing_years:
        raise ValueError(f"Missing expected source files for years: {missing_years}")

    file_metadata = files.select(
        F.col("path").alias("source_path"),
        F.regexp_extract(F.col("path"), r"([^/]+)$", 1).alias("source_workbook"),
        F.regexp_extract(F.col("path"), r"medshield_data_(20\d{2})\.csv$", 1)
        .cast("int")
        .alias("data_source_year"),
        F.col("modificationTime").alias("source_modified_at"),
        F.col("length").alias("source_file_bytes"),
        F.sha2(F.col("content"), 256).alias("source_file_sha256"),
        F.regexp_replace(F.decode(F.col("content"), "UTF-8"), "\\r\\n?", "\n").alias(
            "source_text"
        ),
    )

    lines = file_metadata.select(
        "source_path",
        "source_workbook",
        "data_source_year",
        "source_modified_at",
        "source_file_bytes",
        "source_file_sha256",
        F.posexplode(F.split(F.col("source_text"), "\n", -1)).alias(
            "source_line_index", "raw_csv_line"
        ),
    )

    return lines.select(
        F.lit(import_batch_id).alias("import_batch_id"),
        "source_path",
        "source_workbook",
        "data_source_year",
        (F.col("source_line_index") + F.lit(1)).cast("long").alias("source_row_number"),
        F.regexp_replace(F.col("raw_csv_line"), "^\\ufeff", "").alias("raw_csv_line"),
        "source_modified_at",
        "source_file_bytes",
        "source_file_sha256",
        F.current_timestamp().alias("ingested_at"),
        F.lit("csv_raw_line_v1").alias("parser_version"),
    )


def ingest_bronze(
    spark: SparkSession,
    config: PipelineConfig,
    import_batch_id: str,
) -> dict[str, int]:
    dataframe = build_bronze_dataframe(spark, config, import_batch_id).cache()
    table_name = config.table("bronze", "sales_raw_lines")
    append_batch(
        spark,
        dataframe,
        table_name,
        import_batch_id,
        partition_by=("data_source_year",),
    )
    result = {
        "files": dataframe.select("source_workbook").distinct().count(),
        "raw_lines": dataframe.count(),
    }
    dataframe.unpersist()
    return result
