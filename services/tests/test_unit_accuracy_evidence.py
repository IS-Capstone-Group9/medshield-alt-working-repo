from copy import deepcopy
from fractions import Fraction
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service import unit_accuracy_evidence as unit
from services.analytics_service.jobs import run_unit_accuracy_evidence as job


def monthly(values):
    return [dict(month=f'{2025 + (3 + i) // 12:04d}-{(3 + i) % 12 + 1:02d}',
                 net_recorded_ampoules=str(value)) for i, value in enumerate(values)]


class UnitAccuracyEvidenceTests(unittest.TestCase):
    def test_hand_solvable_four_method_median_and_calendar_lead(self):
        history = list(map(Fraction, range(1, 13)))
        # Lead1: seasonal1, mean6=9.5, mean3=11, last12; middle midpoint=10.25.
        self.assertEqual(unit.forecasts(history, 1)[unit.CANDIDATE], Fraction(41, 4))
        self.assertEqual(unit.forecasts(history, 3)['seasonal_naive_12'], 3)
        self.assertEqual(unit.forecasts(history, 3)[unit.CANDIDATE], Fraction(41, 4))

    def test_metrics_with_signed_and_zero_actuals(self):
        result = unit.summarize([Fraction(-2), Fraction(0), Fraction(2)], [Fraction(0)] * 3)
        self.assertAlmostEqual(float(result['mae_ampoules']), 4 / 3)
        self.assertEqual(result['wape_percent'], '100')
        self.assertEqual(result['normalized_bias_percent'], '0')
        zero = unit.summarize([Fraction(0)], [Fraction(1)])
        self.assertIsNone(zero['wape_percent'])
        self.assertIsNone(zero['normalized_bias_percent'])

    def test_future_mutation_cannot_change_earlier_origin_predictions(self):
        source = monthly(range(1, 19))
        altered = deepcopy(source)
        altered[15]['net_recorded_ampoules'] = '99999'
        def prior(data):
            return [(p['origin'], p['target_month'], p['method'], p['prediction_ampoules'])
                    for p in unit.evaluate(data)['points'] if p['origin'] < source[15]['month']]
        self.assertEqual(prior(source), prior(altered))

    def test_all_cohorts_retained_and_pairing_counts(self):
        result = unit.evaluate(monthly([5] * 18))
        self.assertEqual(len(result['points']), 50)
        self.assertEqual(len(result['metrics']), 10)
        self.assertEqual(len(result['paired_comparisons']), 8)
        self.assertTrue(all(r['ties'] == r['cases'] for r in result['paired_comparisons']))
        self.assertTrue(all(r['relative_mae_gain_percent'] is None for r in result['paired_comparisons']))
        self.assertIsNone(result['selected_method'])
        self.assertFalse(result['point_accuracy_promotion_allowed'])

    def test_invalid_calendar_missing_units_and_nonfinite_rejected(self):
        source = monthly(range(18))
        for replacement in [None, '', 'NaN', 'Infinity', 5, '1e13']:
            modified = deepcopy(source)
            modified[3]['net_recorded_ampoules'] = replacement
            with self.assertRaises((ValueError, ArithmeticError)):
                unit.evaluate(modified)
        for modified in [source[:3] + source[4:], source[:3] + [source[2]] + source[4:], source[::-1]]:
            with self.assertRaises(ValueError):
                unit.evaluate(modified)

    def test_create_only_registration_and_code_drift_denial(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            job.register(directory)
            with self.assertRaises(FileExistsError):
                job.register(directory)
            path = directory / 'protocol.json'
            protocol = json.loads(path.read_text(encoding='utf-8'))
            protocol['code_sha256'] = '0' * 64
            path.write_text(json.dumps(protocol), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'drift'):
                job.execute(directory)

    def test_signed_forecasts_remain_signed_without_clipping(self):
        predictions = unit.forecasts([Fraction(-5)] * 12, 1)
        self.assertTrue(all(value == -5 for value in predictions.values()))

    def test_actual_module_and_source_hash_drift_reject_before_evaluation(self):
        for changed_path in (job.MODULE, job.SOURCE):
            with self.subTest(path=changed_path.name), tempfile.TemporaryDirectory() as temp:
                directory = Path(temp)
                job.register(directory)
                original_sha = job.sha
                def altered_sha(path):
                    return '0' * 64 if path == changed_path else original_sha(path)
                with patch.object(job, 'sha', side_effect=altered_sha), patch.object(job, 'evaluate') as evaluate:
                    with self.assertRaisesRegex(ValueError, 'drift'):
                        job.execute(directory)
                    evaluate.assert_not_called()

    def test_existing_result_is_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            job.register(directory)
            output = directory / 'results.json'
            sentinel = b'previous evidence must survive\n'
            output.write_bytes(sentinel)
            with self.assertRaises(FileExistsError):
                job.execute(directory)
            self.assertEqual(output.read_bytes(), sentinel)


if __name__ == '__main__':
    unittest.main()
