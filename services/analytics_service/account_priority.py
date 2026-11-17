"""Offline, candidate-only account joins and presentation-scoped ABC/XYZ review.

Inputs are assessed records, not raw CSV ingestion. Delivery references never
identify accounts. Only explicit exact/reviewed aliases can establish a derived
account; generic channels are retained as a separate, non-account cohort.
"""
from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
import hashlib
import math
import re
from statistics import mean, pstdev


def normalize_label(value: str) -> str:
    return " ".join(re.sub(r"[^\w\s]", " ", str(value).upper()).split())


def period_index(value: str) -> int:
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", str(value)):
        raise ValueError("Expected YYYY-MM period")
    return int(value[:4]) * 12 + int(value[5:]) - 1


def amount(value) -> Decimal:
    result = Decimal(str(value))
    if not result.is_finite():
        raise ValueError("Non-finite financial value")
    return result


def join_reviewed_accounts(records: list[dict], mappings: list[dict], *,
                           dataset_id: str, policy_version: str) -> dict:
    """One output per input row, preserving duplicates and signed net sales.

    Mapping fields: raw_label, derived_account_key, match_confidence,
    review_evidence. Only exact_reference_match/reviewed_alias_match accepted.
    raw_label matches account_label when present, otherwise raw area text.
    """
    if not dataset_id or not policy_version:
        raise ValueError("Source dataset and policy identity required")
    aliases = {}
    generic_labels = {"HOSPITAL", "HOSPITALS", "GOVERNMENT", "PRIVATE", "PHARMA",
                      "ADMIN", "SUPPLIES", "INTERNAL", "UNKNOWN"}
    for mapping in mappings:
        label = normalize_label(mapping["raw_label"])
        if (not label or not mapping.get("derived_account_key") or
                mapping.get("match_confidence") not in
                {"exact_reference_match", "reviewed_alias_match"} or
                not mapping.get("review_evidence")):
            raise ValueError("Account mapping needs explicit reviewed evidence")
        if label in generic_labels:
            raise ValueError("Generic channel labels cannot identify individual accounts")
        if label in aliases:
            raise ValueError("Duplicate/ambiguous normalized account mapping")
        aliases[label] = mapping
    output = []
    for record in records:
        row = dict(record)
        label = normalize_label(row.get("account_label") or row.get("area", ""))
        match = aliases.get(label)
        if match:
            row.update(derived_account_key=match["derived_account_key"],
                       match_confidence=match["match_confidence"],
                       account_review_evidence=match["review_evidence"])
        else:
            # This key groups an ambiguous label for review; it is not an account.
            key = hashlib.sha256(label.encode("utf-8")).hexdigest()[:16]
            row.update(derived_account_key=None,
                       fallback_group_key=f"area_channel:{key}" if label else None,
                       match_confidence="area_channel_fallback" if label else "unmatched")
        row.update(evidence_label="Derived", dataset_id=dataset_id,
                   policy_version=policy_version, assumption_ids=["D2"])
        output.append(row)
    before = sum((amount(r["net_sales"]) for r in records), Decimal(0))
    after = sum((amount(r["net_sales"]) for r in output), Decimal(0))
    if len(output) != len(records) or before != after:
        raise AssertionError("Account join changed transaction population/value")
    return {"rows": output, "audit": {"input_count": len(records),
            "output_count": len(output), "net_sales_before": str(before),
            "net_sales_after": str(after), "evidence_label": "Derived",
            "dataset_id": dataset_id, "policy_version": policy_version,
            "assumption_ids": ["D2"]}}


def abc_xyz_review(records: list[dict], *, dataset_id: str, policy_version: str,
                   calendar_months: list[str] | None = None) -> dict:
    """ABC over signed item totals; XYZ only within one explicit unit scope.

    Each assessed input has product, period, net_sales, quantity and unit_scope.
    Missing quantities are not zero. Optional calendar_months is an explicit
    zero-fill sensitivity run; it must cover every observed period.
    """
    if not dataset_id or not policy_version:
        raise ValueError("Source dataset and policy identity required")
    if calendar_months is not None:
        if len(set(calendar_months)) != len(calendar_months):
            raise ValueError("Duplicate calendar months")
        for period in calendar_months:
            period_index(period)
    products = defaultdict(list)
    for row in records:
        period_index(row["period"])
        if calendar_months is not None and row["period"] not in calendar_months:
            raise ValueError("Calendar sensitivity excludes an observed month")
        products[row["product"]].append(row)
    totals = {p: sum((amount(r["net_sales"]) for r in rows), Decimal(0))
              for p, rows in products.items()}
    positive = sum((max(Decimal(0), x) for x in totals.values()), Decimal(0))
    cumulative = Decimal(0)
    output = []
    for product in sorted(products, key=lambda p: (-totals[p], p)):
        rows, net = products[product], totals[product]
        share_before = cumulative / positive if positive else None
        abc = ("Unclassified" if net <= 0 else
               "A" if share_before < Decimal("0.80") else
               "B" if share_before < Decimal("0.95") else "C")
        cumulative += max(Decimal(0), net)
        scopes = {r.get("unit_scope") for r in rows}
        monthly = defaultdict(float)
        observed = set()
        invalid_qty = False
        for row in rows:
            value = row.get("quantity")
            if value is None:
                invalid_qty = True
                continue
            if isinstance(value, bool) or not math.isfinite(float(value)):
                raise ValueError("Invalid recorded quantity")
            monthly[row["period"]] += float(value)
            observed.add(row["period"])
        cv, xyz = None, "Insufficient_History"
        if None in scopes or "" in scopes or len(scopes) != 1:
            xyz = "Unresolved_Presentation"
        elif invalid_qty:
            xyz = "Missing_Quantity"
        elif len(observed) >= 6:
            values = ([monthly.get(p, 0) for p in calendar_months]
                      if calendar_months is not None else list(monthly.values()))
            if mean(values) > 0 and min(values) >= 0:
                cv = pstdev(values) / mean(values)
                xyz = "X" if cv < .5 else "Y" if cv < 1 else "Z"
            else:
                xyz = "Nonpositive_Quantity"
        output.append({"product": product, "net_sales": str(net), "abc": abc,
                       "xyz": xyz, "abc_xyz": abc + xyz if abc != "Unclassified" and xyz in {"X", "Y", "Z"} else None,
                       "coefficient_of_variation": cv, "observed_months": len(observed),
                       "unit_scope": next(iter(scopes)) if len(scopes) == 1 else None,
                       "zero_fill_sensitivity": calendar_months is not None,
                       "absence_not_stock_on_hand": True, "evidence_label": "Derived",
                       "dataset_id": dataset_id, "policy_version": policy_version,
                       "assumption_ids": ["D1"]})
    return {"products": output, "net_sales": str(sum(totals.values(), Decimal(0))),
            "negative_adjustments": str(sum((min(Decimal(0), amount(r["net_sales"]))
                                               for r in records), Decimal(0))),
            "evidence_label": "Derived", "dataset_id": dataset_id,
            "policy_version": policy_version, "assumption_ids": ["D1"]}


def account_inactivity_review(records: list[dict], *, last_closed_month: str) -> list[dict]:
    """Review flags only for matched accounts, using distinct delivery references."""
    end = period_index(last_closed_month)
    identities = {(row.get('dataset_id'), row.get('policy_version')) for row in records}
    if (len(identities) > 1 or any(not dataset or not policy for dataset, policy in identities)):
        raise ValueError('Account review requires one explicit dataset/policy identity')
    accounts = defaultdict(list)
    for row in records:
        if row.get("derived_account_key") and period_index(row["period"]) <= end:
            accounts[row["derived_account_key"]].append(row)
    result = []
    for key, rows in sorted(accounts.items()):
        orders = {r.get("order_id") for r in rows if r.get("order_id")}
        recent = [r for r in rows if end - 5 <= period_index(r["period"]) <= end]
        result.append({"derived_account_key": key,
                       "net_sales": str(sum((amount(r["net_sales"]) for r in rows), Decimal(0))),
                       "historical_orders": len(orders),
                       "last_order_month": max(r["period"] for r in rows),
                       "active_months": len({r["period"] for r in rows}),
                       "match_confidence": sorted({r.get("match_confidence", "unmatched") for r in rows}),
                       "inactive_review_candidate": len(orders) >= 3 and not recent,
                       "evidence_label": "Derived", "assumption_ids": ["D2"],
                       "dataset_id": rows[0]["dataset_id"],
                       "policy_version": rows[0]["policy_version"]})
    result.sort(key=lambda row: (-amount(row["net_sales"]), row["derived_account_key"]))
    positive_total = sum((max(Decimal(0), amount(row["net_sales"])) for row in result), Decimal(0))
    cumulative = Decimal(0)
    for row in result:
        net = amount(row["net_sales"])
        share = cumulative / positive_total if positive_total else None
        row["abc"] = ("Unclassified" if net <= 0 else "A" if share < Decimal(".8")
                      else "B" if share < Decimal(".95") else "C")
        row["positive_revenue_share"] = float(max(Decimal(0), net) / positive_total) if positive_total else None
        cumulative += max(Decimal(0), net)
    return result
