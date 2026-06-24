-- Business-rule aligned master data, sales lineage, external staging, and revenue fix.
-- Apply after 005_sales_ingestion_weather.sql and before seed.sql on a fresh setup.

create extension if not exists pgcrypto;

alter table public.dim_area
  add column if not exists area_type text not null default 'unmapped'
    check (area_type in ('territory', 'customer_type', 'business_line', 'unmapped')),
  add column if not exists region_name text,
  add column if not exists province_city text,
  add column if not exists latitude numeric(10, 6),
  add column if not exists longitude numeric(10, 6),
  add column if not exists mapping_status text not null default 'needs_review'
    check (mapping_status in ('proposed', 'approved', 'rejected', 'needs_review')),
  add column if not exists review_notes text;

update public.dim_area
set
  area_type = case
    when lower(area_group) = 'territory' then 'territory'
    when lower(area_group) in ('institution', 'channel', 'customer', 'customer_type') then 'customer_type'
    when lower(area_group) in ('business_line', 'admin', 'supplies', 'equipment', 'personal', 'losses') then 'business_line'
    else area_type
  end,
  mapping_status = case
    when lower(area_group) in ('territory', 'institution', 'channel', 'customer', 'customer_type') then 'proposed'
    else mapping_status
  end
where mapping_status = 'needs_review'
   or area_type = 'unmapped';

alter table public.dim_product
  add column if not exists canonical_sku text,
  add column if not exists brand_name text,
  add column if not exists generic_name text,
  add column if not exists strength text,
  add column if not exists dosage_form text,
  add column if not exists pack_size text,
  add column if not exists product_category text not null default 'needs_review',
  add column if not exists is_medicine boolean,
  add column if not exists forecast_eligible boolean not null default false,
  add column if not exists mapping_status text not null default 'needs_review'
    check (mapping_status in ('proposed', 'approved', 'rejected', 'needs_review')),
  add column if not exists review_notes text;

update public.dim_product
set
  canonical_sku = coalesce(canonical_sku, product_name),
  product_category = case
    when product_name like '%#%' then 'contract_name'
    else product_category
  end,
  forecast_eligible = case
    when product_name like '%#%' then false
    else forecast_eligible
  end,
  mapping_status = case
    when product_name like '%#%' then 'needs_review'
    else mapping_status
  end,
  review_notes = case
    when product_name like '%#%' and review_notes is null
      then 'Contract-name row, not a direct sellable product. Requires backward allocation before product-level modeling.'
    else review_notes
  end
where canonical_sku is null
   or product_name like '%#%';

create table if not exists public.dim_product_alias (
  product_alias_key bigint generated always as identity primary key,
  raw_product text not null unique,
  product_key bigint references public.dim_product(product_key) on update cascade on delete set null,
  canonical_sku text not null,
  brand_name text,
  generic_name text,
  strength text,
  dosage_form text,
  pack_size text,
  product_category text not null default 'needs_review',
  is_medicine boolean,
  forecast_eligible boolean not null default false,
  mapping_status text not null default 'needs_review'
    check (mapping_status in ('proposed', 'approved', 'rejected', 'needs_review')),
  is_contract_name boolean not null default false,
  allocation_method text
    check (allocation_method is null or allocation_method in ('none', 'backward_approximation', 'manual_review', 'excluded')),
  review_notes text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.dim_product_alias (
  raw_product,
  product_key,
  canonical_sku,
  product_category,
  forecast_eligible,
  mapping_status,
  is_contract_name,
  allocation_method,
  review_notes
)
select
  p.product_name,
  p.product_key,
  coalesce(p.canonical_sku, p.product_name),
  p.product_category,
  p.forecast_eligible,
  p.mapping_status,
  p.product_name like '%#%',
  case when p.product_name like '%#%' then 'backward_approximation' else 'none' end,
  p.review_notes
from public.dim_product p
on conflict (raw_product) do update set
  product_key = excluded.product_key,
  canonical_sku = excluded.canonical_sku,
  product_category = excluded.product_category,
  forecast_eligible = excluded.forecast_eligible,
  mapping_status = excluded.mapping_status,
  is_contract_name = excluded.is_contract_name,
  allocation_method = excluded.allocation_method,
  review_notes = coalesce(public.dim_product_alias.review_notes, excluded.review_notes),
  updated_at = now();

alter table public.stg_sales_transactions
  add column if not exists source_file_path text,
  add column if not exists source_data_layer text not null default 'raw'
    check (source_data_layer in ('raw', 'semi_raw_allocated', 'cleaned')),
  add column if not exists is_contract_name boolean not null default false,
  add column if not exists allocation_group_id uuid,
  add column if not exists allocation_method text
    check (allocation_method is null or allocation_method in ('none', 'backward_approximation', 'manual_review', 'excluded')),
  add column if not exists allocated_from_source_hash text,
  add column if not exists allocation_weight numeric(12, 8),
  add column if not exists canonical_sku text;

alter table public.fact_sales_transactions
  add column if not exists source_data_layer text not null default 'cleaned'
    check (source_data_layer in ('raw', 'semi_raw_allocated', 'cleaned')),
  add column if not exists product_raw text,
  add column if not exists canonical_sku text,
  add column if not exists is_contract_allocation boolean not null default false,
  add column if not exists source_contract_name text,
  add column if not exists allocation_group_id uuid,
  add column if not exists allocation_method text
    check (allocation_method is null or allocation_method in ('none', 'backward_approximation', 'manual_review', 'excluded')),
  add column if not exists allocated_from_source_hash text,
  add column if not exists allocation_weight numeric(12, 8);

update public.fact_sales_transactions f
set
  product_raw = coalesce(f.product_raw, p.product_name),
  canonical_sku = coalesce(f.canonical_sku, p.canonical_sku, p.product_name),
  is_contract_allocation = coalesce(f.is_contract_allocation, false)
from public.dim_product p
where p.product_key = f.product_key
  and (f.product_raw is null or f.canonical_sku is null);

create table if not exists public.fact_data_completeness (
  data_completeness_key bigint generated always as identity primary key,
  dataset_code text not null,
  period_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references public.dim_area(area_key) on update cascade on delete restrict,
  completeness_status text not null
    check (completeness_status in ('complete', 'partial', 'missing', 'not_applicable', 'needs_review')),
  expected_record_count integer,
  actual_record_count integer not null default 0,
  rejected_record_count integer not null default 0,
  issue_summary text,
  source_system_key bigint references public.dim_source_system(source_system_key) on update cascade on delete restrict,
  approved_for_modeling boolean not null default false,
  notes text,
  loaded_at timestamptz not null default now(),
  unique nulls not distinct (dataset_code, period_date_key, area_key)
);

create table if not exists public.stg_doh_historical (
  doh_staging_key bigint generated always as identity primary key,
  source_system_key bigint references public.dim_source_system(source_system_key) on update cascade on delete restrict,
  observation_date date not null,
  region text,
  province_city text,
  disease_name text not null,
  case_count numeric(18, 2),
  death_count numeric(18, 2),
  population numeric(18, 2),
  disease_intensity_indicator numeric(9, 4),
  source text not null,
  source_file text,
  notes text,
  row_quality_status text not null default 'pending'
    check (row_quality_status in ('pending', 'valid', 'warning', 'rejected')),
  row_quality_notes text,
  source_hash text not null unique,
  loaded_at timestamptz not null default now()
);

create table if not exists public.stg_pagasa_historical (
  pagasa_staging_key bigint generated always as identity primary key,
  source_system_key bigint references public.dim_source_system(source_system_key) on update cascade on delete restrict,
  observation_date date not null,
  region text,
  province_city text,
  station_name text,
  rainfall_mm numeric(18, 4),
  temperature_mean_c numeric(9, 4),
  humidity_mean_pct numeric(9, 4),
  wind_speed_mean_kph numeric(9, 4),
  weather_indicator text,
  source text not null,
  source_file text,
  notes text,
  row_quality_status text not null default 'pending'
    check (row_quality_status in ('pending', 'valid', 'warning', 'rejected')),
  row_quality_notes text,
  source_hash text not null unique,
  loaded_at timestamptz not null default now()
);

create table if not exists public.stg_weather_api_observations (
  weather_api_staging_key bigint generated always as identity primary key,
  source_system_key bigint references public.dim_source_system(source_system_key) on update cascade on delete restrict,
  observation_date date not null,
  target_region text not null,
  province_city text,
  latitude numeric(10, 6),
  longitude numeric(10, 6),
  provider text not null,
  rainfall_mm numeric(18, 4),
  temperature_mean_c numeric(9, 4),
  humidity_mean_pct numeric(9, 4),
  wind_speed_mean_kph numeric(9, 4),
  severity_proxy numeric(9, 4),
  source_url text,
  notes text,
  row_quality_status text not null default 'pending'
    check (row_quality_status in ('pending', 'valid', 'warning', 'rejected')),
  row_quality_notes text,
  source_hash text not null unique,
  loaded_at timestamptz not null default now()
);

insert into public.fact_data_completeness (
  dataset_code,
  period_date_key,
  completeness_status,
  expected_record_count,
  actual_record_count,
  rejected_record_count,
  issue_summary,
  source_system_key,
  approved_for_modeling,
  notes
)
select
  'sales_2025',
  d.date_key,
  case
    when d.calendar_month in (1, 3, 4, 7, 10) then 'missing'
    else 'partial'
  end,
  null,
  case d.calendar_month
    when 2 then 24
    when 5 then 1
    when 6 then 68
    when 8 then 4
    when 9 then 94
    when 11 then 184
    when 12 then 707
    else 0
  end,
  null,
  'Known 2025 completeness issue from processed sales profile. Do not use 2025 as full holdout until reconciled.',
  s.source_system_key,
  false,
  'Use 2021-2024 for primary training; use 2025 only as partial secondary validation until approved.'
from public.dim_date d
left join public.dim_source_system s on s.source_code = 'MEDSHIELD_XLSX'
where d.calendar_year = 2025
  and d.day_of_month = 1
on conflict (dataset_code, period_date_key, area_key) do update set
  completeness_status = excluded.completeness_status,
  expected_record_count = excluded.expected_record_count,
  actual_record_count = excluded.actual_record_count,
  issue_summary = excluded.issue_summary,
  source_system_key = excluded.source_system_key,
  approved_for_modeling = excluded.approved_for_modeling,
  notes = excluded.notes,
  loaded_at = now();

create index if not exists idx_dim_area_area_type on public.dim_area (area_type);
create index if not exists idx_dim_product_canonical_sku on public.dim_product (canonical_sku);
create index if not exists idx_dim_product_alias_canonical_sku on public.dim_product_alias (canonical_sku);
create index if not exists idx_fact_sales_transactions_canonical_sku on public.fact_sales_transactions (canonical_sku);
create index if not exists idx_fact_sales_transactions_allocation on public.fact_sales_transactions (is_contract_allocation, allocation_group_id);
create index if not exists idx_fact_data_completeness_dataset_period on public.fact_data_completeness (dataset_code, period_date_key);
create index if not exists idx_stg_doh_observation_date on public.stg_doh_historical (observation_date);
create index if not exists idx_stg_pagasa_observation_date on public.stg_pagasa_historical (observation_date);
create index if not exists idx_stg_weather_api_observation_date on public.stg_weather_api_observations (observation_date);

alter table public.dim_product_alias enable row level security;
alter table public.fact_data_completeness enable row level security;
alter table public.stg_doh_historical enable row level security;
alter table public.stg_pagasa_historical enable row level security;
alter table public.stg_weather_api_observations enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'dim_product_alias',
    'fact_data_completeness'
  ] loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'Public read'
    ) then
      execute format('create policy "Public read" on public.%I for select using (true);', tbl);
    end if;
  end loop;
end $$;

drop policy if exists "Public read" on public.stg_doh_historical;
drop policy if exists "Public read" on public.stg_pagasa_historical;
drop policy if exists "Public read" on public.stg_weather_api_observations;

create or replace view public.vw_product_master_status as
select
  p.product_key,
  p.product_name,
  coalesce(p.canonical_sku, p.product_name) as canonical_sku,
  p.product_category,
  p.is_medicine,
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
  p.forecast_eligible,
  p.mapping_status,
  p.review_notes
order by p.mapping_status, p.product_name;

create or replace view public.vw_area_mapping_status as
select
  area_key,
  area_name,
  area_group,
  area_type,
  region_name,
  province_city,
  latitude,
  longitude,
  mapping_status,
  review_notes
from public.dim_area
order by area_type, area_name;

create or replace view public.vw_data_completeness_status as
select
  f.dataset_code,
  d.year_month,
  coalesce(a.area_name, 'All') as area,
  f.completeness_status,
  f.expected_record_count,
  f.actual_record_count,
  f.rejected_record_count,
  f.approved_for_modeling,
  f.issue_summary,
  f.notes,
  f.loaded_at
from public.fact_data_completeness f
join public.dim_date d on d.date_key = f.period_date_key
left join public.dim_area a on a.area_key = f.area_key
order by f.dataset_code, d.calendar_date, area;

create or replace view public.vw_sales_transactions as
select
  f.sales_transaction_key,
  d.calendar_year as year,
  d.calendar_date as date_delivered,
  a.area_name as area,
  a.area_type,
  f.dr_number,
  coalesce(f.product_raw, p.product_name) as product_raw,
  p.product_name as product,
  coalesce(f.canonical_sku, p.canonical_sku, p.product_name) as canonical_sku,
  p.product_category,
  p.forecast_eligible,
  f.quantity_sold as quantity,
  f.unit_cost_amount as unit_cost,
  f.total_cost_amount as total_cost,
  f.discount_amount as discount,
  f.net_cost_amount as net_cost,
  f.trade_price_unit_amount as trade_price_unit,
  f.total_trade_price_amount as total_trade_price,
  f.net_income_amount as gross_margin_amount,
  f.net_income_amount as net_income,
  f.margin_pct,
  f.source_data_layer,
  f.is_contract_allocation,
  f.source_contract_name,
  f.allocation_group_id,
  f.allocation_method,
  f.allocated_from_source_hash,
  f.allocation_weight,
  f.source_workbook,
  f.source_sheet,
  f.source_row_number,
  f.source_hash,
  f.loaded_at
from public.fact_sales_transactions f
join public.dim_date d on d.date_key = f.delivery_date_key
left join public.dim_area a on a.area_key = f.area_key
left join public.dim_product p on p.product_key = f.product_key;

revoke all on public.vw_sales_transactions from public, anon, authenticated;
grant select on public.vw_sales_transactions to service_role;

create or replace function public.refresh_sales_aggregates(p_snapshot_date_key integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.dim_date where date_key = p_snapshot_date_key) then
    raise exception 'Snapshot date key % is missing from dim_date', p_snapshot_date_key;
  end if;

  delete from public.fact_monthly_sales where snapshot_date_key = p_snapshot_date_key;
  delete from public.fact_area_summary where snapshot_date_key = p_snapshot_date_key;
  delete from public.fact_product_summary where snapshot_date_key = p_snapshot_date_key;
  delete from public.fact_year_summary where snapshot_date_key = p_snapshot_date_key;
  delete from public.fact_seasonality where snapshot_date_key = p_snapshot_date_key;

  insert into public.fact_monthly_sales (
    period_date_key, snapshot_date_key, revenue_amount, income_amount, source_period, source_system
  )
  select
    min(f.delivery_date_key),
    p_snapshot_date_key,
    sum(f.total_trade_price_amount),
    sum(f.net_income_amount),
    d.year_month,
    'medshield_cleaned_transactions'
  from public.fact_sales_transactions f
  join public.dim_date d on d.date_key = f.delivery_date_key
  group by d.year_month;

  insert into public.fact_area_summary (
    snapshot_date_key, area_key, revenue_amount, income_amount, source_rank, source_scope
  )
  select
    p_snapshot_date_key,
    f.area_key,
    sum(f.total_trade_price_amount),
    sum(f.net_income_amount),
    dense_rank() over (order by sum(f.total_trade_price_amount) desc),
    'all_time'
  from public.fact_sales_transactions f
  where f.area_key is not null
  group by f.area_key;

  insert into public.fact_product_summary (
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
    from public.fact_sales_transactions f
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

  update public.dim_product p
  set abc_classification = s.abc_classification
  from public.fact_product_summary s
  where s.snapshot_date_key = p_snapshot_date_key
    and s.product_key = p.product_key;

  insert into public.fact_year_summary (
    snapshot_date_key, year_date_key, revenue_amount, income_amount, transactions_count
  )
  select
    p_snapshot_date_key,
    min(f.delivery_date_key),
    sum(f.total_trade_price_amount),
    sum(f.net_income_amount),
    count(*)::integer
  from public.fact_sales_transactions f
  join public.dim_date d on d.date_key = f.delivery_date_key
  group by d.calendar_year;

  insert into public.fact_seasonality (
    snapshot_date_key, month_key, avg_revenue_amount
  )
  with monthly as (
    select
      d.calendar_year,
      d.calendar_month,
      sum(f.total_trade_price_amount) as revenue
    from public.fact_sales_transactions f
    join public.dim_date d on d.date_key = f.delivery_date_key
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

revoke all on function public.refresh_sales_aggregates(integer) from public, anon, authenticated;
grant execute on function public.refresh_sales_aggregates(integer) to service_role;

comment on table public.dim_product_alias is 'Controlled raw-product to canonical-SKU mapping table used before SKU-level modeling.';
comment on table public.fact_data_completeness is 'Period-level completeness ledger for sales, DOH, PAGASA, and weather API sources.';
comment on table public.stg_doh_historical is 'Raw-to-clean staging table for historical DOH disease data.';
comment on table public.stg_pagasa_historical is 'Raw-to-clean staging table for historical PAGASA weather data.';
comment on table public.stg_weather_api_observations is 'Raw-to-clean staging table for coordinate-based historical weather API observations.';
comment on column public.fact_sales_transactions.total_trade_price_amount is 'Approved sales revenue field for dashboards and model evaluation.';
comment on column public.fact_sales_transactions.net_income_amount is 'Workbook gross margin/profit amount. Do not describe as company net profit without expense data.';
comment on column public.fact_sales_transactions.is_contract_allocation is 'True when a row came from backward approximation of a contract-name row.';
