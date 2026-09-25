# Model Status and Interpretation

Last reviewed: 2026-09-25

This document distinguishes implemented analytical evidence from candidate methods. Earlier fixed model numbers and 2026 sales projections were removed because they were tied to local/generated populations and were not verified against the current Databricks publication.

## Descriptive layer

| Method | Purpose | Current status |
|---|---|---|
| Year/month aggregation | Revenue, cost, gross margin, quantity, coverage, YoY | Databricks-backed candidate evidence |
| Pareto/ABC | Identify cumulative value concentration | Deterministic candidate; recomputed by scope |
| Seasonality/heatmap | Describe recurring monthly activity and quantity | Databricks-backed descriptive evidence |
| Area/buyer/product ranking | Compare mapped commercial evidence | Implemented with derived mapping limitations |

## Predictive layer

| Method | Purpose | Current status |
|---|---|---|
| Seasonal naive | Same season from prior cycle | Implemented baseline evidence |
| Last observation | Simple persistence comparison | Implemented baseline evidence |
| Prophet or other statistical forecast | Candidate trend/seasonality forecast | Requires frozen dataset, rolling validation, and publication |
| DOH/PAGASA/NASA regressors | Test incremental external-signal value | Blocked until approved joins; must beat sales-only baseline |
| XGBoost | Candidate forward-looking urgency/risk target | Target, mappings, validation, and publication not approved |

No 2026 MedShield sales actuals exist in the current Gold contract. Validation must therefore use rolling windows within approved 2017-2025 history rather than claiming a 2026 holdout.

## Prescriptive layer

| Method | Required evidence | Current status |
|---|---|---|
| Commercial MCDA | Historical sales scale and coverage | Implemented sensitivity candidate |
| Scenario allocation | Demand, stock, reserve, pack, cost, supplier, budget, horizon assumptions | Implemented user-entered scenario |
| EOQ | Annual demand, ordering cost, holding cost | Formula/methodology only without approved inputs |
| ROP/safety stock | Demand variation, lead time, service level, stock position | Formula/methodology only without approved inputs |
| MILP or other optimization | Explicit objective, constraints, validated inputs | Candidate future method |

## Interpretation standard

Every reported result must state the source dataset/version, population, period, method/version, evaluation design, metric, status, and limitation. Do not copy numbers from `outputs/` into the paper or dashboard until the output has been regenerated from the accepted current publication.
