"""
Script to add typeof document !== 'undefined' guard to selectSeasonRestock inside medshieldReference.ts to prevent SSR ReferenceError
"""
from pathlib import Path

target_file = Path("frontend/lib/medshieldReference.ts")

# 1. Run build_final_medshield_ts.py baseline
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_final_medshield_ts

content = target_file.read_text(encoding="utf-8")

# Fix typeof document guard inside JS code
old_js = r"setTimeout(function() {\n  selectSeasonRestock('monsoon', document.querySelector('.active-season'));\n}, 500);"
new_js = r"setTimeout(function() {\n  if (typeof document !== 'undefined') {\n    selectSeasonRestock('monsoon', document.querySelector('.active-season'));\n  }\n}, 500);"

if old_js in content:
    content = content.replace(old_js, new_js)
    target_file.write_text(content, encoding="utf-8")
    print("Safely added SSR document guard to medshieldReference.ts!")
else:
    # Perform regex replacement
    import re
    content = re.sub(
        r"setTimeout\(function\(\)\s*\{\s*selectSeasonRestock\('monsoon',\s*document\.querySelector\('\.active-season'\)\);\s*\}\,\s*500\);",
        r"setTimeout(function() { if (typeof document !== 'undefined') { selectSeasonRestock('monsoon', document.querySelector('.active-season')); } }, 500);",
        content
    )
    target_file.write_text(content, encoding="utf-8")
    print("Regex replaced SSR document guard in medshieldReference.ts!")
