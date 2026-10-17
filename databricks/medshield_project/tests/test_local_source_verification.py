"""Guard canonical-source verification and unknown-month/unit semantics."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('local_source_verification', PROJECT / 'verify_local_sources.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class SourceVerificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not audit.DEFAULT_SOURCE.is_dir():
            raise unittest.SkipTest('Canonical deployment exports unavailable')
        cls.report = audit.audit_sources()

    def test_default_targets_deployment_sources(self):
        self.assertEqual(audit.DEFAULT_SOURCE, PROJECT.parent / 'medshield_project_csv' / 'medshield_project_csv')

    def test_raw_and_retained_records_reconcile(self):
        self.assertTrue(all(self.report['checks'].values()))
        self.assertEqual(self.report['clean_records'], sum(r['clean_records'] for r in self.report['files']))
        self.assertEqual(self.report['raw_lines'], sum(sum(r['dispositions'].values()) for r in self.report['files']))

    def test_absent_months_are_unknown_not_zero(self):
        self.assertEqual(len(self.report['monthly_observation_calendar']), 108)
        missing = [r for r in self.report['monthly_observation_calendar'] if not r['records']]
        self.assertEqual(len(missing), 10)
        self.assertTrue(all(r['net_sales_php'] is None and r['observation_status'] == 'no_records_unknown_not_zero' for r in missing))

    def test_adjusted_years_remain_adjusted(self):
        adjusted = [r['source_year'] for r in self.report['files'] if r['source_data_status'] != 'ORIGINAL_SOURCE_EXPORT']
        self.assertEqual(adjusted, [2020, 2024, 2025])

    def test_no_unit_or_model_approval_inferred(self):
        self.assertTrue(self.report['products'])
        self.assertTrue(all(r['verified_billed_unit'] is None and r['physical_quantity_model_approved_by_audit'] is False for r in self.report['products']))
        self.assertEqual(self.report['approvals_created'], 0)

    def test_invalid_source_inventory_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(ValueError, 'nine canonical'):
                audit.audit_sources(Path(folder))

    def test_changed_source_bytes_fail(self):
        with patch.object(audit, 'sha', return_value='changed'):
            with self.assertRaisesRegex(ValueError, 'Raw-source reconciliation failed'):
                audit.audit_sources()


if __name__ == '__main__':
    unittest.main()
