"""Accuracy round 2, 11 Nov 2026: day-level, unit and routine-method experiments. Offline, read-only, RETROSPECTIVE
(every month was inspected by earlier studies; results are candidates, never future accuracy or procurement approval).

REGISTERED BEFORE RUNNING (hash stored in results.json). Data: original itemized Gold reproduction (contracts excluded,
eligible signed net PHP, PHP 638,015,351.53), window 2020-01..2026-09 (81 months). Base = documents < PHP 500k + no-DR rows.
Development origins: targets 2022-01..2023-12. Evaluation targets: 2024-01..2026-09 (33 months). Choices are made on
development only and frozen before evaluation.

E1 Mid-month estimate of the CURRENT month (lead 0) at delivery day D in {10, 15, 20}, for total and base. Pace estimate =
   month-to-date / median share delivered by day D over the prior 24 months (only months before the target). Blend =
   w * pace + (1 - w) * mean_6 of prior months, w in {0, .25, .5, .75, 1} picked per D and series on development WAPE.
   Reference: mean_6 forecast for the same month (the estimate available before the month starts). Pass per D and series:
   win rule on evaluation targets. Caveat: delivery date stands in for the date data becomes known.
E2 Units vs PHP for steady families: families classed AX or AY on calendar 2024 (candidate mapping v1.1). Lead-1 mean_6 on
   monthly recorded quantity and on PHP, pooled over those families, evaluation targets. Descriptive comparison; quantity
   unit/pack meaning is unverified. Pass: unit WAPE at least 10% lower than PHP WAPE for the same families.
E3 Routine (base) methods, leads 1/3/6: mean_3, median_6, simple exponential smoothing (alpha picked per origin by past
   one-step SSE over {.1,.2,...,.9}) and an equal combination of mean_3, median_6 and SES. Reference: base mean_6.
   The method with the best development WAPE at each lead is the only one assessed on evaluation. Pass: win rule.
Win rule (unchanged): 90% moving-block bootstrap (block 6, 2000 draws, seed 20261111) of mean paired absolute-error
difference (candidate - reference) wholly below 0; |normalized bias| <= 5%; difference negative in both halves.
Run from repo root:  python -X utf8 outputs/accuracy_round2_20261111/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import calendar, csv, hashlib, importlib.util, io, json, random, statistics as st
import numpy as np

REGISTRATION = __doc__.split('Run from')[0]
ROOT = Path.cwd(); OUT = ROOT / 'outputs/accuracy_round2_20261111'
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
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10]); ym = f'{d.year}-{d.month:02d}'
    if '2020-01' <= ym <= '2026-09':
        q = r['recorded_quantity']; rows.append(dict(ym=ym, day=d.day, dr=r['dr_number'], fam=family[r['normalized_product']],
                                                     net=float(r['net_sales']), qty=float(q) if q is not None else None))
months = sorted({x['ym'] for x in rows}); ix = {p: i for i, p in enumerate(months)}; N = len(months); assert N == 81
doc = defaultdict(float)
for x in rows:
    if x['dr']: doc[(x['ym'], x['dr'])] += x['net']
is_base = lambda x: not (x['dr'] and doc[(x['ym'], x['dr'])] >= 500_000)
total = np.zeros(N); base = np.zeros(N)
for x in rows:
    total[ix[x['ym']]] += x['net']
    if is_base(x): base[ix[x['ym']]] += x['net']
DEV = [i for i, p in enumerate(months) if '2022-01' <= p <= '2023-12']
EVAL = [i for i, p in enumerate(months) if p >= '2024-01']
mean6 = lambda y, o: float(np.mean(y[o-5:o+1]))
def score(f, a):
    f, a = np.asarray(f, float), np.asarray(a, float); act = np.abs(a).sum()
    return dict(cases=len(a), wape=float(np.abs(f-a).sum()/act), bias=float((f-a).sum()/act))
def win(fc, fr, a):
    fc, fr, a = map(lambda v: np.asarray(v, float), (fc, fr, a)); diff = list(np.abs(fc-a) - np.abs(fr-a)); n = len(diff)
    rng, means = random.Random(20261111), []
    for _ in range(2000):
        s = []
        while len(s) < n:
            i = rng.randrange(n); s.extend(diff[i:i+6])
        means.append(st.mean(s[:n]))
    means.sort(); h = n // 2; bias = float((fc-a).sum()/np.abs(a).sum())
    return dict(boot90=[means[100], means[1899]], bias=bias, halves=[float(sum(diff[:h])), float(sum(diff[h:]))],
                passes=bool(means[1899] < 0 and abs(bias) <= .05 and sum(diff[:h]) < 0 and sum(diff[h:]) < 0))
res = {'registration_sha256': hashlib.sha256(REGISTRATION.encode()).hexdigest(), 'eval_targets': [months[EVAL[0]], months[EVAL[-1]]]}

# E1 mid-month estimate
e1 = {}
for name, pick in (('total', lambda x: True), ('base', is_base)):
    y = total if name == 'total' else base
    for D in (10, 15, 20):
        mtd = np.zeros(N)
        for x in rows:
            if x['day'] <= D and pick(x): mtd[ix[x['ym']]] += x['net']
        def estimate(t, w):
            shares = [mtd[k] / y[k] for k in range(max(0, t - 24), t) if y[k] > 0]
            pace = mtd[t] / st.median(shares); return w * pace + (1 - w) * mean6(y, t - 1)
        grid = {w: score([estimate(t, w) for t in DEV], y[DEV])['wape'] for w in (0, .25, .5, .75, 1)}
        w = min(grid, key=grid.get)
        fc = [estimate(t, w) for t in EVAL]; fr = [mean6(y, t - 1) for t in EVAL]
        e1[f'{name}_day{D}'] = dict(weight=w, dev_wape_by_weight=grid, eval=score(fc, y[EVAL]), reference_mean6=score(fr, y[EVAL]), **win(fc, fr, y[EVAL]))
res['E1_mid_month'] = e1

# E2 units vs PHP for steady families (classes on 2024)
php, qty = defaultdict(lambda: np.zeros(N)), defaultdict(lambda: np.zeros(N)); qty_ok = defaultdict(lambda: True)
for x in rows:
    php[x['fam']][ix[x['ym']]] += x['net']
    if x['qty'] is None: qty_ok[x['fam']] = False
    else: qty[x['fam']][ix[x['ym']]] += x['qty']
cols24 = [ix[p] for p in months if p.startswith('2024')]
val = {f: v[cols24].sum() for f, v in php.items() if v[cols24].sum() > 0}; tot24, run, steady = sum(val.values()), 0.0, []
for f, v in sorted(val.items(), key=lambda kv: (-kv[1], kv[0])):
    a = run < .8 * tot24; run += v
    s = php[f][cols24]; cv = s.std() / s.mean()
    if a and cv <= 1 and qty_ok[f]: steady.append(f)
pf, pa, qf, qa = [], [], [], []
for f in steady:
    for t in EVAL:
        pf.append(mean6(php[f], t - 1)); pa.append(php[f][t]); qf.append(mean6(qty[f], t - 1)); qa.append(qty[f][t])
sp, sq = score(pf, pa), score(qf, qa)
res['E2_units'] = dict(families=steady, php=sp, units=sq, unit_vs_php_relative=sq['wape'] / sp['wape'] - 1, passes=bool(sq['wape'] <= .9 * sp['wape']))

# E3 routine methods
def ses(y, o):
    best = None
    for a in [k / 10 for k in range(1, 10)]:
        lvl, sse = y[0], 0.0
        for t in range(1, o + 1): sse += (y[t] - lvl) ** 2; lvl = a * y[t] + (1 - a) * lvl
        if best is None or sse < best[0]: best = (sse, lvl)
    return best[1]
METHODS = {'mean_3': lambda y, o: float(np.mean(y[o-2:o+1])), 'median_6': lambda y, o: float(np.median(y[o-5:o+1])), 'ses': ses}
METHODS['combo'] = lambda y, o: (METHODS['mean_3'](y, o) + METHODS['median_6'](y, o) + ses(y, o)) / 3
e3 = {}
for lead in (1, 3, 6):
    dev = {k: score([f(base, t - lead) for t in DEV], base[DEV])['wape'] for k, f in METHODS.items()}
    chosen = min(dev, key=dev.get)
    fc = [METHODS[chosen](base, t - lead) for t in EVAL]; fr = [mean6(base, t - lead) for t in EVAL]
    e3[f'lead{lead}'] = dict(dev_wape=dev, dev_wape_mean6=score([mean6(base, t - lead) for t in DEV], base[DEV])['wape'],
                             chosen=chosen, eval=score(fc, base[EVAL]), reference_mean6=score(fr, base[EVAL]), **win(fc, fr, base[EVAL]))
res['E3_routine_methods'] = e3
(OUT / 'results.json').write_text(json.dumps(res, indent=1)); print(json.dumps(res, indent=1))
