"""Build a self-contained local HTML report from the exploration results. Run from repo root."""
from pathlib import Path
import json

OUT = Path.cwd() / 'outputs/exploration_20261112'
res = json.loads((OUT / 'results.json').read_text())
fc = json.loads((OUT / 'forecasts.json').read_text())
act = json.loads((OUT / 'actuals.json').read_text())
r2 = json.loads((Path.cwd() / 'outputs/accuracy_round2_20261111/results.json').read_text())

line = [{'p': p, 'actual': act['total'][p], 'blend': fc['total']['1']['equal_combo_simple'].get(p),
         'growth': fc['total']['1']['growth_mean_6'].get(p)} for p in sorted(fc['total']['1']['mean_6'])]
ladder = [
    ['Total sales, current reference (6-month mean), 1 month ahead', res['total']['lead1']['mean_6']['wape']],
    ['Total sales, 4-method blend, 1 month ahead', res['total']['lead1']['equal_combo_simple']['wape']],
    ['Routine sales only, 4-method blend, 1 month ahead', res['routine']['lead1']['equal_combo_simple']['wape']],
    ['Total sales, estimate on day 20 of the month (2024–26; same-period reference 41.8%)', r2['E1_mid_month']['total_day20']['eval']['wape']],
]
NAMES = {'mean_3': '3-month mean', 'mean_6': '6-month mean (reference)', 'mean_12': '12-month mean', 'median_6': '6-month median',
         'seasonal_naive': 'Same month last year', 'drift_24': '24-month trend line', 'growth_mean_6': 'Growth-adjusted 6-month mean',
         'seasonal_index_mean_6': 'Seasonal-adjusted 6-month mean', 'ets': 'ETS (exponential smoothing)', 'theta': 'Theta',
         'select_best_12': 'Pick recent best method', 'inverse_error_combo': 'Blend weighted by recent error',
         'top3_combo': 'Blend of recent top 3', 'equal_combo_simple': '4-method blend'}
table = []
for k, name in NAMES.items():
    row = [name]
    for s in ('total', 'routine'):
        for L in ('lead1', 'lead3', 'lead6'):
            v = res[s][L].get(k); row.append(None if v is None else [round(v['wape'] * 100, 1), round(v['bias'] * 100, 1)])
    table.append(row)
best = {}
for j, (s, L) in enumerate([(s, L) for s in ('total', 'routine') for L in ('lead1', 'lead3', 'lead6')]):
    best[j + 1] = min((r[j + 1][0], i) for i, r in enumerate(table) if r[j + 1])[1]

html = (OUT / 'report_template.html').read_text(encoding='utf-8')
html = html.replace('/*DATA*/', 'const LINE=' + json.dumps(line) + ';const LADDER=' + json.dumps(ladder) + ';const TABLE=' + json.dumps(table) + ';const BEST=' + json.dumps(best) + ';const CUT=' + json.dumps(1 - r2['E1_mid_month']['total_day20']['eval']['wape'] / r2['E1_mid_month']['total_day20']['reference_mean6']['wape']) + ';')
(OUT / 'report.html').write_text(html, encoding='utf-8')
print('wrote', OUT / 'report.html', len(html))
