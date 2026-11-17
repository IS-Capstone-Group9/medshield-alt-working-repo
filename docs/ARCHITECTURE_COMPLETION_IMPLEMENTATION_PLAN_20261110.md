# Architecture completion implementation plan — 10 November 2026

**Status: Plan.** Nothing here is implemented, run or approved. [Current State](CURRENT_STATE.md) owns actual status; [Decisions](DECISIONS.md) owns accepted choices. Passing a phase's exit test is technical evidence only. It does not grant data, model, client or academic approval.

## Goal

Keep the current runtime boundaries (decisions 001–007) and finish MedShield by:

1. making the documents and test references match the code;
2. connecting the staged intake and versioned warehouse release to dashboard serving, with recovery;
3. adding a period-coverage register and a decision log so the North Star cycle can record decisions and, later, outcomes;
4. recording the open scope decisions and running the prospective forecast protocol from 1–3 December 2026.

Out of scope: hosted deployment (deferred by user direction, 5 November), external regression, SKU/unit forecasting, operational outcome feeds, multi-tenant RLS.

## Fixed constraints

- Next.js calls only the Express gateway. Databricks and Supabase server credentials stay in `backend/`.
- Dashboard measures come from Databricks Gold or gateway calculations on Gold inputs. Supabase holds identity, roles and audit only.
- A failed required source returns an explicit error and the UI clears affected values. No bundled, local, seeded, snapshot or Supabase analytical fallback.
- Python evaluates offline. Reviewed outputs reach the dashboard only through governed Databricks publication.
- `POST /api/sales/upload` keeps returning `409 DATABRICKS_INGESTION_REQUIRED`.
- Candidate labels, dataset identity, policy versions and provenance survive every layer.
- The pinned original itemized Gold (Delta 0, dataset `e87cae…`) stays untouched and remains the rollback target.
- Never run `npm run build` while `next dev` is running. Preserve unrelated working-tree changes.

## Phase overview

| Phase | Outcome | Owner | Depends on | Estimate (person-days) |
|---|---|---|---|---|
| P1 | Documents and test references reconciled; fresh fixture baseline | Technical writer + QA | — | 2–3 |
| P2 | Release pointer revert mode | Database engineer | P1 | 1–2 |
| P3 | Period coverage register | Database + backend engineer | P1 | 2–3 |
| P4 | Live intake acceptance on real data and real roles | Data operator + QA | P2 | 2–3 plus client wait |
| P5 | Gateway binding to the warehouse release (cutover) | Backend + frontend engineer | P3, P4, approvals | 4–6 |
| P6 | Decision log | Backend + frontend engineer | P1 | 3–5 |
| P7 | External as-of and join-readiness registry | Data engineer | P1 | 2–3 |
| P8 | Scope decisions and prospective protocol | Adrian + adviser; model owner | P4 for the November snapshot | 1–2 plus review time |

P2, P3, P6 and P7 can run in parallel after P1. Estimates exclude waiting for approvals or client data.

---

## P1 — Reconcile documents and tests

**Changes**

| File | Change |
|---|---|
| `docs/CURRENT_STATE.md` | Add a dated entry for the 7 November staged intake: Jobs `487013522149255` / `46234348141857`, releases `acc946d4d553ada8`, `ef462b5c6933035d`, `16fbf69189702e7a`, seed `5df98130b9ec13ef`, intake enabled locally, serving unchanged. Rewrite "Current data coverage", "Databricks publication state" and "Gates that remain open" against the pinned Delta 0 source (40,171 rows, 39,286 eligible, ₱638,015,351.53, Jan 2017–Sep 2026, 107/117 months) and `databricks_updated_2/` paths. |
| `docs/ARCHITECTURE.md` | Replace the 37,728-row / 2017–2025 publication-gate line; add the intake schema, warehouse schema and pointer to the data-flow diagram, marked "not yet served". |
| `docs/API.md` | Update the "Source contract" object list to the active itemized binding. |
| `docs/SYSTEM_TESTING_SPECIFICATION.md` | Rebind each ST case to an existing test or mark it Planned: ST-ING-001 → `backend/tests/role-matrix.test.ts`; ST-ANA-003 → `backend/tests/descriptive-products.test.ts`; ST-PRED-002 → `frontend/e2e/external-regression.spec.ts`; ST-PLAN-001 → `frontend/e2e/prescriptive-planning.spec.ts`; ST-ANA-001 / ST-PRED-001 live specs → Planned. Add the test catalogue from section "Test catalogue" below. |
| `databricks_updated_2/README.md` | Change the "not uploaded or executed" line to the live status recorded in CONTROLLED_SALES_INTAKE. |
| `docs/DECISIONS.md` | Renumber the duplicate 011 entries (dashboard one → 011, itemized fact → 013). |
| `docs/SECURITY.md` | Link the pipeline guide to `databricks_updated_2/README.md`. |
| `docs/DOCUMENTATION_INDEX.md` | List this plan under Plans. |

**Exit test**

- Every automated reference in the system test specification resolves to an existing file (scripted link check).
- Clean checkout in CI order passes: `python scripts/restore_test_fixtures.py`; `node --import tsx --test tests/*.test.ts` (backend); both Python `unittest discover` commands; `npm run lint` and `node e2e/dashboard-script-bindings.cjs` (frontend).
- Results recorded with counts in CURRENT_STATE; failures reported as failures.

---

## P2 — Release pointer revert mode

**Why:** `warehouse_runners.py` has no way to move the head back to an earlier release. A bad release can only be fixed by promoting a correcting candidate.

**Design**

- New promote Job mode `revert`, two-step like promotion: `mode=revert_plan` (read-only) writes `promotions/revert_<hash>.json` naming `current_release_id`, `target_release_id` and per-month controls of both; `mode=revert_apply` requires the same hash and `acknowledge_revert=true`.
- The target must be an ancestor in the pointer chain. Release tables are never dropped or rewritten.
- Apply appends a pointer row with `release_id=target`, `previous_release_id=current`, `ingestion_id=REVERT`, the plan hash, actor and timestamp. History stays append-only.
- Keep `max_concurrent_runs=1`.

**Files:** `databricks_updated_2/medshield_project/warehouse_pipeline.py` (pure plan/validation), `warehouse_runners.py` (Spark runner), `intake_promote.py` (mode switch), `jobs/` template, tests in `databricks_updated_2/medshield_project/tests/`. Document in `CONTROLLED_SALES_INTAKE.md` and `DEPLOYMENT.md` → Rollback.

**Exit test**

- Fake-Spark tests: revert to ancestor succeeds; non-ancestor, stale current head, wrong hash and missing acknowledgement are refused with the pointer unchanged; replay is idempotent.
- Live, in the test target only: release A → B → revert to A; the head mart equals A's mart to the cent.

---

## P3 — Period coverage register

**Why:** missing months, observed zero and partial months must be distinguishable everywhere. Today completeness is only an operator assertion.

**Design**

- Table `<catalog>.medshield_warehouse.period_coverage`, one row per `(release_id, scope, period)`; `scope` starts as `company_itemized`.
- Columns: `status` ∈ {`observed`, `attested_zero`, `missing`, `partial`}, `record_count`, `eligible_net` (nullable), `source_last_date`, `attested_by`, `attested_at`, `evidence_ref`.
- Written by promotion: declared months become `observed` or `partial` (partial when the source's last delivery date is before month end); absent months stay `missing`. `attested_zero` only through an explicit attestation parameter with an evidence reference.
- Seeded for `5df98130b9ec13ef` from the pinned baseline: 107 `observed`, the ten known absent months `missing`.
- Gateway reader `backend/src/periodCoverage.ts` returns the register beside monthly data. YoY and growth helpers in `descriptiveMetrics.ts` use it: compare only months observed in both periods, report matched coverage, return null with a reason for a zero or missing denominator.

**Exit test**

- Unit fixture: prior Jan ₱200, Feb ₱100, Mar ₱150; current Jan ₱80, Feb ₱40, Mar missing → matched YoY −60.00% on 2 of 3 months; March null.
- Zero prior-period net → growth unavailable, never Infinity, NaN or 0%.
- Seed register: 107 observed + 10 missing = 117 months; observed net sums to ₱638,015,351.53.
- `GET /api/monthly?year=2031` → `200 []`, no zero-filled series.

---

## P4 — Live intake acceptance

Run the workspace acceptance steps already listed in [CONTROLLED_SALES_INTAKE.md](CONTROLLED_SALES_INTAKE.md#workspace-acceptance), plus the gaps found in review.

| Step | Owner | Evidence |
|---|---|---|
| Workspace admin grants the gateway principal access to the upload Job and volume; recheck the 403 Jobs probe | Workspace admin | Probe result |
| Route-level role denial through the authenticated gateway with real Supabase accounts for each role | QA | Role matrix screenshots and responses |
| One real client export containing a month not in the seed (October 2026 or later): submit, retry identical bytes, plan, apply in the test target | Data operator | Candidate/run IDs, receipts, report hash, plan JSON, SQL readback |
| Malformed file, unmapped product, shrink without acknowledgement, stale base — all refused | Data operator | Refusal messages, unchanged pointer |
| Revert rehearsal from P2 | Data operator | Pointer chain readback |
| Data owner attests seed population, the new month's completeness, and treatment of contract and repeated lines | Data owner / source steward | Signed attestation in `outputs/` |

**Exit test:** source = Silver accepted = Gold candidate = release mart for the new month; identical retry adds zero rows; seed months unchanged; attestation recorded.

**Dependency:** the client supplies a new export through the source steward.

---

## P5 — Gateway cutover to the warehouse release

**Design**

- New release binding profile (for example `warehouse_release_v1`) alongside `original_itemized_v1` in `descriptiveSource.ts` / `originalItemizedSource.ts`. Selected by server-only configuration; default stays the pinned source until the cutover is approved.
- On each read the binding resolves the pointer head once per request context, verifies release tables exist and their controls match the pointer summary, and keys every cache entry by `release_id`.
- Responses carry `release_id`, `previous_release_id`, dataset/policy identity, `candidate_only` and the coverage register.
- Pointer or table failure → explicit 503 with code; no fall back to the pinned source at request time. Rollback is a configuration change back to `original_itemized_v1` or a P2 revert.
- Product, area, diagnostic, research and model readers keep their own pins until separately rebound; the UI states which source each panel uses.
- Data source page shows the active release, its predecessor and freshness (latest closed Manila month minus last observed month).

**Exit test**

- Parity: with the warehouse binding on the seed release, every Overview KPI, monthly series, ledger total and financial CSV equals the pinned-source capture to the cent (`descriptive-release.test.ts`, `financialScope.test.ts`, new `warehouseBinding.test.ts`, live capture).
- After applying the P4 month: new month appears; all earlier months unchanged.
- Pointer table removed in a test target → 503, values cleared in the UI; restored → identical values.
- Config switched back to the pinned profile → original values return.
- Bundle scan finds no server secrets.

**Approvals:** data owner attestation from P4; Adrian approves the cutover as a recorded decision in `DECISIONS.md`. Business/financial release approval remains a separate CEO decision.

---

## P6 — Decision log

**Why:** the North Star cycle ends with "capture the decision and eventual outcome". Nothing records what a reviewer decided after a scenario.

**Design**

- Supabase table in the identity/audit domain (not analytical): `planning_decisions(id, scenario_checksum, shortlist_checksum, release_id, actor_id, role, decision ∈ {adopted, modified, rejected, deferred}, note, created_at)`. Service-role only; written through the gateway; each write also produces an audit event.
- `POST /api/planning/decisions` (analyst, manager, admin) after a solved, acknowledged scenario; `GET` lists the actor's own decisions, admin/manager see all.
- Outcome fields (`outcome_period`, `outcome_ref`) exist but stay empty until real stock/expiry records exist. No outcome is ever derived from sales data.
- UI: after a scenario result, a "Record decision" control. Register any new inline handler in `DASHBOARD_GLOBAL_HANDLERS` and bridge it to `window`.
- Migration under `supabase/migrations/`, applied through the reviewed process.

**Exit test:** decision rejected without a matching solved scenario checksum (400); anonymous 401; disallowed role 403; write produces an audit event; no analytical value is read from this table anywhere (grep check in tests).

---

## P7 — External as-of and join-readiness registry

**Design**

- Table `<catalog>.medshield_gold.external_signal_readiness`: one row per `(source, signal, geography, period)` with `provenance` ∈ {`official`, `provider_proxy`}, `available_at`, `vintage`, `mapping_version`, `join_status` ∈ {`not_reviewed`, `review_candidate`, `approved`}, `reason`.
- `/api/sales/external-regression` reads `join_status`; anything other than `approved` keeps `status: "blocked"` and returns the reason. NASA/Open-Meteo rows can never carry `provenance=official`.

**Exit test:** with no approved rows, Quezon/Dengue/PAGASA returns `blocked` with the stated reason and no coefficients; an `approved` row without `available_at` is rejected by the reader.

---

## P8 — Scope decisions and prospective protocol

| Step | Owner | Output |
|---|---|---|
| Present the D1 error-target wording, D2 target series and the [amendment memo](ADVISER_AMENDMENT_MEMO_20261030.md) | Adrian → adviser | Attributable decision record in `outputs/`, linked from the objective register |
| Review sealed addenda and confirm the November issue disposition | Adrian | Updated scorecard receipt |
| Prepare the controlled November-close snapshot (uses P4 if the new month is promoted) | Adrian + data operator | Pinned snapshot identity |
| Issue sealed forecasts 1–3 December 2026, before outcomes | Model owner | Addenda hash, one-shot guard receipt |
| Extend the versioned calendar for the proposed 12-window cohort | Model owner | Registered calendar version |
| Request the dated order archive | Client via source steward | Archive or recorded unavailability |

**Exit test:** addenda hash timestamped before outcome data; guard passes; decision record exists or is recorded as still pending. Original objective scores change only after an attributable decision.

---

## Test catalogue

Evidence class: **F** fixture, **L** live integration, **H** human acceptance. All are Planned until run.

| ID | Phase | Class | Expected result |
|---|---|---|---|
| ING-01 | P4 | L | Valid file reconciles source → Silver → Gold → release mart; `business_approval` false |
| ING-02 | P4 | L+F | Identical retry: same candidate and run; zero rows added |
| ING-03 | P4 | F | Malformed or ambiguous rows rejected or held with reasons; excluded from Gold totals |
| ING-04 | P4 | L | Stale base, wrong hash, missing acknowledgement, empty declared month refused; pointer unchanged |
| ING-05 | P4 | L+H | Real new month reconciles; data owner attests completeness |
| UPL-01 | P1 | F | Authenticated `POST /api/sales/upload` → 409 `DATABRICKS_INGESTION_REQUIRED` |
| RPT-01 | P5 | L | API, chart, table and CSV agree to the cent for the same scope |
| RPT-02 | P3 | F | Jan–Feb ₱300 vs ₱120 → −60.00%; March null |
| RPT-03 | P3 | F | Future year → `200 []` |
| RPT-04 | P3 | F | Zero denominator → unavailable with reason |
| SEC-01 | P1 | F | Role matrix: anonymous 401, disallowed 403 |
| SEC-02 | P4 | L+H | Real non-Admin roles denied intake in browser and gateway |
| SEC-03 | P5 | F | No server secrets in the production bundle |
| REC-01/02 | P5 | L | Source failure clears values; restoration reconciles to the pre-failure capture |
| REC-04 | P2 | L | Revert returns head to ancestor; marts reconcile |
| FC-01–05 | P8 | F | Rolling-origin metrics reproduce; no leakage; same-case seasonal-naive comparison; coverage and bias reported; candidate labels kept |
| FC-06 | P7 | F+L | Unapproved external join stays `blocked` |
| FC-07 | P8 | L | Prospective forecasts sealed before outcomes |
| PL-01–04 | P6 | F+L | Feasible and infeasible scenarios honour pack, lead time, expiry, supplier and budget; assumptions visible; solve requires acknowledgement |
| DEC-01 | P6 | F | Decision requires a solved scenario checksum; audit event written |
| PL-05 | — | H | Client explains a scenario is not an order (walkthrough A5/A6) |

## Acceptance kinds — kept separate

| Kind | Closed by | Not closed by |
|---|---|---|
| Technical verification | QA running the exit tests above | Discussion, unrun tests |
| Data and model publication | Data owner; CEO for business scope | `PASS_CANDIDATE`, a created release, P5 cutover |
| Client acceptance | Attributable client representative | Admin self-review |
| Academic acceptance | Adviser / panel decision record | Proposed SO1–SO5 credit |
| Business benefit | Measured stock, expiry and fill-rate outcomes | Sales data, scenarios, simulated expiry |

## Risks

| Risk | Mitigation |
|---|---|
| Client export not supplied in time for P4 | P2, P3, P6, P7 proceed; P5 waits; P8 uses the existing September-close data and records the limitation |
| Gateway principal still gets 403 on Jobs | Workspace admin grant is the first P4 step; nothing downstream starts without it |
| Cold reads stay at 64–82 s after cutover | Measure in P5; agree a latency target before any prewarm work |
| Release binding changes numbers silently | P5 parity test on the seed release must pass to the cent before any new month is served |
| Shared working tree edited concurrently | Check `git status` and running tasks before each phase; touch only listed files |
