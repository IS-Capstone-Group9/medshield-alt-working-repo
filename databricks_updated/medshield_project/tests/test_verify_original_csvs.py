"""Check real original identity and missing/altered-file rejection locally."""

import importlib.util
from pathlib import Path
import tempfile
import unittest
import hashlib
import zipfile


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / 'maintenance/20261026_verify_original_csvs.py'
SPEC = importlib.util.spec_from_file_location('verify_original_csvs', SOURCE)
VERIFY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFY)
ORIGINALS = PROJECT.parent / 'medshield_project_csv'


class OriginalCsvIdentityTests(unittest.TestCase):
    def test_all_ten_archived_originals_match_pinned_identities(self):
        # Exact-byte checks need immutable fixtures, not user-editable working copies.
        archive_path = PROJECT.parents[1] / 'outputs/truth_correction_20261025/original_intake_package.zip'
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            with zipfile.ZipFile(archive_path) as archive:
                for filename in VERIFY.EXPECTED_SHA256:
                    (folder / filename).write_bytes(archive.read('medshield_project_csv/' + filename))
            results = VERIFY.verify_original_csvs(folder)
            self.assertEqual(10, len(results))
            self.assertEqual(
                {f'medshield_data_{year}.csv' for year in range(2017, 2027)},
                {row['filename'] for row in results})
            self.assertTrue(all(row['status'] == 'PASS' for row in results), results)

    def test_working_copies_report_actual_raw_identity_without_silent_normalization(self):
        results = VERIFY.verify_original_csvs(ORIGINALS)
        for row in results:
            actual = hashlib.sha256((ORIGINALS / row['filename']).read_bytes()).hexdigest()
            self.assertEqual(actual, row['actual_sha256'])
            expected_status = 'PASS' if actual == row['expected_sha256'] else 'MISMATCH'
            self.assertEqual(expected_status, row['status'])

    def test_missing_files_remain_missing_without_creation(self):
        with tempfile.TemporaryDirectory(prefix='medshield-original-missing-') as directory:
            results = VERIFY.verify_original_csvs(directory)
            self.assertEqual(10, len(results))
            self.assertTrue(all(row['status'] == 'MISSING' for row in results))
            self.assertTrue(all(row['actual_sha256'] is None for row in results))
            self.assertEqual([], list(Path(directory).iterdir()))

    def test_altered_file_is_rejected_without_repairing_it(self):
        filename = 'medshield_data_2020.csv'
        with tempfile.TemporaryDirectory(prefix='medshield-original-altered-') as directory:
            target = Path(directory) / filename
            altered = (ORIGINALS / filename).read_bytes() + b'\n'
            target.write_bytes(altered)
            results = VERIFY.verify_original_csvs(directory)
            result = next(row for row in results if row['filename'] == filename)
            self.assertEqual('MISMATCH', result['status'])
            self.assertNotEqual(result['expected_sha256'], result['actual_sha256'])
            self.assertEqual(altered, target.read_bytes())
            self.assertEqual(9, sum(row['status'] == 'MISSING' for row in results))


if __name__ == '__main__':
    unittest.main()
