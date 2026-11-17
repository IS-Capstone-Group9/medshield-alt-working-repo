import copy
import unittest
from unittest.mock import patch

from services.analytics_service.jobs.run_stable_ets_review import validate_source, evaluate, REFERENCES
from services.analytics_service.predictive.contracts import month, period


class StableEtsReviewTests(unittest.TestCase):
    def fixtures(self):
        start = month('2020-01')
        series = {p: float(100 + p % 12) for p in range(start, month('2026-09') + 1)}
        source = dict(source='databricks', source_identity={'dataset_id': 'synthetic'},
                      monthly=[dict(month=period(p), net_sales_php=v) for p, v in series.items()])
        spec = dict(training_start='2020-01', development_origins=['2022-12'],
                    retrospective_audit_origins=['2024-12'], inspected_extension_origins=['2025-12'])
        predictions = []
        for stage in ('development', 'retrospective_audit', 'inspected_extension'):
            origin = month(spec[stage + '_origins'][0])
            for model in REFERENCES:
                for lead in (1, 3, 6):
                    predictions.append(dict(series_id='original_itemized_all_buyers_PHP', target_name='net_sales',
                        model_id=model, origin_period=period(origin), target_period=period(origin + lead),
                        lead_months=lead, actual=series[origin + lead], prediction=series[origin], stage=stage,
                        mase_scale=None, mase_scale_lag_months=12, missing_reason=None))
        reference = dict(source_sha256='synthetic-hash', source_identity=source['source_identity'],
                         publication_approved=False, operational_approval=False,
                         protocol=spec, predictions=predictions)
        return source, reference, series

    def test_binding_duplicates_missing_months_and_approval_fail(self):
        source, reference, series = self.fixtures()
        self.assertEqual(validate_source(source, reference, 'synthetic-hash'), series)
        for mutation in ('hash', 'duplicate', 'missing', 'approval'):
            a, b = copy.deepcopy(source), copy.deepcopy(reference)
            if mutation == 'hash':
                b['source_sha256'] = 'different'
            elif mutation == 'duplicate':
                a['monthly'].append(a['monthly'][0])
            elif mutation == 'missing':
                a['monthly'].pop(2)
            else:
                b['publication_approved'] = True
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                validate_source(a, b, 'synthetic-hash')

    def test_training_cutoff_and_audit_cannot_reselect(self):
        source, reference, series = self.fixtures()

        def adapter(training, origin, leads, *, damped):
            self.assertLessEqual(max(training), origin)
            return {h: training[origin] for h in leads}, dict(reason=None, converged=True)

        with patch('services.analytics_service.jobs.run_stable_ets_review.stable_ets.forecast', side_effect=adapter):
            first = evaluate(source, reference, series)
            changed = copy.deepcopy(reference)
            # Change audit/extension outcomes and their source consistently, never development.
            altered = {p: v + 10000 if p >= month('2025-01') else v for p, v in series.items()}
            for p in changed['predictions']:
                p['actual'] = altered[month(p['target_period'])]
                values = [v for m, v in sorted(altered.items()) if m <= month(p['origin_period'])]
                scale = sum(abs(values[i] - values[i - 12]) for i in range(12, len(values))) / (len(values) - 12)
                p['mase_scale'] = scale or None
            after = evaluate(source, changed, altered)
        self.assertEqual(first['research_selections'], after['research_selections'])
        self.assertEqual([p for p in first['predictions'] if p['stage'] == 'development'],
                         [p for p in after['predictions'] if p['stage'] == 'development'])

    def test_retained_prediction_actual_and_key_corruption_fail(self):
        source, reference, series = self.fixtures()
        for mutation in ('actual', 'duplicate', 'missing'):
            changed = copy.deepcopy(reference)
            if mutation == 'actual':
                changed['predictions'][0]['actual'] += 1
            elif mutation == 'duplicate':
                changed['predictions'].append(changed['predictions'][0])
            else:
                changed['predictions'].pop()
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                evaluate(source, changed, series)


if __name__ == '__main__':
    unittest.main()
