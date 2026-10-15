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
