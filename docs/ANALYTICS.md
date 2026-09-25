# Analytics

## Current Databricks-backed evidence

| Capability | Evidence source | Current interpretation |
|---|---|---|
| Annual and monthly sales | Gold yearly/monthly candidate views | Descriptive totals, trends, coverage, and YoY review |
| Area performance | Gold area-year candidate view and fact-derived mappings | Revenue/quantity ranking with mapped geographic and buyer dimensions |
| Product performance | Gold business-product-year candidate and sales fact | Revenue ranking and deterministic Pareto/ABC candidates |
| Transaction ledger | Gold sales fact | Filtered, paginated evidence with eligibility and lineage |
| Quantity heatmap | Gold sales fact | Observed delivered source units; missing periods stay explicit |
| Forecast validation | Gold sales fact | Seasonal-naive and last-observation baselines |
| Planning shortlist | Gold sales fact | Positive-revenue products from the latest observed history |
| Planning solve | Databricks shortlist plus user inputs | Reviewable scenario allocation; no purchase execution |
| PAGASA context | Gold external-signals candidate | Official supplied observations and mapping readiness |
| NASA POWER context | Gold NASA monthly candidate view | Separately labeled provider-derived weather proxy |

The browser never loads a local sales or weather snapshot. A Databricks contract failure produces an unavailable state.

## Analytical definitions

- **Demand:** observed delivered quantity in the source unit. Mixed packs are not equivalent units unless a canonical conversion is approved.
- **Revenue:** Net CP (`net_cost`) candidate measure.
- **Acquisition cost:** Total TP (`total_trade_price`) candidate measure.
- **Transaction gross margin/profit:** workbook `net_income`, subject to reconciliation; it is not company net profit.
- **ABC/Pareto:** deterministic cumulative revenue grouping within the selected scope. It is descriptive, not an XGBoost prediction.
- **Buyer sector/geography:** derived mappings whose evidence and confidence must remain visible.
- **Forecast:** baseline evaluation result unless an approved model version and validation record are published.
- **Planning recommendation:** scenario output from historical ranking plus entered assumptions.

## Predictive status

Sales-only seasonal-naive and last-observation methods are available for transparent baseline comparison. Final evaluation should use rolling-origin validation inside trusted 2017-2025 history and report MAE, RMSE, WAPE or sMAPE, and bias.

No 2026 MedShield sales actuals exist in the current Gold contract, so documentation must not describe 2026 as a holdout. Prophet, XGBoost, and external-regressor models remain design/evaluation candidates until their code, version, input dataset, validation metrics, and Databricks publication are verified.

DOH/PAGASA regression remains blocked until territory-month joins are approved. NASA POWER may be evaluated as a proxy feature, but it must first be aligned to approved territories and must demonstrate improvement over the sales-only baseline.

## Prescriptive status

The current solver supports planning scenarios and reports infeasible constraints. Databricks supplies historical ranking evidence; users supply operational assumptions. EOQ, ROP, safety stock, expiry, and stock-gap claims remain hypothetical until real inventory, lead-time, ordering-cost, holding-cost, supplier, service-level, and expiry data are published.

## Promotion sequence

1. Approve business definitions and mapping ownership.
2. Reconcile Bronze, Silver, Gold, bridge, and API totals.
3. Publish stable approved analytical views.
4. Freeze the dataset and descriptive KPIs.
5. Compare predictive candidates against baselines using time-aware validation.
6. Publish only accepted model outputs with provenance and limitations.
7. Evaluate prescriptive scenarios with real operational inputs when available.

See [CURRENT_STATE.md](CURRENT_STATE.md), [REQUIREMENTS.md](REQUIREMENTS.md), and [DESCRIPTIVE_PREDICTIVE_PRESCRIPTIVE_GUIDE.md](DESCRIPTIVE_PREDICTIVE_PRESCRIPTIVE_GUIDE.md).
