# Backend re-QA — 10 October 2026, Asia/Manila

The backend null-measure and SQL text-fidelity repairs pass fresh checks. The explicit Compose fact pin is also repaired at configuration level. Backend acceptance still needs work: the all-script compiler has one remaining error, the documented Auth recovery still fails, HTTP boundary drift persists, and the production dependency audit remains nonzero.

## Assignment and identity

Supporting QA Engineer under the root Orchestrator. Allowed writes are this evidence directory only. No product repair, cloud data write, account mutation, migration, model publication, provider refresh, or warehouse persistence was performed. Root owns the configured gateway on port 5000 and fresh live aggregate/publication review. This worker's isolated gateway used port 5107 and exited after its probes.

Checked HEAD is `cc03b4c05398880b18987eca5ca9c1e140bf9dcb`, with the current dirty working tree preserved. `checked-backend.patch` binds tracked backend/Compose changes; SHA-256 is `EAE43A505E47CE037A35BD67695D0EB80160441DB12D9CDEF66887E4E938C922`. `source-hashes.json` binds backend source, scripts, tests, package manifests and affected instructions/contracts, including new files absent from a tracked diff. Node v22.14.0, Windows PowerShell; UTC timestamps in JSON correspond to Asia/Manila UTC+8. Latest docs identify fact 20; local fixtures deliberately use fact 91 and synthetic identities, which are not live data evidence.

Plan executed: read current role/skills and affected contracts; bind the dirty snapshot; run the full backend suite and compiler checks; rerun bounded prior probes in a new output directory; inspect candidate persistence; inspect dependency audit; map earlier findings to current evidence. The 9 October packet was not overwritten.

## Fresh verification

| Check | Result | Evidence |
|---|---|---|
| All 25 backend test files | **102/102 pass**, no failures or skips | `unit-tests.log` |
| Runtime TypeScript noEmit | Pass | `tsc.log` |
| All operational scripts TypeScript noEmit | **Fail: one TS2339** | `scripts-tsc.log` |
| Candidate persistence contract/scripts, strict TypeScript | Pass | `candidate-scripts-tsc.log` |
| Actual isolated HTTP gateway | **82/92 status expectations match**; same 10 prior deviations | `local-api-probe.json` |
| Actual gateway NULL preservation | **26/26 pass** | `null-measure-probe.json` |
| Live scalar SQL text fidelity through current `sqlString` | **5/5 pass** | `sql-literal-live-probe.json` |
| Deleted-Auth-user recovery script fixture | **Fail**, expected script exit 1; 2 fixture GETs, 0 writes | `auth-recovery-probe.json` |
| Compose/auth pure configuration | Explicit pin present; false-auth production fallback still rejected | `compose-auth-probe.json` |
| Production npm audit | Exit 1; **5 affected package nodes**, 1 critical and 4 moderate | `dependency-audit.json` |

The HTTP probe exercises anonymous/invalid session denial, local role identity, forced-password-reset denial, weather/admin/audit role boundaries, an output-only durable local audit event, disabled browser upload, invalid filters, source unavailability, legacy endpoint blocking and logout/revocation. It attempted zero outgoing network calls. The NULL probe independently expects NULL whenever a fixture has no observed measure, adds summary sums and summary totals to the 9 October checks, and confirms exact null preservation. Existing newly added `descriptive-null-contract.test.ts` additionally verifies actual zeros remain zero and mixed partial totals conserve known measures.

Five live Databricks scalar SELECTs preserve ordinary text, apostrophe, backslash, combined backslash/apostrophe, and real Unicode/currency/wildcard text. These queries read no tables and write no data. No exploit payload or injection-impact test was run; none is needed to establish the text-fidelity repair.

## Prior finding status

| Prior finding | Current status | Evidence and practical limit |
|---|---|---|
| **QA-02** missing measures became zero | **Fixed in backend checked scope** | Raw ledger fields, summary sums/averages/totals, year and area fields all preserve NULL; 26/26 independent checks pass. Actual-zero and partial-total controls pass the full suite. Root/frontend own current live UI/export verification. |
| **QA-04** SQL text changed or failed parsing | **Fixed in backend checked scope** | Current exported `sqlString` uses byte-preserving `databricksLiteral`; 5/5 live scalar round trips pass, and filter-validation regressions pass. Broader injection impact remains not verified and no exploit probe was attempted. |
| **QA-09** verification tooling drift | **Partly fixed; still open** | The three STL `period` compiler errors are repaired. One sector inference TS2339 remains in the all-script check. Current dashboard validator still requests explicit Unknown and requires forecast horizons, contrary to the supported company All scope. Frontend fixture status is owned by the frontend worker. |
| **QA-10** Compose omitted fact pin | **Fixed at configuration level** | Compose now requires and forwards `DATABRICKS_DESCRIPTIVE_FACT_VERSION`, with matching deployment documentation. Actual container startup/restart/rollback is not verified here. |
| **QA-11** documented Auth recovery cannot work | **Still open** | Current runbook still promises migration rerun after linked Auth deletion; actual script still rejects the no-user/no-hash state. Zero fixture writes. |
| **QA-12** HTTP ordering/status drift | **Still open** | Same two authentication-order deviations, seven missing-Databricks configuration status deviations and one informational CORS response deviation. No unauthenticated data exposure or analytical fallback was observed. |

No new backend runtime defect was substantiated by the changed candidate-persistence review. A pass here does not approve candidate data/model publication.

## Remaining defects and owners

**QA-09 — P2 verification tooling.** `backend/scripts/validate-databricks-dashboard.ts:47` reads `row.sector`, which is present at runtime through the row spread but absent from the inferred return type. The all-script compiler reports one TS2339. `getDatabricksSalesSectors` should expose an explicit typed sector field or an accurate response type; runtime absence is not demonstrated. The same validator still calls `getDatabricksForecastValidation({ sector: 'Unknown', metric: 'revenue' })` at line 29, then expects horizons 3/6/12 at line 77; the current forecast contract blocks non-company scope. This latter observation is static in this child run; the earlier live failure is inherited 9 October evidence. Backend/QA owners should fix the type contract and use All for supported-benchmark assertions, with a separate Unknown-blocked check and source-bound expected counts. The ordinary backend compiler excludes scripts, so its pass does not close this finding.

**QA-11 — P2 Auth recovery/runbook.** `docs/SUPABASE_AUTH_MIGRATION.md:49` instructs a migration rerun after deletion, whereas `backend/scripts/migrate-auth-accounts.ts:139` rejects an absent Auth user without a legacy hash; successful migration clears that hash at line 194. The same controlled state freshly reproduces the error. Backend/Security/Technical Writer owners should provide an authorized recovery flow using fresh credentials and verified account ownership, with correct linkage/reset/audit behavior. Retaining obsolete password hashes is not the remedy. No production identity change was attempted.

**QA-12 — P3 HTTP boundary drift.** Global scalar validation at `backend/src/server.ts:108` executes before route authentication: anonymous repeated/structured monthly year requests return 400 instead of documented auth-first 401. Missing Databricks configuration fails release lookup outside query error conversion (`backend/src/databricksDashboard.ts:201`, and `:531` for ledger filters), so seven analytical routes return 502 instead of documented 503. They still return explicit error bodies with no fallback. CORS rejection at `server.ts:101` produces default HTML 500 in development; the probe's chosen 403 JSON expectation is a practical QA expectation rather than an explicit API status promise. Backend owner should align protected middleware ordering and readiness classification, then retain deny/no-fallback regressions.

**Dependency audit — prior QA-01, backend portion still open.** Fresh npm metadata reports five affected nodes: `proxy-addr` critical; `body-parser`, `express`, `ip-address`, and `qs` moderate. The five-node total is not five independent demonstrated exploits. Audit reports fixes available. The critical [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) concerns a trust-subnet configuration; current `server.ts` does not enable `trust proxy`, so this triggering condition was not demonstrated. Backend/Security owners should review compatible patched dependency updates and lockfile changes, then rerun login, denied-role, parsing, audit and no-fallback checks. No dependency upgrade was performed.

**Compose fallback — prior secondary P3 still open.** Compose defaults `USE_SUPABASE` to false but the image sets `NODE_ENV=production`; existing auth configuration correctly rejects that pair. `.env.example` explicitly sets true, so this does not imply the properly configured Supabase path fails. DevOps should align production defaults or document a separate development override. Mandatory fact-pin forwarding is repaired; this remaining fallback mismatch is a different configuration issue.

## Changed candidate persistence review

`backend/scripts/predictive-candidate-contract.ts` validates evaluated-unpublished status, training/reconciliation flags, data/model approval separation, dataset/fact identifiers, model sets, duplicate prediction keys, company/PHP target scope, actual calendar leads, future actual exclusion, origin consistency, code hashes and declared artifact hashes/path restrictions before warehouse access. The four candidate tests pass within the full 102-test suite; focused strict script/test compilation also passes.

`persist-predictive-candidate.ts` uses the full raw-artifact hash for an experiment namespace, `databricksLiteral` for values, insertion-only MERGE keys, bounded batches, and count/payload readback. Its receipt says candidate-persisted-not-published and does not modify a release pointer. This child reviewed source and deterministic validation, but did not execute persistence or prove transaction/recovery behavior against a warehouse. Root owns existing/fresh cloud storage identity review. A count/payload readback is not an independent model-quality calculation or business acceptance.

## Commands and skills applied

From `backend/`:

```powershell
node --import tsx --test tests/*.test.ts
node node_modules/typescript/bin/tsc --noEmit
$qaScripts = Get-ChildItem scripts -Filter *.ts | ForEach-Object { $_.FullName }
node node_modules/typescript/bin/tsc --noEmit --target es2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck @qaScripts
node node_modules/typescript/bin/tsc --noEmit --target es2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict scripts/persist-predictive-candidate.ts scripts/predictive-candidate-contract.ts tests/predictiveCandidate.test.ts
npm audit --omit=dev --json
```

From the repository root, each receipt has its corresponding reproducible `.cjs` script:

```powershell
node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261010/backend/local-api-probe.cjs
node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261010/backend/null-measure-probe.cjs
node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261010/backend/sql-literal-live-probe.cjs
node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261010/backend/auth-recovery-probe.cjs
node --import ./backend/node_modules/tsx/dist/loader.mjs outputs/system_qa_20261010/backend/compose-auth-probe.cjs
```

Skills freshly read and applied: `.skills/testing-standards.md` for independent oracles, fixture/live boundaries and current regression scope; `.skills/backend-standards.md` for source/response contracts and script coverage; `.skills/security-standards.md` for allowed/denied behavior and isolated credentials; `.skills/analytics-frameworks.md` for NULL/zero/eligibility and candidate-vs-approval distinctions. Coding and technology-stack standards were reread for fixture/report and runtime boundary consistency. Current QA role/execution contract and latest API, TESTING, CURRENT_STATE, SECURITY, DEPLOYMENT, and Auth migration guidance were inspected; earlier architecture/decisions context was reused only where current contracts agree.

Self-review for this assignment. Parent and other workers own separate live, database, frontend and numerical evidence; their eventual reports must not be described as this child's execution. Required unverified checks include Docker deployment, live cloud role matrix, Auth recovery writes, distributed audit/RPC writes, provider refreshes, candidate-persistence recovery and load tests. These remain not verified, not passed. The backend evidence handoff is complete; whole-system acceptance is still needs-fix.
