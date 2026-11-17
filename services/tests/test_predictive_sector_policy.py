import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from services.analytics_service.predictive import sector_policy_experiment as experiment
from services.analytics_service.predictive.contracts import month


def complete_input():
    rows=[]
    for year in range(2017,2026):
        for number in range(1,13):
            for scope,value in [('All',30),('Government',12),('Private',14),('Internal',4)]:
                rows.append(dict(period=f'{year}-{number:02d}',scope=scope,value=value))
    return dict(manifest=dict(schema_version='medshield.sector-policy-input.v1',input_start='2017-01',input_end='2025-12',unit='PHP',source_release=dict(fact_delta_version=20)),rows=rows)


def development_cases():
    result=[]
    for lead in range(1,13):
        for scope in experiment.SCOPES:
            selected={'All':'seasonal_naive','Government':'last_value','Private':'mean_3','Internal':'mean_6'}[scope]
            for model in experiment.MODELS:
                result.append(dict(stage='development',scope=scope,model_id=model,origin_period='2022-12',target_period=f'2023-{lead:02d}',lead_months=lead,
                                   actual=-10 if lead%2 else 10,prediction=(-10 if lead%2 else 10)+(0 if model==selected else 3)))
    return result


class SectorPolicyTests(unittest.TestCase):
    def test_signed_hand_calculation_and_no_future_dependency(self):
        origin=month('2022-12')
        values={origin:-6,origin-1:3,origin-2:9,origin-3:18,origin-4:-12,origin-5:6,month('2022-03'):7}
        for model,expected in [('last_value',-6),('mean_3',2),('mean_6',3),('seasonal_naive',7)]:
            prediction,required,reason=experiment.predict(values,origin,month('2023-03'),model,month('2020-01'))
            self.assertEqual(prediction,expected)
            self.assertIsNone(reason)
            self.assertTrue(all(month(date)<=origin for date in required))
            self.assertEqual(experiment.predict({**values,origin+1:1e15},origin,month('2023-03'),model,month('2020-01'))[0],expected)

    def test_explicit_zero_is_distinct_from_missing_and_calendar_leads(self):
        origin=month('2022-12')
        self.assertEqual(experiment.predict({origin:0},origin,origin+1,'last_value',month('2020-01'))[0],0)
        self.assertIsNone(experiment.predict({origin:None},origin,origin+1,'last_value',month('2020-01'))[0])
        with self.assertRaisesRegex(ValueError,'leads1-12'):
            experiment.predict({origin:3},origin,origin+13,'last_value',month('2020-01'))

    def test_input_rejects_duplicates_nonfinite_boolean_and_accounting_error(self):
        for change in ('duplicate','nan','bool','scope','missing_row','accounting'):
            data=complete_input()
            if change=='duplicate':data['rows'].append(copy.deepcopy(data['rows'][0]))
            elif change=='nan':data['rows'][0]['value']=float('nan')
            elif change=='bool':data['rows'][0]['value']=True
            elif change=='scope':data['rows'][0]['scope']='Unknown'
            elif change=='missing_row':data['rows'].pop()
            else:data['rows'][0]['value']=31
            with self.subTest(change=change),self.assertRaises(ValueError):experiment.validate_input(data)

    def test_null_sector_actual_stays_null_without_becoming_zero(self):
        data=complete_input()
        for row in data['rows']:
            if row['period']=='2019-10':
                if row['scope']=='Internal':row['value']=None
                if row['scope']=='All':row['value']=26
        series=experiment.validate_input(data)
        self.assertIsNone(series['Internal'][month('2019-10')])
        self.assertEqual(series['All'][month('2019-10')],26)

    def test_development_selects_different_sector_methods_on_shared_cases(self):
        points=development_cases()
        choices=experiment.select_methods(points)
        self.assertEqual([choices[s]['selected_model'] for s in experiment.SCOPES],['seasonal_naive','last_value','mean_3','mean_6'])
        self.assertTrue(all(c['common_cases']==12 and not c['fallback'] for c in choices.values()))
        points[0]['stage']='inspected_retrospective'
        with self.assertRaisesRegex(ValueError,'cannot inspect'):experiment.select_methods(points)

    def test_insufficient_support_falls_back_and_ties_prefer_last_value(self):
        points=[p for p in development_cases() if p['scope']!='Internal' or p['lead_months']<=7]
        choices=experiment.select_methods(points)
        self.assertTrue(choices['Internal']['fallback'])
        self.assertEqual(choices['Internal']['selected_model'],'last_value')
        for point in points:point['prediction']=point['actual']
        self.assertEqual(experiment.select_methods(points)['Private']['selected_model'],'last_value')

    def test_future_audit_values_do_not_change_development_selection(self):
        data=complete_input()
        original=experiment.validate_input(data)
        for row in data['rows']:
            if row['period']>='2025-01':row['value']*=1e9
        modified=experiment.validate_input(data)
        before=experiment.select_methods(experiment.benchmark_points(original,'2020-01',experiment.DEV_ORIGINS,'development'))
        after=experiment.select_methods(experiment.benchmark_points(modified,'2020-01',experiment.DEV_ORIGINS,'development'))
        self.assertEqual(before,after)

    def test_wider_history_can_supply_early_dependencies_but_not_change_later_formulas(self):
        series=experiment.validate_input(complete_input())
        values=series['Government']
        origin=month('2019-09')
        self.assertEqual(experiment.predict(values,origin,origin+1,'last_value',month('2017-01'))[0],12)
        self.assertIsNone(experiment.predict(values,origin,origin+1,'last_value',month('2020-01'))[0])
        for model in experiment.MODELS:
            origin=month('2024-12')
            self.assertEqual(experiment.predict(values,origin,origin+12,model,month('2017-01')),
                             experiment.predict(values,origin,origin+12,model,month('2020-01')))

    def test_policy_sum_requires_all_sectors_and_keeps_observed_zero(self):
        series=experiment.validate_input(complete_input())
        origin=month('2024-12')
        for scope in ('All','Government'):series[scope][origin]=0 if scope=='Government' else 18
        points=experiment.benchmark_points(series,'2020-01',('2024-12',),'inspected_retrospective')
        choices={scope:dict(selected_model='last_value') for scope in experiment.SCOPES}
        policy=[p for p in experiment.company_points(points,choices) if p['model_id']=='sector_policy']
        self.assertTrue(all(p['prediction']==18 for p in policy))
        series['Internal'][origin]=None
        points=experiment.benchmark_points(series,'2020-01',('2024-12',),'inspected_retrospective')
        self.assertTrue(all(p['prediction'] is None for p in experiment.company_points(points,choices) if p['model_id']=='sector_policy'))

    def test_comparisons_require_exact_origin_target_lead_and_reject_duplicates(self):
        models=('direct_last_value','direct_development_choice','sector_policy')
        points=[dict(model_id=model,origin_period='2024-12',target_period='2025-01',lead_months=1,actual=10,prediction=12) for model in models]
        metrics=experiment.comparisons(points)['12']
        self.assertEqual(metrics['common_cases'],1)
        self.assertEqual(metrics['metrics']['sector_policy']['common']['wape'],20)
        with self.assertRaisesRegex(ValueError,'Duplicate'):experiment.comparisons(points+[points[0]])
        points[-1]['origin_period']='2024-11'
        self.assertEqual(experiment.comparisons(points)['12']['common_cases'],0)

    def test_registration_drift_freeze_order_and_overwrite_rejection(self):
        base=Path(__file__).resolve().parents[2]/'outputs/sector_policy_experiment_20261020/test-fixtures'
        base.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=base) as temporary:
            directory=Path(temporary).resolve()
            self.assertTrue(directory.is_relative_to(base.resolve()))
            input_path=directory/'input.json'
            input_path.write_text(json.dumps(complete_input()))
            output=directory/'run'
            experiment.prepare(input_path,output)
            with self.assertRaisesRegex(ValueError,'empty output'):experiment.prepare(input_path,output)
            original=input_path.read_bytes()
            input_path.write_bytes(original+b'\n')
            with self.assertRaisesRegex(ValueError,'identity drift'):experiment.run(input_path,output)
            input_path.write_bytes(original)
            real=experiment.benchmark_points
            def checked(*args,**kwargs):
                if args[3]=='inspected_retrospective':self.assertTrue((output/'selection.json').is_file())
                return real(*args,**kwargs)
            with patch.object(experiment,'benchmark_points',side_effect=checked):result=experiment.run(input_path,output)
            self.assertEqual(result['history_comparison']['differences'],0)
            self.assertLessEqual(json.loads((output/'selection.json').read_text())['frozen_at_utc'],result['audit_started_at_utc'])
            with self.assertRaisesRegex(ValueError,'unused registered'):experiment.run(input_path,output)


if __name__=='__main__':unittest.main()
