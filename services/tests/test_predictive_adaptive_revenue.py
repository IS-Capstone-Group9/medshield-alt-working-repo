import copy
import json
import math
import random
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service.predictive import adaptive_revenue_experiment as experiment
from services.analytics_service.predictive.contracts import month,period
from services.tests.test_predictive_sector_policy import complete_input


def points(year=2024,actual=1):
    result=[]
    for lead in range(1,13):
        for model in experiment.BASE_MODELS:
            prediction=0 if model=='last_value' else 2 if model=='kalman_level' else None
            result.append(dict(window_start='2017-01',schedule='annual',year=year,origin_period=f'{year-1}-12',
                target_period=f'{year}-{lead:02d}',lead_months=lead,model_id=model,actual=actual,prediction=prediction,reason=None))
    return result


class AdaptiveRevenueTests(unittest.TestCase):
    def test_calendar_constant_signed_hand_calculation(self):
        start=month('2017-01');origin=start+47
        values={p:-10. for p in range(start,origin+1)}
        for rho in (1.,.9):
            result,trace=experiment.calendar_fit(values,origin,[1,6,12],start,rho)
            for prediction in result.values():self.assertAlmostEqual(prediction,-10.)
            self.assertAlmostEqual(trace['origin_residual'],0)
            self.assertEqual(trace['observed'],48)

    def test_every_adapter_receives_only_origin_known_values(self):
        start=month('2017-01');origin=month('2023-12')
        values={p:float(p-start+1) for p in range(start,origin+1)}
        poisoned={**values,origin+1:1e30,origin+12:-1e30}
        def verify(training,*args):
            self.assertLessEqual(max(training),origin)
            self.assertEqual(training,values)
            return {1:123.},dict(checked=True)
        for helper,models in [('kalman_fit',('kalman_level','kalman_trend')),('calendar_fit',('anchored_calendar','damped_calendar')),('huber_fit',('huber_direct',))]:
            with patch.object(experiment,helper,side_effect=verify):
                for model in models:
                    result,trace=experiment.base_forecast(poisoned,origin,[1],start,model)
                    self.assertEqual(result,{1:123.})
                    self.assertEqual(trace['training_end'],'2023-12')
        self.assertEqual(experiment.base_forecast(poisoned,origin,[1],start,'last_value')[0][1],values[origin])

    def test_kalman_keeps_missing_calendar_rows(self):
        start=month('2017-01');origin=start+59
        rng=random.Random(42);level=20.;values={}
        for p in range(start,origin+1):
            level+=rng.gauss(0,2)
            values[p]=level+rng.gauss(0,1)
        values[start+13]=None;values[start+22]=None
        result,trace=experiment.base_forecast(values,origin,[1,12],start,'kalman_level')
        self.assertEqual(trace['status'],'available',trace)
        self.assertEqual(trace['fit']['calendar_rows'],60)
        self.assertEqual(trace['fit']['observed'],58)
        self.assertEqual(trace['fit']['missing_count'],2)
        self.assertTrue(all(math.isfinite(v) for v in result.values()))

    def test_nonconverged_kalman_remains_unavailable(self):
        origin=month('2024-12');start=origin-47
        with patch('statsmodels.tsa.statespace.structural.UnobservedComponents') as model:
            model.return_value.fit.return_value.mle_retvals={'converged':False}
            result,trace=experiment.base_forecast({p:float(p-start) for p in range(start,origin+1)},origin,[1],start,'kalman_level')
        self.assertFalse(result)
        self.assertIn('did not converge',trace['reason'])

    def test_missing_origin_is_unavailable_and_zero_is_observed(self):
        origin=month('2024-12');start=month('2020-01')
        self.assertEqual(experiment.base_forecast({origin:0},origin,[1],start,'last_value')[0],{1:0})
        result,trace=experiment.base_forecast({origin:None},origin,[1],start,'last_value')
        self.assertFalse(result);self.assertEqual(trace['status'],'unavailable')

    def test_direct_feature_scale_and_missingness_hand_calculation(self):
        origin=month('2024-12')
        values={origin-i:float(i+1) for i in range(12)}
        features,scale=experiment.direct_features(values,origin,origin+1)
        self.assertEqual(scale,6.5)
        self.assertAlmostEqual(features[0],1/6.5)
        self.assertAlmostEqual(features[1],2.5/6.5)
        self.assertAlmostEqual(features[2],1)
        self.assertAlmostEqual(features[3],12/6.5)
        values[origin-1]=None
        self.assertIsNone(experiment.direct_features(values,origin,origin+1))

    def test_huber_direct_uses_only_known_training_targets(self):
        start=month('2017-01');origin=start+71
        values={p:100+.4*(p-start)+4*math.sin(2*math.pi*(p%12)/12) for p in range(start,origin+1)}
        result,trace=experiment.base_forecast(values,origin,[1,12],start,'huber_direct')
        self.assertEqual(trace['status'],'available',trace)
        for lead in (1,12):
            self.assertLessEqual(month(trace['fit'][str(lead)]['target_cutoff']),origin)
            self.assertGreaterEqual(trace['fit'][str(lead)]['examples'],18)
            self.assertTrue(math.isfinite(result[lead]))

    def test_convex_weights_exact_half_blend_and_constraints(self):
        result=experiment.fit_weights(points(),'annual')
        self.assertEqual(result['members'],['last_value','kalman_level'])
        self.assertAlmostEqual(result['weights'][0],.5)
        self.assertAlmostEqual(result['weights'][1],.5)
        self.assertAlmostEqual(result['objective_mean_absolute_error'],0)
        self.assertAlmostEqual(sum(result['weights']),1)
        mutated=points();mutated[1]['actual']=2
        with self.assertRaisesRegex(ValueError,'actuals differ'):experiment.fit_weights(mutated,'annual')

    def test_blend_does_not_renormalize_unavailable_members(self):
        source=points();weights=experiment.fit_weights(source,'annual')
        combined=experiment.with_combinations(source,{'annual':weights})
        self.assertTrue(all(p['prediction']==1 for p in combined if p['model_id']=='convex_blend'))
        source[1]['prediction']=None
        combined=experiment.with_combinations(source,{'annual':weights})
        self.assertIsNone(next(p['prediction'] for p in combined if p['model_id']=='convex_blend' and p['lead_months']==1))

    def test_validation_selection_is_complete_and_rejects_audit(self):
        source=points();weights=experiment.fit_weights(source,'annual')
        combined=experiment.with_combinations(source,{'annual':weights})
        self.assertEqual(experiment.choose(combined,'annual')['selected_model'],'convex_blend')
        with self.assertRaisesRegex(ValueError,'validation only'):experiment.choose(points(2025),'annual')

    def test_exact_case_comparison_and_duplicate_conflict(self):
        source=points();weights=experiment.fit_weights(source,'annual')
        combined=experiment.with_combinations(source,{'annual':weights})
        result=experiment.compare(combined,'annual')['convex_blend']
        self.assertEqual(result['candidate']['n'],12)
        self.assertEqual(result['candidate']['wape'],0)
        self.assertEqual(result['baseline']['wape'],100)
        with self.assertRaisesRegex(ValueError,'Duplicate'):experiment.compare(combined+[combined[0]],'annual')

    def test_registration_freeze_order_and_reject_drift_or_overwrite(self):
        base=Path(__file__).resolve().parents[2]/'outputs/adaptive_revenue_experiment_20261020/test-fixtures'
        base.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base) as temporary:
            folder=Path(temporary).resolve();self.assertTrue(folder.is_relative_to(base.resolve()))
            input_path=folder/'input.json';input_path.write_text(json.dumps(complete_input()))
            output=folder/'run';experiment.prepare(input_path,output)
            with self.assertRaisesRegex(ValueError,'empty directory'):experiment.prepare(input_path,output)
            original=input_path.read_bytes();input_path.write_bytes(original+b'\n')
            with self.assertRaisesRegex(ValueError,'Registration drift'):experiment.run(input_path,output)
            input_path.write_bytes(original)
            def fake(values,origin,leads,start,model):
                if origin>=month('2024-12'):self.assertTrue((output/'selection.json').is_file())
                return {lead:values[origin] for lead in leads},dict(status='available')
            with patch.object(experiment,'base_forecast',side_effect=fake),patch('builtins.print'):result=experiment.run(input_path,output)
            self.assertEqual(result['comparisons']['2017-01']['annual']['12']['last_value']['candidate']['n'],12)
            self.assertLessEqual(json.loads((output/'selection.json').read_text())['frozen_at_utc'],result['audit_started_at_utc'])
            with self.assertRaisesRegex(ValueError,'already used'):experiment.run(input_path,output)


if __name__=='__main__':unittest.main()
