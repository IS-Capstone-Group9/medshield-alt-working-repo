"""Extract and clean the current DOH and PAGASA historical source packages.

Raw files remain unchanged. Outputs are analytical candidates, never live alerts.
Run from the repository root:

    python -m services.analytics_service.jobs.prepare_external_sources
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[3]
DOH_ROOT = (
    ROOT
    / "data"
    / "DOH (2018-2026)-20260914T142300Z-1-001"
    / "DOH (2018-2026)"
    / "Disease-Specific CSV Files"
)
PAGASA_ROOT = ROOT / "data" / "PAGASA 2017-2024"
AREA_MAPPING = ROOT / "datasources" / "templates" / "area_classification_mapping.csv"
PAGASA_MAPPING_MASTER = ROOT / "datasources" / "templates" / "regression_station_mapping.csv"

DOH_CLEAN = ROOT / "datasources" / "clean" / "doh" / "doh_historical_monthly_clean.csv"
DOH_TERRITORY_CANDIDATE = (
    ROOT / "datasources" / "clean" / "doh" / "doh_sales_territory_monthly_candidate.csv"
)
PAGASA_DAILY_CLEAN = (
    ROOT / "datasources" / "clean" / "pagasa" / "pagasa_historical_daily_clean.csv"
)
PAGASA_MONTHLY_CLEAN = (
    ROOT / "datasources" / "clean" / "pagasa" / "pagasa_historical_monthly_clean.csv"
)
PAGASA_MAPPING_REVIEW = (
    ROOT / "datasources" / "clean" / "pagasa" / "pagasa_station_territory_review.csv"
)
REPORT = ROOT / "outputs" / "external_sources" / "external_source_cleaning_report.json"

DOH_DECLARED_START_YEAR = 2018
DOH_DECLARED_END_YEAR = 2026
SALES_ANALYSIS_END_YEAR = 2025
PAGASA_DECLARED_START_YEAR = 2017
PAGASA_REQUESTED_END_YEAR = 2025
MODEL_DISEASES = {"Dengue", "Leptospirosis", "Cholera", "Typhoid Fever"}


def normalize(value: object) -> str:
    return " ".join(str(value or "").strip().split())


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def dataset_sha256(files: Iterable[Path], base: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(files):
        relative = path.relative_to(base).as_posix()
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(file_sha256(path).encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest()


def atomic_csv(path: Path, columns: list[str], rows: Iterable[dict[str, object]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    count = 0
    with temporary.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({column: row.get(column, "") for column in columns})
            count += 1
    temporary.replace(path)
    return count


def classification_group(raw: str) -> str:
    value = normalize(raw).upper()
    if not value or value == "PENDING":
        return "PENDING_REVIEW"
    if "DISCARD" in value or value == "NOT AFP":
        return "EXCLUDED_DISCARDED"
    if value == "C" or "CONFIRM" in value or value in {"VDPV", "VAPP"}:
        return "CONFIRMED"
    if value == "P" or "PROB" in value:
        return "PROBABLE"
    if (
        value == "S"
        or "SUSPECT" in value
        or "CLINICALLY COMPATIBLE" in value
        or "POLIO COMPATIBLE" in value
        or "POLIO-COMPATIBLE" in value
    ):
        return "SUSPECT_OR_COMPATIBLE"
    return "OTHER_REVIEW"


def load_territories() -> dict[str, dict[str, str]]:
    with AREA_MAPPING.open(encoding="utf-8-sig", newline="") as handle:
        result = {}
        for row in csv.DictReader(handle):
            if row["mapping_status"].lower() == "approved" and row["area_type"] == "territory":
                result[normalize(row["territory"]).upper()] = row
        return result


def prepare_doh(territories: dict[str, dict[str, str]]) -> dict[str, object]:
    source_files = sorted(DOH_ROOT.glob("*.csv"))
    if not source_files:
        raise FileNotFoundError(f"No DOH disease CSV files found under {DOH_ROOT}")

    expected = {
        "Date of Onset",
        "Region",
        "Province",
        "Municipality_City",
        "Case Classification",
        "Number of Cases",
    }
    aggregates: dict[tuple[str, ...], list[float]] = defaultdict(lambda: [0.0, 0.0])
    source_checksums: dict[str, str] = {}
    audit = Counter()
    file_audit = []
    latest_onset: date | None = None

    for path in source_files:
        disease = re.sub(r"_\d{8}$", "", path.stem)
        source_file = path.name
        source_checksums[source_file] = file_sha256(path)
        local = Counter()
        local_min: date | None = None
        local_max: date | None = None
        with path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            missing_columns = expected.difference(reader.fieldnames or [])
            if missing_columns:
                raise ValueError(f"Unexpected DOH schema in {source_file}: {sorted(missing_columns)}")
            for raw in reader:
                audit["source_rows"] += 1
                local["source_rows"] += 1
                try:
                    onset = date.fromisoformat(normalize(raw["Date of Onset"])[:10])
                except ValueError:
                    audit["invalid_date_rows"] += 1
                    local["invalid_date_rows"] += 1
                    continue
                try:
                    cases = float(normalize(raw["Number of Cases"]))
                    if not math.isfinite(cases) or cases < 0:
                        raise ValueError
                except ValueError:
                    audit["invalid_case_rows"] += 1
                    local["invalid_case_rows"] += 1
                    continue

                region = normalize(raw["Region"]).upper()
                province = normalize(raw["Province"]).upper()
                municipality = normalize(raw["Municipality_City"]).upper()
                raw_classification = normalize(raw["Case Classification"]).upper()
                group = classification_group(raw_classification)
                if not province:
                    audit["missing_province_rows"] += 1
                    local["missing_province_rows"] += 1
                if onset.year < DOH_DECLARED_START_YEAR or onset.year > DOH_DECLARED_END_YEAR:
                    audit["outside_declared_year_rows"] += 1
                    local["outside_declared_year_rows"] += 1
                if onset.year == DOH_DECLARED_END_YEAR:
                    audit["partial_2026_rows"] += 1
                    local["partial_2026_rows"] += 1
                if group == "EXCLUDED_DISCARDED":
                    audit["discarded_rows"] += 1
                    local["discarded_rows"] += 1
                elif group in {"PENDING_REVIEW", "OTHER_REVIEW"}:
                    audit["classification_review_rows"] += 1
                    local["classification_review_rows"] += 1

                local_min = onset if local_min is None or onset < local_min else local_min
                local_max = onset if local_max is None or onset > local_max else local_max
                latest_onset = onset if latest_onset is None or onset > latest_onset else latest_onset
                key = (
                    onset.replace(day=1).isoformat(),
                    str(onset.year),
                    str(onset.month),
                    region,
                    province,
                    disease,
                    raw_classification,
                    group,
                    source_file,
                )
                aggregates[key][0] += cases
                aggregates[key][1] += 1
                audit["valid_rows"] += 1
                audit["reported_cases"] += cases
                local["valid_rows"] += 1
                local["reported_cases"] += cases
        file_audit.append(
            {
                "file": source_file,
                "disease": disease,
                "sha256": source_checksums[source_file],
                "minimum_onset": local_min.isoformat() if local_min else None,
                "maximum_onset": local_max.isoformat() if local_max else None,
                **dict(local),
            }
        )

    def cleaned_rows():
        for key in sorted(aggregates):
            period_start, year, month, region, province, disease, raw_classification, group, source_file = key
            cases, source_rows = aggregates[key]
            mapping = territories.get(province)
            in_declared_scope = DOH_DECLARED_START_YEAR <= int(year) <= DOH_DECLARED_END_YEAR
            period_status = (
                "OUTSIDE_DECLARED_SCOPE"
                if not in_declared_scope
                else "PARTIAL_CURRENT_YEAR"
                if int(year) == DOH_DECLARED_END_YEAR
                else "CLOSED_HISTORICAL_YEAR"
            )
            join_status = (
                "NOT_SALES_TERRITORY"
                if not mapping
                else "APPROVED_FOR_EXTERNAL_JOIN"
                if mapping.get("external_mapping_status", "").lower() == "approved"
                else "EXTERNAL_MAPPING_PENDING"
            )
            yield {
                "date": period_start,
                "year": year,
                "month": month,
                "region": region,
                "province_city": province,
                "disease_name": disease,
                "case_classification": raw_classification,
                "classification_group": group,
                "case_count": format(cases, ".6f").rstrip("0").rstrip("."),
                "source_record_count": int(source_rows),
                "death_count": "",
                "population": "",
                "disease_intensity_indicator": "",
                "period_status": period_status,
                "sales_territory": mapping.get("territory", "") if mapping else "",
                "territory_id": mapping.get("territory_id", "") if mapping else "",
                "external_join_status": join_status,
                "source": "DOH",
                "source_file": source_file,
                "source_file_sha256": source_checksums[source_file],
                "source_dataset_version": "DOH_2018_2026_EXTRACTED_20260914",
                "notes": "Onset-month aggregate; final revised surveillance data; release dates unavailable",
            }

    doh_columns = [
        "date", "year", "month", "region", "province_city", "disease_name",
        "case_classification", "classification_group", "case_count", "source_record_count",
        "death_count", "population", "disease_intensity_indicator", "period_status",
        "sales_territory", "territory_id", "external_join_status", "source", "source_file",
        "source_file_sha256", "source_dataset_version", "notes",
    ]
    clean_count = atomic_csv(DOH_CLEAN, doh_columns, cleaned_rows())

    candidates: dict[tuple[str, str, str, str], dict[str, object]] = {}
    included_groups = {"CONFIRMED", "PROBABLE", "SUSPECT_OR_COMPATIBLE"}
    for key, values in aggregates.items():
        period_start, year, _month, _region, province, disease, _raw_classification, group, _source_file = key
        mapping = territories.get(province)
        if (
            mapping
            and disease in MODEL_DISEASES
            and DOH_DECLARED_START_YEAR <= int(year) <= SALES_ANALYSIS_END_YEAR
            and group in included_groups
        ):
            candidate_key = (period_start, disease, mapping["territory"], mapping["territory_id"])
            row = candidates.setdefault(
                candidate_key,
                {"case_count": 0.0, "source_record_count": 0, "groups": set()},
            )
            row["case_count"] += values[0]
            row["source_record_count"] += int(values[1])
            row["groups"].add(group)

    def candidate_rows():
        for (period_start, disease, territory, territory_id), row in sorted(candidates.items()):
            mapping = territories[territory.upper()]
            external_status = mapping.get("external_mapping_status", "").lower()
            yield {
                "period": period_start[:7],
                "period_start": period_start,
                "provider": "DOH",
                "signal": disease,
                "territory": territory,
                "territory_id": territory_id,
                "value": format(row["case_count"], ".6f").rstrip("0").rstrip("."),
                "unit": "reported non-discarded surveillance cases",
                "source_record_count": row["source_record_count"],
                "included_classification_groups": ";".join(sorted(row["groups"])),
                "external_mapping_status": external_status or "pending",
                "is_external_join_ready": str(external_status == "approved").lower(),
                "analysis_status": "CANDIDATE_ONLY_EXTERNAL_MAPPING_REVIEW_REQUIRED",
                "source_dataset_version": "DOH_2018_2026_EXTRACTED_20260914",
            }

    candidate_columns = [
        "period", "period_start", "provider", "signal", "territory", "territory_id",
        "value", "unit", "source_record_count", "included_classification_groups",
        "external_mapping_status", "is_external_join_ready", "analysis_status",
        "source_dataset_version",
    ]
    candidate_count = atomic_csv(DOH_TERRITORY_CANDIDATE, candidate_columns, candidate_rows())
    return {
        "source_directory": DOH_ROOT.relative_to(ROOT).as_posix(),
        "source_dataset_sha256": dataset_sha256(source_files, DOH_ROOT),
        "source_files": file_audit,
        "latest_onset_date": latest_onset.isoformat() if latest_onset else None,
        "declared_coverage": "2018-2026",
        "observed_coverage": "2017-2026",
        "2026_status": "partial through " + latest_onset.isoformat() if latest_onset else "unavailable",
        "clean_rows": clean_count,
        "territory_candidate_rows": candidate_count,
        "output_sha256": {
            DOH_CLEAN.relative_to(ROOT).as_posix(): file_sha256(DOH_CLEAN),
            DOH_TERRITORY_CANDIDATE.relative_to(ROOT).as_posix(): file_sha256(DOH_TERRITORY_CANDIDATE),
        },
        "audit": dict(audit),
        "outputs": [DOH_CLEAN.relative_to(ROOT).as_posix(), DOH_TERRITORY_CANDIDATE.relative_to(ROOT).as_posix()],
    }


def parse_station_metadata() -> tuple[dict[str, dict[str, str]], list[dict[str, object]]]:
    pattern = re.compile(
        r"^(?P<station>.+?) Latitude: (?P<latitude>-?[0-9.]+) N "
        r"Longitude: (?P<longitude>-?[0-9.]+) E Elevation: (?P<elevation>.+?) m$"
    )
    metadata: dict[str, dict[str, str]] = {}
    conflicts = []
    for readme in sorted(PAGASA_ROOT.rglob("A.ReadMe.txt")):
        for line in readme.read_text(encoding="utf-8-sig").splitlines():
            match = pattern.match(line.strip())
            if not match:
                continue
            row = match.groupdict()
            station = row.pop("station")
            previous = metadata.get(station)
            if previous and previous != row:
                conflicts.append({"station": station, "first": previous, "other": row, "file": readme.name})
            else:
                metadata[station] = row
    return metadata, conflicts


def numeric(raw: object, minimum: float | None, maximum: float | None, audit: Counter, field: str) -> float | None:
    value = normalize(raw)
    if not value:
        audit[f"{field}_missing"] += 1
        return None
    try:
        number = float(value)
    except ValueError:
        audit[f"{field}_invalid"] += 1
        return None
    if number == -999:
        audit[f"{field}_missing_sentinel"] += 1
        return None
    if (minimum is not None and number < minimum) or (maximum is not None and number > maximum):
        audit[f"{field}_out_of_range"] += 1
        return None
    return number


@dataclass
class WeatherMonth:
    dates: set[date] = field(default_factory=set)
    rainfall: list[float] = field(default_factory=list)
    temperature: list[float] = field(default_factory=list)
    humidity: list[float] = field(default_factory=list)
    wind_kph: list[float] = field(default_factory=list)
    trace_days: int = 0
    source_files: set[str] = field(default_factory=set)


def prepare_pagasa(territories: dict[str, dict[str, str]]) -> dict[str, object]:
    source_files = sorted(PAGASA_ROOT.rglob("*Daily Data.csv"))
    if not source_files:
        raise FileNotFoundError(f"No PAGASA station CSV files found under {PAGASA_ROOT}")
    station_metadata, metadata_conflicts = parse_station_metadata()
    audit = Counter()
    monthly: dict[tuple[str, int, int], WeatherMonth] = defaultdict(WeatherMonth)
    source_checksums = {path.relative_to(PAGASA_ROOT).as_posix(): file_sha256(path) for path in source_files}

    daily_columns = [
        "date", "year", "month", "day", "station_name", "latitude", "longitude",
        "elevation_m", "rainfall_mm", "is_trace_rainfall", "temperature_max_c",
        "temperature_min_c", "temperature_mean_c", "temperature_mean_method",
        "humidity_mean_pct", "wind_speed_mean_kph", "wind_direction_degrees",
        "weather_indicator", "source", "source_file", "source_file_sha256",
        "source_dataset_version", "quality_status", "notes",
    ]

    def daily_rows():
        for path in source_files:
            relative = path.relative_to(PAGASA_ROOT).as_posix()
            station = path.name.removesuffix(" Daily Data.csv")
            metadata = station_metadata.get(station, {})
            with path.open(encoding="utf-8-sig", newline="") as handle:
                reader = csv.DictReader(handle)
                for raw in reader:
                    audit["source_rows"] += 1
                    try:
                        observed = date(int(raw["YEAR"]), int(raw["MONTH"]), int(raw["DAY"]))
                    except (KeyError, TypeError, ValueError):
                        audit["invalid_date_rows"] += 1
                        continue
                    if not (PAGASA_DECLARED_START_YEAR <= observed.year <= PAGASA_REQUESTED_END_YEAR):
                        audit["outside_requested_year_rows"] += 1

                    trace = normalize(raw.get("RAINFALL")) == "-1.0" or normalize(raw.get("RAINFALL")) == "-1"
                    if trace:
                        rainfall = 0.0
                        audit["rainfall_trace_rows"] += 1
                    else:
                        rainfall = numeric(raw.get("RAINFALL"), 0, None, audit, "rainfall")
                    tmax = numeric(raw.get("TMAX"), -30, 65, audit, "temperature_max")
                    tmin = numeric(raw.get("TMIN"), -30, 65, audit, "temperature_min")
                    reported_mean = numeric(raw.get("TMEAN"), -30, 65, audit, "temperature_mean")
                    if reported_mean is not None:
                        tmean = reported_mean
                        tmean_method = "REPORTED"
                    elif tmax is not None and tmin is not None:
                        tmean = round((tmax + tmin) / 2, 4)
                        tmean_method = "DERIVED_TMAX_TMIN_MIDPOINT"
                        audit["temperature_mean_derived_rows"] += 1
                    else:
                        tmean = None
                        tmean_method = "UNAVAILABLE"
                    humidity = numeric(raw.get("RH"), 0, 100, audit, "humidity")
                    wind_ms = numeric(raw.get("WIND_SPEED"), 0, None, audit, "wind_speed")
                    wind_kph = round(wind_ms * 3.6, 4) if wind_ms is not None else None
                    direction = numeric(raw.get("WIND_DIRECTION"), 0, 360, audit, "wind_direction")
                    available = sum(value is not None for value in (rainfall, tmean, humidity, wind_kph))
                    quality = "VALID_COMPLETE" if available == 4 else "VALID_WITH_MISSING_MEASURES"
                    notes = []
                    if trace:
                        notes.append("TRACE_RAINFALL_LT_0.1MM_STORED_AS_LOWER_BOUND_ZERO")
                    if tmean_method == "DERIVED_TMAX_TMIN_MIDPOINT":
                        notes.append("TEMPERATURE_MEAN_DERIVED_FROM_DAILY_MAX_MIN")
                    if available < 4:
                        notes.append("ONE_OR_MORE_ANALYTICAL_MEASURES_MISSING")
                    month = monthly[(station, observed.year, observed.month)]
                    if observed in month.dates:
                        audit["duplicate_station_date_rows"] += 1
                    month.dates.add(observed)
                    month.source_files.add(relative)
                    if rainfall is not None:
                        month.rainfall.append(rainfall)
                    if tmean is not None:
                        month.temperature.append(tmean)
                    if humidity is not None:
                        month.humidity.append(humidity)
                    if wind_kph is not None:
                        month.wind_kph.append(wind_kph)
                    month.trace_days += int(trace)
                    audit["valid_date_rows"] += 1
                    yield {
                        "date": observed.isoformat(),
                        "year": observed.year,
                        "month": observed.month,
                        "day": observed.day,
                        "station_name": station,
                        "latitude": metadata.get("latitude", ""),
                        "longitude": metadata.get("longitude", ""),
                        "elevation_m": metadata.get("elevation", ""),
                        "rainfall_mm": "" if rainfall is None else rainfall,
                        "is_trace_rainfall": str(trace).lower(),
                        "temperature_max_c": "" if tmax is None else tmax,
                        "temperature_min_c": "" if tmin is None else tmin,
                        "temperature_mean_c": "" if tmean is None else tmean,
                        "temperature_mean_method": tmean_method,
                        "humidity_mean_pct": "" if humidity is None else humidity,
                        "wind_speed_mean_kph": "" if wind_kph is None else wind_kph,
                        "wind_direction_degrees": "" if direction is None else direction,
                        "weather_indicator": "HISTORICAL_STATION_OBSERVATION",
                        "source": "PAGASA",
                        "source_file": relative,
                        "source_file_sha256": source_checksums[relative],
                        "source_dataset_version": "PAGASA_2017_2024",
                        "quality_status": quality,
                        "notes": ";".join(notes),
                    }

    daily_count = atomic_csv(PAGASA_DAILY_CLEAN, daily_columns, daily_rows())

    monthly_columns = [
        "period", "period_start", "year", "month", "station_name", "latitude", "longitude",
        "elevation_m", "calendar_day_count", "expected_calendar_days", "is_complete_calendar_month",
        "rainfall_observation_days", "rainfall_total_mm", "rainfall_observed_total_mm",
        "trace_rainfall_days", "temperature_observation_days", "temperature_mean_c",
        "humidity_observation_days", "humidity_mean_pct", "wind_observation_days",
        "wind_speed_mean_kph", "monthly_analysis_status", "source", "source_files",
        "source_dataset_version", "notes",
    ]

    def monthly_rows():
        import calendar

        for (station, year, month_number), values in sorted(monthly.items()):
            metadata = station_metadata.get(station, {})
            expected_days = calendar.monthrange(year, month_number)[1]
            complete_calendar = len(values.dates) == expected_days
            rainfall_complete = len(values.rainfall) == expected_days
            status = "ANALYSIS_READY_RAINFALL" if complete_calendar and rainfall_complete else "INCOMPLETE_MONTH"
            yield {
                "period": f"{year:04d}-{month_number:02d}",
                "period_start": f"{year:04d}-{month_number:02d}-01",
                "year": year,
                "month": month_number,
                "station_name": station,
                "latitude": metadata.get("latitude", ""),
                "longitude": metadata.get("longitude", ""),
                "elevation_m": metadata.get("elevation", ""),
                "calendar_day_count": len(values.dates),
                "expected_calendar_days": expected_days,
                "is_complete_calendar_month": str(complete_calendar).lower(),
                "rainfall_observation_days": len(values.rainfall),
                "rainfall_total_mm": round(sum(values.rainfall), 4) if rainfall_complete else "",
                "rainfall_observed_total_mm": round(sum(values.rainfall), 4) if values.rainfall else "",
                "trace_rainfall_days": values.trace_days,
                "temperature_observation_days": len(values.temperature),
                "temperature_mean_c": round(sum(values.temperature) / len(values.temperature), 4) if values.temperature else "",
                "humidity_observation_days": len(values.humidity),
                "humidity_mean_pct": round(sum(values.humidity) / len(values.humidity), 4) if values.humidity else "",
                "wind_observation_days": len(values.wind_kph),
                "wind_speed_mean_kph": round(sum(values.wind_kph) / len(values.wind_kph), 4) if values.wind_kph else "",
                "monthly_analysis_status": status,
                "source": "PAGASA",
                "source_files": ";".join(sorted(values.source_files)),
                "source_dataset_version": "PAGASA_2017_2024",
                "notes": "Trace rainfall uses zero lower bound; incomplete metrics are not zero-filled",
            }

    monthly_count = atomic_csv(PAGASA_MONTHLY_CLEAN, monthly_columns, monthly_rows())

    with PAGASA_MAPPING_MASTER.open(encoding="utf-8-sig", newline="") as handle:
        proposals = {normalize(row["territory"]): row for row in csv.DictReader(handle)}
    if set(proposals) != {row["territory"] for row in territories.values()}:
        raise ValueError("PAGASA mapping master must contain every approved sales territory exactly once")
    review_rows = []
    for territory_name, mapping in sorted((row["territory"], row) for row in territories.values()):
        proposal = proposals[territory_name]
        station_file = normalize(proposal["station_file"])
        station = station_file.removesuffix(" Daily Data.csv")
        notes = normalize(proposal["review_notes"])
        periods = [key for key in monthly if key[0] == station] if station else []
        ready_months = sum(
            len(monthly[key].dates) == __import__("calendar").monthrange(key[1], key[2])[1]
            and len(monthly[key].rainfall) == __import__("calendar").monthrange(key[1], key[2])[1]
            for key in periods
        )
        years = sorted({key[1] for key in periods})
        mapping_status = normalize(proposal["mapping_status"]).lower()
        trace_policy = normalize(proposal["trace_policy"])
        if mapping_status not in {"approved", "needs_review"}:
            raise ValueError(f"Invalid PAGASA mapping status for {territory_name}")
        if trace_policy != "lower_bound_zero":
            raise ValueError(f"Unapproved PAGASA trace policy for {territory_name}")
        external_ready = (
            mapping_status == "approved"
            and mapping.get("external_mapping_status", "").lower() == "approved"
            and bool(station)
            and ready_months > 0
        )
        review_rows.append(
            {
                "territory": territory_name,
                "territory_id": mapping["territory_id"],
                "proposed_station_name": station,
                "proposed_station_file_pattern": station_file,
                "mapping_status": mapping_status,
                "trace_policy": trace_policy,
                "observed_start_year": years[0] if years else "",
                "observed_end_year": years[-1] if years else "",
                "analysis_ready_rainfall_months": ready_months,
                "external_join_ready": str(external_ready).lower(),
                "review_notes": notes,
            }
        )
    review_columns = [
        "territory", "territory_id", "proposed_station_name", "proposed_station_file_pattern",
        "mapping_status", "trace_policy", "observed_start_year", "observed_end_year",
        "analysis_ready_rainfall_months", "external_join_ready", "review_notes",
    ]
    review_count = atomic_csv(PAGASA_MAPPING_REVIEW, review_columns, review_rows)
    observed_years = sorted({year for _station, year, _month in monthly})
    return {
        "source_directory": PAGASA_ROOT.relative_to(ROOT).as_posix(),
        "source_dataset_sha256": dataset_sha256(source_files, PAGASA_ROOT),
        "source_file_count": len(source_files),
        "station_count": len({station for station, _year, _month in monthly}),
        "observed_coverage": f"{observed_years[0]}-{observed_years[-1]}",
        "requested_coverage": f"{PAGASA_DECLARED_START_YEAR}-{PAGASA_REQUESTED_END_YEAR}",
        "2025_status": "MISSING_FROM_SUPPLIED_SOURCE",
        "daily_clean_rows": daily_count,
        "monthly_clean_rows": monthly_count,
        "mapping_review_rows": review_count,
        "mapping_master": PAGASA_MAPPING_MASTER.relative_to(ROOT).as_posix(),
        "mapping_master_sha256": file_sha256(PAGASA_MAPPING_MASTER),
        "output_sha256": {
            PAGASA_DAILY_CLEAN.relative_to(ROOT).as_posix(): file_sha256(PAGASA_DAILY_CLEAN),
            PAGASA_MONTHLY_CLEAN.relative_to(ROOT).as_posix(): file_sha256(PAGASA_MONTHLY_CLEAN),
            PAGASA_MAPPING_REVIEW.relative_to(ROOT).as_posix(): file_sha256(PAGASA_MAPPING_REVIEW),
        },
        "metadata_conflicts": metadata_conflicts,
        "audit": dict(audit),
        "outputs": [
            PAGASA_DAILY_CLEAN.relative_to(ROOT).as_posix(),
            PAGASA_MONTHLY_CLEAN.relative_to(ROOT).as_posix(),
            PAGASA_MAPPING_REVIEW.relative_to(ROOT).as_posix(),
        ],
    }


def prepare() -> dict[str, object]:
    territories = load_territories()
    result = {
        "policy_version": "external_sources_clean_v1_20260914",
        "publication_status": "CANDIDATE_ONLY",
        "area_mapping_file": AREA_MAPPING.relative_to(ROOT).as_posix(),
        "area_mapping_sha256": file_sha256(AREA_MAPPING),
        "approved_sales_territories": sorted(row["territory"] for row in territories.values()),
        "doh": prepare_doh(territories),
        "pagasa": prepare_pagasa(territories),
        "integration_gate": {
            "external_join_ready": False,
            "reasons": [
                "All approved sales territories still have external_mapping_status=pending",
                "PAGASA 2025 is absent from the supplied official station files",
                "The product master has not approved medical-demand SKUs",
            ],
        },
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    temporary = REPORT.with_suffix(REPORT.suffix + ".tmp")
    temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(REPORT)
    print(json.dumps({
        "status": "PASS_CANDIDATE_ONLY",
        "policy_version": result["policy_version"],
        "doh_clean_rows": result["doh"]["clean_rows"],
        "doh_territory_candidate_rows": result["doh"]["territory_candidate_rows"],
        "pagasa_daily_rows": result["pagasa"]["daily_clean_rows"],
        "pagasa_monthly_rows": result["pagasa"]["monthly_clean_rows"],
        "external_join_ready": False,
        "report": REPORT.relative_to(ROOT).as_posix(),
    }, indent=2))
    return result


if __name__ == "__main__":
    prepare()
