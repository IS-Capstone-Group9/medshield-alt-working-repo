"""Independent hand cases and issue-time/missingness/registration boundaries."""
from copy import deepcopy
from pathlib import Path
import tempfile
import unittest

from services.analytics_service import company_accuracy_evidence as model
from services.analytics_service.jobs import run_company_accuracy_evidence as runner


class CompanyAccuracyEvidenceTests(unittest.TestCase):
    def test_baseline_hand_arithmetic(self):
        got = model.baseline_values({p: float(p + 1) for p in range(12)}, 11)
        self.assertEqual(dict(last_value=12., seasonal_naive=1., mean_3=11., mean_6=9.5), got)

    def test_completed_residual_hand_arithmetic_and_ranks(self):
        issue = model.issue_intervals({p: float(p + 1) for p in range(36)}, 35)
        first = issue['inner'][0]
        self.assertEqual(12, first['target'])
        self.assertEqual(13., first['actual'])
        self.assertEqual(9.5, first['prediction'])
        self.assertEqual(3.5, first['residual'])
        self.assertEqual(9.5, first['scale'])
        self.assertEqual((20, 2, 23), (issue['symmetric_radius_rank'], issue['signed_lower_rank'], issue['signed_upper_rank']))
        self.assertEqual((30., 37.), (issue['intervals'][0]['lower'], issue['intervals'][0]['upper']))

    def test_future_value_and_future_invalid_value_invariance(self):
        original = {p: float(p + 1) for p in range(45)}
        changed = dict(original)
        for p in range(36, 45):
            changed[p] = float('nan')
        self.assertEqual(model.issue_intervals(original, 35), model.issue_intervals(changed, 35))

    def test_signed_currency_scaling_and_no_clipping(self):
        series = {p: -100. for p in range(36)}
        issue = model.issue_intervals(series, 35)
        for row in issue['intervals']:
            self.assertEqual((-100., -100., -100.), (row['prediction'], row['lower'], row['upper']))
        original = {p: float(p + 1) for p in range(36)}
        a = model.issue_intervals(original, 35)
        b = model.issue_intervals({p: v * 100 for p, v in original.items()}, 35)
        for x, y in zip(a['intervals'], b['intervals']):
            for key in ('prediction', 'lower', 'upper'):
                self.assertAlmostEqual(x[key] * 100, y[key])

    def test_zero_scale_is_unavailable_not_epsilon_filled(self):
        issue = model.issue_intervals({p: 0. for p in range(36)}, 35)
        self.assertEqual((0., 0.), (issue['intervals'][0]['lower'], issue['intervals'][0]['upper']))
        self.assertIsNone(issue['intervals'][1]['lower'])
        self.assertIsNotNone(issue['intervals'][1]['failure'])

    def test_missing_short_nonfinite_and_boolean_inputs_reject(self):
        good = {p: 100. for p in range(36)}
        missing = dict(good)
        missing.pop(8)
        nonfinite = dict(good)
        nonfinite[20] = float('inf')
        for broken in (missing, {p: 100. for p in range(29)}, nonfinite):
            with self.assertRaises(ValueError):
                model.issue_intervals(broken, 35 if len(broken) > 29 else 28)
        with self.assertRaises(ValueError):
            model.issue_intervals({p: True for p in range(36)}, 35)
        with self.assertRaises(ValueError):
            model.issue_intervals(good, True)

    def test_interval_score_hand_example_and_no_cohort_shrink(self):
        rows = [dict(lower=0., upper=10., actual=12., failure=None),
                dict(lower=0., upper=10., actual=5., failure=None)]
        got = model.summarize_intervals(rows)
        self.assertEqual((.5, 10., 20.), (got['coverage'], got['mean_width'], got['interval_score']))
        rows[1]['failure'] = 'missing'
        self.assertEqual((0, 1), (model.summarize_intervals(rows)['n'], model.summarize_intervals(rows)['failed']))

    def test_selection_rejects_audit_weak_coverage_and_incomplete_cases(self):
        reports = [dict(stage='development', model_id=name, n=10, expected_n=10,
                        failed=0, coverage=.8, interval_score=100. if i == 0 else 90.)
                   for i, name in enumerate(model.INTERVALS)]
        self.assertTrue(model.choose_interval(reports)['candidate_passed_development_guard'])
        for field, value in (('coverage', .7), ('n', 9), ('interval_score', 96.)):
            broken = deepcopy(reports)
            broken[1][field] = value
            self.assertFalse(model.choose_interval(broken)['candidate_passed_development_guard'])
        for row in reports:
            row['stage'] = 'retrospective_audit'
        with self.assertRaisesRegex(ValueError, 'development'):
            model.choose_interval(reports)

    def test_registration_partial_execution_and_code_drift_reject(self):
        root = Path(__file__).resolve().parents[2]
        source = root / 'outputs/wp4_forecast_tournament_20261030/source.json'
        reference = root / 'outputs/wp4_new_tournament_20261030/results.json'
        self.assertTrue(source.is_file() and reference.is_file(), 'Required retained evidence absent')
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / 'study'
            runner.run(source, reference, out, 'register')
            (out / 'execution-start.json').write_text('{}', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'overwrite'):
                runner.run(source, reference, out, 'execute')
            (out / 'protocol-hash.json').write_text('{"sha256":"changed"}', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'drift'):
                runner.run(source, reference, out, 'execute')


if __name__ == '__main__':
    unittest.main()
