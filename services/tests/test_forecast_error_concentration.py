import unittest
from services.analytics_service.jobs.audit_forecast_error_concentration import concentration


class ErrorConcentrationTests(unittest.TestCase):
    def test_concentration_uses_absolute_error_and_preserves_bias(self):
        rows = [{'absolute_error_php': abs(x), 'signed_error_php': x, 'target_period': str(i)}
                for i, x in enumerate([10, -5, 3, -2, 1, -1])]
        result = concentration(rows)
        self.assertEqual(result['absolute_error_php'], 22)
        self.assertEqual(result['signed_error_php'], 6)
        self.assertAlmostEqual(result['top3_share'], 18 / 22)
        self.assertEqual(result['top_months'][0], '0')

    def test_perfect_forecast_has_undefined_share(self):
        self.assertIsNone(concentration([{'absolute_error_php': 0, 'signed_error_php': 0, 'target_period': 'x'}])['top3_share'])

    def test_empty_population_has_undefined_share(self):
        self.assertIsNone(concentration([])['top5_share'])
