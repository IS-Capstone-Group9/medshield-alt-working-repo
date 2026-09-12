# Section 8 acceptance evidence — September 12, 2026

Status: reconciliation, regression verification and paper alignment delivered; authenticated acceptance remains open.

QA is the accountable role for this section. Implementation scope is the evidence generator, acceptance tests, planning gateway timeout and methodology/evidence documentation. No schema migration, source-data replacement, model publication or procurement action is included. Checks are self-review, not independent external review.

## Acceptance record

| Criterion | Observed result | Status |
|---|---|---|
| Granular heatmap and sector quantities reconcile | Exact product/month key coverage and numerically matching quantities across 19,047 groups | Pass |
| Excluded source rows reconcile | 42,165 input = 35,545 included + 6,620 excluded | Pass |
| Financial definitions and discrepancy disclosure | Unit/browser checks preserve workbook profit and weighted gross margin; separate ledger exception recorded below | Pass with source exception |
| Charts, filters and CSV use the same analytical scope | 13 isolated browser tests exercise actual Chart.js runtime, including Python-produced forecasts, regression and solved scenarios | Pass, isolated runtime |
| Solver satisfies constraints and service-then-cost objective | Python tests include independent exhaustive enumeration, infeasible cases, stock and integer-pack reconciliation | Pass |
| Upload behavior preserves other years | Temporary-directory pipeline tests verify year replacement without changing real source files | Pass, isolated ingestion |
| Revised routes and upload reject anonymous callers | Live gateway returns 401 for five GET routes and both POST routes | Pass |
| Authenticated frontend → gateway → analytics → chart/export | Services started; network restriction resolved; repository demo login then returned invalid credentials | Not verified; valid provisioned session needed |
| Live upload and refreshed chart state | Not attempted against the real source dataset; isolated pipeline and stale-source tests passed | Not verified live |
| Paper matches implemented methods | Chapter 3 model/metric claims corrected; Chapter 4/5 evidence linked | Pass for repository guides; final manuscript review remains |

## Reproduce the analytical evidence

From the repository root:

```powershell
python -m services.analytics_service.jobs.build_revision_evidence --as-of 2026-09-12 --output outputs/section8/revision-evidence.json
```

The JSON is a local artifact, not a publication. It records SHA-256 hashes of the allocated sales file and mapping/prepared-signal files, the dataset's own checksum, scoped metrics and unresolved release gates. File hashes and the dataset checksum describe different objects and need not match. The generator reads existing source files, asserts cross-module reconciliation and writes only its requested report. Prepared external data can be regenerated with `python -m services.analytics_service.jobs.prepare_regression_sources` when sources change.

The prepared regression JSON is currently untracked, not ignored. Review source-sharing permissions before including source-derived artifacts in a commit or paper appendix.

## Findings suitable for Chapter 5

| Scope | Finding | Interpretation |
|---|---|---|
| Accepted observed allocated sales | 7,544 Government rows; 28,001 Unknown; no approved Private rows | Unknown is not Private. An empty private chart does not mean private business is zero. |
| Heatmap | 4,483 raw product identities; 19,047 product-month groups reconcile to sector quantities | Product mappings and source units constrain category-level demand claims. Missing months are not zeros. |
| Government revenue, final 12-month holdout, nine paired observations | Seasonal-naive MAE ₱2,695,359.26 and WAPE 85.05%; last-value MAE ₱1,987,359.74 and WAPE 62.71% | The last-value benchmark is better on this specific comparison. Neither is certified for operations. |
| Government revenue forecast origin | December 2025; eight closed months stale as of September 12, 2026 | Future horizons start from the last observed month, not an invented current-month actual. |
| Unknown ownership / Quezon revenue, Dengue lag one month | Baseline MAE ₱118,915.72; augmented MAE ₱130,885.37 across 12 paired 2025 months | Adding this signal worsened MAE by approximately 10.07%; no causal or operational-improvement claim. |
| Unknown ownership / Quezon, January–December 2025 | Five of 85 positive-revenue raw identities account for 41.96% of positive-product revenue | Top 20% capped at five does not automatically cover 80% of revenue. |
| Separate financial ledger | 35,956 checked rows; 13,469 workbook-versus-derived profit mismatches; aggregate difference ₱172,449,135.25 | This is a different source population from the 35,545 observed allocated rows. Preserve the exception; do not certify workbook profit or compare denominators as identical. |

Actual stock, supplier prices and client-approved demand were not available. Solver tests use declared controlled assumptions; their allocations are not business recommendations. Regression uses final revised disease counts without historical release dates. PAGASA mapping and weather-history gates remain unresolved.

## Executed checks

50 Python tests passed:

```powershell
python -m unittest services.tests.test_prescriptive_planning services.tests.test_external_regression services.tests.test_forecast_validation services.tests.test_sales_sectors services.tests.test_sales_heatmap services.tests.test_metric_definitions services.tests.test_data_pipeline services.tests.test_financial_reconciliation
```

13 isolated browser cases plus the live gateway denial case passed. These cover diagnostic axis/year continuity, weighted margin, heatmap filters, ownership denominators, forecast horizons/error metrics/exports, regression coefficients and scope, scenario outputs/invalidation and mobile layouts. Authenticated tests were deliberately excluded from this passing count after the login failure. Run the isolated suite from `frontend`:

```powershell
npx playwright test e2e/prescriptive-planning.spec.ts e2e/external-regression.spec.ts e2e/forecast-validation.spec.ts e2e/sales-sectors.spec.ts e2e/sales-heatmap.spec.ts e2e/sales-diagnostics.spec.ts e2e/metric-definitions.spec.ts --workers=1
npx playwright test e2e/medshield-dashboard.spec.ts -g "Gateway rejects" --workers=1
```

Frontend `npx tsc --noEmit --incremental false` and backend `npx tsc --noEmit` passed. A production build was not run alongside the active Next development server. The planner gateway now allows 20 seconds for two bounded five-second optimizations plus source validation; the former eight-second timeout could abort a valid solve.

## Finish authenticated acceptance

Use a provisioned account in the existing Supabase configuration. The end-to-end test accepts `MEDSHIELD_E2E_USERNAME` and `MEDSHIELD_E2E_PASSWORD` through the local environment; never put credentials or session tokens in the evidence pack. No test account was provisioned and authentication was not bypassed.

Run `npx playwright test e2e/medshield-dashboard.spec.ts --workers=1` after valid credentials are available. Inspect sales, ownership, forecast/regression and planning pages; exercise product/category filters and horizon controls; compare downloads with the same scoped values; capture authenticated desktop/mobile screenshots. Test upload refresh using a disposable dataset environment before repeating against an approved business dataset. Record failures rather than treating isolated checks as live acceptance.

Before operational use, obtain client acceptance of the equal-product fulfillment objective and approved buyer/SKU mappings, usable/reserved stock, pack/MOQ policies, supplier prices/caps and demand for the chosen horizon. Review lead times, expiry and capacity requirements. These inputs are business dependencies, not values to infer from revenue.
