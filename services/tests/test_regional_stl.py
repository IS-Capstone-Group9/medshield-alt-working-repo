import copy
import json
from pathlib import Path
import unittest
from services.analytics_service.regional_stl import analyze,month_id,label
ROOT=Path(__file__).resolve().parents[2]
class RegionalStlTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=json.loads((ROOT/'outputs/so1_regional_stl_20261028/source.json').read_text())
        cls.result=analyze(cls.source)
    def test_calendar_roundtrip_and_invalid_month(self):
        self.assertEqual(label(month_id('2026-09')),'2026-09')
        with self.assertRaises(AssertionError):month_id('2026-13')
    def test_exact_supported_segment_and_no_short_run_imputation(self):
        a,b,c=self.result['series'];self.assertEqual(a['region'],'CALABARZON')
        self.assertEqual([(r['start'],r['end'],r['months']) for r in a['fitted_segments']],[('2020-01','2026-09',81)])
        self.assertEqual([len(s['components']) for s in self.result['series']],[81,0,0])
        self.assertEqual([s['maximum_contiguous_observed_months'] for s in self.result['series']],[81,19,31])
        self.assertTrue(all(len(s['calendar'])==117 for s in self.result['series']))
    def test_components_and_change_reconstruct_source(self):
        s=self.result['series'][0];observed={r['period']:r['observed_net_sales_php'] for r in s['calendar']}
        for r in s['components']:
            self.assertEqual(r['observed_net_sales_php'],observed[r['period']])
            self.assertAlmostEqual(float(r['observed_net_sales_php']),r['trend_php']+r['seasonal_php']+r['residual_php'],places=6)
        b=s['matched_change'];self.assertEqual(len(b['matched_months']),9)
        self.assertAlmostEqual(float(b['recorded_change_php']),sum(b['component_changes_php'].values()),places=6)
    def test_source_mapping_or_approval_mutation_rejected(self):
        for key,value in [('dataset_id','other'),('fact_version',1),('mapping_sha256','bad')]:
            s=copy.deepcopy(self.source);s['source'][key]=value
            with self.assertRaises(AssertionError):analyze(s)
        s=copy.deepcopy(self.source);s['scope']['forecast_approved']=True
        with self.assertRaises(AssertionError):analyze(s)
    def test_duplicate_and_changed_money_rejected(self):
        s=copy.deepcopy(self.source);s['months'].append(s['months'][0])
        with self.assertRaises(AssertionError):analyze(s)
        s=copy.deepcopy(self.source);s['months'][0]['net_sales_php']='1.000000'
        with self.assertRaises(AssertionError):analyze(s)
    def test_retrospective_scope_never_grants_future_or_model_release(self):
        self.assertFalse(self.result['future_forecasts_generated']);self.assertFalse(self.result['forecast_approved'])
        self.assertEqual(self.result['forecast_models_trained'],0)
        self.assertEqual(self.result['protocol']['missing_policy'],'no_imputation_split_at_gaps')
        self.assertNotIn('UNALLOCATED',[s['region'] for s in self.result['series']])
if __name__=='__main__':unittest.main()
