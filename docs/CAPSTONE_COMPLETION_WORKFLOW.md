# MedShield Capstone Completion Workflow

## Positioning

The capstone should be completed as a historical decision-support system. The available external data is historical:

- PAGASA: 2021-2024 only.
- DOH: 2021-2025.
- Weather API: provider-derived weather observations by latitude and longitude for target regions.

This means the final system can support historical analysis, forecast evaluation, scenario planning, and management review. It should not claim live disease surveillance, official live PAGASA alerts, or automated procurement execution.

## Standard Workflow

### Phase 1 - Lock Scope and Definitions

1. Approve the business glossary.
2. Define demand, revenue, gross margin/profit, SKU, territory, customer type, business line, forecast horizon, and ABC thresholds.
3. Revise Chapter 1 scope and limitations around historical-only data.

Deliverables:

- Approved definitions.
- Updated Chapter 1 scope and limitations.
- Dashboard label rules.

### Phase 2 - Fix and Conform Data

1. Reconcile 2021-2025 sales files.
2. Decide how to treat incomplete 2025 months.
3. Review rejected rows and date issues.
4. Use contract-name backward allocation for product-level analysis.
5. Approve product and area mappings.

Deliverables:

- Reconciliation report.
- 2025 completeness decision.
- Product master mapping.
- Area classification mapping.
- Adjusted analytical sales dataset.

### Phase 3 - Build Analytical Marts

1. Build monthly company demand.
2. Build monthly territory demand.
3. Build monthly product demand.
4. Build monthly product-territory demand.
5. Build product feature snapshots.

Deliverables:

- Reproducible mart files or database views.
- Grain tests.
- Totals reconciliation.

### Phase 4 - Descriptive Analytics

1. Run rule-based encoding.
2. Run STL seasonality.
3. Run Pareto / 80-20.
4. Run actual ABC classification.
5. Run YoY growth.
6. Run territory and customer-type summaries.

Deliverables:

- Descriptive output tables.
- Dashboard charts.
- Interpretation notes for Chapter 4 and Chapter 5.

### Phase 5 - Baseline Forecast

1. Prepare time-based train/evaluation splits.
2. Run simple benchmarks.
3. Run sales-only Prophet or selected time-series model.
4. Evaluate using MAE, RMSE, MAPE or WAPE/sMAPE, and bias.
5. Decide champion model.

Deliverables:

- Baseline forecast.
- Benchmark comparison.
- Forecast evaluation table.
- Forecast limitations.

### Phase 6 - Weather Analysis

1. Load PAGASA 2021-2024 as official historical reference.
2. Load weather API observations by target-region coordinates as provider weather proxy.
3. Build weather features by territory and month.
4. Compare provider weather data and document source differences.
5. Test weather-adjusted forecast against the sales-only baseline.

Deliverables:

- Weather feature table.
- Weather-source provenance notes.
- Weather-adjusted forecast comparison.
- Decision on whether weather improves the forecast.

### Phase 7 - Disease Analysis

1. Load DOH 2021-2025 historical data.
2. Create disease intensity features.
3. Map disease signals to product categories where defensible.
4. Test disease-adjusted scenarios or historical regressors.
5. Document that live disease alerts are out of scope unless current feeds exist.

Deliverables:

- Disease feature table.
- Disease scenario analysis.
- Disease-adjusted forecast comparison if data quality supports it.

### Phase 8 - Product Prioritization

1. Use actual ABC for established SKUs.
2. Define demand-priority target.
3. Build product features from demand, growth, margin, ABC, seasonality, and historical external signals.
4. Train or score product priority.
5. Label output as demand priority unless inventory data exists.

Deliverables:

- Product priority table.
- Feature explanation.
- Priority limitations.

### Phase 9 - Scenario Prescriptive Analytics

1. Build commercial-priority MCDA.
2. Build product-region matching.
3. Build EOQ/ROP/safety-stock formula demos only if assumptions are approved.
4. Avoid real allocation optimization unless inventory, budget, capacity, and stock constraints exist.

Deliverables:

- Scenario recommendation tables.
- Visible assumptions.
- Human review status.

### Phase 10 - Publish and Validate

1. Store outputs in DSS tables or local processed artifacts.
2. Expose outputs through Python services and TypeScript gateway.
3. Display outputs in dashboard with source, status, metric, and limitation labels.
4. Run QA checks.
5. Capture screenshots and evidence for Chapter 4.

Deliverables:

- Working dashboard.
- API output samples.
- QA checklist.
- Screenshots.

### Phase 11 - Write Chapters 4 and 5

Chapter 4 should explain the implemented system, data pipeline, analytics outputs, dashboard, and validation.

Chapter 5 should explain findings, limitations, conclusions, recommendations, and future work.

Deliverables:

- Chapter 4 implementation.
- Chapter 5 findings and recommendations.
- Final limitations aligned to historical data coverage.

## Things Still Needed

### Must Have

1. Approved business glossary.
2. Final decision on 2025 incomplete months.
3. Approved product/SKU alias mapping.
4. Approved area/customer/business-line mapping.
5. Analytical marts.
6. Descriptive analytics outputs.
7. Baseline forecast and benchmark metrics.
8. PAGASA 2021-2024 historical integration.
9. Weather API proxy integration.
10. DOH 2021-2025 historical integration.
11. Dashboard labels for actual, estimated, forecast, proxy, scenario, and official data.
12. Chapter 1-3 revisions.
13. Chapter 4 and 5 writing.

### Nice To Have

1. XGBoost demand-priority model.
2. Weather-adjusted champion model if it beats baseline.
3. Disease-adjusted scenario model if DOH mapping is strong enough.
4. MCDA regional prioritization.
5. Product-region matching.
6. Scenario EOQ/ROP/safety-stock tables.

### Blocked Unless New Data Exists

1. True inventory urgency.
2. Real EOQ based on actual ordering and holding costs.
3. Real ROP based on current stock and supplier lead times.
4. Real linear programming allocation.
5. Confirmed dead-stock flag.
6. Live disease alert.
7. Official live PAGASA alert.

## Recommended Final Claim

Use this framing in the paper and defense:

> The system is a historical analytics-driven decision-support system for pharmaceutical demand forecasting and planning. It integrates 2021-2025 sales data, 2021-2025 DOH historical disease data, 2021-2024 PAGASA historical data, and provider-derived weather API observations to support descriptive analysis, forecast comparison, product prioritization, and scenario-based planning. It does not automate procurement or claim live official disease or weather alerts.
