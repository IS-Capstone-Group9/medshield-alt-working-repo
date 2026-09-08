"""Local regression coverage for the notebook code actually copied from README."""

import ast
from collections import Counter
import hashlib
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("render_readme", ROOT / "render_readme.py")
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


def pure_notebook_namespace(filename):
    """Load pure definitions only; never execute notebook writes or Spark calls."""
    tree = ast.parse((ROOT / filename).read_text(encoding="utf-8-sig"))
    selected = []
    allowed_modules = {
        "csv", "hashlib", "io", "json", "re", "pathlib", "collections",
        "decimal", "datetime", "calendar", "copy", "math", "typing",
    }
    for node in tree.body:
        if isinstance(node, ast.Import):
            if all(alias.name.split(".")[0] in allowed_modules for alias in node.names):
                selected.append(node)
        elif isinstance(node, ast.ImportFrom):
            if node.module and node.module.split(".")[0] in allowed_modules:
                selected.append(node)
        elif isinstance(node, (ast.FunctionDef, ast.ClassDef)):
            selected.append(node)
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            names = [n.id for n in ast.walk(node) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)]
            if names and all(name.isupper() for name in names):
                # Configuration/constant definitions only, no table reads or I/O.
                if not any(isinstance(n, ast.Attribute) and n.attr in
                           {"table", "sql", "read_text", "read_bytes", "collect", "count"}
                           for n in ast.walk(node)):
                    selected.append(node)
    namespace = {"__name__": "notebook_pure_test"}
    module = ast.fix_missing_locations(ast.Module(body=selected, type_ignores=[]))
    exec(compile(module, filename, "exec"), namespace)
    return namespace


class NotebookContractTests(unittest.TestCase):
    def test_cells_compile_and_do_not_terminate_early_or_use_serverless_cache(self):
        forbidden = {"cache", "persist", "unpersist", "checkpoint", "cacheTable", "exit"}
        for filename, _, _ in renderer.NOTEBOOKS:
            source = (ROOT / filename).read_text(encoding="utf-8")
            cells = renderer.notebook_cells(source)
            self.assertTrue(cells)
            self.assertFalse([count for count in Counter(cells).values() if count > 1])
            for index, cell in enumerate(cells, 1):
                with self.subTest(notebook=filename, cell=index):
                    tree = ast.parse(cell)
                    compile(tree, f"{filename}:{index}", "exec")
                    calls = {node.func.attr for node in ast.walk(tree)
                             if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)}
                    self.assertFalse(calls & forbidden)
                    self.assertFalse(any(isinstance(node, ast.Attribute) and node.attr == "rdd"
                                         for node in ast.walk(tree)))

    def test_copyable_readme_matches_sources(self):
        self.assertEqual((ROOT / "README.md").read_text(encoding="utf-8"), renderer.render())

    def test_configured_table_names_are_isolated_restart_candidates(self):
        import re
        tables = []
        for filename, _, _ in renderer.NOTEBOOKS:
            source = (ROOT / filename).read_text(encoding="utf-8")
            tables.extend(re.findall(r"medshield_(?:bronze|silver|gold|audit)\.([a-z_]+)", source))
        self.assertTrue(tables)
        # The raw_files volume is the only nonsuffixed catalog object permitted.
        self.assertTrue(all(name == "raw_files" or
                            (name.startswith("sales_restart_") and name.endswith("_candidate"))
                            for name in tables))


class BronzeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = pure_notebook_namespace("01_sales_bronze.py")

    def test_line_preservation_and_trailing_empty_line(self):
        self.assertEqual(self.ns["decode_csv_source"](b'\xef\xbb\xbfa,b\r\n1,2\r\n', "f.csv"),
                         ["a,b", "1,2", ""])

    def test_fail_closed_on_unhandled_or_corrupt_source(self):
        for payload in (b'"a\nb",c\n', b'"unterminated', b'\xff', b'\x00', b''):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                self.ns["decode_csv_source"](payload, "f.csv")
        with self.assertRaises(ValueError):
            self.ns["decode_csv_source"](b'a\nb\n', "f.csv", max_lines=2)

    def test_file_or_content_or_position_change_changes_identity(self):
        key = self.ns["source_record_key"]
        self.assertEqual(key("a.csv", "abc", 1), key("a.csv", "abc", 1))
        self.assertEqual(len({key("a.csv", "abc", 1), key("b.csv", "abc", 1),
                              key("a.csv", "def", 1), key("a.csv", "abc", 2)}), 4)

    def test_dataset_id_order_independent_but_content_sensitive(self):
        manifest = [{"source_workbook": name, "source_file_sha256": sha}
                    for name, sha in [("a.csv", "a"), ("b.csv", "b")]]
        digest = self.ns["build_dataset_id"]
        self.assertEqual(digest(manifest), digest(list(reversed(manifest))))
        self.assertNotEqual(digest(manifest), digest(manifest[:1]))


class SalesCorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bronze = pure_notebook_namespace("01_sales_bronze.py")
        cls.silver = pure_notebook_namespace("02_sales_silver.py")
        cls.source_dir = (
            ROOT.parent / "imports" / "revised" /
            "databricks-source-revised-2026-09-04" /
            "medshield_project_csv"
        )
        if not cls.source_dir.is_dir():
            raise unittest.SkipTest("Exported sales CSV directory is not available")
        source_rows = []
        for source_file in sorted(cls.source_dir.glob("medshield_data_*.csv")):
            payload = source_file.read_bytes()
            source_hash = hashlib.sha256(payload).hexdigest()
            source_year = int(source_file.stem.rsplit("_", 1)[-1])
            for row_number, raw_line in enumerate(
                cls.bronze["decode_csv_source"](payload, source_file.name), 1
            ):
                source_rows.append({
                    "dataset_id": "local-test",
                    "source_record_id": cls.bronze["source_record_key"](
                        source_file.name, source_hash, row_number
                    ),
                    "source_workbook": source_file.name,
                    "data_source_year": source_year,
                    "source_row_number": row_number,
                    "source_file_sha256": source_hash,
                    "raw_csv_line": raw_line,
                    "source_path": str(source_file),
                })
        cls.source_rows = source_rows
        cls.assessed = cls.silver["assess_sales_records"](source_rows)

    def test_full_export_is_accounted_for_and_has_one_disposition_per_line(self):
        self.assertEqual(len(self.source_rows), 58634)
        self.assertEqual(len(self.assessed), len(self.source_rows))
        self.assertEqual(
            Counter(row["source_record_id"] for row in self.assessed),
            Counter(row["source_record_id"] for row in self.source_rows),
        )
        self.assertTrue(all(row["disposition"] != "PENDING_RECONCILIATION" for row in self.assessed))
        self.assertGreater(sum(row["is_analysis_candidate"] for row in self.assessed), 0)
        self.assertGreater(
            sum(row["disposition"] == "EXCLUDE_HISTORICAL_SNAPSHOT_DUPLICATE" for row in self.assessed),
            0,
        )

    def test_source_year_and_missing_value_rules_are_visible(self):
        mismatch = [row for row in self.assessed if "SOURCE_YEAR_MISMATCH" in row["quality_rule_codes"]]
        self.assertGreater(len(mismatch), 0)
        self.assertTrue(all(row["data_source_year"] != row["calendar_year"] for row in mismatch))
        self.assertTrue(any("MISSING_NET_SALES" in row["quality_rule_codes"] for row in self.assessed))
        self.assertTrue(any(row["net_value_source"] == "DERIVED_2017_GROSS_LESS_EXPLICIT_DISCOUNT" for row in self.assessed))


class GoldClassificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree = ast.parse((ROOT / "03_sales_gold.py").read_text(encoding="utf-8-sig"))
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)
                     and node.name in {"normalize_label", "classify_product_label"}]
        pattern = next(node for node in tree.body if isinstance(node, ast.Assign)
                       and any(isinstance(target, ast.Name) and target.id == "CONTRACT_PREFIX_PATTERN"
                               for target in node.targets))
        module = ast.fix_missing_locations(ast.Module(body=[ast.Import(names=[ast.alias(name="re")]), pattern, *functions], type_ignores=[]))
        cls.gold = {"__name__": "gold_pure_test"}
        exec(compile(module, "03_sales_gold.py", "exec"), cls.gold)

    def test_contract_classifier_uses_reviewed_prefixes(self):
        classify = self.gold["classify_product_label"]
        self.assertEqual(classify("PAGBILAO # 55,000 LOT 2", set()), "CONTRACT_LABEL_CANDIDATE")
        self.assertEqual(classify("SURGICAL BLADES #20", set()), "HASHTAG_LABEL_REQUIRES_REVIEW")
        self.assertEqual(classify("OFFICE TAPE", {"OFFICE TAPE"}), "NONMEDICAL_REFERENCE_REQUIRES_REVIEW")
        self.assertEqual(classify("AMOXICILLIN 500MG", set()), "PRODUCT_MASTER_PENDING")


if __name__ == "__main__":
    unittest.main()
