# MedShield DSS Data Story Implementation Plan

## 1. Objective

Convert the current MedShield analytical modules into one evidence-led narrative that guides a planner from historical context to a reviewable planning scenario while preserving the definitions, limitations, and objective evidence required by the capstone paper.

The working prototype is located at:

```text
prototypes/medshield-data-story-prototype.html
```

The prototype is intentionally self-contained and uses illustrative values. It demonstrates information architecture and interactions; it is not a production data source and must not be cited as an analytical result.

## 2. Narrative Contract

The production DSS must follow this sequence:

```text
Context
→ Historical pattern
→ Product and geographic priority
→ Forecast and uncertainty
→ Scenario planning
→ Human review
```

Every chapter answers one decision question:

| Chapter | Decision question | Capstone alignment |
|---|---|---|
| Executive Overview | What does the evidence say now? | SO5 integrated DSS |
| Sales Diagnostics | What happened, and was it seasonal? | SO1 descriptive analytics and STL |
| Product Priority | Which products deserve planning attention? | SO2 sales volume, revenue contribution, growth, and priority |
| Area Priority | Where is demand and revenue concentrated? | SO2 regional and area prioritization |
| Forecast Modeling | What may happen next, and how reliable is it? | SO3 product-region demand forecast |
| Scenario Planning | What planning scenario should be reviewed? | SO4 scenario EOQ, ROP, safety stock, and allocation |

## 2.1 Paper, Current Data, and North Star Reconciliation

The written SO1 still names **2021–2025**, while the current internal-sales scope and DSS support **2017–September 2026**. The implementation must not choose one period and silently discard the other.

The dashboard therefore provides two explicit analytical lenses:

| Lens | Purpose | Required behavior |
|---|---|---|
| Objective evidence · 2021–2025 | Reproduce the period stated in the current capstone objective | Use equivalent complete periods for SO1 evidence, STL, YoY, and Chapter 4 figures |
| Capstone extended · 2017–September 2026 | Use all approved internal-sales history and the latest partial year | Preserve source-specific endpoints; mark 2026 partial/YTD; do not claim pre-2020 revenue where its financial mapping is unresolved |

Forecasting is anchored to the latest trusted actual. The forecast screen explicitly marks **December 2026 onward** as the objective horizon, even when October and November 2026 are displayed as bridge months.

## 2.2 Exact Objective-to-Prototype Contract

| Objective | Prototype module and evidence | North Star nodes | Required status boundary |
|---|---|---|---|
| General objective: integrated descriptive, predictive, and prescriptive DSS by December 2026 | Executive story hub and shared evidence controls | North Star question 1 | Prototype until published data contracts and QA evidence exist |
| SO1: analyze 2021–2025 sales across CALABARZON, MIMAROPA, and Bicol using STL and YoY | Sales Diagnostics: scope lens, complete calendar, observed/trend/seasonal/residual chart, heatmap | 2A, 3A, 5A | STL requires at least 24 usable months and resolved gaps |
| SO2: prioritize territories, accounts, and SKUs using volume, revenue, growth, 80/20, ABC, and XGBoost | Product Priority and Area Prioritization: Pareto, actual ABC, regional rollup, area drill-down, buyer evidence | 4A, 6A, 7A, 6B, 7B | Actual ABC remains primary for established SKUs; XGBoost stays candidate until validated |
| SO3: forecast territory demand from December 2026 onward using Prophet, DII/RSI, and XGBoost | Forecast Modeling: actuals, cutoff, forecast interval, baseline comparison, metrics, objective-horizon marker | 2B–7B | DII/RSI remain challenger features until approved and aligned; candidate must beat baseline |
| SO4: improve planning and target expiry wastage at or below 5% using EOQ, ROP, LP, and MCDA | Prescriptive Planning: explicit assumptions, dynamic scenario outputs, constraints, review ledger | 2C, 3C, 6C–8C | Scenario only until inventory, expiry, cost, lead time, budget, capacity, and outcome evidence exist |
| SO5: present five governed DSS modules with ingestion validation, alerts, and recommendations | Five sidebar modules plus executive hub, persistent filters, provenance, status, and human-review flow | All paths | CSV validation, official alert validation, collaborative filtering, acknowledgement, and outcome capture remain production gates |

The prototype must never use the objective wording as proof that a capability has been implemented. Each objective is displayed beside its method and evidence gate so reviewers can distinguish alignment from completion.

## 3. Non-Negotiable Evidence Rules

1. Fulfilled demand means delivered quantity for one compatible canonical product.
2. Sales volume and fulfilled demand use the same quantity base; they differ only by reporting context.
3. Revenue is a separate financial measure and is never labeled demand.
4. Missing months remain missing; observed zeros remain zero.
5. Actual, estimated, forecast, proxy, scenario, blocked, and unavailable values are visibly distinct.
6. The capstone window is 2017–September 2026, but every source displays its own maximum observed date.
7. CALABARZON, MIMAROPA, and Bicol remain separate study-region evidence.
8. Other National is an operational comparison and cannot replace evidence from the three study regions.
9. Product-region forecasts require at least 24 usable monthly observations, complete evaluation windows, and reviewed mappings.
10. Inventory, supplier, cost, expiry, budget, capacity, and service-level values are actual only when supported by operational records.
11. Scenario calculations require explicit assumptions and cannot become purchase instructions.
12. Every recommendation requires human review.

## 4. Prototype Scope

### Included interactions

- DSS-style collapsible sidebar with an executive story hub and the five capstone modules.
- Dynamic objective, North Star, method, and evidence-gate panel for every module.
- Switchable 2021–2025 objective-evidence and 2017–September 2026 extended-history lenses.
- Shared study-region, product, and monthly/yearly controls.
- Dynamic KPI definitions and narrative text.
- Fulfilled-demand and regional-contribution overview.
- Observed demand, STL components, and year-month heatmap.
- Product Pareto and volume-versus-revenue portfolio view.
- Regional-group ranking with province/area drill-down.
- Actual-versus-forecast fan chart and model-error comparison.
- Scenario input controls with dynamic stock-gap, safety-stock, ROP, and EOQ outputs.
- Evidence tables and status labels in every chapter.
- Responsive layouts and keyboard-accessible controls.

### Explicitly excluded from the prototype

- Authentication.
- API or database calls.
- Production sales, inventory, DOH, PAGASA, or provider-weather values.
- Model training.
- File uploads.
- Procurement execution.
- Persistent approvals or audit records.

## 5. Target Production Architecture

```text
Certified source data
  → Databricks Gold analytical views
  → TypeScript API gateway
  → Published analytical contracts
  → Next.js dashboard story modules
  → Human review and export
```

Responsibilities:

| Layer | Responsibility |
|---|---|
| Databricks Gold | Certified facts, mappings, aggregates, model outputs, lineage |
| Python analytics | Reproducible descriptive, forecast, priority, and scenario computations |
| TypeScript gateway | Authentication, bounded filters, validation, status metadata, unavailable states |
| Next.js frontend | Narrative flow, charts, tables, filters, drill-downs, assumptions, accessibility |
| Audit store | Scenario authorship, review decisions, exports, and publication history |

The browser must not load a local analytical fallback when the approved production contract is unavailable.

## 6. Shared Page Contract

Each module must receive and display:

```text
data
grain
metric_definition
unit
period_start
period_end
source_max_observed_date
dataset_version
run_id
model_version
status
review_status
limitations
mapping_coverage
excluded_counts
```

Shared filters:

```text
analysis_scope
period
chart_granularity
canonical_product_id
study_region
area
buyer_sector
evidence_status
```

The selected filter state must be consistent across KPI, chart, narrative, table, and export output.

## 7. Module Implementation

### 7.1 Executive Overview

#### Required outputs

- Fulfilled Demand (Delivered Units), available only for one compatible product scope.
- Net Sales Revenue.
- Transaction Gross Margin.
- Average Monthly Sales Volume.
- Leading Study Region.
- Forecast-eligible series count.
- Data endpoint and mapping coverage.

#### Visuals

- Primary: monthly or yearly fulfilled-demand trend.
- Secondary: regional-group contribution bars.
- Evidence: executive evidence register.

#### Acceptance criteria

- Units and revenue never share an unlabeled axis or KPI.
- All-product quantity is unavailable when source units are incompatible.
- Every narrative sentence is generated from the same filtered data as the visual.
- No current alert, stock, or procurement claim is shown without a source.

### 7.2 Sales Diagnostics

#### Required outputs

- Complete product-region monthly calendar.
- Fulfilled demand.
- Demand growth.
- Demand CV.
- Sales continuity.
- STL observed, trend, seasonal, and residual values.
- Seasonal strength and eligibility.
- Actual versus estimated evidence.

#### Visuals

- Primary: observed demand and aligned STL components.
- Secondary: year-month demand heatmap.
- Supporting: nominal demand and growth comparison.
- Evidence: decomposition and calendar-status table.

#### Acceptance criteria

- Heatmap uses quantities, not pesos.
- Missing and observed-zero cells are distinct.
- STL is unavailable for ineligible series.
- All-Time aggregates by calendar year; incomplete endpoints are marked partial or YTD.

### 7.3 Product Priority

#### Required outputs

- Revenue contribution.
- Delivered units.
- Average monthly sales volume.
- Demand growth and CV.
- Continuity and seasonal strength.
- Revenue ABC and volume ABC.
- Therapeutic mapping status.
- Demand-priority score and reason.

#### Visuals

- Primary: revenue or volume Pareto with 80% reference.
- Secondary: delivered units versus revenue contribution portfolio.
- Evidence: feature-level priority table with product sparklines.

#### Acceptance criteria

- Revenue and volume modes remain separate.
- Top 5%, 10%, and 20% cohorts recalculate from the active scope.
- The output says `Demand Priority` while inventory and lead time are unavailable.
- `Dead stock` is replaced by `Slow-moving candidate` unless on-hand, age, and expiry exist.

### 7.4 Area Priority

#### Required outputs

- Regional-group revenue and selected-product quantity.
- Actual and estimated values.
- Revenue contribution.
- Demand growth.
- Active-period coverage.
- Buyer composition as a separate dimension.
- Mapping confidence.

#### Visuals

- Primary: stacked actual-versus-estimated horizontal ranking.
- Secondary: Pareto with cumulative share and 80% reference.
- Navigation: regional cards and total regional-group card.
- Evidence: geographic priority table.

#### Acceptance criteria

- Default charts use CALABARZON, MIMAROPA, Bicol, and Other National.
- Selecting a region changes charts and table to province/area detail.
- Regional cards and the total regional-group rollup remain fixed during drill-down.
- Selecting the total card returns charts to regional granularity.
- Unknown geography is reported separately and excluded from the mapped total.
- `Area` is used when province status is not verified.

### 7.5 Forecast Modeling

#### Required outputs

- Product-region identifier.
- Actual fulfilled demand.
- Forecast demand.
- Lower and upper interval.
- Forecast horizon.
- Training and evaluation periods.
- Seasonal-naive and last-observation baselines.
- MAE, RMSE, WAPE, sMAPE, bias, and interval coverage.
- Eligibility, champion, and review statuses.

#### Visuals

- Primary: actual-versus-forecast line with confidence band and cutoff.
- Secondary: baseline-versus-candidate error comparison.
- Supporting: backtest, residual, and forecast-horizon diagnostics.
- Evidence: model publication table.

#### Acceptance criteria

- Actuals are displayed beside predictions.
- Forecasting starts after the last observed period.
- Ineligible series show `Insufficient history`.
- No complex model is champion unless it consistently beats the baseline.
- DII and RSI remain challenger/context features until mapped and validated.
- External-signal findings use association language rather than causal claims.

### 7.6 Scenario Planning

#### Required inputs

- Forecast demand.
- Scenario on-hand stock.
- Reserved stock.
- Lead time and variability.
- Ordering and holding costs.
- Pack size and MOQ.
- Budget and capacity.
- Service-level target.
- Shelf-life or expiry assumption.

#### Required outputs

- Scenario available stock.
- Stock gap.
- EOQ.
- Safety stock.
- ROP.
- Budget and capacity utilization.
- Slow-moving exposure.
- Assumption summary and review status.

#### Visuals

- Primary: demand-to-stock waterfall or comparative bar view.
- Secondary: explicit scenario-input panel.
- Supporting: inventory-position timeline and constraint utilization.
- Evidence: draft planning ledger.

#### Acceptance criteria

- No operational value is silently generated from an arbitrary sales percentage.
- Historical demand may prefill only a clearly labeled reference.
- Every scenario result lists its assumptions and formula version.
- Actions are `Export Draft Plan` and `Submit for Review`, not procurement execution.

## 8. Data Story Writing Rules

Each chapter must generate three short statements:

1. **Observation** — what the filtered evidence shows.
2. **Interpretation** — why it matters for the decision.
3. **Boundary** — what cannot be concluded from the evidence.

Example:

```text
Observation: CALABARZON contributes the largest share of selected-product fulfilled demand.
Interpretation: Province-level review should begin with the highest-contributing CALABARZON areas.
Boundary: The ranking describes fulfilled sales and does not prove unmet demand or current stock risk.
```

Narratives must be computed from the same filtered response used by the charts. Do not maintain separate hardcoded findings.

## 9. Visual Standards

| Meaning | Visual treatment |
|---|---|
| Actual | Solid MedShield navy |
| Estimated | Light blue-gray with border or pattern |
| Forecast | Amber dashed line |
| Prediction interval | Transparent amber band |
| Official external observation | Dark green |
| Provider-derived proxy | Purple |
| Scenario input/output | Amber-accented and explicitly labeled |
| Missing/unavailable | Neutral gray or chart gap |
| Needs review | Soft amber status |
| Blocked/invalid | Soft red status |

Additional rules:

- Use bars for exact rank comparison.
- Use maps only as secondary geographic orientation after mapping approval.
- Avoid gauges, 3D charts, decorative animations, and unlabeled dual axes.
- Use a Pareto dual axis only when revenue and cumulative percentage are explicitly labeled.
- Keep labels at least 11 px and preserve keyboard focus.
- Reflow panels on laptop and mobile widths.
- Include empty, loading, stale, partial, blocked, and unavailable states.

## 10. API Work

### Endpoints or gateway views

1. Executive summary by filtered scope.
2. Monthly product-region demand and STL output.
3. Product-priority feature table and Pareto cohorts.
4. Regional rollup and area drill-down response.
5. Forecast run, actuals, predictions, intervals, and metrics.
6. External-signal validation and challenger comparison.
7. Scenario-input validation and scenario calculation.
8. Filtered transaction evidence and export.

### Validation

- Validate region, product, date, evidence, and horizon values.
- Enforce row limits and bounded periods.
- Reject incompatible quantity aggregation.
- Return null rather than zero for unknown values.
- Include request IDs and structured error codes.
- Fail closed when the production data contract is unavailable.

## 11. Frontend Work

1. Add a shared data-story chapter stepper.
2. Preserve filter state across chapters.
3. Add a shared evidence-status strip.
4. Build reusable KPI, chart header, evidence table, and limitation components.
5. Bind narrative sentences to filtered API results.
6. Implement the region-to-area drill-down contract.
7. Add chart and table empty/unavailable states.
8. Add actual/estimated/forecast/scenario legends consistently.
9. Add accessible descriptions for every chart.
10. Export only the filtered, correctly labeled result.

## 12. Analytics and Database Work

Required governed products:

```text
fact_monthly_product_region_demand
fact_product_region_features
fact_stl_decomposition
fact_product_priority
fact_regional_priority
fact_demand_forecast
fact_model_evaluation
fact_scenario_input
fact_scenario_result
```

Each must declare grain, dataset version, source endpoint, inclusion/exclusion policy, estimated-row policy, run ID, review status, and publication status.

## 13. Test Strategy

### Unit and analytical tests

- Quantity, revenue, margin, growth, CV, and continuity formulas.
- Monthly calendar states.
- STL and forecast eligibility.
- Regional and area reconciliation.
- Pareto and ABC thresholds.
- Forecast metrics and champion gates.
- Scenario formulas and required inputs.

### API tests

- Allowed and rejected filters.
- Null and missing behavior.
- Fail-closed upstream failure.
- Provenance metadata.
- Role and publication restrictions.

### Browser tests

- Chapter navigation and filter persistence.
- Monthly/yearly chart behavior.
- Regional default and province/area drill-down.
- Product Pareto mode and cohort changes.
- Actual-versus-forecast visibility.
- Ineligible forecast state.
- Scenario control recalculation.
- Keyboard access and responsive layouts.
- Filtered evidence-table and export reconciliation.

### Visual review

- No text or legend overlap at 1440, 1024, 768, and 375 px widths.
- Consistent colors for evidence classes.
- Missing values are not rendered as zero.
- Partial/YTD endpoints are visible.
- Illustrative or demonstration values cannot be mistaken for production evidence.

## 14. Delivery Phases

### Phase 1 — Prototype review

- Review the HTML prototype with the group and adviser.
- Approve chapter order, decision questions, and terminology.
- Record requested changes without treating prototype values as findings.

Exit: signed-off information architecture.

### Phase 2 — Shared contracts

- Freeze metric definitions and filters.
- Define API response metadata.
- Approve product and geographic mapping rules.

Exit: implementable data and API contracts.

### Phase 3 — Descriptive production integration

- Connect Overview, Sales Diagnostics, Product Priority, and Area Priority to published evidence.
- Reconcile charts and tables to the same filtered totals.

Exit: SO1 and SO2 evidence reproduced in the DSS.

### Phase 4 — Predictive integration

- Publish eligible baseline and candidate forecast runs.
- Connect actuals, intervals, metrics, and eligibility states.

Exit: SO3 evidence reproduced and baseline comparison visible.

### Phase 5 — Scenario planning integration

- Replace hardcoded operational values with validated scenario inputs.
- Persist assumptions, results, authorship, and review status.

Exit: SO4 is demonstrable without implying operational inventory evidence.

### Phase 6 — Chapter 4 and release evidence

- Capture final figures and tables from published runs.
- Complete the Section 4.5 objective-evidence matrix.
- Run analytical, API, UI, security, and accessibility checks.

Exit: SO5 and Chapter 4 use the same definitions and outputs as the released DSS.

## 15. Definition of Done

The production data story is complete when:

1. Every chapter answers its stated decision question.
2. Every visual maps to a capstone objective and published data contract.
3. Units, revenue, estimates, forecasts, proxies, and scenarios remain distinct.
4. The study regions and area drill-down reconcile.
5. STL and forecast eligibility gates are enforced.
6. Forecast actuals, uncertainty, baselines, and metrics are visible.
7. Missing operational data is never fabricated.
8. Scenario assumptions and human-review status are visible.
9. Filter state, narrative, KPI, chart, table, and export agree.
10. Automated checks and the manual narrative walkthrough pass.
11. Chapter 4 figures are generated from the same reviewed outputs.
12. The prototype disclaimer is removed only after every displayed value is backed by a published production source.
