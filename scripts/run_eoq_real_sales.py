"""
MedShield EOQ Rebuild — From Real Sales Data
=============================================
Replaces hardcoded annual demand with actual computed demand
from the MedShield sales feature matrix.
Outputs: outputs/eoq_from_real_sales.json
"""
import sys, json, math
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
import pandas as pd
import numpy as np

ROOT = Path('.')
OUTPUT_DIR = ROOT / 'outputs'
OUTPUT_DIR.mkdir(exist_ok=True)

print("=" * 60)
print("EOQ REBUILD — From Real Sales Data")
print("=" * 60)

# Load feature matrix for aggregate demand
fm = pd.read_csv('datasources/clean/feature_matrix_monthly.csv', parse_dates=['period'])
fm['year'] = fm['period'].dt.year

# Use 2022-2024 full years for annualized demand (exclude 2021 partial, 2025 partial)
base = fm[fm['year'].isin([2022,2023,2024])]
avg_monthly_units = base['sales_demand_units'].mean()
avg_annual_units  = avg_monthly_units * 12
avg_annual_revenue = base['sales_revenue'].mean() * 12

print(f"\nBase period: 2022–2024 (3 full years)")
print(f"Avg monthly demand: {avg_monthly_units:,.1f} units")
print(f"Annualized demand:  {avg_annual_units:,.1f} units")
print(f"Annualized revenue: ₱{avg_annual_revenue:,.2f}")

# Assumed cost parameters (labeled clearly)
S    = 500.0   # PHP ordering cost per order (assumed, industry typical)
h_pct= 0.15    # 15% annual holding cost (assumed, pharma standard)
LT   = 14      # days lead time (assumed, local pharma distributor)
Z    = 1.65    # 95% service level
SL   = 0.25    # 25% demand variability (assumed)

# ── Per-SKU category EOQ from actual sales proportions ────────────
# These proportions come from the DOH disease mapping + ABC analysis
# Seasonal demand shares estimated from seasonal index × category relevance
categories = [
    {"category":"Antipyretics & Analgesics",    "sku":"Paracetamol 500mg Tablet",     "demand_share":0.22, "unit_cost_php":8.50,   "abc":"A", "season_peak":"monsoon/pre_monsoon"},
    {"category":"Respiratory & Bronchodilators", "sku":"Salbutamol 2.5mg Nebule",      "demand_share":0.15, "unit_cost_php":45.00,  "abc":"A", "season_peak":"amihan/holiday"},
    {"category":"Flood Prophylactics",           "sku":"Doxycycline 100mg Capsule",    "demand_share":0.08, "unit_cost_php":12.00,  "abc":"A", "season_peak":"monsoon/typhoon"},
    {"category":"Antibiotics & Anti-Infectives", "sku":"Co-Amoxiclav 625mg Tablet",   "demand_share":0.12, "unit_cost_php":55.00,  "abc":"A", "season_peak":"monsoon/pre_monsoon"},
    {"category":"Gastrointestinal & Rehydration","sku":"Oral Rehydration Salts (ORS)", "demand_share":0.10, "unit_cost_php":5.50,   "abc":"B", "season_peak":"summer/pre_monsoon"},
    {"category":"IV Fluids",                     "sku":"IV Normal Saline 0.9% 1L",    "demand_share":0.09, "unit_cost_php":95.00,  "abc":"A", "season_peak":"monsoon"},
    {"category":"Antidiarrheals & GI Meds",      "sku":"Metronidazole 500mg Tablet",  "demand_share":0.07, "unit_cost_php":14.00,  "abc":"B", "season_peak":"summer"},
    {"category":"Mucolytics & Antitussives",      "sku":"Carbocisteine 500mg Capsule", "demand_share":0.06, "unit_cost_php":11.50,  "abc":"B", "season_peak":"holiday/amihan"},
    {"category":"Antihistamines",                "sku":"Cetirizine 10mg Tablet",      "demand_share":0.05, "unit_cost_php":6.50,   "abc":"B", "season_peak":"amihan"},
    {"category":"Corticosteroids",               "sku":"Fluticasone Inhaler 125mcg",  "demand_share":0.06, "unit_cost_php":380.00, "abc":"B", "season_peak":"amihan/holiday"},
]

print(f"\n{'Category':<35} {'SKU':<35} {'Ann.Demand':>12} {'EOQ':>8} {'ROP':>8} {'SS':>6} {'Unit Cost':>10}")
print("-"*130)

results = []
for cat in categories:
    D    = round(avg_annual_units * cat['demand_share'])
    H    = cat['unit_cost_php'] * h_pct
    eoq  = round(math.sqrt((2 * D * S) / H)) if H > 0 else 0
    daily_d = D / 365
    ss   = round(Z * (daily_d * SL) * math.sqrt(LT))
    rop  = round(daily_d * LT + ss)
    orders_yr = round(D / eoq, 1) if eoq > 0 else None
    annual_hold_cost = round(eoq/2 * H, 2)
    annual_order_cost= round((D/eoq)*S, 2) if eoq > 0 else 0
    total_annual_cost= annual_hold_cost + annual_order_cost

    print(f"{cat['category']:<35} {cat['sku']:<35} {D:>12,} {eoq:>8,} {rop:>8,} {ss:>6,} ₱{cat['unit_cost_php']:>8.2f}")

    results.append({
        **cat,
        "annual_demand_units": D,
        "demand_source": "MedShield Sales 2022-2024 annualized × category share",
        "eoq_units": eoq,
        "safety_stock_units": ss,
        "reorder_point_units": rop,
        "orders_per_year": orders_yr,
        "annual_holding_cost_php": annual_hold_cost,
        "annual_ordering_cost_php": annual_order_cost,
        "total_annual_inventory_cost_php": total_annual_cost,
    })

total_tc = sum(r['total_annual_inventory_cost_php'] for r in results)
print(f"\n{'Total estimated annual inventory cost:':>85} ₱{total_tc:>12,.2f}")

# ── Seasonal demand multipliers from actual seasonality index ──────
seasonal_multipliers = {
    "amihan":      0.72,  # avg of Jan(0.64) + Feb(0.81)
    "summer":      0.42,  # avg of Mar(0.49) + Apr(0.35)
    "pre_monsoon": 1.84,  # avg of May(0.88) + Jun(2.80) — PEAK
    "monsoon":     0.54,  # avg of Jul(0.44) + Aug(0.65)
    "typhoon":     1.18,  # avg of Sep(1.82) + Oct(0.54)
    "holiday":     1.04,  # avg of Nov(1.49) + Dec(0.59)
}
print("\nSeasonal EOQ Adjustment Multipliers (from computed Seasonality Index):")
for s, m in seasonal_multipliers.items():
    adj_label = "▲ INCREASE ORDER" if m > 1.0 else ("▼ REDUCE ORDER" if m < 0.7 else "→ NORMAL")
    print(f"  {s:<15}: {m:.2f}x — {adj_label}")

output = {
    "model_code": "EOQ_REAL_SALES_V1",
    "model_version": "1.0.0",
    "status": "scenario",
    "label": "SCENARIO — Demand from real sales data (2022-2024). Cost parameters are industry-assumed. Not a live procurement instruction.",
    "data_source": "MedShield Internal Sales 2022-2024 (annualized)",
    "base_annual_demand_units": round(avg_annual_units),
    "base_annual_revenue_php": round(avg_annual_revenue, 2),
    "assumptions": {
        "ordering_cost_php": S,
        "holding_cost_pct": h_pct,
        "lead_time_days": LT,
        "service_level_pct": 95,
        "demand_variability_pct": int(SL*100),
        "note": "Cost parameters are assumed industry standards. Replace with actual MedShield procurement cost data when available."
    },
    "formula": "EOQ=sqrt(2*D*S/H) | ROP=(D/365*LT)+SS | SS=Z*sigma_d*sqrt(LT)",
    "total_estimated_annual_inventory_cost_php": round(total_tc, 2),
    "seasonal_demand_multipliers": seasonal_multipliers,
    "scenarios": results,
}
Path('outputs/eoq_from_real_sales.json').write_text(json.dumps(output,indent=2,ensure_ascii=False),encoding='utf-8')
print("\n✅ Saved: outputs/eoq_from_real_sales.json")
print("\nEOQ REBUILD COMPLETE")
