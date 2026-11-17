"""New prediction targets P1 (large orders by buyer segment), P3 (new-product survival), P4 (late reorder). 17 Nov 2026.
Offline, read-only, retrospective. Rules fixed in this docstring BEFORE the first run (hash recorded in results).

Inputs: original itemized sales, eligible net, canonical loader, PHP 638,015,351.53 control; family mapping v1.1.
Large order = DR document with month net >= PHP 500,000. Months 2017-01..2026-09.
Internal labels (excluded from P1 OTHER and from P4): ADMIN, EQUIPMENT, SUPPLIES, SUPPLIES AND EQUIPMENT, PHARMA,
LOSSES, PERSONAL. A document's segment = its area label's segment (mixed documents use the area with most net).

P1. Chance and size of a large order next month, per buyer segment: GOVERNMENT, HOSPITAL, OTHER (all other
  non-internal areas). Origins 2021-01..2026-09, using only months from 2020-01 to the month before.
  Candidates: EXP = share of months since 2020-01 with >= 1 large order in the segment;
     CAL = budget-cycle model: (same-calendar-month hits in earlier years + 2 x EXP) / (earlier years + 2).
  Select per segment the lower Brier on 2021-01..2023-12; report it on 2024-01..2026-09.
  USABLE per segment if test Brier < 0.25 AND |mean predicted - observed| <= 0.10.
  BUDGET CYCLE SUPPORTED per segment only if CAL is selected AND its test Brier < EXP's test Brier.
  Size: next month's segment large-order total in [p10, p90] of the previous 24 months (zeros included);
  USABLE if coverage is 70-90% in both 2021-01..2023-12 and 2024-01..2026-09.

P3. Will a new product family still sell in year 2?  New family = first sale 2020-01..2024-09, no sale earlier
  (2017-01 onward). Features known at month 6: active months among months 1-6 (A), log1p(net of months 1-6) (S).
  Outcome: any positive net in months 13-24. Logistic regression (sklearn, C=1.0, lbfgs) on A and S.
  Train cohorts first sold 2020-01..2022-12; test cohorts 2023-01..2024-09.
  USABLE if on test: AUC >= 0.70 AND Brier < Brier of the train survival rate used as a constant AND
  |mean predicted - observed| <= 0.10. Probability bands reported for the dashboard: <20%, 20-50%, >=50%.

P4. Which areas are late to reorder?  Order day = a date with >= 1 delivery for the area. Evaluation dates: last day
  of each month 2022-01..2026-08. An area is eligible at a date if it has >= 10 earlier gaps between order days.
  LATE if days since its last order day > P80 of its earlier gaps. Outcome: no order day in the next 30 days.
  USABLE if lapse rate among LATE >= 0.50 AND >= 2 x lapse rate among not-LATE AND one-sided Fisher p < 0.05.

Each target is judged on its own rule. Retrospective, candidate evidence; authorizes no purchase or activation.
Run from repo root:  python -X utf8 outputs/new_prediction_targets_20261117/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date, timedelta
import csv, hashlib, importlib.util, io, json, math
from scipy.stats import fisher_exact
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

ROOT = Path.cwd(); OUT = ROOT / 'outputs/new_prediction_targets_20261117'
RULES = hashlib.sha256(__doc__.encode('utf-8')).hexdigest()
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
INTERNAL = {'ADMIN', 'EQUIPMENT', 'SUPPLIES', 'SUPPLIES AND EQUIPMENT', 'PHARMA', 'LOSSES', 'PERSONAL'}
def as_date(v): return v if isinstance(v, date) else date.fromisoformat(str(v)[:10])
def ym_of(d): return f'{d.year}-{d.month:02d}'
def add(ym, k): i = int(ym[:4]) * 12 + int(ym[5:]) - 1 + k; return f'{i // 12}-{i % 12 + 1:02d}'
def span(a, b):
    out = []
    while a <= b: out.append(a); a = add(a, 1)
    return out
rows = [(as_date(r['date_delivered']), (r['area'] or '').strip().upper(), r['dr_number'], float(r['net_sales']), family[r['normalized_product']]) for r in el]

# ---------------- P1 ----------------
doc_net = defaultdict(float); doc_area = defaultdict(lambda: defaultdict(float))
for d, area, dr, net, f in rows:
    if dr: doc_net[(ym_of(d), dr)] += net; doc_area[(ym_of(d), dr)][area] += net
def segment(area): return 'GOVERNMENT' if area == 'GOVERNMENT' else 'HOSPITAL' if area in ('HOSPITAL', 'HOPITAL', 'RAKKK') else None if area in INTERNAL else 'OTHER'
large = {s: defaultdict(float) for s in ('GOVERNMENT', 'HOSPITAL', 'OTHER')}
for key, net in doc_net.items():
    if net < 500_000: continue
    s = segment(max(doc_area[key].items(), key=lambda kv: kv[1])[0])
    if s: large[s][key[0]] += net
def q(vals, p): s = sorted(vals); pos = p * (len(s) - 1); lo = int(pos); hi = min(lo + 1, len(s) - 1); return s[lo] + (s[hi] - s[lo]) * (pos - lo)
DEV, TEST = span('2021-01', '2023-12'), span('2024-01', '2026-09')
p1 = {}
for s, series in large.items():
    preds = {}
    for t in DEV + TEST:
        hist = span('2020-01', add(t, -1)); hits = [1 if series.get(h, 0) > 0 else 0 for h in hist]
        exp = sum(hits) / len(hits)
        same = [1 if series.get(h, 0) > 0 else 0 for h in hist if h[5:] == t[5:]]
        cal = (sum(same) + 2 * exp) / (len(same) + 2)
        y = 1 if series.get(t, 0) > 0 else 0
        last24 = [series.get(h, 0.0) for h in span(add(t, -24), add(t, -1))]
        preds[t] = dict(y=y, EXP=exp, CAL=cal, lo=q(last24, .1), hi=q(last24, .9), actual=series.get(t, 0.0))
    brier = lambda ms, k: sum((preds[t][k] - preds[t]['y']) ** 2 for t in ms) / len(ms)
    chosen = 'CAL' if brier(DEV, 'CAL') < brier(DEV, 'EXP') else 'EXP'
    tb = brier(TEST, chosen); mp = sum(preds[t][chosen] for t in TEST) / len(TEST); ob = sum(preds[t]['y'] for t in TEST) / len(TEST)
    cov = lambda ms: 100 * sum(preds[t]['lo'] <= preds[t]['actual'] <= preds[t]['hi'] for t in ms) / len(ms)
    p1[s] = dict(chosen=chosen, dev_brier=dict(EXP=round(brier(DEV, 'EXP'), 4), CAL=round(brier(DEV, 'CAL'), 4)),
                 test_brier=round(tb, 4), test_brier_exp=round(brier(TEST, 'EXP'), 4), test_brier_cal=round(brier(TEST, 'CAL'), 4),
                 mean_pred=round(mp, 3), observed=round(ob, 3), usable=tb < 0.25 and abs(mp - ob) <= 0.10,
                 budget_cycle_supported=chosen == 'CAL' and brier(TEST, 'CAL') < brier(TEST, 'EXP'),
                 size_coverage=dict(dev=round(cov(DEV), 1), test=round(cov(TEST), 1)), size_usable=70 <= cov(DEV) <= 90 and 70 <= cov(TEST) <= 90,
                 large_months_share_2020_2026=round(sum(1 for t in span('2020-01', '2026-09') if series.get(t, 0) > 0) / 81, 3),
                 large_net_2020_2026=round(sum(series.get(t, 0) for t in span('2020-01', '2026-09'))))

# ---------------- P3 ----------------
fam_month = defaultdict(lambda: defaultdict(float))
for d, area, dr, net, f in rows: fam_month[f][ym_of(d)] += net
first = {f: min(p for p, v in s.items() if v > 0) for f, s in fam_month.items() if any(v > 0 for v in s.values())}
data = []
for f, p0 in first.items():
    if not ('2020-01' <= p0 <= '2024-09'): continue
    s = fam_month[f]; m6 = [s.get(add(p0, k), 0.0) for k in range(6)]
    data.append(dict(family=f, first=p0, A=sum(1 for v in m6 if v > 0), S=math.log1p(max(sum(m6), 0.0)),
                     y=1 if any(s.get(add(p0, k), 0.0) > 0 for k in range(12, 24)) else 0))
train = [r for r in data if r['first'] <= '2022-12']; test = [r for r in data if r['first'] >= '2023-01']
X = lambda rs: [[r['A'], r['S']] for r in rs]; Y = lambda rs: [r['y'] for r in rs]
model = LogisticRegression(C=1.0, solver='lbfgs').fit(X(train), Y(train))
pt = model.predict_proba(X(test))[:, 1]; yt = Y(test); base = sum(Y(train)) / len(train)
brier_m = sum((p - y) ** 2 for p, y in zip(pt, yt)) / len(yt); brier_b = sum((base - y) ** 2 for y in yt) / len(yt)
auc = roc_auc_score(yt, pt); mp3 = float(sum(pt) / len(pt)); ob3 = sum(yt) / len(yt)
bands = {}
for name, lo, hi in (('<20%', 0, .2), ('20-50%', .2, .5), ('>=50%', .5, 1.01)):
    idx = [i for i, p in enumerate(pt) if lo <= p < hi]
    bands[name] = dict(families=len(idx), mean_pred=round(float(sum(pt[i] for i in idx) / len(idx)), 3) if idx else None,
                       observed=round(sum(yt[i] for i in idx) / len(idx), 3) if idx else None)
by_A = {a: dict(n=len([r for r in data if r['A'] == a]), survival=round(sum(r['y'] for r in data if r['A'] == a) / max(1, len([r for r in data if r['A'] == a])), 3)) for a in range(1, 7)}
p3 = dict(train=len(train), test=len(test), coef=dict(A=round(float(model.coef_[0][0]), 4), S=round(float(model.coef_[0][1]), 4), intercept=round(float(model.intercept_[0]), 4)),
          auc=round(auc, 3), brier=round(brier_m, 4), brier_constant=round(brier_b, 4), mean_pred=round(mp3, 3), observed=round(ob3, 3),
          usable=auc >= 0.70 and brier_m < brier_b and abs(mp3 - ob3) <= 0.10, bands=bands, survival_by_active_months=by_A)

# ---------------- P4 ----------------
days = defaultdict(set)
for d, area, dr, net, f in rows:
    if area and area not in INTERNAL: days[area].add(d)
tab = [[0, 0], [0, 0]]; flagged_examples = []
evals = [date(int(p[:4]), int(p[5:]), 1) for p in span('2022-02', '2026-09')]
evals = [d - timedelta(days=1) for d in evals]
for area, ds in days.items():
    ds = sorted(ds)
    for e in evals:
        past = [d for d in ds if d <= e]
        if len(past) < 11: continue
        gaps = [(past[i] - past[i - 1]).days for i in range(1, len(past))]
        late = (e - past[-1]).days > q(gaps, .8)
        lapse = not any(e < d <= e + timedelta(days=30) for d in ds)
        tab[0 if late else 1][0 if lapse else 1] += 1
        if late and e >= date(2026, 8, 31): flagged_examples.append(dict(area=area, days_since=(e - past[-1]).days, p80=round(q(gaps, .8), 1)))
rl = tab[0][0] / sum(tab[0]) if sum(tab[0]) else None; rn = tab[1][0] / sum(tab[1]) if sum(tab[1]) else None
pf = fisher_exact(tab, alternative='greater').pvalue
p4 = dict(table_late_lapse_nolapse_notlate_lapse_nolapse=tab, lapse_rate_late=None if rl is None else round(rl, 3), lapse_rate_not_late=None if rn is None else round(rn, 3),
          p_one_sided=round(float(pf), 6), usable=rl is not None and rn is not None and rl >= 0.5 and rl >= 2 * rn and pf < 0.05, late_at_2026_08_31=flagged_examples)

res = dict(rules_sha256=RULES, P1=p1, P3=p3, P4=p4)
(OUT / 'results.json').write_text(json.dumps(res, indent=1, ensure_ascii=False, default=lambda o: o.item()), encoding='utf-8')
print('rules', RULES[:12])
for s, v in p1.items(): print('P1', s, json.dumps(v, default=lambda o: o.item()))
print('P3', json.dumps(p3, default=lambda o: o.item()))
print('P4', json.dumps(p4, default=lambda o: o.item()))
