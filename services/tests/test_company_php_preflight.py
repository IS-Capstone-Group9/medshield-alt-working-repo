import csv
import io
import json
import unittest

from services.analytics_service import company_php_forward as forward
from services.analytics_service import company_php_preflight as preflight


class CompanyPhpPreflightTests(unittest.TestCase):
    def setUp(self):
        self.design = forward.register('2026-10-31T13:00:00+08:00')
        self.checked = '2026-12-02T12:00:00+08:00'

    def event(self, **updates):
        row = dict(event_id='test-1', revision='1', known_at='2026-11-30T06:00:00+08:00',
                   captured_at='2026-11-30T07:00:00+08:00', planned_month='2027-01',
                   population_scope=forward.SCOPE, evidence_kind='confirmed_order', source_evidence_id='synthetic-1',
                   custody_verified='true', linkage_verified='true', status='confirmed', net_sales_basis_php='10.00')
        return dict(row, **updates)

    def archive(self, events, **updates):
        output = io.StringIO(newline='')
        writer = csv.DictWriter(output, fieldnames=preflight.EVENT_FIELDS)
        writer.writeheader()
        writer.writerows(events)
        raw = output.getvalue().encode()
        receipt = dict(schema_version=1, status='OPERATOR_VERIFIED_ORDER_ARCHIVE', scope=forward.SCOPE,
                       target_month='2027-01', cutoff_at='2026-12-01T10:00:00+08:00',
                       verified_at='2026-12-02T08:00:00+08:00', export_sha256=forward.digest(raw),
                       source_receipt_sha256='a' * 64, complete_target_scope=True)
        return dict(events_raw=raw, receipt_raw=forward.encoded(dict(receipt, **updates)))

    def snapshot(self, history_end='2026-11', extraction_month='2026-12'):
        retained = json.loads(forward.BASE.read_bytes())
        rows = [dict(month=r['month'], net_sales_php=str(r['net_sales_php']), source_records=int(r['source_records']))
                for r in retained['monthly'] if '2020-01' <= r['month'] <= '2026-09']
        for index in range(forward.month('2026-10'), forward.month(history_end) + 1):
            rows.append(dict(month=forward.period(index), net_sales_php='123.45', source_records=1))
        return forward.encoded(dict(schema_version=1, scope=forward.SCOPE, evidence_kind='controlled_source',
            contracts_excluded=True, verification_status='OPERATOR_VERIFIED',
            extracted_at=f'{extraction_month}-01T01:00:00+08:00', verified_at=f'{extraction_month}-01T02:00:00+08:00',
            source_identity=dict(policy_version=retained['source_identity']['policy_version'], dataset_id='1' * 64,
                                 delta_version=1, source_table='test.gold.fixture_itemized_candidates',
                                 receipt_sha256='2' * 64), monthly=rows))

    def test_closed_november_window_and_missing_inputs(self):
        result = preflight.assess(self.design, '2026-11-03T16:00:00+00:00')
        self.assertEqual(result['schedule'], dict(issue_window_open_now=False, next_eligible_issue_month='2026-12',
            required_history_end='2026-11', one_month_target='2027-01', one_month_source_relative_lead=2,
            eligible_days=[1, 2, 3]))
        self.assertIsNone(result['order_archive']['confirmed_target_orders'])
        self.assertFalse(result['forecast_issued'])
        final = preflight.assess(self.design, '2027-10-04T00:00:00+08:00')
        self.assertIsNone(final['schedule']['next_eligible_issue_month'])

    def test_snapshot_matches_registered_writer_and_rejects_drift(self):
        snapshot = self.snapshot()
        result = preflight.assess(self.design, self.checked, snapshot_raw=snapshot)
        self.assertEqual(result['sales_snapshot']['status'], 'ELIGIBLE_FOR_REGISTERED_ISSUE')
        issued = forward.build_issue(self.design, snapshot, self.checked)
        self.assertEqual(issued['predictions'][0]['target_month'], '2027-01')
        old = preflight.assess(self.design, self.checked, snapshot_raw=self.snapshot('2026-10', '2026-11'))
        self.assertEqual(old['sales_snapshot']['status'], 'VALIDATED_NOT_ISSUE_READY')
        changed = json.loads(snapshot)
        changed['monthly'][0]['source_records'] += 1
        with self.assertRaises(ValueError):
            preflight.assess(self.design, self.checked, snapshot_raw=forward.encoded(changed))

    def test_known_reschedule_and_later_cancellation(self):
        events = [self.event(), self.event(event_id='test-2'),
                  self.event(revision='2', planned_month='2027-02'),
                  self.event(event_id='test-2', revision='2', status='cancelled',
                             known_at='2026-12-02T02:00:00+08:00', captured_at='2026-12-02T03:00:00+08:00')]
        result = preflight.assess(self.design, self.checked, **self.archive(events))
        self.assertEqual(result['order_archive']['confirmed_target_orders'], 1)
        self.assertTrue(result['order_archive']['matches_next_issue_target'])
        self.assertFalse(result['accuracy_measured'])
        self.assertFalse(result['independently_attested'])

    def test_attested_empty_archive_differs_from_missing(self):
        accepted = preflight.assess(self.design, self.checked, **self.archive([]))
        self.assertEqual(accepted['order_archive']['confirmed_target_orders'], 0)
        with self.assertRaises(ValueError):
            preflight.assess(self.design, self.checked, **self.archive([], complete_target_scope=False))
        with self.assertRaises(ValueError):
            preflight.assess(self.design, self.checked, events_raw=self.archive([])['events_raw'])

    def test_bad_receipts_and_order_records_fail(self):
        for change in (dict(target_month='2026-12'), dict(export_sha256='b' * 64),
                       dict(cutoff_at='2026-12-04T01:00:00+08:00'),
                       dict(verified_at='2026-12-03T00:00:00+08:00')):
            with self.subTest(change=change), self.assertRaises(ValueError):
                preflight.assess(self.design, self.checked, **self.archive([self.event()], **change))
        for change in (dict(linkage_verified='false'), dict(evidence_kind='delivery'),
                       dict(net_sales_basis_php='NaN'), dict(known_at='2026-11-30T00:00:00'),
                       dict(captured_at='2026-12-03T00:00:00+08:00')):
            with self.subTest(change=change), self.assertRaises(ValueError):
                preflight.assess(self.design, self.checked, **self.archive([self.event(**change)]))
        with self.assertRaises(ValueError):
            preflight.assess(self.design, self.checked, **self.archive([self.event(), self.event()]))


if __name__ == '__main__':
    unittest.main()
