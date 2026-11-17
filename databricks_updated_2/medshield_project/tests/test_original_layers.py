"""Original-source layer conservation and safe retries; no live Spark claimed."""
import ast
import base64
from copy import deepcopy
from decimal import Decimal
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).resolve().parents[1]


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


module = load(PROJECT / 'original_source_20261026/01_original_sales_bronze_20261026.py', 'original_layer_test')


class OriginalLayerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle = module.original_bundle(PROJECT.parent / 'medshield_project_csv')
        cls.assessed = module.assess_bundle(cls.bundle['raw'])
        package = PROJECT.parent / 'category_releases/category_b160d6aad4376d64'
        cls.acceptance = json.loads((package / 'category_acceptance.json').read_text(encoding='utf-8'))
        cls.gold = module.gold_candidates(cls.assessed, cls.acceptance, cls.bundle['files'])

    def test_exact_source_bytes_and_every_physical_line_preserved(self):
        self.assertEqual(10, len(self.bundle['files']))
        self.assertEqual(62065, len(self.bundle['raw']))
        self.assertEqual(62065, len(self.assessed))
        for entry in self.bundle['files']:
            restored = base64.b64decode(entry['exact_source_bytes_b64'])
            self.assertEqual(entry['source_file_sha256'], hashlib.sha256(restored).hexdigest())

    def test_full_original_partitions_and_signed_financial_controls(self):
        expected = {'itemized': (40171, 39286, '638015351.53'),
                    'contracts': (352, 352, '118330249.95'),
                    'financial': (40523, 39638, '756345601.48')}
        for name, (records, eligible, amount) in expected.items():
            control = module.aggregate_controls(self.gold[name])
            self.assertEqual(records, control['records'])
            self.assertEqual(eligible, control['technically_eligible_records'])
            self.assertEqual(Decimal(amount), Decimal(control['technically_eligible_net_php']))
        self.assertEqual(Decimal('92952'), Decimal(module.aggregate_controls(self.gold['itemized'])['technically_eligible_net_php']) - Decimal('637922399.53'))

    def test_gold_keeps_missing_quantity_and_contract_details_unknown(self):
        for row in self.gold['contracts']:
            self.assertIsNone(row['recorded_quantity'])
            self.assertIsNone(row['physical_quantity'])
            self.assertIsNone(row['normalized_product'])
            self.assertIsNone(row['area'])
            self.assertIsNone(row['dr_number'])
            self.assertEqual('unavailable', row['contract_product_breakdown'])
        for row in self.gold['financial']:
            self.assertFalse(row['forecast_eligible'])
            self.assertFalse(row['source_unit_approved'])
            self.assertFalse(row['financial_release_approved'])

    def test_all_itemized_keys_have_independent_accepted_category_mapping(self):
        categories = {row['product_key']: row for row in self.acceptance['decisions']}
        for row in self.gold['itemized']:
            self.assertEqual(categories[row['product_key']]['product_category'], row['product_category'])
            self.assertEqual('approved', row['category_status'])
        changed = deepcopy(self.acceptance)
        first = self.gold['itemized'][0]['product_key']
        changed['decisions'] = [row for row in changed['decisions'] if row['product_key'] != first]
        with self.assertRaisesRegex(ValueError, 'lacks accepted category'):
            module.gold_candidates(self.assessed, changed, self.bundle['files'])

    def test_no_record_deduplication_or_financial_value_changes_in_gold(self):
        candidates = {row['source_record_id']: row for row in self.assessed if row['is_analysis_candidate']}
        self.assertEqual(set(candidates), {row['source_record_id'] for row in self.gold['financial']})
        for row in self.gold['financial']:
            original = candidates[row['source_record_id']]
            for field in ['net_sales', 'gross_sales', 'discount_amount', 'gross_margin_amount']:
                self.assertEqual(original[field], row[field])
            self.assertEqual(original['total_acquisition_cost'], row['acquisition_cost'])
            self.assertEqual(original['date_delivered'], row['date_delivered'])

    def test_evidence_transport_preserves_exact_canonical_json_and_rejects_tampering(self):
        original = self.assessed[123]
        envelope = module.evidence_envelope(self.bundle['dataset_id'], original['source_record_id'], original)
        packed = dict(zip(['dataset_id', 'record_id', 'payload_sha256', 'payload_b64'], envelope))
        restored = module.restore_assessed(module.decode_evidence(packed))
        self.assertEqual(module.stable_json(original), module.stable_json(restored))
        packed['payload_sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
            module.decode_evidence(packed)

    def test_complete_silver_evidence_roundtrip_preserves_gold_controls(self):
        restored = []
        for row in self.assessed:
            values = module.evidence_envelope(self.bundle['dataset_id'], row['source_record_id'], row)
            envelope = dict(zip(['dataset_id', 'record_id', 'payload_sha256', 'payload_b64'], values))
            restored.append(module.restore_assessed(module.decode_evidence(envelope)))
        self.assertEqual(module.content_digest(self.assessed), module.content_digest(restored))
        after = module.gold_candidates(restored, self.acceptance, self.bundle['files'])
        for name in self.gold:
            self.assertEqual(module.content_digest(self.gold[name]), module.content_digest(after[name]))

    def test_adjusted_csv_is_rejected_and_future_year_is_supported(self):
        root = PROJECT.parents[1]
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            for source in (PROJECT.parent / 'medshield_project_csv').glob('medshield_data_*.csv'):
                shutil.copyfile(source, folder / source.name)
            (folder / 'medshield_data_2027.csv').write_bytes(b'HEADER\n')
            bundle = module.original_bundle(folder)
            self.assertEqual(11, len(bundle['files']))
            self.assertNotEqual(self.bundle['dataset_id'], bundle['dataset_id'])
            archive = root / 'outputs/truth_correction_20261025/adjusted_archive/medshield_data_2025.csv'
            shutil.copyfile(archive, folder / 'medshield_data_2025.csv')
            with self.assertRaisesRegex(ValueError, 'original CSVs'):
                module.original_bundle(folder)
            shutil.copyfile(PROJECT.parent / 'medshield_project_csv/medshield_data_2025.csv',
                            folder / 'medshield_data_2025.csv')
            changed = folder / 'medshield_data_2018.csv'
            changed.write_bytes(changed.read_bytes() + b'\n')
            with self.assertRaisesRegex(ValueError, 'differs from reconciled originals'):
                module.original_bundle(folder)

    def test_batch_identity_changes_with_source_bytes_without_overwriting(self):
        a = module.pipeline_tables(self.bundle['dataset_id'])
        b = module.pipeline_tables('a' * 64)
        self.assertNotEqual(a['batch_id'], b['batch_id'])
        for name in ['source_files', 'raw_lines', 'assessed', 'itemized', 'contracts', 'financial']:
            self.assertNotEqual(a[name], b[name])
            self.assertEqual(a[name], module.checked_table_name(a[name]))
        with self.assertRaisesRegex(ValueError, 'outside isolated'):
            module.checked_table_name('workspace.medshield_gold.sales_restart_fact_candidate')

    def test_identical_existing_table_is_zero_write_and_differing_table_fails(self):
        datatype = SimpleNamespace(simpleString=lambda: 'string')
        schema = SimpleNamespace(fields=[SimpleNamespace(name='value', dataType=datatype)])
        class Frame:
            def __init__(self, data):
                self.data, self.schema = data, schema
            def exceptAll(self, other):
                return Frame([] if self.data == other.data else ['difference'])
            def limit(self, count):
                return Frame(self.data[:count])
            def count(self):
                return len(self.data)
            def writeTo(self, name):
                raise AssertionError('Existing table must never be written')
        spark = SimpleNamespace(catalog=SimpleNamespace(tableExists=lambda name: True))
        table = module.pipeline_tables(self.bundle['dataset_id'])['assessed']
        expected = Frame(['one'])
        with patch.object(module, 'read_frame', return_value=Frame(['one'])):
            self.assertFalse(module.create_or_verify(spark, table, expected))
        with patch.object(module, 'read_frame', return_value=Frame(['other'])):
            with self.assertRaisesRegex(ValueError, 'no overwrite'):
                module.create_or_verify(spark, table, expected)

    def test_all_three_generated_notebooks_match_and_have_only_v2_create(self):
        renderer = load(PROJECT / 'render_original_layers.py', 'original_layer_renderer')
        for name, source in renderer.render_all().items():
            self.assertEqual(source, (PROJECT / 'original_source_20261026' / name).read_text(encoding='utf-8'))
            tree = ast.parse(source)
            self.assertFalse(any(isinstance(node, ast.Name) and node.id == '__file__' for node in ast.walk(tree)))
            self.assertIn("frame.writeTo(table).using('delta').create()", source)
            self.assertNotIn('createOrReplace', source)


if __name__ == '__main__':
    unittest.main()
