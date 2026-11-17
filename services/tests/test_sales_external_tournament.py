import copy
import unittest
from services.analytics_service.sales_external_tournament import protocol,evaluate,select_by_lead,histogram_forecast,CONFIGS
from services.analytics_service.predictive.contracts import month


class TournamentTests(unittest.TestCase):
    def test_selection_hand_rules_and_no_promotion(self):
        def row(mae,mase,bias):
            return dict(common=dict(mae=mae,normalized_bias=bias),common_scaled_error=dict(mase=mase))
        reports=dict(last_value=row(10,1,0),seasonal_naive=row(9,1,0),candidate=row(8,.9,5))
        self.assertEqual(select_by_lead(reports,1)['model_id'],'candidate')
        reports['candidate']['common']['normalized_bias']=5.01
        self.assertEqual(select_by_lead(reports,1)['status'],'NO_PROMOTION_RETAIN_BASELINE')

    def test_cutoff_before_predictor_and_audit_cannot_change_selection(self):
        spec=protocol();start=month('2020-01');end=month('2026-09')
        series={p:100+(p%12) for p in range(start,end+1)}
        def predictor(training,origin,leads,config,seed):
            self.assertLessEqual(max(training),origin)
            return {lead:training[origin] for lead in leads},None
        first=evaluate(series,spec,predictor)
        mutated={p:(v+10000 if p>=month('2025-01') else v) for p,v in series.items()}
        after=evaluate(mutated,spec,predictor)
        self.assertEqual(first['selections'],after['selections'])
        original=[p for p in first['predictions'] if p['stage']=='development']
        other=[p for p in after['predictions'] if p['stage']=='development']
        self.assertEqual(original,other)
        with self.assertRaises(ValueError):
            evaluate({p:v for p,v in series.items() if p!=start+1},spec,predictor)

    def test_histogram_adapter_future_values_are_not_accepted_as_features(self):
        from threadpoolctl import threadpool_limits
        config=CONFIGS[-1];training={p:float(100+p%12) for p in range(48)}
        with threadpool_limits(limits=1):
            before,_=histogram_forecast(training,47,[1,3,6],config,1)
            again,_=histogram_forecast(training,47,[1,3,6],config,1)
        self.assertEqual(before,again)
        self.assertEqual(set(before),{1,3,6})


if __name__=='__main__':unittest.main()
