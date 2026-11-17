"""O4 data-driven prescriptive policy, 13 Nov 2026. Offline, read-only, retrospective, EXPLORATORY.

Months were inspected by earlier studies, so results are exploratory, not registered evidence. Rules fixed before run.
Data: eligible signed net PHP, original itemized, contracts excluded, 2020-01..2026-09, family mapping v1 candidate.
Scope: A-class families of the prior calendar year (80% of positive yearly net), periodic monthly review.

Policy at origin o for family f (only data up to o):
  D   = mean_6 (the reference forecast, O3).
  q   = service target from prior-year XYZ class: X and Y -> 95%, Z -> 90% (policy choice, stated as such).
  P   = protection period in months = 1 (review) + L/30, L = supplier lead time in days (assumption A3: 7, 14, 30).
  SS  = q-quantile of the family's last 24 known errors (LTD - P*D), minimum 12; LTD = next P months of sales.
  S   = P*D + SS  (order-up-to level, PHP at sales value).
  EOQ (PHP at cost) = sqrt(2 * 12*D*c * K / h), c = 0.4097 cost share (company gross margin 59.03%), K = ordering cost
       (A2: 500, 1,500, 5,000), h = holding rate (A1: 15%, 25%, 35%). Order interval = 12 * EOQ / (12*D*c) months.

T1 Calibration: pooled cycle service (share of family-months with LTD <= S) within +/-5 points of the pooled target,
   for every L, and within +/-5 points for each class target (95% and 90%) at L = 14.
T2 Prescriptive value: at L = 14, the policy needs at least 10% less total order-up-to stock (sum of S) than the best
   single months-of-cover rule S = k*D (one k for all families, k searched 0.5..6) reaching the same pooled cycle
   service; the saving must hold in both halves of the origins.
T3 Robustness: the order-frequency band (weekly <=0.35 mo, fortnightly <=0.75, monthly <=1.5, bi-monthly <=3,
   quarterly or longer) is the same in at least 6 of the 9 cost combinations for >= 70% of current families.
Also reported: peso fill rate (1 - short / demand) and the current prescription table (origin 2026-09, L = 14).
Run from repo root:  python -X utf8 outputs/o4_prescriptive_policy_20261113/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json, warnings
import numpy as np

warnings.filterwarnings('ignore')
REGISTRATION = __doc__.split('Run from')[0]
ROOT = Path.cwd(); OUT = ROOT / 'outputs/o4_prescriptive_policy_20261113'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
el = [r for r in m.gold_candidates(assessed, receipt, bundle['files'])['itemized'] if r['is_net_sales_technically_eligible']]
assert sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')
mapping_path = ROOT / 'outputs/product_family_draft_20261111/family_mapping_v1_candidate.csv'
family = {r['recorded_label']: r['family_v1'] for r in csv.DictReader(mapping_path.open(encoding='utf-8'))}

F = defaultdict(lambda: np.zeros(81)); months = [f'{y}-{mo:02d}' for y in range(2020, 2027) for mo in range(1, 13)][:81]
ix = {p: i for i, p in enumerate(months)}; N = 81
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10]); ym = f'{d.year}-{d.month:02d}'
    if ym in ix: F[family[r['normalized_product']]][ix[ym]] += float(r['net_sales'])
assert abs(sum(v.sum() for v in F.values()) - sum(float(r['net_sales']) for r in el
           if '2020-01' <= str(r['date_delivered'])[:7] <= '2026-09')) < 1
res = {'registration_sha256': hashlib.sha256(REGISTRATION.encode()).hexdigest(),
       'mapping_sha256': hashlib.sha256(mapping_path.read_bytes()).hexdigest()}
COST, TARGET = 0.4097, {'X': .95, 'Y': .95, 'Z': .90}
mean6 = lambda y, o: float(np.mean(y[o-5:o+1]))

def classes(Y):
    cols = [ix[p] for p in months if p.startswith(str(Y))]
    val = sorted(((float(y[cols].sum()), k) for k, y in F.items() if y[cols].sum() > 0), reverse=True)
    tot, run, out = sum(v for v, _ in val), 0.0, {}
    for v, k in val:
        if run < .8 * tot:
            ys = F[k][cols]; cv = float(np.std(ys) / np.mean(ys))
            out[k] = 'X' if cv <= .5 else 'Y' if cv <= 1 else 'Z'
        run += v
    return out

def ltd(y, s, P):  # demand over the next P months (P in [1, 2])
    return float(y[s+1] + (P - 1) * y[s+2])

def policy_rows(L):
    P = 1 + L / 30; rows = []
    for o in range(23, N - 2):
        for k, xyz in classes(int(months[o][:4]) - 1).items():
            y = F[k]; errs = [ltd(y, s, P) - P * mean6(y, s) for s in range(5, o - 1)][-24:]
            if len(errs) < 12: continue
            D = mean6(y, o); q = TARGET[xyz]; S = P * D + float(np.quantile(errs, q))
            rows.append(dict(o=o, k=k, xyz=xyz, q=q, D=D, P=P, S=S, a=ltd(y, o, P)))
    return rows

def summary(rows, S_key='S'):
    a = np.array([r['a'] for r in rows]); S = np.array([r[S_key] for r in rows])
    return dict(cases=len(rows), cycle_service=float(np.mean(a <= S)),
                fill_rate=float(1 - np.maximum(a - S, 0).sum() / np.maximum(a, 0).sum()), total_stock=float(S.sum()))

# ---- T1 calibration
t1 = {}
for L in (7, 14, 30):
    rows = policy_rows(L); s = summary(rows); s['pooled_target'] = float(np.mean([r['q'] for r in rows]))
    s['by_target'] = {str(q): summary([r for r in rows if r['q'] == q]) for q in (.95, .90)}
    t1[f'L{L}'] = s
    if L == 14: rows14 = rows
t1['passes'] = bool(all(abs(t1[f'L{L}']['cycle_service'] - t1[f'L{L}']['pooled_target']) <= .05 for L in (7, 14, 30))
                    and all(abs(t1['L14']['by_target'][str(q)]['cycle_service'] - q) <= .05 for q in (.95, .90)))
res['T1_calibration'] = t1

# ---- T2 value against the best months-of-cover rule
def cover_stock_needed(rows, service):
    a = np.array([r['a'] for r in rows]); D = np.array([r['D'] for r in rows])
    for k in np.arange(.5, 6.0001, .01):
        if np.mean(a <= k * D) >= service: return float(k), float((k * D).sum())
    return None, None
def t2_for(rows):
    s = summary(rows); k, stock = cover_stock_needed(rows, s['cycle_service'])
    return dict(policy_service=s['cycle_service'], policy_stock=s['total_stock'], cover_k=k, cover_stock=stock,
                saving=None if stock is None else 1 - s['total_stock'] / stock)
origins = sorted({r['o'] for r in rows14}); mid = origins[len(origins) // 2]
t2 = dict(all=t2_for(rows14), first_half=t2_for([r for r in rows14 if r['o'] < mid]),
          second_half=t2_for([r for r in rows14 if r['o'] >= mid]))
t2['passes'] = bool(all(t2[h]['saving'] is not None and t2[h]['saving'] >= .10 for h in ('all', 'first_half', 'second_half')))
res['T2_value_vs_months_of_cover'] = t2

# ---- current prescription (origin 2026-09, L = 14) and T3 robustness
def band(mo): return 'weekly' if mo <= .35 else 'fortnightly' if mo <= .75 else 'monthly' if mo <= 1.5 else 'bi-monthly' if mo <= 3 else 'quarterly+'
o = N - 1; P = 1 + 14 / 30; cur = []; stable = []
cur_classes = classes(2025)
for k, xyz in cur_classes.items():
    y = F[k]; errs = [ltd(y, s, P) - P * mean6(y, s) for s in range(5, o - 1)][-24:]
    if len(errs) < 12: continue
    D = mean6(y, o)
    if D <= 0: continue
    q = TARGET[xyz]; SS = float(np.quantile(errs, q)); A = 12 * D * COST
    intervals = {(K, h): 12 * np.sqrt(2 * A * K / h) / A for K in (500, 1500, 5000) for h in (.15, .25, .35)}
    bands = [band(v) for v in intervals.values()]; base = band(intervals[(1500, .25)])
    stable.append(bands.count(base) >= 6)
    cur.append(dict(family=k, xyz_2025=xyz, service_target=q, monthly_demand_php=round(D, 2),
                    safety_stock_php=round(max(SS, 0), 2), order_up_to_php=round(P * D + max(SS, 0), 2),
                    order_up_to_at_cost_php=round((P * D + max(SS, 0)) * COST, 2),
                    order_interval_months_base=round(intervals[(1500, .25)], 2), order_frequency=base,
                    frequency_same_in_combos=bands.count(base)))
cur.sort(key=lambda r: -r['monthly_demand_php'])
res['T3_robustness'] = dict(families=len(cur), share_stable=float(np.mean(stable)), passes=bool(np.mean(stable) >= .70),
                            frequency_counts={b: sum(r['order_frequency'] == b for r in cur) for b in
                                              ('weekly', 'fortnightly', 'monthly', 'bi-monthly', 'quarterly+')})
res['current_prescription_totals'] = dict(families=len(cur), monthly_demand_php=sum(r['monthly_demand_php'] for r in cur),
                                          order_up_to_php=sum(r['order_up_to_php'] for r in cur),
                                          safety_stock_php=sum(r['safety_stock_php'] for r in cur),
                                          negative_safety_stock_clipped=sum(1 for r in cur if r['safety_stock_php'] == 0))
# ---- SUPPLEMENTARY, added after the first run (not a registered rule): the first-half comparator could not reach the
# policy's service within k <= 6, so T2 failed as written. Re-search k up to 24 months to size the gap. Post hoc.
def cover_wide(rows):
    s = summary(rows); a = np.array([r['a'] for r in rows]); D = np.array([r['D'] for r in rows])
    for k in np.arange(.5, 24.0001, .01):
        if np.mean(a <= k * D) >= s['cycle_service']:
            return dict(cover_k=float(k), saving=1 - s['total_stock'] / float((k * D).sum()))
    return dict(cover_k=None, saving=None)
res['T2_supplementary_post_hoc'] = {h: cover_wide(r) for h, r in (
    ('all', rows14), ('first_half', [r for r in rows14 if r['o'] < mid]), ('second_half', [r for r in rows14 if r['o'] >= mid]))}
res['T1_peso_fill_rate_by_class_L14'] = {x: summary([r for r in rows14 if r['xyz'] == x]) for x in 'XYZ'}

with (OUT / 'prescription_2026_09.csv').open('w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(cur[0])); w.writeheader(); w.writerows(cur)
(OUT / 'results.json').write_text(json.dumps(res, indent=1)); print(json.dumps(res, indent=1))
