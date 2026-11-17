"""Check preview launcher scope and package guards without warehouse execution."""
import importlib.util
import ast
import tempfile
import unittest
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    'preview_launcher', PROJECT / 'maintenance/20261026_create_classification_review_preview.py')
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)
PACKAGE = PROJECT.parent / 'classification_releases' / launcher.PACKAGE_ID


class PreviewLauncherTests(unittest.TestCase):
    def test_compatibility_changes_only_the_create_statement(self):
        original = (PACKAGE / 'validate_classification_preview.py').read_bytes()
        source = original.decode('utf-8')
        adapted = launcher.preview_execution_source(original)
        self.assertEqual(source.replace(launcher.PREVIEW_WRITER_V1,
                                       launcher.PREVIEW_WRITER_V2, 1), adapted)
        ast.parse(adapted)
        self.assertIn("if spark.catalog.tableExists(target):", adapted)
        self.assertIn('actual.exceptAll(preview)', adapted)
        self.assertIn('verify_unchanged(actual)', adapted)
        self.assertNotIn('createOrReplace', adapted)
        self.assertNotIn("mode('overwrite')", adapted)

    def test_v2_writer_uses_create_and_propagates_existing_target_error(self):
        calls = []

        class Frame:
            def writeTo(self, target):
                calls.append(('target', target))
                return self

            def using(self, provider):
                calls.append(('provider', provider))
                return self

            def create(self):
                calls.append(('create',))
                raise FileExistsError('concurrent target creation')

        with self.assertRaises(FileExistsError):
            exec(launcher.PREVIEW_WRITER_V2, {'preview': Frame(), 'target': 'review_preview'})
        self.assertEqual([('target', 'review_preview'), ('provider', 'delta'), ('create',)], calls)

    def test_unexpected_writer_source_is_rejected(self):
        for source in [b'pass', (launcher.PREVIEW_WRITER_V1 * 2).encode()]:
            with self.assertRaisesRegex(ValueError, 'Unexpected preview writer'):
                launcher.preview_execution_source(source)

    def test_pinned_real_package_and_fixed_preview_mode(self):
        manifest = launcher.verify_package(PACKAGE)
        self.assertEqual(launcher.PACKAGE_ID, manifest['package_id'])
        parameters = launcher.PreviewParameters(launcher.PACKAGE_DIRECTORY)
        parameters.dropdown('mode', 'validate', ['validate', 'create_preview'])
        self.assertEqual('create_preview', parameters.get('mode'))
        self.assertEqual(launcher.PACKAGE_DIRECTORY, parameters.get('package_directory'))
        with self.assertRaises(ValueError):
            parameters.dropdown('mode', 'validate', ['validate'])

    def test_wrong_destination_rejected_before_warehouse_access(self):
        with self.assertRaisesRegex(ValueError, 'unchanged package directory'):
            launcher.run_preview(object(), '/tmp/wrong-package')

    def test_changed_manifest_rejected_before_package_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            (folder / 'manifest.json').write_bytes((PACKAGE / 'manifest.json').read_bytes() + b' ')
            with self.assertRaisesRegex(ValueError, 'manifest'):
                launcher.verify_package(folder)


if __name__ == '__main__':
    unittest.main()
