# Model Computation Start Checklist

Last reviewed: 2026-09-25

Use this checklist only after reading [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) and [docs/ANALYTICS.md](docs/ANALYTICS.md).

## Data readiness

- [ ] Candidate Gold has named business/finance approval or the run is explicitly labeled experimental.
- [ ] Dataset ID, policy version, hash, coverage, accepted/rejected counts, and mapping versions are frozen.
- [ ] Contract allocations reconcile to their parents and remain estimated.
- [ ] Canonical SKU and medical/non-medical scope are approved for the selected model population.
- [ ] Geography/buyer mappings are approved or excluded from training.
- [ ] Missing months, zero activity, sparse series, returns, and anomalous financial rows have explicit rules.

## Descriptive gate

- [ ] Demand, revenue, acquisition cost, and gross-margin definitions match the dashboard.
- [ ] Annual/monthly totals reconcile from Gold through the API.
- [ ] Pareto/ABC, seasonality, YoY, product, territory, and buyer results are reproducible.
- [ ] Every final table records source, status, period, population, and limitations.

## Predictive gate

- [ ] Define one forward-looking target and forecast grain.
- [ ] Build seasonal-naive and last-observation benchmarks.
- [ ] Use rolling-origin/blocked validation within approved 2017-2025 history.
- [ ] Report MAE, RMSE, WAPE or sMAPE, and bias by horizon.
- [ ] Compare Prophet or another candidate against the same baselines.
- [ ] Add DOH/PAGASA/NASA features only after approved territory-month joins and leakage checks.
- [ ] Publish the selected model, version, metrics, limitations, and status to Databricks before the dashboard reads it.

## Prescriptive gate

- [ ] Confirm inventory, lead time, cost, supplier, service-level, pack, budget, and expiry inputs.
- [ ] Keep missing operational inputs as visible user assumptions.
- [ ] Validate feasible and infeasible cases.
- [ ] Label every output as a scenario and require human review.
- [ ] Do not execute or authorize procurement.

## Current status

The live API provides Databricks-backed descriptive evidence, deterministic prioritization, sales-only forecast baselines, and a user-entered scenario solver. External regression is blocked. No final Prophet/XGBoost champion or operational inventory model is approved.
