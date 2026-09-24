# MedShield DSS Variable Completion and Delivery Plan

## 1. Purpose

This plan defines how MedShield will close the analytical-variable gaps identified in the capstone paper and DSS without inventing inventory, procurement, or service-level data that cannot be recovered from completed sales transactions.

The implementation must deliver four connected outcomes:

1. A governed descriptive layer using quantity, revenue, geography, and product evidence.
2. A predictive layer that forecasts fulfilled demand at an eligible product-region grain.
3. A scenario-planning layer that clearly separates sales-derived evidence from user-entered operational assumptions.
4. A Chapter 4 evidence package that uses the same definitions, periods, status labels, and limitations as the working DSS.

The accountable role for this plan is the Orchestrator. Business Analysis owns definitions and acceptance criteria; Data and BI own metric meaning; Frontend, Backend, Database, and Analytics Engineering own their respective implementation layers; QA owns verification; the Technical Writer owns manuscript and operating-document consistency.

## 2. North Star and Decision Question

### North star

MedShield is a historical analytics-driven decision-support system that helps pharmaceutical planners understand fulfilled demand, compare territories and products, evaluate forecasts, and review replenishment scenarios under seasonal disease and weather conditions.

### Primary decision question

> Given the available 2017–September 2026 evidence, which products and study regions show material fulfilled-demand patterns, forecast risk, or planning priority, and which additional operational inputs must a planner provide before a replenishment scenario can be reviewed?

### Scope boundary

- The capstone reporting window is 2017–September 2026.
- Every source retains its actual observed endpoint; the system must not extend a source to September 2026 without records.
- Sales quantity represents fulfilled demand, not total market demand.
- Missing months are unknown unless an observed zero is explicitly supported.
- Revenue is a financial measure and must not be labeled demand.
- EOQ, ROP, safety stock, allocation, expiry exposure, and budget outputs remain scenarios until actual operational inputs are supplied and approved.
- The DSS supports human review and does not execute procurement.

## 3. Current Evidence Baseline

### Implemented and verified

- Historical demand is defined as delivered source units for one canonical product.
- The descriptive-readiness job distinguishes observed values, observed zeros, and unknown missing months.
- STL produces trend, seasonal, and residual components for eligible product-region series.
- Forecast eligibility requires at least 24 consecutive usable monthly observations and no unresolved evaluation-window gaps.
- CALABARZON, MIMAROPA, and Bicol remain separate objective regions; Other National is comparison-only.
- Area Prioritization uses a regional-group default and province/area drill-down after a region is selected.
- Regional rollup totals remain regional while the selected region drives area-level charts and evidence tables.

### Current evidence limitations

- Product alias and therapeutic-category mappings still require approval.
- The dated descriptive run is draft evidence, not a published production dataset.
- The current descriptive evidence ends at the latest available sales record rather than assuming September 2026 coverage.
- Workbook gross-margin fields contain anomalies and cannot support company net-profit claims.
- Operational inventory, procurement, expiry, and outcome records are not present in the sales report.
- Existing hardcoded planning values are assumptions and must not appear as actual data.

## 4. Canonical Variable Taxonomy

Every variable must have one of these provenance classes:

| Class | Meaning | Required UI label |
|---|---|---|
| Actual | Directly observed in an accepted source record | Actual |
| Derived | Reproducibly calculated from actual records | Derived |
| Estimated | Imputed or allocated under a documented method | Estimated |
| Forecast | Future model output with model version and interval | Forecast |
| Proxy | Indirect indicator used because the target measure is unavailable | Proxy |
| Scenario input | Planner-entered or explicitly assumed value | Scenario input |
| Scenario output | Formula/model result using scenario inputs | Scenario output |
| Unavailable | Required field with no defensible source | Unavailable |

No field may move from proxy or scenario to actual without a source, lineage record, review status, and publication decision.

## 5. Governed Business Definitions

### 5.1 Fulfilled demand

```text
fulfilled_demand_units = SUM(quantity_sold)
```

Grain:

```text
calendar_month × canonical_sku × study_region × customer_sector
```

Dashboard label:

```text
Fulfilled Demand (Delivered Units)
```

Limitation: it excludes lost sales, rejected orders, backorders, and unrecorded stockout demand.

### 5.2 Sales volume

Sales volume uses the same physical quantity base as fulfilled demand. It is a descriptive presentation, not a second independent measure.

```text
sales_volume_units = SUM(quantity_sold)
average_monthly_sales_volume = AVG(monthly fulfilled_demand_units)
```

Use `Sales Volume (Units)` in historical comparison views and `Fulfilled Demand (Units)` in forecasting and planning views.

### 5.3 Revenue and contribution

```text
net_sales_revenue = SUM(net_cost)
revenue_contribution_pct = product_or_area_net_sales / selected_scope_net_sales × 100
```

Revenue forecasts must be called `Net-Sales Forecast`, never `Demand Forecast`.

### 5.4 Demand growth

```text
month_over_month_growth = (current_month_units - prior_month_units) / prior_month_units
year_over_year_growth = (current_month_units - same_month_prior_year_units) / same_month_prior_year_units
```

Growth is unavailable when the comparison denominator is zero or the comparison period is missing.

### 5.5 Demand variability

```text
demand_stddev = STDEV(monthly fulfilled_demand_units)
demand_cv = demand_stddev / average_monthly_sales_volume
```

CV is valid only when the mean is positive and the monthly calendar has passed completeness checks.

### 5.6 Demand continuity and intermittency

```text
sales_continuity_rate = observed_positive_months / eligible_observed_months
average_inter_demand_interval = average months between positive-demand observations
```

Suggested segments:

- Stable
- Seasonal
- Intermittent
- Declining
- New
- Dormant candidate
- Insufficient evidence

### 5.7 Sales velocity

```text
average_monthly_velocity = fulfilled_demand_units / observed_months
average_active_day_velocity = fulfilled_demand_units / active_sales_days
recent_velocity_ratio = latest_3_month_average / preceding_3_month_average
```

This measures fulfilled-sales movement, not physical inventory depletion.

### 5.8 Unit economics

```text
weighted_unit_selling_price = SUM(net_sales_revenue) / SUM(quantity_sold)
weighted_unit_acquisition_value = SUM(total_trade_price) / SUM(quantity_sold)
transaction_gross_margin = net_cost - total_trade_price
gross_margin_rate = SUM(transaction_gross_margin) / SUM(net_cost)
```

All unit economics are calculated per canonical SKU and compatible source unit.

## 6. Closest Defensible Sales-Derived Proxies

| Operational variable | Closest defensible proxy | Computation | Required status |
|---|---|---|---|
| Current on-hand stock | None | Manual entry only | Scenario input |
| Reserved stock | None | Manual entry only | Scenario input |
| Available stock | Scenario on-hand minus scenario reserve | `max(on_hand - reserved, 0)` | Scenario output |
| Stockout quantity | Supply-constraint candidate | Near-zero fulfilled demand after stable history, followed by a rebound | Proxy; validation required |
| Unfulfilled orders | None | Requires ordered versus delivered quantity | Unavailable |
| Open purchase orders | None | Requires procurement records | Unavailable |
| Supplier lead time | Replenishment-cycle proxy | Interval between recurring large deliveries or demand replenishment patterns | Proxy; not supplier lead time |
| Lead-time variability | Cycle-interval variability | Standard deviation of the replenishment-cycle proxy | Proxy |
| Ordering cost | None | Planner-entered approved scenario value | Scenario input |
| Holding cost | None | Planner-entered rate or amount | Scenario input |
| Expiry cost | Slow-moving financial exposure | Scenario remaining stock × weighted acquisition value | Scenario output |
| Pack size | Inferred order multiple | Repeated positive quantity increments per canonical SKU | Proxy; mapping review required |
| Minimum order quantity | Observed minimum delivery | Minimum or lower-percentile positive transaction quantity | Proxy; not supplier MOQ |
| Batch and expiry dates | None | Requires batch inventory records | Unavailable |
| Procurement budget | Historical spend reference | Monthly acquisition value × planner-selected factor | Scenario input/reference |
| Warehouse capacity | None | Manual entry only | Scenario input |
| Service-level policy | None | Planner-selected approved target | Scenario input |
| Fill rate | Sales-continuity proxy | Positive observed months / eligible observed months | Proxy; not order fill rate |
| Expiry loss | Slow-moving candidate exposure | Low-velocity historical acquisition value or scenario stock exposure | Proxy/scenario; not actual loss |
| Recommendation outcome | None before workflow use | Capture accepted, modified, rejected, and subsequent actuals | Future actual |

## 7. Analytical Data Products

### 7.1 Monthly demand mart

Create a governed product-region-month mart with these minimum fields:

```text
month_id
canonical_sku_id
product_name
source_unit
therapeutic_category
study_region
area
customer_sector
fulfilled_demand_units
net_sales_revenue
total_acquisition_value
transaction_gross_margin
transaction_count
observed_status
estimated_allocation_flag
product_mapping_status
area_mapping_status
source_dataset_version
source_max_observed_date
run_id
```

Grain tests must prove one unique row per declared key. Mixed source units must never be summed as comparable demand.

### 7.2 Product-region feature mart

Derive:

```text
average_monthly_sales_volume
demand_stddev
demand_cv
sales_continuity_rate
average_inter_demand_interval
month_over_month_growth
year_over_year_growth
recent_velocity_ratio
seasonal_strength
trend_direction
revenue_contribution_pct
abc_revenue_class
abc_volume_class
dii_score
rsi_score
forecast_eligibility_status
```

DII and RSI remain null until approved geography and product-signal mappings exist.

### 7.3 Forecast output mart

Minimum fields:

```text
forecast_run_id
model_code
model_version
canonical_sku_id
study_region
forecast_month
actual_fulfilled_demand_units
forecast_demand_units
lower_bound_95
upper_bound_95
training_start
training_end
evaluation_start
evaluation_end
mae
rmse
wape
smape
bias
interval_coverage
champion_status
review_status
limitation_text
```

Aggregate forecast files without product and region identifiers cannot satisfy the territory-level objective.

### 7.4 Scenario input and result mart

Inputs:

```text
scenario_id
canonical_sku_id
study_region
scenario_on_hand_units
scenario_reserved_units
scenario_lead_time_days
scenario_ordering_cost_php
scenario_holding_cost_per_unit_year
scenario_pack_size
scenario_moq
scenario_expiry_or_shelf_life_days
scenario_budget_php
scenario_capacity_units
scenario_service_level
entered_by
entered_at
review_status
```

Results:

```text
scenario_available_units
scenario_forecast_demand_units
scenario_stock_gap_units
scenario_eoq_units
scenario_safety_stock_units
scenario_rop_units
scenario_slow_moving_exposure_php
assumption_summary
formula_version
generated_at
```

Actual and scenario fields must be stored separately; defaults must never masquerade as source records.

## 8. Analytics Implementation

### 8.1 Descriptive layer

1. Enforce canonical product and region eligibility.
2. Emit a complete monthly calendar with `observed`, `observed_zero`, or `missing_unknown`.
3. Calculate units, revenue, gross margin, growth, CV, continuity, and velocity separately.
4. Run STL only for eligible series with at least 24 usable monthly observations.
5. Publish trend, seasonality, residual, seasonal strength, and eligibility reason.
6. Produce quantity-based and revenue-based ABC classifications separately.
7. Retain actual versus estimated allocation evidence.
8. Report mapping coverage and excluded rows.

### 8.2 Predictive layer

1. Use fulfilled-demand units as the mandatory target for demand forecasting.
2. Use seasonal naive and last-observation methods as mandatory baselines.
3. Evaluate Prophet only after the series passes eligibility.
4. Use rolling-origin or time-based validation; never random splitting.
5. Report MAE, RMSE, WAPE, sMAPE, bias, and interval coverage.
6. Promote no model that fails to beat the baseline consistently.
7. Show actual values beside predictions.
8. Support 3-, 6-, and 12-month horizons from the latest observed month.
9. Treat weather and disease regressors as challenger features until they improve validated performance.
10. Display `Insufficient history` instead of fabricating a forecast.

### 8.3 Product priority layer

Required features:

- Average monthly sales volume
- Revenue contribution
- Demand CV
- Demand growth
- ABC revenue and volume classes
- Seasonal strength
- Therapeutic category, when approved
- DII and RSI, when approved

Without stock, lead time, and service evidence, the output is `Demand Priority`, not `Inventory Urgency`.

### 8.4 Scenario prescriptive layer

1. Require explicit scenario input before calculating operational formulas.
2. Never auto-populate current stock, reserve, ordering cost, lead time, or service policy from arbitrary sales percentages.
3. Allow historical sales to prefill only clearly labeled reference values such as average monthly demand or weighted acquisition value.
4. Calculate EOQ, ROP, and safety stock using visible formulas and scenario inputs.
5. Run sensitivity cases for baseline, surge, and constrained-budget assumptions.
6. Require review status before export.
7. Export a draft planning schedule, never a purchase order.

## 9. Regional Hierarchy and Drill-Down

### Default regional-group level

- CALABARZON
- MIMAROPA
- Bicol
- Other National

The total rollup always sums these regional groups at regional granularity. Unknown or unmapped geography is reported separately and excluded from the mapped total.

### Selected-region level

Selecting a region changes ranking, Pareto, KPIs, and evidence rows to province/area granularity. It does not change the regional cards or regional-group total.

Examples:

- CALABARZON → Batangas, Cavite, Laguna, Quezon, and any approved mapped areas.
- MIMAROPA → Marinduque, Oriental Mindoro, Occidental Mindoro, Palawan, Romblon, and approved legacy mappings.
- Bicol → Albay, Camarines Norte, Camarines Sur, Catanduanes, Masbate, and Sorsogon.
- Other National → national operational areas such as DOH Central and MedShield HQ, with their non-study-region status visible.

The UI must say `area` when the source does not support a verified province classification.

## 10. API and Publication Contracts

Every analytical endpoint must return:

```text
data
grain
metric_definition
unit
period_start
period_end
source_max_observed_date
source_dataset_version
run_id
model_version
status
limitations
mapping_coverage
excluded_counts
```

Gateway rules:

- Validate bounded date, product, region, and status filters.
- Read published analytical data from the approved system of record.
- Never expose Databricks, Supabase service-role, or external API credentials.
- Return an explicit unavailable response when a required source contract fails.
- Do not silently fall back to bundled, local, or demonstration values.
- Return scenario outputs only with their assumptions and review status.

## 11. Dashboard Information Architecture

### Executive Overview

- Fulfilled Demand (Units)
- Net Sales Revenue
- Transaction Gross Margin
- Average Monthly Sales Volume
- Leading Study Region
- Data coverage and source endpoint

### Descriptive Analytics

- Monthly/yearly unit-demand trend
- Revenue trend kept separate from units
- STL trend, seasonality, residual
- Demand growth and nominal units together
- Demand CV and continuity
- Actual versus estimated evidence
- Quantity and revenue Pareto views

### Area Prioritization

- Stable regional-group rollup
- Region-to-province/area drill-down
- Actual versus estimated bars
- Regional or area Pareto according to active level
- Buyer cluster as a filter, not geography
- Mapping and evidence confidence

### Product Prioritization

- Revenue contribution
- Delivered units
- Average monthly volume
- Demand CV
- Demand growth
- ABC revenue and volume classes
- Demand-priority score with feature explanation

### Forecast Modeling

- Actual and forecast series
- Prediction interval
- Eligibility status
- Benchmark comparison
- Error metrics
- Model and data periods
- Product, region, and horizon controls

### Scenario Planning

- Historical reference panel
- Required scenario-input form
- Formula and assumption panel
- EOQ/ROP/safety-stock scenario outputs
- Sensitivity comparison
- Review status and draft export

## 12. Data Quality and Governance Gates

### Gate A — Source and period

- Source hash, row count, and maximum observed date recorded.
- 2026 is labeled partial or unavailable independently per source.
- No future or fabricated periods are published.

### Gate B — Product

- Canonical SKU approved or visibly marked `needs_review`.
- Contract names and non-product rows excluded or explicitly allocated as estimates.
- Source unit is compatible within each series.

### Gate C — Geography

- Study regions remain separate.
- Area-to-region mapping status is visible.
- Other National never replaces objective evidence from the three study regions.

### Gate D — Monthly calendar

- Observed zero and unknown missing values remain distinct.
- Evaluation windows have no unresolved gaps.

### Gate E — Forecast

- At least 24 usable months.
- Baseline comparison completed.
- Bias and error thresholds reviewed.
- Product-region identifiers included.

### Gate F — Scenario

- Required operational assumptions provided explicitly.
- Formulas and versions recorded.
- Output labeled scenario and pending review.

### Gate G — Publication

- Source, status, limitations, and refresh date shown.
- No hardcoded example appears as actual.
- QA and reviewer status recorded.

## 13. Security, Privacy, and Audit

- Keep credentials and source-system tokens server-side.
- Validate uploads by type, size, schema, date range, and row count.
- Preserve source hashes and ingestion lineage.
- Apply role-based access for viewers, analysts, planners, approvers, and administrators.
- Record uploads, analytical runs, scenario creation, review decisions, and exports.
- Do not log credentials or complete sensitive payloads.
- Prevent normal users from publishing models or approving their own scenarios.
- Retain scenario history so paper evidence and demonstrations are reproducible.

## 14. Test Plan

### Data tests

- Source totals reconcile to accepted, rejected, and excluded records.
- Monthly mart has a unique declared grain.
- Mixed products or source units are never summed as one demand series.
- Missing months remain null and observed zeros remain zero.
- Region totals reconcile to their approved areas.
- Regional-group total remains stable during area drill-down.
- Actual and estimated values reconcile separately.

### Analytics tests

- Growth formulas handle zero and missing denominators.
- CV returns unavailable for non-positive means.
- STL rejects ineligible series.
- Forecast eligibility enforces 24 usable months and gap rules.
- Forecast metrics reproduce known examples.
- Champion promotion requires baseline improvement.
- EOQ, ROP, and safety-stock formulas reproduce known scenario cases.

### API tests

- Invalid dates, regions, products, or horizons are rejected.
- Unavailable upstream data fails closed.
- Status and lineage metadata are always present.
- Scenario and actual records cannot be confused.
- Unauthorized publication and approval requests fail.

### UI tests

- Monthly and yearly controls update every affected chart.
- Region click opens province/area detail while regional totals remain stable.
- Total rollup returns charts to regional granularity.
- Keyboard focus and activation work on drill-down controls.
- Forecast charts show actual, forecast, and interval.
- Ineligible series show `Insufficient history`.
- Scenario forms require all mandatory inputs.
- Empty, loading, stale, partial, and unavailable states are readable.
- Exports reproduce the currently filtered and correctly labeled view.

### Release checks

```text
Python analytics unit tests
Frontend TypeScript check
Frontend focused Playwright tests
Backend tests and type check
Diff and secret review
Manual dashboard walkthrough
Chapter 4 evidence reconciliation
```

Do not run a production frontend build while the development server is active.

## 15. Chapter 4 Evidence Plan

### 4.1 System implementation

- Architecture diagram and source-of-truth boundary
- Frontend, gateway, analytics, and database responsibilities

### 4.2 Data preparation

- Source fields and definitions
- Cleaning and exclusion counts
- Product and area mappings
- Complete monthly calendar
- Source-specific date endpoints

### 4.3 Descriptive results

- Fulfilled demand and sales volume
- Revenue and gross margin kept separate
- Region and area rollups
- STL components
- Growth, CV, continuity, and Pareto/ABC

### 4.4 Predictive results

- Eligible product-region series
- Actual-versus-forecast chart
- Benchmark and candidate metrics
- Forecast interval and horizon
- Rejected or ineligible results reported honestly

### 4.5 Objective-evidence matrix

| Objective evidence | Required artifact | Completion rule |
|---|---|---|
| SO1 historical and STL analysis | Monthly demand mart, STL table, chart, interpretation | Three components shown for an eligible study-region series |
| SO2 sales volume, revenue contribution, and demand growth priority | Product/area features, Pareto, ABC, growth and CV table | Definitions and denominators documented |
| SO3 product-region demand forecast | Actual/forecast/interval table and metrics | Product and region identified; baseline evaluated |
| SO4 planning support | Scenario-input record and scenario outputs | Assumptions visible; no operational claim |
| SO5 integrated DSS | Screenshots, filters, provenance, status and QA evidence | Dashboard and report use identical labels and periods |

### 4.6 Validation

- Automated-test results
- Data reconciliation
- Adviser feedback addressed
- Limitations and remaining operational-data gaps

The report must distinguish implemented, validated, draft, scenario, planned, and blocked capabilities.

## 16. Six-Day Delivery Sequence

### Day 1 — Lock definitions and contracts

- Approve fulfilled-demand, sales-volume, revenue, margin, and proxy definitions.
- Freeze the product-region-month mart contract.
- Identify every current hardcoded operational value.
- Confirm source-specific endpoints through September 2026.

Exit gate: glossary and data-contract review complete.

### Day 2 — Build variables and publish descriptive evidence

- Implement growth, CV, continuity, velocity, unit economics, and proxy flags.
- Reconcile regional and area totals.
- Publish the dated descriptive evidence package with draft status.
- Connect quantity-based KPIs and charts.

Exit gate: descriptive variables reproduce from one command and reconcile.

### Day 3 — Complete the predictive baseline

- Create product-region feature and forecast marts.
- Run baseline models and rolling evaluation.
- Train Prophet only for eligible series.
- Publish actual, forecast, bounds, metrics, and eligibility.

Exit gate: at least one study-region series has defensible baseline evidence, or the limitation is formally reported.

### Day 4 — Replace fabricated planning values with scenario inputs

- Remove or isolate hardcoded stock, cost, lead-time, service, and expiry values.
- Add validated scenario-input contracts.
- Calculate scenario EOQ, ROP, safety stock, and slow-moving exposure.
- Add assumption and review panels.

Exit gate: no scenario result can be mistaken for actual inventory or an approved purchase action.

### Day 5 — Chapter 4 integration

- Generate the objective-evidence matrix.
- Capture final tables, charts, model metrics, and screenshots.
- Write results from reproduced outputs.
- Reconcile terminology, periods, and limitations across Chapters 1–4.

Exit gate: each Chapter 4 claim points to a reproducible artifact.

### Day 6 — Freeze, QA, and defense preparation

- Run data, analytics, API, UI, and security checks.
- Resolve release-blocking defects.
- Freeze dataset, model, and UI versions.
- Prepare the demonstration flow and limitations script.
- Push the reviewed branch to both repositories.

Exit gate: release checklist and evidence index completed.

## 17. Work Breakdown and Ownership

| Workstream | Accountable role | Deliverable |
|---|---|---|
| Business definitions | Business Analyst | Approved glossary and acceptance criteria |
| Architecture and source boundary | Architect | Data-flow and publication decision |
| Data mart and lineage | Database/Data Engineer | Monthly demand, feature, forecast, and scenario tables |
| Derived variables and models | Data Analyst/Analytics Engineer | Reproducible jobs and model outputs |
| Dashboard and drill-down | Frontend Engineer/BI Specialist | Decision-oriented UI with status and provenance |
| Gateway and validation | Backend Engineer | Authenticated, bounded analytical contracts |
| Security and approval | Security Engineer | Access, audit, secrets, and review controls |
| Verification | QA Engineer | Automated and manual acceptance evidence |
| Paper and operating docs | Technical Writer | Chapter 4 evidence and consistent documentation |
| Release integration | Orchestrator | Version freeze and dual-remote delivery |

## 18. Progress Measurement

Progress must be evidence-based rather than estimated informally. Score each workstream only when its completion evidence exists:

| Workstream | Weight | Completion evidence |
|---|---:|---|
| Definitions and mappings | 15% | Approved glossary and mapping reports |
| Descriptive mart and variables | 20% | Reconciled reproducible outputs |
| Predictive baseline | 20% | Forecast, intervals, metrics, and eligibility |
| Scenario planning | 15% | Explicit inputs, formulas, results, and review status |
| Dashboard and API integration | 10% | Working authenticated views and fail-closed states |
| QA and governance | 10% | Passing checks and review record |
| Chapter 4 evidence | 10% | Objective-evidence matrix, figures, and validated narrative |

Rules:

- Partially implemented work receives only the percentage supported by checked acceptance evidence.
- Planned or blocked work receives 0% of its weight.
- A dashboard mockup without source and verification does not count as completion.
- A scenario formula does not count as an operational recommendation.

## 19. Definition of Done

The variable-completion initiative is done when:

1. Demand and sales volume use delivered units at a canonical product-region grain.
2. Revenue is never labeled demand.
3. Growth, CV, continuity, velocity, STL, and ABC/Pareto outputs are reproducible.
4. Regional totals and province/area drill-downs reconcile.
5. Forecast files include product, region, actuals, bounds, metrics, and eligibility.
6. Ineligible series show `Insufficient history`.
7. Missing operational fields remain unavailable or explicit scenario inputs.
8. Hardcoded planning assumptions cannot appear as actual data.
9. Scenario outputs show formulas, assumptions, versions, and review status.
10. Every dashboard value includes source period, status, and limitation context.
11. Automated checks and the manual decision flow pass.
12. Chapter 4 uses the same definitions, dates, figures, and status labels as the DSS.

## 20. Immediate Next Actions

1. Approve the variable definitions in Sections 4–6.
2. Implement the monthly demand and product-region feature marts.
3. Add fulfilled-demand, sales-volume, growth, CV, and continuity outputs to the gateway and dashboard.
4. Publish the eligible baseline forecast with actual-versus-forecast evidence.
5. Replace remaining hardcoded operational values with required scenario inputs.
6. Generate the final Section 4.5 objective-evidence matrix from the published artifacts.
