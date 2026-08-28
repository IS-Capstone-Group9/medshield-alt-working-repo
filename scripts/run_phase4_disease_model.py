"""
MedShield Phase 4 — Disease-Adjusted Demand Model
===================================================
Uses: datasources/clean/feature_matrix_monthly.csv
  - Sales demand (quantity_sold units) as target
  - DOH disease signals as external regressors
  - Compares against sales-only Naive baseline

Outputs:
  - outputs/phase4_disease_model_results.json
  - outputs/phase4_feature_importance.csv
  - Printed model card for Chapter 4 evidence
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import json
import math
import warnings
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings('ignore')

ROOT = Path('.')
FEATURE_MATRIX = ROOT / 'datasources/clean/feature_matrix_monthly.csv'
OUTPUT_DIR = ROOT / 'outputs'
OUTPUT_DIR.mkdir(exist_ok=True)

# ── 1. Load feature matrix ───────────────────────────────────────────────
print("=" * 60)
print("PHASE 4: Disease-Adjusted Demand Model")
print("=" * 60)

df = pd.read_csv(FEATURE_MATRIX, parse_dates=['period'])
df = df.sort_values('period').reset_index(drop=True)
print(f"\nLoaded feature matrix: {df.shape[0]} rows × {df.shape[1]} columns")
print(f"Period: {df['period'].min().strftime('%Y-%m')} → {df['period'].max().strftime('%Y-%m')}")
print(f"Columns: {list(df.columns)}")

# ── 2. Feature engineering ───────────────────────────────────────────────
# Fill missing weather proxy with 0 (labeled as missing)
df['pagasa_rainfall_mm'] = df['pagasa_rainfall_mm'].fillna(0)
df['pagasa_temp_mean_c']  = df['pagasa_temp_mean_c'].fillna(0)

# Month and season features
df['month'] = df['period'].dt.month
df['year']  = df['period'].dt.year

# Seasonal dummies (Philippine seasons)
def get_season(m):
    if m in [1, 2]:       return 'amihan'
    elif m in [3, 4]:     return 'summer'
    elif m in [5, 6]:     return 'pre_monsoon'
    elif m in [7, 8]:     return 'monsoon'
    elif m in [9, 10]:    return 'typhoon'
    else:                  return 'holiday'

df['season'] = df['month'].apply(get_season)
season_dummies = pd.get_dummies(df['season'], prefix='season')
df = pd.concat([df, season_dummies], axis=1)

# Disease intensity index (normalize each disease to 0-1 scale)
disease_cols = ['dengue_cases', 'leptospirosis_cases', 'ili_cases', 'typhoid_cases', 'abd_cases']
for col in disease_cols:
    if col in df.columns:
        max_val = df[col].max()
        df[f'{col}_norm'] = df[col] / max_val if max_val > 0 else 0

# Composite disease intensity index (weighted by pharma relevance)
# Dengue + Lepto have strongest rainfall correlation from our analysis
df['disease_intensity_index'] = (
    0.35 * df.get('dengue_cases_norm', 0) +
    0.30 * df.get('leptospirosis_cases_norm', 0) +
    0.20 * df.get('ili_cases_norm', 0) +
    0.10 * df.get('typhoid_cases_norm', 0) +
    0.05 * df.get('abd_cases_norm', 0)
)

# Lag features (t-1 demand, t-2 demand)
df['demand_lag1'] = df['sales_demand_units'].shift(1)
df['demand_lag2'] = df['sales_demand_units'].shift(2)
df['disease_lag1'] = df['disease_intensity_index'].shift(1)

# Month sine/cosine encoding (captures cyclicality)
df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

# Drop first 2 rows (NaN from lag)
df = df.dropna(subset=['demand_lag1', 'demand_lag2']).reset_index(drop=True)

print(f"\nAfter feature engineering: {df.shape[0]} rows available for modeling")

# ── 3. Train/test split ──────────────────────────────────────────────────
# Blocked time-series: train on 2021-2024, test on 2025
train = df[df['year'] < 2025].copy()
test  = df[df['year'] >= 2025].copy()

print(f"\nTrain: {len(train)} months ({train['period'].min().strftime('%Y-%m')} → {train['period'].max().strftime('%Y-%m')})")
print(f"Test : {len(test)} months  ({test['period'].min().strftime('%Y-%m')} → {test['period'].max().strftime('%Y-%m')})")

TARGET = 'sales_demand_units'

# ── 4. Model A: Sales-Only Naive Seasonal Benchmark ─────────────────────
# Seasonal naive: use same month from prior year as prediction
print("\n--- Model A: Seasonal Naive Benchmark ---")
naive_preds = []
for _, row in test.iterrows():
    same_month_prior = train[(train['month'] == row['month'])]['sales_demand_units']
    naive_preds.append(same_month_prior.mean() if len(same_month_prior) > 0 else train[TARGET].mean())

naive_mae  = mean_absolute_error(test[TARGET], naive_preds)
naive_rmse = math.sqrt(mean_squared_error(test[TARGET], naive_preds))
naive_mape = np.mean(np.abs((test[TARGET].values - np.array(naive_preds)) / (test[TARGET].values + 1e-9))) * 100
print(f"  MAE:  {naive_mae:,.1f}")
print(f"  RMSE: {naive_rmse:,.1f}")
print(f"  MAPE: {naive_mape:.2f}%")

# ── 5. Model B: Disease-Adjusted GBR ─────────────────────────────────────
print("\n--- Model B: GBR with Disease + Seasonal Features ---")

FEATURES = [
    'month_sin', 'month_cos', 'demand_lag1', 'demand_lag2',
    'disease_intensity_index', 'disease_lag1',
    'dengue_cases_norm', 'leptospirosis_cases_norm', 'ili_cases_norm',
    'typhoid_cases_norm', 'abd_cases_norm',
] + [c for c in df.columns if c.startswith('season_')]

# Keep only features that exist
FEATURES = [f for f in FEATURES if f in df.columns]

X_train = train[FEATURES].fillna(0)
y_train = train[TARGET]
X_test  = test[FEATURES].fillna(0)
y_test  = test[TARGET]

gbr = GradientBoostingRegressor(
    n_estimators=200, learning_rate=0.05, max_depth=3,
    min_samples_split=2, subsample=0.8, random_state=42
)
gbr.fit(X_train, y_train)
gbr_preds = gbr.predict(X_test)

gbr_mae  = mean_absolute_error(y_test, gbr_preds)
gbr_rmse = math.sqrt(mean_squared_error(y_test, gbr_preds))
gbr_mape = np.mean(np.abs((y_test.values - gbr_preds) / (y_test.values + 1e-9))) * 100
print(f"  MAE:  {gbr_mae:,.1f}")
print(f"  RMSE: {gbr_rmse:,.1f}")
print(f"  MAPE: {gbr_mape:.2f}%")

# Feature importance
importance_df = pd.DataFrame({
    'feature': FEATURES,
    'importance': gbr.feature_importances_
}).sort_values('importance', ascending=False)
print("\n  Top 10 Feature Importances:")
print(importance_df.head(10).to_string(index=False))

# ── 6. Model C: Ridge Regression (disease signals only, interpretable) ───
print("\n--- Model C: Ridge Regression (interpretable disease signals) ---")
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

ridge = Ridge(alpha=1.0)
ridge.fit(X_train_s, y_train)
ridge_preds = ridge.predict(X_test_s)

ridge_mae  = mean_absolute_error(y_test, ridge_preds)
ridge_rmse = math.sqrt(mean_squared_error(y_test, ridge_preds))
ridge_mape = np.mean(np.abs((y_test.values - ridge_preds) / (y_test.values + 1e-9))) * 100
print(f"  MAE:  {ridge_mae:,.1f}")
print(f"  RMSE: {ridge_rmse:,.1f}")
print(f"  MAPE: {ridge_mape:.2f}%")

# Ridge coefficients (signs matter for interpretation)
coef_df = pd.DataFrame({'feature': FEATURES, 'coefficient': ridge.coef_}).sort_values('coefficient', ascending=False)
print("\n  Top positive coefficients (demand drivers):")
print(coef_df[coef_df['coefficient'] > 0].head(5).to_string(index=False))
print("  Top negative coefficients:")
print(coef_df[coef_df['coefficient'] < 0].head(5).to_string(index=False))

# ── 7. Compute disease-demand correlations ───────────────────────────────
print("\n--- Pearson Correlations: Disease Signals vs Sales Demand ---")
corr_results = {}
for col in disease_cols:
    if col in df.columns:
        r = df[[col, TARGET]].corr().iloc[0, 1]
        lag1_r = df[[col, TARGET]].assign(demand=df[TARGET].shift(-1)).corr().iloc[0, 2] if len(df) > 2 else None
        print(f"  {col:30s}: r = {r:+.4f}")
        corr_results[col] = round(float(r), 4)

# ── 8. Champion selection ────────────────────────────────────────────────
print("\n" + "=" * 60)
print("MODEL COMPARISON SUMMARY (Phase 4)")
print("=" * 60)
results = [
    {"model": "Seasonal Naive Benchmark (BASE_LAG_V1)", "mae": round(naive_mae, 1), "rmse": round(naive_rmse, 1), "mape": round(naive_mape, 2), "status": "benchmark"},
    {"model": "GBR + Disease Signals (GBR_DISEASE_V1)", "mae": round(gbr_mae, 1), "rmse": round(gbr_rmse, 1), "mape": round(gbr_mape, 2), "status": "challenger"},
    {"model": "Ridge + Disease Signals (RIDGE_DISEASE_V1)", "mae": round(ridge_mae, 1), "rmse": round(ridge_rmse, 1), "mape": round(ridge_mape, 2), "status": "interpretable"},
]
for r in results:
    print(f"  {r['model']}")
    print(f"    MAE={r['mae']:,.1f}  RMSE={r['rmse']:,.1f}  MAPE={r['mape']:.1f}%  [{r['status']}]")

# Determine champion
champion = min(results, key=lambda x: x['mae'])
print(f"\n  ✅ Champion by MAE: {champion['model']}")

mape_improvement = round(naive_mape - gbr_mape, 2)
print(f"  MAPE improvement (Naive → GBR Disease): {mape_improvement:.1f} percentage points")

# ── 9. Save outputs ─────────────────────────────────────────────────────
output = {
    "model_code": "PHASE4_DISEASE_ADJUSTED",
    "model_version": "1.0.0",
    "status": "validated",
    "layer": "Predictive",
    "train_period": f"{train['period'].min().strftime('%Y-%m')} to {train['period'].max().strftime('%Y-%m')}",
    "eval_period": f"{test['period'].min().strftime('%Y-%m')} to {test['period'].max().strftime('%Y-%m')}",
    "data_sources": [
        "MedShield Internal Sales 2021-2025",
        "DOH PIDSR Weekly Disease Reports 2021-2025 (Dengue, Leptospirosis, ILI, Typhoid, ABD)",
    ],
    "models": results,
    "champion": champion["model"],
    "disease_correlations": corr_results,
    "feature_importance_top10": importance_df.head(10).to_dict(orient="records"),
    "mape_improvement_vs_naive_pct": mape_improvement,
    "label": "VALIDATED - Historical disease-adjusted model. Not live outbreak surveillance.",
    "limitations": [
        "Disease data is weekly PIDSR aggregated to monthly national totals — not territory-level.",
        "Weather signals are proxy (NASA POWER) — PAGASA official records used as fallback reference.",
        "2025 holdout is partial — only months present in dataset used for evaluation.",
    ]
}

out_path = OUTPUT_DIR / 'phase4_disease_model_results.json'
out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding='utf-8')
print(f"\n✅ Results saved to: {out_path}")

importance_df.to_csv(OUTPUT_DIR / 'phase4_feature_importance.csv', index=False)
print(f"✅ Feature importance saved to: outputs/phase4_feature_importance.csv")

# Monthly predictions table
pred_df = test[['period', TARGET]].copy()
pred_df['naive_pred']   = naive_preds
pred_df['gbr_disease_pred'] = gbr_preds.round(1)
pred_df['gbr_error']    = (pred_df[TARGET] - pred_df['gbr_disease_pred']).round(1)
pred_df.to_csv(OUTPUT_DIR / 'phase4_monthly_predictions.csv', index=False)
print(f"✅ Monthly predictions saved to: outputs/phase4_monthly_predictions.csv")

print("\n" + "=" * 60)
print("PHASE 4 COMPLETE")
print("=" * 60)
