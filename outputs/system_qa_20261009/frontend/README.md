# Frontend QA — 9 October 2026, Asia/Manila

QA is complete for the recorded scope; the product needs fixes before release acceptance. No product source or dependencies were changed. This is a supporting QA Engineer handoff to the whole-system Orchestrator.

## Identity, plan and ownership

The objective was to verify truthful analytical presentation across the complete Next.js dashboard: core load/unavailability, observed versus estimated/unknown values, period and category scope, chart/table/export agreement, module recovery, navigation and responsive layout. Allowed writes were QA artifacts in this directory. Cloud analytical/provider writes, model activation and product fixes were excluded.

The ordered plan was guidance and process review → type/lint/build → isolated browser contracts → authenticated version-bound browser checks → failure probes → defect/evidence handoff. No next dev process was running before the production build. An owned `next start -p 3000` server used PID 22012 after build; logs and PID are retained. The root agent owned the gateway on port 5000.

Checked commit: `cc03b4c05398880b18987eca5ca9c1e140bf9dcb`, with existing uncommitted frontend changes. [source-manifest.json](source-manifest.json) hashes 136 frontend source/config/test files; [frontend-working-tree.patch](frontend-working-tree.patch) and [frontend-status.txt](frontend-status.txt) identify the dirty tree. Aggregate source hash: `a9843f4b2b35bb71acc2fcf14b2653a7333ae63e44094ee8509fa5995c02c3bb`. Runtime: Node 22.14.0, Next 14.2.35, TypeScript 5.9.3, Playwright 1.62.1, Chromium, Windows.

Applied guidance, read during this assignment:

- `.agents/worker-operating-model.md`, `.agents/execution-contract.md`, `.agents/qa-engineer.md`: ownership, evidence identity, fixture/live distinction and recovery.
- `.skills/testing-standards.md`: lowest useful checks followed by critical browser flows.
- `.skills/frontend-standards.md`, `.agents/rules/ux-ui-design-rules.md`: loading/error states, accessible navigation and desktop/chart fit.
- `.skills/analytics-frameworks.md`: observed/null/zero separation, common populations, matched period comparisons, candidate/scenario labels and export reconciliation.
- `.skills/security-standards.md`: controlled failures, no secret output, authentication and production dependency assessment.
- `docs/TESTING.md`, `docs/API.md`, `docs/BUSINESS_DEFINITIONS.md`, `docs/DECISIONS.md`; affected drilldown guidance `docs/DRILLDOWN_DIAGNOSTICS.md`.

Architecture, database and analytical definitions were reviewed without changing them. Security and operations impacts concern runtime exposure and source availability. No schema/provider/model changes were performed.

## Verification results

| Criterion | Result | Evidence |
|---|---|---|
| TypeScript no-emit check | Pass | [typecheck.log](typecheck.log), `node frontend/node_modules/typescript/bin/tsc --noEmit --incremental false -p frontend/tsconfig.json` |
| ESLint | Pass, no warnings/errors | [lint.log](lint.log), from frontend: `npm run lint` |
| Production build | Pass | [build.log](build.log), from frontend: `npm run build` |
| Original 19 isolated browser suites | 79 passed, 21 failed, 4 intentional skips | [fixtures.json](fixtures.json), [fixtures.log](fixtures.log); exact suite arguments are recorded in JSON `config.argv` |
| Recovered diagnostic and ledger contracts | 21 distinct checks passed after evidence-only fixture recovery | [recovered-final.json](recovered-final.json): 20 passed/1 selector failure; [recovered-canonical-final.json](recovered-canonical-final.json): last check passed using actual reachable control |
| All inline markup onclick handlers bridge | Pass: 18 handlers, no missing bridge; generated script parses | [handler-probe.json](handler-probe.json), root: `node outputs/system_qa_20261009/frontend/handler-probe.cjs` |
| Live descriptive sales/STL/products/export | Pass: 1 integrated test | [live-descriptive.json](live-descriptive.json), [live-descriptive.log](live-descriptive.log) |
| Live all-page/chart layouts | Pass: 1 test, 27 page/width records, no browser runtime errors | [live-chart-tabs.json](live-chart-tabs.json), [live-layout/live-layout.json](live-layout/live-layout.json) |
| Full-app source failure/reload recovery | Pass: 2 cases | [browser-boundary-probe.json](browser-boundary-probe.json), root: `node outputs/system_qa_20261009/frontend/browser-boundary-probe.cjs` |
| Valid nullable product contract | Fail, reproduced both loader and whole React app | [core-contract-probe.json](core-contract-probe.json), [browser-boundary-probe.json](browser-boundary-probe.json) |
| Production dependency audit | Fail: 4 affected packages, 1 critical/3 high | [npm-audit-production.json](npm-audit-production.json), from frontend: `npm audit --omit=dev --json` |

The broad original fixture command ran at 10:10:19 Manila and lasted 289.15 seconds. Final functional coverage is 100 distinct fixture checks passed (79 original plus 21 recovered) and 4 intentional legacy skips. This does **not** mean the unchanged original suite passed: its 21 failures are retained.

The isolated checks cover weighted financial rates, signed adjustments, null versus zero, complete/missing years, partial/leap-day dates, matched comparisons, observed versus estimates, ABC full-population denominators, quantity heatmaps and index eligibility, STL gaps/reconstruction/export, product category/cohort/search/paging, derived area/buyer evidence, forecast true leads/blocked publication, regression unavailable/blocked states, entered planning assumptions, deferred-load deduplication/retry, cookie-restored bearer headers, diagnostic dimensions/notes/export, ledger scope/release retention and desktop/narrow layouts. These are controlled fixtures, not live warehouse proof.

Live checks used authenticated Supabase login, local production frontend and gateway, Databricks fact Delta version **19**, policy `sales_restart_gold_v7_independent_catalog`. The descriptive test checked 60.26% same-population gross margin, 72 qualifying STL months with observed = trend + seasonal + residual, version/policy retained in STL/product CSV, net-sales CSV reconciliation to **₱626,946,741.81**, positive amounts plus signed negative adjustments equal net sales, and explicit candidate/publication limits. Exact command: from frontend, set `MEDSHIELD_E2E_FACT_VERSION=19` and `MEDSHIELD_E2E_POLICY_VERSION=sales_restart_gold_v7_independent_catalog`, then `node node_modules/@playwright/test/cli.js test e2e/descriptive-live.spec.ts --grep 'live descriptive views' --workers=1 --reporter=list,json --output=../outputs/system_qa_20261009/frontend/live-descriptive-artifacts` with JSON output directed here.

The all-tab test opened overview, sales diagnostics, products, areas, forecast, planning, source upload information, sales ledger and weather validation at 1440, 926 and 375px. It checked page/plot bounds, section switching, reopened charts and runtime errors; [live-layout](live-layout) includes 26 screenshots. Desktop overview/products images were visually inspected. Mobile widths remain exploratory because documented release acceptance is desktop-only. Exact command from frontend: `node node_modules/@playwright/test/cli.js test e2e/dashboard-chart-live.spec.ts --workers=1 --reporter=list,json --output=../outputs/system_qa_20261009/frontend/live-chart-artifacts`, with `MEDSHIELD_E2E_OUTPUT_DIR` directed to this `live-layout` directory.

## Defects and next owners

1. **P1 — Valid unavailable product gross profit makes the entire dashboard unavailable.** `frontend/services/api/dashboard.service.ts:41–44` requires every product revenue and income to be finite, although `ProductPoint` in `frontend/types/api.types.ts:19` explicitly permits null. A legitimate `{product:'Revenue-only label', revenue:100, income:null}` is rejected as `Databricks dashboard data is incomplete: product`; `assertDashboardCoreData` at lines 53–64 turns it into complete core failure. Both a five-case loader probe and the production browser reproduce this. The latter changes only one live product response's `income` to null, then the dashboard removes every chart/KPI and shows source unavailable. Expected: retain trustworthy revenue, show unavailable profit, and exclude unknown values from dependent metrics. Owner: Frontend Engineer, coordinated with Backend Engineer for nullable yearly/area/source contracts. Current live dataset occurrence was not asserted.

2. **P1 security release blocker — Next 14.2.35 matches a critical Windows server RCE advisory.** The installed direct package is affected by [the maintainer's Windows filesystem RCE advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), whose affected interval includes this App Router runtime on Windows. The maintainer records patches 15.5.24/16.3.3 and no known workaround for affected Windows hosting. Applicability is inferred from installed version and observed host/router configuration; exploitation was not attempted. An additional [AVIF image optimization RCE advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) matches the installed package, but its AVIF/sharp path was not exercised. The complete audit reports Next (critical), nanoid/PostCSS/source-map-js (high); these are four packages with multiple advisories, not four CVEs. Owner: Frontend/DevOps with Security review. Move to a supported version covering the complete advisory set and run migration/regression checks; do not apply an unreviewed major `npm audit fix`.

3. **P2 — Two committed fixture suites cannot reach their assertions after the weather helper dependency changed.** `frontend/e2e/diagnostic-drilldown.spec.ts:11` and `frontend/e2e/sales-data-view.spec.ts:12` omit the real `weather-provider-helpers` module required by `dashboard-interactions`. All 12 diagnostic and 9 ledger tests fail before behavioral verification with `Unknown isolated module: ./weather-provider-helpers`. The canonical product test additionally uses the old `Inspect Canonical Product A` selector; production now exposes `View evidence` then `Inspect records for Canonical Product A`. Evidence-only copies added the real module and followed the current control without changing assertions, proving all 21 behaviors. Owner: QA Engineer; repair repository fixtures and rerun the unchanged official suite. Copies/scripts are retained in `recovered-tests` and `recover-fixtures.cjs`; original and intermediate failures remain separately recorded.

The gateway null-to-zero defect reported by the backend reviewer has direct presentation impact: production `formatSalesValue` at `frontend/services/api/sales-view-helpers.ts:4` renders null as `-`, and summary functions at lines 17–19 render missing measures as `Unavailable`. Explicit zero renders as a numeric zero. Therefore converting missing gateway amounts to zero creates false observed values before otherwise-correct renderers receive them. Recovered ledger null/zero tests confirm these renderer branches. This is supporting evidence for the gateway defect, not a separate frontend finding.

## Failure evidence, limits and cleanup

The full-app controlled monthly HTTP 503 probe correctly returned `data-source-state=unavailable` with zero canvases and zero KPI nodes. Removing the route interception and reloading restored `ready`. No mock/bundled fallback appeared. Both this probe and valid-null failure recorded no page runtime errors.

Original and evidence-copy test failures are retained. Two initial evidence-copy launch attempts failed before discovering tests because of harness path resolution; they are in `recovered-diagnostics*.log/json`, not counted as product checks or passes. Recovery then ran the real production dependency and maintained all assertions. No secret-bearing auth responses, credentials or raw source records were exported. Build artifacts in ignored `.next` and owned server logs are ordinary runtime artifacts.

No provider refresh, Databricks publication, procurement, model activation, account mutation or cloud write was executed. No complete WCAG/assistive-technology assessment, all-role live authorization matrix, destructive scenario, deployment rollback or business approval is claimed. Provider refresh behavior was tested only in controlled browser fixtures. Candidate technical passes do not authorize analytical publication.

Review mode: supporting QA execution plus self-review; root integrates cross-layer findings. Next acceptance requires frontend nullable validation repair, dependency/security remediation, official fixture repair and focused reruns. Server cleanup is recorded in `cleanup.json` after verifying the owned PID/command.
