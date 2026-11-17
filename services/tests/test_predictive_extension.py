from copy import deepcopy
import hashlib
import json
import math
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service.predictive import engine, extension
from services.analytics_service.predictive.contracts import month, period


def fixtures(accepted=True):
    rows = []
    for number in range(month('2020-01'), month('2026-09') + 1):
        lead = number - month('2025-12')
        value = 100 + 10 * lead if lead > 0 else 100
        rows.append(dict(series_id='company:net_sales:PHP', target_name='net_sales', grain='company_month',
                         scope='company', unit='PHP', period=period(number), target_value=value,
                         value_status='observed', period_closed=True, coverage_status='complete' if accepted else 'unknown',
                         eligible_for_evaluation=accepted, blockers=[] if accepted else ['coverage_unverified']))
    manifest = dict(dataset_id='a' * 64, source_checksum='b' * 64, fact_delta_version=0,
                    source_table='workspace.medshield_gold_source_20261022.sales_restart_fact_candidate',
                    transformation_policy='sales_restart_gold_v8_isolated_source_rebuild',
                    catalog_mapping_version='catalog', geography_mapping_version='area',
                    accepted_descriptive_release_id='b' * 64, extracted_at='2026-10-24T12:00:00Z',
                    source_available_at='2026-10-24T12:00:00Z', revision_policy='retrospective_revised_snapshot',
                    reconciliation_passed=True, training_approved=accepted, publication_approved=False)
    data = dict(schema_version='1.0', manifest=manifest, rows=rows)
    input_hash = hashlib.sha256(json.dumps(data).encode()).hexdigest()
    plan = dict(schema_version=1, status='prepared_not_executed_not_approval',
                dataset_id=manifest['dataset_id'], fact_delta_version=0, source_table=manifest['source_table'],
                frozen_input_sha256=input_hash, descriptive_receipt_sha256=manifest['source_checksum'],
                target=dict(name='net_sales', unit='PHP', scope='company', grain='company_month'),
                schedule=deepcopy(engine.DEFAULT_SCHEDULE), candidate_grid=[dict(model_id='last_value')],
                experimental_selection_criteria=deepcopy(engine.CRITERIA), publication_approved=False,
                retrospective_extension=dict(origin='2025-12', first_target='2026-01', last_observed_target='2026-09',
                                             observed_months=9, selection_allowed=False, untouched_holdout=False,
                                             target_after_2026_09='unknown_not_zero'))
    return data, plan


def evaluate(data, plan):
    input_hash = hashlib.sha256(json.dumps(data).encode()).hexdigest()
    bound_plan = {**plan, 'frozen_input_sha256': input_hash}
    return extension.run(data, bound_plan, input_sha256=input_hash,
                         plan_sha256=hashlib.sha256(json.dumps(bound_plan).encode()).hexdigest(),
                         code_identity={'status': 'synthetic_test'})


class PredictiveExtensionTests(unittest.TestCase):
    def test_unknown_training_blocks_before_any_engine_or_fold_call(self):
        data, plan = fixtures(accepted=False)
        with patch.object(engine, 'run', side_effect=AssertionError('Must not fit')), patch.object(engine, 'evaluate_fold', side_effect=AssertionError('Must not evaluate')):
            result = evaluate(data, plan)
        self.assertEqual(result['status'], 'blocked')
        self.assertIn('training_approved is not accepted', result['blockers'])
        self.assertEqual(result['predictions'], [])
        self.assertIsNone(result['base_run'])

    def test_plan_identity_selection_and_audit_must_remain_bound(self):
        data, plan = fixtures()
        changes = [dict(dataset_id='c' * 64), dict(source_table='workspace.medshield_gold.sales_restart_fact_candidate'),
                   dict(fact_delta_version=20), dict(descriptive_receipt_sha256='d' * 64),
                   dict(publication_approved=True), dict(target=dict(name='quantity', unit='units', scope='company', grain='company_month')),
                   dict(schedule={**plan['schedule'], 'audit_end': '2025-09'}),
                   dict(retrospective_extension={**plan['retrospective_extension'], 'selection_allowed': True})]
        for change in changes:
            with self.subTest(change=change), self.assertRaises(ValueError), patch.object(engine, 'run', side_effect=AssertionError('Must not fit')):
                evaluate(data, {**plan, **change})

    def test_incomplete_accepted_window_blocks_before_fitting(self):
        data, plan = fixtures()
        data['rows'] = [r for r in data['rows'] if r['period'] != '2026-06']
        with patch.object(engine, 'run', side_effect=AssertionError('Must not fit')):
            result = evaluate(data, plan)
        self.assertEqual(result['status'], 'blocked')
        self.assertIn('Complete accepted', result['blockers'][0])

    def test_synthetic_nine_case_metrics_origin_and_selection(self):
        data, plan = fixtures()
        result = evaluate(data, plan)
        self.assertEqual(result['status'], 'evaluated_unpublished')
        self.assertEqual(result['training_count'], 72)
        self.assertEqual(result['training_origin'], '2025-12')
        points = result['predictions']
        self.assertEqual(len(points), 9)
        self.assertEqual([p['lead_months'] for p in points], list(range(1, 10)))
        self.assertEqual({p['origin_period'] for p in points}, {'2025-12'})
        self.assertEqual({p['prediction'] for p in points}, {100})
        metric = result['evaluations'][0]['metrics']
        self.assertEqual(metric['n'], 9)
        self.assertEqual(metric['mae'], 50)
        self.assertEqual(metric['bias'], -50)
        self.assertAlmostEqual(metric['rmse'], math.sqrt(28500 / 9))
        self.assertAlmostEqual(metric['wape'], 100 * 450 / 1350)
        self.assertEqual(result['comparisons']['last_value']['common']['n'], 9)
        self.assertEqual(result['selection'], result['base_run']['selection'])
        audit = [p for p in result['base_run']['predictions'] if p['stage'] == 'retrospective_audit']
        self.assertEqual(len(audit), 12)
        self.assertTrue(all(p['actual'] is None for p in result['base_run']['predictions'] if p['stage'] == 'future'))
        self.assertFalse(result['publication_approved'])

    def test_changed_extension_actuals_cannot_enter_origin_training(self):
        data, plan = fixtures()
        first = evaluate(data, plan)
        for row in data['rows']:
            if row['period'] >= '2026-01':
                row['target_value'] *= 100
        changed = evaluate(data, plan)
        self.assertEqual([p['prediction'] for p in first['predictions']], [p['prediction'] for p in changed['predictions']])
        self.assertEqual(first['training_sha256'], changed['training_sha256'])
        self.assertEqual(first['selection'], changed['selection'])

    def test_failed_challenger_does_not_shrink_shared_cases(self):
        data, plan = fixtures()
        plan['candidate_grid'].append(dict(model_id='seasonal_naive'))
        original_fold = engine.evaluate_fold

        def one_failed_point(*args, **kwargs):
            points = original_fold(*args, **kwargs)
            if args[6] == extension.EXTENSION_STAGE and args[3]['model_id'] == 'seasonal_naive':
                points[0]['prediction'] = None
                points[0]['missing_reason'] = 'Synthetic unavailable prediction'
            return points

        with patch.object(engine, 'evaluate_fold', side_effect=one_failed_point):
            result = evaluate(data, plan)
        by_model = {r['model_id']: r for r in result['evaluations']}
        self.assertEqual(by_model['seasonal_naive']['metrics']['n'], 8)
        self.assertFalse(by_model['seasonal_naive']['complete_for_comparison'])
        self.assertEqual(result['comparison_models'], ['last_value'])
        self.assertEqual(result['comparisons']['last_value']['common']['n'], 9)
        self.assertEqual(result['selection'], result['base_run']['selection'])

    def test_new_input_requires_a_rebound_plan(self):
        data, plan = fixtures()
        old_hash = plan['frozen_input_sha256']
        data['manifest']['extracted_at'] = '2026-10-24T13:00:00Z'
        new_hash = hashlib.sha256(json.dumps(data).encode()).hexdigest()
        self.assertNotEqual(old_hash, new_hash)
        with self.assertRaisesRegex(ValueError, 'input checksum'), patch.object(engine, 'run', side_effect=AssertionError('Must not fit')):
            extension.run(data, plan, input_sha256=new_hash, plan_sha256='f' * 64, code_identity={'status': 'synthetic_test'})

    def test_checked_artifact_rejects_changed_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'input.json'
            source.write_text('{}', encoding='utf-8')
            source.with_suffix('.sha256').write_text(hashlib.sha256(source.read_bytes()).hexdigest(), encoding='utf-8')
            self.assertEqual(extension.checked_json(source)[0], {})
            source.write_text('{"changed": true}', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                extension.checked_json(source)
