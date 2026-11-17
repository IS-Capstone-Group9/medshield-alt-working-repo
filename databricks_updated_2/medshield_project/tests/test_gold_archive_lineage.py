"""Actual Gold archive mapper with hand-solvable metadata and immutable oracles."""
import ast
import copy
from decimal import Decimal
import importlib.util
from pathlib import Path
import unittest

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("source_rebuild", PROJECT / "source_rebuild.py")
source_api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source_api)


class ArchiveLineageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree = ast.parse((PROJECT / "03_sales_gold.py").read_text(encoding="utf-8-sig"))
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "historical_archive_overrides")
        namespace = {}
        exec(compile(ast.Module(body=[function], type_ignores=[]), "actual_gold_archive_mapper", "exec"), namespace)
        cls.map_paths = staticmethod(namespace["historical_archive_overrides"])

    def fixture(self):
        contract = {"dataset_id": "new-batch", "target_schemas": {"bronze": "workspace.medshield_bronze_source_20261022"}}
        root = "/Volumes/workspace/medshield_bronze_source_20261022/raw_files/sales_restart/new-batch/"
        old = {"source_record_id": "old", "source_workbook": "medshield_data_2025.csv", "source_file_sha256": "a"*64, "source_row_number": 8, "source_path": "/Volumes/workspace/medshield_bronze/raw_files/sales_restart/old-batch/medshield_data_2025.csv"}
        new = {"source_record_id": "added", "source_workbook": "medshield_data_2026.csv", "source_file_sha256": "b"*64, "source_row_number": 9, "source_path": root + "medshield_data_2026.csv"}
        current = [{**old, "source_path": root + old["source_workbook"]}, new]
        manifest = [{"dataset_id": "new-batch", "source_workbook": row["source_workbook"], "source_file_sha256": row["source_file_sha256"], "source_path": row["source_path"]} for row in current]
        return [old], current, manifest, contract

    def test_restores_original_path_only_for_historical_keys(self):
        old, new, manifest, contract = self.fixture()
        untouched = copy.deepcopy((old, new, manifest, contract))
        self.assertEqual(self.map_paths(old, new, manifest, contract), [("old", old[0]["source_path"])])
        self.assertEqual((old, new, manifest, contract), untouched)

    def test_preserves_original_null_instead_of_replacing_it(self):
        old, new, manifest, contract = self.fixture()
        old[0]["source_path"] = None
        self.assertEqual(self.map_paths(old, new, manifest, contract), [("old", None)])

    def test_rejects_path_not_matching_manifest_or_isolated_location(self):
        for change in ("record", "manifest", "both"):
            old, new, manifest, contract = self.fixture()
            if change in ("record", "both"):
                new[0]["source_path"] = "/unexpected/archive.csv"
            if change in ("manifest", "both"):
                manifest[0]["source_path"] = "/unexpected/archive.csv"
            with self.subTest(change=change), self.assertRaisesRegex(ValueError, "validated isolated manifest"):
                self.map_paths(old, new, manifest, contract)

    def test_rejects_changed_manifest_dataset_or_file_hash(self):
        for change in ("dataset_id", "source_file_sha256"):
            old, new, manifest, contract = self.fixture()
            manifest[0][change] = "tampered"
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.map_paths(old, new, manifest, contract)

    def test_rejects_changed_physical_source_identity(self):
        for change in ("source_workbook", "source_file_sha256", "source_row_number"):
            old, new, manifest, contract = self.fixture()
            old[0][change] = "changed"
            with self.subTest(change=change), self.assertRaisesRegex(ValueError, "physical source identity"):
                self.map_paths(old, new, manifest, contract)

    def test_rejects_missing_or_duplicate_source_keys(self):
        for change in ("missing", "old_duplicate", "new_duplicate", "manifest_duplicate"):
            old, new, manifest, contract = self.fixture()
            if change == "missing": new = new[1:]
            if change == "old_duplicate": old.append(dict(old[0]))
            if change == "new_duplicate": new.append(dict(new[0]))
            if change == "manifest_duplicate": manifest.append(dict(manifest[0]))
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.map_paths(old, new, manifest, contract)

    def test_money_quantity_catalog_and_flags_remain_immutable_after_path_restore(self):
        for field, value in (("net_sales", Decimal("99")), ("quantity", Decimal("2")), ("product_category", "medicine"), ("is_external_join_ready", True)):
            old, new, manifest, contract = self.fixture()
            overrides = dict(self.map_paths(old, new, manifest, contract))
            original = {**old[0], "net_sales": Decimal("10"), "quantity": Decimal("1"), "product_category": "unclassified", "is_external_join_ready": False, "dataset_id": "old"}
            current = {**original, **new[0], "source_path": overrides["old"], "dataset_id": "new", field: value}
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "source/financial/catalog"):
                source_api.validate_preserved_rows([original], [current])


if __name__ == "__main__":
    unittest.main()
