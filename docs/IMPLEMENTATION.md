# Chapter 4 - Implementation

This document describes the current implementation of the MedShield Business Analytics Decision Support System in this workspace.

## 4.1 System Overview

- Frontend: Next.js App Router, React, and TypeScript in `frontend/`.
- Backend: Flask API gateway in `backend/` with two Flask microservices in `services/`.
- Database: Supabase PostgreSQL using a connected warehouse schema in `supabase/`.
- Source of truth: warehouse fact tables and dimension tables. When Supabase credentials are unavailable in the workspace, the services can fall back to the checked-in reference export for local execution.

## 4.2 Warehouse Design

The schema in `supabase/migrations/001_init.sql` now uses a connected warehouse model:

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

## 4.3 Data Flow

1. Raw analytics values are loaded into the warehouse seed or future ETL jobs.
2. Dimension tables are populated first.
3. Fact tables store the business measures with foreign keys to the dimensions.
4. Dashboard views aggregate the current snapshot for the API.
5. The backend and microservices read only from the warehouse views.

## 4.4 Runtime Behavior

- The backend first tries the microservices.
- If the microservices are unavailable, it reads the same warehouse views directly.
- The runtime prefers the warehouse views. If the warehouse is unavailable in this workspace, the shared helper can fall back to the checked-in reference export so the dashboard still runs locally.

## 4.5 Current Deliverables

- `frontend/` renders the MedShield dashboard in Next.js + TypeScript.
- `backend/` exposes the dashboard API.
- `services/shared_snapshot.py` reads the warehouse views.
- `supabase/seed.sql` seeds the current data into the connected schema.

## 4.6 Next Data Pipeline Step

When the new datasets are provided, the ETL should:

1. Load them into staging tables.
2. Upsert the dimensions.
3. Insert or refresh the fact tables.
4. Refresh the dashboard views or materialized views if needed.
