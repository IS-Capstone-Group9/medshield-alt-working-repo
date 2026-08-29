from __future__ import annotations

import csv
import copy
import gzip
import json
from collections import defaultdict
from datetime import date
from functools import lru_cache
from pathlib import Path
from threading import Lock
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_CANDIDATE_PATH = (
    ROOT_DIR / "data" / "medshield" / "certification" / "sales_2017_2025_v1_candidate.json.gz"
)
DEFAULT_AREA_MASTER_PATH = (
    ROOT_DIR / "data" / "medshield" / "certification" / "sales_2017_2025_v1_area_master_candidate.csv"
)

_CACHE_LOCK = Lock()


def _month_number(period: str) -> int:
    year, month = period.split("-", 1)
    return int(year) * 12 + int(month) - 1


def _approved_territories(path: Path) -> dict[str, str]:
    territories: dict[str, str] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("mapping_status") != "approved" or row.get("area_type") != "territory":
                continue
            raw_area = str(row.get("raw_area") or "").strip().upper()
            standard_area = str(row.get("standard_area") or "").strip()
            if raw_area and standard_area:
                territories[raw_area] = standard_area
    return territories


def _abc_classes(sales_by_area: dict[str, float]) -> dict[str, str]:
    total = sum(max(value, 0.0) for value in sales_by_area.values())
    cumulative = 0.0
    classes: dict[str, str] = {}
    for area, sales_value in sorted(sales_by_area.items(), key=lambda item: item[1], reverse=True):
        cumulative += max(sales_value, 0.0)
        cumulative_share = cumulative / total if total else 1.0
        classes[area] = "A" if cumulative_share <= 0.80 else "B" if cumulative_share <= 0.95 else "C"
    return classes


def _build_commercial_mcda_uncached(
    candidate_path: Path,
    area_master_path: Path,
) -> dict[str, Any]:
    approved_territories = _approved_territories(area_master_path)
    with gzip.open(candidate_path, "rt", encoding="utf-8") as handle:
        candidate = json.load(handle)

    sales_by_area: dict[str, float] = defaultdict(float)
    periods_by_area: dict[str, set[str]] = defaultdict(set)
    row_counts: dict[str, int] = defaultdict(int)
    all_periods: set[str] = set()

    for row in candidate.get("rows", []):
        if not row.get("publication_eligible"):
            continue
        area = approved_territories.get(str(row.get("area") or "").strip().upper())
        period = str(row.get("date_delivered") or "")[:7]
        if not area or len(period) != 7:
            continue
        try:
            sales_value = float(row.get("net_cost") or 0.0)
            _month_number(period)
        except (TypeError, ValueError):
            continue
        sales_by_area[area] += sales_value
        periods_by_area[area].add(period)
        row_counts[area] += 1
        all_periods.add(period)

    if not sales_by_area or not all_periods:
        raise ValueError("No publication-eligible rows with approved territory mappings are available")

    first_period = min(all_periods)
    last_period = max(all_periods)
    available_months = _month_number(last_period) - _month_number(first_period) + 1
    maximum_sales = max(max(sales_by_area.values()), 0.0)
    total_sales = sum(max(value, 0.0) for value in sales_by_area.values())
    abc_classes = _abc_classes(sales_by_area)

    territories: list[dict[str, Any]] = []
    for area, sales_value in sales_by_area.items():
        sales_score = (max(sales_value, 0.0) / maximum_sales * 100.0) if maximum_sales else 0.0
        active_months = len(periods_by_area[area])
        coverage_score = active_months / available_months * 100.0
        score = 0.60 * sales_score + 0.40 * coverage_score
        territories.append({
            "territory": area,
            "abc_class": abc_classes[area],
            "sales_value": round(sales_value, 2),
            "sales_value_share": round(max(sales_value, 0.0) / total_sales, 6) if total_sales else 0.0,
            "source_row_count": row_counts[area],
            "active_months": active_months,
            "available_months": available_months,
            "sales_value_score": round(sales_score, 2),
            "activity_coverage_score": round(coverage_score, 2),
            "mcda_score": round(score, 2),
        })

    territories.sort(key=lambda row: (-row["mcda_score"], row["territory"]))
    for index, row in enumerate(territories, start=1):
        row["priority_rank"] = index
        row["recommendation"] = (
            "High commercial-priority candidate; validate current stock and budget before allocation."
            if index <= 3
            else "Commercial-priority candidate; monitor and review before allocation."
        )

    metadata = candidate.get("metadata", {})
    return {
        "model_code": "COMMERCIAL_MCDA_V2",
        "model_version": "2.0.0",
        "status": "candidate",
        "label": (
            "CANDIDATE - Based on publication-eligible sales rows and approved territory mappings; "
            "reviewer approval is pending."
        ),
        "dataset_id": metadata.get("dataset_id", "sales_2017_2025_v1"),
        "dataset_status": metadata.get("publication_status", "candidate_pending_review"),
        "data_period": f"{first_period} to {last_period}",
        "weights": {"sales_value": 0.60, "activity_coverage": 0.40},
        "criteria": [
            {
                "key": "sales_value",
                "label": "Candidate sales-value scale",
                "definition": "Territory net_cost total normalized to the largest approved territory.",
                "provenance": "Financial reconciliation candidate mapping; approval pending.",
            },
            {
                "key": "activity_coverage",
                "label": "Observed month coverage",
                "definition": "Unique active sales months divided by available months in the candidate period.",
                "provenance": "Publication-eligible dated transactions only.",
            },
        ],
        "excluded_criteria": {
            "outbreak_risk": "Excluded pending validated territory-level DOH surveillance data (P7).",
            "supplier_lead_time": "Excluded pending supplier lead-time history (P8).",
        },
        "weight_note": (
            "Weights total 100%. Outbreak risk and supplier lead time are not scored until their source data is validated."
        ),
        "territories": territories,
    }


@lru_cache(maxsize=8)
def _build_commercial_mcda_cached(
    candidate_path: str,
    candidate_mtime_ns: int,
    candidate_size: int,
    area_master_path: str,
    area_master_mtime_ns: int,
    area_master_size: int,
) -> dict[str, Any]:
    del candidate_mtime_ns, candidate_size, area_master_mtime_ns, area_master_size
    return _build_commercial_mcda_uncached(Path(candidate_path), Path(area_master_path))


def build_commercial_mcda(
    candidate_path: Path = DEFAULT_CANDIDATE_PATH,
    area_master_path: Path = DEFAULT_AREA_MASTER_PATH,
) -> dict[str, Any]:
    candidate_path = candidate_path.resolve()
    area_master_path = area_master_path.resolve()
    candidate_stat = candidate_path.stat()
    area_master_stat = area_master_path.stat()

    cache_key = (
        str(candidate_path),
        candidate_stat.st_mtime_ns,
        candidate_stat.st_size,
        str(area_master_path),
        area_master_stat.st_mtime_ns,
        area_master_stat.st_size,
    )
    # Serialize cold loads so concurrent dashboard requests do not decompress
    # and aggregate the same multi-year candidate more than once.
    with _CACHE_LOCK:
        result = _build_commercial_mcda_cached(*cache_key)
    return copy.deepcopy(result)
