from copy import deepcopy
from decimal import Decimal
import json
from pathlib import Path
import unittest

from services.analytics_service import commercial_case_review as review

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'outputs/commercial_case_review_20261027/source.json'


class CommercialCaseTests(unittest.TestCase):
    def test_fixed_order_record_count_value_bridge_conserves_change(self):
        prior=dict(net_records=10,net_sales=Decimal(1000))
        current=dict(net_records=5,net_sales=Decimal(400))
        result=review.record_value_bridge(prior,current)
        self.assertEqual(result['count_effect'],Decimal(-500))
        self.assertEqual(result['mean_recorded_value_effect'],Decimal(-100))
        self.assertEqual(result['recorded_net_change'],Decimal(-600))

    def test_absent_history_not_zero_and_observed_zero_is_retained(self):
        self.assertFalse(review.record_value_bridge(dict(net_records=0,net_sales=None),dict(net_records=1,net_sales=Decimal(0)))['available'])
        result=review.record_value_bridge(dict(net_records=1,net_sales=Decimal(0)),dict(net_records=1,net_sales=Decimal(10)))
        self.assertEqual(result['recorded_net_change'],Decimal(10))

    def test_actual_source_controls_case_count_and_cost_reconciliation(self):
        cases=review.analyze(json.loads(SOURCE.read_bytes()))
        self.assertEqual(len(cases),8)
        self.assertEqual(sum(sum(y['records'] for y in c['summaries'].values()) for c in cases),121)
        for case in cases:
            for row in case['supported_formula_residuals']:
                self.assertEqual(row['residual_php'],Decimal(0))
        negative={c['label']:c for c in cases if 'negative_profit' in c['focuses']}
        self.assertEqual(negative['ELCILLIN']['summaries']['2026']['gross_profit'],Decimal('-23621.5'))
        self.assertEqual(negative['CLONISUR']['summaries']['2026']['gross_profit'],Decimal('-346.7'))

    def test_count_coverage_does_not_hide_unsupported_monetary_amount(self):
        cases=review.analyze(json.loads(SOURCE.read_bytes()))
        clintop=next(c for c in cases if c['label']=='CLINTOP')
        self.assertEqual(clintop['summaries']['2026']['margin_records'],8)
        self.assertEqual(clintop['summaries']['2026']['records'],9)
        self.assertEqual(clintop['unsupported_net_eligible_amount'],Decimal(829080))
        self.assertIn('TRANSFER_VALUE_FORMULA_MISMATCH',clintop['unsupported_quality_counts'])

    def test_mutated_keys_controls_and_review_amounts_fail(self):
        source=json.loads(SOURCE.read_bytes())
        for edit in [lambda s:s['detail']['rows'].append(deepcopy(s['detail']['rows'][0])),
                     lambda s:s['controls']['rows'][0].update(net_sales='1'),
                     lambda s:s['cases'][0]['expected'].update(revenue=1),
                     lambda s:s.update(approvals_created=1)]:
            changed=deepcopy(source);edit(changed)
            with self.assertRaises(ValueError): review.analyze(changed)

    def test_unexpected_eligibility_or_nonfinite_source_fails(self):
        with self.assertRaises(ValueError): review.eligible({'flag':'maybe'},'flag')
        with self.assertRaises(ValueError): review.value({'amount':'NaN'},'amount')


if __name__=='__main__':
    unittest.main()
