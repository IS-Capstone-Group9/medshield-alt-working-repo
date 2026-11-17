"""Offline SO1 financial evidence from a checksum-bound, pinned Gold extraction.

No runtime fallback, geographic approval, zero filling, model fit or publication.
Uses exact source-area labels; aliases are deliberately not merged.
"""
from __future__ import annotations

import argparse
import calendar
import csv
import hashlib
import json
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from services.analytics_service.jobs.run_descriptive_stl import decompose


def amount(value):
    if value is None:
        return None
    result = Decimal(str(value))
    if not result.is_finite():
        raise ValueError("Revenue must be finite or unavailable")
    return result


def nullable_sum(values):
    observed = [value for value in values if value is not None]
    return sum(observed, Decimal(0)) if observed else None


def matched_yoy(months, base_year, target_year):
    common = [number for number in range(1, 13)
              if months.get(f"{base_year}-{number:02d}") is not None
              and months.get(f"{target_year}-{number:02d}") is not None]
    base = nullable_sum([months[f"{base_year}-{number:02d}"] for number in common])
    target = nullable_sum([months[f"{target_year}-{number:02d}"] for number in common])
    delta = target - base if base is not None and target is not None else None
    return {"base_year": base_year, "target_year": target_year, "common_months": common,
            "base_php": base, "target_php": target, "change_php": delta,
            "growth_pct": delta / base * 100 if base is not None and base > 0 else None,
            "comparison_status": "all_12_recorded_months" if len(common) == 12 else
                "matched_recorded_subset" if common else "unavailable",
            "coverage_note": "Record presence is not independent period-completeness evidence."}


def summarize(receipt):
    if (receipt.get("schema_version") != 1 or receipt.get("source") != "databricks"
            or receipt.get("status") != "read_only_so1_evidence_not_objective_acceptance"
            or receipt.get("study_start") != "2021-01-01" or receipt.get("study_end") != "2025-12-31"):
        raise ValueError("A pinned original-study SO1 extraction is required")
    queries = receipt["queries"]
    mapping = {}
    for row in queries["mapping"]["rows"]:
        label = row["normalized_area"]
        if label in mapping:
            raise ValueError("Area mapping must be one-to-one; conflicting mapping rows")
        mapping[label] = row
    monthly, annual = defaultdict(list), defaultdict(list)
    days_by_label, keys = defaultdict(dict), set()
    checks = []

    def check(condition, name):
        if not condition:
            raise ValueError(name)
        checks.append(name)

    for row in queries["daily"]["rows"]:
        day = date.fromisoformat(row["day"])
        label = row["normalized_area"]
        adjusted = row["is_adjusted_source"]
        check(adjusted in ("true", "false"), "recognized adjusted-source stratum")
        key = (day, label, adjusted)
        check(key not in keys, "unique date/area/provenance aggregate")
        keys.add(key)
        check(2021 <= day.year <= 2025 and label in mapping, "study date and covered mapping label")
        records, eligible = int(row["records"]), int(row["eligible_records"])
        revenue = amount(row["revenue"])
        check(0 <= eligible <= records and records > 0, "record eligibility bounds")
        check((eligible == 0) == (revenue is None), "unavailable revenue is not zero")
        parsed = {"records": records, "eligible_records": eligible, "revenue": revenue,
                  "adjusted_records": records if adjusted == "true" else 0}
        monthly[(label, day.strftime("%Y-%m"))].append(parsed)
        annual[day.year].append(parsed)
        days_by_label[label].setdefault(day, []).append(parsed)

    def aggregate(rows):
        return {"records": sum(row["records"] for row in rows),
                "eligible_records": sum(row["eligible_records"] for row in rows),
                "revenue": nullable_sum([row["revenue"] for row in rows]),
                "adjusted_records": sum(row["adjusted_records"] for row in rows)}

    controls = {(row["normalized_area"], row["month"][:7]): row
                for row in queries["monthly_control"]["rows"]}
    check(len(controls) == len(queries["monthly_control"]["rows"]), "unique independent monthly controls")
    check(set(controls) == set(monthly), "daily/monthly area calendar identity")
    for key, rows in monthly.items():
        actual, expected = aggregate(rows), controls[key]
        for field in ("records", "eligible_records", "revenue"):
            check(actual[field] == (amount(expected[field]) if field == "revenue" else int(expected[field])),
                  f"daily/monthly {key[0]} {key[1]} {field}")
    annual_rows = []
    check(len(queries["annual_control"]["rows"]) == 5, "five annual controls")
    check({int(row["year"]) for row in queries["annual_control"]["rows"]} == set(range(2021, 2026)),
          "exact original study years")
    for row in queries["annual_control"]["rows"]:
        year = int(row["year"])
        actual = aggregate(annual[year])
        for field in ("records", "eligible_records", "revenue"):
            check(actual[field] == (amount(row[field]) if field == "revenue" else int(row[field])),
                  f"daily/annual {year} {field}")
        annual_rows.append({"year": year, **actual})

    series, labels, yoy, stl = [], [], [], {}
    calendar_start, calendar_end = date(2021, 1, 1), date(2025, 12, 31)
    calendar_days = (calendar_end - calendar_start).days + 1
    for label, map_row in sorted(mapping.items()):
        months = {}
        for year in range(2021, 2026):
            for number in range(1, 13):
                period = f"{year}-{number:02d}"
                summary = aggregate(monthly.get((label, period), []))
                months[period] = summary["revenue"]
                days = days_by_label[label]
                observed_days = sum(any(row["eligible_records"] > 0 for row in rows)
                                    for day, rows in days.items() if day.strftime("%Y-%m") == period)
                series.append({"area": label, "period": period, **summary,
                               "eligible_recorded_days": observed_days,
                               "days_without_eligible_records": calendar.monthrange(year, number)[1] - observed_days,
                               "missing": summary["revenue"] is None,
                               "evidence": "recorded_financial_includes_adjusted_source" if summary["adjusted_records"] else "recorded_financial"})
        observed = sum(any(row["eligible_records"] > 0 for row in rows) for rows in days_by_label[label].values())
        labels.append({"area": label, "mapping": map_row,
                       "recorded_months": sum(value is not None for value in months.values()),
                       "eligible_recorded_days": observed, "days_without_eligible_records": calendar_days - observed,
                       **aggregate([row for rows in days_by_label[label].values() for row in rows])})
        yoy.extend({"area": label, **matched_yoy(months, year, year + 1)} for year in range(2021, 2025))
        if map_row["proposed_area_type"] == "territory":
            decomposition = decompose([{"period": period, "revenue": value,
                                         "missing": value is None} for period, value in months.items()])
            decomposition["limitations"].extend([
                "Exact source-label PHP, including adjusted-source financial allocations; not verified delivery geography.",
                "Daily STL is blocked by unknown non-transaction-day semantics and adjusted daily detail.",
                "Full-series diagnostic STL cannot feed forecast validation without origin-local refitting."])
            stl[label] = decomposition

    buckets = defaultdict(list)
    for row in labels:
        map_row = row["mapping"]
        bucket = ("legacy_geographic_mapping_not_revalidated"
                  if map_row["is_geographic_territory_approved"] == "true"
                  else "proposed_geographic_label" if map_row["proposed_area_type"] == "territory"
                  else "geographically_unallocated_channel_or_business_line")
        buckets[bucket].append(row)
    total = nullable_sum([row["revenue"] for row in annual_rows])
    coverage = [{"status": bucket, "areas": [row["area"] for row in rows],
                 "revenue": nullable_sum([row["revenue"] for row in rows])}
                for bucket, rows in sorted(buckets.items())]
    check(nullable_sum([row["revenue"] for row in coverage]) == total, "geographic buckets preserve company revenue")
    for row in coverage:
        row["share_pct"] = row["revenue"] / total * 100 if total else None
    company_months = {f"{year}-{number:02d}": nullable_sum([
        row["revenue"] for row in series if row["period"] == f"{year}-{number:02d}"])
        for year in range(2021, 2026) for number in range(1, 13)}
    return {"status": "supporting_so1_evidence_not_fulfilled", "metric": "eligible_net_sales_php",
            "study_start": str(calendar_start), "study_end": str(calendar_end), "calendar_days": calendar_days,
            "annual": annual_rows, "total_php": total, "geographic_coverage": coverage,
            "labels": labels, "monthly": series, "territory_label_yoy": yoy,
            "company_yoy": [matched_yoy(company_months, year, year + 1) for year in range(2021, 2025)],
            "monthly_territory_label_stl": stl, "daily_stl_status": "blocked_unknown_daily_observation_calendar",
            "coo_confirmation": "owner_identified_by_user_answers_pending",
            "verification": {"checks_passed": len(checks), "failed": 0, "checks": checks}}, days_by_label


def write_csv(path, rows):
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    raw = args.source.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != args.source.with_suffix(".sha256").read_text().strip():
        raise ValueError("SO1 extraction checksum mismatch")
    receipt = json.loads(raw)
    result, daily = summarize(receipt)
    result["source_sha256"] = digest
    result["source_generated_at"] = receipt["generated_at"]
    result["release"] = receipt["release"]
    result["population"] = receipt["population"]
    result["code_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    args.output.mkdir(parents=True, exist_ok=True)
    content = json.dumps(result, indent=2, default=str, allow_nan=False) + "\n"
    (args.output / "analysis.json").write_text(content, encoding="utf-8")
    write_csv(args.output / "monthly.csv", result["monthly"])
    write_csv(args.output / "territory-label-yoy.csv", [{**row, "common_months": ";".join(map(str, row["common_months"]))}
                                                       for row in result["territory_label_yoy"]])
    pilot = []
    current = date(2021, 1, 1)
    while current <= date(2025, 12, 31):
        rows = daily.get("QUEZON", {}).get(current, [])
        revenue = nullable_sum([row["revenue"] for row in rows])
        pilot.append({"day": current.isoformat(), "area": "QUEZON", "revenue_php": revenue,
                      "records": sum(row["records"] for row in rows),
                      "adjusted_source_records": sum(row["adjusted_records"] for row in rows),
                      "observation_status": "recorded_financial" if revenue is not None else "unknown_no_eligible_record"})
        current += timedelta(days=1)
    write_csv(args.output / "quezon-daily-calendar.csv", pilot)
    print(json.dumps({"output": str(args.output), "total_php": str(result["total_php"]),
                      "checks_passed": result["verification"]["checks_passed"],
                      "labels": len(result["labels"]), "monthly_rows": len(result["monthly"]),
                      "monthly_stl_labels": [label for label, value in result["monthly_territory_label_stl"].items() if value["segments"]],
                      "daily_stl_status": result["daily_stl_status"]}))


if __name__ == "__main__":
    main()
