# Database migration regressions — 16 October 2026

## Forecast-use brief/system/paper consolidation — 20 October 2026

From `frontend/`:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/forecast_use_review_20261020/fixtures.config.cjs
node node_modules/@playwright/test/cli.js test --config=../outputs/forecast_use_review_20261020/live.config.cjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js services/api/forecast-validation-runtime.ts services/api/predictive-research-runtime.ts
```

Fourteen focused cases and one configured live workflow pass. Checks cover
source-derived use/error context, CSV agreement, approved-versus-research
wording, selected-model changes, projections without actual errors, null/zero/
signed values, empty scopes, source failure/recovery and desktop/mobile fit.
The [delivery and receipts](../outputs/forecast_use_review_20261020/README.md)
retain source-number/document checks and original-artifact preservation. This
validates presentation/documentation, not improved model accuracy or acceptance.

## Offline sector and forecast-schedule assessment — 20 October 2026

From the repository root:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 -m unittest services.tests.test_predictive services.tests.test_predictive_sector_refresh -v
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/sector_refresh_evaluation_20261020/qa/verify_results.py --results outputs/sector_refresh_evaluation_20261020/run/results.json
```

[Assessment and source-bound receipts](../outputs/sector_refresh_evaluation_20261020/README.md)
retain the registered run, input/source hashes, actual calendar leads, matched
schedule targets, native/common support, missing/signed/zero probes, future-value
invariance, sector-sum checks and cancellation-aware horizon totals. The scoped
24-test run passed; separate Decimal verification checks retained source and
output artifacts without using the runner's forecast/score functions as its
expected-value oracle. This is offline historical evaluation, not a live
warehouse/browser test, model fit, untouched test or acceptance decision.

## Five-page information density — 20 October 2026

From `frontend/`, with existing local services for the live case:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/ui_density_followup_20261020/fixtures.config.cjs
node node_modules/@playwright/test/cli.js test --config=../outputs/ui_density_followup_20261020/live.config.cjs
```

[Delivery and receipts](../outputs/ui_density_followup_20261020/README.md) cover
closed notes, retained statuses/metrics/exports, provider-specific compact columns,
full evidence, zero/missing/empty states, no switch refetch, keyboard access,
desktop/mobile layout and browser-only source failure/recovery. The initial
test-formatting failure and subsequent passing run remain separately recorded.

## Client-provided annual record labels — 20 October 2026

From `frontend/`, reuse the configured local services for the live case:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/recorded_year_labels_20261020/fixtures.config.cjs
node node_modules/@playwright/test/cli.js test --config=../outputs/recorded_year_labels_20261020/live.config.cjs
```

The [delivery record](../outputs/recorded_year_labels_20261020/README.md) separates
the first failures, corrected fixture checks and configured live evidence. Check
plain historical years, visible month counts, exact unchanged financial totals,
null versus observed zero, matched Y/Y, selected-date labels, current-year YTD,
both graph scopes, CSV and mobile fit. Client submission completeness and month
observations are different facts. No forecast or source-audit approval is implied.

## Current study scope and independent financial populations — 20 October 2026

From `frontend/` with the configured local services for the live case:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/study_scope_2017_2025_20261020/fixtures.config.cjs
node node_modules/@playwright/test/cli.js test --config=../outputs/study_scope_2017_2025_20261020/live.config.cjs
```

The [delivery record](../outputs/study_scope_2017_2025_20261020/README.md) checks
the nine-year default, removed history selector, scope metadata/CSV, all-sector
source agreement, independent profit-only periods with null sales, matching
margin bases, dates/Y/Y, preserved predictive rendering, mobile and source failure.
The saved model window/results are unchanged. Runtime tests and the actual model
quality/acceptance decision remain different evidence.

## Overall and selected-sector trend graphs — 19 October 2026

From `frontend/`:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/overall_sector_graphs_20261019/fixtures.config.cjs
node node_modules/@playwright/test/cli.js test --config=../outputs/overall_sector_graphs_20261019/live.config.cjs
```

The [delivery record](../outputs/overall_sector_graphs_20261019/README.md) separates
the 48-case broader regression receipt, final six-case palette/sector receipt and
final configured live workflow. Check fixed All data, four sector choices, common
dates/grain/measure/signed bounds, exact custom dates and Y/Y populations, both
CSVs/tables, missing/zero/negative states, scope-correct chart investigation,
all-sector contribution rows, mobile stacking and explicit source-failure reset.
The live case independently groups served sector-trend inputs; it is not a new
source-file or warehouse audit. Screenshots suppress the fixed app header only
during tall element capture. No build runs alongside the existing Next dev.

## Sector diagnostic overview and paper evidence — 19 October 2026

The [delivery record](../outputs/sector_diagnostic_20261019/README.md) distinguishes
isolated regressions, configured live integration, independent source/CSV
recomputation and manuscript claims. From `backend/`:

```powershell
node --import tsx --test tests/sector-trend.test.ts tests/sales-diagnostics.test.ts tests/sales-diagnostics-query.test.ts tests/role-matrix.test.ts tests/http-boundaries.test.ts
```

From `frontend/` with configured local services for the live case:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/sector_diagnostic_20261019/fixtures.config.cjs
node node_modules/@playwright/test/cli.js test --config=../outputs/sector_diagnostic_20261019/live.config.cjs
```

From the repository root:

```powershell
python -X utf8 outputs/sector_diagnostic_20261019/verify_findings.py
python -X utf8 outputs/sector_diagnostic_20261019/prepare_findings.py
```

The live flow compares all five scopes against independently grouped served
Gold catalog inputs, reconciles signed sector changes, checks margin bases,
captures trend/contribution CSVs, traverses Government/month/product/area,
checks settled mobile width and browser-only required-source failure/recovery.
Synthetic cases cover null/zero/signed/missing and exact-date/matched overlays,
comparison failure/reset/retry, access denial, source evidence partitions and
existing diagnostic behavior. A responsive chart resize must settle before
measuring mobile overflow. No real provider outage or new source/causal approval
is implied; no build runs concurrently with Next dev.

## Authentication 503 recovery — 19 October 2026

The [focused recovery evidence](../outputs/auth_503_recovery_20261019/README.md)
separates observed gateway connection-reset logs, isolated identity/middleware
regressions and browser-only outage injections. From `backend/`:

```powershell
node --import tsx --test tests/supabase-identity.test.ts tests/auth-configuration.test.ts tests/role-matrix.test.ts tests/http-boundaries.test.ts
```

From `frontend/`, against the existing configured development services:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/auth_503_recovery_20261019/playwright.config.cjs
```

Checks cover bounded recovery at both identity reads, persistent-failure denial,
unchanged invalid/inactive/linked-role controls, no password POST replay,
structured API errors, hidden analytics, distinct identity/source messages and
reload recovery to live data. No real provider interruption or guaranteed
external availability is implied; no build runs alongside Next dev.

## Buyer-scoped predictive evidence — 19 October 2026

[Delivery and evidence](../outputs/predictive_buyer_scope_20261019/README.md)
retain the before/after live scope responses, CSVs and independent recomputation.
From `backend/`, the focused predictive/approval/calendar regression command is:

```powershell
node --import tsx --test tests/forecast*.test.ts tests/predictiveRelease.test.ts tests/predictiveCandidate.test.ts tests/predictiveCoverage.test.ts tests/dashboard-validator.test.ts
```

From `frontend/`, against the existing configured local services:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/predictive_buyer_scope_20261019/playwright.config.cjs
node node_modules/@playwright/test/cli.js test --config=../outputs/predictive_buyer_scope_20261019/fixtures.config.cjs
```

The live case checks buyer-scoped actuals, 3/6/12-month benchmark/table/CSV parity,
the empty Unknown selection, cross-sector reconciliation and browser-only
source503 clearing/recovery. The isolated cases cover signed/null/zero errors,
published-adapter boundaries, model/lead behavior, new empty-state reset and
stored-research regression. Captures are scoped to each run; the older historical
screenshots are not overwritten. Tests do not grant model/mapping approval or
establish future accuracy. No build runs alongside Next dev.

## Graph meaning and output corrections — 17 October 2026

[Graph clarity evidence](../outputs/graph_clarity_20261017/README.md) records
29 passing browser scenarios, frontend types/lint and numerical preservation of
18 captured series. The isolated cases distinguish incomplete annual totals from
growth, absent mapped rows from observed zero, unknown source Qty from verified
units, and empty future predictions from available zero/negative predictions.
Full forecast evidence/CSV retains requested missing months and supported
intervals; interior gaps remain blank. Existing area interactions and live
Product category/cohort/search/CSV reconciliation remain checked.

From `frontend/`, using existing configured local services:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/graph_clarity_20261017/playwright.final.config.cjs
```

One live workflow checks six loaded pages at1440/390 widths; these are12 layout
cases, not12 separate test scenarios. Explicit screenshots wait for loaded source
and settled chart geometry. Trace/video/automatic screenshots are disabled.
Retained first loading-state captures and the inactive-page wait failure are
not passing loaded-output evidence. This is local self-review, without model,
business, academic, operational or release approval; no production build ran.

## Canonical 2017–2025 sales source verification — 17 October 2026

The full-corpus tests now read `databricks/medshield_project_csv/medshield_project_csv`,
the deployment input. They previously read the different `data/medshield/dataset_csv`
copy. [Verification receipt](../outputs/source_verification_20261017/README.md)
retains both source-copy hashes, 89 passing tests, and 273 live/local checks.

```powershell
python databricks/medshield_project/verify_local_sources.py --output outputs/source_verification_20261017/local-audit.json
python -X utf8 -m unittest discover -s databricks/medshield_project/tests -v
```

The verifier loads only pure Bronze/Silver declarations; it never executes Spark
cells, edits CSVs or creates catalog approvals. It checks every physical line,
retains all dispositions, uses exact source hashes and produces a 108-month
calendar with nulls for months lacking records. Packaging words are clues, not
verified units. Tests cover wrong inventory, changed bytes, unknown months and
adjusted-source preservation. Tests may skip the corpus when deployment files
are absent; no skip is a source-verification pass.

For the separately configured live read-only comparison:

```powershell
node backend/node_modules/tsx/dist/cli.mjs outputs/source_verification_20261017/capture-live.ts
python outputs/source_verification_20261017/verify_readback.py
python outputs/source_verification_20261017/build_resolution_queue.py
```

Refresh these artifacts together. A changed release/master fails explicitly;
retained receipts do not certify later files, models or releases. No dashboard
request reads these local outputs.

## QA navigation, evidence hierarchy and copy repairs — 17 October 2026

[Repair evidence](../outputs/qa_remediation_20261017/README.md) adds
`e2e/qa-remediation-live.spec.ts`: named/keyboard navigation, drawer/rail state,
disabled-upload messaging, quote removal, source/projection evidence details,
and loaded desktop/mobile summaries with retained warnings. Existing research
and forecast tests now open the newly collapsed sections through their controls;
their numerical/CSV/null/candidate and unavailable-source assertions remain.

From `frontend/`, with the existing configured local services:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/qa_remediation_20261017/playwright.verified.config.cjs
node node_modules/@playwright/test/cli.js test --config=../outputs/qa_remediation_20261017/playwright.product-export.config.cjs
```

Trace/video/automatic screenshots are off; explicit local QA screenshots and CSV
artifacts are retained in the packet. The separate HTTP fixture startup loop uses
a bounded15-second health deadline and one-second request timeouts. Its full
isolated backend run is distinct from live browser evidence or cloud acceptance.
No build alongside Next dev, real provider outage or source/model mutation.

## Chart repair follow-up — 17 October 2026

[Follow-up verification](../outputs/chart_initialization_fix_20261017/FOLLOWUP.md)
passes12 distinct scenarios across the initial run and focused recovery rerun:
12 live page/width geometry cases in one workflow,9 synthetic chart-integrity
scenarios and2 browser-only503/network recovery scenarios. Initial11/12 pass;
network response-body capture failed across navigation. Immediate listener
capture reproduced the harness issue in focused503 case; final route.fetch
capture delivers the upstream response unchanged and both recovery cases pass.
All identity/unavailable/cleared-chart assertions retained; failures preserved.
No product/chart code, data/models, providers or server changes in this follow-up.
Root Frontend self-review; fixture/proxy failures do not establish real outages.

## Chart initialization and editor detection — 17 October 2026

[Repair evidence](../outputs/chart_initialization_fix_20261017/README.md) retains
the live failure with twelve obsolete-canvas warnings, then passing scoped
initializer contracts and real chart/navigation/reload checks. Only the six
replaced reference targets are guarded; required current-target diagnostics
remain. Local Windows `REACT_EDITOR=code` selects the installed VS Code command
without WMIC auto-detection; installed module is checked with stubbed spawn.
Run the packet's `playwright.config.cjs` for live source-backed verification and
`contract.config.cjs` for isolated contracts from frontend. No production build
alongside nextdev. Local server start/restart was authorized for this repair;
do not infer broader data/model/release acceptance from these checks.

## Native synthetic backup/restore rehearsal —17 October2026

[The backup/restore packet](../outputs/backup_restore_20261017/README.md) records
23 passing checks in `supabase/tests/test_backup_restore.py`: a new loopback-only
cluster applies actual migrations to synthetic fixtures, dumps a sealed custom
archive, drops only its own new source database, restores transactionally into
its own new target, reconciles all-table fingerprints/schema/effective grants,
RLS/audit checkpoint and verifies denial/sequence/append/replay continuity.

```powershell
python -X utf8 supabase/tests/test_backup_restore.py --bin outputs/database_remediation_20261016/environment-runtime/pgsql/bin --output outputs/backup_restore_20261017
```

The existing native16 binaries are required; this is not a live17 managed restore.
All fixture servers stop in cleanup. First Windows pipe handling and raw-versus-
default ACL comparison failures remain; final corrected harness retains actual
access-denial expectations. Stopped cluster-folder deletion was policy-rejected;
directories are retained. No real account/source/model/dependency change or app
build. Full managed recovery scope remains in [the runbook](BACKUP_RESTORE.md).

## Isolated selected-Supabase gateway role matrix —17 October2026

The [role matrix](../outputs/role_matrix_20261017/README.md) adds
`backend/tests/role-matrix.test.ts` and its synthetic fixture.135 HTTP observations
cover linked roles, reset/invalid/unlinked/inactive sessions, privileged/audit
read gates, planning/reset/refresh validation and metadata-role non-elevation.
No real Supabase/provider/warehouse request is permitted. Actual source503 and
validation400 mean route authorization passed, not successful real operations.

From backend/:

```powershell
node --import tsx --test --test-concurrency=1 tests/role-matrix.test.ts tests/http-boundaries.test.ts
```

The executed combined run reports20 passes including nested/parent tests, not20
new cases. To save the safe response matrix, set MEDSHIELD_ROLE_MATRIX_RECEIPT
to an absolute evidence JSON path before execution. Initial concurrent existing
fixture startup failure is retained; sequential run passes with unchanged app/
old fixture. Temporary child/path cleanup verified; running app preserved.
No build necessary for tests-only changes. Real all-role token/RLS/browser,
revocation/load and backup restoration remain separate acceptance scopes.

## T09 step5 audit readback and consolidated handoff —17 October2026

[The consolidated handoff](../outputs/t09_modules_20261017/step5-WALKTHROUGH_HANDOFF.md)
links all five dated walkthrough steps without summing overlapping checks.
`node outputs/t09_modules_20261017/step5-audit-read.cjs` runs from repository
root with current configured services:14 checks pass,10 remote audit records
independently reconcile, earlier four rollout events retain exact hashes, and
gateway readback is nondegraded. GET/POST401 and authenticated empty POST400
append no records. No new audit append or raw record/auth storage is retained.
Checkpoint read403 is an explicit current-value limitation, not a failed chain
hash check or an invitation to widen access. Prior actual append/replay/concurrency
and checkpoint results remain inherited.102 Step2 artifact hashes and source/
build identity match; no product change/rebuild. Root self-review. The guided
walkthrough is complete within its scope; full release/restore/roles and model/
source/business/academic acceptance remain separate.

## T09 step 4 unavailable-source and recovery — 17 October 2026

The [Step4 packet](../outputs/t09_modules_20261017/step4-RECOVERY_REVIEW.md)
records7/7 passing tests on the unchanged checked source/build: existing five
`e2e/dashboard-recovery.spec.ts` isolated module contracts plus new two
`e2e/t09-source-recovery-live.spec.ts` built-app browser simulations. Required
monthly503 and transport abort both hide charts/exports; after override removal
and reload, full release identity and pending approval label are preserved.

From frontend/ against configured services:

```powershell
node node_modules/@playwright/test/cli.js test --config=../outputs/t09_modules_20261017/step4-playwright.config.cjs
```

Trace/video/automatic screenshots are disabled; manual crops show only unavailable
alerts. Simulations do not interrupt real cloud services. Isolated retries and
stale-response checks are distinct from actual built-app visibility/recovery;
no real provider restart, hosted recovery or full backup/restore is established.
No application change/build required. Source/build fingerprints, results and
limitations are retained in the packet; nextStep5 covers audit/evidence review.

## T09 step 2 actual modules and Area export regressions — 17 October 2026

The [step-2 packet](../outputs/t09_modules_20261017/README.md) binds six passing
actual browser cases to one freshly built frontend/current compiled gateway and
fact20 source. New canonical `e2e/t09-sales-products-live.spec.ts` verifies
exact-date investigation JSON,72-row STL reconstruction/CSV, matched margin,
category partitions and full-cohort product exports. `e2e/t09-area-planning-live.spec.ts`
checks current-source chart/ranking/CSV filters, zero-match draft reference export,
synthetic scenario arithmetic/CSV and stale/unacknowledged/infeasible guards.
`e2e/t09-area-export.spec.ts` has two isolated regression fixtures for raw precision,
weights/product/category/date filters, empty/error clearing and draft-reference scope.
These fixture cases do not prove live source completeness.

Run from frontend/ with configured services, traces/video/automatic screenshots off:

```powershell
node node_modules/@playwright/test/cli.js test e2e/t09-area-export.spec.ts --workers=1 --retries=0 --trace=off
$env:MEDSHIELD_E2E_FACT_VERSION='20'
node node_modules/@playwright/test/cli.js test --config=../outputs/t09_modules_20261017/integrated-playwright.config.cjs
```

From repository root, `node outputs/t09_modules_20261017/predictive-integrated-csv-verify.cjs`
compares final actual downloads against current API;151/151 pass. Initial538
matching21-grid and6 mismatched-run checks, and24 backend deterministic tests
remain distinct. Do not count old15 or six offline recipes as current runtime models.
The packet retains true pre-repair defects and harness cwd/wording failures;
no failed assertion was waived. Frontend lint/types/build pass. Production source
repair requires a fresh build with no nextdev; run lint separately. Existing build
warnings and broader T09/model/business/academic gates remain separate.

## T09 step 1 built-app readiness — 17 October 2026

The [step-1 evidence](../outputs/t09_login_20261017/README.md) binds the existing
production Next build/current compiled gateway to actual configured authentication
and Databricks candidate fact20. The canonical browser scenario checks login,
all12 core responses/ready gate, source/candidate labels, authenticated reload,
logout UI isolation and malformed actual Supabase-cookie/invalid gateway denial:

```powershell
# Run from frontend/ against the configured services. Use the reviewed fact pin.
$env:MEDSHIELD_E2E_FACT_VERSION = '20'
node node_modules/@playwright/test/cli.js test e2e/integrated-login-live.spec.ts --workers=1 --retries=0 --trace=off
```

The test disables trace/video/automatic error screenshots, masks account details
in manual screenshots and saves only source/status/readiness fields. Never persist
valid auth storage/cookies/tokens to reproduce it. Independent read-only API51
checks reconcile source and financial populations separately. The existing
per-row₱0.01 arithmetic tolerance does not imply aggregate residual≤₱0.01; the
observed−₱0.06 is retained with zero over-threshold rows and an unverified cause.
One configured administrator and exploratory mobile rendering do not constitute
all-role/full-responsive/module/filter/export or complete T09 release acceptance.

## T08 recovery and HTTP verification — 17 October 2026

The [T08 packet](../outputs/auth_http_remediation_20261017/README.md) retains
158/158 full backend tests, runtime build and strict all-script compilation;
44/44 independent recovery cases; 99/99 actual isolated HTTP responses plus ten
protocol/no-data checks; and both no-write ordinary-migration denial cases.
Canonical `tests/auth-recovery.test.ts` covers read-only preflight, audit ordering,
credential/reset continuity, zero-write rejection and explicit partial-state resume.
`tests/http-boundaries.test.ts` launches fixture gateways with blocked external
network access for auth/reset/scalar ordering, missing-source 503, configured
release 502 and explicit CORS 403. Helpers live in `tests/fixtures/`.

The configured live check passed 17/17 on one new disposable viewer after a
retained harness-only profile-envelope correction. It exercises actual Auth
deletion/FK unlink, the CLI with split UTF-8 stdin, forced reset, password change,
old/new credential behavior, profile, remote audit hashes and a read-only
Databricks benchmark. Both attempts cleaned up their synthetic identities and
gateway; six audit events remain. All 35 original table/stable-Auth fingerprints
match. `live-verify.cjs` mutates a new test identity: do not rerun merely to
recreate this report. Full role/session-revocation/load/restore verification is
outside this scope. No frontend build is required for these backend-only changes.

## Actual live Supabase rollout verification — 17 October 2026

The [rollout packet](../outputs/supabase_live_migration_20261017/README.md)
separates native PostgreSQL16.15 fixtures (234 initial and118 service-repair
assertions) from actual configured PostgreSQL17.6/Auth/PostgREST/gateway evidence.
Three exact-hash plugin migrations succeeded and appear in the live ledger.
All35 original table/stable-Auth counts and content hashes match after API tests.

Run the existing catalog-only `supabase/verification/legacy_analytical_access.sql`
and inspect row statuses. For this already-private layout its raw result retains
43 MISSING_GATE expectations; each is reconciled in
[retired dispositions](../outputs/supabase_live_migration_20261017/live/retired-public-dispositions.json)
against21 private replacements and the previously absent public refresh wrapper.
There are zero actual FAIL or scope-review rows. The packet's
`live/verify-target-layout.sql` verifies those replacements and executes zero-row
SELECTs on57 relations under actual service_role inside a rolled-back transaction.
Unknown missing objects are not accepted by these specific dispositions.

With the configured gateway running normally, this bounded integration script
exercises actual login/profile, denied browser/direct-write paths and committed
service/gateway audit persistence:

```powershell
node outputs/supabase_live_migration_20261017/live/audit-api-verify.cjs
```

This is a live mutation test: it appends four clearly identified synthetic audit
events and retains them. Do not rerun merely to reproduce a report. The stored
execution passed39/39, independently reconstructs the full four-event chain and
checks gateway `storage: supabase` and nondegraded reads; root separately verified
the checkpoint. A read-only Databricks benchmark smoke passed with unpublished
status. It is not a full role matrix, load/recovery/backup rehearsal or fresh full
warehouse/model validation. Native fixture and verification gateway were stopped.
No application rebuild is required solely for these SQL/documentation changes.

Use a disposable native PostgreSQL 16+ cluster with `pgcrypto` and a superuser.
The fixture runner creates uniquely named `medshield_t06_*` databases on
loopback only and creates missing synthetic API roles. Never point it at an
application database/cluster. It leaves the fixture databases for inspection;
stop the disposable server after reviewing the evidence.

```powershell
python -X utf8 supabase/tests/test_migrations.py --psql <absolute-psql-path> --port 55432 --output <new-evidence-directory>
```

This runs the 001–017 chain with restrictive defaults and old/custom grants,
optional functions absent/present, and repeats017. It checks actual SQLSTATE
permission denials, all 21 legacy views, independent column grants, effective
schema/relation/sequence/routine access, retired policies, unrelated public
objects, linked profiles, service identity/cache/refresh and atomic audit
hash/idempotence. Four native connections append eight distinct events per
profile and independently reconcile the full nine-event chain. Supabase Auth
helpers/default grants are explicit synthetic fixtures, not actual platform/API
verification. The optional `--baseline-011 <original-file>` reproduces the old
bootstrap failure and pre-repair view exposure in its own fixture database.

Run `supabase/verification/legacy_analytical_access.sql` separately through
`psql --no-psqlrc --set=ON_ERROR_STOP=1 --csv --file=<path>` for catalog-only
effective-privilege results. A successful SQL command may report FAIL,
MISSING_GATE or REVIEW_SCOPE: inspect its summary and rows. It does not execute
application functions or read business rows. An empty catalog must not pass;
unknown dependent public views/default owners need review. See the
[actual native and endpoint evidence](../outputs/database_remediation_20261016/README.md).
No application rebuild is required solely for these SQL/documentation edits.

# Dependency migration regression checks — 16 October 2026

The [T05 packet](../outputs/dependency_remediation_20261016/README.md) records
fresh package audits separately for full and production trees. Both production
audits are zero; an upstream development lint advisory and ESLint support/peer
constraints remain open. A passing build or clean production audit does not
close the complete-toolchain or wider release gates.

After package or Next/React changes, run backend `npm run build`,
`npm run typecheck:scripts` and `node --import tsx --test tests/*.test.ts`.
In `frontend/`, run `npm run lint`,
`node node_modules/typescript/bin/tsc --noEmit --incremental false`, then
`npm run build` with no Next dev owning `.next`. Next16 no longer lints during
build; keep the separate ESLint CLI check. The build script explicitly retains
Webpack. The Docker build copies `eslint.config.mjs`, not the removed legacy
ESLint config.

`e2e/dependency-runtime.spec.ts` exercises the actual built application:
authenticated reload, rapid logout once, invalid-session denial and simulated
required-source outage with real-source recovery. Scope alert selectors to the
application because Next also renders an accessibility route announcer. Run it
with `e2e/descriptive-acceptance-live.spec.ts` and
`e2e/predictive-research-live.spec.ts` against configured authentication and Gold;
set `MEDSHIELD_E2E_FACT_VERSION` to the checked source version. The retained
study/experiment expectations are version-bound, not arbitrary latest data.
The packet's separately authored actual React19 lifecycle harness uses mocked
provider/gateway boundaries and cannot establish live provider behavior.

# Operational validator and all-script compiler — 16 October 2026

From `backend/`, run `npm run typecheck:scripts` to compile all `src/**/*.ts`
and `scripts/**/*.ts` under the runtime's strict settings, without emitted files.
The ordinary runtime build alone does not check operational scripts. Run
`node --import tsx --test tests/dashboard-validator.test.ts` for deterministic
scope/calendar/source/missing-value checks and
`node --dns-result-order=ipv4first --import tsx scripts/validate-databricks-dashboard.ts`
for the real read-only Databricks check. The latter requires a usable configured
warehouse; fixtures and compilation do not substitute for live verification.

The validator checks complete origin–target–lead keys and common scored cases
within each 3/6/12 retrospective view. Future display length stays distinct from
the true lead measured from the last observed origin. It checks current Manila
as-of/display dates, captured release identity and explicit blocked Unknown
scope. Unpublished future actuals/predictions/bounds remain null. Date fixtures
inject a clock; they do not depend on the date when tests run. The
[T07 receipt](../outputs/validator_completion_20261016/README.md) records the
current compiler coverage, fixture/live executions, review mode and limits.

# Stored predictive research integration verification — 15 October 2026

The system research panel uses the immutable Databricks experiment contract,
with a separate view from approved forecast serving and gateway benchmarks.
From `backend/`:

```powershell
node --import tsx --test tests/predictiveResearch.test.ts tests/dashboard-validator.test.ts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc --noEmit --target es2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict scripts/validate-databricks-dashboard.ts tests/dashboard-validator.test.ts
```

From `frontend/`, the isolated browser checks run without a live warehouse:

```powershell
node node_modules/@playwright/test/cli.js test e2e/predictive-research.spec.ts e2e/forecast-validation.spec.ts e2e/dashboard-recovery.spec.ts --workers=1 --output=test-results-predictive-research
```

These checks cover source/hash identity, origin-keyed comparisons, null/signed
values, unavailable models, projections' genuine timing and unavailable errors,
selector/CSV behavior, stale-response suppression and source-failure clearing.
They do not establish current live warehouse availability or future accuracy.
Use a new evidence output path when repeating a verification.

The dashboard validator now checks supported company `All` benchmarks separately
from blocked `Unknown` scope. Calendar/year/product counts and eligible revenue
are derived from the pinned Gold population rather than fixed study-year counts.
It preserves null-versus-zero checks. Its live execution requires the configured
warehouse to be available; a compiler/fixture pass does not count as live success.

The dated live test `e2e/predictive-research-live.spec.ts` verifies the stored
21-model fact-20 experiment, repeated development target months across origins,
audit values, CSV identity and projection timing. It intentionally binds the
retained experiment hash; assess/update the expected evidence before using it
against another accepted release. Navigate through the actual sidebar so the
deferred research loader runs. The legacy programmatic `showPage` call alone
does not exercise this loader. The test uses real authentication and warehouse
reads; credentials and tokens are not written to its result artifacts.

## Source-bound forecast YoY — 16 October 2026

The scoped [T13 evidence packet](../outputs/predictive_yoy_20261016/README.md)
records actual commands, source identities, first attempts and remaining limits.
Baseline tests must cover frozen-input resolution, canonical digest compatibility,
typed/payload agreement, ambiguous/duplicate/partial groups, source changes,
eligible positive denominators and explicit null reasons. Numerical checks use
hand-solvable cases and independent Decimal recomputation of the twelve retained
projections. A percentage alone does not measure forecast accuracy.

The research fixture and live browser tests check prior-year baseline, forecast
YoY, CSV provenance/parity and mobile containment alongside unchanged models,
historical errors and generation/cutoff/lead semantics. Source-failure clearing
is checked in isolated fixtures without disrupting the live warehouse. Live
acceptance requires authenticated source-backed results; fixtures and a build
do not establish it. No new source ingestion, model training or publication is
part of these checks.

# Bounded predictive error reduction verification — 10 October 2026

The [six-recipe packet](../outputs/predictive_error_optimization_20261010/README.md)
retains frozen source/code/protocol identities and the independent Decimal
oracle expectations prepared before real-source evaluation. From the root:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 -m unittest services.tests.test_predictive_robust_error services.tests.test_predictive_annual_projection -v
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/predictive_error_optimization_20261010/qa/test_independent_oracle.py
```

The focused checks cover signed observations, median duplicates/ties, scalar
bounds and zero-endpoint loss, origin-known targets, gaps, malformed/null output,
registration drift and overwrite protection. The annual-helper fixture checks
do not create new real-source annual projections. The independent reviewer
reconstructs all new points, retained baseline keys, aggregate/directional errors
and original challenger gates without importing the production forecast code.
Review the frozen development choice before audit timing and retain unsuccessful
methods. A numerical pass does not demonstrate future accuracy or client approval.
The packet records actual commands, counts, tolerances and reproducible bindings;
do not overwrite its run when reproducing. No application build is required.

# Predictive error visibility verification — 10 October 2026

The [presentation packet](../outputs/predictive_error_visibility_20261010/README.md)
binds the monthly table/CSV errors, historical summary context, unit formatting
and unavailable states. From `frontend/`, run the isolated browser fixtures:

```powershell
node node_modules/@playwright/test/cli.js test e2e/forecast-validation.spec.ts --workers=1 --output=../outputs/predictive_error_visibility_20261010/playwright
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

The fixture suite uses `medshield.test`, `page.setContent` and the gateway's pure
benchmark evaluator; it does not require Next.js, a running gateway or Databricks.
Check matched historical pairs, signed direction, negative actuals, observed zero,
null/mismatched/future pairs, units, CSV escaping, source failure clearing and
mobile overflow. Do not use these presentation checks as live integration or
forecast accuracy evidence. Retain a new output directory when reproducing;
do not overwrite a prior evidence packet.

# Predictive error-policy verification — 10 October 2026

The [joint error-policy packet](../outputs/predictive_error_policy_20261010/README.md)
derives retained historical predictions with no model fit or serving change.
Its [independent numerical review](../outputs/predictive_error_policy_20261010/qa/REPORT.md)
supplies executed commands and source/code/output hash bindings. Check common
forecast keys, paired MAE/PHP and WAPE/%, signed/directional error reconciliation,
empty/zero-denominator behavior and unset-limit acceptance separation.
The cancellation example must retain nonzero MAE despite zero signed bias.
Do not run application builds solely for this offline presentation step, or
interpret a numerical pass as client tolerance or publication approval.

# Annual predictive projection verification — 10 October 2026

The [annual packet](../outputs/predictive_annual_release_20261010/README.md)
retains a pre-fit registration and actual final-origin fits. Its
[independent QA report](../outputs/predictive_annual_release_20261010/qa/REPORT.md)
documents checksum/code/package identity checks, exact temporal populations,
null actuals/bands, publication separation and independently reconstructed
benchmarks/ridge values. From the repository root:

```powershell
.\.venv-predictive\Scripts\python.exe -m unittest services.tests.test_predictive_annual_projection -v
.\.venv-predictive\Scripts\python.exe outputs/predictive_annual_release_20261010/qa/test_independent_math.py
```

The fixture tests cover training cutoff, future-row exclusion, exact recipe
invocations, adapter failures/convergence, malformed output, checksum/registration
drift, no overwrite and actual-generation versus reference-date semantics.
The QA report supplies the artifact verifier command and pre-fit expected-values
receipt. These local checks establish research artifact integrity, not cloud
deployment, measured 2026 accuracy or business acceptance. No frontend/gateway
runtime path was changed by this module.

# Predictive model continuation verification — 9 October 2026

The [delivery record](../outputs/predictive_completion_20261009/README.md) binds
actual model evaluation, independent numerical/leakage QA, gateway tests,
authenticated browser checks and candidate warehouse readback. Technical passes
do not approve operational forecasting. From the repository root:

```powershell
.\.venv-predictive\Scripts\python.exe -m unittest services.tests.test_predictive services.tests.test_predictive_coverage_review services.tests.test_predictive_diagnosis services.tests.test_predictive_rolling services.tests.test_forecast_validation services.tests.test_predictive_extended
```

From `backend/`, run the forecast tests plus `tests/predictiveRelease.test.ts`
and `tests/predictiveCandidate.test.ts` with `node --import tsx --test`.
The new candidate tests cover approval separation, immutable source identities,
mixed/duplicate prediction keys, true leads, future actual exclusion, complete
artifact hashes and unsafe artifact paths. Check the persistence scripts with:

```powershell
node node_modules/typescript/bin/tsc --noEmit --target es2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict scripts/persist-predictive-candidate.ts scripts/predictive-candidate-contract.ts tests/predictiveCandidate.test.ts
```

From `frontend/`, run `e2e/forecast-validation.spec.ts` and
`e2e/predictive-live.spec.ts` with `--workers=1`. Bind live source expectations
through `MEDSHIELD_E2E_FACT_VERSION` and `MEDSHIELD_E2E_DATASET_ID`. Set
`MEDSHIELD_E2E_PREDICTIVE_EVIDENCE_DIR` to a new evidence directory; the default
is `test-results/predictive-live-evidence`, so historical September receipts are
not overwritten. Run frontend TypeScript with `--noEmit --incremental false`.
The live tests verify the current unpublished boundary, not cloud model accuracy
or activation. Independent model verifiers and exact commands are in the
[QA review](../outputs/predictive_completion_20261009/qa/REVIEW.md).

# Latest descriptive candidate verification — 9 October 2026

The [full-period check](../outputs/descriptive_activation_20261009/full-history-scope-receipt.json)
binds the current 2017–2025 preset, checked source and results. The earlier
[activation report](../outputs/descriptive_activation_20261009/README.md)
retains the broader regression checks and historical 2021–2025 subset. Use
[Current state](CURRENT_STATE.md) for the changing fact pin and counts.
From `backend/`, run `node --import tsx --test tests/*.test.ts` and
`node node_modules/typescript/bin/tsc --noEmit`. Null/observed-zero regressions
execute the gateway with isolated warehouse responses; UTF-8 literal tests
preserve punctuation and Unicode without changing authentication.

From `frontend/`, with local authenticated services running and the expected
fact/policy set in `MEDSHIELD_E2E_FACT_VERSION` / `MEDSHIELD_E2E_POLICY_VERSION`:

```powershell
node node_modules/@playwright/test/cli.js test e2e/descriptive-live.spec.ts e2e/descriptive-acceptance-live.spec.ts --workers=1
```

The study test checks the actual Capstone preset, 2017–2025 exact financial totals,
108 calendar slots with 98 observed months and ten unknown gaps, same-population
margin, category partition/export identities and apostrophe search.
Its independent expected calculation receipt is explicit in the test; update that
binding before accepting a later fact version. Isolated regressions use
`dashboard-null-contract.spec.ts`, `diagnostic-drilldown.spec.ts`,
`sales-data-view.spec.ts`, `catalog-resolution.spec.ts` and
`product-prioritization.spec.ts`. These cover unavailable/null/zero behavior,
export readiness and current evidence inspection. Run frontend noEmit TypeScript;
do not run a Next production build while its dev server is active.

# Weather provider verification — 8 October 2026

From `backend/`: `node --import tsx --test tests/weatherProviders.test.ts tests/nasaPowerWeather.test.ts`
and `node node_modules/typescript/bin/tsc --noEmit`. Request fixtures check closed
Manila months, missing/zero/duplicate days, unit/timezone/schema errors, explicit
models, no warehouse writes after source failure and exact candidate readback.
`node --import tsx scripts/check-weather-providers.ts` performs a bounded,
read-only live provider/adapter probe; it does not publish warehouse values.

From the repository root: `python -m unittest services.tests.test_weather_provider_reliability`.
`python -m services.analytics_service.jobs.evaluate_weather_providers --prepare-only`
freezes the protocol before network execution. Omit `--prepare-only` for the
bounded 12-station historical run; `--offline` reuses hash-verified caches.
`python outputs/weather_reliability_20261008/verify_benchmark.py` independently
reconciles source hashes, paired counts, percentages and error metrics.

From `frontend/`: `node node_modules/@playwright/test/cli.js test e2e/weather-providers.spec.ts --workers=1`.
The isolated browser fixture uses actual weather modules with controlled gateway
responses; it verifies provider/area/year options, explicit refresh requests,
null versus zero rendering and clearing stale rows on source failure. It is not
a live warehouse UI check. Results and limits:
[weather validation](../outputs/weather_reliability_20261008/VALIDATION.md).

# Category acceptance verification — 8 October 2026

The accepted-category revision uses the fixed category-only publication contract.
Local verification covers exact label/receipt coverage, original master byte hashes,
seven mutable fields only, tampered classification, unchanged quantities/demand
gates, forbidden SKU/unit/forecast/CEO approvals and financial partitions including
Unclassified. See [the bound verification](../outputs/category_acceptance_20261008/README.md).

```powershell
python outputs/category_acceptance_20261008/verify.py
python -m unittest discover -s databricks/medshield_project/tests
python databricks/medshield_project/render_readme.py --check
```

From `backend`: `node --import tsx --test tests/catalog-contract.test.ts` and
`node node_modules/typescript/bin/tsc --noEmit --target es2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck scripts/prepare-catalog-publication.ts scripts/validate-catalog.ts`.
The tests include accepted Medical and Unclassified sales with unresolved identity,
separate category denominators, signed returns and null physical quantities.
These are local fixture/file checks. Fresh cloud replacement/API/STL validation,
recovery rehearsal and release acceptance remain operator steps. The earlier
dated test records below are historical and are not renewed by these checks.

# Descriptive delivery verification

Chart additions and responsive presentation checks (from `frontend/`):

```powershell
npx tsc --noEmit --incremental false
npx playwright test e2e/descriptive-chart-integrity.spec.ts e2e/descriptive-chart-layout.spec.ts --workers=1
npx playwright test e2e/dashboard-chart-live.spec.ts e2e/prescriptive-planning.spec.ts --workers=1
```

The layout fixtures verify zero/negative observations, excluded gaps/estimates,
full-month movement, grain independence, separate ABC denominators, buyer ownership
and chart fit at 1440, 926 and 375px. The live check uses the actual navigation
listeners and waits for each deferred data capability. Screenshots and measurements
are saved under `outputs/descriptive-chart-polish-20261003/`.
Do not run a production build alongside `next dev`.

Current local candidate target (rechecked 2026-10-03 Manila): fact Delta version
17, policy `sales_restart_gold_v7_independent_catalog`. This is a candidate
preview, not CEO dataset approval. See `outputs/candidate_release_20261003/` for
the bound receipts and remaining production rollback limitations.

From `backend/`: `node --import tsx --test tests/*.test.ts`,
`node --import tsx scripts/publication-readiness.ts`, and
`node --import tsx scripts/validate-descriptive.ts`. The last now requires matching
warehouse STL and checks each component's observed revenue against monthly evidence.
The live browser test checks the explicitly selected candidate version and policy
against the STL panel and downloads. Set both before running it:

```powershell
$env:MEDSHIELD_E2E_FACT_VERSION = '17'
$env:MEDSHIELD_E2E_POLICY_VERSION = 'sales_restart_gold_v7_independent_catalog'
npx playwright test e2e/descriptive-live.spec.ts --workers=1
```

Run this from `frontend/`, with both authenticated local servers available.
Choose new values only after collecting a new version-bound receipt. The existing
financial and 72-month fixture assertions describe this dataset; new source data
requires independently verified expected totals and coverage.

From `frontend/`: `node node_modules/@playwright/test/cli.js test e2e/descriptive-live.spec.ts e2e/product-prioritization.spec.ts e2e/sales-heatmap.spec.ts e2e/area-prioritization.spec.ts e2e/sales-sectors.spec.ts e2e/sales-diagnostics.spec.ts e2e/remediation-layout.spec.ts --workers=1`.
Both local servers and the configured authenticated Databricks connection must be
available. Tests do not grant business approval. Keep known skipped legacy tests
separate from executed passes. Do not build into `.next` while `next dev` is running.

## Earlier verification records

# Testing

## Current descriptive remediation checks

- `python -m unittest discover -s databricks/medshield_project/tests` — canonical
  migrated notebook suite, provenance guard and STL algorithm parity.
- From `backend`: `node --import tsx --test tests/*.test.ts` and
  `node node_modules/typescript/bin/tsc --noEmit`.
- From `frontend`: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- Browser: `node node_modules/@playwright/test/cli.js test e2e/descriptive-live.spec.ts e2e/remediation-layout.spec.ts --workers=1`.
- To run the existing exploratory mobile test, set `MEDSHIELD_QA_MOBILE=true`.
- Publication collection: `node --import tsx scripts/publication-readiness.ts`
  from backend. Two live provenance failures remain until operator deployment.
- STL adapter: `databricks/medshield_project/06_sales_stl.py`; local parity is not
  proof of a successful cloud job. The panel must show unavailable until its
  fact version and dataset match the active gateway release.

Do not run a frontend production build against the same `.next` directory while
`next dev` is active. None of these checks records business approval.


## Descriptive calculation checks

From `backend/`, run:

```powershell
node --import tsx --test tests/descriptive-metrics.test.ts tests/descriptive-products.test.ts
node --import tsx scripts/validate-descriptive.ts
```

The live validator is read-only. It checks revenue reconciliation, common-base
margin, missing-month nulls and observed seasonal means, then saves a hashed
receipt with the stable Delta version and dataset identity. It does not replace
the publication-readiness audit or grant approval.

From `frontend/`, run:

```powershell
npx tsc --noEmit
npx playwright test e2e/metric-definitions.spec.ts e2e/overview-evidence.spec.ts e2e/product-prioritization.spec.ts e2e/sales-diagnostics.spec.ts --workers=1
npx playwright test e2e/descriptive-live.spec.ts --workers=1
```

From the repository root, run the offline STL checks:

```powershell
python -m unittest services.analytics_service.jobs.test_descriptive_stl
python services/analytics_service/jobs/run_descriptive_stl.py --evidence outputs/descriptive_validation/2026-09-26T17-52-02-042Z/evidence.json --output outputs/descriptive_validation/2026-09-26T17-52-02-042Z/stl.json
```

For a new run, replace the receipt path with the new validator output. The job
verifies the receipt hash and uses `statsmodels` from `requirements-modeling.txt`.
It requires 36 uninterrupted monthly observations by default, uses period 12,
seasonal window 13 and robust fitting, and checks component reconstruction.
Short segments and unavailable months remain disclosed; no sales are imputed.
See the [official STL documentation](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.STL.html).

Monthly gateway year validation has a deterministic regression check. Run from `backend/`:

```powershell
node --import tsx --test tests/monthlyQuery.test.ts
```

It covers omitted filters, historical/future years, malformed/repeated/structured inputs, exact year selection, and valid empty results.

## Static and build checks

Run these sequentially. Stop `next dev` before the frontend production build.

```powershell
cd backend
npm run build

cd ..\frontend
npx tsc --noEmit
npm run build
```

## Python analytics tests

From the repository root:

```powershell
python -m unittest discover -s services/tests
python -m unittest discover -s databricks/medshield_project/tests
```

These tests validate offline logic and notebook transformations. They do not prove that the live Databricks tables were refreshed.

## Live Databricks checks

With server-only variables configured and the warehouse running:

```powershell
cd backend
npm run databricks:check:dashboard
npm run databricks:check:external
```

Verify:

- nine yearly rows cover 2017-2025;
- the current checksum-bound snapshot reconciles 37,728 accepted transactions;
- monthly, product, area, transaction, heatmap, sector, and forecast-baseline responses identify Databricks Gold;
- sector/geographic outputs expose derived mapping provenance;
- PAGASA and NASA POWER remain separately labeled;
- external regression stays blocked while join approval is absent;
- invalid parameters return `400`;
- a warehouse/view failure returns a Databricks error and no analytical fallback.

## Frontend end-to-end checks

The isolated sales-ledger suite runs without local services:

```powershell
cd frontend
node node_modules/@playwright/test/cli.js test e2e/sales-data-view.spec.ts e2e/diagnostic-drilldown.spec.ts --workers=1
```

It checks search/year/quality filters, summary scope, pagination, compact/full
columns, source details, signed and missing values, empty/error/refresh states,
and investigation release retention. Layout checks cover 1440 and 926px; set
`MEDSHIELD_QA_MOBILE=true` to include the exploratory 390px ledger check. These
fixtures exercise production renderers and listeners, not live Databricks access.

Start the gateway and frontend, configure `MEDSHIELD_E2E_USERNAME` and `MEDSHIELD_E2E_PASSWORD` when needed, then run:

```powershell
cd frontend
npm run test:e2e
```

The suite covers dashboard loading, metrics, sales diagnostics, heatmaps, buyer/area views, forecast validation, external regression, product prioritization, planning, client references, and overview evidence limits. Live suites share `e2e/helpers/dashboard.ts`: they wait for `.medshield-root[data-source-state="ready"]` before checking KPIs and report source diagnostics when loading fails. Topbar presence and network idle alone are not readiness evidence.

MedShield release acceptance is desktop-only. The separate exploratory mobile overview check runs only when `MEDSHIELD_QA_MOBILE=true`; skipping it does not certify mobile support.

The optional local external-regression audit needs checksum-consistent preparation after any area-mapping change. Run from the repository root in this order:

```powershell
python -m services.analytics_service.jobs.prepare_external_sources
python -m services.analytics_service.jobs.prepare_regression_sources
```

These jobs rebuild local candidate evidence from supplied sources. They do not publish to Databricks or approve external joins. The regression artifact must remain blocked when external mapping is pending; never manually replace its checksum to bypass stale-source validation.

Manual acceptance should also confirm:

- the dashboard stays behind a loading/unavailable state until the Databricks core contract succeeds;
- the freshness/provenance UI identifies Databricks Gold and candidate status;
- sales upload returns the Databricks-ingestion message;
- NASA POWER refresh is role-gated and publishes through Databricks;
- PAGASA refresh directs the operator to the external-source notebook;
- scenario outputs show their assumptions and never present purchase execution.

## Authentication and security

- Protected routes reject a missing/invalid token with `401`.
- Role-restricted routes reject unauthorized users with `403`.
- Production uses Supabase Auth; local-session mode is development-only.
- Databricks tokens, warehouse IDs, and Supabase server secrets do not appear in browser responses, logs, screenshots, or committed files.

## Documentation verification

Analytical output design verification covers the Overview decision cards, four Sales panels, Products evidence details, Areas coverage, Forecast validation and Planning scenario states. The [3 October design record](../outputs/analytical-output-design-20261003/README.md) records the focused suite results and screenshots. `e2e/dashboard-chart-live.spec.ts` checks all nine tabs at 1440, 926 and 375px, plus the Sales subsections, using authenticated live Databricks data. It saves `outputs/analytical-output-design-20261003/live-layout.json` and desktop/mobile screenshots. Source readiness is required; no fixture data replaces the live source gate.

For Markdown-only changes, check relative links, stale architecture terms, sales-year scope, candidate status, and generated/historical labels. Application builds are unnecessary unless behavior or commands also changed.


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

Catalog checks (repository root unless indicated):

```powershell
python -m unittest discover -s databricks/medshield_project/tests
python databricks/medshield_project/render_readme.py --check
```

From backend: `node --import tsx --test tests/catalog-contract.test.ts tests/descriptive-products.test.ts`.
Read-only live compatibility/candidate verification: `node --import tsx scripts/validate-catalog.ts`.
From frontend: `node node_modules/@playwright/test/cli.js test e2e/catalog-resolution.spec.ts e2e/product-prioritization.spec.ts e2e/sales-heatmap.spec.ts e2e/area-prioritization.spec.ts --workers=1`.
Use TypeScript `--noEmit`; do not build into `.next` while next dev runs.
# Predictive verification — 27 September 2026

Continuation checks: 21 Python tests (including unsigned review generation),
15 gateway tests (including coverage validation and byte-preserving SQL values),
and backend no-emit typecheck passed. Full real 15-configuration training completed.
Updated input and 1,092 candidate forecast/backtest rows plus 15 evaluations passed
Databricks readback. Model activation and cloud rollback remain unverified and
were not attempted; no model is recommended for operational publication.

Focused results: 20 Python tests, 12 gateway tests and four isolated forecast
browser tests passed; backend and frontend no-emit type checks passed. The browser
suite uses the actual TypeScript benchmark builder and verifies unavailable
states, calendar rollover, chart/table/CSV parity and published-adapter identity.
The live read-only extraction reconciled successfully. Live authenticated
verification initially caught a Spark DISTINCT ordering alias defect; the query
was corrected. Check the blueprint record for the final live retry outcome.
Cloud DDL and candidate input persistence passed live readback. Model activation,
rollback and actual challenger accuracy are not verified.
Commands and dependencies are in [PREDICTIVE_OPERATIONS.md](PREDICTIVE_OPERATIONS.md).

## Drill-down and QA remediation — 5 October 2026

`frontend/e2e/diagnostic-drilldown.spec.ts` covers exact chart/date/dimension scope,
signed partition reconciliation, observed/estimated isolation, retry, export, source
identity and filtered transaction paging/summary. `dashboard-recovery.spec.ts` covers
deferred-load retry, post-2025 provenance and cookie-restored API authentication.
Backend `sales-diagnostics.test.ts`, `sales-diagnostics-query.test.ts`,
`auth-configuration.test.ts` and `audit-store.test.ts` protect analytics/auth/audit boundaries.
See [implementation and limits](DRILLDOWN_DIAGNOSTICS.md) and the
[executed remediation record](../outputs/remediation-drilldown-20261005/README.md).

## Current-year estimate removal — 17 October 2026

`frontend/e2e/current-year-observations.spec.ts`: six passing cases cover absent
current-year observations, partial actuals/zero, null profit, rollover and custom
2026 charts in 2026/2027. Fifteen existing descriptive chart-integrity and stored
predictive-research cases pass against the final runtime. TypeScript and targeted
lint pass. Two initial custom-chart fixture failures were corrected by awaiting
lazy chart creation; see [execution scope and artifacts](../outputs/current_year_estimate_removal_20261017/README.md).
No live warehouse revalidation or production build was performed for this
frontend-only correction; stored candidate research remains separately available.

## Long-horizon company-PHP experiment — 17 October 2026

`python -m unittest services.tests.test_predictive_long_horizon services.tests.test_predictive services.tests.test_predictive_extended`:
26 pass in the predictive environment. New cases cover future-actual poisoning,
second-year seasonal indexing, training gaps, partial-fold exclusion, signed
revenue and zero percentage denominators. Actual experiment has40 complete
model-origin fits. Separate Decimal/source/key/hash verification passes836
checks; [execution and limits](../outputs/forecast_2027_experiment_20261017/REVIEW.md).
These checks do not establish2027 actual accuracy, independent validation,
calibrated intervals, live Databricks execution or operational acceptance.


## External-context and analytics audit — 20 October 2026

Use the [audit packet](../outputs/analytics_external_audit_20261020/README.md) for source identities and numerical checks. Focused gateway tests are `node --import tsx --test tests/external-context.test.ts tests/analytics-formula-crosscheck.test.ts` from `backend/`. They check buyer/product/approved-geography SQL, invalid options, source outage, unique monthly keys, null/zero/signed values and hand-calculated financial/forecast/pack examples. `frontend/e2e/external-context.spec.ts` checks compiled runtime, charts/table/CSV, formula-safe text, mapping states, stale-state clearing, actual authenticated buyer changes and desktop/mobile layout. Its fixture loads the production CSS and overrides; its live check requires the configured running gateway/Next dev and Gold. Run no concurrent Next build. Python metrics/calibration and offline commercial-ABC regressions are in `services/tests/test_predictive.py` and `test_commercial_mcda.py`; fixtures do not validate live forecast accuracy. Separate `audit.py` recalculates the retained model/STL and fresh Gold aggregate evidence without fitting or publishing a real forecast.


## Warehouse currency and nonpositive margin basis — 20 October 2026

[Warehouse review evidence](../outputs/warehouse_review_20261020/README.md) retains the initial false validation failure and the repaired current gateway check. The validator now tests known Private/Quezon context separately from absent Unknown, rejecting leaked or zero-filled sales and duplicate months. Run `node --import tsx --test tests/dashboard-validator.test.ts` from `backend/`. The complete notebook suite uses `python -m unittest discover -s databricks/medshield_project/tests`; its new margin test executes the actual Gold expression through a small SQL-expression adapter on hand-calculated rows, not cloud Spark execution. The package's generated README must pass `render_readme.py --check` after source/guide edits.

`backend/scripts/review-analytical-warehouse.ts --check-margin-patch` executes read-only preflight assertions, formula previews and EXPLAIN analysis, without applying maintenance SQL. The prepared SQL has separate post-write rowset assertions that remain unexecuted until an operator applies the reviewed change. Counts/source identities, before/after versions, immutable-field equality, current API validation and actual cloud receipt are required to close the open repair. Passing preparation checks is not an applied migration or a model/data publication decision.
