# Backend QA — 9 October 2026, Asia/Manila

Backend acceptance needs fixes. The existing runtime suite passes, but fresh boundary probes expose missing values converted into observed zeros and incorrect SQL text escaping. No product files, accounts, cloud data, warehouse contracts, migrations, provider refreshes, or release settings were changed by this review.

## Assignment and evidence identity

- Supporting role: QA Engineer; accountable whole-system owner: root Orchestrator.
- Allowed writes: `outputs/system_qa_20261009/backend/` only.
- Checked Git HEAD: `cc03b4c05398880b18987eca5ca9c1e140bf9dcb`, with existing dirty backend changes preserved.
- `checked-backend.patch` binds the inspected backend diff; SHA-256 `00B3782608570CE8DFC71A13250D3FC7DAF455FFD5BE472B6C6772BAD2163826`. `source-hashes.json` binds all checked backend source files. The Git commit alone does not identify this dirty working tree.
- Node: v22.14.0, Windows PowerShell. Fixtures execute the actual gateway/modules with controlled inputs. Local HTTP probes use port 5107, deliberately disabled Databricks/Supabase credentials, in-memory development sessions, an output-only audit path, and an outgoing-network denial guard. No local account file is read or written by the probes. Root owns the configured gateway on port 5000.
- Four fresh live Databricks queries are scalar `SELECT` literal checks only. They read no tables and perform no data writes. Dataset/model identity is inapplicable to these scalar checks.
- State: assessment → planned verification → execution → evidence handoff complete. Backend release acceptance remains needs-fix.

## Checks

| Check | Fresh result | Evidence |
|---|---|---|
| All 21 backend test files | 89 passed; 0 failed/skipped | `unit-tests.log` |
| Runtime TypeScript noEmit | Passed | `tsc.log` (empty successful compiler output) |
| All operational scripts TypeScript noEmit | Failed: 4 TS2339 errors | `scripts-tsc.log` |
| Actual gateway HTTP fixture | 82/92 expected statuses matched; 10 deviations | `local-api-probe.json`, `.log`, `.cjs` |
| Missing-measure preservation fixture | 1/17 passed; 16 failures | `null-measure-probe.json`, `.log`, `.cjs` |
| Actual migration recovery script fixture | Documented recovery fails, exit 1; 2 GETs and 0 writes | `auth-recovery-probe.json`, `.log`, `.cjs` |
| Live SQL literal fidelity | 1/4 passed; 2 transformed strings, 1 parse failure | `sql-literal-live-probe.json`, `.log`, `.cjs` |
| Compose/auth configuration | Production image rejects Compose false fallback; fact pin absent from Compose | `compose-auth-probe.json`, `.log`, `.cjs` |

Commands executed:

```powershell
# From backend
node --import tsx --test tests/*.test.ts
node node_modules/typescript/bin/tsc --noEmit
$qaScripts = Get-ChildItem scripts -Filter *.ts | ForEach-Object { $_.FullName }
node node_modules/typescript/bin/tsc --noEmit --target es2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck @qaScripts

# From repository root
node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261009/backend/local-api-probe.cjs
node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261009/backend/null-measure-probe.cjs
node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261009/backend/auth-recovery-probe.cjs
node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261009/backend/sql-literal-live-probe.cjs
node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261009/backend/compose-auth-probe.cjs
```

The local API fixture verifies anonymous denial across 32 protected GET routes and 7 POST routes, invalid sessions, all four local role identities, forced-password-reset restrictions, weather/admin/audit role denial, durable output-only audit write/read, disabled browser upload, malformed recognized filters, blocked legacy routes, source unavailability, and logout/revocation. No outgoing network call was attempted. The 10 deviations are 2 authentication-order cases, 7 missing-config status cases, and 1 CORS response case; these are not 10 independent defects.

## Findings and actionable handoff

### B01 — P1: Missing analytical measurements become observed zeros

Locations: `backend/src/databricksDashboard.ts:92`, raw ledger mapping at `:583`, summary averages at `:661`, area mapping at `:351`, and year mapping at `:401`.

Trigger: an accepted dimension-only record has no source quantity, price, cost, discount, net sales, acquisition cost, gross margin, or margin percentage. SQL aggregates with no eligible measure also return NULL. Expected: preserve null/unavailable; genuine observed zero remains zero. Actual: `numberValue` calls `Number(null)`, which returns 0. The active `/api/sales/transactions` response turns all nine raw numeric fields into zero, `/api/sales/summary` turns three NULL averages into zero, and `/api/by_area` plus `/api/year_summary` turn NULL revenue/profit into zero. Monthly revenue correctly stays null in the same fixture. Sixteen of seventeen independently defined checks fail.

Impact: ledger/source detail and selected-scope aggregates can imply observed free/zero-valued transactions or zero sales where measures were never recorded. Separate `eligible_revenue`/`eligible_income` remain null, so consumers can receive contradictory raw and eligible evidence. The deprecated snapshot `top_products` mapping has the same default, but `/api/products` now uses catalog outputs; this review does not claim the old product mapping is the active product API.

Reproduction: run `null-measure-probe.cjs`; inspect `expectations`, original fixture SQL response and `ledger_row` in its JSON. Tolerance: exact null preservation, no numerical rounding tolerance.

Fix owner: Backend Engineer, with Frontend Engineer and Data Analyst regression review. Use nullable numeric conversion for measures and averages; default counts only where zero is semantically valid. Include eligible-observation counts and ensure zero-measure observations, all-ineligible groups, and empty scopes remain distinguishable. Verify API/table/detail/export semantics. Root supplied a separate live prevalence handoff of 880 missing net-sales values, 835 missing unit prices, 137 missing margins and 11 missing quantities; those counts are not executed by this child and must be bound to root's source receipt before publication.

### B02 — P2: SQL string construction changes user text and can produce invalid SQL

Location: `backend/src/databricksDashboard.ts:119`, particularly `:124`; ledger search applies it at `:509`.

Expected: filter text preserves apostrophes and backslashes. Actual, verified in the live Databricks SQL parser using scalar SELECTs: input `O'BRIEN` constructed as `'O''BRIEN'` returns `OBRIEN`; input `A\B` returns `AB`; input `A\'B` fails with `PARSE_SYNTAX_ERROR`. Plain text passes. This is a demonstrated fidelity/parsing defect, not a demonstrated SQL injection or privilege escalation.

Impact: valid labels/search terms containing these characters can silently select the wrong population or fail with an analytical-source error. The helper is also used for other user/source text, so remediation must cover its callers.

Reproduction: inspect the four input/statement/expected/actual records in `sql-literal-live-probe.json`; the script issues SELECT literals only. Fix owner: Backend Engineer with Security Engineer review. Send filter values through named statement parameters, following the existing diagnostic path; where a literal is necessary, apply the existing byte-preserving `databricksLiteral` helper. Add regression assertions for quotes and backslashes with the actual Spark/Databricks parser. Broader injection impact remains not verified.

### B03 — P2: Deleted Auth users cannot recover through the documented migration rerun

Locations: `docs/SUPABASE_AUTH_MIGRATION.md:49`; `backend/scripts/migrate-auth-accounts.ts:139` and `:194`.

Trigger: a successful migration clears the legacy password hash, then the linked Supabase Auth user is deleted and the account link becomes NULL. Expected according to the recovery runbook: rerunning `auth:migrate` restores the user/link/password/reset state. Actual: the real script exits 1 with “has no Auth user or legacy password hash to import” before any write. It has no password hash to import because successful migration deliberately cleared it.

Reproduction: run `auth-recovery-probe.cjs`; its mock represents a successfully migrated account after deletion. It performs only two controlled GETs. Fix owner: Backend Engineer/Security Engineer/Technical Writer. Provide a reviewed administrator recovery path using fresh credentials or an appropriate reset flow, then update the runbook and fixture. Do not retain historical password hashes to make this obsolete recovery claim true.

### B04 — P2: Unconfigured Databricks returns a query-failure status

Locations: `backend/src/databricksDashboard.ts:194`, `:524`; `backend/src/server.ts:314`.

Expected from `docs/API.md`: missing Databricks configuration returns 503. Actual: `/api/summary`, `/api/monthly?year=2035`, `/api/sales/status`, `/api/sales/heatmap`, `/api/sales/sectors`, `/api/sales/transactions`, and `/api/sales/summary` return 502 `DATABRICKS_QUERY_FAILED`. Missing configuration/release lookup occurs outside the query function's conversion to `DatabricksSourceUnavailableError`. Administrator integration status correctly returns 503.

All affected calls still fail explicitly and return no analytical fallback. This is status/error classification drift, not fabricated analytical availability. Reproduction: inspect the seven cases in `local-api-probe.json`. Fix owner: Backend Engineer; explicitly classify absent configuration and release-source readiness before querying, and retain the existing fail-closed response.

### B05 — P2: Repeated/structured query validation precedes authentication

Location: `backend/src/server.ts:108`.

Expected from the monthly API contract: authenticate before validating supplied year values. Actual anonymous `GET /api/monthly?year=2025&year=2024` and `GET /api/monthly?year[value]=2025` return 400 `INVALID_QUERY_PARAMETER`; an anonymous scalar malformed year returns 401 as expected. The global scalar middleware executes before route authentication. No analytical data is disclosed by the reproduced cases.

Reproduction: first two failed cases in `local-api-probe.json`. Fix owner: Backend Engineer; authenticate protected routes before scalar validation, retaining separate public health/auth-entry behavior. Add request-level order assertions rather than testing the year parser alone.

### B06 — P2: Operational validation scripts do not typecheck

Locations: `backend/scripts/validate-databricks-dashboard.ts:47`, `backend/scripts/validate-descriptive.ts:36` and `:51`.

Actual all-script noEmit compilation produces four TS2339 errors: `sector` and three uses of `period` are absent from inferred mapped return types. Runtime object spreads retain these fields, so this is a declaration/inference defect; it does not demonstrate missing runtime data. Normal `tsconfig.json` excludes scripts and passes.

Root separately executed the dashboard validator and observed a stale assertion requiring 3/6/12 forecast views for `sector=Unknown`, where the current scope contract correctly returns blocked/empty views. Parent evidence: `outputs/system_qa_20261009/dashboard-validator.log`. This validator failure belongs to verification tooling, not a proven current gateway forecast defect.

Fix owner: Backend Engineer/QA Engineer; define explicit sector/STL response types and update validator assertions to the current supported company scope and blocked-scope contract. Reconcile count assertions to a bound dataset receipt instead of treating old fixed counts as general multi-year acceptance.

### B07 — P2 deployment risk: Compose drops the explicit fact-version pin

Locations: `docker-compose.yml:6` environment block; `backend/src/databricksDashboard.ts:173` and `:175`.

Observation: Compose does not pass `DATABRICKS_DESCRIPTIVE_FACT_VERSION`. The runtime without that variable resolves the latest fact Delta history and pins that version for the process. A pin configured only in the host/backend environment therefore is not preserved by this container configuration. This is a static configuration/control gap, not evidence that a deployed container served an unapproved release.

Fix owner: DevOps Engineer/Backend Engineer; pass the explicitly selected candidate version and bind deployment validation to its dataset/policy/mapping identity. Perform activation/restart/rollback checks against the documented release process. Docker deployment was not executed here.

### B08 — P3 configuration mismatch: Compose auth fallback conflicts with production image

Locations: `docker-compose.yml:8`, `backend/Dockerfile:15`, `backend/src/authConfiguration.ts:16`.

The Compose fallback is `USE_SUPABASE=false`; the image sets `NODE_ENV=production`. The pure existing resolver rejects that combination with `AUTH_CONFIGURATION_INVALID`, even if Supabase URL/key are supplied. Current `.env.example` is `USE_SUPABASE=true`; copying and supplying that setting avoids this fallback mismatch. No actual Docker startup is claimed.

Fix owner: DevOps Engineer; align production Compose defaults with required Supabase auth and document a separate intentional development override where local sessions are desired.

### B09 — P3: Rejected CORS origin uses the default HTML error response

Location: `backend/src/server.ts:101`.

The fixture's denied-origin request receives HTTP 500 HTML, with a development stack trace, instead of the QA-selected 403 JSON expectation. The expected 403 is a practical boundary expectation, not an explicit status in the documented API table. The origin remains denied and the development-only stack is not asserted to be visible in production. Fix owner: Backend Engineer; map the CORS denial into a bounded consistent client-error JSON response if that becomes the agreed contract.

## Skills applied and review limits

- `.skills/testing-standards.md`: isolated unit/boundary checks, explicit expected outcomes, fresh vs inherited evidence, no disruptive cloud failure injection.
- `.skills/backend-standards.md`: runtime source boundary, validation/error taxonomy, operational-script coverage.
- `.skills/security-standards.md`: selected auth mode, denied/allowed roles, secret isolation, protected writes, credential-safe evidence.
- `.skills/analytics-frameworks.md`: independent NULL/zero oracle, observation eligibility, units and evidence status; `docs/BUSINESS_DEFINITIONS.md` supplies the expectation.
- `.skills/coding-standards.md` and `.skills/technology-stack.md`: evidence fixture/report self-review, existing runtime/dependencies and canonical TypeScript/Databricks boundaries; these supplementary documents were read during handoff preparation.
- Canonical guidance inspected: API, SECURITY, TESTING, SETUP, DECISIONS, ARCHITECTURE, BUSINESS_DEFINITIONS, and SUPABASE_AUTH_MIGRATION.

Self-review for this backend assignment; actual parent/other-worker evidence is labeled separately. Fixture passes do not prove live Supabase revocation, distributed audit persistence, real provider refresh/readback, cloud migrations, deployed Docker behavior, approved models or business publication. Root owns live browser/API checks and overall release/data identity. Database and frontend workers own their assigned boundaries.

Further review should include bounded Supabase identity requests: `supabaseIdentity.ts:61` and `:75` have no explicit AbortSignal timeout, unlike audit DB fetches. This is a static resilience observation, not a simulated hanging-service result. No benchmark/load test or arbitrary injection probe was performed.

An additional security probe was blocked by automatic safety review, as reported by the root owner. It was not retried. Only the benign scalar SELECT text-fidelity evidence is included; injection impact remains unverified.
