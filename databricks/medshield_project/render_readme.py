"""Generate the copy/paste runbook from the reviewed notebook cells."""

import argparse
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
NOTEBOOKS = (
    ("01_sales_bronze.py", "Bronze", "bronze"),
    ("02_sales_silver.py", "Silver", "silver"),
    ("03_sales_gold.py", "Gold", "gold"),
)


def notebook_cells(text):
    text = text.removeprefix("\ufeff")
    text = text.replace("# Databricks notebook source\n", "", 1)
    return [cell.strip() for cell in re.split(r"(?m)^# COMMAND ----------\s*$", text)
            if cell.strip()]


def render():
    intro = (ROOT / "GUIDE.md").read_text(encoding="utf-8")
    pieces = [intro.rstrip(), "\n## Copyable notebook code\n",
              "[Bronze](#bronze-code) → [Silver](#silver-code) → [Gold](#gold-code)\n"]
    for filename, label, anchor in NOTEBOOKS:
        cells = notebook_cells((ROOT / filename).read_text(encoding="utf-8"))
        pieces.extend([f'<a id="{anchor}-code"></a>\n',
                       f"## {label}: `{filename}`\n",
                       f"Create **{len(cells)} Python cells** in this notebook. "
                       "Run them in order.\n"])
        for number, cell in enumerate(cells, 1):
            pieces.extend([f"### {label} — cell {number}\n",
                           f"```python\n{cell}\n```\n"])
    return "\n".join(pieces).rstrip() + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    result = render()
    target = ROOT / "README.md"
    if args.check:
        if not target.exists() or target.read_text(encoding="utf-8") != result:
            raise SystemExit("README differs from its notebook sources. Regenerate it.")
        print("README matches every notebook cell.")
    else:
        target.write_text(result, encoding="utf-8", newline="\n")
        print(f"Generated {target}")
