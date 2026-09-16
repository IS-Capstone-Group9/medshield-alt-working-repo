# Year and chart anomaly audit

Approved scope: audit the Section 1–8 changes and correct confirmed analytical/UI defects, using 2017–2025 for actual sales. Changes are local on `medshield/ui_charts_needfixing`; this audit does not authorize another push.

## Findings and corrections

| Finding | Evidence and consequence | Correction |
|---|---|---|
| Initial year selection disagreed with chart state | Markup selected 2025 while runtime `selectedYear` initialized to `all`. A viewer could read multi-year results as 2025-only. | Runtime state now synchronizes the year controls when charts initialize and refresh. Empty in-range selections stay empty. |
| Monthly snapshot contained quarantined years | The bundled file has 115 monthly rows spanning 2000-01 to 2047-11, while its annual summary contains 2017–2025. The previous diagnostic year builder admitted 1900–2200, stretching All-years charts across 48 years. | Actual-date guards now apply at ingestion, snapshot service/gateway, chart normalization, heatmap/sector readers and forecast/regression/planning history. Forecast targets may extend beyond 2025. Raw files are preserved. |
| Monthly and yearly grouping could disagree | Snapshot generation used the delivery date for months but the separate `year` field for annual totals. Conflicting fields could put multiple delivery years in one annual bucket. | Both groups derive their calendar year from delivery date. A regression test uses a 2017 delivery with a stale 2025 year field. |
| Overview cards and caption were fixed text | Fixed ₱9.3M forecast, ±12.4% interval, May/November peak, Government territory and “2021–2025 / VALIDATED” language did not describe the selected evidence. | Overview cards now calculate selected revenue, workbook gross profit, weighted margin and observed-month coverage; caption lists selected years and reconciliation status. |
| Aggregate product charts appeared year-filterable | The source product/ABC totals have no year dimension. Changing the topbar could not filter them. | Hide the year control on Product Prioritization and disclose aggregate scope and date-range reconciliation requirements on these charts/tables. No fabricated annual split. |
| Competing snapshot loads | Embedded startup fetched the bundled file independently of the gateway/fallback loader, allowing an asynchronous overwrite of chart data. | The gateway loader owns initial snapshot selection and its fallback. |
| Legacy time views broadened empty scope | The retained decision-chart helper substituted all years if the chosen year had no rows and truncated data to 24 rows. | Empty selections stay empty; remove silent truncation and clear stale charts. These legacy canvases are absent from the revised territory page, so this is defensive maintenance, not a currently visible regression chart. |
| Mobile filter overflow | The 390px real-source browser check failed because the topbar controls extended past the viewport. | Wrap the header/filter controls; keep year selector visible. Give the wide growth evidence table horizontal scrolling instead of excessively narrow columns. |

## Source reconciliation

The bundled monthly rows outside scope are:

`2000-01, 2001-03, 2001-12, 2007-11, 2015-01, 2016-01, 2016-08, 2016-09, 2016-10, 2016-11, 2016-12, 2047-11`.

There are **103 observed months** within the **108 calendar months** from January 2017 through December 2025. The five unobserved months remain null gaps. Valid monthly revenue totals reconcile to each annual source total to centavo precision. The real-source browser test checks every plotted monthly value against its matching source period, as well as the 108-month display boundary. A separate nine-year fixture checks ordering with reversed input and distinct values for each year.

Re-running the Section 8 evidence generator after the guards still reconciles 19,047 product/month quantity groups between heatmap and sector outputs. The accepted observed allocated population remains 35,545 rows; those readers had already excluded outlier rows carrying upstream flags. The new checks also reject outliers when flags are missing.

## Verification

- 55 Python tests passed across financial definitions/reconciliation, ingestion, heatmap, sectors, forecasts, regression and planning.
- 16 isolated browser tests passed using the actual embedded runtime and Chart.js, including real bundled source data, year controls, missing months, units/category filters, horizon/error/export consistency, regression scope and solver result invalidation.
- Frontend and backend TypeScript no-emit checks passed. No production build ran alongside development services.
- Desktop and 390px chart captures: `frontend/test-results/year-audit-real-source.png` and `frontend/test-results/year-audit-real-source-mobile.png`. The mobile screenshot was inspected, its overflow defect corrected and the test rerun successfully. Screenshots show source-backed isolated rendering, not authenticated deployment acceptance.
- Source reconciliation artifact: `outputs/section8/year-audit-evidence.json`, generated with `python -m services.analytics_service.jobs.build_revision_evidence --as-of 2026-09-12 --output outputs/section8/year-audit-evidence.json`.

Commands for reproducing the full Python and browser suites are in [Section 8 acceptance evidence](SECTION_8_ACCEPTANCE_EVIDENCE.md); the expanded test files are included in the same commands.

## Remaining limits

Workbook gross profit can exceed revenue. The displayed margin preserves that source exception; this audit does not certify it or substitute guessed profit. Pre-aggregated product totals cannot prove a particular year or date boundary without a reconciled granular source. Private ownership, approved SKU mappings, weather station mapping and operational planning inputs remain the gates documented in Sections 4–8. Regression remains association, not causal proof.

Authenticated live acceptance still needs a valid provisioned sign-in. No raw-data files, credentials, warehouse publications or operational purchases were changed, and nothing from this audit was committed or pushed.
