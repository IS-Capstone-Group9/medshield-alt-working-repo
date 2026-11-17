# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# Cell 1 — Configure the sales restart and define deterministic source helpers.
# Run this notebook top-to-bottom on Databricks Python Serverless.
import csv
import hashlib
import io
import json
import re
from pathlib import Path

SOURCE_DIRECTORY = Path("/Workspace/medshield/medshield_project_csv")
REQUIRED_YEARS = set(range(2017, 2026))
REPLACEMENT_2025_WORKBOOK = "medshield_data_2025.csv"
REPLACEMENT_2025_SHA256 = "d05fec98a3a312416118fab4d11ca1f6e0c19f1951248b7b22fcc518eeb15569"
REPLACEMENT_2025_RAW_LINE_COUNT = 4_551
REPLACEMENT_2025_STATUS = "ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE"
REPLACEMENT_2025_POLICY = "contract_parent_replaced_with_existing_product_allocation_v1"
MAX_SOURCE_BYTES = 100 * 1024 * 1024
MAX_DRIVER_ROWS = 250_000
CATALOG = "workspace"
MANIFEST_TABLE = f"{CATALOG}.medshield_bronze.sales_restart_manifest_candidate"
ROWS_TABLE = f"{CATALOG}.medshield_bronze.sales_restart_rows_candidate"
ARCHIVE_ROOT = Path(f"/Volumes/{CATALOG}/medshield_bronze/raw_files/sales_restart")


# Reviewed source identities; unknown replacements must be reviewed before ingestion.
REVIEWED_HISTORICAL_SOURCES = {'medshield_data_2020.csv': {'original': '98c83e6a440298e145b8bbfc2463791f393f0946f26a11c6b0472752d30ce733', 'adjusted': 'd5d17c2c6514a652294a23426e8ff9c35b5410d9a65a8273cd0dd6e573254a62', 'policy': 'one_to_one_same_year_same_area_nearest_financial_profile'}, 'medshield_data_2024.csv': {'original': 'c38245983b918c0e44eecfccb3b63be00e8de9c848048dd007d1c086c714831f', 'adjusted': '12ebda6996de76cf6af6c958485900fb81597f6f7f19dec4c8eea066919fb938', 'policy': 'one_to_one_same_year_same_area_nearest_financial_profile'}}


def source_provenance(filename, digest):
    reviewed = REVIEWED_HISTORICAL_SOURCES.get(filename)
    if reviewed:
        if digest == reviewed["adjusted"]:
            return "ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE", reviewed["policy"]
        if digest != reviewed["original"]:
            raise ValueError(f"{filename}: unreviewed source hash; provenance review required")
    if filename == "medshield_data_2025.csv":
        if digest != "d05fec98a3a312416118fab4d11ca1f6e0c19f1951248b7b22fcc518eeb15569":
            raise ValueError("2025: unreviewed replacement source hash")
        return "ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE", "contract_parent_replaced_with_existing_product_allocation_v1"
    return "ORIGINAL_SOURCE_EXPORT", None


def stable_digest(value):
    """Hash JSON with unambiguous field boundaries and stable ordering."""
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def decode_csv_source(payload, filename, max_lines=250_000):
    """Preserve physical lines; reject formats this parser cannot safely handle."""
    try:
        text = payload.decode("utf-8-sig", errors="strict")
    except UnicodeDecodeError as error:
        raise ValueError(f"{filename}: expected a valid UTF-8 CSV export.") from error
    if not text or "\x00" in text:
        raise ValueError(f"{filename}: empty file or unexpected NUL byte.")
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    if normalized.count("\n") + 1 > max_lines:
        raise ValueError(f"{filename}: source exceeds the raw-line driver limit.")
    reader = csv.reader(io.StringIO(normalized, newline=""), strict=True)
    previous_end = 0
    try:
        for _ in reader:
            if reader.line_num - previous_end != 1:
                raise ValueError(
                    f"{filename}: multiline CSV record ending at line {reader.line_num}; "
                    "the sales restart v1 parser requires one record per physical line."
                )
            previous_end = reader.line_num
    except csv.Error as error:
        raise ValueError(f"{filename}: invalid CSV near line {reader.line_num}.") from error
    # Keep the trailing empty split element when the source ends in a newline.
    # These are raw lines including headings and blanks, not transaction counts.
    return normalized.split("\n")


def build_dataset_id(manifest):
    """A source-content identity, independent of machine path and run time."""
    identity = sorted(
        (item["source_workbook"], item["source_file_sha256"])
        for item in manifest
    )
    return stable_digest(identity)


def source_record_key(filename, file_sha256, row_number):
    return stable_digest([filename, file_sha256, row_number])

# COMMAND ----------

# Cell 2 — Validate the entire source inventory before creating or publishing data.
if not SOURCE_DIRECTORY.is_dir():
    raise FileNotFoundError(f"Sales source directory was not found: {SOURCE_DIRECTORY}")

source_paths = sorted(SOURCE_DIRECTORY.glob("medshield_data_*.csv"))
if not source_paths:
    raise FileNotFoundError(f"No medshield_data_YYYY.csv files found in {SOURCE_DIRECTORY}")

source_years = {}
for source_file in source_paths:
    match = re.fullmatch(r"medshield_data_(20\d{2})\.csv", source_file.name)
    if match is None or not source_file.is_file():
        raise ValueError(f"Unexpected source filename or object: {source_file.name}")
    source_years[source_file.name] = int(match.group(1))

missing_years = sorted(REQUIRED_YEARS - set(source_years.values()))
if missing_years:
    raise ValueError(f"Required baseline source years are missing: {missing_years}")

declared_bytes = sum(source_file.stat().st_size for source_file in source_paths)
if declared_bytes > MAX_SOURCE_BYTES:
    raise ValueError("Source files exceed the 100 MiB driver ingestion limit; review the load plan.")

source_payloads = {}
source_lines = {}
manifest_records = []
total_bytes = 0
total_raw_lines = 0
for source_file in source_paths:
    # A bounded read also protects against a file growing after the stat check.
    with source_file.open("rb") as source_handle:
        payload = source_handle.read(MAX_SOURCE_BYTES - total_bytes + 1)
    total_bytes += len(payload)
    if total_bytes > MAX_SOURCE_BYTES:
        raise ValueError("Source content exceeds the configured driver byte limit.")
    lines = decode_csv_source(payload, source_file.name)
    total_raw_lines += len(lines)
    if total_raw_lines > MAX_DRIVER_ROWS:
        raise ValueError("Source content exceeds the 250,000 raw-line driver limit.")
    source_payloads[source_file.name] = payload
    source_lines[source_file.name] = lines
    manifest_records.append({
        "source_workbook": source_file.name,
        "data_source_year": source_years[source_file.name],
        "source_file_sha256": hashlib.sha256(payload).hexdigest(),
        "source_file_bytes": len(payload),
        "raw_line_count": len(lines),
        "source_data_status": source_provenance(source_file.name, hashlib.sha256(payload).hexdigest())[0],
        "source_adjustment_policy": source_provenance(source_file.name, hashlib.sha256(payload).hexdigest())[1],
    })

replacement_2025 = next(
    (item for item in manifest_records if item["source_workbook"] == REPLACEMENT_2025_WORKBOOK),
    None,
)
if replacement_2025 is None:
    raise ValueError(f"Required replacement source is missing: {REPLACEMENT_2025_WORKBOOK}")
if replacement_2025["source_file_sha256"] != REPLACEMENT_2025_SHA256:
    raise ValueError(
        f"{REPLACEMENT_2025_WORKBOOK} is not the reviewed product-allocation CSV. "
        f"Expected sha256 {REPLACEMENT_2025_SHA256}, received "
        f"{replacement_2025['source_file_sha256']}."
    )
if replacement_2025["raw_line_count"] != REPLACEMENT_2025_RAW_LINE_COUNT:
    raise ValueError(
        f"{REPLACEMENT_2025_WORKBOOK} raw-line count changed: "
        f"expected {REPLACEMENT_2025_RAW_LINE_COUNT:,}, received "
        f"{replacement_2025['raw_line_count']:,}."
    )

dataset_id = build_dataset_id(manifest_records)
print(f"Dataset: {dataset_id}")
print(f"Verified source files: {len(manifest_records)}")
print(f"Source years: {sorted(source_years.values())}")
print(f"Raw lines including headings and blanks: {total_raw_lines:,}")
print("Additional source-year layouts must also pass the Silver header checks.")

# COMMAND ----------

# Cell 3 — Create the restart storage and preserve byte-identical source archives.
for schema_name in ("medshield_bronze", "medshield_silver", "medshield_gold", "medshield_audit"):
    spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{schema_name}")
spark.sql(f"CREATE VOLUME IF NOT EXISTS {CATALOG}.medshield_bronze.raw_files")
archive_directory = ARCHIVE_ROOT / dataset_id
archive_directory.mkdir(parents=True, exist_ok=True)

for item in manifest_records:
    archive_path = archive_directory / item["source_workbook"]
    payload = source_payloads[item["source_workbook"]]
    if not archive_path.exists():
        # Exclusive creation prevents replacement if another run created the file.
        try:
            with archive_path.open("xb") as archive_handle:
                archive_handle.write(payload)
        except FileExistsError:
            pass
    if archive_path.stat().st_size != item["source_file_bytes"]:
        raise RuntimeError(f"Archive size mismatch; inspect the archived file: {archive_path}")
    archived_sha = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    if archived_sha != item["source_file_sha256"]:
        raise RuntimeError(f"Archive checksum mismatch; inspect the archived file: {archive_path}")
    item["dataset_id"] = dataset_id
    item["source_path"] = str(archive_path)

print(f"Immutable source archive verified: {archive_directory}")

# COMMAND ----------

# Cell 4 — Build one deterministic Bronze record for every raw physical line.
from pyspark.sql import functions as F
from pyspark.sql import types as T

manifest_schema = T.StructType([
    T.StructField("dataset_id", T.StringType(), False),
    T.StructField("source_workbook", T.StringType(), False),
    T.StructField("data_source_year", T.IntegerType(), False),
    T.StructField("source_file_sha256", T.StringType(), False),
    T.StructField("source_file_bytes", T.LongType(), False),
    T.StructField("raw_line_count", T.LongType(), False),
    T.StructField("source_data_status", T.StringType(), False),
    T.StructField("source_adjustment_policy", T.StringType(), True),
    T.StructField("source_path", T.StringType(), False),
])
rows_schema = T.StructType([
    T.StructField("dataset_id", T.StringType(), False),
    T.StructField("source_record_id", T.StringType(), False),
    T.StructField("source_workbook", T.StringType(), False),
    T.StructField("data_source_year", T.IntegerType(), False),
    T.StructField("source_row_number", T.LongType(), False),
    T.StructField("source_file_sha256", T.StringType(), False),
    T.StructField("raw_csv_line", T.StringType(), False),
    T.StructField("source_path", T.StringType(), False),
])

raw_records = []
for item in manifest_records:
    for row_number, raw_line in enumerate(source_lines[item["source_workbook"]], start=1):
        raw_records.append({
            "dataset_id": dataset_id,
            "source_record_id": source_record_key(
                item["source_workbook"], item["source_file_sha256"], row_number
            ),
            "source_workbook": item["source_workbook"],
            "data_source_year": item["data_source_year"],
            "source_row_number": row_number,
            "source_file_sha256": item["source_file_sha256"],
            "raw_csv_line": raw_line,
            "source_path": item["source_path"],
        })

assert len(raw_records) == total_raw_lines
assert len({row["source_record_id"] for row in raw_records}) == total_raw_lines
bronze_manifest = spark.createDataFrame(manifest_records, manifest_schema)
bronze_rows = spark.createDataFrame(raw_records, rows_schema)

# COMMAND ----------

# Cell 5 — Publish and verify the two CURRENT SNAPSHOT candidate tables.
# Rerunning replaces these two restart candidates. Source archives are immutable.
# Run only one restart pipeline at a time; Delta writes are atomic per table,
# so downstream notebooks must validate that both tables share one dataset_id.
for table_name, output_df in (
    (ROWS_TABLE, bronze_rows),
    (MANIFEST_TABLE, bronze_manifest),
):
    (
        output_df.write.format("delta").mode("overwrite")
        .option("overwriteSchema", "true").saveAsTable(table_name)
    )
    saved_df = spark.table(table_name).select(*output_df.columns)
    if output_df.exceptAll(saved_df).limit(1).count() or saved_df.exceptAll(output_df).limit(1).count():
        raise RuntimeError(f"Persisted Bronze values differ from the verified source: {table_name}")

display(spark.table(MANIFEST_TABLE).orderBy("data_source_year"))
print("SALES RESTART BRONZE")
print(f"Dataset ID: {dataset_id}")
print(f"Source files: {len(manifest_records)}")
print(f"Raw lines: {total_raw_lines:,}")
print(f"Manifest table: {MANIFEST_TABLE}")
print(f"Raw-line table: {ROWS_TABLE}")
print(
    f"2025 replacement: VERIFIED | {REPLACEMENT_2025_STATUS} | "
    f"sha256={REPLACEMENT_2025_SHA256}"
)
print("Validation: exact persisted values and multiplicities match the source")
print("Status: PASS_CANDIDATE")