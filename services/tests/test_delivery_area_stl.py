import copy,json,unittest
from pathlib import Path
from services.analytics_service.delivery_area_stl import analyze

ROOT=Path(__file__).resolve().parents[2]
class DeliveryAreaStlTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=json.loads((ROOT/'outputs/delivery_area_20261102/live-source.json').read_text(encoding='utf-8-sig'))
        cls.result=analyze(cls.source)
    def test_declared_windows_and_no_short_fit(self):
        fitted=[(s['area'],[(f['start'],f['end'],f['months']) for f in s['fitted_segments']]) for s in self.result['series'] if s['fitted_segments']]
        self.assertEqual(fitted,[('QUEZON',[('2020-06','2026-09',76)]),('BATANGAS',[('2020-01','2026-09',81)]),('CAVITE PROVINCE',[('2020-01','2023-02',38)])])
    def test_actual_zero_eligible_values_are_observed_and_gaps_not_filled(self):
        for s in self.result['series']:
            self.assertEqual(len(s['calendar']),117)
            for p in s['components']:
                self.assertLess(abs(float(p['observed_net_sales_php'])-p['trend_php']-p['seasonal_php']-p['residual_php']),1e-6)
            for f in s['fitted_segments']:self.assertGreaterEqual(f['months'],36)
        self.assertEqual(self.result['series'][0]['fitted_segments'][0]['seasonal_strength'],0)
    def test_conservation_and_duplicate_failures(self):
        bad=copy.deepcopy(self.source);bad['area_months'][0]['records']+=1
        with self.assertRaises(AssertionError):analyze(bad)
        bad=copy.deepcopy(self.source);bad['area_months'].append(bad['area_months'][0])
        with self.assertRaises(AssertionError):analyze(bad)
    def test_source_identity_failure(self):
        bad=copy.deepcopy(self.source);bad['regional']['source']['fact_version']=1
        with self.assertRaises(AssertionError):analyze(bad)
if __name__=='__main__':unittest.main()
