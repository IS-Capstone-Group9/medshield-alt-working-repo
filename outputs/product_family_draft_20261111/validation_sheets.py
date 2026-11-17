"""Validation worksheets for family mapping v1, 11 Nov 2026. Reads the candidate mapping only; decides nothing.

1. spot_check_50.csv: 50 multi-label families for a human right/wrong check. 25 = largest by net; 25 = random from the
   remaining multi-label families (seed 20261111). Columns reviewer_verdict (CORRECT / WRONG_MERGE / PARTLY) and note blank.
   Precision estimate = CORRECT share; the random half estimates the long tail, the top half the value-weighted part.
2. generic_worksheet_top100.csv: top 100 medicine families by net with a blank generic_name column for the catalog owner
   (FDA Philippines registration is the authority). label_looks_generic marks names ending in common INN stems; this is a
   hint, not a classification. No generic name is filled in by this script.
Run from repo root:  python -X utf8 outputs/product_family_draft_20261111/validation_sheets.py
"""
from pathlib import Path
from collections import defaultdict
import csv, json, random, re

OUT = Path.cwd() / 'outputs/product_family_draft_20261111'
rows = list(csv.DictReader((OUT / 'family_mapping_v1_candidate.csv').open(encoding='utf-8')))
fam = defaultdict(list)
for r in rows: fam[r['family_v1']].append(r)
net = {f: sum(float(r['label_net_php']) for r in v) for f, v in fam.items()}
multi = sorted((f for f, v in fam.items() if len(v) > 1), key=lambda f: -net[f])
top = multi[:25]; rest = multi[25:]; rnd = random.Random(20261111).sample(rest, 25)

def labels(f): return ' | '.join(r['recorded_label'] for r in sorted(fam[f], key=lambda r: -float(r['label_net_php']))[:8])
with (OUT / 'spot_check_50.csv').open('w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['sample', 'family_v1', 'family_net_php', 'labels_in_family', 'categories', 'labels_up_to_8', 'reviewer_verdict', 'reviewer_note'])
    for sample, fs in (('top_value', top), ('random_tail', rnd)):
        for f in fs: w.writerow([sample, f, f'{net[f]:.2f}', len(fam[f]), '; '.join(sorted({r['product_category'] for r in fam[f]})), labels(f), '', ''])

INN = re.compile(r'(CILLIN|MYCIN|AZOLE|PRIL|SARTAN|STATIN|OLOL|PRAZOLE|FLOXACIN|CEF|CEPH|DIPINE|TIDINE|SONE|LONE|OLONE|AMOL|PROFEN|FENAC|GLIPTIN|FORMIN|ZEPAM|ZOLAM|TRIPTYLINE|SETRON|VIR|CAINE|PHYLLINE|TEROL|SEMIDE|THIAZIDE|PARIN|MAB|MINE|DRINE|CYCLINE|AMIDE|ZOLID|PENEM|BACTAM|ULIN|ONIUM)\b')
meds = [f for f in sorted(fam, key=lambda f: -net[f]) if any(r['product_category'] == 'medicine' for r in fam[f])][:100]
with (OUT / 'generic_worksheet_top100.csv').open('w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['rank', 'family_v1', 'family_net_php', 'example_labels', 'label_looks_generic', 'generic_name', 'fda_registration_ref', 'reviewer_note'])
    for i, f in enumerate(meds, 1):
        w.writerow([i, f, f'{net[f]:.2f}', labels(f)[:160], 'yes' if INN.search(f) else '', '', '', ''])
summary = dict(spot_check=dict(top_value=len(top), random_tail=len(rnd), multi_label_families=len(multi),
                               top_value_share_of_net_pct=100 * sum(net[f] for f in top) / sum(net.values())),
               generic_worksheet=dict(families=len(meds), share_of_net_pct=100 * sum(net[f] for f in meds) / sum(net.values()),
                                      looks_generic=sum(1 for f in meds if INN.search(f))),
               status='worksheets_for_human_review')
(OUT / 'validation_sheets_summary.json').write_text(json.dumps(summary, indent=1)); print(json.dumps(summary, indent=1))
