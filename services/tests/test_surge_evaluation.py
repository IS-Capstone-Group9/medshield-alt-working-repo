import copy
import math
import unittest

import numpy as np

from services.analytics_service.predictive.contracts import month,period
from services.analytics_service.surge_evaluation import binary_metrics,build_examples,evaluate,select_threshold


def fixture():
    rng=np.random.default_rng(20261030)
    first=month('2017-01')
    data=dict(dataset_id='synthetic_fixture_only',policy_version='synthetic_fixture_only',fixture_only=True,
        series_id='synthetic_ampoule',unit='fixture ampoule',territory='Fixture territory',
        unit_review_evidence='fixture contract, not company unit approval',
        clinical_mapping_evidence='fixture only, no clinical mapping claim',
        geography_review_evidence='fixture only, not actual territory approval',
        disease='Dengue',weather_provider='NASA POWER',
        external_sources={p:dict(dataset_id='synthetic_'+p,policy_version='fixture_only') for p in ('DOH','NASA POWER')},
        sales=[],external_rows=[])
    for i in range(96):
        p=period(first+i)
        quantity=float(round(100+10*math.sin(i)+rng.exponential(40)))
        if p in ('2022-03','2022-09'):
            quantity=450.
        data['sales'].append(dict(period=p,quantity=quantity))
        for provider,signal in [('DOH','Dengue'),('NASA POWER','Rainfall')]:
            data['external_rows'].append(dict(period=p,provider=provider,signal=signal,territory='Fixture territory',value=float(rng.uniform(20,200))))
    return data


class SurgeEvaluationTests(unittest.TestCase):
    def test_hand_binary_metrics_and_no_positive_missing(self):
        result=binary_metrics([1,0,1],[.9,.8,.1],.5)
        self.assertEqual(result['precision'],.5)
        self.assertEqual(result['recall'],.5)
        self.assertEqual(result['f1'],.5)
        self.assertAlmostEqual(result['brier'],(.01+.64+.81)/3)
        self.assertAlmostEqual(result['pr_auc'],19/24)
        self.assertIsNone(binary_metrics([0,0],[.1,.2],.5)['pr_auc'])

    def test_threshold_selection_rejects_audit(self):
        validation=[dict(stage='validation',label=y,probability=p) for y,p in [(1,.9),(0,.8),(1,.7)]]
        self.assertEqual(select_threshold(validation)['value'],.7)
        validation.append(dict(stage='audit',label=1,probability=.1))
        with self.assertRaisesRegex(ValueError,'validation'):
            select_threshold(validation)

    def test_origin_features_p90_scale_ignore_future_mutations(self):
        data=fixture()
        before,_=build_examples(data)
        changed=copy.deepcopy(data)
        for row in changed['sales']:
            if row['period']>='2023-01':row['quantity']*=1000
        for row in changed['external_rows']:
            if row['period']>='2023-01':row['value']*=1000
        after,_=build_examples(changed)
        self.assertEqual([r for r in before if r['target_period']<'2023-01'],[r for r in after if r['target_period']<'2023-01'])
        first=before[0]
        self.assertLess(first['external_features'][0]['feature_period'],first['origin_period'])
        self.assertEqual(first['external_features'][1]['feature_period'],first['origin_period'])

    def test_missing_review_gate_returns_unavailable(self):
        data=fixture()
        del data['unit_review_evidence']
        self.assertEqual(evaluate(data,validation_start='2022-01',audit_start='2022-07',audit_end='2022-12')['status'],'unavailable')

    def test_evaluation_thresholds_are_audit_isolated_and_common_fold(self):
        data=fixture()
        before=evaluate(data,validation_start='2022-01',audit_start='2022-07',audit_end='2022-12')
        changed=copy.deepcopy(data)
        for row in changed['sales']:
            if row['period']>='2022-07':row['quantity']*=10
        after=evaluate(changed,validation_start='2022-01',audit_start='2022-07',audit_end='2022-12')
        self.assertEqual(before['thresholds'],after['thresholds'])
        self.assertFalse(before['publication_approved'])
        self.assertEqual(before['status'],'fixture_method_evaluation')
        self.assertEqual({r['n'] for r in before['ablation']},{6})
        self.assertTrue(all(r['threshold'] is not None for r in before['classification_metrics']))


if __name__=='__main__':unittest.main()
