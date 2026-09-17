import copy
import unittest
from datetime import date
from unittest.mock import patch

from services.analytics_service.forecast_validation import build_validation, month_number, period_name, score
from services.analytics_service.app import app


def fixture_payload():
    start = month_number('2019-01')
    rows = [{'period': period_name(start + i), 'sector': 'Government', 'product': 'A', 'revenue': 1000 + (i % 12) * 100 + i * 10,
             'quantity': 100 + i, 'row_count': 1} for i in range(84)]
    return {'rows': rows, 'source': {'file': 'controlled-test-fixture', 'checksum': 'fixture-only', 'excluded': {}}}


class ForecastValidationTests(unittest.TestCase):
    def build(self, payload=None, **kwargs):
        return build_validation(payload or fixture_payload(), today=date(2026, 9, 12), **kwargs)

    def test_calendar_horizons_actuals_and_frozen_origin(self):
        data = self.build()
        self.assertEqual(data['origin'], '2025-12')
        self.assertEqual(data['months_since_origin'], 8)
        for horizon in (3, 6, 12):
            result = data['views'][str(horizon)]
            points = result['models']['seasonal_naive']['forecast']
            self.assertEqual(len(points), horizon)
            self.assertEqual(points[0]['period'], '2026-09')
            self.assertEqual(result['models']['seasonal_naive']['metrics']['n'], horizon)
        self.assertEqual(data['forecast_start'], '2026-09')
        self.assertEqual(data['views']['12']['models']['seasonal_naive']['forecast'][0]['prediction'], 2600)
        self.assertEqual(data['views']['12']['models']['seasonal_naive']['forecast'][-1]['period'], '2027-08')
        self.assertEqual(data['views']['12']['models']['seasonal_naive']['metrics']['mae'], 120)

    def test_holdout_values_cannot_leak_into_predictions_or_bands(self):
        payload = fixture_payload()
        before = self.build(payload)['views']['12']
        for row in payload['rows'][-12:]:
            row['revenue'] *= 100
        after = self.build(payload)['views']['12']
        for model in ('last_value', 'seasonal_naive'):
            first = before['models'][model]['backtest']
            second = after['models'][model]['backtest']
            for a, b in zip(first, second):
                for field in ('prediction', 'lower', 'upper', 'origin', 'band_sample_count'):
                    self.assertEqual(a[field], b[field])
            self.assertNotEqual(before['models'][model]['metrics']['mae'], after['models'][model]['metrics']['mae'])

    def test_missing_periods_remain_gaps_and_comparisons_share_population(self):
        payload = fixture_payload()
        payload['rows'] = [r for r in payload['rows'] if r['period'] not in {'2024-03', '2025-04'}]
        data = self.build(payload)
        self.assertIsNone(next(r['actual'] for r in data['actuals'] if r['period'] == '2025-04'))
        view = data['views']['12']
        self.assertEqual(view['common_scored_months'], 10)
        self.assertEqual(view['models']['last_value']['metrics']['n'], 11)
        self.assertEqual(view['models']['last_value']['comparison_metrics']['n'], 10)
        self.assertIsNone(view['models']['seasonal_naive']['backtest'][2]['prediction'])

    def test_product_units_and_private_scope_do_not_mix(self):
        payload = fixture_payload()
        other = copy.deepcopy(payload['rows'])
        for row in other:
            row['product'] = 'B'
            row['quantity'] = 999999
        payload['rows'] += other
        data = self.build(payload, product='A', metric='quantity')
        self.assertEqual(data['actuals'][0]['actual'], 100)
        self.assertEqual(self.build(payload, sector='Private')['views'], {})
        with self.assertRaises(ValueError):
            self.build(metric='quantity')

    def test_closed_2026_sales_cannot_extend_the_historical_origin(self):
        payload=fixture_payload()
        payload['rows'].extend([{**payload['rows'][-1], 'period': p} for p in ['2016-12','2026-01']])
        result=self.build(payload)
        self.assertEqual(result['origin'],'2025-12')
        self.assertEqual(result['source']['excluded_outside_history'],2)
        self.assertTrue(all('2017-01' <= r['period'] <= '2025-12' for r in result['actuals']))
        self.assertEqual(result['views']['3']['models']['last_value']['forecast'][0]['period'],'2026-01')

    def test_current_month_future_months_and_sparse_history(self):
        payload = fixture_payload()
        payload['rows'] = payload['rows'][-2:]
        payload['rows'].append({**payload['rows'][-1], 'period': '2026-09'})
        payload['rows'].append({**payload['rows'][-1], 'period': '2047-11'})
        data = self.build(payload)
        self.assertEqual(data['origin'], '2025-12')
        self.assertEqual(data['source']['excluded_not_closed'], 2)
        self.assertTrue(all(p['prediction'] is None for p in data['views']['3']['models']['seasonal_naive']['forecast']))
        self.assertTrue(all(p['lower'] is None for p in data['views']['3']['models']['last_value']['forecast']))

    def test_metrics_zero_actuals_and_bias_direction(self):
        self.assertEqual(score([(0, 10), (0, 20)])['wape'], None)
        self.assertEqual(score([(100, 80), (100, 120)])['bias'], 0)
        self.assertEqual(score([(100, 120)])['bias'], 20)
        self.assertIsNone(score([])['mae'])

    def test_non_january_start_crosses_year_without_shifting_labels(self):
        payload = fixture_payload()
        payload['rows'] = payload['rows'][:-3]
        data = self.build(payload)
        self.assertEqual(data['origin'], '2025-09')
        points = data['views']['6']['models']['seasonal_naive']['forecast']
        self.assertEqual([p['period'] for p in points], ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02'])

    def test_endpoint_validation_and_failure_have_no_demo_fallback(self):
        with patch('services.analytics_service.app.load_validation', side_effect=OSError('Missing source')):
            result = app.test_client().get('/sales/forecast-validation')
            self.assertEqual(result.status_code, 503)
            self.assertEqual(result.get_json(), {'error': 'Missing source'})
        with patch('services.analytics_service.app.load_validation', side_effect=ValueError('Invalid scope')):
            self.assertEqual(app.test_client().get('/sales/forecast-validation?metric=quantity').status_code, 422)


if __name__ == '__main__':
    unittest.main()
