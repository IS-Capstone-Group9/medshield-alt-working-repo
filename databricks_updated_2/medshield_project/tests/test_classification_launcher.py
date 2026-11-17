"""Exercise upload tampering and forced read-only mode without a warehouse."""
import importlib.util
import shutil
import tempfile
import unittest
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
path = PROJECT / 'maintenance/20261026_validate_classification.py'
spec = importlib.util.spec_from_file_location('classification_launcher', path)
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)
PACKAGE = PROJECT.parent / 'classification_releases' / launcher.PACKAGE_ID


class LauncherTests(unittest.TestCase):
    def test_real_upload_package_is_accepted(self):
        self.assertEqual(launcher.PACKAGE_ID, launcher.verify_package(PACKAGE)['package_id'])

    def test_changed_manifest_is_rejected_before_code_loading(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            (target / 'manifest.json').write_bytes((PACKAGE / 'manifest.json').read_bytes() + b' ')
            with self.assertRaisesRegex(ValueError, 'manifest'):
                launcher.verify_package(target)

    def test_changed_script_is_rejected_before_code_loading(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            shutil.copytree(PACKAGE, target, dirs_exist_ok=True)
            (target / 'validate_classification_preview.py').write_text("raise RuntimeError('changed')", encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Package file changed: validate_classification_preview.py'):
                launcher.verify_package(target)

    def test_staged_script_cannot_select_preview_via_parameters(self):
        parameters = launcher.ValidationParameters(launcher.PACKAGE_DIRECTORY)
        parameters.text('package_directory', '')
        parameters.dropdown('mode', 'validate', ['validate', 'create_preview'])
        self.assertEqual('validate', parameters.get('mode'))
        self.assertEqual(launcher.PACKAGE_DIRECTORY, parameters.get('package_directory'))
        with self.assertRaises(ValueError):
            parameters.dropdown('mode', 'create_preview', ['create_preview'])


if __name__ == '__main__':
    unittest.main()
