import unittest

from services.analytics_service import external_signal_readiness as esr


class ExternalSignalReadinessTests(unittest.TestCase):
    def test_ibtracs_cyclone_proximity_and_vintage_gating(self):
        records = [
            {'provider': 'IBTRACS', 'territory': 'Quezon', 'period': '2026-08', 'available_on': '2026-09-02',
             'mapping_status': 'approved', 'distance_km': 120.0, 'value': 1},
            {'provider': 'IBTRACS', 'territory': 'Quezon', 'period': '2026-09', 'available_on': '2026-10-15',
             'mapping_status': 'approved', 'distance_km': 85.0, 'value': 1},
            {'provider': 'IBTRACS', 'territory': 'Quezon', 'period': '2026-07', 'available_on': '2026-08-01',
             'mapping_status': 'approved', 'distance_km': 350.0, 'value': 1},
        ]
        # Issue date 2026-10-03 excludes 2026-09 (available_on 2026-10-15) and 2026-07 (> 200 km)
        out = esr.evaluate_signal_readiness(records, provider='IBTRACS', territory='Quezon',
                                            origin_period='2026-09', issue_date='2026-10-03', max_cyclone_km=200.0)
        self.assertTrue(out['join_ready'])
        self.assertEqual('Observed', out['evidence_label'])
        self.assertEqual(1, out['eligible_months_count'])
        self.assertEqual(1, out['future_or_unreleased_skipped'])
        self.assertIn('2026-08', out['monthly_values'])

    def test_unapproved_doh_weekly_stays_blocked(self):
        records = [
            {'provider': 'DOH_WEEKLY', 'territory': 'Batangas', 'period': '2026-09', 'available_on': '2026-10-02',
             'mapping_status': 'pending', 'value': 42.0},
        ]
        out = esr.evaluate_signal_readiness(records, provider='DOH_WEEKLY', territory='Batangas',
                                            origin_period='2026-09', issue_date='2026-10-05')
        self.assertFalse(out['join_ready'])
        self.assertIn('EXTERNAL_MAPPING_PENDING', out['blocked_reasons'])
        self.assertIn('NO_ELIGIBLE_OBSERVATIONS_AT_ISSUE', out['blocked_reasons'])


if __name__ == '__main__':
    unittest.main()
