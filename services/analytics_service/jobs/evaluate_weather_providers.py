"""Offline, source-bound weather screening against supplied PAGASA station files.

This job makes public historical API requests; it never changes the warehouse or
supplies dashboard values. Percentages are declared tolerance agreement, not an
accuracy certification, forecast skill, long-term uptime, or business approval.

    python -m services.analytics_service.jobs.evaluate_weather_providers --prepare-only
    python -m services.analytics_service.jobs.evaluate_weather_providers
"""

from __future__ import annotations

import argparse
import calendar
import csv
import hashlib
import json
import math
import platform
import re
import subprocess
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[3]
SOURCE_ROOT = ROOT / "data" / "PAGASA 2017-2024" / "2021-2024"
DEFAULT_OUTPUT = ROOT / "outputs" / "weather_reliability_20261008"
STATION_REGIONS = {
    "Ambulong": "CALABARZON", "Sangley Point": "CALABARZON",
    "Tayabas": "CALABARZON", "Tanay": "CALABARZON",
    "Calapan": "MIMAROPA", "San Jose": "MIMAROPA",
    "Romblon": "MIMAROPA", "Puerto Princesa": "MIMAROPA",
    "Daet": "Bicol", "Legazpi": "Bicol",
    "Masbate": "Bicol", "Virac Synop": "Bicol",
}
PROVIDERS = {
    "nasa_power": {"api": "NASA POWER", "model": "MERRA-2 meteorology proxy",
                   "rainfall_supported": True, "time_standard": "LST"},
    "open_meteo_era5": {"api": "Open-Meteo archive", "model": "era5",
                        "rainfall_supported": True, "time_standard": "Asia/Manila"},
    "open_meteo_era5_seamless": {"api": "Open-Meteo archive", "model": "era5_seamless",
                             "rainfall_supported": True, "time_standard": "Asia/Manila"},
    "open_meteo_ifs": {"api": "Open-Meteo archive", "model": "ecmwf_ifs",
                       "rainfall_supported": True, "time_standard": "Asia/Manila"},
}
ALLOWED_HOSTS = {"power.larc.nasa.gov", "archive-api.open-meteo.com"}
FIELDS = ("rainfall_mm", "temperature_c", "humidity_pct")
TEMP_TOLERANCE_C = 2.0
HUMIDITY_TOLERANCE_PP = 10.0
RAIN_ABSOLUTE_TOLERANCE_MM = 25.0
RAIN_RELATIVE_TOLERANCE = 0.20


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def file_hash(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
                         encoding="utf-8")
    temporary.replace(path)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def date_range(start: date, end: date) -> list[str]:
    return [(start + timedelta(days=offset)).isoformat()
            for offset in range((end - start).days + 1)]


def percentage(numerator: int, denominator: int) -> float | None:
    return round(100 * numerator / denominator, 4) if denominator else None


def valid_number(raw: object, field: str) -> float | None:
    if raw is None or isinstance(raw, bool):
        return None
    try:
        number = float(raw)
    except (ValueError, TypeError):
        return None
    if not math.isfinite(number) or number in {-999.0, -9999.0}:
        return None
    bounds = {"rainfall_mm": (0.0, None), "temperature_c": (-30.0, 65.0),
              "humidity_pct": (0.0, 100.0)}
    lower, upper = bounds[field]
    if number < lower or (upper is not None and number > upper):
        return None
    return number


def parse_pagasa_row(raw: dict[str, str]) -> dict[str, object]:
    trace = raw.get("RAINFALL", "").strip() in {"-1", "-1.0"}
    tmax = valid_number(raw.get("TMAX"), "temperature_c")
    tmin = valid_number(raw.get("TMIN"), "temperature_c")
    return {
        "rainfall_mm": 0.0 if trace else valid_number(raw.get("RAINFALL"), "rainfall_mm"),
        "temperature_c": (tmax + tmin) / 2 if tmax is not None and tmin is not None
                         and tmax >= tmin else None,
        "humidity_pct": valid_number(raw.get("RH"), "humidity_pct"),
        "trace_rainfall": trace,
    }


def load_reference(start: date, end: date) -> tuple[dict, dict]:
    coordinate_path = SOURCE_ROOT / "A.ReadMe.txt"
    pattern = r"^(.+?) Latitude: ([\d.]+) N Longitude: ([\d.]+) E Elevation: ([\d.]+) m$"
    coordinates = {}
    for line in coordinate_path.read_text(encoding="utf-8-sig").splitlines():
        match = re.match(pattern, line.strip())
        if match:
            name, latitude, longitude, elevation = match.groups()
            coordinates[name] = {"latitude": float(latitude), "longitude": float(longitude),
                                 "elevation_m": float(elevation)}
    observations, profiles = {}, {}
    calendar_days = date_range(start, end)
    source_hashes = {coordinate_path.relative_to(ROOT).as_posix(): file_hash(coordinate_path)}
    for station, region in STATION_REGIONS.items():
        if station not in coordinates:
            raise ValueError(f"Missing source-recorded coordinates for {station}")
        path = SOURCE_ROOT / f"{station} Daily Data.csv"
        source_hashes[path.relative_to(ROOT).as_posix()] = file_hash(path)
        rows, audit = {}, Counter()
        with path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            required = {"YEAR", "MONTH", "DAY", "RAINFALL", "TMAX", "TMIN", "RH"}
            if required.difference(reader.fieldnames or []):
                raise ValueError(f"Unexpected PAGASA schema: {path.name}")
            for raw in reader:
                observed = date(int(raw["YEAR"]), int(raw["MONTH"]), int(raw["DAY"]))
                if not start <= observed <= end:
                    continue
                key = observed.isoformat()
                if key in rows:
                    raise ValueError(f"Duplicate station date: {station} {key}")
                rows[key] = parse_pagasa_row(raw)
                audit["trace_days"] += int(rows[key]["trace_rainfall"])
                for field in FIELDS:
                    audit[f"{field}_valid_days"] += int(rows[key][field] is not None)
        observations[station] = rows
        profiles[station] = {"region": region, **coordinates[station],
                             "calendar_days": len(calendar_days), "source_rows": len(rows),
                             "audit": dict(audit),
                             "coverage_pct": {field: percentage(audit[f"{field}_valid_days"],
                                                                   len(calendar_days))
                                              for field in FIELDS}}
    return observations, {"stations": profiles, "source_hashes": source_hashes}


def build_protocol(start: date, end: date, source: dict) -> dict:
    return {
        "policy_version": "weather_station_screening_v1",
        "status": "EXPERIMENTAL_SCREENING_NOT_APPROVED",
        "question": "Historical provider agreement with supplied PAGASA stations in MedShield regions",
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "providers": PROVIDERS, "stations": source["stations"],
        "source_hashes": source["source_hashes"],
        "metrics": {
            "coverage_pct": "100 * valid provider station-days / requested station-days, by measure",
            "paired_coverage_pct": "100 * paired valid station-days / valid PAGASA station-days",
            "monthly_rain_agreement_pct": "100 * months with abs(provider-total - station-total) <= max(25 mm, 20% * station-total) / eligible complete paired station-months",
            "temperature_agreement_pct": "100 * paired days with abs(provider daily mean - (PAGASA TMAX + TMIN)/2) <= 2 degrees C / paired valid days",
            "humidity_agreement_pct": "100 * paired days with absolute RH difference <= 10 percentage points / paired valid days",
            "error": "error = provider - PAGASA; MAE = mean(abs(error)); RMSE = sqrt(mean(error squared)); bias = mean(error)",
            "aggregation": "Pooled equal station-period weights; also station/region/year breakdown. Null for zero eligible denominator. No overall invented reliability score.",
            "rain_month_eligibility": "Every calendar day must have nonmissing rainfall in BOTH station and provider; partial months excluded and counted. Common-population metrics additionally require complete months for every rain-capable variant.",
            "request_success": "Valid decoded schema / actual HTTP attempts in this run; excludes cache reads. This is a bounded request experiment, not uptime.",
        },
        "tolerances": {"temperature_c": TEMP_TOLERANCE_C, "humidity_percentage_points": HUMIDITY_TOLERANCE_PP,
                       "monthly_rain_absolute_mm": RAIN_ABSOLUTE_TOLERANCE_MM,
                       "monthly_rain_relative": RAIN_RELATIVE_TOLERANCE},
        "missing_policy": "-999/-9999/nonfinite/invalid/range-invalid values remain null; never zero-fill.",
        "trace_policy": "PAGASA -1 rainfall means <0.1 mm; lower bound zero; trace counts and maximum omitted <0.1 mm per trace day disclosed.",
        "time_policy": "Open-Meteo daily Asia/Manila; NASA explicitly LST (15-degree solar-time swath). PAGASA supplied documentation does not establish its daily observation/accumulation boundary. Daily alignment is approximate; no exact clock equivalence asserted.",
        "elevation_policy": "Open-Meteo supplied PAGASA station elevation, land cell selection, default provider statistical downscaling; NASA native grid meteorology, no temperature elevation correction.",
        "dependence": "Four model variants use TWO HTTP APIs. ERA5-Seamless combines ERA5-Land temperature/humidity with ERA5 rainfall; it is not independent corroboration. Pure ERA5-Land rainfall is unsupported and not requested. Reanalysis can assimilate stations: this is agreement, not fully independent ground-truth validation.",
        "limitations": ["Two purposively selected years and 12 stations; not random or exhaustive geographic coverage.",
                        "Station points do not establish province/territory weather representativeness; inland, coastal, island and mountain errors may differ.",
                        "PAGASA daily midpoint is a derived proxy, not an hourly-average observed temperature.",
                        "Reanalysis/historical agreement does not test future forecasts, typhoon warnings, causal disease impact or incremental sales-model value.",
                        "Thresholds are practical, predeclared analyst screening choices, not scientifically or business-approved reliability thresholds.",
                        "Current provider availability, license terms and response freshness require operational review before runtime integration."],
        "sources": ["https://open-meteo.com/en/docs/historical-weather-api",
                    "https://power.larc.nasa.gov/docs/services/api/temporal/daily/"],
        "network_policy": {"max_concurrent": 3, "timeout_seconds": 40, "max_attempts": 2,
                           "cache": "URL-hashed response bytes and receipts; verified hashes; no credential-bearing URLs"},
    }


def provider_url(provider: str, station: dict, start: date, end: date) -> str:
    if provider == "nasa_power":
        query = {"latitude": station["latitude"], "longitude": station["longitude"],
                 "parameters": "T2M,PRECTOTCORR,RH2M", "community": "AG", "format": "JSON",
                 "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"),
                 "time-standard": "LST"}
        return "https://power.larc.nasa.gov/api/temporal/daily/point?" + urlencode(query)
    daily = ["temperature_2m_mean", "relative_humidity_2m_mean"]
    if PROVIDERS[provider]["rainfall_supported"]:
        daily.append("precipitation_sum")
    query = {"latitude": station["latitude"], "longitude": station["longitude"],
             "elevation": station["elevation_m"], "start_date": start.isoformat(),
             "end_date": end.isoformat(), "daily": ",".join(daily),
             "models": PROVIDERS[provider]["model"], "timezone": "Asia/Manila",
             "temperature_unit": "celsius", "precipitation_unit": "mm", "cell_selection": "land"}
    return "https://archive-api.open-meteo.com/v1/archive?" + urlencode(query)


def parse_provider(provider: str, payload: dict) -> tuple[dict, dict]:
    rows = {}
    if provider == "nasa_power":
        parameters = payload["properties"]["parameter"]
        names = {"rainfall_mm": "PRECTOTCORR", "temperature_c": "T2M", "humidity_pct": "RH2M"}
        expected_units = {"PRECTOTCORR": "mm/day", "T2M": "C", "RH2M": "%"}
        for parameter, unit in expected_units.items():
            if payload.get("parameters", {}).get(parameter, {}).get("units") != unit:
                raise ValueError(f"Unexpected NASA unit for {parameter}")
            if not isinstance(parameters.get(parameter), dict):
                raise ValueError(f"Missing NASA parameter {parameter}")
        for raw_date in parameters["T2M"]:
            observed = datetime.strptime(raw_date, "%Y%m%d").date().isoformat()
            rows[observed] = {field: valid_number(parameters[name].get(raw_date), field)
                              for field, name in names.items()}
        metadata = {"geometry": payload.get("geometry"), "header": payload.get("header"),
                    "units": expected_units}
    else:
        daily = payload["daily"]
        names = {"temperature_c": "temperature_2m_mean", "humidity_pct": "relative_humidity_2m_mean"}
        if PROVIDERS[provider]["rainfall_supported"]:
            names["rainfall_mm"] = "precipitation_sum"
        units = {"temperature_2m_mean": "°C", "relative_humidity_2m_mean": "%", "precipitation_sum": "mm"}
        dates = daily["time"]
        if not isinstance(dates, list) or len(set(dates)) != len(dates):
            raise ValueError("Invalid or duplicate Open-Meteo dates")
        for field, name in names.items():
            if payload.get("daily_units", {}).get(name) != units[name]:
                raise ValueError(f"Unexpected Open-Meteo unit for {name}")
            if not isinstance(daily.get(name), list) or len(daily[name]) != len(dates):
                raise ValueError(f"Missing or wrong-length Open-Meteo parameter {name}")
        if payload.get("timezone") != "Asia/Manila" or payload.get("utc_offset_seconds") != 28800:
            raise ValueError("Unexpected Open-Meteo daily timezone")
        for index, observed in enumerate(dates):
            date.fromisoformat(observed)
            rows[observed] = {field: valid_number(daily[name][index], field)
                              for field, name in names.items()}
            rows[observed].setdefault("rainfall_mm", None)
        metadata = {key: payload.get(key) for key in ("latitude", "longitude", "elevation", "timezone", "utc_offset_seconds", "daily_units")}
    return rows, metadata


def fetch_provider(provider: str, station_name: str, station: dict,
                   start: date, end: date, output: Path, offline: bool) -> tuple[dict, dict]:
    url = provider_url(provider, station, start, end)
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("Provider URL is outside the HTTPS host allowlist")
    key = sha256_bytes(url.encode("utf-8"))
    cache = output / "cache" / f"{key}.json"
    receipt_path = output / "cache" / f"{key}.receipt.json"
    receipt = {"provider": provider, "station": station_name, "url": url,
               "cache_key": key, "attempts": [], "cache_hit": False}
    if cache.exists() and receipt_path.exists():
        old_receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        raw = cache.read_bytes()
        if file_hash(cache) != old_receipt.get("response_sha256"):
            raise ValueError("Cached provider response checksum mismatch")
        rows, metadata = parse_provider(provider, json.loads(raw))
        receipt.update({"cache_hit": True, "status": "SUCCESS", "response_sha256": sha256_bytes(raw),
                        "original_receipt": old_receipt, "metadata": metadata,
                        "decoded_days": len(rows), "cache_read_at_utc": utc_now()})
        return rows, receipt
    if offline:
        receipt.update({"status": "UNAVAILABLE", "error": "No validated cached response; offline mode"})
        return {}, receipt
    for number in range(1, 3):
        attempt = {"number": number, "started_at_utc": utc_now()}
        began = time.monotonic()
        try:
            request = Request(url, headers={"User-Agent": "MedShield-offline-weather-screening/1.0", "Accept": "application/json"})
            with urlopen(request, timeout=40) as response:
                attempt["http_status"] = response.status
                raw = response.read(4_000_001)
                if len(raw) > 4_000_000:
                    raise ValueError("Provider response exceeds 4 MB size bound")
            payload = json.loads(raw)
            rows, metadata = parse_provider(provider, payload)
            if not rows:
                raise ValueError("Decoded provider response contains no dates")
            attempt["schema_success"] = True
            receipt.update({"status": "SUCCESS", "response_sha256": sha256_bytes(raw),
                            "metadata": metadata, "decoded_days": len(rows)})
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_bytes(raw)
            attempt["elapsed_seconds"] = round(time.monotonic() - began, 3)
            receipt["attempts"].append(attempt)
            write_json(receipt_path, receipt)
            return rows, receipt
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError, TypeError) as error:
            attempt["schema_success"] = False
            attempt["error_type"] = type(error).__name__
            if isinstance(error, HTTPError):
                attempt["http_status"] = error.code
            # Exceptions contain public request coordinates only, never API keys.
            attempt["error"] = str(error)[:400]
            attempt["elapsed_seconds"] = round(time.monotonic() - began, 3)
            receipt["attempts"].append(attempt)
            if number < 2:
                time.sleep(2)
    receipt.update({"status": "UNAVAILABLE", "error": "All bounded requests failed"})
    write_json(receipt_path, receipt)
    return {}, receipt


def error_metrics(pairs: list[tuple[float, float]], tolerance=None) -> dict:
    errors = [estimated - observed for observed, estimated in pairs]
    count = len(errors)
    agreeing = (sum(abs(estimated - observed) <= tolerance(observed) + 1e-9
                    for observed, estimated in pairs) if tolerance else None)
    return {"paired_count": count, "agreeing_count": agreeing,
            "agreement_pct": percentage(agreeing, count) if agreeing is not None else None,
            "mae": round(sum(map(abs, errors)) / count, 6) if count else None,
            "rmse": round(math.sqrt(sum(value * value for value in errors) / count), 6) if count else None,
            "bias": round(sum(errors) / count, 6) if count else None}


def rain_tolerance(observed: float) -> float:
    return max(RAIN_ABSOLUTE_TOLERANCE_MM, RAIN_RELATIVE_TOLERANCE * observed)


def paired_daily(reference: dict, provider: dict, dates: list[str], field: str) -> list[tuple[str, float, float]]:
    pairs = []
    for observed in dates:
        measured = reference.get(observed, {}).get(field)
        estimated = provider.get(observed, {}).get(field)
        if measured is not None and estimated is not None:
            pairs.append((observed, measured, estimated))
    return pairs


def complete_rain_months(reference: dict, provider: dict, dates: list[str]) -> tuple[list, int]:
    groups = defaultdict(list)
    for observed in dates:
        groups[observed[:7]].append(observed)
    pairs, excluded = [], 0
    for month, month_dates in sorted(groups.items()):
        year, number = map(int, month.split("-"))
        daily = paired_daily(reference, provider, month_dates, "rainfall_mm")
        if len(daily) != calendar.monthrange(year, number)[1] or len(month_dates) != len(daily):
            excluded += 1
            continue
        pairs.append((month, sum(row[1] for row in daily), sum(row[2] for row in daily)))
    return pairs, excluded


def measure_summary(reference: dict, provider: dict, dates: list[str], rain_supported: bool) -> dict:
    result = {}
    for field, tolerance in (("temperature_c", lambda value: TEMP_TOLERANCE_C),
                             ("humidity_pct", lambda value: HUMIDITY_TOLERANCE_PP),
                             ("rainfall_mm", None)):
        observed_count = sum(reference.get(day, {}).get(field) is not None for day in dates)
        provider_count = sum(provider.get(day, {}).get(field) is not None for day in dates)
        paired = paired_daily(reference, provider, dates, field)
        result[field] = {"supported": field != "rainfall_mm" or rain_supported,
                         "calendar_days": len(dates), "reference_valid_days": observed_count,
                         "provider_valid_days": provider_count,
                         "coverage_pct": percentage(provider_count, len(dates)) if field != "rainfall_mm" or rain_supported else None,
                         "paired_coverage_pct": percentage(len(paired), observed_count) if field != "rainfall_mm" or rain_supported else None,
                         "daily_errors": error_metrics([(row[1], row[2]) for row in paired], tolerance)}
    rain, excluded = complete_rain_months(reference, provider, dates) if rain_supported else ([], None)
    result["monthly_rain"] = {"supported": rain_supported, "excluded_incomplete_months": excluded,
                              **error_metrics([(row[1], row[2]) for row in rain], rain_tolerance)}
    return result


def summarize_population(reference: dict, providers: dict, stations: list[str], dates: list[str], rain_supported: bool) -> dict:
    # Synthetic keys preserve station identity while reusing daily summary math.
    combined_reference, combined_provider, keys = {}, {}, []
    monthly_pairs, excluded = [], 0
    for station in stations:
        rows = providers.get(station, {})
        for day in dates:
            key = f"{station}:{day}"
            keys.append(key)
            combined_reference[key] = reference[station].get(day, {})
            combined_provider[key] = rows.get(day, {})
        if rain_supported:
            monthly, local_excluded = complete_rain_months(reference[station], rows, dates)
            monthly_pairs.extend((row[1], row[2]) for row in monthly)
            excluded += local_excluded
    result = measure_summary(combined_reference, combined_provider, [], False)
    for field, tolerance in (("temperature_c", lambda value: TEMP_TOLERANCE_C),
                             ("humidity_pct", lambda value: HUMIDITY_TOLERANCE_PP), ("rainfall_mm", None)):
        paired = paired_daily(combined_reference, combined_provider, keys, field)
        observed_count = sum(combined_reference[day].get(field) is not None for day in keys)
        provider_count = sum(combined_provider[day].get(field) is not None for day in keys)
        supported = field != "rainfall_mm" or rain_supported
        result[field] = {"supported": supported, "calendar_days": len(keys),
                         "reference_valid_days": observed_count, "provider_valid_days": provider_count,
                         "coverage_pct": percentage(provider_count, len(keys)) if supported else None,
                         "paired_coverage_pct": percentage(len(paired), observed_count) if supported else None,
                         "daily_errors": error_metrics([(row[1], row[2]) for row in paired], tolerance)}
    result["monthly_rain"] = {"supported": rain_supported, "excluded_incomplete_months": excluded if rain_supported else None,
                              **error_metrics(monthly_pairs, rain_tolerance)}
    return result


def common_population(reference: dict, provider_rows: dict, dates: list[str]) -> dict:
    result = {}
    for field, tolerance in (("temperature_c", lambda value: TEMP_TOLERANCE_C),
                             ("humidity_pct", lambda value: HUMIDITY_TOLERANCE_PP),
                             ("monthly_rain", rain_tolerance)):
        applicable = [provider for provider in PROVIDERS
                      if field != "monthly_rain" or PROVIDERS[provider]["rainfall_supported"]]
        paired = {provider: [] for provider in applicable}
        for station in STATION_REGIONS:
            if field == "monthly_rain":
                local = {}
                for provider in applicable:
                    monthly, _ = complete_rain_months(reference[station], provider_rows[provider].get(station, {}), dates)
                    local[provider] = {row[0]: (row[1], row[2]) for row in monthly}
                common = set.intersection(*(set(values) for values in local.values()))
                for month in sorted(common):
                    for provider in applicable:
                        paired[provider].append(local[provider][month])
            else:
                for day in dates:
                    observed = reference[station].get(day, {}).get(field)
                    estimates = {provider: provider_rows[provider].get(station, {}).get(day, {}).get(field)
                                 for provider in applicable}
                    if observed is None or any(value is None for value in estimates.values()):
                        continue
                    for provider, estimate in estimates.items():
                        paired[provider].append((observed, estimate))
        result[field] = {provider: error_metrics(values, tolerance) for provider, values in paired.items()}
    return result


def display_percent(value: float | None) -> str:
    return f"{value:.1f}%" if value is not None else "Unavailable / N/A"


def render_report(report: dict) -> str:
    protocol = report["protocol"]
    lines = ["# Weather provider reliability screening — 8 October 2026", "",
             "Historical agreement with supplied PAGASA station observations. **Experimental screening; no scientific/business approval or forecast activation.**", "",
             f"Period: {protocol['period']['start']} to {protocol['period']['end']}; 12 station points, four per region; {report['requested_station_days']:,} station-days. Four model variants use two HTTP APIs.", "",
             "Protocol was saved before API execution; see `PROTOCOL.md`, `protocol.json`, `source_profile.json`, retained URL/response-hash receipts and `report.json`.", "",
             "## Declared percentages", "",
             "Monthly rain agrees when the absolute error is at most max(25 mm, 20% of PAGASA total). Both series need every calendar day in a month. Daily temperature agrees within ±2°C against the **derived TMAX/TMIN midpoint**. Daily RH agrees within ±10 percentage points. Percentages are counts meeting those tolerances, not a universal provider accuracy rating.", "",
             "| Provider/model | Temperature agreement (paired days) | RH agreement (paired days) | Rain agreement (complete paired months) | Temperature MAE / RMSE / bias °C | Monthly rain MAE / RMSE / bias mm |", "|---|---:|---:|---:|---:|---:|"]
    for provider, detail in report["providers"].items():
        overall = detail["overall"]
        temp, rh, rain = overall["temperature_c"]["daily_errors"], overall["humidity_pct"]["daily_errors"], overall["monthly_rain"]
        def errors(values):
            return " / ".join(f"{values[key]:.2f}" if values[key] is not None else "N/A" for key in ("mae", "rmse", "bias"))
        lines.append(f"| {PROVIDERS[provider]['api']} / {PROVIDERS[provider]['model']} | {display_percent(temp['agreement_pct'])} ({temp['paired_count']:,}) | {display_percent(rh['agreement_pct'])} ({rh['paired_count']:,}) | {display_percent(rain['agreement_pct'])} ({rain['paired_count']}) | {errors(temp)} | {errors(rain)} |")
    lines.extend(["", "Coverage and request results:", "",
                  "| Provider | Daily temperature / RH / rainfall coverage | Valid HTTP attempts / actual attempts this run | Successful station queries / planned | Cache reads |", "|---|---:|---:|---:|---:|"])
    for provider, detail in report["providers"].items():
        overall, requests = detail["overall"], detail["requests"]
        coverage = " / ".join(display_percent(overall[field]["coverage_pct"]) for field in ("temperature_c", "humidity_pct", "rainfall_mm"))
        lines.append(f"| {provider} | {coverage} | {requests['successful_attempts']} / {requests['actual_attempts']} ({display_percent(requests['success_pct'])}) | {requests['successful_queries']} / {requests['planned_queries']} | {requests['cache_hits']} |")
    lines.extend(["", "HTTP success is a bounded experiment, **not long-term availability or uptime**. Cached responses retain original attempt receipts. ERA5-Seamless rainfall shares ERA5 forcing and is not independent evidence.", "",
                  "## Common-population comparison", "", "Only pairs available for every applicable provider are used here; this prevents different missing-data populations from silently changing comparisons.", ""])
    for field, metrics in report["common_population"].items():
        lines.append(f"- {field}: " + "; ".join(f"{provider} {display_percent(value['agreement_pct'])} (n={value['paired_count']:,})" for provider, value in metrics.items()))
    lines.extend(["", "## Region and station variation", "",
                  "| Provider | Region | Temperature agreement / n | Monthly rain agreement / n |", "|---|---|---:|---:|"])
    for provider, detail in report["providers"].items():
        for region, values in detail["regions"].items():
            temp, rain = values["temperature_c"]["daily_errors"], values["monthly_rain"]
            lines.append(f"| {provider} | {region} | {display_percent(temp['agreement_pct'])} / {temp['paired_count']} | {display_percent(rain['agreement_pct'])} / {rain['paired_count']} |")
    lines.extend(["", "| Provider | Station | Temperature agreement / n | Rain agreement / n | Incomplete rainfall months |", "|---|---|---:|---:|---:|"])
    for provider, detail in report["providers"].items():
        for station, values in detail["stations"].items():
            temp, rain = values["temperature_c"]["daily_errors"], values["monthly_rain"]
            lines.append(f"| {provider} | {station} | {display_percent(temp['agreement_pct'])} / {temp['paired_count']} | {display_percent(rain['agreement_pct'])} / {rain['paired_count']} | {rain['excluded_incomplete_months']} |")
    lines.extend(["", "## Data identity and interpretation limits", ""])
    lines.extend(f"- {value}" for value in protocol["limitations"])
    lines.extend([f"- {protocol['dependence']}", f"- {protocol['time_policy']}", f"- {protocol['trace_policy']}",
                  f"- PAGASA trace days in scope: {report['trace_days']}; rainfall understatement from lower-bound trace handling is <{report['trace_days'] * 0.1:.1f} mm pooled across all station-days, not one site's total.",
                  "- Raw supplied PAGASA records are not republished in these reports; station file hashes and derived paired metrics are retained.",
                  "- No dashboard fallback, warehouse publication, geographic mapping approval, model activation or procurement action occurs.", "",
                  "## Reproduce", "", "```powershell", report["command"],
                  "python -m unittest services.tests.test_weather_provider_reliability", "```", "",
                  "Use `--offline` to recompute from verified response caches. Responses and metrics are source-bound; rerunning live calls later can produce revised provider data.", "",
                  "Sources: [Open-Meteo archive documentation](https://open-meteo.com/en/docs/historical-weather-api), [NASA POWER daily documentation](https://power.larc.nasa.gov/docs/services/api/temporal/daily/).", ""])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default="2023-01-01")
    parser.add_argument("--end", default="2024-12-31")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--prepare-only", action="store_true")
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    start, end, output = date.fromisoformat(args.start), date.fromisoformat(args.end), args.output.resolve()
    if start > end:
        parser.error("start must be <= end")
    if (end - start).days > 1096:
        parser.error("screening is bounded to at most three years per run")
    output.mkdir(parents=True, exist_ok=True)
    reference, source = load_reference(start, end)
    protocol = build_protocol(start, end, source)
    encoded_protocol = json.dumps(protocol, sort_keys=True, ensure_ascii=False).encode("utf-8")
    protocol_hash = sha256_bytes(encoded_protocol)
    protocol_path = output / "protocol.json"
    if protocol_path.exists():
        prior = json.loads(protocol_path.read_text(encoding="utf-8"))
        if prior["protocol_sha256"] != protocol_hash:
            raise ValueError("Existing protocol differs; use a new output directory to avoid replacing frozen policy")
        frozen_at = prior["frozen_at_utc"]
    else:
        frozen_at = utc_now()
        write_json(protocol_path, {"frozen_at_utc": frozen_at, "protocol_sha256": protocol_hash, "protocol": protocol})
        (output / "PROTOCOL.md").write_text("# Predeclared weather screening protocol\n\nFrozen before network execution: " + frozen_at + "\n\n" +
                                           "```json\n" + json.dumps(protocol, indent=2, ensure_ascii=False) + "\n```\n", encoding="utf-8")
    write_json(output / "source_profile.json", source)
    if args.prepare_only:
        print(json.dumps({"status": "PROTOCOL_FROZEN", "protocol_sha256": protocol_hash,
                          "stations": len(STATION_REGIONS), "output": str(output)}))
        return
    began = utc_now()
    dates = date_range(start, end)
    rows = {provider: {} for provider in PROVIDERS}
    receipts = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        tasks = {pool.submit(fetch_provider, provider, station, source["stations"][station], start, end,
                             output, args.offline): (provider, station)
                 for provider in PROVIDERS for station in STATION_REGIONS}
        for future in as_completed(tasks):
            provider, station = tasks[future]
            try:
                observations, receipt = future.result()
            except Exception as error:
                observations = {}
                receipt = {"provider": provider, "station": station, "status": "UNAVAILABLE",
                           "error_type": type(error).__name__, "error": str(error)[:400],
                           "attempts": [], "cache_hit": False}
            rows[provider][station] = observations
            receipts.append(receipt)
            print(json.dumps({"provider": provider, "station": station, "status": receipt["status"],
                              "decoded_days": len(observations), "cache_hit": receipt["cache_hit"]}), flush=True)
    detail = {}
    for provider, values in rows.items():
        supported = PROVIDERS[provider]["rainfall_supported"]
        matching = [receipt for receipt in receipts if receipt["provider"] == provider]
        attempts = [attempt for receipt in matching for attempt in receipt["attempts"]]
        successful = sum(bool(attempt["schema_success"]) for attempt in attempts)
        detail[provider] = {
            "overall": summarize_population(reference, values, list(STATION_REGIONS), dates, supported),
            "stations": {station: measure_summary(reference[station], values[station], dates, supported)
                         for station in STATION_REGIONS},
            "regions": {region: summarize_population(reference, values,
                         [station for station, assigned in STATION_REGIONS.items() if assigned == region], dates, supported)
                        for region in sorted(set(STATION_REGIONS.values()))},
            "years": {str(year): summarize_population(reference, values, list(STATION_REGIONS),
                      [day for day in dates if day.startswith(str(year))], supported)
                      for year in range(start.year, end.year + 1)},
            "requests": {"planned_queries": len(matching), "successful_queries": sum(receipt["status"] == "SUCCESS" for receipt in matching),
                         "actual_attempts": len(attempts), "successful_attempts": successful,
                         "success_pct": percentage(successful, len(attempts)),
                         "cache_hits": sum(receipt["cache_hit"] for receipt in matching)},
        }
    try:
        revision = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        revision = None
    report = {"status": "EXPERIMENTAL_SCREENING_NOT_APPROVED", "started_at_utc": began,
              "completed_at_utc": utc_now(), "report_timezone": "Asia/Manila",
              "protocol_frozen_at_utc": frozen_at, "protocol_sha256": protocol_hash,
              "protocol": protocol, "requested_station_days": len(dates) * len(STATION_REGIONS),
              "trace_days": sum(station["audit"].get("trace_days", 0) for station in source["stations"].values()),
              "providers": detail, "common_population": common_population(reference, rows, dates),
              "receipts": sorted(receipts, key=lambda receipt: (receipt["provider"], receipt["station"])),
              "environment": {"python": platform.python_version(), "platform": platform.platform(),
                              "git_head": revision, "job_sha256": file_hash(Path(__file__)),
                              "working_tree": "Dirty pre-existing unrelated changes; scoped job source hash binds this execution; no baseline files edited"},
              "command": f"python -m services.analytics_service.jobs.evaluate_weather_providers --start {start} --end {end}" + (" --offline" if args.offline else "")}
    write_json(output / "report.json", report)
    (output / "REPORT.md").write_text(render_report(report), encoding="utf-8")
    print(json.dumps({"status": report["status"], "output": str(output / "REPORT.md"),
                      "summary": {provider: {"temperature": value["overall"]["temperature_c"]["daily_errors"],
                                            "monthly_rain": value["overall"]["monthly_rain"],
                                            "requests": value["requests"]} for provider, value in detail.items()}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
