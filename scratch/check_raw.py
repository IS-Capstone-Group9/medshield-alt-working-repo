import openpyxl

for fname in ["Sales Report.xlsx", "Medshield (Keith San Miguel).xlsx"]:
    try:
        wb = openpyxl.load_workbook(fname, read_only=True)
        print(f"File: {fname}")
        print(f"Sheets: {wb.sheetnames}")
    except Exception as e:
        print(f"Error reading {fname}: {e}")
