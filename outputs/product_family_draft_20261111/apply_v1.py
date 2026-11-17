"""Apply the suggested first-pass decisions to the family draft -> candidate mapping v1, 11 Nov 2026.

Decisions applied (from README "Automated first pass"), on Adrian's instruction to proceed with the suggestions:
  merge  HAIXONE WITH DILUENT -> HAIXONE;  EPIX BY -> EPIX
  split  HYCLENS by product line: GARGLE, SKIN CLEANSER (incl. misspelt CLEASER), WOUND CARE (spray/solution), OB WASH;
         others stay HYCLENS
  keep   PPE families separate; IV CANNULA, SYRINGE, GLOVES as broad supply families; BENERVA PLUS / FORTE separate
  note   SANOMAX FA and XED category inconsistency is a catalog correction request; the accepted master is NOT edited here
Candidate only: not applied to Gold, models or the dashboard.
Run from repo root:  python -X utf8 outputs/product_family_draft_20261111/apply_v1.py
"""
from pathlib import Path
import csv, json
from collections import defaultdict

OUT = Path.cwd() / 'outputs/product_family_draft_20261111'
rows = list(csv.DictReader((OUT / 'family_draft.csv').open(encoding='utf-8')))
MERGE = {'HAIXONE WITH DILUENT': 'HAIXONE', 'EPIX BY': 'EPIX'}

def decide(row):
    f, label = row['family_draft'], row['recorded_label'].upper()
    if f in MERGE: return MERGE[f], 'merged'
    if f.startswith('HYCLENS'):
        if 'GARGLE' in label: return 'HYCLENS GARGLE', 'split_product_line'
        if 'SKIN' in label or 'CLEANSER' in label or 'CLEASER' in label: return 'HYCLENS SKIN CLEANSER', 'split_product_line'
        if 'WOUND' in label or 'SPRAY' in label: return 'HYCLENS WOUND CARE', 'split_product_line'
        if ' OB' in label: return 'HYCLENS OB WASH', 'split_product_line'
    return f, 'draft_kept'

out, fam_net = [], defaultdict(float)
for r in rows:
    family, basis = decide(r)
    fam_net[family] += float(r['label_net_php'])
    out.append(dict(recorded_label=r['recorded_label'], family_v1=family, decision_basis=basis, product_category=r['product_category'],
                    label_net_php=r['label_net_php'], status='CANDIDATE_V1_NOT_APPLIED'))
with (OUT / 'family_mapping_v1_candidate.csv').open('w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0])); w.writeheader(); w.writerows(sorted(out, key=lambda x: (-fam_net[x['family_v1']], x['family_v1'], x['recorded_label'])))
changed = [o for o in out if o['decision_basis'] != 'draft_kept']
summary = dict(labels=len(out), families_v1=len(fam_net), labels_changed=len(changed),
               changed_by_basis={b: sum(1 for o in changed if o['decision_basis'] == b) for b in {o['decision_basis'] for o in changed}},
               hyclens_families=sorted({o['family_v1'] for o in out if o['family_v1'].startswith('HYCLENS')}),
               catalog_corrections_requested=['SANOMAX FA: one product, two categories', 'XED: one product, two categories'],
               status='candidate_v1_not_applied')
(OUT / 'mapping_v1_summary.json').write_text(json.dumps(summary, indent=1)); print(json.dumps(summary, indent=1))
