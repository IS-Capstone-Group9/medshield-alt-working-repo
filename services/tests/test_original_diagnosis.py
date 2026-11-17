from copy import deepcopy
from decimal import Decimal
import json
from pathlib import Path
import unittest

from services.analytics_service.predictive.original_diagnosis import (
    error_summary, reconcile_signals, line_value_decomposition, prepare_protocol, build_report,
)
from services.analytics_service.predictive.contracts import month


class OriginalDiagnosisTests(unittest.TestCase):
    def test_signed_errors_and_zero_denominator_are_explicit(self):
        result = error_summary([{'actual': -10, 'prediction': -5}, {'actual': 20, 'prediction': 10}])
        self.assertEqual(Decimal(result['mae_php']), Decimal('7.5'))
        self.assertEqual(Decimal(result['bias_php']), Decimal('-2.5'))
        self.assertEqual(result['wape_percent'], 50)
        self.assertEqual(Decimal(result['absolute_error_php']), Decimal('15'))
        self.assertEqual(Decimal(result['overprediction_absolute_php']), Decimal('5'))
        self.assertEqual(Decimal(result['underprediction_absolute_php']), Decimal('10'))
        self.assertIsNone(error_summary([{'actual': 0, 'prediction': 5}])['wape_percent'])
        self.assertEqual(error_summary([])['n'], 0)

    def test_source_signs_counts_dates_and_concentration_reconcile_without_return_claim(self):
        monthly = [dict(month='2026-01', source_records='4', net_eligible_records='3', net_sales_php='50')]
        signals = [dict(month='2026-01', source_records='4', net_eligible_records='3', positive_records='2',
                        negative_records='1', zero_records='0', net_sales_php='50', positive_net_php='60',
                        negative_net_php='-10', top5_positive_net_php='60', maximum_eligible_line_php='40',
                        minimum_eligible_line_php='-10', eligible_dates_json='["2026-01-02","2026-01-04"]')]
        row = reconcile_signals(monthly, signals)[0]
        self.assertEqual(row['ineligible_source_records'], 1)
        self.assertEqual(row['eligible_active_dates'], 2)
        self.assertEqual(row['top5_positive_share_percent'], 100)
        self.assertTrue(row['completeness'].startswith('unknown'))
        for field, value in [('negative_net_php', '-5'), ('positive_records', '1'),
                             ('top5_positive_net_php', '61'), ('eligible_dates_json', '["2026-02-01"]')]:
            with self.subTest(field=field):
                changed = deepcopy(signals); changed[0][field] = value
                with self.assertRaises(ValueError):
                    reconcile_signals(monthly, changed)
        with self.assertRaises(ValueError):
            reconcile_signals(monthly, signals * 2)

    def test_symmetric_accounting_change_matches_hand_calculated_count_value_and_credit_effect(self):
        before = [dict(positive_records=2, positive_net_php='100', negative_net_php='-10')]
        after = [dict(positive_records=4, positive_net_php='300', negative_net_php='-20')]
        result = line_value_decomposition(before, after)
        self.assertEqual(Decimal(result['signed_net_change_php']), Decimal('190'))
        self.assertEqual(Decimal(result['positive_line_count_contribution_php']), Decimal('125'))
        self.assertEqual(Decimal(result['mean_php_per_positive_line_contribution_php']), Decimal('75'))
        self.assertEqual(Decimal(result['negative_adjustment_contribution_php']), Decimal('-10'))
        self.assertEqual(Decimal(result['residual_php']), 0)

    def test_next_protocol_selection_cutoff_precedes_every_audit_origin_and_has_common_targets(self):
        protocol = prepare_protocol('source', 'diagnostic', dict(target={}, source_identity={}, configurations=[], seed=1))
        self.assertEqual(protocol['status'], 'PREPARED_NOT_EXECUTED')
        self.assertEqual(protocol['models_fitted'], 0)
        self.assertFalse(protocol['operational_publication_approved'])
        cases = protocol['cases']
        self.assertEqual(len(cases), 82)
        self.assertEqual(len({(row['stage'], row['target_period'], row['lead_months']) for row in cases}), 82)
        development = [row for row in cases if row['stage'] == 'development']
        audits = [row for row in cases if row['stage'] != 'development']
        self.assertLessEqual(max(month(row['target_period']) for row in development),
                             min(month(row['origin_period']) for row in audits))
        for row in cases:
            self.assertEqual(month(row['target_period']) - month(row['origin_period']), row['lead_months'])
            self.assertGreaterEqual(month(row['origin_period']) - month('2020-01') + 1, 36)
        for stage in {row['stage'] for row in cases}:
            self.assertEqual({row['target_period'] for row in cases if row['stage'] == stage and row['lead_months'] == 1},
                             {row['target_period'] for row in cases if row['stage'] == stage and row['lead_months'] == 3})

    def test_pinned_actual_report_reconciles_and_rejects_changed_source_history(self):
        root = Path(__file__).resolve().parents[2]
        original = json.loads((root / 'outputs/original_forecast_evaluation_20261027/input/source.json').read_text(encoding='utf-8'))
        diagnostic = json.loads((root / 'outputs/original_forecast_diagnosis_20261027/input/source.json').read_text(encoding='utf-8'))
        evaluation = json.loads((root / 'outputs/original_forecast_evaluation_20261027/run/evaluation.json').read_text(encoding='utf-8'))
        report = build_report(evaluation, original, diagnostic)
        self.assertEqual(len(report['selected_case_errors']), 81)
        self.assertEqual(report['stages']['retrospective_extension_2026']['negative_adjustment_records'], 0)
        self.assertEqual(Decimal(report['comparable_jan_sep_change']['signed_net_change_php']), Decimal('75699529.530000'))
        changed = deepcopy(diagnostic); changed['monthly'][0]['net_sales_php'] = '0'
        with self.assertRaisesRegex(ValueError, 'differs'):
            build_report(evaluation, original, changed)


if __name__ == '__main__':
    unittest.main()
