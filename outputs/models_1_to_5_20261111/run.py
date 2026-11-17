"""Models 1-5 test, 11 Nov 2026. Offline, read-only, retrospective (every month already inspected by earlier studies).

REGISTERED BEFORE RUNNING (hash stored in results.json):
Data: original itemized, contracts excluded, eligible signed net PHP, 2020-01..2026-09 (81 months). Base series =
documents < PHP 500,000 plus rows without a DR (D3 split). Origins index >= 23 (as the 6 Nov rolling study).

M1 Prediction ranges, base mean_6, leads 1/3/6. Interval = forecast +/- empirical quantiles of the most recent 24
   realised errors at the same lead (min 12). Target 80%. Pass: mean coverage 75-85% over the three leads AND every
   lead within 70-90%. Reported: width / forecast.
M2 Safety stock (PHP order-up-to level), base mean_6, lead 1. Level = forecast + 95th percentile of recent 24 lead-1
   errors (min 12). Pass: achieved cycle service (share of months actual <= level) within 90-98%. Reported: mean
   buffer as % of forecast. PHP stands in for units; this is a method check, not a stock policy.
M3 ABC-XYZ at product_key grain. Each year Y in 2021..2025: ABC by value (80/95% cumulative positive net), XYZ by CV
   of 12 monthly net values (X <= 0.5 < Y <= 1.0 < Z). Pass: A-class value share in Y+1 kept by year-Y A-X items at
   >= 50% of their year-Y value (persistence), reported by class. Descriptive; no forecast claim.
M4 TSB vs mean_6 on intermittent products (product_key with ADI > 1.32 over 2020-01..2023-12 and >= 6 positive
   months). TSB alpha 0.3, beta 0.1 (the earlier registered settings). Pooled lead-1 WAPE over all such products.
   Pass: the standard win rule below on pooled monthly absolute error.
M5 Hierarchical reconciliation: bottom = top 8 area labels by net + OTHER; total = company. Base forecasts mean_6
   at every node, lead 1. Reconcile with OLS and with WLS (structural scaling). Pass: the win rule on company total
   vs company mean_6, AND reconciled bottom WAPE not worse than unreconciled bottom WAPE.
Win rule (unchanged): 90% moving-block bootstrap (block 6, 2000 draws, seed 20261111) of the mean paired
absolute-error difference challenger - reference wholly below zero, |normalized bias| <= 5%, and the paired difference
has the same (negative) sign in both halves of the cases.
Run from repo root:  python -X utf8 outputs/models_1_to_5_20261111/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json, random, statistics as st
import numpy as np

REGISTRATION = __doc__.split('Run from')[0]
ROOT = Path.cwd(); OUT = ROOT / 'outputs/models_1_to_5_20261111'
SOURCE = ROOT / 'databricks_updated_2/medshield_project_csv'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(SOURCE); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
items = m.gold_candidates(assessed, receipt, bundle['files'])['itemized']
el = [r for r in items if r['is_net_sales_technically_eligible']]
assert len(items) == 40171 and sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')

rows = []
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10])
    ym = f'{d.year}-{d.month:02d}'
    if '2020-01' <= ym <= '2026-09':
        rows.append(dict(ym=ym, dr=r['dr_number'], key=r['product_key'], area=(r['area'] or '').strip().upper(), net=float(r['net_sales'])))
months = sorted({r['ym'] for r in rows}); assert len(months) == 81
ix = {p: i for i, p in enumerate(months)}; N = len(months)
doc = defaultdict(float)
for r in rows:
    if r['dr']: doc[(r['ym'], r['dr'])] += r['net']
large_docs = {k for k, v in doc.items() if v >= 500_000}
base = np.zeros(N); company = np.zeros(N)
for r in rows:
    company[ix[r['ym']]] += r['net']
    if not (r['dr'] and (r['ym'], r['dr']) in large_docs): base[ix[r['ym']]] += r['net']

mean6 = lambda y, o: float(np.mean(y[o-5:o+1]))
def score(f, a):
    f, a = np.asarray(f), np.asarray(a); act = np.abs(a).sum()
    return dict(cases=int(len(a)), wape=float(np.abs(f-a).sum()/act), bias=float((f-a).sum()/act))
def win(fc, fr, a):
    fc, fr, a = map(np.asarray, (fc, fr, a)); diff = list(np.abs(fc-a) - np.abs(fr-a)); n = len(diff)
    rng, means = random.Random(20261111), []
    for _ in range(2000):
        s = []
        while len(s) < n:
            i = rng.randrange(n); s.extend(diff[i:i+6])
        means.append(st.mean(s[:n]))
    means.sort(); lo, hi = means[100], means[1899]; h = n // 2
    bias = float((fc-a).sum()/np.abs(a).sum())
    return dict(boot90=[lo, hi], halves=[float(sum(diff[:h])), float(sum(diff[h:]))], bias=bias,
                passes=bool(hi < 0 and abs(bias) <= .05 and sum(diff[:h]) < 0 and sum(diff[h:]) < 0))

res = {'registration_sha256': hashlib.sha256(REGISTRATION.encode()).hexdigest(),
       'control': {'months': N, 'company_net': float(company.sum()), 'base_net': float(base.sum())}}

# M1 and M2
def errors_at(y, lead):
    return {o: y[o+lead] - mean6(y, o) for o in range(23, N-lead)}
m1 = {}
for lead in (1, 3, 6):
    e = errors_at(base, lead); hit = []; width = []
    for o in range(23, N-lead):
        past = [e[q] for q in e if q + lead <= o][-24:]  # only errors whose actual was known at origin o
        if len(past) < 12: continue
        f = mean6(base, o); lo, hi = np.quantile(past, [.1, .9])
        hit.append(f + lo <= base[o+lead] <= f + hi); width.append((hi - lo) / f)
    m1[f'lead{lead}'] = dict(cases=len(hit), coverage=float(np.mean(hit)), width_over_forecast=float(np.mean(width)))
cov = [v['coverage'] for v in m1.values()]
m1['passes'] = bool(.75 <= np.mean(cov) <= .85 and all(.70 <= c <= .90 for c in cov)); res['M1_ranges'] = m1
e = errors_at(base, 1); ok = []; buf = []
for o in range(23, N-1):
    past = [e[q] for q in e if q + 1 <= o][-24:]
    if len(past) < 12: continue
    f = mean6(base, o); q95 = float(np.quantile(past, .95))
    ok.append(base[o+1] <= f + q95); buf.append(q95 / f)
res['M2_safety_stock'] = dict(cases=len(ok), achieved_service=float(np.mean(ok)), mean_buffer_pct_of_forecast=float(np.mean(buf)),
                              passes=bool(.90 <= np.mean(ok) <= .98))

# M3 ABC-XYZ persistence
prod = defaultdict(lambda: np.zeros(N))
for r in rows: prod[r['key']][ix[r['ym']]] += r['net']
def classes(year):
    cols = [ix[p] for p in months if p.startswith(str(year))]
    val = {k: float(v[cols].sum()) for k, v in prod.items() if v[cols].sum() > 0}
    tot, run, out = sum(val.values()), 0.0, {}
    for k, v in sorted(val.items(), key=lambda kv: (-kv[1], kv[0])):
        abc = 'A' if run < .8 * tot else 'B' if run < .95 * tot else 'C'; run += v
        y = prod[k][cols]; cv = float(np.std(y) / np.mean(y)) if np.mean(y) > 0 else 9
        out[k] = (abc + ('X' if cv <= .5 else 'Y' if cv <= 1 else 'Z'), v)
    return out
m3 = {}
for Y in range(2021, 2026):
    now, nxt = classes(Y), classes(Y + 1); agg = defaultdict(lambda: [0, 0.0, 0.0, 0])
    for k, (c, v) in now.items():
        a = agg[c]; a[0] += 1; a[1] += v; a[2] += nxt.get(k, ('', 0.0))[1]; a[3] += nxt.get(k, ('',))[0] == c
    m3[str(Y)] = {c: dict(items=a[0], value_kept_next_year=a[2]/a[1], same_class_next_year=a[3]/a[0]) for c, a in sorted(agg.items())}
ax = [m3[y]['AX']['value_kept_next_year'] for y in m3 if 'AX' in m3[y]]
res['M3_abc_xyz'] = dict(by_year=m3, AX_value_kept_mean=float(np.mean(ax)) if ax else None,
                         passes=bool(ax and np.mean(ax) >= .5))

# M4 TSB on intermittent products
train = [ix[p] for p in months if p <= '2023-12']
def adi(y):
    pos = [i for i in train if y[i] > 0]; return (len(train) / len(pos)) if pos else 99, len(pos)
inter = [k for k, y in prod.items() if (lambda a: a[0] > 1.32 and a[1] >= 6)(adi(y))]
def tsb(y, o, a=.3, b=.1):
    p, z = None, None
    for t in range(o + 1):
        occ = 1.0 if y[t] > 0 else 0.0
        if p is None:
            if occ: p, z = 1.0, y[t]
            continue
        p = p + b * (occ - p)
        if occ: z = z + a * (y[t] - z)
    return 0.0 if p is None else p * z
fT, fR, A = [], [], []
for o in range(23, N-1):
    for k in inter:
        y = prod[k]; fT.append(tsb(y, o)); fR.append(mean6(y, o)); A.append(y[o+1])
monthly = defaultdict(lambda: [0.0, 0.0, 0.0])  # aggregate per origin so the bootstrap blocks are months
for i, o in enumerate(o for o in range(23, N-1) for _ in inter):
    monthly[o][0] += abs(fT[i]-A[i]); monthly[o][1] += abs(fR[i]-A[i]); monthly[o][2] += A[i]
res['M4_tsb'] = dict(products=len(inter), tsb=score(fT, A), mean6=score(fR, A))
d = [v[0]-v[1] for _, v in sorted(monthly.items())]
# win rule on per-month pooled absolute errors (bias from pooled forecasts)
diff = d; rng, means = random.Random(20261111), []
for _ in range(2000):
    s = []
    while len(s) < len(diff):
        i = rng.randrange(len(diff)); s.extend(diff[i:i+6])
    means.append(st.mean(s[:len(diff)]))
means.sort(); h = len(diff)//2
res['M4_tsb'].update(boot90=[means[100], means[1899]], halves=[sum(diff[:h]), sum(diff[h:])],
                     passes=bool(means[1899] < 0 and abs(res['M4_tsb']['tsb']['bias']) <= .05 and sum(diff[:h]) < 0 and sum(diff[h:]) < 0))

# M5 hierarchical reconciliation
area_tot = defaultdict(float)
for r in rows: area_tot[r['area']] += r['net']
top = [a for a, _ in sorted(area_tot.items(), key=lambda kv: -kv[1])[:8]]
bottom = {a: np.zeros(N) for a in top + ['OTHER']}
for r in rows: bottom[r['area'] if r['area'] in top else 'OTHER'][ix[r['ym']]] += r['net']
names = list(bottom); Bm = np.array([bottom[n] for n in names]); nb = len(names)
S = np.vstack([np.ones(nb), np.eye(nb)])
def P(W):
    Wi = np.linalg.inv(W); return S @ np.linalg.inv(S.T @ Wi @ S) @ S.T @ Wi
P_ols = P(np.eye(nb + 1)); P_wls = P(np.diag(S.sum(1)))
out = {k: ([], []) for k in ('base', 'ols', 'wls')}; act = []
for o in range(23, N-1):
    yhat = np.array([mean6(company, o)] + [mean6(Bm[j], o) for j in range(nb)])
    act.append(np.concatenate([[company[o+1]], Bm[:, o+1]]))
    for k, f in (('base', yhat), ('ols', P_ols @ yhat), ('wls', P_wls @ yhat)): out[k][0].append(f)
act = np.array(act); m5 = {'nodes': names}
for k in out:
    f = np.array(out[k][0])
    m5[k] = dict(total=score(f[:, 0], act[:, 0]), bottom_pooled=score(f[:, 1:].ravel(), act[:, 1:].ravel()))
for k in ('ols', 'wls'):
    f = np.array(out[k][0]); r0 = np.array(out['base'][0])
    m5[k]['win_total'] = win(f[:, 0], r0[:, 0], act[:, 0])
    m5[k]['passes'] = bool(m5[k]['win_total']['passes'] and m5[k]['bottom_pooled']['wape'] <= m5['base']['bottom_pooled']['wape'])
res['M5_reconciliation'] = m5
(OUT / 'results.json').write_text(json.dumps(res, indent=1, default=float))
print(json.dumps(res, indent=1, default=float))
