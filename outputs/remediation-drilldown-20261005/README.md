# MedShield drill-down and QA remediation

5 October 2026, Asia/Manila. Accountable role: Orchestrator. User request: add chart drill-down and root-cause investigation, fix the P1/P2 findings from the system QA, and repair the three stale browser tests. Existing unrelated working-tree changes were preserved. Source implementation, focused QA and independent review are delivered; external acceptance remains explicitly unverified below.

## Delivered behavior

- **Sales Diagnostics → Change investigation** opens from observed sales/growth/movement, overview calendar/scatter, canonical product, buyer/region, and STL residual selections. Accessible table controls also open evidence. Estimated chart points stay outside transaction drill-down.
- Exact custom dates, rolling-window boundaries, canonical product/category, source area, approved territory/region and buyer sector are retained in investigations and matching current/prior transaction requests, including summary and pagination.
- Complete signed contribution partitions reconcile to the matched eligible change. Negative offsets, missing company months, subgroup absence, partial periods, unavailable percentages and overlapping multi-year windows remain explicit.
- The full ledger shows real record/file/row lineage. Source changes block chart→investigation and investigation→ledger evidence. Stale requests and failed loads cannot leave old transaction/summary values under new filters.
- Root-cause review lists hypotheses, required documents/joins and unverified investigation notes. JSON export includes all groups, release identity, coverage, eligibility and notes. Sales arithmetic alone does not establish an underlying business cause.

See [implementation contract](../../docs/DRILLDOWN_DIAGNOSTICS.md).

## Defect disposition

| Original finding | Source remediation | Evidence / remaining dependency |
|---|---|---|
| QA-01 P1 production auth fallback | Configured Supabase is required in production; only the selected auth mode validates tokens; local accounts/sessions require explicit development mode | Auth configuration tests; live gateway reports Supabase auth, anonymous diagnostics denied |
| QA-02 P2 deferred-load retry | Explicit success outcomes, pending deduplication, cache only successful loads, reset generation guards | Recovery browser tests |
| QA-03 P2 audit false success | Flushed serialized local writes; exhausted remote/local persistence returns 503; side-effect routes disclose completed actions | Audit persistence/failure tests |
| QA-04 P2 remote chain predecessor/concurrency | Atomic remote append RPC with durable checkpoint lock/idempotency; local append serialization | Module concurrency/restart tests; real PostgreSQL execution not verified |
| QA-05 P2 year provenance | Observed source years support 2017–9999; current-year estimate option is separate | Browser provenance regression |
| QA-06 P2 cookie session | API calls use canonical cookie/storage token retrieval | Cookie-restored GET/POST and logout regression |
| QA-07 P2 legacy year ceilings | Arbitrary later input years; snapshots exclude future actual deliveries by Manila date; planning uses latest closed month; incompatible undated snapshots fail visibly | 101 service tests |
| QA-09 P2 audit schema/read mismatch | [Migration 016](../../supabase/migrations/016_durable_audit_chain.sql), remote RPC writer and discoverable merged local fallback | Source/module checks pass; migration has not been applied |
| Three stale isolated browser failures | Scope checked in authoritative controls/notes, full 12-month axis and null gaps, positive-sales/returns reconciliation retained | All affected specs pass in the main regression run |

QA-08's P3 hardcoded welcome greeting was outside the requested P1/P2 remediation and remains unchanged. The live STL caption assertion was also updated while retaining 72-row export/reconstruction checks; live execution is unverified.

Independent review additionally found and repaired wrong diagnostic 502 input errors, false row-number lineage, widened rolling windows under yearly grain, estimate drill-down, stale ledger values, lost notes and missing release propagation in the effective legacy runtime setter.

## Executed validation

| Check | Result | Evidence |
|---|---|---|
| Backend full suite | 63 passed, no failures | [backend-tests.log](backend-tests.log) |
| Python service full suite | 101 passed, no failures | [python-services-final.log](python-services-final.log) |
| Isolated browser regression | 65 passed; 4 explicitly superseded legacy cases skipped | [browser-regression.log](browser-regression.log) |
| New drill-down browser suite | 12 passed; exact scopes, source identity, signed partitions, retry, export, ledger and desktop/mobile | [diagnostic-browser-delivery.log](diagnostic-browser-delivery.log) |
| Frontend/backend TypeScript | Passed | Frontend build/type log and independently executed backend no-emit checks |
| Frontend lint | Passed with no warnings/errors | [frontend-lint-final.log](frontend-lint-final.log) |
| Production frontend build | Passed | [frontend-build-final.log](frontend-build-final.log) |
| Local HTTP smoke | Health 200; frontend 200; unauthenticated diagnostics 401; final processes listening | [local-smoke-final.json](local-smoke-final.json), [anonymous check](local-smoke.json) |
| Authenticated invalid API inputs | 8/8 returned expected 400 | [live-boundary-check.json](live-boundary-check.json) |
| Visual QA | Desktop 1440px and mobile 375px inspected; no page overflow, evidence table scrolls | New browser suite PNG attachments |
| Diff whitespace | Passed; existing LF/CRLF notices only | `git diff --check` |

Browser fixtures are deterministic test inputs; no fixture, saved report or local analytical fallback was installed in the running dashboard. The broad browser and new drill-down runs are separate suites: 77 unique passing browser checks in total. Earlier failed logs remain for traceability; final evidence supersedes them.

After consolidating chart cleanup to satisfy TypeScript's closure narrowing, the final production build passed and the four affected source-error/retry/layout checks were rerun successfully: [final focused log](diagnostic-final-errors-layout.log). These repeated checks are not added to the unique pass count.

## Operational limits and next acceptance

- Latest metadata probe: configured Databricks warehouse HTTP 200, state **STOPPING**. No start/stop, SQL execution, analytical writes or publication performed by that probe. Live diagnostic query correctness, candidate reconciliation and authenticated live page flows remain unverified. A functioning RUNNING warehouse with execution access is required.
- Audit migration 016 was not applied or executed. No local PostgreSQL binary/available Docker daemon was found. PostgreSQL role permissions, transaction concurrency and PostgREST RPC execution require verification before deployment. Local fallback remains truthful/discoverable; configure one durable `MEDSHIELD_AUDIT_LOG_PATH` per gateway process.
- No cloud deployment, release activation, business approval or procurement action occurred. Underlying causes remain unverified until linked supporting evidence is reviewed.

Local backend/frontend processes were restarted with the implementation; current process IDs are in [local-services.json](local-services.json). Refresh the browser to load the latest build. Runtime analytical data still depends on Databricks availability.
