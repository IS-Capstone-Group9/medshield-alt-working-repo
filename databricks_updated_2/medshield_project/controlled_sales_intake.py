# Databricks notebook source
"""Bounded client CSV intake. Independent candidates; never changes serving pins.

source_record_id is a file-local row reference, not a verified business line ID.
Corrections create new independent submissions; complete-period replacement and
publication require a separately reviewed release, never an append to live sales.
"""
import csv
import hashlib
import io
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

POLICY = "client_sales_csv_v1"
COLUMNS = ["source_record_id", "delivery_date", "dr_number", "product", "area", "quantity", "net_sales", "gross_profit"]
MASTER_HASH = "470afb59b6ef3f720c54c3d1bb27345ae1629665917b361c10362f8fb2d9f74c"
CATEGORIES = {"medicine", "medical_supply", "medical_equipment", "non_medical", "unclassified"}


def digest(value):
    return hashlib.sha256(value).hexdigest()


def normalized(value):
    return " ".join(unicodedata.normalize("NFKC", value).upper().split())


def load_categories(data, expected_hash=MASTER_HASH):
    if digest(data) != expected_hash:
        raise ValueError("Approved category reference hash mismatch")
    reader = csv.DictReader(io.StringIO(data.decode("utf-8-sig"), newline=""), strict=True)
    if not {"raw_product", "product_category", "category_status"}.issubset(reader.fieldnames or []):
        raise ValueError("Invalid category reference header")
    result = {}
    for row in reader:
        if row["category_status"] != "approved":
            continue
        key, category = normalized(row["raw_product"]), row["product_category"]
        if not key or category not in CATEGORIES:
            raise ValueError("Invalid approved category")
        if key in result and result[key] != category:
            raise ValueError("Conflicting approved categories")
        result[key] = category
    if not result:
        raise ValueError("No approved category mappings")
    return result


def number(value, optional=False, quantity=False):
    if optional and value == "":
        return None
    pattern = r"-?[0-9]{1,14}(?:\.[0-9]{1,6})?" if quantity else r"-?[0-9]{1,14}(?:\.[0-9]{1,2})?"
    if not re.fullmatch(pattern, value):
        raise ValueError("Invalid numeric format")
    try:
        return Decimal(value)
    except InvalidOperation:
        raise ValueError("Invalid numeric format") from None


def intake_rows(data):
    """Match the gateway's quoted-field contract, including embedded newlines."""
    if not 0 < len(data) <= 10 * 1024 * 1024:
        raise ValueError("CSV size outside intake limit")
    text = data.decode("utf-8-sig")
    if "\0" in text:
        raise ValueError("Binary data is not CSV")
    # csv.reader(strict=True) accepts stray quotes within unquoted fields; the
    # gateway deliberately rejects those, so validate quote placement first.
    quoted = closed = occupied = False
    index = 0
    while index < len(text):
        char = text[index]
        if quoted:
            if char == '"' and index + 1 < len(text) and text[index + 1] == '"':
                index += 1
            elif char == '"':
                quoted, closed = False, True
        elif char in ",\r\n":
            occupied = closed = False
        elif char == '"' and not occupied and not closed:
            quoted = True
        else:
            if closed or char == '"':
                raise ValueError("Malformed CSV quoting")
            occupied = True
        index += 1
    if quoted:
        raise ValueError("Unclosed quoted CSV field")
    rows = list(csv.reader(io.StringIO(text, newline=""), strict=True))
    if not rows or rows[0] != COLUMNS or not 1 <= len(rows) - 1 <= 100000:
        raise ValueError("CSV header or record count invalid")
    if any(len(r) != len(COLUMNS) or any(len(v) > 10000 for v in r) for r in rows[1:]):
        raise ValueError("CSV column count or field length invalid")
    return rows


def assess(data, categories):
    rows = intake_rows(data)
    ids = Counter(r[0] for r in rows[1:])
    bronze, silver, issues, classifications = [], [], [], {}
    totals = defaultdict(lambda: {"record_count": 0, "net_sales": Decimal(0), "gross_profit": Decimal(0), "gross_profit_record_count": 0})
    for ordinal, cells in enumerate(rows[1:], 1):
        raw = dict(zip(COLUMNS, cells))
        bronze.append({"row_number": ordinal, "raw": raw})
        faults = []
        if not raw["source_record_id"].strip() or ids[raw["source_record_id"]] != 1:
            faults.append("SOURCE_RECORD_ID_MISSING_OR_DUPLICATE")
        if not raw["product"].strip() or not raw["area"].strip():
            faults.append("PRODUCT_OR_AREA_MISSING")
        try:
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw["delivery_date"]):
                raise ValueError()
            delivery = date.fromisoformat(raw["delivery_date"])
            if delivery.year < 2017:
                raise ValueError()
        except ValueError:
            faults.append("INVALID_DELIVERY_DATE")
        net = profit = quantity = None
        for field in ("net_sales", "gross_profit", "quantity"):
            try:
                value = number(raw[field], optional=field != "net_sales", quantity=field == "quantity")
                if field == "net_sales":
                    net = value
                elif field == "gross_profit":
                    profit = value
                else:
                    quantity = value
            except ValueError:
                faults.append("INVALID_" + field.upper())
        category = categories.get(normalized(raw["product"]), "unclassified")
        basis = "approved_reference_exact_normalized" if normalized(raw["product"]) in categories else "unmatched"
        review = category == "unclassified"
        key = (raw["product"], category, basis)
        classifications[key] = classifications.get(key, 0) + 1
        for fault in faults:
            issues.append({"row_number": ordinal, "source_record_id": raw["source_record_id"], "issue": fault})
        if review:
            issues.append({"row_number": ordinal, "source_record_id": raw["source_record_id"], "issue": "CATEGORY_REVIEW_REQUIRED"})
        silver.append({"row_number": ordinal, "source_record_id": raw["source_record_id"], "quality_status": "REJECTED" if faults else "VALID", "issues": faults,
                       "delivery_date": raw["delivery_date"], "dr_number": raw["dr_number"], "product": raw["product"], "area": raw["area"], "net_sales": str(net) if net is not None else None,
                       "gross_profit": str(profit) if profit is not None else None, "reported_quantity": str(quantity) if quantity is not None else None,
                       "product_category": category, "category_basis": basis, "category_review_required": review,
                       "identity_status": "needs_review", "unit_status": "needs_review", "forecast_eligible": False})
        if not faults:
            group = totals[(delivery.isoformat()[:7], raw["product"], raw["area"], category)]
            group["record_count"] += 1
            group["net_sales"] += net
            if profit is not None:
                group["gross_profit"] += profit
                group["gross_profit_record_count"] += 1
    gold = [{"calendar_month": k[0], "product": k[1], "area": k[2], "product_category": k[3], **{field: str(value) if isinstance(value, Decimal) else value for field, value in v.items()}} for k, v in sorted(totals.items())]
    valid = [r for r in silver if r["quality_status"] == "VALID"]
    counts = {"received": len(bronze), "accepted": len(valid), "rejected": len(silver) - len(valid), "category_review": sum(r["category_review_required"] for r in silver)}
    net_total = sum((Decimal(r["net_sales"]) for r in valid), Decimal(0))
    assert counts["received"] == counts["accepted"] + counts["rejected"]
    assert sum((Decimal(r["net_sales"]) for r in gold), Decimal(0)) == net_total
    return {"bronze": bronze, "silver": silver, "gold": gold, "issues": issues,
            "classifications": [{"product": k[0], "category": k[1], "basis": k[2], "record_count": v} for k, v in sorted(classifications.items())],
            "counts": counts, "net_sales_candidate": str(net_total), "status": "NEEDS_REVIEW" if counts["rejected"] or counts["category_review"] else "READY_FOR_APPROVAL"}


def safe_csv(rows, columns):
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=columns, lineterminator="\r\n")
    writer.writeheader()
    for row in rows:
        # Spreadsheet formula injection protection; raw Bronze bytes are preserved separately.
        writer.writerow({key: "'" + value if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")) else value for key, value in row.items()})
    return output.getvalue().encode("utf-8-sig")


def report_artifacts(result, ingestion_id, source_hash):
    """Bind download bytes before the terminal report can become visible."""
    artifacts = {"issues.csv": safe_csv(result["issues"], ["row_number", "source_record_id", "issue"]),
                 "classifications.csv": safe_csv(result["classifications"], ["product", "category", "basis", "record_count"])}
    if any(len(content) > 64 * 1024 * 1024 for content in artifacts.values()):
        raise ValueError("Intake report exceeds download limit")
    report = {"schema_version": 1, "ingestion_id": ingestion_id, "source_sha256": source_hash, "policy_version": POLICY,
              "category_reference_sha256": MASTER_HASH, "candidate_only": True, "published": False,
              "status": result["status"], "counts": result["counts"], "net_sales_candidate": result["net_sales_candidate"],
              "reports": {name[:-4]: {"sha256": digest(content), "bytes": len(content)} for name, content in artifacts.items()},
              "message": "Candidate staged. Review issues and record release approval; the dashboard release has not changed."}
    artifacts["report.json"] = json.dumps(report, sort_keys=True).encode("utf-8")
    return report, artifacts


def write_artifacts(base, artifacts):
    """Never overwrite evidence; terminal report is last and follows readback.

    An interrupted partial file is an identity conflict requiring operator
    inspection, never a successful candidate report or an automatic overwrite.
    """
    ordered = sorted(artifacts, key=lambda name: name == "report.json")
    for name in ordered:
        target = base / name
        if target.exists() and target.read_bytes() != artifacts[name]:
            raise ValueError("Report identity conflict")
    for name in ordered:
        target, content = base / name, artifacts[name]
        try:
            with target.open("xb") as handle:
                handle.write(content)
        except FileExistsError:
            pass
        if target.read_bytes() != content:
            raise ValueError("Report readback identity conflict")


def valid_parameters(ingestion_id, volume, schema):
    if not re.fullmatch(r"[a-f0-9]{64}", ingestion_id) or not re.fullmatch(r"/Volumes/[A-Za-z_]\w*/[A-Za-z_]\w*/[A-Za-z_]\w*", volume) or not re.fullmatch(r"[A-Za-z_]\w*\.medshield_intake", schema):
        raise ValueError("Invalid intake job parameters")


def load_submission(volume, ingestion_id):
    """Read and verify the immutable submission written by the gateway; shared by every pipeline stage."""
    base = Path(volume) / "submissions" / ingestion_id
    manifest = json.loads((base / "manifest.json").read_text("utf-8"))
    data = (base / "source.csv").read_bytes()
    source_hash = digest(data)
    if (type(manifest.get("schema_version")) is not int or manifest["schema_version"] != 1
            or type(manifest.get("account_id")) is not int or manifest["account_id"] <= 0
            or type(manifest.get("source_bytes")) is not int or type(manifest.get("record_count")) is not int
            or manifest.get("policy_version") != POLICY or manifest.get("ingestion_id") != ingestion_id
            or manifest.get("source_sha256") != source_hash or manifest.get("source_bytes") != len(data)):
        raise ValueError("Source evidence identity mismatch")
    if digest(f'{POLICY}:{manifest["account_id"]}:{source_hash}'.encode()) != ingestion_id:
        raise ValueError("Source owner identity mismatch")
    return base, manifest, data, source_hash


def envelope_fields():
    from pyspark.sql.types import StructType, StructField, StringType, DecimalType
    return StructType([StructField("ingestion_id", StringType(), False), StructField("record_key", StringType(), False), StructField("source_sha256", StringType(), False), StructField("policy_version", StringType(), False), StructField("category_reference_sha256", StringType(), False), StructField("payload_sha256", StringType(), False), StructField("payload_json", StringType(), False), StructField("net_sales", DecimalType(24, 2), True)])


def merge_layer(spark, table, fields, envelopes, ingestion_id):
    """Insert-only MERGE of one submission's immutable envelopes, with conflict check and exact readback."""
    frame = spark.createDataFrame(envelopes, fields)
    frame.createOrReplaceTempView("intake_current_layer")
    spark.sql(f"CREATE TABLE IF NOT EXISTS {table} (ingestion_id STRING, record_key STRING, source_sha256 STRING, policy_version STRING, category_reference_sha256 STRING, payload_sha256 STRING, payload_json STRING, net_sales DECIMAL(24,2)) USING DELTA")
    conflict = spark.sql(f"SELECT 1 FROM {table} t JOIN intake_current_layer s ON t.ingestion_id=s.ingestion_id AND t.record_key=s.record_key WHERE t.payload_sha256<>s.payload_sha256 LIMIT 1").count()
    if conflict:
        raise ValueError("Existing candidate conflicts with immutable intake")
    spark.sql(f"MERGE INTO {table} t USING intake_current_layer s ON t.ingestion_id=s.ingestion_id AND t.record_key=s.record_key WHEN NOT MATCHED THEN INSERT *")
    # Read back exact row payload identities and decimal totals before issuing the report.
    saved = spark.table(table).where(f"ingestion_id = '{ingestion_id}'").select(*fields.fieldNames()).collect()
    if len(saved) != len(envelopes) or {tuple(r) for r in saved} != set(envelopes):
        raise ValueError("Candidate readback failed")


def run_intake(spark, dbutils):
    for key in ("ingestion_id", "volume", "candidate_schema"):
        dbutils.widgets.text(key, "")
    ingestion_id, volume, schema = [dbutils.widgets.get(k) for k in ("ingestion_id", "volume", "candidate_schema")]
    valid_parameters(ingestion_id, volume, schema)
    base, manifest, data, source_hash = load_submission(volume, ingestion_id)
    categories = load_categories((Path(volume) / "references" / "accepted_product_master.csv").read_bytes())
    result = assess(data, categories)
    if result["counts"]["received"] != manifest["record_count"]:
        raise ValueError("Source count mismatch")
    # Each envelope is an immutable record within ONE submission snapshot, not an append to live sales.
    fields = envelope_fields()
    for layer in ("bronze", "silver", "gold"):
        table = f"{schema}.{layer}_sales_candidate"
        envelopes = []
        for ordinal, payload in enumerate(result[layer], 1):
            encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            amount = Decimal(payload["net_sales"]) if layer == "gold" or (layer == "silver" and payload["quality_status"] == "VALID") else None
            envelopes.append((ingestion_id, str(ordinal), source_hash, POLICY, MASTER_HASH, digest(encoded.encode()), encoded, amount))
        merge_layer(spark, table, fields, envelopes, ingestion_id)
    report, artifacts = report_artifacts(result, ingestion_id, source_hash)
    write_artifacts(base, artifacts)
    dbutils.notebook.exit(json.dumps(report))


if "dbutils" in globals() and "spark" in globals():
    run_intake(spark, dbutils)
