# MedShield DSS Database Schema Reference (Optimized)

This reference document defines the complete database schema for the MedShield Decision Support System (DSS). It outlines primary keys, column types, custom enum types, performance indexes, and default values across schemas.

---

##  Recent Schema Optimizations (Migration 008)
To support sub-second query latency for the Decision Support dashboard, the following optimizations have been applied:
1.  **Native Postgres ENUM Types:** Replaced flat `text` check constraints on status and severity columns with strict Postgres Enums (`mapping_status_enum`, `severity_level_enum`, `alert_type_enum`, `alert_status_enum`).
2.  **Composite Join Indexes:** Added multi-column composite B-Tree indexes on foreign keys in all main fact tables to speed up star-schema slicing and dicing.
3.  **Automatic Row Lineage Triggers:** Added `updated_at` columns and triggers to track mutation history of dim records automatically.

---

## 1. Custom Postgres Enum Types

###  `medshield_common.mapping_status_enum`
*   **Allowed Values:** `proposed`, `approved`, `rejected`, `needs_review`

###  `medshield_analytics.severity_level_enum`
*   **Allowed Values:** `low`, `medium`, `high`, `critical`

###  `medshield_analytics.alert_type_enum`
*   **Allowed Values:** `stock_gap`, `disease_surge`, `weather_risk`, `allocation`, `forecast_variance`

###  `medshield_analytics.alert_status_enum`
*   **Allowed Values:** `open`, `acknowledged`, `closed`

---

## 2. medshield_common Schema (Common Dimensions)

###  `medshield_common.dim_date`
*   **Description:** Date dimension table. RLS Enabled.
*   **Primary Key:** `date_key` (integer/int4)
*   **Columns:**
    *   `date_key` (integer) - Primary Key
    *   `calendar_date` (date) - Unique
    *   `calendar_year` (smallint)
    *   `calendar_quarter` (smallint)
    *   `calendar_month` (smallint)
    *   `month_name` (text)
    *   `month_short_name` (text)
    *   `year_month` (text)
    *   `day_of_month` (smallint)
    *   `is_month_end` (boolean) - Default: `true`
    *   `created_at` (timestamptz) - Default: `now()`

###  `medshield_common.dim_month`
*   **Description:** Month lookup table (1 to 12). RLS Enabled.
*   **Primary Key:** `month_key` (smallint)
*   **Columns:**
    *   `month_key` (smallint) - Check Constraint: `month_key >= 1 AND month_key <= 12`
    *   `month_name` (text) - Unique
    *   `month_short_name` (text) - Unique

###  `medshield_common.dim_area`
*   **Description:** Geographic territory and area mapping dimension. RLS Enabled.
*   **Primary Key:** `area_key` (bigint identity ALWAYS)
*   **Columns:**
    *   `area_key` (bigint) - Primary Key
    *   `area_name` (text) - Unique
    *   `area_group` (text) - Default: `'territory'`
    *   `area_type` (text) - Default: `'unmapped'` | Check Constraint: `in (territory, customer_type, business_line, unmapped)`
    *   `region_name` (text)
    *   `province_city` (text)
    *   `latitude` (numeric)
    *   `longitude` (numeric)
    *   `mapping_status` (`mapping_status_enum`) - Default: `'needs_review'`
    *   `review_notes` (text)
    *   `created_at` (timestamptz) - Default: `now()`
    *   `updated_at` (timestamptz) - Default: `now()` (updated via trigger)

###  `medshield_common.dim_product`
*   **Description:** Pharmaceutical product master catalog. RLS Enabled.
*   **Primary Key:** `product_key` (bigint identity ALWAYS)
*   **Columns:**
    *   `product_key` (bigint) - Primary Key
    *   `product_name` (text) - Unique
    *   `abc_classification` (text)
    *   `product_group` (text)
    *   `canonical_sku` (text)
    *   `brand_name` (text)
    *   `generic_name` (text)
    *   `strength` (text)
    *   `dosage_form` (text)
    *   `pack_size` (text)
    *   `product_category` (text) - Default: `'needs_review'`
    *   `is_medicine` (boolean)
    *   `forecast_eligible` (boolean) - Default: `false`
    *   `mapping_status` (`mapping_status_enum`) - Default: `'needs_review'`
    *   `review_notes` (text)
    *   `created_at` (timestamptz) - Default: `now()`
    *   `updated_at` (timestamptz) - Default: `now()` (updated via trigger)

###  `medshield_common.dim_product_alias`
*   **Description:** Maps raw product names from transactional data to canonical SKUs. RLS Enabled.
*   **Primary Key:** `product_alias_key`
*   **Columns & FKs:**
    *   `raw_product` (text) - Unique
    *   `product_key` (bigint) - Foreign Key -> `medshield_common.dim_product.product_key`

---

## 3. medshield_sales Schema (Transactional & Descriptive Sales Metrics)

###  `medshield_sales.fact_monthly_sales`
*   **Primary Key:** `monthly_sales_key` (bigint identity ALWAYS)
*   **Columns & FKs:**
    *   `period_date_key` -> `medshield_common.dim_date.date_key` [INDEXED]
    *   `snapshot_date_key` -> `medshield_common.dim_date.date_key` [INDEXED]
    *   `revenue_amount` (numeric) - Default: `0`
    *   `income_amount` (numeric) - Default: `0`
    *   `source_period` (text)
    *   `source_system` (text) - Default: `'medshield_dashboard'`
    *   `loaded_at` (timestamptz) - Default: `now()`

###  `medshield_sales.fact_area_summary`
*   **Primary Key:** `area_summary_key` (bigint identity ALWAYS)
*   **Columns & FKs:**
    *   `snapshot_date_key` -> `medshield_common.dim_date.date_key`
    *   `area_key` -> `medshield_common.dim_area.area_key` [INDEXED]
    *   `revenue_amount` (numeric) - Default: `0`
    *   `income_amount` (numeric) - Default: `0`

###  `medshield_sales.fact_product_summary`
*   **Primary Key:** `product_summary_key` (bigint identity ALWAYS)
*   **Columns & FKs:**
    *   `snapshot_date_key` -> `medshield_common.dim_date.date_key`
    *   `product_key` -> `medshield_common.dim_product.product_key` [INDEXED]
    *   `revenue_amount` (numeric) - Default: `0`
    *   `quantity_sold` (numeric) - Default: `0`
    *   `abc_classification` (text) - Check Constraint: `in ('A', 'B', 'C')`

###  `medshield_sales.fact_year_summary`
*   **Primary Key:** `year_summary_key` (bigint identity ALWAYS)
*   **Columns & FKs:**
    *   `snapshot_date_key` -> `medshield_common.dim_date.date_key`
    *   `year_date_key` -> `medshield_common.dim_date.date_key`

###  `medshield_sales.fact_seasonality`
*   **Primary Key:** `seasonality_key` (bigint identity ALWAYS)
*   **Columns & FKs:**
    *   `snapshot_date_key` -> `medshield_common.dim_date.date_key`
    *   `month_key` -> `medshield_common.dim_month.month_key`

###  `medshield_sales.fact_sales_transactions`
*   **Primary Key:** `sales_transaction_key`
*   **Columns & FKs:**
    *   `delivery_date_key` -> `medshield_common.dim_date.date_key` [INDEXED]
    *   `area_key` -> `medshield_common.dim_area.area_key` [INDEXED]
    *   `product_key` -> `medshield_common.dim_product.product_key` [INDEXED]
    *   `source_system_key` -> `medshield_etl.dim_source_system.source_system_key`
    *   `pipeline_run_key` -> `medshield_etl.etl_pipeline_run.pipeline_run_key`
    *   *Composite Index (delivery_date_key, area_key, product_key) active.*

---

## 4. medshield_analytics Schema (Forecasts & Prescriptive Output)

###  `medshield_analytics.fact_demand_forecast`
*   **Primary Key:** `demand_forecast_key`
*   **Columns & FKs:**
    *   `forecast_run_key` -> `medshield_analytics.fact_forecast_run.forecast_run_key`
    *   `forecast_period_date_key` -> `medshield_common.dim_date.date_key` [INDEXED]
    *   `area_key` -> `medshield_common.dim_area.area_key` [INDEXED]
    *   `product_key` -> `medshield_common.dim_product.product_key` [INDEXED]

###  `medshield_analytics.fact_inventory_recommendation`
*   **Primary Key:** `inventory_recommendation_key`
*   **Columns & FKs:**
    *   `snapshot_date_key` -> `medshield_common.dim_date.date_key` [INDEXED]
    *   `product_key` -> `medshield_common.dim_product.product_key` [INDEXED]
    *   `area_key` -> `medshield_common.dim_area.area_key` [INDEXED]
    *   *Includes EOQ, Safety Stock, Lead Time, and Ordering Costs.*

###  `medshield_analytics.fact_decision_alert`
*   **Primary Key:** `decision_alert_key`
*   **Columns & FKs:**
    *   `snapshot_date_key` -> `medshield_common.dim_date.date_key` [INDEXED]
    *   `alert_date_key` -> `medshield_common.dim_date.date_key` [INDEXED]
    *   `area_key` -> `medshield_common.dim_area.area_key` [INDEXED]
    *   `product_key` -> `medshield_common.dim_product.product_key` [INDEXED]
    *   `alert_type` (`alert_type_enum`)
    *   `severity` (`severity_level_enum`)
    *   `status` (`alert_status_enum`) - Default: `'open'`

---

## 5. High-Performance Index Summary
To speed up dashboard loading times, the following indices are declared in `008_schema_performance_lineage_indices.sql`:
*   `idx_fact_sales_transactions_composite` on `medshield_sales.fact_sales_transactions (delivery_date_key, area_key, product_key)`
*   `idx_fact_disease_signal_composite` on `medshield_external.fact_disease_signal (period_date_key, area_key)`
*   `idx_fact_weather_signal_composite` on `medshield_external.fact_weather_signal (period_date_key, area_key)`
*   `idx_fact_inventory_recommendation_composite` on `medshield_analytics.fact_inventory_recommendation (snapshot_date_key, product_key, area_key)`
*   `idx_fact_decision_alert_composite` on `medshield_analytics.fact_decision_alert (snapshot_date_key, alert_date_key, area_key, product_key)`

---
*Updated: 2026-08-04 | MedShield DSS DB Catalog (v2.0 Optimized)*
