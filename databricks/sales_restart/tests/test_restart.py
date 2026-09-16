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
        cls.source_dir = ROOT.parents[1] / "data" / "medshield" / "dataset_csv"
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
        self.assertEqual(len(list(self.source_dir.glob("medshield_data_*.csv"))), 9)
        self.assertGreater(len(self.source_rows), 0)
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


class PlaceholderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = pure_notebook_namespace("02_sales_silver.py")

    def assess(self, area="Quezon", date="2022-06-15", product="MEDICINE A"):
        row = self.ns["blank_assessment"]({"data_source_year": 2022})
        fields = [area, "DR-1", date, product, "2", "10", "20", "0", "20", "5", "10", "10", "50%"]
        return self.ns["assess_transaction"](row, fields, "modern_13")

    def test_missing_area_preserves_raw_and_enters_reconciliation(self):
        row = self.assess(area="")
        self.assertEqual(row["area_raw"], "")
        self.assertEqual(row["area"], "UNKNOWN_AREA")
        self.assertTrue(row["is_area_placeholder"])
        self.assertEqual(row["disposition"], "PENDING_RECONCILIATION")

    def test_missing_date_uses_year_without_inventing_day(self):
        row = self.assess(date="")
        self.assertEqual(row["reporting_year"], 2022)
        self.assertEqual(row["reporting_year_basis"], "PROVISIONAL_SOURCE_FILE_YEAR")
        self.assertIsNone(row["date_delivered"])
        self.assertIsNone(row["calendar_year"])
        self.assertTrue(row["is_provisional_year_candidate"])
        self.assertFalse(row["is_analysis_candidate"])

    def test_bad_date_or_missing_product_is_not_repaired(self):
        row = self.assess(date="not-a-date")
        self.assertIsNone(row["reporting_year"])
        self.assertFalse(row["is_provisional_year_candidate"])
        self.assertFalse(self.assess(date="", product="")["is_provisional_year_candidate"])

    def test_real_date_is_not_reassigned_to_csv_year(self):
        row = self.assess(date="2021-06-15")
        self.assertEqual(row["reporting_year"], 2021)
        self.assertEqual(row["reporting_year_basis"], "OBSERVED_DELIVERY_DATE")

    def test_formatted_excel_serial_preserves_real_date(self):
        from datetime import date
        parse = self.ns["parse_delivery_date"]
        for raw in ["45913", "45913.00", "45,913.00"]:
            self.assertEqual(parse(raw, "modern_13"), date(2025, 9, 13))
        for raw in ["45,913.50", "4,5913.00", "1'17"]:
            self.assertIsNone(parse(raw, "modern_13"))


class GoldClassificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree = ast.parse((ROOT / "03_sales_gold.py").read_text(encoding="utf-8-sig"))
        functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)
                     and node.name in {"normalize_label", "classify_product_label", "reviewed_mapping", "product_scope", "area_scope", "area_metadata", "read_mapping"}]
        pattern = next(node for node in tree.body if isinstance(node, ast.Assign)
                       and any(isinstance(target, ast.Name) and target.id == "CONTRACT_PREFIX_PATTERN"
                               for target in node.targets))
        imports = ast.parse("import re, csv, io, hashlib\nfrom pathlib import Path").body
        module = ast.fix_missing_locations(ast.Module(body=[*imports, pattern, *functions], type_ignores=[]))
        cls.gold = {"__name__": "gold_pure_test"}
        exec(compile(module, "03_sales_gold.py", "exec"), cls.gold)

    def test_contract_classifier_uses_reviewed_prefixes(self):
        classify = self.gold["classify_product_label"]
        self.assertEqual(classify("PAGBILAO # 55,000 LOT 2", set()), "CONTRACT_LABEL_CANDIDATE")
        self.assertEqual(classify("SURGICAL BLADES #20", set()), "HASHTAG_LABEL_REQUIRES_REVIEW")
        self.assertEqual(classify("OFFICE TAPE", {"OFFICE TAPE"}), "NONMEDICAL_REFERENCE_REQUIRES_REVIEW")
        self.assertEqual(classify("AMOXICILLIN 500MG", set()), "PRODUCT_MASTER_PENDING")

    def master(self, label="MEDICINE A", category="medicine", **overrides):
        row = dict(raw_product=label, canonical_sku=label, product_category=category,
                   unit_of_measure="TABLET", forecast_eligible="true", mapping_status="approved")
        row.update(overrides)
        return self.gold["reviewed_mapping"]([row], "raw_product", "product")

    def test_medical_approval_and_supply_scope_are_explicit(self):
        scope = self.gold["product_scope"]
        self.assertFalse(scope("UNREVIEWED", set(), {})[-1])
        self.assertFalse(scope("MEDICINE A", set(), self.master(mapping_status="proposed"))[-1])
        self.assertTrue(scope("MEDICINE A", set(), self.master())[-1])
        supply = self.master("SURGICAL BLADES #20", "medical_supply", unit_of_measure="BLADE")
        self.assertFalse(scope("SURGICAL BLADES #20", set(), supply)[-1])
        self.assertTrue(scope("SURGICAL BLADES #20", set(), supply, True)[-1])

    def test_contract_parent_cannot_be_approved_as_sku(self):
        label = "PAGBILAO # 55,000 LOT 2"
        self.assertEqual(self.gold["product_scope"](label, set(), self.master(label)),
                         ("CONTRACT_LABEL_CANDIDATE", None, None, None, False))

    def test_reviewed_product_overrides_keyword_candidate_only(self):
        scope = self.gold["product_scope"]
        self.assertTrue(scope("MEDICINE A", {"MEDICINE A"}, self.master())[-1])
        master = self.master("OFFICE TAPE", "non_medical", forecast_eligible="false")
        self.assertEqual(scope("OFFICE TAPE", set(), master)[0], "NON_MEDICAL_APPROVED")
        self.assertFalse(scope("OFFICE TAPE", set(), master)[-1])

    def test_invalid_approvals_fail_closed(self):
        for kwargs in [dict(unit_of_measure=""), dict(canonical_sku=""),
                       dict(forecast_eligible="yes"), dict(category="non_medical")]:
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                self.master(**kwargs)
        row = next(iter(self.master().values()))
        for other in [dict(row), dict(row, raw_product="ALIAS", unit_of_measure="BOX")]:
            with self.assertRaises(ValueError):
                self.gold["reviewed_mapping"]([row, other], "raw_product", "product")

    def test_only_reviewed_territories_enable_external_candidates(self):
        row = dict(raw_area="Quezon", area_type="territory", territory="Quezon",
                   weather_eligible="true", forecast_eligible="true", mapping_status="approved",
                   territory_id="PH-PROVINCE-QUEZON", region="CALABARZON", province="Quezon",
                   city_municipality="", geographic_level="province", evidence_source="Test evidence",
                   evidence_status="TEST_APPROVAL")
        master = self.gold["reviewed_mapping"]([row], "raw_area", "area")
        self.assertEqual(self.gold["area_scope"](" QUEZON ", master), ("territory", "QUEZON", True, True))
        self.assertFalse(self.gold["area_scope"]("PAGBILAO", master)[-1])
        self.assertFalse(self.gold["area_scope"]("UNKNOWN_AREA", {"UNKNOWN_AREA": row})[-1])
        channel = dict(row, raw_area="Government", area_type="customer_type", territory="",
                       territory_id="", region="", province="", city_municipality="",
                       weather_eligible="false", forecast_eligible="false")
        master = self.gold["reviewed_mapping"]([channel], "raw_area", "area")
        self.assertEqual(self.gold["area_scope"]("Government", master), ("customer_type", None, False, False))
        with self.assertRaises(ValueError):
            self.gold["reviewed_mapping"]([dict(channel, weather_eligible="true")], "raw_area", "area")
        with self.assertRaises(ValueError):
            self.gold["reviewed_mapping"]([dict(row, territory_id="")], "raw_area", "area")
        with self.assertRaises(ValueError):
            self.gold["reviewed_mapping"]([row, dict(row, raw_area="ALIAS", province="Batangas")], "raw_area", "area")

    def test_shipped_master_template_and_current_area_mapping_load(self):
        read = self.gold["read_mapping"]
        rows, checksum = read(ROOT / "references/product_master_review.csv", {
            "raw_product", "canonical_sku", "product_category", "unit_of_measure", "forecast_eligible", "mapping_status"})
        self.assertEqual(rows, [])
        self.assertEqual(len(checksum), 64)
        rows, checksum = read(ROOT.parents[1] / "datasources/templates/area_classification_mapping.csv", {
            "raw_area", "area_type", "territory", "weather_eligible", "forecast_eligible", "mapping_status"})
        master = self.gold["reviewed_mapping"](rows, "raw_area", "area")
        self.assertTrue(self.gold["area_scope"]("Quezon", master)[-1])
        self.assertFalse(self.gold["area_scope"]("Lower Cavite", master)[-1])
        self.assertFalse(self.gold["area_scope"]("Government", master)[-1])
        self.assertIn("CAM NORTE", master)
        self.assertFalse(self.gold["area_scope"]("CAM NORTE", master)[2])
        self.assertIsNone(self.gold["area_metadata"]("CAM NORTE", master)[3])
        self.assertEqual(self.gold["area_metadata"]("Government", master)[1], "customer_type")
        self.assertEqual(self.gold["area_metadata"]("UNLISTED AREA", master)[2], "unmapped")

    def test_missing_and_malformed_mapping_files(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "master.csv"
            self.assertEqual(self.gold["read_mapping"](path, {"raw_product"}), ([], "NOT_SUPPLIED"))
            for content in ["wrong_column\nvalue\n", "raw_product,other\nmedicine\n",
                            "raw_product\nmedicine,unexpected\n"]:
                path.write_text(content, encoding="utf-8")
                with self.assertRaises(ValueError):
                    self.gold["read_mapping"](path, {"raw_product"})


if __name__ == "__main__":
    unittest.main()
