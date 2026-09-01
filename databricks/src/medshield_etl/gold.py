"""Gold candidate tables derived from quality-eligible Silver records."""

from __future__ import annotations

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F

from medshield_etl.config import PipelineConfig
from medshield_etl.tables import replace_table


def _approved_sales(spark: SparkSession, config: PipelineConfig) -> DataFrame:
    table_name = config.table("silver", "sales_clean")
    if not spark.catalog.tableExists(table_name):
        raise ValueError(f"Silver clean table does not exist: {table_name}")
    return spark.table(table_name).where(
        (F.col("quality_status").isin("valid", "warning"))
        & F.col("in_analysis_range")
        & ~F.col("duplicate")
    )


def build_gold_tables(spark: SparkSession, config: PipelineConfig) -> dict[str, int]:
    approved = _approved_sales(spark, config).cache()

    monthly = (
        approved.withColumn("month", F.date_trunc("month", F.col("date_delivered")).cast("date"))
        .groupBy("year", "month")
        .agg(
            F.count("*").alias("transaction_rows"),
            F.countDistinct("dr_number").alias("delivery_receipts"),
            F.sum("quantity").alias("quantity"),
            F.sum("gross_contract_value").alias("gross_contract_value"),
            F.sum("discount_amount").alias("discount_amount"),
            F.sum("net_contract_value").alias("net_contract_value"),
            F.sum("total_transfer_price").alias("total_transfer_price"),
            F.sum("gross_margin_amount").alias("gross_margin_amount"),
            F.sum(F.when(F.col("quality_status") == "warning", 1).otherwise(0)).alias(
                "warning_rows"
            ),
        )
        .withColumn(
            "gross_margin_pct",
            F.when(
                F.col("net_contract_value") != 0,
                F.col("gross_margin_amount") / F.col("net_contract_value"),
            ),
        )
    )

    by_product = (
        approved.groupBy("year", "product")
        .agg(
            F.count("*").alias("transaction_rows"),
            F.sum("quantity").alias("quantity"),
            F.sum("net_contract_value").alias("net_contract_value"),
            F.sum("total_transfer_price").alias("total_transfer_price"),
            F.sum("gross_margin_amount").alias("gross_margin_amount"),
        )
        .withColumn(
            "gross_margin_pct",
            F.when(
                F.col("net_contract_value") != 0,
                F.col("gross_margin_amount") / F.col("net_contract_value"),
            ),
        )
    )

    by_area = (
        approved.groupBy("year", "area", "area_type")
        .agg(
            F.count("*").alias("transaction_rows"),
            F.countDistinct("dr_number").alias("delivery_receipts"),
            F.sum("quantity").alias("quantity"),
            F.sum("net_contract_value").alias("net_contract_value"),
            F.sum("total_transfer_price").alias("total_transfer_price"),
            F.sum("gross_margin_amount").alias("gross_margin_amount"),
        )
        .withColumn(
            "gross_margin_pct",
            F.when(
                F.col("net_contract_value") != 0,
                F.col("gross_margin_amount") / F.col("net_contract_value"),
            ),
        )
    )

    replace_table(monthly, config.table("gold", "sales_monthly_candidate"))
    replace_table(by_product, config.table("gold", "sales_by_product_candidate"))
    replace_table(by_area, config.table("gold", "sales_by_area_candidate"))

    result = {
        "approved_rows": approved.count(),
        "monthly_rows": monthly.count(),
        "product_rows": by_product.count(),
        "area_rows": by_area.count(),
    }
    approved.unpersist()
    return result
