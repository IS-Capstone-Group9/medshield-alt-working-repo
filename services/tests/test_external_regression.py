import copy
import math
import unittest
from datetime import date
from unittest.mock import patch

import numpy as np

from services.analytics_service.external_regression import build_regression, monthly_rainfall
from services.analytics_service.forecast_validation import month_number, period_name
from services.analytics_service.app import app


def regression_fixture(lag=1):
    rng = np.random.default_rng(1234)
    cases = rng.uniform(50, 900, 108)
    rainfall = rng.uniform(0, 400, 108)
    rows, signals = [], []
    previous = 50.
    start = month_number('2017-01')
    for i in range(108):
        y = 30 + .2 * i + 4 * math.sin(2 * math.pi * i / 12) + .25 * previous + (2 * cases[i-lag] / 100 if i >= lag else 0) + rng.normal(0,.08)
        period = period_name(start+i)
        rows.append(dict(period=period,product='A',sector='Unknown',territory='Quezon',quantity=y,revenue=y*10,row_count=1))
        for provider, signal, value in [('DOH','Dengue',cases[i]),('NASA POWER','Rainfall',rainfall[i])]:
            signals.append(dict(period=period,territory='Quezon',provider=provider,signal=signal,value=value))
        previous = y
    sources=[dict(provider='DOH',status='Controlled test fixture',file='fixture',checksum='fixture-only')]
    return {'rows':rows,'source':{'checksum':'fixture-only'}}, signals, sources


class ExternalRegressionTests(unittest.TestCase):
    def build(self, fixture=None, **kwargs):
        return build_regression(*(fixture or regression_fixture()), today=date(2026,9,12), **kwargs)

    def test_known_lag_coefficient_and_paired_holdout_improvement(self):
        d=self.build()
        self.assertEqual(d['status'],'exploratory')
        self.assertEqual(len(d['evaluation']),12)
        self.assertAlmostEqual(d['coefficients'][0]['coefficient'],2,delta=.03)
        self.assertGreater(d['mae_improvement_pct'],90)
        self.assertEqual(d['metrics']['baseline']['n'],d['metrics']['augmented']['n'])
        self.assertTrue(all(r['training_end'] < r['period'] for r in d['evaluation']))

    def test_future_targets_cannot_change_earlier_predictions_or_initial_coefficients(self):
        fixture=regression_fixture()
        before=self.build(fixture)
        altered=copy.deepcopy(fixture)
        altered[0]['rows'][-1]['quantity']*=100
        after=self.build(altered)
        self.assertEqual(before['coefficients'],after['coefficients'])
        self.assertEqual([r['augmented'] for r in before['evaluation']],[r['augmented'] for r in after['evaluation']])
        self.assertNotEqual(before['metrics']['augmented']['mae'],after['metrics']['augmented']['mae'])

    def test_calendar_lag_eight_and_separate_rainfall_lag(self):
        d=self.build(regression_fixture(8),lag=8,mode='combined',rainfall_lag=3)
        self.assertEqual(d['status'],'exploratory')
        self.assertAlmostEqual(d['coefficients'][0]['coefficient'],2,delta=.03)
        march=next(r for r in d['evaluation'] if r['period']=='2025-11')
        self.assertEqual(march['signal_period'],'DOH 2025-03; NASA POWER 2025-08')

    def test_missing_months_are_not_shifted_or_zero_filled(self):
        sales, signals, sources=regression_fixture()
        signals=[r for r in signals if not (r['provider']=='DOH' and r['period']=='2025-03')]
        d=self.build((sales,signals,sources))
        self.assertEqual(len(d['evaluation']),11)
        self.assertNotIn('2025-04',[r['period'] for r in d['evaluation']])

    def test_sparse_weather_private_and_constant_predictors_are_blocked(self):
        self.assertEqual(self.build(sector='Private')['status'],'blocked')
        self.assertEqual(self.build(mode='rainfall',provider='PAGASA')['status'],'blocked')
        fixture=regression_fixture()
        for r in fixture[1]: r['value']=100
        d=self.build(fixture)
        self.assertEqual(d['status'],'blocked')
        self.assertIn('Constant predictor',d['reason'])
        self.assertEqual(d['evaluation'],[])

    def test_daily_weather_requires_complete_month_and_rejects_sentinels_or_duplicates(self):
        days=[{'date':f'2025-02-{i:02d}','area':'Quezon','rainfall_mm':2} for i in range(1,29)]
        self.assertEqual(monthly_rainfall(days)[0]['value'],56)
        self.assertEqual(monthly_rainfall(days[:-1]),[])
        self.assertEqual(monthly_rainfall(days+[days[0]]),[])
        days[0]['rainfall_mm']=-999
        self.assertEqual(monthly_rainfall(days),[])

    def test_duplicate_external_grain_is_not_double_counted(self):
        fixture=regression_fixture()
        fixture[1].append(fixture[1][0])
        with self.assertRaises(ValueError):self.build(fixture)

    def test_endpoint_scope_validation_and_source_failure(self):
        self.assertEqual(app.test_client().get('/sales/external-regression?lag=invalid').status_code,422)
        with patch('services.analytics_service.app.load_regression',side_effect=OSError('Missing source')):
            r=app.test_client().get('/sales/external-regression')
            self.assertEqual(r.status_code,503)
            self.assertEqual(r.get_json(),{'error':'Missing source'})


if __name__=='__main__':unittest.main()
