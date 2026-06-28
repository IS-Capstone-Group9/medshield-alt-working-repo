from __future__ import annotations

import argparse
import csv
import gzip
import json
import statistics
from collections import Counter, defaultdict
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SALES_PATH = ROOT / "data" / "medshield" / "processed" / "sales_transactions_area_allocated.json.gz"
DEFAULT_AREA_MAPPING_PATH = ROOT / "datasources" / "templates" / "area_classification_mapping.csv"
DEFAULT_PRODUCT_MAPPING_PATH = ROOT / "datasources" / "templates" / "product_master_mapping.csv"
DEFAULT_OUTPUT_DIR = ROOT / "outputs" / f"descriptive_analytics_{date.today():%Y%m%d}"
ADDITIVE_FIELDS = ("quantity", "total_trade_price", "net_income", "net_cost", "discount", "total_cost")
MONTHS = tuple(f"{month:02d}" for month in range(1, 13))


def read_json_gz(path: Path) -> dict[str, Any]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fieldnames is None:
        seen: set[str] = set()
        fieldnames = []
        for row in rows:
            for key in row:
                if key not in seen:
                    seen.add(key)
                    fieldnames.append(key)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def parse_date(value: object) -> date | None:
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def safe_float(value: object) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def round_num(value: float, digits: int = 4) -> float:
    return round(value + 0.0, digits)


def read_area_mapping(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}

    mapping: dict[str, dict[str, str]] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            raw_area = str(row.get("raw_area", "")).strip().lower()
            if raw_area:
                mapping[raw_area] = {key: str(value or "").strip() for key, value in row.items()}
    return mapping


def read_product_mapping(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}

    mapping: dict[str, dict[str, str]] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            raw_product = str(row.get("raw_product", "")).strip()
            if raw_product:
                mapping[raw_product] = {key: str(value or "").strip() for key, value in row.items()}
    return mapping
def area_info(area: object, mapping: dict[str, dict[str, str]]) -> dict[str, str]:
    area_text = str(area or "").strip()
    mapped = mapping.get(area_text.lower())
    if mapped:
        return mapped
    return {
        "standard_area": area_text,
        "area_type": "unmapped",
        "territory": "",
        "customer_type": "",
        "business_line": "",
        "forecast_eligible": "false",
        "weather_eligible": "false",
        "mapping_status": "unmapped",
    }

def classify_product_is_medicine(product_name: str) -> tuple[bool, str]:
    import re
    p_lower = str(product_name or "").strip().lower()
    if not p_lower:
        return True, ""

    # Non-medical patterns (match word boundaries or specific suffixes)
    non_med_patterns = [
        r'\bballpen\b', r'\btape\b', r'\bshirt\b', r'\bpaper\b', r'\bclear\s+book\b',
        r'\bstaple\b', r'\bink\b', r'\brecord\s+book\b', r'\btrash\s+bag\b', r'\bpen\b',
        r'\benvelope\b', r'\bfolder\b', r'\bpencil\b', r'\bmarker\b', r'\bglue\b',
        r'\bscissors\b', r'\bruler\b', r'\bclip\b', r'\bnotebook\b', r'\bt-shirt\b',
        r'\bstamp\b', r'\bsticker\b', r'\bhighlighter\b', r'\beraser\b', r'\bpush\s+pin\b',
        r'\bwhiteboard\b', r'\bcalculator\b', r'\bmarker\s+ink\b'
    ]

    # Medical exclusions: if these words are present, it is a medical item
    medical_keywords = [
        'bandage', 'autoclave', 'surgical', 'injection', 'infusion', 'tube',
        'catheter', 'syringe', 'needle', 'dialysis', 'cannula', 'cotton',
        'gauze', 'gloves', 'mask', 'thermometer', 'plaster', 'cautery', 'ecg'
    ]

    # Specific medicine exclusions (e.g. penicillin, pent, penem)
    medicine_indicators = ['penicillin', 'pent', 'penem', 'pen-']

    is_non_med = False
    for pat in non_med_patterns:
        if re.search(pat, p_lower):
            is_non_med = True
            break

    if is_non_med:
        # Check if it has any medical indicators
        if any(m_word in p_lower for m_word in medical_keywords):
            return True, "medical_supplies"
        if any(med_ind in p_lower for med_ind in medicine_indicators):
            return True, "medicine"
        
        # Category mapping
        if "shirt" in p_lower or "t-shirt" in p_lower:
            return False, "promotional"
        if "trash bag" in p_lower:
            return False, "supplies"
        return False, "office_supplies"

    return True, "medicine"


def enrich_rows(
    rows: list[dict[str, Any]],
    area_mapping: dict[str, dict[str, str]],
    product_mapping: dict[str, dict[str, str]],
) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for row in rows:
        parsed = parse_date(row.get("date_delivered"))
        if not parsed:
            continue
        if row.get("quality_status") == "rejected" or row.get("sales_acceptance_status") not in ("", "accepted_clean_sales", None):
            if row.get("sales_acceptance_status") != "accepted_clean_sales":
                continue

        info = area_info(row.get("area"), area_mapping)
        prod_text = str(row.get("product") or "").strip()
        prod_info = product_mapping.get(prod_text)
        item = dict(row)
        item["period"] = parsed.strftime("%Y-%m")
        item["calendar_year"] = parsed.year
        item["calendar_month"] = f"{parsed.month:02d}"
        item["standard_area"] = info.get("standard_area", item.get("area", ""))
        item["area_type"] = info.get("area_type", "unmapped")
        item["territory"] = info.get("territory", "")
        item["customer_type"] = info.get("customer_type", "")
        item["business_line"] = info.get("business_line", "")
        item["area_mapping_status"] = info.get("mapping_status", "unmapped")
        item["area_forecast_eligible"] = info.get("forecast_eligible", "false")
        item["area_weather_eligible"] = info.get("weather_eligible", "false")
        item["is_estimated_contract_allocation"] = item.get("allocation_status") == "estimated_backward_allocation"
        item["is_estimated_date"] = str(item.get("date_is_estimated", "")).lower() == "true"
        # Product Enrichment
        if prod_info:
            item["is_medicine"] = str(prod_info.get("is_medicine", "true")).lower() == "true"
            item["product_category"] = prod_info.get("product_category", "")
            item["product_mapping_status"] = prod_info.get("mapping_status", "approved")
        else:
            is_med, category = classify_product_is_medicine(prod_text)
            item["is_medicine"] = is_med
            item["product_category"] = category
            item["product_mapping_status"] = "auto_classified"
        enriched.append(item)
    return enriched


def aggregate(rows: list[dict[str, Any]], keys: tuple[str, ...]) -> list[dict[str, Any]]:
    grouped: dict[tuple[Any, ...], dict[str, Any]] = {}
    for row in rows:
        key = tuple(row.get(name, "") for name in keys)
        if key not in grouped:
            grouped[key] = {
                **{name: row.get(name, "") for name in keys},
                "row_count": 0,
                "estimated_contract_rows": 0,
                "estimated_date_rows": 0,
                "unique_products": set(),
                "unique_dr_numbers": set(),
            }
            for field in ADDITIVE_FIELDS:
                grouped[key][field] = 0.0

        group = grouped[key]
        group["row_count"] += 1
        group["estimated_contract_rows"] += 1 if row.get("is_estimated_contract_allocation") else 0
        group["estimated_date_rows"] += 1 if row.get("is_estimated_date") else 0
        group["unique_products"].add(row.get("product", ""))
        group["unique_dr_numbers"].add(row.get("dr_number", ""))
        for field in ADDITIVE_FIELDS:
            group[field] += safe_float(row.get(field))

    output: list[dict[str, Any]] = []
    for group in grouped.values():
        group["unique_products"] = len({value for value in group["unique_products"] if value})
        group["unique_dr_numbers"] = len({value for value in group["unique_dr_numbers"] if value})
        group["gross_margin_rate"] = (
            round_num(group["net_income"] / group["total_trade_price"], 6)
            if group["total_trade_price"]
            else 0
        )
        for field in ADDITIVE_FIELDS:
            group[field] = round_num(group[field], 4)
        output.append(group)

    return sorted(output, key=lambda item: tuple(str(item.get(name, "")) for name in keys))


def abc_pareto(rows: list[dict[str, Any]], group_field: str, output_field: str) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = str(row.get(group_field, "")).strip()
        if not key:
            continue
        if key not in grouped:
            grouped[key] = {
                output_field: key,
                "quantity": 0.0,
                "revenue": 0.0,
                "gross_margin_amount": 0.0,
                "row_count": 0,
                "active_months": set(),
                "estimated_contract_rows": 0,
            }
        item = grouped[key]
        item["quantity"] += safe_float(row.get("quantity"))
        item["revenue"] += safe_float(row.get("total_trade_price"))
        item["gross_margin_amount"] += safe_float(row.get("net_income"))
        item["row_count"] += 1
        item["active_months"].add(row["period"])
        item["estimated_contract_rows"] += 1 if row.get("is_estimated_contract_allocation") else 0

    total_revenue = sum(item["revenue"] for item in grouped.values()) or 1.0
    ranked = sorted(grouped.values(), key=lambda item: item["revenue"], reverse=True)
    cumulative = 0.0
    for rank, item in enumerate(ranked, start=1):
        cumulative += item["revenue"]
        cumulative_share = cumulative / total_revenue
        item["rank"] = rank
        item["quantity"] = round_num(item["quantity"], 4)
        item["revenue"] = round_num(item["revenue"], 4)
        item["gross_margin_amount"] = round_num(item["gross_margin_amount"], 4)
        item["gross_margin_rate"] = (
            round_num(item["gross_margin_amount"] / item["revenue"], 6)
            if item["revenue"]
            else 0
        )
        item["revenue_share"] = round_num(item["revenue"] / total_revenue, 6)
        item["cumulative_revenue_share"] = round_num(cumulative_share, 6)
        item["abc_class"] = "A" if cumulative_share <= 0.80 else "B" if cumulative_share <= 0.95 else "C"
        item["active_months"] = len(item["active_months"])
        item["method"] = "ABC/Pareto using total_trade_price revenue"
        item["status"] = "draft"
    return ranked


def seasonality(rows: list[dict[str, Any]], scope_field: str | None = None) -> list[dict[str, Any]]:
    by_scope: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for row in rows:
        scope = str(row.get(scope_field, "overall")) if scope_field else "overall"
        by_scope[scope][str(row["period"])[5:7]].append(safe_float(row.get("quantity")))

    output: list[dict[str, Any]] = []
    for scope, values_by_month in by_scope.items():
        all_values = [value for values in values_by_month.values() for value in values]
        baseline = statistics.mean(all_values) if all_values else 0.0
        if baseline <= 0:
            continue
        month_indexes = {}
        for month in MONTHS:
            month_average = statistics.mean(values_by_month[month]) if values_by_month.get(month) else 0.0
            month_indexes[month] = month_average / baseline if baseline else 0.0
        max_index = max(month_indexes.values()) if month_indexes else 0
        min_index = min(month_indexes.values()) if month_indexes else 0
        seasonal_strength = (max_index - min_index) / max_index if max_index else 0.0
        for month, index in month_indexes.items():
            output.append({
                "scope": scope,
                "calendar_month": month,
                "seasonal_index": round_num(index, 6),
                "seasonal_strength": round_num(seasonal_strength, 6),
                "interpretation": "higher_than_average" if index > 1.05 else "lower_than_average" if index < 0.95 else "near_average",
                "method": "monthly average demand divided by overall monthly average demand",
                "status": "draft",
            })
    return output


def yoy_growth(monthly_rows: list[dict[str, Any]], keys: tuple[str, ...] = ()) -> list[dict[str, Any]]:
    lookup = {tuple(row.get(key, "") for key in keys) + (row["period"],): row for row in monthly_rows}
    output: list[dict[str, Any]] = []
    for row in monthly_rows:
        current_year = int(str(row["period"])[:4])
        prior_period = f"{current_year - 1}-{str(row['period'])[5:7]}"
        prior = lookup.get(tuple(row.get(key, "") for key in keys) + (prior_period,))
        result = {key: row.get(key, "") for key in keys}
        result.update({
            "period": row["period"],
            "prior_period": prior_period,
            "quantity": row["quantity"],
            "revenue": row["total_trade_price"],
            "gross_margin_amount": row["net_income"],
            "prior_quantity": prior["quantity"] if prior else "",
            "prior_revenue": prior["total_trade_price"] if prior else "",
            "quantity_yoy_growth": round_num((row["quantity"] - prior["quantity"]) / prior["quantity"], 6) if prior and prior["quantity"] else "",
            "revenue_yoy_growth": round_num((row["total_trade_price"] - prior["total_trade_price"]) / prior["total_trade_price"], 6) if prior and prior["total_trade_price"] else "",
            "is_2025_partial": str(row["period"]).startswith("2025"),
        })
        output.append(result)
    return output


def contract_allocation_summary(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    estimated = [row for row in rows if row.get("is_estimated_contract_allocation")]
    if not estimated:
        return []
    return aggregate(estimated, ("period", "area", "product"))


def findings_markdown(summary: dict[str, Any], output_dir: Path) -> str:
    top_product = summary["top_product"]
    top_area = summary["top_area"]
    return "\n".join([
        "# Descriptive Analytics Findings",
        "",
        "## Scope",
        "",
        "This descriptive layer explains what happened in the historical MedShield sales data. It does not forecast future demand and does not create procurement recommendations.",
        "",
        "## Key Findings",
        "",
        f"- Clean rows analyzed: {summary['clean_rows']:,}.",
        f"- Historical period: {summary['period_start']} to {summary['period_end']}.",
        f"- Total demand units: {summary['total_quantity']:,.2f}.",
        f"- Sales revenue from `total_trade_price`: PHP {summary['total_revenue']:,.2f}.",
        f"- Workbook gross margin/profit from `net_income`: PHP {summary['total_gross_margin']:,.2f}.",
        f"- Top product by revenue: {top_product['product']} with PHP {top_product['revenue']:,.2f}.",
        f"- Top area by revenue: {top_area['area']} with PHP {top_area['revenue']:,.2f}.",
        f"- Estimated contract-allocation rows included: {summary['estimated_contract_rows']:,}.",
        f"- Estimated-date rows included: {summary['estimated_date_rows']:,}.",
        f"- Rows where workbook gross margin/profit exceeds revenue: {summary['gross_margin_exceeds_revenue_rows']:,}.",
        f"- Rows with negative workbook gross margin/profit: {summary['negative_gross_margin_rows']:,}.",
        "",
        "## Chapter 4 Use",
        "",
        "Use these outputs as evidence for historical descriptive analytics: monthly trend, yearly summary, ABC/Pareto, area summary, seasonality index, and YoY growth. Label outputs as draft until business definitions and product/area mappings are formally approved.",
        "",
        "## Limitations",
        "",
        "- `net_income` is workbook gross margin/profit, not company net profit.",
        "- Margin anomaly counts should be reviewed before making profitability claims.",
        "- Product-level findings depend on the current backward-allocation estimate and still need approved SKU mapping.",
        "- 2025 remains partial according to the data-quality notes, so use 2025 YoY interpretations carefully.",
        f"- Output folder: `{output_dir}`.",
        "",
    ])


def build_summary(rows: list[dict[str, Any]], product_abc: list[dict[str, Any]], area_abc: list[dict[str, Any]]) -> dict[str, Any]:
    dates = sorted(str(row["date_delivered"]) for row in rows)
    total_revenue = sum(safe_float(row.get("total_trade_price")) for row in rows)
    total_gross_margin = sum(safe_float(row.get("net_income")) for row in rows)
    gross_margin_exceeds_revenue_rows = sum(
        1
        for row in rows
        if safe_float(row.get("net_income")) > safe_float(row.get("total_trade_price"))
    )
    negative_gross_margin_rows = sum(1 for row in rows if safe_float(row.get("net_income")) < 0)
    return {
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source_dataset": str(DEFAULT_SALES_PATH.relative_to(ROOT)),
        "clean_rows": len(rows),
        "period_start": dates[0] if dates else "",
        "period_end": dates[-1] if dates else "",
        "total_quantity": round_num(sum(safe_float(row.get("quantity")) for row in rows), 4),
        "total_revenue": round_num(total_revenue, 4),
        "total_gross_margin": round_num(total_gross_margin, 4),
        "gross_margin_rate": round_num(total_gross_margin / total_revenue, 6) if total_revenue else 0,
        "unique_products": len({row.get("product") for row in rows if row.get("product")}),
        "unique_areas": len({row.get("area") for row in rows if row.get("area")}),
        "estimated_contract_rows": sum(1 for row in rows if row.get("is_estimated_contract_allocation")),
        "estimated_date_rows": sum(1 for row in rows if row.get("is_estimated_date")),
        "gross_margin_exceeds_revenue_rows": gross_margin_exceeds_revenue_rows,
        "negative_gross_margin_rows": negative_gross_margin_rows,
        "top_product": {
            "product": product_abc[0]["product"] if product_abc else "",
            "revenue": product_abc[0]["revenue"] if product_abc else 0,
            "abc_class": product_abc[0]["abc_class"] if product_abc else "",
        },
        "top_area": {
            "area": area_abc[0]["area"] if area_abc else "",
            "revenue": area_abc[0]["revenue"] if area_abc else 0,
            "abc_class": area_abc[0]["abc_class"] if area_abc else "",
        },
        "status": "draft",
        "limitations": [
            "Product master and area mapping still require final approval.",
            "Contract allocation rows are estimated and must remain labeled.",
            "2025 remains partial until the group approves completeness remediation.",
            "Workbook margin fields contain anomalies and should not be used as company net profit.",
            "Descriptive analytics answer what happened; they are not forecasts or prescriptions.",
        ],
    }


def run(sales_path: Path, area_mapping_path: Path, product_mapping_path: Path, output_dir: Path) -> dict[str, Any]:
    sales_path = sales_path if sales_path.is_absolute() else ROOT / sales_path
    area_mapping_path = area_mapping_path if area_mapping_path.is_absolute() else ROOT / area_mapping_path
    product_mapping_path = product_mapping_path if product_mapping_path.is_absolute() else ROOT / product_mapping_path
    output_dir = output_dir if output_dir.is_absolute() else ROOT / output_dir

    payload = read_json_gz(sales_path)
    raw_rows = payload.get("rows", [])
    area_mapping = read_area_mapping(area_mapping_path)
    product_mapping = read_product_mapping(product_mapping_path)
    rows = enrich_rows(raw_rows, area_mapping, product_mapping)

    monthly_trends = aggregate(rows, ("period",))
    yearly_summary = aggregate(rows, ("calendar_year",))
    area_summary = aggregate(rows, ("area_type", "standard_area"))
    area_type_summary = aggregate(rows, ("area_type",))
    territory_rows = [row for row in rows if row.get("area_type") == "territory"]
    # Segregate 80/20 analysis for Medicines vs Non-Medical Items
    medical_rows = [row for row in rows if row.get("is_medicine") is True]
    non_medical_rows = [row for row in rows if row.get("is_medicine") is False]

    product_abc = abc_pareto(medical_rows, "product", "product")
    non_medical_abc = abc_pareto(non_medical_rows, "product", "product")
    area_abc = abc_pareto(territory_rows, "territory", "area")
    seasonality_overall = seasonality(monthly_trends)
    seasonality_territory = seasonality(aggregate(territory_rows, ("period", "territory")), "territory")
    yoy_overall = yoy_growth(monthly_trends)
    yoy_territory = yoy_growth(aggregate(territory_rows, ("period", "territory")), ("territory",))
    contract_summary = contract_allocation_summary(rows)

    output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(output_dir / "descriptive_monthly_trends.csv", monthly_trends)
    write_csv(output_dir / "descriptive_yearly_summary.csv", yearly_summary)
    write_csv(output_dir / "descriptive_area_summary.csv", area_summary)
    write_csv(output_dir / "descriptive_area_type_summary.csv", area_type_summary)
    write_csv(output_dir / "descriptive_product_abc_pareto.csv", product_abc)
    write_csv(output_dir / "descriptive_non_medical_abc_pareto.csv", non_medical_abc)
    write_csv(output_dir / "descriptive_territory_abc_pareto.csv", area_abc)
    write_csv(output_dir / "descriptive_seasonality_overall.csv", seasonality_overall)
    write_csv(output_dir / "descriptive_seasonality_territory.csv", seasonality_territory)
    write_csv(output_dir / "descriptive_yoy_overall.csv", yoy_overall)
    write_csv(output_dir / "descriptive_yoy_territory.csv", yoy_territory)
    write_csv(output_dir / "descriptive_contract_allocation_summary.csv", contract_summary)

    (output_dir / "descriptive_chapter4_findings.md").write_text(
        findings_markdown(
            build_summary(rows, product_abc, area_abc),
            output_dir.relative_to(ROOT) if output_dir.is_relative_to(ROOT) else output_dir,
        ),
        encoding="utf-8",
    )
    summary = build_summary(rows, product_abc, area_abc)
    summary["output_files"] = sorted(path.name for path in output_dir.glob("*") if path.is_file())
    write_json(output_dir / "descriptive_run_summary.json", summary)
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run MedShield descriptive analytics outputs.")
    parser.add_argument("--sales-path", type=Path, default=DEFAULT_SALES_PATH)
    parser.add_argument("--area-mapping-path", type=Path, default=DEFAULT_AREA_MAPPING_PATH)
    parser.add_argument("--product-mapping-path", type=Path, default=DEFAULT_PRODUCT_MAPPING_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summary = run(args.sales_path, args.area_mapping_path, args.product_mapping_path, args.output_dir)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
