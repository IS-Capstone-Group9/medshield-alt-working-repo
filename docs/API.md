# API Gateway

The canonical gateway is the TypeScript service in `backend/`. All dashboard routes require `Authorization: Bearer <token>` except `/api/health`.

## Source contract

Dashboard responses come from Databricks Unity Catalog. The gateway does not start the legacy Python analytics services and does not read a checked-in sales snapshot. A failed Databricks query returns `502` or `503` with a Databricks error code; it never returns mock data.

The active objects are:

- `workspace.medshield_gold.sales_restart_fact_candidate`
- `workspace.medshield_gold.vw_dashboard_monthly_sales_candidate`
- `workspace.medshield_gold.vw_dashboard_yearly_sales_candidate`
- `workspace.medshield_gold.vw_dashboard_area_yearly_candidate`
- `workspace.medshield_gold.vw_dashboard_product_yearly_candidate`
- `workspace.medshield_gold.vw_dss_external_signals_candidate`

## Authentication

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/complete-password-reset`

Supabase Auth remains the production identity provider. Databricks credentials stay on the server and are never returned by an API.

## Core dashboard

- `GET /api/dashboard_status`
- `GET /api/summary`
- `GET /api/monthly?year=2025`
- `GET /api/by_area`
- `GET /api/products?limit=15`
- `GET /api/year_summary`
- `GET /api/seasonality`
- `GET /api/forecasts`
- `GET /api/external_signals`
- `GET /api/inventory_recommendations`
- `GET /api/regional_priorities`
- `GET /api/area_clusters`
- `GET /api/product_priorities`
- `GET /api/allocation_recommendations`
- `GET /api/product_region_matches`
- `GET /api/decision_alerts`
- `GET /api/model_evaluation`

Unpublished output arrays are empty. The gateway does not synthesize model results.

## Detailed sales and decision support

- `GET /api/sales/status`
- `GET /api/sales/transactions?year=2025&page=1&page_size=25&quality_status=all&search=`
- `GET /api/sales/summary?year=2025&quality_status=all&search=`
- `GET /api/sales/heatmap`
- `GET /api/sales/sectors`
- `GET /api/sales/forecast-validation?sector=Unknown&product=&metric=revenue`
- `GET /api/sales/external-regression?...`
- `GET /api/sales/planning-shortlist?sector=Unknown&territory=Quezon`
- `POST /api/sales/planning-solve`

Buyer ownership is not published, so the sector contract uses `Unknown`. External regression returns `status: "blocked"` until approved DOH/PAGASA territory joins exist. Forecast validation publishes transparent seasonal-naive and last-observation baselines derived from Databricks history; it does not label either model as approved.

`POST /api/sales/upload` returns `409 DATABRICKS_INGESTION_REQUIRED`. Files must enter through the Databricks pipeline.

## External observations

- `GET /api/weather/effects?year=2024&area=Quezon&grain=monthly`

This route reads PAGASA observations from the external-signals Gold view. Temperature, humidity, wind, sales matches, and planning uplift remain unavailable when Databricks has not published them.

`POST /api/weather/refresh` returns `409 DATABRICKS_INGESTION_REQUIRED`. PAGASA refreshes run in Databricks.

## Databricks administration

- `GET /api/integrations/databricks/status`
- `POST /api/integrations/databricks/sync/yearly`

These existing administrator routes verify the connection and maintain the candidate cache. The live dashboard reads Databricks directly and does not depend on that Supabase cache.

## Disabled legacy endpoints

The previous Python/local endpoints for therapeutic categories, procurement orders, seasonal matrices, model summaries, MCDA, EOQ, and seasonal restock details return `503 DATABRICKS_VIEW_REQUIRED`. They can be re-enabled only after equivalent approved Databricks Gold views are published.
