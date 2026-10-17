"""Read-only audit of the canonical 2017–2025 exports using notebook parsers.

Does not execute notebook Spark cells, alter source bytes, approve mappings,
or provide a dashboard fallback. Output contains aggregates, not raw records.
"""
from __future__ import annotations

import argparse
import ast
from collections import Counter, defaultdict
from decimal import Decimal
import hashlib
import json
import re
from pathlib import Path
from datetime import datetime, timezone

PROJECT = Path(__file__).resolve().parent
ROOT = PROJECT.parents[1]
DEFAULT_SOURCE = ROOT / 'databricks/medshield_project_csv/medshield_project_csv'


def parser_namespace(filename):
    """Load pure notebook declarations only; no notebook top-level operations."""
    allowed = {'csv', 'hashlib', 'io', 'json', 're', 'pathlib', 'collections',
               'decimal', 'datetime', 'calendar', 'copy', 'math', 'typing'}
    tree = ast.parse((PROJECT / filename).read_text(encoding='utf-8-sig'))
    selected = []
    for node in tree.body:
        if isinstance(node, ast.Import) and all(a.name.split('.')[0] in allowed for a in node.names):
            selected.append(node)
        elif isinstance(node, ast.ImportFrom) and node.module and node.module.split('.')[0] in allowed:
            selected.append(node)
        elif isinstance(node, ast.FunctionDef):
            selected.append(node)
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            names = [n.id for n in ast.walk(node) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)]
            if names and all(n.isupper() for n in names) and not any(
                    isinstance(n, ast.Attribute) and n.attr in {'table', 'sql', 'read_text', 'read_bytes', 'collect', 'count'}
                    for n in ast.walk(node)):
                selected.append(node)
    namespace = {'__name__': 'offline_source_verification'}
    exec(compile(ast.fix_missing_locations(ast.Module(body=selected, type_ignores=[])), filename, 'exec'), namespace)
    return namespace


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sum_measure(rows, name):
    return str(sum((r[name] for r in rows if r[name] is not None), Decimal(0)))


def audit_sources(source_dir=DEFAULT_SOURCE):
    source_dir = Path(source_dir)
    paths = sorted(source_dir.glob('medshield_data_*.csv'))
    if {p.name for p in paths} != {f'medshield_data_{y}.csv' for y in range(2017, 2026)}:
        raise ValueError('Expected exactly the nine canonical 2017–2025 CSV filenames')
    bronze = parser_namespace('01_sales_bronze.py')
    silver = parser_namespace('02_sales_silver.py')
    manifest, source_rows = [], []
    for path in paths:
        payload = path.read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        lines = bronze['decode_csv_source'](payload, path.name)
        provenance, policy = bronze['source_provenance'](path.name, digest)
        manifest.append({'source_workbook': path.name, 'source_file_sha256': digest,
                         'bytes': len(payload), 'raw_lines': len(lines),
                         'source_data_status': provenance, 'source_adjustment_policy': policy})
        for line_number, line in enumerate(lines, 1):
            source_rows.append({'dataset_id': '', 'source_record_id': bronze['source_record_key'](path.name, digest, line_number),
                'source_workbook': path.name, 'data_source_year': int(path.stem[-4:]),
                'source_row_number': line_number, 'source_file_sha256': digest,
                'raw_csv_line': line, 'source_path': str(path)})
    dataset_id = bronze['build_dataset_id'](manifest)
    for r in source_rows:
        r['dataset_id'] = dataset_id
    assessed = silver['assess_sales_records'](source_rows)
    clean = [r for r in assessed if r['is_analysis_candidate']]
    checks = {
        'nine_year_files': len(paths) == 9,
        'raw_lines_preserved': len(assessed) == len(source_rows),
        'source_ids_unique': len({r['source_record_id'] for r in assessed}) == len(assessed),
        'all_lines_disposed': all(r['disposition'] != 'PENDING_RECONCILIATION' for r in assessed),
        'raw_ids_preserved': Counter(r['source_record_id'] for r in assessed) == Counter(r['source_record_id'] for r in source_rows),
        'source_bytes_unchanged': all(sha(path) == item['source_file_sha256'] for path, item in zip(paths, manifest)),
    }
    if not all(checks.values()):
        raise ValueError(f'Raw-source reconciliation failed: {checks}')
    yearly = []
    for item in manifest:
        all_file = [r for r in assessed if r['source_workbook'] == item['source_workbook']]
        kept = [r for r in all_file if r['is_analysis_candidate']]
        eligible = [r for r in kept if r['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in r['quality_rule_codes']]
        months = sorted({r['date_delivered'].replace(day=1).isoformat() for r in kept})
        headers = [r['raw_fields'] for r in all_file if r['record_kind'] == 'HEADER']
        unit_headers = sorted({v for fields in headers for v in fields
                               if v.strip().lower() in {'uom', 'unit', 'sales unit', 'unit of measure', 'pack size'}})
        yearly.append({**item, 'source_year': int(item['source_workbook'][-8:-4]),
            'dispositions': dict(Counter(r['disposition'] for r in all_file)),
            'clean_records': len(kept), 'financial_eligible_records': len(eligible),
            'financial_eligible_net_sales_php': sum_measure(eligible, 'net_sales'),
            'clean_identity_sha256': hashlib.sha256('|'.join(sorted(r['source_record_id'] for r in kept)).encode()).hexdigest(),
            'clean_quantity_sum': sum_measure(kept, 'quantity'),
            'clean_net_sales_sum': sum_measure(kept, 'net_sales'),
            'observed_calendar_months': months, 'separate_sales_unit_headers': unit_headers,
            'quality_rules': dict(Counter(rule for r in all_file for rule in r['quality_rule_codes'])),
            'positive_quantity_rows': sum(r['quantity'] is not None and r['quantity'] > 0 for r in kept),
            'negative_quantity_rows': sum(r['quantity'] is not None and r['quantity'] < 0 for r in kept),
            'null_quantity_rows': sum(r['quantity'] is None for r in kept),
            'source_layouts': sorted({r['source_layout'] for r in all_file})})
    calendar = []
    for year in range(2017, 2026):
        for month in range(1, 13):
            key = f'{year:04d}-{month:02d}-01'
            part = [r for r in clean if r['date_delivered'].replace(day=1).isoformat() == key]
            eligible = [r for r in part if r['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in r['quality_rule_codes']]
            calendar.append({'period': key, 'records': len(part), 'financial_eligible_records': len(eligible),
                'net_sales_php': sum_measure(eligible, 'net_sales') if eligible else None,
                'observation_status': 'records_present_completeness_unverified' if part else 'no_records_unknown_not_zero'})
    products = defaultdict(list)
    for r in clean:
        products[r['product']].append(r)
    product_review = []
    for title, part in sorted(products.items()):
        # Words are packaging clues, never independently verified billed units.
        clues = sorted(set(re.findall(r'\b(?:BOX|STRIP|PACK|VIAL|BOTTLE|AMPOULE|TAB(?:LET)?S?|CAPS?(?:ULE)?S?)\b', title)))
        status_by_file = {m['source_workbook']: m['source_data_status'] for m in manifest}
        original = [r for r in part if status_by_file[r['source_workbook']] == 'ORIGINAL_SOURCE_EXPORT']
        product_review.append({'source_label': title, 'records': len(part),
            'original_records': len(original), 'adjusted_records': len(part)-len(original),
            'latest_record': max(r['date_delivered'] for r in part).isoformat(),
            'latest_original_record': max((r['date_delivered'] for r in original), default=None).isoformat() if original else None,
            'packaging_words_only': clues, 'verified_billed_unit': None,
            'physical_quantity_model_approved_by_audit': False})
    report = {'schema_version': 'sales-source-verification.v1',
        'at_utc': datetime.now(timezone.utc).isoformat(), 'dataset_id': dataset_id,
        'source_directory': source_dir.relative_to(ROOT).as_posix() if source_dir.is_relative_to(ROOT) else str(source_dir),
        'status': 'PASS_LOCAL_PARSER_VERIFICATION_NOT_BUSINESS_APPROVAL',
        'checks': checks, 'raw_lines': len(source_rows), 'clean_records': len(clean),
        'financial_eligible_records': sum(r['financial_eligible_records'] for r in yearly),
        'financial_eligible_net_sales_php': str(sum(Decimal(r['financial_eligible_net_sales_php']) for r in yearly)),
        'files': yearly, 'monthly_observation_calendar': calendar, 'products': product_review,
        'missing_calendar_months': [r['period'] for r in calendar if not r['records']],
        'code_sha256': {f: sha(PROJECT/f) for f in ['01_sales_bronze.py','02_sales_silver.py','verify_local_sources.py']},
        'source_files_modified': False, 'approvals_created': 0, 'models_trained': 0,
        'limitations': ['No invoices/UOM/stockout evidence invented', 'Records present does not prove complete monthly sales',
                        'Adjusted product allocations are not original physical demand', 'Local parse is not live reconciliation until matching readback checked']}
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report = audit_sources(args.source_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ['status','dataset_id','raw_lines','clean_records','financial_eligible_records','financial_eligible_net_sales_php','missing_calendar_months']}))


if __name__ == '__main__':
    main()
