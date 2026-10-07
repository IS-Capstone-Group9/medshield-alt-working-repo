import sys
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd
from pathlib import Path

# ── FILE 1: Big DOH request file ──────────────────────────────
f1 = 'datasources/raw/doh/DOH_Request_Daily_Breakdown_Weekly_Summary_2021_2025.xlsx'
print('=== FILE 1: DOH_Request_Daily_Breakdown_Weekly_Summary_2021_2025.xlsx ===')
xl1 = pd.ExcelFile(f1)
print(f'Sheets: {xl1.sheet_names}')
for sheet in ['ILI', 'Dengue', 'Leptospirosis', 'Cholera', 'Typhoid Fever']:
    if sheet in xl1.sheet_names:
        df = xl1.parse(sheet, header=None)
        print(f'\n  Sheet: {sheet} | raw shape: {df.shape}')
        print(df.head(8).to_string())

print('\n\n=== FILE 2: Weekly Reported Cases 2021-2025 ===')
f2 = 'datasources/raw/doh/[#DOH-313647129213] Weekly Reported Cases 2021-2025 (1).xlsx'
xl2 = pd.ExcelFile(f2)
print(f'Sheets: {xl2.sheet_names}')
# Check key disease sheets
key_sheets = [s for s in xl2.sheet_names if any(k in s for k in ['Dengue','Lept','ILI','Cholera','Typhoid','ABD'])]
for sheet in key_sheets[:5]:
    df = xl2.parse(sheet, header=None)
    print(f'\n  Sheet: {sheet} | raw shape: {df.shape}')
    print(df.head(8).to_string())
