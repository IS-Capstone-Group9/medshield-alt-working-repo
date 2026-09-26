import ast
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def helpers(name):
    tree = ast.parse((ROOT / name).read_text(encoding="utf-8"))
    nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "source_provenance"
             or isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "REVIEWED_HISTORICAL_SOURCES" for t in n.targets)]
    context = {}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), name, "exec"), context)
    return context

class ProvenanceTests(unittest.TestCase):
    def test_original_adjusted_and_unknown_sources_in_both_notebooks(self):
        for name in ("01_sales_bronze.py", "03_sales_gold.py"):
            h = helpers(name)
            for filename, rule in h["REVIEWED_HISTORICAL_SOURCES"].items():
                self.assertEqual(h["source_provenance"](filename, rule["original"]), ("ORIGINAL_SOURCE_EXPORT", None))
                self.assertEqual(h["source_provenance"](filename, rule["adjusted"]), ("ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE", rule["policy"]))
                with self.assertRaises(ValueError): h["source_provenance"](filename, "unreviewed")
    def test_notebooks_share_reviewed_registry(self):
        self.assertEqual(helpers("01_sales_bronze.py")["REVIEWED_HISTORICAL_SOURCES"], helpers("03_sales_gold.py")["REVIEWED_HISTORICAL_SOURCES"])
    def test_stl_adapter_uses_tested_algorithm(self):
        offline = ROOT.parents[1] / "services/analytics_service/jobs/run_descriptive_stl.py"
        def functions(path):
            return {n.name: ast.dump(n) for n in ast.parse(path.read_text(encoding="utf-8")).body if isinstance(n, ast.FunctionDef) and n.name in {"month_index", "decompose"}}
        self.assertEqual(functions(offline), functions(ROOT / "06_sales_stl.py"))

    def test_2025_rejects_unreviewed_replacement(self):
        with self.assertRaises(ValueError): helpers("01_sales_bronze.py")["source_provenance"]("medshield_data_2025.csv", "unreviewed")

if __name__ == "__main__": unittest.main()
