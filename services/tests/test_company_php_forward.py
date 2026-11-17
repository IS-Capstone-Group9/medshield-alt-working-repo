"""Synthetic forward evidence only; no prospective company performance claims."""
import copy
import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from services.analytics_service import company_php_forward as f


class ForwardTests(unittest.TestCase):
    def setUp(self):
        self.design = f.register('2026-10-31T13:00:00+08:00')
        self.snapshot = dict(schema_version=1, scope=f.SCOPE, evidence_kind='synthetic_fixture',
                             contracts_excluded=True, verification_status='SYNTHETIC_FIXTURE',
                             extracted_at='2026-11-01T01:00:00+08:00',
                             verified_at='2026-11-01T02:00:00+08:00',
                             source_identity=dict(policy_version='original_source_layers_v1_candidate_only',
                                                  dataset_id='1' * 64, delta_version=1,
                                                  source_table='fixture.gold.test_itemized_candidates',
                                                  receipt_sha256='2' * 64),
                             monthly=[dict(month=f.period(f.month('2023-11') + i),
                                           net_sales_php=str(i + 1), source_records=1) for i in range(36)])

    def issue(self, snapshot=None, now='2026-11-01T03:00:00+08:00'):
        return f.build_issue(self.design, f.encoded(snapshot or self.snapshot), now, fixture=True)

    def outcomes(self):
        data = copy.deepcopy(self.snapshot)
        data.update(extracted_at='2027-06-01T01:00:00+08:00', verified_at='2027-06-01T02:00:00+08:00')
        data['source_identity']['dataset_id'] = '3' * 64
        data['monthly'].extend(dict(month=f.period(f.month('2026-11') + i),
                                    net_sales_php=str(37 + i), source_records=1) for i in range(7))
        return data

    def test_hand_predictions_and_roundtrip(self):
        issue = self.issue()
        f.validate_issue(self.design, issue)
        expected = {1: (26, 38), 3: (28, 40), 6: (31, 43)}
        for row in issue['predictions']:
            seasonal, bias = expected[row['calendar_lead']]
            value = dict(last_value=36, seasonal_naive=seasonal, mean_3=35,
                         mean_6=33.5, bias_w12=bias, bias_w24=bias)[row['method']]
            self.assertAlmostEqual(row['prediction'], value)
            self.assertEqual(row['source_relative_lead'], row['calendar_lead'] + 1)
        self.assertEqual(len(issue['predictions']), 18)

    def test_windows_and_staleness(self):
        for now in ('2026-10-31T23:59:59+08:00', '2026-11-04T00:00:00+08:00',
                    '2027-11-01T00:00:00+08:00', '2026-12-01T03:00:00+08:00'):
            with self.assertRaises(ValueError):
                self.issue(now=now)
        with self.assertRaises(ValueError):
            f.register('2026-11-01T00:00:00+08:00')

    def test_bad_snapshots(self):
        variants = []
        for field, value in [('scope', 'hospital_units'), ('contracts_excluded', False),
                             ('evidence_kind', 'controlled_source'),
                             ('verified_at', '2026-11-02T00:00:00+08:00')]:
            data = copy.deepcopy(self.snapshot)
            data[field] = value
            variants.append(data)
        for field, value in [('net_sales_php', 'NaN'), ('source_records', 0),
                             ('month', '2026-13')]:
            data = copy.deepcopy(self.snapshot)
            data['monthly'][-1][field] = value
            variants.append(data)
        for action in ('duplicate', 'gap', 'reorder'):
            data = copy.deepcopy(self.snapshot)
            if action == 'duplicate':
                data['monthly'].append(data['monthly'][-1])
            elif action == 'gap':
                del data['monthly'][10]
            else:
                data['monthly'].reverse()
            variants.append(data)
        for data in variants:
            with self.subTest(data=data), self.assertRaises(ValueError):
                self.issue(data)

    def test_tampering_and_code_binding(self):
        for mutation in ('prediction', 'drop', 'bytes', 'flag', 'protocol'):
            issue = self.issue()
            if mutation == 'prediction':
                issue['predictions'][0]['prediction'] += 1
            elif mutation == 'drop':
                issue['predictions'].pop()
            elif mutation == 'bytes':
                issue['snapshot_raw'] += ' '
            elif mutation == 'flag':
                issue['serving_changed'] = True
            else:
                issue['protocol_sha256'] = '0' * 64
            with self.assertRaises(ValueError):
                f.validate_issue(self.design, issue)
        self.design['definition']['code_sha256'] = {}
        with self.assertRaises(ValueError):
            self.issue()

    def test_mature_scoring_and_no_promotion(self):
        result = f.score(self.design, [self.issue()], f.encoded(self.outcomes()),
                         '2027-06-01T03:00:00+08:00', fixture=True)
        self.assertEqual(result['pending'], [])
        for row in result['comparisons']:
            self.assertFalse(row['research_comparison_ready'])
            self.assertIsNone(row['research_gate']['bias_w12'])
            self.assertEqual(row['metrics']['bias_w12']['mae'], 0)
            self.assertEqual(row['metrics']['seasonal_naive']['mae'], 12)
        self.assertFalse(result['serving_changed'])
        self.assertTrue(result['fixture'])

    def test_pending_and_missing_closed_outcome(self):
        data = copy.deepcopy(self.snapshot)
        data['source_identity']['dataset_id'] = '3' * 64
        data.update(extracted_at='2026-11-02T01:00:00+08:00', verified_at='2026-11-02T02:00:00+08:00')
        result = f.score(self.design, [self.issue()], f.encoded(data),
                         '2026-11-02T03:00:00+08:00', fixture=True)
        self.assertEqual(len(result['pending']), 18)
        with self.assertRaises(ValueError):
            f.score(self.design, [self.issue()], f.encoded(data), '2027-01-01T03:00:00+08:00', fixture=True)

    def test_revised_history_duplicate_and_mixed_evidence(self):
        data = self.outcomes()
        data['monthly'][0]['net_sales_php'] = '2'
        with self.assertRaises(ValueError):
            f.score(self.design, [self.issue()], f.encoded(data), '2027-06-01T03:00:00+08:00', fixture=True)
        with self.assertRaises(ValueError):
            f.score(self.design, [self.issue()] * 2, f.encoded(self.outcomes()),
                    '2027-06-01T03:00:00+08:00', fixture=True)
        with self.assertRaises(ValueError):
            f.build_issue(self.design, f.encoded(self.snapshot), '2026-11-01T03:00:00+08:00')

    def test_signed_and_zero_denominators(self):
        result = f.metrics([(-10, -5), (10, 5)])
        self.assertEqual(result['wape'], 50)
        self.assertEqual(result['normalized_bias'], 0)
        self.assertEqual(result['mae'], 5)
        self.assertIsNone(f.metrics([(0, 1)])['wape'])
        self.assertEqual(f.metrics([(0, 1)])['mae'], 1)

    def test_controlled_history_binding(self):
        # Preserved financial observations plus one explicitly synthetic extra row.
        # Pure validator exercise only; never write a controlled issue from this fixture.
        source = json.loads(f.BASE.read_bytes())
        data = copy.deepcopy(self.snapshot)
        data.update(evidence_kind='controlled_source', verification_status='OPERATOR_VERIFIED')
        data['monthly'] = [dict(month=r['month'], net_sales_php=r['net_sales_php'],
                                source_records=int(r['source_records'])) for r in source['monthly']
                           if '2020-01' <= r['month'] <= '2026-09']
        data['monthly'].append(dict(month='2026-10', net_sales_php='0', source_records=1))
        _, series = f.parse_snapshot(f.encoded(data), '2026-11-01T03:00:00+08:00')
        self.assertEqual(len(series), 82)
        data['monthly'][0]['net_sales_php'] = '1'
        with self.assertRaises(ValueError):
            f.parse_snapshot(f.encoded(data), '2026-11-01T03:00:00+08:00')

    def test_exclusive_concurrent_write(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'issue.json'
            def attempt(i):
                try:
                    f.exclusive_write(path, {'writer': i})
                    return True
                except FileExistsError:
                    return False
            with ThreadPoolExecutor(max_workers=4) as pool:
                self.assertEqual(sum(pool.map(attempt, range(8))), 1)
            self.assertIn(json.loads(path.read_bytes())['writer'], range(8))
            self.assertEqual(list(Path(directory).iterdir()), [path])

    def test_twelve_issue_gate_and_zero_baseline(self):
        for constant in (False, True):
            issues = []
            for index in range(12):
                data = copy.deepcopy(self.snapshot)
                issue_month = f.period(f.month('2026-11') + index)
                data.update(extracted_at=issue_month + '-01T01:00:00+08:00',
                            verified_at=issue_month + '-01T02:00:00+08:00')
                data['monthly'] = [dict(month=f.period(f.month('2023-11') + i),
                                        net_sales_php=str(10 if constant else i + 1), source_records=1)
                                   for i in range(36 + index)]
                issues.append(self.issue(data, issue_month + '-01T03:00:00+08:00'))
            data = copy.deepcopy(self.snapshot)
            data.update(extracted_at='2028-05-01T01:00:00+08:00', verified_at='2028-05-01T02:00:00+08:00')
            data['source_identity']['dataset_id'] = '3' * 64
            data['monthly'] = [dict(month=f.period(f.month('2023-11') + i),
                                    net_sales_php=str(10 if constant else i + 1), source_records=1)
                               for i in range(54)]
            result = f.score(self.design, issues, f.encoded(data), '2028-05-01T03:00:00+08:00', fixture=True)
            for group in result['comparisons']:
                self.assertTrue(group['research_comparison_ready'])
                self.assertEqual(group['metrics']['bias_w12']['n'], 12)
                self.assertEqual(group['research_gate']['bias_w12'], not constant)
            self.assertFalse(result['serving_changed'])


if __name__ == '__main__':
    unittest.main()
