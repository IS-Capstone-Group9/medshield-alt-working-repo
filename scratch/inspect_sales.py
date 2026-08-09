import pandas as pd

print("--- 2021s.csv columns and head ---")
df_2021s = pd.read_csv("data/medshield/raw/sales/yearly_csv/2021s.csv", nrows=5)
print(df_2021s.columns.tolist())
print(df_2021s.head(2))

excel_file = "Medshield (Keith San Miguel).xlsx"
xl = pd.ExcelFile(excel_file)

for sheet in ['sales2017', 'sales2018', 'sales2019', 'sales2020', 'sales2021']:
    df = pd.read_excel(xl, sheet_name=sheet, nrows=5)
    print(f"\n--- Sheet {sheet} columns ---")
    print(df.columns.tolist())
    print(df.head(2))
