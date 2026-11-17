"""UI transport must not break reviewed multiline CSVs or conceal changed values."""
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parent / 'medshield_project_csv'


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CsvTransportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load(PROJECT / 'sales_csv_assessment.py', 'transport_parser_test')
        cls.bronze = cls.module.bronze_namespace()
        cls.silver = cls.module.silver_namespace()
        cls.payload = (SOURCE / 'medshield_data_2026.csv').read_bytes()
        cls.text = cls.payload.decode('utf-8-sig').replace('\r\n', '\n').replace('\r', '\n')
        cls.rows = list(csv.reader(io.StringIO(cls.text, newline=''), strict=True))

    def variants(self):
        stream = io.StringIO(newline='')
        csv.writer(stream, lineterminator='\n', quoting=csv.QUOTE_ALL).writerows(self.rows)
        return {
            'canonical': self.payload,
            'LF_without_BOM': self.text.encode(),
            'LF_with_BOM': b'\xef\xbb\xbf' + self.text.encode(),
            'CRLF_without_BOM': self.text.replace('\n', '\r\n').encode(),
            'equivalent_quoted_fields': stream.getvalue().encode(),
        }

    def test_known_representations_keep_reviewed_values_and_provenance_status(self):
        for name, payload in self.variants().items():
            with self.subTest(name=name):
                digest = hashlib.sha256(payload).hexdigest()
                self.assertTrue(self.bronze['reviewed_2026_csv_representation'](payload))
                self.assertEqual(('UNREVIEWED_SOURCE_EXPORT', None),
                    self.bronze['source_provenance']('medshield_data_2026.csv', digest, payload=payload))
                self.assertEqual(3431, len(self.bronze['decode_csv_source'](payload, 'medshield_data_2026.csv')))

    def test_reassembled_records_keep_actual_byte_identity_and_same_measures(self):
        expected = None
        seen_hashes = set()
        for name, payload in self.variants().items():
            digest = hashlib.sha256(payload).hexdigest()
            lines = self.bronze['decode_csv_source'](payload, 'medshield_data_2026.csv')
            sources = [dict(dataset_id=digest, source_record_id=self.bronze['source_record_key']('medshield_data_2026.csv', digest, number),
                source_workbook='medshield_data_2026.csv', data_source_year=2026, source_row_number=number,
                source_file_sha256=digest, raw_csv_line=line, source_path='fixture') for number, line in enumerate(lines, 1)]
            assessed = self.silver['assess_sales_records'](sources)
            self.assertEqual({row['source_record_id'] for row in sources}, {row['source_record_id'] for row in assessed})
            self.assertEqual({digest}, {row['source_file_sha256'] for row in assessed})
            signature = [(row['source_row_number'], row['record_kind'], row['disposition'], row['product'],
                          row['date_delivered'], row['net_sales'], row['quantity']) for row in assessed]
            if expected is None:
                expected = signature
            else:
                self.assertEqual(expected, signature, name)
            seen_hashes.add(digest)
        self.assertGreater(len(seen_hashes), 1)

    def test_changed_product_or_amount_is_not_transport_equivalent(self):
        for column in [6, 12]:
            rows = [list(row) for row in self.rows]
            row = next(row for row in rows if len(row) == 17 and row[0].strip().isdigit())
            row[column] = 'CHANGED PRODUCT' if column == 6 else '999999999.00'
            stream = io.StringIO(newline='')
            csv.writer(stream, lineterminator='\n').writerows(rows)
            changed = stream.getvalue().encode()
            self.assertFalse(self.bronze['reviewed_2026_csv_representation'](changed))
            with self.assertRaisesRegex(ValueError, 'contents differ'):
                self.bronze['source_provenance']('medshield_data_2026.csv', hashlib.sha256(changed).hexdigest(), payload=changed)

    def test_incorrect_supplied_digest_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'digest does not match'):
            self.bronze['source_provenance']('medshield_data_2026.csv', 'incorrect', payload=self.payload)

    def test_unreviewed_filename_still_rejects_multiline_records(self):
        with self.assertRaisesRegex(ValueError, 'not been reviewed'):
            self.bronze['decode_csv_source'](self.payload, 'unreviewed.csv')

    def test_malformed_csv_is_not_transport_equivalent(self):
        malformed = b'"unterminated\nfield'
        self.assertFalse(self.bronze['reviewed_2026_csv_representation'](malformed))
        with self.assertRaisesRegex(ValueError, 'invalid CSV'):
            self.bronze['decode_csv_source'](malformed, 'medshield_data_2026.csv')

    def test_full_source_assessment_accepts_transport_copy_without_changing_totals(self):
        audit = load(PROJECT / 'verify_local_sources.py', 'transport_full_audit_test')
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            for source in SOURCE.glob('medshield_data_*.csv'):
                shutil.copy2(source, folder / source.name)
            changed_path = folder / 'medshield_data_2026.csv'
            transport = self.text.encode()
            self.assertNotEqual(hashlib.sha256(self.payload).hexdigest(), hashlib.sha256(transport).hexdigest())
            changed_path.write_bytes(transport)
            report = audit.audit_sources(folder)
            self.assertEqual(62065, report['raw_lines'])
            self.assertEqual(40523, report['clean_records'])
            self.assertEqual(352, report['contract_candidate_records'])
            self.assertEqual('118330249.950000', report['contract_recorded_net_sales_php'])
            self.assertEqual('756345601.480000', report['financial_eligible_net_sales_php'])
            self.assertTrue(all(report['checks'].values()))
            actual = next(row for row in report['files'] if row['source_year'] == 2026)
            self.assertEqual(hashlib.sha256(transport).hexdigest(), actual['source_file_sha256'])
            self.assertIsNone(report['contract_physical_quantity'])
            self.assertEqual(0, report['approvals_created'])


if __name__ == '__main__':
    unittest.main()
