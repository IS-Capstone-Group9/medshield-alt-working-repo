"""Queued re-test addendum R4-R5, registered 12 Nov 2026 BEFORE any month after 2026-09 exists. Frozen like run.py.

Source of the candidates: exploratory search (outputs/exploration_20261112), where they looked best on inspected months.
Only target months after 2026-09 are scored; at least 12 new months at lead 1 are needed, else PENDING.

R4 4-method blend on routine sales: forecast = mean of (3-month mean, 6-month mean, 6-month median, growth-adjusted
   6-month mean), lead 1. Growth-adjusted = 6-month mean x clip(1 + 0.5 * (last 12 months / prior 12 months - 1), 0.7, 1.3).
   Reference: routine mean_6. Pass: standard win rule (run.py).
R5 Growth-adjusted 6-month mean for budgeting, total sales, lead 1. Pass: |normalized bias| <= 5% AND WAPE no more than
   3 percentage points above total mean_6 on the same new targets (bias is the purpose; accuracy may not collapse).
Inputs: --streams JSON of GET /api/sales/sales-streams (months[].period, base_php, total_php).
Run from repo root:  python -X utf8 outputs/retest_queue_20261112/addendum_r4_r5.py --streams <file>
"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, statistics as st

REGISTRATION = __doc__
spec = importlib.util.spec_from_file_location('queue', Path(__file__).with_name('run.py')); q = importlib.util.module_from_spec(spec); spec.loader.exec_module(q)

def growth_mean6(y, o):
    a, b = sum(y[o-11:o+1]), sum(y[o-23:o-11]); g = 1.0 if b <= 0 else min(1.3, max(0.7, 1 + 0.5 * (a / b - 1)))
    return sum(y[o-5:o+1]) / 6 * g
def blend(y, o):
    return (sum(y[o-2:o+1]) / 3 + sum(y[o-5:o+1]) / 6 + st.median(y[o-5:o+1]) + growth_mean6(y, o)) / 4

def evaluate(months):
    periods = [m['period'] for m in months]
    targets = [i for i, p in enumerate(periods) if p > q.CUTOFF and i >= 24]
    if len(targets) < q.MIN_CASES:
        pending = f'PENDING ({len(targets)}/{q.MIN_CASES} new months)'; return {'R4': pending, 'R5': pending}
    if not q.consecutive(periods): raise SystemExit('Series has gaps')
    base = [float(m['base_php']) for m in months]; total = [float(m['total_php']) for m in months]
    m6 = lambda y, o: sum(y[o-5:o+1]) / 6
    r4 = q.win([blend(base, t - 1) for t in targets], [m6(base, t - 1) for t in targets], [base[t] for t in targets])
    act = [total[t] for t in targets]; den = sum(abs(a) for a in act)
    g = [growth_mean6(total, t - 1) for t in targets]; r = [m6(total, t - 1) for t in targets]
    wg = sum(abs(f - a) for f, a in zip(g, act)) / den; wr = sum(abs(f - a) for f, a in zip(r, act)) / den
    bias = sum(f - a for f, a in zip(g, act)) / den
    return {'R4': r4, 'R5': dict(cases=len(act), wape=wg, ref_wape=wr, bias=bias, passes=bool(abs(bias) <= .05 and wg <= wr + .03))}

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--streams', required=True); a = ap.parse_args()
    months = json.loads(Path(a.streams).read_text(encoding='utf-8'))['months']
    print(json.dumps(dict(registration_sha256=hashlib.sha256(REGISTRATION.encode()).hexdigest(), **evaluate(months)), indent=1))
