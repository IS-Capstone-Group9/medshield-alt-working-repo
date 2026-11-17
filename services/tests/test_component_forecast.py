import copy
import unittest

from services.analytics_service.predictive import component_forecast as c
from services.analytics_service.predictive.contracts import month
from services.analytics_service.jobs.run_feature_accuracy import choose_forecast


class ComponentForecastTests(unittest.TestCase):
    def series(self):
        return {p: dict(positive=100. + p, negative=-float(p % 5), net=100. + p - p % 5)
                for p in range(60)}

    def test_direct_mean_controls_hand_conservation(self):
        series = self.series()
        for w in (3, 6, 12):
            config = next(k for k in c.CONFIGS if k['model_id'] == f'component_mean{w}_mean{w}')
            prediction, trace = c.predict(series, 59, config)
            expected = sum(series[p]['net'] for p in range(60 - w, 60)) / w
            self.assertAlmostEqual(prediction, expected)
            self.assertAlmostEqual(prediction, trace['positive_prediction'] + trace['negative_prediction'])
            self.assertEqual(trace['equivalent_direct_mean'], w)

    def test_origin_future_isolation_and_scale_equivariance(self):
        series = self.series()
        for config in c.CONFIGS:
            before = c.predict(series, 59, config)
            self.assertEqual(before, c.predict(series | {60: dict(positive=1e99, negative=1e99, net=None)}, 59, config))
            scaled = {p: {k: v * 1e6 for k, v in r.items()} for p, r in series.items()}
            self.assertAlmostEqual(before[0], c.predict(scaled, 59, config)[0] / 1e6)
            self.assertLessEqual(max(before[1]['positive_periods'] + before[1]['negative_periods']), 59)

    def test_signed_rows_and_gaps_rejected(self):
        series = self.series()
        for row in [dict(positive=-1., negative=-2., net=-3.),
                    dict(positive=100., negative=2., net=102.),
                    dict(positive=100., negative=-2., net=100.),
                    dict(positive=True, negative=-2., net=-1.)]:
            with self.assertRaises(ValueError):
                c.predict(series | {59: row}, 59, c.CONFIGS[0])
        with self.assertRaises(ValueError):
            c.predict({p: v for p, v in series.items() if p != 20}, 59, c.CONFIGS[0])

    def fixture(self):
        start = month('2020-01')
        source = dict(source_identity={'dataset_id': 'fixture'}, monthly=[
            dict(month=f'2020-{m:02}', net_sales_php='8') for m in range(1, 4)])
        raw = dict(release={'dataset_id': 'fixture'}, queries={'company_months': {'rows': [
            dict(month=f'2020-{m:02}-01', positive_revenue='10', negative_revenue='-2', revenue='8')
            for m in range(1, 4)]}})
        return start, raw, source

    def test_reconcile_exact_dates_signs_and_source(self):
        start, raw, source = self.fixture()
        result = c.reconcile(raw, source)
        self.assertEqual(result[start], dict(positive=10., negative=-2., net=8.))
        for mutation in ('duplicate', 'date', 'sign', 'net', 'identity', 'missing'):
            r, s = copy.deepcopy(raw), copy.deepcopy(source)
            if mutation == 'duplicate':r['queries']['company_months']['rows'].append(r['queries']['company_months']['rows'][0])
            elif mutation == 'date':r['queries']['company_months']['rows'][0]['month'] = '2020-01-02'
            elif mutation == 'sign':r['queries']['company_months']['rows'][0]['negative_revenue'] = '2'
            elif mutation == 'net':s['monthly'][0]['net_sales_php'] = '9'
            elif mutation == 'identity':r['release']['dataset_id'] = 'different'
            else:r['queries']['company_months']['rows'].pop(1)
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                c.reconcile(r, s)

    def test_selection_needs_real_gain_and_bias_guard(self):
        rows = [dict(stage='development', model_id='mean_6', n=19, mae=100., normalized_bias=2.),
                dict(stage='development', model_id='component', n=19, mae=94., normalized_bias=5.)]
        self.assertEqual(choose_forecast(rows)['selected_model'], 'component')
        rows[1]['normalized_bias'] = 5.01
        self.assertEqual(choose_forecast(rows)['selected_model'], 'mean_6')
        rows[1]['stage'] = 'retrospective_audit'
        with self.assertRaises(ValueError):choose_forecast(rows)


if __name__ == '__main__':unittest.main()
