"""
Build an exact, pixel-perfect copy of the MedShield DSS UI inside dss_explainer_dashboard.html
augmented with the Executive 5-Act Data Story Stepper and Narrative Layers.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Read DSS components
ref_file = ROOT / "frontend" / "lib" / "medshieldReference.ts"
ref_text = ref_file.read_text(encoding="utf-8")

plan_file = ROOT / "frontend" / "services" / "api" / "prescriptive-planning-runtime.ts"
plan_text = plan_file.read_text(encoding="utf-8")

ext_file = ROOT / "frontend" / "services" / "api" / "external-regression-runtime.ts"
ext_text = ext_file.read_text(encoding="utf-8")

fc_file = ROOT / "frontend" / "services" / "api" / "forecast-validation-runtime.ts"
fc_text = fc_file.read_text(encoding="utf-8")

sec_file = ROOT / "frontend" / "services" / "api" / "sales-sectors-runtime.ts"
sec_text = sec_file.read_text(encoding="utf-8")

heat_file = ROOT / "frontend" / "services" / "api" / "sales-heatmap-runtime.ts"
heat_text = heat_file.read_text(encoding="utf-8")

odo_file = ROOT / "frontend" / "services" / "api" / "odometer-runtime.ts"
odo_text = odo_file.read_text(encoding="utf-8")

engine_file = ROOT / "frontend" / "services" / "api" / "dashboard-engine.ts"
engine_text = engine_file.read_text(encoding="utf-8")

prod_file = ROOT / "frontend" / "services" / "api" / "product-prioritization-runtime.ts"
prod_text = prod_file.read_text(encoding="utf-8") if prod_file.exists() else ""

diag_file = ROOT / "frontend" / "services" / "api" / "sales-diagnostics-runtime.ts"
diag_text = diag_file.read_text(encoding="utf-8") if diag_file.exists() else ""

print("All runtime files read successfully.")
