# Model Computation Start Report

## Purpose

This report records what was completed from `MODEL_COMPUTATION_START_CHECKLIST.md` and what remains blocked.

## Completed Locally

The workspace now includes a repeatable local analytics job:

```powershell
python services\analytics_service\jobs\run_model_computation_start.py
```

Generated outputs:

- `outputs/model_computation_start_20260623/data_contract_report.json`
- `outputs/model_computation_start_20260623/mart_monthly_overall.csv`
- `outputs/model_computation_start_20260623/mart_monthly_territory.csv`
- `outputs/model_computation_start_20260623/mart_monthly_product.csv`
- `outputs/model_computation_start_20260623/mart_monthly_product_territory_dense.csv`
- `outputs/model_computation_start_20260623/descriptive_product_abc_pareto.csv`
- `outputs/model_computation_start_20260623/descriptive_territory_abc_pareto.csv`
- `outputs/model_computation_start_20260623/descriptive_seasonality_overall.csv`
- `outputs/model_computation_start_20260623/descriptive_seasonality_territory.csv`
- `outputs/model_computation_start_20260623/descriptive_yoy_overall.csv`
- `outputs/model_computation_start_20260623/descriptive_yoy_territory.csv`
- `outputs/model_computation_start_20260623/fact_forecast_run_local.csv`
- `outputs/model_computation_start_20260623/fact_demand_forecast_local.csv`
- `outputs/model_computation_start_20260623/fact_product_priority_local.csv`
- `outputs/model_computation_start_20260623/fact_model_evaluation_local.csv`
- `outputs/model_computation_start_20260623/blocked_or_downgraded_items.csv`

## Feasible Checklist Items Completed

- Re-ran clean sales data contract checks.
- Built monthly overall, territory, product, and dense product-territory marts.
- Rule-encoded area values into territory, customer type, and business line using the current mapping template.
- Generated ABC/Pareto rankings for products and territories.
- Generated seasonal index outputs.
- Generated year-over-year growth outputs.
- Generated a seasonal naive sales-only baseline forecast and evaluation metrics.
- Generated local DSS-style files for forecast run, demand forecast, product priority, and model evaluation.
- Documented blocked or downgraded items.

## Blocked Items

| Area | Status | Reason |
|---|---|---|
| DOH disease features | Blocked | DOH historical dataset has not been uploaded yet. |
| PAGASA reference features | Blocked | PAGASA historical dataset has not been uploaded yet. |
| Weather-adjusted model | Downgraded | Current checked-in weather API data is partial and covers one area/year. |
| XGBoost urgency model | Blocked | Product master and urgency target are not approved. |
| Real EOQ/ROP/allocation | Scenario only | Inventory, lead time, ordering cost, holding cost, budget, and capacity inputs are unavailable. |

## Current Output Status

All generated model-start outputs are `draft` or local evidence outputs. They are suitable for Chapter 4 evidence and workflow validation, but they should not be presented as final published recommendations until reviewed.

## Latest Run Summary

| Output | Count |
|---|---:|
| Clean sales rows used | 20,961 |
| Monthly overall rows | 55 |
| Monthly territory rows | 250 |
| Monthly product rows | 11,656 |
| Dense product-territory rows | 3,049 |
| Product priority rows | 3,335 |
| Forecast rows | 12 |
| Model evaluation rows | 1 |
| Blocked/downgraded items | 4 |

The sales data contract passed for the required sales fields: `date_delivered`, `area`, `product`, `quantity`, and `total_trade_price`.
