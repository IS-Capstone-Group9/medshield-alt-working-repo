"""
Script to fix CSS string placement inside MEDSHIELD_STYLE in medshieldReference.ts
"""
from pathlib import Path
import re

target_file = Path("frontend/lib/medshieldReference.ts")
content = target_file.read_text(encoding="utf-8")

# Remove any raw CSS accidentally placed outside export const
cleaned = re.sub(r'\.clickable-season\s*\{[^}]*\}', '', content)

# Insert CSS rules cleanly into MEDSHIELD_STYLE string before /* ── DATA UPLOAD ── */
css_rules = r"""
.clickable-season {
  cursor: pointer !important;
  position: relative;
}
.clickable-season:hover {
  transform: translateY(-3px) scale(1.01) !important;
  box-shadow: 0 8px 20px rgba(0,0,0,0.2) !important;
  border-color: #38BDF8 !important;
}
.clickable-season.active-season {
  border: 2px solid #38BDF8 !important;
  background: rgba(56, 189, 248, 0.12) !important;
}
.drilldown-prompt {
  margin-top: 10px;
  font-size: 11px;
  font-weight: 700;
  color: #38BDF8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
"""

if "/* ── DATA UPLOAD ── */" in cleaned:
    final_content = cleaned.replace("/* ── DATA UPLOAD ── */", css_rules.replace("\n", "\\n").replace('"', '\\"') + "\\n/* ── DATA UPLOAD ── */")
    target_file.write_text(final_content, encoding="utf-8")
    print("Cleanly fixed MEDSHIELD_STYLE CSS string in medshieldReference.ts")
else:
    print("Warning: Could not locate /* ── DATA UPLOAD ── */ marker")
