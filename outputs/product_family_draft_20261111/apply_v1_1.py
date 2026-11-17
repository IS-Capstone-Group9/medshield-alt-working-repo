"""Candidate v1.1 and family ABC-XYZ list, 11 Nov 2026. Offline, read-only. Candidate only; not applied to Gold or models.

v1.1 change: within a family whose name has no formulation marker, labels carrying one (PLUS, FORTE, DUO, COMBI, HCT, MR,
SR, XR, ER) move to '<family> <marker>' because they are a different formulation (combination or modified release).
Adult/pediatric size variants stay together (brand-line definition, like strengths). DEXTROSE PLAIN labels that describe
0.9% sodium chloride are logged as a source naming question; no change.

ABC-XYZ list: classes on calendar 2025 (last full year) at family grain, same rules as the registered tests
(80/95% cumulative positive net; CV of 12 monthly values: X<=0.5<Y<=1.0<Z), plus a handling note per class.
Handling notes are planning suggestions to review, not stock rules.
Run from repo root:  python -X utf8 outputs/product_family_draft_20261111/apply_v1_1.py
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import date
import csv, importlib.util, io, json, re
import numpy as np

ROOT = Path.cwd(); OUT = ROOT / 'outputs/product_family_draft_20261111'
v1 = list(csv.DictReader((OUT / 'family_mapping_v1_candidate.csv').open(encoding='utf-8')))
MARK = re.compile(r'\b(PLUS|FORTE|DUO|COMBI|HCT|MR|SR|XR|ER)\b')
changes = []
for r in v1:
    f, label = r['family_v1'], r['recorded_label'].upper()
    hit = MARK.search(label)
    if hit and not MARK.search(f):
        r['family_v1'] = f'{f} {hit.group(1)}'; r['decision_basis'] = 'split_formulation'; changes.append((label, f, r['family_v1']))
    r['status'] = 'CANDIDATE_V1_1_NOT_APPLIED'
with (OUT / 'family_mapping_v1_1_candidate.csv').open('w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(v1[0])); w.writeheader(); w.writerows(v1)
family = {r['recorded_label']: r['family_v1'] for r in v1}

CODE = ROOT / 'databricks_updated_2/medshield_project/original_source_20261026/02_original_sales_silver_20261026.py'
spec = importlib.util.spec_from_file_location('canonical', CODE); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
bundle = m.original_bundle(ROOT / 'databricks_updated_2/medshield_project_csv'); assessed = m.assess_bundle(bundle['raw'])
pkg = ROOT / 'databricks_updated_2/category_releases/category_b160d6aad4376d64'
master = list(csv.DictReader(io.StringIO((pkg / 'accepted_product_master.csv').read_text(encoding='utf-8-sig'))))
receipt = json.loads((pkg / 'category_acceptance.json').read_bytes()); contract = json.loads((pkg / 'publication_contract.json').read_bytes())
m.validate_inputs(master, receipt, contract)
el = [r for r in m.gold_candidates(assessed, receipt, bundle['files'])['itemized'] if r['is_net_sales_technically_eligible']]
assert sum(Decimal(str(r['net_sales'])) for r in el) == Decimal('638015351.53')
s, cat = defaultdict(lambda: np.zeros(12)), {}
for r in el:
    d = r['date_delivered']; d = d if isinstance(d, date) else date.fromisoformat(str(d)[:10])
    if d.year == 2025:
        f = family[r['normalized_product']]; s[f][d.month - 1] += float(r['net_sales']); cat.setdefault(f, r['product_category'])
pos = {f: v for f, v in s.items() if v.sum() > 0}; total = sum(v.sum() for v in pos.values())
NOTE = {'AX': 'Steady, high value: tight reorder point and regular review',
        'AY': 'High value, variable: reorder point with a larger buffer; monthly review',
        'AZ': 'High value, erratic (often large orders): manual review; plan from known orders',
        'BX': 'Steady, medium value: standard reorder point', 'BY': 'Medium value, variable: standard reorder point, larger buffer',
        'BZ': 'Medium value, erratic: order on demand or keep minimal stock',
        'CX': 'Low value, steady: simple min/max', 'CY': 'Low value, variable: simple min/max', 'CZ': 'Low value, erratic: order on demand'}
rows, run = [], 0.0
for f, v in sorted(pos.items(), key=lambda kv: (-kv[1].sum(), kv[0])):
    abc = 'A' if run < .8 * total else 'B' if run < .95 * total else 'C'; run += v.sum()
    cv = float(v.std() / v.mean()); c = abc + ('X' if cv <= .5 else 'Y' if cv <= 1 else 'Z')
    rows.append(dict(family_v1_1=f, product_category=cat[f], abc_xyz_2025=c, net_2025_php=f'{v.sum():.2f}', share_pct=f'{100 * v.sum() / total:.3f}',
                     months_with_sales=int((v != 0).sum()), cv=f'{cv:.2f}', handling_suggestion=NOTE[c]))
with (OUT / 'family_abc_xyz_2025.csv').open('w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
grid = defaultdict(lambda: [0, 0.0])
for r in rows: grid[r['abc_xyz_2025']][0] += 1; grid[r['abc_xyz_2025']][1] += float(r['share_pct'])
summary = dict(v1_1=dict(families=len(set(family.values())), labels_moved=len(changes), moves=changes,
                         source_questions=['DEXTROSE PLAIN labels describe 0.9% sodium chloride (PNSS)']),
               abc_xyz_2025=dict(families_with_positive_net=len(rows), grid={k: dict(families=n, share_of_net_pct=round(sh, 2)) for k, (n, sh) in sorted(grid.items())}),
               status='candidate_not_applied')
(OUT / 'v1_1_summary.json').write_text(json.dumps(summary, indent=1)); print(json.dumps(summary, indent=1))
