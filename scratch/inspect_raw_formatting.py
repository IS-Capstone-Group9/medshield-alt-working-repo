import csv
import openpyxl

print("=== 2021s.csv First 10 Rows ===")
with open("data/medshield/raw/sales/yearly_csv/2021s.csv", "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    for i, row in enumerate(reader):
        if i >= 10:
            break
        print(f"Row {i}: {row}")

wb = openpyxl.load_workbook("Medshield (Keith San Miguel).xlsx", data_only=True)
for sheet_name in ["sales2017", "sales2018", "sales2019", "sales2020"]:
    sheet = wb[sheet_name]
    print(f"\n=== Sheet {sheet_name} First 10 Rows ===")
    for row_idx, row in enumerate(sheet.iter_rows(values_only=True), start=1):
        if row_idx > 10:
            break
        print(f"Row {row_idx}: {row}")
