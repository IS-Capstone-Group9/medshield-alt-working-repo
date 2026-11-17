"""Synthetic numerical-integrity tests, not measured company model accuracy."""
import unittest
from unittest.mock import patch, Mock

from services.analytics_service.predictive.stable_ets import forecast


class StableEtsTests(unittest.TestCase):
    def setUp(self):
        self.series = {p: 100 + (p % 12) * 10 + p * .6 + ((p * 7) % 5) * 3 for p in range(60)}

    def test_currency_scale_equivariance_and_future_isolation(self):
        for damped in (False, True):
            first, status = forecast(self.series, 59, [1, 3, 6], damped=damped)
            scaled, other = forecast({p: v * 1000000 for p, v in self.series.items()},
                                     59, [1, 3, 6], damped=damped)
            self.assertTrue(status['converged'])
            self.assertTrue(other['converged'])
            for h in first:
                self.assertAlmostEqual(first[h], scaled[h] / 1000000, delta=.0001)
            future, _ = forecast(self.series | {60: float('nan'), 61: 1e99},
                                 59, [1, 3, 6], damped=damped)
            self.assertEqual(first, future)

    def test_failed_or_missing_convergence_never_emits_forecast(self):
        for optimizer in ({'success': False}, None):
            fitted = Mock(mle_retvals=optimizer)
            with patch('statsmodels.tsa.holtwinters.ExponentialSmoothing') as model:
                model.return_value.fit.return_value = fitted
                values, status = forecast(self.series, 59, [1], damped=True)
            self.assertEqual(values, {})
            self.assertFalse(status['converged'])
            fitted.forecast.assert_not_called()

    def test_zero_signed_data_and_missing_history(self):
        zero, status = forecast({p: 0. for p in range(36)}, 35, [1, 12], damped=False)
        self.assertTrue(status['converged'])
        self.assertEqual(zero, {1: 0., 12: 0.})
        signed = {p: v - 200 for p, v in self.series.items()}
        result, status = forecast(signed, 59, [1], damped=False)
        self.assertTrue(status['converged'])
        self.assertLess(result[1], 0)
        missing = {p: v for p, v in self.series.items() if p != 20}
        self.assertIn('contiguous', forecast(missing, 59, [1], damped=False)[1]['reason'])

    def test_invalid_leads_and_training_rejected(self):
        for leads in ([], [0], [-1], [True], [1.5], [13], [1, 1], '1'):
            with self.subTest(leads=leads), self.assertRaises(ValueError):
                forecast(self.series, 59, leads, damped=False)
        for value in (None, float('nan'), float('inf'), True):
            with self.subTest(value=value), self.assertRaises(ValueError):
                forecast(self.series | {59: value}, 59, [1], damped=False)


if __name__ == '__main__':
    unittest.main()
