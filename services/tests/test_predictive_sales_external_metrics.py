import math
import unittest
from unittest.mock import patch

from services.analytics_service.predictive.metrics import compare, diebold_mariano, mase_scale, scaled_error
from services.analytics_service.predictive.engine import evaluate_fold


class SalesExternalMetricTests(unittest.TestCase):
    def test_training_scale_hand_checks_missing_constant(self):
        self.assertEqual(mase_scale(dict(enumerate(range(1, 14))))['value'], 12)
        self.assertEqual(mase_scale({0: 1, 1: 3, 2: 7})['value'], 3)
        self.assertIsNone(mase_scale({0: 2, 1: 2})['value'])
        with self.assertRaises(ValueError):
            mase_scale({0: 1, 2: 4})
        with self.assertRaises(ValueError):
            mase_scale({0: None})
        points = [dict(actual=10, prediction=13, mase_scale=3), dict(actual=20, prediction=18, mase_scale=4)]
        self.assertEqual(scaled_error(points)['mase'], .75)
        points[1]['mase_scale'] = None
        self.assertIsNone(scaled_error(points)['mase'])

    def points(self):
        return [dict(series_id='A', target_name='units', origin_period=f'2024-{i:02d}',
                     target_period=f'2024-{i+1:02d}', lead_months=1,
                     actual=10, prediction=10 + error, model_id=model, mase_scale=2)
                for i, difference in enumerate([-2, -1, 0, 1], 1)
                for model, error in [('challenger', difference + 3), ('seasonal_naive', 3)]]

    def test_dm_hand_statistic_t3_tail_and_direction(self):
        # Loss differences [-2,-1,0,1], mean -.5, gamma0=1.25, variance=.3125.
        result = diebold_mariano(self.points(), 'challenger')
        self.assertAlmostEqual(result['statistic'], -.5 / math.sqrt(.3125) * math.sqrt(.75))
        self.assertAlmostEqual(result['p_value'], .495025346059711, places=10)
        reverse = diebold_mariano(self.points(), 'seasonal_naive', 'challenger')
        self.assertEqual(reverse['statistic'], -result['statistic'])
        self.assertEqual(reverse['p_value'], result['p_value'])

    def test_dm_sparse_series_mismatch_actuals_and_duplicates(self):
        points = self.points()
        self.assertIn('contiguous', diebold_mariano(points[:2] + points[4:], 'challenger')['reason'])
        points[0]['series_id'] = points[1]['series_id'] = 'B'
        self.assertIn('one series', diebold_mariano(points, 'challenger')['reason'])
        points = self.points()
        points[0]['actual'] = 11
        with self.assertRaises(ValueError):
            diebold_mariano(points, 'challenger')
        with self.assertRaises(ValueError):
            compare(self.points() + self.points()[:1], ['challenger', 'seasonal_naive'])

    def test_future_actual_cannot_change_origin_scale_or_prediction(self):
        from services.analytics_service.predictive.contracts import month
        origin = month('2024-01')
        series = {origin - i: 30 - i for i in range(25)}
        series[origin + 1] = 500
        with patch('services.analytics_service.predictive.engine.forecast', return_value=({1: 30}, None)):
            before = evaluate_fold(series, 'A', origin, {'model_id': 'last_value'}, 'fixture', [], 'development', 1)
            series[origin + 1] = 9000
            after = evaluate_fold(series, 'A', origin, {'model_id': 'last_value'}, 'fixture', [], 'development', 1)
        self.assertEqual(before[0]['prediction'], after[0]['prediction'])
        self.assertEqual(before[0]['mase_scale'], 12)
        self.assertEqual(before[0]['mase_scale'], after[0]['mase_scale'])

    def test_common_models_require_same_scale_and_legacy_missing_is_unavailable(self):
        points = self.points()
        points[0]['mase_scale'] = 200
        with self.assertRaisesRegex(ValueError, 'training MASE metadata'):
            compare(points, ['challenger', 'seasonal_naive'])
        points = self.points()
        points[0]['mase_scale_lag_months'] = 1
        points[1]['mase_scale_lag_months'] = 12
        with self.assertRaisesRegex(ValueError, 'training MASE metadata'):
            compare(points, ['challenger', 'seasonal_naive'])
        points = self.points()
        points[0].pop('mase_scale')
        result = compare(points, ['challenger', 'seasonal_naive'])
        self.assertTrue(all(value['common_scaled_error']['mase'] is None for value in result.values()))
        self.assertTrue(all(value['common']['mae'] is not None for value in result.values()))


if __name__ == '__main__':
    unittest.main()
