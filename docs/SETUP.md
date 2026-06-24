# MedShield Project Setup

## 1. Project Overview

MedShield Business Analytics is a capstone system for analyzing pharmaceutical sales, territory performance, product prioritization, and inventory decision support.

## 2. Project Goal

Build a modern business analytics dashboard with a Next.js frontend, Python microservices, and Supabase-backed data persistence.

## 3. Selected Tech Stack

| Layer | Stack | Purpose |
|---|---|---|
| Frontend | Next.js + TypeScript | Dashboard UI and page routing |
| UI Styling | CSS variables + responsive layout | Clean and maintainable interface |
| API Layer | Python Flask microservices | Business logic and analytics endpoints |
| Data Layer | Supabase PostgreSQL | Managed database and row-level security |
| Data Access | Supabase REST API + Python requests | Fetch analytics snapshots and services |
| Fallback Mode | Local JSON snapshot | Keeps demo usable when services are offline |

## 4. Workspace Structure

| Folder | Role |
|---|---|
| `frontend/` | Next.js application |
| `backend/` | API gateway |
| `services/analytics_service/` | Analytics microservice |
| `services/product_service/` | Product microservice |
| `supabase/` | SQL migrations and seed data |
| `docs/` | Capstone and setup documentation |
| `references/` | Source papers and capstone reference materials |

## 5. Environment Variables

| Variable | Example | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000` | Next.js client-side API base URL |
| `SUPABASE_PROJECT_ID` | `tiffnqydvkskgvyzmzdw` | Project identifier for the capstone workspace |
| `SUPABASE_URL` | `https://tiffnqydvkskgvyzmzdw.supabase.co` | Supabase project URL |
| `SUPABASE_ANON_KEY` | provided JWT | Public Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only secret | Allows ingestion writes to staging, facts, and ETL lineage. |
| `ANALYTICS_SERVICE_URL` | `http://localhost:5101` | Analytics microservice URL |
| `PRODUCT_SERVICE_URL` | `http://localhost:5102` | Product microservice URL |
| `ANALYTICS_SERVICE_PORT` | `5101` | Prevents collision with the gateway on port 5000 |
| `PRODUCT_SERVICE_PORT` | `5102` | Prevents collision with the gateway on port 5000 |
| `START_PYTHON_SERVICES` | `true` | Lets the TypeScript gateway start missing Python services when `npm run dev` starts |
| `PYTHON_EXECUTABLE` | `python` | Python command used by the gateway service supervisor |
| `USE_SUPABASE` | `false` for local, `true` with real keys | Enables Supabase before local fallback |
| `NASA_POWER_DAILY_URL` | NASA POWER point endpoint | Historical meteorological source |
| `OPEN_METEO_ARCHIVE_URL` | Open-Meteo archive endpoint | Historical validation/fallback |
| `SONAR_HOST_URL` | `http://localhost:9000` | Local SonarQube server URL |
| `SONAR_TOKEN` | generated in SonarQube | Token used by the scanner; keep it out of Git |

## 6. Installation

| Area | Command |
|---|---|
| Backend gateway | `cd backend` then `npm install` |
| Analytics service | `cd services/analytics_service` then `pip install -r requirements.txt` |
| Analytics modeling jobs | `cd services/analytics_service` then `pip install -r requirements-modeling.txt` |
| Product service | `cd services/product_service` then `pip install -r requirements.txt` |
| Frontend | `cd frontend` then `npm install` |

Use `requirements-modeling.txt` only when running model-training or optimization jobs. The normal Flask service remains on `requirements.txt` so the dashboard demo can run without heavy forecasting libraries.

## 7. Run Commands

| Service | Command |
|---|---|
| API gateway plus Python services | `cd backend` then `npm run dev` |
| Analytics service only, optional manual mode | `python -m services.analytics_service.app` |
| Product service only, optional manual mode | `python -m services.product_service.app` |
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
| `supabase/seed.sql` | Inserts the current analytics snapshot |

| Step | Action |
|---|---|
| 1 | Run `supabase/migrations/001_init.sql` in Supabase SQL editor |
| 2 | Run `supabase/migrations/002_accounts.sql` |
| 3 | Run `supabase/migrations/003_auth_rpc.sql` |
| 4 | Run `supabase/migrations/004_dss_schema.sql` |
| 5 | Run `supabase/migrations/005_sales_ingestion_weather.sql` |
| 6 | Run `supabase/migrations/006_business_rules_master_data.sql` |
| 7 | Run `supabase/seed.sql` |
| 8 | Verify the gateway and frontend can read dashboard, transaction, master-data, completeness, and DSS views |

## 9. Setup Flow

| Step | Description |
|---|---|
| 1 | Copy `.env.example` to `.env` and fill in the Supabase values |
| 2 | Install backend, microservice, and frontend dependencies |
| 3 | Apply the Supabase migrations in order, then seed |
| 4 | Start the gateway; it probes and starts missing Python services unless `START_PYTHON_SERVICES=false` |
| 5 | Start the Next.js frontend |

## 10. Notes

| Topic | Guidance |
|---|---|
| Reference materials | Use `references/` and `docs/` as the canonical project references |
| Setup docs | This file is the single canonical setup document |
| Tech direction | Use Next.js + TypeScript for the frontend and Python for the service layer |
| Local auth | Set `USE_SUPABASE=false` when Supabase credentials are not configured. The gateway will use the local demo auth store and issue bearer tokens. |
| SaaS auth | Dashboard API routes require `Authorization: Bearer <token>`. Replace local sessions with Supabase Auth/JWT validation before production deployment. |
| Service-role key | Put `SUPABASE_SERVICE_ROLE_KEY` in ignored local `.env` only. Never commit it, paste it into frontend variables, or expose it in screenshots. |
| Messy sales upload | Use Data Upload or View Sales Data -> Upload messy XLSX/CSV. The file is cleaned by the server pipeline before it appears in the paginated table. Year uploads merge into history by replacing only their year. |
| Weather validation | Use Weather API Validation to refresh NASA POWER or Open-Meteo data. Select `All territories` to load every configured capstone territory, then use daily grain for API validation and monthly grain for planning/regressor summaries. |
| Business definitions | Use `docs/BUSINESS_DEFINITIONS.md` before training models or updating dashboard labels. The current workspace has no operating expense data, so `net_income` must be treated as workbook gross margin/profit, not company net profit. |
| Mapping templates | Use `datasources/templates/product_master_mapping.csv` and `datasources/templates/area_classification_mapping.csv` as the first controlled mappings before creating database master tables. |
| Model orchestration | Use `docs/MODEL_LIBRARIES_AND_ORCHESTRATION.md` for the planned job boundary. Dashboard requests should read published outputs, not train models synchronously. |
| Docker and SonarQube | Use `docs/DEVOPS_DOCKER_SONARQUBE.md` for container health checks, local quality scans, and AWS-readiness notes. |
