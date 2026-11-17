"""Exact parity,source/state isolation and measurement/evidence failure checks."""
from copy import deepcopy
from fractions import Fraction
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service import model_evaluation_profile as profile
from services.analytics_service.jobs import profile_model_evaluation as runner


def rows(values):
    return [dict(month=f'{2025 + (3+i)//12:04d}-{(3+i)%12+1:02d}', net_recorded_ampoules=str(v))
            for i, v in enumerate(values)]


class ModelEvaluationProfileTests(unittest.TestCase):
    def test_full_exact_parity_including_zero_signed_and_fractional_inputs(self):
        for values in ([5]*18, [0]*18, [-5]*18, range(18), ['1.25','-3.125','0.25']*6):
            source = rows(values)
            self.assertEqual(profile.encoded(profile.unit.evaluate(source)), profile.encoded(profile.evaluate_units_once(source)))

    def test_hand_baseline_and_call_count_fifty_to_ten(self):
        source = rows(range(1,19))
        original = profile.unit.forecasts
        with patch.object(profile.unit, 'forecasts', wraps=original) as calls:
            a = profile.unit.evaluate(source)
            self.assertEqual(50, calls.call_count)
        with patch.object(profile.unit, 'forecasts', wraps=original) as calls:
            b = profile.evaluate_units_once(source)
            self.assertEqual(10, calls.call_count)
        self.assertEqual(a,b)
        self.assertEqual('10.25', next(p['prediction_ampoules'] for p in b['points']
                                     if p['origin']=='2026-03' and p['lead']==1 and p['method']=='median_four_baselines'))

    def test_future_mutation_cannot_change_past_predictions(self):
        source = rows(range(18))
        changed = deepcopy(source)
        changed[15]['net_recorded_ampoules'] = '999999'
        def past(data):
            return [(r['origin'],r['lead'],r['method'],r['prediction_ampoules'])
                    for r in profile.evaluate_units_once(data)['points'] if r['origin']<source[15]['month']]
        self.assertEqual(past(source),past(changed))

    def test_separate_source_calls_have_no_shared_cache_or_input_mutation(self):
        a, b = rows([4]*18), rows([400]*18)
        saved = deepcopy(a)
        first = profile.evaluate_units_once(a)
        other = profile.evaluate_units_once(b)
        self.assertEqual(first,profile.evaluate_units_once(a))
        self.assertNotEqual(first,other)
        self.assertEqual(a,saved)

    def test_missing_nonfinite_and_zero_denominator_semantics_preserved(self):
        source = rows(range(18))
        for broken in (source[:3]+source[4:], rows(['NaN']*18)):
            with self.assertRaises((ValueError,ArithmeticError)):
                profile.evaluate_units_once(broken)
        result = profile.evaluate_units_once(rows([0]*18))
        self.assertTrue(all(row['wape_percent'] is None for row in result['metrics']))
        self.assertTrue(all(row['relative_mae_gain_percent'] is None for row in result['paired_comparisons']))
        self.assertFalse(result['point_accuracy_promotion_allowed'])

    def test_quantiles_and_measurement_boundaries(self):
        self.assertEqual(3,profile.nearest_rank([5,1,4,3,2],.5))
        self.assertEqual(5,profile.nearest_rank([5,1,4,3,2],.95))
        for repeats,batch in ((4,1),(True,1),(5,0),(5,501)):
            with self.assertRaises(ValueError):
                profile.benchmark_pair(rows([5]*18),repeats=repeats,batch_size=batch)
        with patch.object(profile,'evaluate_units_once',return_value={'changed':True}):
            with self.assertRaisesRegex(ValueError,'parity'):
                profile.benchmark_pair(rows([5]*18),repeats=5,batch_size=1)

    def test_independent_abc_empty_and_unsupported_class_semantics(self):
        empty=profile.independent_classification_summary([])
        self.assertIsNone(empty['macro_f1'])
        self.assertIsNone(empty['accuracy'])
        self.assertEqual([None,None,None],empty['recalls'])
        got=profile.independent_classification_summary([dict(actual='A',predicted='B')])
        self.assertEqual(Fraction(0),got['macro_f1'])
        self.assertEqual([Fraction(0),None,None],got['recalls'])
        with self.assertRaises(ValueError):
            profile.independent_classification_summary([dict(actual='D',predicted='A')])

    def test_partial_profile_and_protocol_drift_refuse_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            out=Path(temp)/'profile'
            runner.run(out,'register',repeats=5,batch_size=1)
            (out/'started.json').write_text('{}',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'overwrite'):
                runner.run(out,'execute',repeats=5,batch_size=1)
            (out/'protocol-hash.json').write_text('{"sha256":"changed"}',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'drift'):
                runner.run(out,'execute',repeats=5,batch_size=1)

    def test_actual_registered_dependency_hash_drift_rejects(self):
        with tempfile.TemporaryDirectory() as temp:
            out=Path(temp)/'profile'
            runner.run(out,'register',repeats=5,batch_size=1)
            actual=profile.sha
            target=Path(profile.unit.__file__)
            def changed(path):
                return '0'*64 if Path(path)==target else actual(path)
            with patch.object(profile,'sha',side_effect=changed):
                with self.assertRaisesRegex(ValueError,'drift'):
                    runner.run(out,'execute',repeats=5,batch_size=1)


if __name__=='__main__':
    unittest.main()
