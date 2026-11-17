"""Large-order pattern check, 11 Nov 2026. Offline, read-only, retrospective (months already inspected).

Registered before running: for GOVERNMENT and HOSPITAL labels, at each recorded-month origin with >= 24 prior recorded
months, p = share of the trailing 24 recorded months with a large (>= PHP 500k) document. Score next-month occurrence
with the Brier score against the all-history share as baseline, and the next-month large amount with the trailing-24
mean of large amount (zeros included) against the trailing-6 mean. Pass for 'useful as a planning signal': Brier at
least 5% lower than baseline. Amount rows are descriptive only.
Run from repo root:  python -X utf8 outputs/large_order_patterns_20261111/check.py
"""
from pathlib import Path
from collections import defaultdict
from datetime import date
from decimal import Decimal
import csv, importlib.util, io, json

ROOT = Path.cwd(); OUT = ROOT / 'outputs/large_order_patterns_20261111'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
el = [r for r in m.gold_candidates(assessed, receipt, bundle['files'])['itemized'] if r['is_net_sales_technically_eligible']]
assert sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')

doc, area_of, months = defaultdict(float), {}, set()
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10]); p = f'{d.year}-{d.month:02d}'
    months.add(p)
    if r['dr_number']:
        doc[(p, r['dr_number'])] += float(r['net_sales']); area_of.setdefault((p, r['dr_number']), (r['area'] or 'UNLABELLED').strip().upper())
months = sorted(months)
res = {'recorded_months': len(months), 'labels': {}}
for label in ('GOVERNMENT', 'HOSPITAL'):
    amt = {p: 0.0 for p in months}
    for k, v in doc.items():
        if v >= 500_000 and area_of[k] == label: amt[k[0]] += v
    y = [amt[p] for p in months]; occ = [1.0 if v > 0 else 0.0 for v in y]
    b_model = b_base = e24 = e6 = act = 0.0; n = 0
    for o in range(24, len(months) - 1):
        p24 = sum(occ[o-23:o+1]) / 24; pall = sum(occ[:o+1]) / (o + 1)
        b_model += (p24 - occ[o+1]) ** 2; b_base += (pall - occ[o+1]) ** 2
        e24 += abs(sum(y[o-23:o+1]) / 24 - y[o+1]); e6 += abs(sum(y[o-5:o+1]) / 6 - y[o+1]); act += abs(y[o+1]); n += 1
    res['labels'][label] = dict(cases=n, occurrence_rate=sum(occ) / len(occ), brier_trailing24=b_model / n, brier_all_history=b_base / n,
                                brier_improvement_pct=100 * (1 - b_model / b_base), passes=b_model <= .95 * b_base,
                                amount_wape_trailing24_pct=100 * e24 / act, amount_wape_trailing6_pct=100 * e6 / act)
(OUT / 'results.json').write_text(json.dumps(res, indent=1)); print(json.dumps(res, indent=1))
