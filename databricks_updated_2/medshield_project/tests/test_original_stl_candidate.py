"""Exercise the actual self-contained notebook, including fail-closed staging/retry."""
import copy
import base64
import hashlib
import json
import re
import unittest
from pathlib import Path

NOTEBOOK = Path(__file__).resolve().parents[1] / 'maintenance/20261027_stage_original_itemized_stl.ipynb'


def load():
    document = json.loads(NOTEBOOK.read_text(encoding='utf-8'))
    namespace = {}
    for cell in document['cells'][:-1]:
        if cell['cell_type'] == 'code':
            exec(compile(''.join(cell['source']), str(NOTEBOOK), 'exec'), namespace)
    return namespace


class Row(dict):
    def asDict(self):
        return dict(self)


class Frame:
    def __init__(self, rows):
        self.rows = rows
    def collect(self):
        return self.rows


class Catalog:
    def __init__(self, session):
        self.session = session
    def tableExists(self, table):
        self.session.checked_tables.append(table)
        return self.session.exists


class Session:
    def __init__(self, rows, exists=False, version=0, readback=None):
        self.rows, self.exists, self.version = rows, exists, version
        self.readback = readback
        self.catalog = Catalog(self)
        self.calls, self.checked_tables = [], []
    def sql(self, statement):
        self.calls.append(statement)
        if statement.startswith('CREATE SCHEMA'):
            return Frame([])
        if statement.startswith('CREATE TABLE'):
            if self.exists:
                raise RuntimeError('Concurrent create; operator can retry')
            self.exists = True
            return Frame([])
        if statement.startswith('DESCRIBE HISTORY'):
            return Frame([Row(version=self.version)])
        if statement.startswith('SELECT '):
            return Frame([Row(row) for row in self.readback if self.readback is not None] if self.readback is not None
                         else [Row(row) for row in self.rows])
        raise AssertionError('Unexpected SQL statement')


class OriginalStlCandidateTests(unittest.TestCase):
    def setUp(self):
        self.ns = load()
        self.monthly = copy.deepcopy(self.ns['PACKAGE']['monthly_rows'])
        self.ns['read_gold_months'] = lambda session: copy.deepcopy(self.monthly)
        self.rows = self.ns['candidate_records'](self.ns['PACKAGE'], self.ns['PACKAGE_SHA256'])

    def test_schema_grain_source_and_approval_metadata(self):
        self.assertEqual(len(self.rows), 202)
        self.assertEqual(len({row['row_id'] for row in self.rows}), 202)
        for kind, count in [('calendar', 120), ('component', 81), ('receipt', 1)]:
            self.assertEqual(sum(row['record_type'] == kind for row in self.rows), count)
        receipt = json.loads(next(row['payload_json'] for row in self.rows if row['record_type'] == 'receipt'))
        self.assertTrue(receipt['contracts_excluded'])
        self.assertTrue(receipt['retrospective_diagnostic_only'])
        for key in ('financial_release_approved', 'model_publication_approved', 'approved_for_live_serving', 'origin_safe_forecast_feature'):
            self.assertIs(receipt[key], False)
        self.assertEqual(receipt['source_delta_version'], 0)
        self.assertEqual(receipt['source']['policy'], self.ns['POLICY'])
        self.assertEqual(receipt['policy'], 'original_itemized_stl_export_candidate_v1')
        self.assertEqual(receipt['monthly_sha256'], self.ns['MONTHLY_LOGICAL_SHA256'])
        self.assertTrue(all(hashlib.sha256(row['payload_json'].encode()).hexdigest() == row['payload_sha256'] for row in self.rows))

    def test_first_create_and_exact_existing_retry(self):
        session = Session(self.rows)
        first = self.ns['stage_original_stl_candidate'](session)
        self.assertEqual(first['new_candidate_tables_created'], 1)
        self.assertFalse(first['live_serving_changed'])
        first_hash = first['records_sha256']
        self.assertEqual(sum(sql.startswith('CREATE TABLE') for sql in session.calls), 1)
        create = next(sql for sql in session.calls if sql.startswith('CREATE TABLE'))
        self.assertIn('USING DELTA AS SELECT * FROM VALUES', create)
        for unsafe in ('OVERWRITE', 'REPLACE', 'APPEND', 'DROP ', 'errorifexists'):
            self.assertNotIn(unsafe, create)
        literals = re.finditer(r"CAST\(unbase64\('([A-Za-z0-9+/=]*)'\) AS STRING\)|CAST\(NULL AS STRING\)", create)
        decoded = [base64.b64decode(match[1]).decode('utf-8') if match[1] is not None else None for match in literals]
        self.assertEqual(decoded, [row[column] for row in self.rows for column in self.ns['CANDIDATE_COLUMNS']])
        session.calls.clear()
        second = self.ns['stage_original_stl_candidate'](session)
        self.assertEqual(second['new_candidate_tables_created'], 0)
        self.assertTrue(second['identical_existing_candidate_verified'])
        self.assertEqual(second['records_sha256'], first_hash)
        self.assertTrue(all(sql.startswith(('SELECT ', 'DESCRIBE HISTORY ')) for sql in session.calls))

    def test_changed_or_duplicate_existing_rows_fail_without_writes(self):
        changed = copy.deepcopy(self.rows)
        changed[0]['payload_json'] += ' '
        duplicate = copy.deepcopy(self.rows)
        duplicate[0] = duplicate[1]
        for actual in [changed, duplicate, self.rows[:-1], self.rows + [self.rows[0]]]:
            session = Session(self.rows, exists=True, readback=actual)
            with self.assertRaisesRegex(ValueError, 'readback differs'):
                self.ns['stage_original_stl_candidate'](session)
            self.assertFalse(any(sql.startswith('CREATE') for sql in session.calls))

    def test_changed_existing_delta_version_fails_without_rewrite(self):
        session = Session(self.rows, exists=True, version=1)
        with self.assertRaisesRegex(ValueError, 'immutable Delta0'):
            self.ns['stage_original_stl_candidate'](session)
        self.assertEqual(len(session.calls), 1)

    def test_changed_gold_monthly_or_source_failure_precedes_all_writes(self):
        session = Session(self.rows)
        self.monthly[0]['net_sales_php'] = '1'
        with self.assertRaises(ValueError):
            self.ns['stage_original_stl_candidate'](session)
        self.assertEqual(session.calls, [])
        self.assertEqual(session.checked_tables, [])
        def fail(session):
            raise RuntimeError('Source unavailable')
        self.ns['read_gold_months'] = fail
        with self.assertRaisesRegex(RuntimeError, 'Source unavailable'):
            self.ns['stage_original_stl_candidate'](session)
        self.assertEqual(session.calls, [])

    def test_corrupted_package_rejected_before_candidate_io(self):
        self.ns['PACKAGE']['components'][0]['trend'] = '0'
        session = Session(self.rows)
        with self.assertRaisesRegex(ValueError, 'package bytes differ'):
            self.ns['stage_original_stl_candidate'](session)
        self.assertEqual(session.calls, [])

    def test_wrong_target_and_sql_text_cannot_escape_values(self):
        with self.assertRaisesRegex(ValueError, 'target differs'):
            self.ns['create_candidate_sql']('workspace.live.sales', self.rows)
        encoded = self.ns['sql_text']("x'); DROP TABLE live; --\\\n")
        self.assertNotIn('DROP', encoded)
        self.assertTrue(encoded.startswith('CAST(unbase64('))

    def test_assembled_notebook_has_separate_cells_and_no_runtime_installs_or_fits(self):
        document = json.loads(NOTEBOOK.read_text(encoding='utf-8'))
        self.assertEqual(len(document['cells']), 6)
        code = '\n'.join(''.join(cell['source']) for cell in document['cells'] if cell['cell_type'] == 'code')
        compile(code, str(NOTEBOOK), 'exec')
        self.assertNotIn('import statsmodels', code)
        self.assertNotIn('import numpy', code)
        self.assertNotIn('%pip', code)
        self.assertNotIn('saveAsTable', code)
        self.assertIn('PASS_ORIGINAL_ITEMIZED_STL_CANDIDATE', code)


if __name__ == '__main__':
    unittest.main()
