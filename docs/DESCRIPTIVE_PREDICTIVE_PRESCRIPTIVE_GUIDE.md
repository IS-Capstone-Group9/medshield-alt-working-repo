# Descriptive, Predictive, and Prescriptive Analytics Guide

## Purpose

This guide is the working model logic reference for the MedShield capstone. It consolidates the descriptive, predictive, and prescriptive analytics paths into one practical document for documentation, methodology, dashboard logic, and later implementation.

Use this guide before changing model code, schema, dashboard labels, or Chapter 3-5 wording.

## North Star Question

Recommended capstone framing:

> How can MedShield use historical sales data, validated external signals, and scenario-based planning to improve demand visibility and reduce expiry-driven inventory losses for the 2026 planning cycle?

This is more defensible than a broad claim that the system fully optimizes inventory, because the current workspace does not yet contain all inventory, expiry, lead-time, ordering-cost, holding-cost, budget, capacity, and outcome data needed for real optimization.

## Core Scope Rules

| Rule | Required wording or behavior |
|---|---|
| Historical sales is the source of truth for demand. | Use 2021-2025 sales as the demand baseline. |
| Demand means quantity sold. | Use `quantity` or `quantity_sold`. |
| Revenue means sales value. | Use `total_trade_price` unless the group approves another field. |
| `net_income` is not company net income. | Label it workbook gross margin/profit. |
| PAGASA is historical and official only for its provided period. | Do not stretch PAGASA into unavailable years. |
| Weather API data is not PAGASA. | Label it provider-derived weather proxy. |
| DOH is historical/scenario unless current data is loaded. | Do not claim live disease alerts. |
| Prescriptive outputs need operational inputs. | Keep EOQ, ROP, allocation, and dead-stock outputs as scenarios until inventory/procurement data is available. |
| Dashboard outputs must be reviewed. | Publish only validated/reviewed model runs as recommendations. |

## Required Data Gates

Run these gates before model execution.

| Gate | Why it matters | Blocks if unresolved |
|---|---|---|
| Sales reconciliation | Proves model totals match source records. | All analytics layers. |
| 2025 completeness decision | Determines whether 2025 can be used as a full holdout. | Forecast evaluation. |
| Product/SKU alias mapping | Prevents raw product strings and contract rows from becoming false SKUs. | Product ABC, product forecast, XGBoost, EOQ. |
| Area classification | Separates territory, customer type, and business line. | Weather joins, territory forecast, MCDA, allocation. |
| Revenue and margin definitions | Keeps KPIs and model targets consistent. | Dashboard, Chapter 4-5, model metrics. |
| External data provenance | Keeps DOH, PAGASA, NASA/Open-Meteo, and future provider data separate. | External-regressor forecasting and alerts. |
| Inventory/procurement availability | Determines whether prescriptive outputs are real or scenario-only. | EOQ, ROP, safety stock, allocation, stop-purchase. |

## Recommended Execution Order

```text
Business definitions
  -> data profiling and cleaning
  -> product and area mapping
  -> analytical marts
  -> descriptive analytics
  -> baseline predictive forecasting
  -> external-regressor challenger models
  -> demand-priority scoring
  -> scenario prescriptive models
  -> reviewed publication to dashboard
```

Do not train models directly from dashboard requests. Models should run through controlled jobs that write outputs, metrics, assumptions, and limitations before the dashboard reads them.

## Layer 1 - Descriptive Analytics

### Business Purpose

Descriptive analytics answers:

> What happened in MedShield sales, which products and territories mattered most, and what historical patterns should guide planning?

This layer creates the factual baseline for the capstone. Predictive and prescriptive logic should not proceed until descriptive totals reconcile and limitations are clear.

### Key Questions

| Question | Method | Output |
|---|---|---|
| How did demand and revenue move over time? | Monthly and yearly trend aggregation | Monthly/yearly sales trend tables and charts |
| Which products drove most revenue? | Pareto and actual ABC classification | Product priority list |
| Which territories or customer groups drove sales? | Area and area-type grouping | Territory/customer-type summaries |
| Which months usually show higher demand? | Seasonality index or STL where valid | Seasonal demand pattern |
| How did performance change year over year? | YoY comparison by equivalent period | Growth/decline diagnostics |
| How much data is estimated? | Contract-allocation audit | Limitation and traceability table |

### Required Inputs

| Input | Current reference |
|---|---|
| Cleaned sales with contract allocation | `data/medshield/processed/sales_transactions_area_allocated.json.gz` |
| Area classification map | `datasources/templates/area_classification_mapping.csv` |
| Product alias map | `datasources/templates/product_master_mapping.csv` |
| Business definitions | `docs/BUSINESS_DEFINITIONS.md` |

### Recommended Methods

| Method | Logic | Notes |
|---|---|---|
| Monthly trend | Group by month and sum quantity, revenue, gross margin/profit, cost, and discount. | Label incomplete periods. |
| Yearly summary | Group by year and compare totals. | Use equivalent periods for fair comparison. |
| Product Pareto/ABC | Sort canonical SKUs by revenue contribution; A = 0-80%, B = >80-95%, C = >95-100%. | Use actual ABC for established products. |
| Territory/customer summary | Group separately by territory, customer type, and business line. | Do not mix geographic and non-geographic labels. |
| Seasonality index | Monthly average demand divided by overall monthly average demand. | Use STL only when the time series has enough stable observations. |
| YoY growth | Compare each month against the same month in the prior year. | Flag missing or incomplete months. |
| Area clustering | Cluster only after territory features are valid. | Treat as descriptive segmentation, not a recommendation by itself. |

### Descriptive Acceptance Criteria

1. Outputs reconcile to cleaned sales totals.
2. Revenue uses the approved revenue field.
3. Gross margin/profit is not labeled as company net profit.
4. Product analysis uses canonical SKUs or documented estimated allocation rows.
5. Area analysis separates territory, customer type, and business line.
6. Incomplete 2025 periods are labeled.
7. Charts answer a business decision question, not just a visual preference.

### Chapter Wording

Use this framing:

> The descriptive analytics layer summarized historical MedShield sales to establish a baseline before forecasting and scenario planning. It measured demand, revenue, gross margin/profit, product contribution, territory/customer-type contribution, seasonality, and year-over-year movement. Estimated contract-allocation rows were retained with flags so source totals stayed traceable and limitations stayed visible.

## Layer 2 - Predictive Analytics

### Business Purpose

Predictive analytics answers:

> What demand should MedShield expect next, and how reliable is that expectation compared with simple benchmarks?

The forecast is a decision-support input for planning. It is not an automated purchase order.

### Forecasting Principles

1. Always run simple benchmarks before Prophet or XGBoost.
2. Use time-based validation only.
3. Use 2025 as a full holdout only if 2025 completeness is proven.
4. If 2025 is incomplete, use rolling-origin validation inside trusted history and treat 2025 as partial secondary evidence.
5. Train external-regressor models only after external data is mapped, validated, and available at the same planning grain.
6. Promote a model only if it beats the approved benchmark and passes bias/data-quality checks.

### Forecast Model Path

| Step | Model or method | Purpose |
|---|---|---|
| 1 | Last-value benchmark | Minimal baseline. |
| 2 | Seasonal naive benchmark | Same month from prior year. |
| 3 | Prophet (Champion candidate) | Main candidate forecast, robust to missing data. |
| 4 | Classical Models (SARIMA/Holt-Winters) | Challenger models. Act as failsafes but heavily monitored for indexing shift errors during missing data events. |
| 5 | Dynamic Champion-Challenger Routing | System continually evaluates models via MAPE and dynamically routes forecasting to the most accurate model. |
| 6 | Prophet with weather/disease proxies | External-regressor challenger models when DOH/PAGASA data is loaded and validated. |

### Recommended Forecast Grains

| Grain | Recommendation |
|---|---|
| Company-month | Start here. Most defensible. |
| Territory-month | Use only approved geographic territories. |
| Product category-month | Useful when SKU data is sparse. |
| SKU-month | Use only eligible SKUs with enough observations. |
| SKU-territory-month | Usually too sparse unless new data proves otherwise. |

### SKU Forecast Eligibility

Direct SKU forecasting should require:

1. Canonical SKU mapping.
2. At least 24 observed months for experimentation.
3. Preferably at least 36 observed months for publication.
4. Enough non-zero demand periods.
5. No unresolved missing-period issue.

Products that fail eligibility should use category-level allocation, seasonal naive, intermittent-demand logic, or manual review.

### External Signal Rules

| Signal | Allowed use | Not allowed |
|---|---|---|
| DOH historical data | Disease intensity feature and historical scenario analysis. | Live disease alert without current DOH data. |
| PAGASA historical data | Official historical weather feature within provided period. | Filling unavailable years with API weather under the PAGASA name. |
| NASA/Open-Meteo/weather API | Provider-derived historical proxy and validation. | Calling it official PAGASA RSI. |
| Future weather provider data | Short-horizon operational context. | Long-horizon certainty outside forecast reliability. |

### XGBoost Product Priority

Do not train a vague "urgency score." Define the target first.

Recommended targets:

| Target | Use |
|---|---|
| Next-month quantity | Demand prediction and priority scoring. |
| Probability of demand surge | Planning attention flag. |
| Provisional ABC class | Only for low-history or future-period classification. |

For established products, actual ABC/Pareto remains the primary classification. XGBoost can support demand priority or provisional classification where actual history is insufficient.

### Predictive Metrics

| Metric | Meaning |
|---|---|
| MAE | Average absolute error in demand units. |
| RMSE | Penalizes larger forecast misses. |
| MAPE | Percentage error; use carefully when actual demand is near zero. |
| WAPE or sMAPE | Better for sparse or low-volume demand. |
| Bias | Shows systematic over-forecasting or under-forecasting. |

### Predictive Acceptance Criteria

1. A simple benchmark is reported before advanced models.
2. Training and evaluation periods are documented.
3. No future information leaks into training features.
4. External-regressor models are compared against sales-only baseline.
5. The champion model is selected based on metrics and business interpretability.
6. Forecast outputs include model version, data period, limitations, and status.

### Chapter Wording

Use this framing:

> The predictive analytics layer treated sales-only demand forecasting as the mandatory baseline. Simple benchmarks were evaluated before advanced forecasting. External weather and disease signals were treated as challenger features and were used only where source coverage and validation supported them. Product-priority scoring was framed as demand priority unless actual inventory, lead time, and stock-gap data were available.

## Layer 3 - Prescriptive Analytics

### Business Purpose

Prescriptive analytics answers:

> Given the forecast, current constraints, and approved assumptions, what action should planners review?

This layer must be conservative. Without operational inventory and procurement data, outputs are scenarios, not automated procurement recommendations.

### Required Inputs For Real Prescriptive Recommendations

| Input | Needed for |
|---|---|
| Current stock/on-hand inventory | Stock gap, ROP, allocation, dead-stock candidate |
| Reserved and available stock | Actual reorder need |
| Supplier lead time | ROP and safety stock |
| Lead-time variability | Safety stock |
| Ordering cost | EOQ |
| Holding cost | EOQ |
| Pack size and MOQ | Feasible reorder quantity |
| Expiry date and stock age | Expiry-risk and dead-stock logic |
| Procurement budget | Allocation optimization |
| Warehouse/location capacity | Allocation optimization |
| Service-level policy | Safety stock target |
| Recommendation outcomes | Model evaluation and improvement |

If these are missing, label outputs as scenario or formula demonstration.

### Prescriptive Methods

| Method | Purpose | Status without operational data |
|---|---|---|
| EOQ | Estimate reorder quantity from demand, ordering cost, and holding cost. | Scenario only. |
| ROP | Trigger reorder when stock reaches demand during lead time plus safety stock. | Scenario only. |
| Safety stock | Buffer against demand and lead-time variability. | Scenario only. |
| MCDA | Rank territories by revenue, growth, and outbreak risk. | Commercial-priority version can run with revenue/growth only. |
| Linear programming | Allocate constrained stock across products/territories. | Blocked until stock, budget, capacity, and demand constraints exist. |
| Collaborative filtering | Recommend product-region expansion candidates based on similarity. | Exploratory until product/territory history is validated. |
| Rule alerts | Flag stock, disease, weather, or slow-moving scenarios. | Must be source-labeled and review-only. |

### EOQ, ROP, Safety Stock Logic

| Output | Formula concept | Required caveat |
|---|---|---|
| EOQ | Square root of `(2 x annual demand x ordering cost) / holding cost per unit`. | Not valid without approved cost policy. |
| Safety stock | Demand/lead-time variability adjusted by service level. | Not valid without lead-time and service-level policy. |
| ROP | Expected demand during lead time plus safety stock. | Not valid without current stock and lead time. |

### MCDA Logic

Interim MCDA can use:

1. Revenue score.
2. Demand growth score.

Full MCDA can add:

1. Outbreak risk score from validated DOH data.
2. Weather/logistics risk if the source and formula are approved.

All criteria must be normalized, weighted, and explainable. Run weight sensitivity checks before publishing.

### Linear Programming Logic

Only run allocation optimization when these exist:

1. Available stock by SKU.
2. Forecast demand by SKU and territory.
3. Minimum safety-stock rules.
4. Budget or capacity constraints.
5. Pack/MOQ constraints.
6. Priority weights or service rules.

If no feasible solution exists, do not publish a recommendation. Show the conflicting constraints and require planner review.

### Stop-Purchase / Dead-Stock Logic

Do not flag true dead stock from sales history alone.

A defensible slow-moving or stop-purchase candidate requires:

1. Positive on-hand stock.
2. No movement for an approved period.
3. No open demand or strategic exception.
4. Expiry/stock-age evidence.
5. Planner review.

### Prescriptive Acceptance Criteria

1. Every recommendation includes assumptions.
2. Scenario outputs are clearly labeled as scenario.
3. No output is labeled automated procurement.
4. Human review is required before action.
5. Constraints and infeasible cases are visible.
6. Results are traceable to forecast run, data version, and policy version.

### Chapter Wording

Use this framing:

> The prescriptive analytics layer translated forecast and priority signals into planning recommendations or scenarios. Because complete inventory, procurement cost, lead-time, expiry, budget, and capacity data were not yet available, EOQ, ROP, safety stock, allocation, and dead-stock outputs were treated as scenario-based decision support rather than automated procurement decisions.

## Publication Status Labels

Use these labels consistently in documentation and dashboard outputs.

| Label | Meaning |
|---|---|
| Actual | Historical source-derived value. |
| Estimated | Documented allocation or approximation. |
| Draft | Computed but not formally reviewed. |
| Validated | Passed automated checks. |
| Review required | Needs human approval before publication. |
| Published | Approved for dashboard use. |
| Proxy | Provider-derived signal, not official source data. |
| Official | Uploaded official DOH/PAGASA record. |
| Scenario | Formula or assumption-based output. |
| Blocked | Not computable from available data. |

## Model Run Metadata

Every model run should record:

- `run_id`
- `model_code`
- `model_version`
- `input_dataset_version`
- `feature_version`
- `training_period_start`
- `training_period_end`
- `evaluation_period_start`
- `evaluation_period_end`
- `forecast_period_start`
- `forecast_period_end`
- `metrics`
- `limitations`
- `status`
- `created_by`
- `reviewed_by`
- `published_at`

## Worker Responsibilities

| Worker | Responsibility |
|---|---|
| Business Analyst | Finalize North Star, business definitions, scope, and acceptance criteria. |
| Data Analyst | Profile source data, validate completeness, define metric limitations. |
| BI Specialist | Match KPIs and charts to decision questions. |
| Database Engineer | Maintain warehouse grain, schema, views, and model-output tables. |
| Analytics Engineer | Execute descriptive, predictive, and prescriptive jobs. |
| QA Engineer | Validate row counts, metrics, model outputs, and dashboard labels. |
| Technical Writer | Align methodology, implementation evidence, limitations, and Chapter 4-5 wording. |
| Security/DevOps | Protect secrets, configure `.env`, manage provider keys, and validate deployment boundaries. |

## Immediate Checklist For The New `.env` And Schema

When the new `.env` and database schema are introduced, review:

1. Whether `USE_SUPABASE`, Supabase URL, anon key, and service-role key are correctly scoped.
2. Whether service-role keys stay server-side only.
3. Whether the schema separates raw staging, cleaned facts, dimensions, analytical marts, model outputs, and model run metadata.
4. Whether product, territory, customer type, and business line are separated.
5. Whether official DOH/PAGASA records and provider weather proxy records are stored separately.
6. Whether inventory, lead time, expiry, cost policy, budget, and capacity fields exist.
7. Whether recommendation statuses support `draft`, `validated`, `review_required`, `published`, `superseded`, and `measured`.
8. Whether dashboard APIs read only published or clearly labeled demo/draft outputs.

Use `docs/ENV_SCHEMA_ALIGNMENT_GUIDE.md` for the current environment-variable boundary, visible Supabase schema inventory, and table gaps by analytics layer.

## Minimum Definition Of Done

The analytics logic is ready for capstone defense when:

1. Descriptive totals reconcile to source data.
2. Forecasts are evaluated against simple benchmarks.
3. External-regressor models are not promoted unless they improve baseline performance.
4. Prescriptive outputs are labeled according to available operational inputs.
5. Every chart and table answers a clear decision question.
6. Every model output includes data period, method, status, metric, and limitation.
7. Chapter 3 methodology, Chapter 4 implementation, and Chapter 5 findings use the same definitions.
