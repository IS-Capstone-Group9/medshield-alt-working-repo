"""Contract tests use synthetic fixtures only; they are not measured sales accuracy."""
import copy
import unittest

from services.analytics_service.predictive.contracts import display_periods, month, period, validate_input
from services.analytics_service.predictive.engine import run, validate_schedule, DEFAULT_SCHEDULE
from services.analytics_service.predictive.metrics import compare, interval, interval_metrics, score
from services.analytics_service.predictive.models import forecast
from services.analytics_service.predictive.release import release_draft


def fixture():
    manifest = {field: 'fixture_only' for field in (
        'dataset_id', 'source_checksum', 'fact_delta_version', 'transformation_policy',
        'catalog_mapping_version', 'geography_mapping_version', 'accepted_descriptive_release_id',
        'extracted_at', 'source_available_at', 'revision_policy')}
    manifest.update(training_approved=True, reconciliation_passed=True, publication_approved=False)
    return dict(schema_version='1.0', manifest=manifest, rows=[dict(
        series_id='fixture_company', target_name='net_sales', grain='company_month', scope='company', unit='PHP',
        period=period(p), target_value=100 + p % 12, period_closed=True, coverage_status='complete',
        value_status='observed', eligible_for_evaluation=True, eligible_for_publication=False, blockers=[])
        for p in range(month('2020-01'), month('2025-12') + 1)])


def point(origin, lead, prediction=9, actual=10, model='a'):
    return dict(series_id='fixture_company', target_name='net_sales', model_id=model,
                origin_period=period(origin), target_period=period(origin + lead), lead_months=lead,
                prediction=prediction, actual=actual)


class PredictiveTests(unittest.TestCase):
    def test_release_draft_is_bound_and_never_grants_approval(self):
        data = fixture()
        result = run(data, include_challengers=False)
        draft = release_draft(data, result)
        self.assertEqual(draft['publication_status'], 'candidate')
        self.assertFalse(draft['data_publication_approved'])
        self.assertEqual(draft['expected_point_count'], len(draft['points']))
        self.assertEqual(draft['last_actual_period'], '2025-12')
        changed = copy.deepcopy(data)
        changed['rows'][0]['target_value'] += 1
        with self.assertRaises(ValueError):
            release_draft(changed, result)

    def test_signed_known_metrics(self):
        result = score([(10, 12), (-5, -2), (0, -1)])
        self.assertEqual(result['mae'], 2)
        self.assertAlmostEqual(result['rmse'], (14 / 3) ** .5)
        self.assertEqual(result['wape'], 40)
        self.assertAlmostEqual(result['normalized_bias'], 100 * 4 / 15)
        self.assertIsNone(score([(0, 1)])['wape'])
        self.assertIsNone(score([])['mae'])

    def test_calendar_true_lead_and_future_year(self):
        rows = display_periods('2025-12', '2026-09', 12)
        self.assertEqual((rows[0]['lead_months'], rows[-1]['lead_months']), (9, 20))
        self.assertEqual(rows[-1]['target_period'], '2027-08')
        self.assertFalse(rows[-1]['supported'])
        self.assertEqual(period(month('2039-12') + 1), '2040-01')

    def test_no_fixed_origin_leakage(self):
        origin = month('2022-12')
        series = {origin - i: float(i) for i in range(36)}
        for config in ({'model_id': 'last_value'}, {'model_id': 'mean_3', 'window': 3}, {'model_id': 'seasonal_naive'}):
            before, _ = forecast(series, origin, [1, 6, 12], config)
            changed = {**series, origin + 1: 1e9, origin + 6: -1e9}
            self.assertEqual(before, forecast(changed, origin, [1, 6, 12], config)[0])
        self.assertEqual(forecast(series, origin, [1, 12], {'model_id': 'last_value'})[0], {1: 0., 12: 0.})

    def test_common_key_intersection_not_minimum_count(self):
        origin = month('2022-12')
        points = [point(origin, 1), point(origin, 2), point(origin, 2, model='b'), point(origin, 3, model='b')]
        result = compare(points, ['a', 'b'])
        self.assertEqual(result['a']['scored']['n'], 2)
        self.assertEqual(result['a']['common']['n'], 1)
        self.assertEqual(result['a']['common_keys'], result['b']['common_keys'])
        self.assertEqual(compare(points, ['a', 'missing'])['a']['common']['n'], 0)

    def test_missing_zero_partial_scope_duplicate(self):
        data = fixture()
        row = data['rows'][0]
        row.update(target_value=0, value_status='confirmed_zero')
        self.assertEqual(validate_input(data), [])
        row['coverage_status'] = 'partial'
        with self.assertRaises(ValueError):
            validate_input(data)
        row.update(coverage_status='complete', eligible_for_evaluation=False, target_value=None, value_status='missing')
        self.assertEqual(validate_input(data), [])
        data['rows'].append(copy.deepcopy(row))
        with self.assertRaises(ValueError):
            validate_input(data)
        data = fixture()
        data['rows'][0]['scope'] = 'territory'
        with self.assertRaises(ValueError):
            validate_input(data)

    def test_intervals_lead_support_and_future_exclusion(self):
        cutoff = month('2024-12')
        points = [point(cutoff - i - 1, 1) for i in range(20)]
        points += [point(cutoff, 1, prediction=1e9)]
        band = interval(10, points, cutoff, 1, .8)
        self.assertEqual((band['sample_count'], band['lower'], band['upper']), (20, 9, 11))
        self.assertIsNone(interval(10, points, cutoff, 1, .95)['lower'])
        self.assertIsNone(interval(10, points, cutoff, 2, .8)['lower'])
        # Duplicate records cannot manufacture support.
        self.assertEqual(interval(10, points * 3, cutoff, 1, .8)['sample_count'], 20)
        self.assertEqual(interval_metrics([{'actual': 12, 'intervals': [band]}], .8)['interval_score'], 12.000000000000002)

    def test_blocked_run_produces_no_claims(self):
        data = fixture()
        data['manifest']['training_approved'] = False
        result = run(data, include_challengers=False)
        self.assertEqual(result['status'], 'blocked')
        self.assertEqual(result['predictions'], [])

    def test_reproducibility_and_development_only_selection(self):
        data = fixture()
        first = run(data, include_challengers=False)
        second = run(data, include_challengers=False)
        self.assertEqual(first['run_id'], second['run_id'])
        self.assertEqual(first['predictions'], second['predictions'])
        self.assertEqual(first['selection']['model_id'], 'seasonal_naive')
        self.assertEqual(len(first['folds']), 6)
        changed = copy.deepcopy(data)
        for row in changed['rows']:
            if row['period'].startswith('2025'):
                row['target_value'] *= -10
        result = run(changed, include_challengers=False)
        self.assertEqual(result['selection'], first['selection'])
        self.assertNotEqual(result['run_id'], first['run_id'])
        self.assertTrue(all(b['lower'] is None for p in first['predictions'] for b in p['intervals']))

    def test_gapped_schedule_blocked_and_invalid_schedule_rejected(self):
        data = fixture()
        data['rows'][10].update(target_value=None, value_status='missing', eligible_for_evaluation=False)
        self.assertEqual(run(data, include_challengers=False)['status'], 'blocked')
        schedule = copy.deepcopy(DEFAULT_SCHEDULE)
        schedule['development_origins'].append('2024-03')
        with self.assertRaises(ValueError):
            validate_schedule(schedule)

    def test_ets_adapter_signed_data_and_contiguous_minimum(self):
        origin = month('2022-12')
        series = {origin - i: float(-100 + i % 12) for i in range(36)}
        values, reason = forecast(series, origin, [1, 12], {'model_id': 'ets_none', 'family': 'ets', 'damped': False})
        self.assertIsNone(reason)
        self.assertEqual(len(values), 2)
        self.assertLess(values[1], 0)
        del series[origin - 10]
        self.assertEqual(forecast(series, origin, [1], {'model_id': 'ets_none', 'family': 'ets', 'damped': False})[0], {})


if __name__ == '__main__':
    unittest.main()
