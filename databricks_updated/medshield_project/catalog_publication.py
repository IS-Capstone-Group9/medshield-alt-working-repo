"""Validate draft and category-only publication without warehouse writes."""
import csv
from datetime import datetime
import hashlib
import json
import re
from pathlib import Path, PurePosixPath

if "validate_master" not in globals():
    from product_catalog import clean_label, validate_master

MUTABLE_FIELDS = {"category_status", "catalog_evidence_source", "product_master_sha256", "gold_published_at"}
DRAFT_MODE = "unapproved_draft_metadata_only"
CATEGORY_MODE = "category_acceptance_only"
CATEGORY_MUTABLE_FIELDS = MUTABLE_FIELDS | {"product_category", "display_category", "product_scope_status"}
PRESERVED_DEMAND_FIELDS = ("is_product_ranking_candidate", "is_positive_delivery_quantity_eligible", "is_provisional_product_demand_eligible")
CATEGORIES = {"medicine", "medical_supply", "medical_equipment", "non_medical", "unclassified"}
REVIEW_FIELDS = {"product_category", "category_status", "evidence_source", "reviewed_by", "reviewed_at", "review_notes"}


def _bound_path(root, relative):
    if not isinstance(relative, str) or not relative or "\\" in relative or ":" in relative or PurePosixPath(relative).is_absolute() or ".." in PurePosixPath(relative).parts:
        raise ValueError("Expected a project-relative artifact path")
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError("Artifact must remain inside this project")
    return path


def _sha(value):
    return isinstance(value, str) and re.fullmatch(r"[a-f0-9]{64}", value) is not None


def _timestamp(value):
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00")) if isinstance(value, str) else None
    except ValueError as error:
        raise ValueError("Invalid recorded ISO review timestamp") from error
    if parsed is None or parsed.tzinfo is None:
        raise ValueError("Review timestamp must include its timezone")


def validate_contract(contract):
    if contract.get("schema_version") != 1 or contract.get("mode") not in {DRAFT_MODE, CATEGORY_MODE}:
        raise ValueError("Expected a reviewed draft or category-only publication contract")
    version = contract.get("baseline_fact_version")
    if type(version) is not int or version < 0:
        raise ValueError("Invalid predecessor version")
    columns = contract.get("predecessor_columns", [])
    if not columns or len(set(columns)) != len(columns) or not all(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", c) for c in columns):
        raise ValueError("Invalid predecessor columns")
    mutable = MUTABLE_FIELDS if contract["mode"] == DRAFT_MODE else CATEGORY_MUTABLE_FIELDS
    if set(contract.get("mutable_fields", [])) != mutable or len(contract["mutable_fields"]) != len(mutable):
        raise ValueError("Publication mutable fields must match the fixed mode allowlist")
    if not mutable <= set(columns) or len(contract.get("immutable_fields", [])) != len(set(contract.get("immutable_fields", []))) or set(contract.get("immutable_fields", [])) != set(columns) - mutable:
        raise ValueError("Every other predecessor field must be preserved")
    identity = contract["baseline_identity"]
    if identity["policy_version"] != "sales_restart_gold_v7_independent_catalog":
        raise ValueError("Unexpected predecessor policy")
    for key, value in contract["proposed"].items():
        if not re.fullmatch(r"[0-9a-f]{64}", value):
            raise ValueError("Invalid artifact hash: " + key)
        if key != "product_master_sha256" and value != identity[key]:
            raise ValueError("Draft publication cannot change " + key)
    required = {"product_master_sha256", "transaction_evidence_sha256", "catalog_helper_sha256", "area_mapping_sha256"}
    if set(contract["proposed"]) != required:
        raise ValueError("Incomplete artifact contract")
    dependencies = contract.get("dependency_versions", {})
    for table, value in dependencies.items():
        if not re.fullmatch(r"workspace\.medshield_(gold|audit|bronze|silver)\.[A-Za-z0-9_]+", table) or type(value) is not int or value < 0:
            raise ValueError("Invalid dependency")
    if dependencies.get("workspace.medshield_gold.sales_restart_fact_candidate") != version:
        raise ValueError("Fact dependency does not match predecessor")
    if contract["mode"] == CATEGORY_MODE:
        for key in ("category_acceptance_sha256", "prior_product_master_sha256"):
            if not _sha(contract.get(key)):
                raise ValueError("Category acceptance must bind its receipt and original master")
        for key in ("category_acceptance_path", "prior_product_master_path"):
            _bound_path(Path.cwd(), contract.get(key))
    return contract


def validate_draft_rows(rows):
    if not rows:
        raise ValueError("Expected populated review drafts")
    for row in rows:
        if any(str(value).strip().lower() == "approved" for key, value in row.items() if key.endswith("status")):
            raise ValueError("This contract cannot publish product approvals")
        if str(row.get("forecast_eligible", "")).strip().lower() != "false":
            raise ValueError("Draft forecast eligibility must remain false")


def validate_package_contract(root, contract):
    validate_contract(contract)
    paths = {
        "product_master_sha256": "databricks/medshield_project/references/product_master_review.csv",
        "transaction_evidence_sha256": "databricks/medshield_project/references/transaction_evidence_review.csv",
        "catalog_helper_sha256": "databricks/medshield_project/product_catalog.py",
        "area_mapping_sha256": "datasources/templates/area_classification_mapping.csv",
    }
    for key, relative in paths.items():
        if hashlib.sha256((root / relative).read_bytes()).hexdigest() != contract["proposed"][key]:
            raise ValueError("Artifact changed since preparation: " + relative)
    receipt_path = _bound_path(root, contract["source_receipt_path"])
    payload = receipt_path.read_bytes()
    if hashlib.sha256(payload).hexdigest() != contract["source_receipt_sha256"]:
        raise ValueError("Predecessor receipt hash mismatch")
    receipt = json.loads(payload)
    if receipt["source_differences"] != "0" or receipt["counts"]["records"] != receipt["counts"]["unique_records"]:
        raise ValueError("Predecessor source preservation failed")
    if receipt["identity"] != contract["baseline_identity"] or receipt["dependency_versions"] != contract["dependency_versions"]:
        raise ValueError("Receipt identity mismatch")
    if receipt["baseline_fact_version"] != contract["baseline_fact_version"] or [c["col_name"] for c in receipt["fact_schema"]] != contract["predecessor_columns"]:
        raise ValueError("Receipt predecessor/schema mismatch")
    if contract["mode"] == CATEGORY_MODE:
        acceptance_path = _bound_path(root, contract["category_acceptance_path"])
        prior_path = _bound_path(root, contract["prior_product_master_path"])
        if hashlib.sha256(acceptance_path.read_bytes()).hexdigest() != contract["category_acceptance_sha256"] or hashlib.sha256(prior_path.read_bytes()).hexdigest() != contract["prior_product_master_sha256"]:
            raise ValueError("Acceptance receipt or original master hash mismatch")
        with (root / paths["product_master_sha256"]).open(encoding="utf-8-sig", newline="") as stream:
            rows = list(csv.DictReader(stream))
        master = validate_master(rows)
        validate_category_rows(rows, json.loads(acceptance_path.read_bytes()), contract)
        with prior_path.open(encoding="utf-8-sig", newline="") as stream:
            prior = validate_master(list(csv.DictReader(stream)))
        if set(prior) != set(master) or any({f: v for f, v in row.items() if f not in REVIEW_FIELDS} != {f: v for f, v in prior[label].items() if f not in REVIEW_FIELDS} for label, row in master.items()):
            raise ValueError("Category acceptance changed independent master fields")
    return receipt_path


def validate_category_acceptance(receipt, contract=None):
    if not isinstance(receipt, dict) or receipt.get("schema_version") != 1 or receipt.get("scope") != "reporting_category_only":
        raise ValueError("Expected a category-only acceptance receipt")
    if receipt.get("requested_by") != "Adrian" or receipt.get("recorded_by") != "Codex acting on Adrian instruction":
        raise ValueError("Receipt must retain actual user-directed provenance")
    _timestamp(receipt.get("recorded_at"))
    if not _sha(receipt.get("dataset_id")) or type(receipt.get("baseline_fact_version")) is not int or receipt["baseline_fact_version"] < 0:
        raise ValueError("Acceptance must identify the predecessor dataset/version")
    for field in ("prior_product_master_sha256", "product_master_sha256"):
        if not _sha(receipt.get(field)):
            raise ValueError("Acceptance must bind original and accepted master bytes")
    if any(receipt.get(f) is not False for f in ("business_release_approval", "sku_or_unit_approval", "forecast_approval")) or any(receipt.get(f) for f in ("business_approved", "ceo_signed_off", "forecast_approved")):
        raise ValueError("Category acceptance cannot record independent approvals")
    if contract is not None:
        validate_contract(contract)
        if contract["mode"] != CATEGORY_MODE or receipt["dataset_id"] != contract["baseline_identity"]["dataset_id"] or receipt["baseline_fact_version"] != contract["baseline_fact_version"] or receipt["product_master_sha256"] != contract["proposed"]["product_master_sha256"] or receipt["prior_product_master_sha256"] != contract["prior_product_master_sha256"]:
            raise ValueError("Category receipt/contract identity mismatch")
    rows = receipt.get("decisions")
    if not isinstance(rows, list) or not rows:
        raise ValueError("Expected a decision for every catalog label")
    decisions = {}
    required = {"raw_product", "normalized_product", "product_category", "category_status", "evidence_source", "reviewed_by", "reviewed_at", "decision", "rationale"}
    for row in rows:
        if not isinstance(row, dict) or not required <= set(row) or any(not isinstance(row[f], str) or not row[f].strip() for f in required):
            raise ValueError("Incomplete category acceptance decision")
        key = clean_label(row["raw_product"])
        if row["normalized_product"] != key or key in decisions:
            raise ValueError("Duplicate or mismatched normalized acceptance label")
        category = row["product_category"]
        if category not in CATEGORIES or row["category_status"] != "approved":
            raise ValueError("Invalid accepted reporting category/status")
        if row["decision"] != ("accepted_unclassified" if category == "unclassified" else "accepted_category"):
            raise ValueError("Unclassified acceptance must be explicit")
        _timestamp(row["reviewed_at"])
        if row["reviewed_by"] != receipt["recorded_by"] or row["reviewed_at"] != receipt["recorded_at"]:
            raise ValueError("Decision must retain its actual recorder and review time")
        decisions[key] = row
    return decisions


def validate_category_rows(rows, receipt, contract=None):
    decisions = validate_category_acceptance(receipt, contract)
    master = validate_master(rows)
    if set(master) != set(decisions):
        raise ValueError("Acceptance must exactly cover product master labels")
    for label, row in master.items():
        if row["canonical_sku"] or row["forecast_eligible"] != "false" or any(row[f] == "approved" for f in ("identity_status", "unit_status", "item_kind_status", "mapping_status", "forecast_status")):
            raise ValueError("Category acceptance cannot approve SKU, item kind, unit or forecast")
        for field in ("raw_product", "product_category", "category_status", "evidence_source", "reviewed_by", "reviewed_at"):
            if row[field] != decisions[label][field]:
                raise ValueError("Master/receipt mismatch: " + label + "/" + field)
    return decisions


def validate_publication_rows(rows, contract, receipt=None):
    validate_contract(contract)
    if contract["mode"] == DRAFT_MODE:
        validate_draft_rows(rows)
        return None
    return validate_category_rows(rows, receipt, contract)


def category_scope(predecessor_scope, category):
    if category not in CATEGORIES:
        raise ValueError("Invalid accepted category")
    return predecessor_scope if predecessor_scope in {"CONTRACT_LABEL_CANDIDATE", "HASHTAG_LABEL_REQUIRES_REVIEW", "MISSING_PRODUCT_IDENTITY"} else category.upper() + "_APPROVED"


def expected_category_metadata(predecessor, decision):
    if clean_label(predecessor["normalized_product"]) != decision["normalized_product"]:
        raise ValueError("Acceptance does not identify this predecessor label")
    category = decision["product_category"]
    scope = predecessor["product_scope_status"] if predecessor.get("is_contract_label") in {True, "true"} else category_scope(predecessor["product_scope_status"], category)
    return {"product_category": category, "category_status": "approved",
            "display_category": "Medical" if category in {"medicine", "medical_supply", "medical_equipment"} else "Non-Medical" if category == "non_medical" else "Unclassified",
            "product_scope_status": scope, "catalog_evidence_source": decision["evidence_source"]}


def validate_category_transition_rows(before, after, receipt, contract):
    """Exact local transition oracle: category acceptance never changes a demand gate."""
    decisions = validate_category_acceptance(receipt, contract)
    columns = set(contract["predecessor_columns"])
    def keyed(rows):
        result = {}
        for row in rows:
            key = row.get("source_record_id")
            if not key or key in result or set(row) != columns:
                raise ValueError("Transition schema/record keys changed")
            result[key] = row
        return result
    previous, proposed = keyed(before), keyed(after)
    if not previous or set(previous) != set(proposed):
        raise ValueError("Category publication cannot add/delete transactions")
    if {row["normalized_product"] for row in previous.values()} != set(decisions):
        raise ValueError("Acceptance must exactly cover predecessor labels")
    for key, old in previous.items():
        new = proposed[key]
        if any(old[f] != new[f] for f in contract["immutable_fields"]):
            raise ValueError("Immutable source/financial/identity/demand field changed")
        expected = expected_category_metadata(old, decisions[old["normalized_product"]])
        if any(new[f] != value for f, value in expected.items()) or new["product_master_sha256"] != contract["proposed"]["product_master_sha256"] or not new["gold_published_at"]:
            raise ValueError("Calculated category transition mismatch")
