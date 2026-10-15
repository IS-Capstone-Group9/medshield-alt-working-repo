# Frontend QA rerun — 10 October 2026, Asia/Manila

The nullable core contract and original regression harness are repaired. All current fixtures execute without failures; authenticated fact-20 reporting and the full page/layout sweep pass. Production dependency advisories remain a release concern. No frontend product files were edited by this QA.

The delegated frontend reviewer performed source identity, TypeScript, lint, build, dependency audit, handler checks, 20 deterministic suites and six authenticated live read/export tests. Root completed the pending whole-app availability/null probes, nine-page layout sweep, visual inspection and report after an interrupted worker turn. This is a separate component assessment plus root integration/self-review, not a separate reviewer for root-authored evidence scripts.

## Checked scope and results

Checked HEAD `cc03b4c05398880b18987eca5ca9c1e140bf9dcb` plus the dirty working tree. `source-manifest.json` binds 138 frontend files; 16 differ from the prior QA. Node 22.14.0, Next14.2.35 and Chromium/Playwright on Windows. Production build preceded frontend startup; no concurrent Next dev server was running. Owned local frontend ran on 3000, gateway on 5000.

| Check | Result | Evidence |
|---|---|---|
| TypeScript noEmit, lint, production build | PASS | `typecheck.log`, `lint.log`, `build.log` |
| Original 20 deterministic browser suites | **115 pass / 4 explicit legacy skips / 0 fail** | `fixtures.json`, `fixtures.log`; 119 cases, no recovered copies or weakened assertions |
| Real inline handler bridges/syntax | PASS, 18 handlers | `handler-probe.json`; no missing required bridge; executable parses |
| Authenticated live read/export acceptance | **6/6 pass** | `live-read-export.json`, `live-read-export.log` |
| Nine pages at 1440/926/375px | PASS, 27 layout observations | `live-layout-run.json`, `live-layout/live-layout.json`;26 screenshots, no page runtime errors |
| Controlled monthly503 and reload recovery | PASS,2 cases | `browser-boundary-probe.json`; failed state has0 canvases/0 KPI nodes; restored source returns ready |
| Valid nullable product profit | PASS | Same receipt: actual live response with one `income:null` remains ready |
| Malformed product profit string | PASS, rejects visibly | Same receipt: invalid string yields unavailable; no unsupported values substituted |
| Production npm audit | FAIL,4 affected package nodes | `npm-audit-production.json`:1 critical/3 high |

The deterministic cases cover shared historical filters, observed zero/null/negative values, exact and leap-day comparisons, margins, adjusted-source provenance, cohort/ABC/Pareto denominators, category search/paging/export readiness, geographic/buyer composition, chart sizing, diagnostic drilldown, ledger measures, forecast lead/source/publication limits, external regression, entered planning scenarios, deferred loads, and provider failure/refresh fixtures. The newly added nullable suite has 14 tests. Fixture values are not live financial acceptance.

The six live cases use configured Supabase authentication and Databricks fact 20, policy `sales_restart_gold_v7_independent_catalog`, dataset `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`. They check the actual Capstone2017–2025 selection, ₱626,946,741.81 signed net sales, 98 observed of108 months, ten unknown months, same-population margin, category partition and exports, apostrophe search, release identity, STL reconstruction and malformed/future filters. Predictive cases verify supported benchmark/source contracts and current unpublished state. Their expected financial receipt is explicitly inherited from9 October; root separately reconciled fresh SQL in this packet. A passing browser benchmark does not activate a model or recalculate cloud accuracy.

The layout test covers overview, sales diagnostics, products, areas, forecast, planning, upload information, sales ledger and weather validation. It uses the actual navigation, waits for deferred capabilities, checks page/chart bounds, tab switching and expandable charts. Root visually inspected overview desktop and products mobile screenshots. Small-width checks remain exploratory; complete WCAG, keyboard/screen-reader and device certification were not performed.

## Previous findings and remaining concerns

**QA-03 fixed in checked scope.** Nullable product revenue/profit and other core response fields are accepted only when finite or explicitly null. The whole app retains trustworthy sales when one product lacks profit; malformed strings still hide unsupported analytical content. Fourteen deterministic contracts and actual browser injection independently exercise this distinction.

**QA-09 frontend portion fixed.** Original diagnostic and ledger loaders include the real weather helper, and catalog tests follow current reachable evidence controls. All20 original suites now pass their executed assertions. No recovery copies are required. The backend operational validator portion remains open in its separate report.

**QA-01 remains P1 for affected hosting.** Installed Next14.2.35 matches the maintainer's affected Windows App/Pages Router range. This QA host uses Windows. No exploit was attempted. Fresh npm audit reports Next critical and nanoid/PostCSS/source-map-js high. [Maintainer Windows advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) documents patched 15.5.24/16.3.3 and no workaround; choose a compatible supported upgrade that covers the full audit set. Other advisories have their own triggering conditions, and package counts are not independent exploit counts. Owner: Frontend/DevOps with Security review; rerun auth, build, reporting/export and outage checks after dependency migration.

Local `next start` logs warn that `output:standalone` expects its standalone server, and that sharp is unavailable for optimization. Ordinary local public PNG and PNG optimizer requests returned200; missing logos or exploitable optimizer behavior were not established. `image-runtime-probe.json` preserves five responses. Correct standalone/Docker startup and optimizer configuration remain deployment checks; Docker daemon is unavailable. Do not convert these warnings into a demonstrated analytical failure.

## Reproduction and limits

From `frontend/`, use current test files and a new output directory:

```powershell
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm run lint
npm run build
$env:MEDSHIELD_E2E_FACT_VERSION='20'
$env:MEDSHIELD_E2E_POLICY_VERSION='sales_restart_gold_v7_independent_catalog'
$env:MEDSHIELD_E2E_DATASET_ID='b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4'
node node_modules/@playwright/test/cli.js test e2e/descriptive-live.spec.ts e2e/descriptive-acceptance-live.spec.ts e2e/predictive-live.spec.ts --workers=1
$env:MEDSHIELD_E2E_OUTPUT_DIR='../outputs/system_qa_20261010/frontend/live-layout'
node node_modules/@playwright/test/cli.js test e2e/dashboard-chart-live.spec.ts --workers=1
```

Recorded JSON reporters/output directories preserve this run; reproduction should select a new directory rather than overwrite evidence. Root's boundary and ordinary image probes run from the repository root with `node outputs/system_qa_20261010/frontend/browser-boundary-probe.cjs` / `image-runtime-probe.cjs`. Authentication/audit activity is inherent in login; no provider refresh, warehouse/model write, account mutation, procurement or publication occurred. No full live role matrix, production deployment, load test, recovery exercise or business acceptance is claimed.

Guidance applied: QA role and testing standards for unchanged suite/fixture versus live evidence; frontend standards for nullable response/UI availability and responsive behavior; analytics frameworks for cohort/filter/export meaning and true leads; security standards for secret-safe allowed/denied checks; coding/technology standards for actual module/handler execution. Root read frontend/DevOps standards and reused current architecture, business definitions and documentation guidance for integration. Source/patch identity, fresh reports and all 9 October evidence are preserved. Cleanup is owned by root and recorded in the consolidated packet.
