"""Queued re-tests, registered 12 Nov 2026 BEFORE any new data exists. Frozen: do not edit; changes need a new registration.

Only target months AFTER 2026-09 (the last month any study inspected) are scored. Each test needs at least 12 matured
new target months at lead 1 before it can be judged; until then the runner reports PENDING and scores nothing.

R1 ETS on routine sales. Series: monthly routine (base) net PHP = documents < PHP 500k plus rows without a DR, original
   itemized, contracts excluded (the /api/sales/sales-streams definition). Model: services/analytics_service/predictive/
   stable_ets.py forecast(damped=False) on all contiguous months up to the origin, unchanged. Reference: mean_6 of the
   same series. Lead 1. Pass: standard win rule (below).
R2 80% ranges on routine sales. Point: mean_6 of routine sales. Range: point + 10th/90th percentile of the most recent 24
   realised lead-1 errors known at the origin (min 12). Pass: coverage of new targets within 75-85%.
R3 TSB on approved families. Series: monthly net PHP per family (candidate mapping v1.1 or its approved successor);
   intermittent = ADI > 1.32 over the 48 months before the first new target and >= 6 positive months; families with no sale
   in the 12 months before an origin are dropped at that origin (discontinued rule). TSB alpha .3, beta .1. Reference:
   mean_6. Lead 1, pooled per month. Pass: standard win rule.
Standard win rule: 90% moving-block bootstrap (block 6, 2000 draws, seed 20261112) of mean paired absolute-error
difference (candidate - reference) wholly below 0; |normalized bias| <= 5%; difference negative in both halves.
A pass makes a model a candidate only; activation still needs business approval.

Inputs (operator-built from a new verified Gold release; history through 2026-09 must match the retained values):
  --streams  JSON of GET /api/sales/sales-streams (months[].period, base_php)
  --families CSV with columns family, period (YYYY-MM), net_php
Run from repo root:  python -X utf8 outputs/retest_queue_20261112/run.py --streams <file> --families <file>
"""
from pathlib import Path
import argparse, csv, hashlib, json, random, statistics as st, sys
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'services'))
REGISTRATION = __doc__
CUTOFF, MIN_CASES = '2026-09', 12

def win(fc, fr, act, seed=20261112):
    diff = [abs(c - a) - abs(r - a) for c, r, a in zip(fc, fr, act)]; n = len(diff)
    rng, means = random.Random(seed), []
    for _ in range(2000):
        s = []
        while len(s) < n:
            i = rng.randrange(n); s.extend(diff[i:i + 6])
        means.append(st.mean(s[:n]))
    means.sort(); h = n // 2; den = sum(abs(a) for a in act)
    bias = sum(c - a for c, a in zip(fc, act)) / den
    return dict(cases=n, wape=sum(abs(c - a) for c, a in zip(fc, act)) / den, ref_wape=sum(abs(r - a) for r, a in zip(fr, act)) / den,
                bias=bias, boot90=[means[100], means[1899]],
                passes=bool(means[1899] < 0 and abs(bias) <= .05 and sum(diff[:h]) < 0 and sum(diff[h:]) < 0))

def consecutive(periods):
    ys = [int(p[:4]) * 12 + int(p[5:]) - 1 for p in periods]
    return all(b - a == 1 for a, b in zip(ys, ys[1:]))

def r1_r2(series):
    periods = sorted(series); y = [series[p] for p in periods]
    targets = [i for i, p in enumerate(periods) if p > CUTOFF and i >= 36]
    if len(targets) < MIN_CASES: return {'R1': f'PENDING ({len(targets)}/{MIN_CASES} new months)', 'R2': f'PENDING ({len(targets)}/{MIN_CASES} new months)'}
    if not consecutive(periods): raise SystemExit('Routine series has gaps; ETS needs contiguous months')
    from analytics_service.predictive.stable_ets import forecast
    mean6 = lambda o: sum(y[o - 5:o + 1]) / 6
    fc, fr, act, failed = [], [], [], 0
    for t in targets:
        pred, info = forecast({k: y[k] for k in range(t)}, t - 1, [1], damped=False)
        if not pred: failed += 1; continue  # a failed fit is counted, never replaced
        fc.append(pred[1]); fr.append(mean6(t - 1)); act.append(y[t])
    r1 = dict(win(fc, fr, act), ets_fit_failures=failed) if len(fc) >= MIN_CASES else f'INSUFFICIENT ({len(fc)} converged fits)'
    hits = []
    for t in targets:
        errs = [y[k + 1] - mean6(k) for k in range(5, t - 1)][-24:]
        if len(errs) < 12: continue
        lo, hi = sorted(errs)[int(.1 * (len(errs) - 1))], sorted(errs)[int(.9 * (len(errs) - 1))]
        hits.append(mean6(t - 1) + lo <= y[t] <= mean6(t - 1) + hi)
    cov = sum(hits) / len(hits)
    return {'R1': r1, 'R2': dict(cases=len(hits), coverage=cov, passes=bool(.75 <= cov <= .85))}

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

def r3(rows):
    periods = sorted({r['period'] for r in rows}); ix = {p: i for i, p in enumerate(periods)}; N = len(periods)
    fam = defaultdict(lambda: [0.0] * N)
    for r in rows: fam[r['family']][ix[r['period']]] += float(r['net_php'])
    targets = [i for i, p in enumerate(periods) if p > CUTOFF]
    if len(targets) < MIN_CASES: return f'PENDING ({len(targets)}/{MIN_CASES} new months)'
    first = targets[0]; window = range(max(0, first - 48), first)
    def intermittent(y):
        pos = [i for i in window if y[i] > 0]; return bool(pos) and len(window) / len(pos) > 1.32 and len(pos) >= 6
    items = [f for f, y in fam.items() if intermittent(y)]
    fc, fr, act = [], [], []
    for t in targets:
        c = r = a = 0.0
        for f in items:
            y = fam[f]
            if not any(v > 0 for v in y[max(0, t - 12):t]): continue  # discontinued at this origin
            c += tsb(y, t - 1); r += sum(y[t - 6:t]) / 6; a += y[t]
        fc.append(c); fr.append(r); act.append(a)
    return dict(win(fc, fr, act), families=len(items))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--streams', required=True); ap.add_argument('--families', required=True)
    args = ap.parse_args()
    streams = json.loads(Path(args.streams).read_text(encoding='utf-8'))
    series = {m['period']: float(m['base_php']) for m in streams['months']}
    rows = list(csv.DictReader(open(args.families, encoding='utf-8')))
    out = dict(registration_sha256=hashlib.sha256(REGISTRATION.encode()).hexdigest(), cutoff=CUTOFF, **r1_r2(series), R3=r3(rows))
    print(json.dumps(out, indent=1))

if __name__ == '__main__':
    main()
