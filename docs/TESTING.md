# Database migration regressions — 16 October 2026

## Dashboard presentation QA — 10 November 2026

Run the live probe and value sample from `frontend/` with the configured
loopback frontend and gateway. Use separate external destinations for the
before and after runs. The probe waits for visible busy states to clear, and
the sampler waits for the Area readout before capturing its values.

```powershell
$qaOut = Join-Path ([IO.Path]::GetTempPath()) ('medshield-ui-qa-' + (Get-Date -Format yyyyMMdd-HHmmss))
$env:MEDSHIELD_QA_OUT = Join-Path $qaOut 'probe'
$env:MEDSHIELD_SAMPLE_OUT = Join-Path $qaOut 'values'
node --env-file=.env.e2e.local node_modules/@playwright/test/cli.js test e2e/ui-qa-probe.spec.ts --workers=1 --output="$qaOut\probe-run"
node --env-file=.env.e2e.local node_modules/@playwright/test/cli.js test e2e/ui-value-sample.spec.ts --workers=1 --output="$qaOut\values-run"
```

The 10 November run records 90 screenshots before and 90 after across nine
pages and five widths. The settled probe found 300 card surfaces at 10px with
no shadows, 620 controls at 36px with 6px corners, and zero mismatches across
220 measured header/cell pairs. All 12 sampled sets match byte for byte. The
compact ledger fits at 1024px. The expanded Full Ledger uses its separate
scroll region, as required by its existing regression case.

All Phase 6 commands ran. TypeScript, lint, generated script bindings and the
production build passed. Next dev was stopped for the build and restarted with
`npm run dev`. The fixture group had 35 passes and four pre-existing skips.
The full live run passed 13 cases. The visual case timed out on finite Chromium
transitions and passed on focused retry with all 27 captures and the original
contrast and viewport assertions. The source failure cases cleared stale data
and recovered after browser-only 503 and network simulations.

Earlier receipts retain the Windows host interruption, transient gateway
503s, old fixture layout pins, and the premature Area sample that captured
skeleton rows. The settled retry uses the original before sample and identical
comparison. Raw screenshots, samples and logs are outside Git in the local
temporary folder `medshield-ui-qa-20261110-797e5fd3`. See the
[per-ID audit](UI_QA_AUDIT_20261110.md#verification-result--10-november-2026)
for the five partially met items.

### Overview analytics disclosures

The authenticated follow-up used the probe and sampler above at 1440px.
All nine pages had zero horizontal overflow and all 12 sampled sets matched
byte for byte. A focused check also matched all four Overview readouts,
scope notes, chart series and the coverage count before and after.

The closed Overview had four controls, down from 13, and measured 210px,
down from 333px at 1440px. The diagnostic chart widened from 238px to
1,102px. The open section measured 695px, up from 521px, because the chart
and scope now occupy their own row. At 1024px and 390px the selected panel
also spanned the grid with zero horizontal overflow. Enter toggled each
panel, opening a second closed the first, and Tab reached the detail action.

The affected fixture suite passed 58 cases, including number-free forecast
loading, unavailable evidence, and geometry at 1440, 1024, 824 and 390px.
The focused live Overview forecast refresh, TypeScript, lint and generated
bindings also passed. The production build was not rerun while Next dev
served the live checks. Screenshots, samples and logs are outside Git in
the local temporary folder `medshield-overview-qa-20261110-8065a885`.

### Dashboard padding and Product search

The live probe checked all nine dashboard views at 1440, 1024 and 390px
before and after. All 27 checks had zero document overflow. The 78 regular
and 51 compact surface observations use the three intended padding
combinations, down from nine. The Product table header remains 39px at
1440 and 1024px, and the compact Sales Ledger still fits at 1024px. All
12 sampled dashboard value sets matched byte for byte.

The focused live Product check verified 12px of horizontal padding, a
36px control height, solid border and 2px keyboard focus outline. Search
and paging still work. The placeholder fits at 390, 561, 600, 680, 681,
1024 and 1440px after moving the stack to 680px. The Forecast dropdown
width estimates improved but still flag possible truncation for some
long selected labels.

The 55-case browser group passed after running the narrow-filter case
with the E2E environment. All eight Product fixtures passed again after
the breakpoint adjustment. TypeScript, lint and generated bindings
passed. The production build was not rerun while Next dev was serving.
Live captures and logs are outside Git in the local temporary folder
`medshield-padding-qa-20261110-a644c9cb`.

## Phase 5 integration verification — 6 November 2026

The [Phase 5 commands and receipts](../outputs/improvement_phase5_20261106/README.md) record 67 frontend fixtures, 100 backend cases, 35 offline Python cases and five authenticated live Forecast repetitions passing. Types, lint, generated bindings, loopback cancellation and frozen-study hashes pass. Live login helpers now require MEDSHIELD_E2E_USERNAME and MEDSHIELD_E2E_PASSWORD; no default account or password fallback is allowed. Keep values in temporary process environment variables, never retained files. Direct route checks preserve the initial omitted-field failure and the two-route metadata recovery; fresh numeric repeat equality is separate from inherited older before/after parity. Own source services were stopped; no frontend build ran alongside Next dev.

## Analytics reading-guide contracts — 6 November 2026

From frontend/, run `npx playwright test e2e/dashboard-filter-placement.spec.ts e2e/overview-analytics-sections.spec.ts e2e/graph-clarity.spec.ts e2e/chart-initialization-contract.spec.ts e2e/forecast-validation.spec.ts --workers=2`. All 41 passed in the [Phase 4 run](../outputs/improvement_phase4_20261106/README.md); TypeScript and lint also passed. New contracts cover all page introductions at 390/1440 px, idempotent installation, external-summary preservation and original/proposed objective separation in Help. The isolated enhancement fixture passes the reading-guide installer explicitly after stripping imports. These checks preserve missing/zero/negative/error and export behavior in fixture scope; they do not prove live-provider or actual-user acceptance.

## Local source-review continuation — 6 November 2026

The source triage uses the canonical original-source parser offline, validates the accepted-category package and compares source counts, Decimal signed totals and the reconstructed runtime record-key checksum against pinned controls. Changed CSV field content and a false digest are rejected; a valid checksum still leaves the business review flag unapproved. No Spark/provider calls or source writes occur. An initial BOM-only audit assumption failed; its code/receipt is retained alongside the successful hash-verified newline/BOM review. [Actual evidence](../outputs/source_review_20261106/README.md).

## Local-only validation continuation — 5 November 2026

Fresh independent Decimal/Fraction validation, source conservation, origin/lead checks, transparent baseline and seasonal-scale reconstruction are retained in the [local data/model packet](../outputs/local_data_model_validation_20261105/README.md). The [Compose rehearsal](../outputs/compose_recovery_20261105/README.md) checks healthy startup, CORS/auth, explicit analytical 503 under an invalid adapter, restored source parity and a native-export flow. Neither is a full browser rerun or approval of model accuracy. The first regional capture used an incorrect route; that failed attempt and the corrected capture are retained separately.

## Local load and image verification — 5 November 2026

The [fresh load/image packet](../outputs/load_release_review_20261105/README.md) retains the four-client catalog envelope, two mixed analytics journeys, safe Compose forwarding checks and three critical browser flows against production-mode Docker images. It includes commands, image identities, earlier failures, secret-file exclusions and cleanup receipts. The preceding gateway tests are inherited; the complete browser suite was not rerun this turn.

Use the uniquely scoped scripts and archive their fixed-name investigative receipts before a retry. Require free test ports and source-matched compiled artifacts. This one-identity finite load envelope does not establish production capacity, distinct-role acceptance or a latency SLA. [Current results and remaining gates](CURRENT_STATE.md#local-load-and-image-verification--5-november-2026).

## HTTP connection recovery verified — 5 November 2026

The repeated-read ECONNRESET is resolved in the tested local scope. A large-response synthetic control reproduced the idle-close race without Databricks: three baseline trials failed, while three matched trials using the compiled fix passed. The gateway now advertises five seconds of keep-alive and waits ten idle seconds before closing. All 150 gateway tests and ten authenticated catalog reads across five two-client rounds passed. Every catalog contained the same 40,171 ordered rows as the prior evidence; anonymous access returned 401.

Cold client reads took about 81–82 seconds and warm reads 1.5–3.5 seconds in this run. This is two clients using one test identity, not sustained target-load or production-proxy acceptance. The earlier 43 browser passes precede this listener change and are not a fresh browser rerun. No hosted deployment, analytical/model change, client acceptance or operational pilot is established.

Backend/QA owns agreed-load and cold-latency verification, followed by deployment-environment/release checks. Source/catalog owner retains coverage, identity and unit/pack evidence gates; client/operations retains actual review and pilot inputs.

[Actual diagnosis, implementation and checks](../outputs/connection_recovery_20261105/README.md). Earlier failure receipts remain dated evidence.

## Fresh full browser/gateway QA — 5 November 2026

Fresh local verification: 43/43 browser cases passed, 0 failed; 148 gateway tests and 11,283 independent reconciliation checks passed. Frontend types, lint and CSV-binding checks passed. Four authenticated Gold source reads returned 200 and anonymous research returned 401. The checked isolated frontend/gateway builds were inherited with source hashes matched; all named test executions and source captures are fresh. Bounded two-client catalog check: FAILED_BOUNDED_LOAD; cold client durations (ms): [78130, 79510]; warm durations (ms): [2038, 3429]. This uses one authenticated test identity. The first attempt failed with a fetch transport error before round 3 completed; this remains an open load-test finding. Diagnostic retry: FAILED_BOUNDED_LOAD. The retry recorded ECONNRESET while the gateway remained running and a fresh health read returned 200. Root cause remains unproven.

The 43 cases include live integration and isolated fixture/pure tests; this is not every repository test or sustained multi-user load verification. No new runtime change, hosted deployment, actual client acceptance, model promotion or accuracy improvement is established. Cold-load latency and target-load acceptance remain open.

QA/Backend first diagnoses the bounded-load transport failure (retaining the diagnostic retry), then owns cold-catalog latency measurement and sustained-load testing against agreed targets. Source/catalog owner owns the remaining coverage, product identity and unit/pack evidence checks. Client review and verified pilot operating inputs remain separate gates.

[Actual execution and receipts](../outputs/fresh_full_qa_20261105/README.md). Earlier assessments retain their original dated scope.

## Item 2 browser-flow closeout — 5 November 2026

Item 2 is closed for the verified local scope: Product/area/forecast native exports, live model-readout scope/keyboard/responsive behavior, and model source-failure clearing/recovery all passed in the capacity-recovery run. A fresh hash check confirms 80 backend source files, 80 compiled files, 150 frontend runtime files and four test/helper/configuration files still match that evidence, with the six-slot local setting intact. No additional runtime change or test rerun was needed. Full release-suite, sustained-load and cold-latency work remain open.

[Scoped closeout receipt](../outputs/browser_flow_closeout_20261105/README.md).

## Verified local capacity recovery — 5 November 2026

The local capacity recovery passed: cold concurrent sectors/ABC/STL returned 200; the complete sectors catalog contained 40,171 rows and took about 128 seconds. Fresh gateway compilation, 148 gateway tests and all three previously failing focused live browser cases passed. Four bounded 2,000-record page readers, overlapping HTTP/background validation sharing and the explicit six-slot local admission profile were used. Queue/statement time budgets remain unchanged.

This is one cold concurrent trial and focused regression evidence, not sustained multi-user or full 43-case release verification. Cold catalog latency remains high. No warehouse resize, hosted deployment, model improvement, client acceptance or operational pilot is established.

Backend/QA next measures cold-load latency and sustained concurrent load using the documented six-slot profile, then runs the source-matched full release suite. Client review and verified pilot inputs remain separate client/operations gates.

[Recovery evidence](../outputs/capacity_fix_20261105/README.md). Earlier failure receipts below remain dated history.

## Production dashboard CSV binding — 5 November 2026

From the repository root, run
`node frontend/e2e/dashboard-script-bindings.cjs`.
The regression loads the actual dashboard engine with a renamed CSV helper,
checks its generated local binding, parses the generated script and exercises
scope/provenance/approval metadata. Its negative probe of the original expression
fails before the repair. Production optimization can rename a function's
`toString()` declaration; explicitly bind helpers referenced by generated code.

Verify native downloads against a source-matched production artifact using
`e2e/system-first-live.spec.ts`, then the affected integration suites. A source
or development-only check cannot establish that optimized exports work.
The [current integration packet](../outputs/current_integration_20261105/README.md)
records the production defect, first failed attempt, repair, actual current
checks, reused gateway evidence and remaining acceptance limits. Its temporary
servers are isolated from the working frontend build cache. Inspect running
tasks before building and never build alongside Next development mode.

## Gateway and dashboard optimization — 5 November 2026

From `backend/`, run `node --import tsx --test --test-concurrency=1
tests/databricks-runtime.test.ts tests/query-cache.test.ts
tests/request-context.test.ts tests/financialScope.test.ts tests/http-boundaries.test.ts`
for queue, deadline, cancellation, cache and response boundaries. The [final
gateway receipt](../outputs/optimization_steps_20261102/backend/verified.tap)
also covers linked roles and source-matched analytical readers.

The [optimization packet](../outputs/optimization_steps_20261102/README.md)
records the repeated native output hub benchmark, actual local browser checks,
isolated lifecycle fixtures, exact-parity offline profile and separate production
build checks. To collect a fresh comparison, copy `profile-live.cjs` into a new
directory directly under `outputs/` and pass `before` or `after` on the named
local verification target. Treat end-to-end
timings as descriptive when service state or upstream availability differs.

## Model understanding and accuracy evidence — 2 November 2026

The [current packet](../outputs/client_model_evidence_20261102/README.md) binds
the three panel changes, new offline studies, original-line-ending patch,
registered input/code identities and actual check results. From repository root:

```powershell
python -X utf8 -m unittest services.tests.test_company_accuracy_evidence services.tests.test_report_forecast_metrics -v
python -X utf8 -m unittest services.tests.test_abc_accuracy_evidence services.tests.test_abc_protocol services.tests.test_abc_evaluation services.tests.test_abc_comparator_extension -v
python -X utf8 -m unittest services.tests.test_unit_accuracy_evidence -v
```

From `frontend/`, run `npm run lint` and
`node node_modules/typescript/bin/tsc --noEmit --incremental false`.
The three synthetic explanation fixtures run with
`node node_modules/@playwright/test/cli.js test e2e/model-understanding.spec.ts --grep-invert live --workers=1 --trace=off --output=<new destination>`.
For authenticated source-backed readouts, explicitly set
`MEDSHIELD_MODEL_EVIDENCE_LIVE=1` and omit `--grep-invert live`. Native details
keyboard checks, 320/390/824/1440px and 720 CSS-pixel desktop-reflow equivalent,
real gateway metric parity, browser-only503/recovery and source invalidation
remain separate from fixtures. A 720px viewport is not proof of native200% zoom;
human screen-reader/client acceptance is also separate. Retain environment
failures and only claim live checks that actually completed.

Offline verifiers independently reconstruct company intervals/baselines, ABC
fits/confusion metrics and all unit predictions/paired metrics. Their receipts
do not prove fresh warehouse truth or future accuracy; use absent output paths
where verifiers intentionally create receipts exclusively. A test pass does
not rescue a failed model-selection guard. Never repeat execution into an
existing registered study or change its protocol to obtain a favorable result.

## Final proposed SO5 local acceptance — 2 November 2026

[Current integrated receipt](../outputs/so5_acceptance_20261102/README.md) combines
system-first-live, step3-accessibility-live, step3-visual-acceptance,
all-delivery-areas-live and delivery-area-integration suites against the existing
localhost target. The immediate contrast audit now waits for finite page-entry
animations and fonts, matching the settled visual suite; it does not lower contrast
thresholds or omit pages. Initial failure and full rerun are preserved. Final source
hashes allow only that documented test-file correction; runtime files are stable.
Fresh gateway fixtures, types/lint and independent source/model/export arithmetic
are distinct from live browser evidence. Automated WCAG rules do not replace human
assistive-technology/client acceptance.


## Delivery-area/STL follow-up — 2 November 2026

[Current scoped QA evidence](../outputs/area_stl_verification_20261102/README.md)
records fresh live source/candidate readback, common-window/rollup/paired-margin
reconciliation, independent reconstruction/strength calculations, native CSV
parity and source/STL-only failures. Reproduce with backend
`node --import tsx --test tests/deliveryAreaReview.test.ts tests/regionalSalesReview.test.ts tests/areaPriorityReview.test.ts tests/regionalStlReview.test.ts tests/delivery-area-coverage-review.test.ts`
and frontend `node node_modules/@playwright/test/cli.js test e2e/delivery-area-live.spec.ts e2e/delivery-area-integration.spec.ts e2e/all-delivery-areas-live.spec.ts --workers=1 --trace=off --output=<fresh destination>`.
The new integration regression covers named focusable scroll regions, arrow-key
movement and expanded-panel accessibility. Historical serialization and first
failed attempts remain distinct from current passes; exact counts/hashes/commands
and full release/human limitations are in the packet/current-state record.

## Authenticated current local dashboard verification — 2 November 2026

[Integrated evidence and reproduction](../outputs/live_dashboard_acceptance_20261102/README.md)
records 14 distinct passing browser cases across `system-first-live.spec.ts`,
`step3-accessibility-live.spec.ts` and `step3-visual-acceptance.spec.ts`. Scope:
actual configured local sign-in/gateway/Gold, API/chart/table/native CSV parity,
matched partial years, entered-assumption solve, source outage/recovery and
1440/824/390px accessibility/settled layouts (selected320px checks). Finite
page-entry animations and fonts settle before visual contrast measurement.
Traces/video are disabled; raw exports are not copied into evidence. Types/lint
pass. Initial defects, failed attempts and an unexplained earlier ABC export wait
are preserved alongside successful diagnostic/final runs. Human acceptance and
broader production/role/release checks remain separate.
The final manifest retains checked hashes plus concurrent gateway area/STL source
drift; earlier passes must not certify those newer changes without their checks.

## Original snapshot retention recovery — 2 November 2026

From backend run `node --import tsx --test tests/snapshot-retention-plan.test.ts
tests/itemizedPreview.test.ts tests/originalItemizedSource.test.ts
tests/contractReview.test.ts tests/financialScope.test.ts` (28 passing cases),
then `node node_modules/typescript/bin/tsc -p tsconfig.scripts.json --noEmit`.
The [recovery packet](../outputs/snapshot_retention_20261102/README.md) records
actual metadata-only apply/readback, zero-write retry and all nine live pinned
gateway reader checks. Authenticated browser/full-release acceptance is separate.

## Surge investigation and advance-event checks — 2 November 2026

With `PYTHONPATH=services`,run
`python -X utf8 -m unittest services.tests.test_surge_investigation services.tests.test_company_php_forward services.tests.test_company_php_snapshot -v`.
[Fresh packet](../outputs/surge_signal_investigation_20261101/README.md) records23
passes,263 source/conservation checks and22,623 separate Decimal/hash/export
checks. Tests cover signed attribution,future revision invariance,backfilled
capture exclusion and unverified/incompatible/duplicate event denial,alongside
existing frozen forward/snapshot contracts. These are local tests and aggregate
reconciliation,not fresh warehouse/custody attestation or a prospective issue.
Reproduction jobs use new absent evidence destinations;retained receipts are not
overwritten. No runtime build or service restart was required.

## Occurrence completed-error calibration — 1 November 2026

From root: `python -X utf8 -m unittest services.tests.test_occurrence_calibration services.tests.test_report_forecast_metrics -v`
and `python -X utf8 outputs/occurrence_calibration_20261101/verify.py`.
[Actual evidence](../outputs/occurrence_calibration_20261101/README.md):10 tests
and17,767 separate numeric/source/hash/cache/correction/CSV checks pass, rebuilding
161,413 product states/69 monthly base forecasts/240 points/24 complete groups.
Current/future actual mutation, calendar gaps/duplicates, signed/scaled inputs,
caps/ratio denominator, drift and partial overwrite are checked. Technical checks
pass while the new calibrator selection guard fails; no runtime/prospective claim.

## Occurrence initialization/rate follow-ups — 1 November 2026

From root: `python -X utf8 -m unittest services.tests.test_occurrence_initialization services.tests.test_occurrence_rates services.tests.test_report_forecast_metrics -v`.
Eighteen tests pass. Separate verifiers:
`python -X utf8 outputs/occurrence_initialization_20261101/verify.py` and
`python -X utf8 outputs/occurrence_rates_20261101/verify.py` pass1,750,900 and
2,329,098 checks respectively, with first receipts preserved. [Evidence](../outputs/occurrence_rates_20261101/README.md)
records source/code drift, paired hand initialization, future vocabulary,
signed/calendar/scaling/gate and overwrite checks. One development guard passes
while later errors regress; no runtime/prospective/business acceptance claim.

## Product-occurrence forecast adapters — 1 November 2026

From root: `python -X utf8 -m unittest services.tests.test_product_occurrence services.tests.test_report_forecast_metrics -v`
and `python -X utf8 outputs/product_occurrence_20261101/verify.py`.
[Actual evidence](../outputs/product_occurrence_20261101/README.md):11 tests pass,
405 exact source controls reconcile and1,750,900 separate numerical checks
rebuild247,686 product states/210 forecasts/21 groups. Source/code drift and
partial-output overwrite reject; future mutations/labels, hand state updates,
signed corrections and selection gates are covered. Technical checks pass while
forecast performance fails; no runtime/browser/build/prospective approval claim.

## Category forecast alternatives — 1 November 2026

From root: `python -X utf8 -m unittest services.tests.test_category_alternatives services.tests.test_report_forecast_metrics -v`
and `python -X utf8 outputs/forecast_alternatives_20261101/verify.py`.
From backend: `npm run typecheck:scripts`. Actual results:12 tests/types pass;
29,199 separate source/hash/as-of/group/metric/scenario/CSV checks pass over240
points/24 groups. [Evidence and limitations](../outputs/forecast_alternatives_20261101/README.md)
retain the failed HTTP400 live-source read, exact offline reconciliation,
development bias failure, unmet10%/5% targets and no current forecast issue.
Tests cover future mutation, sparse category residuals, missing company history,
signed/scaled values, selection gates, registration drift and overwrite refusal.
No runtime/consumer change; no browser/build/prospective acceptance claimed.

## Forecast-error concentration — 1 November 2026

Run `python services/analytics_service/jobs/audit_forecast_error_concentration.py`
from root, then set `PYTHONPATH=services` and run
`python -m unittest services.tests.test_forecast_error_concentration -v`.
[Evidence](../outputs/forecast_error_concentration_20261101/README.md):3 tests,
81 exact monthly net reconciliations,30 frozen case and signed attribution
reconciliations,94 separate CSV arithmetic/share checks pass. Zero-error and
empty percentage denominators remain undefined. Offline source-bound research;
no fresh warehouse query, runtime change or accuracy-improvement claim.

Grouped source/forecast tests:with `PYTHONPATH=services`,run
`python -m unittest services.tests.test_grouped_sales_forecast services.tests.test_forecast_error_concentration -v`.
All12 pass,including future-label/value invariance,missing-month denial,source
identity/count/net mismatches,duplicate cells,typed labels and signed linear
conservation. Run `python outputs/forecast_error_concentration_20261101/verify_grouped.py`
for a separate stdlib source-based recomputation:8,385 checks pass over all90
grouped predictions and21 reports. It writes a scoped verification receipt.
The [registered experiment](../outputs/grouped_sales_forecast_20261101/README.md)
has zero failed predictions but no acceptable accuracy gain. No app build or
service restart is needed for this offline-only change.

## Joint-affine forecast-error target experiment — 1 November 2026

From root:`python -X utf8 -m unittest services.tests.test_online_baseline_ensemble services.tests.test_accuracy_improvement services.tests.test_report_forecast_metrics -v`.
[Execution/evidence](../outputs/forecast_target_feasibility_20261101/README.md)
records8 new tests before fitting and19 combined tests afterward,90 successful
fits and14,303 separate stdlib source/trace/metric/constraint checks. Four simple
interval assertions and exact retained-source/baseline controls support the
family-specific hindsight error floor. These checks prove method implementation
and numerical consistency,not the requested low error:both10%/5% targets fail.
No consumer/runtime change;no app build/browser rerun or live-source/prospective
acceptance was performed. Recheck with the linked verifier's `--check-only` mode
to preserve the dated verification receipt.

## Correction source revalidation — 1 November 2026

[Fresh evidence](../outputs/correction_source_recheck_20261101/README.md):558 full
gateway tests sequentially pass;102 final focused cases include8 new source-check
tests and stronger real HTTP route checks. The final focused run adds the explicit
no-store assertion after the full run,without product changes. A recomputed
forged proposal passes local integrity then fails actual service/provider-mock
comparison;ownership,changed/missing source/report/reference,bad hash and path
fail closed with no provider writes.13 browser cases check exact receipt/review
downloads,stale/failure clearing and existing intake flows. Types/focused lint
pass. Real cloud/business acceptance is not inferred. Local health200/anonymous
source-check401 verifies only availability/denial of that running gateway.

## Saved correction handoff verifier — 1 November 2026

From backend run `node --import tsx --test tests/correction-review-integrity.test.ts tests/intake-correction.test.ts tests/sales-ingestion.test.ts tests/sales-ingestion-pipeline.test.ts`.
[Fresh evidence](../outputs/correction_handoff_integrity_20261101/README.md):94pass,
including24 new integrity/file/CLI cases. Actual service response compatibility,
exact monetary/month controls,altered digest/approval/raw-field failures,property
reordering,read-only file handling,bounded malformed input and sanitized CLI exit
are checked. Source/script TypeScript and a synthetic standalone CLI smoke pass.
No fresh browser/full-gateway/cloud/human acceptance is inferred.

## Complete-period correction review — 1 November 2026

[Fresh evidence](../outputs/intake_correction_20261101/README.md):525 full gateway
tests pass sequentially;70 final focused tests include28 correction checks plus40
intake and2 Python/gateway checks. One new observed-month bound test was added
after the full run;its pass belongs to the final focused run. Nine isolated
browser cases,backend/frontend types and focused lint pass. One browser fixture
failed because a role locator excluded a control inside closed details;its log is
retained and the corrected locator plus focused/full reruns pass. No production
build,live cloud correction or human approval is inferred. See the
[runbook](CONTROLLED_SALES_INTAKE.md#correction-recovery-and-publication).

## Controlled sales intake — 1 November 2026

[Fresh local evidence](../outputs/controlled_intake_20261101/README.md) records496
gateway tests,2 cross-layer real Python-report/gateway tests,15 offline notebook
tests and5 isolated browser cases passing; backend/frontend types and full
frontend lint pass. The initial unconstrained gateway run did not complete and
Windows process startup failed during overlapping checks; the full gateway suite
was rerun with `--test-concurrency=1` and passes. No fresh live-cloud or user
acceptance is inferred. [Runbook](CONTROLLED_SALES_INTAKE.md#local-verification)
lists the focused commands and candidate-only correction/publication limits.

## Selected QA candidate published; hosted CI passes — 1 November 2026

[Candidate receipt](../outputs/release_candidate_20261101/README.md) records18 QA
source/test files on `codex/qa-closure-20261101` at2ff16698f7e78828d6dbbd60b2b0c778a1e6e2a6,
[draft PR3](https://github.com/IS-Capstone-Group9/medshield-dss-project/pull/3) into
`medshield/update_02`. Push41221043956 and PR41221091850 both pass backend,frontend,
Python,Docker and CI required. The isolated candidate also passes456 local gateway
tests,frontend types/lint and backend types. Unfinished controlled-ingestion code,
its gateway mount/assertions,and raw/local evidence are excluded;shared checkout,
index and existing services preserved. This supersedes the missing hosted-CI gate
for this selected candidate only. No merge/deployment or full QA/business approval.
Adrian/reviewer assesses PR3;missing real-role/session and operational restore gates
remain open under current silent-only accessibility scope.


## Final local revision checks pass — 1 November 2026

[Fresh verification](../outputs/final_revision_checks_20261101/README.md) records
passing frontend TypeScript/lint, backend source/script types and456 gateway tests
with zero failures/skips on the current dirty working tree. Logs and source hashes
are retained. No Next build ran alongside development; services and unrelated
work remain unchanged. These local results do not replace matching hosted CI,
real-role/session or operational restore checks, or reviewer acceptance.


## Engineering evidence consolidated; acceptance open — 1 November 2026

[Consolidated closure review](../outputs/step6_consolidation_20261101/README.md)
links all six steps, bounded results and remaining owners. Fresh identity checks
match291/291 Step4 and161/161 Step5 source hashes; earlier Step3 markup drift is
explicitly scoped against later silent verification. No new runtime test/CI pass
is inferred. Current dirty changes still need release-bound hosted CI; spoken
AT remains unverified under the current silent-only scope, real non-Admin/session
and operational rollback/restore gates remain open, and reviewer acceptance has
not been recorded. Consolidation is delivered; Step6 final closure is not granted.


## Step 5 local recovery checks — 1 November 2026

[Recovery evidence](../outputs/step5_recovery_20261101/README.md) records passing
isolated gateway rollback/reapply, two browser-only source failure/recovery cases,
11 loopback cancellation checks, 13 installer configurations, four Planning-scope
cases and a synthetic source-version pin test. Existing services and cloud data
remain unchanged. These do not certify hosted artifacts, identical live source
versions, controlled data correction/retry or managed backup/restore. The release/
data operator still supplies the approved isolated target, artifact/backup/source
identities and recovery procedure before full Step 5 acceptance. Step 6 closure
must retain these unverified gates and real-role/reviewer limitations.


## Step 4 role and session checks — 1 November 2026

[Permission QA receipt](../outputs/step4_role_permissions_20261101/README.md)
separates 28 real local HTTP checks and nine existing-Admin browser destinations
from 38 isolated Node tests. Test additions cover provider-expired rejection and
ordinary/remembered development-session expiry boundaries; the matrix also checks
the current controlled-intake configuration role gate with ingestion disabled.
Real Manager/Viewer/unlinked/expired Supabase sessions and direct RLS remain
unverified because only Admin exists. Normal login uses existing authorized test
credentials; receipts contain no tokens/raw account or business records. See the
receipt for commands, source hashes, failed attempts and explicit limitations.

## Visual acceptance continuation — 31 October 2026

[Visual review and verified repairs](../outputs/step3_acceptance_review_20261031/README.md)
inspect66 native-pixel sheets from36 retained captures and add a fresh settled
27-page/viewport audit. Four repairs: compact phone Financial scope selector,
whole ledger summary amounts, warning contrast and Weather keyboard-scroll region.
Three fresh live tests, types/lint and whitespace checks pass; tested settled
states have zero automated WCAG violations. This is implementer self-review;
full human/physical-device acceptance is not inferred. Native tooling failed
initialization twice (including reset/retry), so actual AT01–AT10 spoken checks
remain NOT VERIFIED and full Step3 acceptance remains open. No analytical score,
source/model/publication or role change. QA/Adrian owns actual screen-reader
execution; engineering obtains matching hosted CI after publishing local patches.

## Step 3 scoped UI/accessibility checks — 31 October 2026

[Current evidence and repairs](../outputs/step3_ui_accessibility_20261031/README.md)
record 27 default page/viewport cases, six expanded research cases, three blank
Planning cases, two browser-only core-failure/recovery cases and zero automated
WCAG rule violations in those tested states. Seven named research regions, eight
Forecast/external overflow regions, three chart names, product evidence focus and
desktop Help focus return were repaired. Types/lint, nine compiled navigation
widths, help and 13 installer configurations pass. Native CUA failed to initialize;
these are Playwright Chromium checks and sampled screenshot self-review.
Actual spoken screen-reader/full human visual, real-role and hosted recovery
acceptance remain open. No original objective score/approval change. New local
patches have not yet obtained hosted CI; prior Step1 CI is revision-bound.

## Company-PHP source snapshot adapter — 31 October 2026

[Adapter evidence/runbook](../outputs/company_php_snapshot_20261031/README.md) records8 new tests and19 total forward tests, plus287 independent decimal/source/preservation checks. Run:

```powershell
$env:PYTHONPATH='services'
python -X utf8 -m unittest discover -s services/tests -p 'test_company_php_*.py' -v
python -X utf8 outputs/company_php_snapshot_20261031/verify.py
```

Checks cover pinned read-only SQL shape, input identifier/version validation, exact signed controls, operator-receipt/query/export hash binding, pending receipts, mixed provenance, quality-count inconsistencies, missing/duplicate months and synthetic conversion-to-issue roundtrips. Cloud SQL execution and warehouse/receipt attestation remain unverified; no real October data or measured accuracy is inferred.

## Company-PHP forward comparison — 31 October 2026

[Runbook and evidence](../outputs/company_php_forward_20261031/README.md) record11 focused tests/229 independent formula and preservation checks. Run from the repository:

```powershell
$env:PYTHONPATH='services'
python -X utf8 -m unittest discover -s services/tests -p test_company_php_forward.py -v
python -X utf8 outputs/company_php_forward_20261031/verify.py
```

Coverage includes hand-derived lead2/4/7 predictions, issue windows, signed/zero actuals, cohort tampering, future/pending and missing outcomes, retained-history changes, duplicate issues, concurrent exclusive writes, complete12-issue research assessment and zero-error baseline guards. Fixtures use synthetic future dates and outcomes; they do not establish prospective performance, external source verification or timestamp attestation. Existing FINAL QA remains deferred.

## Signed-component forecast experiment — 31 October 2026

[Component evidence](../outputs/component_accuracy_20261031/README.md) binds exact signed source conservation,pre-execution registration,development-only choices and all unsuccessful candidates. Run:

```powershell
python -X utf8 -m unittest services.tests.test_component_forecast services.tests.test_report_forecast_metrics -v
python -X utf8 outputs/component_accuracy_20261031/verify.py
```

8 tests/4697 independent checks pass over81 source months,480 forecast points,90 direct-mean algebraic controls and48 score groups/CSV. Source identity/date/sign/gap failures reject;future mutation cannot affect origin predictions. Same-window component means must equal direct net means and do not count as predictive improvements. No candidate passes the development gain/bias gate;this negative accuracy result is separate from correct software/evidence checks. FINAL QA remains deferred and no model/source/publication or score changes follow.

## Origin-known activity / portfolio feature study — 31 October 2026

[Feature experiment](../outputs/accuracy_features_20261031/README.md) retains all successful/unsuccessful candidates,pre-fit registration,choices frozen before later scoring,and the corrected component-source calendar reconciliation. Focused checks:

```powershell
python -X utf8 -m unittest services.tests.test_asof_features services.tests.test_abc_evaluation services.tests.test_report_forecast_metrics -v
python -X utf8 outputs/accuracy_features_20261031/verify.py
```

18 tests/86579 independent checks pass. New tests cover hand financial/activity and portfolio share/growth features,future mutation,calendar/source cutoffs,missing-history semantics,training-only imputation/scaling and selectors rejecting audit inputs. Verification independently reconstructs3175 feature receipts,300 forecast cases,1014 classifier cases/50 groups,CSV parity and81-month signed-component readiness. Neither new candidate family passes its overall selection rule. This is a negative accuracy finding with valid software/evidence checks,not a model promotion or resumed FINAL QA. New registration/output directories are required for any further experiment.

## Adaptive forecast / prior-state ABC experiment — 31 October 2026

[Actual accuracy evidence](../outputs/accuracy_improvement_20261031/README.md) records the fixed pre-fit grid,development-only selection freeze,later-stage results and stronger-baseline caveats. Run:

```powershell
python -X utf8 -m unittest services.tests.test_accuracy_improvement services.tests.test_abc_evaluation services.tests.test_report_forecast_metrics -v
python -X utf8 outputs/accuracy_improvement_20261031/verify.py
```

19 tests/25121 independent checks pass. New tests cover inner-target cutoff,future mutation,currency scaling,convex weights,hand bias correction,missing calendars,prior-state/current-target feature isolation,training class weights and selectors rejecting audit inputs. Independent arithmetic covers1260 forecasts/848 classifier cases. Method correctness does not establish prospective accuracy or release approval. One-month and ABC gains remain unmet;lead3/6 gains are versus frozen selected references and not every alternative. Register new executions into new directories and preserve all inspected-outcome limitations. FINAL QA remains deferred.

## Corrective ETS research — 31 October 2026

[Execution and limits](../outputs/model_error_repairs_20261031/README.md) retains source-bound before/after metrics and independent arithmetic. Focused verification (not FINAL QA):

```powershell
python -X utf8 -m unittest services.tests.test_stable_ets services.tests.test_stable_ets_review services.tests.test_sales_external_tournament services.tests.test_abc_evaluation -v
python -X utf8 outputs/model_error_repairs_20261031/verify.py
```

18 tests pass after correcting a synthetic mutation fixture's MASE scale; the first failed log is retained.4597 independent checks reconcile720 points/60 corrected fits and preserved sources. The two new ETS recipes require successful convergence,finite/contiguous origin-known inputs and leads1–12. Currency scaling must not alter restored forecasts; failed optimization emits unavailable predictions. Mixed forecast changes are not a blanket accuracy improvement. Existing frozen adapters/research identities stay unchanged; register any new study before execution and use a new output directory. No build/browser FINAL QA or publication is implied.

## Final-source sidebar native acceptance — 31 October 2026

[Final sidebar evidence](../outputs/final_qa_sidebar_20261031/README.md) supersedes the prior disabled-browser limitation for this session. Existing Admin checks pass the repaired preview link at measured1706×960 expanded/collapsed,824×1024 tablet and392×844 phone: icon/one-line label or collapsed icon, name/focus, actual keyboard route and expanded pointer route. All9 normal SPA routes remain separate; departure/remount retains one owner and blank Planning assumptions/unchecked acknowledgment/disabled export. Actual screenshots and failed attempts retained; no new product repair or repeated unchanged numerical/type/build suite.

Adrian identifies himself as reviewer and asks QA to execute. Native/AX checks are self-review; no actual spoken screen-reader output or human signoff is supplied. Remaining full visual/expanded/filter/device, real non-Admin and final-source/hosted rollback acceptance stay open. Approved actual target/artifacts/operator/recovery remain unidentified; unchanged hosting discovery was not repeated. No account/CORS/source/model/approval/score/paper change, deployment or original-checkout write. FINAL QA remains open.

## Expanded branch/date QA and sidebar follow-up —31 October 2026

[Branch QA evidence](../outputs/final_qa_branches_20261031/README.md) records129 enabled keyboard-open/close cases, one deliberately disabled quantity picker,11 analytical-tab key transitions and six grouped native date/filter cases. An actual10-row daily CSV passes scope/prior-year/missing-value/false-approval metadata and rounded-total parity. Loaded Planning retains90 blank inputs; no operating facts invented. Those native checks precede the final narrow sidebar repair.

The plain Itemized sales preview link clipped in the collapsed rail; it now reuses standard nav-item/icon/nav-label markup with explicit name/title. Final types/lint, navigation and current hook checks pass; known prior-hook failure stays recorded. That packet’s final browser attempt refused local use with “Local browser use is disabled in Work settings”; the subsequent final-sidebar packet above supersedes this access limitation and closes its scoped native check. No bypass. Full visual/spoken screen-reader/real non-Admin/final-source/hosted rollback gates stay open. No source/model/role/CORS/approval/paper change, build alongside dev, commit/push or deployment.

## Nine default desktop focus paths —31 October 2026

[Focus-path evidence](../outputs/final_qa_focus_paths_20261031/README.md) contains actual native Tab sequences from Source details through each current/default page to the Next.js development-tool boundary. Nine saved sequences total345 observations; all120 Overview month buttons traversed. No observed inactive/inert/disabled focus; sampled app controls have outlines. Diagnostic label/text fallbacks are not independent accessible-name or spoken-announcement validation. Planning unavailable scope, collapsed details and other branches are explicitly separated; source/protected hashes remain unchanged, so no unrelated type/numerical/build rerun.

An available reviewer can use the prepared [screen-reader checklist](../outputs/final_qa_focus_paths_20261031/SCREEN_READER_CHECKLIST.md), recording actual environment/release identity and results. All spoken cases remain NOT VERIFIED. Recovered CDP failures and the short full-page source capture are retained; complete visual/expanded/device/real-role/release acceptance remains open.

## Research scroll-region accessibility continuation — 31 October 2026

[Fresh accessibility evidence](../outputs/final_qa_accessibility_20261031/README.md) retains actual Overview/Planning keyboard traces and7 final-source research-table tests. On a measured352×760 viewport, open the fixed-origin/monthly-refresh monthly/model summaries and unit baseline/sensitivity/prediction tables; Tab into each named region, then Right Arrow. All7 remain focused, display a solid outline and scroll0→53.33px with loaded rows. Explicit role/tabindex/names replace reliance on Chromium's automatic unnamed-wrapper focus; original scrolling already worked in that browser.

After final markup edits, frontend types/lint and the existing13-configuration `node frontend/e2e/panel-request-lifetimes.cjs outputs/new_installer_lifetimes.json` pass. No calculations/exports changed or unrelated full suites repeated. Failed long batches, transient smooth-scroll geometry and capture artifacts remain visible. Bounded focus/region checks do not certify all keyboard paths, reliable full-page visuals or actual spoken screen-reader announcements. Real roles and final-source/hosted rollback remain open.

## Remaining panel lifetime regression and native sample — 31 October 2026

[Panel QA packet](../outputs/final_qa_panels_20261031/README.md) retains before/final source identities, a failing startup signal assertion, final commands/logs, native measurements and actual downloads. Run from repository root, choosing new output destinations:

```powershell
node frontend/e2e/panel-request-lifetimes.cjs outputs/new_panel_lifetimes.json
node frontend/e2e/ledger-weather-lifetimes.cjs outputs/new_ledger_weather.json
node --import ./backend/node_modules/tsx/dist/loader.mjs frontend/e2e/dated-capacity-contracts.cjs outputs/new_dated_lifetimes
```

The first checks 13 production-installer configurations with modeled DOM/Chart and deliberately unabortable responses; the second verifies nine grouped actual loopback HTTP cases using production clients/services/interactions, synthetic source only and renderer spies. Dated checks pass59 cases including independent review/select signals and invalidation. Final shared runtime, tournament/ABC/regional, types/lint checks pass; known prior-hook failure remains. Historical current/rolling numerical suites were not run because a required retained fixture is absent. Native Admin checks cover actual downloads, pending departure/remount,27 measured viewport/page samples, phone table focus/scroll and help Tab/Escape. Loading samples, screenshot artifacts and actual screen-reader/real-role/release acceptance remain separate open checks. No build alongside dev or live provider refresh was performed.

## Common request ownership and source completion — 31 October 2026

[Runtime QA packet](../outputs/final_qa_runtime_20261031/README.md) retains a
before-fix heatmap-reset timeout and27 grouped passing real loopback HTTP checks.
Run from the migration repository root:

```powershell
node frontend/e2e/common-request-cancellation.cjs outputs/new_common_requests.json
node frontend/e2e/request-cancellation-contracts.cjs outputs/new_planning_requests.json
node frontend/e2e/dashboard-runtime-lifecycle.cjs outputs/new_runtime_lifecycle.json
```

The new harness compiles production client, dashboard reader and common refreshes;
uses ephemeral Node HTTP/fetch with synthetic local source/auth and renderer spies;
and closes its server in `finally`. It checks reset/replacement stream closure,
recovery, independent families, cache/deduplication, absent/replaced handlers,
ignored-abort stale data, publication cancellation without benchmark follow-up,
genuine publication-outage benchmark recovery, main source zero/null/failure and
cross-release rejection. It does not observe browser networking or warehouse jobs.
The hook model adds replaced-initial-load ready/error events and single panel
installation, retaining listener/style/chart/global teardown assertions. Eight
reported phases include one known prior-HEAD failure and seven passing current/
reapply cases; no hosted/artifact rollback claim. Eleven earlier transport checks
were rerun, with frontend types/lint passing after final production edits.

Native access initially worked but later refused browser inventory after the user
reported enabling it. Only a bounded ready-state DOM/log observation was captured;
no new final-source screenshot/download/full accessibility pass is claimed.
Required real roles, remaining independent request families and final release/
hosted/assistive-technology checks remain open. Full unrelated suites, hosted CI
and production build were not rerun.

## Owned request cancellation and settled native checks — 31 October 2026

[Continuation evidence](../outputs/final_qa_continuation_20261031/README.md)
retains an initially failing GET-abort regression and eleven grouped passing
real loopback HTTP/client/Planning checks. From repository root:

```powershell
node frontend/e2e/request-cancellation-contracts.cjs outputs/new_cancellation.json
node frontend/e2e/regional-forecast-contracts.cjs outputs/wp4_regional_php_ui_20261031/response.json
node frontend/e2e/dashboard-runtime-lifecycle.cjs outputs/new_hook_lifecycle.json
```

The first command uses compiled production code, real Node fetch/streams and an
ephemeral127.0.0.1 server, with synthetic local auth/source only. It proves GET/
POST body cancellation, pre-auth no-send, preserved success/non-JSON/error
behavior, replacement/recovery and owned cancellation without aborting another
panel. It is not a browser network trace or Databricks job-cancellation test.
Regional198-view checks now assert source/disposal signals plus stale guards;
hook checks require request reset at both mount and teardown. Types/lint pass.

Actual Admin pending Planning invalidation/recalculation and regional reload →
route-away/remount pass. Fresh Planning/regional CSVs exactly match prior actual
source-bound downloads. Nine desktop/18 tablet-phone cases inspect named controls,
status semantics, tables/charts and document geometry; ledger loading captures
are replaced with settled states. Phone commercial scrolling, keyboard horizon,
help focus/Tab/Escape and available-menu return pass. Exact per-case dimensions
and screenshot scaling artifacts remain in the packet. Only Admin exists, and
full screen-reader/role/final-release/hosted rollback acceptance stays unverified.
No full unrelated suites, hosted CI or Next production build were rerun.

## FINAL QA native and lifecycle continuation — 31 October 2026

[Fresh scoped QA](../outputs/final_qa_20261031/README.md) retains actual Admin
unavailable-territory/All recovery, incomplete/complete JSON round-trips, four
atomic invalid imports, legacy/weighted/capacity fields, five actual CSVs/24 rows,
and source/scope clearing. The independent stdlib verifier passes 460 checks.

From repository root:

```powershell
node frontend/e2e/dashboard-runtime-lifecycle.cjs outputs/new_hook_receipt.json
node frontend/e2e/dashboard-help-contracts.cjs
node frontend/e2e/planning-scope-recovery.cjs
python -X utf8 outputs/final_qa_20261031/verify_downloads.py
```

The actual-hook model checks owned-chart/global-export cleanup, current/reapply,
early disposal, late source response and unavailable replacement; the prior HEAD
hook retains its chart-leak finding. Hook dependencies are modeled, so this is
not native network-abort or hosted rollback proof. Actual native help focus,
Tab/Shift+Tab, Escape/return and phone ArrowRight table scrolling pass. Four scope,
eight-valid/87-rejected draft, 33 ordinary/58 dated capacity and 198 regional
compiled cases also pass; final frontend TypeScript/lint pass. Prior full-suite
fixture receipts are inherited, not newly rerun; hosted CI was not run.

Measured CSS viewports:1440×900,770×1024,391×844. All nine pages switch by keyboard
with no document overflow; some analytical panels were loading. Screenshot paint/
scale artifacts  keep full visual/pointer/
accessibility acceptance open. Only Admin exists per user; other real-role/RLS
checks remain unverified. Actual isolated frontend current/prior/reapply mounts
fail visibly at the unchanged gateway origin boundary; full source-backed/native
release rollback and transport cancellation are unverified. No approved hosted
target/releases/operator/recovery were supplied. FINAL QA is not complete.

Final pointer recheck exposed a761–1024px script/CSS drawer mismatch. The script
now matches CSS at1024px, hides closed-drawer focus targets and returns toggle
focus. Native pointer recovery at824px/770px, nine breakpoint regressions and
all27 expected keyboard routes pass after repair. Earlier isolated rollback
snapshots predate this final navigation patch; final-source rollback remains open.

## Reproducible retained regression fixtures — 31 October 2026

The versioned [fixture package](../tests/fixtures/retained/README.md) contains 58
exact retained inputs with per-file sizes/hashes and a pinned compressed archive.
CI restores it before backend/Python tests. It supplies offline regression inputs
only; runtime analytics still use Gold. Restore preflight rejects changed archives,
unsafe/duplicate members, links/junctions and any conflicting destination before
writing missing files. Identical existing evidence is preserved; no raw source,
protocol, approval or expected numerical value is regenerated to make tests pass.

```powershell
# From repository root; safe to repeat, or use --check for verification only.
python scripts/restore_test_fixtures.py
python scripts/restore_test_fixtures.py --check
python -m unittest services.tests.test_retained_fixture_restore -v
# Then use the normal documented backend/Python test commands.
```

[Clean-workspace evidence](../outputs/ci_fixture_packaging_20261031/README.md)
starts without any outputs directory, restores all 58 entries and runs the full
suites. This supersedes the earlier missing-fixture limitation for these commands;
it does not retrospectively change their failed logs or imply hosted CI ran.
The rolling-protocol test now separately proves code-drift rejection and exercises
its mocked-forecast scheduling/cache behavior with a test-only identity handshake.
Production frozen-source/code checks and historical registrations are unchanged.
Offline CI numerical libraries use one thread to avoid excess thread-pool creation;
this is not a runtime/model configuration or performance acceptance claim.

## Integrated role, Planning recovery and rollback QA — 31 October 2026

[QA packet](../outputs/wp13_integrated_qa_20261031/README.md) retains 287 synthetic
identity observations through actual gateway middleware and four-phase actual
Express code rollback/reapply in a secret-free scratch copy (21 tests, no skips).
Eight research routes and two dated routes are included in denied-session
coverage; linked roles reach validation/source failure without real external
calls. Gateway code rehearsal is not hosted/data/frontend-native rollback.

```powershell
# backend/
npx tsx --test --test-concurrency=1 tests/role-matrix.test.ts tests/regionalCodeRollback.test.ts
# repository root
node frontend/e2e/planning-scope-recovery.cjs
```

The new scope regression is portable and compiles the production renderer. It
checks absent/available/all territory choices, selected scope, unavailable labels,
calculation/export disabling and acknowledgment clearing. Existing local-packet
harnesses also pass draft validation (8 valid/87 rejected), weighted/legacy round-
trip, source/research boundary and ordinary/dated capacity (33/58 cases).
Frontend types/lint and backend scripts types pass. Initial harness dependency
failure and correction are retained. Native Admin reproduced the defect before
the repair; final repaired-state/draft/download/responsive verification remains
open because a fresh browser check reported automation disabled after interruption.
Earlier native receipts do not validate this changed renderer. Live all-role/RLS,
cloud recovery/rollback and human acceptance are not inferred from fixtures.

## Regional PHP integration checks — 31 October 2026

[Regional PHP evidence](../outputs/wp4_regional_php_ui_20261031/README.md) retains
35 focused regressions, workspace/script types and frontend lint. New tests have
portable byte-pin/reader/route failure checks; company-packet reconciliation
checks explicitly skip when the retained local packet is absent. Such a skip is
not live/company acceptance. Existing unrelated fixture-dependent CI failures
are not claimed repaired by this task.

```powershell
# From backend/
npx tsx --test tests/regionalForecastResearch.test.ts tests/tournamentResearch.test.ts tests/regionalSalesReview.test.ts tests/regionalDecisionBoard.test.ts tests/datedCapacity.test.ts
# From repository root; use a new compiled-output destination
node frontend/e2e/regional-forecast-contracts.cjs outputs/wp4_regional_php_ui_20261031/response.json outputs/new_regional_php_check
python -X utf8 outputs/wp4_regional_php_ui_20261031/verify.py
```

The compiled harness exercises actual panel handlers over all 198 model/window/
lead scopes, unavailable regions, source invalidation, malformed responses,
recovery, races and disposal. Native evidence covers Admin only, eight states
and seven real downloads. Narrow layouts were measured at 520 and 391 CSS px
under current browser scaling; the final 391 CSS px check confirms intact number
cells and no panel overflow. Full-page screenshot capture paints at different
geometry; DOM measurements, not screenshot pixel dimensions, own these claims. Full all-role/accessibility/rollback QA remains open. No Next build ran
while Next dev was active. The independent stdlib verifier imports no application
or model code and checks exact keys/nulls/CSV bytes, with numerical tolerance
1e-7 absolute or 1e-10 relative.

## Territorial research checks — 31 October 2026

[Territorial research evidence](../outputs/wp4_territorial_research_20261031/README.md)
retains fresh read-only source capture, registered actual fits, 34 Python tests
and backend script types. The six new tests cover actual coverage, missing versus
observed zero, duplicate/changed inputs, origin-only adapter inputs, future-target
mutation invariance, unavailable recipes and current-clock nonissuance. Existing
unit extraction/issue tests remain synthetic method evidence; no real future
outcome is inferred. Required frozen protocol fixtures were restored byte-for-byte.

```powershell
python -X utf8 -m unittest services.tests.test_territorial_forecast services.tests.test_sales_external_tournament services.tests.test_predictive_sales_external_metrics services.tests.test_unit_gold_extraction services.tests.test_unit_prospective_issue -v
python -X utf8 outputs/wp4_territorial_research_20261031/verify.py
```

The separate verifier imports no model/evaluation code and recomputes Decimal
source controls, eligibility, transparent baselines, errors/scales/selection,
exploratory HLN/Bartlett-HAC DM statistics and CSVs. Exact keys/counts/nulls and
1e-8 absolute/1e-10 relative numerical tolerances are checked. Fit warnings are
retained; a completed fit is not acceptance. No frontend/Next build or unchanged
backend suite was required for this offline/script extension.

## ABC research integration checks — 31 October 2026

[ABC integration evidence](../outputs/wp6_abc_ui_20261031/README.md) records 52 scoped
backend tests (13 new), 19 Python tests, workspace/script types, frontend lint,
60 compiled actual-handler scopes and the existing Decision Board check. Fresh
Gold aggregate identity, candidate readback/retry, confusion/cohort arithmetic,
CSV provenance and native Admin states are retained separately from older receipts.
The Product renderer initially removed the new panel; its cleanup now preserves
explicitly marked research tables. The actual cleanup regression test and native
remount are included. A first cleanup mock returned the marker for all tables;
that failed test and its corrected rerun are retained rather than relabeled.

```powershell
node frontend/e2e/abc-research-contracts.cjs outputs/wp6_abc_ui_20261031/stage-final/response.json outputs/new_abc_ui_check
python -X utf8 outputs/wp6_abc_ui_20261031/verify.py
```

Use a new destination for compiled exports. The verifier independently recomputes
counts/Fraction metrics, frozen selection and compiled/native table/CSV equality;
it imports no application or model calculations. Current receipts and code hashes
are `checked-checks.json`; earlier `checks.json` and `final-checks.json` preserve
pre-refinement/failed attempts. Full role/responsive/accessibility/rollback QA,
model publication and attributable human acceptance remain separate.

## Sales/external implementation checks — 30 October 2026

[PHP tournament integration evidence](../outputs/wp4_tournament_ui_20261030/README.md)
adds 12 focused tests for exact artifact/current Gold controls, source drift,
duplicate/missing candidates, actual protected route behavior and compiled client
rejection/export consistency. `checks.json` retains the broader scoped regression,
types and lint command receipts. The new compiled production-handler harness
exercises all 198 window/lead/model views and 1,980 exported rows, null predictions,
source invalidation, malformed/outage recovery, concurrency and disposal races.
Its isolated DOM is separate from retained native Admin checks. Reproduce using
a fresh output destination:

```powershell
node frontend/e2e/tournament-research-contracts.cjs outputs/wp4_tournament_ui_20261030/staging/response.json outputs/new_tournament_ui_check
python -X utf8 outputs/wp4_tournament_ui_20261030/verify.py
```

The separate numerical verifier recomputes source identity, origin training
scales, errors, group support, development selection and compiled/native export
parity without importing gateway/model calculations. Prepare/apply/verify inserted
one immutable candidate, with exact readback and zero-insert retry; no source/
model-pointer change or operational approval. Older rolling/unit suites require
absent retained fixtures and are not claimed as freshly executed here.

[Regional product-priority evidence](../outputs/wp2_regional_product_priority_20261030/README.md)
adds `backend/tests/regionalProductPriority.test.ts`: current-source/month controls,
signed offsets, missing product periods, duplicated/partial/foreign data,
frontend/CSV contract rejection and optional-domain failure. The focused regional/
STL/source suite passes 29 tests. Both workspace types, backend script types and
frontend lint pass. The compiled board harness now accepts an optional fixture
path and output directory, retaining its historical v1 default. V2 checks exercise
actual panel rendering/export, source invalidation, malformed-priority rejection,
recovery, concurrency and disposal. Use new output directories:

```powershell
node frontend/e2e/regional-decision-board-contracts.cjs outputs/wp2_regional_product_priority_20261030/live-final/board.json outputs/new_priority_ui_check
python -X utf8 outputs/wp2_regional_product_priority_20261030/verify.py
```

The Python verifier imports no gateway calculation and separately groups Decimal
amounts from the fresh read-only Gold capture, checking controls, ranking, absence,
source/code/query hashes and compiled/native CSV/table equality. Synthetic method
tests and real captured product findings are labeled separately. Exact-device/
all-role/accessibility, model promotion and client acceptance remain unverified.

[Dated-capacity UI and native receipts](../outputs/wp9_dated_capacity_ui_20261030/README.md)
retain58 compiled handler/gateway cases,33 ordinary regressions,45 focused
backend tests, frontend types/lint,72 independent enumeration checks and151
checks over actual signed-in JSON/CSV/Decision Board downloads. Reproduce into
new destinations: from `backend/`, run
`node --import tsx ../frontend/e2e/dated-capacity-contracts.cjs ../outputs/new_dated_ui_capture`.
The packet's `verify.py` checks its sealed compiled capture/code; `verify_native.py`
checks retained actual downloads. Native flow evidence does not establish exact
device viewport, all-role/accessibility acceptance, physical operating facts or
client acceptance. No Next build ran with the owned Next dev service.

[Integration verification](../outputs/sales_external_implementation_20261030/README.md)
retains actual command results and checked file hashes. [Package status](SALES_EXTERNAL_IMPLEMENTATION_STATUS.md)
distinguishes implemented methods from full acceptance. Independent packet
verifiers are runnable from the repository root; numerical fixtures, retained
captures and compiled DOM models are not fresh live or native-browser evidence.
Frontend has no `typecheck` package script: use
`node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`.
For compiled regional checks, set `REGIONAL_STL_TEST=1` and
`REGIONAL_OUTPUT_DIRECTORY=outputs/wp1_regional_stl_20261030/compiled` before
`node frontend/e2e/regional-sales-contracts.cjs`; keep fresh receipts outside
historical artifact directories. Missing retained fixtures must be recovered
byte-for-byte or reported as unavailable; do not weaken their tests.

The unit planning continuation adds `services.tests.test_unit_planning_pilot`
and `services.tests.test_unit_forecast_consequences`; these test temporal isolation,
scoped units, complete job roundtrip and overwrite protection. The new WP8/WP11
and unit-consequence `verify.py` scripts independently recompute source totals,
EOQ/ROP costs, run/summary metrics and error translations. Monte Carlo generation
is not repeated by every regression test; its registered completed run and
retained per-run/ledger evidence are checked separately.

The diagnostic continuation adds `services.tests.test_unit_pvm` (including signed
adjustments/confirmation isolation) and `services.tests.test_anomaly_ledgers`
(signed controls, exact area/DR grouping, missing IDs and invalid inputs).
`backend/tests/sourceMetadataHistory.test.ts` exercises the actual reader with
complete stats/property history and rejects hidden data writes, bad receipts,
full-source control mismatches and incomplete/unknown histories. All analytical
SELECTs must retain `VERSION AS OF 0`. WP3 packet verifiers independently check
Fraction PVM arithmetic and all 863 freshly captured anomaly rows; native UI and
human acceptance are separate. The first expanded backend attempt exposed an
error-message compatibility check plus five missing preserved fixtures; its logs
and exact fixture restoration hashes are retained before the affected rerun.

WP10 adds `services.tests.test_ahp_mcda_job`: five tests cover normalized bounds,
CR rejection, constant/tied ranks, explicit signed exclusions, missing disease
evidence, common closed-month populations, provenance and overwrite protection.
Its packet verifier independently checks 177 conditions using power iteration,
percentile interpolation and Pearson correlation of average ranks. Fixture
stability is separate from actual-source readiness and business acceptance.
Only Python/affected evidence checks are rerun for this offline-only addition;
prior unchanged backend/types/lint/compiled UI receipts remain dated evidence.

WP9 adds `backend/tests/purchaseCapacity.test.ts` and
`services.tests.test_milp_frontier`: mixed packs, zero/minimum service, matching
unit declarations, exhaustive capacity/stock cells, model APIs, training-only
source inputs and actual offline gateway/CSV roundtrip. Its independent verifier
checks675 conditions/42 cases. The earlier five-proof verifier accepts an explicit
versioned execution and checks its complete code identity; historical results
are not overwritten when shared code changes.

`frontend/e2e/planning-capacity-contracts.cjs`, launched with `node --import tsx`
from backend, compiles actual renderer/draft modules and invokes the gateway
solver in an isolated DOM model.33 cases cover blank/zero, source/input clearing,
API/CSV reconciliation, malformed/legacy/incomplete drafts and text/formula safety.
The new packet's independent verifier checks47 arithmetic/provenance/CSV conditions.
Use explicit new output paths for legacy baseline/draft scripts to preserve
historical receipts. Native browser discovery is disabled; these are not signed-in
responsive/click/download or client-usability checks.

`backend/tests/datedCapacity.test.ts` adds five tests including144 exhaustive
timing/budget/capacity/minimum cells. Optional `DATED_CAPACITY_EVIDENCE_DIRECTORY`
captures new cases with overwrite rejection. The packet verifier independently
checks2,264 conditions with Fraction objectives, minimum spend and daily stock/
expiry reconstruction. The current legacy three-solver proof execution is now
`outputs/wp9_dated_capacity_20261030/legacy-proofs-current`; old runs stay intact.

## Source recheck — 30 October 2026

[Implementation, commands, actual narrow-panel verification and SO5 limits](../outputs/source_recheck_20261030/README.md). Next: consolidated system release-readiness handoff; original gates/scores unchanged.


## Research/planning separation checked — 30 October 2026

[Boundary review](../outputs/planning_boundary_20261030/README.md) adds a compiled
regression: extra forecast/operating fields cannot fill85 blank assumptions over
five products; source replacement/failure clears state.19 backend tests, five
compiled baseline cases/four exports and8 valid/87 rejected draft cases pass.
Native Forecast-to-Planning navigation retains blank product inputs and explicit
scenario/no-calculated-result labels. No production repair, operational inputs,
new actual allocation/export, approval or score change. Next engineering: remaining
SO5 controlled-source validation/retry/provenance workflow; retain publication
gates and rejection of direct dashboard CSV ingestion. Paper deferred.


## Forecast research review verified — 30 October 2026

[Fresh source, error and UI checks](../outputs/forecast_review_20261030/README.md)
retain BUPIRIGHT4 mL/HOSPITAL/ampoules and false operational activation.18 backend
tests,40 compiled cases/eight chart views/two compiled exports/16 invalid contracts,
123 independent error/lead checks and backend script types pass. Native signed-in
lead1/3 labels, six/four targets and error readouts agree. No new actual CSV/mobile
review, model selection, operational approval or score change. Current comparison
is conditional retrospective research; prospective issuance still requires its
registered window and fresh controlled history. Next: integrated decision-support
review of explicit planning assumptions and research/operational separation.
Descriptive/diagnostic delivery retained; paper deferred.


## Selected diagnostic transaction evidence verified — 30 October 2026

[Transaction-level findings](../outputs/diagnostic_transactions_20261030/README.md)
reconcile eight fresh full ledgers/four selected product-period changes;59
independent checks match27 retained rows with source lineage and repeated rows
preserved. Backend script types pass. Opposite-period absence is under exact raw
labels; concentrated deliveries and no recorded rows do not prove sustained
growth, stockouts or lost demand. Suggested sales/source review actions retain
unverified causes. No runtime/source/model/approval/score change. Next engineering:
verify existing Forecast review target/channel/lead/error and research labels;
retain BUPIRIGHT HOSPITAL and operational/prospective gates. Descriptive delivery
remains intact; paper deferred and operating records remain unavailable.


## Diagnostic contribution follow-up verified — 30 October 2026

[Fresh source-bound findings and review actions](../outputs/diagnostic_follow_up_20261030/README.md)
reconcile four Gold-backed scopes (rolling year, July, April and August2026).
Independent product reconstruction passes9,694 checks;11 diagnostic tests and
backend script types pass after a stale ledger SQL fixture matcher is corrected.
Product labels remain needs_review and sectors proposed; increases and negative
offsets are retained. No runtime/source/model/approval/score change or business
cause confirmation. Next analyst/engineering: inspect transaction evidence for
the leading recorded changes and retain unresolved explanations. Descriptive
available-data delivery remains intact; no repeated BSG/operating-data intake.
Paper deferred.


## Available-data descriptive delivery checked — 30 October 2026

[Descriptive checklist and evidence](../outputs/descriptive_closeout_20261030/README.md)
records delivered financial/trend/coverage/product/area/filter/export behavior.
A real downloaded CSV exposed a fixed2017–2025 scope label despite2026 rows;
the export now follows the selected Data range. Corrected actual download passes71
independent checks;27 backend tests,55 regional views/165 CSVs, ten scope checks,
two new export-scope cases, frontend types and lint pass. Full Playwright/mobile
walkthrough was not rerun. Available-data engineering is delivered; **whole
original descriptive coverage remains50.0% and SO1 remains60.0%**, with no score
or approval change. Stable account/SKU/unit facts, complete territory history and
original acceptance exits remain open. Next: supported diagnostic investigation;
do not rebuild descriptive/BSG or repeat unavailable operating-data requests.
Paper remains deferred.


## Bounded financial/diagnostic walkthrough verified — 30 October 2026

[Signed-in desktop evidence](../outputs/descriptive_walkthrough_20261030/README.md)
verifies all three financial scopes, study-year exclusion and a rolling12-month
change investigation against independent dated-source sums. Ten compiled scope
checks and20 targeted backend tests pass. No application repair, new actual CSV
or mobile review, source/warehouse/model/approval change or score increase.
This is engineering self-review. Next: investigate the July/April/August recorded
contributions through supported product/buyer/transaction drilldowns; retain
unverified causes and missing identities. Operating records remain unavailable;
paper deferred.


## Recommendation clarity delivered — 30 October 2026

[Presentation and verification evidence](../outputs/recommendation_clarity_20261030/README.md):
Product and Area recommendations now show suggested owner and next check directly,
with longer rationale under collapsed Sales evidence. Signed-in native desktop
inspection confirms both pages and expanded Product rationale. Compiled contracts
pass80 product combinations/44 area views; all112 CSVs remain byte-identical to
prior packets. Frontend types and targeted lint pass. Implementer self-review,
not client acceptance; policies, source/model/approval gates and original objective
scores unchanged. Current operating records remain unavailable; paper deferred.
Next engineering: continue the supported descriptive/diagnostic walkthrough with
period/scope and evidence interpretation; no repeated operating-data request.


## Active Databricks workspace validation — 30 October 2026

[Executed folder validation](../outputs/databricks_updated_2_validation_20261030/README.md)
records200 passing local tests (existing numerical environment), seven generation
checks,15 immutable payloads plus pinned manifests,10 logical original CSVs and
captured Gold Delta0 receipt/key/amount validation. Run the packet verify.py for
55 retained-capture checks; it does not rerun Spark/cloud. Full commands and
raw-byte versus Gold identity limitations are in the linked report. No BSG rerun.


## Operating-input discovery — 30 October 2026

`python -X utf8 outputs/operating_input_readiness_20261030/verify.py` passes5,127
metadata/count/hash/link checks against scoped fresh Databricks metadata and named
local source/header captures. These do not verify current operating inputs.
`npm run typecheck:scripts` in backend passes after two existing verification
scripts add explicit response-shape guards. [Scope and actual recovery](../outputs/operating_input_readiness_20261030/README.md).
No application calculations changed or older live capture packets reran.


## Actual policy/weighted browser exports — 30 October 2026

`python -X utf8 outputs/policy_weighted_browser_20261030/verify.py` passes533 checks
against three actual signed-in downloads (15 rows,86 columns), exact weighted
oracle and EOQ cost comparison, DOM rejection/recovery/stale/default-reset evidence.
[Executed browser scope and limitations](../outputs/policy_weighted_browser_20261030/README.md).
Synthetic operating inputs; no new measured outcome, client acceptance or score gain.


## Original-clause assessment verification — 30 October 2026

`python -X utf8 outputs/objective_progress_20261030/verify.py` passes491 checks,
including45 SHA256 bindings and all33 unchanged original clauses/denominators.
[Assessment and actual commands](../outputs/objective_progress_20261030/README.md)
record24 fresh targeted policy/feasibility/weighted tests. Prior live/browser
receipts retain their actual dates; no new application build or source read.


## Dated planning browser downloads — 30 October 2026

`python outputs/planning_browser_review_20261030/verify.py` checks actual signed-in
UI exports against exhaustive independent arithmetic (1,024 combinations,
55 checks). [Executed scope](../outputs/planning_browser_review_20261030/README.md)
includes feasible/infeasible/recovery and stale clearing. Synthetic inputs;
engineering self-review, not client acceptance or a new responsive audit.


## Dated finite-domain quantity selection — 29 October 2026

From `backend/`, run `npx tsx --test tests/datedPlanSelection.test.ts tests/datedPlanReview.test.ts tests/inventoryFeasibility.test.ts tests/weightedPlanning.test.ts tests/planningScenario.test.ts tests/inventoryPolicyScenario.test.ts`:
50 tests pass. [Selection packet](../outputs/dated_purchase_selection_20261029/README.md)
contains80 exhaustive synthetic cases/4,060 combinations/1,445 independent checks,
production25,000-node stress and fresh five-product gateway-function execution.
Compiled UI proves optimal/bounded wording, export/failure clearing and prior
snapshot guards; both typechecks and targeted frontend lint pass. No actual
authenticated HTTP/browser/client acceptance, real input verification or measured
expiry benefit is established. Proof scope is the entered quantity/date domain.

## Backend dated fixed-plan review — 29 October 2026

From `backend/`, `npx tsx --test tests/datedPlanReview.test.ts tests/inventoryFeasibility.test.ts tests/weightedPlanning.test.ts tests/planningScenario.test.ts tests/inventoryPolicyScenario.test.ts`
passes43 tests. [Dated backend packet](../outputs/backend_dated_plan_20261029/README.md)
contains110 synthetic scenarios/2,194 independent quantity/financial/constraint
checks, current five-product Databricks/gateway-function verification and actual
unauthenticated endpoint401. Isolated server-action UI/export/failure checks and
both typechecks/targeted frontend lint pass. No authenticated HTTP/browser client
walkthrough, real operating-input verification, purchase optimization or measured
expiry outcome is established.

## Proposed purchase-lot timeline comparisons — 29 October 2026

`node frontend/e2e/purchase-lot-comparison.cjs` passes162 synthetic grid cases and
rejects10 invalid proposal contracts. `node frontend/e2e/operating-input-contracts.cjs outputs/purchase_lot_comparison_20261029`
passes24 prior structural rejections and isolated proposal UI/import/export/
stale-source cases. [Independent per-unit oracle](../outputs/purchase_lot_comparison_20261029/README.md)
passes5,553 checks including nonadditive proposal effects, late/short-lived lots,
baseline controls and per-lot conservation. Frontend typecheck and module lint
pass. No actual browser/client acceptance, financial feasibility or measured
expiry outcome is established.

## Entered supply timelines — 29 October 2026

`node frontend/e2e/supply-timeline-contracts.cjs` and
`node frontend/e2e/operating-input-contracts.cjs outputs/supply_timeline_20261029`
pass model/legacy/isolated-UI cases. The independent Python unit-token oracle in
[the timeline packet](../outputs/supply_timeline_20261029/README.md) passes2,430
checks over54 synthetic cases, preserving per-day/lot conservation, expiry and
arrival ordering, reserve and unmet-demand semantics. Frontend typecheck and
targeted module ESLint pass. No actual visual/client acceptance, real operating
input verification or measured expiry result is established.

## Lead-time / shelf-life review screens — 29 October 2026

From `backend/`, `npx tsx --test tests/inventoryFeasibility.test.ts tests/weightedPlanning.test.ts tests/planningScenario.test.ts tests/inventoryPolicyScenario.test.ts`
passes35 tests. [Retained screen packet](../outputs/inventory_feasibility_20261029/README.md)
contains120 synthetic grid cases/1,137 independent checks, compiled policy/legacy
UI/CSV and8-valid/87-invalid draft checks plus isolated save/load. Both typechecks
and targeted frontend lint pass. Real Databricks shortlist/gateway-function solve
uses synthetic assumptions; no actual visual/client acceptance, verified operating
inputs, batch safety or measured expiry outcome is established.

## Weighted allocation — 29 October 2026

From `backend/`, `npx tsx --test tests/weightedPlanning.test.ts tests/planningScenario.test.ts tests/inventoryPolicyScenario.test.ts`
passes 29 tests. [Retained weighted packet](../outputs/weighted_allocation_20261029/README.md)
contains 160 exact independent enumeration cases/11,455 pack combinations, 1,527
oracle checks, 259 export checks, actual node-cap stress, compiled UI/legacy and
draft save/load tests. Both no-emit type checks and targeted frontend lint pass.
Live Databricks shortlist/gateway-function calculation uses synthetic operating
inputs and entered scores; no actual visual/client acceptance or expiry benefit.

## EOQ/ROP scenario methods — 29 October 2026

From `backend/`, `npx tsx --test tests/planningScenario.test.ts tests/inventoryPolicyScenario.test.ts`
passes 20 tests. Backend/frontend no-emit type checking and targeted planning/draft
ESLint pass. [Retained method and integration packet](../outputs/inventory_policy_scenario_20261029/README.md)
includes the actual Databricks shortlist with synthetic entered assumptions,
compiled policy/legacy/CSV and draft cases, plus 496 independent Decimal/integer
checks. No operational-input verification, expiry measurement, global allocation
optimality or visual/client acceptance is established.

## Current client-review prompts — 29 October 2026

[Readiness verification](../outputs/client_review_readiness_20261029/README.md)
checks six task prompts, current Forecast consistency terminology/counts,
document links and unchanged not_run client records/retained operator packets.
No live tests were repeated for the documentation-only change. Reviewer role,
actual interpretation and any coaching must be recorded before client outcomes;
prior technical tests do not establish unaided understanding or acceptance.

## Gold-to-writer adapter integration — 29 October 2026

`python -X utf8 -m unittest services.tests.test_unit_gold_extraction services.tests.test_unit_prospective_issue -v`
passes 20 test methods, eight adapter plus twelve writer. The separate
`python -X utf8 -m outputs.unit_gold_adapter_20261029.verify` passes 56 rational
quantity/count/prediction assertions from synthetic row inputs. [Retained packet](../outputs/unit_gold_adapter_20261029/README.md)
covers compressed receipt/hash/batch identity, scoped historical reconciliation,
signed aggregation, preserved repeats, source/missing/history/limit failures,
Spark row conversion and no-overwrite bundle output. No live Spark/warehouse,
business-data forecast or new browser check; the runtime UI is unchanged.

## Offline prospective issue writer controls — 29 October 2026

`python -X utf8 -m unittest services.tests.test_unit_prospective_issue -v`
passes 12 test methods. [Retained test output and input contract](../outputs/unit_issue_writer_20261029/README.md)
cover hand-derived eight-row baseline/calendar results; stale/missing/future,
nonfinite, scope/source/receipt/registration and explicit-zero failures; Manila
time boundaries; partial/tampered cohorts; concurrent exclusive file creation;
overwrite rejection; missing source/backdating CLI rejection and read-only
validation. Disposable synthetic inputs only. Registered design files remain
byte-identical. No new business-data, warehouse or browser execution, and no
application build; services remain running.

## Prospective unit-design integrity — 29 October 2026

`python -X utf8 outputs/unit_prospective_protocol_20261029/verify.py` passes 502
checks of registration hashes, scope, 96 unique blank cases, four-method paired
cohorts, first/last calendar targets and issue/source lead differences. See the
[design packet](../outputs/unit_prospective_protocol_20261029/README.md). These
checks verify preparation, not a forecasting runner or prospective performance.
No new browser/warehouse/application tests were run for this offline-only
registration. Subsequent issue-writer guard tests are recorded above; the
controlled Gold extraction adapter and real issuance remain unverified.

## SO3 paired-error influence review — 29 October 2026

[Executed evidence and commands](../outputs/forecast_robustness_20261029/README.md)
cover the actual compiled panel, synthetic influential-target/tie controls,
separate exact-rational arithmetic, unchanged first 37 CSV fields, both actual
browser downloads/tables and bounded desktop/mobile containment. Run the existing
unit-research harness with `UNIT_RESEARCH_DIRECTORY=outputs/forecast_robustness_20261029`,
then `node frontend/e2e/unit-research-robustness.cjs` and the packet's `verify.py`.
Backend unit-research tests pass 9/9; frontend no-emit TypeScript and targeted
ESLint pass. Engineering self-review is separate from client acceptance; no
new model evaluation or publication approval is inferred.

## Cost-precision review rule — 29 October 2026

[Offline proposal and commands](../outputs/cost_precision_review_20261029/README.md)
cover 13 hand-solvable tests for exact/next-cent boundaries, old tolerance,
source/status/quantity guards, missing/nonfinite values, lineage/amount mismatch,
profit consistency, sign scope and no mutation. Independent fixed-point selection
and conditional aggregate reconciliation passes 6,744 checks on all 1,346 retained
Silver/Gold mismatch records, selecting 1,047 for review and deferring 299. Input
hashes verify against the prior sealed packet. These tests do not approve the
rounding assumption, change actual eligibility or repeat fresh cloud/UI testing.
The draft policy/form has no serving consumer; no app build or runtime change.


## SO1–SO2 original-source gap checks — 29 October 2026

[Executed read-only capture, reproduction and limits](../outputs/so1_so2_data_gaps_20261029/README.md)
cover pinned original Gold controls, nine-label mapping, ten local CSV sources,
three hash-verified Bronze comparisons and eight highest-value Silver financial
lineages. Seven local files match exact source bytes; the remaining three match
ordered CSV field values after BOM/newline normalization, without dropping order
or duplicates. Independent BigInt verification passes 22,225 checks across
counts, signed monetary sums, exclusive review queues and eight cost formulas
at the inherited ₱0.02 tolerance. The full 1,346-record mismatch cohort has
hash-verified Silver lineage and a separately checked hypothetical cent-rounding
sensitivity; no precision or eligibility policy is approved. Scoped TypeScript
compilation passes. Original
local source hashes remain unchanged. No runtime/eligibility change, app build,
new UI behavior, warehouse write, training or approval; no visual rerun needed.


## SO5 signed-in draft and module workflow verified — 29 October 2026

[Actual workflow evidence and five-clause findings](../outputs/so5_workflow_review_20261029/README.md)
close the bounded draft demonstration gap: two real downloads preserve blanks/
zeros; restoration clears a completed allocation/baseline/export and acknowledgment;
the gateway rejects solving before review; stale/acknowledged/malformed/oversized
files leave entered values intact; valid-file recovery passes. All five named
modules open with keyboard Enter. Data Source displays governed Databricks
handling and original itemized candidate/Delta0 provenance.

Three valid/16 invalid compiled validator cases and 151 separate assertions over
actual files/DOM captures pass. No runtime defect or patch, new ingestion/
publication transaction, warehouse/model/approval write, purchase, credential or
settings change occurred. Actual scope is signed-in Admin and synthetic planning
assumptions; it is not full role coverage or measured client usability. SO5 remains
1.5/5 (30%), partial: live official Signal-2, evaluated collaborative filtering,
accepted future procurement inputs and ingestion retry/correction/publication
remain open. Working Chapter4 Section4.0.14/E35 is updated; formatted manuscript
and client/adviser acceptance are separate. No BSG rerun is needed.

## SO4 baseline verification — 29 October 2026

[Executed commands and evidence](../outputs/so4_baseline_review_20261029/README.md)
cover 19 focused backend tests, fresh Gold shortlist/actual401, five compiled
states/four CSVs, 872 separate arithmetic assertions, actual signed-in calculation,
table/CSV, input-invalidation/infeasible clearing and bounded wide/narrow layout.
Types/lint pass. The compiled sandbox harness is not a replacement for actual
browser evidence. Viewport reset; no build ran beside Next dev. Synthetic input
controls do not establish procurement optimality, real stock validity, measured
expiry/turnover improvement or client acceptance. SO4 score unchanged.

## Actual SO1/Area/Forecast browser completion — 29 October 2026

[Executed packet](../outputs/live_browser_completion_20261029/README.md)
records restored browser access, selected live scopes and actual CSV bytes.
Root `verify_downloads.py` in that packet checks 11 downloaded files / 91 rows
against separately checked expectations. The final six-column SO1 display and
new Area/Forecast views now have bounded wide/narrow proof. A demonstrated
Forecast legend clipping issue is fixed and visually rechecked; all eight
baseline controls and the compiled unit regression/types/lint pass. Earlier
unverified statements remain historical, superseded only for the named checks.
Viewport reset; no warehouse/model/approval changes or whole-app audit inferred.


## SO3 research readout/chart — 29 October 2026

[Current packet](../outputs/so3_research_review_20261029/README.md) retains the
fresh source and separate reconstruction. Set `UNIT_RESEARCH_DIRECTORY` to
`outputs/so3_research_review_20261029`, then run root
`node frontend/e2e/unit-research-contracts.cjs`. It covers 40 cases, both leads,
eight chart configurations, appended calendar CSV fields, 16 invalid contracts,
metric/cohort conservation, zero-WAPE-denominator/tie behavior and stale-chart
clearing/disposal. Root `verify_review.py` in that packet recomputes scores,
cohorts, chart values and CSVs with Decimal (836 assertions). Existing backend
unit research tests pass. Live new-chart/layout/download acceptance remains
unverified because browser use is disabled; isolated DOM charts are not screenshots.


## Confirmed-area prioritization — 29 October 2026

[Scoped packet](../outputs/so2_area_completion_20261029/README.md) binds source,
code, calculation and implementation evidence. Root `node frontend/e2e/confirmed-area-contracts.cjs`
checks the compiled pure model and mounted panel in an isolated DOM model: all 44
year/region selections, 198 area rows, CSV identity, missing/negative/threshold
cases, formula-safe text, keyboard activation, outage clearing, recovery and
unmount races. Root `.venv-predictive/Scripts/python.exe outputs/so2_area_completion_20261029/verify_calculations.py`
separately reconstructs with Decimal. Backend `tests/areaPriorityReview.test.ts`
checks exact source identity and actual extracted route 401/400/200/safe 503.
The product compiled suite also passes using its explicit checked audit input.
New-panel signed-in visual/layout/download checks remain unverified: browser use
is disabled, and isolated DOM assertions are not browser acceptance. Legacy
engine-only area tests target the retained historical proposed-mapping component,
not the new hook-mounted primary panel.


## SO1 regional completion checks — 29 October 2026

[Executed regional findings packet](../outputs/so1_regional_completion_20261029/README.md)
contains fresh-source and reproduction commands. The existing regional contract
suite supports `REGIONAL_REVIEW_DIRECTORY`, `REGIONAL_OUTPUT_DIRECTORY` and
`REGIONAL_STL_SOURCE` for isolated current evidence. It checks six-column
comparisons, source-value/record allocation, full findings CSV identity, >100%
signed shares from returns, nonpositive denominators, empty years and clearing
on failure. Separate Decimal verification reconstructs raw-area controls and
parses four actual browser downloads. Original and financial SO1 regressions,
frontend types/scoped lint and backend script types pass. Retained screenshots
precede final table-label simplification; the final visual repeat is unverified
because local browser use is disabled. No browser settings were changed.


## SO2 commercial client workflow — 29 October 2026

[Executed packet and reproduction commands](../outputs/so2_client_review_20261029/README.md)
separate fresh Gold reconciliation, fixed-point arithmetic, the compiled DOM
suite, actual signed-in downloads/inspection and bounded wide/narrow layout.
The nine retained browser CSVs reconcile by running
`.venv-predictive/Scripts/python.exe outputs/so2_client_review_20261029/verify_downloads.py`
from root. Audit captures are never a runtime fallback. No application patch or
build was needed; backend script typecheck passes. These checks do not grant
full-objective, business or operational acceptance.


## SO1 client-view acceptance checks — 28 October 2026

[Executed three-part packet](../outputs/so1_client_review_20261028/README.md).
Set `REGIONAL_STL_TEST=1` and `REGIONAL_CLIENT_TEST=1` before running
`node frontend/e2e/regional-sales-contracts.cjs` from root. Covers 55 regional
selections and the new June scope/source guard; financial/STL parity and failure
clearing are retained. Both original SO1 suites pass. Backend
`verify-so1-client-review.ts` via tsx checks a fresh source read and local 200/401.
Root `.venv-predictive/Scripts/python.exe outputs/so1_client_review_20261028/verify_downloads.py`
checks actual retained browser CSV bytes against the fresh source. Signed-in
desktop/narrow-layout evidence is bounded to the packet's stated views; no
whole-app/device audit or client-usability study is inferred.


## Simpler territory review and June source localization — 28 October 2026

[Evidence and reproduction](../outputs/regional_june_review_20261028/README.md):
`node outputs/regional_june_review_20261028/verify.cjs` checks captured June rows
against separate BigInt sums and inherited hash-matched monthly controls. Existing
regional financial/STL and both SO1 compiled suites pass after progressive-disclosure
changes. New financial cards clear on outage and match existing selected totals.
Front-end type/lint and backend script type checks pass; no production build needed.


## Regional STL connection - 28 October 2026

Root: `.venv-predictive/Scripts/python.exe -m unittest services.tests.test_regional_stl -v`
(6), `$env:REGIONAL_STL_TEST='1'` then `node frontend/e2e/regional-sales-contracts.cjs`
(55 financial/33 STL views, chart/table/CSV and independent failure states), and
`node outputs/so1_regional_stl_20261028/verify.mjs` (351 calendars/81 components/bridge).
Backend: `node --import tsx --test tests/regionalStlReview.test.ts tests/regionalSalesReview.test.ts tests/so1Financial.test.ts`
(21), `stage-regional-stl.ts --verify` and `verify-regional-stl.ts` via tsx for actual
warehouse/readback/runtime checks. Types/lint pass; bounded signed-in desktop views now pass with screenshots. Mobile layout and independent browser-download inspection remain unverified. [Reproduction and boundaries](../outputs/so1_regional_stl_20261028/README.md).

## Confirmed regional sales connection - 27 October 2026

From backend run `node --import tsx --test tests/regionalSalesReview.test.ts tests/so1Financial.test.ts`
(13 passes), `node --import tsx scripts/stage-regional-review.ts --verify` and
`node --import tsx scripts/verify-regional-review.ts`. From root run
`node frontend/e2e/regional-sales-contracts.cjs` (55 views, 1,185 month slots and
110 selected-month/regional-total CSVs) and
`.venv-predictive/Scripts/python.exe outputs/so1_regional_connection_20261027/verify_calculations.py`
(separate Decimal/calendar reconstruction; 13,269 exact money/count assertions,
364 matched-month pairs). Prior raw-label SO1 financial UI regressions, types/lint,
source/Delta/hash/conservation and runtime 200/401 checks pass. Actual signed-in
visual/responsive review remains unverified. [Scope and recovery](../outputs/so1_regional_connection_20261027/README.md).

## Connected unit research review — 27 October 2026

From backend run `node --import tsx --test tests/unitBaselineResearch.test.ts tests/rollingResearch.test.ts tests/originalResearch.test.ts` (29 passing reader/route cases),
`node --import tsx scripts/verify-unit-research.ts` (actual reader and 200/401 runtime checks)
and `node --import tsx scripts/stage-unit-research.ts --verify` (exact current-source/readback, no insert).
From root run `node frontend/e2e/unit-research-contracts.cjs`: 40 cases across two
lead views/table/CSV, malformed contracts, stale clearing/recovery and disposal.
Existing fixed/rolling compiled UI regressions preserve 441/882 cases. Backend
source/scripts and frontend types plus scoped lint pass. Real signed-in visual/
responsive review remains unverified. [Commands and boundaries](../outputs/bupiright_research_connection_20261027/README.md).

## BUPIRIGHT identity/unit investigation — 27 October 2026

From root run `.venv-predictive/Scripts/python.exe -m unittest services.tests.test_bupiright_lineage -v` (14 cases) and `node outputs/bupiright_lineage_20261027/verify.mjs`. Separate BigInt/date/price reconstruction checks 405 source rows, 53 controls, 203 monthly groups and 30 label/area series, the confirmed 50-record/35-month unit candidate and 40 predictions/eight metric groups. From backend run `npm run typecheck:scripts`. [Scope and reproduction](../outputs/bupiright_lineage_20261027/README.md) retain the user-confirmed two-label research scope, origin-local baselines and unchanged global mappings/publication flags. No learned model fit.

## Original medicine pilot screening — 27 October 2026

Run `.venv-predictive/Scripts/python.exe -m unittest services.tests.test_medicine_pilot_screen -v`
from root: eight source/control/date-gap, evidence/identity, price-hash and exact
presentation/no-approval cases pass. The packet's `verify.mjs` independently
reconstructs all 5,252 series from 19,965 monthly groups with date sets and BigInt
money, reconciles category/year controls and checks 165 historical price rows.
[Commands and limits](../outputs/original_medicine_screen_20261027/README.md)
retain nonpositive-only labels, no gap fill, no alias merge, exact evidence scope
and no current fit. Backend script types pass; no UI change or app build required.

## Commercial source-case/value coverage follow-up — 27 October 2026

From root, run `.venv-predictive/Scripts/python.exe -m unittest services.tests.test_commercial_case_review -v`
(6 cases) and from backend run `node --import tsx --test tests/product-commercial-review.test.ts tests/descriptive-products.test.ts`
(14 cases). New checks cover source/control/view mutation, missing-versus-zero
history, count/value bridge conservation and monetary-gap ranking despite high
record-count coverage. Run the case packet's `verify-cases.py` and `verify-review.py`
for 154 separate Fraction and 211,394 Decimal assertions. The default
`node frontend/e2e/product-commercial-contracts.cjs` now uses current case-packet
views plus the explicitly pinned earlier complete Gold capture, checking 80 scope/
focus cases and 24,164 CSV rows with the new field. [Reproduction and boundaries](../outputs/commercial_case_review_20261027/README.md)
preserve the earlier packet rather than overwriting its dated evidence. Types/lint
and local 200/401 service/auth checks pass; signed-in visual review remains unverified.

## Product commercial review — 27 October 2026

From `backend/`, run `node --import tsx --test tests/product-commercial-review.test.ts tests/descriptive-products.test.ts`:
13 paired financial/support, missingness, boundary, scope and decimal cases pass.
From root, run `node frontend/e2e/product-commercial-contracts.cjs` and
`.venv-predictive/Scripts/python.exe outputs/product_commercial_review_20261027/verify.py`.
The former compiles the actual renderer/engine and checks 80 live-capture scope/
focus cases and 24,164 CSV rows using an isolated DOM; the latter independently
recomputes 20 views with 192,172 Decimal assertions. [Actual source checks and limits](../outputs/product_commercial_review_20261027/README.md)
include fresh Gold controls, source statuses, exact-day/month comparison, formula-safe
export and stale-state clearing. Compiled checks do not replace signed-in visual
review, which remains unverified. Frontend types/scoped lint and backend script
types pass; no Next build while dev runs.

## Original ABC evaluation — 27 October 2026

Run `.venv-predictive/Scripts/python.exe -m unittest services.tests.test_abc_evaluation services.tests.test_abc_protocol -v`
from root: 17 tests cover the frozen contract plus source/registration mutations,
hand confusion metrics and undefined denominators, training-only preprocessing,
baseline fallback, validation-only gain/A-recall/tie selection and refusing refits.
`outputs/original_abc_evaluation_20261027/verify.py` reloads saved models without
fitting and independently checks 1,032 cases, 40 groups and 498 probabilities.
[Actual run and limits](../outputs/original_abc_evaluation_20261027/README.md)
retain prior inspection, exact-label scope, missing histories and no activation.

## Original ABC research design — 27 October 2026

Run `.venv-predictive/Scripts/python.exe -m unittest services.tests.test_abc_protocol -v`
from root. Nine checks cover ABC boundaries/ties, prior-only inputs despite mutated
later amounts, missing/ineligible histories, cohort boundaries, forbidden fields/
cutoffs/partitions, actual source/class support, overlapping provenance months and
immutable identical/differing retries. The separate
`outputs/original_abc_protocol_20261027/verify.py` reconstructs all 6,233 rows from
saved Gold aggregates and passes 56,097 assertions. [Protocol scope and commands](../outputs/original_abc_protocol_20261027/README.md)
distinguish preparation from classifier fitting, family-disjoint or blind evaluation,
historical publication proof and operational acceptance. No application build required.

## SO1 paired financial extension — 27 October 2026

[Financial/reference/paper packet](../outputs/so1_financial_scope_20261027/README.md)
retains actual five-scope Gold reads and independent 1,540 Decimal assertions.
Financial hand cases distinguish paired weighted rates from average rates/all-net
denominators and check missing/signed/nonpositive support. Run financial/original
SO1/legacy/STL backend tests, source/scripts types, frontend types/scoped lint and
`node frontend/e2e/so1-financial-contracts.cjs` from root. Compiled checks cover 46
selections/2,898 monthly rows and matching-profit CSVs plus failure recovery.
Reference audit reads 22 labels without changing mappings. Browser use is disabled;
signed-in visual review remains unverified. Working-paper claims/links are checked;
formatted manuscript rendering is outside this update.

## Original-source SO1 integration — 27 October 2026

[Actual rebuilt candidate and consumer packet](../outputs/original_so1_20261027/README.md)
retains six Gold/module view checks, exact Delta 0 creation/readback and zero-write
retry. Independent Decimal/calendar/component verification passes 411,497 assertions
across 41 groups (not independent test cases). Backend 23 cases use
`node --import tsx --test tests/originalSo1.test.ts tests/so1-diagnostics.test.ts tests/originalStl.test.ts`;
Python 20 cases retain conditional-policy/baseline behavior. From root,
`node frontend/e2e/original-so1-contracts.cjs` checks 46 label/year selections,
2,898 monthly rows, nine daily-window selections and 5,060 contribution export rows.
Source/scripts/frontend types, scoped lint and service/auth probes pass. Real
signed-in visual/responsive review remains unverified; DOM/Chart models do not
establish visual acceptance. Reproduction commands and scope limits live in packet.

## Rolling research integration — 27 October 2026

[Actual candidate/current Gold/fixed-run preservation](../outputs/rolling_research_connection_20261027/README.md)
and identical zero-write retry pass. Backend 31 cases cover new rolling reader and
actual auth/filter/failure route with original/legacy/STL regressions. Reproduce
with `node --import tsx --test tests/rollingResearch.test.ts tests/originalResearch.test.ts tests/extension-research.test.ts tests/originalStl.test.ts`
from backend. `verify-rolling-research.ts` checks live reader/fixed preservation.
From root, `node frontend/e2e/rolling-research-contracts.cjs` checks 882 cases/84
model-lead-window chart/table/CSV selections, state/failure/recovery and ID isolation;
the original-research-contracts.cjs regression still passes 441 cases. Source/scripts/
frontend types and scoped lint pass. Real signed-in visual/responsive review remains
unverified; compiled DOM/Chart checks do not establish that acceptance.

## Original-itemized monthly-refresh execution — 27 October 2026

[Actual execution packet](../outputs/original_rolling_evaluation_20261027/README.md)
retains fresh Gold parity, 945 fits/1,722 cases and independent 126-group score,
source-target/training-digest and selection reconciliation. From repository root,
run `python -m unittest services.tests.test_original_rolling services.tests.test_original_diagnosis services.tests.test_original_research`
with the existing predictive environment (12 cases). The isolated runner test
captures actual origin inputs, refuses audit-driven selection, verifies identical
fit caching and explicit failures, checks source/plan/target tampering and CSV
identity/approvals. No runtime browser or dashboard change is part of these tests.
Reconciliation/plot reproduction commands and their limits are in the packet.

## Original-itemized research reader and panel — 27 October 2026

[Actual candidate/source/selector readback](../outputs/original_research_connection_20261027/README.md)
and exact zero-write retry pass. From backend, run
`node --import tsx --test tests/originalResearch.test.ts tests/extension-research.test.ts tests/originalStl.test.ts`
(22 cases), `node --import tsx scripts/verify-original-research.ts`, source noEmit
and script type checking. From the repository root run
`node frontend/e2e/original-research-contracts.cjs`: actual compiled UI/DOM/Chart
models check all 441 audit cases in 42 selections/CSV exports, no unsupported future
window, metadata/legacy compatibility, error clearing/recovery and disposal races.
Frontend noEmit/scoped lint also pass. Running gateway auth/source and frontend
availability are checked separately; these are not signed-in visual acceptance.
Real visual/responsive review remains unverified; no browser/session bypass.

## Original-itemized STL reader connection — 27 October 2026

[Connection verification](../outputs/original_stl_connection_20261027/README.md)
retains an independent actual Databricks candidate/source/monthly readback and
main-gateway parity,39 passing backend cases and8 compiled-panel/DOM/Chart/export
checks. Source/scripts/frontend type checks, scoped lint, safe auth/error HTTP
tests and running-service checks pass. Real signed-in visual/responsive review
remains unverified. No warehouse/source writes or Python training occurred.
Reproduce from backend with `npx tsx scripts/verify-original-stl.ts` and
`npx tsx --test tests/originalStl.test.ts`; pure panel checks from repository root
with `node outputs/original_stl_connection_20261027/frontend-check.cjs`.

## Unified financial scope — 27 October 2026

[Verification packet](../outputs/unified_sales_scope_20261027/README.md):49 focused
backend tests,10 actual compiled-function/VM/DOM-model checks,13 pure frontend
null-contract cases, backend source/script and frontend type checks, scoped lint,
fresh Gold per-scope controls/filtered ledger/CSV conservation and running-service
checks pass. The updated old null fixture recognizes record_kind explicitly.
Reproduce new backend checks with `npx tsx --test tests/financialScope.test.ts`
from backend; pure frontend contracts with
`node outputs/unified_sales_scope_20261027/frontend-check.cjs` from the repository;
read-only warehouse checks with `npx tsx scripts/verify-financial-scopes.ts` from
backend. The existing frontend null-contract runner was limited to cases without
the page fixture (`--grep-invert "nullable summary cards"`); no browser launched.
Browser control is disabled, so real signed-in visual/responsive interaction and
full browser-suite verification remain open. No Next build ran alongside next dev.

## Active main original itemized source — 27 October 2026

[Main connection verification](../outputs/original_dashboard_20261026/README.md)
retains43 core and47 dependent backend passes, eight actual-frontend-function/
DOM-model checks, TypeScript and scoped lint. Fresh SQL verifies snapshot/status/
ledger/summary, filtered preview parity and complete catalog net/key populations.
Planning null/checksum behavior and withheld old STL/models are checked. Running
health and startup confirm the configured adapter/source; protected HTTP routes
deny no-session access. These are not a real signed-in browser walkthrough, which
remains unverified because local browser control is disabled. No new financial,
unit/model or whole-objective acceptance follows from these technical checks.

## Separate sales scopes — 26 October 2026

[Actual scope checks](../outputs/sales_scope_20261026/README.md) add five contract
backend cases beside eight itemized cases, eleven bounded main-control/review
browser checks and the existing eleven itemized UI checks. Live SQL checks pin
contract source keys/count/net, year isolation and monthly/CSV scope. The running
protected page/API deny unauthenticated access; types/lint pass. Desktop/mobile
captures are fixtures; current signed-in inspection is unverified because local
browser use is disabled. No combined-sales or business-approval claim follows.

## Typed original itemized integration preview — 26 October 2026

[Executed preview verification](../outputs/itemized_integration_20261026/README.md)
retains8 focused backend tests,11 bounded browser checks, source/frontend/script
TypeScript and scoped ESLint. Actual read-only SQL checks validate the Gold
receipt/key/count/net identity and monthly/product conservation; all three CSV
views match a filtered scope and the full record export has all unique itemized
keys and exact eligible net. The real local app redirects signed-out visitors
and rejects unauthenticated preview/export requests. Fixture role/browser checks
do not establish a real signed-in production walkthrough. No main source switch,
contract additivity, business release or old-model compatibility is inferred.

## Original-source candidate layer checks — 26 October 2026

`python -X utf8 -m unittest discover -s databricks_updated_2/medshield_project/tests -p test_original_layers.py`
passes eleven tests for real ten-source/financial controls, full evidence
roundtrip, all source IDs and recorded values, independent category/quantity/
forecast gates, future-year and changed-source handling, and same/different
existing-table behavior. The last checks use fixtures, not live Delta.
`python -X utf8 databricks_updated_2/medshield_project/render_original_layers.py --check`
verifies all three generated notebooks match reviewed sources; compilation and
self-contained/unsafe-write checks run during rendering. See
[the dated receipt](../outputs/original_layers_20261026/verification.json).
Actual Spark/permissions/readback and consumer publication remain separate checks.


## SO1 dashboard integration — 25 October 2026

[Actual candidate/source/gateway and UI evidence](../outputs/so1_dashboard_20261025/README.md)
includes 20 backend cases across new SO1 and affected source/STL/history contracts,
frontend/backend types and scoped lint. Ten browser cases pass across the new
territory panel and existing historical context; final five new-panel cases
also pass after plain mapping wording and latest capture replay. These check
territory/year filters, partial 2026 matching, missing/zero behavior, exact chart/
table/CSV values, source failure clearing, no-history output, keyboard/disposal
and desktop/mobile fit. The replay uses actual Gold/gateway captures for the
main checked scopes; it is not a signed-in live UI acceptance claim.

From `backend/`: `node --import tsx --test tests/so1-diagnostics.test.ts
tests/stl-source-2026.test.ts tests/descriptive-source-2026.test.ts
tests/historical-comparison.test.ts`. From `frontend/`: `npx playwright test
e2e/so1-panel.spec.ts e2e/historical-comparison.spec.ts --workers=1`.
Direct actual module readback and identical zero-write staging retry passed;
unauthenticated live HTTP access returns 401. Adrian retains deferred signed-in
manual QA. Original objective/publication gates remain separate.

## Planning source/window integrity — 25 October 2026

[Fresh source and test evidence](../outputs/planning_release_integrity_20261025/README.md)
adds source-release/scope/window checksum sensitivity, unchanged allocation,
actual reader empty/outage paths and approved-source planning controls with
explicitly synthetic operational inputs. Backend command:
`node --import tsx --test tests/planning-evidence.test.ts tests/planning-shortlist-reader.test.ts tests/planningScenario.test.ts`.
Browser command: `node node_modules/@playwright/test/cli.js test
e2e/planning-release-integrity.spec.ts e2e/workflow-completion.spec.ts
e2e/prescriptive-planning.spec.ts --workers=1`.
The new replay reconciles exact scenario CSV and request inputs to the fresh
gateway module output, rejects an old checksum after a release change despite
identical product rows, and restores only the same-source unapproved draft.
`.25` and `1e3` input text is retained. Manual authenticated UI and real
operational suitability are not established by this check.

## Current-source forecast and planning drafts — 25 October 2026

[Actual evidence and commands](../outputs/workflow_completion_20261025/README.md)
retain candidate prepare/apply/verify, fresh Gold/gateway numerical checks,
backend tests and browser replay. From `backend`, run:

```powershell
node --import tsx --test tests/extension-research.test.ts tests/planningScenario.test.ts tests/predictiveResearch.test.ts
npx tsc -p tsconfig.scripts.json --noEmit
```

From `frontend`, run:

```powershell
node node_modules/@playwright/test/cli.js test e2e/workflow-completion.spec.ts e2e/prescriptive-planning.spec.ts e2e/diagnostic-drilldown.spec.ts e2e/overview-evidence.spec.ts --workers=1
npx tsc --noEmit
```

New tests use a retained fresh Gold gateway capture for all-model calendar/value
and exact displayed/exported parity, future-null behavior, narrow layout,
source/publication failure, recovery/disposal, and incomplete/zero planning draft
round-trip with stale/malformed/oversized/source failures. Planner input edits
must clear review acknowledgment. The earlier last-N diagnostic oracle now
expects February–April 2025 from its latest recorded April fixture; it no longer
uses the unrelated October 2026 wall clock. This is an expectation repair, not
a filter implementation change. Manual signed-in QA is deferred to the user;
fixture browser checks do not prove that walkthrough or operational approval.

## Historical comparison UI and source checks — 25 October 2026

[Actual execution and limits](../outputs/historical_comparison_ui_20261025/README.md)
record 13 passing scoped backend cases, five final browser cases and 657 fresh
gateway/source comparisons. From `backend/`, run
`node --import tsx --test tests/historical-comparison.test.ts tests/historical-comparison-reader.test.ts tests/external-context.test.ts tests/nasa-sales-binding.test.ts tests/financial-publication.test.ts`.
From `frontend/`, run
`node node_modules/@playwright/test/cli.js test e2e/historical-comparison.spec.ts --workers=1`.
The final replay case uses retained live values to check all points/table cells/
CSV values; it is not authenticated live browser evidence. Local browser use was
disabled in Work settings. One broader legacy date-scope oracle expects elapsed
wall-clock dates instead of its recorded fixture endpoint; its failure and
separate owner remain visible in the packet rather than being counted as a pass.

## NASA approved-source resolver and historical external checks — 25 October 2026

From `backend/`, `node --import tsx --test tests/nasa-sales-binding.test.ts tests/nasaPowerWeather.test.ts tests/weatherProviders.test.ts tests/financial-publication.test.ts`
passes 19 cases. The new NASA cases exercise the actual reader with injected
boundaries: it delegates fact SQL to the approved-source resolver, preserves
proxy/non-forecast status, fails visibly on required-source failure and returns
no invented rows when NASA is unrefreshed. Backend script TypeScript passes.
[Actual live NASA readback and warehouse/context evidence](../outputs/external_readiness_20261025/README.md)
remain distinct from fixtures. Initial source-label and verifier/import errors
are retained and explained there; no augmented fitting or owner approval is
inferred from passing preparation checks.

## Growth spacing checks — 25 October 2026

From `frontend/`, run `node node_modules/@playwright/test/cli.js test e2e/growth-presentation.spec.ts --workers=1 --output=test-results-growth-stable`.
The fixture checks desktop/mobile fit, positive/negative peso values, margin
values, plot heights, single margin framing, 16px card separation, collapsed
notes, current single-peso growth presentation and unavailable margin refresh.
Actual CSS overrides and compiled runtime are used. See
[scoped evidence](../outputs/growth_spacing_20261025/README.md) for passing runs,
concurrent-edit recovery and broader stale-assertion limitations. These are
synthetic fixture checks, not fresh authenticated Gold reconciliation.

## Quantities presentation checks — 25 October 2026

The subsequent searchable-picker implementation is checked with
`node node_modules/@playwright/test/cli.js test e2e/quantities-presentation.spec.ts e2e/sales-heatmap.spec.ts e2e/descriptive-chart-integrity.spec.ts e2e/catalog-resolution.spec.ts e2e/source-2026.spec.ts --workers=1 --output=test-results-quantity-picker-final`.
It adds bounded desktop/mobile results, alias search, natural/prefix ordering,
duplicate pack identity, keyboard/pointer selection, no-match and unavailable
states, category/area/source coverage and selected-product persistence through
response refresh and exact daily/yearly scope changes. Existing tests now open
More filters and the product picker before operating their controls. The legacy
heatmap fixture explicitly selects its intended 2025 calendar and monthly grain.
See [picker evidence](../outputs/quantity_picker_20261025/README.md) for actual results and limits.

The initial presentation checkpoint used a narrower fixture set; its four-case
result below is historical. Use the picker command above for current verification.
Those four scoped browser cases passed: signed bars, observed-period total/average/coverage,
desktop/mobile fit with the actual overrides, CSV agreement, zero versus missing,
separate unreviewed evidence, incomplete-index empty state, service-failure clearing
and recovery, plus the existing full-runtime index/heatmap parity check.
These synthetic fixtures verify presentation behavior, not current Gold values or
authenticated source availability. See [retained evidence](../outputs/quantities_presentation_20261025/README.md).

## Overview single-graph checks — 25 October 2026

The overview now has one buyer-filtered graph, with All sectors selectable.
From `frontend/`, run `node node_modules/@playwright/test/cli.js test e2e/sector-overview.spec.ts e2e/dashboard-filter-placement.spec.ts e2e/source-2026.spec.ts --workers=1`.
Fresh scoped runs pass all 18 cases (seven sector, nine filter and two 2026-source
cases), including sector/measure persistence, missing observations, signed values,
CSV scope, date overlays and desktop/mobile fit. The filter suite explicitly
selects All for company-total assertions. Frontend TypeScript and scoped runtime
lint pass. Desktop/mobile fixture captures were visually checked; authenticated
live-source appearance was not rechecked for this presentation change.

## Historical filter checks — 25 October 2026

[Filter verification packet](../outputs/filter_repair_20261025/README.md) retains
the numerical/date matrix, invalid custom dates, scope persistence, cross-year
contribution scope, chart/CSV agreement and responsive controls. From `frontend/`:
`node node_modules/@playwright/test/cli.js test e2e/dashboard-filter-placement.spec.ts --workers=1`.
The broader affected suite adds `e2e/overview-evidence.spec.ts`,
`e2e/sector-overview.spec.ts`, `e2e/sales-diagnostics.spec.ts`,
`e2e/descriptive-chart-integrity.spec.ts`, `e2e/source-2026.spec.ts` and
`e2e/sales-heatmap.spec.ts`. The fixture's scope is real runtime behavior on known
inputs, not independent usability or acceptance evidence. Existing legacy skips
remain explicit; the authenticated browser supplies the dated live check.

## Current-source Q4 estimate checks — 25 October 2026

[Implementation and retained verification](../outputs/q4_estimates_20261024/README.md)
cover separate unpublished revenue baseline scenarios, observed-month exclusion,
origin/lead identity, missing/zero inputs, obsolete archived-projection suppression,
chart/table/CSV parity and source-failure clearing. From `backend/`, run
`node --import tsx --test tests/forecastEvidence.test.ts tests/forecastGateway.test.ts tests/descriptive-source-2026.test.ts`.
From `frontend/`, run
`node node_modules/@playwright/test/cli.js test e2e/forecast-validation.spec.ts e2e/predictive-research.spec.ts --workers=1`.
The read-only configured-Gold check runs from `backend/` with
`node --import tsx ../outputs/q4_estimates_20261024/verify-live.cjs`; its dated
September-origin/Q4 assertions intentionally identify this source snapshot.
Passing arithmetic and fixtures do not establish forecast accuracy or model
publication. The optional separate live research test was updated but not run
for this change; the existing authenticated browser was used for live UI review.

## Source-compatible STL and paper metric checks — 24 October 2026

[Actual implementation, persistence and readback](../outputs/paper_analytics_closure_20261024/README.md)
retain sixteen focused backend cases, six notebook pure-function cases and
all-script TypeScript success. From `backend/` run
`node --import tsx --test tests/stl-publication.test.ts tests/stl-source-2026.test.ts tests/stl-view-model.test.ts tests/descriptive-source-2026.test.ts`.
From the repository root run
`.\.venv-predictive\Scripts\python.exe -m unittest discover -s databricks_updated_2/medshield_project/tests -p test_stl_2026.py -v`.
Checks cover source/output isolation, audit/mapping/predicate/parameter conflicts,
reconstruction, gaps, safe candidate persistence, idempotence and legacy reader
compatibility. The actual controlled candidate publication and gateway reader are
separate live evidence. Original paper MAPE was recomputed with Decimal from the
retained financial run; it is not a new fit or a medicine-unit performance result.

## Current-source analytics tooling and extension — 24 October 2026

[Actual test and numerical evidence](../outputs/analytics_completion_20261024/README.md)
records thirteen backend source/receipt/extraction checks and ten Python
coverage/extension checks. Run from `backend/`:
`node --import tsx --test tests/descriptive-evidence-2026.test.ts tests/descriptive-source-2026.test.ts`
and `node node_modules/typescript/bin/tsc -p tsconfig.scripts.json --noEmit`.
From the repository root run:
`.\.venv-predictive\Scripts\python.exe -m unittest services.tests.test_predictive_extension services.tests.test_predictive_coverage_review -v`.
The checks cover wrong source/pin/predicate, explicit legacy string-version
compatibility, unknown coverage, contradictory current-month zeros, blocked fits,
plan rebinding, complete accepted windows, synthetic expected metrics, temporal
leakage, unchanged selection and identical comparison cases. Fresh read-only
descriptive/extraction and actual accepted-source offline evaluation are retained
separately from fixtures. No new browser or warehouse-publication check is claimed.

## Main Databricks folder checks — 24 October 2026

Use `databricks_updated_2/` for current local notebook checks. Its source CSVs and
reference CSVs are in flat `medshield_project_csv/` and `medshield_reference_csv/`
folders. Tests, guides and preparation tools restored beside the supplied workspace
files are local tooling; these checks do not upload files or run cloud notebooks.
See the [current workspace guide](../databricks_updated_2/README.md) for the boundary.

```powershell
python -X utf8 -m unittest discover -s databricks_updated_2/medshield_project/tests -v
python -X utf8 databricks_updated_2/medshield_project/render_readme.py --check
```

Dated receipts and commands below retain their original checked paths and input
identities. Use the commands above for the main folder's current notebook suite;
historical hash-bound catalog descriptors may intentionally retain `databricks/`
artifact paths. A local pass does not establish remote workspace parity.

## 2026 application release checks — 24 October 2026

[Actual implementation and receipts](../outputs/app_2026_activation_20261024/README.md)
retain 197 passing backend regressions and 24 focused checks after the final
environment/default compatibility change. Browser regression covers 23 existing
cases and two new 2026 scope/provenance cases; fixture/resize recovery is explicit.
A real authenticated workflow verifies saved configuration after restart, selected
2026 API/chart/export agreement with independent Gold sums, nine-month CSV review
labels, mobile fit and original 21-model research. Nine live gateway checks and 60
Decimal metric recomputations pass. Backend/frontend TypeScript checks pass.
The actual fit engine correctly blocks the prepared 81-month input before training.
Configuration rollback/reapply preserves unrelated settings and original bytes.
No Next build ran while dev was active; containers were not built or deployed.

```powershell
cd backend
node --import tsx --test tests/*.test.ts
cd ../frontend
node node_modules/@playwright/test/cli.js test --config=../outputs/app_2026_activation_20261024/browser.config.cjs
node node_modules/@playwright/test/cli.js test --config=../outputs/app_2026_activation_20261024/login.config.cjs
```

## Gold historical archive lineage regressions — 24 October 2026

[Archive-path correction and retained evidence](../outputs/gold_immutable_recovery_20261024/README.md)
record 110 passing notebook/helper regressions, including seven new tests of the
actual Gold archive mapper: historical-only restoration, original nulls, duplicate
or missing keys, changed file/row identity, invalid archive bindings, and continued
rejection of changed money, quantity, catalog or eligibility values. Eight operator
configuration tests and 21 written-package/evidence checks also pass. The first
full run failed only on the outdated generated README; regeneration and a full
rerun resolved it. Complete Databricks Spark/Gold publication and persisted
readback remain pending; nine aggregate-only SQL statements diagnosed the live
shared-field mismatch without writes. No application build was needed.

```powershell
python -X utf8 -m unittest discover -s databricks/medshield_project/tests
python -X utf8 databricks/medshield_project/render_readme.py --check
python -X utf8 outputs/gold_immutable_recovery_20261024/build-and-verify.py
python -X utf8 outputs/gold_immutable_recovery_20261024/test_operator_entrypoint.py
```

## 2026 source intake regressions — 22 October 2026

[Final evidence and package](../outputs/source_ingestion_20261022/README.md) record
103 passing notebook/helper/contract tests and 17 separate historical/raw-cell/
bundle checks. Coverage includes multiline physical-line preservation, grouped
headers, distinct cost quantity, missing dates, provenance, immutable historical
values, predecessor drift, isolated target writes, and denial of demand/approval
escalation. Historical tests keep their explicit nine-year population; the source
auditor supports additional years and unknown future months. Actual Databricks
Spark/Gold writes and persisted readback remain unverified behind Workspace/Jobs
HTTP403. No application build or serving/model change was performed.

```powershell
python -X utf8 -m unittest discover -s databricks/medshield_project/tests -v
python -X utf8 outputs/source_ingestion_20261022/verify_local.py
python -X utf8 databricks/medshield_project/render_readme.py --check
```

## Step 3 external-revenue runner checks — 20 October 2026

[Actual execution and receipts](../outputs/external_revenue_experiment_20261020/README.md)
record32 passing focused/regression tests (12 new runner tests), including known
synthetic external-effect recovery, future-value isolation, calendar/null rules,
rank/constant failures, signed results, blocked external fits and source/registration
drift/overwrite refusal. Initial31-test evidence is retained; a registration
hardening test was added and the final complete scoped suite passes32.

Independent Decimal55 normal-equation regression reconstructs real baseline
predictions, training moments and metrics, with708 final assertions and no external
coefficients/predictions invented. The unchanged candidate-source verifier was
freshly rerun and passes745 separate input/lineage/acceptance checks. These are
local implementation/source checks, not a fresh cloud query or approval.

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 -m unittest services.tests.test_external_revenue_experiment services.tests.test_external_regression services.tests.test_predictive -v
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/external_revenue_experiment_20261020/verify.py
```

Real-data results are two sales-only controls on the candidate cohort; both
augmented recipes remain blocked. No low-error, operational, medicine-unit,
publication or causal acceptance follows. No application build/restart needed.

## Adaptive revenue research verification — 20 October 2026

The [adaptive packet](../outputs/adaptive_revenue_experiment_20261020/README.md)
records 47 passing focused/regression tests, including 12 new adaptive tests,
and 17,336 separate assertions covering 432 fit traces / 1,056 CSV rows, training
cutoffs and moments, calendar/Huber/Kalman reconstruction, independent blend-LP
objective, Decimal metrics, exact cohorts and preserved original hashes.

```powershell
.\.venv-predictive\Scripts\python.exe -u -X utf8 -m unittest services.tests.test_predictive services.tests.test_predictive_sector_refresh services.tests.test_predictive_sector_policy services.tests.test_predictive_adaptive_revenue -v
.\.venv-predictive\Scripts\python.exe -u -X utf8 outputs/adaptive_revenue_experiment_20261020/verify.py
```

The initial synthetic nonconvergence log is retained; a correctly specified
seeded fixture and explicit nonconvergence-rejection test pass without weakening
model budgets. One real fit also remains unavailable as required. Passing checks
verify implementation/readback, not low future error or publication approval.
The packet distinguishes selected monthly improvement with bias, failed selected
annual performance and small unselected annual improvement. No cloud/app build,
source write, activation or 2026 actuals were involved.

## Registered annual sector policy — 20 October 2026

[Executed evidence](../outputs/sector_policy_experiment_20261020/README.md) records
35 passing tests (including 11 new meaningful policy tests), an actual registered
run and 22,026 separate Decimal assertions covering source, forecasts, selection,
metrics, CSV, earlier-history equivalence and preservation. The sector candidate
is worse than retained last value; passing implementation checks do not mean a
better or accepted forecast. Recheck from the root:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 -m unittest services.tests.test_predictive services.tests.test_predictive_sector_refresh services.tests.test_predictive_sector_policy -v
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/sector_policy_experiment_20261020/verify.py
```

Tests cover actual-calendar dependencies, future-value isolation, signed/null
semantics, selection/fallback/common keys, registration drift and overwrite
refusal, plus physically frozen choices before retrospective scoring. No app
build/UI test, cloud query/write, future forecast or activation was needed.

## Local sector-policy input preservation — 20 October 2026

[Step 4 preservation](../outputs/sector_policy_input_freeze_20261020/README.md)
passes six byte-for-byte copy checks, five original protected hashes, three
retained source hashes, full calendar/scope/type and monthly accounting checks,
and six preserved unavailable observations. An actual second creation attempt
is rejected without changing snapshot bytes. The standalone verification command
passes and only reads local files:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/sector_policy_input_freeze_20261020/freeze_input.py --verify
```

No fresh warehouse query, application build/test, training, new selection or
sector-specific experiment registration is claimed by this input-preservation step.

## Applied margin correction and retention failure — 20 October 2026

The [fresh diagnostic packet](../outputs/margin_preflight_retention_20261020/README.md)
records user-originated UPDATE commits at marts12/11/12/11, 81 intended changes,
zero remaining invalid rates, and a reproduced seven-day historical-read error.
Four live current-source SQL assertions reconcile keys, all 27 defined aggregate
metric/count columns and corrected rates to unchanged fact20 with exact two-way
differences of zero; final histories confirm stable versions. The unchanged live
dashboard validator exits0 after the commits. Original historical all-column
pre/post equality remains **not verified**, not waived or labelled passing.

Local retained-evidence verification passes 75 assertions:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/margin_preflight_retention_20261020/verify.py
```

For an operator Databricks receipt, the standalone
[current verification SQL](../databricks/medshield_project/maintenance/20261020_verify_margin_current.sql)
contains only SELECTs and has already passed live. Check histories before any
later independent execution. Do not rerun the original migration's Phase2;
no remote write, retention change, restore, training or build was performed by
this diagnostic turn. The earlier open-margin result below describes the
pre-update audit and is superseded for current state by this packet.

## Warehouse source and accuracy-readiness recheck — 20 October 2026

From the repository root, recheck the retained fresh SQL/gateway captures with:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/warehouse_accuracy_recheck_20261020/verify.py
```

The [read-only audit and exact commands](../outputs/warehouse_accuracy_recheck_20261020/README.md)
retain 1,524 source/metric/definition assertions and a passing fresh execution of
`node --import tsx scripts/validate-databricks-dashboard.ts` from `backend/`.
The core checks pass while the separate 81 derived-margin cells and forecast-
readiness gates remain open. Local readback verification does not re-query the
cloud, apply the prepared repair, prove notebook bytes or establish future
forecast accuracy. No build or shared-service restart was performed.

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

## Native synthetic backup/restore rehearsal —17 October 2026

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

## Isolated selected-Supabase gateway role matrix —17 October 2026

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

## T09 step5 audit readback and consolidated handoff —17 October 2026

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

## Delivery-area analytics — 2 November 2026

Focused tests: `backend/tests/deliveryAreaReview.test.ts`,
`services/tests/test_delivery_area_stl.py`, and
`frontend/e2e/delivery-area-live.spec.ts`. These cover conservation, common/matched
populations, partial years, paired margin, null/zero, source/candidate failure,
authenticated native exports, keyboard and responsive behavior. The role matrix
includes both new endpoints. [Executed commands and evidence scopes](../outputs/delivery_area_20261102/README.md)
distinguish fixtures, fresh Gold, independent arithmetic and local browser checks.

## System-first study verification — 2 November 2026

The [current evidence packet](../outputs/system_first_20261102/README.md) records
the study-date/filter/export regression, retained-source Decimal reconciliation,
forecast/ABC matrices, synthetic procurement casebook and isolated integrated
browser/gateway checks. It includes exact commands, logs, source hashes, initial
environment failures and recovered runs. Combined frontend/backend types and
frontend lint pass. The read-only configured Gold probe failed; no fresh
authenticated live-source/browser or whole-release acceptance is inferred.
Paper revision remains deferred. Reproduce scoped checks from the packet and
use fresh output destinations to preserve dated historical verification files.

## Current descriptive remediation checks

- `python -m unittest discover -s databricks_updated_2/medshield_project/tests` — canonical
  migrated notebook suite, provenance guard and STL algorithm parity.
- From `backend`: `node --import tsx --test tests/*.test.ts` and
  `node node_modules/typescript/bin/tsc --noEmit`.
- From `frontend`: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- Browser: `node node_modules/@playwright/test/cli.js test e2e/descriptive-live.spec.ts e2e/remediation-layout.spec.ts --workers=1`.
- To run the existing exploratory mobile test, set `MEDSHIELD_QA_MOBILE=true`.
- Publication collection: `node --import tsx scripts/publication-readiness.ts`
  from backend. Two live provenance failures remain until operator deployment.
- STL adapter: `databricks_updated_2/medshield_project/06_sales_stl.py`; local parity is not
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
python -m unittest discover -s databricks_updated_2/medshield_project/tests
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


## Sector contribution visual — 25 October 2026

The overview contribution card now shows a common-zero signed bar chart and net
sales summary, with its full financial table under expandable details. Run from
`frontend/`: `node node_modules/@playwright/test/cli.js test e2e/sector-overview.spec.ts --workers=1`.
The suite checks direction/shared scale, sector inspection, accounting absence,
failure clearing/retry, CSV parity, expandable detail and mobile fit. See
[scoped evidence and fixture previews](../outputs/sector_contribution_visual_20261025/README.md).
These isolated checks do not establish fresh live warehouse reconciliation.


## Overview KPI contents — 25 October 2026

Run from `frontend/`: `node node_modules/@playwright/test/cli.js test e2e/overview-evidence.spec.ts e2e/sector-overview.spec.ts --workers=1`.
Coverage includes latest-year-only all-time growth, open-month exclusion, absent
prior-year matches, nonpositive denominators, buyer-specific amounts, selected
scope notes, coverage counts and desktop/mobile KPI fit. See
[scoped evidence](../outputs/overview_kpi_contents_20261025/README.md); isolated
fixtures do not establish fresh authenticated live-source validation.

## Silent accessibility verification — 1 November 2026

[Fresh existing-session browser/keyboard evidence](../outputs/final_qa_focus_paths_20261031/SILENT_VERIFICATION_20261101.md) records nine navigation activations, seven measured research scroll regions, blank Planning/validation, desktop/drawer Help and settled ledger filter/revisit checks. Types, focused lint, nine navigation and four Planning fixture cases plus isolated Help pass. Intermediate source-recheck busy state remains NOT VERIFIED; requested/actual viewport sizes differ. No new spoken, full device, role or hosted acceptance claim. Adrian requests silent verification without reader setup.

## Dashboard layout audit — 7 November 2026

Run `frontend/e2e/ui-simplification-audit.spec.ts` with the documented
environment-only test account. Use `MEDSHIELD_AUDIT_OUT` to retain the
desktop and phone results. Budget enforcement also requires
`MEDSHIELD_AUDIT_ENFORCE=1` and `MEDSHIELD_AUDIT_BASELINE` pointing to
the corresponding before-change live audit. A fixture result cannot
substitute for that baseline.

The manual authenticated audit found one initial chart on Overview,
Forecast and Products. Desktop height samples were 2,072 px on Overview,
1,924 px on Forecast and 2,551 px on Products. These exceed the design
targets. The browser review confirmed keyboard switching between Forecast
studies and keyboard access to Products commercial review. Full live
budget enforcement and before/after word-count parity remain open.

`e2e/helpers/dashboard-harness.ts` runs the real dashboard runtime with
synthetic gateway responses, which needs no sign-in. Unknown gateway paths
answer 503, as in an outage. `e2e/ui-simplification-structure.spec.ts` uses
it for page order and disclosure checks. Set `MEDSHIELD_AUDIT_MODE=fixture`
to run the audit on it while developing layout. Fixture heights are not
evidence for the live budgets, and a fixture run refuses to enforce them.

Live and fixture results are in the
[verification packet](../outputs/ui_simplification_20261107/README.md).
The live visual, accessibility and system suites passed 14 of 14 on the
final code. The enforced audit fails on 9 recorded target misses.
`e2e/ui-value-sample.spec.ts` records displayed values so two versions can
be compared; set `MEDSHIELD_SAMPLE_OUT`. Its 12 samples matched `36aa42b`.

The final fixture suite recorded 212 passed, 5 skipped and 37 failed across
42 spec files. All 37 are outside
this change: 27 also fail on an export of `36aa42b`, 9 need
retained evidence files absent from this checkout, and 1 compares against a
frozen hub copy that already differed from `36aa42b`.

Of the 33 contract scripts, 26 pass. Five of those need their documented
fixture path or tsx loader. Six cannot run without retained evidence. The
`source-recheck` contract and `qa-remediation-live.spec.ts:33` still expect
wording already removed at `36aa42b`, and their owner should update them.
