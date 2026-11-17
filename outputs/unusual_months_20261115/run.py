"""Unusual-month detection, 15 Nov 2026. Offline, read-only, deterministic. Rules fixed before the first run.

Series: monthly net sales, original itemized, contracts excluded, Jan 2017 - Sep 2026, recorded months only (missing
months are skipped, never zero). Two series: TOTAL and ROUTINE (excluding documents >= PHP 500k in a month).
Baseline: for each month, the previous 12 RECORDED months only (no look-ahead). Needs >= 6 prior months, else not scored.
Score: robust z = (value - median) / (1.4826 * MAD) of the baseline. Flag HIGH if z >= 3, LOW if z <= -3. Fixed; no retuning.
Cause of a flagged month, using the deviation D = value - baseline median:
  TOTAL:   split D into large-order deviation (large - baseline median of large) and routine deviation (the rest).
  ROUTINE (and the routine part of TOTAL): per family deviation d_f = family net - median of that family over the same 12
           months (absent = 0). A family with zero in all 12 months is NEW.
  Label, first that applies, among parts moving in the same direction as D:
    LARGE ORDERS   large-order deviation >= 50% of D (TOTAL only)
    NEW PRODUCTS   new families >= 50% of the routine deviation
    ONE PRODUCT    the single top family >= 50% of the routine deviation
    BROAD          otherwise
Area view: the same rule on routine sales per labelled area (GOVERNMENT, HOSPITAL, etc.), reported but not used for any
claim, because labels changed between years.
Outputs are retrospective descriptions, not forecasts or alerts that authorize any purchase.
Run from repo root:  python -X utf8 outputs/unusual_months_20261115/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
from statistics import median
import csv, hashlib, importlib.util, io, json

ROOT = Path.cwd(); OUT = ROOT / 'outputs/unusual_months_20261115'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
el = [r for r in m.gold_candidates(assessed, receipt, bundle['files'])['itemized'] if r['is_net_sales_technically_eligible']]
assert sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')
family = {r['recorded_label']: r['family_v1'] for r in csv.DictReader((ROOT / 'outputs/product_family_draft_20261111/family_mapping_v1_1_candidate.csv').open(encoding='utf-8'))}

rows = []
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10])
    rows.append(dict(ym=f'{d.year}-{d.month:02d}', dr=r['dr_number'], net=float(r['net_sales']),
                     area=(r['area'] or 'UNLABELLED').strip().upper(), fam=family[r['normalized_product']]))
docs = defaultdict(float)
for x in rows:
    if x['dr']: docs[(x['ym'], x['dr'])] += x['net']
for x in rows: x['large'] = bool(x['dr'] and docs[(x['ym'], x['dr'])] >= 500_000)
months = sorted({x['ym'] for x in rows})
total = defaultdict(float); large = defaultdict(float); fam = defaultdict(lambda: defaultdict(float)); area = defaultdict(lambda: defaultdict(float))
large_docs = defaultdict(set)
for x in rows:
    total[x['ym']] += x['net']
    if x['large']: large[x['ym']] += x['net']; large_docs[x['ym']].add(x['dr'])
    else: fam[x['ym']][x['fam']] += x['net']; area[x['area']][x['ym']] += x['net']
routine = {k: total[k] - large[k] for k in months}

def zscore(series, i):
    base = [series.get(months[j], 0.0) for j in range(max(0, i - 12), i)]
    if len(base) < 6: return None, None, None
    med = median(base); mad = median(abs(v - med) for v in base)
    if mad == 0: return None, med, base
    return (series.get(months[i], 0.0) - med) / (1.4826 * mad), med, base

def routine_cause(i, dev):
    prior = months[max(0, i - 12):i]; ym = months[i]
    names = set(fam[ym]) | {f for p in prior for f in fam[p]}
    d = {}; new = set()
    for f in names:
        hist = [fam[p].get(f, 0.0) for p in prior]
        d[f] = fam[ym].get(f, 0.0) - median(hist)
        if all(h == 0 for h in hist) and fam[ym].get(f, 0.0) != 0: new.add(f)
    sign = 1 if dev >= 0 else -1
    same = {f: v for f, v in d.items() if v * sign > 0}
    new_part = sum(v for f, v in same.items() if f in new)
    top = sorted(same.items(), key=lambda kv: -abs(kv[1]))[:3]
    if dev and new_part / dev >= 0.5: label = 'NEW PRODUCTS'
    elif dev and top and top[0][1] / dev >= 0.5: label = 'ONE PRODUCT'
    else: label = 'BROAD'
    return label, dict(new_families=round(new_part), top_families=[dict(family=f, deviation=round(v), new=f in new) for f, v in top])

def scan(series, name, with_large=False):
    out = []
    for i, ym in enumerate(months):
        z, med, _ = zscore(series, i)
        if z is None or abs(z) < 3: continue
        dev = series[ym] - med
        rec = dict(month=ym, series=name, flag='HIGH' if z > 0 else 'LOW', z=round(z, 2), value=round(series[ym]), baseline_median=round(med), deviation=round(dev))
        rdev = dev
        if with_large:
            lmed = median(large.get(months[j], 0.0) for j in range(max(0, i - 12), i))
            ldev = large[ym] - lmed; rdev = dev - ldev
            rec.update(large_order_deviation=round(ldev), large_documents=len(large_docs[ym]), routine_deviation=round(rdev))
        label, detail = routine_cause(i, rdev)
        if with_large and dev and ldev / dev >= 0.5: label = 'LARGE ORDERS'
        rec.update(cause=label, **detail); out.append(rec)
    return out

scored = sum(1 for i in range(len(months)) if zscore(total, i)[0] is not None)
res = dict(rules_sha256=hashlib.sha256(__doc__.encode('utf-8')).hexdigest(), months_recorded=len(months), months_scored_total=scored,
           total=scan(total, 'TOTAL', with_large=True), routine=scan(routine, 'ROUTINE'))
area_flags = []
for a, s in area.items():
    if sum(s.values()) < 0.02 * sum(routine.values()): continue
    for i, ym in enumerate(months):
        z, med, _ = zscore(s, i)
        if z is not None and abs(z) >= 3: area_flags.append(dict(area=a, month=ym, flag='HIGH' if z > 0 else 'LOW', z=round(z, 2), value=round(s.get(ym, 0.0)), baseline_median=round(med)))
res['area_routine'] = sorted(area_flags, key=lambda r: (r['area'], r['month']))
(OUT / 'results.json').write_text(json.dumps(res, indent=1, ensure_ascii=False))

print('rules', res['rules_sha256'][:12], '| recorded', len(months), '| scored', scored)
for k in ('total', 'routine'):
    print(f'\n{k.upper()}: {len(res[k])} flagged')
    for r in res[k]:
        tops = ', '.join(f"{t['family'][:18]}{'*' if t['new'] else ''} {t['deviation']/1e6:+.2f}M" for t in r['top_families'])
        extra = f" large {r['large_order_deviation']/1e6:+.1f}M ({r['large_documents']} docs)" if k == 'total' else ''
        print(f"  {r['month']} {r['flag']:4} z={r['z']:+6.2f} {r['value']/1e6:6.2f}M vs {r['baseline_median']/1e6:5.2f}M  {r['cause']:12}{extra} | {tops}")
print(f"\nAREA (routine): {len(area_flags)} flags")
for r in res['area_routine']: print('  ', r['area'][:14], r['month'], r['flag'], r['z'], f"{r['value']/1e6:.2f}M vs {r['baseline_median']/1e6:.2f}M")
