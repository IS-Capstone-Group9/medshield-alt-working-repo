# Database

The Supabase PostgreSQL warehouse is the source of truth for persisted MedShield analytics data.

For the current `.env` boundary, Supabase schema inventory, and analytics table-gap checklist, see `docs/ENV_SCHEMA_ALIGNMENT_GUIDE.md`.

## Current Migration Order

1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_accounts.sql`
3. `supabase/migrations/003_auth_rpc.sql`
4. `supabase/migrations/004_dss_schema.sql`
5. `supabase/migrations/005_sales_ingestion_weather.sql`
6. `supabase/migrations/006_business_rules_master_data.sql`
7. `supabase/migrations/007_namespaced_schema_alignment.sql`
8. `supabase/migrations/008_schema_performance_lineage_indices.sql`
9. `supabase/migrations/009_saas_compliance_audit.sql`
10. `supabase/migrations/010_enable_rls.sql`
11. `supabase/migrations/011_supabase_auth_account_bridge.sql`
12. `supabase/migrations/012_retire_legacy_auth_surface.sql`
13. `supabase/migrations/013_databricks_yearly_candidate_sync.sql`
14. `supabase/migrations/014_databricks_yearly_candidate_permissions.sql`
15. `supabase/seed.sql` or app ingestion for the target schema

## Schema Direction

The schema now supports four layers:

| Layer | Tables / Views | Purpose |
|---|---|---|
| Master data control | `medshield_common.dim_product_alias`, `public.vw_product_master_status`, `public.vw_area_mapping_status` | Control SKU alias approval, contract-name breakdown, and area classification. |
| Source/staging | `medshield_sales.stg_sales_transactions`, `medshield_external.stg_doh_historical`, `medshield_external.stg_pagasa_historical`, `medshield_external.stg_weather_api_observations`, `medshield_etl.etl_pipeline_run`, `medshield_etl.etl_source_extract` | Preserve workbook and external extract lineage. |
| Warehouse facts | `medshield_sales.fact_sales_transactions`, `medshield_sales.fact_monthly_sales`, `medshield_sales.fact_area_summary`, `medshield_sales.fact_product_summary`, `medshield_sales.fact_year_summary`, `medshield_sales.fact_seasonality`, `medshield_sales.fact_data_completeness` | Store sales facts, dashboard aggregates, and period-level source completeness. |
| DSS outputs | `medshield_analytics.fact_demand_forecast`, `medshield_analytics.fact_product_priority`, `medshield_analytics.fact_inventory_recommendation`, `medshield_analytics.fact_regional_priority`, `medshield_analytics.fact_decision_alert`, and related views | Store model outputs used by the decision-support dashboard. |

## Databricks Yearly Candidate Pilot

Migration `013` creates the protected shadow table
`medshield_sales.databricks_yearly_sales_candidate` and the service-role-only RPC
`public.sync_databricks_yearly_sales_candidate`.

Migration `014` restores the least-privilege `service_role` schema, table, sequence,
and function grants required by that security-invoker RPC. It does not grant access
to `anon` or `authenticated` and does not publish candidate data to dashboard facts.

The pilot stores exactly one validated row for each year from 2017 through 2025 and records
`etl_pipeline_run` plus `etl_source_extract` lineage. Replacement occurs inside an atomic
database block: validation, row-count, year, transaction-total, or checksum failure rolls back
the cache change. Direct access is revoked from `anon` and `authenticated` roles.

The table is deliberately not a publication fact. The approved revenue measure is
`net_sales_candidate`; `transfer_value_candidate` is total acquisition cost and
`gross_margin_candidate` is transaction gross profit. Promotion to published dashboard facts
still requires a controlled, reconciled cutover.

The obsolete flat `analytics_*` tables are dropped by `004_dss_schema.sql` because the `vw_dashboard_*` and `vw_dss_*` views are now the API surface.

## Workbook Grain

`data/medshield/raw/sales/Sales Report.xlsx` contains one delivered product line per row across sheets `2021` to `2025`. The normalized transaction fact stores:

- Area
- DR number
- Delivery date
- Product
- Quantity
- Cost, discount, net cost, trade price, total trade price
- Net income and margin
- Source workbook, sheet, row number, and source hash

Rows with missing or messy values should land in `stg_sales_transactions` first, then only valid normalized records should move into `fact_sales_transactions`.

Migration `005` fixes legacy date/snapshot uniqueness, adds pipeline lineage, creates `vw_sales_transactions`, and installs `refresh_sales_aggregates`.

Migration `006` aligns the warehouse with approved business definitions:

- Dashboard and model revenue aggregates use `net_cost_amount` (source Net CP).
- `total_trade_price_amount` is total acquisition cost (source Total TP).
- `net_income_amount` is transaction gross margin/profit, not company net profit.
- Product aliases and contract-name `#` rows have a controlled mapping table.
- Area mappings separate `territory`, `customer_type`, and `business_line`.
- 2025 completeness status is stored so partial months are not treated as complete holdout data.

## External Signals

External disease and weather values are supporting signals, not replacements for sales data:

- `fact_disease_signal`: disease intensity indicator, case count, incidence rate, alert level.
- `fact_weather_signal`: rainfall, rainy days, temperature, humidity, wind, provider, high-wind watch, bounded adjustment factor, and `rainfall_severity_proxy`.

Each external value must have a `source_system_key` and source period.

Raw staging, transaction facts, and ETL ledgers have no anonymous read policy. Writes use the server-only service-role key.

## Model Output Tables

| Model | Table |
|---|---|
| Prophet / Prophet with external regressors | `fact_forecast_run`, `fact_demand_forecast` |
| ABC/Pareto and XGBoost urgency | `fact_product_priority` |
| Area Revenue Clustering | `fact_area_cluster` |
| MCDA regional ranking | `fact_regional_priority` |
| EOQ, ROP, safety stock | `fact_inventory_recommendation` |
| Linear programming allocation | `fact_allocation_recommendation` |
| Collaborative filtering product-region matching | `fact_product_region_match` |
| Rule-based alerts | `fact_decision_alert` |
| Model validation | `fact_model_evaluation` |
