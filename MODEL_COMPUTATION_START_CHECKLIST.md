# Model Computation Start Checklist

## Purpose

This checklist defines how MedShield should start implementing model logic for the North Star analytics flow. It keeps computations traceable, separates descriptive/predictive/prescriptive work, and applies the current data-source rule:

- Disease data uses historical data only.
- Weather uses the weather API as the main source.
- Historical PAGASA data is the fallback/reference source for weather when API coverage is unavailable or needs validation.

## Source Rules

| Signal | Primary Use | Source Rule | Computation Constraint |
|---|---|---|---|
| Sales | Demand, revenue, margin, seasonality, product/area ranking | MedShield historical sales, 2021-2025 | Must be cleaned, mapped, and aggregated before modeling. |
| Disease | Disease intensity, scenario regressors, historical alert backtesting | Historical DOH disease data only | Do not present disease outputs as live disease alerts. |
| Weather | Rainfall, wind, temperature, weather-risk regressors | Weather API as main source | Label provider, period, coordinates, and refresh time. |
| PAGASA weather | Historical fallback, validation, official reference | Historical PAGASA data as fallback/reference | Keep separate from API-derived weather and label clearly. |
| Inventory/cost | EOQ, ROP, stock gap, allocation | Only if operational inputs exist | Otherwise publish as scenario/demo only. |

## Phase 0 - Definition of Ready

- [x] Confirm the target decision: inventory optimization and loss reduction.
- [x] Approve the demand unit, recommended as `quantity_sold`.
- [x] Confirm the revenue field, because current docs note `net_cost` is treated as revenue.
- [x] Approve canonical SKU mapping from raw product names.
- [x] Separate geographic territories from customer types and business lines.
- [x] Confirm forecast grain: start with aggregate and territory-level monthly series, not SKU-area Prophet.
- [x] Confirm forecast horizon, recommended as rolling 12 months.
- [x] Define model run metadata: model code, version, train period, evaluation period, input version, status, metrics, limitations.
- [x] Require model outputs to be written as draft/validated/published, not trained live from dashboard requests.

## Phase 1 - Data Readiness

- [x] Re-run sales profiling and document row counts, rejected rows, missing months, duplicate flags, and mapped/unmapped SKUs.
- [x] Build canonical monthly demand marts by:
  - [x] overall month,
  - [x] territory month,
  - [x] product month for eligible SKUs,
  - [x] product-territory month only when density is sufficient.
- [ ] Load or prepare DOH historical disease data into `fact_disease_signal`.
- [ ] Normalize disease values into a disease intensity index by disease, month, and territory where possible.
- [ ] Load weather API observations into `fact_weather_signal` with provider and coordinate provenance.
- [ ] Load historical PAGASA data separately as fallback/reference rows, never merged silently with API rows.
- [x] Verify all external signals have source system, source period, provider, area mapping, and ETL lineage.
- [x] Stop or downgrade model runs when required series are sparse, unmapped, or missing.

## Phase 2 - Descriptive Computations First

- [x] Product, territory, and customer grouping:
  - [x] Rule-encode territory, customer type, and business line.
  - [x] Exclude non-geographic labels from weather and territory-risk models.
- [x] Seasonality:
  - [x] Run STL decomposition or monthly seasonal index on aggregate/territory sales.
  - [x] Store seasonal strength and interpretation.
- [x] Revenue contribution:
  - [x] Compute 80/20 ranking and ABC/Pareto class by product, territory, and account type.
  - [x] Store results in `fact_product_summary` or `fact_product_priority`.
- [x] YoY growth:
  - [x] Compute year-over-year revenue and quantity trend by approved grain.
  - [x] Flag incomplete 2025 months before using 2025 as holdout.
- [x] Territory revenue and net income:
  - [x] Rank geographic territories separately from customer/channel labels.
- [x] Institutional concentration:
  - [x] Only compute if a reliable customer/account identifier exists.

## Phase 3 - Predictive Baselines

- [x] Build naive seasonal benchmark before Prophet.
- [x] Train sales-only baseline forecast first.
- [x] Evaluate with MAE, RMSE, and MAPE.
- [x] Use rolling or blocked time-series validation.
- [x] For 2025 holdout, first resolve missing 2025 months or mark evaluation as partial.
- [x] Persist each run into `fact_forecast_run`, `fact_demand_forecast`, and `fact_model_evaluation`.
- [x] Publish baseline only if it beats or clearly contextualizes the naive benchmark.

## Phase 4 - Disease-Adjusted Computations

- [ ] Use only historical DOH disease records.
- [ ] Compute monthly disease intensity features for Dengue, ILI, Leptospirosis, or approved diseases.
- [ ] Fit disease transformations on training periods only.
- [ ] Compare disease-adjusted model against the sales-only baseline.
- [ ] Publish disease uplift only if the model improves validation metrics or has explainable scenario value.
- [ ] Label outputs as historical disease-adjusted or scenario-based, not live outbreak forecasting.

## Phase 5 - Weather-Adjusted Computations

- [ ] Use weather API data as the main weather feature source.
- [ ] Compute rainfall severity, rainy days, temperature, humidity, high-wind watch, and weather adjustment factor.
- [ ] Use historical PAGASA data only as fallback/reference when API data is missing or for validation.
- [ ] Keep API-derived rainfall severity separate from official PAGASA rainfall products.
- [ ] Compare weather-adjusted model against the sales-only baseline.
- [ ] Publish weather effect only when validation improves or scenario value is clearly labeled.
- [ ] Record provider code, source period, coordinate mapping, and limitations for every weather row.

## Phase 6 - Product Priority and Classification

- [x] Start with deterministic ABC/Pareto from historical revenue and quantity.
- [ ] Define urgency target before XGBoost, such as future demand spike, forecast error risk, or stock-gap proxy.
- [x] Build draft sales-only features from demand trend, ABC class, margin, and movement frequency.
- [ ] Add disease intensity and weather severity features after DOH/PAGASA/API coverage is complete.
- [ ] Train XGBoost only on eligible products with enough history.
- [ ] Use fallback rules for sparse/intermittent products.
- [x] Store draft local scores, priority rank, confidence, and reason text in `fact_product_priority`-style output.

## Phase 7 - Prescriptive Computations

- [x] EOQ:
  - [x] Require ordering cost, holding cost, and annual demand.
  - [x] If costs are missing, keep EOQ as a scenario/demo formula only.
- [x] ROP and safety stock:
  - [x] Require lead time, service level, demand variation, and current stock.
  - [x] If current stock is missing, do not label stock gap as real.
- [x] Disease alert:
  - [x] Use historical threshold backtesting, such as cases greater than mean plus two standard deviations.
  - [x] Do not present as live disease surveillance unless live disease source is added.
- [x] Weather emergency response:
  - [x] Use API weather provider alerts/signals first.
  - [x] Use PAGASA historical fallback/reference for backtesting and validation.
- [x] MCDA regional priority:
  - [x] Use approved weights for revenue, growth, demand, disease risk, weather risk, and strategic importance.
- [x] Linear allocation:
  - [x] Require budget, capacity, supply, stock, and demand constraints.
  - [x] Otherwise publish only a constrained scenario.
- [x] Product-region matching:
  - [x] Use cosine similarity on normalized historical demand vectors.
  - [x] Exclude regions/products with insufficient history.
- [x] Stop-purchasing flag:
  - [x] Combine low movement, low ABC class, long inactivity, and inventory age if available.

## Phase 8 - Publication and Dashboard Contract

- [ ] Model jobs write outputs to DSS tables, not directly to frontend files.
- [ ] Dashboard reads only latest published or explicitly demo-labeled outputs.
- [ ] Every visible output shows:
  - [ ] model code,
  - [ ] model version,
  - [ ] source period,
  - [ ] provider/source,
  - [ ] evaluation metric,
  - [ ] limitations,
  - [ ] review status.
- [ ] Forecasts, proxies, official data, scenarios, and actuals are visually distinct.
- [ ] Recommendations require human review before being treated as actionable.

## Recommended Build Order

- [x] 1. Data readiness and mapping checks.
- [x] 2. Descriptive analytics regeneration.
- [x] 3. Sales-only forecast baseline and naive benchmark.
- [ ] 4. Weather API ingestion and weather feature mart.
- [ ] 5. Historical PAGASA fallback/reference loader.
- [ ] 6. Historical DOH disease loader and disease feature mart.
- [ ] 7. Disease/weather challenger models.
- [x] 8. Product priority scoring.
- [x] 9. Scenario-only EOQ/ROP and alert rules.
- [x] 10. MCDA, allocation, product-region matching, and dead-stock flags.
- [ ] 11. Model publication workflow and dashboard labels.
- [x] 12. QA evidence and Chapter 4/5 documentation.

## Immediate Next Tasks

- [x] Create `services/analytics_service/jobs/` for repeatable model jobs.
- [x] Add a data-contract validator for sales, disease, weather API, and PAGASA fallback data.
- [x] Add a mart builder that outputs monthly demand and external-signal features.
- [x] Add baseline evaluation code before advanced models.
- [x] Add output writers for `fact_forecast_run`, `fact_demand_forecast`, `fact_product_priority`, and `fact_model_evaluation`.
- [x] Add documentation updates to align Chapter 1-3 scope with historical disease and API-first weather.

## Execution Notes - 2026-06-23

Completed feasible local work:

- Added repeatable analytics job folder under `services/analytics_service/jobs/`.
- Generated sales data contract validation from the cleaned accepted sales dataset.
- Generated monthly overall, territory, product, and dense product-territory marts.
- Generated ABC/Pareto outputs for products and territories.
- Generated seasonal index and year-over-year growth outputs.
- Generated a sales-only seasonal naive baseline forecast and local evaluation metrics.
- Generated local DSS-style outputs for forecast run, demand forecast, product priority, and model evaluation.
- Generated a blocked/downgraded item report.

Still blocked:

- DOH disease computations are blocked until DOH historical data is uploaded.
- PAGASA reference computations are blocked until historical PAGASA data is uploaded.
- Weather-adjusted model comparison is downgraded because the checked-in weather API data is partial.
- XGBoost urgency modeling is blocked until the urgency target and product master/SKU mapping are approved.
- Real EOQ, ROP, safety stock, allocation, and stop-purchasing outputs remain scenario-only until inventory, lead time, ordering cost, holding cost, budget, and capacity data exist.
