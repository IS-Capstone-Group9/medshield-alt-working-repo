# Testing

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
python -m unittest discover -s databricks/sales_restart/tests
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

The suite covers dashboard loading, metrics, sales diagnostics, heatmaps, buyer/area views, forecast validation, external regression, product prioritization, planning, client references, and the overview odometer.

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
