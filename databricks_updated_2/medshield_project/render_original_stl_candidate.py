"""Build the self-contained immutable candidate notebook from already verified exports."""
import argparse
import ast
import csv
import hashlib
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parent
ROOT = PROJECT.parents[1]
EVIDENCE = ROOT / 'outputs/original_monthly_stl_20261027'
REVIEW = PROJECT / 'maintenance/20261027_original_itemized_stl_review.py'
CORE = PROJECT / 'original_stl_candidate.py'
TARGET = PROJECT / 'maintenance/20261027_stage_original_itemized_stl.ipynb'


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')).hexdigest()


def reviewed_package():
    # The exported values are evidence inputs to this offline preparation only.
    # Databricks staging revalidates Gold and the immutable bundled package.
    export_report = json.loads((EVIDENCE / 'remote-export-verification.json').read_text(encoding='utf-8'))
    assert export_report['status'] == 'PASS_REMOTE_STL_EXPORT_PARITY'
    downloads = Path.home() / 'Downloads'
    exports = {}
    for item in export_report['exports']:
        payload = (downloads / item['file']).read_bytes()
        assert hashlib.sha256(payload).hexdigest() == item['sha256']
        exports[item['kind']] = list(csv.DictReader(payload.decode('utf-8-sig').splitlines()))
    monthly_path = downloads / '20261027_original_monthly_review.csv'
    monthly_report = json.loads((EVIDENCE / 'export-review.json').read_text(encoding='utf-8'))
    assert hashlib.sha256(monthly_path.read_bytes()).hexdigest() == monthly_report['input_sha256']
    monthly = list(csv.DictReader(monthly_path.read_text(encoding='utf-8-sig').splitlines()))
    local = json.loads((EVIDENCE / 'local-stl-review.json').read_text(encoding='utf-8'))
    calendar = [{**row, 'net_sales_php': None if row['net_sales_php'].lower() in ('', 'null', 'none', 'nan')
                 else row['net_sales_php']} for row in exports['calendar']]
    assert calendar == local['calendar']
    return {'policy': 'original_itemized_stl_export_candidate_v1', 'source': export_report['source_identity'],
            'method': {'name': 'STL', 'period': 12, 'seasonal_window': 13, 'robust': True,
                       'minimum_contiguous_months': 36, 'missing_policy': 'no_imputation_split_at_gaps',
                       'statsmodels_version': '0.14.6', 'numpy_version': '2.3.4'},
            'source_export_hashes': {item['kind']: item['sha256'] for item in export_report['exports']},
            'monthly_rows': monthly, 'calendar': calendar, 'components': exports['components'],
            'contracts_excluded': True, 'financial_release_approved': False, 'model_publication_approved': False}


def cell(kind, text, index):
    result = {'cell_type': kind, 'id': 'original-stl-' + str(index), 'metadata': {}, 'source': text.splitlines(keepends=True)}
    if kind == 'code':
        result.update(execution_count=None, outputs=[])
    return result


def build(package):
    review_source = REVIEW.read_text(encoding='utf-8')
    review_ast = ast.parse(review_source)
    snippets = []
    for node in review_ast.body:
        if isinstance(node, (ast.Import, ast.ImportFrom, ast.Assign)) or isinstance(node, ast.FunctionDef) and node.name != 'decompose_review':
            snippets.append(ast.get_source_segment(review_source, node))
    review_code = '\n\n'.join(snippets) + '\n'
    package_hash = digest(package)
    core = CORE.read_text(encoding='utf-8')
    definitions = 'PACKAGE = json.loads(' + repr(json.dumps(package, ensure_ascii=False, separators=(',', ':'))) + ')\n'
    definitions += 'PACKAGE_SHA256 = ' + repr(package_hash) + '\n'
    definitions += 'VERIFIED_EXPORT_HASHES = ' + repr(package['source_export_hashes']) + '\n'
    sections = [
        ('markdown', '# Save verified original-itemized STL as an isolated Gold candidate\n\n'
         '**This notebook creates one new release-specific Delta candidate table (202 records).** '
         'It does not update source Gold, approvals, live dashboard readers or model pointers. '
         'An identical rerun verifies existing data without rewriting; differing existing data stops.\n\n'
         'The reviewed calendar/components are bundled in this notebook, checked against current pinned '
         'Gold inputs before any write. It does not fit a model or require statsmodels, CSV uploads or helper files. '
         'This is retrospective diagnostic STL, not a forecast or verified SKU demand.\n'),
        ('code', review_code),
        ('markdown', '## Checked result package and immutable candidate writer\n'
         'The package binds the supplied remote exports, monthly input and exact source/method identity.\n'),
        ('code', definitions + '\n' + core),
        ('markdown', '## Create candidate and verify exact readback\n'
         'Run this cell to create the isolated candidate or verify its identical existing Delta0 contents. '
         'A mismatch stops without an overwrite. Keep the receipt output for the next gateway integration step.\n'),
        ('code', '_stl_candidate_receipt = stage_original_stl_candidate(spark)\n'
         'print(json.dumps(_stl_candidate_receipt, indent=2))\n'
         "print('PASS_ORIGINAL_ITEMIZED_STL_CANDIDATE. Exact Delta0 readback verified; live serving unchanged.')\n"),
    ]
    document = {'nbformat': 4, 'nbformat_minor': 5,
                'metadata': {'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}, 'language_info': {'name': 'python'}},
                'cells': [cell(kind, text, index) for index, (kind, text) in enumerate(sections)]}
    return (json.dumps(document, indent=2, ensure_ascii=False) + '\n').encode('utf-8'), package_hash


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    package = reviewed_package()
    payload, package_hash = build(package)
    if args.check:
        assert TARGET.read_bytes() == payload, 'Candidate notebook is stale'
    else:
        TARGET.write_bytes(payload)
    print('PASS_STL_CANDIDATE_NOTEBOOK: ' + package_hash)
