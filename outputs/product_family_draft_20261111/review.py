"""First-pass automated review of the top 150 draft families, 11 Nov 2026. Reads family_draft.csv only.
Flags for a human to decide; changes nothing and approves nothing.

Flags:
  MIXED_CATEGORY   labels in the family carry more than one product_category (likely different products merged)
  GENERIC_KEY      family key is a broad word (e.g. IV, SURGICAL, GLOVES) shared by unrelated items
  SHORT_KEY        key of 1-3 letters (abbreviation; easy to over-merge)
  MANY_VARIANTS    more than 8 labels (check that strengths/forms are one product line)
  POSSIBLE_SPLIT   another top family starts with the same first word (may be the same product named differently)
Families with no flag are marked LIKELY_OK (still the reviewer's call).
Run from repo root:  python -X utf8 outputs/product_family_draft_20261111/review.py
"""
from pathlib import Path
from collections import defaultdict
import csv, json

OUT = Path.cwd() / 'outputs/product_family_draft_20261111'
rows = list(csv.DictReader((OUT / 'family_draft.csv').open(encoding='utf-8')))
fam = defaultdict(list)
for r in rows: fam[r['family_draft']].append(r)
order = sorted(fam, key=lambda f: -float(fam[f][0]['family_net_php']))
total = sum(float(fam[f][0]['family_net_php']) for f in fam)
top = order[:150]
GENERIC = {'IV', 'SURGICAL', 'GLOVES', 'GLOVE', 'MASK', 'FACE', 'SYRINGE', 'NEEDLE', 'CANNULA', 'SET', 'TUBE', 'BAG', 'BOX',
           'MEDICAL', 'HOSPITAL', 'EXAMINATION', 'GAUZE', 'COTTON', 'ALCOHOL', 'TAPE', 'BANDAGE', 'CATHETER', 'KIT', 'BED', 'CHAIR'}
first = defaultdict(list)
for f in top: first[f.split()[0]].append(f)
out = []
for f in top:
    labels = fam[f]; words = f.split(); flags = []
    if len({r['product_category'] for r in labels}) > 1: flags.append('MIXED_CATEGORY')
    if words[0] in GENERIC or (len(words) == 1 and words[0] in GENERIC): flags.append('GENERIC_KEY')
    if len(f.replace(' ', '')) <= 3: flags.append('SHORT_KEY')
    if len(labels) > 8: flags.append('MANY_VARIANTS')
    if len(first[words[0]]) > 1: flags.append('POSSIBLE_SPLIT')
    out.append(dict(rank=len(out) + 1, family_draft=f, family_net_php=labels[0]['family_net_php'], share_of_net_pct=f"{100 * float(labels[0]['family_net_php']) / total:.2f}",
                    labels=len(labels), categories='; '.join(sorted({r['product_category'] for r in labels})),
                    example_labels=' | '.join(r['recorded_label'] for r in labels[:4]), flags='; '.join(flags) or 'LIKELY_OK',
                    reviewer_decision='', reviewer_note=''))
with (OUT / 'family_review_top150.csv').open('w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
counts = defaultdict(int)
for r in out:
    for flag in r['flags'].split('; '): counts[flag] += 1
summary = dict(families_reviewed=len(out), share_of_net_pct=sum(float(r['share_of_net_pct']) for r in out),
               likely_ok=sum(1 for r in out if r['flags'] == 'LIKELY_OK'), flag_counts=dict(counts),
               status='automated_first_pass_needs_human_decision')
(OUT / 'review_summary.json').write_text(json.dumps(summary, indent=1)); print(json.dumps(summary, indent=1))
