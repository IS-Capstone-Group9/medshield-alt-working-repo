"""Build a governed product-classification review queue from Databricks Gold.

The input is the server-side Databricks product extract produced by
``npm run databricks:extract:products``.  This job never marks a heuristic
classification as approved.  It creates one candidate row per raw product
string so the reviewed mapping can later be published back to Databricks.
"""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_INPUT = ROOT / "outputs" / "databricks" / "products_sales_extract.json"
DEFAULT_NON_MEDICAL = (
    ROOT
    / "outputs"
    / "product_classification_review"
    / "likely_non_medical_product_candidates.csv"
)
DEFAULT_MASTER = ROOT / "datasources" / "templates" / "product_master_mapping.csv"
DEFAULT_OUTPUT = ROOT / "outputs" / "product_grouping_2017_2025"

CONTRACT_PREFIXES = (
    "PROVINCIAL TOURISM OFFICE",
    "PESO PROVINCIAL",
    "GULANG GULANG",
    "PADRE BURGOS",
    "PAGBILAO",
    "MARINDUQUE",
    "TOURISM",
    "ABOITIZ",
    "PESO",
    "PPDC",
    "PPOC",
    "QMC",
    "PHO",
)
CONTRACT_RE = re.compile(
    rf"^(?:{'|'.join(re.escape(value) for value in CONTRACT_PREFIXES)})\s*#",
    re.IGNORECASE,
)
TRANSACTION_REFERENCE_RE = re.compile(
    r"^(?:DR\s*#|PR\s+[0-9])|\bTERMS\b",
    re.IGNORECASE,
)

LAB_RULES = (
    "REAGENT",
    "TYPING SERA",
    "TEST KIT",
    "URINALYSIS",
    "MICROSCOPE SLIDE",
    "COVER SLIP",
    "BLOOD GLUCOSE TEST STRIP",
    "GLUCOSE TEST STRIP",
)
DEVICE_RULES = (
    "PATIENT MONITOR",
    "FETAL MONITOR",
    "ECG MACHINE",
    "ELECTROCARDIO",
    "ULTRASOUND",
    "DEFIBRILLATOR",
    "NEBULIZER MACHINE",
    "PORTABLE NEBULIZER",
    "OXYGEN TANK",
    "STETHOSCOPE",
    "SUCTION MACHINE",
    "INFUSION PUMP",
    "SYRINGE PUMP",
    "AUTOCLAVE MACHINE",
    "HOSPITAL BED",
    "WHEELCHAIR",
    "SPHYGMOMANOMETER",
    "PULSE OXIMETER",
    "X-RAY MACHINE",
    "XRAY MACHINE",
    "VENTILATOR",
    "THERMOMETER",
    "DOPPLER",
)
MEDICAL_SUPPLY_RULES = (
    "SYRINGE",
    "NEEDLE",
    "CATHETER",
    "GAUZE",
    "BANDAGE",
    "GLOVES",
    "PPE",
    "FACE MASK",
    "FACEMASK",
    "ISOLATION GOWN",
    "SURGICAL GOWN",
    "IV SET",
    "INFUSION SET",
    "MACROSET",
    "MICROSET",
    "CANNULA",
    "URINE BAG",
    "ENDOTRACHEAL",
    "ET TUBE",
    "SUTURE",
    "MICROPORE",
    "OPSITE",
    "COTTON ROLL",
    "BLOOD BAG",
    "SPECIMEN",
    "OXYGEN MASK",
    "OXYGEN CANNULA",
    "NASAL OXYGEN",
    "SUCTION CATH",
    "NEBULIZER MASK",
    "SURGICAL BLADE",
    "FOLEY",
    "NELATON",
    "DRESSING",
    "PLASTER",
    "TOURNIQUET",
    "AIRWAY",
    "SCALPEL",
    "THERMOMETER",
    "PREGNANCY TEST",
    "SWAB",
    "DISPOSABLE",
    "NEBULIZER KIT",
    "AUTOCLAVE TAPE",
    "MATERNITY PAD",
    "ALCOHOL",
    "POVIDONE IODINE",
    "BETADINE",
)

NON_MEDICAL_RULES: dict[str, tuple[str, ...]] = {
    "office_stationery": (
        "BALLPEN",
        "BOND PAPER",
        "CORRECTION TAPE",
        "CLEAR BOOK",
        "FOLDER",
        "RECORD BOOK",
        "STAPLE WIRE",
        "STAPLER",
        "MARKER",
        "NOTEBOOK",
        "ENVELOPE",
        "CLIP BOARD",
    ),
    "printer_it_supplies": (
        "INK EPSON",
        "COMPUTER INK",
        "PRINTER",
        "FLASH DRIVE",
        "TONER",
        "INK CARTRIDGE",
    ),
    "janitorial_cleaning": (
        "TRASH BAG",
        "BATHROOM TISSUE",
        "DETERGENT",
        "BLEACH",
        "JANITORIAL",
        "BROOM",
        "MOP",
        "INSECTICIDE",
        "SOAP",
    ),
    "equipment_appliance": (
        "AIRCON",
        "REFRIGERATOR",
        "CHILLER",
        "TELEVISION",
        "FILING CABINET",
        "DIGITAL CAMERA",
        "BUTANE STOVE",
        "MODULAR TENT",
        "UV LIGHT",
    ),
    "electrical_hardware": (
        "ELECTRICAL WIRE",
        "LIGHT BULB",
        "LAMP",
        "OUTLET",
        "BATTERY",
        "BLACK SCREW",
        "EXTENSION CORD",
    ),
    "clothing_personal": (
        "T SHIRT",
        "UNIFORM",
        "RAINCOAT",
        "SLIPPERS",
    ),
    "food_admin_other": (
        "PLAQUE",
        "TOKEN",
        "TARPAULIN",
        "SNACK",
        "MEAL",
    ),
}

MEDICINE_RE = re.compile(
    r"(?:\d+(?:\.\d+)?\s*(?:MG|MCG|ML|IU|MEQ|G)\b|\d+(?:\.\d+)?\s*%|INSULIN|"
    r"\b(?:TAB(?:LET)?S?|CAP(?:SULE)?S?|VIALS?|AMPULES?|INJ(?:ECTION)?|"
    r"SYRUP|SUSP(?:ENSION)?|ORAL SOLUTION|DROPS?|CREAM|OINTMENT|"
    r"SUPPOSITORY|VACCINE|INSULIN)\b)",
    re.IGNORECASE,
)


def clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def normalized_product(value: str) -> str:
    return clean(value).upper()


def matched_terms(name: str, terms: tuple[str, ...]) -> list[str]:
    upper = name.upper()
    return [term for term in terms if term in upper]


def read_non_medical_candidates(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return {
            normalized_product(row.get("raw_product", "")): row
            for row in csv.DictReader(handle)
            if clean(row.get("raw_product"))
        }


def valid_bool(value: str) -> bool:
    return value.strip().lower() in {"true", "false"}


def read_master(path: Path) -> tuple[dict[str, dict[str, str]], list[str]]:
    if not path.exists():
        return {}, []
    valid: dict[str, dict[str, str]] = {}
    errors: list[str] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for line_number, row in enumerate(csv.DictReader(handle), start=2):
            raw = normalized_product(row.get("raw_product", ""))
            if not raw:
                errors.append(f"line {line_number}: missing raw_product")
                continue
            if not valid_bool(clean(row.get("is_medicine"))):
                errors.append(f"line {line_number} ({raw}): invalid is_medicine")
                continue
            if not valid_bool(clean(row.get("forecast_eligible"))):
                errors.append(f"line {line_number} ({raw}): invalid forecast_eligible")
                continue
            if clean(row.get("mapping_status")).lower() not in {
                "approved",
                "proposed",
                "needs_review",
                "rejected",
            }:
                errors.append(f"line {line_number} ({raw}): invalid mapping_status")
                continue
            valid[raw] = row
    return valid, errors


def classify(
    raw_product: str,
    non_medical: dict[str, dict[str, str]],
    master: dict[str, dict[str, str]],
) -> dict[str, str]:
    name = normalized_product(raw_product)
    if not name or name in {"#REF!", "N/A", "NULL", "UNKNOWN"}:
        return {
            "product_group": "unresolved",
            "product_category": "unresolved_product_identity",
            "is_medicine_candidate": "unknown",
            "inventory_model_scope": "blocked",
            "disease_weather_model_scope": "blocked",
            "confidence": "high",
            "classification_rule": "missing_or_invalid_product_identity",
        }

    if CONTRACT_RE.search(name):
        return {
            "product_group": "non_product",
            "product_category": "contract_aggregate",
            "is_medicine_candidate": "false",
            "inventory_model_scope": "exclude_parent_row",
            "disease_weather_model_scope": "exclude",
            "confidence": "high",
            "classification_rule": "known_contract_prefix_followed_by_hash",
        }

    if TRANSACTION_REFERENCE_RE.search(name):
        return {
            "product_group": "non_product",
            "product_category": "transaction_reference",
            "is_medicine_candidate": "false",
            "inventory_model_scope": "exclude",
            "disease_weather_model_scope": "exclude",
            "confidence": "medium",
            "classification_rule": "delivery_or_purchase_reference_pattern",
        }

    existing = master.get(name)
    if existing:
        medicine = clean(existing.get("is_medicine")).lower()
        category = clean(existing.get("product_category")) or (
            "medicine" if medicine == "true" else "other"
        )
        return {
            "product_group": "medicine" if medicine == "true" else "non_medical",
            "product_category": category,
            "is_medicine_candidate": medicine,
            "inventory_model_scope": "candidate_after_approval",
            "disease_weather_model_scope": (
                "candidate_after_approval" if medicine == "true" else "exclude"
            ),
            "confidence": "medium",
            "classification_rule": "existing_unapproved_product_master",
        }

    matches = matched_terms(name, LAB_RULES)
    if matches:
        return {
            "product_group": "medical_supply",
            "product_category": "laboratory_diagnostic",
            "is_medicine_candidate": "false",
            "inventory_model_scope": "candidate_after_approval",
            "disease_weather_model_scope": "separate_model_only",
            "confidence": "high",
            "classification_rule": f"laboratory_terms:{'|'.join(matches)}",
        }

    matches = matched_terms(name, DEVICE_RULES)
    if matches:
        return {
            "product_group": "medical_device",
            "product_category": "medical_device_equipment",
            "is_medicine_candidate": "false",
            "inventory_model_scope": "candidate_after_approval",
            "disease_weather_model_scope": "separate_model_only",
            "confidence": "high",
            "classification_rule": f"medical_device_terms:{'|'.join(matches)}",
        }

    matches = matched_terms(name, MEDICAL_SUPPLY_RULES)
    if matches:
        return {
            "product_group": "medical_supply",
            "product_category": "medical_consumable",
            "is_medicine_candidate": "false",
            "inventory_model_scope": "candidate_after_approval",
            "disease_weather_model_scope": "separate_model_only",
            "confidence": "high",
            "classification_rule": f"medical_supply_terms:{'|'.join(matches)}",
        }

    candidate = non_medical.get(name)
    if candidate:
        category = clean(candidate.get("proposed_category")) or "non_medical_supply"
        return {
            "product_group": "non_medical",
            "product_category": category,
            "is_medicine_candidate": "false",
            "inventory_model_scope": "separate_business_model_only",
            "disease_weather_model_scope": "exclude",
            "confidence": "medium",
            "classification_rule": f"existing_non_medical_review:{category}",
        }

    for category, terms in NON_MEDICAL_RULES.items():
        matches = matched_terms(name, terms)
        if matches:
            return {
                "product_group": "non_medical",
                "product_category": category,
                "is_medicine_candidate": "false",
                "inventory_model_scope": "separate_business_model_only",
                "disease_weather_model_scope": "exclude",
                "confidence": "medium",
                "classification_rule": f"non_medical_terms:{'|'.join(matches)}",
            }

    if MEDICINE_RE.search(name):
        return {
            "product_group": "medicine",
            "product_category": "pharmaceutical_medicine_candidate",
            "is_medicine_candidate": "true",
            "inventory_model_scope": "candidate_after_approval",
            "disease_weather_model_scope": "candidate_after_approval",
            "confidence": "medium",
            "classification_rule": "dosage_strength_or_form_pattern",
        }

    return {
        "product_group": "unresolved",
        "product_category": "unclassified_product_candidate",
        "is_medicine_candidate": "unknown",
        "inventory_model_scope": "blocked",
        "disease_weather_model_scope": "blocked",
        "confidence": "low",
        "classification_rule": "no_governed_rule_match",
    }


def raw_string_abc(rows: list[dict[str, Any]]) -> dict[str, str]:
    eligible = [
        row
        for row in rows
        if row["classification"]["product_group"] != "non_product"
    ]
    total = sum(float(row["total_net_sales"] or 0) for row in eligible)
    running = 0.0
    result: dict[str, str] = {}
    for row in sorted(
        eligible, key=lambda value: float(value["total_net_sales"] or 0), reverse=True
    ):
        before = running / total if total else 0
        result[row["product_name"]] = "A" if before < 0.80 else "B" if before < 0.95 else "C"
        running += float(row["total_net_sales"] or 0)
    return result


def main() -> None:
    payload = json.loads(DEFAULT_INPUT.read_text(encoding="utf-8"))
    products = payload.get("products", [])
    non_medical = read_non_medical_candidates(DEFAULT_NON_MEDICAL)
    master, master_errors = read_master(DEFAULT_MASTER)

    classified: list[dict[str, Any]] = []
    for product in products:
        raw = clean(product.get("product_name"))
        classified.append(
            {
                **product,
                "product_name": raw,
                "classification": classify(raw, non_medical, master),
            }
        )

    abc = raw_string_abc(classified)
    output_rows: list[dict[str, Any]] = []
    for row in classified:
        classification = row["classification"]
        raw = row["product_name"]
        output_rows.append(
            {
                "raw_product": raw,
                "normalized_product": normalized_product(raw),
                "proposed_canonical_sku": normalized_product(raw),
                **classification,
                "raw_string_abc_candidate": abc.get(raw, "EXCLUDED"),
                "mapping_status": "needs_review",
                "total_transactions": row.get("total_transactions", "0"),
                "total_quantity": row.get("total_quantity", "0"),
                "total_net_sales": row.get("total_net_sales", "0"),
                "total_gross_margin": row.get("total_gross_margin", "0"),
                "first_year": row.get("first_year", ""),
                "last_year": row.get("last_year", ""),
                "review_notes": "Confirm category and canonical SKU before Databricks publication.",
            }
        )

    output_rows.sort(
        key=lambda row: (-float(row["total_net_sales"] or 0), row["raw_product"])
    )
    fields = list(output_rows[0]) if output_rows else []
    DEFAULT_OUTPUT.mkdir(parents=True, exist_ok=True)
    csv_path = DEFAULT_OUTPUT / "product_classification_candidates.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(output_rows)

    group_summary: dict[str, dict[str, float]] = defaultdict(
        lambda: {"products": 0, "transactions": 0, "net_sales": 0.0}
    )
    for row in output_rows:
        summary = group_summary[row["product_group"]]
        summary["products"] += 1
        summary["transactions"] += int(float(row["total_transactions"] or 0))
        summary["net_sales"] += float(row["total_net_sales"] or 0)

    total_sales = sum(item["net_sales"] for item in group_summary.values())
    summary_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": str(DEFAULT_INPUT.relative_to(ROOT)).replace("\\", "/"),
        "source_dataset": payload.get("dataset"),
        "source_view": payload.get("source_view"),
        "source_extracted_at": payload.get("extracted_at"),
        "period": "2017-2025",
        "raw_products": len(output_rows),
        "mapping_status": "candidate_needs_owner_review",
        "master_validation_errors": master_errors,
        "groups": {
            key: {
                "products": int(value["products"]),
                "transactions": int(value["transactions"]),
                "net_sales": round(value["net_sales"], 2),
                "net_sales_share": round(value["net_sales"] / total_sales, 6)
                if total_sales
                else 0,
            }
            for key, value in sorted(group_summary.items())
        },
    }
    (DEFAULT_OUTPUT / "product_classification_summary.json").write_text(
        json.dumps(summary_payload, indent=2) + "\n", encoding="utf-8"
    )

    lines = [
        "# Product Grouping Review, 2017-2025",
        "",
        f"Source: `{summary_payload['source_view']}` extracted {payload.get('extracted_at')}",
        "",
        "All classifications are review candidates. No heuristic row is approved automatically.",
        "",
        "| Product group | Raw product strings | Transactions | Net sales | Share |",
        "|---|---:|---:|---:|---:|",
    ]
    for key, value in summary_payload["groups"].items():
        lines.append(
            f"| {key} | {value['products']:,} | {value['transactions']:,} | "
            f"{value['net_sales']:,.2f} | {value['net_sales_share']:.1%} |"
        )
    lines.extend(
        [
            "",
            "## Governance rules",
            "",
            "- Contract aggregates and transaction references are excluded as product SKUs.",
            "- Medical supplies and devices remain separate from pharmaceutical medicines.",
            "- Non-medical business supplies remain reportable but are excluded from disease/weather medicine models.",
            "- Unresolved products remain blocked until a product owner approves a category and canonical SKU.",
            "- ABC is calculated on raw strings only and must be recalculated after approved alias consolidation.",
            "",
            "## Product-master validation",
            "",
        ]
    )
    if master_errors:
        lines.extend(f"- {message}" for message in master_errors)
    else:
        lines.append("- Existing product-master rows passed structural validation.")
    (DEFAULT_OUTPUT / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(json.dumps(summary_payload, indent=2))


if __name__ == "__main__":
    main()
