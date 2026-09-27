# System QA Review

## Descriptive completion verification — 27 September 2026

**Verdict: technically validated historical sales candidate for CEO review.**
The old Gold-v5 provenance and missing-STL findings below are superseded for fact
version 16 by the operator's completed 01–06 run and passing read-only receipts.
No business approval or production deployment is recorded by this review.

Resolved in the application: repeated/structured filters now reject with 400;
scientific-notation years reject while four-digit empty future years remain empty;
yearly source quantities and margin use matching yearly aggregation; margin captions
use the eligible denominator; annual YoY never sums overlapping year-pair comparisons
into a misleading all-history growth rate; chart titles follow selected grain.
STL checks fact, policy and mapping identities and component reconstruction, shows
72 qualifying months and four components, and exports dataset/version/status.
Product ABC uses positive contributions, separate returns, a fixed full-population
cohort denominator and an 80% reference. Corrected tests supply actual warehouse
mapping/positive-sales fields instead of reviving unsupported clinical features.

Evidence:
- Publication: [70/70 pass](../outputs/publication_readiness/2026-09-27T06-49-46-520Z/README.md).
- Calculations/STL: [version 16, 72 reconciled months](../outputs/descriptive_validation/2026-09-27T06-41-37-034Z/evidence.json).
- Backend unit tests: 21 passed (including structured/repeated filter rejection).
- Frontend/backend TypeScript checks passed during remediation.
- Browser: area grouping/filtering, matched YoY, partial dates, no-observation scopes,
  positive-sales ABC, returns, cohort denominator, source-label rendering, CSV totals,
  yearly quantities, live STL and versioned exports exercised in the descriptive suites.
  Four explicitly skipped legacy year-selector tests remain superseded; they are not passes.
- Final delivery browser run: **8 passed**, `frontend/test-results-descriptive-delivery`:
  live version-16 STL with 72-row export, authenticated filter validation, four product
  boundary/cohort/export tests, responsive 375px layout, and yearly quantity CSV.
- Area and buyer scope regressions: **5 passed** in the descriptive release run.
- Matched-period/growth suite: **6 passed, 4 legacy tests skipped** after final labels.
- Final rendered screenshots inspected: Sales Diagnostics and Product Prioritization;
  currency captions, quantity readiness, STL components, candidate notice and provenance
  were checked. This is scoped visual QA, not a full accessibility certification.
- Local gateway pinned to version 16 in ignored backend environment configuration.

The product master remains unverified, candidate buyer/geographic and ABC decisions
remain scoped approval items, and ten missing months remain unavailable. Future
upload turnover and production packaging/deployment are outside this historical
candidate verification. Prior production image/standalone packaging findings below
are not cleared by these local tests. Local test success is not CEO acceptance.


## Historical pre-deployment QA — 27 September 2026 (superseded by the review above)

**Decision: HOLD. Descriptive analytics is not ready for final acceptance or an
approved predictive training baseline.** Financial reconciliation passes, but
the live source-provenance defect remains. This review did not deploy notebooks,
modify warehouse data, grant business approval, or change application code.
The two pre-existing backend edits were preserved. Accountable role: QA Engineer;
this was a single-agent self-review.

### Scope and acceptance

The review covered Overview, Sales Diagnostics, Product Prioritization, Area
Prioritization, shared date/grain controls, charts, exports, gateway validation,
authentication rejection, current Databricks sales/external contracts, notebook
tests, and the boundary to predictive work. Existing forecast/planning browser
regressions also ran; this does not certify predictive model suitability.

Plan executed: inspect instructions/runtime and user edits; run offline tests and
type checks; collect fresh read-only warehouse receipts; exercise APIs; run the
full browser suite and inspect live screens; record defects and handoff gates.
The expected example is that the same selected revenue reconciles across the
warehouse, gateway, dashboard and export. Missing months must stay unavailable,
and malformed year filters must not silently broaden the reporting scope.

| Acceptance check | Result | Evidence |
|---|---|---|
| Backend logic | PASS | `node --import tsx --test tests/*.test.ts`: 20 passed |
| Canonical Databricks notebook logic | PASS | `python -m unittest discover -s databricks/medshield_project/tests`: 29 passed |
| Python services | PASS | `python -m unittest discover -s services/tests`: 76 passed |
| Offline STL | PASS | `python -m unittest services.analytics_service.jobs.test_descriptive_stl`: 3 passed; not cloud execution |
| Types | PASS | Backend `tsc --noEmit`; frontend `tsc --noEmit --incremental false` |
| Generated notebook instructions | PASS | `python databricks/medshield_project/render_readme.py --check` |
| Live publication | FAIL | 68 PASS, 2 FAIL, 0 UNVERIFIED; [receipt](../outputs/publication_readiness/2026-09-27T05-14-39-700Z/README.md) |
| Live descriptive calculations | PASS | [Version-bound evidence](../outputs/descriptive_validation/2026-09-27T05-15-25-564Z/evidence.json) |
| Dashboard warehouse contracts | PASS with QA adaptation | Original validator fails its obsolete 15-product snapshot assertion. A [temporary copy](../tmp/qa-dashboard-contract-20260927.ts) expecting the implemented 100-product snapshot passes all remaining assertions; [output](../outputs/qa-dashboard-contract-20260927.json). Public API limits 15 and 100 were separately verified. |
| API scope/availability probes | FAIL | 21 of 26 expectations pass; four year-validation failures and one unmet STL availability gate; [receipt](../outputs/qa-api-20260927.json), [probe](../tmp/qa-analytics-api-20260927.cjs) |
| Full Chromium suite | FAIL | 35 passed, 7 failed, 5 skipped, no flaky retries; [report](../outputs/qa-browser-20260927-final.json) |
| Live product financial export | PASS | `descriptive-live.spec.ts`: header/row alignment, complete cohort export beyond the 100 displayed rows, signed returns, policy labels, and total revenue |
| Core unavailable/readiness behavior | PASS | Both deterministic `dashboard-readiness.spec.ts` checks; no live warehouse outage was induced |
| Anonymous access | PASS for tested routes | Seven extra API probes return 401; existing browser test also rejects anonymous revised analytics/uploads |
| Builds | PASS | `npm.cmd run build` in backend and frontend; frontend compilation, lint/types, static generation and tracing passed after stopping dev |
| Production-mode visual/control smoke | PASS for loading and controls; defects below | Four analytics pages loaded at 1440px with no page exceptions, no document overflow, and no missing directly named inline handlers. [Screenshots and observations](../outputs/qa-analytics-20260927/visual-observations.json); optional STL remained 503. This check does not assert every chart is semantically correct. |

The five browser skips are four explicitly retired sales-diagnostics tests and
the opt-in exploratory mobile overview. A separate 375px layout regression passed;
this does not certify mobile support or full accessibility. Initial sandbox runs
could not reach Supabase/Databricks; those were interrupted and superseded by the
network-enabled final run, not counted as product defects or passing coverage.

### Current Databricks evidence

- Dataset: `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
  Live policy remains `sales_restart_gold_v5_2025_allocation_source`; locally
  prepared v6 is not the current deployed policy.
- Publication receipt SHA-256:
  `c3de8699a27638b0b8b1d1b0099c5d073e6e9f15bf6b85a6cd867a3238d511bc`.
- 37,728 fact transactions; zero duplicate source IDs; 32,749 warning-bearing
  records. Eligible revenue: **₱626,946,741.81**. Eligible gross profit:
  **₱288,487,498.72**. Margin denominator: **₱478,720,670.03**, yielding
  **60.262177%**. Revenue eligibility covers 36,848 records; margin eligibility
  covers 34,105. These populations must not be presented as interchangeable.
- 108 calendar months, 98 observed months, 9 years (2017–2025). Missing months:
  2017-05/06/07/08/10, 2018-01/02, 2019-10/11/12. Missing monthly values remain null.
- The live product master has **0 approved entries**. Product reporting describes
  commercial source labels, not approved medicine identity or standardized demand.
- External connection check passed: 2,171 DOH/PAGASA rows, 2,170 non-null values,
  seven territories, **0 join-ready and 0 forecast-eligible rows**. PAGASA has
  zero approved sales matches. The separate NASA POWER query returns 108 rows
  for 2025 and 32 sales matches; those matches do not approve external regression.
  The regression endpoint correctly reports `blocked`.

### Defects and required handoff

| Priority / owner | Finding and reproduction | Required next action |
|---|---|---|
| P1 — Databricks/data engineering | The fresh collector again finds adjusted 2020/2024 files labeled `ORIGINAL_SOURCE_EXPORT`; Gold lacks their estimated-source flags. Financial totals matching does not repair product provenance. | Deploy the reviewed canonical Bronze/Silver/Gold package through an authorized operator, rerun bridges, and obtain a new passing immutable receipt. Follow [deployment guide](../databricks/medshield_project/GUIDE.md). |
| P1 — Backend | Authenticated `GET /api/sales/summary?year=2024&year=2025` returns 200 and all 37,728 records; `/api/weather/effects?year=2024&year=2025` also returns 200. The monthly endpoint correctly returns 400. Routes convert non-string query values to omitted filters. | Reject repeated/structured filters before dispatch. Add shared boundary validation and regression checks proving malformed filters never become all-history results. |
| P1 — Frontend | Sales Diagnostics → All Time → Yearly shows no product quantity observations, including the default LACTAMOX 500MG/125MG TAB product. `sales-heatmap-runtime.ts` groups quantity keys as `YYYY-MM`, then looks them up using `YYYY` from `descriptiveAxisPeriods()`. The chart and CSV consequently carry nulls for observed years. | Aggregate source months into the selected yearly grain, preserve missing/observed distinctions, and test yearly/monthly/daily/custom chart-to-export reconciliation. |
| P2 — Backend | `sales/summary?year=2.025e3` is accepted as 2025; `year=2100` is rejected while `/api/monthly?year=2100` returns a valid empty set. `validateYearFilter` uses `Number` and a 2099 ceiling. | Align the scalar year contract across sales, weather and monthly routes; enforce the documented four-digit format and supported dynamic range. |
| P2 — Frontend/BI | Live Sales Diagnostics displays 60.26% but its KPI caption says “Total gross profit ÷ total net sales”; the margin chart repeats that wording. The actual denominator is margin-eligible revenue. | Correct every visible formula/caption and verify displayed numerator/denominator against the receipt. Do not change the correct calculation to match the stale caption. |
| P2 — Frontend/BI | All-Time/Yearly Sales Diagnostics keeps “Monthly Net Sales Revenue and Gross Profit” on an annual chart; “Workbook Gross Margin % by Year” shows monthly bars. Its DOH-PAGASA note claims modeled therapeutic allocations despite external regression being blocked. | Make chart titles reflect the rendered grain and replace unsupported modeled-output claims with the actual publication state. |
| P2 — Frontend/BI | Area method text says estimated contract allocations are excluded by the sales service. The active sector query includes historical source allocations and marks financial rows `actual`, retaining product provenance separately. | Distinguish observed financial transactions, estimated product attribution, and gap estimates. Reconcile the explanatory text with the actual source predicates. |
| Readiness gate — Databricks | `GET /api/seasonality/stl` returns 503 `STL_UNAVAILABLE`. The UI correctly discloses this; local algorithm tests cannot clear the cloud gate. | Run/publish the STL notebook against the corrected active fact version, then verify dataset/version and reconstruction in API and UI. |
| P2 — QA | Seven browser failures and one stale warehouse-validator assertion prevent a green regression baseline. | Repair fixtures/assertions to the accepted current contract, retain edge-case coverage, and rerun; do not restore unsupported UI features just to satisfy old tests. |
| P2 — Frontend/DevOps | Although the production build and page smoke complete, the production server logs that `sharp` is required for standalone image optimization. Startup also warns to use `.next/standalone/server.js` for the configured `output: 'standalone'` instead of the current `next start` script. | Align the runtime image dependency and launch/package procedure with standalone output, then verify optimized image requests in the deployed form. Build success alone does not clear this issue. |
| Readiness gate — Business/data owners | Product master, buyer/geographic scope, returns/ABC candidate policy, external joins and version-bound final publication remain unapproved. | Resolve the applicable scoped decisions and approved publication/rollback contract before treating this candidate as an approved training dataset. |

Browser failure triage: two area fixtures omit `region` while the current runtime
deliberately no longer infers geography from territory strings; one navigation
assertion expects the removed quadrant matrix; three product tests use the old
net-sales ABC fields/column indexes or old negative-revenue messaging without
`positive_sales` and `returns_value`; one sales-sector product test still expects
MCDA/scenario charts. These are test-contract mismatches, not evidence that the
removed analytical claims should return. The two area tests also retain obsolete
gap-estimate expectations and need complete review after their first failure.

Production visual follow-up confirmed the quantity defect with the same product
and scope: LACTAMOX 500MG/125MG TAB has **65 observed months and 1,376.57 source
units** in monthly view, but **zero observed periods** in yearly view. The
machine-readable `heatmapGrainCheck` in the visual observations records both
datasets. Screenshots: [Overview](../outputs/qa-analytics-20260927/overview.png),
[Sales Diagnostics](../outputs/qa-analytics-20260927/revenue.png),
[Products](../outputs/qa-analytics-20260927/products.png), and
[Areas](../outputs/qa-analytics-20260927/territory.png). Detail pages were captured
after their own readiness checks, rather than only the initial core-data gate.

### Limits and exit criteria

This is not a load/performance test, penetration test, full accessibility audit,
cloud job-deployment verification, recovery drill, or role-by-role authorization
certification. The live read scope does not establish source completeness or
independently validate historical product allocations. No production build should
be run concurrently with `next dev`; the QA dev server was stopped first.

Before predictive acceptance: correct and reconcile live provenance; repair
scope-validation and misleading UI wording; publish matching STL if retained as
a required descriptive output; restore a passing regression baseline; obtain the
applicable mapping/policy and version-bound dataset approvals. Sales-only model
experiments may remain explicitly experimental; this review grants no production
predictive or external-feature approval.

Evidence artifacts and diagnostic scripts are QA-only and do not feed the runtime.
No cloud objects or analytical business rules were changed during this review.
The temporary frontend and gateway started for this review were stopped afterward.

## Descriptive remediation verification ? 27 September 2026

Local fixes now have the following evidence. No cloud notebook deployment or
business approval occurred.

- Recovered canonical notebook suite: **29 passed**, including original parser/
  mapping coverage, reviewed source hashes, and offline/Databricks STL algorithm parity.
- Backend/unit suite: **20 passed**, including exact daily detail, empty scopes,
  eligible area profit, positive-sales ABC with signed returns and concurrent version pinning.
- Backend and frontend TypeScript checks passed.
- Final versioned-export browser rerun: **1 passed**, including CSV header/value
  alignment, full export totals and candidate policy labels.
- Fresh live calculation receipt:
  `outputs/descriptive_validation/2026-09-26T19-02-42-874Z/evidence.json`.
  Revenue is 626,946,741.81 PHP; common-population margin is 60.262177%; ten
  unobserved months remain null. The collector checks that its audited fact version
  and identity match the gateway pin. This is still v5 candidate evidence, not
  proof of corrected v6 deployment.
- Browser run `test-results-remediation-verified`: **8 passed, 4 existing legacy
  skips**. Live product export reconciled the full selected population, including
  rows beyond the 100-row visible table. A discovered 12-header/13-value export
  defect was corrected, with the row-width assertion retained.
- Mobile check: 375px document width at a 375px viewport; filter controls fit.
  Earlier 582px overflow was reproduced before the CSS correction.
- STL currently returns its explicit unavailable state because no matching Gold
  components have been deployed. This is not a passing STL publication gate.
- Restored publication collector: **68 PASS, 2 FAIL, 0 UNVERIFIED**, receipt
  `outputs/publication_readiness/2026-09-26T18-36-04-060Z`. The two failures remain
  live Bronze/Gold adjusted-source provenance. Local prepared v6 code does not fix
  the active v5/fact-version-15 warehouse until an operator deploys and reruns it.

Residual gates: cloud provenance correction; actual STL job execution; approved
release manifest/activation and multi-process version coordination; medical SKU
identity; buyer/geographic approvals; candidate ABC policy approval; future upload
replacement-scope agreement and implementation; final CEO release acceptance.
The user confirmed only DR/document identifiers are available, not stable line IDs.
Full client turnover and the entire descriptive module remain incomplete.


## Descriptive calculations and UI follow-up — 27 September 2026

Owner: Orchestrator, with sequential backend/frontend/BI/QA work and self-review.
Scope: gateway descriptive aggregation, browser evidence semantics, source-label
product rankings, offline STL evidence and focused regression tests. No warehouse
tables, credentials, authentication policy or CEO approval records were changed.

Delivered fixes:

- Missing monthly amounts remain null; observed zero is distinct from absence.
- Margin uses a common eligible transaction population across API and UI.
- Monthly YoY excludes estimates and missing comparisons; annual YoY uses common
  observed months and reports coverage. Partial historical date ranges cannot
  consume whole boundary-month totals as exact sales.
- Product view ranks observed source-label revenue and applies 80/95% ABC across
  the full selected population before cohort filtering. Negative totals remain
  in revenue and hold classification. Hard-coded clinical categories, outbreak
  multipliers, inventory promises and demonstration product-region matches were
  removed from the descriptive view. Loading is not reported as zero sales.
- Calendar-month mean revenue excludes unavailable months and is explicitly not
  STL. Reproducible offline STL uses the contiguous 2020–2025 candidate series.

Evidence: [version-bound live receipt](../outputs/descriptive_validation/2026-09-26T17-52-02-042Z/evidence.json)
and [STL components](../outputs/descriptive_validation/2026-09-26T17-52-02-042Z/stl.json).
Revenue reconciles at ₱626,946,741.81; the margin-eligible denominator is
₱478,720,670.03 and its weighted rate is 60.262177%. The receipt identifies
Gold v5 at stable fact Delta version 15, so it does **not** clear the known
2020/2024 provenance blocker. A separate read of product/sector detail also
reconciled to the same net-sales total (26,129 aggregated rows).

Verification: six descriptive calculation tests plus four publication-helper
tests passed; three STL tests passed, and the 72-month STL components reconstruct
the source to a maximum absolute error of 1.4e-9 PHP. Backend and frontend
TypeScript checks passed. Authenticated live navigation verified the margin,
the full product revenue total, the 100 displayed ranked rows, candidate notices,
and absence of demonstration recommendations. Screenshots were inspected.
Seventeen focused browser regressions passed; four pre-existing legacy
year-selector tests remain skipped. No production build
ran alongside the active Next development server.

Open release gates: authorized notebook deployment and provenance recheck;
STL publication/consumption through Databricks; canonical medical product review;
negative-product-revenue/returns treatment for ABC; geographic scope review; and
CEO approval of the specific corrected release. Passing local/UI checks does not
mark the entire descriptive analytics objective or FR4 publication complete.

## Publication gate follow-up — 27 September 2026

The repaired area mapping is already reflected in the live Gold publication;
its checksum matches the local master and all 22 observed area dimensions were
compared. This supersedes the earlier pending-upload statement for that mapping.

An expanded source-history review found that the live 2020/2024 CSV hashes match
prepared product-label substitutions but retain original-export provenance.
This blocks publication despite passing arithmetic reconciliation. The first
66-check receipt under `outputs/publication_readiness` predates that added check
and must not be used as complete readiness evidence. The expanded collector
retains failures; it does not waive them or grant business approval.

Corrected local Bronze/Gold source and a regenerated copyable runbook are
prepared. Cloud application requires an authorized operator because the current
credential's workspace/jobs scopes were denied. No cloud writes or business
approval were performed. The client CEO is the decision owner, not yet an
approver of the specific candidate. See
[the acceptance record](DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md).

Final evidence: [expanded live receipt](../outputs/publication_readiness/2026-09-26T17-08-24-151Z/README.md),
68 checks passed, two provenance checks failed, none unverified. Local
verification passed 29 notebook tests, four collector tests, targeted TypeScript
checking, README regeneration consistency, and documentation/diff checks.
These do not establish that the prepared correction has run in Databricks.

## Post-Gold reassessment: 2026-09-27 (Asia/Manila)

### Follow-up remediation (2026-09-27)

The overview presentation finding below is resolved in the repository. The main KPI now totals observed rows only, lists gap-estimate and combined amounts separately, and uses an observed-sales label. Estimate-only scopes show “No observations” instead of presenting the estimate as actual sales. Actual and estimated revenue/profit are separate overview chart datasets; estimates use dashed lines and triangle markers. Source-period coverage appears in the subtitle. This preserves the existing estimation method, finance definitions, and other page totals.

Live default scope verification: observed sales ₱61,082,570; gap estimates ₱88,804,257; combined ₱149,886,827 (display rounded to pesos). Coverage is 2017-01–2025-12. Focused browser checks cover mixed, actual-only, and estimate-only scopes. The product/finance next action is delivered as a [review handoff](../outputs/qa_reassessment/REVIEW_HANDOFF.md), with 25 value-ranked product labels and 19 warning-rule groups. Owner decisions remain pending; the queues are not publication masters or approvals. The original assessment below records the pre-fix finding.

**Initial assessment verdict: Gold rebuild and tested desktop flows passed technical checks; descriptive presentation needed a fix, and operational/model publication remained pending.** The presentation finding is resolved by the follow-up remediation above. QA Engineer is accountable for this assessment, with data-quality checks performed as a supporting responsibility. No warehouse data, mappings, approvals, or application behavior were changed during the initial reassessment.

Scope and plan: inspect current working tree and running services; rerun read-only dashboard/publication reconciliation; profile warning rules; run offline, boundary, and desktop browser checks; inspect the rendered overview and record remaining issues. Source-grain checks cover retained transaction facts, monthly/yearly/area marts, and area dimensions. Browser checks cover the authenticated localhost system; mobile remains outside release scope. Existing user changes, including publication-readiness scripts, were preserved.

### What the Gold rebuild resolved

- All 66 read-only publication-readiness checks passed. The live area master checksum is `a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949`, matching the repaired repository CSV. All 22 observed live area-dimension labels agree with the local mapping, including approval boundaries and proposed geographic metadata.
- Bronze/Silver/Gold source identities and values reconcile; persisted output counts, monthly/yearly/area aggregates, yearly bridge, and gateway summary agree. Table versions remained stable during evidence collection.
- The dataset retains 37,728 transactions, 108 calendar-month aggregate rows, and nine years (2017–2025). There are zero duplicate/null fact IDs and zero financial-reconciliation mismatches. Eligible net sales total ₱626,946,741.81; eligible transaction gross profit totals ₱288,487,498.72. These totals use their respective eligibility populations, not every field on every retained row.
- The 4,544 adjusted 2025 records reconcile with the replacement source validation and retain adjusted-source provenance. Technical reconciliation does not independently approve the original contract allocation method.

Dataset: `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`. Policy: `sales_restart_gold_v5_2025_allocation_source`. Publication remains `CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW`.

### Remaining findings and actions

| Priority | Evidence and risk | Next action / owner |
|---|---|---|
| P1 | **Default overview KPI mixes estimates with historical sales labels.** Live default scope is Oct 2025–Sep 2026 and shows ₱149,886,827 as “Historical sales from Databricks Gold” / “Period-filtered historical view”. Gold sales end Dec 2025. The chart subtitle acknowledges nine weighted estimates, but its revenue legend and the KPI do not identify the mixed total. `descriptive-period-runtime.ts` substitutes recency-weighted same-calendar estimates into missing periods and sums the display rows; `overview-monthly-runtime.ts` discloses the count only in the subtitle. This is a presentation defect, not a failed Gold reconciliation. Passing tests cover the estimation mechanics but miss this semantic risk. | Frontend/BI owner: split actual and estimated KPI amounts, label mixed totals, and visually distinguish estimated chart segments/legend. Show observed source coverage separately from selectable/estimated years. Add a live assertion that a period extending beyond source coverage cannot be labeled wholly historical/actual. Preserve approved estimation behavior and missing-period disclosures. |
| P1 gate | **No approved medical SKU population exists.** The live product master matches a header-only local master: zero entries and zero approvals. Approved medical-demand eligible fact count is zero; 36,988 rows are `PRODUCT_MASTER_PENDING`, 618 require nonmedical reference review, and 122 require hashtag-label review. | Product/data owner: populate and review canonical SKU identity, strength/form/pack, medical scope, and source evidence. Keep forecasting/product-demand outputs provisional until approval. An arithmetic pass does not establish medicine demand. |
| P1 gate | **Source completeness and warning review remain unresolved.** 32,749/37,728 rows (86.8%) have at least one rule. Common transformations are dash-discount interpreted as zero (25,080) and derived margin percentage (17,423). Higher-risk reviews include missing net sales (880), transfer formula mismatch (1,792), gross value formula mismatch (1,424), and low-trust 2017 source (1,978). Counts overlap; warnings are not all erroneous records. 2017/2018/2019 have 5/2/3 unobserved months; all years report completeness not established by transaction presence. | Finance/data owner: review source files and rule groups, confirm transformation policies and returns, and establish whether absent periods mean missing source or no activity. Do not fill missing monetary observations with zero. Bind descriptive acceptance to this dataset/evidence version. |
| P2 gate | **Geographic/external and model approvals remain pending.** Geographic approvals are inherited and marked not revalidated; channels and aliases remain pending. Approved external-ready fact rows are zero; regression stays blocked. PAGASA covers 2017–2024 and has zero approved sales matches. NASA POWER is a separately labeled proxy and does not clear official-weather or disease join approval. | Geography/data owner: confirm aliases and ambiguous labels with the source owner, then separately review station/DOH geography and temporal coverage. Model owner: validate trained models before operational publication. Keep candidate/proxy/scenario labels. |

The documented client-facing upload pipeline remains proposed: current sales upload requires Databricks ingestion. This is an existing implementation gap for routine client operation, not a regression introduced by the Gold update. Operational planning also still needs real stock, supplier, lead-time, expiry, and cost inputs.

### Executed verification and evidence

- Full Playwright suite: **38 passed, 5 skipped** (four superseded legacy-year tests and one explicit opt-in mobile exploration); no failures. Includes live readiness, navigation, date filtering, exports, client references, anonymous API denial, and isolated analytical fixture checks.
- Python analytics: **76 passed**. Sales-restart transformations: **26 passed**.
- Backend build and **six Node regression tests passed**. Frontend TypeScript and lint passed with no warnings/errors.
- Live monthly API boundary check passed: malformed/partial/repeated/structured inputs return 400, missing/invalid tokens return 401, complete-year filtering matches 108-row history, and an empty future-year scope remains valid.
- Visual inspection confirmed the estimate-label defect above even though the automated suite passed.

Authoritative sources and inspectable evidence:

- [Read-only publication audit and executed checks](../outputs/publication_readiness/2026-09-26T17-04-39-531Z/README.md), with [query results, schemas, timestamps, versions, and source hashes](../outputs/publication_readiness/2026-09-26T17-04-39-531Z/evidence.json). Evidence SHA-256: `f7a32fb9f7b8c59c3d228031ef5af458e26db20f63590cb55d4d170d33d9c2ba`.
- [Warning-rule aggregate evidence](../outputs/qa_reassessment/quality-rules.json), collected by [read-only SQL profile](../backend/scripts/qa-quality-profile.ts).
- [Live overview labels and chart values](../outputs/qa_reassessment/overview-evidence.json), collected by [browser evidence script](../tmp/qa-reassessment-overview.cjs); [desktop screenshot](../frontend/test-results-qa-live/desktop.png).

Limits: no frontend production build was run while `next dev` was active. No deployment, warehouse write, destructive upload/refresh, non-admin role matrix, or session-expiry test was performed. Baseline tests and scenario fixtures do not certify trained predictive models. Business signoff and publication approval are not established by this assessment. Evidence is point-in-time for the current working tree and warehouse dataset.

## Prior QA pass: 2026-09-25 to 2026-09-26 (Asia/Manila)

### Step 1 remediation: complete (2026-09-26)

The unsupported overview claims finding is resolved. The fabricated multi-hazard gauge and its period-dependent constants were removed from the dashboard runtime. The fixed Prophet value/interval, peak-season claim, buyer share, disease alerts, and stock-out alerts were replaced with publication/review status. Candidate sales values remain connected to the gateway. Overview provenance and help copy now identify candidate data, baseline validation, and scenario limits. The alternate React overview components were updated to match.

Verification:

- Frontend production build passed with compilation, lint, and type validation. The final standalone TypeScript check also passed after correcting a test element type.
- Four focused browser checks passed: two overview publication/period/navigation checks and two existing financial-definition checks.
- The authenticated live smoke check passed for sales KPIs, Databricks provenance, publication limits, period changes, navigation, and absence of page errors. [Updated desktop evidence](../frontend/test-results-step1/live-overview.png).
- Runtime no longer registers or invokes the removed threat-gauge handlers. No analytical/backend publication was changed.

### Step 2 remediation: repository mapping complete (2026-09-26)

The shipped area mapping now includes the geographic and evidence fields required by the Gold reader. It preserves only the seven original province approvals recorded in repository version `16779af`, explicitly marked `LEGACY_APPROVAL_NOT_REVALIDATED`. Aliases, derived LGU proposals, channels, business lines, and ambiguous source labels remain `needs_review`; pending rows cannot enable geographic eligibility. Every external mapping remains pending. This restores the documented mapping contract without creating source-owner approvals or weakening Gold validation.

Verification:

- All 26 sales-restart tests passed, including full required-column loading and a new regression check for approval boundaries.
- All 76 offline analytics tests passed.
- The refreshed area coverage audit accounts for all 32 observed labels against 35 mapping rows, with no unmatched labels and zero records ready for external joins. Its 37,178 retained records are the historical local audit fixture population, distinct from the live 37,728-transaction QA snapshot below.
- Mapping checksum and coverage evidence were refreshed in `outputs/area_mapping_review/summary.json`. No mapping upload, warehouse rebuild, or external publication was performed; applying the repaired file to Databricks remains pending.

### Step 3 remediation: complete (2026-09-26)

The monthly gateway now validates a supplied year before loading the dashboard snapshot. Only a single complete four-digit year (1000–9999) is accepted, with surrounding whitespace trimmed. Omitted filters retain all history; empty, partial, malformed, repeated, and structured inputs return 400. The filter matches the year followed by the monthly period separator, preserving future-year support without accidental prefix matches. Authentication and downstream source-failure handling remain in place. No warehouse changes are needed for this gateway fix.

Verification:

- Three deterministic regression tests passed via `node --import tsx --test tests/monthlyQuery.test.ts` from `backend/`, covering accepted inputs, rejected inputs, exact matching, and empty results.
- Backend `npm run build` passed.
- The authenticated live API check passed: six malformed query shapes returned 400; missing/invalid bearer tokens returned 401; unfiltered history contained 108 rows; 2017, 2025, and 2030 filters matched the corresponding complete-year subsets (2030 was empty).
- API behavior and the regression command are documented in [API.md](API.md) and [TESTING.md](TESTING.md).

### Step 4 remediation: complete (2026-09-26)

Live dashboard, client-reference, and QA smoke tests now share an explicit core-data readiness gate. They wait for `data-source-state="ready"` before assertions and report the unavailable state/provenance if loading fails. The live provenance assertion requires Databricks Gold. Desktop acceptance and opt-in mobile exploration are separate; the retained mobile overflow assertion runs only with `MEDSHIELD_QA_MOBILE=true`.

The external-source and regression preparation jobs were rerun in order against the repaired mapping. Generated source outputs were unchanged; the report and regression artifact now record the current mapping checksum. All 1,787 DOH territory-month candidate rows remain pending, with zero approved regression rows and `BLOCKED_EXTERNAL_MAPPING_PENDING`. Stale-source guards were preserved, and no external joins or warehouse publication were enabled.

Verification:

- Nine live desktop checks passed; the separate mobile exploration was explicitly skipped for desktop-only scope. These checks cover bootstrap KPIs, seven-module navigation, area weights, date/period filtering, extended pages, forecast CSV export, client search/filter/pagination, and anonymous gateway denial.
- Two readiness-helper checks passed for loading-to-ready and unavailable-source diagnostics.
- All three external-regression browser checks passed, including the previously failing local prepared-source audit and blocked-result UI/export behavior.
- All 76 offline analytics tests passed. Frontend TypeScript validation passed, and lint completed with no warnings or errors.

All four repository remediation steps are complete. **User-requested follow-up: remind the user to assess the remaining Databricks work now**, including applying the repaired area mapping and checking warehouse rebuild reproducibility/publication readiness. No Databricks upload or rebuild was performed during these steps. Passing local QA does not establish source-owner signoff or deployment acceptance.

**Current verdict: four repository remediations verified; Databricks application and deployment acceptance remain pending.** Primary owner: QA Engineer. This pass tested the current working tree, localhost frontend/gateway, offline suites, and read-only live Databricks contracts. Existing user edits were preserved. The loading hook and CSS changed concurrently, so this is point-in-time evidence, not certification of an immutable commit. The original findings and check results below preserve the initial QA evidence; remediation results above supersede their status.

### Plan and acceptance

1. Inspect requirements, architecture, security, tests, working tree, and service state.
2. Run compiler/lint checks, offline analytics and sales-restart tests.
3. Verify live analytical reconciliation, denied API access, and invalid query handling.
4. Exercise authenticated dashboard readiness/navigation and inspect desktop/mobile output.
5. Record reproducible defects and owners without modifying application behavior or publishing data.

Business impact is trust in planning outputs and usable dashboard access. Architecture/schema changes were not required. Data and security verification was read-only except normal login/audit events. No warehouse publication, migration, ingestion, or model regeneration was performed.

### Findings

| Priority | Finding and evidence | Impact and next owner/action |
|---|---|---|
| P1 | **Overview presents hardcoded surveillance and planning claims as current evidence.** `frontend/services/api/odometer-runtime.ts:341` starts with score 28.4, DOH 1.12x and rainfall 42 mm; selecting three months substitutes fixed score 76.8 and epidemic/disaster claims. Line 174 labels this a REAL-TIME DSS GAUGE. The rendered overview also shows a static Prophet forecast of ₱9.3M with ±12.4% CI (`frontend/lib/medshieldReference.ts:274`), disease/stock-out alerts, and a local-fallback warning alongside Databricks-only provenance. | Conflicts with REQUIREMENTS/CURRENT_STATE: historical evidence, unapproved external joins, no analytical fallback, and no published trained predictive outputs. Frontend/analytics owner should remove unsupported operational claims or explicitly isolate illustrative scenarios; bind published metrics to actual model evidence. Do not infer publication approval from a successful data load. |
| P1 | **Shipped area mapping cannot be consumed by the documented Gold rebuild.** `python -m unittest discover -s databricks/sales_restart/tests` fails `test_shipped_master_template_and_current_area_mapping_load` with `Area mapping evidence must be recorded: BATANGAS`. The CSV header at `datasources/templates/area_classification_mapping.csv:1` lacks evidence and geographic metadata demanded by `03_sales_gold.py:208`. The README explicitly directs operators to upload this CSV. | Rebuilding with the supplied mapping fails; existing live warehouse data passing validation does not prove reproducibility. Data owner must restore/review the expanded mapping with genuine evidence and rerun all 25 tests. Do not weaken approval validation or invent evidence. |
| P2 | **Mobile overview overflows horizontally.** The live QA test at 375 × 812 reports `document.documentElement.scrollWidth = 582`, versus `innerWidth = 375`. Screenshot shows topbar controls extending off-screen and cramped content. | Mobile controls and content are difficult to use. Frontend owner should repair responsive topbar/sidebar/content sizing and pass the retained regression assertion. |
| P2 | **Malformed monthly year is silently accepted.** Authenticated `GET /api/monthly?year=bad` returns `200 []`; `backend/src/server.ts:539` uses string-prefix filtering with no year validation. | Invalid input is indistinguishable from valid empty history; partial year prefixes can match multiple years. Backend owner should validate complete supported year syntax, reject malformed input with 400, and preserve arbitrary future-year support. |
| P2 | **Legacy live tests assert KPI readiness too early.** Outside the sandbox, bootstrap login succeeds but its five-second currency assertion sees Unavailable while the loading overlay remains displayed (`frontend/e2e/medshield-dashboard.spec.ts:59`). The new check waits for `.medshield-root[data-source-state="ready"]` and successfully reaches currency KPIs, Databricks provenance, and all seven main modules. | False failures obscure actual product defects. QA owner should use the explicit ready state in shared live-test setup, with a bounded timeout and useful unavailable-state diagnostics. |
| P2 | **External-regression test depends on a stale local preparation artifact.** `frontend/e2e/external-regression.spec.ts:74` fails before UI assertions. `load_external()` rejects `data/medshield/processed/regression_external_monthly.json`: the DOH checksum matches, but the area-mapping checksum does not. | Offline integration evidence is invalid until preparation is reconciled. Data/QA owner should review mapping changes, regenerate the appropriate offline artifact, and rerun. This is separate from the live Databricks regression response, which correctly remains blocked. |

### Executed checks

| Check | Result | Evidence |
|---|---|---|
| Backend `npm run build` | PASS | TypeScript compilation completed. |
| Frontend `npx tsc --noEmit --incremental false` | PASS | Initial run and final run after adding the QA test. |
| Frontend `npm run lint` | PASS | No ESLint warnings/errors. |
| `python -m unittest discover -s services/tests` | PASS | 76 tests. |
| `python -m unittest discover -s databricks/sales_restart/tests` | FAIL | 25 run, 24 passed, one mapping error above. |
| Frontend existing Playwright suite | MIXED | 40 total: 25 passed, 11 failed, four explicitly skipped legacy-year tests. Ten failures stopped at secure-session setup inside the sandbox; one failed on stale preparation. These ten are environment failures, not ten established login defects. |
| Unrestricted single bootstrap retry | FAIL | Login succeeded; KPI assertion raced the loading gate. |
| New `qa-live-readiness.spec.ts` | FAIL, mobile only | With unrestricted network, ready-state, currency KPI, Databricks provenance, seven-module navigation, and no page errors all passed. Final horizontal-overflow assertion failed 582 > 375. |
| `npm run databricks:check:dashboard` | PASS on unrestricted retry | Sandbox attempt returned fetch failed. Live retry reconciled 108 monthly rows, nine annual rows, 37,728 transactions, zero duplicates, and zero financial mismatches. |
| Gateway health / frontend response | PASS | Both localhost:5000/api/health and localhost:3000 responded with HTTP 200 (frontend followed login redirect). |
| Missing and invalid bearer tokens | PASS | Both variants returned 401 for summary, transactions, forecast-validation, planning-shortlist, weather effects, audit read, and auth/me. Existing E2E also passed anonymous denial for analytics and upload/planning POST routes. |
| Authenticated query validation | MIXED | `products?limit=abc` and `sales/transactions?page=-1` returned 400; `monthly?year=bad` returned 200. |
| Frontend production build | NOT RUN | Running Node services were present; detailed process command-line inspection was denied. Avoided possible conflict with active next dev and its .next cache. |

Live reconciliation: net sales ₱626,946,741.81; transaction gross profit ₱288,487,498.72. Accepted population includes 32,749 warning rows; passing reconciliation does not clear those warnings or candidate publication approvals. PAGASA returned 384 historical rows for 2017–2024 with zero approved sales matches. NASA POWER returned 108 rows for 2025. External regression remained blocked as documented.

### Reproduction and artifacts

Run from `frontend/` with access to the configured authentication service and live gateway:

```powershell
node node_modules/@playwright/test/cli.js test e2e/qa-live-readiness.spec.ts --workers=1 --output=test-results-qa-live
```

The added [QA regression check](../frontend/e2e/qa-live-readiness.spec.ts) uses the existing E2E credential conventions. Tokens are not logged. It deliberately retains the failing mobile assertion rather than relaxing acceptance.

- [Desktop evidence](../frontend/test-results-qa-live/desktop.png)
- [Mobile evidence](../frontend/test-results-qa-live/mobile.png)

Not verified: full mobile interactions/accessibility, non-admin role denial, logout/refresh expiry, destructive ingestion/refresh operations, production build/deployment, and every authenticated business flow/export after correcting readiness setup. Browser navigation proves module switching, not correctness of every deferred dataset. No application fixes were made in this QA pass.

## Historical QA pass: 2026-06-28

> **Historical QA record:** This review records the 2026-06-28 implementation and its then-current Python/Supabase paths. It is preserved as test evidence and does not describe the current Databricks-only analytical runtime. See [CURRENT_STATE.md](CURRENT_STATE.md) and [TESTING.md](TESTING.md).

## Scope

Review date: 2026-06-28

This review covers the MedShield backend gateway, Python services, Supabase schema alignment, agent operating instructions, and dashboard UI information density.

## Findings and Actions

| Area | Finding | Action Taken | Residual Risk |
|---|---|---|---|
| Backend/API | Product endpoint accepted invalid `limit` values at the gateway and silently defaulted. | Added integer/range validation in the TypeScript gateway and Python product service. | Other query params should receive the same validation pattern as endpoints expand. |
| Frontend/API | API base URL could produce double slashes when `NEXT_PUBLIC_API_BASE_URL` ended with `/`. | Normalized `API_BASE_URL` by trimming the trailing slash. | Keep this pattern in future API helpers. |
| UI density | Sales transaction view showed the full 13-column ledger by default, increasing cognitive load. | Added Compact vs Full Ledger detail mode. Compact is the default and keeps evidence available on demand. | Full ledger remains dense by design for audit/reconciliation use. |
| UI density | Overview lacked a short decision-first guide before detailed charts/status panels. | Added a Decision Focus panel with primary signal, review signal, and guardrail. | Longer embedded legacy dashboard code should eventually be replaced with typed React components. |
| Weather validation UI | Weather validation opened daily rows by default, creating a noisy table. | Defaulted validation to monthly aggregate while keeping daily rows available. | Provider refresh still depends on external network availability. |
| Schema | Current migration direction aligns to namespaced MedShield schemas and public API views. | No schema migration was required for this pass. | Apply `007_namespaced_schema_alignment.sql` in target Supabase before relying on namespaced tables in shared environments. |
| Agents/process | `AGENTS.md` and worker files provide enough sequencing and QA guidance. | Followed orchestrator, frontend, backend, database, security, and QA guidance for this pass. | Keep role files current when ownership or quality gates change. |
| Build quality | Frontend build warns about Supabase middleware importing code that uses a Node API under Edge runtime. | Documented as a QA finding; not changed in this pass. | Review middleware runtime or Supabase SSR usage before production deployment. |

## Verification Evidence

- `backend`: `npm run build` passed.
- `frontend`: `npm run build` passed with the existing Supabase Edge-runtime warning.
- `services`: `python -m unittest services.tests.test_data_pipeline` passed 11 tests.
- `services`: `python -m compileall services backend` passed syntax compilation.
- Gateway health: `GET /api/health` returned `status: ok`.
- Auth smoke test: local admin login returned a bearer token.
- Dashboard API smoke test: authenticated `GET /api/summary` returned revenue data.
- Product validation smoke test: authenticated `GET /api/products?limit=3` returned 3 rows; `limit=abc` returned HTTP 400.
- Frontend smoke test: `http://127.0.0.1:3001` returned HTTP 200 with `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001`.

## Recommendation

The next highest-value cleanup is to replace the embedded legacy dashboard markup/script with typed React components page by page. That would reduce bundle warnings, make UI behavior testable, and prevent future information-overload fixes from relying on string patching.
