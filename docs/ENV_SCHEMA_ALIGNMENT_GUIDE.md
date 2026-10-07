# Environment and Schema Alignment

Last reviewed: 2026-09-25

## Runtime responsibilities

| Boundary | Source/store |
|---|---|
| Dashboard analytics | Databricks Unity Catalog |
| Authentication and linked application roles | Supabase Auth and `medshield_identity` |
| Audit persistence | Supabase when configured; local audit file only as an audit fallback |
| Offline/generated evidence | Repository `data/` and `outputs/`; never a runtime analytical fallback |

## Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Browser | Gateway base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | Supabase Auth URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser | Supabase publishable Auth key |
| `USE_SUPABASE` | Backend | Production Auth when true; local development Auth when false |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Backend | Token validation and Auth calls |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Backend secret | Account administration, audit, optional yearly checkpoint sync |
| `DATABRICKS_HOST` | Backend secret/config | HTTPS workspace origin only |
| `DATABRICKS_TOKEN` | Backend secret | SQL Statement Execution authentication |
| `DATABRICKS_SQL_WAREHOUSE_ID` | Backend secret/config | Warehouse ID from the HTTP path |
| `DATABRICKS_CATALOG` / `DATABRICKS_SCHEMA` | Backend | Default `workspace.medshield_gold` contract |
| `DATABRICKS_QUERY_CACHE_TTL_MS` | Backend | Optional bounded query-cache lifetime |
| `DATABRICKS_QUERY_CONCURRENCY` | Backend | Optional statement concurrency limit |
| `NASA_POWER_DAILY_URL` | Backend | Optional NASA endpoint override |

Never put server secrets in `NEXT_PUBLIC_*` variables.

## Databricks alignment

Expected schemas:

- `workspace.medshield_bronze`
- `workspace.medshield_silver`
- `workspace.medshield_audit`
- `workspace.medshield_gold`

Expected application contracts are listed in [ARCHITECTURE.md](ARCHITECTURE.md). Run the sales/external bridges after their Gold notebooks pass. Candidate names and metadata remain until named approval.

## Supabase alignment

Supabase migrations include earlier analytical schemas as well as current identity, audit, RLS, account/Auth linkage, candidate-cache, and financial-semantics work. Their existence does not make Supabase the dashboard analytical source.

For the current runtime, verify:

1. Auth users link to active application accounts and roles.
2. RLS and server-secret boundaries are applied.
3. Browser variables contain only publishable values.
4. The optional yearly checkpoint cache cannot overwrite published analytics.
5. Audit failures cannot substitute analytical data.

## Diagnostic order

1. `GET /api/health`: gateway is running and `dashboard_fallback` is false.
2. Admin Databricks status routes: configuration, warehouse, and view contract.
3. `npm run databricks:check:dashboard`: live sales contract.
4. `npm run databricks:check:external`: live external contract.
5. Auth login/me flow: Supabase identity boundary.
6. Browser network responses: no credentials or local analytical fallback.

See [SETUP.md](SETUP.md), [DATABASE.md](DATABASE.md), and [CURRENT_STATE.md](CURRENT_STATE.md).
