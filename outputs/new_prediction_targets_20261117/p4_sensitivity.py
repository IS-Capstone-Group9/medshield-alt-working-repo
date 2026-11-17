"""EXPLORATORY (not pre-registered) P4 sensitivity, written after seeing P4: same rule, but only evaluation dates where the
area ordered within the previous 90 days (removes areas that stopped ordering long ago). Run after run.py."""
import runpy, json
from datetime import timedelta
from scipy.stats import fisher_exact
g = runpy.run_path('outputs/new_prediction_targets_20261117/run.py', run_name='p4s')
days, evals, q = g['days'], g['evals'], g['q']
tab = [[0, 0], [0, 0]]; areas = set(); now = []
for area, ds in days.items():
    ds = sorted(ds)
    for e in evals:
        past = [d for d in ds if d <= e]
        if len(past) < 11 or (e - past[-1]).days > 90: continue
        gaps = [(past[i] - past[i - 1]).days for i in range(1, len(past))]
        late = (e - past[-1]).days > q(gaps, .8); lapse = not any(e < d <= e + timedelta(days=30) for d in ds)
        tab[0 if late else 1][0 if lapse else 1] += 1; areas.add(area)
        if late and e == evals[-1]: now.append(area)
rl, rn = tab[0][0] / sum(tab[0]), tab[1][0] / sum(tab[1])
out = dict(note='exploratory, not pre-registered', table=tab, lapse_rate_late=round(rl, 3), lapse_rate_not_late=round(rn, 3),
           p_one_sided=float(fisher_exact(tab, alternative='greater').pvalue), areas=sorted(areas), late_now=now)
open('outputs/new_prediction_targets_20261117/p4_sensitivity.json', 'w', encoding='utf-8').write(json.dumps(out, indent=1))
print(json.dumps(out))
