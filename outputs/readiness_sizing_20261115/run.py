"""Large-order readiness sizing, 15 Nov 2026. Offline, read-only, deterministic. Rules fixed before the first run.

Question: how much large-order value should MedShield be ready to fulfil next month (cash, supplier credit, delivery
capacity)? Large order = delivery document >= PHP 500k within a month. Monthly large-order total L(t), 2020-01..2026-09.
Options (12 = window x percentile): reserve(t) = percentile p of L over the previous W months (zeros included), with
W in {12, 24} and p in {50, 75, 90, 100 (max)}; percentile = nearest rank on sorted values, index round(p*(n-1)).
Forecast origins 2021-01..2026-09 (W=24 uses the months available since 2020-01, at least 12).
Per option and period: coverage = share of months with L(t) <= reserve(t); mean reserve; mean idle = mean(max(reserve-L,0));
mean shortfall = mean(max(L-reserve,0)).
Selection (2021-01..2023-12 only): the option with the lowest mean reserve among those with coverage >= 80%.
Holdout (2024-01..2026-09): the selected option is "usable" if coverage >= 70%. No reselection after the holdout.
Cash scenario: reserve x cost share, cost share = 1 - gross margin of the latest full year (2025) on margin-eligible rows.
This is a planning scenario, not a measured cash need, and authorizes no purchase.
Run from repo root:  python -X utf8 outputs/readiness_sizing_20261115/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json

ROOT = Path.cwd(); OUT = ROOT / 'outputs/readiness_sizing_20261115'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
el = [r for r in m.gold_candidates(assessed, receipt, bundle['files'])['itemized'] if r['is_net_sales_technically_eligible']]
assert sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')

docs = defaultdict(float); gm25 = [0.0, 0.0]
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10]); ym = f'{d.year}-{d.month:02d}'
    if r['dr_number']: docs[(ym, r['dr_number'])] += float(r['net_sales'])
    if d.year == 2025 and r['is_gross_margin_technically_eligible'] and r['gross_margin_amount'] is not None:
        gm25[0] += float(r['net_sales']); gm25[1] += float(r['gross_margin_amount'])
months = [f'{y}-{mo:02d}' for y in range(2020, 2027) for mo in range(1, 13) if f'{y}-{mo:02d}' <= '2026-09']
L = {k: 0.0 for k in months}
for (ym, _), v in docs.items():
    if v >= 500_000 and ym in L: L[ym] += v
q = lambda xs, p: sorted(xs)[round(p * (len(xs) - 1))]
cost_share = 1 - gm25[1] / gm25[0]

origins = [k for k in months if k >= '2021-01']
opts = {}
for W in (12, 24):
    for p in (0.5, 0.75, 0.9, 1.0):
        rs = []
        for k in origins:
            i = months.index(k); hist = [L[j] for j in months[max(0, i - W):i]]
            rs.append((k, q(hist, p), L[k]))
        opts[f'W{W}_p{int(p*100)}'] = rs
def stats(rs):
    n = len(rs)
    return dict(months=n, coverage=round(sum(a <= r for _, r, a in rs) / n, 3), mean_reserve=round(sum(r for _, r, _ in rs) / n),
                mean_idle=round(sum(max(r - a, 0) for _, r, a in rs) / n), mean_shortfall=round(sum(max(a - r, 0) for _, r, a in rs) / n))
table = {name: dict(sel_2021_23=stats([x for x in rs if x[0] <= '2023-12']), hold_2024_26=stats([x for x in rs if x[0] >= '2024-01'])) for name, rs in opts.items()}
eligible = {n: v for n, v in table.items() if v['sel_2021_23']['coverage'] >= 0.80}
chosen = min(eligible, key=lambda n: eligible[n]['sel_2021_23']['mean_reserve']) if eligible else None
W, p = (int(chosen.split('_')[0][1:]), int(chosen.split('_p')[1]) / 100) if chosen else (None, None)
now = q([L[j] for j in months[-W:]], p) if chosen else None
res = dict(rules_sha256=hashlib.sha256(__doc__.encode('utf-8')).hexdigest(), cost_share_2025=round(cost_share, 3), options=table,
           chosen=chosen, chosen_holdout_usable=bool(chosen) and table[chosen]['hold_2024_26']['coverage'] >= 0.70,
           reserve_for_2026_10=dict(sales_value=round(now) if now is not None else None, cash_scenario=round(now * cost_share) if now is not None else None),
           all_options_for_2026_10={n: round(q([L[j] for j in months[-int(n.split('_')[0][1:]):]], int(n.split('_p')[1]) / 100)) for n in opts})
(OUT / 'results.json').write_text(json.dumps(res, indent=1))
print('rules', res['rules_sha256'][:12], '| cost share 2025', round(cost_share, 3))
print(f"{'option':10} {'cov21-23':>8} {'res21-23':>9} {'cov24-26':>8} {'res24-26':>9} {'idle24-26':>9} {'short24-26':>10}")
for n, v in table.items():
    a, b = v['sel_2021_23'], v['hold_2024_26']
    print(f"{n:10} {a['coverage']:8.2f} {a['mean_reserve']/1e6:8.2f}M {b['coverage']:8.2f} {b['mean_reserve']/1e6:8.2f}M {b['mean_idle']/1e6:8.2f}M {b['mean_shortfall']/1e6:9.2f}M")
print('chosen', chosen, 'usable', res['chosen_holdout_usable'], 'Oct 2026', res['reserve_for_2026_10'])
print('all options Oct 2026', res['all_options_for_2026_10'])
