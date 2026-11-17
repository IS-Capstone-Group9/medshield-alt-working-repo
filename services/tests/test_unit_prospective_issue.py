"""Synthetic controls only: no live sales or prospective performance evidence."""
import copy
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

from services.analytics_service import unit_prospective_issue as writer


def fixture():
    protocol = writer.load_design()
    prior = protocol['prior_evidence']['source']
    rows = []
    # Nov 2025-Oct 2026: simple 10,20,...120 ampoules, preserving signed/zero support separately.
    for i in range(12):
        rows.append(dict(month=f'2025-{i+11:02d}' if i < 2 else f'2026-{i-1:02d}',
                         ampoules=str((i+1)*10), source_records=1, unreviewed_source_records=int(i == 11),
                         source_data_status=['unreviewed_export' if i == 11 else 'original_export'], zero_evidence_sha256=None))
    source = dict(source_table=prior['fact_table'], source_delta_version=1,
                  dataset_id='a'*64, policy_version=prior['policy_version'],
                  source_receipt_sha256='b'*64, mapping_confirmation_sha256=prior['confirmation_sha256'])
    snapshot = dict(schema_version=1, scope=protocol['scope'], source=source,
                    extracted_at='2026-11-02T08:00:00+08:00', monthly=rows)
    receipt = dict(status='VERIFIED_CONTROLLED_GOLD_RESEARCH_EXTRACTION', source=source,
                   verified_at='2026-11-02T08:05:00+08:00', controlled_successor_reconciliation_sha256='c'*64,
                   history_end_month='2026-10', monthly_records=12, source_records=12, unreviewed_source_records=1)
    return snapshot, receipt


def encode(snapshot, receipt):
    raw = json.dumps(snapshot).encode()
    receipt = copy.deepcopy(receipt)
    receipt['snapshot_sha256'] = hashlib.sha256(raw).hexdigest()
    return raw, json.dumps(receipt).encode()


NOW = datetime.fromisoformat('2026-11-02T09:00:00+08:00')


class ProspectiveIssueTests(unittest.TestCase):
    def build(self, snapshot=None, receipt=None, now=NOW):
        s, r = fixture()
        return writer.build_issue(*encode(snapshot if snapshot is not None else s, receipt if receipt is not None else r), '2026-11', now)

    def test_hand_arithmetic_calendar_and_no_operational_approval(self):
        issue = self.build()
        self.assertEqual(len(issue['predictions']), 8)
        # Latest=120, mean(100,110,120)=110, mean(70..120)=95.
        # Target Dec 2026 refers to Dec 2025=20; target Feb 2027 refers to Feb 2026=40.
        for row in issue['predictions']:
            expected = {'last_value': 120, 'mean_3': 110, 'mean_6': 95,
                        'seasonal_naive_12': 20 if row['calendar_lead'] == 1 else 40}[row['method']]
            self.assertEqual(Decimal(row['prediction_ampoules']), Decimal(expected))
            self.assertEqual(row['target_month'], '2026-12' if row['calendar_lead'] == 1 else '2027-02')
            self.assertEqual(row['source_relative_lead'], row['calendar_lead']+1)
            self.assertFalse(row['operational_forecasting_approved'])
            self.assertEqual(row['quality_status']['unreviewed_source_records'], 1)
            self.assertNotIn('actual_ampoules', row)
        self.assertIsNone(issue['selected_method'])

    def test_missing_duplicate_stale_future_and_reordered_months(self):
        for mutate in [lambda s: s['monthly'].pop(4),
                       lambda s: s['monthly'].__setitem__(5, copy.deepcopy(s['monthly'][4])),
                       lambda s: s['monthly'][-1].update(month='2026-09'),
                       lambda s: s['monthly'][-1].update(month='2026-11'),
                       lambda s: s['monthly'].reverse()]:
            with self.subTest(mutate=mutate):
                snapshot, _ = fixture(); mutate(snapshot)
                with self.assertRaises(ValueError): self.build(snapshot=snapshot)

    def test_source_scope_and_receipt_failures(self):
        for change in [lambda s, r: s['scope'].update(recorded_channel='GOVERNMENT'),
                          lambda s, r: s['scope'].update(unit='boxes'),
                          lambda s, r: s['source'].update(policy_version='changed'),
                          lambda s, r: s['source'].update(source_delta_version=True),
                          lambda s, r: r.update(status='NOT_VERIFIED'),
                          lambda s, r: r.update(controlled_successor_reconciliation_sha256=None),
                          lambda s, r: r.update(source_records=13),
                          lambda s, r: r.update(unreviewed_source_records=0),
                          lambda s, r: s.update(target_actuals={})]:
            with self.subTest(change=change):
                s, r = fixture(); change(s, r)
                with self.assertRaises(ValueError): self.build(s, r)

    def test_nonfinite_missing_quantity_and_ineligible_empty_month(self):
        for value in ['NaN', 'Infinity', '1e999', None, 120]:
            s, _ = fixture(); s['monthly'][-1]['ampoules'] = value
            with self.subTest(value=value), self.assertRaises(ValueError): self.build(snapshot=s)
        s, r = fixture(); s['monthly'][0].update(ampoules='0', source_records=0); r['source_records'] = 11
        with self.assertRaises(ValueError): self.build(s, r)
        s['monthly'][0]['zero_evidence_sha256'] = 'd'*64
        r['explicit_zero_evidence'] = {'2025-11': 'd'*64}
        self.assertEqual(len(self.build(s, r)['predictions']), 8)

    def test_negative_values_zero_net_and_fractional_means_are_preserved(self):
        s, r = fixture()
        for row, value in zip(s['monthly'][-3:], ['-2', '0', '1']): row['ampoules'] = value
        issue = self.build(s, r)
        mean = next(p for p in issue['predictions'] if p['method'] == 'mean_3')
        self.assertLess(abs(Decimal(mean['prediction_ampoules']) + Decimal(1)/3), Decimal('1e-27'))
        self.assertTrue(mean['prediction_ampoules'].startswith('-0.333'))

    def test_timezones_early_late_stale_and_future_extractions(self):
        for now in [datetime(2026, 10, 29, tzinfo=timezone.utc), datetime(2026, 12, 1, tzinfo=timezone.utc), datetime(2026, 11, 2)]:
            with self.subTest(now=now), self.assertRaises(ValueError): self.build(now=now)
        for extracted in ['2026-10-31T23:59:00+08:00', '2026-11-02T10:00:00+08:00', '2026-11-02T08:00:00']:
            s, _ = fixture(); s['extracted_at'] = extracted
            with self.subTest(extracted=extracted), self.assertRaises(ValueError): self.build(snapshot=s)
        # UTC Nov 30 16:00 is already December in Manila, so the November window is closed.
        with self.assertRaises(ValueError): self.build(now=datetime(2026, 11, 30, 16, tzinfo=timezone.utc))

    def test_snapshot_hash_and_historical_delta0_rejected(self):
        s, r = fixture(); raw, receipt = encode(s, r)
        with self.assertRaises(ValueError): writer.build_issue(raw+b' ', receipt, '2026-11', NOW)
        prior = writer.load_design()['prior_evidence']['source']
        s['source'].update(source_delta_version=0, dataset_id=prior['dataset_id']);r['source']=s['source']
        with self.assertRaises(ValueError): self.build(s, r)

    def test_cohort_partial_wrong_lead_and_actual_injection_rejected(self):
        for change in [lambda i: i['predictions'].pop(),
                       lambda i: i['predictions'][0].update(calendar_lead=2),
                       lambda i: i['predictions'][0].update(actual_ampoules='2'),
                       lambda i: i['predictions'][0].update(operational_forecasting_approved=True),
                       lambda i: i['predictions'][0].update(prediction_ampoules='999'),
                       lambda i: i.update(operational_forecasting_approved=True),
                       lambda i: i.update(snapshot_sha256='f'*64),
                       lambda i: i.update(extraction_verification_receipt_sha256='e'*64),
                       lambda i: i['snapshot']['monthly'][0].update(ampoules='999')]:
            issue = self.build(); change(issue)
            with tempfile.TemporaryDirectory() as temp:
                out = Path(temp)/'out'
                with self.assertRaises(ValueError): writer.write_issue(issue, out)
                self.assertFalse(out.exists())

    def test_exclusive_atomic_write_concurrent_callers_and_no_partial_cohort(self):
        issue = self.build()
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)/'issues'
            def attempt(_):
                try: return str(writer.write_issue(issue, directory))
                except FileExistsError: return None
            with ThreadPoolExecutor(max_workers=2) as pool: results = list(pool.map(attempt, [1, 2]))
            self.assertEqual(sum(r is not None for r in results), 1)
            self.assertEqual(len(list(directory.iterdir())), 1)
            path = directory/'unit_202611.json'; before = path.read_bytes()
            self.assertEqual(len(json.loads(before)['predictions']), 8)
            with self.assertRaises(FileExistsError): writer.write_issue(issue, directory)
            self.assertEqual(path.read_bytes(), before)

    def test_cli_missing_source_and_backdating_option_fail_without_output(self):
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp)/'out'
            command = [sys.executable, '-m', 'services.analytics_service.unit_prospective_issue', '--snapshot', str(Path(temp)/'absent.json'),
                       '--receipt', str(Path(temp)/'absent-receipt.json'), '--issue-month', '2026-11', '--out', str(out)]
            result = subprocess.run(command, cwd=writer.ROOT, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2); self.assertFalse(out.exists())
            result = subprocess.run(command+['--issued-at', NOW.isoformat()], cwd=writer.ROOT, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2); self.assertFalse(out.exists())

    def test_registered_protocol_or_calendar_tampering_rejected(self):
        for name in ['protocol.json', 'planned-cases.csv']:
            with tempfile.TemporaryDirectory() as temp:
                directory = Path(temp)
                for file in ['protocol.json', 'planned-cases.csv', 'registration.json']:
                    (directory/file).write_bytes((writer.DESIGN/file).read_bytes())
                with (directory/name).open('ab') as stream: stream.write(b' ')
                with self.assertRaises(ValueError): writer.load_design(directory)

    def test_read_only_cli_validation_and_tamper_rejection(self):
        issue = self.build()
        with tempfile.TemporaryDirectory() as temp:
            path = writer.write_issue(issue, temp)
            before = path.read_bytes()
            command = [sys.executable, '-m', 'services.analytics_service.unit_prospective_issue', '--validate-issue', str(path)]
            result = subprocess.run(command, cwd=writer.ROOT, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(path.read_bytes(), before)
            issue['predictions'][0]['prediction_ampoules'] = '999'
            path.write_text(json.dumps(issue), encoding='utf-8')
            result = subprocess.run(command, cwd=writer.ROOT, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)


if __name__ == '__main__':
    unittest.main()
