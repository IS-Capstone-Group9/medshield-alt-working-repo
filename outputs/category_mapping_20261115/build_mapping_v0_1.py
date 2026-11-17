"""Therapeutic category mapping, candidate v0.1, 15 Nov 2026. Builds on v0 (file unchanged, hash-pinned by the 15 Nov test).

Changes from v0 (each from a public lookup, none confirmed by the client or the FDA registry itself):
  JUBI R    UNCLASSIFIED -> ANTIVIRAL       remdesivir 100 mg (Jubilant brand JUBI-R); sales only in 2021-2022
  CORBAL    UNCLASSIFIED -> CRITICAL_CARE   hydrocortisone sodium succinate, probable (100/250 mg strengths; name not found in a registry)
  DROXISUR  ANTIBACTERIAL -> CRITICAL_CARE  corrects a v0 error: 'Droxisur 100' is listed as hydrocortisone injection, not cefadroxil
Added columns: atc_group (WHO ATC group at category level, not per product) and demand_basis (why institutions buy the
category; a reading aid, not a tested driver). 24 families stay UNCLASSIFIED.
Run from repo root: python -X utf8 outputs/category_mapping_20261115/build_mapping_v0_1.py
"""
from pathlib import Path
import csv, collections, hashlib

OUT = Path.cwd() / 'outputs/category_mapping_20261115'
DRIVER = {'ANTIVIRAL': 'INFECTION', 'CRITICAL_CARE': 'PROGRAMME_HOSPITAL'}
OVERRIDE = {
    'JUBI R': ('remdesivir 100 mg IV', 'ANTIVIRAL', 'M', 'COVID-19, hospital care', 'v0 unclassified; Jubilant JUBI-R brand, sales 2021-2022 only'),
    'CORBAL': ('hydrocortisone sodium succinate (probable)', 'CRITICAL_CARE', 'M', 'shock / allergy / asthma', 'v0 unclassified; strengths fit, brand name not found in a registry'),
    'DROXISUR': ('hydrocortisone sodium succinate (probable)', 'CRITICAL_CARE', 'M', 'shock / allergy / asthma', 'v0 said cefadroxil; Droxisur 100 is listed as hydrocortisone injection'),
}
ATC = {'ANTIBACTERIAL': 'J01', 'ANTIVIRAL': 'J05', 'ANTIPROTOZOAL': 'J01XD / P01AB', 'RESPIRATORY': 'R03, R05, R06', 'ANALGESIC_ANTIPYRETIC': 'N02, M01',
       'CARDIOVASCULAR': 'C', 'DIABETES': 'A10', 'RENAL_ANEMIA': 'B03', 'CNS': 'N03', 'VACCINE_IMMUNE_SERUM': 'J07, J06', 'OBSTETRIC': 'G02, H01BB, B02BA',
       'ANAESTHETIC': 'N01', 'ANTICOAGULANT': 'B01', 'CRITICAL_CARE': 'H02, C01C, B05, B02, C03', 'GI_ACID_ANTISPASMODIC': 'A02, A03', 'VITAMINS_MINERALS': 'A11, B03',
       'ANTISEPTIC': 'D08'}
BASIS = {'VACCINE_IMMUNE_SERUM': 'Public health programmes (animal-bite treatment, immunization)', 'OBSTETRIC': 'Childbirth and newborn care',
         'ANAESTHETIC': 'Surgery and procedures', 'ANTICOAGULANT': 'Inpatient care', 'CRITICAL_CARE': 'Emergency and intensive care',
         'GI_ACID_ANTISPASMODIC': 'Inpatient and surgical care', 'VITAMINS_MINERALS': 'Supplementation', 'ANTIBACTERIAL': 'Treatment of infection',
         'ANTIVIRAL': 'Treatment of infection', 'ANTIPROTOZOAL': 'Treatment of infection', 'RESPIRATORY': 'Respiratory illness',
         'ANALGESIC_ANTIPYRETIC': 'Pain and fever', 'CARDIOVASCULAR': 'Long-term maintenance', 'DIABETES': 'Long-term maintenance', 'RENAL_ANEMIA': 'Long-term maintenance',
         'CNS': 'Long-term maintenance', 'ANTISEPTIC': 'Infection control', 'PPE_INFECTION_CONTROL': 'Infection control', 'MEDICAL_SUPPLY': 'Procedures and admissions',
         'MEDICAL_EQUIPMENT': 'Facility equipment', 'NON_MEDICAL': 'Non-medical goods (purpose not recorded)', 'UNCLASSIFIED': ''}
rows = list(csv.DictReader((OUT / 'category_mapping_v0_top200.csv').open(encoding='utf-8')))
for r in rows:
    r['change_from_v0'] = ''
    if r['family_v1'] in OVERRIDE:
        g, c, conf, cond, note = OVERRIDE[r['family_v1']]
        r.update(likely_generic=g, category=c, driver=DRIVER[c], confidence=conf, condition=cond, change_from_v0=note)
    r['atc_group'] = ATC.get(r['category'], ''); r['demand_basis'] = BASIS[r['category']]
    r['status'] = 'CANDIDATE_V0_1_AI_INFERRED_NOT_VERIFIED'
assert sum(1 for r in rows if r['change_from_v0']) == 3
path = OUT / 'category_mapping_v0_1_top200.csv'
with path.open('w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
sha = hashlib.sha256(path.read_bytes()).hexdigest(); (OUT / 'mapping_v0_1_sha256.txt').write_text(sha + '\n')
total = 638015351.53; by = collections.defaultdict(float); drv = collections.defaultdict(float)
for r in rows: by[r['category']] += float(r['family_net_php']); drv[r['driver']] += float(r['family_net_php'])
print('sha256', sha[:16], '| unclassified families', sum(1 for r in rows if r['category'] == 'UNCLASSIFIED'), '| confidence', dict(collections.Counter(r['confidence'] for r in rows)))
for k in ('ANTIBACTERIAL', 'ANTIVIRAL', 'CRITICAL_CARE', 'UNCLASSIFIED'): print(f'  {k:16} {by[k]/1e6:6.1f}M {by[k]/total*100:5.1f}%')
print('drivers', {k: f'{v/total*100:.1f}%' for k, v in sorted(drv.items(), key=lambda kv: -kv[1])})
