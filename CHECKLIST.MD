Model Computation Start Checklist
Purpose
This checklist defines how MedShield should start implementing model logic for the North Star analytics flow. It keeps computations traceable, separates descriptive/predictive/prescriptive work, and applies the current data-source rule:

Disease data uses historical data only.
Weather uses the weather API as the main source.
Historical PAGASA data is the fallback/reference source for weather when API coverage is unavailable or needs validation.
Source Rules
Signal	Primary Use	Source Rule	Computation Constraint
Sales	Demand, revenue, margin, seasonality, product/area ranking	MedShield historical sales, 2021-2025	Must be cleaned, mapped, and aggregated before modeling.
Disease	Disease intensity, scenario regressors, historical alert backtesting	Historical DOH disease data only	Do not present disease outputs as live disease alerts.
Weather	Rainfall, wind, temperature, weather-risk regressors	Weather API as main source	Label provider, period, coordinates, and refresh time.
PAGASA weather	Historical fallback, validation, official reference	Historical PAGASA data as fallback/reference	Keep separate from API-derived weather and label clearly.
Inventory/cost	EOQ, ROP, stock gap, allocation	Only if operational inputs exist	Otherwise publish as scenario/demo only.
Phase 0 - Definition of Ready
 Confirm the target decision: inventory optimization and loss reduction.
 Approve the demand unit, recommended as quantity_sold.
 Confirm the revenue field, because current docs note net_cost is treated as revenue.
 Approve canonical SKU mapping from raw product names.
 Separate geographic territories from customer types and business lines.
 Confirm forecast grain: start with aggregate and territory-level monthly series, not SKU-area Prophet.
 Confirm forecast horizon, recommended as rolling 12 months.
 Define model run metadata: model code, version, train period, evaluation period, input version, status, metrics, limitations.
 Require model outputs to be written as draft/validated/published, not trained live from dashboard requests.
Phase 1 - Data Readiness
 Re-run sales profiling and document row counts, rejected rows, missing months, duplicate flags, and mapped/unmapped SKUs.
 Build canonical monthly demand marts by:
 overall month,
 territory month,
 product month for eligible SKUs,
 product-territory month only when density is sufficient.
 Load or prepare DOH historical disease data into fact_disease_signal.
 Normalize disease values into a disease intensity index by disease, month, and territory where possible.
 Load weather API observations into fact_weather_signal with provider and coordinate provenance.
 Load historical PAGASA data separately as fallback/reference rows, never merged silently with API rows.
 Verify all external signals have source system, source period, provider, area mapping, and ETL lineage.
 Stop or downgrade model runs when required series are sparse, unmapped, or missing.
Phase 2 - Descriptive Computations First
 Product, territory, and customer grouping:
 Rule-encode territory, customer type, and business line.
 Exclude non-geographic labels from weather and territory-risk models.
 Seasonality:
 Run STL decomposition or monthly seasonal index on aggregate/territory sales.
 Store seasonal strength and interpretation.
 Revenue contribution:
 Compute 80/20 ranking and ABC/Pareto class by product, territory, and account type.
 Store results in fact_product_summary or fact_product_priority.
 YoY growth:
 Compute year-over-year revenue and quantity trend by approved grain.
 Flag incomplete 2025 months before using 2025 as holdout.
 Territory revenue and net income:
 Rank geographic territories separately from customer/channel labels.
 Institutional concentration:
 Only compute if a reliable customer/account identifier exists.
Phase 3 - Predictive Baselines
 Build naive seasonal benchmark before Prophet.
 Train sales-only baseline forecast first.
 Evaluate with MAE, RMSE, and MAPE.
 Use rolling or blocked time-series validation.
 For 2025 holdout, first resolve missing 2025 months or mark evaluation as partial.
 Persist each run into fact_forecast_run, fact_demand_forecast, and fact_model_evaluation.
 Publish baseline only if it beats or clearly contextualizes the naive benchmark.
Phase 4 - Disease-Adjusted Computations
 Use only historical DOH disease records.
 Compute monthly disease intensity features for Dengue, ILI, Leptospirosis, or approved diseases.
 Fit disease transformations on training periods only.
 Compare disease-adjusted model against the sales-only baseline.
 Publish disease uplift only if the model improves validation metrics or has explainable scenario value.
 Label outputs as historical disease-adjusted or scenario-based, not live outbreak forecasting.
Phase 5 - Weather-Adjusted Computations
 Use weather API data as the main weather feature source.
 Compute rainfall severity, rainy days, temperature, humidity, high-wind watch, and weather adjustment factor.
 Use historical PAGASA data only as fallback/reference when API data is missing or for validation.
 Keep API-derived rainfall severity separate from official PAGASA rainfall products.
 Compare weather-adjusted model against the sales-only baseline.
 Publish weather effect only when validation improves or scenario value is clearly labeled.
 Record provider code, source period, coordinate mapping, and limitations for every weather row.
Phase 6 - Product Priority and Classification
 Start with deterministic ABC/Pareto from historical revenue and quantity.
 Define urgency target before XGBoost, such as future demand spike, forecast error risk, or stock-gap proxy.
 Build features from demand trend, seasonality, ABC class, margin, disease intensity, weather severity, and movement frequency.
 Train XGBoost only on eligible products with enough history.
 Use fallback rules for sparse/intermittent products.
 Store scores, priority rank, confidence, and reason text in fact_product_priority.
Phase 7 - Prescriptive Computations
 EOQ:
 Require ordering cost, holding cost, and annual demand.
 If costs are missing, keep EOQ as a scenario/demo formula only.
 ROP and safety stock:
 Require lead time, service level, demand variation, and current stock.
 If current stock is missing, do not label stock gap as real.
 Disease alert:
 Use historical threshold backtesting, such as cases greater than mean plus two standard deviations.
 Do not present as live disease surveillance unless live disease source is added.
 Weather emergency response:
 Use API weather provider alerts/signals first.
 Use PAGASA historical fallback/reference for backtesting and validation.
 MCDA regional priority:
 Use approved weights for revenue, growth, demand, disease risk, weather risk, and strategic importance.
 Linear allocation:
 Require budget, capacity, supply, stock, and demand constraints.
 Otherwise publish only a constrained scenario.
 Product-region matching:
 Use cosine similarity on normalized historical demand vectors.
 Exclude regions/products with insufficient history.
 Stop-purchasing flag:
 Combine low movement, low ABC class, long inactivity, and inventory age if available.
Phase 8 - Publication and Dashboard Contract
 Model jobs write outputs to DSS tables, not directly to frontend files.
 Dashboard reads only latest published or explicitly demo-labeled outputs.
 Every visible output shows:
 model code,
 model version,
 source period,
 provider/source,
 evaluation metric,
 limitations,
 review status.
 Forecasts, proxies, official data, scenarios, and actuals are visually distinct.
 Recommendations require human review before being treated as actionable.
Recommended Build Order
 1. Data readiness and mapping checks.
 2. Descriptive analytics regeneration.
 3. Sales-only forecast baseline and naive benchmark.
 4. Weather API ingestion and weather feature mart.
 5. Historical PAGASA fallback/reference loader.
 6. Historical DOH disease loader and disease feature mart.
 7. Disease/weather challenger models.
 8. Product priority scoring.
 9. Scenario-only EOQ/ROP and alert rules.
 10. MCDA, allocation, product-region matching, and dead-stock flags.
 11. Model publication workflow and dashboard labels.
 12. QA evidence and Chapter 4/5 documentation.
Immediate Next Tasks
 Create services/analytics_service/jobs/ for repeatable model jobs.
 Add a data-contract validator for sales, disease, weather API, and PAGASA fallback data.
 Add a mart builder that outputs monthly demand and external-signal features.
 Add baseline evaluation code before advanced models.
 Add output writers for fact_forecast_run, fact_demand_forecast, fact_product_priority, and fact_model_evaluation.
 Add documentation updates to align Chapter 1-3 scope with historical disease and API-first weather.