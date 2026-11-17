"""Draft product families from recorded labels, 11 Nov 2026. Offline, read-only. A DRAFT for human review: rule-based
text normalisation only, no drug dictionary, so brand names are not linked to generics. Nothing is applied to Gold.

Rule: uppercase; drop text in brackets (maker/pack notes); cut at the first strength/size/gauge token
(digits, G24, 5MG, 1L, 12'', size words S/M/L/XL, SMALL/MEDIUM/LARGE, ADULT/PEDIA); drop dosage-form words
(TAB, CAP, AMP, VIAL, SYRUP...); collapse punctuation. The remaining words form the family key.
Run from repo root:  python -X utf8 outputs/product_family_draft_20261111/build.py
"""
from pathlib import Path
from collections import defaultdict
from datetime import date
from decimal import Decimal
import csv, importlib.util, io, json, re

ROOT = Path.cwd(); OUT = ROOT / 'outputs/product_family_draft_20261111'
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

FORMS = r'TABS?|TABLETS?|CAPS?|CAPSULES?|AMPS?|AMPULES?|AMPOULES?|VIALS?|SYRUP|SUSP(ENSION)?|INJ(ECTION)?|SOLN|SOLUTION|DROPS?|CREAM|OINTMENT|BOTTLES?|BOX(ES)?|PCS|PC|PACKS?|STERILE|NON|DISPOSABLE'
CUT = re.compile(r"(\b\d|\bG\d|\b(XXL|XL|XS|S|M|L|SMALL|MEDIUM|LARGE|ADULT|ADULTS|PEDIA|PEDIATRIC|INFANT|NEONATE)\b|'')")
def family(label):
    s = re.sub(r'\([^)]*\)|\[[^]]*\]', ' ', label.upper())
    s = CUT.split(s)[0]
    s = re.sub(rf'\b({FORMS})\b', ' ', s)
    s = re.sub(r'[^A-Z ]+', ' ', s)
    s = ' '.join(s.split())
    return s or label.upper().strip()

net, years = defaultdict(float), defaultdict(lambda: defaultdict(float))
cat = {}
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10])
    k = r['normalized_product']; net[k] += float(r['net_sales']); years[d.year][k] += float(r['net_sales']); cat[k] = r['product_category']
fam = {k: family(k) for k in net}
fam_net, fam_labels = defaultdict(float), defaultdict(list)
for k, v in net.items(): fam_net[fam[k]] += v; fam_labels[fam[k]].append(k)

with (OUT / 'family_draft.csv').open('w', newline='', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(['family_draft', 'family_net_php', 'labels_in_family', 'recorded_label', 'label_net_php', 'product_category', 'review_status'])
    for fk in sorted(fam_net, key=lambda x: -fam_net[x]):
        for k in sorted(fam_labels[fk], key=lambda x: -net[x]):
            w.writerow([fk, f'{fam_net[fk]:.2f}', len(fam_labels[fk]), k, f'{net[k]:.2f}', cat[k], 'DRAFT_NEEDS_REVIEW'])

def a_set(year, key):
    agg = defaultdict(float)
    for k, v in years[year].items(): agg[key(k)] += v
    pos = sorted(((v, g) for g, v in agg.items() if v > 0), reverse=True); tot = sum(v for v, _ in pos); run, out = 0.0, set()
    for v, g in pos:
        if run < .8 * tot: out.add(g)
        run += v
    return out, {g for g, v in agg.items() if v > 0}
churn = {}
for Y in range(2018, 2027):
    if Y - 1 not in years: continue
    row = {}
    for name, key in (('label', lambda k: k), ('family', lambda k: fam[k])):
        a, _ = a_set(Y, key); _, prev = a_set(Y - 1, key)
        row[name] = dict(a_items=len(a), new_share=len(a - prev) / len(a))
    churn[str(Y)] = row
summary = dict(labels=len(net), families=len(fam_net), multi_label_families=sum(1 for v in fam_labels.values() if len(v) > 1),
               top100_family_share=sum(sorted(fam_net.values(), reverse=True)[:100]) / sum(fam_net.values()), a_class_churn=churn,
               status='draft_rule_based_needs_human_review_not_applied')
(OUT / 'summary.json').write_text(json.dumps(summary, indent=1))
print(json.dumps(summary, indent=1))
