"""Product survival, 15 Nov 2026. Offline, read-only, deterministic. Rules fixed before the first run.

Unit: product family (candidate mapping v1.1). Original itemized, contracts excluded, all net sales (routine and large).
New family: first month with positive net is in 2020-01..2025-12 and the family had no positive net in ANY earlier
recorded month (2017-2019 give 26 recorded months of prior history). Cohort = year of that first month.
Windows counted from the first month (month 1 = first month): Y1 = months 1-12, Y2 = 13-24, Y3 = 25-36. All months from
2020-01 to 2026-09 are recorded, so a window is used only if it ends by 2026-09 (Y2 needs first month <= 2024-10,
Y3 <= 2023-10). Families whose window is incomplete are excluded from that window, never counted as stopped.
Measures per cohort:
  survival to Y2 / Y3 = share of families with positive net in that window
  value retention     = cohort net in Y2 (Y3) / cohort net in Y1
  one-month products  = share of families with positive net in exactly one month in Y1 and none in Y2 (where Y2 known)
  value-weighted survival = share of Y1 net in families that survive to Y2
Splits (each reported, then checked for direction in every cohort with >= 20 families in both groups):
  S1 large-order start: > 50% of Y1 net from documents >= PHP 500k, vs routine start.
  S2 early repeat: positive net in >= 3 of months 1-6, vs fewer.
A split is called consistent only if the direction (which group survives more to Y2) is the same in every qualifying cohort.
Results are retrospective and authorize no purchase.
Run from repo root:  python -X utf8 outputs/product_survival_20261115/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json

ROOT = Path.cwd(); OUT = ROOT / 'outputs/product_survival_20261115'
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
    rows.append(dict(mi=d.year * 12 + d.month - 1, ym=f'{d.year}-{d.month:02d}', dr=r['dr_number'], net=float(r['net_sales']), fam=family[r['normalized_product']]))
docs = defaultdict(float)
for x in rows:
    if x['dr']: docs[(x['ym'], x['dr'])] += x['net']
fm = defaultdict(lambda: defaultdict(float)); fl = defaultdict(lambda: defaultdict(float))
for x in rows:
    fm[x['fam']][x['mi']] += x['net']
    if x['dr'] and docs[(x['ym'], x['dr'])] >= 500_000: fl[x['fam']][x['mi']] += x['net']
MI = lambda y, mo: y * 12 + mo - 1
END = MI(2026, 9)
fams = []
for f, s in fm.items():
    pos = sorted(k for k, v in s.items() if v > 0)
    if not pos or not (MI(2020, 1) <= pos[0] <= MI(2025, 12)): continue
    first = pos[0]
    win = lambda a, b: sum(s.get(k, 0.0) for k in range(first + a, first + b))
    active = lambda a, b: any(s.get(k, 0.0) > 0 for k in range(first + a, first + b))
    y1 = win(0, 12); y1_large = sum(fl[f].get(k, 0.0) for k in range(first, first + 12))
    fams.append(dict(fam=f, cohort=first // 12, y1=y1,
                     y2_known=first + 23 <= END, y3_known=first + 35 <= END,
                     y2=win(12, 24), y3=win(24, 36), alive2=active(12, 24), alive3=active(24, 36),
                     months_y1=sum(1 for k in range(first, first + 12) if s.get(k, 0.0) > 0),
                     early=sum(1 for k in range(first, first + 6) if s.get(k, 0.0) > 0) >= 3,
                     large_start=y1 > 0 and y1_large / y1 > 0.5))

def summary(group):
    g2 = [f for f in group if f['y2_known']]; g3 = [f for f in group if f['y3_known']]
    out = dict(families=len(group), y1_net=round(sum(f['y1'] for f in group)))
    if g2:
        y1n = sum(f['y1'] for f in g2)
        out.update(n_y2=len(g2), survival_y2=round(sum(f['alive2'] for f in g2) / len(g2), 3),
                   value_retention_y2=round(sum(f['y2'] for f in g2) / y1n, 3) if y1n else None,
                   value_weighted_survival_y2=round(sum(f['y1'] for f in g2 if f['alive2']) / y1n, 3) if y1n else None,
                   one_month_products=round(sum(f['months_y1'] == 1 and not f['alive2'] for f in g2) / len(g2), 3))
    if g3:
        y1n = sum(f['y1'] for f in g3)
        out.update(n_y3=len(g3), survival_y3=round(sum(f['alive3'] for f in g3) / len(g3), 3),
                   value_retention_y3=round(sum(f['y3'] for f in g3) / y1n, 3) if y1n else None)
    return out

cohorts = sorted({f['cohort'] for f in fams})
res = dict(rules_sha256=hashlib.sha256(__doc__.encode('utf-8')).hexdigest(), new_families=len(fams),
           by_cohort={c: summary([f for f in fams if f['cohort'] == c]) for c in cohorts}, all_cohorts=summary(fams))
splits = {}
for name, key in (('S1_large_order_start', 'large_start'), ('S2_early_repeat', 'early')):
    per = {}; dirs = []
    for c in cohorts:
        a = [f for f in fams if f['cohort'] == c and f['y2_known'] and f[key]]; b = [f for f in fams if f['cohort'] == c and f['y2_known'] and not f[key]]
        if not a or not b: continue
        sa = sum(f['alive2'] for f in a) / len(a); sb = sum(f['alive2'] for f in b) / len(b)
        per[c] = dict(yes_n=len(a), yes_survival_y2=round(sa, 3), no_n=len(b), no_survival_y2=round(sb, 3))
        if len(a) >= 20 and len(b) >= 20: dirs.append(sa > sb)
    splits[name] = dict(by_cohort=per, qualifying_cohorts=len(dirs), consistent=bool(dirs) and (all(dirs) or not any(dirs)),
                        direction='yes survives more' if dirs and all(dirs) else ('no survives more' if dirs and not any(dirs) else 'mixed'),
                        pooled=dict(yes=summary([f for f in fams if f[key]]), no=summary([f for f in fams if not f[key]])))
res['splits'] = splits
(OUT / 'results.json').write_text(json.dumps(res, indent=1, ensure_ascii=False))
print('rules', res['rules_sha256'][:12], '| new families', len(fams))
for c, v in res['by_cohort'].items(): print(c, v)
print('ALL', res['all_cohorts'])
for k, v in splits.items():
    print('\n', k, v['direction'], 'consistent', v['consistent'], 'qualifying', v['qualifying_cohorts'])
    for c, p in v['by_cohort'].items(): print('  ', c, p)
    print('   pooled yes', v['pooled']['yes']); print('   pooled no ', v['pooled']['no'])
