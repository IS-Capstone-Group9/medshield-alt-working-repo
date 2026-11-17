from copy import deepcopy
import json
from pathlib import Path
import unittest
from services.analytics_service import territorial_forecast as study
from services.analytics_service.jobs.run_territorial_forecast import prospective_readiness

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'outputs/wp4_territorial_research_20261031/source'

class TerritorialForecastTests(unittest.TestCase):
    def setUp(self):self.source=json.loads((SOURCE/'financial.json').read_bytes())

    def test_actual_region_coverage_keeps_gaps_and_unit_scope_explicit(self):
        series,eligibility=study.prepare(self.source)
        self.assertEqual([e['observed_eligible_months'] for e in eligibility],[81,56,38])
        self.assertEqual([e['status'] for e in eligibility],['eligible_financial_research','unavailable_incomplete_registered_history','unavailable_incomplete_registered_history'])
        self.assertTrue(all(e['territorial_unit_forecast_eligible'] is False for e in eligibility))
        self.assertEqual(len(series['CALABARZON']),81)

    def test_missing_month_is_not_zero_but_explicit_observed_zero_is_retained(self):
        source=deepcopy(self.source)
        row=next(r for r in source['months'] if r['region']=='CALABARZON' and r['period']=='2020-01')
        row['net_sales_php']='0.000000';series,eligibility=study.prepare(source)
        self.assertEqual(series['CALABARZON'][study.month('2020-01')],0)
        self.assertEqual(eligibility[0]['status'],'eligible_financial_research')
        row['net_sales_php']=None;series,eligibility=study.prepare(source)
        self.assertNotIn(study.month('2020-01'),series['CALABARZON'])
        self.assertIn('2020-01',eligibility[0]['missing_months'])

    def test_duplicate_source_and_changed_identity_reject(self):
        source=deepcopy(self.source);source['months'].append(source['months'][0])
        with self.assertRaises(ValueError):study.prepare(source)
        for field,value in [('dataset_id','wrong'),('fact_version',1),('calendar_end','2026-10')]:
            source=deepcopy(self.source);source['source'][field]=value
            with self.assertRaises(ValueError):study.prepare(source)

    def test_actual_calendars_training_only_adapter_and_future_mutation_invariance(self):
        values,_=study.prepare(self.source);observed=values['CALABARZON'];calls=[]
        def predictor(training,origin,leads,config,seed):
            self.assertEqual(max(training),origin);self.assertTrue(all(p<=origin for p in training));calls.append((origin,config['model_id']))
            return {lead:training[origin] for lead in leads},None
        before=study.evaluate_region(observed,'CALABARZON',predictor)
        self.assertEqual(len(before['predictions']),1980);self.assertEqual(len(calls),660)
        self.assertTrue(all(p['series_id']=='confirmed_delivery_CALABARZON_itemized_PHP' for p in before['predictions']))
        changed={p:v+(100000 if p>study.month('2022-12') else 0) for p,v in observed.items()}
        after=study.evaluate_region(changed,'CALABARZON',predictor)
        first=lambda result:[(p['model_id'],p['lead_months'],p['prediction'],p['mase_scale']) for p in result['predictions'] if p['origin_period']=='2022-12']
        self.assertEqual(first(before),first(after))
        self.assertTrue(all(study.month(p['target_period'])-study.month(p['origin_period'])==p['lead_months'] for p in before['predictions']))

    def test_unavailable_and_nonfinite_models_stay_explicit_and_cannot_win(self):
        values,_=study.prepare(self.source)
        def predictor(training,origin,leads,config,seed):
            if config['model_id'].startswith('prophet'):return {},'fixture dependency unavailable'
            if config['model_id']=='hist_gbdt_direct':return {lead:float('nan') for lead in leads},None
            return {lead:training[origin] for lead in leads},None
        result=study.evaluate_region(values['CALABARZON'],'CALABARZON',predictor)
        self.assertTrue(all(p['prediction'] is None and p['missing_reason'] for p in result['predictions'] if p['model_id']=='hist_gbdt_direct'))
        self.assertTrue(all(s['model_id'] not in ('hist_gbdt_direct','prophet_cp0.01_sp0.1') for s in result['selections']))
        with self.assertRaises(ValueError):study.evaluate_region(values['MIMAROPA'],'MIMAROPA',predictor)
        with self.assertRaises(ValueError):study.evaluate_region(values['CALABARZON'],'HOSPITAL',predictor)

    def test_current_clock_prospective_check_never_issues_or_relabels_historical_source(self):
        result=prospective_readiness(SOURCE)
        self.assertEqual(result['status'],'NOT_ISSUED_CONTRACT_GATES_RETAINED')
        self.assertEqual(result['forecasts_issued'],0);self.assertFalse(result['backdating_allowed'])
        self.assertTrue(result['source_is_historical_predecessor'])
        self.assertEqual(result['scoped_unit_raw_area'],'HOSPITAL')
        self.assertEqual(result['source_approved_unit_records'],0)
        self.assertEqual(result['registered_first_issue_month'],'2026-11')

if __name__=='__main__':unittest.main()
