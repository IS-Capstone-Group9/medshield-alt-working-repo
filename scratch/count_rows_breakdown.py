import gzip
import json
import csv
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]

# 1. Raw yearly CSVs
raw_csv_counts = {}
yearly_csv_dir = ROOT / "data" / "medshield" / "raw" / "sales" / "yearly_csv"
for year in range(2017, 2026):
    fpath = yearly_csv_dir / f"{year}s.csv"
    if fpath.exists():
        with fpath.open("r", encoding="utf-8") as f:
            # count non-empty data rows (excluding header/meta rows)
            rows = list(csv.reader(f))
            raw_csv_counts[str(year)] = len(rows)

# 2. Processed sales_transactions.json.gz
with gzip.open(ROOT / "data" / "medshield" / "processed" / "sales_transactions.json.gz", "rt", encoding="utf-8") as f:
    st_data = json.load(f)
st_rows = st_data.get("rows", [])
st_by_year = Counter(str(r.get("year")) for r in st_rows if r.get("year"))

# 3. Processed sales_transactions_area_allocated.json.gz
with gzip.open(ROOT / "data" / "medshield" / "processed" / "sales_transactions_area_allocated.json.gz", "rt", encoding="utf-8") as f:
    alloc_data = json.load(f)
alloc_rows = alloc_data.get("rows", [])
alloc_by_year = Counter(str(r.get("date_delivered") or "")[:4] for r in alloc_rows if r.get("date_delivered"))

# 4. Clean descriptive dataset
desc_dir = ROOT / "outputs" / "descriptive_analytics_20260808"
desc_yearly_summary = []
if (desc_dir / "descriptive_yearly_summary.csv").exists():
    with (desc_dir / "descriptive_yearly_summary.csv").open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        desc_yearly_summary = list(reader)

print("=== ROW COUNTS BREAKDOWN (2017-2025) ===")
print("\n--- 1. Raw Yearly CSV Files (data/medshield/raw/sales/yearly_csv/) ---")
total_raw_csv = 0
for yr, cnt in sorted(raw_csv_counts.items()):
    print(f"  {yr}s.csv: {cnt:,} lines")
    total_raw_csv += cnt
print(f"Total Raw CSV Lines: {total_raw_csv:,}")

print("\n--- 2. Area-Allocated Analytical Dataset (sales_transactions_area_allocated.json.gz) ---")
print(f"Total Analytical Rows: {len(alloc_rows):,}")
for yr, cnt in sorted(alloc_by_year.items()):
    print(f"  Year {yr}: {cnt:,} rows")

print("\n--- 3. Clean Accepted Descriptive Analytics Rows (descriptive_analytics_20260808) ---")
total_clean_rows = sum(int(r["row_count"]) for r in desc_yearly_summary if r.get("row_count"))
print(f"Total Clean Accepted Rows: {total_clean_rows:,}")
for r in desc_yearly_summary:
    print(f"  Year {r.get('calendar_year')}: {int(r.get('row_count',0)):,} clean rows (Revenue: PHP {float(r.get('total_trade_price',0)):,.2f})")
