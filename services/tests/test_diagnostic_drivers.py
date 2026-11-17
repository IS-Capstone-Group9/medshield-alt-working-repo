import unittest
from decimal import Decimal
from services.analytics_service.diagnostic_drivers import (
    price_volume_mix, stl_strength, residual_anomalies, benjamini_hochberg, lagged_associations)
from services.analytics_service.early_warning import evaluate_events, surge_event, official_bulletin_status


class DiagnosticTests(unittest.TestCase):
    def test_pvm_hand_reconciliation_and_unreviewed_units(self):
        rows = [dict(product='A', unit_scope='ampoule', unit_reviewed=True, base_net=100,
                     target_net=180, base_qty=10, target_qty=12),
                dict(product='B', base_net=-5, target_net=-10)]
        out = price_volume_mix(rows)
        self.assertEqual([Decimal(out[0][k]) for k in ('volume_effect','price_effect','interaction_effect')],
                         [Decimal(20), Decimal(50), Decimal(10)])
        self.assertEqual(sum(Decimal(r['delta_net']) for r in out), Decimal(75))
        self.assertEqual(out[1]['bucket'], 'Adjustment_Only')
        self.assertEqual(out[1]['other_effect'], '-5')
        with self.assertRaises(ValueError):
            price_volume_mix(rows + rows)

    def test_strength_known_variances_and_constant(self):
        self.assertEqual(stl_strength([1,2,3], [1,2,3], [0,0,0])['trend_strength'], 1)
        self.assertIsNone(stl_strength([1,1], [0,0], [0,0])['seasonal_strength'])
        out = residual_anomalies([dict(period=i, residual=r) for i,r in enumerate([0,0,0,100])])
        self.assertTrue(all(r['anomaly'] is None for r in out))

    def test_bh_hand_expected(self):
        out = benjamini_hochberg([.01, .04, .03, None])
        for observed, expected in zip(out[:3], [.03,.04,.04]):
            self.assertAlmostEqual(observed, expected)
        self.assertIsNone(out[3])

    def test_calendar_lag_missing_is_not_zero(self):
        out = lagged_associations({2:2,3:4,4:6,5:None}, {1:1,2:2,3:3}, (1,))
        self.assertEqual(out[0]['n'], 3)
        self.assertAlmostEqual(out[0]['pearson_r'], 1)
        self.assertIsNone(out[0]['spearman_p'])
        self.assertIsNone(out[0]['spearman_q'])

    def test_event_confusion_and_missing(self):
        rows = [dict(series_id=str(i), origin_period='2025-01', target_period='2025-02',
                     origin_known=True, signal=s, demand_surge=t)
                for i,(s,t) in enumerate([(True,True),(True,False),(False,True),(False,False),(None,False)])]
        out = evaluate_events(rows)
        self.assertEqual((out['precision'],out['recall'],out['false_alarm_rate']),(.5,.5,.5))
        self.assertEqual(out['excluded_missing_rows'],1)
        self.assertEqual(out['mean_lead_months'],1)
        self.assertFalse(official_bulletin_status()['available'])
        with self.assertRaises(ValueError):
            evaluate_events([dict(rows[0], origin_known=False)])
        self.assertTrue(surge_event(9.1, list(range(11)))['event'])

    def test_provenance_rows_and_year_boundary(self):
        from services.analytics_service.jobs.run_diagnostic_drivers import calendar_series
        row = residual_anomalies([dict(residual=1, evidence_label='Observed')])[0]
        self.assertEqual(row['source_evidence_label'], 'Observed')
        before = calendar_series({'2024-12': 1})
        after = calendar_series({'2025-01': 2})
        self.assertEqual(next(iter(after)) - next(iter(before)), 1)
        with self.assertRaises(ValueError):
            calendar_series({'202501': 1})


if __name__ == '__main__':
    unittest.main()
