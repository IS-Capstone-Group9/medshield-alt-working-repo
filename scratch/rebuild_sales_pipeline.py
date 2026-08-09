import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import services.data_pipeline as dp
EXCEL_FILE = ROOT / "Medshield (Keith San Miguel).xlsx"

print("--- Step 1: Ingesting Medshield (Keith San Miguel).xlsx into sales_transactions.json.gz ---")
content = EXCEL_FILE.read_bytes()
res = dp.ingest_sales_bytes(content, EXCEL_FILE.name, persist_raw=False)
print("Ingestion result metadata:", json.dumps(res.get("dataset"), indent=2))
print("Ingestion result summary:", json.dumps(res.get("summary", {}).get("years"), indent=2))

print("\n--- Step 2: Running backward_allocate_area_rows.mjs ---")
alloc_res = subprocess.run(["node", "tools/backward_allocate_area_rows.mjs"], cwd=ROOT, capture_output=True, text=True)
print(alloc_res.stdout)
if alloc_res.returncode != 0:
    print("Error in backward allocation:", alloc_res.stderr)

print("\n--- Step 3: Running build_sales_data_layers.py ---")
layer_res = subprocess.run(["python", "tools/build_sales_data_layers.py"], cwd=ROOT, capture_output=True, text=True)
print(layer_res.stdout)
if layer_res.returncode != 0:
    print("Error in build_sales_data_layers:", layer_res.stderr)

print("\n--- Step 4: Running run_descriptive.py ---")
desc_res = subprocess.run(["python", "services/analytics_service/jobs/run_descriptive.py"], cwd=ROOT, capture_output=True, text=True)
print(desc_res.stdout)
if desc_res.returncode != 0:
    print("Error in run_descriptive:", desc_res.stderr)

print("\n--- Step 5: Running build_frontend_json.py ---")
front_res = subprocess.run(["python", "scratch/build_frontend_json.py"], cwd=ROOT, capture_output=True, text=True)
print(front_res.stdout)
if front_res.returncode != 0:
    print("Error in build_frontend_json:", front_res.stderr)
