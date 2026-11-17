"""Synthetic checks for offline revenue fits, temporal boundaries and fit gates."""
import copy
import json
import math
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

from services.analytics_service.predictive import external_revenue_experiment as engine

ROOT = Path(__file__).resolve().parents[2]


def fixture(accepted=False):
    rng = np.random.default_rng(97531)
    policy = copy.deepcopy(engine.load(ROOT / 'outputs/external_research_policy_20261020/policy.json'))
    policy['cohort']['expected_initial_training'] = 72
    rows, previous = [], 150000.
    for offset in range(84):
        target = engine.period(engine.month('2018-01') + offset)
        origin = engine.period(engine.month(target) - 1)
        cases, rain, alabat = int(rng.integers(20, 700)), float(rng.uniform(10, 700)), float(rng.uniform(10, 700))
        sales = (100000 + 1000 * offset + 9000 * math.sin(2 * math.pi * offset / 12)
                 + 3000 * math.cos(2 * math.pi * offset / 12) + .3 * previous
                 + 200 * cases - 50 * rain)
        rows.append(dict(target_month=target, origin_month=origin, disease_month=origin,
                         weather_month=origin, actual_lead_months=1, target_net_sales_php=sales,
                         prior_net_sales_php=previous, prior_Dengue_cases=cases,
                         prior_Tayabas_rainfall_mm=rain, prior_Alabat_rainfall_mm=alabat,
                         eligible_numerical_case=True, missing_fields=[],
                         accepted_model_input=accepted, disease_mapping_accepted=accepted,
                         station_mapping_status='approved' if accepted else 'needs_review',
                         external_geography_status='approved' if accepted else 'pending'))
        previous = sales
    preflight = dict(initial_training_cases=72, evaluation_cases=12,
                     source_release={'dataset_id': 'SYNTHETIC_TEST_ONLY'}, source_sha256={}, folds=[],
                     model_execution_ready=accepted,
                     current_governance=dict(owner_decision='accepted' if accepted else None,
                     station_status='approved' if accepted else 'needs_review',
                     disease_external_mapping='approved' if accepted else 'pending',
                     warehouse_join_ready_months=84 if accepted else 0))
    for i in range(12):
        target = f'2024-{i+1:02d}'
        keys = [r['target_month'] for r in rows if r['target_month'] < target]
        preflight['folds'].append(dict(target_month=target, origin_month=engine.period(engine.month(target)-1),
                                      training_keys=keys, training_cases=len(keys)))
    if accepted:
        policy.update(owner_decision='accepted', owner_identity='SYNTHETIC_FIXTURE_REVIEWER',
                      decision_evidence='SYNTHETIC_ONLY', model_execution_ready=True,
                      warehouse_external_joins_accepted=True)
    return rows, policy, preflight


class ExternalRevenueTests(unittest.TestCase):
    def test_pending_external_never_calls_augmented_fit(self):
        original = engine.fit_ols
        def checked(training, target, model):
            self.assertEqual(model, 'sales_calendar_baseline')
            return original(training, target, model)
        with patch.object(engine, 'fit_ols', side_effect=checked) as fitted:
            result = engine.evaluate(*fixture())
        self.assertEqual(fitted.call_count, 12)
        self.assertFalse(result['external_models_fitted'])
        self.assertEqual(result['status'], 'partial_external_blocked')
        for model in engine.MODELS[2:]:
            self.assertEqual(result['metrics'][model]['status'], 'blocked')
            self.assertIsNone(result['metrics'][model]['wape'])
        self.assertEqual(len(result['points']), 48)

    def test_synthetic_accepted_linear_model_recovery_and_station_separation(self):
        result = engine.evaluate(*fixture(accepted=True))
        self.assertEqual(result['status'], 'complete_retrospective_comparison')
        self.assertEqual(result['external_fits_completed'], 24)
        self.assertLess(result['metrics']['combined_tayabas_primary']['mae'], 1e-6)
        self.assertGreater(result['metrics']['combined_alabat_sensitivity']['mae'], 1)
        self.assertTrue(all(x['training_end'] <= x['origin_month'] < x['target_month']
                            for x in result['points']))

    def test_last_target_and_future_predictors_cannot_change_prior_forecasts(self):
        inputs = fixture(accepted=True)
        before = engine.evaluate(*inputs)
        changed = copy.deepcopy(inputs)
        changed[0][-1]['target_net_sales_php'] *= 100
        changed[0][-1]['prior_Alabat_rainfall_mm'] *= 10
        after = engine.evaluate(*changed)
        for model in engine.MODELS:
            first = [x['prediction_php'] for x in before['points'] if x['model_id'] == model]
            second = [x['prediction_php'] for x in after['points'] if x['model_id'] == model]
            self.assertEqual(first[:-1], second[:-1])
            if model != 'combined_alabat_sensitivity':
                self.assertEqual(first, second)
        self.assertEqual(before['fits'], after['fits'])

    def test_missing_month_keeps_calendar_lag_and_identical_training_cohort(self):
        rows, policy, preflight = fixture()
        rows[15]['prior_Tayabas_rainfall_mm'] = None
        rows[15]['missing_fields'] = ['prior_Tayabas_rainfall_mm']
        rows[15]['eligible_numerical_case'] = False
        result = engine.evaluate(rows, policy, preflight)
        self.assertEqual(result['points'][0]['training_cases'], 71)
        self.assertEqual(len(result['points']), 48)
        self.assertNotIn(rows[15]['target_month'], result['fits'][0]['training_keys'])
        self.assertEqual(rows[16]['origin_month'], rows[15]['target_month'])

    def test_duplicate_nonfinite_boolean_wrong_lag_and_false_completeness_rejected(self):
        original = fixture()[0]
        for alteration in ('duplicate', 'nonfinite', 'boolean', 'lag', 'eligibility'):
            rows = copy.deepcopy(original)
            if alteration == 'duplicate': rows.append(rows[0])
            elif alteration == 'nonfinite': rows[2]['prior_Dengue_cases'] = 'nan'
            elif alteration == 'boolean': rows[2]['prior_Dengue_cases'] = True
            elif alteration == 'lag': rows[2]['weather_month'] = '2018-01'
            else: rows[2]['eligible_numerical_case'] = False
            with self.subTest(alteration=alteration), self.assertRaises(ValueError):
                engine.validate_rows(rows)

    def test_constant_and_rank_deficient_designs_are_unavailable(self):
        rows, _, _ = fixture()
        for row in rows: row['prior_Tayabas_rainfall_mm'] = 100
        with self.assertRaisesRegex(ValueError, 'Constant'):
            engine.fit_ols(rows[:72], rows[72], 'combined_tayabas_primary')
        for row in rows: row['prior_Tayabas_rainfall_mm'] = row['prior_Dengue_cases']
        with self.assertRaisesRegex(ValueError, 'Rank-deficient'):
            engine.fit_ols(rows[:72], rows[72], 'combined_tayabas_primary')

    def test_signed_predictions_are_not_clipped(self):
        # Shift outcomes without changing the full-rank feature design.
        rows, _, _ = fixture()
        for row in rows: row['target_net_sales_php'] -= 1000000
        prediction, _ = engine.fit_ols(rows[:72], rows[72], 'sales_calendar_baseline')
        self.assertLess(prediction, 0)

    def test_owner_boolean_alone_cannot_override_row_or_source_gates(self):
        rows, policy, preflight = fixture()
        policy.update(owner_decision='accepted', owner_identity='fixture', decision_evidence='fixture')
        self.assertTrue(engine.external_blockers(rows, policy, preflight))
        accepted_rows, accepted_policy, accepted_preflight = fixture(accepted=True)
        accepted_rows[0]['accepted_model_input'] = False
        self.assertTrue(engine.external_blockers(accepted_rows, accepted_policy, accepted_preflight))

    def test_failure_is_not_a_complete_comparison(self):
        with patch.object(engine, 'fit_ols', side_effect=ValueError('rank failure')):
            result = engine.evaluate(*fixture(accepted=True))
        self.assertEqual(result['status'], 'partial_unavailable')
        self.assertFalse(result['external_models_fitted'])
        self.assertEqual(result['metrics']['sales_calendar_baseline']['status'], 'unavailable')

    def test_registration_precedes_run_and_rejects_drift_and_overwrites(self):
        with tempfile.TemporaryDirectory(prefix='external-revenue-test-', dir=ROOT) as directory:
            work = Path(directory)
            self.assertTrue(work.resolve().is_relative_to(ROOT.resolve()))
            rows, policy, preflight = fixture()
            for name, value in [('input.json', rows), ('policy.json', policy), ('preflight.json', preflight)]:
                engine.save(work / name, value)
            registration = work / 'registration.json'
            engine.register(ROOT, work/'input.json', work/'policy.json', work/'preflight.json', registration)
            with self.assertRaises(FileExistsError):
                engine.register(ROOT, work/'input.json', work/'policy.json', work/'preflight.json', registration)
            engine.run(ROOT, registration, work/'run')
            with self.assertRaisesRegex(ValueError, 'exists'):
                engine.run(ROOT, registration, work/'run')
            (work/'input.json').write_text('[]', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'drift'):
                engine.run(ROOT, registration, work/'different-run')
            self.assertFalse((work/'different-run').exists())

    def test_changed_recipe_is_rejected(self):
        rows, policy, preflight = fixture()
        policy['comparison']['lag_search'] = True
        with self.assertRaisesRegex(ValueError, 'no-search'):
            engine.evaluate(rows, policy, preflight)

    def test_registration_rejects_inherited_policy_drift_before_rebinding(self):
        with tempfile.TemporaryDirectory(prefix='external-revenue-drift-', dir=ROOT) as directory:
            work = Path(directory)
            self.assertTrue(work.resolve().is_relative_to(ROOT.resolve()))
            rows, policy, preflight = fixture()
            engine.save(work/'input.json', rows)
            engine.save(work/'policy.json', policy)
            name = (work/'policy.json').relative_to(ROOT).as_posix()
            preflight['source_sha256'][name] = engine.sha(work/'policy.json')
            engine.save(work/'preflight.json', preflight)
            policy['owner_identity'] = 'changed after preparation'
            (work/'policy.json').write_text(json.dumps(policy), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'drift'):
                engine.register(ROOT, work/'input.json', work/'policy.json',
                                work/'preflight.json', work/'registration.json')
            self.assertFalse((work/'registration.json').exists())


if __name__ == '__main__':
    unittest.main()
