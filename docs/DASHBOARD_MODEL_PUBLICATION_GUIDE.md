# Dashboard Model Publication Guide

## Purpose

This guide keeps the MedShield dashboard aligned with the capstone scope: historical decision support, not live disease surveillance, official PAGASA alerting, or automated procurement.

## Dashboard Standard

The dashboard should prioritize charts, model status, and decision tables. Explanatory text must stay short so users can distinguish the Power BI-style visuals from supporting notes.

Use these labels consistently:

| Label | Meaning | Dashboard Use |
|---|---|---|
| Actual | Historical source-derived values | Cleaned sales, territory summaries, ABC/Pareto outputs |
| Estimated | Documented allocation or approximation | Contract-name backward allocation rows |
| Draft | Computed locally but not formally reviewed | Sales-only baseline forecast and product priority evidence |
| Proxy | Provider-derived contextual signal | Weather API observations by latitude/longitude |
| Official | Source-issued historical record | Uploaded PAGASA or DOH files only |
| Scenario | Formula or assumption-based output | EOQ, ROP, safety stock, allocation, alert examples |
| Blocked | Not computable from the current workspace | DOH/PAGASA challenger models, real inventory optimization |

## Current Publication Status

| Output Area | Status | Reason |
|---|---|---|
| Cleaned sales dashboard | Actual | Built from accepted 2017 onwards sales rows. |
| Contract-name breakdown | Estimated | Totals reconcile, but child rows are backward approximations. |
| ABC/Pareto product priority | Draft | Suitable for Chapter 4 evidence after group review. |
| Sales-only forecast baseline | Draft | External regressors and final review are still pending. |
| Weather API validation | Proxy | Weather API rows are not official PAGASA observations. |
| DOH disease-adjusted model | Blocked | DOH historical dataset has not been uploaded yet. |
| PAGASA reference validation | Blocked | PAGASA historical dataset has not been uploaded yet. |
| EOQ/ROP/allocation | Scenario | Inventory, lead time, ordering cost, holding cost, budget, and capacity inputs are unavailable. |

## UI Simplification Rules

1. Put model status in compact badges or short status cards.
2. Keep long methodology explanations in documentation, not inside the dashboard.
3. Show one decision question per chart or table.
4. Label workbook `net_income` as gross profit or gross margin/profit unless expense data exists.
5. Do not show blocked models as active recommendations.
6. Keep actual, estimated, forecast, proxy, official, scenario, and blocked outputs visually distinct.

## Chapter 4 Evidence Use

Use screenshots from the simplified dashboard to support:

- cleaned sales readiness,
- historical demand and gross profit trends,
- product and area prioritization,
- baseline forecast evidence,
- weather API validation status,
- blocked model limitations.

Do not claim final disease-adjusted or official PAGASA-adjusted forecasting until those datasets are uploaded and validated.
