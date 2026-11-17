"""Synthetic export fixtures; no real extraction or company accuracy results."""
import copy
import json
import unittest
from decimal import Decimal

from services.analytics_service import company_php_forward as f
from services.analytics_service import company_php_snapshot as s


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.identity = dict(dataset_id='1' * 64, policy_version='original_source_layers_v1_candidate_only',
                             source_table='fixture.gold.test_itemized_candidates', delta_version=7,
                             receipt_sha256='2' * 64)
        self.request = s.plan(self.identity, '2026-10')
        self.rows = []
        for i in range(82):
            value = -2 if i == 1 else i + 1
            self.rows.append(dict(row_kind='monthly', month=f.period(f.month('2020-01') + i),
                                  dataset_id_min='1' * 64, dataset_id_max='1' * 64,
                                  policy_min=self.identity['policy_version'], policy_max=self.identity['policy_version'],
                                  source_records='2', net_eligible_records='1', unreviewed_source_records='1',
                                  undated_records='0', invalid_identity_records='0',
                                  source_data_status_json='["reviewed","unreviewed"]',
                                  net_sales_php=str(value), positive_sales_php=str(max(0, value)),
                                  negative_sales_php=str(min(0, value))))
        control = copy.deepcopy(self.rows[0])
        control.update(row_kind='control', month=None)
        for name in s.COUNTS:
            control[name] = str(sum(int(row[name]) for row in self.rows))
        for name in s.DECIMALS:
            control[name] = str(sum(Decimal(row[name]) for row in self.rows))
        self.rows.insert(0, control)

    def receipt(self, raw):
        return dict(schema_version=1, source_identity=self.identity,
                    query_sha256=self.request['query_sha256'], export_sha256=f.digest(raw),
                    verification_status='SYNTHETIC_FIXTURE',
                    extracted_at='2026-11-01T01:00:00+08:00', verified_at='2026-11-01T02:00:00+08:00')

    def build(self, rows=None, receipt=None, request=None):
        raw = f.encoded(rows if rows is not None else self.rows)
        return s.build_snapshot(request or self.request, raw, f.encoded(receipt or self.receipt(raw)),
                                '2026-11-01T03:00:00+08:00', fixture=True)

    def test_exact_signed_controls_and_labels(self):
        result = self.build()
        self.assertEqual(len(result['monthly']), 82)
        self.assertEqual(sum(Decimal(r['net_sales_php']) for r in result['monthly']), Decimal(3399))
        self.assertEqual(sum(Decimal(r['negative_sales_php']) for r in result['monthly']), -2)
        self.assertEqual(result['monthly'][1]['source_data_status'], ['reviewed', 'unreviewed'])
        self.assertEqual(result['monthly'][1]['unreviewed_source_records'], 1)
        self.assertFalse(result['financial_release_approved'])
        self.assertFalse(result['extraction_evidence']['independently_attested'])

    def test_read_only_versioned_query(self):
        sql = self.request['sql']
        self.assertIn('VERSION AS OF 7', sql)
        self.assertIn("record_kind='itemized_sale'", sql)
        self.assertIn('GROUPING SETS', sql)
        self.assertNotIn('CREATE ', sql.upper())
        self.assertNotIn('INSERT ', sql.upper())
        self.assertEqual(s.query(self.identity, '2026-10'), sql)

    def test_invalid_query_identifiers_and_versions(self):
        for key, value in [('source_table', 'a.b.c;DROP TABLE x'), ('delta_version', True),
                           ('delta_version', -1), ('dataset_id', 'x'), ('policy_version', 'other')]:
            identity = dict(self.identity, **{key: value})
            with self.assertRaises(ValueError):
                s.plan(identity, '2026-10')
        for end in ('2026-13', '2026-10\n', '2019-12', "2026-10'; DROP"):
            with self.assertRaises(ValueError):
                s.plan(self.identity, end)

    def test_receipt_binding_and_pending_denial(self):
        raw = f.encoded(self.rows)
        for key, value in [('query_sha256', '0' * 64), ('export_sha256', '0' * 64),
                           ('verification_status', 'PENDING'), ('verified_at', '2026-11-02T00:00:00+08:00')]:
            receipt = dict(self.receipt(raw), **{key: value})
            with self.assertRaises(ValueError):
                self.build(receipt=receipt)
        request = copy.deepcopy(self.request)
        request['sql'] += ' '
        with self.assertRaises(ValueError):
            self.build(request=request)

    def test_controls_mixed_identity_and_missingness(self):
        for key, value in [('source_records', '3'), ('net_sales_php', '100'),
                           ('dataset_id_max', '3' * 64), ('policy_min', 'other'),
                           ('undated_records', '1'), ('invalid_identity_records', '1'),
                           ('net_eligible_records', '0'), ('net_sales_php', None),
                           ('source_data_status_json', '[]'), ('unreviewed_source_records', '3'),
                           ('unreviewed_source_records', '0'),
                           ('source_data_status_json', '["unreviewed"]')]:
            rows = copy.deepcopy(self.rows)
            rows[1][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                self.build(rows)

    def test_boundaries_gaps_and_duplicates(self):
        for index, value in [(1, '2019-12'), (20, '2021-09'), (82, '2026-09')]:
            rows = copy.deepcopy(self.rows)
            rows[index]['month'] = value
            with self.assertRaises(ValueError):
                self.build(rows)
        rows = copy.deepcopy(self.rows)
        rows[1], rows[2] = rows[2], rows[1]
        with self.assertRaises(ValueError):
            self.build(rows)

    def test_fixture_cannot_be_controlled_snapshot(self):
        raw = f.encoded(self.rows)
        with self.assertRaises(ValueError):
            s.build_snapshot(self.request, raw, f.encoded(self.receipt(raw)),
                             '2026-11-01T03:00:00+08:00')

    def test_forward_issue_roundtrip(self):
        snapshot = self.build()
        design = f.register('2026-10-31T13:00:00+08:00')
        issue = f.build_issue(design, f.encoded(snapshot), '2026-11-01T03:00:00+08:00', fixture=True)
        f.validate_issue(design, issue)
        self.assertEqual(len(issue['predictions']), 18)
        for row in issue['predictions']:
            if row['method'] == 'mean_6':
                self.assertEqual(row['prediction'], 79.5)
            if row['method'] == 'bias_w12':
                self.assertEqual(row['prediction'], 83 + row['calendar_lead'])
        self.assertEqual(json.loads(issue['snapshot_raw'])['monthly'][1]['negative_sales_php'], '-2')


if __name__ == '__main__':
    unittest.main()
