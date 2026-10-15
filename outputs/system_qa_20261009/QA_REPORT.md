# MedShield full-system QA — 9 October 2026

**Verdict: QA assessment completed; the system does not pass release acceptance.** Historical financial totals, the authenticated desktop walkthrough, and source-outage behavior pass. Confirmed defects remain in missing-value handling, nullable frontend contracts, SQL text handling, clean database bootstrap, and older offline analytical reports. Dependency audits also identify an applicable critical Next.js advisory. No application repairs, dependency upgrades, cloud publication, migrations, model activation, or procurement were performed.

Accountable role: Orchestrator. Separate supporting reviewers assessed backend, frontend, and database. Root performed analytics reconciliation and integrated their evidence. The QA report is complete; failed and unverified product acceptance criteria remain open.

## Scope and evidence identity

Assessed the current dirty working tree at HEAD `cc03b4c05398880b18987eca5ca9c1e140bf9dcb`, rather than HEAD alone. Initial timestamp, status and tracked-diff digest are in [identity.json](identity.json); component manifests/patches retain checked source identity. The final source manifest and change verification accompany this report. Node was 22.14.0; checks ran on Windows with Asia/Manila reporting time. Repository instruction files and existing user changes were preserved.

Runtime boundaries checked: Next.js → Express/TypeScript → Databricks Gold; Supabase identity/audit; offline Python preparation/evaluation. A configured Supabase admin authenticated for the live browser reads. Lower-role denial and outage scenarios used isolated fixtures. SQL and Supabase cloud probes were read-only; ordinary authentication/audit activity was required for the walkthrough. Services started for QA are stopped afterward.

The plan was: inspect instructions, working tree and processes → establish acceptance from canonical definitions → parallel component review → run regression/build checks → reconcile analytics independently → probe realistic failure cases → document defects and remaining gates. Example expectation: a missing acquisition cost remains unavailable while eligible net sales still displays. Failure expectation: a required warehouse outage hides analytical values and does not substitute local data.

Component details and reproduction:

- [Backend review](backend/REPORT.md)
- [Frontend review](frontend/README.md)
- [Database review](database/REPORT.md)
- [Fresh SQL/gateway reconciliation](live-profile.json), [checksum](live-profile.sha256)
- [Independent model metrics and offline analytical probes](analytics-probes.json)

## Acceptance results

| Criterion | Result | Fresh evidence and practical limit |
|---|---|---|
| Gateway regression and compilation | PASS | 89/89 tests; backend TypeScript no-emit passes. Separate script compilation fails; see QA-09. |
| Offline Python logic | PASS for existing suite | 109/109 service tests, 77/77 notebook tests, 3/3 STL tests. Hand-solvable additional probes still find legacy calculation defects. |
| Frontend lint, compilation and production build | PASS | TypeScript, lint and build pass; no frontend development server ran concurrently with build. |
| Browser fixture suite as checked in | FAIL | Original run: 79 pass, 21 fail, 4 skip. Loader/selector drift caused the 21 failures. Evidence-only recovered copies yield 100 distinct passing functional checks plus 4 intentional legacy skips. The unchanged suite is not claimed passing. |
| Authenticated live descriptive/export workflow | PASS | Version 19/policy identity, revenue, weighted margin, 72 STL months, component reconstruction and product CSV signed-sales parity. |
| Live tab/layout walkthrough | PASS in tested configurations | Nine tabs at 1440/926/375px: 27 page-layout observations and screenshots, no recorded runtime errors. Mobile remains exploratory; this does not establish complete accessibility or device certification. |
| Warehouse aggregate reconciliation | PASS | 114 independent SQL/gateway comparisons: count/uniqueness, company/year/month net sales, gross margin, shared denominator, and stable fact version. |
| Missing/zero truthfulness | FAIL | Gateway null-preservation fixture fails 16/17 checks; current warehouse has actual missing values. Frontend nullable product contract also fails. |
| Required source outage/recovery | PASS for tested path | Controlled monthly HTTP 503: unavailable, zero charts and zero visible KPIs; source restoration plus reload returns ready. No invented fallback. |
| Publication readiness | FAIL, known gate | Fresh collector: 75 PASS, 1 FAIL, 0 UNVERIFIED. Local product-master checksum differs from the serving fact's master. No release approval follows from passing technical checks. |
| Model artifact integrity and metric arithmetic | PASS within historical run | Eight stored artifact hashes and 30 model/stage metric groups independently match. This is a fresh recomputation of a version-16 experiment, not fresh model training or version-19 model acceptance. |
| Ordered database bootstrap | FAIL | Unchanged migrations 001–010 execute in isolated PostgreSQL; 011 fails. Later audit checks require an explicitly recorded fixture accommodation. |
| Database access/audit behavior | Partial | 13/15 isolated checks meet expectations; two conditional legacy-view access checks fail. Sampled current cloud anonymous access is denied/not found. Remote audit contract remains absent from the exposed schema cache. |
| Recovery readiness | NOT VERIFIED | All 29 captured Delta dependency versions and older facts 16/17/18 are presently readable. A full recovery rehearsal was not performed. |
| Deployment/runtime dependency health | FAIL / partial | Both production npm audits fail. Compose configuration validates; Docker daemon is unavailable, so container builds/startup are unverified. Global Python pip check fails for unrelated missing notebook dependencies. |

Existing unit suites total **278 passing tests**. Keep that count separate from browser tests, SQL comparisons, permission probes and advisory results; they are different evidence populations.

## Analytics assessment

Fresh serving identity: fact Delta **19**, policy `sales_restart_gold_v7_independent_catalog`, dataset `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`. All independently counted source records are unique.

| Measure/evidence | Observed result | Interpretation |
|---|---:|---|
| Accepted reporting records | 37,728 | Eligible population agrees with gateway transaction totals. |
| Eligible net sales | ₱626,946,741.81 | Signed adjustments retained. |
| Eligible gross margin amount | ₱288,487,498.72 | Before operating expenses; not company net profit. |
| Margin-eligible revenue basis | ₱478,720,670.03 | Shared numerator/denominator population; 76.35747% of eligible revenue. |
| Weighted margin | 60.262177% | Recomputed as eligible margin / eligible margin revenue. |
| Negative sales adjustments | −₱1,622,699.58 | Financial adjustments, not verified physical returned inventory. |
| Adjusted-source net sales | ₱299,249,415.55; 47.731234% | File-level estimated/allocation provenance, not independently verified item demand. |
| Monthly observations | 98/108 | Ten missing months remain null in the monthly contract. Activity is not proof of complete reporting. |
| STL | 72 months, January 2020–December 2025 | Matching warehouse identity and component reconstruction; company revenue, not territory/SKU unit demand. |
| Approved sellable identities / forecast-eligible rows | 0 / 0 | A reporting-category decision does not approve unit conversions or quantity forecasts. |
| Served catalog | 4,561 labels, all Unclassified/needs_review | The accepted local categories have not been deployed. |
| External joins | 1,787 disease and 384 weather rows; zero join/forecast-ready | Context candidates remain blocked for forecasting. |
| Active model release pointers | 0 | No approved forecast is served. |

Missing canonical source fields are present in the current warehouse: **11 quantities, 835 unit selling prices, 880 net-sales values, and 137 gross-margin amounts**. Another 2,743 records have eligible sales without eligible gross margin. This makes QA-02 a real data-contract concern, although every affected row was not individually traced through the live ledger.

The current local category master passes a fresh local verifier: both copies identical, 4,561 accepted reporting dispositions, hash `2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29`; all noncategory values preserved. It uses inherited fact-19 label evidence and is not a fresh replacement cloud run. The served master is different, explaining the publication-readiness failure. [Collector log](publication-readiness.log), [fresh receipt](../publication_readiness/2026-10-09T02-10-40-822Z/evidence.json), [local category verification](category-independent.log).

For the historical 15-configuration experiment, all 30 development/audit metric groups match independent arithmetic. The selected last-value benchmark has retrospective-audit **WAPE 37.763644%, MAE ₱5,834,383.00, RMSE ₱6,956,031.72**, and overprediction bias ₱1,295,235.42. Selection remains development-only; no challenger satisfies the frozen promotion rules. Its development WAPE is approximately 83.20%. The input was version 16, policy v6; all 98 nonmissing monthly target values still match version 19 within half a cent ([finance-only parity](historical-input-parity.json)). This equality does not renew catalog identity, data/model approval, coverage attestation or historical feature availability. No supported intervals or current operational SKU-demand accuracy were established.

The source-bound weather benchmark was also independently recomputed from its historical station/provider caches: 12 metric populations match. This does not establish future forecast accuracy or approve disease/weather joins. [Fresh recomputation log](weather-independent.log).

## Prioritized findings and repair acceptance

P1 = address before release/use of the affected capability. P2 = reproducible correctness, deployment or verification defect requiring repair. Advisory severity and application applicability are stated separately.

### QA-01 — P1: production dependencies include critical advisories

Installed Next.js **14.2.35** falls in the maintainer's affected Windows-hosted Pages/App Router range, matching this QA host. The maintainer reports no workaround and patched versions 15.5.24/16.3.3. This is a verified affected-version/configuration finding; exploitation was not attempted. [Maintainer Windows advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36).

Frontend production audit reports four affected package nodes: Next critical; nanoid, postcss and source-map-js high. An additional Next AVIF image-optimizer advisory is conditional on the affected optimization path, which was not exercised. [Maintainer AVIF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4).

Backend audit reports five affected package nodes: one critical proxy-addr and four moderate nodes. The critical proxy advisory requires a particular trusted-proxy subnet configuration; current server source does not enable `trust proxy`, so that trigger is not demonstrated. Do not equate audit package counts with independent exploitable vulnerabilities. [Proxy maintainer advisory](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h).

Owner: Frontend/Backend Engineers with Security review. Upgrade to compatible supported patched dependencies, inspect lockfile changes, and rerun build, login/middleware, chart/export, fail-closed and dependency checks. Avoid an unreviewed forced major upgrade. Evidence: [frontend audit](frontend/npm-audit-production.json), [backend audit](backend/dependency-audit.json).

### QA-02 — P1: gateway turns missing measurements into observed zeros

Locations: [transaction mapping](C:/Users/Adrian/projects/medshield1/medshield/backend/src/databricksDashboard.ts:583), [summary averages](C:/Users/Adrian/projects/medshield1/medshield/backend/src/databricksDashboard.ts:664), plus area/year snapshot mappings around lines 352–400.

Trigger: a valid source row/dimension with nullable numeric fields. Expected: preserve null and eligibility; a genuine zero stays zero. Observed: all nine missing raw ledger numeric fields become 0, three missing summary averages become 0, and missing yearly/area finance becomes 0. Monthly output correctly remains null. The production ledger renders null as `-` and 0 as `0.00`, so this conversion loses information before the renderer can distinguish it.

Owner: Backend Engineer; Frontend/QA verify consumers. Preserve nullable response types and numeric fields, retain evidence counts, and explicitly define empty-population aggregate behavior. Acceptance: source-null → API-null → unavailable cell/export, with recorded-zero controls; mixed eligible/ineligible and empty filters. [17-check probe](backend/null-measure-probe.json).

### QA-03 — P1: valid nullable product data disables the dashboard

Location: [dashboard core validation](C:/Users/Adrian/projects/medshield1/medshield/frontend/services/api/dashboard.service.ts:41).

Trigger: one product has known revenue and `income: null`, permitted by its declared contract. Expected: keep revenue and show missing margin. Observed: core rejects the entire product response and sets the whole dashboard unavailable. A controlled single-field injection into an otherwise actual authenticated response reproduces this with no runtime exception. Missing product revenue is likewise rejected by the isolated contract probe.

Owner: Frontend Engineer. Accept permitted nulls per field while rejecting malformed/nonfinite values and retaining source readiness. Acceptance: revenue-only and all-missing-product fixtures, plus full-app boundary test, remain truthful without zero substitution. [Contract probe](frontend/core-contract-probe.json), [whole-app probe](frontend/browser-boundary-probe.json).

### QA-04 — P1: generic SQL quoting changes search/filter text or fails parsing

Location: [sqlString](C:/Users/Adrian/projects/medshield1/medshield/backend/src/databricksDashboard.ts:119) and its interpolated callers.

Four harmless live SELECT-literal checks show `O'BRIEN` becomes `OBRIEN`, backslash text loses its backslash, and a combined backslash/apostrophe value causes a parse error. The ordinary-text control passes. Expected input fidelity is not preserved by apostrophe doubling under the live Spark parser.

Owner: Backend Engineer. Use named parameters or the existing UTF-8 literal mechanism consistently for search, filter and identity values. Acceptance: exact text round trips for apostrophes, backslashes, Unicode and wildcard behavior, then filtered API reconciliation. **Injection impact remains unverified**; no further exploit probe was completed. [Live literal evidence](backend/sql-literal-live-probe.json).

### QA-05 — P2: documented offline descriptive job violates current definitions

Locations: [margin aggregation](C:/Users/Adrian/projects/medshield1/medshield/services/analytics_service/jobs/run_descriptive.py:154), [ABC](C:/Users/Adrian/projects/medshield1/medshield/services/analytics_service/jobs/run_descriptive.py:190), [missing month](C:/Users/Adrian/projects/medshield1/medshield/services/analytics_service/jobs/run_descriptive.py:228).

Hand-solvable production-function probes fail: a sole positive label is C instead of A; positive sales 60/30/10 plus −50 adjustment yield C/C/C/C instead of A/A/B/Unclassified; a margin-known row 20/100 mixed with a margin-missing 900-sales row yields 2% instead of 20%; unobserved February receives seasonal index 0 instead of unavailable. The job is still linked by its README and descriptive documentation. Its narrative also calls mixed source quantities “total demand units”. This job is offline and does not feed current dashboard values.

Owner: Data Analyst/offline analytics engineer. Align the job with shared eligibility, positive-sales crossing-inclusive ABC, null observation and unit contracts, or clearly retire its documented use. Acceptance: these independent examples, signed-adjustment reconciliation, and offline/runtime parity. [Probe](analytics-probes.json), reproducible with `python -X utf8 -m outputs.system_qa_20261009.analytics-probes` from the root.

### QA-06 — P2: legacy model report creates unsupported evidence

Location: [random exogenous values](C:/Users/Adrian/projects/medshield1/medshield/services/analytics_service/jobs/test_all_models.py:102), [holdout lags](C:/Users/Adrian/projects/medshield1/medshield/services/analytics_service/jobs/test_all_models.py:169), [unsupported classifier claim](C:/Users/Adrian/projects/medshield1/medshield/services/analytics_service/jobs/test_all_models.py:198).

The runnable report generates random rainfall/disease regressors but describes them as DOH/PAGASA and monsoon surge evidence. Its quantity regressor is described as a stock-out urgency classifier without an urgency target. Executing only its actual lag-building statements on a controlled 36-month series shows **11/12 holdout targets use earlier holdout actuals** as lag-1 features. That can support a disclosed rolling one-step protocol; it cannot substantiate a 12-month fixed-origin comparison against models issued without those actuals. The newer `predictive/` pipeline has time-aware controls and is a separate implementation.

Owner: Data Analyst/model engineer. Retire misleading report use or explicitly mark educational simulated inputs and select a coherent forecast protocol. Accept only source-bound features available at issue time and a reviewed classifier target. Acceptance: no real-source/causal/operational claims from simulations, origin-local features and same-population model comparisons. [Controlled AST probe](analytics-probes.json).

### QA-07 — P2: clean Supabase migration chain stops at 011

Location: [migration 011](C:/Users/Adrian/projects/medshield1/medshield/supabase/migrations/011_supabase_auth_account_bridge.sql:95).

Unchanged migrations 001–010 create public legacy functions; 011 unconditionally revokes nonexistent `medshield_identity` equivalents and raises SQLSTATE 42883. This prevents documented ordered bootstrap. Explicit synthetic stubs permit later fixture execution, but do not repair the chain.

Owner: Database Engineer. Guard optional revocations by actual function existence; test fresh bootstrap and upgraded legacy databases in native disposable Supabase-compatible PostgreSQL. Do not introduce dummy production functions. [First failure and downstream limits](database/REPORT.md).

### QA-08 — P2 conditional deployment defect: retained legacy public views can bypass private-table expectations

Locations: [public view recreation](C:/Users/Adrian/projects/medshield1/medshield/supabase/migrations/007_namespaced_schema_alignment.sql:460), [anonymous sales policy](C:/Users/Adrian/projects/medshield1/medshield/supabase/migrations/010_enable_rls.sql:22).

An explicitly declared older/custom Supabase default-grants fixture permits anonymous reads through owner-executed retained public analytical views. The current cloud sampled tables deny anonymous requests and old views return 404; **no current cloud breach was demonstrated**. Newer platform defaults differ, so applicability is conditional.

Owner: Database/Security Engineers. Explicitly revoke obsolete browser view/table grants or retire unused views; test old and new default-grants configurations and necessary service-only access. [Details and authoritative permission references](database/REPORT.md).

### QA-09 — P2: verification tooling no longer matches production contracts

Original browser fixtures omit the new `weather-provider-helpers` dependency, causing 21 failures before useful assertions. One recovered diagnostic test also needs the actual expanded-details evidence control. Four backend validator script compile errors arise from inferred sector/STL types; main backend compilation excludes those scripts. Fresh `validate-databricks-dashboard.ts` fails its expected forecast horizons for explicit `Unknown`; current contract supports company `All` for that benchmark, so the validator is stale rather than proving a gateway forecast defect. Setup also retains the absent `databricks/sales_restart` reference.

Owner: QA and layer engineers, with Technical Writer for instructions. Repair the real loaders/selectors and validator assumptions; compile consequential operational scripts in CI; run deterministic browser contracts in CI. Acceptance: unchanged suite passes without evidence-only accommodations and validator criteria are bound to actual source/contract identity. [Original browser run](frontend/fixtures.json), [script errors](backend/scripts-tsc.log), [live validator failure](dashboard-validator.log).

### QA-10 — P2: Docker configuration omits the explicit descriptive version pin

Location: [Compose backend environment](C:/Users/Adrian/projects/medshield1/medshield/docker-compose.yml:7).

The current configured Node gateway uses explicit version 19. Compose does not pass `DATABRICKS_DESCRIPTIVE_FACT_VERSION`; the gateway's documented unconfigured behavior resolves the latest fact version at startup. A container restart after a new candidate could therefore serve another version without the intended explicit pin. This is a source/configuration risk; no deployed container was exercised because Docker's daemon is unavailable.

Owner: DevOps/Backend Engineers. Pass and validate the reviewed fact pin through all launch/deployment paths, bind it to release evidence, and test startup/restart/rollback identity. Compose's false auth fallback also conflicts with its production image, although the checked `.env.example` explicitly sets Supabase true and configured production denial is the correct security behavior. [Pure configuration probe](backend/compose-auth-probe.json).

### QA-11 — P2: documented auth recovery cannot work after legacy hashes are cleared

The account migrator correctly clears legacy password hashes after normal linkage. If an Auth account/link is then lost, the documented instruction to rerun migration fails with no Auth user or legacy hash to import. The fixture makes two read calls and zero writes before failing.

Owner: Backend/Security Engineers and Technical Writer. Document and implement an authorized recovery/reset flow using new credentials and verified account ownership; do not retain obsolete password hashes. Acceptance: recovery after migrated account loss, without role escalation, with audit evidence. [Probe](backend/auth-recovery-probe.json), [backend detail](backend/REPORT.md).

### QA-12 — P3: HTTP boundary statuses/order drift from the API contract

Isolated network-denied server probes: 82/92 expected responses match. Two unauthenticated repeated/structured query requests get 400 before auth instead of the documented auth-first denial; seven no-Databricks-configuration routes return 502 instead of documented 503. CORS denial produces default 500 HTML and is informational pending an explicit contract. These failures do not demonstrate an analytical fallback or unauthorized data disclosure.

Owner: Backend Engineer. Reconcile middleware ordering and unavailable error mapping with the API contract and maintain deny/no-fallback regressions. [92-case receipt](backend/local-api-probe.json).

## Existing gates and unverified scope

- Local accepted catalog publication, business release approval, and a full catalog recovery rehearsal remain open. No checksum was weakened and no serving pin was advanced.
- Live remote audit tables return 404/PGRST205 in PostgREST's schema cache. This may mean absent or hidden/stale schema objects; SQL administration was not available to distinguish them. Isolated migration 016 hashing/idempotence/access checks pass, but cloud distributed locking and RPC write/readback remain unverified. The documented local audit fallback is audit-only.
- Retained Delta versions are currently readable. Most dependencies lack explicit retention overrides; no RESTORE/VACUUM or multi-table interrupted-publication recovery was tested.
- SKU/unit forecasting, approved disease/weather joins, operational EOQ/ROP/expiry inputs, procurement execution and measured reduction of wastage/stockouts are not demonstrated. They are separate acceptance requirements, not implied by company-revenue charts or scenario tests.
- Docker image builds/runtime, production hosting/network controls, load/concurrency testing, complete accessibility/assistive-technology evaluation, client walkthrough acceptance, and every live user role are unverified. This assessment is broad QA with stated sampling, not a certification that every possible system behavior was tested.
- Global `python -m pip check` fails for missing ipython/pygments required by installed notebook packages. The actual 189 Python/notebook/STL tests pass; this environment issue is not attributed to the application requirements without a clean isolated installation.

## Repair sequence and handoff

1. Address applicable critical frontend dependency advisories and review backend advisories. Verify a compatible upgrade before exposing a Windows-hosted server.
2. Repair gateway null preservation, frontend nullable contracts and SQL text parameters together, then reconcile affected API/table/chart/export populations.
3. Repair clean migrations and explicitly harden retained public analytical objects; verify native disposable bootstrap and deny behavior.
4. Align or retire old offline report jobs; protect independent ABC/margin/null and forecast-origin examples.
5. Repair real QA harnesses/validators, auth recovery guidance and release-pin propagation.
6. Complete governed catalog/audit deployment and isolated recovery, then collect one coherent source-bound release and named business acceptance. Model or procurement activation stays separately gated.

Skills read and applied by root: `.skills/product-management-frameworks.md` for risk/impact prioritization; `business-analysis-frameworks.md` for observable acceptance; `architecture-patterns.md` for runtime boundaries; `testing-standards.md` for fixture/live separation; `analytics-frameworks.md` for same-population metrics and origin-aware forecasts; `database-standards.md` for identity/grain/preservation; `security-standards.md` for deny/credential-safe checks; `coding-standards.md` and `technology-stack.md` for scoped probes; `documentation-standards.md` for the dated canonical evidence handoff. Supporting reviewers record their backend/frontend/database skills and exact commands in their reports. No lesson-coaching skill or third-party app skill was needed.

Automatic safety review stopped an additional SQL security probe; injection impact was not verified. Automatic approval review also rejected scoped recursive cleanup as “blocked by policy”; the approximately 25.4 MB database test runtime is retained with its pinned package/lockfile. Neither blocked action was bypassed.
