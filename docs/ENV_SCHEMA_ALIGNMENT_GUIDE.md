# Environment And Schema Alignment Guide

## Purpose

This guide connects the current `.env` shape and Supabase schema layout to the MedShield descriptive, predictive, and prescriptive analytics plan.

Use this guide when checking why the dashboard, model services, or database-backed analytics are not available after switching to the new Supabase project or schema.

## Security Rule

Never commit real Supabase keys, service-role keys, SonarQube tokens, session secrets, or provider credentials to the repository.

If a service-role key is pasted into chat, issue trackers, screenshots, or shared terminals, rotate it in Supabase before using the project for shared demos or production-style testing.

## Environment Boundary

| Variable | Scope | Required by | Notes |
|---|---|---|---|
| `PORT` | Server runtime | Backend gateway | Gateway port, currently expected as `5000`. |
| `FLASK_DEBUG` | Local development | Python services | Use for local debugging only. |
| `USE_SUPABASE` | Server runtime | Backend gateway and services | `true` means read/write through Supabase when credentials are valid. |
| `NEXT_PUBLIC_API_BASE_URL` | Browser-safe | Frontend | Public because it is bundled into Next.js. It must not contain secrets. |
| `SUPABASE_PROJECT_ID` | Server/runtime metadata | Backend, docs, scripts | Project identifier only. |
| `SUPABASE_URL` | Server/runtime config | Backend and services | Safe as configuration, but keep it in `.env` for environment separation. |
| `SUPABASE_ANON_KEY` | Browser-capable public key | Frontend or backend read paths | Public by design, but still protect access through RLS and backend authorization. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Backend/services only | Required for ingestion and warehouse writes. Never expose to Next.js. |
| `ANALYTICS_SERVICE_URL` | Server/runtime config | Backend gateway | Points to analytics microservice. |
| `PRODUCT_SERVICE_URL` | Server/runtime config | Backend gateway | Points to product microservice. |
| `ANALYTICS_SERVICE_PORT` | Local service config | Analytics service | Keeps analytics service separate from gateway. |
| `PRODUCT_SERVICE_PORT` | Local service config | Product service | Keeps product service separate from gateway. |
| `START_PYTHON_SERVICES` | Local orchestration | Backend gateway | Lets the gateway start missing Python services in local development. |
| `PYTHON_EXECUTABLE` | Local orchestration | Backend gateway | Python command used to start services. |
| `NASA_POWER_DAILY_URL` | External data config | Analytics service or ETL job | Provider-derived weather proxy source. |
| `OPEN_METEO_ARCHIVE_URL` | External data config | Analytics service or ETL job | Historical weather validation/fallback. |
| `SESSION_SECRET` | Server secret | Backend/session logic | Must be replaced with a long random value. |
| `SONAR_HOST_URL` | Local quality config | Sonar scanner | Local scan endpoint. |
| `SONAR_TOKEN` | Local quality secret | Sonar scanner | Keep out of Git. |

## Schema Inventory

The visible Supabase project separates platform-managed schemas from MedShield application schemas.

| Schema | Owner | Purpose | Analytics role |
|---|---|---|---|
| `medshield_common` | MedShield | Shared dimensions and controlled mappings. | Supports all analytics layers. |
| `medshield_etl` | MedShield | Source-system registry and ETL run lineage. | Supports data quality, provenance, and model audit. |
| `medshield_identity` | MedShield | Application accounts and roles. | Supports authenticated dashboard access. |
| `medshield_sales` | MedShield | Expected sales facts/staging. | Needed for descriptive baseline and forecasting. |
| `medshield_external` | MedShield | Expected external DOH/PAGASA/weather signals. | Needed for external-regressor forecasting and alerts. |
| `medshield_analytics` | MedShield | Expected model outputs and marts. | Needed for dashboard publication of model results. |
| `auth`, `storage`, `realtime`, `vault`, `extensions`, `graphql`, `graphql_public`, `pgbouncer`, `public` | Supabase/platform | Managed platform services. | Do not treat as business analytics schemas. |

## Current Tables From Provided Schema

| Schema | Table | Main use |
|---|---|---|
| `medshield_common` | `dim_date` | Month/date joins for facts, forecasts, and dashboard filters. |
| `medshield_common` | `dim_month` | Month display and seasonality support. |
| `medshield_common` | `dim_area` | Territory, customer type, business line, geography, and mapping status. |
| `medshield_common` | `dim_product` | Canonical product/SKU master data and forecast eligibility. |
| `medshield_common` | `dim_product_alias` | Raw product-to-canonical mapping, contract-name handling, and review workflow. |
| `medshield_etl` | `dim_source_system` | Source provenance for internal, external, model, and manual data. |
| `medshield_etl` | `etl_pipeline_run` | Pipeline status, periods, row counts, quality summaries, and errors. |
| `medshield_etl` | `etl_source_extract` | Source extract traceability, checksums, and metadata. |
| `medshield_identity` | `accounts` | Application users, roles, and local account status. |

The provided `storage`, `realtime`, and `vault` tables are Supabase-managed support tables. They should not be used as MedShield fact or model-output tables.

## Analytics Fit

| Analytics layer | Supported now | Still needed |
|---|---|---|
| Descriptive | Product, area, date, source-system, and ETL lineage structures are present. | Sales fact/staging tables or views with quantity, revenue, gross margin/profit, source row, and period fields. |
| Predictive | Product forecast eligibility, area geography, and source provenance are present. | Forecast run table, demand forecast output table, model metrics table, and external signal fact tables. |
| Prescriptive | Product and area dimensions can support scenario joins. | Inventory position, lead time, ordering cost, holding cost, expiry/stock age, budget, capacity, recommendation, and outcome tables. |

## Recommended Data Flow

```text
Source extracts
  -> medshield_etl.etl_pipeline_run
  -> medshield_etl.etl_source_extract
  -> staging tables in medshield_sales or medshield_external
  -> approved dimensions in medshield_common
  -> fact and aggregate tables
  -> model run and model output tables in medshield_analytics
  -> reviewed dashboard publication
```

## Table Expectations By Layer

| Need | Recommended schema | Expected table or view |
|---|---|---|
| Clean sales transactions | `medshield_sales` | `fact_sales_transactions` or equivalent view. |
| Monthly sales aggregates | `medshield_sales` or `medshield_analytics` | `fact_monthly_sales`, `fact_product_summary`, `fact_area_summary`. |
| Data completeness | `medshield_sales` or `medshield_analytics` | Period completeness table or view. |
| Disease signals | `medshield_external` | DOH historical signal fact/staging table. |
| Official weather signals | `medshield_external` | PAGASA historical signal fact/staging table. |
| Weather proxy signals | `medshield_external` | NASA/Open-Meteo provider signal fact/staging table. |
| Forecast runs | `medshield_analytics` | Model run registry with metrics, status, period, and limitations. |
| Demand forecasts | `medshield_analytics` | Forecast output by period and grain. |
| Product priority | `medshield_analytics` | ABC/Pareto and model-assisted priority table. |
| Prescriptive recommendations | `medshield_analytics` | Inventory, allocation, MCDA, alert, and scenario recommendation tables. |
| Recommendation outcomes | `medshield_analytics` | Accepted action and actual outcome table for evaluation. |

## Immediate Validation Checklist

1. Confirm all MedShield schemas exist: `medshield_common`, `medshield_etl`, `medshield_identity`, `medshield_sales`, `medshield_external`, and `medshield_analytics`.
2. Confirm the backend uses `SUPABASE_SERVICE_ROLE_KEY` only on server-side write paths.
3. Confirm the frontend only receives `NEXT_PUBLIC_API_BASE_URL` and, if needed, public anon configuration.
4. Confirm `medshield_common.dim_product_alias` has reviewed mappings before SKU-level forecasting.
5. Confirm `medshield_common.dim_area` separates `territory`, `customer_type`, and `business_line`.
6. Confirm sales facts reconcile to the source workbook before model training.
7. Confirm external data records carry source-system provenance.
8. Confirm model output tables exist before the dashboard expects database-backed model charts.
9. Confirm missing prescriptive inputs are labeled as scenario-only instead of recommendation-ready.

## Current Interpretation

The new schema is a good foundation for controlled analytics because it separates common dimensions, ETL provenance, identity, and platform-managed tables.

The application is aligned through `supabase/migrations/007_namespaced_schema_alignment.sql` and schema-aware Supabase service writes in `services/data_pipeline.py`.

The visible schema is not yet enough to fully support every chart or model output by itself. Descriptive analytics still needs populated sales fact or aggregate tables. Predictive analytics still needs model-run and forecast-output tables. Prescriptive analytics still needs operational inventory, procurement, cost, lead-time, expiry, budget, capacity, and outcome data.

Until those tables are present and populated, dashboard sections that depend on model outputs should show `draft`, `blocked`, `scenario`, or `review required` states instead of implying complete recommendations.
