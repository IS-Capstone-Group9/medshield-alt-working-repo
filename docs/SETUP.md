# MedShield Project Setup

## Architecture

MedShield runs a Next.js frontend and a TypeScript/Express gateway. Supabase owns production authentication and account roles. Databricks Unity Catalog is the sole runtime analytical source. Python analytics code is optional for offline jobs and tests.

## Prerequisites

- Node.js and npm supported by the checked-in lockfiles.
- Access to the MedShield Supabase project for production authentication, or intentional local auth for development.
- A Databricks workspace, running SQL warehouse, HTTPS workspace origin, scoped token, and access to the required candidate views.
- Python only when running offline analytics jobs or tests.

## Environment files

Copy `.env.example` to an ignored `.env`, or use `backend/.env` for backend-only values. The backend loads `backend/.env` before the repository `.env`.

| Variable | Required for | Guidance |
|---|---|---|
| `PORT` | Gateway | Defaults to `5000` |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | Usually `http://localhost:5000` |
| `USE_SUPABASE` | Authentication | `true` for production Auth; `false` only for intentional local development |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Auth | Browser-safe project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser Auth | Browser-safe publishable key |
| `SUPABASE_URL` | Gateway Auth/audit | Server project URL |
| `SUPABASE_ANON_KEY` | Gateway Auth | Publishable/anon key used for token validation |
| `SUPABASE_SECRET_KEY` | Account administration/audit | Preferred modern server secret; never expose to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy server operations | Optional alternative; server-only |
| `DATABRICKS_HOST` | Analytics | Workspace origin such as `https://dbc-...cloud.databricks.com`; remove `/browse/...` and `?o=...` |
| `DATABRICKS_TOKEN` | Analytics | Server-only scoped token |
| `DATABRICKS_SQL_WAREHOUSE_ID` | Analytics | SQL warehouse ID, not the warehouse display name |
| `DATABRICKS_CATALOG` | Analytics | Defaults to `workspace` |
| `DATABRICKS_SCHEMA` | Analytics | Defaults to `medshield_gold` |
| `DATABRICKS_QUERY_CACHE_TTL_MS` | Performance | Optional positive cache lifetime; default is 60 seconds |
| `DATABRICKS_QUERY_CONCURRENCY` | Performance | Optional positive query limit; default is 3 |
| `NASA_POWER_DAILY_URL` | NASA refresh | Optional official HTTPS daily-point URL only; custom hosts and redirects are rejected |
| `MEDSHIELD_ENV_FILE` | Gateway | Optional explicit environment-file path |

Do not place Databricks or Supabase server secrets in `NEXT_PUBLIC_*` variables.

## Install

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

## Run locally

Terminal 1:

```powershell
cd backend
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000`. The gateway health endpoint is `http://localhost:5000/api/health`.

Do not run `npm run build` in the frontend while the same checkout has `next dev` running because both use `.next`.

## Databricks preparation

For a current sales rebuild, follow [the Databricks project guide](../databricks/medshield_project/README.md).
After Gold passes, run the matching project's 04 monthly bridge, 05 system bridge
and 06 STL, then validate the candidate before configuring the gateway's explicit
fact-version pin. A completed unchanged candidate does not need another rebuild.

For DOH/PAGASA, follow [../databricks/external_restart/GUIDE.md](../databricks/external_restart/GUIDE.md), then run `databricks/sql/06_external_restart_system_bridge.sql`.

The successful technical status remains candidate-only. Complete the acceptance checks in [CURRENT_STATE.md](CURRENT_STATE.md) before promotion.

## Supabase setup

Use [SUPABASE_AUTH_MIGRATION.md](SUPABASE_AUTH_MIGRATION.md) for production account migration. Apply migrations in `supabase/migrations/` in numeric order only when creating or upgrading the target project. The latest migrations include account/Auth linkage, RLS, candidate cache permissions, and approved financial semantics.

Older Supabase analytical tables and `supabase/seed.sql` do not supply live dashboard values.

## Docker

```powershell
docker compose build
docker compose up
```

Docker starts the frontend and gateway only. It still requires usable Supabase/Databricks configuration for authenticated live analytics.

## Validate

```powershell
cd backend
npm run build
npm run databricks:check:dashboard

cd ..\frontend
npm run build
```

The Databricks validation command requires live credentials and a running warehouse. Use [TESTING.md](TESTING.md) for the complete checks.
