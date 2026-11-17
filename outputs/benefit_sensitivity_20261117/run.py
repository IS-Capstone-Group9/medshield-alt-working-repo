"""Peso benefit and sensitivity of the data-driven stock policy (O4 / SO4). 17 Nov 2026. Offline, read-only, retrospective.
Simulated: sales are fulfilled demand; pesos at sales value stand in for units; no stock on hand, batches or expiry exist.

Reuses the O4 study code (outputs/o4_prescriptive_policy_20261113/run.py) up to its policy functions, without running or
overwriting that study. Same data, families (mapping v1 candidate), A-class families, backtest origins and safety-stock rule.

Benefit: for each setting, policy stock vs the smallest uniform "keep k months of demand" rule (k searched 0.5-24 months)
reaching the SAME cycle service on the same family-months. Saving = 1 - policy stock / uniform stock. Also reported at cost
(company cost share 0.4097) as average stock held per family-month.
Sensitivity grid: lead time 7/14/30 days x service target 90/95/98% (same target for all classes; the O4 default
X/Y 95%, Z 90% is shown as 'default'). Holding cost 15/25/35% a year turns the average stock difference into a yearly
carrying-cost difference (illustrative; holding cost is assumption A1).
Run from repo root:  python -X utf8 outputs/benefit_sensitivity_20261117/run.py
"""
from pathlib import Path
import json
import numpy as np

ROOT = Path.cwd(); OUT = ROOT / 'outputs/benefit_sensitivity_20261117'
src = (ROOT / 'outputs/o4_prescriptive_policy_20261113/run.py').read_text(encoding='utf-8')
cut = src.index('# ---- T1 calibration')
g: dict = {'__name__': 'o4_reuse', '__doc__': None}
exec(compile(src[:cut], 'o4_reuse', 'exec'), g)
summary, F = g['summary'], g['F']

def cover_needed(rows, service):
    a = np.array([r['a'] for r in rows]); D = np.array([r['D'] for r in rows])
    for k in np.arange(.5, 24.0001, .01):
        if np.mean(a <= k * D) >= service: return float(k), float((k * D).sum())
    return None, None

grid = []
for L in (7, 14, 30):
    for tname, tgt in (('default', {'X': .95, 'Y': .95, 'Z': .90}), ('90%', dict.fromkeys('XYZ', .90)), ('95%', dict.fromkeys('XYZ', .95)), ('98%', dict.fromkeys('XYZ', .98))):
        g['TARGET'] = tgt
        rows = g['policy_rows'](L); s = summary(rows); k, ustock = cover_needed(rows, s['cycle_service'])
        n = len(rows); cost = g['COST']
        avg_policy_cost = s['total_stock'] / n * cost; avg_uniform_cost = None if ustock is None else ustock / n * cost
        diff = None if ustock is None else avg_uniform_cost - avg_policy_cost
        grid.append(dict(lead_days=L, target=tname, family_months=n, cycle_service=round(s['cycle_service'], 4), fill_rate=round(s['fill_rate'], 4),
                         uniform_months_needed=None if k is None else round(k, 2), saving_vs_uniform=None if ustock is None else round(1 - s['total_stock'] / ustock, 4),
                         avg_stock_per_family_month_at_cost=dict(policy=round(avg_policy_cost), uniform=None if avg_uniform_cost is None else round(avg_uniform_cost)),
                         yearly_carrying_cost_difference_per_family=None if diff is None else {f'{h}%': round(diff * h / 100) for h in (15, 25, 35)}))
        print(L, tname, grid[-1]['cycle_service'], grid[-1]['fill_rate'], grid[-1]['uniform_months_needed'], grid[-1]['saving_vs_uniform'], grid[-1]['avg_stock_per_family_month_at_cost'])
(OUT / 'results.json').write_text(json.dumps(dict(grid=grid, note='simulated, retrospective; not measured savings'), indent=1), encoding='utf-8')
