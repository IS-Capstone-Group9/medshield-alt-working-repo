# Databricks notebook source
# Cell 1 — Load Silver candidates and validate dataset lineage.
from pyspark.sql import functions as F

CATALOG = "workspace"
POLICY_VERSION = "external_sources_databricks_v1_20260914"
DOH_MODEL_DISEASES = ["Dengue", "Leptospirosis", "Cholera", "Typhoid Fever"]
INCLUDED_CLASSIFICATIONS = ["CONFIRMED", "PROBABLE", "SUSPECT_OR_COMPATIBLE"]

doh_monthly = spark.table(f"{CATALOG}.medshield_silver.external_restart_doh_monthly_candidate")
pagasa_daily = spark.table(f"{CATALOG}.medshield_silver.external_restart_pagasa_daily_candidate")
dataset_ids = {
    row[0]
    for frame in (doh_monthly, pagasa_daily)
    for row in frame.select("external_dataset_id").distinct().collect()
}
assert len(dataset_ids) == 1, f"Silver dataset IDs do not agree: {dataset_ids}"
dataset_id = next(iter(dataset_ids))
for schema in ("medshield_gold", "medshield_audit"):
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{schema}")

# COMMAND ----------
# Cell 2 — Create the DOH disease/territory/month candidate without partial 2026 or discarded cases.
doh_territory = (
    doh_monthly.filter(F.col("disease_name").isin(DOH_MODEL_DISEASES))
    .filter(F.col("year").between(2018, 2025))
    .filter(F.col("classification_group").isin(INCLUDED_CLASSIFICATIONS))
    .filter(F.col("sales_territory").isNotNull())
    .groupBy(
        "date", "disease_name", "sales_territory", "territory_id",
        "external_mapping_status", "external_dataset_id",
    )
    .agg(
        F.sum("case_count").alias("value"),
        F.sum("source_record_count").alias("source_record_count"),
        F.concat_ws(";", F.sort_array(F.collect_set("classification_group"))).alias("included_classification_groups"),
    )
    .select(
        F.date_format("date", "yyyy-MM").alias("period"),
        F.col("date").alias("period_start"),
        F.lit("DOH").alias("provider"),
        F.col("disease_name").alias("signal"),
        F.col("sales_territory").alias("territory"), "territory_id", "value",
        F.lit("reported non-discarded surveillance cases").alias("unit"), "source_record_count",
        "included_classification_groups", "external_mapping_status",
        (F.col("external_mapping_status") == "approved").alias("is_external_join_ready"),
        F.lit("CANDIDATE_ONLY_EXTERNAL_MAPPING_REVIEW_REQUIRED").alias("analysis_status"),
        F.lit("DOH_2018_2026_EXTRACTED_20260914").alias("source_dataset_version"),
        "external_dataset_id", F.lit(POLICY_VERSION).alias("policy_version"),
    )
)
assert doh_territory.count() == 1_787
assert float(doh_territory.agg(F.sum("value")).first()[0]) == 233_531.0
assert doh_territory.filter("is_external_join_ready = true").count() == 0
doh_territory.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_audit.external_restart_doh_territory_candidate"
)

# COMMAND ----------
# Cell 3 — Aggregate complete PAGASA station-months without filling absent days or 2025.
pagasa_monthly_base = (
    pagasa_daily
    .groupBy("year", "month", "station_name", "latitude", "longitude", "elevation_m", "external_dataset_id")
    .agg(
        F.countDistinct("date").alias("calendar_day_count"),
        F.count("rainfall_mm").alias("rainfall_observation_days"),
        F.sum("rainfall_mm").alias("rainfall_observed_total_mm"),
        F.sum(F.col("is_trace_rainfall").cast("int")).alias("trace_rainfall_days"),
        F.count("temperature_mean_c").alias("temperature_observation_days"),
        F.avg("temperature_mean_c").alias("temperature_mean_c"),
        F.count("humidity_mean_pct").alias("humidity_observation_days"),
        F.avg("humidity_mean_pct").alias("humidity_mean_pct"),
        F.count("wind_speed_mean_kph").alias("wind_observation_days"),
        F.avg("wind_speed_mean_kph").alias("wind_speed_mean_kph"),
        F.concat_ws(";", F.sort_array(F.collect_set("source_file"))).alias("source_files"),
    )
    .withColumn("period_start", F.make_date("year", "month", F.lit(1)))
    .withColumn("period", F.date_format("period_start", "yyyy-MM"))
    .withColumn("expected_calendar_days", F.dayofmonth(F.last_day("period_start")))
    .withColumn("is_complete_calendar_month", F.col("calendar_day_count") == F.col("expected_calendar_days"))
    .withColumn(
        "rainfall_total_mm",
        F.when(
            F.col("is_complete_calendar_month")
            & (F.col("rainfall_observation_days") == F.col("expected_calendar_days")),
            F.round("rainfall_observed_total_mm", 4),
        ),
    )
    .withColumn(
        "monthly_analysis_status",
        F.when(F.col("rainfall_total_mm").isNotNull(), "ANALYSIS_READY_RAINFALL").otherwise("INCOMPLETE_MONTH"),
    )
)
pagasa_monthly = pagasa_monthly_base.select(
    "period", "period_start", "year", "month", "station_name", "latitude", "longitude", "elevation_m",
    "calendar_day_count", "expected_calendar_days", "is_complete_calendar_month",
    "rainfall_observation_days", "rainfall_total_mm", F.round("rainfall_observed_total_mm", 4).alias("rainfall_observed_total_mm"),
    "trace_rainfall_days", "temperature_observation_days", F.round("temperature_mean_c", 4).alias("temperature_mean_c"),
    "humidity_observation_days", F.round("humidity_mean_pct", 4).alias("humidity_mean_pct"),
    "wind_observation_days", F.round("wind_speed_mean_kph", 4).alias("wind_speed_mean_kph"),
    "monthly_analysis_status", F.lit("PAGASA").alias("source"), "source_files",
    F.lit("PAGASA_2017_2024").alias("source_dataset_version"), "external_dataset_id",
    F.lit(POLICY_VERSION).alias("policy_version"),
    F.lit("Trace rainfall uses zero lower bound; incomplete metrics are not zero-filled").alias("notes"),
)
assert pagasa_monthly.count() == 5_314
assert pagasa_monthly.filter("monthly_analysis_status = 'ANALYSIS_READY_RAINFALL'").count() == 5_214
assert pagasa_monthly.filter("year = 2025").count() == 0
pagasa_monthly.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_gold.external_restart_pagasa_monthly_candidate"
)

# COMMAND ----------
# Cell 4 — Publish the explicit PAGASA mapping review; no station is approved automatically.
mapping_proposals = spark.createDataFrame(
    [
        ("Batangas", "PH-PROVINCE-BATANGAS", "Ambulong", "needs_review", "Station location and representativeness require owner verification"),
        ("Camarines Norte", "PH-PROVINCE-CAMARINES-NORTE", "Daet", "needs_review", "Same-province station candidate; requires owner verification"),
        ("Camarines Sur", "PH-PROVINCE-CAMARINES-SUR", None, "needs_review", "No same-province station identified in supplied files"),
        ("Cavite", "PH-PROVINCE-CAVITE", "Sangley Point", "needs_review", "Same-province station candidate; requires owner verification"),
        ("Laguna", "PH-PROVINCE-LAGUNA", None, "needs_review", "No same-province station identified in supplied files"),
        ("Marinduque", "PH-PROVINCE-MARINDUQUE", None, "needs_review", "No same-province station identified in supplied files"),
        ("Quezon", "PH-PROVINCE-QUEZON", "Tayabas", "needs_review", "Alabat is an alternative Quezon station; selection requires approval"),
    ],
    "territory string, territory_id string, proposed_station_name string, mapping_status string, review_notes string",
)
station_coverage = (
    pagasa_monthly
    .withColumn(
        "station_join_key",
        F.upper(
            F.trim(
                F.regexp_replace(
                    F.regexp_extract(F.col("station_name"), r"([^/]+)$", 1),
                    r" Daily Data\.csv$",
                    "",
                )
            )
        ),
    )
    .groupBy("station_join_key")
    .agg(
        F.first("station_name").alias("matched_station_name"),
        F.min("year").alias("observed_start_year"),
        F.max("year").alias("observed_end_year"),
        F.sum((F.col("monthly_analysis_status") == "ANALYSIS_READY_RAINFALL").cast("int")).alias("analysis_ready_rainfall_months"),
    )
)
mapping_proposals = mapping_proposals.withColumn(
    "station_join_key", F.upper(F.trim(F.col("proposed_station_name")))
)
mapping_review = (
    mapping_proposals.join(station_coverage, "station_join_key", "left")
    .select(
        "territory", "territory_id", "proposed_station_name",
        F.when(F.col("proposed_station_name").isNotNull(), F.concat(F.col("proposed_station_name"), F.lit(" Daily Data.csv")))
        .otherwise(F.lit(None).cast("string")).alias("proposed_station_file_pattern"),
        "mapping_status", F.lit("lower_bound_zero").alias("trace_policy"),
        "observed_start_year", "observed_end_year",
        F.coalesce(F.col("analysis_ready_rainfall_months"), F.lit(0)).alias("analysis_ready_rainfall_months"),
        F.lit(False).alias("external_join_ready"), "review_notes",
        F.lit("pending").alias("external_mapping_status"), F.lit(dataset_id).alias("external_dataset_id"),
        F.lit(POLICY_VERSION).alias("policy_version"),
    )
)
assert mapping_review.count() == 7
assert mapping_review.filter("external_join_ready = true").count() == 0
coverage_by_territory = {
    row["territory"]: int(row["analysis_ready_rainfall_months"] or 0)
    for row in mapping_review.select("territory", "analysis_ready_rainfall_months").collect()
}
assert coverage_by_territory == {
    "Batangas": 95,
    "Camarines Norte": 96,
    "Camarines Sur": 0,
    "Cavite": 96,
    "Laguna": 0,
    "Marinduque": 0,
    "Quezon": 96,
}
mapping_review.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_audit.external_restart_pagasa_mapping_review_candidate"
)

# COMMAND ----------
# Cell 5 — Record publication counts only after all quality assertions pass.
published = [
    (f"{CATALOG}.medshield_silver.external_restart_doh_monthly_candidate", doh_monthly.count()),
    (f"{CATALOG}.medshield_audit.external_restart_doh_territory_candidate", doh_territory.count()),
    (f"{CATALOG}.medshield_silver.external_restart_pagasa_daily_candidate", pagasa_daily.count()),
    (f"{CATALOG}.medshield_gold.external_restart_pagasa_monthly_candidate", pagasa_monthly.count()),
    (f"{CATALOG}.medshield_audit.external_restart_pagasa_mapping_review_candidate", mapping_review.count()),
]
publication = (
    spark.createDataFrame(published, "table_name string, saved_rows long")
    .withColumn("external_dataset_id", F.lit(dataset_id))
    .withColumn("policy_version", F.lit(POLICY_VERSION))
    .withColumn("status", F.lit("PASS_CANDIDATE_ONLY"))
    .withColumn("validated_at", F.current_timestamp())
)
publication.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_audit.external_restart_publication_candidate"
)
display(publication.orderBy("table_name"))
print("EXTERNAL GOLD: PASS_CANDIDATE_ONLY")
print("DOH 2026 is partial; PAGASA 2025 is absent; geography and medical-product gates remain pending.")
