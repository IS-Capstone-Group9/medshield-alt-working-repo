# Chapter 4 - Implementation

This document describes the current implementation of the MedShield Business Analytics Decision Support System in this workspace.

## 4.1 System Overview

- Frontend: Next.js App Router, React, and TypeScript in `frontend/`.
- Backend: TypeScript API gateway in `backend/` with two Python Flask microservices in `services/`.
- Database: Supabase PostgreSQL using a connected warehouse schema in `supabase/`.
- Source of truth: warehouse fact tables and dimension tables. When Supabase credentials are unavailable in the workspace, the gateway and services can fall back to the checked-in reference export for local execution.

## 4.2 Warehouse Design

The schema in `supabase/migrations/001_init.sql` uses the connected dashboard warehouse model, `004_dss_schema.sql` adds the DSS layer, and `005_sales_ingestion_weather.sql` completes transaction ingestion and weather provenance.

- Dimensions
  - `dim_date`
  - `dim_month`
  - `dim_area`
  - `dim_product`
- Facts
  - `fact_monthly_sales`
  - `fact_area_summary`
  - `fact_product_summary`
  - `fact_year_summary`
  - `fact_seasonality`

These tables are linked through foreign keys and are exposed through dashboard views:

- `vw_dashboard_kpis`
- `vw_dashboard_monthly`
- `vw_dashboard_by_area`
- `vw_dashboard_top_products`
- `vw_dashboard_year_summary`
- `vw_dashboard_seasonality`

The DSS extension adds:

- Source and model dimensions:
  - `dim_source_system`
  - `dim_model`
- Transaction and external signal facts:
  - `stg_sales_transactions`
  - `fact_sales_transactions`
  - `fact_disease_signal`
  - `fact_weather_signal`
- Model output facts:
  - `fact_demand_forecast`
  - `fact_product_priority`
  - `fact_area_cluster`
  - `fact_regional_priority`
  - `fact_inventory_recommendation`
  - `fact_allocation_recommendation`
  - `fact_product_region_match`
  - `fact_decision_alert`
  - `fact_model_evaluation`
- API views:
  - `vw_dss_forecasts`
  - `vw_dss_external_signals`
  - `vw_dss_inventory_recommendations`
  - `vw_dss_regional_priorities`
  - `vw_dss_area_clusters`
  - `vw_dss_product_priorities`
  - `vw_dss_allocation_recommendations`
  - `vw_dss_product_region_matches`
  - `vw_dss_decision_alerts`
  - `vw_dss_model_evaluation`

## 4.3 Data Flow

1. Raw sales rows from `Sales Report.xlsx` land in `stg_sales_transactions`.
2. The ETL validates dates, products, areas, quantities, costs, and row quality.
3. Valid rows are loaded into `fact_sales_transactions`; aggregate facts are refreshed from that grain.
4. DOH and official PAGASA extracts remain authoritative for disease, RSI, and typhoon signals; NASA POWER and Open-Meteo observations provide a separately labeled weather proxy.
5. Python analytics jobs produce model output rows for forecasts, priorities, inventory recommendations, allocation, product-region matches, alerts, and model evaluation.
6. Dashboard and DSS views expose the latest trusted outputs to the API.
7. The TypeScript gateway exposes a stable frontend contract and falls back to the checked-in JSON reference export when services are unavailable.

## 4.4 Runtime Behavior

- The TypeScript backend probes the Python analytics and product microservices and starts missing services from `services.analytics_service.app` and `services.product_service.app` during local `npm run dev`.
- If the microservices are unavailable, it reads the same warehouse views through the reference export.
- The runtime prefers the warehouse views. If the warehouse is unavailable in this workspace, the gateway and analytics helpers can fall back to the checked-in reference export so the dashboard still runs locally.

## 4.5 Current Deliverables

- `frontend/` renders the MedShield dashboard in Next.js + TypeScript.
- The Data Upload page accepts `.xlsx` and `.csv` MedShield sales files and sends them to the authenticated cleaning pipeline.
- The sales ingestion pipeline standardizes DR numbers, area names, product casing, numeric values, dates, margin percentage, duplicate flags, and row quality before publishing records.
- Year-specific sales uploads replace only the matching year(s) in the processed history; full workbook uploads replace all years included in that workbook.
- The View Sales Data page exposes all 13 standardized columns with year, search, quality, page-size, pagination controls, direct messy `.xlsx`/`.csv` upload, and filtered computation cards for sums, averages, row counts, unique DR numbers, and SKU count.
- The Weather API Validation page exposes daily API observations for validation, monthly planning aggregates for weather regressors, provider provenance, validation summary cards, all-territory refresh, and controlled NASA POWER or Open-Meteo refresh.
- Local processed artifacts are stored under `data/medshield/processed`; raw runtime uploads are ignored by Git.
- `backend/` exposes the dashboard API in TypeScript.
- `backend/src/snapshot.ts` mirrors the analytics fallback for the TypeScript gateway.
- `services/shared_snapshot.py` reads the warehouse views for the Python analytics services.
- `supabase/seed.sql` seeds the current data into the connected schema.

## 4.6 Current Workbook Reconciliation

- 20,418 extracted rows.
- 19,674 accepted rows.
- 744 rejected rows with missing required area, date, or product values.
- 100 exact duplicates retained and flagged.
- All 13 source columns matched across sheets 2021-2025.

## 4.7 Next Data Pipeline Step

When the new datasets or API extracts are provided, the ETL should:

1. Load them into staging tables.
2. Profile row quality and record results in `etl_pipeline_run`.
3. Upsert dimensions for dates, areas, products, source systems, and model registry entries.
4. Insert or refresh transaction facts, external signal facts, and aggregate facts.
5. Run the analytics services to populate model-output facts.
6. Validate `vw_dashboard_*` and `vw_dss_*` views before dashboard release.
