"""D3 large-document split study, 11 Nov 2026. Offline, read-only, retrospective (all months already inspected).

Registered before running (hash of REGISTRATION printed and stored):
  * Split: documents (month, DR) with net >= 500,000 PHP are 'large'; everything else, incl. rows without a DR, is 'base'.
  * Reference: company mean_6 on the total (selected reference).
  * Challengers for the TOTAL = base forecast + large forecast, where large forecast = trailing-12 mean of large
    (expected value of lumpy orders). Base methods: mean_3, mean_6, median_6, seasonal_naive_12.
  * Same origins as the 6 Nov rolling study (origin index >= 23), leads 1/3/6, window 2020-01..2026-09.
  * Win rule (unchanged): 90% moving-block bootstrap (block 6, 2000 draws, seed 20261111) of the mean paired
    absolute-error difference challenger - reference lies wholly below zero, |normalized bias| <= 5%, and the
    WAPE difference has the same sign in both halves of the cases.
Run from repo root:  python -X utf8 outputs/large_document_split_20261111/run.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, hashlib, importlib.util, io, json, random, statistics as st

REGISTRATION = __doc__.split('Run from')[0]
ROOT = Path.cwd()
OUT = ROOT / 'outputs/large_document_split_20261111'
SOURCE = ROOT / 'databricks_updated_2/medshield_project_csv'
CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
sha = lambda b: hashlib.sha256(b).hexdigest()

spec = importlib.util.spec_from_file_location('canonical', CODE)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(SOURCE)
assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes())
contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
items = m.gold_candidates(assessed, receipt, bundle['files'])['itemized']
el = [r for r in items if r['is_net_sales_technically_eligible']]
assert len(items) == 40171 and sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')

months, doc, nodr = None, defaultdict(float), defaultdict(float)
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10])
    ym = f'{d.year}-{d.month:02d}'
    if not ('2020-01' <= ym <= '2026-09'): continue
    if r['dr_number']: doc[(ym, r['dr_number'])] += float(r['net_sales'])
    else: nodr[ym] += float(r['net_sales'])
months = sorted({p for p, _ in doc} | set(nodr)); assert len(months) == 81
base, large = defaultdict(float, nodr), defaultdict(float)
for (p, _), v in doc.items():
    (large if v >= 500_000 else base)[p] += v
B = [base[p] for p in months]; L = [large[p] for p in months]; T = [b + l for b, l in zip(B, L)]

def pt(y, o, method):
    if method == 'mean_3': return sum(y[o-2:o+1]) / 3
    if method == 'mean_6': return sum(y[o-5:o+1]) / 6
    if method == 'median_6': return st.median(y[o-5:o+1])
    if method == 'seasonal_naive_12': return None  # needs the lead; handled below
    if method == 'mean_12': return sum(y[o-11:o+1]) / 12
    raise ValueError(method)

def fc(y, o, lead, method):
    return y[o + lead - 12] if method == 'seasonal_naive_12' else pt(y, o, method)

def score(pairs):
    act = sum(abs(a) for _, a in pairs)
    return dict(cases=len(pairs), wape=sum(abs(f-a) for f, a in pairs)/act, bias=sum(f-a for f, a in pairs)/act)

def boot(diff, seed=20261111, block=6, draws=2000):
    rng, n, means = random.Random(seed), len(diff), []
    for _ in range(draws):
        s = []
        while len(s) < n:
            i = rng.randrange(n); s.extend(diff[i:i+block])
        means.append(st.mean(s[:n]))
    means.sort(); return means[int(.05*draws)], means[int(.95*draws)-1]

res = {'registration_sha256': sha(REGISTRATION.encode()), 'split': {
    'large_documents': sum(1 for v in doc.values() if v >= 500_000), 'large_share': sum(L)/sum(T),
    'base_cv': st.pstdev(B)/st.mean(B), 'total_cv': st.pstdev(T)/st.mean(T)}, 'leads': {}}
assert abs(sum(T) - (sum(doc.values()) + sum(nodr.values()))) < 1e-3
for lead in (1, 3, 6):
    origins = range(23, len(months) - lead)
    ref = [(pt(T, o, 'mean_6'), T[o+lead]) for o in origins]
    row = {'reference_total_mean_6': score(ref), 'base_only': {}, 'total_via_split': {}}
    for meth in ('mean_3', 'mean_6', 'median_6', 'seasonal_naive_12'):
        row['base_only'][meth] = score([(fc(B, o, lead, meth), B[o+lead]) for o in origins])
        ch = [(fc(B, o, lead, meth) + pt(L, o, 'mean_12'), T[o+lead]) for o in origins]
        s = score(ch)
        diff = [abs(c[0]-c[1]) - abs(r[0]-r[1]) for c, r in zip(ch, ref)]
        lo, hi = boot(diff); h = len(diff)//2
        halves = [sum(diff[:h]), sum(diff[h:])]
        s.update(rel_wape_change=s['wape']/row['reference_total_mean_6']['wape']-1, boot90=[lo, hi],
                 halves_same_sign=(halves[0] < 0) == (halves[1] < 0),
                 passes=hi < 0 and abs(s['bias']) <= .05 and halves[0] < 0 and halves[1] < 0)
        row['total_via_split'][meth] = s
    res['leads'][f'lead{lead}'] = row
(OUT / 'results.json').write_text(json.dumps(res, indent=1))
print(json.dumps(res, indent=1))
