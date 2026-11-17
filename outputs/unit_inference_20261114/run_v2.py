"""Unit and pack-size inference from prices, RETRY v2, 14 Nov 2026 (plan: outputs/paper_draft_20261112/unit_inference_plan.md).
Offline, read-only. Candidate output only; catalog-owner confirmation still required.

REGISTERED BEFORE RUNNING (hash in results.json). Scope: top 100 families by net (candidate mapping v1.1), original itemized
Gold reproduction, lines with positive gross sales and positive recorded quantity.
P1 unit price = gross / quantity per line, with year and channel.
P2 per family-year: sort prices, split where consecutive prices jump > 35%; a level needs >= 5% of that family-year's
   lines (min 2); base = lowest such level.
P3 line factor = price / base price, snapped to {1,2,3,4,5,6,10,12,20,24,25,30,50,100,120,200} within +/-12%, else
   unresolved. Label factor = most common snapped factor of its lines (>= 60% of them), else unresolved.
   Label-text hint: pack count parsed from patterns like 10'S, X100, BOX OF 50, 100S (1'S means 1).
P5 pieces = quantity x label factor. Grade B: >= 80% of the family's lines on labels with a resolved factor and no
   label-text contradiction. Grade C otherwise. Grade A needs an external price reference (phase 4, not run).
P6 validation (on grade-B families that had more than one price level):
   V1 median within family-year coefficient of variation of price per piece is at least 50% lower than of price per
      recorded unit.
   V2 median coefficient of variation of the monthly piece series is lower than of the raw monthly quantity series.
   V3 where label text states a pack count and the price factor is resolved, they agree for >= 90% of labels.
P7 lead-1 mean_6 on monthly pieces vs raw quantity vs pesos, grade-B families, targets 2022-01..2026-09, pooled WAPE.
   Pass: piece WAPE at least 10% lower than raw-quantity WAPE.
RETRY v2 (the one allowed re-attempt). Stated reason: v1 defined the base price within each family-YEAR, so a pack level
sold alone in a year became that year's base and every factor collapsed to 1 (a defect in the method, not tuning). Only
change: P2 levels and the base are computed per FAMILY across all years. All other rules, thresholds and checks unchanged.
Run from repo root:  python -X utf8 outputs/unit_inference_20261114/run_v2.py
"""
from pathlib import Path
from collections import defaultdict, Counter
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json, re, statistics as st
import numpy as np

REGISTRATION = __doc__.split('Run from')[0]
ROOT = Path.cwd(); OUT = ROOT / 'outputs/unit_inference_20261114'
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

net = defaultdict(float)
for r in el: net[family[r['normalized_product']]] += float(r['net_sales'])
TOP = set(f for f, _ in sorted(net.items(), key=lambda kv: -kv[1])[:100])
PACKS = [1, 2, 3, 4, 5, 6, 10, 12, 20, 24, 25, 30, 50, 100, 120, 200]

lines = []
for r in el:
    f = family[r['normalized_product']]
    if f not in TOP: continue
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10])
    q, g = r['recorded_quantity'], r['gross_sales']
    lines.append(dict(f=f, lab=r['normalized_product'], y=d.year, ym=f'{d.year}-{d.month:02d}', area=(r['area'] or '').upper(),
                      q=float(q) if q is not None else None, g=float(g) if g is not None else None, net=float(r['net_sales'])))
priced = [x for x in lines if x['q'] and x['g'] and x['q'] > 0 and x['g'] > 0]
for x in priced: x['p'] = x['g'] / x['q']

# P2 levels per family-year
base = {}; nlevels = defaultdict(int)
grp = defaultdict(list)
for x in priced: grp[x['f']].append(x['p'])
for k, ps in grp.items():
    ps = sorted(ps); cl = [[ps[0]]]
    for v in ps[1:]: (cl[-1].append(v) if v <= cl[-1][-1] * 1.35 else cl.append([v]))
    keep = [c for c in cl if len(c) >= max(2, 0.05 * len(ps))]
    if keep: base[k] = float(np.median(keep[0])); nlevels[k] = len(keep)

# P3 factors
def snap(r):
    best = min(PACKS, key=lambda p: abs(r - p) / p); return best if abs(r - best) / best <= .12 else None
lab_f = defaultdict(list)
for x in priced:
    b = base.get(x['f']); x['fac'] = snap(x['p'] / b) if b else None; lab_f[x['lab']].append(x['fac'])
def label_factor(fs):
    c = Counter(v for v in fs if v);
    if not c: return None
    v, n = c.most_common(1)[0]; return v if n >= .6 * len(fs) else None
TEXT = re.compile(r"(?:\b(\d{1,3})\s*'?\s*S\b|\bX\s*(\d{1,3})\b|BOX(?:ES)?\s+OF\s+(\d{1,3}))")
def text_count(label):
    mt = TEXT.search(label.upper()); return int(next(g for g in mt.groups() if g)) if mt else None
labels = {x['lab']: x['f'] for x in lines}
lab_info = {}
for lab, f in labels.items():
    lab_info[lab] = dict(family=f, factor=label_factor(lab_f.get(lab, [])), text_count=text_count(lab), priced_lines=len(lab_f.get(lab, [])))

# P5 grades
fam_rows = defaultdict(list)
for x in lines: fam_rows[x['f']].append(x)
grade, contradictions = {}, defaultdict(int)
for f, xs in fam_rows.items():
    labs = {x['lab'] for x in xs}
    for lab in labs:
        li = lab_info[lab]
        # text hint only contradicts when both exist and the label's price factor is a pack (>1) that differs
        if li['factor'] and li['text_count'] and li['factor'] > 1 and li['text_count'] > 1 and li['factor'] != li['text_count']: contradictions[f] += 1
    covered = sum(1 for x in xs if lab_info[x['lab']]['factor']) / len(xs)
    grade[f] = 'B' if covered >= .8 and contradictions[f] == 0 else 'C'

# P6 validation
def cv(a): a = np.asarray(a, float); return float(a.std() / a.mean()) if len(a) > 1 and a.mean() > 0 else None
multi_B = [f for f in TOP if grade.get(f) == 'B' and nlevels[f] > 1]
v1_before, v1_after = [], []
for f in multi_B:
    for yv in {x['y'] for x in fam_rows[f]}:
        xs = [x for x in priced if x['f'] == f and x['y'] == yv and lab_info[x['lab']]['factor']]
        if len(xs) < 5: continue
        v1_before.append(cv([x['p'] for x in xs])); v1_after.append(cv([x['p'] / lab_info[x['lab']]['factor'] for x in xs]))
months = sorted({x['ym'] for x in lines if '2020-01' <= x['ym'] <= '2026-09'}); mi = {p: i for i, p in enumerate(months)}
def series(f, kind):
    s = np.zeros(len(months))
    for x in fam_rows[f]:
        if x['ym'] not in mi: continue
        if kind == 'peso': s[mi[x['ym']]] += x['net']
        elif x['q'] is not None:
            fac = lab_info[x['lab']]['factor'] or 1
            s[mi[x['ym']]] += x['q'] * (fac if kind == 'pieces' else 1)
    return s
v2_raw = [cv(series(f, 'raw')) for f in multi_B]; v2_pc = [cv(series(f, 'pieces')) for f in multi_B]
agree = [(li['factor'] == li['text_count']) for li in lab_info.values() if li['factor'] and li['text_count']]
med = lambda a: float(np.median([v for v in a if v is not None])) if any(v is not None for v in a) else None
V1 = dict(families=len(multi_B), cases=len(v1_before), median_cv_before=med(v1_before), median_cv_after=med(v1_after))
V1['passes'] = bool(V1['median_cv_before'] and V1['median_cv_after'] <= .5 * V1['median_cv_before'])
V2 = dict(median_cv_raw=med(v2_raw), median_cv_pieces=med(v2_pc)); V2['passes'] = bool(V2['median_cv_pieces'] < V2['median_cv_raw'])
V3 = dict(labels_compared=len(agree), agreement=(sum(agree) / len(agree)) if agree else None); V3['passes'] = bool(agree and V3['agreement'] >= .9)

# P7 forecasts
targets = [i for i, p in enumerate(months) if p >= '2022-01']
def wape(kind):
    err = act = 0.0
    for f in [f for f in TOP if grade.get(f) == 'B']:
        s = series(f, kind)
        for t in targets: fc = s[t-6:t].mean(); err += abs(fc - s[t]); act += abs(s[t])
    return err / act
P7 = dict(wape_raw_quantity=wape('raw'), wape_pieces=wape('pieces'), wape_pesos=wape('peso'))
P7['passes'] = bool(P7['wape_pieces'] <= .9 * P7['wape_raw_quantity'])

gB = [f for f in TOP if grade.get(f) == 'B']
res = dict(registration_sha256=hashlib.sha256(REGISTRATION.encode()).hexdigest(), families=len(TOP),
           grade_B=len(gB), grade_C=len(TOP) - len(gB), grade_B_net_share=sum(net[f] for f in gB) / sum(net.values()),
           grade_B_multi_level=len(multi_B), V1_price_consistency=V1, V2_smoother_demand=V2, V3_label_agreement=V3, P7_forecast=P7)
with (OUT / 'unit_mapping_candidate_v2.csv').open('w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['recorded_label', 'family', 'pack_factor', 'label_text_count', 'priced_lines', 'family_grade', 'family_price_levels', 'status'])
    for lab, li in sorted(lab_info.items(), key=lambda kv: (-net[kv[1]['family']], kv[0])):
        w.writerow([lab, li['family'], li['factor'] or '', li['text_count'] or '', li['priced_lines'], grade[li['family']], nlevels[li['family']], 'CANDIDATE_NOT_APPLIED'])
examples = {f: sorted({(lab_info[l]['factor'], round(st.median([x['p'] for x in priced if x['lab'] == l]), 2)) for l in {x['lab'] for x in fam_rows[f]} if lab_info[l]['factor'] and any(x['lab'] == l for x in priced)})
            for f in ['ENHAMOX', 'LACTAMOX', 'MAXIFER', 'BUPIRIGHT', 'SPEEDA'] if f in fam_rows}
res['examples_factor_and_median_price'] = examples
(OUT / 'results_v2.json').write_text(json.dumps(res, indent=1, ensure_ascii=False)); print(json.dumps(res, indent=1, ensure_ascii=False))
