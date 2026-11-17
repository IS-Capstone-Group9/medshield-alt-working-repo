"""Check the actual Workspace-file dependency fix, not notebook runtime cells."""
import ast
import importlib.util
import contextlib
import io
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).resolve().parents[1]


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class OrdinaryParserTests(unittest.TestCase):
    def test_generated_code_matches_reviewed_notebook_declarations(self):
        renderer = load(PROJECT / 'render_csv_assessment.py', 'parser_renderer')
        self.assertEqual(renderer.render(), (PROJECT / 'sales_csv_assessment.py').read_text(encoding='utf-8'))

    def test_loading_requires_no_notebook_py_files(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            for name in ['verify_local_sources.py', 'sales_csv_assessment.py']:
                shutil.copy2(PROJECT / name, target / name)
            helper = load(target / 'verify_local_sources.py', 'workspace_file_test')
            bronze = helper.parser_namespace('01_sales_bronze.py')
            silver = helper.parser_namespace('02_sales_silver.py')
            self.assertEqual(('ORIGINAL_SOURCE_EXPORT', None), bronze['source_provenance'](
                'medshield_data_2025.csv', '2738afaf114d9480928e37b6c2b53dc0cac9ba2f10dc74a98b2549e3345d235c'))
            self.assertTrue(silver['is_contract_parent_label']('DR # 100'))
            self.assertTrue(silver['is_contract_parent_label']('PR 100'))
            self.assertFalse(silver['is_contract_parent_label']('SURGICAL BLADE # 10'))
            self.assertFalse((target / '01_sales_bronze.py').exists())

    def test_missing_ordinary_dependency_stops_without_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            shutil.copy2(PROJECT / 'verify_local_sources.py', target / 'verify_local_sources.py')
            helper = load(target / 'verify_local_sources.py', 'missing_workspace_file_test')
            with self.assertRaisesRegex(FileNotFoundError, 'sales_csv_assessment.py'):
                helper.parser_namespace('01_sales_bronze.py')

    def test_selfcontained_notebook_matches_reviewed_modules(self):
        renderer = load(PROJECT / 'render_selfcontained_assessment.py', 'selfcontained_renderer_test')
        self.assertEqual(renderer.render(), (PROJECT / 'maintenance/20261026_assess_original_sales.py').read_text(encoding='utf-8'))

    def test_notebook_compiles_without_file_context_or_helper_imports(self):
        path = PROJECT / 'maintenance/20261026_assess_original_sales.py'
        text = path.read_text(encoding='utf-8')
        tree = ast.parse(text)
        self.assertFalse(any(isinstance(node, ast.Name) and node.id == '__file__' for node in ast.walk(tree)))
        self.assertFalse(any(isinstance(node, ast.Import) and any(alias.name.startswith('importlib') for alias in node.names) for node in ast.walk(tree)))
        namespace = {'__name__': 'no_file_notebook_test'}
        exec(compile(text, str(path), 'exec'), namespace)
        self.assertNotIn('__file__', namespace)
        self.assertTrue(callable(namespace['main']))
        self.assertIn('payload', namespace['bronze_namespace']()['source_provenance'].__code__.co_varnames)

    def test_selfcontained_assessment_ignores_missing_or_outdated_helpers(self):
        notebook = load(PROJECT / 'maintenance/20261026_assess_original_sales.py', 'assessment_notebook_test')
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            for name in ['verify_local_sources.py', 'sales_csv_assessment.py']:
                (target / name).write_text("raise RuntimeError('outdated helper was loaded')", encoding='utf-8')
            with contextlib.redirect_stdout(io.StringIO()):
                summary = notebook.main(target, PROJECT.parent / 'medshield_project_csv')
            self.assertEqual(62065, summary['raw_lines'])
            self.assertEqual(352, summary['contract_candidate_records'])
            self.assertEqual('118330249.950000', summary['contract_recorded_net_sales_php'])
            self.assertIsNone(summary['contract_physical_quantity'])
            self.assertEqual(0, summary['approvals_created'])
            self.assertFalse(summary['source_files_modified'])
            self.assertEqual(set(range(2017, 2027)), {row['source_year'] for row in summary['source_controls']})
            self.assertFalse(summary['external_python_helpers_used'])
            self.assertEqual('20261026-self-contained-v1', summary['assessment_notebook_version'])

    def test_embedded_parser_keeps_2026_representation_guard(self):
        notebook = load(PROJECT / 'maintenance/20261026_assess_original_sales.py', 'embedded_transport_test')
        bronze = notebook.bronze_namespace()
        payload = (PROJECT.parent / 'medshield_project_csv/medshield_data_2026.csv').read_bytes()
        transport = payload.decode('utf-8-sig').replace('\r\n', '\n').replace('\r', '\n').encode('utf-8')
        import hashlib
        digest = hashlib.sha256(transport).hexdigest()
        self.assertEqual(('UNREVIEWED_SOURCE_EXPORT', None),
                         bronze['source_provenance']('medshield_data_2026.csv', digest, payload=transport))
        self.assertEqual(3431, len(bronze['decode_csv_source'](transport, 'medshield_data_2026.csv')))
        with self.assertRaisesRegex(ValueError, 'contents differ'):
            changed = b'CHANGED CONTENT'
            bronze['source_provenance']('medshield_data_2026.csv', hashlib.sha256(changed).hexdigest(), payload=changed)

    def test_new_assessment_notebook_has_no_warehouse_or_source_writes(self):
        tree = ast.parse((PROJECT / 'maintenance/20261026_assess_original_sales.py').read_text(encoding='utf-8'))
        forbidden = {'sql', 'saveAsTable', 'write_text', 'write_bytes', 'unlink', 'mkdir'}
        self.assertFalse(any(isinstance(node, ast.Attribute) and node.attr in forbidden for node in ast.walk(tree)))


if __name__ == '__main__':
    unittest.main()
