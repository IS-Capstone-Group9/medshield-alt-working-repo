"""Synthetic callback queries: no Spark/warehouse execution or actual forecasts."""
import base64
import copy
import json
import tempfile
import unittest
import zlib
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

from services.analytics_service import unit_gold_extraction as adapter
from services.analytics_service import unit_prospective_issue as writer

NOW = datetime.fromisoformat('2026-11-03T10:00:00+08:00')
TABLE = 'workspace.medshield_original_gold_future.original_future_itemized_candidates'
RECEIPT = 'workspace.medshield_original_gold_future.original_future_receipt'


def original_receipt():
    text = (writer.ROOT/'backend/src/itemizedPreviewBinding.ts').read_text(encoding='utf-8')
    return json.JSONDecoder().raw_decode(text.split('"expectedGoldReceipt":', 1)[1].lstrip())[0]


def envelope(payload):
    raw = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
    return dict(dataset_id=payload['dataset_id'], record_id='gold_receipt', payload_sha256=writer.sha(raw),
                payload_b64=base64.b64encode(zlib.compress(raw)).decode())


def fixture():
    previous = original_receipt()
    current = copy.deepcopy(previous)
    current.update(dataset_id='a'*64)
    current['batch_id'] = 'original_future'
    protocol = writer.load_design(); prior = protocol['prior_evidence']['source']
    # 50 artificial historical source IDs: no real transaction contents.
    old = []
    for i in range(50):
        month = f'2025-{i%11+1:02d}' if i%11 < 9 else f'2024-{i%11+1:02d}'
        # ensure every November 2025-September 2026 training month is observed
        if i < 11: month = writer.month_after('2025-11', i)
        old.append(dict(dataset_id=prior['dataset_id'], policy_version=prior['policy_version'],
                        source_record_id=f'synthetic-{i}', source_workbook='synthetic.csv', source_file_sha256='b'*64,
                        source_row_number=str(i+1), normalized_product='BUPIRIGHT', raw_area='HOSPITAL',
                        record_kind='itemized_sale', date=month+'-01', recorded_quantity='10', source_data_status='ORIGINAL_SOURCE'))
    new = copy.deepcopy(old)
    for row in new: row['dataset_id'] = current['dataset_id']
    new.append(dict(new[0], source_record_id='synthetic-new', source_row_number='51', date='2026-10-01',
                    recorded_quantity='-2', source_data_status='UNREVIEWED_SOURCE_EXPORT'))
    seen = []
    def execute(sql):
        seen.append(sql)
        if 'payload_b64' in sql: return [envelope(current if RECEIPT in sql else previous)]
        return copy.deepcopy(new if TABLE in sql else old)
    return execute, seen, current, new, old


class ExtractionTests(unittest.TestCase):
    def run_extract(self, execute):
        return adapter.extract(execute, TABLE, 0, RECEIPT, 0, '2026-11', now=lambda: NOW)

    def test_receipt_hash_and_query_scope_then_writer_compatibility(self):
        execute, seen, _, _, _ = fixture()
        result = self.run_extract(execute)
        snapshot = json.loads(result['snapshot_raw'])
        self.assertEqual(len(snapshot['monthly']), 12)
        self.assertEqual(snapshot['monthly'][-1]['ampoules'], '-2')
        self.assertEqual(snapshot['monthly'][-1]['unreviewed_source_records'], 1)
        self.assertEqual(snapshot['monthly'][0]['ampoules'], '10')
        self.assertEqual(result['reconciliation']['unchanged_historical_records'], 50)
        self.assertEqual(len(seen), 4)
        self.assertTrue(all('VERSION AS OF 0' in sql and sql.startswith('SELECT ') for sql in seen))
        issue = writer.build_issue(result['snapshot_raw'], result['receipt_raw'], '2026-11', NOW)
        self.assertEqual(len(issue['predictions']), 8)
        self.assertTrue(all(p['operational_forecasting_approved'] is False for p in issue['predictions']))

    def test_changed_historical_missing_duplicate_and_future_rows_fail(self):
        mutations = [lambda rows: rows[0].update(recorded_quantity='11'),
                     lambda rows: rows.pop(0), lambda rows: rows.append(copy.deepcopy(rows[0])),
                     lambda rows: rows[-1].update(date='2026-11-01'), lambda rows: rows[-1].update(date=None),
                     lambda rows: rows[-1].update(recorded_quantity='NaN'), lambda rows: rows[-1].update(raw_area='GOVERNMENT'),
                     lambda rows: rows[-1].update(dataset_id='f'*64), lambda rows: rows.pop()]
        for mutate in mutations:
            execute, _, _, rows, _ = fixture(); mutate(rows)
            with self.subTest(mutate=mutate), self.assertRaises(ValueError): self.run_extract(execute)

    def test_receipt_policy_master_scope_hash_and_compression_fail(self):
        for mutate in [lambda r: r.update(pipeline_policy='changed'), lambda r: r.update(accepted_master_sha256='f'*64),
                       lambda r: r.update(batch_id='wrong_batch')]:
            execute, _, current, _, _ = fixture(); mutate(current)
            with self.subTest(mutate=mutate), self.assertRaises(ValueError): self.run_extract(execute)
        execute, *_ = fixture()
        def corrupt(sql):
            rows = execute(sql)
            if 'payload_b64' in sql: rows[0]['payload_sha256']='f'*64
            return rows
        with self.assertRaises(ValueError): self.run_extract(corrupt)

    def test_injection_mutable_version_unregistered_month_and_source_failure(self):
        execute, *_ = fixture()
        with self.assertRaises(ValueError): adapter.extract(execute, TABLE+'; DROP TABLE x', 0, RECEIPT, 0, '2026-11', now=lambda:NOW)
        with self.assertRaises(ValueError): adapter.extract(execute, TABLE, 1, RECEIPT, 0, '2026-11', now=lambda:NOW)
        with self.assertRaises(ValueError): adapter.extract(execute, TABLE, 0, RECEIPT, 0, '2026-10', now=lambda:NOW)
        with self.assertRaises(RuntimeError): self.run_extract(lambda sql: (_ for _ in ()).throw(RuntimeError('source unavailable')))

    def test_duplicate_receipts_and_row_bound(self):
        execute, *_ = fixture()
        def duplicate(sql):
            rows = execute(sql)
            return rows*2 if 'payload_b64' in sql else rows
        with self.assertRaises(ValueError): self.run_extract(duplicate)
        with patch.object(adapter, 'MAX_ROWS', 49), self.assertRaises(ValueError): self.run_extract(execute)

    def test_repeated_business_rows_with_distinct_ids_preserved(self):
        execute, _, _, rows, _ = fixture()
        rows.append(dict(rows[-1], source_record_id='synthetic-new-2', source_row_number='52'))
        result = self.run_extract(execute)
        self.assertEqual(json.loads(result['snapshot_raw'])['monthly'][-1]['ampoules'], '-4')
        self.assertEqual(json.loads(result['receipt_raw'])['source_records'], 13)

    def test_complete_local_bundle_and_overwrite_rejection(self):
        execute, *_ = fixture(); result = self.run_extract(execute)
        with tempfile.TemporaryDirectory() as temp:
            path = adapter.write_bundle(result, Path(temp)/'bundle')
            before = {p.name:p.read_bytes() for p in path.iterdir()}
            self.assertEqual(len(before), 6)
            with self.assertRaises(ValueError): adapter.write_bundle(result, path)
            self.assertEqual(before, {p.name:p.read_bytes() for p in path.iterdir()})
            self.assertEqual(len(list(Path(temp).iterdir())), 1)

    def test_spark_entrypoint_end_to_end_and_malformed_receipt(self):
        execute, *_ = fixture()
        class Row:
            def __init__(self, value): self.value=value
            def asDict(self, recursive=True): return self.value
        class Frame:
            def __init__(self, values): self.values=values
            def toLocalIterator(self): return iter(Row(v) for v in self.values)
        class Spark:
            def sql(self, sql): return Frame(execute(sql))
        original = adapter.extract
        with tempfile.TemporaryDirectory() as temp, patch.object(adapter, 'extract', side_effect=lambda *a, **k: original(*a, **k, now=lambda:NOW)):
            path = adapter.extract_from_spark(Spark(), TABLE, RECEIPT, '2026-11', Path(temp)/'bundle')
            self.assertEqual(len(json.loads((path/'snapshot.json').read_bytes())['monthly']), 12)
        def malformed(sql):
            rows = execute(sql)
            if 'payload_b64' in sql: rows[0]['payload_b64'] = base64.b64encode(b'not-zlib').decode()
            return rows
        with self.assertRaises(zlib.error): self.run_extract(malformed)


if __name__ == '__main__': unittest.main()
