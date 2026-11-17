import unittest

import numpy as np

from services.analytics_service import horizon_routing as hr
from services.analytics_service import rolling_accuracy as ra


def make_series(values, start_year=2020):
    base = start_year * 12
    return [(ra.month_label(base + i), float(v)) for i, v in enumerate(values)]


class HorizonRoutingTests(unittest.TestCase):
    def test_stl_seasonal_strength_distinguishes_flat_from_seasonal(self):
        self.assertIsNone(hr.stl_seasonal_strength([100.0] * 23))
        self.assertEqual(0.0, hr.stl_seasonal_strength([100.0] * 36))
        seasonal = [100.0 + 40.0 * np.sin(2.0 * np.pi * i / 12.0) for i in range(48)]
        strength = hr.stl_seasonal_strength(seasonal)
        self.assertIsNotNone(strength)
        self.assertGreater(strength, 0.85)

    def test_origin_isolation_never_leaks_future_observations(self):
        values = [100.0 + 25.0 * np.sin(2.0 * np.pi * i / 12.0) for i in range(60)]
        a = hr.route_horizon_cases(make_series(values), lead=3)
        mutated = values[:48] + [10 ** 8] * 12
        b = hr.route_horizon_cases(make_series(mutated), lead=3)
        cutoff = ra.month_index(make_series(values)[48][0])
        for ca, cb in zip(a, b):
            if ra.month_index(ca['target']) < cutoff:
                self.assertEqual(ca['pred'], cb['pred'])
                self.assertEqual(ca['stl_seasonal_strength'], cb['stl_seasonal_strength'])

    def test_horizon_routing_and_break_switch_behavior(self):
        seasonal = [100.0 + 35.0 * np.sin(2.0 * np.pi * i / 12.0) for i in range(48)]
        lead1 = hr.route_horizon_cases(make_series(seasonal), lead=1)
        lead3 = hr.route_horizon_cases(make_series(seasonal), lead=3)
        self.assertEqual(lead1[0]['pred']['routed_baseline'], lead1[0]['pred']['mean_6'])
        self.assertTrue(lead3[0]['seasonal_eligible'])
        self.assertEqual(lead3[0]['pred']['routed_baseline'], lead3[0]['pred']['seasonal_naive_12'])

        shifted = [100.0] * 24 + [300.0, 310.0, 320.0] + [315.0] * 9
        break_cases = hr.route_horizon_cases(make_series(shifted), lead=1, min_history=24, break_cooldown=6)
        first_break = next(c for c in break_cases if c['level_break_detected'])
        self.assertTrue(first_break['in_break_cooldown'])
        self.assertEqual(first_break['pred']['break_switched'], first_break['pred']['mean_3'])

    def test_pooled_category_shrinkage_hand_check(self):
        cat_a = make_series([100.0 if i % 12 != 0 else 200.0 for i in range(36)])
        profile = hr.pooled_category_seasonal_profile({'A': cat_a})
        self.assertIsNotNone(profile)
        prod_short = make_series([100.0] * 11, start_year=2025)  # 2025-01..2025-11 -> target 2025-12 (month 12)
        pred = hr.shrunk_seasonal_forecast(prod_short, lead=1, category_profile=profile, shrinkage_k=12)
        self.assertIsNotNone(pred)
        self.assertGreater(pred, 0.0)

    def test_conformal_prediction_band_returns_coverage_and_width(self):
        rng = np.random.default_rng(42)
        values = list(100.0 + rng.normal(0.0, 8.0, 72))
        cases = hr.route_horizon_cases(make_series(values), lead=1)
        bands = hr.conformal_prediction_band(cases, 'routed_baseline', levels=(0.80, 0.95), minimum=12)
        self.assertIsNotNone(bands[0.80])
        self.assertIsNotNone(bands[0.95])
        self.assertGreaterEqual(bands[0.95]['mean_relative_width'], bands[0.80]['mean_relative_width'])


if __name__ == '__main__':
    unittest.main()
