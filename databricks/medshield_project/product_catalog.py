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
