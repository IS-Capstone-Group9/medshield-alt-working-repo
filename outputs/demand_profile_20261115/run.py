"""Demand profile per product group, 15 Nov 2026. Offline, read-only, deterministic. Rules fixed before the first run.

Unit: therapeutic category from candidate mapping v0.1 (high or medium confidence only). Families outside the top 200
and low-confidence families form one group, NOT_CLASSIFIED, which is profiled but excluded from the check.
Sales: original itemized, contracts excluded. Large order = delivery document (month, DR) >= PHP 500k; the rest is routine.
Windows (all months recorded): CURRENT = 2024-10..2026-09 (24 months); EARLIER = 2022-10..2024-09 (24 months).
Measures per category and window:
  large share   = large-order net / total net
  steadiness    = CV of routine monthly net over the 24 months (population sd / mean; months without sales count as 0)
  active months = months with positive routine net
Planning class, first rule that applies (CV cut-offs are the registered ABC-XYZ ones, 0.5 and 1.0):
  1 LARGE_ORDER  large share >= 50%                       -> plan for readiness, no forecast
  2 ERRATIC      CV > 1.0, or active months < 12, or no positive routine mean -> order on demand
  3 UNEVEN       CV > 0.5                                 -> reorder with a larger buffer
  4 STEADY       otherwise                                -> reorder from the 6-month average
  Flag MIXED when the class is 2-4 and large share is 25% or more (keep readiness for large orders as well).
Check (is the class a usable planning guide?). Classes are assigned on EARLIER only and judged on CURRENT:
  C1 forecastability: lead-1 6-month-mean WAPE of routine monthly sales on CURRENT targets, per category. Median WAPE
     must rise in the order STEADY < UNEVEN < ERRATIC over the classes that have at least 2 categories (at least two
     such classes are needed, otherwise C1 is not testable).
  C2 stability: at least 60% of categories keep the same class from EARLIER to CURRENT.
  Categories enter the check only with at least PHP 1M net in both windows. The profile is called a usable planning
  guide only if C1 and C2 both pass; otherwise it is reported as description only. No retuning of cut-offs.
Also reported, not part of the check: share of all sales; new-product share (share of the last 12 months' net from
families first sold in CURRENT); seasonality and disease-link results from the registered 15 Nov tests (mapping v0.1 rerun).
Retrospective; a planning class is a suggestion and authorizes no purchase.
Run from repo root:  python -X utf8 outputs/demand_profile_20261115/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
from statistics import median
import csv, hashlib, importlib.util, io, json, math

ROOT = Path.cwd(); OUT = ROOT / 'outputs/demand_profile_20261115'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
el = [r for r in m.gold_candidates(assessed, receipt, bundle['files'])['itemized'] if r['is_net_sales_technically_eligible']]
TOTAL = sum(Decimal(str(r['net_sales'])) for r in el); assert TOTAL == Decimal('638015351.53')
family = {r['recorded_label']: r['family_v1'] for r in csv.DictReader((ROOT / 'outputs/product_family_draft_20261111/family_mapping_v1_1_candidate.csv').open(encoding='utf-8'))}
cmap_path = ROOT / 'outputs/category_mapping_20261115/category_mapping_v0_1_top200.csv'
cat = {r['family_v1']: r['category'] for r in csv.DictReader(cmap_path.open(encoding='utf-8')) if r['confidence'] in ('H', 'M')}

rows = []; docs = defaultdict(float)
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10]); ym = f'{d.year}-{d.month:02d}'
    f = family[r['normalized_product']]; rows.append((ym, r['dr_number'], float(r['net_sales']), f, cat.get(f, 'NOT_CLASSIFIED')))
    if r['dr_number']: docs[(ym, r['dr_number'])] += float(r['net_sales'])
rout = defaultdict(lambda: defaultdict(float)); large = defaultdict(lambda: defaultdict(float)); alltime = defaultdict(float)
first_sale = {}; fam_cat = {}; fam_month = defaultdict(lambda: defaultdict(float))
for ym, dr, net, f, c in rows:
    alltime[c] += net; fam_cat[f] = c; fam_month[f][ym] += net
    (large if dr and docs[(ym, dr)] >= 500_000 else rout)[c][ym] += net
for f, s in fam_month.items():
    pos = sorted(k for k, v in s.items() if v > 0)
    if pos: first_sale[f] = pos[0]
def span(a, b):
    y, mo = map(int, a.split('-')); out = []
    while f'{y}-{mo:02d}' <= b: out.append(f'{y}-{mo:02d}'); mo += 1; y, mo = (y + 1, 1) if mo == 13 else (y, mo)
    return out
recorded = {r[0] for r in rows}
CURRENT, EARLIER = span('2024-10', '2026-09'), span('2022-10', '2024-09'); HISTORY = span('2022-04', '2026-09')
assert len(CURRENT) == len(EARLIER) == 24 and all(k in recorded for k in HISTORY)

def measures(c, win):
    r = [rout[c].get(k, 0.0) for k in win]; lg = sum(large[c].get(k, 0.0) for k in win); tot = sum(r) + lg
    mean = sum(r) / len(r); cv = math.sqrt(sum((v - mean) ** 2 for v in r) / len(r)) / mean if mean > 0 else None
    return dict(net=tot, routine_net=sum(r), large_share=lg / tot if tot > 0 else None, cv=cv, active_months=sum(1 for v in r if v > 0))
def classify(ms):
    if ms['large_share'] is not None and ms['large_share'] >= 0.5: return 'LARGE_ORDER'
    if ms['cv'] is None or ms['cv'] > 1.0 or ms['active_months'] < 12: return 'ERRATIC'
    return 'UNEVEN' if ms['cv'] > 0.5 else 'STEADY'
def wape(series, targets):
    err = act = 0.0
    for t in targets:
        i = HISTORY.index(t); fc = sum(series.get(k, 0.0) for k in HISTORY[i - 6:i]) / 6; a = series.get(t, 0.0)
        err += abs(fc - a); act += abs(a)
    return err / act if act > 0 else None
PLAN = {'LARGE_ORDER': 'Plan for readiness; do not forecast', 'ERRATIC': 'Order on demand', 'UNEVEN': 'Reorder with a larger buffer', 'STEADY': 'Reorder from the 6-month average'}

tests = json.loads((ROOT / 'outputs/category_disease_test_20261115/results_sensitivity_v0_1.json').read_text(encoding='utf-8'))
seasonal = {t['category']: t['seasonal'] for t in tests['T2']}
linked = defaultdict(lambda: None)
for t in tests['T1']: linked[t['category']] = bool(linked[t['category']]) or t['supported']
last12 = CURRENT[12:]
profile = []
for c in sorted(alltime, key=lambda k: -alltime[k]):
    cur = measures(c, CURRENT)
    if cur['net'] < 1_000_000: continue
    cls = classify(cur); fams = [f for f, cc in fam_cat.items() if cc == c]
    l12 = sum(fam_month[f].get(k, 0.0) for f in fams for k in last12)
    new12 = sum(fam_month[f].get(k, 0.0) for f in fams for k in last12 if first_sale.get(f, '0') >= CURRENT[0])
    profile.append(dict(category=c, share_all_sales_pct=round(100 * alltime[c] / float(TOTAL), 1), current_net_php=round(cur['net']),
                        large_share_pct=round(100 * cur['large_share'], 1), routine_cv=None if cur['cv'] is None else round(cur['cv'], 2),
                        active_months=cur['active_months'], planning_class=cls, mixed=cls != 'LARGE_ORDER' and cur['large_share'] >= 0.25,
                        plan=PLAN[cls], new_product_share_pct=round(100 * new12 / l12, 1) if l12 > 0 else None,
                        seasonal=seasonal.get(c, 'not tested'), disease_link=linked[c] if c in linked else 'not tested',
                        routine_wape_current_pct=None if wape(rout[c], CURRENT) is None else round(100 * wape(rout[c], CURRENT), 1)))
check = []
for c in alltime:
    if c == 'NOT_CLASSIFIED': continue
    e, cur = measures(c, EARLIER), measures(c, CURRENT)
    if e['net'] < 1_000_000 or cur['net'] < 1_000_000: continue
    w = wape(rout[c], CURRENT)
    check.append(dict(category=c, class_earlier=classify(e), class_current=classify(cur), routine_wape_current_pct=None if w is None else round(100 * w, 1)))
med = {}
for k in ('STEADY', 'UNEVEN', 'ERRATIC', 'LARGE_ORDER'):
    v = [x['routine_wape_current_pct'] for x in check if x['class_earlier'] == k and x['routine_wape_current_pct'] is not None]
    med[k] = dict(categories=len(v), median_wape_pct=round(median(v), 1) if v else None)
order = [med[k]['median_wape_pct'] for k in ('STEADY', 'UNEVEN', 'ERRATIC') if med[k]['categories'] >= 2]
c1 = None if len(order) < 2 else all(a < b for a, b in zip(order, order[1:]))
same = sum(x['class_earlier'] == x['class_current'] for x in check); c2 = same / len(check) >= 0.6
res = dict(rules_sha256=hashlib.sha256(__doc__.encode('utf-8')).hexdigest(), mapping_sha256=hashlib.sha256(cmap_path.read_bytes()).hexdigest(),
           windows=dict(current=[CURRENT[0], CURRENT[-1]], earlier=[EARLIER[0], EARLIER[-1]]), profile=profile,
           check=dict(categories=len(check), by_earlier_class=med, C1_forecastability_order=c1, same_class=same, stability_pct=round(100 * same / len(check), 1),
                      C2_stability=c2, usable_planning_guide=bool(c1) and c2, detail=sorted(check, key=lambda x: x['category'])))
by_cls = defaultdict(float)
for p in profile: by_cls[p['planning_class']] += p['current_net_php']
res['current_sales_by_class_pct'] = {k: round(100 * v / sum(by_cls.values()), 1) for k, v in sorted(by_cls.items(), key=lambda kv: -kv[1])}
(OUT / 'results.json').write_text(json.dumps(res, indent=1, ensure_ascii=False))
print('rules', res['rules_sha256'][:12], '| mapping', res['mapping_sha256'][:12])
print(f"{'category':24} {'all%':>5} {'cur M':>6} {'large%':>6} {'cv':>5} {'act':>3} {'class':12} {'mix':3} {'new%':>5} {'wape%':>6}")
for p in profile:
    print(f"{p['category']:24} {p['share_all_sales_pct']:5.1f} {p['current_net_php']/1e6:6.1f} {p['large_share_pct']:6.1f} {str(p['routine_cv']):>5} {p['active_months']:3} {p['planning_class']:12} {'Y' if p['mixed'] else '':3} {str(p['new_product_share_pct']):>5} {str(p['routine_wape_current_pct']):>6}")
print('\nCHECK', json.dumps({k: v for k, v in res['check'].items() if k != 'detail'}))
for x in res['check']['detail']: print('  ', f"{x['category']:24} {x['class_earlier']:12} -> {x['class_current']:12} wape {x['routine_wape_current_pct']}")
print('current sales by class', res['current_sales_by_class_pct'])
