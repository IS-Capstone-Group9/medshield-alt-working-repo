# MedShield Project Setup

## 1. Project Overview

MedShield Business Analytics is a capstone system for analyzing pharmaceutical sales, territory performance, product prioritization, and inventory decision support.

## 2. Project Goal

Build a modern business analytics dashboard with a Next.js frontend, a TypeScript gateway, Databricks-backed analytics, and Supabase Auth.

## 3. Selected Tech Stack

| Layer | Stack | Purpose |
|---|---|---|
| Frontend | Next.js + TypeScript | Dashboard UI and page routing |
| UI Styling | CSS variables + responsive layout | Clean and maintainable interface |
| API Layer | TypeScript + Express | Authentication, validation, and bounded Databricks queries |
| Data Layer | Databricks Unity Catalog | Dashboard system of record |
| Identity | Supabase Auth | User sessions and roles |
| Failure Mode | Explicit unavailable state | Prevents local or mock data substitution |

## 4. Workspace Structure

| Folder | Role |
|---|---|
| `frontend/` | Next.js application |
| `backend/` | API gateway |
| `services/` | Offline and legacy analytics utilities |
| `supabase/` | SQL migrations and seed data |
| `docs/` | Capstone and setup documentation |
| `references/` | Source papers and capstone reference materials |

## 5. Environment Variables

| Variable | Example | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000` | Next.js client-side API base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ghrpgyzbjmhgoduxzdyp.supabase.co` | Browser-safe Supabase project URL for Supabase Auth |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | provided publishable key | Browser-safe Supabase publishable key for Supabase Auth |
| `SUPABASE_PROJECT_ID` | `ghrpgyzbjmhgoduxzdyp` | Existing `medshield` Supabase project identifier |
| `SUPABASE_URL` | `https://ghrpgyzbjmhgoduxzdyp.supabase.co` | Server-side Supabase project URL |
| `SUPABASE_ANON_KEY` | provided publishable or anon key | Supabase key used by the gateway for auth validation |
| `SUPABASE_SECRET_KEY` | modern `sb_secret_...` server key | Backend-only identity resolution and Auth account administration. Never expose to the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only secret | Optional administrator and migration operations. |
| `DATABRICKS_HOST` | `https://dbc-...cloud.databricks.com` | Workspace origin only; omit `/browse/...` paths and the `o=` query. |
| `DATABRICKS_TOKEN` | server-only token | SQL Statement Execution authentication. |
| `DATABRICKS_SQL_WAREHOUSE_ID` | warehouse ID | Warehouse used for dashboard queries. |
| `DATABRICKS_CATALOG` | `workspace` | Unity Catalog catalog. |
| `DATABRICKS_SCHEMA` | `medshield_gold` | Gold schema. |
| `USE_SUPABASE` | `false` for local, `true` with real keys | Enables Supabase before local fallback |
| `NASA_POWER_DAILY_URL` | NASA POWER point endpoint | Historical meteorological source |
| `OPEN_METEO_ARCHIVE_URL` | Open-Meteo archive endpoint | Historical validation/fallback |
| `SONAR_HOST_URL` | `http://localhost:9000` | Local SonarQube server URL |
| `SONAR_TOKEN` | generated in SonarQube | Token used by the scanner; keep it out of Git |

## 6. Installation

| Area | Command |
|---|---|
| Backend gateway | `cd backend` then `npm install` |
| Optional offline modeling jobs | Install the relevant requirements under `services/` only when rebuilding Databricks outputs |
| Frontend | `cd frontend` then `npm install` |

The dashboard runtime does not require the legacy Flask services.

## 7. Run Commands

| Service | Command |
|---|---|
| API gateway | `cd backend` then `npm run dev` |
| Frontend | `cd frontend` then `npm run dev` |
| Docker app stack | `docker compose build` then `docker compose up` |
| Local SonarQube | `docker compose -f docker-compose.sonar.yml up -d sonarqube-db sonarqube` |

## 8. Database Setup

| File | Purpose |
|---|---|
| `supabase/migrations/001_init.sql` | Creates analytics tables and public read policies |
| `supabase/migrations/004_dss_schema.sql` | Adds transaction staging, external signals, DSS model outputs, model registry, and ETL lineage |
| `supabase/migrations/005_sales_ingestion_weather.sql` | Adds canonical transaction publication, aggregate refresh, weather provenance, and restricted policies |
| `supabase/migrations/006_business_rules_master_data.sql` | Adds SKU alias control, area classification, external staging, data completeness, and revenue aggregation fix |
| `supabase/migrations/007_namespaced_schema_alignment.sql` | Aligns the warehouse to `medshield_common`, `medshield_etl`, `medshield_identity`, `medshield_sales`, `medshield_external`, and `medshield_analytics` schemas |
| `supabase/migrations/011_supabase_auth_account_bridge.sql` | Links application accounts to Supabase Auth, enforces first-login password changes, and revokes legacy password RPCs |
| `supabase/seed.sql` | Inserts the current analytics snapshot |

| Step | Action |
|---|---|
| 1 | Run `supabase/migrations/001_init.sql` in Supabase SQL editor |
| 2 | Run `supabase/migrations/002_accounts.sql` |
| 3 | Run `supabase/migrations/003_auth_rpc.sql` |
| 4 | Run `supabase/migrations/004_dss_schema.sql` |
| 5 | Run `supabase/migrations/005_sales_ingestion_weather.sql` |
| 6 | Run `supabase/migrations/006_business_rules_master_data.sql` |
| 7 | Run `supabase/migrations/007_namespaced_schema_alignment.sql` |
| 8 | In Supabase API settings, expose the MedShield schemas used by PostgREST: `medshield_common`, `medshield_etl`, `medshield_identity`, `medshield_sales`, `medshield_external`, and `medshield_analytics` |
| 9 | Run `supabase/seed.sql` only if it has been updated for the target schema, or load data through the app ingestion flow |
| 10 | Verify the gateway and frontend can read dashboard, transaction, master-data, completeness, and DSS views |
| 11 | Follow `docs/SUPABASE_AUTH_MIGRATION.md` to import and link existing accounts through the Auth Admin API |

## 9. Setup Flow

| Step | Description |
|---|---|
| 1 | Copy `.env.example` to `.env` and fill in the Supabase values |
| 2 | Install backend and frontend dependencies |
| 3 | Apply the Supabase migrations in order, then seed |
| 4 | Configure the backend-only Databricks host, warehouse ID, and token, then start the gateway |
| 5 | Start the Next.js frontend |

When running the frontend directly with `cd frontend && npm run dev`, make sure the `NEXT_PUBLIC_*` variables are available to that process, for example through `frontend/.env.local` or your shell. Docker Compose passes these variables from the root `.env`.

## 10. Notes

| Topic | Guidance |
|---|---|
| Reference materials | Use `references/` and `docs/` as the canonical project references |
| Setup docs | This file is the single canonical setup document |
| Tech direction | Use Next.js + TypeScript for the frontend and Python for the service layer |
| Local auth | Set `USE_SUPABASE=false` when Supabase credentials are not configured. The gateway will use the local demo auth store and issue bearer tokens. |
| SaaS auth | Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and a backend-only Supabase server secret, then set `USE_SUPABASE=true`. The gateway privately resolves username/email and Supabase Auth owns password verification and browser sessions. |
| Service-role key | Put `SUPABASE_SERVICE_ROLE_KEY` in ignored local `.env` only. Never commit it, paste it into frontend variables, or expose it in screenshots. |
| Environment and schema alignment | Use `docs/ENV_SCHEMA_ALIGNMENT_GUIDE.md` after switching Supabase projects or schemas. It lists required variables by name only and maps visible schemas to analytics readiness. |
| Sales ingestion | Load and validate sales files through the Databricks pipeline. Browser uploads are disabled because Databricks is the dashboard system of record. |
| Weather validation | Weather API Validation reads monthly PAGASA observations from Databricks Gold. Refresh the source through the Databricks external-source pipeline. |
| Business definitions | Use `docs/BUSINESS_DEFINITIONS.md` before training models or updating dashboard labels. The current workspace has no operating expense data, so `net_income` must be treated as workbook gross margin/profit, not company net profit. |
| Mapping templates | Use `datasources/templates/product_master_mapping.csv` and `datasources/templates/area_classification_mapping.csv` as the first controlled mappings before creating database master tables. |
| Model orchestration | Use `docs/MODEL_LIBRARIES_AND_ORCHESTRATION.md` for the planned job boundary. Dashboard requests should read published outputs, not train models synchronously. |
| Docker and SonarQube | Use `docs/DEVOPS_DOCKER_SONARQUBE.md` for container health checks, local quality scans, and AWS-readiness notes. |
