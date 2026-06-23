# Analytics

MedShield is a decision-support system, so analytics outputs must lead to decisions about demand, product priority, territory focus, stock planning, and alerts.

## Model Coverage

| Analytics Layer | Model / Method | DSS Output |
|---|---|---|
| Descriptive | ABC/Pareto | Product contribution and priority class. |
| Descriptive | K-Means area clustering | Area segments and planning implications. |
| Descriptive | STL/seasonality | Month-level seasonal demand pattern. |
| Predictive | Prophet baseline | 2026 demand forecast from historical sales. |
| Predictive | Prophet with external regressors | Forecast adjusted by disease and weather signals. |
| Predictive | XGBoost urgency scoring | Product demand urgency and risk level. |
| Prescriptive | EOQ, reorder point, safety stock | Reorder recommendations and stock gap risk. |
| Prescriptive | MCDA | Regional priority ranking. |
| Prescriptive | Linear programming | Stock allocation recommendation. |
| Prescriptive | Collaborative filtering | Product-region match recommendations. |
| Prescriptive | Rule-based thresholds | Procurement, disease, weather, and forecast alerts. |

## Data Sources

| Source | Use | Notes |
|---|---|---|
| `Sales Report.xlsx` | Historical 2021-2025 sales, product, area, margin, and quantity signals. | Internal source of truth for sales demand. |
| DOH FOI/Open Data exports | Disease intensity indicator and outbreak alert context. | Use official DOH data exports when a stable API is unavailable. |
| DOST-PAGASA products | Official rainfall probability/RSI and typhoon context. | Keep official fields distinct from derived proxies. |
| NASA POWER Daily | Historical 2021-2025 meteorological features. | Backfill precipitation, temperature, humidity, and wind. |
| Open-Meteo Historical | Secondary historical validation/fallback. | Match the same territory and month and record provider provenance. |

## Evaluation Metrics

| Output | Metrics |
|---|---|
| Prophet forecast | MAE, RMSE, MAPE |
| Prophet with external regressors | MAE, RMSE, MAPE |
| XGBoost urgency | MAE, RMSE, MAPE or ranking accuracy, depending on label availability |
| K-Means | Silhouette score, Davies-Bouldin index |
| Alerts | Precision, recall, alert accuracy |
| EOQ/ROP/safety stock | Cost deviation, fulfillment rate |
| MCDA / allocation | Ranking consistency, optimization gap |

Model output rows should be stored in the warehouse before they are shown in the dashboard. The frontend should present the recommendation and the reason, not just the score.

## Dataset Requirements

Charts can render from the bundled fallback file at `frontend/public/data/sales_data.json`, but production analytics should come from Supabase warehouse tables and API endpoints.

| Dataset | Required For | Minimum Fields |
|---|---|---|
| Monthly sales | Trend charts, Prophet, seasonality | period, revenue, income, transaction count where available |
| Product sales | ABC/Pareto, urgency, EOQ/ROP | product, quantity, revenue, income, margin, period |
| Area sales | territory ranking, clustering, allocation | area, period, revenue, income, quantity |
| Inventory position | EOQ/ROP/safety stock, stock gap alerts | product, current stock, lead time, ordering cost, holding cost |
| Disease signal | external-regressor forecast, health alerts | period, disease, area where available, intensity index, alert level |
| Weather signal | external-regressor forecast, contingency alerts | period, geographic area, rainfall, temperature, humidity, wind, severity proxy, provider |
| Decision outcomes | model validation | recommendation id, accepted action, actual demand, stockout, fulfillment result |

If a chart says it is unavailable, first confirm that Chart.js is installed and loaded, then confirm that `frontend/public/data/sales_data.json` or the API response contains the dataset used by that chart. Missing model-output datasets should show empty decision tables, but they should not prevent core sales charts from rendering.

View Sales Data computations should use the server summary endpoint rather than the current page of transactions. Required filtered KPIs are total quantity, net cost, net income, discount, average unit cost, average margin, row counts, unique DR numbers, and SKU count.

Because operating expense data is not available, analytics must label `net_income` as workbook gross margin/profit unless the group later provides expense data and approves a full profitability definition. EOQ, ROP, safety stock, allocation, and dead-stock outputs remain scenario or formula outputs until inventory, lead-time, and cost-policy inputs are provided.

Use these preparation documents before model training:

- `docs/BUSINESS_DEFINITIONS.md`
- `docs/2025_DATA_ISSUE_REMEDIATION.md`
- `docs/SKU_ALIAS_MAPPING_PLAN.md`
- `docs/MODEL_LIBRARIES_AND_ORCHESTRATION.md`
- `docs/AREA_SUMMARY_BACKWARD_ALLOCATION.md`

For product-level analysis, use `data/medshield/processed/sales_transactions_area_allocated.json.gz` when contract-name rows such as `PAGBILAO # ...` or `QMC # ...` would otherwise be treated as product names. The adjusted dataset preserves source totals but marks estimated child rows with `allocation_status = estimated_backward_allocation`.

## Analytics Workflow

1. Data Analyst profiles `Sales Report.xlsx` for missing dates, duplicate lines, inconsistent product names, area naming, quantity outliers, and margin anomalies.
2. Database Engineer loads cleaned rows into staging, then warehouse dimensions and fact tables.
3. BI Specialist confirms KPI definitions, chart grain, sorting, and thresholds against the business decision each view supports.
4. Analytics Engineer runs descriptive models first: ABC/Pareto, seasonality, and area clustering.
5. Analytics Engineer runs predictive models next: Prophet baseline, Prophet with disease/weather regressors, then XGBoost urgency once labeled outcomes exist.
6. Analytics Engineer runs prescriptive models after forecasts are available: EOQ/ROP/safety stock, MCDA, allocation optimization, product-region matching, and alert thresholds.
7. QA Engineer validates row counts, metric ranges, model evaluation metrics, and dashboard outputs against expected decision rules.
8. Frontend Engineer exposes the resulting recommendations with reason text, risk level, and action guidance.
9. Technical Writer records data source date ranges, model assumptions, API limitations, and demo-versus-production status.

## Weather Effect Interpretation

The current implementation keeps daily API observations for validation because transaction sales are delivered at daily grain. It also reports a bounded 0-20% planning scenario from an observed monthly weather severity proxy matched to sales for the same geographic area and month.

This is exploratory association, not a trained causal effect. It must not be presented as official PAGASA RSI, an official typhoon warning, or proof that weather caused demand.

The Weather API Validation dashboard view is the operational check for this scope. It should confirm the provider, source period, territory coverage, daily rows loaded, sales-matched daily rows, monthly matched periods, severity proxy range, and rainfall-sales association before any weather-adjusted planning output is used.

## Dashboard Chart Assignment

| Dashboard Area | Chart / Table | Model or Method | Decision Supported |
|---|---|---|---|
| Overview | Revenue and net income baseline | Descriptive trend | Is demand growing, declining, or volatile? |
| Overview | 2026 demand forecast | Prophet baseline and external-regressor forecast | What demand should stock planning expect next? |
| Sales diagnostics | Monthly revenue trend | Time-series descriptive analysis | Which months require planning attention? |
| Product prioritization | Top product revenue and ABC table | ABC/Pareto | Which products deserve priority control? |
| Product prioritization | Product urgency table | XGBoost urgency scoring | Which products need active review before shortages? |
| Area prioritization | Revenue and income by territory | Descriptive territory analysis | Which areas drive demand and margin? |
| Area prioritization | Area cluster table | K-Means | Which areas share similar planning behavior? |
| Area prioritization | Regional priority table | MCDA | Which regions should receive priority action? |
| Forecast modeling | Forecast projection chart | Prophet / Prophet with regressors | What is the planning demand range? |
| Forecast modeling | Seasonality index | STL / seasonality | Which months need demand multipliers? |
| Forecast modeling | External signals chart | DOH/PAGASA regressors | When should weather or disease change assumptions? |
| Prescriptive planning | EOQ reorder table | EOQ, ROP, safety stock | What quantity and reorder point should be used? |
| Prescriptive planning | Allocation table | Linear programming | Where should constrained stock be allocated? |
| Prescriptive planning | Product-region match table | Collaborative filtering | Which product-area pairings are likely to fit? |
| Prescriptive planning | Alerts | Rule thresholds | What action needs immediate review? |
| Model evaluation | Evaluation metrics | MAE, RMSE, MAPE, silhouette, optimization gap | Which model outputs are reliable enough to publish? |

Every chart should answer a decision question. If the team cannot explain the decision supported by a chart, remove or redesign the chart.

## Worker Assignment

| Worker | Ownership |
|---|---|
| Orchestrator | Sequence cross-layer work and confirm that business, data, backend, frontend, QA, and documentation tasks close together. |
| Business Analyst | Define decisions supported by the system: what to reorder, where to allocate, which products and areas require attention. |
| Data Analyst | Validate source datasets, feature definitions, assumptions, and analytical limitations. |
| Database Engineer | Maintain Supabase schema, warehouse grain, migrations, seed data, and query performance. |
| Backend Engineer | Serve analytics outputs through stable API contracts and handle fallback behavior. |
| BI Specialist | Choose chart types, KPI labels, drill-downs, thresholds, and insight wording. |
| Frontend Engineer | Render dashboard views, empty states, filters, charts, tables, and responsive behavior. |
| QA Engineer | Verify chart rendering, API contracts, model output ranges, and regression behavior. |
| DevOps Engineer | Manage environment variables, migrations, seed execution, build checks, and deployment readiness. |
| Security Engineer | Review uploaded files, API keys, external data calls, Supabase policies, and exposed dashboard data. |
| Technical Writer | Keep setup, API, database, and analytics documentation aligned with implementation. |
