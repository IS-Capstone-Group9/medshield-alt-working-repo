from fractions import Fraction
import unittest

from services.analytics_service.jobs import compare_model_errors as study


class ModelErrorComparisonTests(unittest.TestCase):
    def test_seasonal_drift_and_offset_hand_arithmetic(self):
        history = list(map(Fraction, range(1, 25)))
        # 24 completed months: the next seasonal value is 13. The recent
        # annual changes are all 12, with six changes at weight 6/9.
        # Last year's origin mean6 was 9.5, making the seasonal offset
        # 13 - 9.5 = 3.5 with one observed offset at weight 1/3.
        results = study.forecasts(history, 1)
        self.assertEqual(results['seasonal_drift'], Fraction(21))
        self.assertEqual(results['recent_level_with_seasonal_effect'], Fraction(68, 3))
        self.assertEqual(study.forecasts(history, 6)['seasonal_drift'], 26)

    def test_short_seasonal_history_preserves_signed_values(self):
        self.assertEqual(study.forecasts([Fraction(-8)] * 12, 3),
                         {model: -8 for model in study.FORECAST_MODELS})
        with self.assertRaises(ValueError):
            study.forecasts([0] * 11, 1)
        with self.assertRaises(ValueError):
            study.forecasts([0] * 11 + [float('nan')], 1)

    def test_abc_features_use_only_preceding_calendar_years(self):
        key = 'label'
        annual = {(2021, key): dict(positive=12, eligible=3, months=2)}
        classes = {2021: {key: 'A'}, 2024: {key: 'C'}}
        row = dict(product_key=key, target_year=2024, feature_year=2023, target_abc='B')
        before = study.abc_features(row, (annual, classes, {2021: 100}))
        self.assertEqual(before[0], [None, None, 'A'])
        classes[2024][key] = 'A'
        annual[2024, key] = dict(positive=10**9, eligible=3, months=12)
        self.assertEqual(study.abc_features(dict(row, target_abc='A'), (annual, classes, {2021: 100})), before)
        with self.assertRaises(ValueError):
            study.abc_features(dict(row, feature_year=2024), (annual, classes, {}))


if __name__ == '__main__':
    unittest.main()
