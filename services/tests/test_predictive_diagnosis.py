import unittest
from services.analytics_service.predictive.diagnose import diagnose


class DiagnosisTests(unittest.TestCase):
    def test_weights_signed_errors_and_origins_stay_separate(self):
        points=[dict(model_id='last_value',stage='development',origin_period='2023-12',target_period='2024-01',lead_months=1,actual=10,prediction=20),
                dict(model_id='last_value',stage='development',origin_period='2023-12',target_period='2024-04',lead_months=4,actual=30,prediction=20),
                dict(model_id='last_value',stage='future',origin_period='2024-12',target_period='2025-01',lead_months=1,actual=None,prediction=20)]
        result=diagnose(dict(run_id='fixture',selection={'model_id':'last_value'},predictions=points))['stages']['development']
        self.assertEqual(result['overall']['wape'],50)
        self.assertEqual(result['overall']['bias'],0)
        self.assertEqual(result['overall']['mae'],10)
        self.assertEqual(result['overall']['n'],2)
        self.assertEqual(result['mean_absolute_actual'],20)
        self.assertEqual(result['by_band']['1–3']['wape'],100)
        self.assertAlmostEqual(result['by_band']['4–6']['wape'],100/3)
        self.assertEqual(result['top_three_error_share'],1)
        self.assertEqual(len(result['by_origin']),1)
