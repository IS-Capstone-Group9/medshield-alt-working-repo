# Frontend QA remediation — 5 October 2026 (Asia/Manila)

Accountable role: Frontend Engineer, supported by QA self-review. Scope: QA-02, QA-05, QA-06 and the three stale isolated browser assertions plus the stale live STL caption. Existing user changes were preserved. No schema changes, cloud writes, service lifecycle actions or builds occurred in this scope.

## Delivered behavior

- Failed heatmap, buyer/area, forecast, regression and planning loads return `false`; revisiting the page retries them. Successful loads return `true` and alone qualify for caching. Calls while a page is loading share its promise. Resetting the dashboard invalidates both pending cache completions and old request responses. The unavailable presentation remains intact after a request fails.
- Provenance accepts distinct four-digit source years from 2017 onward, including 2026 and later years. Its observed year list does not acquire the current year merely because the current year is offered as an estimate scope. The selector separately offers that current-year scope.
- Local-mode API read/write helpers use the same shared token source as authentication restoration, including the gateway-token cookie when storage entries are absent. Logout clears the token used by those callers. Supabase token retrieval keeps its existing path.
- The calendar test verifies its selected scope in the period control and calculation notes, verifies its highest observed month separately, and retains zero, negative-sale and missing-profit coverage.
- The metric test verifies a twelve-month axis, 20% weighted gross margin, eleven unavailable gaps, observed sales/profit values and scope disclosure. It activates each page before reading that page's chart because inactive-chart rendering is suppressed.
- The product test verifies positive sales and negative returns as separate series and their exact sum to net sales, using an actual negative-return fixture.
- The live STL test uses the current caption while retaining candidate version/policy, three charts and export checks. It additionally checks 72 component table rows and observed = trend + seasonal + residual for every exported record.

## Verification

From `frontend/`:

```powershell
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/@playwright/test/cli.js test e2e/dashboard-recovery.spec.ts e2e/dashboard-filter-placement.spec.ts e2e/metric-definitions.spec.ts e2e/sales-sectors.spec.ts --workers=1 --output=../outputs/remediation-drilldown-20261005/frontend-fixes-browser-verified
node node_modules/@playwright/test/cli.js test e2e/metric-definitions.spec.ts --workers=1 --output=../outputs/remediation-drilldown-20261005/frontend-metric-final
node node_modules/@playwright/test/cli.js test e2e/dashboard-recovery.spec.ts e2e/dashboard-filter-placement.spec.ts e2e/metric-definitions.spec.ts e2e/sales-sectors.spec.ts --workers=1 --output=../outputs/remediation-drilldown-20261005/frontend-fixes-final
```

The [final combined run](frontend-fixes-final.log) passed all thirteen isolated browser checks in 19 seconds: five recovery/auth/provenance regressions, three filter-placement checks, three buyer/product checks and two financial-definition checks. The initial combined run exposed additional stale expectations in the metric test; its repaired focused run passed both tests. [Earlier combined run log](frontend-fixes-browser.log) records the 12-pass/1-fail run, and [final metric log](frontend-metric-final.log) records that repaired criterion. Failed-run artifacts remain for traceability.

Both frontend TypeScript no-emit checks passed. The second check after final test changes is recorded in [typecheck log](frontend-fixes-typecheck.log).

The live STL test was edited but not rerun in this scope; warehouse availability and a current candidate identity remain requirements for live acceptance. No isolated result certifies the live warehouse.

## Integration handoff

Root owns continued integration, canonical documentation and full-system acceptance. `dashboard-interactions.ts` ownership was returned to root after remediation. Its refresh functions and `refreshDashboardModulesForPage` now resolve `Promise<boolean>`; existing event callers may ignore the resolved boolean. The parent also owns consolidating token retrieval in `lib/api.ts` so every local-mode caller shares the restored token source.
