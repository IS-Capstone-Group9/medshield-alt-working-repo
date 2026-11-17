import unittest
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
from services.analytics_service import rolling_accuracy as ra


def series(values):
    return [(ra.month_label(2020 * 12 + i), v) for i, v in enumerate(values)]


class MeasurementContractTests(unittest.TestCase):
    def test_hand_solvable_total_and_half_growth(self):
        cases = ra.measurement_cases(series(range(1, 31)), 3, 'total', include_growth=True)
        self.assertEqual(cases[0]['origin'], '2021-12')
        self.assertEqual(cases[0]['target_start'], '2022-01')
        self.assertEqual(cases[0]['target'], '2022-03')
        self.assertEqual(cases[0]['actual'], 78)
        self.assertEqual(cases[0]['pred']['trailing_sum'], 69)
        self.assertAlmostEqual(cases[0]['pred']['half_growth'], 74.175)
        self.assertNotIn('half_growth', ra.measurement_cases(series(range(1, 31)), 3, 'total')[0]['pred'])

    def test_missing_duplicate_unsorted_invalid_and_nonfinite_months_rejected(self):
        rows = series([1] * 40)
        for broken in [rows[:4] + rows[5:], rows[:4] + rows[3:], list(reversed(rows)),
                       [('2020-13', 1)], [('2020-01', float('nan'))], [('2020-01', True)]]:
            with self.assertRaises(ValueError):
                ra.measurement_cases(broken)

    def test_arbitrary_horizon_has_no_future_seasonal_input(self):
        rows = ra.measurement_cases(series(range(1, 61)), 13, 'point')
        self.assertIsNone(rows[0]['pred']['seasonal_naive_12'])
        self.assertEqual(rows[0]['pred']['mean_6'], 21.5)
        with self.assertRaises(ValueError):
            ra.measurement_cases(series([1] * 40), True)

    def test_future_mutation_does_not_change_origin_predictions(self):
        original = ra.measurement_cases(series(range(1, 81)), 12, 'total', include_growth=True)
        changed = ra.measurement_cases(series(list(range(1, 49)) + [99999] * 32), 12, 'total', include_growth=True)
        for first, second in zip(original, changed):
            if first['origin'] <= '2023-12':
                self.assertEqual(first['pred'], second['pred'])

    def test_nonpositive_anchor_keeps_all_cases_and_reports_fallback(self):
        rows = ra.measurement_cases(series([-1] * 12 + [2] * 30), 12, 'total', include_growth=True)
        self.assertTrue(rows[0]['growth_fallback'])
        self.assertEqual(rows[0]['pred']['half_growth'], rows[0]['pred']['trailing_sum'])
        self.assertEqual(len(rows), 7)

    def test_identical_perfect_reference_has_no_relative_fva_or_win(self):
        rows = ra.measurement_cases(series([100] * 90), 6, 'total', include_growth=True)
        result = ra.measurement_comparison(rows, draws=20)
        self.assertEqual(result['fva_pp'], 0)
        self.assertIsNone(result['relative_fva_percent'])
        self.assertEqual(result['bootstrap_ci95_pp'], [0, 0])
        self.assertFalse(result['retrospective_rule_pass'])

    def test_zero_denominator_is_unavailable_not_perfect_accuracy(self):
        rows = ra.measurement_cases(series([0] * 70), 6, 'total', include_growth=True)
        result = ra.measurement_comparison(rows, draws=20)
        self.assertIsNone(result['candidate_metrics']['wape_percent'])
        self.assertIsNone(result['bootstrap_ci95_pp'])
        self.assertFalse(result['retrospective_rule_pass'])

    def test_evaluator_accepts_a_clear_synthetic_win_in_both_periods(self):
        # Evaluator fixture only: these supplied predictions are not a forecast
        # recipe and do not count as a real-data candidate attempt.
        rows = [{'origin': ra.month_label(2020 * 12 + i), 'target_start': ra.month_label(2020 * 12 + i + 1),
                 'target': ra.month_label(2020 * 12 + i + 6), 'target_kind': 'total', 'horizon': 6,
                 'actual': 100, 'pred': {'half_growth': 100, 'trailing_sum': 120}, 'growth_fallback': False}
                for i in range(80)]
        result = ra.measurement_comparison(rows, draws=20)
        self.assertTrue(result['retrospective_rule_pass'])
        self.assertEqual(result['bootstrap_ci95_pp'], [-20, -20])

    def test_missing_prediction_or_duplicate_cannot_shrink_comparison_cases(self):
        rows = ra.measurement_cases(series(range(1, 91)), 6, 'total', include_growth=True)
        with self.assertRaises(ValueError):
            ra.measurement_comparison(rows + [rows[0]], draws=20)
        rows[0]['pred']['half_growth'] = None
        with self.assertRaises(ValueError):
            ra.measurement_comparison(rows, draws=20)

    def test_php_and_percentage_units_are_explicit(self):
        rows = [{'actual': 100, 'pred': {'m': 110}}, {'actual': -100, 'pred': {'m': -130}}]
        metrics = ra.measurement_metrics(rows, 'm')
        self.assertEqual(metrics['wape_percent'], 20)
        self.assertEqual(metrics['normalized_bias_percent'], -10)
        self.assertEqual(metrics['bias_php'], -10)

    def test_registration_tamper_and_repeat_attempt_are_rejected(self):
        path = Path(__file__).resolve().parents[2] / 'outputs/improvement_step4_20261106/run.py'
        spec = importlib.util.spec_from_file_location('registered_measurement_runner', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with TemporaryDirectory() as temp:
            module.ROOT = module.OUT = Path(temp)
            source = Path(temp) / 'source.txt'
            source.write_text('frozen', encoding='utf-8')
            module.FILES = [source]
            module.freeze()
            module.check_registration()
            with self.assertRaises(FileExistsError):
                module.freeze()
            (Path(temp) / 'results.json').write_text('{}', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'already exists'):
                module.run()
            source.write_text('changed', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Frozen input/implementation changed'):
                module.check_registration()


if __name__ == '__main__':
    unittest.main()
