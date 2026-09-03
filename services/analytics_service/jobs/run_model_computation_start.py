from __future__ import annotations

import csv
import gzip
import json
import math
import statistics
from collections import Counter, defaultdict
from datetime import UTC, date, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
FULL_SALES_PATH = ROOT / "data" / "medshield" / "processed" / "sales_transactions_area_allocated.json.gz"
MEDICAL_SALES_PATH = ROOT / "data" / "medshield" / "processed" / "sales_transactions_medical_demand.json.gz"
WEATHER_PATH = ROOT / "data" / "medshield" / "processed" / "weather_signals.json"
AREA_MAPPING_PATH = ROOT / "datasources" / "templates" / "area_classification_mapping.csv"
OUTPUT_DIR = ROOT / "outputs" / "model_computation_start_20260623"

ADDITIVE_FIELDS = ("quantity", "total_trade_price", "net_income", "net_cost", "discount", "total_cost")
MONTHS = tuple(f"{month:02d}" for month in range(1, 13))


def read_json_gz(path: Path) -> dict:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        return json.load(handle)


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_csv(path: Path, rows: list[dict], fieldnames: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fieldnames is None:
        fieldnames = []
        seen = set()
        for row in rows:
            for key in row:
                if key not in seen:
                    seen.add(key)
                    fieldnames.append(key)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def parse_date(value: str) -> date | None:
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        return None


def month_key(value: str) -> str:
    return str(value)[:7]


def safe_float(value: object) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def round_num(value: float, digits: int = 4) -> float:
    return round(value + 0.0, digits)


def model_input_path() -> tuple[Path, str, str]:
    if MEDICAL_SALES_PATH.exists():
        return (
            MEDICAL_SALES_PATH,
            "provisional_medical_demand",
            "Uses generated medical-demand split; product master approval is still required before publication.",
        )
    return (
        FULL_SALES_PATH,
        "full_adjusted_sales",
        "Medical-demand split has not been generated; results may include non-medical business items.",
    )


def load_area_mapping() -> dict[str, dict]:
    mapping: dict[str, dict] = {}
    if not AREA_MAPPING_PATH.exists():
        return mapping
    with AREA_MAPPING_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            raw = str(row.get("raw_area", "")).strip().lower()
            if raw:
                mapping[raw] = row
    return mapping


def area_info(area: str, mapping: dict[str, dict]) -> dict:
    mapped = mapping.get(str(area).strip().lower())
    if not mapped:
        return {
            "standard_area": area,
            "area_type": "unmapped",
            "territory": "",
            "customer_type": "",
            "business_line": "",
            "weather_eligible": "false",
            "forecast_eligible": "false",
            "mapping_status": "unmapped",
        }
    return mapped


def aggregate(rows: list[dict], keys: tuple[str, ...]) -> list[dict]:
    groups: dict[tuple, dict] = {}
    for row in rows:
        key = tuple(row.get(name, "") for name in keys)
        if key not in groups:
            groups[key] = {name: row.get(name, "") for name in keys}
            groups[key].update({
                "row_count": 0,
                "unique_products": set(),
                "unique_dr_numbers": set(),
                "estimated_rows": 0,
            })
            for field in ADDITIVE_FIELDS:
                groups[key][field] = 0.0
        group = groups[key]
        group["row_count"] += 1
        group["unique_products"].add(row.get("product", ""))
        group["unique_dr_numbers"].add(row.get("dr_number", ""))
        if row.get("allocation_status") == "estimated_backward_allocation":
            group["estimated_rows"] += 1
        for field in ADDITIVE_FIELDS:
            group[field] += safe_float(row.get(field))

    output = []
    for group in groups.values():
        group["unique_products"] = len({value for value in group["unique_products"] if value})
        group["unique_dr_numbers"] = len({value for value in group["unique_dr_numbers"] if value})
        for field in ADDITIVE_FIELDS:
            group[field] = round_num(group[field], 4)
        output.append(group)
    return sorted(output, key=lambda item: tuple(str(item.get(name, "")) for name in keys))


def abc_rank(rows: list[dict], group_field: str, output_field: str) -> list[dict]:
    totals: dict[str, dict] = {}
    for row in rows:
        key = str(row.get(group_field, "")).strip()
        if not key:
            continue
        if key not in totals:
            totals[key] = {
                output_field: key,
                "quantity": 0.0,
                "revenue": 0.0,
                "gross_margin": 0.0,
                "row_count": 0,
                "active_months": set(),
            }
        item = totals[key]
        item["quantity"] += safe_float(row.get("quantity"))
        item["revenue"] += safe_float(row.get("net_cost"))
        item["gross_margin"] += safe_float(row.get("net_income"))
        item["row_count"] += 1
        item["active_months"].add(row["period"])

    total_revenue = sum(item["revenue"] for item in totals.values()) or 1.0
    ranked = sorted(totals.values(), key=lambda item: item["revenue"], reverse=True)
    cumulative = 0.0
    for rank, item in enumerate(ranked, start=1):
        cumulative += item["revenue"]
        cumulative_share = cumulative / total_revenue
        item["rank"] = rank
        item["revenue"] = round_num(item["revenue"], 4)
        item["quantity"] = round_num(item["quantity"], 4)
        item["gross_margin"] = round_num(item["gross_margin"], 4)
        item["revenue_share"] = round_num(item["revenue"] / total_revenue, 6)
        item["cumulative_revenue_share"] = round_num(cumulative_share, 6)
        item["abc_class"] = "A" if cumulative_share <= 0.8 else "B" if cumulative_share <= 0.95 else "C"
        item["active_months"] = len(item["active_months"])
        item["model_code"] = "ABC_PARETO"
        item["model_version"] = "sales_only_v1"
        item["review_status"] = "draft"
    return ranked


def seasonal_index(monthly_rows: list[dict], scope_field: str | None = None) -> list[dict]:
    by_scope: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for row in monthly_rows:
        scope = str(row.get(scope_field, "overall")) if scope_field else "overall"
        month = str(row["period"])[5:7]
        by_scope[scope][month].append(safe_float(row.get("quantity")))

    output = []
    for scope, month_values in by_scope.items():
        all_values = [value for values in month_values.values() for value in values]
        baseline = statistics.mean(all_values) if all_values else 0.0
        if baseline <= 0:
            continue
        indexes = {}
        for month in MONTHS:
            value = statistics.mean(month_values[month]) if month_values.get(month) else 0.0
            indexes[month] = value / baseline if baseline else 0.0
        seasonal_strength = (max(indexes.values()) - min(indexes.values())) / max(indexes.values()) if indexes else 0.0
        for month, index in indexes.items():
            output.append({
                "scope": scope,
                "calendar_month": month,
                "seasonal_index": round_num(index, 6),
                "seasonal_strength": round_num(seasonal_strength, 6),
                "interpretation": "higher_than_average" if index > 1.05 else "lower_than_average" if index < 0.95 else "near_average",
                "model_code": "SEASONAL_INDEX",
                "model_version": "sales_only_v1",
                "review_status": "draft",
            })
    return output


def yoy_growth(monthly_rows: list[dict], keys: tuple[str, ...] = ()) -> list[dict]:
    lookup = {tuple(row.get(key, "") for key in keys) + (row["period"],): row for row in monthly_rows}
    output = []
    for row in monthly_rows:
        year = int(str(row["period"])[:4])
        prior_period = f"{year - 1}-{str(row['period'])[5:7]}"
        prior = lookup.get(tuple(row.get(key, "") for key in keys) + (prior_period,))
        result = {key: row.get(key, "") for key in keys}
        result.update({
            "period": row["period"],
            "prior_period": prior_period,
            "quantity": row["quantity"],
            "revenue": row["net_cost"],
            "prior_quantity": prior["quantity"] if prior else "",
            "prior_revenue": prior["net_cost"] if prior else "",
            "quantity_yoy_growth": round_num((row["quantity"] - prior["quantity"]) / prior["quantity"], 6) if prior and prior["quantity"] else "",
            "revenue_yoy_growth": round_num((row["net_cost"] - prior["net_cost"]) / prior["net_cost"], 6) if prior and prior["net_cost"] else "",
            "is_2025_partial": str(row["period"]).startswith("2025"),
        })
        output.append(result)
    return output


def forecast_baseline(monthly_rows: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    series = {row["period"]: safe_float(row["quantity"]) for row in monthly_rows}
    periods = sorted(series)
    eval_rows = []
    abs_errors = []
    squared_errors = []
    ape_values = []

    for period in periods:
        year = int(period[:4])
        if year < 2023:
            continue
        prior_year_period = f"{year - 1}-{period[5:7]}"
        if prior_year_period not in series:
            continue
        actual = series[period]
        forecast = series[prior_year_period]
        error = actual - forecast
        abs_error = abs(error)
        eval_rows.append({
            "period": period,
            "actual_quantity": round_num(actual, 4),
            "seasonal_naive_forecast": round_num(forecast, 4),
            "error": round_num(error, 4),
            "absolute_error": round_num(abs_error, 4),
            "absolute_percentage_error": round_num(abs_error / actual, 6) if actual else "",
            "evaluation_scope": "partial_2025_context" if year == 2025 else "rolling_validation",
        })
        abs_errors.append(abs_error)
        squared_errors.append(error * error)
        if actual:
            ape_values.append(abs_error / actual)

    metrics = [{
        "model_code": "SEASONAL_NAIVE_BASELINE",
        "model_version": "sales_only_v1",
        "evaluation_start_period": eval_rows[0]["period"] if eval_rows else "",
        "evaluation_end_period": eval_rows[-1]["period"] if eval_rows else "",
        "mae": round_num(statistics.mean(abs_errors), 4) if abs_errors else "",
        "rmse": round_num(math.sqrt(statistics.mean(squared_errors)), 4) if squared_errors else "",
        "mape": round_num(statistics.mean(ape_values), 6) if ape_values else "",
        "review_status": "validated" if eval_rows else "failed",
        "limitations": "2025 remains partial; use rolling validation context and do not treat missing 2025 months as zero demand.",
    }]

    last_year = max(int(period[:4]) for period in periods) if periods else 2025
    forecast_rows = []
    for index, month in enumerate(MONTHS, start=1):
        forecast_period = f"{last_year + 1}-{month}"
        source_period = f"{last_year}-{month}"
        fallback_period = f"{last_year - 1}-{month}"
        forecast = series.get(source_period, series.get(fallback_period, 0.0))
        source_used = source_period if source_period in series else fallback_period if fallback_period in series else ""
        forecast_rows.append({
            "forecast_run_id": "sales_only_baseline_v1_2026",
            "forecast_period": forecast_period,
            "forecast_scope": "overall",
            "baseline_demand_value": round_num(forecast, 4),
            "lower_bound": round_num(forecast * 0.85, 4),
            "upper_bound": round_num(forecast * 1.15, 4),
            "source_period_used": source_used,
            "model_code": "SEASONAL_NAIVE_BASELINE",
            "model_version": "sales_only_v1",
            "review_status": "draft",
            "limitations": "Sales-only seasonal naive forecast. No future disease/weather regressors included.",
        })

    return eval_rows, metrics, forecast_rows


def data_contract(sales_rows: list[dict], weather: dict | None) -> dict:
    required = ["date_delivered", "area", "product", "quantity", "net_cost"]
    missing = {field: sum(1 for row in sales_rows if str(row.get(field, "")).strip() == "") for field in required}
    valid_dates = sum(1 for row in sales_rows if parse_date(row.get("date_delivered", "")))
    weather_meta = (weather or {}).get("metadata", {})
    return {
        "sales": {
            "status": "pass" if all(value == 0 for value in missing.values()) else "fail",
            "rows": len(sales_rows),
            "missing_required_fields": missing,
            "valid_date_rows": valid_dates,
            "source_period_start": min(row["date_delivered"] for row in sales_rows),
            "source_period_end": max(row["date_delivered"] for row in sales_rows),
        },
        "weather_api": {
            "status": "partial" if weather_meta else "missing",
            "provider": weather_meta.get("provider", ""),
            "period_start": weather_meta.get("period_start", ""),
            "period_end": weather_meta.get("period_end", ""),
            "areas": weather_meta.get("areas", []),
            "limitation": "Current checked-in weather API data is partial and should be contextual only until all target territories are loaded.",
        },
        "doh_disease": {
            "status": "blocked_missing_source",
            "limitation": "Historical DOH disease data has not been uploaded to the workspace yet.",
        },
        "pagasa_reference": {
            "status": "blocked_missing_source",
            "limitation": "Historical PAGASA reference data has not been uploaded to the workspace yet.",
        },
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sales_path, input_dataset_type, input_dataset_limitation = model_input_path()
    sales_payload = read_json_gz(sales_path)
    rows = sales_payload.get("rows", [])
    area_mapping = load_area_mapping()

    enriched = []
    for row in rows:
        parsed = parse_date(row.get("date_delivered", ""))
        if not parsed:
            continue
        info = area_info(row.get("area", ""), area_mapping)
        enriched_row = dict(row)
        enriched_row["period"] = row["date_delivered"][:7]
        enriched_row["year"] = row["date_delivered"][:4]
        enriched_row["month"] = row["date_delivered"][5:7]
        enriched_row["standard_area"] = info.get("standard_area", row.get("area", ""))
        enriched_row["area_type"] = info.get("area_type", "unmapped")
        enriched_row["territory"] = info.get("territory", "")
        enriched_row["customer_type"] = info.get("customer_type", "")
        enriched_row["business_line"] = info.get("business_line", "")
        enriched_row["area_forecast_eligible"] = info.get("forecast_eligible", "false")
        enriched_row["area_weather_eligible"] = info.get("weather_eligible", "false")
        enriched.append(enriched_row)

    weather = read_json(WEATHER_PATH) if WEATHER_PATH.exists() else None
    write_json(OUTPUT_DIR / "data_contract_report.json", data_contract(enriched, weather))

    monthly_overall = aggregate(enriched, ("period",))
    territory_rows = [row for row in enriched if row["area_type"] == "territory"]
    monthly_territory = aggregate(territory_rows, ("period", "territory"))
    monthly_product = aggregate(enriched, ("period", "product"))
    product_territory_all = aggregate(territory_rows, ("period", "product", "territory"))
    combo_counts = Counter((row["product"], row["territory"]) for row in territory_rows)
    monthly_product_territory = [
        row for row in product_territory_all
        if combo_counts[(row["product"], row["territory"])] >= 6
    ]

    write_csv(OUTPUT_DIR / "mart_monthly_overall.csv", monthly_overall)
    write_csv(OUTPUT_DIR / "mart_monthly_territory.csv", monthly_territory)
    write_csv(OUTPUT_DIR / "mart_monthly_product.csv", monthly_product)
    write_csv(OUTPUT_DIR / "mart_monthly_product_territory_dense.csv", monthly_product_territory)

    product_abc = abc_rank(enriched, "product", "product")
    territory_abc = abc_rank(territory_rows, "territory", "territory")
    write_csv(OUTPUT_DIR / "descriptive_product_abc_pareto.csv", product_abc)
    write_csv(OUTPUT_DIR / "descriptive_territory_abc_pareto.csv", territory_abc)
    write_csv(OUTPUT_DIR / "descriptive_seasonality_overall.csv", seasonal_index(monthly_overall))
    write_csv(OUTPUT_DIR / "descriptive_seasonality_territory.csv", seasonal_index(monthly_territory, "territory"))
    write_csv(OUTPUT_DIR / "descriptive_yoy_overall.csv", yoy_growth(monthly_overall))
    write_csv(OUTPUT_DIR / "descriptive_yoy_territory.csv", yoy_growth(monthly_territory, ("territory",)))

    eval_rows, metrics, forecast_rows = forecast_baseline(monthly_overall)
    write_csv(OUTPUT_DIR / "baseline_forecast_evaluation_rows.csv", eval_rows)
    write_csv(OUTPUT_DIR / "fact_model_evaluation_local.csv", metrics)
    write_csv(OUTPUT_DIR / "fact_demand_forecast_local.csv", forecast_rows)
    write_csv(OUTPUT_DIR / "fact_forecast_run_local.csv", [{
        "forecast_run_id": "sales_only_baseline_v1_2026",
        "model_code": "SEASONAL_NAIVE_BASELINE",
        "model_version": "sales_only_v1",
        "training_period_start": min(row["period"] for row in monthly_overall),
        "training_period_end": max(row["period"] for row in monthly_overall),
        "forecast_period_start": forecast_rows[0]["forecast_period"] if forecast_rows else "",
        "forecast_period_end": forecast_rows[-1]["forecast_period"] if forecast_rows else "",
        "input_dataset_version": sales_payload.get("metadata", {}).get("dataset_name", sales_path.stem),
        "input_dataset_type": input_dataset_type,
        "status": "draft",
        "limitations": f"Sales-only baseline. 2025 is partial and external signals are not fully loaded. {input_dataset_limitation}",
    }])

    priority_rows = []
    max_revenue = product_abc[0]["revenue"] if product_abc else 1.0
    for item in product_abc:
        margin_rate = item["gross_margin"] / item["revenue"] if item["revenue"] else 0.0
        movement_score = min(item["active_months"] / 12, 1.0)
        abc_score = {"A": 1.0, "B": 0.65, "C": 0.35}.get(item["abc_class"], 0.0)
        revenue_score = item["revenue"] / max_revenue if max_revenue else 0.0
        priority_score = (0.45 * abc_score) + (0.3 * revenue_score) + (0.15 * movement_score) + (0.1 * max(margin_rate, 0))
        priority_rows.append({
            "product": item["product"],
            "model_code": "DETERMINISTIC_PRODUCT_PRIORITY",
            "model_version": "sales_only_v1",
            "abc_class": item["abc_class"],
            "priority_score": round_num(priority_score, 6),
            "priority_rank": item["rank"],
            "confidence": "medium" if item["active_months"] >= 6 else "low",
            "reason_text": f"{item['abc_class']}-class product with {item['active_months']} active months and revenue share {item['revenue_share']}.",
            "review_status": "draft",
            "limitations": "Product master and medicine/supply/equipment classification still require approval.",
        })
    write_csv(OUTPUT_DIR / "fact_product_priority_local.csv", priority_rows)

    blocked = [
        {
            "checklist_item": "Load or prepare DOH historical disease data",
            "status": "blocked_missing_doh_data",
            "reason": "No DOH historical dataset is present in the workspace.",
        },
        {
            "checklist_item": "Load historical PAGASA reference data",
            "status": "blocked_missing_pagasa_data",
            "reason": "No PAGASA historical dataset is present in the workspace.",
        },
        {
            "checklist_item": "Weather-adjusted model comparison",
            "status": "blocked_partial_weather_coverage",
            "reason": "Only partial weather API data is checked in; current file covers one area/year.",
        },
        {
            "checklist_item": "XGBoost urgency model",
            "status": "blocked_target_not_approved",
            "reason": "Urgency target and product master classification are not approved.",
        },
    ]
    write_csv(OUTPUT_DIR / "blocked_or_downgraded_items.csv", blocked)

    summary = {
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "input_dataset": str(sales_path.relative_to(ROOT)),
        "input_dataset_type": input_dataset_type,
        "sales_rows": len(enriched),
        "monthly_overall_rows": len(monthly_overall),
        "monthly_territory_rows": len(monthly_territory),
        "monthly_product_rows": len(monthly_product),
        "monthly_product_territory_dense_rows": len(monthly_product_territory),
        "product_priority_rows": len(priority_rows),
        "forecast_rows": len(forecast_rows),
        "model_evaluation_rows": len(metrics),
        "blocked_items": len(blocked),
        "review_status": "draft",
        "limitations": [
            input_dataset_limitation,
            "DOH and PAGASA datasets are not yet uploaded.",
            "Weather API file is partial and should remain contextual.",
            "Product master classification is not fully approved.",
            "Inventory/cost data is unavailable, so prescriptive outputs remain scenario-only.",
        ],
    }
    write_json(OUTPUT_DIR / "model_computation_start_summary.json", summary)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
