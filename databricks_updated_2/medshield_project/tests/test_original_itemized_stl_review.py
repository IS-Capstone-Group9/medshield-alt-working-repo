"""Read-only notebook boundaries, calendar semantics and numerical reconstruction."""
import ast
import copy
import importlib.util
import json
import unittest
import base64
import zlib
from pathlib import Path
from unittest.mock import patch

NOTEBOOK = Path(__file__).resolve().parents[1] / 'maintenance/20261027_original_itemized_stl_review.py'
spec = importlib.util.spec_from_file_location('original_stl_review', NOTEBOOK)
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


def monthly_fixture():
    return [dict(month=f'{2020 + i // 12}-{i % 12 + 1:02d}', source_records=2, net_eligible_records=1,
                 net_sales_php=str(1000 + (i % 12) * 40 + i * 3),
                 supported_gross_profit_php='50', matching_margin_revenue_php='100') for i in range(48)]


class OriginalStlReviewTests(unittest.TestCase):
    def test_calendar_retains_missing_as_null_and_preserves_zero_negative(self):
        rows = monthly_fixture()
        rows[0]['net_sales_php'] = '0'
        rows[1]['net_sales_php'] = '-12.50'
        del rows[6]
        calendar = review.calendar_rows(rows)
        self.assertEqual(calendar[0]['net_sales_php'], '0')
        self.assertEqual(calendar[1]['net_sales_php'], '-12.50')
        self.assertIsNone(calendar[6]['net_sales_php'])
        self.assertEqual(calendar[6]['status'], 'missing_source_month')

    def test_duplicate_invalid_missing_nonfinite_and_noninteger_inputs_fail(self):
        for field, value in [('month', '2020-13'), ('net_sales_php', None), ('net_sales_php', 'NaN'),
                             ('net_sales_php', 'Infinity'), ('net_sales_php', True),
                             ('source_records', '1.5'), ('net_eligible_records', 5)]:
            rows = monthly_fixture()
            rows[0][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                review.monthly_identity(rows)
        rows = monthly_fixture()
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            review.monthly_identity(rows + [rows[0]])

    def test_digest_is_order_independent_but_detects_changed_metric(self):
        rows = monthly_fixture()
        self.assertEqual(review.monthly_identity(rows), review.monthly_identity(list(reversed(rows))))
        changed = copy.deepcopy(rows)
        changed[0]['supported_gross_profit_php'] = '50.01'
        self.assertNotEqual(review.monthly_identity(rows), review.monthly_identity(changed))
        with self.assertRaisesRegex(ValueError, 'reviewed export'):
            review.validate_monthly(changed)

    def test_retrospective_fit_reconstructs_contiguous_history_without_crossing_gaps(self):
        rows = monthly_fixture()
        # The first year becomes a separate short segment; three full years remain.
        del rows[11]
        totals = {field: str(sum(review.numeric(row[field]) for row in rows)) for field in review.MONTHLY_FIELDS[1:]}
        with patch.object(review, 'MONTHLY_LOGICAL_SHA256', review.monthly_identity(rows)), patch.object(review, 'EXPECTED_TOTALS', totals):
            result = review.decompose_review(rows)
        self.assertEqual(result['summary']['fitted_segments'][0]['months'], 36)
        self.assertEqual(result['summary']['short_segments_excluded'][0]['months'], 11)
        self.assertEqual(result['summary']['missing_source_months'], ['2020-12'])
        self.assertEqual(len(result['components']), 36)
        self.assertEqual(result['components'][0]['period'], '2021-01')
        for row in result['components']:
            self.assertAlmostEqual(row['observed'], row['trend'] + row['seasonal'] + row['residual'], places=6)
        self.assertFalse(result['summary']['live_serving_changed'])
        self.assertFalse(result['summary']['model_publication_approved'])

    def test_failed_source_history_stops_before_analytical_read(self):
        class Frame:
            def collect(self):
                return [{'version': 1}]
        class Session:
            def __init__(self):
                self.calls = []
            def sql(self, statement):
                self.calls.append(statement)
                return Frame()
        session = Session()
        with self.assertRaisesRegex(ValueError, 'changed after review'):
            review.read_gold_months(session)
        self.assertEqual(len(session.calls), 1)

    def test_notebook_sql_is_only_select_or_history_and_has_real_cells(self):
        source = NOTEBOOK.read_text(encoding='utf-8')
        parsed = ast.parse(source)
        sql_calls = [node for node in ast.walk(parsed) if isinstance(node, ast.Call)
                     and isinstance(node.func, ast.Attribute) and node.func.attr == 'sql']
        self.assertEqual(len(sql_calls), 4)
        for call in sql_calls:
            first = call.args[0].values[0].value
            self.assertTrue(first.startswith(('SELECT ', 'DESCRIBE HISTORY ')))
        self.assertGreaterEqual(source.count('# COMMAND ----------'), 5)
        self.assertNotIn('saveAsTable', source)
        self.assertNotIn('%pip', source)
        self.assertNotIn('TO_BE_BOUND', source)

    def test_pinned_receipt_source_and_monthly_read_path(self):
        binding_path = NOTEBOOK.parents[3] / 'backend/src/itemizedPreviewBinding.ts'
        binding_text = binding_path.read_text(encoding='utf-8')
        binding, _ = json.JSONDecoder().raw_decode(binding_text[binding_text.index('{'):])
        receipt = json.dumps(binding['expectedGoldReceipt'], sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        class Row(dict):
            def asDict(self):
                return dict(self)
        class Frame:
            def __init__(self, rows):
                self.rows = rows
            def collect(self):
                return self.rows
        class Session:
            def __init__(self, changes=None):
                self.calls, self.changes = [], changes or {}
            def sql(self, statement):
                self.calls.append(statement)
                if statement.startswith('DESCRIBE HISTORY'):
                    return Frame([Row(version=0)])
                if 'payload_b64' in statement:
                    return Frame([Row(dataset_id=review.DATASET_ID, payload_sha256=review.RECEIPT_SHA256,
                                      payload_b64=base64.b64encode(zlib.compress(receipt)).decode('ascii'))])
                if 'AS invalid_rows' in statement:
                    return Frame([Row({'records': 40171, 'unique_records': 40171, 'keys_sha256': review.SOURCE_KEYS_SHA256,
                                       'invalid_rows': 0, **self.changes})])
                return Frame([Row(row) for row in monthly_fixture()])
        rows = monthly_fixture()
        totals = {field: str(sum(review.numeric(row[field]) for row in rows)) for field in review.MONTHLY_FIELDS[1:]}
        with patch.object(review, 'MONTHLY_LOGICAL_SHA256', review.monthly_identity(rows)), patch.object(review, 'EXPECTED_TOTALS', totals):
            session = Session()
            self.assertEqual(len(review.read_gold_months(session)), 48)
            self.assertEqual(len(session.calls), 5)
            self.assertTrue(all(sql.startswith(('SELECT ', 'DESCRIBE HISTORY ')) for sql in session.calls))
            for changes in [{'unique_records': 40170}, {'invalid_rows': 1}, {'keys_sha256': 'different'}]:
                session = Session(changes)
                with self.subTest(changes=changes), self.assertRaisesRegex(ValueError, 'controls failed'):
                    review.read_gold_months(session)
                self.assertEqual(len(session.calls), 4)


if __name__ == '__main__':
    unittest.main()
