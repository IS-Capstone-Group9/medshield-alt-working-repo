import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import openpyxl
import services.data_pipeline as dp
EXCEL_FILE = ROOT / "Medshield (Keith San Miguel).xlsx"
wb = openpyxl.load_workbook(EXCEL_FILE, read_only=True, data_only=True)

for sheet in wb.worksheets:
    if sheet.title.lower().startswith("exp"):
        continue
    for candidate_row in range(1, 10):
        values = [cell.value for cell in next(sheet.iter_rows(min_row=candidate_row, max_row=candidate_row))]
        normalized = dp._normalize_headers(values)
        matched = set(normalized) & set(dp.CANONICAL_FIELDS)
        if len(matched) >= 5:
            print(f"Sheet '{sheet.title}' Row {candidate_row}: Matched {len(matched)} fields -> {matched}")
            print(f"   Raw values: {values}")
            print(f"   Normalized: {normalized}")
