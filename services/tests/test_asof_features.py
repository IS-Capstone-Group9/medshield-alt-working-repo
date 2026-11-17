import copy
import unittest
from decimal import Decimal
from unittest.mock import patch

from services.analytics_service.predictive import asof_features as f
from services.analytics_service.jobs.run_feature_accuracy import choose_forecast
from services.analytics_service import abc_protocol


class AsofFeaturesTests(unittest.TestCase):
    def activity(self):
        return {p: dict(net=100. + p + p % 12 * 5, records=20. + p % 12,
                        eligible=18. + p % 12) for p in range(60)}

    def test_activity_future_isolation_training_target_and_currency_scale(self):
        from threadpoolctl import threadpool_limits
        known = self.activity()
        with threadpool_limits(limits=1):
            for config in f.FORECAST_CONFIGS:
                before, trace = f.forecast(known, 59, config)
                after, other = f.forecast(known | {60: dict(net=1e99, records=-1, eligible=-1)}, 59, config)
                self.assertEqual((before, trace), (after, other))
                self.assertLessEqual(trace['last_training_target'], 59)
                scaled = {p: dict(row, net=row['net'] * 1e6) for p, row in known.items()}
                value, _ = f.forecast(scaled, 59, config)
                self.assertAlmostEqual(before, value / 1e6, delta=.0001)

    def test_activity_hand_count_features_and_missing_counts(self):
        known = {p: dict(net=100., records=20., eligible=15.) for p in range(12)}
        values, scale = f.forecast_features(known, 11)
        self.assertEqual(scale, 100.)
        self.assertEqual(values[:9], [1.] * 9)
        self.assertEqual(values[-5:], [1., 1., 1., .75, 1.])
        with self.assertRaises(ValueError):
            f.forecast_features(known | {11: dict(net=100., records=0., eligible=0.)}, 11)
        with self.assertRaises(ValueError):
            f.forecast({p: row for p, row in self.activity().items() if p != 20}, 59, f.FORECAST_CONFIGS[0])

    def context(self, future=1000):
        def row(positive, months, negative=0):
            return dict(positive=Decimal(positive), negative=Decimal(negative), months=months)
        annual = {(2021, 'a'): row(50, 4), (2021, 'b'): row(150, 12),
                  (2022, 'a'): row(100, 6, -10), (2022, 'b'): row(300, 12),
                  (2023, 'a'): row(future, 12), (2023, 'b'): row(1, 12)}
        with patch.object(abc_protocol, 'annual_observations', return_value=({'a': 'A', 'b': 'B'}, annual)):
            return f.portfolio_context({})

    def row(self):
        return dict(product_key='a', target_year=2023, feature_year=2022,
                    feature_cutoff='2022-12-31', target_abc='A', prior_abc_baseline='A',
                    features={k: 1. for k in abc_protocol.FEATURES})

    def test_portfolio_hand_shares_boundaries_growth_and_history(self):
        values = f.portfolio_features(self.row(), self.context())
        self.assertEqual(values['prior_share'], .25)
        self.assertEqual(values['prior_cumulative_before'], .75)
        self.assertEqual(values['prior_rank_fraction'], .5)
        self.assertAlmostEqual(values['distance_to_80'], -.05)
        self.assertEqual(values['observed_years_last3'], 2)
        self.assertAlmostEqual(values['positive_growth_symmetric'], 1/3)
        self.assertEqual(values['share_change'], 0.)
        self.assertEqual(values['observed_month_change'], 2)
        self.assertEqual(values['return_fraction'], .1)

    def test_future_portfolio_and_current_target_cannot_change_prior_features(self):
        row = self.row()
        before = f.portfolio_features(row, self.context(1000))
        changed = copy.deepcopy(row)
        changed['target_abc'] = 'C'
        self.assertEqual(before, f.portfolio_features(changed, self.context(1e12)))

    def test_missing_history_is_explicit_and_cutoff_mismatch_rejected(self):
        row = self.row() | dict(product_key='unknown', prior_abc_baseline=None)
        result = f.portfolio_features(row, self.context())
        self.assertIsNone(result['prior_share'])
        self.assertIsNone(result['prior_cumulative_before'])
        self.assertEqual(result['prior_class_unknown'], 1)
        self.assertEqual(result['observed_years_last3'], 0)
        with self.assertRaises(ValueError):
            f.portfolio_features(self.row() | dict(feature_year=2023), self.context())

    def test_training_transformer_does_not_learn_from_validation(self):
        train = [dict(a=10., b=None), dict(a=30., b=5.)]
        processor = f.fit_transformer(train)
        self.assertEqual(processor['medians'], [20., 5.])
        before = copy.deepcopy(processor)
        f.transform([dict(a=1e12, b=1e9)], processor)
        self.assertEqual(before, processor)
        with self.assertRaises(ValueError):
            f.transform([dict(a=1.)], processor)

    def test_strongest_baseline_gain_bias_and_audit_selection_guards(self):
        def row(name, mae, bias=0., stage='development'):
            return dict(stage=stage, model_id=name, n=19, mae=mae, normalized_bias=bias)
        rows = [row('mean_6', 100), row('mean_3', 90), row('candidate', 89)]
        self.assertEqual(choose_forecast(rows)['selected_model'], 'mean_6')
        rows[-1] = row('candidate', 85, 5)
        self.assertEqual(choose_forecast(rows)['selected_model'], 'candidate')
        rows[-1]['normalized_bias'] = 5.01
        self.assertEqual(choose_forecast(rows)['selected_model'], 'mean_6')
        rows[-1]['stage'] = 'retrospective_audit'
        with self.assertRaises(ValueError):
            choose_forecast(rows)


if __name__ == '__main__':
    unittest.main()
