"""Offline monthly weather refresh: free provider proxies saved as dated, append-only snapshots.

Fetches daily NASA POWER and Open-Meteo Archive (ERA5-based) values for candidate
territory points and writes raw responses, a monthly aggregate CSV and a hashed
manifest under outputs/weather_snapshots/<fetch timestamp, Asia/Manila>/. A snapshot is never
overwritten, so each one proves what was knowable on its fetch date (issue-time
vintage). Values are gridded provider estimates at a candidate point: PROXY
evidence, not PAGASA observations and not an approved sales-territory join.
This job never writes to Databricks, the gateway or the dashboard.

    python -m services.analytics_service.jobs.refresh_weather_snapshots
    python -m services.analytics_service.jobs.refresh_weather_snapshots --start 2017-01-01 --areas Quezon,Batangas
"""
from __future__ import annotations

import argparse
import calendar
import csv
import hashlib
import json
import math
import platform
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUT = ROOT / 'outputs' / 'weather_snapshots'
MANILA = timezone(timedelta(hours=8))
POLICY = 'weather_proxy_snapshot_v1_candidate_only'
POINT_POLICY = 'candidate_representative_point_v1'  # mirrors backend/src/weatherAreas.ts

# Same candidate points as backend/src/weatherAreas.ts (owner review still required).
AREAS = {
    'Batangas': (13.7565, 121.0583), 'Camarines Norte': (14.139, 122.7633),
    'Camarines Sur': (13.6218, 123.1948), 'Cavite': (14.2456, 120.8786),
    'Laguna': (14.2691, 121.4113), 'Marinduque': (13.4767, 121.9032),
    'Quezon': (13.9414, 121.6234),
}
FIELDS = ('rainfall_mm', 'temperature_mean_c', 'humidity_mean_pct', 'wind_mean_ms')
NASA_PARAMS = {'PRECTOTCORR': 'rainfall_mm', 'T2M': 'temperature_mean_c', 'RH2M': 'humidity_mean_pct', 'WS2M': 'wind_mean_ms'}
OPEN_METEO_PARAMS = {'precipitation_sum': 'rainfall_mm', 'temperature_2m_mean': 'temperature_mean_c',
                     'relative_humidity_2m_mean': 'humidity_mean_pct', 'wind_speed_10m_mean': 'wind_mean_ms'}
USER_AGENT = 'MedShield-offline-research/1.0'


def nasa_url(lat, lon, start: date, end: date) -> str:
    q = dict(parameters=','.join(NASA_PARAMS), community='AG', latitude=lat, longitude=lon,
             start=start.strftime('%Y%m%d'), end=end.strftime('%Y%m%d'), format='JSON', **{'time-standard': 'LST'})
    return 'https://power.larc.nasa.gov/api/temporal/daily/point?' + urlencode(q)


def open_meteo_url(lat, lon, start: date, end: date) -> str:
    q = dict(latitude=lat, longitude=lon, start_date=start.isoformat(), end_date=end.isoformat(),
             daily=','.join(OPEN_METEO_PARAMS), timezone='Asia/Manila', wind_speed_unit='ms')
    return 'https://archive-api.open-meteo.com/v1/archive?' + urlencode(q)


def parse_nasa(payload: dict) -> dict[str, dict[str, float | None]]:
    """Daily {YYYY-MM-DD: {field: value|None}}; NASA fill value -999 becomes missing, never zero."""
    params = payload['properties']['parameter']
    days: dict[str, dict] = {}
    for code, field in NASA_PARAMS.items():
        for key, value in params.get(code, {}).items():
            day = f'{key[:4]}-{key[4:6]}-{key[6:]}'
            ok = isinstance(value, (int, float)) and math.isfinite(value) and value > -998
            days.setdefault(day, {f: None for f in FIELDS})[field] = float(value) if ok else None
    return days


def parse_open_meteo(payload: dict) -> dict[str, dict[str, float | None]]:
    daily = payload['daily']
    days: dict[str, dict] = {}
    for i, day in enumerate(daily['time']):
        row = {f: None for f in FIELDS}
        for code, field in OPEN_METEO_PARAMS.items():
            value = daily.get(code, [None] * len(daily['time']))[i]
            row[field] = float(value) if isinstance(value, (int, float)) and math.isfinite(value) else None
        days[day] = row
    return days


def monthly(days: dict[str, dict], min_coverage: float = 0.9) -> list[dict]:
    """Calendar-month aggregates with explicit coverage; incomplete months are flagged, not filled."""
    months: dict[str, list] = {}
    for day, row in days.items():
        months.setdefault(day[:7], []).append(row)
    out = []
    for month in sorted(months):
        rows = months[month]
        y, m = int(month[:4]), int(month[5:])
        expected = calendar.monthrange(y, m)[1]
        rec = {'period': month, 'expected_days': expected}
        complete = True
        for field in FIELDS:
            values = [r[field] for r in rows if r[field] is not None]
            rec[f'{field}_days'] = len(values)
            if not values:
                rec[field] = None
            elif field == 'rainfall_mm':
                rec[field] = round(sum(values), 3)
            else:
                rec[field] = round(sum(values) / len(values), 3)
            complete &= len(values) >= expected * min_coverage
        rec['rainy_days_ge_1mm'] = sum(1 for r in rows if (r['rainfall_mm'] or 0) >= 1)
        rec['is_complete_month'] = bool(complete and len(rows) >= expected * min_coverage)
        out.append(rec)
    return out


def fetch_json(url: str, attempts: int = 4, timeout: int = 60) -> tuple[dict, bytes]:
    last = None
    for i in range(attempts):
        if 'open-meteo' in url:
            time.sleep(6)  # free tier weights long ranges heavily; stay under the per-minute limit
        try:
            with urlopen(Request(url, headers={'User-Agent': USER_AGENT}), timeout=timeout) as resp:
                body = resp.read()
            return json.loads(body), body
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            last = exc
            time.sleep(65 if isinstance(exc, HTTPError) and exc.code == 429 else 5 * (i + 1))
    raise RuntimeError(f"request failed: {type(last).__name__} {getattr(last, 'code', '')}".strip())


PROVIDERS = {
    'nasa_power': (nasa_url, parse_nasa, 'NASA POWER daily point (MERRA-2/GEOS based), community AG'),
    'open_meteo_archive': (open_meteo_url, parse_open_meteo, 'Open-Meteo Historical Weather API (ERA5/ERA5-Land reanalysis)'),
}


def run(start: date, end: date, areas: list[str], out_root: Path, fetch=fetch_json, now=None, providers=None) -> Path:
    now = now or datetime.now(MANILA)
    folder = out_root / now.strftime('%Y-%m-%dT%H%M%S')
    if folder.exists():
        raise FileExistsError(f'snapshot {folder.name} already exists; snapshots are append-only')
    (folder / 'raw').mkdir(parents=True)
    manifest = {'policy_version': POLICY, 'point_policy': POINT_POLICY, 'evidence_class': 'provider_proxy_not_observation',
                'join_ready': False, 'fetched_at': now.isoformat(), 'request_start': start.isoformat(),
                'request_end': end.isoformat(), 'python': platform.python_version(), 'requests': [], 'errors': []}
    rows = []
    for provider, (make_url, parse, label) in PROVIDERS.items():
        if providers and provider not in providers:
            continue
        for area in areas:
            lat, lon = AREAS[area]
            url = make_url(lat, lon, start, end)
            try:
                payload, body = fetch(url)
                days = parse(payload)
            except Exception as exc:  # record and continue: one blocked provider never stops the other
                manifest['errors'].append({'provider': provider, 'area': area, 'error': str(exc)[:200]})
                continue
            raw = folder / 'raw' / f"{provider}__{area.replace(' ', '_')}.json"
            raw.write_bytes(body)
            valid = sorted(d for d, r in days.items() if r['rainfall_mm'] is not None)
            manifest['requests'].append({'provider': provider, 'provider_label': label, 'area': area, 'latitude': lat,
                                         'longitude': lon, 'url': url, 'raw_file': raw.name,
                                         'raw_sha256': hashlib.sha256(body).hexdigest(),
                                         'last_valid_rain_day': valid[-1] if valid else None})
            for rec in monthly(days):
                rows.append({'provider': provider, 'territory': area, 'latitude': lat, 'longitude': lon, **rec,
                             'fetched_at': now.isoformat(), 'policy_version': POLICY})
    columns = ['provider', 'territory', 'latitude', 'longitude', 'period', 'expected_days', *FIELDS,
               *[f'{f}_days' for f in FIELDS], 'rainy_days_ge_1mm', 'is_complete_month', 'fetched_at', 'policy_version']
    with (folder / 'weather_monthly.csv').open('w', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    manifest['monthly_rows'] = len(rows)
    manifest['monthly_csv_sha256'] = hashlib.sha256((folder / 'weather_monthly.csv').read_bytes()).hexdigest()
    manifest['status'] = 'COMPLETE' if not manifest['errors'] else ('PARTIAL' if rows else 'UNAVAILABLE')
    (folder / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    return folder


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument('--start', default='2017-01-01')
    p.add_argument('--end', default=None, help='default: yesterday (Asia/Manila)')
    p.add_argument('--areas', default=','.join(AREAS))
    p.add_argument('--out', default=str(DEFAULT_OUT))
    p.add_argument('--providers', default=','.join(PROVIDERS))
    a = p.parse_args(argv)
    areas = [x.strip() for x in a.areas.split(',') if x.strip()]
    unknown = [x for x in areas if x not in AREAS]
    if unknown:
        p.error(f'unknown areas: {unknown}')
    end = date.fromisoformat(a.end) if a.end else datetime.now(MANILA).date() - timedelta(days=1)
    providers = [x.strip() for x in a.providers.split(',') if x.strip()]
    if set(providers) - set(PROVIDERS):
        p.error(f'unknown providers: {sorted(set(providers) - set(PROVIDERS))}')
    folder = run(date.fromisoformat(a.start), end, areas, Path(a.out), providers=providers)
    m = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
    print(json.dumps({'snapshot': str(folder), 'status': m['status'], 'monthly_rows': m['monthly_rows'],
                      'errors': len(m['errors']),
                      'last_valid_rain_day': {f"{r['provider']}:{r['area']}": r['last_valid_rain_day'] for r in m['requests']}},
                     indent=1))
    return 0 if m['status'] != 'UNAVAILABLE' else 1


if __name__ == '__main__':
    raise SystemExit(main())
