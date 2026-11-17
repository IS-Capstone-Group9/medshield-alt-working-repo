import unittest

from services.analytics_service.predictive.contracts import month
from services.analytics_service.predictive.long_horizon_experiment import evaluate, predict


class LongHorizonTests(unittest.TestCase):
    def setUp(self):
        self.start = month('2020-01')
        self.origin = month('2022-12')
        self.series = {self.start + i: float(i + 1) for i in range(36)}

    def test_future_actuals_cannot_enter_training(self):
        config = {'model_id': 'last_value'}
        before, reason = predict(self.series, self.origin, config)
        changed = {**self.series, **{self.origin + i: -1e12 for i in range(1, 25)}}
        after, _ = predict(changed, self.origin, config)
        self.assertIsNone(reason)
        self.assertEqual(before, after)
        self.assertEqual(before, {i: 36.0 for i in range(13, 25)})

    def test_second_year_seasonal_naive_uses_last_observed_calendar_year(self):
        predictions, reason = predict(self.series, self.origin, {'model_id': 'seasonal_naive'})
        self.assertIsNone(reason)
        self.assertEqual(list(predictions.values()), [float(i) for i in range(25, 37)])

    def test_no_imputation_of_training_gap(self):
        del self.series[self.start + 12]
        with self.assertRaisesRegex(ValueError, 'Training gap'):
            predict(self.series, self.origin, {'model_id': 'mean_3', 'window': 3})

    def test_incomplete_fold_is_not_ranked_on_easier_remaining_points(self):
        points = [{'lead_months': i, 'actual': 10.0, 'prediction': 9.0}
                  for i in range(13, 25)]
        points[-1]['prediction'] = None
        scores = evaluate([{'model_id': 'last_value', 'origin_period': '2022-12',
                            'points': points, 'reason': 'incomplete'}], ['2022-12'])
        last = next(s for s in scores if s['model_id'] == 'last_value')
        self.assertEqual(last['available_cases'], 11)
        self.assertFalse(last['complete'])
        self.assertEqual(last['metrics']['n'], 0)
        self.assertIsNone(last['metrics']['mae'])

    def test_signed_revenue_and_zero_percentage_denominator_preserved(self):
        signed = dict.fromkeys(self.series, -10.0)
        predictions, _ = predict(signed, self.origin, {'model_id': 'mean_3', 'window': 3})
        self.assertEqual(set(predictions.values()), {-10.0})
        points = [{'lead_months': i, 'actual': 0.0, 'prediction': -10.0}
                  for i in range(13, 25)]
        scores = evaluate([{'model_id': 'last_value', 'origin_period': '2022-12',
                            'points': points, 'reason': None}], ['2022-12'])
        last = next(s for s in scores if s['model_id'] == 'last_value')
        self.assertEqual(last['metrics']['mae'], 10.0)
        self.assertEqual(last['metrics']['bias'], -10.0)
        self.assertIsNone(last['metrics']['wape'])


if __name__ == '__main__':
    unittest.main()
