"""Generate three self-contained original-source layer notebooks, no cloud writes."""
import argparse
import ast
import hashlib
import importlib.util
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parent
LAYER_NAMES = {'bronze': '01_original_sales_bronze_20261026.py',
               'silver': '02_original_sales_silver_20261026.py',
               'gold': '03_original_sales_gold_20261026.py'}
TARGET = PROJECT / 'original_source_20261026'


def notebook_cells(source, layer):
    """Add Databricks markdown/code boundaries only at top-level definitions."""
    def section(title, description=''):
        lines = ['# COMMAND ----------', '', '# MAGIC %md', '# MAGIC ## ' + title]
        if description:
            lines.append('# MAGIC ' + description)
        return '\n'.join(lines) + '\n\n# COMMAND ----------\n\n'
    first, rest = source.split('\n', 1)
    intro = ('# MAGIC %md\n# MAGIC # Original-source ' + layer.title() + '\n'
             '# MAGIC Run the refreshed notebooks in order: Bronze → Silver → Gold. '
             'Use Run all within each notebook.\n'
             '# MAGIC Setup/helper cells define the checked logic; only the last cell runs this layer.\n')
    source = first + '\n' + intro + '\n# COMMAND ----------\n\n' + rest
    sections = [
        ('\ndef require(', '1. Accepted-category package checks'),
        ('\ndef bronze_namespace(', '2. Reviewed CSV decoding and source identities', 'Helper definitions; no table writes in this cell.'),
        ('\ndef silver_namespace(', '3. Reviewed parsing and disposition rules', 'Helper definitions; all physical lines are retained.'),
        ('\ndef stable_json(', '4. Evidence encoding and batch identity'),
        ('\ndef original_bundle(', '5. Read exact original source files'),
        ('\ndef assess_bundle(', '6. Assess and restore Silver evidence'),
        ('\ndef gold_candidates(', '7. Build separate Gold candidate populations'),
        ('\ndef aggregate_controls(', '8. Financial controls and immutable table guards'),
        ('\ndef evidence_frame(', '9. Evidence and typed Gold schemas'),
        ('\ndef run_original_layer(', '10. Layer orchestration and exact readback'),
        ("\nif 'spark' in globals():", '11. Run ' + layer.title(),
         'Execute after the preceding layer has passed. Live serving stays unchanged.'),
    ]
    for item in sections:
        marker, title, *description = item
        if source.count(marker) != 1:
            raise ValueError('Expected one top-level cell boundary: ' + marker)
        source = source.replace(marker, '\n' + section(title, description[0] if description else '') + marker.lstrip('\n'), 1)
    return source


def render_all():
    parser_path = PROJECT / 'sales_csv_assessment.py'
    acceptance_path = PROJECT / 'maintenance/20261026_stage_accepted_categories.py'
    core_path = PROJECT / 'original_layers.py'
    reconciliation_path = PROJECT.parents[1] / 'outputs/databricks_assessment_20261026/original-serving-reconciliation-user-output.json'
    reconciliation = json.loads(reconciliation_path.read_text(encoding='utf-8'))['report']
    reconciled_hashes = {}
    for row in reconciliation['source_manifest']:
        payload = (PROJECT.parent / 'medshield_project_csv' / row['source_workbook']).read_bytes()
        local_hash = hashlib.sha256(payload).hexdigest()
        text = payload.decode('utf-8-sig').replace('\r\n', '\n').replace('\r', '\n')
        variants = [payload, text.encode(), b'\xef\xbb\xbf' + text.encode(),
                    text.replace('\n', '\r\n').encode(), b'\xef\xbb\xbf' + text.replace('\n', '\r\n').encode()]
        if row['source_file_sha256'] not in {hashlib.sha256(value).hexdigest() for value in variants}:
            raise ValueError('Local file does not reproduce reconciled bytes through BOM/newline transport: ' + row['source_workbook'])
        reconciled_hashes[row['source_workbook']] = sorted({local_hash, row['source_file_sha256']})
    tree = ast.parse(parser_path.read_text(encoding='utf-8'))
    factories = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
    if {node.name for node in factories} != {'bronze_namespace', 'silver_namespace'}:
        raise ValueError('Unexpected parser factory structure')
    acceptance_tree = ast.parse(acceptance_path.read_text(encoding='utf-8'))
    functions = {'require', 'validate_inputs', 'read_package'}
    nodes = [node for node in acceptance_tree.body if
             isinstance(node, (ast.Import, ast.ImportFrom, ast.Assign)) or
             isinstance(node, ast.FunctionDef) and node.name in functions]
    if {node.name for node in nodes if isinstance(node, ast.FunctionDef)} != functions:
        raise ValueError('Missing category-only validator')
    identity = {path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                for path in [parser_path, acceptance_path, core_path, reconciliation_path, Path(__file__)]}
    identity['reviewed_source_representations'] = reconciled_hashes
    code_hash = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    header = '''# Databricks notebook source
"""Original-source candidate chain. Run Bronze, then Silver, then Gold.

Self-contained: no external Python helper imports. Uses already-uploaded original
CSVs and the accepted category package. Writes only new isolated candidate tables,
checks exact readback, refuses differing existing data and never switches serving.
"""
'''
    source = '\n\n'.join([header, ast.unparse(ast.Module(body=nodes, type_ignores=[])),
                            'PIPELINE_CODE_SHA256 = ' + repr(code_hash),
                            'RECONCILED_SOURCE_HASHES = ' + repr(reconciled_hashes),
                            ast.unparse(ast.Module(body=factories, type_ignores=[])),
                            core_path.read_text(encoding='utf-8')])
    rendered = {}
    for layer, name in LAYER_NAMES.items():
        text = source + "\n\nif 'spark' in globals():\n    run_original_layer(spark, " + repr(layer) + ')\n'
        text = notebook_cells(text, layer)
        generated = ast.parse(text)
        forbidden = {'overwrite', 'createOrReplace', 'saveAsTable', 'write',
                     'write_text', 'write_bytes', 'unlink', 'rename'}
        if any(isinstance(node, ast.Attribute) and node.attr in forbidden for node in ast.walk(generated)):
            raise ValueError('Unsafe mutation in original-source notebooks')
        if any(isinstance(node, ast.Name) and node.id == '__file__' for node in ast.walk(generated)):
            raise ValueError('Generated notebooks must not require __file__')
        compile(text, name, 'exec')
        rendered[name] = text
    return rendered


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    outputs = render_all()
    if not args.check:
        TARGET.mkdir(exist_ok=True)
    for name, content in outputs.items():
        if args.check:
            if (TARGET / name).read_text(encoding='utf-8') != content:
                raise SystemExit('Original-source notebook differs: ' + name)
        else:
            (TARGET / name).write_text(content, encoding='utf-8')
    print('Three original-source notebooks ' + ('match reviewed sources.' if args.check else 'generated.'))
