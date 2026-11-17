"""Diagnostic breakdowns, 15 Nov 2026. Offline, read-only, deterministic accounting identities (no models, no estimates).

A. Margin breakdown. Gross margin % = sum over segments of (revenue share x segment margin %), on margin-eligible rows only
   (cost and sales both pass quality checks). Change between two years splits exactly into
     mix effect  = sum (change in share) x (average of the two years' segment margin)
     rate effect = sum (change in segment margin) x (average of the two years' share)
   A segment present in one year only uses that year's margin for both years (so entry and exit count as mix).
   Run for segments = product category, channel label, product family. Also reports cost coverage (share of net that is
   margin-eligible) per year, because a change in coverage can move the measured margin without any business change.
B. Sales change breakdown. For each pair of consecutive years, only months recorded in BOTH years are compared (missing
   months are never zero). Net change splits exactly into: large orders (documents >= PHP 500k), and routine sales from
   continuing families, new families (no routine sales in the prior year's matched months) and lost families.
Run from repo root:  python -X utf8 outputs/diagnostic_breakdowns_20261115/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, importlib.util, io, json

ROOT = Path.cwd(); OUT = ROOT / 'outputs/diagnostic_breakdowns_20261115'
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
    rows.append(dict(y=d.year, mo=d.month, ym=f'{d.year}-{d.month:02d}', dr=r['dr_number'], net=float(r['net_sales']),
                     cat=r['product_category'] or 'unclassified', area=(r['area'] or 'UNLABELLED').strip().upper(), fam=family[r['normalized_product']],
                     gm=float(r['gross_margin_amount']) if r['is_gross_margin_technically_eligible'] and r['gross_margin_amount'] is not None else None))
years = sorted({x['y'] for x in rows})
res = {'scope': 'original itemized, contracts excluded; 2026 = Jan-Sep', 'years': years}

# ---------- A. margin
def seg_table(yv, key):
    t = defaultdict(lambda: [0.0, 0.0])
    for x in rows:
        if x['y'] == yv and x['gm'] is not None: t[x[key]][0] += x['net']; t[x[key]][1] += x['gm']
    rev = sum(v[0] for v in t.values())
    return {k: (v[0] / rev, v[1] / v[0] if v[0] else 0.0) for k, v in t.items() if v[0] > 0}, rev
def decompose(y0, y1, key, top=6):
    a, _ = seg_table(y0, key); b, _ = seg_table(y1, key)
    m0 = sum(w * mm for w, mm in a.values()); m1 = sum(w * mm for w, mm in b.values())
    mix = rate = 0.0; per = {}
    for k in set(a) | set(b):
        w0, r0 = a.get(k, (0.0, None)); w1, r1 = b.get(k, (0.0, None))
        r0 = r1 if r0 is None else r0; r1 = r0 if r1 is None else r1
        mx = (w1 - w0) * (r0 + r1) / 2; rt = (r1 - r0) * (w0 + w1) / 2
        mix += mx; rate += rt; per[k] = dict(share0=w0, share1=w1, margin0=r0, margin1=r1, mix=mx, rate=rt)
    assert abs((m1 - m0) - (mix + rate)) < 1e-9
    worst = sorted(per.items(), key=lambda kv: kv[1]['mix'] + kv[1]['rate'])[:top]
    return dict(margin0=m0, margin1=m1, change=m1 - m0, mix=mix, rate=rate,
                biggest_drags=[dict(segment=k, **{kk: round(vv, 4) for kk, vv in v.items()}) for k, v in worst])
coverage = {}
for yv in years:
    tot = sum(x['net'] for x in rows if x['y'] == yv); elig = sum(x['net'] for x in rows if x['y'] == yv and x['gm'] is not None)
    _, rev = seg_table(yv, 'cat'); m_all = sum(x['gm'] for x in rows if x['y'] == yv and x['gm'] is not None) / elig
    coverage[yv] = dict(eligible_share=elig / tot, margin=m_all)
res['A_margin'] = dict(coverage_and_margin=coverage,
                       y2019_to_2025={key: decompose(2019, 2025, key) for key in ('cat', 'area', 'fam')},
                       year_on_year={f'{years[i-1]}-{years[i]}': {k: round(v, 4) for k, v in decompose(years[i-1], years[i], 'fam').items() if k in ('change', 'mix', 'rate')}
                                     for i in range(1, len(years))})

# ---------- B. sales change
docs = defaultdict(float)
for x in rows:
    if x['dr']: docs[(x['ym'], x['dr'])] += x['net']
for x in rows: x['large'] = bool(x['dr'] and docs[(x['ym'], x['dr'])] >= 500_000)
recorded = defaultdict(set)
for x in rows: recorded[x['y']].add(x['mo'])
bridge = {}
for i in range(1, len(years)):
    y0, y1 = years[i - 1], years[i]; mos = recorded[y0] & recorded[y1]
    def agg(yv):
        large = 0.0; fam = defaultdict(float)
        for x in rows:
            if x['y'] == yv and x['mo'] in mos:
                if x['large']: large += x['net']
                else: fam[x['fam']] += x['net']
        return large, fam
    L0, F0 = agg(y0); L1, F1 = agg(y1)
    act0 = {k for k, v in F0.items() if v > 0}; act1 = {k for k, v in F1.items() if v > 0}
    cont = act0 & act1
    parts = dict(large_orders=L1 - L0,
                 continuing_families=sum(F1[k] - F0[k] for k in cont),
                 new_families=sum(F1[k] for k in act1 - act0),
                 lost_families=-sum(F0[k] for k in act0 - act1))
    other = (sum(F1.values()) - sum(F0.values())) - (parts['continuing_families'] + parts['new_families'] + parts['lost_families'])
    parts['non_positive_adjustments'] = other  # families with zero or negative net in a year
    total0 = L0 + sum(F0.values()); total1 = L1 + sum(F1.values())
    assert abs((total1 - total0) - sum(parts.values())) < 1e-4
    bridge[f'{y0}-{y1}'] = dict(matched_months=len(mos), net0=total0, net1=total1, change=total1 - total0, **parts)
res['B_sales_bridge'] = bridge
(OUT / 'results.json').write_text(json.dumps(res, indent=1, ensure_ascii=False))

print('COVERAGE & MARGIN', {y: (round(v['eligible_share'] * 100, 1), round(v['margin'] * 100, 1)) for y, v in coverage.items()})
for key, d in res['A_margin']['y2019_to_2025'].items():
    print(f"\n2019->2025 by {key}: {d['margin0']*100:.1f}% -> {d['margin1']*100:.1f}% (change {d['change']*100:+.1f} pts) = mix {d['mix']*100:+.1f} + rate {d['rate']*100:+.1f}")
    for s in d['biggest_drags'][:5]: print('   ', s['segment'][:28], 'share', s['share0'], '->', s['share1'], 'margin', s['margin0'], '->', s['margin1'], 'mix', s['mix'], 'rate', s['rate'])
print('\nYOY family-level', res['A_margin']['year_on_year'])
print()
for k, v in bridge.items():
    print(k, f"{v['matched_months']}mo  {v['net0']/1e6:6.1f}M -> {v['net1']/1e6:6.1f}M  change {v['change']/1e6:+6.1f}M | large {v['large_orders']/1e6:+6.1f} cont {v['continuing_families']/1e6:+6.1f} new {v['new_families']/1e6:+6.1f} lost {v['lost_families']/1e6:+6.1f} adj {v['non_positive_adjustments']/1e6:+5.2f}")
