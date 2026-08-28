-- Namespaced schema alignment for the MedShield Supabase project.
-- Apply after 006_business_rules_master_data.sql.
--
-- This migration aligns the application with the split schemas visible in
-- Supabase: medshield_common, medshield_etl, medshield_identity,
-- medshield_sales, medshield_external, and medshield_analytics.

create extension if not exists pgcrypto;

create schema if not exists medshield_common;
create schema if not exists medshield_etl;
create schema if not exists medshield_identity;
create schema if not exists medshield_sales;
create schema if not exists medshield_external;
create schema if not exists medshield_analytics;

do $$
begin
  if to_regclass('medshield_common.dim_date') is null and to_regclass('public.dim_date') is not null then
    alter table public.dim_date set schema medshield_common;
  end if;
  if to_regclass('medshield_common.dim_month') is null and to_regclass('public.dim_month') is not null then
    alter table public.dim_month set schema medshield_common;
  end if;
  if to_regclass('medshield_common.dim_area') is null and to_regclass('public.dim_area') is not null then
    alter table public.dim_area set schema medshield_common;
  end if;
  if to_regclass('medshield_common.dim_product') is null and to_regclass('public.dim_product') is not null then
    alter table public.dim_product set schema medshield_common;
  end if;
  if to_regclass('medshield_common.dim_product_alias') is null and to_regclass('public.dim_product_alias') is not null then
    alter table public.dim_product_alias set schema medshield_common;
  end if;
  if to_regclass('medshield_etl.dim_source_system') is null and to_regclass('public.dim_source_system') is not null then
    alter table public.dim_source_system set schema medshield_etl;
  end if;
  if to_regclass('medshield_etl.etl_pipeline_run') is null and to_regclass('public.etl_pipeline_run') is not null then
    alter table public.etl_pipeline_run set schema medshield_etl;
  end if;
  if to_regclass('medshield_etl.etl_source_extract') is null and to_regclass('public.etl_source_extract') is not null then
    alter table public.etl_source_extract set schema medshield_etl;
  end if;
  if to_regclass('medshield_identity.accounts') is null and to_regclass('public.accounts') is not null then
    alter table public.accounts set schema medshield_identity;
  end if;
  if to_regclass('medshield_sales.stg_sales_transactions') is null and to_regclass('public.stg_sales_transactions') is not null then
    alter table public.stg_sales_transactions set schema medshield_sales;
  end if;
  if to_regclass('medshield_sales.fact_sales_transactions') is null and to_regclass('public.fact_sales_transactions') is not null then
    alter table public.fact_sales_transactions set schema medshield_sales;
  end if;
  if to_regclass('medshield_sales.fact_monthly_sales') is null and to_regclass('public.fact_monthly_sales') is not null then
    alter table public.fact_monthly_sales set schema medshield_sales;
  end if;
  if to_regclass('medshield_sales.fact_area_summary') is null and to_regclass('public.fact_area_summary') is not null then
    alter table public.fact_area_summary set schema medshield_sales;
  end if;
  if to_regclass('medshield_sales.fact_product_summary') is null and to_regclass('public.fact_product_summary') is not null then
    alter table public.fact_product_summary set schema medshield_sales;
  end if;
  if to_regclass('medshield_sales.fact_year_summary') is null and to_regclass('public.fact_year_summary') is not null then
    alter table public.fact_year_summary set schema medshield_sales;
  end if;
  if to_regclass('medshield_sales.fact_seasonality') is null and to_regclass('public.fact_seasonality') is not null then
    alter table public.fact_seasonality set schema medshield_sales;
  end if;
  if to_regclass('medshield_sales.fact_data_completeness') is null and to_regclass('public.fact_data_completeness') is not null then
    alter table public.fact_data_completeness set schema medshield_sales;
  end if;
  if to_regclass('medshield_external.stg_doh_historical') is null and to_regclass('public.stg_doh_historical') is not null then
    alter table public.stg_doh_historical set schema medshield_external;
  end if;
  if to_regclass('medshield_external.stg_pagasa_historical') is null and to_regclass('public.stg_pagasa_historical') is not null then
    alter table public.stg_pagasa_historical set schema medshield_external;
  end if;
  if to_regclass('medshield_external.stg_weather_api_observations') is null and to_regclass('public.stg_weather_api_observations') is not null then
    alter table public.stg_weather_api_observations set schema medshield_external;
  end if;
  if to_regclass('medshield_external.fact_disease_signal') is null and to_regclass('public.fact_disease_signal') is not null then
    alter table public.fact_disease_signal set schema medshield_external;
  end if;
  if to_regclass('medshield_external.fact_weather_signal') is null and to_regclass('public.fact_weather_signal') is not null then
    alter table public.fact_weather_signal set schema medshield_external;
  end if;
  if to_regclass('medshield_analytics.dim_model') is null and to_regclass('public.dim_model') is not null then
    alter table public.dim_model set schema medshield_analytics;
  end if;
  if to_regclass('medshield_analytics.fact_forecast_run') is null and to_regclass('public.fact_forecast_run') is not null then
    alter table public.fact_forecast_run set schema medshield_analytics;
  end if;
  if to_regclass('medshield_analytics.fact_demand_forecast') is null and to_regclass('public.fact_demand_forecast') is not null then
    alter table public.fact_demand_forecast set schema medshield_analytics;
  end if;
  if to_regclass('medshield_analytics.fact_product_priority') is null and to_regclass('public.fact_product_priority') is not null then
    alter table public.fact_product_priority set schema medshield_analytics;
  end if;
  if to_regclass('medshield_analytics.fact_area_cluster') is null and to_regclass('public.fact_area_cluster') is not null then
    alter table public.fact_area_cluster set schema medshield_analytics;
  end if;
  if to_regclass('medshield_analytics.fact_regional_priority') is null and to_regclass('public.fact_regional_priority') is not null then
    alter table public.fact_regional_priority set schema medshield_analytics;
  end if;
  if to_regclass('medshield_analytics.fact_inventory_recommendation') is null and to_regclass('public.fact_inventory_recommendation') is not null then
    alter table public.fact_inventory_recommendation set schema medshield_analytics;
  end if;
  if to_regclass('medshield_analytics.fact_allocation_recommendation') is null and to_regclass('public.fact_allocation_recommendation') is not null then
    alter table public.fact_allocation_recommendation set schema medshield_analytics;
  end if;
  if to_regclass('medshield_analytics.fact_product_region_match') is null and to_regclass('public.fact_product_region_match') is not null then
    alter table public.fact_product_region_match set schema medshield_analytics;
  end if;
  if to_regclass('medshield_analytics.fact_decision_alert') is null and to_regclass('public.fact_decision_alert') is not null then
    alter table public.fact_decision_alert set schema medshield_analytics;
  end if;
  if to_regclass('medshield_analytics.fact_model_evaluation') is null and to_regclass('public.fact_model_evaluation') is not null then
    alter table public.fact_model_evaluation set schema medshield_analytics;
  end if;
end $$;

create table if not exists medshield_identity.accounts (
  account_id bigint generated always as identity primary key,
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  role text not null default 'viewer' check (role in ('admin', 'analyst', 'manager', 'viewer')),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists medshield_sales.stg_sales_transactions (
  staging_key bigint generated always as identity primary key,
  pipeline_run_key bigint references medshield_etl.etl_pipeline_run(pipeline_run_key) on delete set null,
  input_stage text not null default 'raw_medshield',
  standardization_applied jsonb not null default '[]'::jsonb,
  source_workbook text not null,
  source_sheet text not null,
  source_row_number integer not null,
  source_file_path text,
  source_data_layer text not null default 'raw'
    check (source_data_layer in ('raw', 'semi_raw_allocated', 'cleaned')),
  area_raw text,
  dr_number_raw text,
  date_delivered_raw text,
  product_raw text,
  quantity_raw text,
  unit_cost_raw text,
  total_cost_raw text,
  discount_raw text,
  net_cost_raw text,
  trade_price_unit_raw text,
  total_trade_price_raw text,
  net_income_raw text,
  margin_pct_raw text,
  row_quality_status text not null default 'pending'
    check (row_quality_status in ('pending', 'valid', 'warning', 'rejected')),
  row_quality_notes text,
  is_contract_name boolean not null default false,
  allocation_group_id uuid,
  allocation_method text
    check (allocation_method is null or allocation_method in ('none', 'backward_approximation', 'manual_review', 'excluded')),
  allocated_from_source_hash text,
  allocation_weight numeric(12, 8),
  canonical_sku text,
  source_hash text not null unique,
  loaded_at timestamptz not null default now()
);

create table if not exists medshield_sales.fact_sales_transactions (
  sales_transaction_key bigint generated always as identity primary key,
  delivery_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  product_key bigint references medshield_common.dim_product(product_key) on update cascade on delete restrict,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
  pipeline_run_key bigint references medshield_etl.etl_pipeline_run(pipeline_run_key) on delete set null,
  dr_number text,
  quantity_sold numeric(18, 4) not null default 0,
  unit_cost_amount numeric(18, 4) not null default 0,
  total_cost_amount numeric(18, 2) not null default 0,
  discount_amount numeric(18, 2) not null default 0,
  net_cost_amount numeric(18, 2) not null default 0,
  trade_price_unit_amount numeric(18, 4) not null default 0,
  total_trade_price_amount numeric(18, 2) not null default 0,
  net_income_amount numeric(18, 2) not null default 0,
  margin_pct numeric(9, 4),
  source_workbook text not null default 'Sales Report.xlsx',
  source_sheet text not null,
  source_row_number integer not null,
  source_data_layer text not null default 'cleaned'
    check (source_data_layer in ('raw', 'semi_raw_allocated', 'cleaned')),
  product_raw text,
  canonical_sku text,
  is_contract_allocation boolean not null default false,
  source_contract_name text,
  allocation_group_id uuid,
  allocation_method text
    check (allocation_method is null or allocation_method in ('none', 'backward_approximation', 'manual_review', 'excluded')),
  allocated_from_source_hash text,
  allocation_weight numeric(12, 8),
  source_hash text not null unique,
  loaded_at timestamptz not null default now()
);

create table if not exists medshield_sales.fact_monthly_sales (
  monthly_sales_key bigint generated always as identity primary key,
  period_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  source_period text not null,
  source_system text not null default 'medshield_dashboard',
  loaded_at timestamptz not null default now()
);

create unique index if not exists uq_medshield_sales_fact_monthly_snapshot_period
  on medshield_sales.fact_monthly_sales (snapshot_date_key, source_period);

create table if not exists medshield_sales.fact_area_summary (
  area_summary_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint not null references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  source_rank integer not null default 0,
  source_scope text not null default 'all_time',
  loaded_at timestamptz not null default now()
);

create table if not exists medshield_sales.fact_product_summary (
  product_summary_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references medshield_common.dim_product(product_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  quantity_sold numeric(18, 4) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  abc_classification text not null check (abc_classification in ('A', 'B', 'C')),
  pct_of_total numeric(9, 4) not null default 0,
  source_rank integer not null default 0,
  source_scope text not null default 'all_time',
  loaded_at timestamptz not null default now()
);

create table if not exists medshield_sales.fact_year_summary (
  year_summary_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  year_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  transactions_count integer not null default 0,
  loaded_at timestamptz not null default now()
);

create table if not exists medshield_sales.fact_seasonality (
  seasonality_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  month_key smallint not null references medshield_common.dim_month(month_key) on update cascade on delete restrict,
  avg_revenue_amount numeric(18, 2) not null default 0,
  loaded_at timestamptz not null default now()
);

create table if not exists medshield_sales.fact_data_completeness (
  data_completeness_key bigint generated always as identity primary key,
  dataset_code text not null,
  period_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  completeness_status text not null
    check (completeness_status in ('complete', 'partial', 'missing', 'not_applicable', 'needs_review')),
  expected_record_count integer,
  actual_record_count integer not null default 0,
  rejected_record_count integer not null default 0,
  issue_summary text,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
  approved_for_modeling boolean not null default false,
  notes text,
  loaded_at timestamptz not null default now(),
  unique nulls not distinct (dataset_code, period_date_key, area_key)
);

create table if not exists medshield_external.fact_weather_signal (
  weather_signal_key bigint generated always as identity primary key,
  period_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
  rainfall_mm numeric(18, 4),
  rainfall_severity_index numeric(9, 4) not null default 0,
  rainfall_severity_proxy numeric(9, 4) not null default 0,
  rainy_days integer not null default 0,
  avg_temperature_c numeric(9, 4),
  avg_relative_humidity_pct numeric(9, 4),
  max_wind_speed_kph numeric(9, 4),
  weather_adjustment_factor numeric(9, 4) not null default 1,
  typhoon_flag boolean not null default false,
  high_wind_watch boolean not null default false,
  weather_alert_level text not null default 'normal'
    check (weather_alert_level in ('normal', 'watch', 'warning', 'critical')),
  provider_code text,
  source_period text not null,
  loaded_at timestamptz not null default now()
);

create unique index if not exists uq_medshield_external_fact_weather_signal_period_area_source
  on medshield_external.fact_weather_signal (period_date_key, area_key, source_system_key);

create or replace function medshield_identity.accounts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_accounts_updated_at on medshield_identity.accounts;
create trigger trg_accounts_updated_at
  before update on medshield_identity.accounts
  for each row
  execute function medshield_identity.accounts_set_updated_at();

alter table medshield_identity.accounts enable row level security;

drop policy if exists "Accounts: service role only" on medshield_identity.accounts;
create policy "Accounts: service role only"
  on medshield_identity.accounts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists idx_medshield_identity_accounts_username on medshield_identity.accounts (username);
create index if not exists idx_medshield_identity_accounts_email on medshield_identity.accounts (email);
create index if not exists idx_medshield_identity_accounts_role on medshield_identity.accounts (role);

create or replace function public.verify_login(
  p_username text,
  p_password text
)
returns table (
  account_id bigint,
  username text,
  email text,
  role text,
  is_active boolean
)
language plpgsql
security definer
set search_path = medshield_identity, public
as $$
begin
  return query
  select
    a.account_id,
    a.username,
    a.email,
    a.role,
    a.is_active
  from medshield_identity.accounts a
  where
    (a.username = p_username or a.email = p_username)
    and a.password_hash = crypt(p_password, a.password_hash)
    and a.is_active = true
  limit 1;

  update medshield_identity.accounts a
  set last_login_at = now()
  where
    (a.username = p_username or a.email = p_username)
    and a.password_hash = crypt(p_password, a.password_hash)
    and a.is_active = true;
end;
$$;

create or replace function public.create_account(
  p_username text,
  p_email text,
  p_password text,
  p_role text default 'viewer'
)
returns table (
  account_id bigint,
  username text,
  email text,
  role text,
  error_msg text
)
language plpgsql
security definer
set search_path = medshield_identity, public
as $$
declare
  v_id bigint;
begin
  if p_role not in ('admin', 'analyst', 'manager', 'viewer') then
    return query select null::bigint, null::text, null::text, null::text, 'Invalid role';
    return;
  end if;

  if exists (select 1 from medshield_identity.accounts a where a.username = p_username) then
    return query select null::bigint, null::text, null::text, null::text, 'Username already taken';
    return;
  end if;

  if exists (select 1 from medshield_identity.accounts a where a.email = p_email) then
    return query select null::bigint, null::text, null::text, null::text, 'Email already registered';
    return;
  end if;

  insert into medshield_identity.accounts (username, email, password_hash, role)
  values (p_username, p_email, crypt(p_password, gen_salt('bf', 10)), p_role)
  returning accounts.account_id into v_id;

  return query select v_id, p_username, p_email, p_role, null::text;
end;
$$;

grant usage on schema medshield_identity to anon, authenticated, service_role;
grant execute on function public.verify_login(text, text) to anon, authenticated;
grant execute on function public.create_account(text, text, text, text) to anon, authenticated;

insert into medshield_etl.dim_source_system (
  source_code,
  source_name,
  source_type,
  base_url,
  refresh_cadence,
  credibility_note
) values
  (
    'MEDSHIELD_XLSX',
    'MedShield Sales Report Workbook',
    'internal',
    null,
    'Manual upload',
    'Internal historical sales workbook used as the source of truth for demand.'
  ),
  (
    'NASA_POWER_DAILY',
    'NASA POWER Daily API',
    'external_api',
    'https://power.larc.nasa.gov/api/temporal/daily/point',
    'Historical backfill and controlled refresh',
    'Historical meteorological input. The derived rainfall severity proxy is not official PAGASA RSI.'
  ),
  (
    'OPEN_METEO_ARCHIVE',
    'Open-Meteo Historical Weather API',
    'external_api',
    'https://archive-api.open-meteo.com/v1/archive',
    'Historical validation and controlled refresh',
    'Secondary historical meteorological input used to validate or fill weather features.'
  )
on conflict (source_code) do update set
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  base_url = excluded.base_url,
  refresh_cadence = excluded.refresh_cadence,
  credibility_note = excluded.credibility_note,
  is_active = true;

drop view if exists public.vw_sales_transactions cascade;
create or replace view public.vw_sales_transactions as
select
  f.sales_transaction_key,
  d.calendar_year as year,
  d.calendar_date as date_delivered,
  a.area_name as area,
  f.dr_number,
  p.product_name as product,
  f.quantity_sold as quantity,
  f.unit_cost_amount as unit_cost,
  f.total_cost_amount as total_cost,
  f.discount_amount as discount,
  f.net_cost_amount as net_cost,
  f.trade_price_unit_amount as trade_price_unit,
  f.total_trade_price_amount as total_trade_price,
  f.net_income_amount as net_income,
  f.margin_pct,
  f.source_workbook,
  f.source_sheet,
  f.source_row_number,
  f.source_hash,
  f.loaded_at
from medshield_sales.fact_sales_transactions f
join medshield_common.dim_date d on d.date_key = f.delivery_date_key
left join medshield_common.dim_area a on a.area_key = f.area_key
left join medshield_common.dim_product p on p.product_key = f.product_key;

create or replace function medshield_sales.refresh_sales_aggregates(p_snapshot_date_key integer)
returns void
language plpgsql
security definer
set search_path = medshield_sales, medshield_common, public
as $$
begin
  if not exists (select 1 from medshield_common.dim_date where date_key = p_snapshot_date_key) then
    raise exception 'Snapshot date key % is missing from dim_date', p_snapshot_date_key;
  end if;

  delete from medshield_sales.fact_monthly_sales where snapshot_date_key = p_snapshot_date_key;
  delete from medshield_sales.fact_area_summary where snapshot_date_key = p_snapshot_date_key;
  delete from medshield_sales.fact_product_summary where snapshot_date_key = p_snapshot_date_key;
  delete from medshield_sales.fact_year_summary where snapshot_date_key = p_snapshot_date_key;
  delete from medshield_sales.fact_seasonality where snapshot_date_key = p_snapshot_date_key;

  insert into medshield_sales.fact_monthly_sales (
    period_date_key, snapshot_date_key, revenue_amount, income_amount, source_period, source_system
  )
  select
    min(f.delivery_date_key),
    p_snapshot_date_key,
    sum(f.total_trade_price_amount),
    sum(f.net_income_amount),
    d.year_month,
    'medshield_cleaned_transactions'
  from medshield_sales.fact_sales_transactions f
  join medshield_common.dim_date d on d.date_key = f.delivery_date_key
  group by d.year_month;

  insert into medshield_sales.fact_area_summary (
    snapshot_date_key, area_key, revenue_amount, income_amount, source_rank, source_scope
  )
  select
    p_snapshot_date_key,
    f.area_key,
    sum(f.total_trade_price_amount),
    sum(f.net_income_amount),
    dense_rank() over (order by sum(f.total_trade_price_amount) desc),
    'all_time'
  from medshield_sales.fact_sales_transactions f
  where f.area_key is not null
  group by f.area_key;

  insert into medshield_sales.fact_product_summary (
    snapshot_date_key,
    product_key,
    revenue_amount,
    quantity_sold,
    income_amount,
    abc_classification,
    pct_of_total,
    source_rank,
    source_scope
  )
  with product_totals as (
    select
      f.product_key,
      sum(f.total_trade_price_amount) as revenue,
      sum(f.quantity_sold) as quantity,
      sum(f.net_income_amount) as income
    from medshield_sales.fact_sales_transactions f
    where f.product_key is not null
    group by f.product_key
  ),
  ranked as (
    select
      product_totals.*,
      dense_rank() over (order by revenue desc) as source_rank,
      revenue / nullif(sum(revenue) over (), 0) as revenue_share,
      sum(revenue) over (order by revenue desc rows unbounded preceding)
        / nullif(sum(revenue) over (), 0) as cumulative_share
    from product_totals
  )
  select
    p_snapshot_date_key,
    product_key,
    revenue,
    quantity,
    income,
    case when cumulative_share <= 0.80 then 'A'
         when cumulative_share <= 0.95 then 'B'
         else 'C' end,
    round((revenue_share * 100)::numeric, 4),
    source_rank,
    'all_time'
  from ranked;

  update medshield_common.dim_product p
  set abc_classification = s.abc_classification
  from medshield_sales.fact_product_summary s
  where s.snapshot_date_key = p_snapshot_date_key
    and s.product_key = p.product_key;

  insert into medshield_sales.fact_year_summary (
    snapshot_date_key, year_date_key, revenue_amount, income_amount, transactions_count
  )
  select
    p_snapshot_date_key,
    min(f.delivery_date_key),
    sum(f.total_trade_price_amount),
    sum(f.net_income_amount),
    count(*)::integer
  from medshield_sales.fact_sales_transactions f
  join medshield_common.dim_date d on d.date_key = f.delivery_date_key
  group by d.calendar_year;

  insert into medshield_sales.fact_seasonality (
    snapshot_date_key, month_key, avg_revenue_amount
  )
  with monthly as (
    select
      d.calendar_year,
      d.calendar_month,
      sum(f.total_trade_price_amount) as revenue
    from medshield_sales.fact_sales_transactions f
    join medshield_common.dim_date d on d.date_key = f.delivery_date_key
    group by d.calendar_year, d.calendar_month
  )
  select
    p_snapshot_date_key,
    calendar_month,
    avg(revenue)
  from monthly
  group by calendar_month;
end;
$$;

create or replace function public.refresh_sales_aggregates(p_snapshot_date_key integer)
returns void
language sql
security definer
as $$
  select medshield_sales.refresh_sales_aggregates(p_snapshot_date_key);
$$;

grant usage on schema medshield_common to service_role;
grant usage on schema medshield_etl to service_role;
grant usage on schema medshield_sales to service_role;
grant usage on schema medshield_external to service_role;
grant usage on schema medshield_analytics to service_role;
grant all on all tables in schema medshield_common to service_role;
grant all on all tables in schema medshield_etl to service_role;
grant all on all tables in schema medshield_sales to service_role;
grant all on all tables in schema medshield_external to service_role;
grant all on all tables in schema medshield_analytics to service_role;
grant usage, select on all sequences in schema medshield_common to service_role;
grant usage, select on all sequences in schema medshield_etl to service_role;
grant usage, select on all sequences in schema medshield_sales to service_role;
grant usage, select on all sequences in schema medshield_external to service_role;
grant usage, select on all sequences in schema medshield_analytics to service_role;
grant execute on function medshield_sales.refresh_sales_aggregates(integer) to service_role;
grant execute on function public.refresh_sales_aggregates(integer) to service_role;

comment on schema medshield_common is 'Shared MedShield dimensions and controlled mapping tables.';
comment on schema medshield_etl is 'MedShield ETL source registry and pipeline lineage.';
comment on schema medshield_identity is 'MedShield application identity tables.';
comment on schema medshield_sales is 'MedShield sales staging, facts, aggregates, and sales refresh routines.';
comment on schema medshield_external is 'MedShield external DOH, PAGASA, and weather-provider signal tables.';
comment on schema medshield_analytics is 'MedShield model registry, model outputs, recommendations, and evaluation tables.';
