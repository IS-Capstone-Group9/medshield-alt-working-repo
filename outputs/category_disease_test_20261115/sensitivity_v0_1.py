"""Sensitivity rerun of the 15 Nov category disease test with category mapping v0.1. Not a new registered test.

Runs run.py unchanged (same docstring rules, same 16 registered pairs, same Holm correction) with only the mapping file
swapped, and writes results_sensitivity_v0_1.json. The registered result (v0) stays the result of record.
One exploratory extra, NOT registered and chosen after seeing the mapping change: COVID-19 cases vs ANTIVIRAL sales
(remdesivir moved into ANTIVIRAL in v0.1). It is reported as description only and counts toward no claim.
Run from repo root:  python -X utf8 outputs/category_disease_test_20261115/sensitivity_v0_1.py
"""
from pathlib import Path
import json

HERE = Path.cwd() / 'outputs/category_disease_test_20261115'
src = (HERE / 'run.py').read_text(encoding='utf-8')
a = "outputs/category_mapping_20261115/category_mapping_v0_top200.csv"; b = "(OUT / 'results.json')"
assert src.count(a) == 1 and src.count(b) == 1
src = src.replace(a, "outputs/category_mapping_20261115/category_mapping_v0_1_top200.csv").replace(b, "(OUT / 'results_sensitivity_v0_1.json')")
ns = {'__name__': 'sensitivity'}
exec(compile(src, 'run.py (mapping v0.1)', 'exec'), ns)

months, dis, routine, total, spearmanr = ns['months'], ns['dis'], ns['routine'], ns['total'], ns['spearmanr']
extra = {}
for geo in ('territory', 'national'):
    cases = [dis['COVID-19'][geo].get(k, 0.0) for k in months]
    for name, s in (('routine', routine['ANTIVIRAL']), ('total', total['ANTIVIRAL'])):
        sales = [s.get(k, 0.0) for k in months]
        extra[f'{geo}_{name}'] = dict(level_rho=round(float(spearmanr(cases, sales).statistic), 3),
                                      change_rho_lag0=round(float(spearmanr(ns['dlog'](dis['COVID-19'][geo]), ns['dlog'](s)).statistic), 3),
                                      months_with_sales=sum(1 for v in sales if v > 0), sales_php=round(sum(sales)))
by_year = {y: round(sum(total['ANTIVIRAL'].get(f'{y}-{mo:02d}', 0.0) for mo in range(1, 13))) for y in range(2021, 2026)}
out = json.loads((HERE / 'results_sensitivity_v0_1.json').read_text(encoding='utf-8'))
out['exploratory_not_registered'] = dict(pair='COVID-19 -> ANTIVIRAL', note='chosen after the mapping change; description only', results=extra, antiviral_sales_by_year=by_year)
(HERE / 'results_sensitivity_v0_1.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))
print('\nEXPLORATORY (not registered) COVID-19 -> ANTIVIRAL', json.dumps(extra), by_year)
