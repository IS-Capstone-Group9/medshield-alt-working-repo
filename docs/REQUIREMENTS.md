# MedShield Capstone Requirements

## Scope Standard

MedShield is a historical analytics and decision-support capstone. It should help explain demand patterns, forecast planning demand, prioritize products and regions, and show scenario-based recommendations using available historical data.

The system must not claim to be a live disease surveillance system, an official PAGASA alerting system, or an automated procurement system.

## Confirmed Historical Data Window

| Data source | Available period | Use |
|---|---|---|
| Sales data | 2021-2025 | Demand, revenue, gross margin/profit, product and territory analysis |
| PAGASA data | 2021-2024 | Historical weather reference and validation only |
| DOH data | 2021-2025 | Historical disease signal and disease-adjusted scenarios |
| Weather API by latitude/longitude | 2021-2025 or provider-supported range | Weather proxy for target regions when official PAGASA coverage is incomplete |

## Data Rules

1. Historical sales data is the source of truth for demand.
2. PAGASA 2021-2024 must not be stretched or imputed as official 2025 PAGASA data.
3. Weather API data must be labeled as provider-derived weather proxy, not official PAGASA observations.
4. DOH 2021-2025 can support historical disease intensity analysis, but not live disease alerts after 2025.
5. Contract-name product rows such as `PAGBILAO # ...` and `QMC # ...` must be separated from real product names or backward-allocated as documented estimates.
6. `net_income` from the workbook must be labeled as gross margin/profit unless operating expense data is provided.
7. EOQ, ROP, safety stock, allocation, and dead-stock outputs must remain scenarios or formula demonstrations unless inventory, lead time, and cost-policy data are available.

## Functional Requirements

### FR1 - Data Upload and Cleaning

The system shall ingest MedShield sales files for 2021-2025, clean field values, flag rejected rows, and preserve lineage.

Acceptance criteria:

- Required columns are detected.
- Accepted, warning, and rejected row counts are reported.
- Source workbook, sheet, row number, and source hash are retained.
- Rejected rows are explainable by reason.

### FR2 - Business Definitions

The system shall use approved definitions for demand, revenue, gross margin/profit, SKU, territory, customer type, business line, ABC class, and forecast horizon.

Acceptance criteria:

- Demand uses quantity sold.
- Revenue uses approved sales value.
- Gross margin/profit is not presented as full net profit.
- Dashboard labels match the approved glossary.

### FR3 - Product and Area Master Mapping

The system shall map raw product and area values into analytical dimensions.

Acceptance criteria:

- Product aliases map to canonical SKUs.
- Contract-name rows are not treated as product SKUs.
- Territory, customer type, and business line are separated.
- Unmapped values are reported before model execution.

### FR4 - Historical Descriptive Analytics

The system shall compute descriptive analytics from historical sales data.

Required outputs:

- Monthly demand and revenue trends.
- STL seasonality.
- Pareto / 80-20 ranking.
- Actual ABC classification.
- Year-over-year growth.
- Territory and customer-type summaries.

Acceptance criteria:

- Outputs reconcile to source totals.
- Missing months and incomplete periods are labeled.
- Product-level analysis uses canonical SKU or estimated allocation flags.
- The descriptive job is reproducible through `python services\analytics_service\jobs\run_descriptive.py`.
- Revenue uses `total_trade_price`, while `net_income` is labeled as workbook gross margin/profit.

### FR5 - Baseline Demand Forecasting

The system shall produce a sales-only baseline forecast using historical demand.

Acceptance criteria:

- Simple benchmarks are calculated before Prophet.
- 2025 is used as a full holdout only if completeness is proven.
- If 2025 remains incomplete, rolling validation is used inside trusted history.
- Forecast metrics include MAE, RMSE, MAPE or WAPE/sMAPE, and bias.

### FR6 - Historical Weather Analysis

The system shall use historical weather data to support weather-context analysis and optional weather-adjusted forecasting.

Acceptance criteria:

- PAGASA 2021-2024 is treated as official historical data only for its covered period.
- Weather API data by latitude/longitude is labeled as provider weather proxy.
- Weather features are joined only to approved geographic territories.
- Weather-adjusted models are compared against sales-only baseline.
- Weather is kept contextual if it does not improve forecasting accuracy.

### FR7 - Historical Disease Analysis

The system shall use DOH 2021-2025 data to calculate historical disease signals and scenario features.

Acceptance criteria:

- Disease data is mapped by period, disease, and available geography.
- Disease Intensity Indicator is calculated using a documented formula.
- Disease-adjusted forecasts are historical or scenario-based.
- No post-2025 live disease alert is claimed without current DOH data.

### FR8 - Product Prioritization

The system shall prioritize products for planning review.

Acceptance criteria:

- Established products use actual ABC classification.
- XGBoost or other ML is used only after a clear prediction target is defined.
- Without inventory data, the output is labeled demand priority, not inventory urgency.
- Feature importance and limitations are documented.

### FR9 - Scenario-Based Prescriptive Analytics

The system shall provide scenario-based prescriptive outputs where operational inputs are incomplete.

Possible outputs:

- Scenario EOQ.
- Scenario ROP.
- Scenario safety stock.
- Commercial-priority MCDA.
- Product-region matching.
- Weather or disease scenario alerts.

Acceptance criteria:

- Scenario assumptions are visible.
- Outputs are not labeled as automated procurement decisions.
- Human review is required before any recommendation is treated as actionable.

### FR10 - Dashboard Publication

The dashboard shall display validated outputs with labels, limitations, and review status.

Acceptance criteria:

- Actual, estimated, forecast, proxy, scenario, and official data are visually and textually distinct.
- Model version, data period, source/provider, metrics, and limitations are shown.
- Demo/fallback values are labeled as demonstration data.

## Non-Functional Requirements

| Area | Requirement |
|---|---|
| Traceability | Every output must trace to source data, transformation, model version, and run date. |
| Reproducibility | Data preparation and model runs must be executable through documented commands. |
| Data quality | Model runs must stop or downgrade when required data is missing or unmapped. |
| Security | API keys, service-role keys, and uploaded data must not be exposed in frontend code. |
| Maintainability | Frontend, TypeScript gateway, Python analytics, and Supabase responsibilities must remain separate. |
| Explainability | Forecasts, priorities, and scenarios must include reason text and limitations. |
| Governance | Published recommendations require human review status. |

## Capstone Completion Workflow

1. Approve business definitions.
2. Reconcile and repair 2021-2025 sales data.
3. Review contract-name row backward allocation.
4. Complete product/SKU alias mapping.
5. Complete area, customer-type, and business-line mapping.
6. Build analytical marts.
7. Run descriptive analytics.
8. Run baseline forecast and benchmarks.
9. Integrate historical PAGASA 2021-2024 and weather API proxy data.
10. Run weather-context or weather-adjusted forecast comparison.
11. Integrate historical DOH 2021-2025 disease data.
12. Run disease-context or disease-adjusted scenario analysis.
13. Build product demand-priority model or deterministic priority score.
14. Build scenario-based prescriptive outputs.
15. Publish outputs through API and dashboard.
16. Run validation and QA.
17. Revise Chapters 1-3 to match historical-only scope.
18. Write Chapter 4 from implementation evidence.
19. Write Chapter 5 from evaluation, findings, limitations, and recommendations.

## Chapter 1-3 Revision Requirements

### Chapter 1

Revise the scope and limitations to state:

- PAGASA data is historical and covers 2021-2024 only.
- DOH data is historical and covers 2021-2025.
- Weather API data is used as a provider-derived proxy by target-region coordinates.
- The system supports decision-making; it does not automate procurement or issue official alerts.

### Chapter 2

Revise the literature and technology framing to emphasize:

- Historical analytics.
- Decision-support systems.
- Forecast comparison against benchmarks.
- External regressors as historical/scenario features.
- Scenario-based prescriptive analytics when operational cost and inventory data are incomplete.

### Chapter 3

Revise the methodology to state:

- Sales-only baseline is mandatory.
- PAGASA models are evaluated only within 2021-2024 or used as historical reference.
- DOH can support 2021-2025 historical disease features.
- Weather API data must be separately labeled from PAGASA.
- EOQ/ROP/allocation are scenario models unless inventory and procurement data are provided.
- Contract-name rows are handled through documented backward allocation.

## Chapter 4 Requirements

Chapter 4 should document what was implemented:

1. System architecture.
2. Database/schema design.
3. Data ingestion and cleaning.
4. Contract-name row allocation.
5. Dashboard features.
6. Historical descriptive analytics.
7. Forecasting workflow.
8. Weather and disease integration workflow.
9. Model-output publication.
10. Validation results and screenshots.

## Chapter 5 Requirements

Chapter 5 should document:

1. Summary of findings.
2. Whether descriptive outputs answered the business questions.
3. Forecast accuracy and model comparison.
4. Weather and disease signal usefulness.
5. Decision-support value.
6. Limitations from historical-only data.
7. Limitations from missing inventory, expense, and procurement data.
8. Recommendations for future work.

## Minimum Definition of Done

The capstone is complete when:

1. Data definitions are approved.
2. Sales data is reconciled and data-quality issues are documented.
3. Product and area mappings are reviewed.
4. Descriptive analytics are reproducible.
5. Forecast baseline and evaluation metrics are produced.
6. PAGASA, weather API, and DOH data are correctly labeled by source and period.
7. Scenario outputs are clearly separated from real operational recommendations.
8. Dashboard and API show validated outputs.
9. Chapters 1-3 match the actual historical-only scope.
10. Chapters 4-5 are written from implemented evidence and validation results.
