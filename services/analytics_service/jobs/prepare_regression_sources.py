"""Prepare province/month onset counts; raw workbooks remain unchanged.

Run: python -m services.analytics_service.jobs.prepare_regression_sources
No week-to-month allocations, city/province alias merges, or missing-as-zero fill.
"""
import csv
import hashlib
import json
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[3]
DOH = ROOT / 'datasources/raw/doh/DOH_Request_Daily_Breakdown_Weekly_Summary_2021_2025.xlsx'
AREA_MAP = ROOT / 'datasources/templates/area_classification_mapping.csv'
OUTPUT = ROOT / 'data/medshield/processed/regression_external_monthly.json'
DISEASES = ('Dengue', 'Leptospirosis', 'Cholera', 'Typhoid Fever')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare():
    with AREA_MAP.open(encoding='utf-8-sig', newline='') as handle:
        territories = {r['territory'].upper(): r['territory'] for r in csv.DictReader(handle) if r['mapping_status'] == 'approved' and r['area_type'] == 'territory'}
    totals, records = defaultdict(float), Counter()
    seen, ambiguous = set(), set()
    audit = Counter()
    workbook = openpyxl.load_workbook(DOH, read_only=True, data_only=True)
    for disease in DISEASES:
        print('Preparing '+disease, flush=True)
        iterator = workbook[disease].iter_rows(values_only=True)
        header = [str(v or '').strip() for v in next(iterator)]
        required = ['Onset Date', 'Province/City', 'Municipality/City', 'Cases']
        if not all(k in header for k in required):
            raise ValueError('Unexpected DOH schema: '+disease)
        indices = [header.index(k) for k in required]
        for values in iterator:
            audit['input_rows'] += 1
            onset, province, municipality, cases = [values[i] if i < len(values) else None for i in indices]
            territory = territories.get(str(province or '').strip().upper())
            if not territory:
                audit['outside_exact_territory'] += 1
                continue
            if not isinstance(onset, (date, datetime)) or not isinstance(cases, (float, int)) or cases < 0:
                audit['invalid_date_or_cases'] += 1
                continue
            month = onset.strftime('%Y-%m')
            key = (disease, territory, month)
            identity = (disease, territory, str(municipality).strip(), onset.strftime('%Y-%m-%d'))
            if identity in seen:
                ambiguous.add(key)
                audit['duplicate_municipality_date'] += 1
            seen.add(identity)
            totals[key] += cases
            records[key] += 1
    workbook.close()
    rows = [{'provider': 'DOH', 'signal': k[0], 'territory': k[1], 'period': k[2], 'value': value,
             'unit': 'reported onset cases', 'source_rows': records[k]} for k, value in sorted(totals.items()) if k not in ambiguous]
    audit['ambiguous_months_excluded'] = len(ambiguous)
    result = {'rows': rows, 'source': {'file': str(DOH.relative_to(ROOT)).replace('\\', '/'), 'checksum': sha(DOH),
              'area_mapping_checksum': sha(AREA_MAP), 'audit': dict(audit),
              'date_basis': 'Onset date; final retrospective counts, release dates unavailable',
              'coverage': 'Exact province labels only; absent months remain unobserved, city aliases unmerged'}}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({'monthly_rows': len(rows), 'audit': dict(audit)}), flush=True)


if __name__ == '__main__':
    prepare()
