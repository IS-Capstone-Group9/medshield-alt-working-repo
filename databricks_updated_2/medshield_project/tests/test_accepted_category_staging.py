"""Acceptance-package guards and catalog semantics; no Spark execution claimed."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


launcher = load(HERE / 'maintenance/20261026_stage_accepted_categories.py', 'accepted_staging')
catalog = load(HERE / 'product_catalog.py', 'accepted_catalog_test')
PACKAGE = HERE.parent / 'category_releases' / launcher.RELEASE_ID


def read_local_package(folder=PACKAGE):
    with patch.object(launcher, 'PACKAGE_DIRECTORY', str(folder)):
        return launcher.read_package(str(folder))


class AcceptedCategoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.master, cls.receipt, cls.contract = read_local_package()

    def test_all_accepted_categories_resolve_without_identity_or_demand_approval(self):
        master = catalog.validate_master(self.master)
        self.assertEqual(5694, len(master))
        for decision in self.receipt['decisions']:
            resolved = catalog.resolve(decision['normalized_product'], decision['product_key'], master)
            self.assertEqual(decision['product_category'], resolved['product_category'])
            self.assertFalse(resolved['forecast_eligible'])
            self.assertEqual('needs_review', resolved['identity_status'])
            self.assertTrue(resolved['canonical_group_id'].startswith('RAW:'))
        self.assertEqual(875, sum(row['product_category'] == 'unclassified' for row in self.master))

    def test_duplicate_decision_keys_rejected(self):
        receipt = deepcopy(self.receipt)
        receipt['decisions'][1]['product_key'] = receipt['decisions'][0]['product_key']
        with self.assertRaisesRegex(ValueError, 'duplicate exact key'):
            launcher.validate_inputs(self.master, receipt, self.contract)

    def test_wrong_source_or_expanded_mutability_rejected(self):
        for field, value in [('source_version', 1), ('source_table', 'workspace.old.fact'),
                             ('target_table', launcher.SOURCE_TABLE),
                             ('mutable_fields', self.contract['mutable_fields'] + ['net_sales'])]:
            contract = deepcopy(self.contract)
            contract[field] = value
            with self.assertRaises(ValueError):
                launcher.validate_inputs(self.master, self.receipt, contract)

    def test_independent_approvals_rejected(self):
        for field in ['business_release_approval', 'sku_or_unit_approval', 'forecast_approval']:
            receipt = deepcopy(self.receipt)
            receipt[field] = True
            with self.assertRaisesRegex(ValueError, 'Independent approval'):
                launcher.validate_inputs(self.master, receipt, self.contract)
        master = deepcopy(self.master)
        master[0]['unit_status'] = 'approved'
        with self.assertRaisesRegex(ValueError, 'Independent dimension'):
            launcher.validate_inputs(master, self.receipt, self.contract)

    def test_unclassified_must_be_explicit(self):
        receipt = deepcopy(self.receipt)
        next(row for row in receipt['decisions'] if row['product_category'] == 'unclassified')['decision'] = 'accepted_category'
        with self.assertRaisesRegex(ValueError, 'Unresolved bucket'):
            launcher.validate_inputs(self.master, receipt, self.contract)

    def test_package_tampering_stops_before_spark(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            shutil.copytree(PACKAGE, folder, dirs_exist_ok=True)
            path = folder / 'accepted_product_master.csv'
            path.write_bytes(path.read_bytes() + b' ')
            with self.assertRaisesRegex(ValueError, 'Package file changed'):
                read_local_package(folder)
            (folder / 'manifest.json').write_bytes(b'{}')
            with self.assertRaisesRegex(ValueError, 'manifest'):
                read_local_package(folder)

    def test_create_propagates_concurrent_table_error_without_replacement(self):
        calls = []

        class Writer:
            def writeTo(self, table):
                calls.append(('writeTo', table))
                return self

            def using(self, provider):
                calls.append(('using', provider))
                return self

            def create(self):
                raise FileExistsError('concurrent table')

        with self.assertRaises(FileExistsError):
            launcher.create_new_candidate(Writer(), self.contract['target_table'])
        self.assertEqual([('writeTo', self.contract['target_table']), ('using', 'delta')], calls)

    def test_upload_view_matches_every_file(self):
        root = HERE.parents[1]
        uploaded = root / 'databricks_updated_2/category_releases' / launcher.RELEASE_ID
        for path in PACKAGE.iterdir():
            self.assertEqual(path.read_bytes(), (uploaded / path.name).read_bytes())
        self.assertEqual((HERE / 'maintenance/20261026_stage_accepted_categories.py').read_bytes(),
                         (root / 'databricks_updated_2/medshield_project/maintenance/20261026_stage_accepted_categories.py').read_bytes())


if __name__ == '__main__':
    unittest.main()
