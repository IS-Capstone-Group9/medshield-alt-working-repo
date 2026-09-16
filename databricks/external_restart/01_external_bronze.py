# Databricks notebook source
# Cell 1 — Configure the Databricks-native external-source restart.
# Upload the unchanged raw folders under the two paths below before running all cells.
import hashlib
import json
import re
from pathlib import Path

from pyspark.sql import functions as F

CATALOG = "workspace"
POLICY_VERSION = "external_sources_databricks_v1_20260914"
SOURCE_ROOT = Path(f"/Volumes/{CATALOG}/medshield_bronze/raw_files/external_restart")
DOH_ROOT = SOURCE_ROOT / "doh"
PAGASA_ROOT = SOURCE_ROOT / "pagasa"

for schema in ("medshield_bronze", "medshield_audit"):
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{schema}")
spark.sql(f"CREATE VOLUME IF NOT EXISTS {CATALOG}.medshield_bronze.raw_files")


def files_below(root, predicate):
    if not root.exists():
        raise FileNotFoundError(f"Required raw directory does not exist: {root}")
    return sorted(path for path in root.rglob("*") if path.is_file() and predicate(path))


doh_files = files_below(DOH_ROOT, lambda path: path.suffix.lower() == ".csv")
pagasa_files = files_below(PAGASA_ROOT, lambda path: path.name.endswith(" Daily Data.csv"))
pagasa_readmes = files_below(PAGASA_ROOT, lambda path: path.name.lower() == "a.readme.txt")

assert len(doh_files) == 19, f"Expected 19 DOH disease CSVs, found {len(doh_files)}"
assert len(pagasa_files) == 125, f"Expected 125 PAGASA daily CSVs, found {len(pagasa_files)}"
assert pagasa_readmes, "No PAGASA A.ReadMe.txt file was uploaded"

# COMMAND ----------
# Cell 2 — Build a byte-level manifest before parsing any source rows.
def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


manifest_rows = []
for source_group, root, paths in (
    ("DOH", DOH_ROOT, doh_files),
    ("PAGASA_DAILY", PAGASA_ROOT, pagasa_files),
    ("PAGASA_METADATA", PAGASA_ROOT, pagasa_readmes),
):
    for path in paths:
        manifest_rows.append(
            {
                "source_group": source_group,
                "source_file": path.name,
                "source_relative_path": path.relative_to(SOURCE_ROOT).as_posix(),
                "source_file_bytes": path.stat().st_size,
                "source_file_sha256": sha256(path),
            }
        )

dataset_id = hashlib.sha256(
    json.dumps(manifest_rows, sort_keys=True, separators=(",", ":")).encode("utf-8")
).hexdigest()
manifest = (
    spark.createDataFrame(manifest_rows)
    .withColumn("external_dataset_id", F.lit(dataset_id))
    .withColumn("policy_version", F.lit(POLICY_VERSION))
    .withColumn("ingested_at", F.current_timestamp())
)
manifest.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_audit.external_restart_source_manifest_candidate"
)
print(f"External dataset: {dataset_id}")

# COMMAND ----------
# Cell 3 — Ingest the 19 DOH disease files as immutable string-valued Bronze rows.
DOH_REQUIRED_COLUMNS = [
    "Date of Onset", "Region", "Province", "Municipality_City",
    "Admission Status", "Case Classification", "Number of Cases",
]


def read_csv_exact(paths, expected_header):
    frame = (
        spark.read.option("header", True)
        .option("mode", "FAILFAST")
        .option("encoding", "UTF-8")
        .csv([str(path) for path in paths])
    )
    if frame.columns != expected_header:
        raise ValueError(f"Unexpected source columns. Expected {expected_header}; found {frame.columns}")
    return frame


def read_doh_file(path):
    frame = (
        spark.read.option("header", True)
        .option("mode", "FAILFAST")
        .option("encoding", "UTF-8")
        .csv(str(path))
    )
    missing = sorted(set(DOH_REQUIRED_COLUMNS).difference(frame.columns))
    if missing:
        raise ValueError(f"Missing required DOH columns in {path.name}: {missing}")
    # Age fields vary by disease. The unchanged raw files retain them; the canonical
    # Bronze table selects only the fields needed for disease/time/geography analytics.
    return frame.select(*DOH_REQUIRED_COLUMNS).withColumn("source_file", F.lit(path.name))


doh_raw = None
for doh_path in doh_files:
    source_frame = read_doh_file(doh_path)
    doh_raw = source_frame if doh_raw is None else doh_raw.unionByName(source_frame)

doh_bronze = (
    doh_raw.select(
        F.col("Date of Onset").alias("date_of_onset_raw"),
        F.col("Region").alias("region_raw"),
        F.col("Province").alias("province_raw"),
        F.col("Municipality_City").alias("municipality_city_raw"),
        F.col("Age").alias("age_raw"),
        F.col("Admission Status").alias("admission_status_raw"),
        F.col("Case Classification").alias("case_classification_raw"),
        F.col("Number of Cases").alias("number_of_cases_raw"),
        "source_file",
    )
    .withColumn("disease_name", F.regexp_replace("source_file", r"_\d{8}\.csv$", ""))
    .withColumn("source_dataset_version", F.lit("DOH_2018_2026_EXTRACTED_20260914"))
    .withColumn("external_dataset_id", F.lit(dataset_id))
    .withColumn("policy_version", F.lit(POLICY_VERSION))
    .withColumn("ingested_at", F.current_timestamp())
)
assert doh_bronze.count() == 4_484_337
doh_bronze.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_bronze.external_restart_doh_raw_candidate"
)

# COMMAND ----------
# Cell 4 — Ingest both PAGASA header variants without shifting columns.
PAGASA_OLD_HEADER = [
    "YEAR", "MONTH", "DAY", "RAINFALL", "TMAX", "TMIN", "TMEAN", "RH",
    "WIND_SPEED", "WIND_DIRECTION",
]
PAGASA_NEW_HEADER = [
    "YEAR", "MONTH", "DAY", "RAINFALL", "TMAX", "TMIN", "RH",
    "WIND_SPEED", "WIND_DIRECTION",
]

old_files, new_files = [], []
for path in pagasa_files:
    first_line = path.open("r", encoding="utf-8-sig").readline().strip().split(",")
    if first_line == PAGASA_OLD_HEADER:
        old_files.append(path)
    elif first_line == PAGASA_NEW_HEADER:
        new_files.append(path)
    else:
        raise ValueError(f"Unknown PAGASA header in {path}: {first_line}")


def canonical_pagasa(frame, has_reported_mean):
    return frame.select(
        F.col("YEAR").alias("year_raw"),
        F.col("MONTH").alias("month_raw"),
        F.col("DAY").alias("day_raw"),
        F.col("RAINFALL").alias("rainfall_raw"),
        F.col("TMAX").alias("tmax_raw"),
        F.col("TMIN").alias("tmin_raw"),
        (F.col("TMEAN") if has_reported_mean else F.lit(None).cast("string")).alias("tmean_raw"),
        F.col("RH").alias("rh_raw"),
        F.col("WIND_SPEED").alias("wind_speed_raw"),
        F.col("WIND_DIRECTION").alias("wind_direction_raw"),
        F.col("_metadata.file_name").alias("source_file"),
    )


pagasa_old = canonical_pagasa(read_csv_exact(old_files, PAGASA_OLD_HEADER), True)
pagasa_new = canonical_pagasa(read_csv_exact(new_files, PAGASA_NEW_HEADER), False)
pagasa_bronze = (
    pagasa_old.unionByName(pagasa_new)
    .withColumn("station_name", F.regexp_replace("source_file", r" Daily Data\.csv$", ""))
    .withColumn("source_dataset_version", F.lit("PAGASA_2017_2024"))
    .withColumn("external_dataset_id", F.lit(dataset_id))
    .withColumn("policy_version", F.lit(POLICY_VERSION))
    .withColumn("ingested_at", F.current_timestamp())
)
assert pagasa_bronze.count() == 161_744
pagasa_bronze.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_bronze.external_restart_pagasa_raw_candidate"
)

# COMMAND ----------
# Cell 5 — Parse station coordinates from the official PAGASA readme files.
station_pattern = re.compile(
    r"^(?P<station_name>.+?) Latitude: (?P<latitude>-?[0-9.]+) N "
    r"Longitude: (?P<longitude>-?[0-9.]+) E Elevation: (?P<elevation_m>.+?) m$"
)
station_values = {}
for readme in pagasa_readmes:
    for line in readme.read_text(encoding="utf-8-sig").splitlines():
        match = station_pattern.match(line.strip())
        if not match:
            continue
        row = match.groupdict()
        station = row["station_name"]
        coordinates = (float(row["latitude"]), float(row["longitude"]), float(row["elevation_m"]))
        if station in station_values and station_values[station] != coordinates:
            raise ValueError(f"Conflicting PAGASA metadata for {station}")
        station_values[station] = coordinates

station_metadata = spark.createDataFrame(
    [(station, *values, dataset_id, POLICY_VERSION) for station, values in sorted(station_values.items())],
    "station_name string, latitude double, longitude double, elevation_m double, "
    "external_dataset_id string, policy_version string",
)
assert station_metadata.count() == 64
station_metadata.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{CATALOG}.medshield_bronze.external_restart_pagasa_station_metadata_candidate"
)

audit = spark.createDataFrame(
    [
        (f"{CATALOG}.medshield_bronze.external_restart_doh_raw_candidate", doh_bronze.count()),
        (f"{CATALOG}.medshield_bronze.external_restart_pagasa_raw_candidate", pagasa_bronze.count()),
        (f"{CATALOG}.medshield_bronze.external_restart_pagasa_station_metadata_candidate", station_metadata.count()),
    ],
    "table_name string, saved_rows long",
).withColumn("external_dataset_id", F.lit(dataset_id)).withColumn("status", F.lit("PASS_BRONZE_CANDIDATE"))
display(audit.orderBy("table_name"))
print("EXTERNAL BRONZE: PASS_CANDIDATE")
