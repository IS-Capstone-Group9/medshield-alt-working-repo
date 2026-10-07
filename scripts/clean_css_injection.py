"""
Script to cleanly format medshieldReference.ts without string syntax errors.
"""
from pathlib import Path
import re

target_file = Path("frontend/lib/medshieldReference.ts")
content = target_file.read_text(encoding="utf-8")

# Remove any raw unescaped CSS blocks
content = re.sub(r'\.clickable-season[\s\S]*?\n\n', '', content)

# Define clean CSS rules formatted for string literal inside export const MEDSHIELD_STYLE
css_clean = (
    "\\n.clickable-season { cursor: pointer !important; position: relative; }\\n"
    ".clickable-season:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); border-color: #38BDF8 !important; }\\n"
    ".clickable-season.active-season { border: 2px solid #38BDF8 !important; background: rgba(56, 189, 248, 0.12) !important; }\\n"
    ".drilldown-prompt { margin-top: 10px; font-size: 11px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.05em; }\\n"
)

# Insert before DATA UPLOAD inside MEDSHIELD_STYLE
if "/* ── DATA UPLOAD ── */" in content and ".clickable-season" not in content:
    content = content.replace("/* ── DATA UPLOAD ── */", css_clean + "/* ── DATA UPLOAD ── */")
    target_file.write_text(content, encoding="utf-8")
    print("Cleanly injected CSS rules into MEDSHIELD_STYLE")
else:
    print("medshieldReference.ts already clean or marker missing")
