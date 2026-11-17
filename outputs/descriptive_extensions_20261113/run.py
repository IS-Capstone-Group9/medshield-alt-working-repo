"""Descriptive analytics extensions, 13 Nov 2026. Offline, read-only, deterministic (no models, no estimates).

Source: original itemized Gold reproduction (contracts excluded), eligible signed net PHP, 2017-01..2026-09; reconciles to
PHP 638,015,351.53. 2026 covers January-September only; year-over-year statements use matched January-September.
Families: candidate mapping v1.1 (decision 015). Missing months are never treated as zero sales.

D1 Order size: documents (month, DR) per year, mean and median document value, share of net by size band.
D2 Channel mix: share of net by recorded area/channel label per year (top labels; rest grouped).
D3 Category mix and margin: net share and gross margin % (margin-eligible rows only) by product category per year.
D4 Portfolio change: families with sales this year that sold last year (continuing), did not (new), and last-year families
   with no sales this year (lost), with their net.
D5 Concentration: top-10 family share of positive net and Herfindahl-Hirschman index (sum of squared shares x 10,000).
D6 Returns and adjustments: negative-net lines, their count and value as a share of gross positive net.
D7 Discount rate: discount amount / gross sales (rows with both present).
D8 Within-month timing: share of each month's net delivered by day 10 and day 20 (median by year).
Run from repo root:  python -X utf8 outputs/descriptive_extensions_20261113/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, importlib.util, io, json, statistics as st

ROOT = Path.cwd(); OUT = ROOT / 'outputs/descriptive_extensions_20261113'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
items = m.gold_candidates(assessed, receipt, bundle['files'])['itemized']
el = [r for r in items if r['is_net_sales_technically_eligible']]
assert sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')
family = {r['recorded_label']: r['family_v1'] for r in csv.DictReader((ROOT / 'outputs/product_family_draft_20261111/family_mapping_v1_1_candidate.csv').open(encoding='utf-8'))}
f = lambda v: float(v) if v is not None else None

rows = []
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10])
    rows.append(dict(y=d.year, ym=f'{d.year}-{d.month:02d}', day=d.day, dr=r['dr_number'], area=(r['area'] or 'UNLABELLED').strip().upper(),
                     cat=r['product_category'] or 'unclassified', fam=family[r['normalized_product']], net=float(r['net_sales']),
                     gross=f(r['gross_sales']), disc=f(r['discount_amount']), gm=f(r['gross_margin_amount']) if r['is_gross_margin_technically_eligible'] else None))
years = sorted({x['y'] for x in rows})
by_year = defaultdict(list)
for x in rows: by_year[x['y']].append(x)
res = {'scope': 'original itemized, contracts excluded, eligible signed net PHP; 2026 = Jan-Sep', 'total_net': round(sum(x['net'] for x in rows), 2),
       'months_recorded': len({x['ym'] for x in rows}), 'years': years}

# D1 order size
BANDS = [(0, 10_000, 'under ₱10K'), (10_000, 100_000, '₱10K–100K'), (100_000, 500_000, '₱100K–500K'), (500_000, float('inf'), '₱500K and over')]
d1 = {}
for yv, xs in by_year.items():
    docs = defaultdict(float)
    for x in xs:
        if x['dr']: docs[(x['ym'], x['dr'])] += x['net']
    vals = [v for v in docs.values() if v > 0]; tot = sum(vals)
    d1[yv] = dict(documents=len(vals), mean=tot / len(vals), median=st.median(vals),
                  band_share={lab: sum(v for v in vals if lo <= v < hi) / tot for lo, hi, lab in BANDS},
                  band_count={lab: sum(1 for v in vals if lo <= v < hi) for lo, hi, lab in BANDS})
res['D1_order_size'] = d1

# D2 channel mix
tot_area = defaultdict(float)
for x in rows: tot_area[x['area']] += x['net']
top = [a for a, _ in sorted(tot_area.items(), key=lambda kv: -kv[1])[:6]]
d2 = {}
for yv, xs in by_year.items():
    t = sum(x['net'] for x in xs); s = defaultdict(float)
    for x in xs: s[x['area'] if x['area'] in top else 'OTHER LABELS'] += x['net']
    d2[yv] = {k: v / t for k, v in s.items()}
res['D2_channel_mix'] = dict(labels=top + ['OTHER LABELS'], share=d2)

# D3 category mix and margin
d3 = {}
for yv, xs in by_year.items():
    t = sum(x['net'] for x in xs); c = defaultdict(lambda: [0.0, 0.0, 0.0])
    for x in xs:
        c[x['cat']][0] += x['net']
        if x['gm'] is not None: c[x['cat']][1] += x['gm']; c[x['cat']][2] += x['net']
    d3[yv] = {k: dict(share=v[0] / t, margin_pct=(v[1] / v[2] if v[2] else None)) for k, v in c.items()}
res['D3_category'] = d3

# D4 portfolio change and D5 concentration
fam_year = defaultdict(lambda: defaultdict(float))
for x in rows: fam_year[x['y']][x['fam']] += x['net']
d4, d5 = {}, {}
for i, yv in enumerate(years):
    now = {k: v for k, v in fam_year[yv].items() if v > 0}; tot = sum(now.values())
    shares = sorted((v / tot for v in now.values()), reverse=True)
    d5[yv] = dict(families=len(now), top10_share=sum(shares[:10]), hhi=sum(s * s for s in shares) * 10_000)
    if i == 0: continue
    prev = {k: v for k, v in fam_year[years[i - 1]].items() if v > 0}
    cont = set(now) & set(prev); new = set(now) - set(prev); lost = set(prev) - set(now)
    d4[yv] = dict(continuing=len(cont), new=len(new), lost=len(lost), new_net_share=sum(now[k] for k in new) / tot,
                  lost_prior_net_share=sum(prev[k] for k in lost) / sum(prev.values()))
res['D4_portfolio'] = d4; res['D5_concentration'] = d5

# D6 returns and D7 discounts
d6, d7 = {}, {}
for yv, xs in by_year.items():
    pos = sum(x['net'] for x in xs if x['net'] > 0); neg = [x['net'] for x in xs if x['net'] < 0]
    d6[yv] = dict(negative_lines=len(neg), negative_value=sum(neg), share_of_positive=-sum(neg) / pos)
    g = [(x['gross'], x['disc']) for x in xs if x['gross'] and x['disc'] is not None and x['gross'] > 0]
    d7[yv] = dict(rows=len(g), discount_rate=(sum(dv for _, dv in g) / sum(gv for gv, _ in g)) if g else None)
res['D6_returns'] = d6; res['D7_discounts'] = d7

# D8 within-month timing
d8 = {}
mon = defaultdict(lambda: [0.0, 0.0, 0.0])
for x in rows:
    a = mon[x['ym']]; a[2] += x['net']
    if x['day'] <= 10: a[0] += x['net']
    if x['day'] <= 20: a[1] += x['net']
for yv in years:
    ms = [v for k, v in mon.items() if k.startswith(str(yv)) and v[2] > 0]
    d8[yv] = dict(months=len(ms), median_by_day10=st.median(v[0] / v[2] for v in ms), median_by_day20=st.median(v[1] / v[2] for v in ms))
res['D8_timing'] = d8
(OUT / 'results.json').write_text(json.dumps(res, indent=1, ensure_ascii=False))
print(json.dumps({k: res[k] for k in ('total_net', 'months_recorded')}))
for yv in years:
    print(yv, 'docs', d1[yv]['documents'], 'mean %.0f med %.0f' % (d1[yv]['mean'], d1[yv]['median']), '≥500K %.0f%%' % (100 * d1[yv]['band_share']['₱500K and over']),
          '| GOV %.0f%% HOSP %.0f%%' % (100 * d2[yv].get('GOVERNMENT', 0), 100 * d2[yv].get('HOSPITAL', 0)),
          '| fam %d top10 %.0f%% HHI %.0f' % (d5[yv]['families'], 100 * d5[yv]['top10_share'], d5[yv]['hhi']),
          '| new %s' % (('%d (%.0f%%)' % (d4[yv]['new'], 100 * d4[yv]['new_net_share'])) if yv in d4 else '-'),
          '| ret %.1f%%' % (100 * d6[yv]['share_of_positive']), '| disc %s' % ('%.1f%%' % (100 * d7[yv]['discount_rate']) if d7[yv]['discount_rate'] is not None else '-'),
          '| d10 %.0f%% d20 %.0f%%' % (100 * d8[yv]['median_by_day10'], 100 * d8[yv]['median_by_day20']))
print('categories', {yv: {k: (round(v['share'] * 100), None if v['margin_pct'] is None else round(v['margin_pct'] * 100, 1)) for k, v in d3[yv].items()} for yv in (2019, 2025)})
