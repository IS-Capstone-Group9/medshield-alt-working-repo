import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from services.analytics_service.predictive import online_baseline_ensemble as model
from services.analytics_service.jobs import run_online_ensemble as runner


class OnlineAffineTests(unittest.TestCase):
    def test_hand_constant_and_linear_trend(self):
        for config in model.CONFIGS:
            constant, trace = model.predict({p: 100. for p in range(48)}, 47, config)
            self.assertAlmostEqual(constant, 100., places=6)
            self.assertAlmostEqual(trace['intercept_php'], 0., places=6)
            trend, _ = model.predict({p: 100. + p for p in range(48)}, 47, config)
            self.assertAlmostEqual(trend, 148., places=6)

    def test_future_mutation_inner_cutoff_and_weight_constraints(self):
        series = {p: 100. + p + p % 7 for p in range(60)}
        for config in model.CONFIGS:
            value, trace = model.predict(series, 47, config)
            mutated, changed = model.predict(series | {48: 1e99, 49: float('nan')}, 47, config)
            self.assertEqual((value, trace), (mutated, changed))
            self.assertLessEqual(trace['inner_target_end'], 47)
            self.assertEqual(len(trace['inner_actuals']), len(trace['inner_origins']))
            self.assertAlmostEqual(sum(trace['weights']), 1., places=7)
            self.assertGreaterEqual(min(trace['weights']), -1e-8)
            self.assertLessEqual(abs(trace['intercept_php']), trace['intercept_cap_php'] + 1e-6)
            hand = sum(w * p for w, p in zip(trace['weights'], trace['current_predictions'])) + trace['intercept_php']
            self.assertAlmostEqual(hand, value, places=7)

    def test_currency_scaling_and_signed_prediction(self):
        for config in model.CONFIGS:
            series = {p: -100. - p for p in range(48)}
            value, _ = model.predict(series, 47, config)
            scaled, _ = model.predict({p: v * 1e6 for p, v in series.items()}, 47, config)
            self.assertAlmostEqual(value, -148., places=6)
            self.assertAlmostEqual(scaled / 1e6, value, places=6)

    def test_training_windows_and_cap_hand_calculation(self):
        series = {p: 100. + p for p in range(60)}
        expected = [12, 24, 48]
        for config, n in zip(model.CONFIGS, expected):
            _, trace = model.predict(series, 59, config)
            self.assertEqual(trace['samples'], n)
            self.assertAlmostEqual(trace['intercept_cap_php'], .2 * sum(series[p] for p in range(48, 60)) / 12)
            for origin, actual, vector in zip(trace['inner_origins'], trace['inner_actuals'], trace['inner_predictions']):
                self.assertEqual(actual, series[origin + 1])
                self.assertEqual(vector[0], series[origin])
                self.assertEqual(vector[1], series[origin - 11])

    def test_missing_nonfinite_and_zero_scale_fail_without_fallback(self):
        series = {p: 100. for p in range(48)}
        for bad in ({p: v for p, v in series.items() if p != 20}, series | {30: None},
                    {p: 0. for p in range(48)}, {p: 1. for p in range(19)}):
            with self.assertRaises(ValueError):
                model.predict(bad, max(bad), model.CONFIGS[0])
        with self.assertRaises(ValueError):
            model.predict(series, True, model.CONFIGS[0])
        with self.assertRaises(ValueError):
            model.predict(series, 47, dict(model_id='unregistered', window=12))

    def test_optimizer_failure_is_explicit(self):
        with patch('scipy.optimize.linprog', return_value=SimpleNamespace(success=False)):
            with self.assertRaisesRegex(ValueError, 'no fallback'):
                model.predict({p: 100. for p in range(48)}, 47, model.CONFIGS[0])

    def test_selection_strongest_baseline_bias_and_target_guards(self):
        rows = [dict(stage='development', model_id=name, failed=0, n=19,
                     mae=100. if name == 'mean_6' else 110., normalized_bias=1., wape=20.)
                for name in model.BASELINES]
        rows.append(dict(stage='development', model_id='joint_affine_w12', failed=0, n=19,
                         mae=94., normalized_bias=4., wape=9.))
        selected = runner.choose(rows)
        self.assertEqual(selected['selected_model'], 'joint_affine_w12')
        self.assertTrue(selected['below10_with_guard']); self.assertFalse(selected['below5_with_guard'])
        rows[-1]['normalized_bias'] = 6.
        self.assertEqual(runner.choose(rows)['selected_model'], 'mean_6')
        rows[-1]['stage'] = 'retrospective_audit'
        with self.assertRaises(ValueError):
            runner.choose(rows)

    def test_registration_is_exclusive_and_execution_refuses_partial_output(self):
        root = Path(__file__).resolve().parents[2]
        source = root / 'outputs/wp4_forecast_tournament_20261030/source.json'
        reference = root / 'outputs/wp4_new_tournament_20261030/results.json'
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'study'
            registered = runner.register(source, reference, output)
            self.assertEqual(len(registered['configs']), 3)
            self.assertIn('already evaluated', registered['delta'])
            with self.assertRaises(FileExistsError):
                runner.register(source, reference, output)
            (output / 'attempt.txt').write_text('retained', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'not empty'):
                runner.execute(source, reference, output)
            self.assertEqual((output / 'attempt.txt').read_text(), 'retained')


if __name__ == '__main__':
    unittest.main()
