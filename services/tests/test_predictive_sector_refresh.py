"""Hand-computed and cutoff/registration probes for offline refresh evaluation."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service.predictive.contracts import month
from services.analytics_service.predictive.metrics import score
from services.analytics_service.predictive import sector_refresh_experiment as experiment


def complete_input():
    rows = []
    for year in range(2020, 2026):
        for number in range(1, 13):
            values = {'Government': 10.0, 'Private': 20.0, 'Internal': -2.0, 'All': 28.0}
            rows.extend(dict(period=f'{year}-{number:02d}', scope=scope, value=value)
                        for scope, value in values.items())
    return dict(manifest=dict(source_id='isolated-fixture', source_period_start='2017-01',
                              source_period_end='2025-12', input_period_start='2020-01', input_period_end='2025-12'), rows=rows)


def set_month(data, target, values):
    for row in data['rows']:
        if row['period'] == target and row['scope'] in values:
            row['value'] = values[row['scope']]


class SectorRefreshTests(unittest.TestCase):
    def test_exact_minimal_dependencies_and_hand_computed_values(self):
        origin = month('2022-12')
        series = {origin: -6, origin - 1: 0, origin - 2: 12, origin - 3: 18,
                  origin - 4: -12, origin - 5: 6, month('2022-03'): 7}
        expected = {'last_value': -6, 'mean_3': 2, 'mean_6': 3, 'seasonal_naive': 7}
        for model, prediction in expected.items():
            actual, reason, required = experiment.predict(series, origin, month('2023-03'), model)
            self.assertIsNone(reason)
            self.assertEqual(actual, prediction)
            self.assertTrue(all(month(value) <= origin for value in required))
        del series[origin - 3]
        self.assertEqual(experiment.predict(series, origin, origin + 1, 'mean_3')[0], 2)
        self.assertIsNone(experiment.predict(series, origin, origin + 1, 'mean_6')[0])

    def test_future_mutation_cannot_change_any_prediction(self):
        origin = month('2022-12')
        series = {origin - offset: float(offset - 10) for offset in range(36)}
        mutated = {**series, **{origin + lead: -1e12 for lead in range(1, 37)}}
        for model in experiment.MODEL_IDS:
            for lead in (1, 3, 6, 12):
                self.assertEqual(experiment.predict(series, origin, origin + lead, model),
                                 experiment.predict(mutated, origin, origin + lead, model))

    def test_missing_does_not_become_zero_and_input_window_is_enforced(self):
        origin = month('2022-12')
        self.assertEqual(experiment.predict({origin: 0}, origin, origin + 1, 'last_value')[0], 0)
        self.assertIsNone(experiment.predict({origin: None}, origin, origin + 1, 'last_value')[0])
        self.assertIsNone(experiment.predict({origin - 1: 1}, origin, origin + 1, 'last_value')[0])
        with self.assertRaisesRegex(ValueError, 'lead 1 through 12'):
            experiment.predict({origin: 1}, origin, origin + 13, 'last_value')
        self.assertIsNone(experiment.predict({month('2019-12'): 10}, month('2019-12'), month('2020-01'), 'last_value')[0])

    def test_signed_zero_denominator_metric_hand_math(self):
        result = score([(-10, -5), (10, 7)])
        self.assertEqual(result['mae'], 4)
        self.assertEqual(result['bias'], 1)
        self.assertEqual(result['wape'], 40)
        self.assertEqual(result['normalized_bias'], 10)
        self.assertIsNone(score([(0, -3), (0, 1)])['wape'])

    def test_calendar_validation_rejects_duplicates_nonfinite_boolean_dates_scope_and_bounds(self):
        mutations = [lambda data: data['rows'].append(copy.deepcopy(data['rows'][0])),
                     lambda data: data['rows'][0].update(value=float('nan')),
                     lambda data: data['rows'][0].update(value=True),
                     lambda data: data['rows'][0].update(period='2020-13'),
                     lambda data: data['rows'][0].update(period='0000-01'),
                     lambda data: data['rows'][0].update(scope='Unknown'),
                     lambda data: data['rows'].pop(),
                     lambda data: data['manifest'].update(source_period_start='2021-01'),
                     lambda data: data['manifest'].update(input_period_end='2026-12')]
        for mutation in mutations:
            data = complete_input()
            mutation(data)
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                experiment.validate_input(data)

    def test_observed_subtotal_reconciles_without_imputing_absent_sector(self):
        data = complete_input()
        set_month(data, '2023-02', {'Government': None, 'All': 18})
        series = experiment.validate_input(data)
        self.assertIsNone(series['Government'][month('2023-02')])
        self.assertEqual(series['All'][month('2023-02')], 18)
        set_month(data, '2023-02', {'All': 19})
        with self.assertRaisesRegex(ValueError, 'accounting reconciliation'):
            experiment.validate_input(data)

    def test_common_intersection_exact_keys_and_native_support(self):
        base = dict(stage='development', scope='All', schedule='monthly_rolling', actual=10,
                    prediction_reason=None, required_periods=[])
        points = []
        for model in experiment.MODEL_IDS:
            for origin, target, lead in [('2022-12', '2023-01', 1), ('2022-11', '2023-01', 2)]:
                points.append(dict(base, origin_period=origin, target_period=target, lead_months=lead,
                                   model_id=model, prediction=None if model == 'mean_6' and lead == 2 else 8))
        points[-1]['prediction_reason'] = 'Missing history'
        summary = next(item for item in experiment.common_comparisons(points) if item['lead_group'] == 'leads_1_3')
        self.assertEqual(summary['common_keys'], [['2022-12', '2023-01', 1]])
        self.assertEqual(summary['unique_target_count'], 1)
        self.assertEqual(summary['models']['last_value']['native_support']['eligible_count'], 2)
        self.assertEqual(summary['models']['last_value']['common_metrics']['n'], 1)
        self.assertEqual(summary['models']['mean_6']['native_support']['prediction_missing_count'], 1)

    def test_schedule_comparison_same_targets_with_distinct_origins(self):
        base = dict(stage='development', scope='All', model_id='last_value', actual=10,
                    prediction_reason=None, required_periods=[])
        points = [dict(base, schedule='annual_fixed', origin_period='2022-12', target_period='2023-03', lead_months=3, prediction=5),
                  dict(base, schedule='monthly_rolling', origin_period='2023-02', target_period='2023-03', lead_months=1, prediction=9),
                  dict(base, schedule='monthly_rolling', origin_period='2023-03', target_period='2023-04', lead_months=1, prediction=10)]
        summary = next(item for item in experiment.schedule_comparisons(points)
                       if item['stage'] == 'development' and item['scope'] == 'All' and item['model_id'] == 'last_value')
        self.assertEqual(summary['target_periods'], ['2023-03'])
        self.assertEqual(summary['annual_fixed']['metrics']['wape'], 50)
        self.assertEqual(summary['monthly_rolling_lead_1']['metrics']['wape'], 10)
        self.assertEqual(summary['annual_fixed']['keys'], [['2022-12', '2023-03', 3]])

    def test_bottom_up_linear_additivity_and_explicit_missing_sector(self):
        data = complete_input()
        points = experiment.generate_predictions(experiment.validate_input(data))
        direct = {(point['schedule'], point['origin_period'], point['target_period'], point['model_id']): point['prediction']
                  for point in points if point['scope'] == 'All'}
        for point in points:
            if point['scope'] == 'BottomUp':
                self.assertEqual(point['prediction'], direct[(point['schedule'], point['origin_period'], point['target_period'], point['model_id'])])
        set_month(data, '2023-02', {'Government': None, 'All': 18})
        points = experiment.generate_predictions(experiment.validate_input(data))
        point = next(point for point in points if point['scope'] == 'BottomUp' and point['origin_period'] == '2023-02'
                     and point['target_period'] == '2023-03' and point['model_id'] == 'last_value' and point['schedule'] == 'monthly_rolling')
        self.assertIsNone(point['prediction'])
        self.assertEqual(point['missing_scopes'], ['Government'])

    def test_window_monthly_error_does_not_equal_cancelled_total_error(self):
        points = [dict(stage='development', scope='All', model_id='last_value', schedule='monthly_rolling',
                       origin_period='2022-12', target_period=f'2023-{lead:02d}', lead_months=lead, actual=actual, prediction=10)
                  for lead, actual in [(1, 5), (2, 15), (3, 10)]]
        window = experiment.complete_windows(points)[0]
        self.assertEqual(window['sum_absolute_monthly_errors'], 10)
        self.assertEqual(window['absolute_total_error'], 0)
        self.assertEqual(window['actual_total'], 30)
        points[0]['actual'] = None
        window = experiment.complete_windows(points)[0]
        self.assertFalse(window['complete'])
        self.assertIsNone(window['absolute_total_error'])

    def test_registration_input_protocol_code_drift_and_exclusive_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'input.json'
            source.write_text(json.dumps(complete_input()), encoding='utf-8')
            output = Path(folder) / 'run'
            experiment.prepare(source, output)
            with self.assertRaises(FileExistsError):
                experiment.prepare(source, output)
            original = source.read_text(encoding='utf-8')
            source.write_text(original + '\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'identity drift'):
                experiment.run(source, output)
            source.write_text(original, encoding='utf-8')
            with patch.dict(experiment.PROTOCOL, {'version': 'unexpected-change'}):
                with self.assertRaisesRegex(ValueError, 'identity drift'):
                    experiment.run(source, output)
            current = experiment._identity(source)
            changed = copy.deepcopy(current)
            changed['code_sha256']['metrics.py'] = 'changed-code'
            with patch.object(experiment, '_identity', return_value=changed):
                with self.assertRaisesRegex(ValueError, 'identity drift'):
                    experiment.run(source, output)
            changed = copy.deepcopy(current)
            changed['runtime']['python_version'] = 'unexpected-runtime'
            with patch.object(experiment, '_identity', return_value=changed):
                with self.assertRaisesRegex(ValueError, 'identity drift'):
                    experiment.run(source, output)
            (output / 'RESULTS.md').write_text('retained user evidence', encoding='utf-8')
            with self.assertRaises(FileExistsError):
                experiment.run(source, output)
            self.assertEqual((output / 'RESULTS.md').read_text(encoding='utf-8'), 'retained user evidence')

    def test_registered_four_model_grid_drift_is_rejected(self):
        with patch.object(experiment, 'BENCHMARKS', [{'model_id': 'last_value'}]):
            with self.assertRaisesRegex(ValueError, 'four-benchmark grid'):
                experiment.evaluate(complete_input())


if __name__ == '__main__':
    unittest.main()
