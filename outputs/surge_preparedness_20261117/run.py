"""Surge preparedness: disease/weather risk calendar, surge alerts and stock-uplift scenarios. 17 Nov 2026.
Offline, read-only, retrospective. Rules fixed in this docstring before the first run (hash recorded in results).

Purpose: make the DSS disease- and weather-INFORMED for planning. This does not claim that disease or weather
predicts sales (earlier tests: category_disease_test_20261115 0/64, signal_analysis_20261110 not supported).

Inputs: DOH weekly reported cases 2021-2025 (15 diseases, province); PAGASA tropical cyclones entering PAR
2021-2024 (Summary sheet); PAGASA daily station data 2021-2024 for Science Garden and Port Area (nearest
available stations to CALABARZON; Metro Manila, so a PROXY for the territory); original itemized sales
(eligible net), family mapping v1.1, category mapping v0.1 top-200 (H/M only). Routine sales = documents
< PHP 500k (as in the 15 Nov test). Territory = CALABARZON + MIMAROPA + Bicol. Disease weeks are assigned to
the month of the Thursday of the ISO week (week 53 -> week 52).

C. Risk calendar (descriptive, observed). For each disease group and region (each of 3 regions + territory):
   monthly cases per year; month median across 2021-2025; seasonal index = month median / mean of 12 medians.
   SURGE MONTH if index >= 1.20. COVID-19 is reported but flagged as pandemic-wave driven. Weather: count of
   cyclones entering PAR by start month (2021-2024); mean monthly rainfall (mm) of the two stations, missing
   (-999) excluded, trace (-1) = 0; wet month if monthly mean rainfall >= 200 mm.

A. Surge alerts (retrospective evaluation). Disease alert for month m (2023-01..2025-12) if territory cases
   exceed the 75th percentile of the same calendar month in all EARLIER years (>= 2 earlier years, no
   look-ahead). Typhoon alert for month m (2021-02..2024-12) if a TY or STY enters PAR in month m.
   Exposed categories per disease = the 15 Nov pre-registered pairs (COVID-19 and Rabies excluded: pandemic /
   programme driven); typhoon -> ANTIBACTERIAL, ANALGESIC_ANTIPYRETIC, ANTIPROTOZOAL.
   Outcome (per month, per exposed category): HIT if routine sales in m or m+1 exceed the mean of the 6 months
   before m by >= 10%. Compare hit rate in alert months vs non-alert months over the same window.
   One-sided Fisher exact test per alert type (pooled over its exposed categories); Holm over alert types.
   An alert type is USEFUL only if Holm p < 0.05 AND alert hit rate > non-alert hit rate. Otherwise it is
   kept only as a preparedness reminder, never as a demand signal.

S. Uplift scenarios (scenario, assumed). For each exposed category: mean routine monthly sales (PHP) in the
   territory surge months of its diseases, 2021-2025. Extra stock value for planner-chosen uplifts of
   20/40/60% over one month of cover = uplift x that mean. PHP value proxy (no verified units or cost).
   Scenario only; authorizes no purchase.

Retrospective, candidate evidence (mapping is AI-inferred). Run from repo root:
  python -X utf8 outputs/surge_preparedness_20261117/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json, statistics
import openpyxl
from scipy.stats import fisher_exact

ROOT = Path.cwd(); OUT = ROOT / 'outputs/surge_preparedness_20261117'
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
cmap_path = next(p for p in [ROOT / 'outputs/category_mapping_20261115/category_mapping_v0_1_top200.csv',
                             ROOT / 'outputs/category_mapping_20261115/category_mapping_v0_top200.csv'] if p.exists())
cat = {r['family_v1']: r['category'] for r in csv.DictReader(cmap_path.open(encoding='utf-8')) if r['confidence'] in ('H', 'M')}

docs = defaultdict(float); rows = []
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10]); ym = f'{d.year}-{d.month:02d}'
    rows.append((ym, r['dr_number'], float(r['net_sales']), cat.get(family[r['normalized_product']])))
    if r['dr_number']: docs[(ym, r['dr_number'])] += float(r['net_sales'])
routine = defaultdict(lambda: defaultdict(float))
for ym, dr, net, c in rows:
    if c is not None and not (dr and docs[(ym, dr)] >= 500_000): routine[c][ym] += net

def ym_add(ym, k):
    y, mo = int(ym[:4]), int(ym[5:]) + k
    while mo > 12: y, mo = y + 1, mo - 12
    while mo < 1: y, mo = y - 1, mo + 12
    return f'{y}-{mo:02d}'

# ---------- DOH ----------
REGIONS = {'REGION IV-A (CALABARZON)': 'CALABARZON', 'MIMAROPA REGION': 'MIMAROPA', 'REGION V (BICOL REGION)': 'Bicol'}
SHEETS = {'ILI': ['Pan-respi_ILI'], 'SARI': ['Pan-respi_SARI'], 'COVID-19': ['Pan-respi_COVID-19'], 'Dengue': ['MBD_Dengue'],
          'Typhoid': ['FWBD_Typhoid'], 'Diarrhoeal': ['FWBD_ABD', 'FWBD_Rotavirus', 'FWBD_Cholera'], 'Leptospirosis': ['Zoo_Leptospirosis'],
          'Rabies': ['Zoo_Rabies'], 'Chikungunya': ['MBD_Chikungunya']}
EXPOSED = {'ILI': ['RESPIRATORY', 'ANTIBACTERIAL'], 'SARI': ['RESPIRATORY', 'ANTIBACTERIAL', 'CRITICAL_CARE'],
           'Dengue': ['ANALGESIC_ANTIPYRETIC', 'CRITICAL_CARE'], 'Typhoid': ['ANTIBACTERIAL'],
           'Diarrhoeal': ['ANTIPROTOZOAL', 'ANTIBACTERIAL'], 'Leptospirosis': ['ANTIBACTERIAL'], 'Chikungunya': ['ANALGESIC_ANTIPYRETIC'],
           'Typhoon': ['ANTIBACTERIAL', 'ANALGESIC_ANTIPYRETIC', 'ANTIPROTOZOAL']}
doh_path = ROOT / 'datasources/raw/doh/[#DOH-313647129213] Weekly Reported Cases 2021-2025 (1).xlsx'
wb = openpyxl.load_workbook(doh_path, read_only=True)
cases = {k: defaultdict(lambda: defaultdict(float)) for k in SHEETS}  # disease -> geo -> ym
for k, sheets in SHEETS.items():
    for s in sheets:
        for r in wb[s].iter_rows(min_row=2, values_only=True):
            if not r or not all(isinstance(r[i], (int, float)) for i in (0, 1, 4)): continue
            y, w = int(r[0]), int(r[1])
            try: th = date.fromisocalendar(y, w, 4)
            except ValueError: th = date.fromisocalendar(y, 52, 4)
            ym = f'{th.year}-{th.month:02d}'; reg = REGIONS.get((r[2] or '').strip().upper())
            if reg: cases[k][reg][ym] += r[4]; cases[k]['Territory'][ym] += r[4]
YEARS = range(2021, 2026); MONTHS = [f'{mo:02d}' for mo in range(1, 13)]

calendar = []
for k in SHEETS:
    for geo in ['Territory', 'CALABARZON', 'MIMAROPA', 'Bicol']:
        med = [statistics.median(cases[k][geo].get(f'{y}-{mo}', 0.0) for y in YEARS) for mo in MONTHS]
        base = sum(med) / 12
        idx = [round(v / base, 2) if base else None for v in med]
        calendar.append(dict(disease=k, geography=geo, monthly_median_cases=[round(v) for v in med], seasonal_index=idx,
                             surge_months=[i + 1 for i, v in enumerate(idx) if v is not None and v >= 1.20],
                             total_cases_2021_2025=round(sum(cases[k][geo].values())), pandemic_flag=k == 'COVID-19'))

# ---------- PAGASA ----------
tc = []; wbp = openpyxl.load_workbook(ROOT / 'datasources/raw/pagasa/PAR_0km_2021_2024.xlsx', read_only=True)
for r in wbp['Summary'].iter_rows(min_row=2, values_only=True):
    if r and isinstance(r[0], (int, float)) and isinstance(r[4], date): tc.append(dict(name=r[2], type=str(r[3]).strip(), start=r[4]))
tc_by_month = [sum(1 for t in tc if t['start'].month == mo) for mo in range(1, 13)]
strong_months = {f"{t['start'].year}-{t['start'].month:02d}" for t in tc if t['type'] in ('TY', 'STY')}
rain = defaultdict(lambda: defaultdict(float)); seen = defaultdict(set)
for st in ['Science_Garden', 'Port_Area']:
    for r in csv.DictReader((ROOT / f'datasources/raw/pagasa/stations/{st}_Daily_Data.csv').open(encoding='utf-8')):
        v = float(r['RAINFALL'])
        if v == -999.0: continue
        ym = f"{int(r['YEAR'])}-{int(r['MONTH']):02d}"; rain[st][ym] += max(v, 0.0); seen[st].add(ym)
rain_month = []
for mo in MONTHS:
    vals = [rain[st][f'{y}-{mo}'] for st in rain for y in range(2021, 2025) if f'{y}-{mo}' in seen[st]]
    rain_month.append(round(sum(vals) / len(vals), 1) if vals else None)
weather = dict(cyclones_entering_par_by_month=tc_by_month, cyclones_total=len(tc), strong_cyclone_months=sorted(strong_months),
               rainfall_mm_mean_by_month=rain_month, wet_months=[i + 1 for i, v in enumerate(rain_month) if v is not None and v >= 200],
               rainfall_stations='Science Garden + Port Area (Metro Manila proxy)')

# ---------- A. Alerts ----------
def p75(vals):
    s = sorted(vals); pos = 0.75 * (len(s) - 1); lo = int(pos); hi = min(lo + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)
def hit(c, ym):
    prior = [routine[c].get(ym_add(ym, -i), 0.0) for i in range(1, 7)]; base = sum(prior) / 6
    if base <= 0: return None
    return max(routine[c].get(ym, 0.0), routine[c].get(ym_add(ym, 1), 0.0)) >= 1.10 * base
alerts = []
for k in ['ILI', 'SARI', 'Dengue', 'Typhoid', 'Diarrhoeal', 'Leptospirosis', 'Chikungunya', 'Typhoon']:
    window = ([f'{y}-{mo}' for y in range(2023, 2026) for mo in MONTHS] if k != 'Typhoon'
              else [f'{y}-{mo}' for y in range(2021, 2025) for mo in MONTHS if f'{y}-{mo}' >= '2021-02'])
    flags = {}
    for ym in window:
        if k == 'Typhoon': flags[ym] = ym in strong_months
        else:
            earlier = [cases[k]['Territory'].get(f'{y}-{ym[5:]}', 0.0) for y in range(2021, int(ym[:4]))]
            flags[ym] = cases[k]['Territory'].get(ym, 0.0) > p75(earlier)
    tab = [[0, 0], [0, 0]]  # [alert, no alert] x [hit, miss]
    for ym, f in flags.items():
        for c in EXPOSED[k]:
            h = hit(c, ym)
            if h is None: continue
            tab[0 if f else 1][0 if h else 1] += 1
    p = fisher_exact(tab, alternative='greater').pvalue
    ra = tab[0][0] / sum(tab[0]) if sum(tab[0]) else None; rn = tab[1][0] / sum(tab[1]) if sum(tab[1]) else None
    alerts.append(dict(alert=k, exposed=EXPOSED[k], alert_months=sorted(y for y, f in flags.items() if f), table_alert_hit_miss_noalert_hit_miss=tab,
                       hit_rate_alert=None if ra is None else round(ra, 3), hit_rate_no_alert=None if rn is None else round(rn, 3), p_one_sided=p))
order = sorted(range(len(alerts)), key=lambda i: alerts[i]['p_one_sided']); run = 0.0
for rank, i in enumerate(order):
    a = alerts[i]; adj = min(1.0, max(run, (len(alerts) - rank) * a['p_one_sided'])); run = adj
    a['p_holm'] = round(adj, 4); a['p_one_sided'] = round(a['p_one_sided'], 4)
    a['useful'] = adj < 0.05 and a['hit_rate_alert'] is not None and a['hit_rate_no_alert'] is not None and a['hit_rate_alert'] > a['hit_rate_no_alert']

# ---------- S. Scenarios ----------
terr_surge = {c['disease']: c['surge_months'] for c in calendar if c['geography'] == 'Territory'}
scen = []
for c in sorted({x for k, v in EXPOSED.items() if k != 'Typhoon' for x in v}):
    months = sorted({mo for d, v in EXPOSED.items() if d != 'Typhoon' and c in v for mo in terr_surge[d]})
    vals = [routine[c].get(f'{y}-{mo:02d}', 0.0) for y in YEARS for mo in months]
    mean = sum(vals) / len(vals) if vals else 0.0
    scen.append(dict(category=c, surge_months=months, mean_routine_php_in_surge_months=round(mean),
                     extra_stock_php={f'+{u}%': round(mean * u / 100) for u in (20, 40, 60)}))

res = dict(rules_sha256=hashlib.sha256(__doc__.encode('utf-8')).hexdigest(), category_mapping=cmap_path.name,
           category_mapping_sha256=hashlib.sha256(cmap_path.read_bytes()).hexdigest(), doh_sha256=hashlib.sha256(doh_path.read_bytes()).hexdigest(),
           calendar=calendar, weather=weather, alerts=alerts, scenarios=scen)
(OUT / 'results.json').write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding='utf-8')
with (OUT / 'risk_calendar.csv').open('w', newline='', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(['disease', 'geography', 'pandemic_flag', 'surge_months', *[f'idx_{mo}' for mo in MONTHS]])
    for c in calendar: w.writerow([c['disease'], c['geography'], c['pandemic_flag'], ' '.join(map(str, c['surge_months'])), *c['seasonal_index']])
print('rules', res['rules_sha256'][:12], '| mapping', cmap_path.name, res['category_mapping_sha256'][:12])
print('\nC. Territory surge months'); [print(f"  {c['disease']:13} {c['surge_months']}  cases {c['total_cases_2021_2025']}") for c in calendar if c['geography'] == 'Territory']
print('  cyclones by month', tc_by_month, '| wet months', weather['wet_months'], '| rain', rain_month)
print('\nA. Alerts'); [print(f"  {a['alert']:13} n_alert {len(a['alert_months']):2} hit {a['hit_rate_alert']} vs {a['hit_rate_no_alert']} p {a['p_one_sided']} holm {a['p_holm']} useful {a['useful']}") for a in alerts]
print('\nS. Scenarios'); [print(f"  {s['category']:22} months {s['surge_months']} mean PHP {s['mean_routine_php_in_surge_months']:,} {s['extra_stock_php']}") for s in scen]
