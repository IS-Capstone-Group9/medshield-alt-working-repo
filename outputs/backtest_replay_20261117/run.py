"""Backtest replay: what would MedShield have shown for a past month, using only data known then, vs what happened.
17 Nov 2026. Offline, read-only, retrospective demonstration (methods were chosen with later data in view).
Usage from repo root:  python -X utf8 outputs/backtest_replay_20261117/run.py [YYYY-MM ...]   (default 2024-08 2025-09)

For target month T (origin = end of the previous month, or day 20 of T for the mid-month estimate):
 1. Forecast: mean_6 of company eligible net (6 months before T) vs actual.
 2. Day-20 estimate (accuracy_round2 E1, total, weight 0.75): 0.75 x pace + 0.25 x mean_6, where pace = net delivered
    on days 1-20 of T / median share delivered by day 20 over the 24 months before T.
 3. Stock policy (O4 rules, 14-day lead, default targets): share of A-class families whose demand over the review
    period stayed within the order-up-to level, and value covered.
 4. Government large-order readiness range (P10-P90 of the previous 24 months' government large-order totals) vs actual.
 5. Surge calendar for T (territory surge diseases and weather from surge_preparedness_20261117).
"""
from pathlib import Path
from collections import defaultdict
from datetime import date
import json, sys, statistics
import numpy as np

ROOT = Path.cwd(); OUT = ROOT / 'outputs/backtest_replay_20261117'
src = (ROOT / 'outputs/o4_prescriptive_policy_20261113/run.py').read_text(encoding='utf-8')
g: dict = {'__name__': 'o4_reuse', '__doc__': None}
exec(compile(src[:src.index('# ---- T1 calibration')], 'o4_reuse', 'exec'), g)
el, months, summary = g['el'], g['months'], g['summary']
surge = json.loads((ROOT / 'outputs/surge_preparedness_20261117/results.json').read_text(encoding='utf-8'))

def as_date(v): return v if isinstance(v, date) else date.fromisoformat(str(v)[:10])
def add(ym, k): i = int(ym[:4]) * 12 + int(ym[5:]) - 1 + k; return f'{i // 12}-{i % 12 + 1:02d}'
monthly = defaultdict(float); by20 = defaultdict(float); doc = defaultdict(float); doc_area = defaultdict(lambda: defaultdict(float))
for r in el:
    d = as_date(r['date_delivered']); ym = f'{d.year}-{d.month:02d}'; net = float(r['net_sales'])
    monthly[ym] += net
    if d.day <= 20: by20[ym] += net
    if r['dr_number']: doc[(ym, r['dr_number'])] += net; doc_area[(ym, r['dr_number'])][(r['area'] or '').upper()] += net
gov = defaultdict(float)
for k, net in doc.items():
    if net >= 500_000 and max(doc_area[k].items(), key=lambda kv: kv[1])[0] == 'GOVERNMENT': gov[k[0]] += net
def q(v, p): s = sorted(v); pos = p * (len(s) - 1); lo = int(pos); hi = min(lo + 1, len(s) - 1); return s[lo] + (s[hi] - s[lo]) * (pos - lo)

def replay(T):
    prior = [monthly[add(T, -k)] for k in range(1, 7)]; fc = sum(prior) / 6; actual = monthly[T]
    share = statistics.median(by20[add(T, -k)] / monthly[add(T, -k)] for k in range(1, 25) if monthly[add(T, -k)] > 0)
    pace = by20[T] / share; d20 = .75 * pace + .25 * fc
    o = months.index(add(T, -1)); g['TARGET'] = {'X': .95, 'Y': .95, 'Z': .90}
    rows = [r for r in g['policy_rows'](14) if r['o'] == o]; s = summary(rows) if rows else None
    last24 = [gov[add(T, -k)] for k in range(1, 25)]; lo, hi = q(last24, .1), q(last24, .9)
    mo = int(T[5:]); cal = [c for c in surge['calendar'] if c['geography'] == 'Territory' and not c['pandemic_flag'] and mo in c['surge_months']]
    w = surge['weather']
    return dict(month=T,
        forecast=dict(mean6=round(fc), actual=round(actual), error_pct=round(100 * (fc - actual) / actual, 1)),
        day20=dict(delivered_by_day20=round(by20[T]), usual_share_by_day20=round(share, 3), estimate=round(d20), actual=round(actual), error_pct=round(100 * (d20 - actual) / actual, 1)),
        stock_policy=None if not s else dict(families=s['cases'], families_covered_pct=round(100 * s['cycle_service'], 1), value_covered_pct=round(100 * s['fill_rate'], 1),
                                             order_up_to_php=round(s['total_stock'])),
        government_readiness=dict(range_php=[round(lo), round(hi)], actual_php=round(gov[T]), inside=lo <= gov[T] <= hi),
        surge=dict(diseases_peaking=[c['disease'] for c in cal], typhoons_in_month_2021_2024=w['cyclones_entering_par_by_month'][mo - 1],
                   rainfall_mm=w['rainfall_mm_mean_by_month'][mo - 1], rainy=mo in w['wet_months']))

targets = sys.argv[1:] or ['2024-08', '2025-09']
out = [replay(T) for T in targets]
(OUT / 'results.json').write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding='utf-8')
for r in out: print(json.dumps(r, ensure_ascii=False))
