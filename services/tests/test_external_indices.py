import unittest
from services.analytics_service.external_indices import external_index


class ExternalIndexTests(unittest.TestCase):
    def rows(self, provider='DOH', signal='Dengue'):
        return [dict(provider=provider, signal=signal, territory='Quezon', period=f'{year}-01', value=value)
                for year, value in [(2022, 10), (2023, 20), (2024, 30)]]

    def feature(self, rows=None, **kwargs):
        options = dict(provider='DOH', signal='Dengue', territory='Quezon', feature_period='2024-01',
                       origin_period='2024-01', dataset_id='fixture', policy_version='fixture_only', issue_date='2024-02-15')
        options.update(kwargs)
        return external_index(rows if rows is not None else self.rows(), **options)

    def test_dii_manual_median_and_publication_boundary(self):
        self.assertEqual(self.feature()['value'], 1.5)
        self.assertIsNone(self.feature(issue_date='2024-02-14')['value'])
        self.assertIsNone(self.feature(issue_date=None)['value'])
        self.assertEqual(self.feature(origin_period='2024-02', issue_date=None)['value'], 1.5)
        self.assertFalse(self.feature()['historical_vintages_verified'])

    def test_rsi_manual_sd_and_provider_isolation(self):
        rows = self.rows('NASA POWER', 'Rainfall') + self.rows('PAGASA', 'Rainfall')
        rows[-1]['value'] = 1000
        result = self.feature(rows, provider='NASA POWER', signal='Rainfall')
        self.assertAlmostEqual(result['value'], 10 / (200 / 3) ** .5)
        self.assertEqual(result['source_evidence_label'], 'Proxy')

    def test_future_mutation_null_zero_duplicates(self):
        rows = self.rows()
        before = self.feature(rows)
        rows.append(dict(rows[0], period='2025-01', value=999999))
        self.assertEqual(self.feature(rows), before)
        rows[-2]['value'] = None
        self.assertIsNone(self.feature(rows)['value'])
        rows[-2]['value'] = 0
        self.assertEqual(self.feature(rows)['value'], 0)
        rows.append(rows[0])
        with self.assertRaises(ValueError):
            self.feature(rows)

    def test_actual_delayed_availability_overrides_assumption(self):
        rows = self.rows()
        rows[-1]['available_on'] = '2024-03-01'
        self.assertIsNone(self.feature(rows)['value'])

    def test_regression_opt_in_source_bound_indices(self):
        from services.tests.test_external_regression import regression_fixture
        from services.analytics_service.external_regression import build_regression
        from datetime import date
        fixture = regression_fixture(lag=2)
        fixture[2][0].update(dataset_id='external_fixture', policy_version='fixture_only')
        result = build_regression(*fixture, lag=2, external_transform='indices', today=date(2026, 9, 12))
        self.assertEqual(result['status'], 'exploratory')
        self.assertTrue(result['external_feature_evidence'])
        self.assertTrue(all(r['dataset_id'] == 'external_fixture' for r in result['external_feature_evidence']))
        self.assertIn('assumed publication lag', result['reason'])
        fixture[2][0].pop('dataset_id')
        with self.assertRaises(ValueError):
            build_regression(*fixture, lag=2, external_transform='indices')


if __name__ == '__main__':
    unittest.main()
