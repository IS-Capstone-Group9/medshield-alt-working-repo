import copy
import unittest

from services.analytics_service.predictive.adaptive_ensemble import predict, CONFIGS
from services.analytics_service.jobs.run_accuracy_improvement import (
    prior_state_features, class_weights, select_forecast, choose_abc)
from services.analytics_service import abc_evaluation as abc, abc_protocol


class AccuracyImprovementTests(unittest.TestCase):
    def test_inner_cutoff_future_mutation_and_unit_scaling(self):
        series = {p: 100 + p + (p % 7) * 3 for p in range(60)}
        for config in CONFIGS:
            first, trace = predict(series, 59, 3, config)
            after, other = predict(series | {60: float('nan'), 61: 1e99}, 59, 3, config)
            self.assertEqual((first, trace), (after, other))
            self.assertLessEqual(trace['inner_target_end'], 59)
            scaled, _ = predict({p: v * 1e6 for p, v in series.items()}, 59, 3, config)
            self.assertAlmostEqual(first, scaled / 1e6, delta=.00001)

    def test_constant_series_and_convex_weights(self):
        for config in CONFIGS:
            prediction, trace = predict({p: 100. for p in range(48)}, 47, 6, config)
            self.assertAlmostEqual(prediction, 100.)
            if 'weights' in trace:
                self.assertAlmostEqual(sum(trace['weights']), 1.)
                self.assertGreaterEqual(min(trace['weights']), 0.)

    def test_hand_linear_bias_correction(self):
        config = next(c for c in CONFIGS if c['model_id'] == 'bias_w12')
        series = {p: 100. + p for p in range(48)}
        for lead in (1, 3, 6):
            prediction, _ = predict(series, 47, lead, config)
            self.assertAlmostEqual(prediction, 100 + 47 + lead)

    def test_invalid_history_and_leads_fail(self):
        series = {p: 100. for p in range(48)}
        for lead in (True, 0, -1, 1.5, 13):
            with self.assertRaises(ValueError):
                predict(series, 47, lead, CONFIGS[0])
        for altered in ({p: v for p, v in series.items() if p != 20}, series | {40: None}):
            with self.assertRaises(ValueError):
                predict(altered, 47, 1, CONFIGS[0])

    def test_forecast_selection_gain_bias_and_audit_isolation(self):
        rows = [dict(stage='development', model_id=m, n=19, mae=100., normalized_bias=2.)
                for m in ('last_value', 'seasonal_naive', 'mean_3', 'mean_6')]
        rows.append(dict(stage='development', model_id='candidate', n=19, mae=94., normalized_bias=3.))
        self.assertEqual(select_forecast(rows, 1)['selected_model'], 'candidate')
        rows[-1]['normalized_bias'] = 3.01
        self.assertEqual(select_forecast(rows, 1)['selected_model'], 'mean_6')
        rows[-1]['stage'] = 'retrospective_audit'
        with self.assertRaises(ValueError):
            select_forecast(rows, 1)

    def test_prior_state_features_exclude_current_target_and_identity(self):
        rows = [dict(product_key='a', target_year=2021, target_abc='A', prior_abc_baseline='B',
                     features={name: 10. for name in abc_protocol.FEATURES})]
        prep = abc.fit_preprocessor(rows)
        before = prior_state_features(rows, prep)
        changed = copy.deepcopy(rows)
        changed[0].update(product_key='different', target_abc='C')
        self.assertEqual(before.tolist(), prior_state_features(changed, prep).tolist())
        self.assertEqual(before[0, -4:].tolist(), [0, 1, 0, 0])
        changed[0]['prior_abc_baseline'] = None
        self.assertEqual(prior_state_features(changed, prep)[0, -4:].tolist(), [0, 0, 0, 1])

    def test_training_class_weights_hand_arithmetic(self):
        rows = [dict(target_abc=c) for c in ('A', 'B', 'B', 'C', 'C', 'C')]
        self.assertEqual(class_weights(rows), [2., 1., 1., 2/3, 2/3, 2/3])

    def test_abc_selection_rejects_test_and_protects_a_recall(self):
        def row(name, f1, recall):
            return dict(stage='development_validation', cohort='all', model_id=name,
                        macro_f1=f1, per_class={'A': {'recall': recall}})
        rows = [row('majority', .3, 0), row('prior_abc', .5, .5), row('candidate', .6, .49)]
        self.assertEqual(choose_abc(rows)['selected_model'], 'prior_abc')
        rows[-1]['per_class']['A']['recall'] = .5
        self.assertEqual(choose_abc(rows)['selected_model'], 'candidate')
        rows[-1]['stage'] = 'retrospective_test_2025'
        with self.assertRaises(ValueError):
            choose_abc(rows)


if __name__ == '__main__':
    unittest.main()
