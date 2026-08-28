"""
Script to force clean top of medshieldReference.ts so it starts cleanly with export const MEDSHIELD_STYLE
"""
from pathlib import Path

target_file = Path("frontend/lib/medshieldReference.ts")
content = target_file.read_text(encoding="utf-8")

# Find first occurrence of 'export const MEDSHIELD_STYLE'
export_idx = content.find("export const MEDSHIELD_STYLE")
if export_idx != -1:
    clean_content = content[export_idx:]
    target_file.write_text(clean_content, encoding="utf-8")
    print(f"Successfully stripped {export_idx} characters before export const MEDSHIELD_STYLE")
else:
    print("Error: export const MEDSHIELD_STYLE not found")
