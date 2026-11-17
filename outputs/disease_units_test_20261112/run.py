"""Disease intensity vs units of disease-linked medicines, 12 Nov 2026. Offline, read-only, ONE pre-registered test.

Decision 016 approves DOH-derived DII for analysis. REGISTERED BEFORE RUNNING (hash stored in results.json):
Data: DII snapshot from release 5df98130b9ec13ef (dii_snapshot.json; dengue, typhoid, leptospirosis, cholera per 100,000);
original itemized Gold reproduction (contracts excluded, PHP 638,015,351.53), recorded quantity, delivery labels mapped to
provinces by the confirmed regional mapping (ALBAY has no DII and drops out). Months 2018-01..2025-12 where DII exists.
Disease-to-medicine links (assumptions from standard treatment, matched on label text, uppercase, whole words):
  dengue        -> IV fluids (DEXTROSE, SODIUM CHLORIDE, PNSS, NSS, LACTATED, RINGER, D5LR, D5NM, D5W, PLR) and PARACETAMOL
  typhoid       -> CIPROFLOXACIN, CEFTRIAXONE, AZITHROMYCIN, CHLORAMPHENICOL, CEFIXIME, OFLOXACIN
  leptospirosis -> DOXYCYCLINE, PENICILLIN, AMPICILLIN, CEFTRIAXONE
  cholera       -> ORS, ORAL REHYDRATION and the IV-fluid keywords
Brand-only labels cannot be matched; label coverage is reported.
Test per disease and lag L in {1, 2} months (8 tests): panel of territory-months. y = log(1 + units of the linked medicines
delivered to the territory in month t); x = log(1 + DII in month t - L). Both demeaned within territory-year (removes
territory level and the multi-year trend). Statistic: Spearman correlation of demeaned x and y. p-value: 2,000
permutations that circularly shift x within each territory (keeps autocorrelation), seed 20261112, one-sided (positive).
Pass: p < 0.05 / 8 (Bonferroni) AND rho > 0, with at least 60 territory-months that have any linked units.
A pass is an association in retrospective data, not causation, and authorizes no forecast or dashboard change.
Run from repo root:  python -X utf8 outputs/disease_units_test_20261112/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json, random, re
import numpy as np

REGISTRATION = __doc__.split('Run from')[0]
ROOT = Path.cwd(); OUT = ROOT / 'outputs/disease_units_test_20261112'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
el = [r for r in m.gold_candidates(assessed, receipt, bundle['files'])['itemized'] if r['is_net_sales_technically_eligible']]
assert sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')

mapping = json.loads((ROOT / 'databricks_updated_2/medshield_project/references/regional_delivery_mapping_4c5f44013464395e.json').read_text())
province = {x['recorded_label']: x['province'].upper().replace(' ', '-') for x in mapping['mappings']}
FLUIDS = ['DEXTROSE', 'SODIUM CHLORIDE', 'PNSS', 'NSS', 'LACTATED', 'RINGER', 'D5LR', 'D5NM', 'D5W', 'PLR']
LINKS = {'Dengue': FLUIDS + ['PARACETAMOL'], 'Typhoid Fever': ['CIPROFLOXACIN', 'CEFTRIAXONE', 'AZITHROMYCIN', 'CHLORAMPHENICOL', 'CEFIXIME', 'OFLOXACIN'],
         'Leptospirosis': ['DOXYCYCLINE', 'PENICILLIN', 'AMPICILLIN', 'CEFTRIAXONE'], 'Cholera': ['ORS', 'ORAL REHYDRATION'] + FLUIDS}
pattern = {d: re.compile(r'\b(' + '|'.join(re.escape(k) for k in ks) + r')\b') for d, ks in LINKS.items()}

dii = defaultdict(dict)  # (disease, territory_id) -> {month: value}
snap = json.loads((OUT / 'dii_snapshot.json').read_text())
for r in snap['rows']:
    dii[(r['signal'].replace(' DII per 100k', ''), r['territory_id'])][r['calendar_month']] = float(r['v'])
territories = sorted({t for _, t in dii})
months = [f'{y}-{mo:02d}' for y in range(2018, 2026) for mo in range(1, 13)]

units = {d: defaultdict(float) for d in LINKS}; matched_labels = {d: set() for d in LINKS}
for r in el:
    area = (r['area'] or '').strip().upper()
    if area not in province or r['recorded_quantity'] is None: continue
    tid = 'PH-PROVINCE-' + province[area]
    d0 = r['date_delivered']; d0 = d0 if isinstance(d0, date) else date.fromisoformat(str(d0)[:10]); ym = f'{d0.year}-{d0.month:02d}'
    for d, pat in pattern.items():
        if pat.search(r['normalized_product'] or ''):
            units[d][(tid, ym)] += float(r['recorded_quantity']); matched_labels[d].add(r['normalized_product'])

def demean(values, keys):
    groups = defaultdict(list)
    for v, (t, ym) in zip(values, keys): groups[(t, ym[:4])].append(v)
    means = {g: np.mean(v) for g, v in groups.items()}
    return np.array([v - means[(t, ym[:4])] for v, (t, ym) in zip(values, keys)])
def spearman(a, b):
    ra, rb = np.argsort(np.argsort(a)), np.argsort(np.argsort(b)); return float(np.corrcoef(ra, rb)[0, 1])

ALPHA = 0.05 / 8
res = {'registration_sha256': hashlib.sha256(REGISTRATION.encode()).hexdigest(), 'dii_release': snap['release'],
       'territories': territories, 'bonferroni_alpha': ALPHA, 'tests': {}}
for d in LINKS:
    for L in (1, 2):
        keys, xs, ys = [], [], []
        for t in territories:
            series = dii.get((d, t), {})
            for i, ym in enumerate(months):
                if i < L or months[i - L] not in series: continue
                keys.append((t, ym)); xs.append(np.log1p(series[months[i - L]])); ys.append(np.log1p(units[d].get((t, ym), 0.0)))
        nonzero = sum(1 for y in ys if y > 0)
        if len(keys) < 24 or nonzero < 60:
            res['tests'][f'{d} lag{L}'] = dict(cases=len(keys), months_with_units=nonzero, result='INSUFFICIENT', passes=False); continue
        x, y = demean(xs, keys), demean(ys, keys); rho = spearman(x, y)
        by_t = defaultdict(list)
        for i, (t, _) in enumerate(keys): by_t[t].append(i)
        rng, hits = random.Random(20261112), 0
        for _ in range(2000):
            xp = x.copy()
            for idx in by_t.values():
                k = rng.randrange(len(idx)); xp[idx] = np.roll(x[idx], k)
            hits += spearman(xp, y) >= rho
        p = (hits + 1) / 2001
        res['tests'][f'{d} lag{L}'] = dict(cases=len(keys), months_with_units=nonzero, rho=rho, p_one_sided=p, passes=bool(rho > 0 and p < ALPHA))
res['matched_labels'] = {d: len(v) for d, v in matched_labels.items()}
res['matched_label_examples'] = {d: sorted(v)[:8] for d, v in matched_labels.items()}
(OUT / 'results.json').write_text(json.dumps(res, indent=1)); print(json.dumps({k: v for k, v in res.items() if k != 'matched_label_examples'}, indent=1))
