# MedShield descriptive candidate deployment

Canonical notebook package: `databricks/medshield_project`. This replaces the old
`sales_restart` paths without undoing their staged deletion. Nothing here grants
business approval or makes an offline file a dashboard data source.

## Catalog-only deployment sequence

Follow [the exact catalog deployment and rollback runbook](../../docs/CATALOG_DEPLOYMENT.md).
This package prepares Gold v7 and does not activate a release or grant approvals.
The current source is version 16; `CATALOG_BASE_FACT_VERSION=16` protects unchanged
source records and finances before any catalog write. Keep Bronze/Silver unchanged.

1. Capture prior notebook/application revisions, all candidate Delta versions, bridge
   definitions, and mapping hashes. Keep the serving gateway pinned to 16.
2. Upload `product_catalog.py` as a workspace file beside Gold. Upload both header-only
   preparation masters to the configured reference directory and verify their hashes.
3. Run **03 Gold → 04 monthly bridge → 05 system bridge → 06 STL**. Gold must report
   `sales_restart_gold_v7_independent_catalog` and `catalog_v1_independent_evidence`.
4. Against the newly observed candidate fact version, run publication-readiness,
   descriptive validation and catalog validation. Save matching receipts/output versions.
5. Only a later explicit CEO decision bound to that exact release permits controlled
   application activation. Neither local tests nor successful notebooks record approval.

Run Bronze/Silver only if their inputs or logic change under a separately reviewed
rebuild; this catalog-only package intentionally asserts the original source identity.

## Permissions and current blocker

The inspected credential can read SQL but Workspace and Jobs reads returned 403
for missing `workspace` and `jobs` scopes. An authorized operator must deploy and
run the job. Token scope and resource ACLs are separate: notebook edit, job manage
(configuration) / manage-run (execution), compatible compute, and Run as catalog,
schema, volume and table privileges must all be configured for the intended objects.
Keep credentials server-side. Do not grant application users Databricks credentials.

## Rollback

Keep prior code, source archives, mapping files and Delta history. Change the
explicit fact-version setting back to a retained previously reviewed version and
restart the gateway; verify all consumers identify that version. STL must match it
or remain unavailable. Restore candidate tables/bridges only through the operator's
recorded runbook; never erase source archives or manufacture approval.

## Local verification

`python -m unittest discover -s databricks/medshield_project/tests`

`python databricks/medshield_project/render_readme.py --check`

The recovered notebook tests exercise the original parser and mapping contracts;
new provenance tests cover original, adjusted and unreviewed hashes. Notebook
syntax/local tests do not prove cloud execution. The generated README contains
exact Bronze/Silver/Gold cells; STL is its separate notebook.

## Remaining boundaries

This is a historical restart, not the new client-upload engine. The batch workflow,
transaction identity, review controls and version-bound approved activation must
be completed before turnover. Product master entries remain pending unless backed
by reviewed identity evidence. Buyer grouping and positive-sales ABC are candidate
policies; financial definitions already approved need no duplicate approval.

## Copyable notebook code

[Bronze](#bronze-code) → [Silver](#silver-code) → [Gold](#gold-code)

<a id="bronze-code"></a>

## Bronze: `01_sales_bronze.py`

Create **5 Python cells** in this notebook. Run them in order.

### Bronze — cell 1

```python
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
```

### Bronze — cell 2

```python
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
```

### Bronze — cell 3

```python
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
```

### Bronze — cell 4

```python
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
```

### Bronze — cell 5

```python
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
```

<a id="silver-code"></a>

## Silver: `02_sales_silver.py`

Create **6 Python cells** in this notebook. Run them in order.

### Silver — cell 1

```python
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# Cell 1 — Configuration: run after 01_sales_bronze has passed.
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, localcontext

from pyspark.sql import functions as F
from pyspark.sql import types as T

BRONZE_TABLE = "workspace.medshield_bronze.sales_restart_rows_candidate"
MANIFEST_TABLE = "workspace.medshield_bronze.sales_restart_manifest_candidate"
ASSESSED_TABLE = "workspace.medshield_silver.sales_restart_assessed_candidate"
CLEAN_TABLE = "workspace.medshield_silver.sales_restart_clean_candidate"
AUDIT_TABLE = "workspace.medshield_audit.sales_restart_disposition_candidate"
REPLACEMENT_2025_AUDIT_TABLE = "workspace.medshield_audit.sales_restart_replacement_year_validation_candidate"
MAX_DRIVER_ROWS = 250_000
MAX_DRIVER_BYTES = 100 * 1024 * 1024
SILVER_VERSION = "sales_restart_silver_v4_2025_allocation_validation"
REPLACEMENT_2025_WORKBOOK = "medshield_data_2025.csv"
REPLACEMENT_2025_SHA256 = "d05fec98a3a312416118fab4d11ca1f6e0c19f1951248b7b22fcc518eeb15569"
REPLACEMENT_2025_TRANSACTION_ROWS = 4_544
REPLACEMENT_2025_NET_SALES = Decimal("185396821.040000")
REPLACEMENT_2025_GROSS_SALES = Decimal("185777264.240000")
REPLACEMENT_2025_TOTAL_ACQUISITION_COST = Decimal("94760630.250000")
REPLACEMENT_2025_GROSS_MARGIN = Decimal("90636190.790000")
CONTRACT_PREFIX_PATTERN = re.compile(
    r"^(PAGBILAO|QMC|PPDC|TOURISM|PROVINCIAL\s+TOURISM\s+OFFICE|"
    r"MARINDUQUE|GULANG\s+GULANG|PESO|PESO\s+PROVINCIAL|PHO|"
    r"ABOITIZ|PADRE\s+BURGOS|PPOC)\s*#",
    re.IGNORECASE,
)
```

### Silver — cell 2

```python
# Cell 2 — Pure parsing functions. These also run in the local regression tests.
MEASURE_FIELDS = (
    "quantity", "unit_selling_price", "gross_sales", "discount_amount",
    "net_sales", "unit_acquisition_cost", "total_acquisition_cost",
    "gross_margin_amount", "margin_pct", "discount_rate",
)
RAW_MEASURE_FIELDS = MEASURE_FIELDS + ("quantity_secondary",)
DECIMAL_QUANTUM = Decimal("0.000001")
FORMULA_TOLERANCE = Decimal("0.02")
INVALID_TOKENS = {
    "#REF!", "#N/A", "#VALUE!", "#NAME?", "#NULL!", "#DIV/0!",
    "NAN", "NULL", "NONE", "N/A",
}
NUMBER_PATTERN = re.compile(
    r"^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$"
)
HEADER_LAYOUTS = {
    "legacy_2017": (
        "dr", "date", "area", "product", "grosssales", "unitprice", "gross",
        "discount", "", "qty", "tp", "total", "netincome",
    ),
    "legacy_2018": (
        "drnumber", "drdate", "salesrep", "product", "qty", "cpunit", "totalcp",
        "discount", "netcp", "tpunit", "totaltp", "netincome",
    ),
    "legacy_2019": (
        "drnumber", "drdate", "area", "product", "qty", "contractprice", "totalcp",
        "discount", "totalcp", "transferprice", "totaltp", "netincome",
    ),
    "modern_12": (
        "area", "drnumber", "datedelivered", "product", "qty", "cp", "totalcp",
        "disc", "netcp", "tpunit", "totaltp", "netincome",
    ),
    "modern_13": (
        "area", "drnumber", "datedelivered", "product", "qty", "cp", "totalcp",
        "disc", "netcp", "tpunit", "totaltp", "netincome", "%",
    ),
}


def normalized_text(value):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return None if not text or text.upper() in INVALID_TOKENS else text.upper()


def normalized_dr(value):
    text = normalized_text(value)
    if text is None:
        return None
    text = re.sub("[‐‑‒–—−]", "-", text)
    text = re.sub(r"^(DR\s*NUMBER|DR\s*NO\.?|D\.R\.|DR)\s*[:#-]?\s*", "DR-", text)
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return "DR-" + text if text.isdigit() else text


def is_contract_parent_label(value):
    """Recognize reviewed contract-parent prefixes without rejecting SKU size markers."""
    return bool(CONTRACT_PREFIX_PATTERN.search(str(value or "").strip()))


def parse_decimal(raw, percent_points=False, discount_dash_zero=False):
    """Return (value, status); never remove arbitrary text to invent a number."""
    text = str(raw or "").strip()
    if not text or text.upper() in INVALID_TOKENS:
        return None, "MISSING" if not text else "INVALID"
    if text in {"-", "—", "–"}:
        return (Decimal("0.000000"), "DASH_ZERO") if discount_dash_zero else (None, "MISSING")
    if text.endswith("%"):
        if not percent_points:
            return None, "INVALID"
        text = text[:-1].strip()
    text = re.sub(r"^(?:PHP|₱)\s*", "", text, flags=re.IGNORECASE)
    parenthesized = text.startswith("(") and text.endswith(")")
    if parenthesized:
        text = text[1:-1].strip()
        if text.startswith(("+", "-")):
            return None, "INVALID"
    if len(text) > 80 or not NUMBER_PATTERN.fullmatch(text):
        return None, "INVALID"
    try:
        with localcontext() as decimal_context:
            decimal_context.prec = 40
            value = Decimal(text.replace(",", ""))
            if parenthesized:
                value = -value
            if percent_points:
                value /= 100
            if not value.is_finite() or abs(value) >= Decimal("100000000000000"):
                return None, "INVALID"
            return value.quantize(DECIMAL_QUANTUM, rounding=ROUND_HALF_UP), "PARSED"
    except (InvalidOperation, OverflowError):
        return None, "INVALID"


def parse_delivery_date(raw, layout):
    text = str(raw or "").strip()
    if not text or text.upper() in INVALID_TOKENS:
        return None
    # Excel's 1900-system serial can be exported with thousands separators and
    # zero decimal places (confirmed in Sales Report.xlsx, 2025!C2411).
    # Reject fractional days and arbitrary numeric text rather than truncating it.
    if re.fullmatch(r"(?:\d{5}|\d{2},\d{3})(?:\.0+)?", text):
        return date(1899, 12, 30) + timedelta(days=int(Decimal(text.replace(",", ""))))
    # The source layout fixes slash interpretation; no ambiguous fallback swap.
    formats = ["%Y-%m-%d", "%d-%b-%y", "%d-%b-%Y", "%d/%b/%Y"]
    formats += ["%m/%d/%y", "%m/%d/%Y"] if layout == "legacy_2017" else ["%d/%m/%Y", "%d/%m/%y", "%d-%m-%Y"]
    for date_format in formats:
        try:
            return datetime.strptime(text, date_format).date()
        except ValueError:
            continue
    return None


def parse_csv_record(raw_line):
    try:
        rows = list(csv.reader([raw_line], strict=True))
        return rows[0] if rows else [], None
    except csv.Error as error:
        return [], str(error)


def header_layout(fields):
    tokens = [re.sub(r"[^a-z0-9%]", "", item.lower()) for item in fields]
    while tokens and tokens[-1] == "":
        tokens.pop()
    for layout, expected in HEADER_LAYOUTS.items():
        if tuple(tokens) == expected:
            return layout
    return None


def layout_positions(layout):
    if layout == "legacy_2017":
        return dict(area=2, dr_number=0, date_delivered=1, product=3,
                    quantity=4, quantity_secondary=9, unit_selling_price=5,
                    gross_sales=6, discount_rate=7, discount_amount=8,
                    unit_acquisition_cost=10, total_acquisition_cost=11,
                    gross_margin_amount=12)
    positions = dict(area=2, dr_number=0, date_delivered=1, product=3,
                     quantity=4, unit_selling_price=5, gross_sales=6,
                     discount_amount=7, net_sales=8, unit_acquisition_cost=9,
                     total_acquisition_cost=10, gross_margin_amount=11)
    if layout.startswith("modern"):
        positions.update(area=0, dr_number=1, date_delivered=2)
    if layout == "modern_13":
        positions["margin_pct"] = 12
    return positions


def record_fingerprint(row):
    fields = ("date_delivered", "area", "dr_number", "product") + MEASURE_FIELDS
    serialized = json.dumps([None if row.get(key) is None else str(row[key]) for key in fields], ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def blank_assessment(source):
    row = dict(source)
    row.update({key + "_raw": None for key in RAW_MEASURE_FIELDS})
    row.update({key: None for key in MEASURE_FIELDS})
    row.update({key: None for key in (
        "area_raw", "product_raw", "dr_number_raw", "date_delivered_raw",
        "area", "product", "dr_number", "date_delivered", "calendar_year",
        "quantity_primary_candidate", "quantity_secondary_candidate",
        "business_fingerprint", "snapshot_reference_source_record_id",
    )})
    row.update(raw_fields=[], source_layout=None, quality_rule_codes=[],
               net_value_source="UNAVAILABLE", record_kind="PREAMBLE",
               disposition="EXCLUDE_PREAMBLE", is_analysis_candidate=False,
               silver_version=SILVER_VERSION,
               is_area_placeholder=False, is_date_missing=False,
               is_provisional_year_candidate=False, reporting_year=None,
               reporting_year_basis="NOT_APPLICABLE")
    return row


def assess_transaction(row, fields, layout):
    positions = layout_positions(layout)
    for name, position in positions.items():
        row[name + "_raw"] = fields[position] if position < len(fields) else None
    row["area"] = normalized_text(row["area_raw"])
    row["product"] = normalized_text(row["product_raw"])
    row["dr_number"] = normalized_dr(row["dr_number_raw"])
    row["date_delivered"] = parse_delivery_date(row["date_delivered_raw"], layout)
    row["calendar_year"] = row["date_delivered"].year if row["date_delivered"] else None
    rules = row["quality_rule_codes"]
    if row["date_delivered"] and re.fullmatch(r"(?:\d{5}|\d{2},\d{3})(?:\.0+)?", str(row["date_delivered_raw"] or "").strip()):
        rules.append("EXCEL_SERIAL_DELIVERY_DATE_PARSED")
    row["is_area_placeholder"] = row["area"] is None
    if row["is_area_placeholder"]:
        row["area"] = "UNKNOWN_AREA"
        rules.append("MISSING_AREA_PLACEHOLDER")
    row["is_date_missing"] = normalized_text(row["date_delivered_raw"]) is None
    row["reporting_year"] = row["calendar_year"]
    row["reporting_year_basis"] = "OBSERVED_DELIVERY_DATE" if row["date_delivered"] else "UNRESOLVED_INVALID_DATE"
    if row["is_date_missing"]:
        row["reporting_year"] = row["data_source_year"]
        row["reporting_year_basis"] = "PROVISIONAL_SOURCE_FILE_YEAR"
        rules.append("MISSING_DATE_SOURCE_YEAR_PLACEHOLDER")
    for name in MEASURE_FIELDS:
        value, status = parse_decimal(
            row[name + "_raw"], percent_points=name in {"margin_pct", "discount_rate"},
            discount_dash_zero=name == "discount_amount",
        )
        row[name] = value
        if status == "INVALID":
            rules.append("INVALID_NUMERIC_" + name.upper())
        if status == "DASH_ZERO":
            rules.append("DISCOUNT_DASH_INTERPRETED_AS_ZERO")
    row["quantity_primary_candidate"] = row["quantity"]
    secondary, secondary_status = parse_decimal(row["quantity_secondary_raw"])
    row["quantity_secondary_candidate"] = secondary
    if layout == "legacy_2017":
        rules.append("2017_LOW_TRUST_SOURCE")
        if secondary_status == "INVALID":
            rules.append("INVALID_NUMERIC_QUANTITY_SECONDARY")
        if secondary is not None:
            if row["quantity"] is not None and row["quantity"] != secondary:
                rules.append("2017_QUANTITY_CANDIDATES_DISAGREE")
            row["quantity"] = secondary
        if row["gross_sales"] is not None and row["discount_amount"] is not None:
            row["net_sales"] = row["gross_sales"] - row["discount_amount"]
            row["net_value_source"] = "DERIVED_2017_GROSS_LESS_EXPLICIT_DISCOUNT"
            rules.append("NET_SALES_DERIVED_2017")
    elif row["net_sales"] is not None:
        row["net_value_source"] = "SOURCE_REPORTED"
    if row["margin_pct"] is None and row["gross_margin_amount"] is not None and row["net_sales"] not in (None, 0):
        try:
            value = row["gross_margin_amount"] / row["net_sales"]
            if abs(value) < Decimal("100000000000000"):
                row["margin_pct"] = value.quantize(DECIMAL_QUANTUM, rounding=ROUND_HALF_UP)
                rules.append("MARGIN_PCT_DERIVED")
        except InvalidOperation:
            rules.append("INVALID_DERIVED_MARGIN_PCT")
    for key, rule in (("quantity", "INVALID_OR_MISSING_QUANTITY"), ("net_sales", "MISSING_NET_SALES"),
                      ("gross_sales", "MISSING_GROSS_SALES"), ("gross_margin_amount", "MISSING_GROSS_MARGIN")):
        if row[key] is None:
            rules.append(rule)
    if row["quantity"] is not None and row["quantity"] <= 0:
        rules.append("NEGATIVE_QUANTITY" if row["quantity"] < 0 else "ZERO_QUANTITY")
    if row["net_sales"] is not None and row["net_sales"] < 0:
        rules.append("NEGATIVE_NET_SALES")
    if row["dr_number"] is None:
        rules.append("MISSING_DR_NUMBER")
    formula_checks = (
        ("gross_sales", "quantity", "unit_selling_price", "multiply", "GROSS_VALUE_FORMULA_MISMATCH"),
        ("net_sales", "gross_sales", "discount_amount", "subtract", "NET_VALUE_FORMULA_MISMATCH"),
        ("total_acquisition_cost", "quantity", "unit_acquisition_cost", "multiply", "TRANSFER_VALUE_FORMULA_MISMATCH"),
        ("gross_margin_amount", "net_sales", "total_acquisition_cost", "subtract", "GROSS_MARGIN_FORMULA_MISMATCH"),
    )
    for actual, left, right, operation, rule in formula_checks:
        if all(row[key] is not None for key in (actual, left, right)):
            expected = row[left] * row[right] if operation == "multiply" else row[left] - row[right]
            if abs(row[actual] - expected) > FORMULA_TOLERANCE:
                rules.append(rule)
    blocking = []
    for key, rule in (("area", "MISSING_AREA"), ("product", "INVALID_OR_MISSING_PRODUCT"),
                      ("date_delivered", "INVALID_OR_MISSING_DELIVERY_DATE")):
        if row[key] is None:
            blocking.append(rule)
    rules.extend(blocking)
    row["record_kind"] = "TRANSACTION_CANDIDATE"
    if row["product"] is None and row["date_delivered"] is None:
        row["record_kind"] = "CONTINUATION_OR_MISSING_IDENTITY"
    if blocking:
        row["disposition"] = "REVIEW_INVALID_TRANSACTION_IDENTITY"
    elif row["calendar_year"] > row["data_source_year"]:
        rules.append("SOURCE_YEAR_MISMATCH")
        row["disposition"] = "REVIEW_FUTURE_DATED_SOURCE"
    else:
        if row["calendar_year"] != row["data_source_year"]:
            rules.append("SOURCE_YEAR_MISMATCH")
        row["disposition"] = "PENDING_RECONCILIATION"
        row["business_fingerprint"] = record_fingerprint(row)
    # Year-only records stay separate: no invented January 1 date or automatic
    # acceptance of potential duplicates whose delivery date is unavailable.
    row["is_provisional_year_candidate"] = bool(
        row["is_date_missing"] and row["product"] is not None
        and any(row[key] is not None for key in ("quantity", "net_sales", "gross_sales"))
    )
    return row
```

### Silver — cell 3

```python
# Cell 3 — Pure source-file validation and snapshot/duplicate reconciliation.
def reconcile_sales(rows):
    """One disposition per source row; exact snapshots before within-file duplicates."""
    pending = [row for row in rows if row["disposition"] == "PENDING_RECONCILIATION"]
    strong_groups = defaultdict(list)
    relaxed_groups = defaultdict(list)
    for row in pending:
        strong_groups[row["business_fingerprint"]].append(row)
        relaxed_groups[(row["date_delivered"], row["area"], row["product"])].append(row)
    for group in strong_groups.values():
        # The dedicated source-year file takes priority; otherwise earliest snapshot.
        preferred_year = min(row["data_source_year"] for row in group)
        preferred = [row for row in group if row["data_source_year"] == preferred_year]
        preferred.sort(key=lambda row: (row["source_workbook"], row["source_row_number"], row["source_record_id"]))
        reference = preferred[0]
        matched_by_file = Counter()
        sufficient_evidence = all(reference[key] is not None for key in ("dr_number", "quantity", "net_sales"))
        for row in sorted(group, key=lambda row: (row["data_source_year"], row["source_workbook"], row["source_row_number"], row["source_record_id"])):
            if row["data_source_year"] > preferred_year:
                row["snapshot_reference_source_record_id"] = reference["source_record_id"]
                file_key = (row["data_source_year"], row["source_workbook"])
                matched_by_file[file_key] += 1
                if len(preferred) == 1 and sufficient_evidence and matched_by_file[file_key] == 1:
                    row["disposition"] = "EXCLUDE_HISTORICAL_SNAPSHOT_DUPLICATE"
                else:
                    row["disposition"] = "REVIEW_POSSIBLE_DUPLICATE"
                    row["quality_rule_codes"].append(
                        "INSUFFICIENT_SNAPSHOT_MATCH_EVIDENCE" if not sufficient_evidence
                        else "EXCESS_OR_AMBIGUOUS_SNAPSHOT_OCCURRENCES"
                    )
            elif len(preferred) > 1:
                row["disposition"] = "REVIEW_POSSIBLE_DUPLICATE"
                row["quality_rule_codes"].append("EXACT_BUSINESS_DUPLICATE_CANDIDATE")
            elif row["data_source_year"] == row["calendar_year"]:
                row["disposition"] = "KEEP_SOURCE_YEAR_ALIGNED"
            else:
                row["disposition"] = "KEEP_HISTORICAL_BACKFILL_CANDIDATE"
    for group in relaxed_groups.values():
        first_year = min(row["data_source_year"] for row in group)
        references = [row for row in group if row["data_source_year"] == first_year]
        reference = min(references, key=lambda row: (row["source_workbook"], row["source_row_number"]))
        for row in group:
            if row["disposition"] == "KEEP_HISTORICAL_BACKFILL_CANDIDATE" and row["data_source_year"] > first_year:
                row["disposition"] = "REVIEW_HISTORICAL_RESTATEMENT"
                row["snapshot_reference_source_record_id"] = reference["source_record_id"]
                row["quality_rule_codes"].append("CHANGED_HISTORICAL_DR_OR_MEASURES")
    for row in rows:
        if row["disposition"] == "KEEP_HISTORICAL_BACKFILL_CANDIDATE":
            row["quality_rule_codes"].append("HISTORICAL_BACKFILL_CANDIDATE")
        row["is_analysis_candidate"] = row["disposition"] in {"KEEP_SOURCE_YEAR_ALIGNED", "KEEP_HISTORICAL_BACKFILL_CANDIDATE"}
        row["quality_rule_codes"] = sorted(set(row["quality_rule_codes"]))
    return rows


def assess_sales_records(source_rows):
    """Transform verified Bronze dictionaries into the complete Silver ledger."""
    by_file = defaultdict(list)
    earliest_source_year = min(int(source["data_source_year"]) for source in source_rows)
    for source in source_rows:
        by_file[source["source_workbook"]].append(source)
    assessed = []
    for filename, sources in sorted(by_file.items()):
        sources.sort(key=lambda row: row["source_row_number"])
        parsed = [(source, *parse_csv_record(source["raw_csv_line"])) for source in sources]
        headers = [(source["source_row_number"], header_layout(fields), len(fields))
                   for source, fields, error in parsed if not error and header_layout(fields)]
        if not headers:
            raise ValueError(f"Unrecognized CSV header/layout in {filename}; inspect before changing the parser.")
        header_number, layout, header_width = headers[0]
        source_year = int(sources[0]["data_source_year"])
        expected_legacy = {2017: "legacy_2017", 2018: "legacy_2018", 2019: "legacy_2019"}
        if source_year in expected_legacy and layout != expected_legacy[source_year]:
            raise ValueError(f"Unexpected {source_year} layout {layout} in {filename}.")
        if source_year >= 2020 and not layout.startswith("modern"):
            raise ValueError(f"Unsupported modern layout {layout} in {filename}.")
        if any(item[1] != layout for item in headers):
            raise ValueError(f"Mixed layouts in {filename}; split or review the source file.")
        if layout == "legacy_2017":
            secondary = next((fields for source, fields, error in parsed if source["source_row_number"] == header_number + 1 and not error), [])
            if len(secondary) < 9 or secondary[7].strip() != "%" or secondary[8].strip().upper() != "AMOUNT":
                raise ValueError(f"2017 discount subheader is missing in {filename}.")
        for source, fields, error in parsed:
            row = blank_assessment(source)
            row["raw_fields"] = fields
            row["source_layout"] = layout
            if error:
                row.update(record_kind="CSV_PARSE_FAILURE", disposition="REVIEW_CSV_PARSE_FAILURE")
                row["quality_rule_codes"].append("MALFORMED_CSV_RECORD")
            elif not any(value.strip() for value in fields):
                row.update(record_kind="BLANK", disposition="EXCLUDE_BLANK")
            elif source["source_row_number"] < header_number:
                pass
            elif header_layout(fields) or (layout == "legacy_2017" and source["source_row_number"] == header_number + 1):
                row.update(record_kind="HEADER", disposition="EXCLUDE_HEADER")
            elif len(fields) > header_width and any(value.strip() for value in fields[header_width:]):
                row.update(record_kind="CSV_PARSE_FAILURE", disposition="REVIEW_CSV_COLUMN_MISMATCH")
                row["quality_rule_codes"].append("UNEXPECTED_NONEMPTY_CSV_COLUMNS")
            elif len(fields) < max(layout_positions(layout).values()) + 1:
                row.update(record_kind="CSV_PARSE_FAILURE", disposition="REVIEW_CSV_COLUMN_MISMATCH")
                row["quality_rule_codes"].append("MISSING_CSV_COLUMNS")
            else:
                # Totals and continuation lines are retained, never assigned a made-up product.
                summary_label = normalized_text(fields[3] if len(fields) > 3 else "") or ""
                is_summary = "SALES SUMM" in summary_label or "DISCREPANCY" in summary_label or summary_label in {"TOTAL", "GRAND TOTAL", "SUBTOTAL", "SUB-TOTAL"}
                if is_summary:
                    row.update(record_kind="SOURCE_SUMMARY", disposition="EXCLUDE_SOURCE_SUMMARY")
                else:
                    assess_transaction(row, fields, layout)
                    if row["calendar_year"] is not None and row["calendar_year"] < earliest_source_year:
                        row["disposition"] = "REVIEW_DELIVERY_DATE_BEFORE_SCOPE"
                        row["quality_rule_codes"].append("DELIVERY_DATE_BEFORE_SOURCE_SCOPE")
            assessed.append(row)
    reconcile_sales(assessed)
    assert len(assessed) == len(source_rows), "Silver lost a raw source row."
    assert Counter(row["source_record_id"] for row in assessed) == Counter(row["source_record_id"] for row in source_rows)
    assert all(row["disposition"] != "PENDING_RECONCILIATION" for row in assessed)
    return assessed


def identity_digest(rows):
    """Order-independent content check for persisted read-back, not just row counts."""
    records = [(row["dataset_id"], row["source_record_id"], row["source_file_sha256"],
                row["source_row_number"], row["raw_csv_line"]) for row in rows]
    serialized = json.dumps(sorted(records), ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
```

### Silver — cell 4

```python
# Cell 4 — Verify the single Bronze snapshot before bounded driver processing.
for table_name in (BRONZE_TABLE, MANIFEST_TABLE):
    assert spark.catalog.tableExists(table_name), f"Missing {table_name}; run Bronze first."
bronze_input = spark.table(BRONZE_TABLE)
manifest_input = spark.table(MANIFEST_TABLE)
bronze_count = bronze_input.count()
assert 0 < bronze_count <= MAX_DRIVER_ROWS, "Snapshot is empty or exceeds the documented driver bound."
manifest_rows = [row.asDict(recursive=True) for row in manifest_input.limit(1001).collect()]
assert manifest_rows and len(manifest_rows) <= 1000, "Invalid manifest size."
assert sum(row["source_file_bytes"] for row in manifest_rows) <= MAX_DRIVER_BYTES, "CSV snapshot exceeds driver memory bound."
assert sum(row["raw_line_count"] for row in manifest_rows) == bronze_count, "Bronze manifest row reconciliation failed."
bronze_bytes = bronze_input.agg(F.sum(F.length(F.encode("raw_csv_line", "UTF-8"))).alias("bytes")).first()["bytes"]
assert bronze_bytes is not None and bronze_bytes <= MAX_DRIVER_BYTES
source_rows = [row.asDict(recursive=True) for row in bronze_input.collect()]
dataset_ids = {row["dataset_id"] for row in source_rows}
assert len(dataset_ids) == 1 and dataset_ids == {row["dataset_id"] for row in manifest_rows}, "Mixed or stale Bronze snapshot."
assert len({row["source_record_id"] for row in source_rows}) == bronze_count, "Duplicate Bronze source identities."
manifest_keys = {(row["source_workbook"], row["source_file_sha256"], row["data_source_year"]) for row in manifest_rows}
assert len(manifest_keys) == len(manifest_rows), "Duplicate manifest files."
replacement_manifest = next(
    (row for row in manifest_rows if row["source_workbook"] == REPLACEMENT_2025_WORKBOOK),
    None,
)
assert replacement_manifest is not None, f"Missing {REPLACEMENT_2025_WORKBOOK}; rerun Bronze."
assert replacement_manifest["source_file_sha256"] == REPLACEMENT_2025_SHA256, (
    "The 2025 source is not the reviewed allocation replacement; rerun Bronze with the final CSV."
)
assert replacement_manifest.get("source_data_status") == "ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE"
assert replacement_manifest.get("source_adjustment_policy") == "contract_parent_replaced_with_existing_product_allocation_v1"
observed_files = Counter((row["source_workbook"], row["source_file_sha256"], row["data_source_year"]) for row in source_rows)
assert set(observed_files) == manifest_keys, "Bronze files differ from the manifest."
for manifest in manifest_rows:
    key = (manifest["source_workbook"], manifest["source_file_sha256"], manifest["data_source_year"])
    assert observed_files[key] == manifest["raw_line_count"], f"Incomplete file {key[0]}."
    file_rows = [row for row in source_rows if row["source_workbook"] == key[0]]
    assert sorted(row["source_row_number"] for row in file_rows) == list(range(1, manifest["raw_line_count"] + 1)), f"Invalid physical row sequence in {key[0]}."
for source in source_rows:
    identity_json = json.dumps([source["source_workbook"], source["source_file_sha256"], source["source_row_number"]], sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    assert source["source_record_id"] == hashlib.sha256(identity_json.encode("utf-8")).hexdigest(), "Invalid Bronze source identity."
manifest_identity = sorted((row["source_workbook"], row["source_file_sha256"]) for row in manifest_rows)
manifest_json = json.dumps(manifest_identity, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
assert dataset_ids == {hashlib.sha256(manifest_json.encode("utf-8")).hexdigest()}, "Dataset identity differs from source manifest."
assessed_rows = assess_sales_records(source_rows)
print(f"Assessed {len(assessed_rows):,} physical source rows across {len(manifest_rows)} files.")

# The reviewed 2025 replacement must be complete, contract-parent-free and
# financially identical to the approved output. A '#' inside an actual SKU name
# (for example a blade size) is allowed when it does not match a contract prefix.
replacement_2025_rows = [
    row for row in assessed_rows
    if row["source_workbook"] == REPLACEMENT_2025_WORKBOOK
    and row["record_kind"] == "TRANSACTION_CANDIDATE"
]
replacement_2025_contract_rows = [
    row for row in replacement_2025_rows if is_contract_parent_label(row["product"])
]
assert len(replacement_2025_rows) == REPLACEMENT_2025_TRANSACTION_ROWS, (
    f"2025 replacement transaction count changed: expected {REPLACEMENT_2025_TRANSACTION_ROWS:,}, "
    f"received {len(replacement_2025_rows):,}."
)
assert not replacement_2025_contract_rows, (
    "Known 2025 contract-parent labels remain; replace the file with the reviewed allocation CSV."
)
assert all(row["product"] and row["date_delivered"] for row in replacement_2025_rows), (
    "Every 2025 replacement transaction must have a product and delivery date."
)
replacement_2025_totals = {
    "gross_sales": sum((row["gross_sales"] or Decimal("0")) for row in replacement_2025_rows),
    "net_sales": sum((row["net_sales"] or Decimal("0")) for row in replacement_2025_rows),
    "total_acquisition_cost": sum((row["total_acquisition_cost"] or Decimal("0")) for row in replacement_2025_rows),
    "gross_margin_amount": sum((row["gross_margin_amount"] or Decimal("0")) for row in replacement_2025_rows),
}
assert replacement_2025_totals == {
    "gross_sales": REPLACEMENT_2025_GROSS_SALES,
    "net_sales": REPLACEMENT_2025_NET_SALES,
    "total_acquisition_cost": REPLACEMENT_2025_TOTAL_ACQUISITION_COST,
    "gross_margin_amount": REPLACEMENT_2025_GROSS_MARGIN,
}, f"2025 replacement financial reconciliation failed: {replacement_2025_totals}"
assert all(row["is_analysis_candidate"] for row in replacement_2025_rows), (
    "Every reviewed 2025 replacement transaction must survive Silver reconciliation."
)
```

### Silver — cell 5

```python
# Cell 5 — Explicit schemas and pre-publication reconciliation.
string_columns = [
    "dataset_id", "source_record_id", "source_workbook", "source_file_sha256",
    "source_path", "raw_csv_line", "source_layout", "area_raw", "product_raw",
    "dr_number_raw", "date_delivered_raw", "area", "product", "dr_number",
    "net_value_source", "record_kind", "disposition", "business_fingerprint",
    "snapshot_reference_source_record_id", "silver_version", "reporting_year_basis",
] + [key + "_raw" for key in RAW_MEASURE_FIELDS]
silver_schema = T.StructType(
    [T.StructField(name, T.StringType(), True) for name in string_columns]
    + [T.StructField(name, T.LongType(), True) for name in ("data_source_year", "source_row_number", "calendar_year", "reporting_year")]
    + [T.StructField("date_delivered", T.DateType(), True)]
    + [T.StructField(name, T.DecimalType(20, 6), True) for name in MEASURE_FIELDS + ("quantity_primary_candidate", "quantity_secondary_candidate")]
    + [T.StructField("raw_fields", T.ArrayType(T.StringType(), False), False),
       T.StructField("quality_rule_codes", T.ArrayType(T.StringType(), False), False),
       T.StructField("is_analysis_candidate", T.BooleanType(), False)]
    + [T.StructField(name, T.BooleanType(), False) for name in (
        "is_area_placeholder", "is_date_missing", "is_provisional_year_candidate")]
)
assessed_frame = spark.createDataFrame(assessed_rows, silver_schema)
clean_frame = assessed_frame.filter(F.col("is_analysis_candidate"))
clean_rows = [row for row in assessed_rows if row["is_analysis_candidate"]]
assert clean_rows, "No analytical candidates survived; inspect the assessed records before Gold."
assert len({row["business_fingerprint"] for row in clean_rows}) == len(clean_rows), "Unresolved exact business duplicates in clean output."
assert identity_digest(assessed_rows) == identity_digest(source_rows)
assert all(row["date_delivered"] and row["area"] and row["product"] for row in clean_rows)
assert len(clean_rows) + sum(not row["is_analysis_candidate"] for row in assessed_rows) == bronze_count
audit_frame = (
    assessed_frame.groupBy("dataset_id", "data_source_year", "record_kind", "disposition", "is_analysis_candidate")
    .agg(F.count("*").alias("source_row_count"),
         F.sum("quantity").alias("signed_quantity"),
         F.count("quantity").alias("rows_with_quantity"),
         F.sum("net_sales").alias("net_sales"),
         F.count("net_sales").alias("rows_with_net_sales"))
)
replacement_2025_audit = spark.createDataFrame([{
    "dataset_id": next(iter(dataset_ids)),
    "source_workbook": REPLACEMENT_2025_WORKBOOK,
    "source_file_sha256": REPLACEMENT_2025_SHA256,
    "source_data_status": replacement_manifest["source_data_status"],
    "source_adjustment_policy": replacement_manifest["source_adjustment_policy"],
    "transaction_rows": len(replacement_2025_rows),
    "contract_parent_rows": len(replacement_2025_contract_rows),
    "gross_sales": replacement_2025_totals["gross_sales"],
    "net_sales": replacement_2025_totals["net_sales"],
    "total_acquisition_cost": replacement_2025_totals["total_acquisition_cost"],
    "gross_margin_amount": replacement_2025_totals["gross_margin_amount"],
    "validation_status": "PASS_2025_ALLOCATION_SOURCE",
}])
```

### Silver — cell 6

```python
# Cell 6 — Publish dedicated candidates and validate persisted content.
spark.sql("CREATE SCHEMA IF NOT EXISTS workspace.medshield_silver")
spark.sql("CREATE SCHEMA IF NOT EXISTS workspace.medshield_audit")
for table_name, output in (
    (ASSESSED_TABLE, assessed_frame),
    (CLEAN_TABLE, clean_frame),
    (AUDIT_TABLE, audit_frame),
    (REPLACEMENT_2025_AUDIT_TABLE, replacement_2025_audit),
):
    output.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(table_name)
saved_assessed = spark.table(ASSESSED_TABLE)
saved_clean = spark.table(CLEAN_TABLE)
saved_audit = spark.table(AUDIT_TABLE)
saved_replacement_2025_audit = spark.table(REPLACEMENT_2025_AUDIT_TABLE)
assert saved_assessed.count() == bronze_count
assert saved_clean.count() == len(clean_rows)
for saved, expected in (
    (saved_assessed, assessed_frame),
    (saved_clean, clean_frame),
    (saved_audit, audit_frame),
    (saved_replacement_2025_audit, replacement_2025_audit),
):
    saved_ordered = saved.select(*expected.columns)
    assert saved_ordered.exceptAll(expected).limit(1).count() == 0, "Persisted content differs from the assessed output."
    assert expected.exceptAll(saved_ordered).limit(1).count() == 0, "Persisted output is missing assessed content."
identity_columns = ["dataset_id", "source_record_id", "source_file_sha256", "source_row_number", "raw_csv_line"]
assert identity_digest([row.asDict() for row in saved_assessed.select(*identity_columns).collect()]) == identity_digest(source_rows)
assert identity_digest([row.asDict() for row in saved_clean.select(*identity_columns).collect()]) == identity_digest(clean_rows)
assert saved_audit.agg(F.sum("source_row_count")).first()[0] == bronze_count
display(saved_audit.orderBy("data_source_year", "disposition"))
display(saved_replacement_2025_audit)
print("SALES SILVER RESTART")
print(f"Dataset: {next(iter(dataset_ids))}")
print(f"Source rows: {bronze_count:,}; analytical candidates: {len(clean_rows):,}")
print(f"Rows kept for audit/review only: {bronze_count - len(clean_rows):,}")
print("2025 replacement: PASS | 4,544 product rows | 0 contract parents | net sales PHP 185,396,821.04")
print("Historical backfills are provisional and remain labelled for Gold eligibility rules.")
print("Status: PASS_CANDIDATE_ONLY")
```

<a id="gold-code"></a>

## Gold: `03_sales_gold.py`

Create **7 Python cells** in this notebook. Run them in order.

### Gold — cell 1

```python
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# Cell 1 — Validate the current Bronze/Silver run before building sales Gold.
from datetime import date
from decimal import Decimal
import csv
import hashlib
import io
from pathlib import Path
import re

from pyspark.sql import functions as F
from pyspark.sql.types import BooleanType, StringType, StructField, StructType

CATALOG = "workspace"
BRONZE_SCHEMA = f"{CATALOG}.medshield_bronze"
SILVER_SCHEMA = f"{CATALOG}.medshield_silver"
GOLD_SCHEMA = f"{CATALOG}.medshield_gold"
AUDIT_SCHEMA = f"{CATALOG}.medshield_audit"
REFERENCE_PATH = (
    "/Workspace/medshield/medshield_reference_csv/"
    "likely_non_medical_product_candidates.csv"
)
AREA_MAPPING_PATH = "/Workspace/medshield/medshield_reference_csv/area_classification_mapping.csv"
TRANSACTION_EVIDENCE_PATH = "/Workspace/medshield/medshield_reference_csv/transaction_evidence_review.csv"
PRODUCT_MASTER_PATH = "/Workspace/medshield/medshield_reference_csv/product_master_review.csv"
REPLACEMENT_2025_AUDIT_TABLE = f"{AUDIT_SCHEMA}.sales_restart_replacement_year_validation_candidate"
# Change only after the thesis scope explicitly includes clinical consumables.
INCLUDE_MEDICAL_SUPPLIES = False
POLICY_VERSION = "sales_restart_gold_v7_independent_catalog"
PUBLICATION_STATUS = "CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW"
KEEP_DISPOSITIONS = (
    "KEEP_SOURCE_YEAR_ALIGNED", "KEEP_HISTORICAL_BACKFILL_CANDIDATE"
)

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


manifest = spark.table(f"{BRONZE_SCHEMA}.sales_restart_manifest_candidate")
for source in manifest.select("source_workbook", "source_file_sha256", "source_data_status", "source_adjustment_policy").collect():
    expected = source_provenance(source["source_workbook"], source["source_file_sha256"])
    if (source["source_data_status"], source["source_adjustment_policy"]) != expected:
        raise ValueError(f"Incorrect Bronze source provenance: {source['source_workbook']}; rerun corrected Bronze")

bronze_rows = spark.table(f"{BRONZE_SCHEMA}.sales_restart_rows_candidate")
assessed = spark.table(f"{SILVER_SCHEMA}.sales_restart_assessed_candidate")
clean = spark.table(f"{SILVER_SCHEMA}.sales_restart_clean_candidate")
assert spark.catalog.tableExists(REPLACEMENT_2025_AUDIT_TABLE), (
    f"Missing {REPLACEMENT_2025_AUDIT_TABLE}; run the updated Silver notebook first."
)
replacement_2025_audit = spark.table(REPLACEMENT_2025_AUDIT_TABLE)


def assert_unique(frame, keys, label):
    null_condition = F.lit(False)
    for key in keys:
        null_condition = null_condition | F.col(key).isNull()
    assert frame.filter(null_condition).limit(1).count() == 0, f"{label}: null keys"
    assert frame.groupBy(*keys).count().filter("count != 1").limit(1).count() == 0, (
        f"{label}: duplicate keys"
    )


def same_keys(left, right, keys, label):
    assert left.select(*keys).join(right.select(*keys), keys, "left_anti").limit(1).count() == 0, label
    assert right.select(*keys).join(left.select(*keys), keys, "left_anti").limit(1).count() == 0, label


def dataset_of(frame, label):
    values = frame.select("dataset_id").distinct().collect()
    assert len(values) == 1 and values[0]["dataset_id"], f"{label}: expected one nonnull dataset_id"
    return values[0]["dataset_id"]


required = {
    "dataset_id", "source_record_id", "source_workbook", "data_source_year",
    "source_row_number", "source_file_sha256", "source_path", "raw_csv_line",
    "area", "product", "dr_number", "date_delivered", "quantity",
    "unit_selling_price", "gross_sales", "discount_amount", "net_sales",
    "unit_acquisition_cost", "total_acquisition_cost", "gross_margin_amount",
    "margin_pct", "net_value_source", "quality_rule_codes", "record_kind",
    "disposition", "is_analysis_candidate", "business_fingerprint",
    "snapshot_reference_source_record_id", "is_area_placeholder", "is_date_missing",
    "is_provisional_year_candidate", "reporting_year", "reporting_year_basis",
}
assert required <= set(assessed.columns), f"Missing assessed fields: {sorted(required - set(assessed.columns))}"
assert required <= set(clean.columns), f"Missing clean fields: {sorted(required - set(clean.columns))}"
DATASET_ID = dataset_of(manifest, "Bronze manifest")
assert dataset_of(bronze_rows, "Bronze rows") == DATASET_ID
assert dataset_of(assessed, "Silver ledger") == DATASET_ID
assert dataset_of(clean, "Silver clean") == DATASET_ID
assert dataset_of(replacement_2025_audit, "2025 replacement audit") == DATASET_ID
replacement_validation = replacement_2025_audit.collect()
assert len(replacement_validation) == 1, "Expected one 2025 replacement validation row."
replacement_validation = replacement_validation[0]
assert replacement_validation["validation_status"] == "PASS_2025_ALLOCATION_SOURCE"
assert replacement_validation["transaction_rows"] == 4_544
assert replacement_validation["contract_parent_rows"] == 0
assert replacement_validation["source_data_status"] == "ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE"
assert_unique(manifest, ["source_workbook"], "Bronze manifest")
assert_unique(bronze_rows, ["source_record_id"], "Bronze rows")
assert_unique(assessed, ["source_record_id"], "Silver ledger")
assert_unique(clean, ["source_record_id"], "Silver clean")
same_keys(bronze_rows, assessed, ["source_record_id"], "Silver must account for every original Bronze source key")
assert assessed.filter(F.col("disposition").isNull() | F.col("is_analysis_candidate").isNull()
    | F.col("record_kind").isNull() | F.col("quality_rule_codes").isNull()
    | (F.col("is_analysis_candidate") != F.col("disposition").isin(*KEEP_DISPOSITIONS))
).limit(1).count() == 0, "Silver has missing or inconsistent dispositions"
assert clean.filter(
    F.col("disposition").isNull() | ~F.col("disposition").isin(*KEEP_DISPOSITIONS)
    | ~F.col("is_analysis_candidate") | F.col("is_analysis_candidate").isNull()
    | F.col("date_delivered").isNull() | F.col("product").isNull()
    | F.col("area").isNull() | F.col("quality_rule_codes").isNull()
).limit(1).count() == 0, "Clean source contains non-analysis rows or missing required values"
same_keys(clean, assessed.filter("is_analysis_candidate = true"), ["source_record_id"], "Silver survivor keys differ")
source_counts = assessed.groupBy("source_workbook", "source_file_sha256").count()
expected_counts = manifest.select("source_workbook", "source_file_sha256", "raw_line_count")
file_reconciliation = expected_counts.join(source_counts, ["source_workbook", "source_file_sha256"], "full")
assert file_reconciliation.filter(
    F.col("count").isNull() | F.col("raw_line_count").isNull()
    | (F.col("count") != F.col("raw_line_count"))
).limit(1).count() == 0, "Silver ledger does not reconcile to every Bronze file"
assert clean.count() > 0, "No analysis candidates; review Silver before Gold"
display(file_reconciliation.orderBy("source_workbook"))
print(f"GOLD INPUT CONTRACT: PASS | dataset_id={DATASET_ID}")
print("2025 ALLOCATION SOURCE: PASS | contract parents=0 | adjusted-source provenance retained")
```

### Gold — cell 2

```python
# Cell 2 — Load the review reference and classify labels without approving medicines.
# These pure helpers can also be tested locally without Spark.
CONTRACT_PREFIX_PATTERN = (
    r"^(PAGBILAO|QMC|PPDC|TOURISM|PROVINCIAL\s+TOURISM\s+OFFICE|"
    r"MARINDUQUE|GULANG\s+GULANG|PESO|PESO\s+PROVINCIAL|PHO|"
    r"ABOITIZ|PADRE\s+BURGOS|PPOC)\s*#"
)


def normalize_label(value):
    return re.sub(r"\s+", " ", (value or "").strip()).upper()


def classify_product_label(value, reference_keys):
    label = normalize_label(value)
    if not label:
        return "MISSING_PRODUCT_IDENTITY"
    if re.search(CONTRACT_PREFIX_PATTERN, label):
        return "CONTRACT_LABEL_CANDIDATE"
    if "#" in label:
        return "HASHTAG_LABEL_REQUIRES_REVIEW"
    if label in reference_keys:
        return "NONMEDICAL_REFERENCE_REQUIRES_REVIEW"
    return "PRODUCT_MASTER_PENDING"


reference_file = Path(REFERENCE_PATH)
assert reference_file.is_file(), f"Upload the nonmedical review CSV to {REFERENCE_PATH}, or edit REFERENCE_PATH in Cell 1."
assert 0 < reference_file.stat().st_size <= 5_000_000, "Reference CSV missing, empty, or unexpectedly large"
reference_bytes = reference_file.read_bytes()
REFERENCE_SHA256 = hashlib.sha256(reference_bytes).hexdigest()
reference_reader = csv.DictReader(io.StringIO(reference_bytes.decode("utf-8-sig")))
reference_required = {"raw_product", "proposed_category", "forecast_eligible", "mapping_status", "review_notes"}
assert reference_required <= set(reference_reader.fieldnames or []), "Reference CSV schema changed"
reference_records = list(reference_reader)
assert 0 < len(reference_records) <= 10_000, "Unexpected reference row count"
reference_rows = []
reference_keys = set()
for row in reference_records:
    key = normalize_label(row["raw_product"])
    assert key and key not in reference_keys, f"Empty or duplicated normalized reference product: {key}"
    eligibility = row["forecast_eligible"].strip().lower()
    assert eligibility in {"true", "false"}, f"Invalid reference forecast_eligible for {key}"
    reference_keys.add(key)
    reference_rows.append((key, row["proposed_category"], eligibility == "true", row["mapping_status"], row["review_notes"]))
reference_schema = StructType([
    StructField("normalized_product", StringType(), False),
    StructField("reference_proposed_category", StringType(), True),
    StructField("reference_forecast_eligible", BooleanType(), False),
    StructField("reference_mapping_status", StringType(), True),
    StructField("reference_review_notes", StringType(), True),
])
product_reference = spark.createDataFrame(reference_rows, reference_schema)
print(f"PRODUCT REFERENCE: {len(reference_rows)} review labels | sha256={REFERENCE_SHA256}")
print("Reference labels are candidate classifications; an unmatched label is not an approved medicine.")


def read_mapping(path, required):
    """Missing masters mean pending classification; malformed supplied files fail closed."""
    file = Path(path)
    if not file.is_file():
        print(f"MAPPING PENDING: {file.name} is absent; no approvals inferred.")
        return [], "NOT_SUPPLIED"
    payload = file.read_bytes()
    if not 0 < len(payload) <= 5_000_000:
        raise ValueError(f"Invalid mapping file size: {file.name}")
    reader = csv.DictReader(io.StringIO(payload.decode("utf-8-sig")))
    if not required <= set(reader.fieldnames or []):
        raise ValueError(f"Mapping columns missing: {file.name}")
    rows = list(reader)
    if len(rows) > 10_000 or any(None in row or any(v is None for v in row.values()) for row in rows):
        raise ValueError(f"Malformed or oversized mapping: {file.name}")
    return rows, hashlib.sha256(payload).hexdigest()


def reviewed_mapping(rows, key_column, kind):
    """Reject ambiguous aliases and incomplete approvals, including conflicting SKU units."""
    result, sku_contracts, territory_contracts = {}, {}, {}
    for raw in rows:
        row = {key: value.strip() for key, value in raw.items()}
        key = normalize_label(row[key_column])
        if not key or key in result:
            raise ValueError(f"Empty or duplicate {kind} mapping key: {key}")
        if kind == "area":
            if row["mapping_status"].lower() not in {"approved", "needs_review", "proposed"}:
                raise ValueError(f"Invalid area mapping status: {key}")
            if row["area_type"] not in {"territory", "customer_type", "business_line", "unresolved"}:
                raise ValueError(f"Invalid proposed area type: {key}")
            if not row.get("evidence_source") or not row.get("evidence_status"):
                raise ValueError(f"Area mapping evidence must be recorded: {key}")
        if row["mapping_status"].lower() == "approved":
            bool_fields = ("weather_eligible", "forecast_eligible") if kind == "area" else ("forecast_eligible",)
            if any(row[field].lower() not in {"true", "false"} for field in bool_fields):
                raise ValueError(f"Invalid approved {kind} eligibility: {key}")
            if kind == "area":
                if row["area_type"] not in {"territory", "customer_type", "business_line"}:
                    raise ValueError(f"Invalid area type: {key}")
                if row["area_type"] == "territory" and not row["territory"]:
                    raise ValueError(f"Approved territory is missing: {key}")
                if row["area_type"] == "territory":
                    level = row.get("geographic_level")
                    if not row.get("territory_id") or not row.get("region") or level not in {"region", "province", "city", "municipality"}:
                        raise ValueError(f"Approved territory ID, region and geographic level required: {key}")
                    if (level == "province" and not row.get("province")) or (
                        level in {"city", "municipality"} and not row.get("city_municipality")):
                        raise ValueError(f"Approved geographic detail missing: {key}")
                    identity = normalize_label(row["territory_id"])
                    contract = tuple(normalize_label(row.get(field)) for field in (
                        "territory", "region", "province", "city_municipality", "geographic_level"))
                    if identity in territory_contracts and territory_contracts[identity] != contract:
                        raise ValueError(f"Conflicting geography for territory ID: {identity}")
                    territory_contracts[identity] = contract
                if row["area_type"] != "territory" and (
                    row["territory"] or row.get("territory_id") or row.get("province") or row.get("city_municipality")
                    or row.get("region") or row["weather_eligible"].lower() == "true"
                    or row["forecast_eligible"].lower() == "true"
                ):
                    raise ValueError(f"Nongeographic mapping cannot enable territory models: {key}")
            else:
                if row["product_category"] not in {"medicine", "medical_supply", "medical_equipment", "non_medical"}:
                    raise ValueError(f"Invalid approved product category: {key}")
                if not row["canonical_sku"] or not row["unit_of_measure"]:
                    raise ValueError(f"Approved SKU and source unit are required: {key}")
                if row["product_category"] == "non_medical" and row["forecast_eligible"].lower() == "true":
                    raise ValueError(f"Nonmedical product cannot enable medical demand: {key}")
                sku = normalize_label(row["canonical_sku"])
                contract = (row["product_category"], normalize_label(row["unit_of_measure"]), row["forecast_eligible"].lower())
                if sku in sku_contracts and sku_contracts[sku] != contract:
                    raise ValueError(f"Conflicting category, source units or eligibility for SKU: {sku}")
                sku_contracts[sku] = contract
        result[key] = row
    return result


def product_scope(value, reference_keys, master, include_supplies=False):
    """One policy used both by the Spark label lookup and local regression tests."""
    label = normalize_label(value)
    scope = classify_product_label(value, reference_keys)
    row = master.get(label, {})
    approved = row.get("mapping_status", "").lower() == "approved"
    # A reviewed product can resolve a hashtag size or supersede a keyword review list.
    # Recognized contract parents always remain non-SKU evidence.
    if scope == "CONTRACT_LABEL_CANDIDATE" or not approved:
        return (scope, None, None, None, False)
    category = row["product_category"]
    eligible = row["forecast_eligible"].lower() == "true" and (
        category == "medicine" or (category == "medical_supply" and include_supplies)
    )
    return (category.upper() + "_APPROVED", normalize_label(row["canonical_sku"]),
            category, normalize_label(row["unit_of_measure"]), eligible)


def area_scope(value, master):
    if normalize_label(value) == "UNKNOWN_AREA":
        return ("UNKNOWN_AREA_PLACEHOLDER", None, False, False)
    row = master.get(normalize_label(value), {})
    if row.get("mapping_status", "").lower() != "approved":
        return ("MAPPING_PENDING", None, False, False)
    geographic = row["area_type"] == "territory"
    return (row["area_type"], normalize_label(row["territory"]) if geographic else None,
            geographic, geographic and row["weather_eligible"].lower() == "true"
            and row["forecast_eligible"].lower() == "true")


def area_metadata(value, master):
    """Proposals remain visible without turning them into approved geographic keys."""
    row = master.get(normalize_label(value), {})
    approved_territory = area_scope(value, master)[2]
    return (row.get("standard_area") or normalize_label(value), row.get("area_type", "unresolved"),
            row.get("mapping_status", "unmapped"), row.get("territory_id") if approved_territory else None,
            row.get("region", ""), row.get("province", ""), row.get("city_municipality", ""),
            row.get("geographic_level", "unresolved"), row.get("customer_type", ""),
            row.get("business_line", ""), row.get("evidence_source", ""), row.get("evidence_status", "NO_MAPPING"),
            row.get("external_mapping_status", "pending"))


# Catalog helper is shipped beside this notebook as a Python workspace file.
CATALOG_HELPER_PATH = "/Workspace/medshield/medshield_project/product_catalog.py"
CATALOG_HELPER_SHA256 = "20888a90253718dabf2aea3390ecc8d7ca707b388e8a4d45123e894c98f688c9"
catalog_payload = Path(CATALOG_HELPER_PATH).read_bytes()
assert hashlib.sha256(catalog_payload).hexdigest() == CATALOG_HELPER_SHA256, "Catalog helper hash mismatch"
catalog = {}
exec(compile(catalog_payload, CATALOG_HELPER_PATH, "exec"), catalog)

area_rows, AREA_MAPPING_SHA256 = read_mapping(AREA_MAPPING_PATH, {
    "raw_area", "standard_area", "area_type", "territory", "customer_type", "business_line",
    "weather_eligible", "forecast_eligible", "mapping_status", "territory_id", "region", "province",
    "city_municipality", "geographic_level", "evidence_source", "evidence_status", "external_mapping_status"})
master_rows, PRODUCT_MASTER_SHA256 = read_mapping(PRODUCT_MASTER_PATH, set(catalog["FIELDS"]))
area_master = reviewed_mapping(area_rows, "raw_area", "area")
product_master = catalog["validate_master"](master_rows)
# One policy row per normalized label prevents mapping fan-out.
product_labels = {normalize_label(row[0]) for row in clean.select("product").distinct().collect()}
area_labels = {normalize_label(row[0]) for row in clean.select("area").distinct().collect()}
catalog_rows = []
for label in sorted(product_labels):
    metadata = catalog["resolve"](label, hashlib.sha256(label.encode("utf-8")).hexdigest(), product_master)
    scope = classify_product_label(label, reference_keys)
    assert scope != "CONTRACT_LABEL_CANDIDATE" or metadata["canonical_sku"] is None, "Contract parent cannot be a SKU"
    metadata["product_scope_status"] = metadata["product_category"].upper() + "_APPROVED" if metadata["category_status"] == "approved" else scope
    metadata["is_medical_product_approved"] = metadata["forecast_eligible"] and (
        metadata["product_category"] == "medicine" or (INCLUDE_MEDICAL_SUPPLIES and metadata["product_category"] == "medical_supply"))
    metadata["normalized_product"] = label
    catalog_rows.append(metadata)
catalog_schema = StructType([StructField(key, BooleanType() if isinstance(value, bool) else StringType(), True)
    for key, value in catalog_rows[0].items()])
product_policy = spark.createDataFrame(catalog_rows, catalog_schema)
assert_unique(product_policy, ["normalized_product"], "catalog policy")
area_policy = spark.createDataFrame([
    (label, *area_scope(label, area_master), *area_metadata(label, area_master)) for label in sorted(area_labels)
], "normalized_area string, area_classification string, territory string, is_geographic_territory_approved boolean, is_external_geography_candidate boolean, area_display_label string, proposed_area_type string, area_mapping_status string, territory_id string, mapped_region string, mapped_province string, mapped_city_municipality string, mapped_geographic_level string, mapped_customer_channel string, mapped_business_line string, area_mapping_evidence string, area_evidence_status string, external_mapping_status string")
# Independently verified transaction detail has its own source-bound receipt.
evidence_rows, TRANSACTION_EVIDENCE_SHA256 = read_mapping(TRANSACTION_EVIDENCE_PATH, set(catalog["EVIDENCE_FIELDS"]))
evidence_master = catalog["validate_transaction_evidence"](evidence_rows)
evidence_sources = clean.select("source_record_id", "source_file_sha256", "source_workbook").join(
    manifest.select("source_workbook", "source_data_status", "source_adjustment_policy"), "source_workbook").collect()
assert set(evidence_master) <= {row["source_record_id"] for row in evidence_sources}, "Verification references an unknown source record"
transaction_policy_rows = []
for source in evidence_sources:
    data = source.asDict()
    data["is_adjusted_source"] = data["source_data_status"] != "ORIGINAL_SOURCE_EXPORT"
    transaction_policy_rows.append((data["source_record_id"], *catalog["transaction_evidence"](data, evidence_master)))
transaction_policy = spark.createDataFrame(transaction_policy_rows,
    "source_record_id string, transaction_evidence string, transaction_evidence_lineage string")
assert_unique(transaction_policy, ["source_record_id"], "transaction evidence")
print(f"PRODUCT MASTER: {len(master_rows)} rows; sha256={PRODUCT_MASTER_SHA256}; resolution={catalog['RESOLUTION_POLICY']}")
print(f"TRANSACTION EVIDENCE: {len(evidence_rows)} rows; sha256={TRANSACTION_EVIDENCE_SHA256}")
print(f"AREA MASTER: {len(area_rows)} mapping rows; sha256={AREA_MAPPING_SHA256}")
display(area_policy.orderBy("area_mapping_status", "normalized_area"))
```

### Gold — cell 3

```python
# Cell 3 — Keep one fact per accepted source record and govern each metric separately.
def has_rule(code):
    return F.coalesce(F.array_contains(F.col("quality_rule_codes"), code), F.lit(False))


fact = (
    clean
    .join(
        manifest.select("source_workbook", "source_data_status", "source_adjustment_policy"),
        "source_workbook",
        "left",
    )
    .withColumn("sales_fact_id", F.col("source_record_id"))
    .withColumn("normalized_product", F.upper(F.trim(F.regexp_replace("product", r"\s+", " "))))
    .withColumn("normalized_area", F.upper(F.trim(F.regexp_replace("area", r"\s+", " "))))
    .join(product_reference, "normalized_product", "left")
    .join(product_policy, "normalized_product", "left")
    .join(area_policy, "normalized_area", "left")
    .join(transaction_policy, "source_record_id", "left")
    .withColumn("product_key", F.sha2("normalized_product", 256))
    .withColumn("area_key", F.sha2("normalized_area", 256))
    .withColumn("date_key", F.date_format("date_delivered", "yyyyMMdd").cast("int"))
    .withColumn("month_start", F.trunc("date_delivered", "month").cast("date"))
    .withColumn("calendar_year", F.year("date_delivered"))
    .withColumn("is_contract_label", F.col("normalized_product").rlike(CONTRACT_PREFIX_PATTERN))
    .withColumn("is_adjusted_source", F.col("source_data_status") != "ORIGINAL_SOURCE_EXPORT")
    .withColumn("resolution_policy", F.lit(catalog["RESOLUTION_POLICY"]))
    .withColumn("transaction_evidence_sha256", F.lit(TRANSACTION_EVIDENCE_SHA256))
    .withColumn("catalog_helper_sha256", F.lit(CATALOG_HELPER_SHA256))
    .withColumn("is_low_trust_2017", (F.col("calendar_year") == 2017) | (F.col("data_source_year") == 2017))
    .withColumn("is_historical_backfill_candidate", F.col("disposition") == "KEEP_HISTORICAL_BACKFILL_CANDIDATE")
    .withColumn("is_product_ranking_candidate", F.col("product_scope_status").isin(
        "PRODUCT_MASTER_PENDING", "NONMEDICAL_REFERENCE_REQUIRES_REVIEW",
        "MEDICINE_APPROVED", "MEDICAL_SUPPLY_APPROVED", "MEDICAL_EQUIPMENT_APPROVED", "NON_MEDICAL_APPROVED"))
    .withColumn("is_quantity_observation_eligible", F.col("quantity").isNotNull()
        & ~has_rule("2017_QUANTITY_CANDIDATES_DISAGREE") & ~has_rule("INVALID_OR_MISSING_QUANTITY"))
    .withColumn("is_gross_sales_eligible", F.col("gross_sales").isNotNull() & ~has_rule("GROSS_VALUE_FORMULA_MISMATCH"))
    .withColumn("is_net_sales_eligible", F.col("net_sales").isNotNull() & ~has_rule("NET_VALUE_FORMULA_MISMATCH"))
    .withColumn("is_acquisition_cost_eligible", F.col("total_acquisition_cost").isNotNull() & ~has_rule("TRANSFER_VALUE_FORMULA_MISMATCH"))
    .withColumn("is_gross_margin_eligible", F.col("gross_margin_amount").isNotNull()
        & F.col("is_net_sales_eligible") & F.col("is_acquisition_cost_eligible") & ~has_rule("GROSS_MARGIN_FORMULA_MISMATCH"))
    .withColumn("is_positive_delivery_quantity_eligible", F.col("is_quantity_observation_eligible")
        & (F.col("quantity") > 0) & F.col("is_product_ranking_candidate") & (F.col("item_kind") != "service"))
    .withColumn("is_return_quantity_eligible", F.col("is_quantity_observation_eligible") & (F.col("quantity") < 0))
    .withColumn("return_quantity_abs", F.when(F.col("is_return_quantity_eligible"), F.abs("quantity")))
    .withColumn("is_provisional_product_demand_eligible", F.col("is_positive_delivery_quantity_eligible")
        & (F.col("product_scope_status") == "PRODUCT_MASTER_PENDING")
        & ~F.col("is_low_trust_2017") & ~F.col("is_historical_backfill_candidate"))
    .withColumn("is_approved_medical_demand_eligible", F.col("is_positive_delivery_quantity_eligible")
        & F.col("is_medical_product_approved")
        & F.col("transaction_evidence").isin("original_source_detail", "independently_verified_detail")
        & (F.col("item_kind") == "physical_product") & (F.col("identity_status") == "approved")
        & ~F.col("is_low_trust_2017")
        & ~F.col("is_historical_backfill_candidate"))
    .withColumn("is_external_analysis_candidate", F.col("is_approved_medical_demand_eligible")
        & F.col("is_external_geography_candidate"))
    .withColumn("external_join_status", F.lit("STATION_DISEASE_GEOGRAPHY_AND_PERIOD_COVERAGE_NOT_VALIDATED"))
    .withColumn("is_external_join_ready", F.lit(False))
    .withColumn("financial_review_required", F.col("net_sales").isNull() | (F.col("net_sales") <= 0)
        | ~F.col("is_net_sales_eligible"))
    .withColumn("transaction_quantity_status", F.when(F.col("quantity").isNull(), "MISSING_QUANTITY")
        .when(F.col("quantity") < 0, "RETURN_OR_CREDIT_CANDIDATE")
        .when(F.col("quantity") == 0, "ZERO_REPORTED_QUANTITY").otherwise("POSITIVE_REPORTED_QUANTITY"))
    .withColumn("contract_prefix", F.when(F.col("is_contract_label"), F.trim(F.regexp_extract("normalized_product", r"^([^#]+)\s*#", 1))))
    .withColumn("contract_label_group_key", F.when(F.col("is_contract_label"), F.sha2("normalized_product", 256)))
    .withColumn("product_reference_sha256", F.lit(REFERENCE_SHA256))
    .withColumn("publication_status", F.lit(PUBLICATION_STATUS))
    .withColumn("policy_version", F.lit(POLICY_VERSION))
)
# Catalog-only migration is bound to the reviewed predecessor, not latest mutable state.
CATALOG_BASE_FACT_VERSION = 16
catalog_base = spark.sql(f"SELECT * FROM {GOLD_SCHEMA}.sales_restart_fact_candidate VERSION AS OF {CATALOG_BASE_FACT_VERSION}")
assert dataset_of(catalog_base, "catalog predecessor") == DATASET_ID
same_keys(catalog_base, fact, ["source_record_id"], "Catalog migration cannot add/delete transactions")
CATALOG_PRESERVED_FIELDS = ["source_record_id", "product_key", "product", "product_raw", "quantity", "date_delivered", "net_sales",
    "gross_sales", "gross_margin_amount", "total_acquisition_cost", "is_net_sales_eligible", "is_gross_sales_eligible",
    "is_gross_margin_eligible", "is_acquisition_cost_eligible", "is_quantity_observation_eligible", "is_adjusted_source"]
assert catalog_base.select(*CATALOG_PRESERVED_FIELDS).exceptAll(fact.select(*CATALOG_PRESERVED_FIELDS)).limit(1).count() == 0, "Catalog source/financial contract changed"
assert fact.select(*CATALOG_PRESERVED_FIELDS).exceptAll(catalog_base.select(*CATALOG_PRESERVED_FIELDS)).limit(1).count() == 0, "Catalog source/financial contract changed"
assert_unique(fact, ["sales_fact_id"], "Gold fact")
same_keys(clean, fact, ["source_record_id"], "Gold must preserve exactly the Silver survivors")
eligibility_nulls = F.lit(False)
for column in fact.columns:
    if column.startswith("is_"):
        eligibility_nulls = eligibility_nulls | F.col(column).isNull()
assert fact.filter(eligibility_nulls).limit(1).count() == 0, "Gold eligibility flags must not be null"
assert fact.filter(
    (F.col("data_source_year") == 2025) & F.col("is_contract_label")
).limit(1).count() == 0, "The reviewed 2025 replacement must contain zero contract-parent labels."
assert fact.filter(
    (F.col("data_source_year") == 2025) & ~F.col("is_adjusted_source")
).limit(1).count() == 0, "The adjusted-source provenance flag is missing from 2025 facts."
assert fact.filter("is_approved_medical_demand_eligible = true").filter(
    ~F.col("is_medical_product_approved") | F.col("is_contract_label")
    | (F.col("transaction_evidence") == "adjusted_estimated_source") | (F.col("item_kind") != "physical_product")
    | F.col("canonical_sku").isNull() | F.col("unit_of_measure").isNull()
    | F.col("is_low_trust_2017") | F.col("is_historical_backfill_candidate")
    | (F.col("quantity") <= 0)
).count() == 0
assert fact.filter("is_provisional_product_demand_eligible = true").filter(
    F.col("is_low_trust_2017") | F.col("is_historical_backfill_candidate")
    | (F.col("product_scope_status") != "PRODUCT_MASTER_PENDING") | (F.col("quantity") <= 0)
).count() == 0
display(fact.groupBy("product_scope_status", "transaction_quantity_status").count().orderBy("product_scope_status"))
```

### Gold — cell 4

```python
# Cell 4 — Dimensions keep raw labels distinct from approved products or territories.
source_years = [row["data_source_year"] for row in manifest.select("data_source_year").distinct().collect()]
delivery_bounds = fact.agg(F.min("date_delivered").alias("first"), F.max("date_delivered").alias("last")).first()
first_year = min(min(source_years), delivery_bounds["first"].year)
last_year = max(max(source_years), delivery_bounds["last"].year)
calendar_start, calendar_end = date(first_year, 1, 1), date(last_year, 12, 31)
dim_date = (
    spark.range(1).select(F.explode(F.sequence(F.lit(calendar_start), F.lit(calendar_end), F.expr("interval 1 day"))).alias("date_delivered"))
    .withColumn("date_key", F.date_format("date_delivered", "yyyyMMdd").cast("int"))
    .withColumn("month_start", F.trunc("date_delivered", "month").cast("date"))
    .withColumn("calendar_year", F.year("date_delivered"))
    .withColumn("calendar_month", F.month("date_delivered"))
    .withColumn("calendar_quarter", F.quarter("date_delivered"))
)
dim_area = fact.groupBy("area_key", "normalized_area").agg(
    F.min("area").alias("area_label"), F.count("*").alias("source_record_count"),
    F.min("date_delivered").alias("first_observed_delivery"), F.max("date_delivered").alias("last_observed_delivery"),
).join(area_policy, "normalized_area", "left")
dim_product = fact.groupBy("product_key", "normalized_product", "product_scope_status").agg(
    F.min("product").alias("product_label"), F.count("*").alias("source_record_count"),
    F.min("reference_proposed_category").alias("reference_proposed_category"),
    F.min("date_delivered").alias("first_observed_delivery"), F.max("date_delivered").alias("last_observed_delivery"),
).join(product_policy, ["normalized_product", "product_scope_status"], "left")
# Canonical reporting dimension retains original aliases for drill-through.
dim_canonical_product = fact.groupBy("canonical_group_id").agg(
    F.min("canonical_sku").alias("canonical_sku"), F.min("canonical_title").alias("canonical_title"),
    F.sort_array(F.collect_set("product")).alias("original_aliases"),
    F.sort_array(F.collect_set("product_key")).alias("source_product_keys"),
    F.count("*").alias("source_record_count"),
    *[F.min(field).alias(field) for field in ["display_category", "product_category", "identity_status", "category_status", "item_kind", "unit_of_measure"] + list(catalog["ATTRIBUTES"])])
assert_unique(dim_canonical_product, ["canonical_group_id"], "canonical product")

for dimension, keys in [(dim_date, ["date_key"]), (dim_area, ["area_key"]), (dim_product, ["product_key"])]:
    assert_unique(dimension, keys, "Gold dimension")
    assert fact.select(*keys).join(dimension.select(*keys), keys, "left_anti").count() == 0
```

### Gold — cell 5

```python
# Cell 5 — Reusable metric definitions and sales marts; missing observations stay null.
# Source measures remain signed. A conditional sum deliberately has no otherwise(0).
# Positive product units are heterogeneous source units, not standardized packs or doses.
METRICS = {
    "signed_quantity": ("quantity", "is_quantity_observation_eligible"),
    "positive_delivered_quantity": ("quantity", "is_positive_delivery_quantity_eligible"),
    "return_quantity_abs": ("return_quantity_abs", "is_return_quantity_eligible"),
    "provisional_product_demand_quantity": ("quantity", "is_provisional_product_demand_eligible"),
    "approved_medical_demand_quantity": ("quantity", "is_approved_medical_demand_eligible"),
    "gross_sales": ("gross_sales", "is_gross_sales_eligible"),
    "net_sales": ("net_sales", "is_net_sales_eligible"),
    "total_acquisition_cost": ("total_acquisition_cost", "is_acquisition_cost_eligible"),
    "gross_margin_amount": ("gross_margin_amount", "is_gross_margin_eligible"),
    "margin_net_sales_basis": ("net_sales", "is_gross_margin_eligible"),
}


def metric_aggregations():
    result = [F.count("*").alias("transaction_count"), F.countDistinct("product_key").alias("distinct_source_product_labels"),
        F.sum(F.col("is_contract_label").cast("long")).alias("contract_label_transaction_count"),
        F.sum(F.col("is_adjusted_source").cast("long")).alias("adjusted_source_transaction_count"),
        F.sum(F.col("is_low_trust_2017").cast("long")).alias("low_trust_2017_transaction_count"),
        F.sum(F.col("is_historical_backfill_candidate").cast("long")).alias("historical_backfill_transaction_count"),
        F.sum(F.col("financial_review_required").cast("long")).alias("financial_review_transaction_count")]
    for name, (value, eligible) in METRICS.items():
        result.extend([F.sum(F.when(F.col(eligible), F.col(value))).alias(name),
            F.count(F.when(F.col(eligible), F.col(value))).alias(f"{name}_observation_count")])
    return result


def with_margin_rate(frame):
    return frame.withColumn("weighted_gross_margin_pct", F.when(
        F.col("margin_net_sales_basis").isNotNull() & (F.col("margin_net_sales_basis") != 0),
        F.round(F.col("gross_margin_amount") / F.col("margin_net_sales_basis") * 100, 4)
    ))


def aggregate_sales(frame, keys):
    return with_margin_rate(frame.groupBy(*keys).agg(*metric_aggregations()))


month_spine = dim_date.select("month_start", "calendar_year", "calendar_month").distinct()
monthly = month_spine.join(aggregate_sales(fact, ["month_start"]), "month_start", "left")
COUNT_COLUMNS = [name for name in monthly.columns if name.endswith("_count") or name == "distinct_source_product_labels"]
monthly = monthly.fillna(0, subset=COUNT_COLUMNS).withColumn(
    "observation_status", F.when(F.col("transaction_count") == 0, "NO_OBSERVED_RECORDS").otherwise("OBSERVED_RECORDS")
).withColumn("source_completeness_status", F.lit("NOT_ESTABLISHED_BY_TRANSACTION_PRESENCE"))
year_coverage = monthly.groupBy("calendar_year").agg(
    F.count("*").alias("calendar_month_count"),
    F.sum(F.when(F.col("transaction_count") > 0, 1).otherwise(0)).alias("observed_month_count"),
    F.sum(F.when(F.col("transaction_count") == 0, 1).otherwise(0)).alias("unobserved_month_count"),
)
yearly = year_coverage.join(aggregate_sales(fact, ["calendar_year"]), "calendar_year", "left").fillna(0, subset=COUNT_COLUMNS).withColumn(
    "source_completeness_status", F.lit("NOT_ESTABLISHED_BY_TRANSACTION_PRESENCE")
)
area_yearly = aggregate_sales(fact, ["calendar_year", "area_key", "normalized_area"])
product_yearly = aggregate_sales(fact.filter("is_provisional_product_demand_eligible = true"),
    ["calendar_year", "product_key", "normalized_product", "product_scope_status"])
# Full business-label reporting and medical demand have deliberately different populations.
business_product_yearly = aggregate_sales(fact,
    ["calendar_year", "product_key", "normalized_product", "product_scope_status"])
territory_yearly = aggregate_sales(fact.filter("is_geographic_territory_approved = true"),
    ["calendar_year", "territory_id", "territory"])
medical_monthly = aggregate_sales(fact.filter("is_approved_medical_demand_eligible = true"),
    ["month_start", "canonical_sku", "unit_of_measure"])
external_candidates = fact.filter("is_external_analysis_candidate = true")
scope_audit = fact.groupBy("product_scope_status", "area_classification",
    "is_approved_medical_demand_eligible", "is_external_analysis_candidate").count()
area_coverage = fact.groupBy("calendar_year", "normalized_area", "area_display_label",
    "area_mapping_status", "proposed_area_type", "area_classification", "area_evidence_status").agg(
    F.count("*").alias("retained_record_count"),
    F.sum(F.col("is_geographic_territory_approved").cast("long")).alias("approved_territory_record_count"),
    F.sum(F.col("is_external_geography_candidate").cast("long")).alias("external_geography_candidate_count"),
    F.sum(F.col("is_external_join_ready").cast("long")).alias("external_join_ready_count"))
assert area_coverage.agg(F.sum("retained_record_count")).first()[0] == fact.count()
assert fact.filter("is_geographic_territory_approved = true AND territory_id IS NULL").count() == 0
display(area_coverage.orderBy("calendar_year", "normalized_area"))
# Preserve year-only records outside observed sales totals and time-series marts.
provisional_year_review = assessed.filter("is_provisional_year_candidate = true").withColumn(
    "provisional_status", F.lit("SOURCE_YEAR_ONLY_DATE_AND_DUPLICATES_REQUIRE_REVIEW"))
assert provisional_year_review.filter(
    F.col("date_delivered").isNotNull() | F.col("calendar_year").isNotNull()
    | (F.col("reporting_year") != F.col("data_source_year"))
    | F.col("is_analysis_candidate")
).limit(1).count() == 0
contract_labels = aggregate_sales(fact.filter("is_contract_label = true"),
    ["contract_label_group_key", "normalized_product", "contract_prefix"]).withColumn(
    "grouping_meaning", F.lit("EXACT_NORMALIZED_LABEL_ONLY_NOT_A_VERIFIED_CONTRACT_ID")
)
label_partition = aggregate_sales(fact, ["product_scope_status"])
for frame, keys in [(monthly, ["month_start"]), (yearly, ["calendar_year"]),
    (area_yearly, ["calendar_year", "area_key"]), (product_yearly, ["calendar_year", "product_key"]),
    (contract_labels, ["contract_label_group_key"]), (label_partition, ["product_scope_status"])]:
    assert_unique(frame, keys, "Sales mart")
assert monthly.count() == (last_year - first_year + 1) * 12
assert monthly.filter("observation_status = 'NO_OBSERVED_RECORDS'").filter(
    F.col("net_sales").isNotNull() | F.col("positive_delivered_quantity").isNotNull()
    | F.col("provisional_product_demand_quantity").isNotNull()
).count() == 0, "Unobserved months must not be imputed as zero sales or demand"
display(yearly.orderBy("calendar_year"))
```

### Gold — cell 6

```python
# Cell 6 — Every exclusion remains visible; unlinked continuation rows are evidence.
disposition_audit = assessed.groupBy("data_source_year", "record_kind", "disposition", "is_analysis_candidate").agg(
    F.count("*").alias("source_record_count")
)
quality_audit = assessed.select("source_record_id", "data_source_year", "disposition",
    F.explode("quality_rule_codes").alias("quality_rule_code")).groupBy(
    "data_source_year", "disposition", "quality_rule_code"
).agg(F.countDistinct("source_record_id").alias("affected_source_records"))
returns_audit = fact.filter("is_return_quantity_eligible = true")
contract_evidence_audit = (
    assessed.withColumn("normalized_evidence_product", F.upper(F.trim(F.regexp_replace("product", r"\s+", " "))))
    .filter(F.coalesce(F.col("normalized_evidence_product").rlike(CONTRACT_PREFIX_PATTERN), F.lit(False))
        | (F.col("record_kind") == "CONTINUATION_OR_MISSING_IDENTITY"))
    .withColumn("evidence_status", F.when(F.col("normalized_evidence_product").rlike(CONTRACT_PREFIX_PATTERN),
        "CONTRACT_LABEL_SOURCE_RECORD").otherwise("UNLINKED_CONTINUATION_OR_MISSING_IDENTITY"))
    .withColumn("link_status", F.lit("NO_CONTRACT_LINK_INFERRED"))
    .withColumn("allocated_quantity", F.lit(None).cast("decimal(20,6)"))
    .withColumn("allocated_net_sales", F.lit(None).cast("decimal(20,6)"))
)
assert disposition_audit.agg(F.sum("source_record_count")).first()[0] == assessed.count()
assert returns_audit.filter("quantity >= 0 OR return_quantity_abs <= 0").count() == 0


def assert_metric_reconciliation(source_fact, mart, label):
    expected = source_fact.agg(*metric_aggregations()).first().asDict()
    sums = [F.sum("transaction_count").alias("transaction_count")]
    for metric in METRICS:
        sums.extend([F.sum(metric).alias(metric), F.sum(f"{metric}_observation_count").alias(f"{metric}_observation_count")])
    observed = mart.agg(*sums).first().asDict()
    assert (observed["transaction_count"] or 0) == expected["transaction_count"], f"{label}: row total mismatch"
    for metric in METRICS:
        assert (observed[f"{metric}_observation_count"] or 0) == expected[f"{metric}_observation_count"], f"{label}: {metric} observation count"
        target, actual = expected[metric], observed[metric]
        assert (target is None) == (actual is None), f"{label}: {metric} null meaning changed"
        if target is not None:
            assert abs(Decimal(str(target)) - Decimal(str(actual))) <= Decimal("0.000001"), f"{label}: {metric} sum changed"
    for metric in METRICS:
        assert mart.filter(
            ((F.col(f"{metric}_observation_count") == 0) & F.col(metric).isNotNull())
            | ((F.col(f"{metric}_observation_count") > 0) & F.col(metric).isNull())
        ).count() == 0, f"{label}: {metric} observation/null mismatch"


for mart, label in [(monthly, "monthly"), (yearly, "yearly"), (area_yearly, "area yearly"), (label_partition, "label partition")]:
    assert_metric_reconciliation(fact, mart, label)
assert_metric_reconciliation(fact.filter("is_provisional_product_demand_eligible = true"), product_yearly, "product yearly")
assert_metric_reconciliation(fact.filter("is_contract_label = true"), contract_labels, "exact contract labels")
for source, mart, label, keys in [
    (fact, business_product_yearly, "business product labels", ["calendar_year", "product_key"]),
    (fact.filter("is_geographic_territory_approved = true"), territory_yearly, "reviewed territory", ["calendar_year", "territory_id"]),
    (fact.filter("is_approved_medical_demand_eligible = true"), medical_monthly, "approved medical", ["month_start", "canonical_sku", "unit_of_measure"]),
]:
    assert_unique(mart, keys, label)
    assert_metric_reconciliation(source, mart, label)
assert scope_audit.agg(F.sum("count")).first()[0] == fact.count()
print("GOLD PREPUBLICATION: PASS | Metric sums, eligible observation counts, null meaning, and dispositions reconciled")
```

### Gold — cell 7

```python
# Cell 7 — Publish isolated restart candidates, then validate persisted values and keys.
# Each table write is atomic; the complete group is not. Rerun from Cell 1 if a write fails.
outputs = {
    f"{GOLD_SCHEMA}.sales_restart_fact_candidate": (fact, ["sales_fact_id"]),
    f"{GOLD_SCHEMA}.sales_restart_dim_date_candidate": (dim_date, ["date_key"]),
    f"{GOLD_SCHEMA}.sales_restart_dim_area_candidate": (dim_area, ["area_key"]),
    f"{GOLD_SCHEMA}.sales_restart_dim_product_candidate": (dim_product, ["product_key"]),
    f"{GOLD_SCHEMA}.sales_restart_dim_canonical_product_candidate": (dim_canonical_product, ["canonical_group_id"]),
    f"{GOLD_SCHEMA}.sales_restart_monthly_candidate": (monthly, ["month_start"]),
    f"{GOLD_SCHEMA}.sales_restart_yearly_candidate": (yearly, ["calendar_year"]),
    f"{GOLD_SCHEMA}.sales_restart_area_yearly_candidate": (area_yearly, ["calendar_year", "area_key"]),
    f"{GOLD_SCHEMA}.sales_restart_product_yearly_candidate": (product_yearly, ["calendar_year", "product_key"]),
    f"{GOLD_SCHEMA}.sales_restart_business_product_yearly_candidate": (business_product_yearly, ["calendar_year", "product_key"]),
    f"{GOLD_SCHEMA}.sales_restart_territory_yearly_candidate": (territory_yearly, ["calendar_year", "territory_id"]),
    f"{AUDIT_SCHEMA}.sales_restart_area_coverage_candidate": (area_coverage, ["calendar_year", "normalized_area"]),
    f"{GOLD_SCHEMA}.sales_restart_medical_monthly_candidate": (medical_monthly, ["month_start", "canonical_sku", "unit_of_measure"]),
    f"{GOLD_SCHEMA}.sales_restart_external_input_candidate": (external_candidates, ["sales_fact_id"]),
    f"{AUDIT_SCHEMA}.sales_restart_scope_candidate": (scope_audit, ["product_scope_status", "area_classification", "is_approved_medical_demand_eligible", "is_external_analysis_candidate"]),
    f"{AUDIT_SCHEMA}.sales_restart_provisional_year_candidate": (provisional_year_review, ["source_record_id"]),
    f"{GOLD_SCHEMA}.sales_restart_contract_labels_candidate": (contract_labels, ["contract_label_group_key"]),
    f"{GOLD_SCHEMA}.sales_restart_label_partition_candidate": (label_partition, ["product_scope_status"]),
    f"{AUDIT_SCHEMA}.sales_restart_gold_disposition_candidate": (disposition_audit, ["data_source_year", "record_kind", "disposition", "is_analysis_candidate"]),
    f"{AUDIT_SCHEMA}.sales_restart_gold_quality_candidate": (quality_audit, ["data_source_year", "disposition", "quality_rule_code"]),
    f"{AUDIT_SCHEMA}.sales_restart_returns_candidate": (returns_audit, ["source_record_id"]),
    f"{AUDIT_SCHEMA}.sales_restart_contract_evidence_candidate": (contract_evidence_audit, ["source_record_id"]),
}
publication_rows = []
for name, (frame, keys) in outputs.items():
    assert name.split(".")[-1].startswith("sales_restart_") and name.endswith("_candidate")
    target = frame.withColumn("dataset_id", F.lit(DATASET_ID)).withColumn("policy_version", F.lit(POLICY_VERSION)).withColumn(
        "publication_status", F.lit(PUBLICATION_STATUS)
    ).withColumn("product_reference_sha256", F.lit(REFERENCE_SHA256)).withColumn(
        "area_mapping_sha256", F.lit(AREA_MAPPING_SHA256)).withColumn(
        "product_master_sha256", F.lit(PRODUCT_MASTER_SHA256)).withColumn(
        "medical_supplies_in_scope", F.lit(INCLUDE_MEDICAL_SUPPLIES)).withColumn("gold_published_at", F.current_timestamp())
    assert_unique(target, keys, name)
    expected_count = target.count()
    target.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(name)
    saved = spark.table(name)
    assert saved.count() == expected_count, f"{name}: persisted row count mismatch"
    assert_unique(saved, keys, name)
    same_keys(target, saved, keys, f"{name}: persisted key mismatch")
    if expected_count:
        assert dataset_of(saved, name) == DATASET_ID
    compare_columns = [column for column in target.columns if column != "gold_published_at"]
    assert target.select(*compare_columns).exceptAll(saved.select(*compare_columns)).limit(1).count() == 0, f"{name}: persisted values differ"
    assert saved.select(*compare_columns).exceptAll(target.select(*compare_columns)).limit(1).count() == 0, f"{name}: persisted values differ"
    publication_rows.append((name, expected_count, "PASS"))

saved_fact = spark.table(f"{GOLD_SCHEMA}.sales_restart_fact_candidate")
for suffix in ["monthly", "yearly", "area_yearly", "label_partition"]:
    assert_metric_reconciliation(saved_fact, spark.table(f"{GOLD_SCHEMA}.sales_restart_{suffix}_candidate"), f"persisted {suffix}")
publication_audit = spark.createDataFrame(publication_rows, "table_name string, saved_rows long, status string").withColumn(
    "dataset_id", F.lit(DATASET_ID)
).withColumn("policy_version", F.lit(POLICY_VERSION)).withColumn(
    "area_mapping_sha256", F.lit(AREA_MAPPING_SHA256)).withColumn(
    "product_master_sha256", F.lit(PRODUCT_MASTER_SHA256)).withColumn(
    "medical_supplies_in_scope", F.lit(INCLUDE_MEDICAL_SUPPLIES)).withColumn("validated_at", F.current_timestamp())
publication_audit.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(
    f"{AUDIT_SCHEMA}.sales_restart_gold_publication_candidate"
)
display(publication_audit.orderBy("table_name"))
print("SALES GOLD RESTART: PASS_CANDIDATE")
print(f"Dataset: {DATASET_ID}")
print(f"Policy: {POLICY_VERSION}; product reference sha256: {REFERENCE_SHA256}")
print(f"Fact source records: {saved_fact.count():,}; published data tables: {len(outputs)}")
print("Original measures preserved; each reported aggregate uses its explicit eligibility flag.")
print("2025 contains no contract-parent labels; its estimated allocation provenance remains explicit in Gold.")
print("No-observation months remain unknown. Product master, historical backfills, and pre-2025 contract labels need review.")
print("Provisional product demand is not approved medical demand; no forecasting or external integration was run.")
```

## Catalog helper workspace file

Upload `product_catalog.py` as a file beside Gold, preserving its bytes. Do not paste it as an extra notebook cell; Gold verifies the file hash.

```python
"""Conservative catalog policy. No I/O, fuzzy approvals, or transaction deduplication."""
import re

RESOLUTION_POLICY = "catalog_v1_independent_evidence"
ATTRIBUTES = ("brand", "manufacturer", "model", "strength", "concentration", "dosage_form",
              "container_size", "packaging_unit", "pack_count", "contained_unit", "bundle_specification")
FIELDS = ("raw_product", "canonical_sku", "canonical_title", "representative_raw_product",
          "product_category", "category_status", "identity_status", "item_kind", "item_kind_status",
          "unit_of_measure", "unit_status", "forecast_eligible", "forecast_status", "mapping_status",
          "evidence_source", "reviewed_by", "reviewed_at", "review_notes") + ATTRIBUTES
MEDICAL = {"medicine", "medical_supply", "medical_equipment"}
STATUSES = {"proposed", "needs_review", "approved"}
EVIDENCE_FIELDS = ("source_record_id", "source_file_sha256", "verification_status", "verified_detail_scope",
                   "evidence_source", "reviewed_by", "reviewed_at")


def validate_transaction_evidence(rows):
    """Separate transaction-level evidence; a catalog approval cannot populate this."""
    result = {}
    for row in rows:
        if not set(EVIDENCE_FIELDS) <= row.keys() or any(not isinstance(row[f], str) or not row[f].strip() for f in EVIDENCE_FIELDS):
            raise ValueError("Incomplete transaction verification receipt")
        key = row["source_record_id"]
        if key in result or row["verification_status"] not in STATUSES:
            raise ValueError("Duplicate transaction evidence or invalid verification status")
        if row["verified_detail_scope"] != "product_identity_and_quantity":
            raise ValueError("Verification must explicitly substantiate identity and quantity")
        if not re.fullmatch(r"[a-f0-9]{64}", row["source_file_sha256"]):
            raise ValueError("Verification must bind the source file SHA-256")
        result[key] = row
    return result


def transaction_evidence(source, reviews):
    row = reviews.get(source["source_record_id"])
    if row and row["source_file_sha256"] != source["source_file_sha256"]:
        raise ValueError("Transaction verification source hash mismatch")
    verified = bool(row and row["verification_status"] == "approved")
    adjusted = str(source["is_adjusted_source"]).lower() == "true"
    status = "independently_verified_detail" if verified else "adjusted_estimated_source" if adjusted else "original_source_detail"
    lineage = "|".join([source["source_file_sha256"], source["source_record_id"],
                        row["evidence_source"] + "|" + row["reviewed_by"] + "|" + row["reviewed_at"] if verified else source.get("source_adjustment_policy") or ""])
    return status, lineage


def clean_label(value):
    return re.sub(r"\s+", " ", str(value or "").strip()).upper()


def proposal_attributes(title):
    """Literal text evidence only. Values remain proposals, including service keywords."""
    title = clean_label(title)
    number = r"\d+(?:\.\d+)?"
    strength = re.findall(number + r"\s*(?:MCG|MG|MEQ|IU|G)(?![A-Z])", title)
    concentration = re.findall(number + r"\s*%|" + number + r"\s*(?:MCG|MG|G)/(?:" + number + r")?\s*ML", title)
    capacity = re.findall(number + r"\s*(?:ML|CC|L)(?![A-Z])", title)
    pack = re.search(r"\b(BOX|PACK)\s+(?:OF\s+)?(\d+)\b|\b(\d+)\s*['’]S\b", title)
    unit = re.search(r"\b(BOX|PIECE|PACK|VIAL|BOTTLE|AMPOULE|ROLL|KIT)\b", title)
    return {"strength": " / ".join(strength), "concentration": " / ".join(concentration),
            "container_size": " / ".join(capacity), "packaging_unit": unit[1].title() if unit else "Unknown",
            "pack_count": next((v for v in (pack[2], pack[3]) if v), "") if pack else "",
            "item_kind": "service" if re.search(r"\b(REPAIRS?|CALIBRATION)\b", title) else "unknown"}


def compatibility(left, right):
    """Unknown is never a wildcard; absence blocks verified compatibility."""
    conflicts, missing = [], []
    for field in ATTRIBUTES:
        a, b = clean_label(left.get(field)), clean_label(right.get(field))
        if not a or not b or "UNKNOWN" in (a, b):
            missing.append(field)
        elif a != b:
            conflicts.append(field)
    return {"compatible": not conflicts and not missing, "conflicts": conflicts, "missing": missing}


def validate_master(rows):
    result, contracts = {}, {}
    for raw in rows:
        if not set(FIELDS) <= raw.keys() or any(not isinstance(v, str) for v in raw.values()):
            raise ValueError("Catalog fields missing or malformed")
        row = {k: v.strip() for k, v in raw.items()}
        key = clean_label(row["raw_product"])
        if not key or key in result:
            raise ValueError("Duplicate/empty catalog alias: " + key)
        for field in ("category_status", "identity_status", "item_kind_status", "unit_status", "forecast_status", "mapping_status"):
            if row[field] not in STATUSES:
                raise ValueError("Invalid catalog status: " + field)
        if row["product_category"] not in MEDICAL | {"non_medical", "unclassified"}:
            raise ValueError("Invalid category")
        if row["item_kind"] not in {"physical_product", "service", "unknown"}:
            raise ValueError("Invalid item kind")
        if row["forecast_eligible"] not in {"true", "false"}:
            raise ValueError("Invalid forecast eligibility")
        if any(row[f] == "approved" for f in ("category_status", "identity_status", "item_kind_status", "unit_status", "forecast_status")):
            if not all(row[f] for f in ("evidence_source", "reviewed_by", "reviewed_at")):
                raise ValueError("Approval requires independently recorded review evidence")
        if row["pack_count"] and not (row["item_kind"] == "service" and row["pack_count"] == "N/A") and (not re.fullmatch(r"[1-9][0-9]*", row["pack_count"])):
            raise ValueError("Pack count must be a positive integer")
        if row["identity_status"] == "approved":
            if not all(row[f] for f in ("canonical_sku", "canonical_title", "representative_raw_product")):
                raise ValueError("Verified identity requires stable SKU, title and representative")
            if row["item_kind_status"] != "approved" or row["item_kind"] == "unknown":
                raise ValueError("Verified identity requires reviewed item kind")
            if row["item_kind"] == "physical_product" and (
                row["unit_status"] != "approved" or not row["unit_of_measure"]
                or row["packaging_unit"] in {"", "Unknown"} or not row["pack_count"] or not row["contained_unit"]):
                raise ValueError("Verified physical identity requires reviewed sellable packaging")
            # Explicit N/A is permitted with evidence; missing attributes cannot silently match.
            if any(not row[f] or clean_label(row[f]) == "UNKNOWN" for f in ATTRIBUTES):
                raise ValueError("Verified identity requires attributes or reviewed N/A")
            contract = tuple(row[f] for f in ("canonical_title", "representative_raw_product", "item_kind", "unit_of_measure", "product_category", "category_status", "unit_status", "forecast_status", "forecast_eligible") + ATTRIBUTES)
            sku = row["canonical_sku"]
            if sku in contracts and contracts[sku] != contract:
                raise ValueError("Conflicting sellable identity: " + sku)
            contracts[sku] = contract
        if row["forecast_eligible"] == "true" and not (
            row["forecast_status"] == row["identity_status"] == row["category_status"] == row["unit_status"] == "approved"
            and row["item_kind"] == "physical_product" and row["product_category"] in MEDICAL):
            raise ValueError("Forecast requires separate identity/category/unit approval")
        result[key] = row
    for row in result.values():
        if row["identity_status"] == "approved":
            representative = result.get(clean_label(row["representative_raw_product"]))
            if not representative or representative["identity_status"] != "approved" or representative["canonical_sku"] != row["canonical_sku"]:
                raise ValueError("Stable representative must itself be a reviewed alias")
    # A verified SKU cannot have contradictory approved categories across aliases.
    categories = {}
    for row in result.values():
        if row["identity_status"] == row["category_status"] == "approved":
            sku = row["canonical_sku"]
            if sku in categories and categories[sku] != row["product_category"]:
                raise ValueError("Conflicting approved category for SKU")
            categories[sku] = row["product_category"]
    return result


def resolve(title, product_key, master):
    row = master.get(clean_label(title), {})
    verified = row.get("identity_status") == "approved"
    category = row.get("product_category") if row.get("category_status") == "approved" else "unclassified"
    sku = row.get("canonical_sku") if verified else None
    return {"canonical_group_id": "SKU:" + sku if sku else "RAW:" + product_key,
            "canonical_sku": sku, "canonical_title": row["canonical_title"] if verified else clean_label(title),
            "display_category": "Medical" if category in MEDICAL else "Non-Medical" if category == "non_medical" else "Unclassified",
            "product_category": category, "category_status": row.get("category_status", "needs_review"),
            "identity_status": "approved" if verified else "needs_review",
            "item_kind": row.get("item_kind", "unknown") if row.get("item_kind_status") == "approved" else "unknown",
            "unit_of_measure": row.get("unit_of_measure") if row.get("unit_status") == "approved" else None,
            "forecast_eligible": row.get("forecast_eligible") == "true" and row.get("forecast_status") == "approved",
            "is_duplicate": verified and clean_label(title) != clean_label(row["representative_raw_product"]),
            "catalog_evidence_source": row.get("evidence_source", ""),
            **{f: row.get(f, "") if verified else "" for f in ATTRIBUTES}}


def interchange(title, product_key, master):
    resolved = resolve(title, product_key, master)
    return {"raw_title": title, "canonical_title": resolved["canonical_title"],
            "category": resolved["display_category"], "packaging_unit": resolved["packaging_unit"] if resolved["packaging_unit"] in {"Piece", "Box", "Pack"} else "Unknown",
            "canonical_group_id": resolved["canonical_group_id"], "is_duplicate": resolved["is_duplicate"],
            "notes": "Reviewed alias; never delete transactions" if resolved["is_duplicate"] else "Display cleanup is not verified identity",
            "internal": resolved}


def import_proposals(items):
    """JSON interchange is untrusted proposal input, never an approval channel."""
    rows = []
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("raw_title"), str) or not clean_label(item["raw_title"]):
            raise ValueError("raw_title is required")
        row = dict.fromkeys(FIELDS, "")
        row.update(raw_product=item["raw_title"], canonical_title=clean_label(item.get("canonical_title") or item["raw_title"]),
                   product_category="unclassified", item_kind="unknown", forecast_eligible="false",
                   review_notes="Imported proposal; supplied approval/duplicate flags ignored")
        for field in FIELDS:
            if field.endswith("status"):
                row[field] = "proposed"
        rows.append(row)
    validate_master(rows)
    return rows
```
