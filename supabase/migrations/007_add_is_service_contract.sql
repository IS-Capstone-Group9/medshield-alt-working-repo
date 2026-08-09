-- Migration to add is_service_contract column to handle bulk service contracts

do $$
begin
  -- 1. Alter dim_product
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'dim_product') then
    alter table public.dim_product add column if not exists is_service_contract boolean not null default false;
    update public.dim_product set is_service_contract = true where product_name like '%#%';
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'medshield_common' and table_name = 'dim_product') then
    alter table medshield_common.dim_product add column if not exists is_service_contract boolean not null default false;
    update medshield_common.dim_product set is_service_contract = true where product_name like '%#%';
  end if;

  -- 2. Alter dim_product_alias
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'dim_product_alias') then
    alter table public.dim_product_alias add column if not exists is_service_contract boolean not null default false;
    update public.dim_product_alias set is_service_contract = true where raw_product like '%#%' or is_contract_name = true;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'medshield_common' and table_name = 'dim_product_alias') then
    alter table medshield_common.dim_product_alias add column if not exists is_service_contract boolean not null default false;
    update medshield_common.dim_product_alias set is_service_contract = true where raw_product like '%#%' or is_contract_name = true;
  end if;

  -- 3. Alter stg_sales_transactions
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'stg_sales_transactions') then
    alter table public.stg_sales_transactions add column if not exists is_service_contract boolean not null default false;
    update public.stg_sales_transactions set is_service_contract = true where product like '%#%' or is_contract_name = true;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'medshield_sales' and table_name = 'stg_sales_transactions') then
    alter table medshield_sales.stg_sales_transactions add column if not exists is_service_contract boolean not null default false;
    update medshield_sales.stg_sales_transactions set is_service_contract = true where product like '%#%' or is_contract_name = true;
  end if;

  -- 4. Alter fact_sales_transactions
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'fact_sales_transactions') then
    alter table public.fact_sales_transactions add column if not exists is_service_contract boolean not null default false;
    update public.fact_sales_transactions set is_service_contract = true where product_raw like '%#%' or is_contract_allocation = true;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'medshield_sales' and table_name = 'fact_sales_transactions') then
    alter table medshield_sales.fact_sales_transactions add column if not exists is_service_contract boolean not null default false;
    update medshield_sales.fact_sales_transactions set is_service_contract = true where product_raw like '%#%' or is_contract_allocation = true;
  end if;
end $$;

-- 5. Recreate vw_product_master_status view in public schema if tables exist
create or replace view public.vw_product_master_status as
select
  p.product_key,
  p.product_name,
  coalesce(p.canonical_sku, p.product_name) as canonical_sku,
  p.product_category,
  p.is_medicine,
  p.is_service_contract,
  p.forecast_eligible,
  p.mapping_status,
  count(a.product_alias_key) as alias_count,
  bool_or(coalesce(a.is_contract_name, false)) as has_contract_alias,
  p.review_notes
from public.dim_product p
left join public.dim_product_alias a on a.product_key = p.product_key
group by
  p.product_key,
  p.product_name,
  p.canonical_sku,
  p.product_category,
  p.is_medicine,
  p.is_service_contract,
  p.forecast_eligible,
  p.mapping_status,
  p.review_notes
order by p.mapping_status, p.product_name;

-- 6. Exclude service contracts from vw_dashboard_top_products (public)
create or replace view public.vw_dashboard_top_products as
with latest_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from public.fact_product_summary
)
select
  p.product_name as product,
  f.revenue_amount as revenue,
  f.quantity_sold as qty,
  f.income_amount as income,
  f.abc_classification as abc,
  f.pct_of_total as pct_of_total
from public.fact_product_summary f
join latest_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
join public.dim_product p on p.product_key = f.product_key
where not coalesce(p.is_service_contract, false)
order by f.revenue_amount desc, p.product_name asc
limit 15;

-- 7. Exclude service contracts from vw_dashboard_top_products (medshield_sales schema if present)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'medshield_sales' and table_name = 'fact_product_summary') then
    execute 'create or replace view medshield_sales.vw_dashboard_top_products as
      with latest_snapshot as (
        select max(snapshot_date_key) as snapshot_date_key
        from medshield_sales.fact_product_summary
      )
      select
        p.product_name as product,
        f.revenue_amount as revenue,
        f.quantity_sold as qty,
        f.income_amount as income,
        f.abc_classification as abc,
        f.pct_of_total as pct_of_total
      from medshield_sales.fact_product_summary f
      join latest_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
      join medshield_common.dim_product p on p.product_key = f.product_key
      where not coalesce(p.is_service_contract, false)
      order by f.revenue_amount desc, p.product_name asc
      limit 15;';
  end if;
end $$;

-- 8. Exclude service contracts from vw_dss_product_priorities
create or replace view public.vw_dss_product_priorities as
select
  d.year_month as snapshot_period,
  p.product_name as product,
  m.model_code,
  f.abc_classification,
  f.pareto_rank,
  f.cumulative_revenue_pct,
  f.demand_score,
  f.margin_score,
  f.xgboost_urgency_score,
  f.risk_level,
  f.recommendation
from public.fact_product_priority f
join public.dim_date d on d.date_key = f.snapshot_date_key
join public.dim_product p on p.product_key = f.product_key
left join public.dim_model m on m.model_key = f.model_key
where not coalesce(p.is_service_contract, false)
order by f.pareto_rank;

