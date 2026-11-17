"""Notebook UI structure, per-cell compilation and format-only AST comparison."""
import ast
import importlib.util
from pathlib import Path
import unittest

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]


def normalized(source):
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and
                target.id == 'PIPELINE_CODE_SHA256' for target in node.targets):
            node.value = ast.Constant('REGENERATED_PROVENANCE_IDENTITY')
    return ast.dump(tree, include_attributes=False)


class NotebookCellTests(unittest.TestCase):
    def test_three_notebooks_have_separate_markdown_and_executable_cells(self):
        files = sorted((PROJECT / 'original_source_20261026').glob('*.py'))
        self.assertEqual(3, len(files))
        for path in files:
            source = path.read_text(encoding='utf-8')
            self.assertTrue(source.startswith('# Databricks notebook source\n'))
            cells = source.split('# COMMAND ----------')
            self.assertGreaterEqual(len(cells), 20)
            self.assertGreaterEqual(sum('# MAGIC %md' in cell for cell in cells), 10)
            namespace = {'__name__': 'notebook_cell_test'}
            for number, cell in enumerate(cells):
                compile(cell, f'{path.name}:cell{number}', 'exec')
                exec(cell, namespace)  # No spark supplied: definitions only, no cloud operations.
            self.assertIn('run_original_layer', namespace)
            self.assertIn("if 'spark' in globals():", cells[-1])

    def test_logic_preserved_except_regenerated_code_provenance(self):
        for path in (PROJECT / 'original_source_20261026').glob('*.py'):
            previous = ROOT / 'outputs/original_layers_20261026/cell_layout_before' / path.name
            self.assertEqual(normalized(previous.read_text(encoding='utf-8')),
                             normalized(path.read_text(encoding='utf-8')))

    def test_generator_matches_refreshed_files(self):
        spec = importlib.util.spec_from_file_location('cell_renderer', PROJECT / 'render_original_layers.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        for name, source in module.render_all().items():
            self.assertEqual(source, (PROJECT / 'original_source_20261026' / name).read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
