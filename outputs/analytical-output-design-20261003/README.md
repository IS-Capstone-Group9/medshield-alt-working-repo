# Analytical output design — 3 October 2026

Status: done. Accountable role: Frontend Engineer; BI presentation and independent frontend review supported the implementation.

The user authorized the proposed analytical design improvements. Existing working-tree changes were inspected and preserved. No project services were listening on 3000/5000 before verification; the local gateway and Next development server were started for the live checks. No frontend build ran alongside development. This pass changed presentation and frontend result summaries; backend contracts, warehouse data, approvals, model releases and purchase execution were not changed.

## Delivered behavior

- **Overview:** observed sales, complete observed gross profit, matched-period growth and observed-month coverage lead the page. Publication status is a compact strip. A data-derived finding and review cue explain the selection. Growth requires a bounded period, uses paired observations, excludes estimates and the open current month, and withholds percentages for nonpositive prior sales. Missing profit does not become zero.
- **Sales Diagnostics:** Sales Trend, Growth, Quantities and Seasonality are selectable panels under the shared filters. Selection survives filter refreshes. Keyboard arrows/Home/End switch tabs; reopened charts resize. STL retains its explicitly independent full qualifying history.
- **Products:** the ranking sits beside stacked ABC counts and class shares. The finding uses the complete selected population before cohort filtering. Business columns appear first; identities, aliases, packaging, provenance and lineage are expandable. Complete CSV evidence remains available.
- **Areas:** mapped and unmapped net sales precede the rankings. Revenue coverage and actual source-row mapping have separate denominators. Missing amounts, signed negative components and nonpositive totals withhold the revenue percentage. Region-filtered scope is disclosed. Buyer ownership remains distinct from geography.
- **Forecast:** historical validation/publication status, a data-derived finding, scope, units and review cues precede the results; methods and source details are expandable.
- **Planning:** outputs consistently say scenario. Unsolved KPI values are “Not solved”; expiry is unavailable. Returned allocations determine solved values. Editing assumptions clears/hides the stale result and disables its export. Presets are disclosed examples, preserve existing zero entries, and clearing budget does not silently restore a default.

Example: source sales of ₱300 plus an unavailable month retain an observed-sales KPI of ₱300. The unavailable month is counted in coverage; any chart gap estimate is disclosed separately. A prior-year total of zero or less produces no growth percentage. Planning shows no calculated fulfillment result before an allocation exists.

## Verification

45 distinct browser checks passed across the focused suites, including the live traversal; four pre-existing superseded legacy tests remain skipped. Frontend TypeScript no-emit and `git diff --check` passed. The planning fixture verifies frontend rendering against returned solver values; it uses the repository's local Python fixture, not a claim of live production optimization.

| Acceptance | Result | Evidence |
|---|---|---|
| Correct observed/estimated/missing/zero/negative semantics | Pass | `descriptive-chart-integrity.spec.ts` (9), `descriptive-chart-layout.spec.ts` (8), `overview-evidence.spec.ts` (9) |
| Shared Sales scope, keyboard navigation and reopened chart dimensions | Pass | Overview evidence keyboard test; four Sales panels at 1440, 926 and 375px |
| Product business/evidence presentation and complete CSV | Pass | `product-prioritization.spec.ts` (4), `catalog-resolution.spec.ts` (2) |
| Quantity, matched growth and CSV parity | Pass | `sales-heatmap.spec.ts` (1), active `sales-diagnostics.spec.ts` checks (6) |
| Forecast evidence/status/results/export | Pass | `forecast-validation.spec.ts` (4) |
| Planning unsolved/solved/invalidation/infeasible and export states | Pass | `prescriptive-planning.spec.ts` (1), including preservation of entered zero demand |
| All nine tabs fit desktop/tablet/mobile without runtime errors | Pass | `dashboard-chart-live.spec.ts` (1); [live-layout.json](live-layout.json): 27 page/width states, `runtimeErrors: []` |
| Code consistency | Pass | `tsc --noEmit --incremental false`; `git diff --check`; serialized runtime parsing |

The first live attempt did not complete the source loading gate within 90 seconds. Readiness was checked again with request diagnostics; subsequent authenticated runs completed successfully with real Databricks data. The final screenshots start at the top of each page; scrolling screenshots were replaced to avoid capturing the fixed header midway through the image.

Checks ran from `frontend` with `node_modules/.bin/playwright.cmd test <suite paths> --workers=1`. After correcting stale UI test expectations (compact axis labels and moving the product label from title to scope text), the affected checks were rerun successfully. Type checks used `node_modules/.bin/tsc.cmd --noEmit --incremental false`.

## Screenshots

| Page | Desktop | Mobile |
|---|---|---|
| Overview | [1440px](overview-1440.png) | [375px](overview-375.png) |
| Sales Trend | [1440px](revenue-1440.png) | [375px](revenue-375.png) |
| Growth | [1440px](revenue-growth-1440.png) | [375px](revenue-growth-375.png) |
| Quantities | [1440px](revenue-quantities-1440.png) | [375px](revenue-quantities-375.png) |
| Seasonality | [1440px](revenue-seasonality-1440.png) | [375px](revenue-seasonality-375.png) |
| Products | [1440px](products-1440.png) | [375px](products-375.png) |
| Areas | [1440px](territory-1440.png) | [375px](territory-375.png) |
| Forecast | [1440px](forecast-1440.png) | [375px](forecast-375.png) |
| Planning | [1440px](inventory-1440.png) | [375px](inventory-375.png) |

Data approval, unresolved catalog/geographic mapping, unpublished forecasting and missing operational stock/expiry inputs remain visible limitations. This design pass does not close those data gates.
