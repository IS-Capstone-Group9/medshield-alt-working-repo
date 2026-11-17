"""Weather-driven prediction tests W1 (uncertainty) and W2 (delivery disruption). 17 Nov 2026.
Offline, read-only, retrospective. Rules fixed in this docstring BEFORE the first run (hash recorded in results).
Governed by decision 017: weather may enter prediction only through a pre-registered test that passes.

Inputs: original itemized sales, eligible net (same canonical loader and PHP 638,015,351.53 control as the 15 Nov
tests); PAGASA tropical cyclones entering PAR 2021-2024 (Summary sheet: start and end dates, type).
Routine document = DR document with month total < PHP 500k (rows without a DR are routine).

W1. Does a weather regime make forecast ranges reliable?  (target: company monthly TOTAL eligible net)
  Forecast: mean_6 (mean of the 6 previous months). Error ratio r = actual / forecast.
  Origins: every month from 2017-07; a forecast is valid only if the target and all 6 prior months have sales > 0.
  Regime (fixed a priori, PAGASA climate-type-I wet season, known in advance): WET = Jun-Oct, DRY = other months.
  BASELINE 80% range: forecast x [P10, P90] of ALL earlier valid error ratios (linear-interpolated quantiles).
  WEATHER 80% range: forecast x [P10, P90] of earlier valid error ratios of the SAME regime only.
  Both need >= 24 earlier ratios (>= 12 for the regime version's own regime), else the month is skipped for both.
  Evaluation months: 2021-01..2026-09 (valid only); halves 2021-01..2023-12 and 2024-01..2026-09.
  PASS (weather range adopted as a candidate) only if its coverage is within 75-85% overall AND in each half,
  AND its mean width (P90-P10 as share of forecast) is no more than 1.25x the baseline's.
  Coverage of the baseline and of WET/DRY months are reported, not tested.

W2. Do strong typhoons disrupt deliveries?  (target: daily count of distinct routine DR documents delivered)
  Event = each TY or STY in PAR 2021-2024; window = PAR start date .. PAR end date (inclusive), Mon-Sat only.
  Event rate = routine documents per window day. Baseline = the same calendar dates in the other three years of
  2021-2024, excluding any date on which a TY/STY was in PAR that year; baseline rate = documents per such day.
  Statistic per event: d = log((event rate + 0.5) / (baseline rate + 0.5)).
  Test: one-sided Wilcoxon signed-rank that median d < 0. Window days also reported for all cyclone types.
  PASS (typhoon disruption flag adopted as a candidate planning signal) only if p < 0.05 AND median d < 0.

Two tests, each judged on its own rule (no correction across W1/W2: different hypotheses and decisions).
Retrospective; candidate evidence; authorizes no forecast activation or purchase.
Run from repo root:  python -X utf8 outputs/weather_prediction_tests_20261117/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date, timedelta
import csv, hashlib, importlib.util, io, json, math
import openpyxl
from scipy.stats import wilcoxon

ROOT = Path.cwd(); OUT = ROOT / 'outputs/weather_prediction_tests_20261117'
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

def as_date(v): return v if isinstance(v, date) else date.fromisoformat(str(v)[:10])
monthly = defaultdict(float); docs_month = defaultdict(float); rows = []
for r in el:
    d = as_date(r['date_delivered']); ym = f'{d.year}-{d.month:02d}'; net = float(r['net_sales'])
    monthly[ym] += net; rows.append((d, ym, r['dr_number'], net))
    if r['dr_number']: docs_month[(ym, r['dr_number'])] += net

# ---------------- W1 ----------------
def q(vals, p):
    s = sorted(vals); pos = p * (len(s) - 1); lo = int(pos); hi = min(lo + 1, len(s) - 1); return s[lo] + (s[hi] - s[lo]) * (pos - lo)
def add(ym, k):
    i = int(ym[:4]) * 12 + int(ym[5:]) - 1 + k; return f'{i // 12}-{i % 12 + 1:02d}'
wet = lambda ym: 6 <= int(ym[5:]) <= 10
periods = []; p = '2017-07'
while p <= '2026-09': periods.append(p); p = add(p, 1)
hist = []  # (period, ratio, regime) of earlier valid forecasts
evals = []
for t in periods:
    prior = [monthly.get(add(t, -k), 0.0) for k in range(1, 7)]
    actual = monthly.get(t, 0.0)
    if actual <= 0 or min(prior) <= 0: continue
    fc = sum(prior) / 6; regime = wet(t)
    if t >= '2021-01':
        allr = [h[1] for h in hist]; same = [h[1] for h in hist if h[2] == regime]
        if len(allr) >= 24 and len(same) >= 12:
            b = (fc * q(allr, .1), fc * q(allr, .9)); w = (fc * q(same, .1), fc * q(same, .9))
            evals.append(dict(period=t, wet=regime, actual=actual, forecast=fc, base_lo=b[0], base_hi=b[1], wx_lo=w[0], wx_hi=w[1],
                              base_in=b[0] <= actual <= b[1], wx_in=w[0] <= actual <= w[1],
                              base_width=(b[1] - b[0]) / fc, wx_width=(w[1] - w[0]) / fc))
    hist.append((t, actual / fc, regime))
def cov(rows, key): return round(100 * sum(r[key] for r in rows) / len(rows), 1) if rows else None
h1 = [e for e in evals if e['period'] <= '2023-12']; h2 = [e for e in evals if e['period'] >= '2024-01']
mw = lambda rows, k: sum(r[k] for r in rows) / len(rows)
w1 = dict(months=len(evals), first=evals[0]['period'], last=evals[-1]['period'],
          weather=dict(coverage=cov(evals, 'wx_in'), half1=cov(h1, 'wx_in'), half2=cov(h2, 'wx_in'), wet=cov([e for e in evals if e['wet']], 'wx_in'),
                       dry=cov([e for e in evals if not e['wet']], 'wx_in'), mean_width=round(mw(evals, 'wx_width'), 3)),
          baseline=dict(coverage=cov(evals, 'base_in'), half1=cov(h1, 'base_in'), half2=cov(h2, 'base_in'), wet=cov([e for e in evals if e['wet']], 'base_in'),
                        dry=cov([e for e in evals if not e['wet']], 'base_in'), mean_width=round(mw(evals, 'base_width'), 3)))
ok = lambda v: v is not None and 75 <= v <= 85
w1['width_ratio'] = round(w1['weather']['mean_width'] / w1['baseline']['mean_width'], 3)
w1['pass'] = ok(w1['weather']['coverage']) and ok(w1['weather']['half1']) and ok(w1['weather']['half2']) and w1['width_ratio'] <= 1.25

# ---------------- W2 ----------------
daily = defaultdict(set)
for d, ym, dr, net in rows:
    if dr and docs_month[(ym, dr)] < 500_000: daily[d].add(dr)
tc = []
wb = openpyxl.load_workbook(ROOT / 'datasources/raw/pagasa/PAR_0km_2021_2024.xlsx', read_only=True)
for r in wb['Summary'].iter_rows(min_row=2, values_only=True):
    if r and isinstance(r[0], (int, float)) and hasattr(r[4], 'year') and hasattr(r[5], 'year'):
        tc.append(dict(name=r[2], type=str(r[3]).strip(), start=as_date(r[4].date() if hasattr(r[4], 'date') else r[4]), end=as_date(r[5].date() if hasattr(r[5], 'date') else r[5])))
strong = [t for t in tc if t['type'] in ('TY', 'STY')]
in_strong = set()
for t in strong:
    d = t['start']
    while d <= t['end']: in_strong.add(d); d += timedelta(days=1)
def window(t):
    d = t['start']; out = []
    while d <= t['end']:
        if d.weekday() < 6: out.append(d)
        d += timedelta(days=1)
    return out
def shift(d, y):
    try: return d.replace(year=y)
    except ValueError: return None
events = []
for t in strong:
    days = window(t)
    if not days: continue
    rate = sum(len(daily.get(d, ())) for d in days) / len(days)
    base_days = [b for y in range(2021, 2025) if y != t['start'].year for d in days for b in [shift(d, y)] if b and b not in in_strong]
    if not base_days: continue
    brate = sum(len(daily.get(b, ())) for b in base_days) / len(base_days)
    events.append(dict(name=t['name'], type=t['type'], start=t['start'].isoformat(), end=t['end'].isoformat(), days=len(days),
                       docs_per_day=round(rate, 3), baseline_docs_per_day=round(brate, 3), d=round(math.log((rate + .5) / (brate + .5)), 4)))
ds = [e['d'] for e in events]
stat = wilcoxon(ds, alternative='less', zero_method='wilcox') if any(ds) else None
median_d = sorted(ds)[len(ds) // 2] if len(ds) % 2 else sum(sorted(ds)[len(ds) // 2 - 1:len(ds) // 2 + 1]) / 2
w2 = dict(events=len(events), median_d=round(median_d, 4), median_ratio=round(math.exp(median_d), 3),
          lower_in=sum(1 for x in ds if x < 0), p_one_sided=None if stat is None else round(float(stat.pvalue), 4), detail=events)
w2['pass'] = w2['p_one_sided'] is not None and w2['p_one_sided'] < 0.05 and median_d < 0

res = dict(rules_sha256=RULES, W1=w1, W1_months=[{k: (round(v, 2) if isinstance(v, float) else v) for k, v in e.items()} for e in evals], W2=w2)
(OUT / 'results.json').write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding='utf-8')
print('rules', RULES[:12])
print('W1', json.dumps({k: v for k, v in w1.items()}, ensure_ascii=False))
print('W2 events', w2['events'], 'median ratio', w2['median_ratio'], 'lower in', w2['lower_in'], 'p', w2['p_one_sided'], 'pass', w2['pass'])
for e in events: print('  ', e['name'], e['type'], e['start'], e['days'], e['docs_per_day'], 'vs', e['baseline_docs_per_day'])
