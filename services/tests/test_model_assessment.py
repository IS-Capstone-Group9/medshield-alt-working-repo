import unittest

from services.analytics_service import model_assessment as assessment
from services.analytics_service import verify_model_assessment as verifier
from services.analytics_service.rolling_accuracy import month_index, month_label


def cases(actuals):
    first = month_index('2025-01')
    return [
        dict(origin=month_label(first + i - 1), target=month_label(first + i),
             target_start=month_label(first + i), horizon=1, target_kind='point',
             growth_fallback=False, actual=actual, seasonal_scale=12,
             pred=dict(model=actual + 3, baseline=actual + 20))
        for i, actual in enumerate(actuals)
    ]


class ModelAssessmentTests(unittest.TestCase):
    def test_separate_accuracy_and_evidence_gates(self):
        rows = cases([100, -50] * 6)
        result = assessment.forecast_comparison(rows, 'model', 'baseline', 3, 'inspected retrospective')
        self.assertAlmostEqual(result['candidate']['wape_percent'], 4)
        self.assertAlmostEqual(result['candidate']['normalized_bias_percent'], 4)
        self.assertAlmostEqual(result['candidate']['mase'], .25)
        self.assertAlmostEqual(result['relative_wape_reduction_percent'], 85)
        self.assertLess(result['ci95_pp'][1], 0)
        self.assertTrue(result['below_15_percent_wape'])
        self.assertEqual(result['verdict'], 'not yet verifiable')
        self.assertEqual(assessment.forecast_verdict('prospective', 12, 15, -5, [-2, -1]), 'met')
        self.assertEqual(assessment.forecast_verdict('prospective', 12, 15, -5, [-2, 0]), 'not met')
        self.assertEqual(assessment.forecast_verdict('prospective', 11, 30, 0, [-2, -1]), 'not yet verifiable')

    def test_zero_actual_is_undefined_and_missing_is_rejected(self):
        rows = cases([0] * 12)
        result = assessment.forecast_comparison(rows, 'model', 'baseline', 3, 'prospective')
        self.assertIsNone(result['candidate']['wape_percent'])
        self.assertIsNone(result['candidate']['normalized_bias_percent'])
        self.assertIsNone(result['ci95_pp'])
        self.assertEqual(result['verdict'], 'not yet verifiable')
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            assessment.forecast_comparison(rows + rows[:1], 'model', 'baseline', 3, 'prospective')
        rows[0]['pred'].pop('model')
        with self.assertRaisesRegex(ValueError, 'missing/nonfinite'):
            assessment.forecast_comparison(rows, 'model', 'baseline', 3, 'prospective')

    def test_independent_verifier_checks_calendar_and_feature_cutoff(self):
        group = dict(track='T1', target_kind='point', horizon=2, calendar_lead=1, evidence_class='prospective')
        row = dict(origin='2026-11', issue_month='2026-12', target_start='2027-01', target='2027-01',
                   case_id='', issued_at='2026-12-02T08:00:00+08:00', feature_latest_at='2026-12-02T07:00:00+08:00')
        verifier.check_timing(row, group)
        with self.assertRaisesRegex(ValueError, 'must precede issue'):
            verifier.check_timing(dict(row, feature_latest_at=row['issued_at']), group)
        with self.assertRaisesRegex(ValueError, 'lead changed'):
            verifier.check_timing(dict(row, target='2027-02'), group)


if __name__ == '__main__':
    unittest.main()
