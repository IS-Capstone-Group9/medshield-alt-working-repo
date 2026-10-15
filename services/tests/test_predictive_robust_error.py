"""Synthetic numerical/leakage and receipt boundaries; no measured sales evaluation."""
import copy
from decimal import Decimal
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import warnings

from services.analytics_service.predictive import robust_error_experiment as robust
from services.analytics_service.predictive import annual_projection as evidence
from services.analytics_service.predictive.contracts import digest, month, period
from services.analytics_service.predictive.engine import DEFAULT_SCHEDULE
from services.analytics_service.predictive.metrics import score
from services.tests.test_predictive import fixture
from services.tests.test_predictive_annual_projection import comparison_fixture


def comparison_for(data):
    result = comparison_fixture(data)
    series = {row['period']: row['target_value'] for row in data['rows']}
    baseline = []
    for stage, origins in [('development', DEFAULT_SCHEDULE['development_origins']),
                           ('retrospective_audit', [DEFAULT_SCHEDULE['audit_origin']])]:
        for origin in origins:
            for lead in robust.LEADS:
                target = period(month(origin) + lead)
                baseline.append(dict(model_id='last_value', series_id='fixture_company', target_name='net_sales',
                    unit='PHP', scope='company', origin_period=origin, target_period=target, lead_months=lead,
                    prediction=series[origin], actual=series[target], stage=stage))
    result['predictions'] = baseline
    dev = score([(p['actual'], p['prediction']) for p in baseline if p['stage'] == 'development'])
    audit = score([(p['actual'], p['prediction']) for p in baseline if p['stage'] == 'retrospective_audit'])
    for entry in result['evaluations']:
        entry.update(development_scored=copy.deepcopy(dev), audit=copy.deepcopy(audit))
        if entry['model_id'] != 'last_value':
            entry['development_scored']['wape'] += 10
    return result


def write_sources(root):
    data = fixture()
    comparison = comparison_for(data)
    frozen = root / 'input.json'
    frozen.write_bytes(evidence.encode(data))
    frozen.with_suffix('.sha256').write_text(evidence.raw_hash(frozen.read_bytes()), encoding='utf-8')
    parent = root / 'comparison'
    output = parent / 'fixture-run'
    output.mkdir(parents=True)
    (parent / 'protocol.json').write_bytes(evidence.encode(dict(identity=dict(
        input_sha256=evidence.raw_hash(frozen.read_bytes()), protocol=comparison['experiment_protocol']))))
    artifacts = {'run.json': comparison, 'predictions.json': comparison['predictions'],
        'evaluations.json': comparison['evaluations'], 'model-cards.json': comparison['model_cards'],
        'input-manifest.json': comparison['manifest'], 'folds.json': [], 'warnings.json': [], 'coverage.json': dict(rows=72)}
    hashes = {'../protocol.json': evidence.raw_hash((parent / 'protocol.json').read_bytes())}
    for name, value in artifacts.items():
        raw = evidence.encode(value)
        (output / name).write_bytes(raw)
        hashes[name] = evidence.raw_hash(raw)
    (output / 'RESULTS.md').write_text('Synthetic fixture only', encoding='utf-8')
    hashes['RESULTS.md'] = evidence.raw_hash((output / 'RESULTS.md').read_bytes())
    (output / 'artifact-hashes.json').write_bytes(evidence.encode(hashes))
    return frozen, output / 'run.json'


class RobustErrorTests(unittest.TestCase):
    def setUp(self):
        self.start, self.origin = month('2020-01'), month('2022-12')
        self.series = {p: 10. for p in range(self.start, self.origin + 1)}
        self.data = fixture()

    def evaluate(self, data=None):
        data = data or self.data
        comparison = comparison_for(data)
        record = robust.registration(data, comparison, dict(source='synthetic_fixture_only'))
        return robust.evaluate(data, comparison, record)

    def test_signed_even_median_weighted_duplicates_and_lower_tie(self):
        self.assertEqual(robust.median([-5, 0, 15]), Decimal(0))
        self.assertEqual(robust.median([-10, 0, 10, 30]), Decimal(5))
        self.assertEqual(robust.lower_weighted_median([0, 0, 0, 10, 10, 0], [1, 2, 3, 4, 5, 6]), Decimal(0))
        self.assertEqual(robust.lower_weighted_median([Decimal('0.9'), Decimal('1.1')], [100, 100]), Decimal('0.9'))
        # Repeated endpoint10/target10 cases retain weight20 at ratio1, versus weight15 at ratio2.
        self.assertEqual(robust.lower_weighted_median([1, 1, 2], [10, 10, 15]), Decimal(1))
        for values, weights in [([], []), ([1], [0]), ([1], [-1]), ([1, 2], [1])]:
            with self.subTest(values=values), self.assertRaises(ValueError):
                robust.lower_weighted_median(values, weights)

    def test_exact_recent_window_and_seasonal_reference_arithmetic(self):
        series = dict(self.series)
        series[self.origin - 2], series[self.origin - 1], series[self.origin] = -5., 0., 15.
        values, _ = robust.robust_forecast(series, self.start, self.origin, [1, 12], robust.CONFIGURATIONS[0])
        self.assertEqual(values, {1: 0., 12: 0.})
        series = dict(self.series)
        references = [self.origin + 1 - offset for offset in (12, 24, 36)]
        for number, value in zip(references, [-5., 0., 15.]):
            series[number] = value
        values, metadata = robust.robust_forecast(series, self.start, self.origin, [1], robust.CONFIGURATIONS[4])
        self.assertEqual(values[1], 5.)
        self.assertEqual(metadata['seasonal_references'][0]['reference_periods'], list(map(period, references)))

    def test_origin_local_scalar_bounds_signed_endpoints_and_zero_constant_loss(self):
        config = robust.CONFIGURATIONS[5]
        for endpoint, future, bound in [(100., 130., Decimal('1.1')), (100., 70., Decimal('0.9')),
                                       (-100., -130., Decimal('1.1'))]:
            series = dict(self.series)
            series[self.start + 23] = endpoint
            for number in range(self.start + 24, self.origin + 1):
                series[number] = future
            predictions, metadata = robust.robust_forecast(series, self.start, self.origin, [1, 12], config)
            calibration = metadata['calibration']
            self.assertEqual(Decimal(calibration['learned_scale']), bound)
            self.assertEqual(predictions, {1: float(bound * Decimal(str(future))), 12: float(bound * Decimal(str(future)))})
            self.assertEqual((calibration['inner_origin_count'], calibration['inner_case_count']), (1, 12))
            self.assertLessEqual(Decimal(calibration['inner_absolute_loss_calibrated_php']), Decimal(calibration['inner_absolute_loss_unscaled_php']))
        series = dict(self.series)
        series[self.start + 23] = 0.
        values, metadata = robust.robust_forecast(series, self.start, self.origin, [1], config)
        calibration = metadata['calibration']
        self.assertEqual(values[1], 10.)
        self.assertEqual(calibration['learned_scale'], '1')
        self.assertIsNone(calibration['unbounded_l1_scale'])
        self.assertEqual((calibration['informative_case_count'], calibration['zero_endpoint_case_count']), (0, 12))
        self.assertEqual(Decimal(calibration['inner_zero_endpoint_constant_absolute_loss_php']), Decimal(120))
        self.assertEqual(calibration['inner_absolute_loss_calibrated_php'], calibration['inner_absolute_loss_unscaled_php'])
        self.assertIn('uncalibrated', calibration['calibration_reason'])

    def test_future_sentinel_invariance_for_every_recipe_and_metadata(self):
        sentinel = {**self.series, self.origin + 1: float('nan'), self.origin + 12: -1e15,
                    self.start - 1: 1e15}
        for config in robust.CONFIGURATIONS:
            with self.subTest(model=config['model_id']):
                before = robust.robust_forecast(self.series, self.start, self.origin, robust.LEADS, config)
                after = robust.robust_forecast(sentinel, self.start, self.origin, robust.LEADS, config)
                self.assertEqual(evidence.encode(before), evidence.encode(after))

    def test_invalid_leads_origin_gaps_nonfinite_and_recipe_fail_explicitly(self):
        for leads in ([], [0], [13], [True], [1.], [1, 1]):
            with self.subTest(leads=leads), self.assertRaisesRegex(ValueError, 'integer leads'):
                robust.robust_forecast(self.series, self.start, self.origin, leads, robust.CONFIGURATIONS[0])
        for offset in (0, 35, 10):
            series = dict(self.series)
            del series[self.origin - offset]
            with self.subTest(offset=offset), self.assertRaisesRegex(ValueError, 'contiguous'):
                robust.robust_forecast(series, self.start, self.origin, [1], robust.CONFIGURATIONS[0])
        with self.assertRaisesRegex(ValueError, '36 contiguous'):
            robust.robust_forecast(self.series, self.start + 1, self.origin, [1], robust.CONFIGURATIONS[0])
        with self.assertRaisesRegex(ValueError, 'Integer origin'):
            robust.robust_forecast(self.series, self.start, True, [1], robust.CONFIGURATIONS[0])
        for value in (float('nan'), float('inf'), True):
            series = dict(self.series)
            series[self.start] = value
            with self.subTest(value=value), self.assertRaises(ValueError):
                robust.robust_forecast(series, self.start, self.origin, [1], robust.CONFIGURATIONS[0])
        with self.assertRaisesRegex(ValueError, 'altered robust'):
            robust.robust_forecast(self.series, self.start, self.origin, [1], dict(robust.CONFIGURATIONS[0], window=5))

    def test_partial_nonfinite_malformed_adapter_and_warning_null_entire_fold(self):
        series = {**self.series, **{self.origin + lead: 10. for lead in robust.LEADS}}
        outputs = [({1: 7.}, {}), ({lead: float('nan') if lead == 2 else 7. for lead in robust.LEADS}, {}),
                   (None, {}), None, ({lead: 7. for lead in robust.LEADS}, None),
                   ({True: 7., **{lead: 7. for lead in range(2, 13)}}, {})]
        for output in outputs:
            with patch.object(robust, 'robust_forecast', return_value=output):
                points, metadata = robust.fold(series, 'fixture_company', self.start, self.origin, robust.CONFIGURATIONS[0], 'fixture', 'development')
            self.assertTrue(all(p['prediction'] is None and p['missing_reason'] for p in points))
            self.assertEqual(len(points), 12)
            self.assertTrue(metadata['unavailable_reason'])

        class ConvergenceWarning(UserWarning):
            pass

        def warning(*args):
            warnings.warn('Convergence failed', ConvergenceWarning)
            return {lead: 7. for lead in robust.LEADS}, {}
        with patch.object(robust, 'robust_forecast', side_effect=warning):
            points, metadata = robust.fold(series, 'fixture_company', self.start, self.origin, robust.CONFIGURATIONS[0], 'fixture', 'development')
        self.assertEqual(metadata['warnings'][0]['category'], 'ConvergenceWarning')
        self.assertTrue(all(p['prediction'] is None for p in points))

    def test_all_six_outer_folds_only_receive_origin_history_with_traced_inner_support(self):
        calls = []
        predictor = robust.robust_forecast

        def observe(series, start, origin, leads, config):
            self.assertEqual(set(series), set(range(start, origin + 1)))
            self.assertEqual(max(series), origin)
            calls.append((period(origin), config['model_id']))
            return predictor(series, start, origin, leads, config)

        with patch.object(robust, 'robust_forecast', side_effect=observe):
            result = self.evaluate()
        self.assertEqual(len(calls), 36)
        self.assertEqual([origin for origin, _ in calls[:30]], DEFAULT_SCHEDULE['development_origins'] * 6)
        self.assertEqual([origin for origin, _ in calls[30:]], ['2024-12'] * 6)
        scalar_folds = [f['calibration'] for f in result['folds'] if f['model_id'] == robust.CONFIGURATIONS[5]['model_id']]
        self.assertEqual([f['inner_origin_count'] for f in scalar_folds], [1, 2, 3, 4, 5, 9])
        self.assertEqual([f['inner_case_count'] for f in scalar_folds], [12, 24, 36, 48, 60, 108])
        for fold in [f for f in result['folds'] if 'calibration' in f]:
            calibration = fold['calibration']
            self.assertEqual(digest(calibration['inner_cases']), calibration['inner_cases_hash'])
            self.assertLessEqual(Decimal(calibration['inner_absolute_loss_calibrated_php']),
                                 Decimal(calibration['inner_absolute_loss_unscaled_php']))
            self.assertTrue(all(month(case['target_period']) <= month(fold['origin_period']) for case in calibration['inner_cases']))
            for inner in calibration['inner_folds']:
                self.assertLessEqual(month(inner['origin_period']) + 12, month(fold['origin_period']))

    def test_audit_actual_mutation_cannot_change_new_development_choice_or_audit_prediction(self):
        before = self.evaluate()
        changed = copy.deepcopy(self.data)
        for row in changed['rows']:
            if row['period'].startswith('2025'):
                row['target_value'] *= -100
        after = self.evaluate(changed)
        for field in ('best_new_complete_recipe', 'criteria_selected_model', 'criteria_review'):
            self.assertEqual(before['development_freeze'][field], after['development_freeze'][field])
        self.assertEqual([(robust.point_key(p), p['prediction']) for p in before['predictions']],
                         [(robust.point_key(p), p['prediction']) for p in after['predictions']])
        self.assertNotEqual(before['evaluations'][0]['retrospective_audit']['mae'], after['evaluations'][0]['retrospective_audit']['mae'])

    def test_same_calendar_cohorts_original_selection_no_approval_no_future_and_freeze_before_audit(self):
        self.data['manifest']['publication_approved'] = True
        result = self.evaluate()
        self.assertEqual(len(result['predictions']), 432)
        self.assertEqual(len(result['baseline_predictions']), 72)
        self.assertFalse(result['publication_approved'])
        self.assertEqual(result['original_selection']['model_id'], 'last_value')
        self.assertIsNone(result['actuals_2026'])
        self.assertIsNone(result['assessment_2026'])
        self.assertLessEqual(result['development_freeze']['frozen_at'], result['audit_execution_started_at'])
        for entry in result['evaluations']:
            self.assertEqual((entry['development']['n'], entry['development']['distinct_target_month_count'], entry['development']['origin_count']), (60, 24, 5))
            self.assertEqual((entry['retrospective_audit']['n'], entry['retrospective_audit']['origin_count']), (12, 1))
            self.assertTrue(all(metric['n'] == 5 for metric in entry['by_lead'].values()))
        self.assertTrue(all(not p['publication_approved'] and all(b['lower'] is None and b['upper'] is None for b in p['intervals']) for p in result['predictions']))
        self.assertTrue(all(not card['original_selection_changed'] and not card['publication_approved'] for card in result['model_cards']))

    def test_metrics_bias_cancellation_zero_denominator_and_empty(self):
        points = [dict(actual=1000, prediction=1100, target_period='2023-01', origin_period='2022-12'),
                  dict(actual=1000, prediction=900, target_period='2023-02', origin_period='2022-12')]
        metric = robust.metrics(points)
        self.assertEqual((metric['mae'], metric['bias'], metric['wape']), (100., 0., 10.))
        self.assertEqual((metric['overforecast_count'], metric['underforecast_count']), (1, 1))
        self.assertEqual(Decimal(metric['absolute_error_sum_php']), Decimal(200))
        self.assertIsNone(robust.metrics([])['mae'])
        points[0]['actual'], points[1]['actual'] = 0, 0
        self.assertIsNone(robust.metrics(points)['wape'])
        self.assertIsNone(robust.metrics(points)['normalized_bias'])

    def test_missing_coverage_target_approval_and_retained_key_fail_before_forecast(self):
        for mutator in [lambda data: data['rows'].pop(15),
                        lambda data: data['rows'][15].update(coverage_status='unknown', eligible_for_evaluation=False),
                        lambda data: data['rows'][15].update(target_name='quantity'),
                        lambda data: data['manifest'].update(training_approved=False),
                        lambda data: data['manifest'].update(reconciliation_passed=False)]:
            data = copy.deepcopy(self.data)
            mutator(data)
            with patch.object(robust, 'robust_forecast') as predictor, self.assertRaises(ValueError):
                comparison = comparison_for(data)
                robust.registration(data, comparison, {})
            predictor.assert_not_called()
        comparison = comparison_for(self.data)
        comparison['predictions'].append(copy.deepcopy(comparison['predictions'][0]))
        with self.assertRaisesRegex(ValueError, 'Duplicate retained baseline'):
            robust.registration(self.data, comparison, {})
        comparison = comparison_for(self.data)
        comparison['predictions'][0]['actual'] += 1
        with self.assertRaisesRegex(ValueError, 'prediction/actual/source key'):
            robust.registration(self.data, comparison, {})

    def test_source_checksum_and_json_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            frozen, comparison_path = write_sources(Path(directory))
            evidence.load_sources(frozen, comparison_path)
            original = frozen.read_bytes()
            frozen.write_bytes(original + b' ')
            with self.assertRaisesRegex(ValueError, 'Byte checksum'):
                evidence.load_sources(frozen, comparison_path)
            frozen.write_bytes(original)
            comparison_path.write_bytes(comparison_path.read_bytes() + b' ')
            with self.assertRaisesRegex(ValueError, 'Byte checksum'):
                evidence.load_sources(frozen, comparison_path)
        for raw in (b'{"x":NaN}', b'{"x":1e999}', b'{"x":1,"x":2}'):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                evidence.read_json(raw)

    def test_registered_source_code_package_config_identity_cannot_drift(self):
        comparison = comparison_for(self.data)
        changed = copy.deepcopy(comparison)
        changed['identity']['code_identity']['code_sha256']['models.py'] = 'a' * 64
        with self.assertRaisesRegex(ValueError, 'adapter code changed'):
            robust.registration(self.data, changed, {})
        changed = copy.deepcopy(comparison)
        changed['identity']['packages']['numpy'] = 'changed'
        with self.assertRaisesRegex(ValueError, 'package environment changed'):
            robust.registration(self.data, changed, {})
        changed = copy.deepcopy(comparison)
        changed['identity']['configurations'][1] = copy.deepcopy(changed['identity']['configurations'][0])
        with self.assertRaisesRegex(ValueError, 'unique inherited'):
            robust.registration(self.data, changed, {})
        changed = copy.deepcopy(comparison)
        changed['identity']['seed'] += 1
        changed['experiment_protocol']['seed'] += 1
        with self.assertRaisesRegex(ValueError, 'seed differs'):
            robust.registration(self.data, changed, {})
        record = robust.registration(self.data, comparison, {})
        record['identity']['protocol']['configurations'][0]['window'] = 5
        with self.assertRaisesRegex(ValueError, 'registration identity mismatch'):
            robust.evaluate(self.data, comparison, record)
        record['experiment_id'] = digest(record['identity'])
        with self.assertRaisesRegex(ValueError, 'Protocol differs'):
            robust.evaluate(self.data, comparison, record)

    def test_cli_prepare_no_forecast_drift_execution_artifacts_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory, patch('sys.stdout', new_callable=io.StringIO):
            root = Path(directory)
            frozen, comparison_path = write_sources(root)
            output = root / 'new-experiment'
            args = ['robust_error_experiment', '--input', str(frozen), '--comparison', str(comparison_path), '--output', str(output)]
            with patch('sys.argv', args + ['--prepare']), patch.object(robust, 'robust_forecast') as predictor:
                robust.main()
                predictor.assert_not_called()
            registered = evidence.read_json((output / 'protocol.json').read_bytes())
            changed = copy.deepcopy(registered)
            changed['identity']['protocol']['seed'] += 1
            (output / 'protocol.json').write_bytes(evidence.encode(changed))
            with patch('sys.argv', args), self.assertRaisesRegex(ValueError, 'changed since registration'):
                robust.main()
            (output / 'protocol.json').write_bytes(evidence.encode(registered))
            with patch('sys.argv', args):
                robust.main()
            run_path = next(output.glob('*/run.json'))
            result = evidence.read_json(run_path.read_bytes())
            self.assertEqual(len(result['predictions']), 432)
            self.assertEqual(len(result['baseline_predictions']), 72)
            declared = evidence.read_json((run_path.parent / 'artifact-hashes.json').read_bytes())
            self.assertTrue(all(evidence.raw_hash((run_path.parent / name).read_bytes()) == checksum for name, checksum in declared.items()))
            self.assertFalse(list(output.rglob('release-draft.json')))
            self.assertFalse(list(output.rglob('*.csv')))
            with patch('sys.argv', args), self.assertRaisesRegex(ValueError, 'already exists'):
                robust.main()
            with patch('sys.argv', args + ['--prepare']), self.assertRaisesRegex(ValueError, 'already exists'):
                robust.main()


if __name__ == '__main__':
    unittest.main()
