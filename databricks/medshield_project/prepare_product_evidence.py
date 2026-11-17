"""Create a pending review queue from the locally found 2026 price list.

Candidate brand matches are evidence leads, never SKU or historical-unit approvals.
"""
import csv
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "outputs/catalog_preparation/product_evidence"
SOURCE = Path("C:/Users/Adrian/Capstone-Codes/2026 PRICELIST.pdf")


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def main():
    tables = json.loads((OUTPUT / "price_list_tables.json").read_text(encoding="utf-8"))
    presentations = []
    for page, page_tables in enumerate(tables, 1):
        for table_index, table in enumerate(page_tables, 1):
            generic = ""
            for row_number, row in enumerate(table, 1):
                if len(row) != 7 or not row[1] or row[1] == "BRAND NAME" or not row[3]:
                    continue
                generic = clean(row[0]) or generic
                # Wrapped brand text may split a word; retain the untouched source as well.
                brand_text = row[1].replace("\n", "")
                brands = [clean(b) for b in brand_text.split("/")]
                presentations.append({"evidence_id": f"PL2026-P{page}-T{table_index}-R{row_number}",
                    "page": page, "generic_description": generic, "brand_text": clean(row[1]),
                    "brand_candidates": brands, "dosage_form_as_printed": clean(row[2]),
                    "sku_column_as_printed": clean(row[3]), "package_qty_as_printed": clean(row[4]),
                    "price_cp_as_printed": clean(row[5]), "price_cp_unit_as_printed": clean(row[6]),
                    "raw_table_row": row, "status": "DOCUMENT_EXTRACT_NOT_APPROVED"})
    labels_receipt = json.loads((ROOT / "outputs/product_master_population_20261007/current_labels.json").read_text(encoding="utf-8"))
    labels = labels_receipt["labels"]
    matches = []
    for label in labels:
        hits = []
        for presentation in presentations:
            for brand in presentation["brand_candidates"]:
                if len(re.sub(r"[^A-Za-z0-9]", "", brand)) < 4:
                    continue
                pattern = r"(?<![A-Z0-9])" + re.escape(brand.upper()).replace(r"\-", "[- ]?").replace(r"\ ", "[- ]?") + r"(?![A-Z0-9])"
                if re.search(pattern, label["raw_product"].upper()):
                    hits.append(presentation)
                    break
        if hits:
            matches.append({**label, "match_method": "BRAND_TEXT_CANDIDATE_ONLY", "catalog_candidates": hits,
                "pending": ["Match full strength, concentration, form and container to the actual item sold",
                    "Obtain stable product code and historical invoice/packaging evidence",
                    "Verify historical quantity means box, vial, ampoule or another unit",
                    "Record actual business reviewer and date"],
                "status": "NEEDS_REVIEW", "forecast_eligible": False})
    matches.sort(key=lambda r: (-float(r.get("positive_sales") or 0), r["raw_product"]))
    pilot = matches[:20]
    master = ROOT / "databricks/medshield_project/references/product_master_review.csv"
    with master.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == 4561
    assert not any(r["identity_status"] == "approved" or r["unit_status"] == "approved" or r["forecast_eligible"] != "false" for r in rows)
    inventory = []
    for path in [SOURCE, Path("C:/Users/Adrian/Downloads/2026 PRICELIST.pdf"), Path("C:/Users/Adrian/Downloads/2026-PRICELIST-1.pdf")]:
        inventory.append({"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "pages": 3})
    assert len({r["sha256"] for r in inventory}) == 1
    payload = {"status": "PENDING_PRODUCT_REVIEW_NOT_DEPLOYED", "source_inventory": inventory,
        "catalog_year": 2026, "fact_version": labels_receipt["fact_delta_version"],
        "master_sha256_unchanged": hashlib.sha256(master.read_bytes()).hexdigest(),
        "limitations": ["The document's SKU field describes packaging, not a unique code",
            "QTY is package contents, not historical sales quantity",
            "2026 package descriptions cannot establish 2017-2025 sales units",
            "Keep printed prices separate from historical selling price and acquisition cost",
            "Slash-separated brands and repeated brands require separate presentation review",
            "Preserve source spellings and resolve document inconsistencies from product labels"],
        "presentations": presentations, "candidate_matches": matches, "pilot": pilot,
        "approved_categories": 0, "approved_identity": 0, "approved_units": 0, "forecast_enabled": 0}
    (OUTPUT / "review_candidates.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    lines = ["# Product evidence found locally", "", "Status: pending review; no product approvals or Databricks deployment.", "",
        f"Found `{SOURCE}` and two byte-identical Downloads copies (SHA-256 `{inventory[0]['sha256']}`).",
        "All three pages were extracted and visually inspected. The document is the MedShield Pharma Corp. standard injectable price list for 2026.", "",
        f"Extracted {len(presentations)} presentation rows; {len(matches)} historical sales labels have a brand-text candidate. These are leads, not verified matches.", "",
        "## Start with these 20 labels", "", "Ordered by positive sales contribution in the fact-version-19 label receipt. A larger amount sets review priority; it does not prove identity.", "",
        "| Historical sales label | Positive sales (PHP) | Catalog candidates | Review status |", "|---|---:|---|---|"]
    for row in pilot:
        candidate_text = "; ".join(f"p.{p['page']} {p['brand_text']} / {p['generic_description']} / {p['sku_column_as_printed']}" for p in row["catalog_candidates"])
        lines.append(f"| {row['raw_product'].replace('|','/')} | {float(row.get('positive_sales') or 0):,.2f} | {candidate_text.replace('|','/')} | Needs review |")
    lines += ["", "## Finish the pending fields", "", "1. Check each full catalog presentation against the source label and the actual product label. Resolve multiple brand or strength alternatives before mapping aliases.",
        "2. Find an invoice or delivery record for the historical sale showing the product code and whether its quantity counts boxes, individual ampoules/vials, or another unit. The price list alone cannot answer this.",
        "3. Enter the supported product details in the authoritative product master. Record the evidence ID, page, file hash, reviewer, review date and unresolved questions. Approve each decision separately only when supported.",
        "4. Keep forecast eligibility false until identity, category, historical unit and forecasting suitability are accepted. Adjusted-source transactions additionally need independent transaction evidence.",
        "5. Revalidate the master and regenerate the publication contract/package after any CSV change. The version-19 draft package is bound to the exact unchanged CSV bytes.", "",
        "## Specific issues to resolve", "", "- NORBIT appears under both norepinephrine and nicardipine; a brand-only join would be unsafe.",
        "- EVAPROST has two printed concentration/presentation entries; preserve them separately pending product-label verification.",
        "- Slash-separated brands are alternatives, not proof that products share one sellable identity.",
        "- Printed prices are contemporary catalog prices. Do not overwrite historical prices or acquisition costs.", "",
        "No purchase invoices, supplier SKU records or historical packaging records were identified by the local filename search. This is a search result, not proof that no such records exist.",
        "The canonical 4,561-row CSV is unchanged; identity/unit approvals remain zero.", "",
        "Full source rows and all matching candidates are in `review_candidates.json` beside this guide."]
    (OUTPUT / "REVIEW_QUEUE.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"presentations": len(presentations), "candidate_labels": len(matches), "pilot": len(pilot), "master_unchanged": payload["master_sha256_unchanged"], "approved": 0}))


if __name__ == "__main__":
    main()
