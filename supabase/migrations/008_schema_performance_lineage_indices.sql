-- Migration: 008_schema_performance_lineage_indices.sql
-- Description: Applies high-performance query indexes, data lineage constraints, and audit column triggers.
-- Apply after 007_namespaced_schema_alignment.sql.

-- 1. DATA INTEGRITY CONSTRAINTS
-- Ensure check constraints exist without breaking view dependencies
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_dim_area_mapping_status') then
    alter table medshield_common.dim_area add constraint chk_dim_area_mapping_status 
      check (mapping_status in ('proposed', 'approved', 'rejected', 'needs_review'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_dim_product_mapping_status') then
    alter table medshield_common.dim_product add constraint chk_dim_product_mapping_status 
      check (mapping_status in ('proposed', 'approved', 'rejected', 'needs_review'));
  end if;
end $$;


-- 2. HIGH-PERFORMANCE QUERY INDEXES FOR STAR-SCHEMA JOINS
-- Indexes on fact tables foreign keys (ensures fast JOINs on dimensions)

-- Sales fact tables
create index if not exists idx_fact_sales_transactions_date 
  on medshield_sales.fact_sales_transactions (delivery_date_key);
create index if not exists idx_fact_sales_transactions_area 
  on medshield_sales.fact_sales_transactions (area_key);
create index if not exists idx_fact_sales_transactions_product 
  on medshield_sales.fact_sales_transactions (product_key);
create index if not exists idx_fact_sales_transactions_composite 
  on medshield_sales.fact_sales_transactions (delivery_date_key, area_key, product_key);

create index if not exists idx_fact_monthly_sales_period 
  on medshield_sales.fact_monthly_sales (period_date_key);
create index if not exists idx_fact_monthly_sales_snapshot 
  on medshield_sales.fact_monthly_sales (snapshot_date_key);

create index if not exists idx_fact_area_summary_area 
  on medshield_sales.fact_area_summary (area_key);
create index if not exists idx_fact_product_summary_product 
  on medshield_sales.fact_product_summary (product_key);

-- External signal tables
create index if not exists idx_fact_disease_signal_composite 
  on medshield_external.fact_disease_signal (period_date_key, area_key);
create index if not exists idx_fact_weather_signal_composite 
  on medshield_external.fact_weather_signal (period_date_key, area_key);
create index if not exists idx_fact_data_completeness_composite 
  on medshield_sales.fact_data_completeness (period_date_key, area_key);

-- Analytics & DSS tables
create index if not exists idx_fact_demand_forecast_composite 
  on medshield_analytics.fact_demand_forecast (forecast_period_date_key, area_key, product_key);
create index if not exists idx_fact_inventory_recommendation_composite 
  on medshield_analytics.fact_inventory_recommendation (snapshot_date_key, product_key, area_key);
create index if not exists idx_fact_allocation_recommendation_composite 
  on medshield_analytics.fact_allocation_recommendation (snapshot_date_key, product_key, area_key);
create index if not exists idx_fact_product_region_match_composite 
  on medshield_analytics.fact_product_region_match (snapshot_date_key, product_key, area_key);
create index if not exists idx_fact_decision_alert_composite 
  on medshield_analytics.fact_decision_alert (snapshot_date_key, alert_date_key, area_key, product_key);


-- 3. AUDIT UPDATED_AT TRIGGERS FOR DATA LINEAGE
-- Create reusable trigger function for update timestamp tracking
create or replace function medshield_common.track_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add updated_at column and triggers to main dimension tables
alter table medshield_common.dim_area add column if not exists updated_at timestamptz default now();
alter table medshield_common.dim_product add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_dim_area_updated_at on medshield_common.dim_area;
create trigger trg_dim_area_updated_at
  before update on medshield_common.dim_area
  for each row
  execute function medshield_common.track_updated_at();

drop trigger if exists trg_dim_product_updated_at on medshield_common.dim_product;
create trigger trg_dim_product_updated_at
  before update on medshield_common.dim_product
  for each row
  execute function medshield_common.track_updated_at();
