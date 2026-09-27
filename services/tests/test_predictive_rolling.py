"""Cutoff, missing-data and comparable-population checks for the exploratory schedule."""
import copy
import unittest

from services.analytics_service.predictive.contracts import month
from services.analytics_service.predictive.rolling_experiment import evaluate, protocol
from services.tests.test_predictive import fixture


class RollingExperimentTests(unittest.TestCase):
    def test_cutoffs_common_targets_and_future_invariance(self):
        calls = []

        def predictor(series, origin, leads, config, seed):
            self.assertEqual(max(series), origin)
            self.assertLess(origin, month('2024-12'))
            calls.append((origin, tuple(leads)))
            return {lead: series[origin] for lead in leads}, None

        data = fixture()
        before = evaluate(data, protocol(), predictor)
        for row in data['rows']:
            if row['period'] >= '2025-01':
                row['target_value'] = 1e12
        self.assertEqual(before, evaluate(data, protocol(), predictor))
        self.assertIsNone(before['selection'])
        self.assertFalse(before['publication_approved'])
        for schedule, evaluation in before['evaluations'].items():
            self.assertEqual(len(evaluation['complete_models']), 15)
            keys = [v['common_keys'] for v in evaluation['comparisons'].values()]
            self.assertTrue(all(k == keys[0] for k in keys))
            self.assertEqual(len(keys[0]), 24)
            points = [p for p in before['predictions'] if p['schedule'] == schedule and p['model_id'] == 'last_value']
            self.assertEqual(len({p['target_period'] for p in points}), 24)
            if schedule == 'monthly_one_step':
                self.assertEqual({p['lead_months'] for p in points}, {1})
            else:
                self.assertEqual({p['origin_period'] for p in points}, {'2022-12', '2023-12'})

    def test_incomplete_month_and_changed_protocol_rejected(self):
        data = fixture()
        data['rows'] = [r for r in data['rows'] if r['period'] != '2024-05']
        with self.assertRaisesRegex(ValueError, 'Incomplete'):
            evaluate(data, protocol())
        changed = copy.deepcopy(protocol())
        changed['target_end'] = '2025-12'
        with self.assertRaisesRegex(ValueError, 'Protocol differs'):
            evaluate(fixture(), changed)

    def test_failed_model_cannot_shrink_others_common_population(self):
        def predictor(series, origin, leads, config, seed):
            if config['model_id'] == 'last_value' and origin == month('2023-06'):
                return {}, 'fixture failure'
            return {lead: series[origin] for lead in leads}, None

        result = evaluate(fixture(), protocol(), predictor)
        evidence = result['evaluations']['monthly_one_step']
        self.assertNotIn('last_value', evidence['complete_models'])
        self.assertEqual(evidence['comparisons']['mean_3']['common']['n'], 24)
        self.assertEqual(len([p for p in result['predictions'] if p['missing_reason']]), 1)
