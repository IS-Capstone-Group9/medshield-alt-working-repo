"""Correction-bound conservation and origin-availability failures."""
from copy import deepcopy
import unittest

from services.analytics_service.predictive.corrected_research import source_values
from services.analytics_service.predictive.contracts import month
from services.analytics_service.predictive.models import forecast


def receipt():
    return dict(source='databricks',warehouse_writes=0,
                release=dict(analytical_integrity=dict(policy='original_itemized_sales_v1',
                    scope='itemized_product_sales',serving_version=0,kept_rows=40160)),
                queries=dict(daily=dict(rows=[dict(day='2020-01-03',normalized_area='QUEZON',
                    is_adjusted_source='false',records='40160',eligible_records='1',revenue='-2.50')]),
                    monthly_control=dict(rows=[dict(month='2020-01-01',normalized_area='QUEZON',
                        records='40160',eligible_records='1',revenue='-2.50')]),
                    annual_control=dict(rows=[dict(year='2020',records='40160',eligible_records='1',revenue='-2.50')])))


class CorrectedResearchTests(unittest.TestCase):
    def test_signed_value_and_unknown_month_are_distinct(self):
        rows={r['period']:r for r in source_values(receipt())}
        self.assertEqual(rows['2020-01']['value_php'],'-2.50')
        self.assertIsNone(rows['2020-02']['value_php'])

    def test_wrong_source_and_live_write_receipt_fail(self):
        for field,value in [('policy','adjusted_source'),('scope','company'),('serving_version',1)]:
            data=receipt();data['release']['analytical_integrity'][field]=value
            with self.assertRaises(ValueError): source_values(data)
        data=receipt();data['warehouse_writes']=1
        with self.assertRaises(ValueError): source_values(data)

    def test_duplicate_or_nonconserving_aggregates_fail(self):
        data=receipt();data['queries']['daily']['rows']*=2
        with self.assertRaises(ValueError):source_values(data)
        for name in ('monthly_control','annual_control'):
            data=receipt();data['queries'][name]['rows'][0]['revenue']='-2.49'
            with self.assertRaises(ValueError):source_values(data)
        data=receipt();data['queries']['monthly_control']['rows'][0]['records']='40159'
        with self.assertRaises(ValueError):source_values(data)

    def test_forecast_adapters_never_consume_realized_future(self):
        start=month('2020-01');origin=start+47
        observed={p:100+(p-start)*2+(p%12)*3 for p in range(start,origin+13)}
        changed=deepcopy(observed)
        for p in range(origin+1,origin+13):changed[p]=10**12
        for config in [dict(model_id='last_value'),dict(model_id='seasonal_naive'),
                       dict(model_id='mean_3',window=3),dict(model_id='ridge_recursive_a10',family='ridge',strategy='recursive',alpha=10,minimum_examples=12)]:
            self.assertEqual(forecast(observed,origin,[1,3,12],config),forecast(changed,origin,[1,3,12],config))


if __name__=='__main__':unittest.main()
