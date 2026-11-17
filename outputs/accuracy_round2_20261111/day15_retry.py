"""Day-15 mid-month estimate: ONE pre-registered retry with a rolling bias correction, 11 Nov 2026. Retrospective.

Why: in round 2 the day-15 total estimate missed only the bias guard (-5.4% vs 5%). The reference it blends with runs low.
REGISTERED BEFORE RUNNING (hash stored in day15_retry.json); this is the only retry and its outcome is final:
  Estimate as in round 2 E1 (total series, day 15, blend weight 0.5 frozen from round 2 development).
  Correction: divide by (1 + b), where b = median of (estimate - actual) / actual over the 12 most recent months before the
  target whose actual is known at the target month (rolling; no evaluation outcome is used for its own correction).
  Evaluation targets 2024-01..2026-09; reference mean_6 of prior months. Same win rule as round 2.
Run from repo root:  python -X utf8 outputs/accuracy_round2_20261111/day15_retry.py
"""
from pathlib import Path
import hashlib, importlib.util, json, statistics as st, sys
import numpy as np

REGISTRATION = __doc__.split('Run from')[0]
ROOT = Path.cwd(); OUT = ROOT / 'outputs/accuracy_round2_20261111'
# Reuse round 2's verified data load and helpers without re-running its experiments.
src = (OUT / 'run.py').read_text(encoding='utf-8')
cut = src.index('# E1 mid-month estimate')
ns: dict = {'__file__': str(OUT / 'run.py'), '__doc__': 'x Run from'}
exec(compile(src[:cut].replace("REGISTRATION = __doc__.split('Run from')[0]", "REGISTRATION = ''"), 'run.py', 'exec'), ns)
rows, N, ix, total, months, EVAL, mean6, score, win = (ns[k] for k in ('rows', 'N', 'ix', 'total', 'months', 'EVAL', 'mean6', 'score', 'win'))

D, W = 15, 0.5
mtd = np.zeros(N)
for x in rows:
    if x['day'] <= D: mtd[ix[x['ym']]] += x['net']
def raw(t):
    shares = [mtd[k] / total[k] for k in range(max(0, t - 24), t) if total[k] > 0]
    return W * mtd[t] / st.median(shares) + (1 - W) * mean6(total, t - 1)
def corrected(t):
    past = [(raw(k) - total[k]) / total[k] for k in range(max(24, t - 12), t) if total[k] > 0]
    return raw(t) / (1 + st.median(past))
fc = [corrected(t) for t in EVAL]; fr = [mean6(total, t - 1) for t in EVAL]; a = total[EVAL]
res = dict(registration_sha256=hashlib.sha256(REGISTRATION.encode()).hexdigest(), uncorrected=score([raw(t) for t in EVAL], a),
           corrected=score(fc, a), reference_mean6=score(fr, a), **win(fc, fr, a))
(OUT / 'day15_retry.json').write_text(json.dumps(res, indent=1)); print(json.dumps(res, indent=1))
