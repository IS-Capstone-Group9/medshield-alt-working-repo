# MedShield Decision-Support System Master Checklist

## Purpose

This document is the working quality, remediation, and optimization checklist for the MedShield Decision-Support System (DSS).

The goal is not to maximize the number of advanced models. The goal is to give MedShield trustworthy, explainable, and reviewable evidence for demand planning, product prioritization, territorial allocation, and inventory-risk decisions.

> **System goal:** Convert certified 2017–2025 pharmaceutical sales data and validated weather, disease, and inventory signals into traceable forecasts, product and territory priorities, and reviewed planning scenarios that help reduce stockouts, expiry losses, and poor stock allocation.

The checklist is ordered by dependency. Later stages must not be treated as production-ready until their earlier gates pass.

---

## P0 — Correct Misleading or Unsafe Behavior

These are release blockers.

- [ ] Replace `Live System Active` with an accurate status such as `Demo`, `Historical Data`, `Scenario`, or `Connected`.
- [ ] Remove claims that PAGASA or DOH confirms a current event unless an authoritative current feed supplied it.
- [ ] Replace `Create/Execute Purchase Order` with `Create Draft Plan` or `Submit for Review`.
- [ ] Remove simulated language such as `cryptographically committed` unless a real immutable audit mechanism exists.
- [ ] Remove hardcoded current-stock, disease-case, weather-alert, EOQ, and procurement values from normal production responses.
- [ ] Keep example data only in an explicitly marked demo or scenario dataset.
- [ ] Rename `ai_confidence` in the keyword classifier to `rule_match_score` or `provisional_confidence`.
- [ ] Stop presenting the current external-regressor model as the champion.
- [ ] Mark models with extreme errors, incomplete inputs, or `NaN` metrics as `rejected` or `experimental`.
- [ ] Label every dashboard value as `actual`, `estimated`, `proxy`, `forecast`, `scenario`, `demo`, or `official`.
- [ ] Remove company `net profit` wording; use workbook gross margin/profit.
- [ ] Prevent fallback data from silently appearing as real warehouse or model output.

### Completion Evidence

- [ ] No unsupported live, clinical, procurement, or official-source claims remain.
- [ ] Demo values cannot be confused with validated outputs.
- [ ] Normal users cannot execute purchasing actions.

---

## P1 — Establish One Certified 2017–2025 Dataset

This is the most important workstream.

- [ ] Reconcile the 44,948 raw audit rows with the 40,781 pipeline-extracted rows.
- [ ] Explain every removed, deduplicated, carried-over, or rejected row.
- [ ] Resolve the approximately 4,857 2018-dated rows inside the 2019 source.
- [ ] Quarantine the 3,807 2017 `#REF!` product records.
- [ ] Review missing and unitemized product rows.
- [ ] Separate transaction rows from subtotal, summary, contract, and accounting rows.
- [ ] Remove or repair periods outside 2017–2025.
- [ ] Regenerate the fallback snapshot so it contains no 2000–2016 or 2026–2047 periods.
- [ ] Verify that every accepted record has a valid source year, delivery date, area, and product.
- [ ] Decide whether warning rows can enter each analytical mart.
- [ ] Define trust grades by year: `certified`, `usable_with_limitations`, or `excluded`.
- [ ] Confirm whether the missing January and February 2018 periods are genuine source gaps.
- [ ] Validate monthly coverage for every year.
- [ ] Record the source file hash, ingestion run, transformation version, and row counts.
- [ ] Create a versioned dataset manifest such as `sales_2017_2025_v1`.
- [ ] Require formal reviewer approval before the dataset becomes `published`.

### Reconciliation Gate

```text
raw rows
= accepted rows
+ rejected rows
+ explicitly removed duplicates/carryovers
```

All differences must be reproducible and documented.

---

## P2 — Repair Financial Metric Integrity

Current gross-margin outputs are not yet defensible.

- [ ] Verify header mappings separately for every yearly source format.
- [ ] Confirm the business meaning of `total_trade_price`, `net_cost`, `total_cost`, and `net_income`.
- [ ] Use `total_trade_price` as revenue only after reconciliation.
- [ ] Calculate the trusted derived field `gross_margin = revenue - net_cost`.
- [ ] Compare derived gross margin against the workbook `net_income`.
- [ ] Quarantine rows where the difference exceeds an approved tolerance.
- [ ] Investigate why 26,768 rows have workbook gross margin greater than revenue.
- [ ] Do not derive margin percentage as `net_income / net_cost` if the approved definition is margin on revenue.
- [ ] Approve one formula for gross-margin percentage.
- [ ] Separate zero-value transactions, free issues, returns, credits, and accounting adjustments.
- [ ] Reconcile annual revenue, cost, and margin to finance-approved control totals.
- [ ] Add financial-quality flags to dashboard calculations.
- [ ] Prevent anomalous rows from affecting executive profitability KPIs.

### Completion Evidence

- [ ] Revenue, cost, and gross margin reconcile by year.
- [ ] No dashboard KPI implies impossible profitability.
- [ ] A finance or business owner has approved the definitions.

---

## P3 — Build Governed Master Data

### Product Master

- [ ] Create canonical SKU IDs.
- [ ] Map spelling, strength, dosage, pack-size, and brand aliases.
- [ ] Separate contract labels from actual products.
- [ ] Classify products as pharmaceutical, medical supply, equipment, office supply, or other.
- [ ] Add generic name, brand name, dosage form, strength, and pack size.
- [ ] Add therapeutic category.
- [ ] Add forecast-eligibility status.
- [ ] Add essential or emergency medicine status where approved.
- [ ] Add mapping confidence and reviewer status.
- [ ] Require clinical or pharmacy review for therapeutic mappings.

### Area and Customer Master

- [ ] Separate geographic territory from customer/channel and business line.
- [ ] Stop treating Government, Hospital, Admin, Equipment, and Supplies as territories.
- [ ] Create canonical territory IDs.
- [ ] Create a separate customer or account identifier when data becomes available.
- [ ] Create controlled customer types such as government, hospital, and commercial.
- [ ] Define the approved bridge between territories and weather/disease geography.
- [ ] Publish unmapped-value reports.

### Completion Evidence

- [ ] Every published analytical row maps to an approved SKU and analytical area type.
- [ ] Medical-demand models contain no shirts, office supplies, equipment, or contract names.

---

## P4 — Separate Analytical Datasets

Create explicit marts instead of one mixed dataset.

- [ ] All-business sales mart.
- [ ] Medical/pharmaceutical demand mart.
- [ ] Non-medical exclusion mart.
- [ ] Geographic territory mart.
- [ ] Customer/channel sales mart.
- [ ] Monthly company-demand mart.
- [ ] Monthly SKU-demand mart.
- [ ] Monthly territory-demand mart.
- [ ] Monthly SKU-territory mart.
- [ ] Contract-allocation estimate mart.
- [ ] Data-quality exception mart.
- [ ] Financial reconciliation mart.
- [ ] External-signal mart.
- [ ] Inventory snapshot mart when data becomes available.

Every mart must declare:

- [ ] Grain.
- [ ] Source dataset version.
- [ ] Inclusion rules.
- [ ] Exclusion rules.
- [ ] Estimated-row policy.
- [ ] Refresh date.
- [ ] Owner.
- [ ] Certification status.

---

## P5 — Strengthen Descriptive Analytics

- [ ] Regenerate every descriptive output from certified marts.
- [ ] Show units, revenue, and gross margin separately.
- [ ] Provide annual and monthly trends from 2017–2025.
- [ ] Dynamically populate year filters from available data.
- [ ] Support any single-year and valid Y/Y comparison.
- [ ] Clearly label incomplete periods.
- [ ] Add pandemic versus post-pandemic comparisons.
- [ ] Compute revenue-based and demand-unit-based ABC separately.
- [ ] Add product concentration and territory concentration.
- [ ] Segment stable, seasonal, intermittent, declining, new, and dormant products.
- [ ] Run STL only on sufficiently complete series.
- [ ] Add outlier and structural-break detection.
- [ ] Show actual versus backward-allocated contract values.
- [ ] Add drill-down from KPI to chart to underlying records.
- [ ] Give every chart a decision question and interpretation.
- [ ] Remove charts that do not support a specific decision.

### Required Decision Questions

- [ ] Which products drive most demand and revenue?
- [ ] Which territories are growing or declining?
- [ ] Which periods exhibit reliable seasonality?
- [ ] Which SKUs have intermittent demand?
- [ ] Which results depend heavily on estimated allocations?
- [ ] Which years are unsafe for comparison?

---

## P6 — Rebuild Predictive Analytics Correctly

- [ ] Define the forecast target: units, revenue, or both as separate models.
- [ ] Define the planning horizon.
- [ ] Establish forecast eligibility by series.
- [ ] Use time-based splits and never random train/test splits for forecasting.
- [ ] Implement rolling-origin cross-validation.
- [ ] Retain seasonal naive as the mandatory baseline.
- [ ] Compare Holt-Winters, SARIMA, Prophet, and appropriate machine-learning candidates.
- [ ] Use intermittent-demand methods for sparse SKUs.
- [ ] Use hierarchical forecasts when product-level history is insufficient.
- [ ] Evaluate company, category, territory, and eligible SKU levels separately.
- [ ] Report MAE, RMSE, WAPE, sMAPE, bias, and interval coverage.
- [ ] Avoid relying on MAPE where actual values approach zero.
- [ ] Add prediction intervals.
- [ ] Reject models that do not outperform the baseline.
- [ ] Keep external-regressor models as challengers until proven.
- [ ] Check for data leakage in lag and external-signal features.
- [ ] Store model version, features, train period, test period, metrics, and limitations.
- [ ] Publish only reviewed models.
- [ ] Add drift detection and scheduled re-evaluation.

### Model Promotion Gate

A complex model may become champion only if it:

1. Passes data-quality gates.
2. Beats the simple baseline.
3. Has acceptable bias.
4. Has stable performance across folds.
5. Produces explainable results.

---

## P7 — Integrate Disease and Weather Responsibly

- [ ] Acquire and retain actual DOH source files.
- [ ] Acquire and retain official PAGASA historical files.
- [ ] Store raw external files unchanged.
- [ ] Record provider, extract date, period, geography, units, and checksum.
- [ ] Keep official observations separate from provider-derived proxies.
- [ ] Never fill missing PAGASA values under the PAGASA name using NASA POWER or Open-Meteo.
- [ ] Map external geography only to approved geographic territories.
- [ ] Validate temporal and geographic coverage before joining.
- [ ] Test lag relationships without future leakage.
- [ ] Measure whether external signals improve the sales-only baseline.
- [ ] Keep external signals contextual if they do not improve forecasts.
- [ ] Display stale and unavailable states.
- [ ] Use historical disease/weather data for scenarios and backtesting.
- [ ] Use live alert wording only when an authoritative current feed supplies it.

---

## P8 — Build Useful Prescriptive Decision Support

### Safe Capabilities Now

- [ ] Demand-priority rankings.
- [ ] Commercial-priority MCDA.
- [ ] Scenario EOQ, ROP, and safety stock.
- [ ] Product-territory opportunity candidates.
- [ ] Slow-moving sales candidates.
- [ ] Exportable draft planning schedules.
- [ ] Planner comments and review statuses.
- [ ] Sensitivity analysis.

### Data Needed for Operational Recommendations

- [ ] Current on-hand inventory.
- [ ] Committed and available stock.
- [ ] Open purchase orders.
- [ ] Supplier lead-time history.
- [ ] Ordering cost.
- [ ] Holding and expiry cost.
- [ ] Supplier MOQ and pack size.
- [ ] Batch and expiry dates.
- [ ] Warehouse capacity.
- [ ] Procurement budget.
- [ ] Desired service levels.
- [ ] Product substitutability and criticality.

### Required Wording Until Operational Data Exists

- [ ] Call outputs scenarios, not purchase instructions.
- [ ] Use `demand priority`, not `inventory urgency`.
- [ ] Use `slow-moving candidate`, not `dead stock`.
- [ ] Use `draft replenishment plan`, not `authorized procurement`.

---

## P9 — Improve Dashboard Decision Usability

- [ ] Add a persistent data-status banner.
- [ ] Display dataset version and last refresh.
- [ ] Show whether the source is warehouse, local fallback, or demo.
- [ ] Make year selectors fully dynamic for 2017–2025 and future datasets.
- [ ] Use dropdowns for single-year and Y/Y comparisons.
- [ ] Add data-quality and model-readiness pages.
- [ ] Display assumptions beside scenario outputs.
- [ ] Display baseline comparison beside forecasts.
- [ ] Add reason text to every priority or recommendation.
- [ ] Provide loading, empty, stale, unavailable, and error states.
- [ ] Prevent unavailable model tables from displaying fabricated examples.
- [ ] Make drill-downs traceable to underlying transactions.
- [ ] Add accessible keyboard and focus behavior.
- [ ] Keep mobile and laptop layouts usable.
- [ ] Use plain business wording.
- [ ] Export only the currently filtered, correctly labeled result.

---

## P10 — Architecture and API Optimization

- [ ] Make the warehouse or certified local snapshot the single source of truth.
- [ ] Remove duplicated hardcoded business data across frontend and Python services.
- [ ] Have APIs return data-status metadata with every analytical response.
- [ ] Validate requested years against the dataset rather than fixed arrays.
- [ ] Ensure the dashboard never trains models synchronously.
- [ ] Run model jobs asynchronously or through controlled administrative commands.
- [ ] Store generated outputs before serving them.
- [ ] Serve normal users only published outputs.
- [ ] Add idempotent model-run and ingestion identifiers.
- [ ] Keep last-known-good published outputs when a new run fails.
- [ ] Add database indexes for period, SKU, territory, model run, and publication status.
- [ ] Add API timeouts, rate limits, structured errors, and request IDs.
- [ ] Make fallback usage visible rather than silent.
- [ ] Version API contracts where breaking changes occur.

---

## P11 — Security and Governance

- [ ] Restore or intentionally replace the deleted `.env.example`.
- [ ] Rotate any previously exposed keys.
- [ ] Replace the shared demo password before deployment.
- [ ] Enforce RBAC for viewer, analyst, planner, approver, and administrator.
- [ ] Apply least privilege to Supabase and service accounts.
- [ ] Keep service-role and external API keys server-side.
- [ ] Enforce tenant or organization row-level security if multi-tenant.
- [ ] Validate upload type, structure, size, and row count.
- [ ] Scan uploads and quarantine malformed files.
- [ ] Persist audit logs server-side.
- [ ] Record login, upload, model run, publication, approval, and export events.
- [ ] Do not log tokens, credentials, or sensitive payloads.
- [ ] Require a separate approver for operational recommendations.
- [ ] Define retention and backup policies.
- [ ] Test unauthorized and privilege-escalation paths.

---

## P12 — Testing and Analytical QA

The E2E tests verify system behavior, but analytical truth requires dedicated tests.

- [ ] Unit-test cleaning rules.
- [ ] Test every yearly header mapping.
- [ ] Test year-range rejection.
- [ ] Test cross-file deduplication.
- [ ] Test financial reconciliation.
- [ ] Test product and area mapping coverage.
- [ ] Test analytical mart grains.
- [ ] Test for future leakage.
- [ ] Test forecast metrics independently.
- [ ] Test champion-promotion rules.
- [ ] Test scenario formulas against known examples.
- [ ] Test that demo outputs cannot appear as official.
- [ ] Test that normal users receive only published outputs.
- [ ] Test fallback-status visibility.
- [ ] Test all 2017–2025 filters and Y/Y pairs.
- [ ] Add visual regression coverage for important dashboard screens.
- [ ] Add load tests for large uploads and analytical queries.
- [ ] Run frontend build, backend build, service tests, and E2E tests in CI.
- [ ] Add a release-blocking analytical-quality gate.

---

## P13 — Outcome Measurement

A DSS is valuable only if recommendations improve decisions.

- [ ] Record whether a recommendation was accepted, modified, or rejected.
- [ ] Record the planner's reason.
- [ ] Capture actual demand after the forecast.
- [ ] Capture stockouts, fill rate, expiry losses, and excess inventory.
- [ ] Measure forecast bias and Forecast Value Added.
- [ ] Measure recommendation adoption.
- [ ] Measure inventory days and service level.
- [ ] Compare planned versus actual allocations.
- [ ] Review false alerts and missed events.
- [ ] Feed outcomes back into model evaluation.

### Recommended Business KPIs

- [ ] Forecast WAPE and bias.
- [ ] Product and service fill rate.
- [ ] Stockout frequency.
- [ ] Expiry or write-off value.
- [ ] Excess-stock value.
- [ ] Inventory days.
- [ ] Demand-priority precision.
- [ ] Recommendation adoption rate.
- [ ] Planner override rate.
- [ ] Time required to prepare a monthly plan.

---

## P14 — Capstone Documentation Alignment

- [ ] Update the official scope to 2017–2025 sales.
- [ ] Clearly distinguish legacy-quality years from certified years.
- [ ] Update all remaining 2021–2025-only service metadata.
- [ ] Remove unsupported claims from the paper and defense materials.
- [ ] Use one row count and dataset version consistently.
- [ ] Use one approved set of financial definitions.
- [ ] Document the medical/non-medical split.
- [ ] Explain the champion-challenger methodology.
- [ ] Report failed models as findings rather than hiding them.
- [ ] Document why external signals were promoted or rejected.
- [ ] Separate implemented, scenario, planned, and blocked features.
- [ ] Generate Chapter 4 evidence from the final certified run.
- [ ] Base Chapter 5 conclusions only on reproduced results.

---

## Recommended Execution Order

```text
1. Correct unsupported claims and hardcoded outputs
2. Certify the 2017–2025 dataset
3. Repair financial metrics
4. Approve product and area masters
5. Build certified analytical marts
6. Rebuild descriptive analytics
7. Rebuild and validate forecasts
8. Integrate real DOH/PAGASA sources
9. Add inventory and procurement inputs
10. Promote scenarios into reviewed operational recommendations
11. Capture outcomes and continuously evaluate value
```

---

## First Implementation Milestone

### Certified 2017–2025 Analytics Foundation

The first milestone is complete when:

- [ ] One reconciled dataset exists.
- [ ] No out-of-range dashboard periods exist.
- [ ] Financial formulas and field mappings are correct.
- [ ] Medical and non-medical records are separated.
- [ ] Area types are approved.
- [ ] Year filters dynamically support 2017–2025.
- [ ] No hardcoded output is presented as actual.
- [ ] Descriptive analytics have been rebuilt.
- [ ] A dataset certification report has been approved.

---

## Overall Definition of Done

MedShield is ready for serious decision-support use when:

- [ ] Every displayed value has a trusted source and dataset version.
- [ ] Every product and area is correctly classified.
- [ ] Financial metrics reconcile.
- [ ] Forecasts beat an approved baseline.
- [ ] Model limitations and status are visible.
- [ ] Scenario assumptions are explicit.
- [ ] No fabricated value appears as actual.
- [ ] No purchasing action occurs without human approval.
- [ ] Security, builds, tests, and analytical quality gates pass.
- [ ] Actual decision outcomes are measured.
- [ ] The dashboard, API, database, model outputs, and capstone paper use the same definitions.

