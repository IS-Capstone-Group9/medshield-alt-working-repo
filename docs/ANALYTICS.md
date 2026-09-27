# Analytics

Latest actual evaluation supersedes the initial blocked-training checkpoint:
all four benchmarks, two ETS and nine Prophet configurations executed against
user-attested complete 2020–2025 history. Last value remains selected on development
evidence; no challenger passes promotion criteria. Its 2025 retrospective-audit
WAPE is 37.76%, with high development error (83.20%). No model is activated and
intervals are unsupported. Full results and caveats:
`outputs/predictive_validation/2026-09-27T14-30-12-921Z/REVIEW.md`.

Predictive implementation (27 September): the live benchmark screen now uses
fixed-origin last-value, seasonal-naive and 3/6-month mean evidence with exact
common keys. The offline `services/analytics_service/predictive/` package includes
ETS/Prophet adapters, development-only selection and conservative lead-specific
interval support. The initial training block was superseded by user-attested
coverage acceptance; there is still no approved champion. The legacy offline
evaluator has dynamic years and no unsupported historical-error bands.
See [PREDICTIVE_OPERATIONS.md](PREDICTIVE_OPERATIONS.md).

## Current Databricks-backed evidence

| Capability | Evidence source | Current interpretation |
|---|---|---|
| Annual and monthly sales | Gold yearly/monthly candidate views | Descriptive totals, trends, coverage, and YoY review |
| Area performance | Gold area-year candidate view and fact-derived mappings | Revenue/quantity ranking with mapped geographic and buyer dimensions |
| Product performance | Gold business-product-year candidate and sales fact | Revenue ranking and deterministic Pareto/ABC candidates |
| Transaction ledger | Gold sales fact | Filtered, paginated evidence with eligibility and lineage |
| Quantity heatmap | Gold sales fact | Original-source, adjusted-source and independently verified units separated; missing periods stay explicit |
| Forecast validation | Gold sales fact | Seasonal-naive and last-observation baselines |
| Planning shortlist | Gold sales fact | Positive-revenue products from the latest observed history |
| Planning solve | Databricks shortlist plus user inputs | Reviewable scenario allocation; no purchase execution |
| PAGASA context | Gold external-signals candidate | Official supplied observations and mapping readiness |
| NASA POWER context | Gold NASA monthly candidate view | Separately labeled provider-derived weather proxy |

The browser never loads a local sales or weather snapshot. A Databricks contract failure produces an unavailable state.

## Analytical definitions

Implementation update (27 September 2026): missing months remain null; weighted
margin uses a shared margin-eligible revenue denominator; observed YoY excludes
gap estimates and compares common months for annual views. Product rankings use
source labels and rank positive eligible sales contribution; signed returns stay
separate and are included in net revenue. ABC/Pareto uses the full selected positive
sales denominator before cohort filtering, with 80/95% thresholds. Policy approval
remains pending. Clinical VEN,
surge multipliers and emergency-stock claims are not descriptive sales outputs.
The active product view exposes source-label cohorts and observed coverage.

`run_descriptive_stl.py` produces offline, checksum-bound STL components from a
live Databricks validation receipt; it is an audit tool, not a runtime fallback.
Deployed `06_sales_stl.py` now writes warehouse components, and `/api/seasonality/stl`
serves matching fact-version and mapping identities. The dashboard shows observed,
trend, seasonal and residual values for the qualifying 2020–2025 segment (72 months).
This full-history decomposition is explicitly independent of selected date filters.
The existing `/api/seasonality` is an observed calendar-month mean, not STL.
Use [CURRENT_STATE.md](CURRENT_STATE.md) for evidence and remaining release gates.

- **Demand:** observed delivered quantity in the source unit. Mixed packs are not equivalent units unless a canonical conversion is approved.
- **Revenue:** Net CP (`net_cost`) candidate measure.
- **Acquisition cost:** Total TP (`total_trade_price`) candidate measure.
- **Transaction gross margin/profit:** workbook `net_income`, subject to reconciliation; it is not company net profit.
- **ABC/Pareto:** deterministic cumulative positive-sales grouping within the selected scope. It is descriptive, not an XGBoost prediction.
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


## Catalog implementation prepared — 27 September 2026

[Product catalog contract](PRODUCT_CATALOG.md) defines independent category,
sellable identity, item kind and transaction evidence. Local deterministic rules,
Gold enrichment, stable-ID API/UI grouping, category filters and provenance-aware
quantity/export handling are implemented. The complete version-16 review includes
37,728 records and 4,561 labels; all remain unresolved because no approved master
entries were supplied. Category approval cannot approve SKU, quantity conversion,
forecasting or observed medical demand. Adjusted provenance remains file-level.

The [operator runbook](CATALOG_DEPLOYMENT.md) specifies catalog-only 03 → 04 → 05 →
06 → publication-readiness → descriptive/catalog validation, version-bound activation
and rollback. This is local preparation: no Databricks writes, release activation
or additional CEO decisions occurred. Databricks remains the sole analytical source.
