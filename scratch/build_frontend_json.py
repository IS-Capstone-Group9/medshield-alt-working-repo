import csv
import json
from pathlib import Path

# Paths
outputs_root = Path(r"c:\Users\Ethan\medshield-ver-23\outputs")
descriptive_dirs = sorted(list(outputs_root.glob("descriptive_analytics_*")))
if not descriptive_dirs:
    raise FileNotFoundError("No descriptive_analytics_* directories found in outputs/")
OUTPUT_DIR = descriptive_dirs[-1]
print(f"Dynamically selected latest descriptive output directory: {OUTPUT_DIR.name}")
FRONTEND_JSON = Path(r"c:\Users\Ethan\medshield-ver-23\frontend\public\data\sales_data.json")

def load_csv(name):
    path = OUTPUT_DIR / name
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)

def safe_float(v):
    try:
        return float(v or 0)
    except ValueError:
        return 0.0

def safe_int(v):
    try:
        return int(v or 0)
    except ValueError:
        return 0

# Load raw JSON template
data = json.loads(FRONTEND_JSON.read_text(encoding="utf-8"))

# 1. Map Totals & Year Summary
yearly_rows = load_csv("descriptive_yearly_summary.csv")
year_summary = []
total_revenue = 0.0
total_income = 0.0
total_transactions = 0

for row in yearly_rows:
    if not row.get("calendar_year"):
        continue
    rev = safe_float(row["total_trade_price"])
    inc = safe_float(row["net_income"])
    txs = safe_int(row["row_count"])
    year_summary.append({
        "year": row["calendar_year"],
        "revenue": round(rev, 2),
        "income": round(inc, 2),
        "transactions": txs
    })
    total_revenue += rev
    total_income += inc
    total_transactions += txs

data["year_summary"] = year_summary
data["totals"] = {
    "total_revenue": round(total_revenue, 2),
    "total_income": round(total_income, 2),
    "total_transactions": total_transactions,
    "top_product": "MONOWEL 1G IV",
    "top_area": "Quezon",
    "avg_margin": round((total_income / total_revenue) * 100, 1) if total_revenue else 0.0
}

# 2. Map Monthly
monthly_rows = load_csv("descriptive_monthly_trends.csv")
monthly = []
for row in monthly_rows:
    if not row.get("period"):
        continue
    monthly.append({
        "period": row["period"],
        "revenue": round(safe_float(row["total_trade_price"]), 2),
        "income": round(safe_float(row["net_income"]), 2)
    })
data["monthly"] = monthly

# 3. Map By Area
area_rows = load_csv("descriptive_area_summary.csv")
by_area = []
for row in area_rows:
    area_name = row.get("standard_area") or row.get("area")
    if not area_name:
        continue
    by_area.append({
        "area": area_name,
        "revenue": round(safe_float(row["total_trade_price"]), 2),
        "income": round(safe_float(row["net_income"]), 2)
    })
data["by_area"] = by_area

# 4. Map Products (Select a mix of Class A, B, and C from actual cleaned data)
product_rows = load_csv("descriptive_product_abc_pareto.csv")

class_a = [row for row in product_rows if row.get("abc_class") == "A"]
class_b = [row for row in product_rows if row.get("abc_class") == "B"]
class_c = [row for row in product_rows if row.get("abc_class") == "C"]

# Select: 8 Class A, 4 Class B, 3 Class C
selected_rows = class_a[:8] + class_b[:4] + class_c[:3]

# Sort by revenue descending so they display in order in the table
selected_rows.sort(key=lambda r: safe_float(r.get("revenue")), reverse=True)

products = []
for row in selected_rows:
    products.append({
        "product": row["product"],
        "revenue": round(safe_float(row["revenue"]), 2),
        "qty": round(safe_float(row["quantity"]), 4),
        "income": round(safe_float(row["gross_margin_amount"]), 2),
        "abc": row["abc_class"],
        "focus": row["abc_class"],
        "pct_of_total": round(safe_float(row["revenue_share"]) * 100, 2)
    })
data["top_products"] = products

# 5. Map Seasonality
seasonality_rows = load_csv("descriptive_seasonality_overall.csv")
seasonality = []
month_names = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
}
avg_monthly_rev = total_revenue / len(monthly) if monthly else 1.0

for row in seasonality_rows:
    if not row.get("calendar_month"):
        continue
    m_name = month_names.get(row["calendar_month"], row["calendar_month"])
    idx = safe_float(row["seasonal_index"])
    # scale index to average revenue so it plots correctly on revenue charts
    seasonality.append({
        "month": m_name,
        "avg_revenue": round(idx * avg_monthly_rev, 2)
    })
data["seasonality"] = seasonality

# Write back
FRONTEND_JSON.write_text(json.dumps(data, indent=2), encoding="utf-8")
print("Successfully updated frontend/public/data/sales_data.json with a representative mix of A, B, and C clean products!")
