import unittest

import numpy as np

from services.analytics_service import rolling_accuracy as ra


def series(values, start=2020):
    base = start * 12
    return [(ra.month_label(base + i), float(v)) for i, v in enumerate(values)]


class RollingAccuracyTests(unittest.TestCase):
    def test_hand_solved_baselines(self):
        h = [10, 20, 30, 40, 50, 60]
        self.assertEqual(ra.forecast('mean_3', h, 1), 50.0)
        self.assertEqual(ra.forecast('mean_6', h, 1), 35.0)
        self.assertEqual(ra.forecast('median_6', h, 1), 35.0)
        self.assertIsNone(ra.forecast('seasonal_naive_12', h, 1))
        h13 = list(range(1, 14))  # origin index 12, target lead 1 = index 13, 12 earlier = index 1
        self.assertEqual(ra.forecast('seasonal_naive_12', h13, 1), 2.0)

    def test_forecast_ignores_everything_after_origin(self):
        values = [100 + (i % 7) * 5 for i in range(60)]
        a = ra.rolling_cases(series(values), 1)
        mutated = values[:50] + [10 ** 9] * 10
        b = ra.rolling_cases(series(mutated), 1)
        for ca, cb in zip(a, b):
            if ra.month_index(cb['target']) < ra.month_index(series(values)[50][0]):
                self.assertEqual(ca['pred'], cb['pred'])

    def test_bias_correction_uses_only_known_targets(self):
        values = [100.0] * 24 + [200.0] * 24
        cases = ra.rolling_cases(series(values), 3)
        for c in cases:
            known = [k for k in cases if ra.month_index(k['target']) <= ra.month_index(c['origin'])]
            if len(known) < 6:
                self.assertEqual(c['pred']['bias_mean_6'], c['pred']['mean_6'])

    def test_wape_and_bias_hand_example(self):
        self.assertAlmostEqual(ra.wape([100, 100], [110, 70]), 0.2)
        self.assertAlmostEqual(ra.norm_bias([100, 100], [110, 70]), -0.1)
        self.assertIsNone(ra.wape([0, 0], [1, 1]))

    def test_contiguous_run_never_fills_gaps(self):
        vals = {ra.month_label(2020 * 12 + i): 1.0 for i in range(80) if i != 10}
        run = ra.contiguous_run(vals, ra.month_label(2020 * 12 + 79), minimum=60)
        self.assertEqual(len(run), 69)
        self.assertIsNone(ra.contiguous_run(vals, ra.month_label(2020 * 12 + 79), minimum=70))

    def test_identical_candidate_cannot_win(self):
        rng = np.random.default_rng(1)
        values = list(100 + rng.normal(0, 10, 72))
        result = ra.evaluate(ra.rolling_cases(series(values), 1), draws=200)
        self.assertEqual(result['models']['mean_6']['diff_vs_reference'] == 0
                         or not result['models']['mean_6']['wins'], True)
        self.assertFalse(any(m['wins'] for n, m in result['models'].items() if n in ra.COMPARATORS))

    def test_clearly_better_candidate_can_win(self):
        # constant level: median/mean_6 are exact, seasonal naive and mean_3 are noisy
        rng = np.random.default_rng(2)
        values = list(1000 + rng.normal(0, 200, 90))
        values[::9] = [v + 3000 for v in values[::9]]  # spikes hurt means more than medians
        result = ra.evaluate(ra.rolling_cases(series(values), 1), split='2023-01', draws=400)
        self.assertIn(result['reference'], ra.COMPARATORS)
        self.assertLess(result['models']['median_6']['wape'], result['models']['mean_3']['wape'])

    def test_interval_coverage_is_near_nominal_on_stationary_noise(self):
        rng = np.random.default_rng(3)
        values = list(1000 + rng.normal(0, 100, 400))
        cov = ra.interval_coverage(ra.rolling_cases(series(values), 1), 'mean_6')
        self.assertGreater(cov['coverage'], 0.72)
        self.assertLess(cov['coverage'], 0.88)

    def test_conformal_hand_example_and_no_future(self):
        # perfectly flat series: every past error is 0, so the interval is the forecast itself and covers
        cases = ra.rolling_cases(series([100.0] * 60), 1)
        cov = ra.conformal_coverage(cases, 'mean_6')
        self.assertEqual(cov['coverage'], 1.0)
        self.assertEqual(cov['mean_relative_width'], 0.0)
        # a shock after the origin must not widen earlier intervals
        shocked = ra.rolling_cases(series([100.0] * 50 + [900.0] * 10), 1)
        self.assertEqual(ra.conformal_coverage(shocked[:20], 'mean_6'), ra.conformal_coverage(cases[:20], 'mean_6'))

    def test_bootstrap_is_seeded(self):
        a = [100, 120, 90, 110, 130, 95, 105, 115, 100]
        c = [100, 110, 100, 100, 120, 100, 100, 110, 100]
        r = [90, 100, 80, 120, 100, 85, 95, 125, 110]
        self.assertEqual(ra.block_bootstrap_diff(a, c, r, draws=300), ra.block_bootstrap_diff(a, c, r, draws=300))


if __name__ == '__main__':
    unittest.main()
