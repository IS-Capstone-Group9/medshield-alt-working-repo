# API Gateway

The canonical API gateway is implemented in TypeScript under `backend/`.
During local development the gateway probes the Python `/health` endpoints and starts the analytics and product Flask services when they are not already running.

## Responsibilities

- Proxy dashboard data requests to the Python analytics services.
- Handle auth requests and fallback behavior.
- Return consistent JSON responses to the frontend.

## Auth Contract

- `POST /api/auth/login`
  - Body: `{ "username": "...", "password": "...", "remember": true | false }`
  - In Supabase mode, `username` must be the user's email address and the returned access token is the Supabase Auth access token.
  - Returns: `{ "access_token": "...", "token_type": "Bearer", "expires_at": "...", "user": { ... } }`
- `GET /api/auth/me`
  - Requires `Authorization: Bearer <token>`.
  - Returns the current gateway session user.
- `POST /api/auth/logout`
  - Requires `Authorization: Bearer <token>`.
  - Revokes the gateway session token.
- `POST /api/auth/signup`

In Supabase mode, the frontend signs in through Supabase Auth and sends the Supabase access token as a bearer token for dashboard and model endpoints. In local fallback mode, the gateway issues its own development bearer token.

## Dashboard Contract

- `GET /api/summary`
- `GET /api/monthly`
- `GET /api/by_area`
- `GET /api/products`
- `GET /api/year_summary`
- `GET /api/seasonality`

All dashboard contract endpoints require `Authorization: Bearer <token>` except `GET /api/health`.

## DSS Model Contract

These endpoints expose the paper-aligned decision-support outputs. The TypeScript gateway reads them from the Python services first, then falls back to the checked-in reference export.

| Endpoint | Source View / Service | Purpose |
|---|---|---|
| `GET /api/forecasts` | `vw_dss_forecasts` / analytics service | Prophet baseline and external-regressor demand forecast values. |
| `GET /api/external_signals` | `vw_dss_external_signals` / analytics service | DOH disease intensity and PAGASA/weather rainfall severity signals. |
| `GET /api/regional_priorities` | `vw_dss_regional_priorities` / analytics service | MCDA regional ranking using revenue, growth, and outbreak risk. |
| `GET /api/area_clusters` | `vw_dss_area_clusters` / analytics service | K-Means-style area cluster outputs. |
| `GET /api/decision_alerts` | `vw_dss_decision_alerts` / analytics service | Rule-based stock, disease, weather, allocation, and forecast alerts. |
| `GET /api/model_evaluation` | `vw_dss_model_evaluation` / analytics service | Model validation metrics and benchmark status. |
| `GET /api/inventory_recommendations` | `vw_dss_inventory_recommendations` / product service | EOQ, reorder point, safety stock, stock gap, and risk recommendations. |
| `GET /api/product_priorities` | `vw_dss_product_priorities` / product service | ABC/Pareto and XGBoost product prioritization outputs. |
| `GET /api/allocation_recommendations` | `vw_dss_allocation_recommendations` / product service | Linear programming stock allocation recommendations. |
| `GET /api/product_region_matches` | `vw_dss_product_region_matches` / product service | Collaborative filtering product-region matching outputs. |

## Sales Ingestion Contract

All routes require a bearer token.

| Endpoint | Purpose |
|---|---|
| `POST /api/sales/upload?file_name=Sales%20Report.xlsx` | Accept a raw `.xlsx` or `.csv` body, detect the input stage, preserve raw staging values, standardize all 13 MedShield columns, and persist the processed dataset. |
| `GET /api/sales/status` | Return checksum, detection result, per-year counts, standardizations, and quality issues. |
| `GET /api/sales/transactions?year=2025&page=1&page_size=25&quality_status=all&search=` | Return server-paginated canonical transaction rows. |
| `GET /api/sales/summary?year=2025&quality_status=all&search=` | Return filtered sums, averages, row counts, unique DR numbers, and SKU count for View Sales Data computations. |

The frontend exposes this contract from Data Upload and from View Sales Data -> Upload messy XLSX/CSV. Uploaded files are treated as raw until the cleaning report says otherwise.

Yearly uploads replace only the uploaded year(s) in the processed history. Full workbook uploads replace all included years. This prevents a 2025 upload from deleting a previously loaded 2023 history.

## Weather Contract

| Endpoint | Purpose |
|---|---|
| `POST /api/weather/refresh` | Fetch a bounded historical range for approved territories from `nasa_power` or `open_meteo`. |
| `GET /api/weather/effects?year=2025&area=Quezon&grain=daily` | Return same-area, same-day sales and weather validation rows. |
| `GET /api/weather/effects?year=2025&area=Quezon&grain=monthly` | Return same-area, same-month sales and weather planning aggregates. |

The frontend exposes this contract from Weather API Validation. The view shows provider provenance, loaded period, daily/monthly grain, weather rows loaded, sales-matched rows, severity proxy, alert level, and bounded planning uplift.

NASA POWER and Open-Meteo output is labeled `rainfall_severity_proxy`. It is not official PAGASA RSI or a typhoon warning.

## External API/Data Scope

Use credible sources that match the capstone scope:

- DOH disease data: prefer Department of Health FOI/Open Data exports when a stable public API is unavailable.
- PAGASA weather data: prefer DOST-PAGASA rainfall, climate, and typhoon products.
- NASA POWER Daily: historical meteorological backfill.
- Open-Meteo Historical: secondary validation or fallback.

Do not call external APIs directly from the frontend. External data should be extracted by backend/ETL jobs, stored in the warehouse with lineage, and exposed through the gateway.
