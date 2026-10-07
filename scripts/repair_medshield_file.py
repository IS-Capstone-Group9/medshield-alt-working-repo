"""
Script to repair medshieldReference.ts and ensure clean JavaScript exports.
"""
from pathlib import Path
import re

target_file = Path("frontend/lib/medshieldReference.ts")
content = target_file.read_text(encoding="utf-8")

# 1. Strip raw unquoted CSS blocks at the beginning or anywhere in the file
content = re.sub(r'^\.clickable-season[\s\S]*?\}\n', '', content, flags=re.MULTILINE)
content = re.sub(r'\n\.clickable-season[\s\S]*?\}\n', '\n', content)

# 2. Add clickable-season CSS cleanly INSIDE MEDSHIELD_STYLE string before /* ── DATA UPLOAD ── */
css_inside = (
    "\\n.clickable-season { cursor: pointer !important; position: relative; }\\n"
    ".clickable-season:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); border-color: #38BDF8 !important; }\\n"
    ".clickable-season.active-season { border: 2px solid #38BDF8 !important; background: rgba(56, 189, 248, 0.12) !important; }\\n"
    ".drilldown-prompt { margin-top: 10px; font-size: 11px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.05em; }\\n"
)

if "/* ── DATA UPLOAD ── */" in content:
    content = content.replace("/* ── DATA UPLOAD ── */", css_inside + "/* ── DATA UPLOAD ── */")

target_file.write_text(content, encoding="utf-8")
print("medshieldReference.ts cleanly repaired!")
