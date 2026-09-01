"""Unity Catalog and Delta-table helpers."""

from __future__ import annotations

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F

from medshield_etl.config import PipelineConfig


def ensure_environment(spark: SparkSession, config: PipelineConfig) -> None:
    for schema in config.schemas:
        spark.sql(f"CREATE SCHEMA IF NOT EXISTS {config.catalog}.{schema}")
    spark.sql(f"CREATE VOLUME IF NOT EXISTS {config.volume_name}")


def table_exists(spark: SparkSession, table_name: str) -> bool:
    return spark.catalog.tableExists(table_name)


def assert_batch_is_new(
    spark: SparkSession,
    table_name: str,
    import_batch_id: str,
) -> None:
    if not table_exists(spark, table_name):
        return
    exists = (
        spark.table(table_name)
        .where(F.col("import_batch_id") == import_batch_id)
        .limit(1)
        .count()
    )
    if exists:
        raise ValueError(
            f"Batch {import_batch_id!r} already exists in {table_name}. "
            "Use a new batch ID or explicitly remove the development batch after review."
        )


def append_batch(
    spark: SparkSession,
    dataframe: DataFrame,
    table_name: str,
    import_batch_id: str,
    *,
    partition_by: tuple[str, ...] = (),
) -> None:
    assert_batch_is_new(spark, table_name, import_batch_id)
    writer = dataframe.write.format("delta").mode("append")
    if partition_by and not table_exists(spark, table_name):
        writer = writer.partitionBy(*partition_by)
    writer.saveAsTable(table_name)


def replace_table(dataframe: DataFrame, table_name: str) -> None:
    (
        dataframe.write.format("delta")
        .mode("overwrite")
        .option("overwriteSchema", "true")
        .saveAsTable(table_name)
    )
