"""Generate the one-file Databricks entrypoint from the reviewed parsing modules."""
import argparse
import ast
import copy
import hashlib
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parent
VERSION = '20261026-self-contained-v1'
TARGET = PROJECT / 'maintenance/20261026_assess_original_sales.py'


class EmbeddedCodeIdentity(ast.NodeTransformer):
    def __init__(self):
        self.replacements = 0

    def visit_Dict(self, node):
        self.generic_visit(node)
        for index, key in enumerate(node.keys):
            if isinstance(key, ast.Constant) and key.value == 'code_sha256':
                node.values[index] = ast.Name(id='EMBEDDED_SOURCE_SHA256', ctx=ast.Load())
                self.replacements += 1
        return node


def render():
    parser_path = PROJECT / 'sales_csv_assessment.py'
    audit_path = PROJECT / 'verify_local_sources.py'
    parser_tree = ast.parse(parser_path.read_text(encoding='utf-8'))
    audit_tree = ast.parse(audit_path.read_text(encoding='utf-8'))
    factories = [copy.deepcopy(node) for node in parser_tree.body if isinstance(node, ast.FunctionDef)]
    if {node.name for node in factories} != {'bronze_namespace', 'silver_namespace'}:
        raise ValueError('Unexpected parser factories')
    provenance = next(node for node in ast.walk(factories[0]) if isinstance(node, ast.FunctionDef) and node.name == 'source_provenance')
    if 'payload' not in [argument.arg for argument in provenance.args.args]:
        raise ValueError('Generate the current multiline-aware parser first')
    imports = [copy.deepcopy(node) for node in audit_tree.body if (
        isinstance(node, ast.Import) and not any(alias.name in {'argparse', 'importlib.util'} for alias in node.names)
        or isinstance(node, ast.ImportFrom))]
    functions = [copy.deepcopy(node) for node in audit_tree.body
                 if isinstance(node, ast.FunctionDef) and node.name in {'sha', 'sum_measure', 'audit_sources'}]
    transform = EmbeddedCodeIdentity()
    functions = [transform.visit(node) for node in functions]
    if transform.replacements != 1:
        raise ValueError('Unexpected audit code identity expression')
    identity = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in [parser_path, audit_path]}
    intro = '''# Databricks notebook source
"""RUN THIS NOTEBOOK: self-contained, read-only original CSV assessment.

No external Python helper files are imported or executed. Only the uploaded CSVs
are read. Generated from the reviewed canonical parsing modules; no table writes,
invented quantities, model training or approval changes occur.
"""
'''
    import_source = ast.unparse(ast.Module(body=imports, type_ignores=[]))
    constants = '\n'.join([
        'ASSESSMENT_NOTEBOOK_VERSION = ' + repr(VERSION),
        "PROJECT = Path('/Workspace/medshield/medshield_project')",
        'ROOT = PROJECT.parents[1]',
        "DEFAULT_SOURCE = PROJECT.parent / 'medshield_project_csv'",
        'SOURCE_DIRECTORY = DEFAULT_SOURCE',
        'EMBEDDED_SOURCE_SHA256 = ' + repr(identity),
    ])
    factory_source = ast.unparse(ast.Module(body=factories, type_ignores=[]))
    dispatch = '''def parser_namespace(filename):
    factories = {'01_sales_bronze.py': bronze_namespace, '02_sales_silver.py': silver_namespace}
    if filename not in factories:
        raise ValueError('Unsupported parser source: ' + filename)
    return factories[filename]()
'''
    audit_source = ast.unparse(ast.fix_missing_locations(ast.Module(body=functions, type_ignores=[])))
    runner = '''def main(project=PROJECT, source_directory=SOURCE_DIRECTORY):
    print('Assessment version: ' + ASSESSMENT_NOTEBOOK_VERSION)
    report = audit_sources(Path(source_directory))
    fields = [
        'dataset_id', 'raw_lines', 'clean_records', 'itemized_candidate_records',
        'contract_candidate_records', 'contract_recorded_net_sales_php',
        'contract_technically_eligible_records', 'contract_technically_eligible_net_sales_php',
        'financial_eligible_records', 'financial_eligible_net_sales_php', 'financial_eligibility_scope',
        'contract_physical_quantity', 'contract_product_breakdown', 'missing_calendar_months',
        'checks', 'source_files_modified', 'approvals_created', 'models_trained',
    ]
    summary = {name: report[name] for name in fields}
    summary['assessment_notebook_version'] = ASSESSMENT_NOTEBOOK_VERSION
    summary['external_python_helpers_used'] = False
    summary['source_controls'] = [{name: row[name] for name in [
        'source_year', 'raw_lines', 'clean_records', 'source_data_status',
        'contract_candidate_records', 'contract_recorded_net_sales_php',
        'financial_eligible_records', 'financial_eligible_net_sales_php', 'dispositions',
    ]} for row in report['files']]
    print(json.dumps(summary, indent=2))
    print('PASS_ORIGINAL_CSV_ASSESSMENT. No files or tables changed; no approvals added.')
    return summary


if __name__ == '__main__':
    main()
'''
    rendered = '\n\n'.join([intro, import_source, constants, factory_source,
        '# COMMAND ----------', dispatch, audit_source, '# COMMAND ----------', runner]) + '\n'
    tree = ast.parse(rendered)
    if any(isinstance(node, ast.Name) and node.id == '__file__' for node in ast.walk(tree)):
        raise ValueError('Self-contained notebook must not require __file__')
    return rendered


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    expected = render()
    if args.check:
        if not TARGET.is_file() or TARGET.read_text(encoding='utf-8') != expected:
            raise SystemExit('Self-contained assessment differs from its reviewed source modules.')
    else:
        TARGET.write_text(expected, encoding='utf-8', newline='\n')
    print('Self-contained assessment ' + ('matches reviewed source modules.' if args.check else 'generated.'))
