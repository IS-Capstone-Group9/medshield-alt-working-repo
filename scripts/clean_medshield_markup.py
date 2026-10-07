"""
Clean up medshieldReference.ts to restore proper section assignments.
Removes accidental duplicate seasonal block inside page-products.
"""
from pathlib import Path
import re

file_path = Path("frontend/lib/medshieldReference.ts")
content = file_path.read_text(encoding="utf-8")

# Find the accidental seasonal block injected into page-products
# Pattern: from page-products info-panel down to duplicate block
bad_injection_pattern = r'(\u003cdiv class=\\"page fade-in\\" id=\\"page-products\\"\u003e\s*\u003cdiv class=\\"info-panel\\"\u003e\s*\u003cdiv class=\\"info-grid\\"\u003e\s*\u003cdiv class=\\"info-item\\"\u003e\s*\u003cdiv class=\\"info-label\\"\u003eFocus\u003c/div\u003e\s*)\u003cdiv style=\\"background: linear-gradient.*?\u003c/div\u003e\u003c/div\u003e\u003c/div\u003e\u003c/div\u003e'

clean_product_panel = '''<div class="page fade-in" id="page-products">
      <div class="info-panel">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Focus</div>
            <div class="info-val">Product SKU ranking</div>
            <div class="info-sub">Revenue concentration and SKU priority</div>
          </div>
          <div class="info-item">
            <div class="info-label">Method</div>
            <div class="info-val">ABC + Pareto</div>
            <div class="info-sub">High-impact items first</div>
          </div>
          <div class="info-item">
            <div class="info-label">Output</div>
            <div class="info-val">Product prioritization</div>
            <div class="info-sub">High-value SKUs and watchlist items</div>
          </div>
        </div>
      </div>'''

# Execute replacement
if "SEASONAL EPIDEMIC" in content:
    # Remove the malformed HTML snippet inside page-products
    modified = re.sub(r'<div class=\\"page fade-in\\" id=\\"page-products\\">.*?<div class=\\"kpi-grid\\">', clean_product_panel.replace('\n', '\\n').replace('"', '\\"') + '\\n\\n      <div class=\\"kpi-grid\\">', content, flags=re.DOTALL)
    file_path.write_text(modified, encoding="utf-8")
    print("Cleaned page-products markup in medshieldReference.ts")
else:
    print("No corrupted markup found in medshieldReference.ts")
