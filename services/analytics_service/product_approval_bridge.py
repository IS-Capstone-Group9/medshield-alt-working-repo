"""Offline independent-decision bridge; no inferred approvals or runtime writes."""
from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime
from decimal import Decimal
import hashlib
import json
from typing import Any

DIMENSIONS = {
    "category": "category_status", "identity": "identity_status",
    "item_kind": "item_kind_status", "unit": "unit_status", "forecast": "forecast_status",
}
STATUSES = {"approved", "needs_review", "proposed", "rejected", "unknown"}


def timestamp(value: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Review date missing")
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("Invalid review date") from exc
    return value


def required_text(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Attributable review evidence missing")
    return value


def build_approval_bridge(
    payload: dict[str, Any], routes: dict[str, Any], master: list[dict[str, str]], *,
    master_sha256: str, expected_release: dict[str, Any],
    input_sha256: str,
    decision_evidence: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Preserve existing master decisions and validate separately scoped evidence.

    The v1 shared master evidence is explicitly category-review context. Future
    noncategory approvals require per-product/dimension evidence with historical
    effective bounds. This bridge is a preparation artifact, never approval.
    """
    release = payload.get("source_release")
    if (payload.get("schema_version") != "current-gold-product-input.v1"
            or routes.get("schema_version") != "current-gold-product-routes.v1"
            or release != expected_release or payload.get("source_release_after") != release
            or routes.get("source_release") != release):
        raise ValueError("Bridge source release mismatch")
    if master_sha256 != release.get("product_master_sha256"):
        raise ValueError("Controlled master hash differs from release")
    if not input_sha256 or routes.get("input_sha256") != input_sha256:
        raise ValueError("Route input hash does not match source capture")
    products = payload["products"]
    keys = [p["product_key"] for p in products]
    route_rows = {r["product_key"]: r for r in routes["products"]}
    labels = [p["source_labels"][0] for p in products if len(p["source_labels"]) == 1]
    aliases = [row["raw_product"] for row in master]
    if (len(keys) != len(set(keys)) or len(labels) != len(keys) or len(labels) != len(set(labels))
            or len(aliases) != len(set(aliases)) or set(labels) != set(aliases)
            or len(route_rows) != len(routes["products"]) or set(route_rows) != set(keys)):
        raise ValueError("Bridge join is not complete and one-to-one")
    by_label = {row["raw_product"]: row for row in master}
    evidence = {}
    for item in decision_evidence or []:
        key = (item.get("product_key"), item.get("dimension"))
        if key[0] not in set(keys) or key[1] not in DIMENSIONS or key in evidence:
            raise ValueError("Unknown or duplicate independent decision evidence")
        evidence[key] = item
    output = []
    for product in products:
        key = product["product_key"]
        row = by_label[product["source_labels"][0]]
        for source, field in [("category_statuses", "category_status"), ("identity_statuses", "identity_status"),
                              ("categories", "product_category"), ("forecast_flags", "forecast_eligible")]:
            if product[source] != [row[field]]:
                raise ValueError("Source/master decision conflict")
        for source, field in [("canonical_skus", "canonical_sku"), ("units", "unit_of_measure"), ("item_kinds", "item_kind")]:
            effective = row[field]
            # Existing product_catalog.py intentionally projects unapproved
            # item-kind proposals as unknown in Gold. Preserve both values.
            if field == "item_kind" and row["item_kind_status"] != "approved":
                effective = "unknown"
            if product[source] != ([effective] if effective else []):
                raise ValueError("Source/master identity metadata conflict")
        decisions = {}
        for dimension, field in DIMENSIONS.items():
            status = row[field]
            if status not in STATUSES:
                raise ValueError("Unrecognized independent review status")
            decision = {"status": status, "evidence_source": None, "reviewed_by": None,
                        "reviewed_at": None, "effective_from": None, "effective_through": None,
                        "evidence_scope": "no_dimension_specific_evidence_supplied"}
            scoped = evidence.get((key, dimension))
            if scoped:
                if scoped.get("status") != status:
                    raise ValueError("Evidence decision disagrees with controlled master")
                start, end = date.fromisoformat(scoped["effective_from"]), date.fromisoformat(scoped["effective_through"])
                if start > end:
                    raise ValueError("Invalid historical evidence interval")
                decision.update(evidence_source=required_text(scoped.get("evidence_source")),
                                reviewed_by=required_text(scoped.get("reviewed_by")),
                                reviewed_at=timestamp(scoped.get("reviewed_at")),
                                effective_from=str(start), effective_through=str(end),
                                evidence_scope=f"independent_{dimension}_decision_with_bounded_history")
            elif status == "approved":
                if dimension != "category":
                    raise ValueError("Noncategory approval lacks attributable historical evidence")
                decision.update(evidence_source=required_text(row.get("evidence_source")),
                                reviewed_by=required_text(row.get("reviewed_by")),
                                reviewed_at=timestamp(row.get("reviewed_at")),
                                evidence_scope="recorded_descriptive_category_review_only")
            decisions[dimension] = decision
        if row["forecast_eligible"] not in ("true", "false"):
            raise ValueError("Invalid forecast flag")
        if row["forecast_eligible"] == "true" and any(d["status"] != "approved" for d in decisions.values()):
            raise ValueError("Forecast flag conflicts with independent approval gates")
        if decisions["identity"]["status"] == "approved" and not row["canonical_sku"]:
            raise ValueError("Approved identity missing canonical SKU")
        if decisions["unit"]["status"] == "approved" and not row["unit_of_measure"]:
            raise ValueError("Approved unit missing historical sales unit")
        route = route_rows[key]
        eligible = int(product["financial_rows"]) > 0
        if (route["financial_eligible"] is not eligible or route["financial_rows"] != int(product["financial_rows"])
                or route["recorded_net_sales_php"] != product["net_sales_php"]):
            raise ValueError("Financial eligibility/value differs from current source")
        output.append({"product_key": key, "source_label": product["source_labels"][0],
                       "source_release": deepcopy(release), "decisions": decisions,
                       "source_effective_item_kind": product["item_kinds"][0] if product["item_kinds"] else None,
                       "recorded_master_item_kind": row["item_kind"],
                       "recorded_master_review_context": {field: row.get(field) for field in
                           ("evidence_source", "reviewed_by", "reviewed_at", "review_notes", "mapping_status")},
                       "financial_eligible": route["financial_eligible"], "financial_rows": route["financial_rows"],
                       "recorded_net_sales_php": route["recorded_net_sales_php"],
                       "historical_observation_coverage_status": "not_verified_by_this_bridge",
                       "quantity_model_eligible": False, "publication_approved": False, "activation_allowed": False})
    if (len(output) != int(payload["totals"]["product_keys"])
            or sum(r["financial_eligible"] for r in output) != int(payload["totals"]["financial_product_keys"])
            or sum((Decimal(r["recorded_net_sales_php"]) for r in output if r["financial_eligible"]), Decimal(0)) != Decimal(payload["totals"]["net_sales_php"])):
        raise ValueError("Bridge financial population reconciliation failed")
    return {"schema_version": "product-approval-bridge.v1", "source_release": deepcopy(release),
            "master_sha256": master_sha256, "scope": "offline candidate bridge; no master or Gold write",
            "input_sha256": input_sha256,
            "products": output, "review_products": len(output),
            "financial_products": sum(r["financial_eligible"] for r in output),
            "review_only_products": sum(not r["financial_eligible"] for r in output),
            "decision_evidence_sha256": hashlib.sha256(json.dumps(decision_evidence or [], sort_keys=True).encode()).hexdigest(),
            "publication_approved": False, "activation_allowed": False}
