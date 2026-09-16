"""Local read-only source investigation; writes review evidence, never source repairs.

Run from any directory: python audit_missing_identity.py
Uses the same AST-extracted pure notebook helpers as the local regression suite.
Receipt matches and neighboring labels are leads, never inferred product identities.
"""
import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
import sys
import zipfile
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE / "tests"))
from test_restart import pure_notebook_namespace


def run():
    bronze = pure_notebook_namespace("01_sales_bronze.py")
    silver = pure_notebook_namespace("02_sales_silver.py")
    sources, manifest = [], []
    for file in sorted((ROOT / "data/medshield/dataset_csv").glob("medshield_data_*.csv")):
        payload = file.read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        manifest.append({"file": file.name, "sha256": digest})
        for number, line in enumerate(bronze["decode_csv_source"](payload, file.name), 1):
            sources.append(dict(dataset_id="local_identity_audit", source_workbook=file.name,
                source_record_id=bronze["source_record_key"](file.name, digest, number),
                data_source_year=int(file.stem.rsplit("_", 1)[-1]), source_file_sha256=digest,
                source_row_number=number, source_path=str(file), raw_csv_line=line))
    assessed = silver["assess_sales_records"](sources)
    assert len(assessed) == len(sources)
    assert Counter(r["source_record_id"] for r in assessed) == Counter(r["source_record_id"] for r in sources)
    by_file_row = {(r["source_workbook"], r["source_row_number"]): r for r in assessed}
    receipts = defaultdict(list)
    for row in assessed:
        if row["product"] and row["dr_number"] and row["date_delivered"] and not row["is_area_placeholder"]:
            receipts[(row["source_workbook"], row["dr_number"], row["date_delivered"], row["area"])].append(row)
    # Inspect underlying OOXML, not displayed formatting, for available source sheets.
    ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    workbook = ROOT / "Sales Report.xlsx"
    sheets, workbook_info = {}, {}
    if workbook.is_file():
        workbook_info["sha256"] = hashlib.sha256(workbook.read_bytes()).hexdigest()
        with zipfile.ZipFile(workbook) as archive:
            shared = []
            if "xl/sharedStrings.xml" in archive.namelist():
                shared = ["".join(t.text or "" for t in e.iterfind(".//s:t", ns))
                          for e in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
            book = ET.fromstring(archive.read("xl/workbook.xml"))
            rels = {r.attrib["Id"]: r.attrib["Target"] for r in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
            for sheet in book.findall("s:sheets/s:sheet", ns):
                relation = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
                target = rels[relation]
                target = target.lstrip("/") if target.startswith("/") else "xl/" + target
                tree = ET.fromstring(archive.read(target))
                cells = {}
                for cell in tree.findall(".//s:sheetData/s:row/s:c", ns):
                    value = cell.findtext("s:v", default="", namespaces=ns)
                    if cell.attrib.get("t") == "s":
                        value = shared[int(value)] if value else ""
                    elif cell.attrib.get("t") == "inlineStr":
                        value = "".join(t.text or "" for t in cell.iterfind(".//s:t", ns))
                    cells[cell.attrib["r"]] = value
                sheets[sheet.attrib["name"]] = cells
                workbook_info[sheet.attrib["name"]] = {"merged_ranges": [m.attrib["ref"] for m in tree.findall(".//s:mergeCell", ns)]}
    review = []
    for row in assessed:
        if row["disposition"] != "REVIEW_INVALID_TRANSACTION_IDENTITY":
            continue
        number, year = row["source_row_number"], row["data_source_year"]
        raw_product = str(row["product_raw"] or "").strip()
        kind = "PRODUCT_PRESENT_DATE_UNRESOLVED"
        if not row["product"]:
            if raw_product.upper() in silver["INVALID_TOKENS"]:
                kind = "SOURCE_PRODUCT_ERROR_TOKEN"
            elif not row["dr_number"] and not row["date_delivered"] and row["is_area_placeholder"]:
                kind = "NO_IDENTITY_SUMMARY_OR_INCOMPLETE_REVIEW"
            elif any(row[k] not in (None, 0) for k in ("quantity", "gross_sales", "net_sales", "total_acquisition_cost")):
                kind = "BLANK_PRODUCT_WITH_NUMERIC_ACTIVITY"
            else:
                kind = "BLANK_PRODUCT_WITHOUT_NONZERO_MEASURES"
        matches = receipts.get((row["source_workbook"], row["dr_number"], row["date_delivered"], row["area"]), [])
        neighbors = [by_file_row.get((row["source_workbook"], number + offset), {}) for offset in (-1, 1)]
        cells = sheets.get(str(year))
        workbook_status = "SOURCE_YEAR_SHEET_UNAVAILABLE"
        if cells is not None:
            # Compare receipt and area as anchors before calling the same row corroboration.
            same_receipt = silver["normalized_dr"](cells.get(f"B{number}", "")) == row["dr_number"]
            same_area = silver["normalized_text"](cells.get(f"A{number}", "")) == silver["normalized_text"](row["area_raw"])
            if not same_receipt or not same_area or not row["dr_number"]:
                workbook_status = "ROW_ALIGNMENT_NOT_ESTABLISHED"
            else:
                value = silver["normalized_text"](cells.get(f"D{number}", ""))
                workbook_status = "ALIGNED_WORKBOOK_PRODUCT_ABSENT" if value is None else "ALIGNED_WORKBOOK_PRODUCT_PRESENT"
        review.append(dict(source_workbook=row["source_workbook"], source_row_number=number,
            source_record_id=row["source_record_id"], source_file_sha256=row["source_file_sha256"],
            category=kind, product_raw=raw_product, date_raw=row["date_delivered_raw"],
            area_raw=row["area_raw"], dr_raw=row["dr_number_raw"],
            quantity=row["quantity"], net_sales=row["net_sales"],
            same_receipt_product_labels=json.dumps(sorted({r["product"] for r in matches})),
            same_receipt_source_rows=json.dumps([r["source_row_number"] for r in matches]),
            previous_product=neighbors[0].get("product_raw"), next_product=neighbors[1].get("product_raw"),
            workbook_evidence=workbook_status, resolution="UNRESOLVED_NO_PRODUCT_INFERRED"))
    output = ROOT / "outputs/identity_review"
    output.mkdir(parents=True, exist_ok=True)
    if review:
        with (output / "identity_review.csv").open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(review[0]))
            writer.writeheader()
            writer.writerows(review)
    serial_repairs = [dict(source_workbook=r["source_workbook"], source_row_number=r["source_row_number"],
        original_date=r["date_delivered_raw"], parsed_date=str(r["date_delivered"]), disposition=r["disposition"])
        for r in assessed if "EXCEL_SERIAL_DELIVERY_DATE_PARSED" in r["quality_rule_codes"]
        and ("," in str(r["date_delivered_raw"]) or "." in str(r["date_delivered_raw"]))]
    result = dict(source_manifest=manifest, source_rows=len(sources),
        silver_version=silver["SILVER_VERSION"],
        silver_code_sha256=hashlib.sha256((HERE / "02_sales_silver.py").read_bytes()).hexdigest(),
        formatted_serial_date_records=serial_repairs,
        retained_candidates=sum(r["is_analysis_candidate"] for r in assessed),
        identity_review_rows=len(review), missing_product_rows=sum(not r["product"] for r in assessed if r["disposition"] == "REVIEW_INVALID_TRANSACTION_IDENTITY"),
        categories=dict(Counter(r["category"] for r in review)),
        workbook_evidence=dict(Counter(r["workbook_evidence"] for r in review)),
        receipt_leads=sum(r["same_receipt_product_labels"] != "[]" for r in review),
        dispositions=dict(Counter(r["disposition"] for r in assessed)), workbook=workbook_info,
        limitation="Receipt matches and adjacent labels are review leads only; no product identities were inferred.")
    (output / "identity_review_summary.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k not in {"source_manifest", "workbook"}}, indent=2))


if __name__ == "__main__":
    run()
