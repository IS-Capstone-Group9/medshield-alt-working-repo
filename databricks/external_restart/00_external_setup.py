# Databricks notebook source
# Run this notebook once before uploading the raw DOH and PAGASA folders.
CATALOG = "workspace"
VOLUME_ROOT = f"/Volumes/{CATALOG}/medshield_bronze/raw_files/external_restart"

for schema in ("medshield_bronze", "medshield_silver", "medshield_gold", "medshield_audit"):
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{schema}")
spark.sql(f"CREATE VOLUME IF NOT EXISTS {CATALOG}.medshield_bronze.raw_files")

for path in (
    f"{VOLUME_ROOT}/doh",
    f"{VOLUME_ROOT}/pagasa/2017-2020",
    f"{VOLUME_ROOT}/pagasa/2021-2024",
):
    dbutils.fs.mkdirs(path)

display(dbutils.fs.ls(VOLUME_ROOT))
print("EXTERNAL SETUP: READY_FOR_RAW_UPLOAD")
print(f"DOH upload directory: {VOLUME_ROOT}/doh")
print(f"PAGASA 2017-2020 upload directory: {VOLUME_ROOT}/pagasa/2017-2020")
print(f"PAGASA 2021-2024 upload directory: {VOLUME_ROOT}/pagasa/2021-2024")
