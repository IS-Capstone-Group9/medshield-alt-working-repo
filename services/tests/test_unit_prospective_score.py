import copy
import csv
import json
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from pathlib import Path

from services.analytics_service import unit_prospective_issue as issue
from services.analytics_service import unit_prospective_score as scorer
from services.tests.test_unit_prospective_issue import encode, fixture


class ProspectiveScoreTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.issue_dir = self.root / 'issues'
        self.actual_dir = self.root / 'actuals'
        self.issue_dir.mkdir()
        self.actual_dir.mkdir()
        self.protocol = issue.load_design()
        self.now = issue.timestamp('2027-04-05T00:00:00+08:00')

    def write_issue(self, month='2026-11'):
        snapshot, receipt = fixture()
        for index, row in enumerate(snapshot['monthly']):
            row['month'] = issue.month_after(month, index - 12)
        snapshot['extracted_at'] = f'{month}-02T08:00:00+08:00'
        receipt['verified_at'] = f'{month}-02T08:05:00+08:00'
        receipt['history_end_month'] = issue.month_after(month, -1)
        document = issue.build_issue(*encode(snapshot, receipt), month, issue.timestamp(f'{month}-02T09:00:00+08:00'))
        return issue.write_issue(document, self.issue_dir)

    def actual(self, target='2026-12', value='100', revision=False):
        snapshot, _ = fixture()
        following = issue.month_after(target, 1)
        day = 3 if revision else 2
        source = dict(snapshot['source'], source_delta_version=3 if revision else 2,
                      dataset_id=issue.sha(f'{target}-{revision}'.encode()))
        return dict(schema_version=1, scope=self.protocol['scope'], target_month=target, source=source,
                    extracted_at=f'{following}-0{day}T08:00:00+08:00',
                    verified_at=f'{following}-0{day}T08:05:00+08:00',
                    controlled_successor_reconciliation_sha256='d' * 64,
                    ampoules=value, source_records=1, unreviewed_source_records=1,
                    source_data_status=['unreviewed_export'], zero_evidence_sha256=None)

    def issues(self):
        return scorer.load_issues(self.issue_dir, self.protocol, self.now)

    def pin(self, actual, restatement=False):
        return scorer.pin_actual(self.actual_dir, actual, self.protocol, self.issues(), self.now, restatement)

    def score(self):
        return scorer.score(self.actual_dir, self.protocol, self.issues(), self.now)

    def test_signed_errors_and_same_lead_metrics_against_hand_calculation(self):
        self.write_issue('2026-11')
        self.write_issue('2026-12')
        self.pin(self.actual(value='100'))
        self.pin(self.actual('2027-01', '-20'))
        report = self.score()
        lead1, lead3 = report['summaries']
        self.assertEqual((lead1['calendar_lead'], lead3['source_relative_lead']), (1, 4))
        # Last value issues both predict 120. Errors +20 and +140 give MAE 80,
        # RMSE 100 and WAPE 160/120. The negative actual contributes +20 to the denominator.
        last = lead1['methods']['last_value']
        self.assertEqual(last['paired_count'], 2)
        self.assertEqual(Decimal(last['mae']), 80)
        self.assertEqual(Decimal(last['rmse']), 100)
        self.assertEqual(Decimal(last['bias']), 80)
        self.assertAlmostEqual(float(last['wape']), 160 / 120 * 100)
        self.assertAlmostEqual(float(last['normalized_bias']), 160 / 120 * 100)
        self.assertEqual(last['direction'], dict(under=0, exact=0, over=2))
        self.assertEqual(last['largest_miss'], dict(target_month='2027-01', absolute_error='140'))
        self.assertEqual(last['comparisons']['last_value'], dict(wins=0, ties=2, losses=0))
        mean6 = lead1['methods']['mean_6']
        self.assertEqual(Decimal(mean6['bias']), 55)
        self.assertEqual(mean6['direction'], dict(under=1, exact=0, over=1))
        self.assertEqual(mean6['comparisons']['last_value'], dict(wins=2, ties=0, losses=0))
        self.assertEqual(mean6['comparisons']['seasonal_naive_12'], dict(wins=1, ties=0, losses=1))
        self.assertTrue(all(method['paired_count'] == 0 for method in lead3['methods'].values()))
        self.assertEqual(len(report['cases']), 24)
        self.assertEqual(report['status'], 'INCOMPLETE_RESEARCH_COHORT')
        self.assertFalse(report['operational_forecasting_approved'])
        self.assertIsNone(report['selected_method'])

    def test_missing_unissued_future_and_attested_zero_are_distinct(self):
        self.write_issue()
        actual = self.actual(value='0')
        actual.update(source_records=0, unreviewed_source_records=0)
        with self.assertRaisesRegex(ValueError, 'Absent records'):
            self.pin(actual)
        actual['zero_evidence_sha256'] = 'f' * 64
        self.pin(actual)
        report = self.score()
        first = report['summaries'][0]['methods']['last_value']
        self.assertEqual(Decimal(first['mae']), 120)
        self.assertIsNone(first['wape'])
        self.assertIsNone(first['normalized_bias'])
        self.assertEqual([row['status'] for row in report['cases'][:3]],
                         ['scored', 'closed_without_pinned_eligible_actual', 'unissued'])
        self.assertEqual(report['summaries'][1]['case_counts']['closed_without_pinned_eligible_actual'], 1)
        self.assertIn('awaiting_issue', {row['status'] for row in report['cases']})
        self.write_issue('2027-04')
        self.assertIn('awaiting_target_close', {row['status'] for row in self.score()['cases']})

    def test_bad_actuals_leave_ledger_empty(self):
        self.write_issue()
        for change in [
            lambda a: a.update(extracted_at='2026-12-31T15:59:59+00:00'),
            lambda a: a.update(verified_at='2027-05-01T00:00:00+08:00'),
            lambda a: a.update(verified_at='2027-01-01T00:00:00+08:00'),
            lambda a: a['scope'].update(recorded_channel='GOVERNMENT'),
            lambda a: a.update(ampoules='NaN'),
            lambda a: a.update(target_month='2026-11'),
            lambda a: a['source'].update(dataset_id='a' * 64),
            lambda a: a['source'].update(source_delta_version=1),
            lambda a: a['source'].update(mapping_confirmation_sha256='b' * 64),
            lambda a: a.update(controlled_successor_reconciliation_sha256=None),
        ]:
            actual = copy.deepcopy(self.actual())
            change(actual)
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.pin(actual)
        self.assertEqual(list(self.actual_dir.iterdir()), [])

    def test_concurrent_first_pin_and_separate_restatement_leave_scores_unchanged(self):
        self.write_issue()
        actual = self.actual()
        issues = self.issues()

        def attempt():
            try:
                return scorer.pin_actual(self.actual_dir, actual, self.protocol, issues, self.now)
            except FileExistsError:
                return None

        with ThreadPoolExecutor(max_workers=2) as workers:
            outcomes = [workers.submit(attempt) for _ in range(2)]
            paths = [path for future in outcomes if (path := future.result())]
        self.assertEqual(len(paths), 1)
        before = paths[0].read_bytes()
        report = self.score()
        revised = self.actual(value='140', revision=True)
        with self.assertRaises(FileExistsError):
            self.pin(revised)
        restatement = self.pin(revised, restatement=True)
        self.assertEqual(json.loads(restatement.read_bytes())['first_actual_sha256'], issue.sha(before))
        self.assertEqual(paths[0].read_bytes(), before)
        self.assertEqual(self.score(), report)
        with self.assertRaises(FileExistsError):
            self.pin(revised, restatement=True)

    def test_tampered_pin_or_incomplete_issue_is_rejected(self):
        issue_path = self.write_issue()
        pin = self.pin(self.actual())
        original = pin.read_bytes()
        document = json.loads(original)
        document['actual']['ampoules'] = '101'
        pin.write_text(json.dumps(document), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Invalid first actual pin'):
            self.score()
        pin.write_bytes(original)
        document = json.loads(issue_path.read_bytes())
        document['predictions'].pop()
        issue_path.write_text(json.dumps(document), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Incomplete or duplicate'):
            self.score()

    def test_full_calendar_preserves_shared_targets_and_all_methods(self):
        self.now = issue.timestamp('2028-03-05T00:00:00+08:00')
        schedule = list(scorer.calendar(self.protocol))
        for month in sorted({month for month, _, _ in schedule}):
            self.write_issue(month)
        issues = self.issues()
        for target in sorted({target for _, _, target in schedule}):
            scorer.pin_actual(self.actual_dir, self.actual(target), self.protocol, issues, self.now)
        report = self.score()
        self.assertEqual(report['status'], 'COMPLETE_RESEARCH_COHORT')
        with (issue.DESIGN / 'planned-cases.csv').open(encoding='utf-8', newline='') as stream:
            expected = {(row['issue_month'], int(row['calendar_lead']), int(row['source_relative_lead']),
                         row['target_month'], row['method']) for row in csv.DictReader(stream)}
        observed = {(row['issue_month'], row['calendar_lead'], row['source_relative_lead'],
                     row['target_month'], method) for row in report['cases']
                    for method in row['signed_errors_ampoules']}
        self.assertEqual(len(expected), 96)
        self.assertEqual(observed, expected)
        self.assertEqual(len(list(self.actual_dir.iterdir())), 14)
        self.assertEqual({method['paired_count'] for lead in report['summaries'] for method in lead['methods'].values()}, {12})
        february = [row for row in report['cases'] if row['target_month'] == '2027-02']
        self.assertEqual({row['calendar_lead'] for row in february}, {1, 3})
        self.assertEqual(len({row['first_actual_sha256'] for row in february}), 1)
        self.assertEqual(report['business_error_limits_status'], 'UNSET_NOT_A_PASS')
        self.assertIsNone(report['selected_method'])

    def test_cli_real_clock_report_is_create_only_and_refuses_unissued_target(self):
        command = [sys.executable, '-m', 'services.analytics_service.unit_prospective_score',
                   '--issues', str(self.issue_dir), '--actuals', str(self.actual_dir)]
        output = self.root / 'report.json'
        result = subprocess.run(command + ['score', '--out', str(output)], cwd=issue.ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        before = output.read_bytes()
        self.assertEqual(json.loads(before)['status'], 'INCOMPLETE_RESEARCH_COHORT')
        result = subprocess.run(command + ['score', '--out', str(output)], cwd=issue.ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(output.read_bytes(), before)
        snapshot = self.root / 'snapshot.json'
        snapshot.write_text(json.dumps(self.actual()), encoding='utf-8')
        result = subprocess.run(command + ['pin-actual', '--snapshot', str(snapshot)], cwd=issue.ROOT,
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(list(self.actual_dir.iterdir()), [])


if __name__ == '__main__':
    unittest.main()
