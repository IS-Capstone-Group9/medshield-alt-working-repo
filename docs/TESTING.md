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

For Markdown-only changes, check relative links, stale architecture terms, sales-year scope, candidate status, and generated/historical labels. Application builds are unnecessary unless behavior or commands also changed.
