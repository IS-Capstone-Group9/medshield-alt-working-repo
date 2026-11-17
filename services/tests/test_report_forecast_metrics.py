import copy
import unittest

from services.analytics_service.jobs.report_forecast_metrics import report


def fixture():
    identity = dict(dataset_id='fixture_only', policy_version='fixture_only')
    periods = [f'{year}-{month:02d}' for year in (2020, 2021, 2022, 2023) for month in range(1,13)]
    monthly = [dict(month=p, net_sales_php=100+i) for i,p in enumerate(periods)]
    source = dict(source_identity=identity, monthly=monthly, extracted_at='fixture')
    registration = dict(protocol=dict(source_identity=identity, training_start='2020-01'),
                        observed_rows=[dict(period=r['month'],value_php=r['net_sales_php']) for r in monthly])
    predictions = [dict(model_id=model, origin_period=f'2023-{i:02d}',target_period=f'2023-{i+1:02d}',
                        lead_months=1,unit='PHP',stage='development',actual=136+i,prediction=136+i+error)
                   for i in (1,2,3) for model,error in [('seasonal_naive',12),('challenger',i)]]
    evaluation = dict(source_identity=identity,predictions=predictions,selection={'model_id':'frozen_fixture'},
                      run_id='fixture',publication_approved=False,financial_release_approved=False,future_forecasts_generated=0)
    return source,evaluation,registration


class ForecastReportTests(unittest.TestCase):
    def test_hand_scale_and_frozen_selection(self):
        result=report(*fixture())
        row=next(r for r in result['leaderboard'] if r['model_id']=='challenger' and r['lead_months']==1)
        self.assertEqual(row['mae'],2)
        self.assertAlmostEqual(row['mase'],1/6)
        self.assertFalse(result['selection_changed'])
        self.assertTrue(all(r['days_of_unit_demand'] is None for r in result['consequences']))
        self.assertTrue(all(r['mase'] is None for r in result['leaderboard'] if r['lead_months']==6))

    def test_mutating_future_unscored_source_cannot_change_past_metrics(self):
        source,evaluation,registration=fixture()
        before=report(source,evaluation,registration)
        source['monthly'][-1]['net_sales_php']=9999999
        registration['observed_rows'][-1]['value_php']=9999999
        after=report(source,evaluation,registration)
        self.assertEqual(before['leaderboard'],after['leaderboard'])
        self.assertEqual(before['dm_tests'],after['dm_tests'])

    def test_duplicate_predictions_and_mismatched_actual_or_identity_fail(self):
        data=fixture()
        data[1]['predictions'].append(copy.deepcopy(data[1]['predictions'][0]))
        with self.assertRaisesRegex(ValueError,'Duplicate'):
            report(*data)
        data=fixture()
        data[1]['predictions'][0]['actual']=9999
        with self.assertRaisesRegex(ValueError,'actual'):
            report(*data)
        data=fixture()
        data[0]['source_identity']=dict(dataset_id='different',policy_version='fixture')
        with self.assertRaisesRegex(ValueError,'identity'):
            report(*data)


if __name__ == '__main__':
    unittest.main()
