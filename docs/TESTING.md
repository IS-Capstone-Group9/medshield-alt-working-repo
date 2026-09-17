# Testing

## Build checks

```powershell
cd backend
npm run build

cd ..\frontend
npm run build
```

## Databricks checks

With the backend `.env` configured, verify that:

- the snapshot returns 9 annual rows and 108 monthly rows for 2017–2025;
- products, areas, transactions, summaries, heatmap rows, and forecast baselines come from `workspace.medshield_gold`;
- PAGASA observations report their Databricks view and mapping status;
- external regression is blocked while approved joins are absent;
- buyer-sector views publish `Unknown`, with Government and Private empty;
- invalid query parameters return `400`;
- an unavailable warehouse returns a Databricks error and never local data.

## Frontend checks

- Run `npm run test:e2e` for the chart and interaction suite.
- Confirm the dashboard root stays hidden until the live Databricks core contract loads.
- Confirm a failed Databricks load shows the unavailable panel and no chart values.
- Confirm the data freshness bar says `Databricks Gold`.
- Confirm browser sales uploads and weather refresh controls are absent.
- Confirm unsupported mappings and models show empty or blocked states.

## Authentication

- Protected routes reject a missing or invalid bearer token with `401`.
- Supabase Auth remains the production identity path.
- Databricks credentials never appear in browser responses, logs, screenshots, or committed files.
