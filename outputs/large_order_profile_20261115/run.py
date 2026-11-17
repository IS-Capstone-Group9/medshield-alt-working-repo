"""Large-order profile, 15 Nov 2026. Offline, read-only, deterministic. Rules and pass criteria fixed before the first run.

Large order = delivery document (dr_number within a month) with net >= PHP 500,000. Original itemized, contracts excluded.
Descriptive window: Jan 2017 - Sep 2026 (recorded months). Test window: Jan 2020 - Sep 2026 (81 contiguous months).

A. Frequency: per year, months with >= 1 large order, documents per month.
B. Size: document size quantiles (p50, p75, p90, max); monthly large-order total in months with >= 1 large order.
C. Timing: does the calendar month matter? Statistic = variance of calendar-month means of monthly large-order net,
   2020-01..2026-09. Null: permute monthly values among months of the same year (keeps the yearly trend), 5000 draws,
   seed 20261115. Calendar timing is called real only if p < 0.05.
D. Content: large-order net by product family (top 10 share); share of each year's large net in families already seen in
   large orders in earlier years ("repeat products"); share of large net in families also sold routinely in the prior 12
   months ("already stocked").
E. Forward test of a readiness estimate, forecast origins 2021-01..2026-09, using only months before each origin:
   E1 chance of >= 1 large order next month. Candidates: T12 = share of previous 12 months with one; EXP = share of all
      months since 2020-01. Choose the one with lower Brier score on 2021-01..2023-12; report it on 2024-01..2026-09.
      Usable if, on 2024-01..2026-09, Brier < 0.25 (coin flip) AND |mean predicted - observed rate| <= 0.10.
   E2 range of next month's large-order total: p10..p90 of the previous 24 months (zeros included). Usable if coverage
      is between 70% and 90% in both 2021-01..2023-12 and 2024-01..2026-09.
Results are retrospective and authorize no purchase.
Run from repo root:  python -X utf8 outputs/large_order_profile_20261115/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json, random

ROOT = Path.cwd(); OUT = ROOT / 'outputs/large_order_profile_20261115'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
el = [r for r in m.gold_candidates(assessed, receipt, bundle['files'])['itemized'] if r['is_net_sales_technically_eligible']]
assert sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')
family = {r['recorded_label']: r['family_v1'] for r in csv.DictReader((ROOT / 'outputs/product_family_draft_20261111/family_mapping_v1_1_candidate.csv').open(encoding='utf-8'))}

rows = []
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10])
    rows.append(dict(y=d.year, mo=d.month, ym=f'{d.year}-{d.month:02d}', dr=r['dr_number'], net=float(r['net_sales']),
                     area=(r['area'] or 'UNLABELLED').strip().upper(), fam=family[r['normalized_product']]))
docs = defaultdict(float)
for x in rows:
    if x['dr']: docs[(x['ym'], x['dr'])] += x['net']
large_docs = {k: v for k, v in docs.items() if v >= 500_000}
for x in rows: x['large'] = (x['ym'], x['dr']) in large_docs
months = sorted({x['ym'] for x in rows})
test_months = [f'{y}-{mo:02d}' for y in range(2020, 2027) for mo in range(1, 13) if f'{y}-{mo:02d}' <= '2026-09']
assert all(t in months for t in test_months) and len(test_months) == 81
L = {k: 0.0 for k in months}; N = {k: 0 for k in months}
for (ym, _), v in large_docs.items(): L[ym] += v; N[ym] += 1
total = defaultdict(float)
for x in rows: total[x['ym']] += x['net']
q = lambda xs, p: sorted(xs)[min(len(xs) - 1, max(0, round(p * (len(xs) - 1))))]
res = dict(rules_sha256=hashlib.sha256(__doc__.encode('utf-8')).hexdigest(), large_documents=len(large_docs))

# A. frequency
by_year = {}
for y in sorted({x['y'] for x in rows}):
    ms = [k for k in months if k.startswith(str(y))]
    by_year[y] = dict(months_recorded=len(ms), months_with_large=sum(1 for k in ms if N[k] > 0), documents=sum(N[k] for k in ms),
                      large_net=round(sum(L[k] for k in ms)), large_share=round(sum(L[k] for k in ms) / sum(total[k] for k in ms), 3))
res['A_frequency'] = by_year

# B. size
sizes = sorted(large_docs.values()); sz_test = sorted(v for (ym, _), v in large_docs.items() if ym in test_months)
mon_tot = [L[k] for k in test_months if N[k] > 0]
res['B_size'] = dict(document_all=dict(n=len(sizes), p50=round(q(sizes, .5)), p75=round(q(sizes, .75)), p90=round(q(sizes, .9)), max=round(sizes[-1])),
                     document_2020_26=dict(n=len(sz_test), p50=round(q(sz_test, .5)), p75=round(q(sz_test, .75)), p90=round(q(sz_test, .9)), max=round(sz_test[-1])),
                     monthly_total_when_any_2020_26=dict(n=len(mon_tot), p10=round(q(mon_tot, .1)), p50=round(q(mon_tot, .5)), p90=round(q(mon_tot, .9))),
                     documents_per_month_when_any_2020_26=dict(p50=q([N[k] for k in test_months if N[k] > 0], .5), max=max(N[k] for k in test_months)))

# C. calendar timing
def stat(vals):
    cm = defaultdict(list)
    for k, v in vals.items(): cm[int(k[5:])].append(v)
    means = [sum(v) / len(v) for v in cm.values()]; mu = sum(means) / len(means)
    return sum((x - mu) ** 2 for x in means) / len(means), {mo: sum(v) / len(v) for mo, v in sorted(cm.items())}
obs, cal_means = stat({k: L[k] for k in test_months})
rng = random.Random(20261115); ge = 0
years = defaultdict(list)
for k in test_months: years[k[:4]].append(k)
for _ in range(5000):
    perm = {}
    for y, ks in years.items():
        vals = [L[k] for k in ks]; rng.shuffle(vals); perm.update(zip(ks, vals))
    if stat(perm)[0] >= obs: ge += 1
p_cal = (ge + 1) / 5001
anyrate = defaultdict(list)
for k in test_months: anyrate[int(k[5:])].append(N[k] > 0)
res['C_timing'] = dict(p_value=round(p_cal, 4), calendar_timing_real=p_cal < 0.05,
                       by_calendar_month={mo: dict(mean_large_net=round(v), share_months_with_large=round(sum(anyrate[mo]) / len(anyrate[mo]), 2)) for mo, v in cal_means.items()})

# D. content
fam_large = defaultdict(float); fam_large_year = defaultdict(lambda: defaultdict(float))
for x in rows:
    if x['large']: fam_large[x['fam']] += x['net']; fam_large_year[x['y']][x['fam']] += x['net']
tot_large = sum(fam_large.values())
top = sorted(fam_large.items(), key=lambda kv: -kv[1])[:10]
seen = set(); repeat = {}
for y in sorted(fam_large_year):
    yt = sum(v for v in fam_large_year[y].values() if v > 0)
    if seen and yt: repeat[y] = round(sum(v for f, v in fam_large_year[y].items() if f in seen and v > 0) / yt, 3)
    seen |= {f for f, v in fam_large_year[y].items() if v > 0}
stocked_num = stocked_den = 0.0
for i, k in enumerate(months):
    if k not in test_months or N[k] == 0: continue
    prior = set(months[max(0, i - 12):i])
    routine_fams = {x['fam'] for x in rows if x['ym'] in prior and not x['large'] and x['net'] > 0}
    for x in rows:
        if x['ym'] == k and x['large'] and x['net'] > 0:
            stocked_den += x['net']; stocked_num += x['net'] if x['fam'] in routine_fams else 0
res['D_content'] = dict(families_in_large_orders=sum(1 for v in fam_large.values() if v > 0),
                        top10=[dict(family=f, net=round(v), share=round(v / tot_large, 3)) for f, v in top],
                        top10_share=round(sum(v for _, v in top) / tot_large, 3),
                        repeat_product_share_by_year=repeat,
                        already_stocked_share_2020_26=round(stocked_num / stocked_den, 3))

# E. forward test
origins = [k for k in test_months if k >= '2021-01']
idx = {k: test_months.index(k) for k in origins}
def brier(preds): return sum((p - o) ** 2 for p, o in preds) / len(preds)
cand = {'T12': [], 'EXP': []}; rng_rows = []
for k in origins:
    i = idx[k]; o = 1.0 if N[k] > 0 else 0.0
    prev12 = test_months[i - 12:i]; prevall = test_months[:i]; prev24 = test_months[max(0, i - 24):i]
    cand['T12'].append((k, sum(N[j] > 0 for j in prev12) / 12, o)); cand['EXP'].append((k, sum(N[j] > 0 for j in prevall) / len(prevall), o))
    lv = [L[j] for j in prev24]; lo, hi = q(lv, .1), q(lv, .9)
    rng_rows.append((k, lo, hi, L[k], lo <= L[k] <= hi))
half = lambda rs, first: [r for r in rs if (r[0] <= '2023-12') == first]
sel = {c: brier([(p, o) for _, p, o in half(v, True)]) for c, v in cand.items()}
chosen = min(sel, key=sel.get); h2 = [(p, o) for _, p, o in half(cand[chosen], False)]
b2 = brier(h2); gap = sum(p for p, _ in h2) / len(h2) - sum(o for _, o in h2) / len(h2)
cov = {name: sum(r[4] for r in half(rng_rows, first)) / len(half(rng_rows, first)) for name, first in (('2021-2023', True), ('2024-2026', False))}
res['E_forward_test'] = dict(
    E1_chance=dict(selection_brier_2021_23={c: round(v, 4) for c, v in sel.items()}, chosen=chosen,
                   holdout_2024_26=dict(months=len(h2), brier=round(b2, 4), mean_predicted=round(sum(p for p, _ in h2) / len(h2), 3),
                                        observed_rate=round(sum(o for _, o in h2) / len(h2), 3), calibration_gap=round(gap, 3)),
                   usable=b2 < 0.25 and abs(gap) <= 0.10,
                   other_candidate_holdout_brier=round(brier([(p, o) for _, p, o in half(cand['EXP' if chosen == 'T12' else 'T12'], False)]), 4)),
    E2_range=dict(coverage={k: round(v, 3) for k, v in cov.items()}, usable=all(0.70 <= v <= 0.90 for v in cov.values()),
                  misses=[dict(month=r[0], low=round(r[1]), high=round(r[2]), actual=round(r[3])) for r in rng_rows if not r[4]]))
last = test_months[-24:]; lv = [L[j] for j in last]
res['readiness_as_of_2026_09'] = dict(chance_next_month_T12=round(sum(N[j] > 0 for j in test_months[-12:]) / 12, 2),
                                      chance_next_month_EXP=round(sum(N[j] > 0 for j in test_months) / len(test_months), 2),
                                      range_p10_p90=[round(q(lv, .1)), round(q(lv, .9))])
(OUT / 'results.json').write_text(json.dumps(res, indent=1, ensure_ascii=False))

print('rules', res['rules_sha256'][:12], '| large docs', len(large_docs))
print('\nA', json.dumps(by_year))
print('\nB', json.dumps(res['B_size']))
print('\nC p =', res['C_timing']['p_value'], json.dumps(res['C_timing']['by_calendar_month']))
print('\nD', json.dumps(res['D_content'], ensure_ascii=False))
print('\nE', json.dumps(res['E_forward_test'], indent=1))
print('\nREADY', res['readiness_as_of_2026_09'])
