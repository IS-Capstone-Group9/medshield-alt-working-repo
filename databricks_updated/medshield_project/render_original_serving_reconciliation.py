"""Generate a single uploadable, read-only reconciliation notebook."""
import argparse
import ast
import importlib.util
from pathlib import Path

PROJECT = Path(__file__).resolve().parent
TARGET = PROJECT / 'maintenance/20261026_reconcile_original_vs_serving.py'


def render():
    spec = importlib.util.spec_from_file_location('embedded_assessment_renderer', PROJECT / 'render_selfcontained_assessment.py')
    renderer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(renderer)
    source = renderer.render()
    marker = 'def main(project=PROJECT, source_directory=SOURCE_DIRECTORY):'
    if source.count(marker) != 1:
        raise ValueError('Unexpected embedded assessment structure')
    source = source.split(marker)[0]
    source = source.replace('RUN THIS NOTEBOOK: self-contained, read-only original CSV assessment.',
                            'RUN THIS NOTEBOOK: read-only original-versus-serving reconciliation.')
    source = source.replace('Only the uploaded CSVs\nare read.', 'Uploaded CSVs and pinned warehouse tables\nare read.')
    core = (PROJECT / 'original_serving_reconciliation.py').read_text(encoding='utf-8')
    source += '\n' + core + "\n\nif 'spark' in globals():\n    run_reconciliation(spark)\n"
    tree = ast.parse(source)
    forbidden = {'write', 'writeTo', 'saveAsTable', 'write_text', 'write_bytes', 'unlink', 'mkdir'}
    if any(isinstance(node, ast.Attribute) and node.attr in forbidden for node in ast.walk(tree)):
        raise ValueError('Unexpected write operation in read-only notebook')
    return source


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = render()
    if args.check:
        if TARGET.read_text(encoding='utf-8') != result:
            raise SystemExit('Generated reconciliation notebook differs')
    else:
        TARGET.write_text(result, encoding='utf-8')
    print('Reconciliation notebook ' + ('matches reviewed source.' if args.check else 'generated.'))
