"""Meaningful temporal and numerical probes for the opt-in exploratory recipes."""
import hashlib
import json
import math
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service.predictive.contracts import month
from services.analytics_service.predictive.engine import run
from services.analytics_service.predictive.extended_experiment import evaluate, main, protocol, registration
from services.analytics_service.predictive.models import (
    BENCHMARKS, CHALLENGERS, EXTENDED_CHALLENGERS, fit_ridge, forecast, lag_features,
    predict_ridge, ridge_forecast)
from services.tests.test_predictive import fixture


class ExtendedPredictiveTests(unittest.TestCase):
    def setUp(self):
        self.origin = month('2022-12')
        self.series = {self.origin - offset: float(-100 + offset % 12) for offset in range(36)}

    def test_original_grid_and_registered_extension_are_separate(self):
        self.assertEqual(len(BENCHMARKS + CHALLENGERS), 15)
        self.assertEqual(len(EXTENDED_CHALLENGERS), 6)
        specification = protocol()
        self.assertEqual(len(specification['configurations']), 21)
        self.assertFalse(specification['promotion'])
        self.assertEqual(specification['schedule']['audit_label'], 'retrospective_audit')
        specification['configurations'][0]['model_id'] = 'mutated'
        self.assertEqual(BENCHMARKS[0]['model_id'], 'last_value')
        with self.assertRaisesRegex(ValueError, 'Protocol differs'):
            evaluate(fixture(), specification)
        self.assertEqual(registration(b'fixture'), registration(b'fixture'))

    def test_hand_solvable_ridge_and_unpenalized_intercept(self):
        fitted = fit_ridge([[0.], [2.]], [1., 5.], alpha=2.)
        # Training z=[-1,1], centered y=[-2,2], coefficient=4/(2+2)=1.
        self.assertAlmostEqual(predict_ridge(fitted, [3.]), 5.)
        constant = fit_ridge([[10.], [10.]], [-7., -7.], alpha=10.)
        self.assertEqual(predict_ridge(constant, [1e9]), -7.)

    def test_known_lags_means_and_calendar_do_not_read_target(self):
        history = {p: float(p - self.origin) for p in range(self.origin - 11, self.origin + 1)}
        history[self.origin + 1] = 1e12
        features = lag_features(history, self.origin, self.origin + 1)
        self.assertEqual(features[:5], [0., -1., -2., -5., -11.])
        self.assertEqual(features[5:8], [-1., -2.5, -5.5])
        self.assertAlmostEqual(features[8], 0.)
        self.assertAlmostEqual(features[9], 1.)

    def test_all_new_adapters_exclude_future_values_and_preserve_signed_data(self):
        sentinel = {**self.series, self.origin + 1: 1e12, self.origin + 12: -1e12}
        for config in EXTENDED_CHALLENGERS:
            with self.subTest(model=config['model_id']):
                before, reason = forecast(self.series, self.origin, [1, 3, 12], config)
                after, other_reason = forecast(sentinel, self.origin, [1, 3, 12], config)
                self.assertEqual(reason, other_reason)
                self.assertEqual(before, after)
                if reason is None:
                    self.assertEqual(set(before), {1, 3, 12})
                    self.assertTrue(all(math.isfinite(value) for value in before.values()))
                    self.assertTrue(all(value < 0 for value in before.values()))
                else:
                    self.assertIn('did not converge', reason)

    def test_direct_training_targets_never_cross_origin_and_minimum_is_explicit(self):
        config = next(c for c in EXTENDED_CHALLENGERS if c['model_id'] == 'ridge_direct_a1')
        seen = []
        original = fit_ridge

        def observe(features, targets, alpha):
            seen.append(list(targets))
            return original(features, targets, alpha)

        with patch('services.analytics_service.predictive.models.fit_ridge', side_effect=observe):
            values, reason = ridge_forecast(self.series, self.origin - 35, self.origin, [1, 12], config)
        self.assertIsNone(reason)
        self.assertEqual([len(targets) for targets in seen], [24, 13])
        self.assertEqual(seen[1], [self.series[p] for p in range(self.origin - 12, self.origin + 1)])
        strict = dict(config, minimum_examples=14)
        self.assertIn('lead 12 requires 14', ridge_forecast(self.series, self.origin - 35, self.origin, [12], strict)[1])

    def test_recursive_unknown_lags_are_own_predictions(self):
        config = next(c for c in EXTENDED_CHALLENGERS if c['model_id'] == 'ridge_recursive_a1')
        seen = []

        def predict(fitted, features):
            seen.append(features)
            return 1000. + len(seen)

        with patch('services.analytics_service.predictive.models.predict_ridge', side_effect=predict):
            values, reason = ridge_forecast(self.series, self.origin - 35, self.origin, [1, 3], config)
        self.assertIsNone(reason)
        self.assertEqual(values, {1: 1001., 3: 1003.})
        self.assertEqual(seen[1][0], 1001.)
        self.assertEqual(seen[2][:2], [1002., 1001.])
        self.assertEqual(seen[2][5], (1002. + 1001. + self.series[self.origin]) / 3)

    def test_missing_history_unsupported_lead_and_nonconvergence_are_unavailable(self):
        missing = dict(self.series)
        del missing[self.origin - 10]
        for config in EXTENDED_CHALLENGERS:
            self.assertIn('contiguous', forecast(missing, self.origin, [1], config)[1])
            self.assertIn('1–12 only', forecast(self.series, self.origin, [13], config)[1])
        fitted = unittest.mock.Mock()
        fitted.mle_retvals = {'converged': False}
        with patch('statsmodels.tsa.statespace.sarimax.SARIMAX') as adapter:
            adapter.return_value.fit.return_value = fitted
            values, reason = forecast(self.series, self.origin, [1], EXTENDED_CHALLENGERS[0])
            self.assertEqual(values, {})
            self.assertIn('did not converge', reason)
            fitted.forecast.assert_not_called()

    def test_engine_boundary_supplies_only_origin_history_and_rejects_duplicate_grid(self):
        def predictor(series, origin, leads, config, seed):
            self.assertEqual(max(series), origin)
            return {lead: series[origin] for lead in leads}, None

        with patch('services.analytics_service.predictive.engine.forecast', side_effect=predictor):
            result = run(fixture(), configurations=BENCHMARKS)
        self.assertEqual(len(result['predictions']), 300)
        with self.assertRaisesRegex(ValueError, 'unique model'):
            run(fixture(), configurations=[BENCHMARKS[0], BENCHMARKS[0]])

    def test_exploratory_selection_is_audit_invariant_and_never_approves(self):
        # Isolate evaluator contracts from library fitting: each recipe predicts last value.
        def predictor(series, origin, leads, config, seed):
            return {lead: series[origin] for lead in leads}, None

        data = fixture()
        with patch('services.analytics_service.predictive.engine.forecast', side_effect=predictor):
            before = evaluate(data, protocol())
            for row in data['rows']:
                if row['period'].startswith('2025'):
                    row['target_value'] *= -100
            after = evaluate(data, protocol())
        self.assertEqual(before['selection'], after['selection'])
        self.assertFalse(before['publication_approved'])
        self.assertEqual(before['status'], 'exploratory_evaluated_unpublished')
        self.assertTrue(before['selection']['audit_previously_inspected'])
        self.assertTrue(all(band['lower'] is None for point in before['predictions'] for band in point['intervals']))
        self.assertTrue(all(card['status'] == 'exploratory_candidate_unpublished' for card in before['model_cards']))

    def test_cli_requires_unchanged_registration_and_refuses_result_replacement(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            frozen, output = root / 'input.json', root / 'experiment'
            raw = json.dumps(fixture()).encode('utf-8')
            frozen.write_bytes(raw)
            frozen.with_suffix('.sha256').write_text(hashlib.sha256(raw).hexdigest())
            arguments = ['extended_experiment', '--input', str(frozen), '--output', str(output)]
            with patch('sys.argv', arguments + ['--prepare']):
                main()
            self.assertFalse(list(output.glob('*/run.json')))
            receipt = json.loads((output / 'protocol.json').read_text())
            receipt['identity']['protocol']['seed'] += 1
            (output / 'protocol.json').write_text(json.dumps(receipt))
            with patch('sys.argv', arguments), self.assertRaisesRegex(ValueError, 'changed since registration'):
                main()
            receipt['identity']['protocol']['seed'] -= 1
            (output / 'protocol.json').write_text(json.dumps(receipt))
            def predictor(series, origin, leads, config, seed):
                return {lead: series[origin] for lead in leads}, None
            with patch('sys.argv', arguments), patch('services.analytics_service.predictive.engine.forecast', side_effect=predictor):
                main()
            self.assertEqual(len(list(output.glob('*/run.json'))), 1)
            self.assertFalse(list(output.glob('*/release-draft.json')))
            with patch('sys.argv', arguments), self.assertRaisesRegex(ValueError, 'already exists'):
                main()


if __name__ == '__main__':
    unittest.main()
