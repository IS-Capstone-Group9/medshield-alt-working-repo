# Databricks notebook source
# Cell 1 — Load Databricks-native Bronze external tables.
from pyspark.sql import functions as F

CATALOG = "workspace"
POLICY_VERSION = "external_sources_databricks_v1_20260914"

doh_raw = spark.table(f"{CATALOG}.medshield_bronze.external_restart_doh_raw_candidate")
pagasa_raw = spark.table(f"{CATALOG}.medshield_bronze.external_restart_pagasa_raw_candidate")
station_metadata = spark.table(
    f"{CATALOG}.medshield_bronze.external_restart_pagasa_station_metadata_candidate"
)
dataset_ids = {
    row[0]
    for frame in (doh_raw, pagasa_raw, station_metadata)
    for row in frame.select("external_dataset_id").distinct().collect()
}
assert len(dataset_ids) == 1, f"Bronze dataset IDs do not agree: {dataset_ids}"
dataset_id = next(iter(dataset_ids))
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.medshield_silver")
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.medshield_audit")


def normalized(column):
    return F.upper(F.trim(F.regexp_replace(F.coalesce(column, F.lit("")), r"\s+", " ")))


def try_double(column_name):
    return F.expr(f"try_cast(trim(`{column_name}`) AS DOUBLE)")


def measured(column_name, minimum=None, maximum=None):
    value = try_double(column_name)
    valid = value.isNotNull() & (value != -999)
    if minimum is not None:
        valid = valid & (value >= minimum)
    if maximum is not None:
        valid = valid & (value <= maximum)
    return F.when(valid, value).otherwise(F.lit(None).cast("double"))

# COMMAND ----------
# Cell 2 — Validate and classify DOH records, preserving rejected rows for audit.
onset = F.expr("try_cast(substring(trim(date_of_onset_raw), 1, 10) AS DATE)")
cases = try_double("number_of_cases_raw")
classification = normalized(F.col("case_classification_raw"))

doh_assessed = (
    doh_raw
    .withColumn("date_of_onset", onset)
    .withColumn("case_count", cases)
    .withColumn("region", normalized(F.col("region_raw")))
    .withColumn("province", normalized(F.col("province_raw")))
    .withColumn("municipality_city", normalized(F.col("municipality_city_raw")))
    .withColumn("case_classification", classification)
    .withColumn(
        "classification_group",
        F.when((classification == "") | (classification == "PENDING"), "PENDING_REVIEW")
        .when(classification.contains("DISCARD") | (classification == "NOT AFP"), "EXCLUDED_DISCARDED")
        .when(
            (classification == "C") | classification.contains("CONFIRM") | classification.isin("VDPV", "VAPP"),
            "CONFIRMED",
        )
        .when((classification == "P") | classification.contains("PROB"), "PROBABLE")
        .when(
            (classification == "S")
            | classification.contains("SUSPECT")
            | classification.contains("CLINICALLY COMPATIBLE")
            | classification.contains("POLIO COMPATIBLE")
            | classification.contains("POLIO-COMPATIBLE"),
            "SUSPECT_OR_COMPATIBLE",
        )
        .otherwise("OTHER_REVIEW"),
    )
    .withColumn(
        "row_disposition",
        F.when(F.col("date_of_onset").isNull(), "REJECT_INVALID_ONSET_DATE")
        .when(F.col("case_count").isNull() | F.isnan("case_count") | (F.col("case_count") < 0), "REJECT_INVALID_CASE_COUNT")
        .otherwise("KEEP_VALID_SOURCE_ROW"),
    )
)
doh_rejected = doh_assessed.filter("row_disposition <> 'KEEP_VALID_SOURCE_ROW'")
doh_rejected.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_audit.external_restart_doh_rejected_candidate"
)
doh_valid = doh_assessed.filter("row_disposition = 'KEEP_VALID_SOURCE_ROW'")

territories = spark.createDataFrame(
    [
        ("BATANGAS", "Batangas", "PH-PROVINCE-BATANGAS", "pending"),
        ("CAMARINES NORTE", "Camarines Norte", "PH-PROVINCE-CAMARINES-NORTE", "pending"),
        ("CAMARINES SUR", "Camarines Sur", "PH-PROVINCE-CAMARINES-SUR", "pending"),
        ("CAVITE", "Cavite", "PH-PROVINCE-CAVITE", "pending"),
        ("LAGUNA", "Laguna", "PH-PROVINCE-LAGUNA", "pending"),
        ("MARINDUQUE", "Marinduque", "PH-PROVINCE-MARINDUQUE", "pending"),
        ("QUEZON", "Quezon", "PH-PROVINCE-QUEZON", "pending"),
    ],
    "province_key string, sales_territory string, territory_id string, external_mapping_status string",
)

doh_monthly = (
    doh_valid.withColumn("date", F.trunc("date_of_onset", "month"))
    .groupBy(
        "date", "region", "province", "disease_name", "case_classification",
        "classification_group", "source_file", "source_dataset_version", "external_dataset_id",
    )
    .agg(F.sum("case_count").alias("case_count"), F.count(F.lit(1)).alias("source_record_count"))
    .join(F.broadcast(territories), F.col("province") == F.col("province_key"), "left")
    .withColumn("year", F.year("date"))
    .withColumn("month", F.month("date"))
    .withColumn(
        "period_status",
        F.when(~F.col("year").between(2018, 2026), "OUTSIDE_DECLARED_SCOPE")
        .when(F.col("year") == 2026, "PARTIAL_CURRENT_YEAR")
        .otherwise("CLOSED_HISTORICAL_YEAR"),
    )
    .withColumn(
        "external_join_status",
        F.when(F.col("sales_territory").isNull(), "NOT_SALES_TERRITORY")
        .when(F.col("external_mapping_status") == "approved", "APPROVED_FOR_EXTERNAL_JOIN")
        .otherwise("EXTERNAL_MAPPING_PENDING"),
    )
    .select(
        "date", "year", "month", "region", F.col("province").alias("province_city"),
        "disease_name", "case_classification", "classification_group", "case_count",
        "source_record_count", F.lit(None).cast("double").alias("death_count"),
        F.lit(None).cast("double").alias("population"),
        F.lit(None).cast("string").alias("disease_intensity_indicator"), "period_status",
        "sales_territory", "territory_id", "external_mapping_status", "external_join_status",
        F.lit("DOH").alias("source"), "source_file", "source_dataset_version", "external_dataset_id",
        F.lit(POLICY_VERSION).alias("policy_version"),
        F.lit("Onset-month aggregate; retrospective surveillance data; release dates unavailable").alias("notes"),
    )
)
assert doh_monthly.count() == 138_673
assert float(doh_monthly.agg(F.sum("case_count")).first()[0]) == 4_608_155.0
doh_monthly.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_silver.external_restart_doh_monthly_candidate"
)

# COMMAND ----------
# Cell 3 — Clean PAGASA dates, sentinels, trace rainfall, units, and temperature variants.
pagasa_date = F.expr(
    "try_cast(concat(lpad(trim(year_raw), 4, '0'), '-', lpad(trim(month_raw), 2, '0'), '-', "
    "lpad(trim(day_raw), 2, '0')) AS DATE)"
)
trace_rainfall = F.trim("rainfall_raw").isin("-1", "-1.0")
tmax = measured("tmax_raw", -30, 65)
tmin = measured("tmin_raw", -30, 65)
reported_tmean = measured("tmean_raw", -30, 65)
rainfall_observed = measured("rainfall_raw", 0, None)
humidity = measured("rh_raw", 0, 100)
wind_ms = measured("wind_speed_raw", 0, None)
direction = measured("wind_direction_raw", 0, 360)

pagasa_assessed = (
    pagasa_raw
    .withColumn("date", pagasa_date)
    .withColumn("is_trace_rainfall", trace_rainfall)
    .withColumn("rainfall_mm", F.when(trace_rainfall, F.lit(0.0)).otherwise(rainfall_observed))
    .withColumn("temperature_max_c", tmax)
    .withColumn("temperature_min_c", tmin)
    .withColumn(
        "temperature_mean_c",
        F.when(reported_tmean.isNotNull(), reported_tmean)
        .when(tmax.isNotNull() & tmin.isNotNull(), F.round((tmax + tmin) / 2, 4))
        .otherwise(F.lit(None).cast("double")),
    )
    .withColumn(
        "temperature_mean_method",
        F.when(reported_tmean.isNotNull(), "REPORTED")
        .when(tmax.isNotNull() & tmin.isNotNull(), "DERIVED_TMAX_TMIN_MIDPOINT")
        .otherwise("UNAVAILABLE"),
    )
    .withColumn("humidity_mean_pct", humidity)
    .withColumn("wind_speed_mean_kph", F.round(wind_ms * F.lit(3.6), 4))
    .withColumn("wind_direction_degrees", direction)
    .withColumn(
        "row_disposition",
        F.when(F.col("date").isNull(), "REJECT_INVALID_DATE").otherwise("KEEP_VALID_DATE"),
    )
)
pagasa_rejected = pagasa_assessed.filter("row_disposition <> 'KEEP_VALID_DATE'")
pagasa_rejected.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_audit.external_restart_pagasa_rejected_candidate"
)

pagasa_daily = (
    pagasa_assessed.filter("row_disposition = 'KEEP_VALID_DATE'")
    .join(F.broadcast(station_metadata.select("station_name", "latitude", "longitude", "elevation_m")), "station_name", "left")
    .withColumn("year", F.year("date"))
    .withColumn("month", F.month("date"))
    .withColumn("day", F.dayofmonth("date"))
    .withColumn(
        "available_measure_count",
        sum(
            F.when(F.col(column).isNotNull(), 1).otherwise(0)
            for column in ("rainfall_mm", "temperature_mean_c", "humidity_mean_pct", "wind_speed_mean_kph")
        ),
    )
    .withColumn(
        "quality_status",
        F.when(F.col("available_measure_count") == 4, "VALID_COMPLETE").otherwise("VALID_WITH_MISSING_MEASURES"),
    )
    .withColumn(
        "notes",
        F.concat_ws(
            ";",
            F.when(F.col("is_trace_rainfall"), "TRACE_RAINFALL_LT_0.1MM_STORED_AS_LOWER_BOUND_ZERO"),
            F.when(F.col("temperature_mean_method") == "DERIVED_TMAX_TMIN_MIDPOINT", "TEMPERATURE_MEAN_DERIVED_FROM_DAILY_MAX_MIN"),
            F.when(F.col("available_measure_count") < 4, "ONE_OR_MORE_ANALYTICAL_MEASURES_MISSING"),
        ),
    )
    .select(
        "date", "year", "month", "day", "station_name", "latitude", "longitude", "elevation_m",
        "rainfall_mm", "is_trace_rainfall", "temperature_max_c", "temperature_min_c",
        "temperature_mean_c", "temperature_mean_method", "humidity_mean_pct", "wind_speed_mean_kph",
        "wind_direction_degrees", F.lit("HISTORICAL_STATION_OBSERVATION").alias("weather_indicator"),
        F.lit("PAGASA").alias("source"), "source_file", "source_dataset_version", "quality_status",
        "external_dataset_id", F.lit(POLICY_VERSION).alias("policy_version"), "notes",
    )
)
assert pagasa_daily.count() == 161_742
assert pagasa_daily.groupBy("date", "station_name").count().filter("count > 1").count() == 0
assert tuple(pagasa_daily.agg(F.min("year"), F.max("year")).first()) == (2017, 2024)
pagasa_daily.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_silver.external_restart_pagasa_daily_candidate"
)

quality = spark.createDataFrame(
    [
        ("DOH", doh_raw.count(), doh_valid.count(), doh_rejected.count()),
        ("PAGASA", pagasa_raw.count(), pagasa_daily.count(), pagasa_rejected.count()),
    ],
    "source string, bronze_rows long, accepted_rows long, rejected_rows long",
).withColumn("external_dataset_id", F.lit(dataset_id)).withColumn("status", F.lit("PASS_SILVER_CANDIDATE"))
quality.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_audit.external_restart_silver_quality_candidate"
)
display(quality.orderBy("source"))
print("EXTERNAL SILVER: PASS_CANDIDATE")

