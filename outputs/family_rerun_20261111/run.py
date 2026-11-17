"""Family-level rerun of ABC-XYZ, TSB and safety stock, 11 Nov 2026. Offline, read-only, retrospective.

REGISTERED BEFORE RUNNING (hash stored in results.json). Grouping: candidate family mapping v1
(outputs/product_family_draft_20261111/family_mapping_v1_candidate.csv). Window 2020-01..2026-09, eligible signed net PHP,
original itemized, contracts excluded. Each test is run at label grain and at family grain with identical rules, so the
only change is the grouping.
F3 ABC-XYZ: as M3 (80/95% ABC on positive yearly net; XYZ by CV of 12 monthly values: X<=0.5<Y<=1.0<Z), years 2021..2025.
   Pass: mean share of year-Y A-X value kept in year Y+1 >= 50% AND higher than at label grain.
F4 TSB (alpha .3, beta .1) vs mean_6, lead 1, on intermittent items (ADI > 1.32 over 2020-01..2023-12, >= 6 positive
   months). Pass: the standard win rule on per-month pooled absolute error (90% block bootstrap, block 6, 2000 draws,
   seed 20261111, interval wholly below 0; |normalized bias| <= 5%; both halves negative).
F2 Safety stock per item for A-class items of the prior calendar year: level = mean_6 + 95th percentile of the item's
   most recent 24 lead-1 errors (min 12) known at the origin. Pass: pooled achieved service (share of item-months with
   actual <= level) within 90-98%. PHP stands in for units; a method check, not a stock policy.
Run from repo root:  python -X utf8 outputs/family_rerun_20261111/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json, random, statistics as st
import numpy as np

REGISTRATION = __doc__.split('Run from')[0]
ROOT = Path.cwd(); OUT = ROOT / 'outputs/family_rerun_20261111'
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

rows = []
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10]); ym = f'{d.year}-{d.month:02d}'
    if '2020-01' <= ym <= '2026-09': rows.append((ym, r['normalized_product'], float(r['net_sales'])))
months = sorted({p for p, _, _ in rows}); ix = {p: i for i, p in enumerate(months)}; N = len(months); assert N == 81
assert all(k in family for _, k, _ in rows), 'label missing from mapping'

def series(key):
    s = defaultdict(lambda: np.zeros(N))
    for p, k, v in rows: s[key(k)][ix[p]] += v
    return s
grains = {'label': series(lambda k: k), 'family': series(lambda k: family[k])}
mean6 = lambda y, o: float(np.mean(y[o-5:o+1]))
res = {'registration_sha256': hashlib.sha256(REGISTRATION.encode()).hexdigest(),
       'mapping_sha256': hashlib.sha256(mapping_path.read_bytes()).hexdigest(), 'items': {g: len(s) for g, s in grains.items()}}

def classes(s, year):
    cols = [ix[p] for p in months if p.startswith(str(year))]
    val = {k: float(v[cols].sum()) for k, v in s.items() if v[cols].sum() > 0}
    tot, run, out = sum(val.values()), 0.0, {}
    for k, v in sorted(val.items(), key=lambda kv: (-kv[1], kv[0])):
        abc = 'A' if run < .8 * tot else 'B' if run < .95 * tot else 'C'; run += v
        y = s[k][cols]; cv = float(np.std(y) / np.mean(y))
        out[k] = (abc + ('X' if cv <= .5 else 'Y' if cv <= 1 else 'Z'), v)
    return out

f3 = {}
for g, s in grains.items():
    by = {}
    for Y in range(2021, 2026):
        now, nxt = classes(s, Y), classes(s, Y + 1); agg = defaultdict(lambda: [0, 0.0, 0.0])
        for k, (c, v) in now.items():
            a = agg[c]; a[0] += 1; a[1] += v; a[2] += nxt.get(k, ('', 0.0))[1]
        by[str(Y)] = {c: dict(items=a[0], value_kept=a[2] / a[1]) for c, a in sorted(agg.items()) if c[0] == 'A'}
    ax = [by[y]['AX']['value_kept'] for y in by if 'AX' in by[y]]
    f3[g] = dict(by_year=by, ax_years=len(ax), ax_value_kept_mean=float(np.mean(ax)) if ax else None,
                 a_items_mean=float(np.mean([sum(v['items'] for v in by[y].values()) for y in by])),
                 ax_items_mean=float(np.mean([by[y].get('AX', {'items': 0})['items'] for y in by])))
f3['passes'] = bool(f3['family']['ax_value_kept_mean'] and f3['family']['ax_value_kept_mean'] >= .5
                    and f3['family']['ax_value_kept_mean'] > (f3['label']['ax_value_kept_mean'] or 0))
res['F3_abc_xyz'] = f3

train = [ix[p] for p in months if p <= '2023-12']
def tsb(y, o, a=.3, b=.1):
    p = z = None
    for t in range(o + 1):
        occ = 1.0 if y[t] > 0 else 0.0
        if p is None:
            if occ: p, z = 1.0, y[t]
            continue
        p += b * (occ - p)
        if occ: z += a * (y[t] - z)
    return 0.0 if p is None else p * z
def winrule(diff, bias):
    rng, means, n = random.Random(20261111), [], len(diff)
    for _ in range(2000):
        s = []
        while len(s) < n:
            i = rng.randrange(n); s.extend(diff[i:i+6])
        means.append(st.mean(s[:n]))
    means.sort(); h = n // 2
    return dict(boot90=[means[100], means[1899]], halves=[sum(diff[:h]), sum(diff[h:])],
                passes=bool(means[1899] < 0 and abs(bias) <= .05 and sum(diff[:h]) < 0 and sum(diff[h:]) < 0))
f4 = {}
for g, s in grains.items():
    inter = [k for k, y in s.items() if (lambda pos: pos and len(train) / len(pos) > 1.32 and len(pos) >= 6)([i for i in train if y[i] > 0])]
    errT, errR, sT, sA, sR = [], [], 0.0, 0.0, 0.0
    for o in range(23, N - 1):
        eT = eR = 0.0
        for k in inter:
            y = s[k]; ft, fr, a = tsb(y, o), mean6(y, o), y[o+1]
            eT += abs(ft - a); eR += abs(fr - a); sT += ft - a; sR += fr - a; sA += abs(a)
        errT.append(eT); errR.append(eR)
    f4[g] = dict(items=len(inter), tsb_wape=sum(errT) / sA, tsb_bias=sT / sA, mean6_wape=sum(errR) / sA, mean6_bias=sR / sA,
                 **winrule([a - b for a, b in zip(errT, errR)], sT / sA))
res['F4_tsb'] = f4

f2 = {}
for g, s in grains.items():
    ok, buf, items = [], [], set()
    for o in range(23, N - 1):
        year = int(months[o][:4]) - 1
        if not any(p.startswith(str(year)) for p in months): continue
        for k, (c, _) in classes(s, year).items():
            if c[0] != 'A': continue
            y = s[k]; errs = [y[q+1] - mean6(y, q) for q in range(5, o)][-24:]  # errors whose actual is known at o
            if len(errs) < 12: continue
            f = mean6(y, o); q95 = float(np.quantile(errs, .95)); items.add(k)
            ok.append(y[o+1] <= f + q95); buf.append(q95 / f if f > 0 else np.nan)
    f2[g] = dict(item_months=len(ok), items=len(items), achieved_service=float(np.mean(ok)),
                 median_buffer_pct_of_forecast=float(np.nanmedian(buf)) * 100, passes=bool(.90 <= np.mean(ok) <= .98))
res['F2_safety_stock'] = f2
(OUT / 'results.json').write_text(json.dumps(res, indent=1)); print(json.dumps(res, indent=1))
