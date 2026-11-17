"""Category-level disease link and seasonality test, 15 Nov 2026. Offline, read-only. Rules fixed before the first run.

Inputs: original itemized sales (contracts excluded), family mapping v1.1, category mapping v0 (top 200 families,
H/M confidence only; L and families outside the top 200 are excluded). DOH weekly reported cases 2021-2025, 15 diseases.
Disease months: morbidity week w of year y is assigned to the month of the Thursday of ISO week w (weeks 53 included).
Territory = REGION IV-A (CALABARZON) + MIMAROPA REGION + REGION V (BICOL REGION); national = all regions (sensitivity).
Sales: monthly ROUTINE net per category (documents >= PHP 500k removed); TOTAL net reported as a sensitivity.
Window: 2021-01..2025-12 (60 months; all recorded).

T1 disease link (pre-registered pairs, disease -> category):
  ILI -> RESPIRATORY, ANTIBACTERIAL | SARI -> RESPIRATORY, ANTIBACTERIAL, CRITICAL_CARE
  COVID-19 -> PPE_INFECTION_CONTROL, CRITICAL_CARE, ANTICOAGULANT | Dengue -> ANALGESIC_ANTIPYRETIC, CRITICAL_CARE
  Typhoid -> ANTIBACTERIAL | Diarrhoeal (ABD + Rotavirus + Cholera) -> ANTIPROTOZOAL, ANTIBACTERIAL
  Leptospirosis -> ANTIBACTERIAL | Rabies -> VACCINE_IMMUNE_SERUM | Chikungunya -> ANALGESIC_ANTIPYRETIC
  Metric: Spearman correlation of month-over-month change in log(1 + value), disease at lag 0 and lag 1 (disease month
  before sales month). One-sided p (positive link) from the Spearman t approximation. Holm correction over all
  pairs x lags x 2 geographies of the ROUTINE series. A link is SUPPORTED only if Holm-adjusted p < 0.05 and rho > 0.
  Descriptive extra: correlation of the 12 calendar-month mean profiles (not a test).
T2 seasonality of each category's routine sales, 2020-01..2026-09: statistic = variance of calendar-month means of
  log(1 + monthly net); null = permute months within each year, 5000 draws, seed 20261115; Holm over categories with
  at least PHP 1M routine sales; SEASONAL only if Holm-adjusted p < 0.05.
Retrospective; authorizes no purchase. Mapping is a candidate (AI-inferred), so results are candidate evidence.
Run from repo root:  python -X utf8 outputs/category_disease_test_20261115/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json, math, random
import openpyxl
from scipy.stats import spearmanr, t as tdist

ROOT = Path.cwd(); OUT = ROOT / 'outputs/category_disease_test_20261115'
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
cmap_path = ROOT / 'outputs/category_mapping_20261115/category_mapping_v0_top200.csv'
cat = {r['family_v1']: r['category'] for r in csv.DictReader(cmap_path.open(encoding='utf-8')) if r['confidence'] in ('H', 'M')}

docs = defaultdict(float); rows = []
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10]); ym = f'{d.year}-{d.month:02d}'
    rows.append((ym, r['dr_number'], float(r['net_sales']), cat.get(family[r['normalized_product']])))
    if r['dr_number']: docs[(ym, r['dr_number'])] += float(r['net_sales'])
routine = defaultdict(lambda: defaultdict(float)); total = defaultdict(lambda: defaultdict(float))
for ym, dr, net, c in rows:
    if c is None: continue
    total[c][ym] += net
    if not (dr and docs[(ym, dr)] >= 500_000): routine[c][ym] += net

TERR = {'REGION IV-A (CALABARZON)', 'MIMAROPA REGION', 'REGION V (BICOL REGION)'}
SHEETS = {'ILI': ['Pan-respi_ILI'], 'SARI': ['Pan-respi_SARI'], 'COVID-19': ['Pan-respi_COVID-19'], 'Dengue': ['MBD_Dengue'],
          'Typhoid': ['FWBD_Typhoid'], 'Diarrhoeal': ['FWBD_ABD', 'FWBD_Rotavirus', 'FWBD_Cholera'], 'Leptospirosis': ['Zoo_Leptospirosis'],
          'Rabies': ['Zoo_Rabies'], 'Chikungunya': ['MBD_Chikungunya']}
PAIRS = [('ILI', 'RESPIRATORY'), ('ILI', 'ANTIBACTERIAL'), ('SARI', 'RESPIRATORY'), ('SARI', 'ANTIBACTERIAL'), ('SARI', 'CRITICAL_CARE'),
         ('COVID-19', 'PPE_INFECTION_CONTROL'), ('COVID-19', 'CRITICAL_CARE'), ('COVID-19', 'ANTICOAGULANT'),
         ('Dengue', 'ANALGESIC_ANTIPYRETIC'), ('Dengue', 'CRITICAL_CARE'), ('Typhoid', 'ANTIBACTERIAL'),
         ('Diarrhoeal', 'ANTIPROTOZOAL'), ('Diarrhoeal', 'ANTIBACTERIAL'), ('Leptospirosis', 'ANTIBACTERIAL'),
         ('Rabies', 'VACCINE_IMMUNE_SERUM'), ('Chikungunya', 'ANALGESIC_ANTIPYRETIC')]
wb = openpyxl.load_workbook(ROOT / 'datasources/raw/doh/[#DOH-313647129213] Weekly Reported Cases 2021-2025 (1).xlsx', read_only=True)
dis = {g: {'territory': defaultdict(float), 'national': defaultdict(float)} for g in ('territory', 'national') for _ in [0]}
dis = {k: {'territory': defaultdict(float), 'national': defaultdict(float)} for k in SHEETS}
for k, sheets in SHEETS.items():
    for s in sheets:
        for r in wb[s].iter_rows(min_row=2, values_only=True):
            if not r or not isinstance(r[0], (int, float)) or not isinstance(r[1], (int, float)) or not isinstance(r[4], (int, float)): continue
            y, w = int(r[0]), int(r[1])
            try: th = date.fromisocalendar(y, w, 4)
            except ValueError: th = date.fromisocalendar(y, 52, 4)
            ym = f'{th.year}-{th.month:02d}'
            dis[k]['national'][ym] += r[4]
            if (r[2] or '').strip().upper() in TERR: dis[k]['territory'][ym] += r[4]
months = [f'{y}-{mo:02d}' for y in range(2021, 2026) for mo in range(1, 13)]

def dlog(series): v = [math.log1p(max(series.get(k, 0.0), 0.0)) for k in months]; return [v[i] - v[i - 1] for i in range(1, len(v))]
def one_sided(rho, n):
    if rho >= 1: return 0.0
    tt = rho * math.sqrt((n - 2) / (1 - rho * rho)); return float(1 - tdist.cdf(tt, n - 2))
tests = []
for d, c in PAIRS:
    for geo in ('territory', 'national'):
        x = dlog(dis[d][geo]); y = dlog(routine[c]); yt = dlog(total[c])
        for lag in (0, 1):
            xs, ys, yts = (x, y, yt) if lag == 0 else (x[:-1], y[1:], yt[1:])
            rho = spearmanr(xs, ys).statistic; rho_t = spearmanr(xs, yts).statistic
            prof_d = [sum(dis[d][geo].get(f'{yy}-{mo:02d}', 0) for yy in range(2021, 2026)) for mo in range(1, 13)]
            prof_s = [sum(routine[c].get(f'{yy}-{mo:02d}', 0) for yy in range(2021, 2026)) for mo in range(1, 13)]
            tests.append(dict(disease=d, category=c, geography=geo, lag=lag, n=len(xs), rho_routine=round(rho, 3), p_one_sided=one_sided(rho, len(xs)),
                              rho_total_sensitivity=round(rho_t, 3), calendar_profile_rho=round(spearmanr(prof_d, prof_s).statistic, 3),
                              disease_cases=round(sum(dis[d][geo].get(k, 0) for k in months)), routine_sales=round(sum(routine[c].get(k, 0) for k in months))))
order = sorted(range(len(tests)), key=lambda i: tests[i]['p_one_sided']); mcount = len(tests); running = 0.0
for rank, i in enumerate(order):
    adj = min(1.0, max(running, (mcount - rank) * tests[i]['p_one_sided'])); running = adj
    tests[i]['p_holm'] = round(adj, 4); tests[i]['p_one_sided'] = round(tests[i]['p_one_sided'], 4)
    tests[i]['supported'] = adj < 0.05 and tests[i]['rho_routine'] > 0

smonths = [f'{y}-{mo:02d}' for y in range(2020, 2027) for mo in range(1, 13) if f'{y}-{mo:02d}' <= '2026-09']
def cal_stat(vals):
    cm = defaultdict(list)
    for k, v in vals.items(): cm[k[5:]].append(v)
    means = [sum(v) / len(v) for v in cm.values()]; mu = sum(means) / len(means)
    return sum((a - mu) ** 2 for a in means) / len(means), {k: sum(v) / len(v) for k, v in sorted(cm.items())}
seas = []; rng = random.Random(20261115)
for c, s in routine.items():
    if sum(s.get(k, 0) for k in smonths) < 1_000_000: continue
    vals = {k: math.log1p(max(s.get(k, 0.0), 0.0)) for k in smonths}; obs, prof = cal_stat(vals)
    byy = defaultdict(list)
    for k in smonths: byy[k[:4]].append(k)
    ge = 0
    for _ in range(5000):
        perm = {}
        for ks in byy.values():
            v = [vals[k] for k in ks]; rng.shuffle(v); perm.update(zip(ks, v))
        if cal_stat(perm)[0] >= obs: ge += 1
    top = sorted(prof.items(), key=lambda kv: -kv[1])[:3]
    seas.append(dict(category=c, routine_sales=round(sum(s.get(k, 0) for k in smonths)), p=(ge + 1) / 5001, peak_months=[k for k, _ in top]))
seas.sort(key=lambda r: r['p']); running = 0.0
for rank, r in enumerate(seas):
    adj = min(1.0, max(running, (len(seas) - rank) * r['p'])); running = adj; r['p_holm'] = round(adj, 4); r['p'] = round(r['p'], 4); r['seasonal'] = adj < 0.05

res = dict(rules_sha256=hashlib.sha256(__doc__.encode('utf-8')).hexdigest(), category_mapping_sha256=hashlib.sha256(cmap_path.read_bytes()).hexdigest(),
           tests=len(tests), supported=[t for t in tests if t['supported']], T1=tests, T2=seas)
(OUT / 'results.json').write_text(json.dumps(res, indent=1, ensure_ascii=False))
print('rules', res['rules_sha256'][:12], '| mapping', res['category_mapping_sha256'][:12], '| tests', len(tests), '| supported', len(res['supported']))
for t in sorted(tests, key=lambda t: t['p_one_sided'])[:20]:
    print(f"  {t['disease']:13} -> {t['category']:22} {t['geography']:9} lag{t['lag']} rho {t['rho_routine']:+.3f} p {t['p_one_sided']:.4f} holm {t['p_holm']:.3f} | total {t['rho_total_sensitivity']:+.3f} | calendar {t['calendar_profile_rho']:+.2f}")
print('\nT2 seasonality')
for r in seas: print(f"  {r['category']:24} p {r['p']:.4f} holm {r['p_holm']:.3f} seasonal {r['seasonal']} peaks {r['peak_months']}")
