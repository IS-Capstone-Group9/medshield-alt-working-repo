# API Gateway

## Descriptive remediation contract

`GET /api/sales/sectors` now returns actual `date`, source `area`, eligible
`income`, `margin_revenue_basis`, `positive_sales`, signed `returns_value`,
source-adjustment provenance, and proposed buyer/warehouse geography status.
It does not split Mindoro or manufacture daily observations. Aggregate net revenue
is conserved; a null amount is not an observed zero.

`GET /api/seasonality/stl` requires authentication. It returns version-matched Gold
STL components and parameters, or HTTP 503 `STL_UNAVAILABLE`. Missing STL does not
remove financial reporting and never triggers a local-file fallback.

Fact-based gateway reads are pinned per process. `data_status.release` and source
metadata identify the fact Delta version and dataset/policy/mapping hashes. Use
`DATABRICKS_DESCRIPTIVE_FACT_VERSION` plus a controlled restart for an explicit
candidate version; approved release activation remains unfinished.

Product ABC uses positive eligible sales with signed returns shown separately;
`abc_policy_status=CANDIDATE_PENDING_CEO_APPROVAL` is mandatory until that policy
is accepted. This is source-label financial analysis, not medical SKU validation.


The canonical gateway is the Express and TypeScript service in `backend/`. All dashboard routes require `Authorization: Bearer <token>` except `GET /api/health` and the authentication entry points.

## Source contract

Dashboard responses come from Databricks Unity Catalog. The gateway does not start the legacy Python analytics services and does not read a checked-in sales snapshot. A failed Databricks query returns a `502` or `503` response with an error code; it never returns mock or local analytical data.

Primary objects:

- `workspace.medshield_gold.sales_restart_fact_candidate`
- `workspace.medshield_gold.vw_dashboard_monthly_sales_candidate`
- `workspace.medshield_gold.vw_dashboard_yearly_sales_candidate`
- `workspace.medshield_gold.vw_dashboard_area_yearly_candidate`
- `workspace.medshield_gold.sales_restart_business_product_yearly_candidate`
- `workspace.medshield_gold.vw_dss_external_signals_candidate`
- `workspace.medshield_gold.vw_weather_nasa_power_monthly_candidate`

Responses identify Databricks as the source and report candidate status where applicable. Buyer, geographic, forecast-baseline, prioritization, and scenario responses may be calculated in the gateway from these Gold inputs; they are not independent data sources.

## Health

`GET /api/health` is public and reports gateway health, authentication mode, `source: "databricks"`, and `dashboard_fallback: false`. It does not prove that the SQL warehouse or every Gold view is reachable.

## Authentication

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/complete-password-reset`

Supabase Auth is the production identity provider. A local-session mode exists for local development when Supabase is intentionally disabled. Neither mode changes the analytical source.

## Core dashboard

Descriptive contract changes (27 September 2026): monthly `revenue` and `income`
may be null. Rows also expose `transaction_count`, `has_sales_activity`,
`missing`, and nullable `margin_revenue_basis`. A calendar slot without a
transaction is not proof of zero sales. The summary's `avg_margin` and ledger
`gross_margin_rate` divide eligible gross profit by revenue from the same
margin-eligible population. Do not recompute these rates from independently
eligible revenue and profit totals. Rates are percentage points, not fractions.

Product ABC uses the full product revenue population before the top-15 limit,
with cumulative thresholds 80%/95%. Negative product totals or an unsuitable
denominator return `Unclassified`; source labels are not verified medical SKUs.
`/api/seasonality` returns observed calendar-month mean revenue with
`observed_month_count` and `method: observed_calendar_month_average_not_stl`.
It excludes absent months from the mean and is not STL decomposition.

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

Arrays whose approved Databricks outputs do not exist remain empty. The gateway does not fabricate model results.

For `/api/monthly`, omitting `year` returns all monthly history. A supplied value must be one four-digit year between 1000 and 9999; surrounding whitespace is trimmed. Empty, partial, malformed, repeated, or structured values return `400` with an `error` message before loading analytical data. Filtering matches the complete year followed by `-` in the monthly period. Future years are accepted; a valid year with no data returns `200 []`. Authentication is required before input validation.

## Sales and decision support

- `GET /api/sales/status`
- `GET /api/sales/transactions?year=2025&page=1&page_size=25&quality_status=all&search=`
- `GET /api/sales/summary?year=2025&quality_status=all&search=`
- `GET /api/sales/heatmap`
- `GET /api/sales/sectors`
- `GET /api/sales/forecast-validation?sector=All&product=&metric=revenue`
- `GET /api/sales/external-regression?...`
- `GET /api/sales/planning-shortlist?sector=All&territory=Quezon`
- `POST /api/sales/planning-solve`

The sector response uses derived classification rules traceable to `docs/MAPPED_CLIENT_REFERENCE.md`. Government, Private, Internal, and Unknown describe mapped buyer clusters; they are not source-recorded ownership for every row.

Forecast validation publishes transparent seasonal-naive and last-observation baselines derived from Databricks history. It does not label either model as approved. External regression returns `status: "blocked"` until approved DOH/PAGASA territory-month joins exist.

Planning solve uses a Databricks-ranked historical shortlist plus user-entered demand, stock, reserve, pack, cost, supplier, budget, and horizon assumptions. The result is a scenario and cannot execute procurement.

`POST /api/sales/upload` returns `409 DATABRICKS_INGESTION_REQUIRED`. Sales files must enter through the Databricks pipeline.

## External observations

- `GET /api/weather/effects?provider=PAGASA&year=2024&area=Quezon&grain=monthly`
- `GET /api/weather/effects?provider=nasa_power&year=2025&area=Batangas&grain=monthly`
- `POST /api/weather/refresh`

PAGASA reads official historical observations from the external-signals Gold view. NASA POWER reads provider-derived historical proxy observations from `workspace.medshield_gold.vw_weather_nasa_power_monthly_candidate`. Both displayed response sets come from Databricks; the browser does not read a weather file or call NASA directly.

NASA refresh accepts validated `start`, `end`, `areas`, and `provider: "nasa_power"` input from an authorized analyst/administrator. The gateway fetches NASA POWER daily observations, aggregates monthly values, upserts `workspace.medshield_silver.weather_nasa_power_monthly_candidate`, and creates/refreshes the Gold view before returning success. PAGASA refreshes run through the Databricks external-source notebooks.

## Databricks administration

- `GET /api/integrations/databricks/status`
- `GET /api/integrations/databricks/external/status`
- `POST /api/integrations/databricks/sync/yearly`

These administrator routes validate the sales/external contracts and may maintain the protected Supabase yearly candidate cache. The live dashboard still reads Databricks directly and does not depend on that cache.

## Audit

- `POST /api/audit`
- `GET /api/audit`

Audit events use Supabase when configured and may fall back to a local audit file. This fallback never supplies dashboard measures.

## Error rules

| Situation | Expected response |
|---|---|
| Missing/invalid bearer token | `401` |
| Role not allowed | `403` |
| Invalid query/body | `400` |
| Browser sales upload | `409 DATABRICKS_INGESTION_REQUIRED` |
| Databricks not configured | `503` |
| Databricks query/contract failure | `502` or contract-specific validation status |
| Unpublished legacy analytical output | Empty array or `503 DATABRICKS_VIEW_REQUIRED`, depending on route |

See [ARCHITECTURE.md](ARCHITECTURE.md) and [CURRENT_STATE.md](CURRENT_STATE.md).


## Catalog implementation prepared — 27 September 2026

[Product catalog contract](PRODUCT_CATALOG.md) defines independent category,
sellable identity, item kind and transaction evidence. Local deterministic rules,
Gold enrichment, stable-ID API/UI grouping, category filters and provenance-aware
quantity/export handling are implemented. The complete version-16 review includes
37,728 records and 4,561 labels; all remain unresolved because no approved master
entries were supplied. Category approval cannot approve SKU, quantity conversion,
forecasting or observed medical demand. Adjusted provenance remains file-level.

The [operator runbook](CATALOG_DEPLOYMENT.md) specifies catalog-only 03 → 04 → 05 →
06 → publication-readiness → descriptive/catalog validation, version-bound activation
and rollback. This is local preparation: no Databricks writes, release activation
or additional CEO decisions occurred. Databricks remains the sole analytical source.

The three catalog endpoints accept `category=All|Medical|Non-Medical|Unclassified`.
`/api/products` retains its array response and includes selected denominator,
unresolved coverage and release metadata per result. `/api/sales/sectors` returns
complete detailed rows and coverage. `/api/sales/heatmap` returns stable product
metadata plus daily/monthly rows with separate quantity evidence strata. Bounded
pages and count verification reject truncation. No local catalog output is a fallback.
# Predictive API update — 27 September 2026

`/api/sales/forecast-validation` now exposes retrospective fixed-origin company
revenue benchmarks, exact common evaluation keys, unverified reporting coverage
and unpublished future rows. Unapproved sectors/products/units are blocked.
Repeated, structured and unknown filters return 400 after authentication.

`/api/forecasts` and `/api/model_evaluation` preserve their no-query legacy arrays.
Opt in to the coherent metadata envelope with `schema_version=2`. Accepted scalar
filters: `series_id`, `target`, `scope`, `release_id`, `run_id`, `display_start`
(`YYYY-MM`) and `horizon` (`3`, `6`, `12`). Only `company:net_sales:PHP`, company
scope and net_sales are supported. The default window begins in the current
Asia/Manila month. Response states distinguish published, unpublished, empty and
unsupported; storage/consistency failures return 503. No local fallback or process
cache is used. One manifest supplies actuals, backtests, future points and metrics.
True lead remains distinct from display length. See [operation and release gates](PREDICTIVE_OPERATIONS.md).
