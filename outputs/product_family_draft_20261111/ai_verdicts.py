"""Record Claude's AI-assisted verdicts on spot_check_50.csv, 11 Nov 2026 (Adrian asked for help; no human reviewer).

Not independent validation: the same agent built the mapping. Verdicts judge only whether the grouped labels describe one
product line under definition A (brand line: strengths, sizes, forms and makers of one brand or product type together).
They cannot confirm brand identity against FDA Philippines registrations. reviewer_verdict stays blank for a human.
Run from repo root:  python -X utf8 outputs/product_family_draft_20261111/ai_verdicts.py
"""
from pathlib import Path
import csv, json

OUT = Path.cwd() / 'outputs/product_family_draft_20261111'
NOTES = {
    'LACTAMOX': 'Tablets and suspensions of one brand; correct under definition A, split under B',
    'DALAMYCIN': 'Capsule and injection of one brand; correct under definition A, split under B',
    'DEXTROSE PLAIN': 'Grouping consistent (same sodium chloride product, two sizes); family name misleading, source naming question',
    'MUSHROOM': 'Cannot identify the item or whether it belongs in a medical catalog',
    'ACRYLIC OR': 'Cannot identify the item; numbered sizes look like one line but unverified',
}
NOTES.update({'ANIN': 'v1 merged ANIN 50 PLUS (combination product) with ANIN 50; fixed in v1.1',
              'TRIVASC': 'v1 merged TRIVASC MR (modified release) with TRIVASC; fixed in v1.1'})
UNKNOWN = {'MUSHROOM', 'ACRYLIC OR'}
PARTLY_V1 = {'ANIN', 'TRIVASC'}  # the sample was drawn from v1; judged as v1
rows = list(csv.DictReader((OUT / 'spot_check_50.csv').open(encoding='utf-8')))
for r in rows:
    f = r['family_v1']
    r['claude_verdict'] = 'UNKNOWN' if f in UNKNOWN else 'PARTLY' if f in PARTLY_V1 else 'CORRECT'
    r['claude_note'] = NOTES.get(f, 'Same brand or product type at different strengths, sizes, forms or makers')
with (OUT / 'spot_check_50.csv').open('w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
judged = [r for r in rows if r['claude_verdict'] != 'UNKNOWN']
by = {s: [r for r in judged if r['sample'] == s] for s in ('top_value', 'random_tail')}
summary = dict(judged=len(judged), unknown=len(rows) - len(judged), correct=sum(r['claude_verdict'] == 'CORRECT' for r in judged),
               precision_pct=100 * sum(r['claude_verdict'] == 'CORRECT' for r in judged) / len(judged),
               precision_after_v1_1_pct=100 * sum(r['claude_verdict'] in ('CORRECT', 'PARTLY') for r in judged) / len(judged),
               by_sample={s: f"{sum(r['claude_verdict'] == 'CORRECT' for r in v)}/{len(v)}" for s, v in by.items()},
               definition='A_brand_line', reviewer='Claude (AI-assisted, not independent)',
               not_measured='missed merges (e.g. AMBUBAG vs AMBU BAG, NASAL OXYGEN CANNULA variants stay separate)')
(OUT / 'ai_verdict_summary.json').write_text(json.dumps(summary, indent=1)); print(json.dumps(summary, indent=1))
