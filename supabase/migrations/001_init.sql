create extension if not exists pgcrypto;

create table if not exists public.dim_date (
  date_key integer primary key,
  calendar_date date not null unique,
  calendar_year smallint not null,
  calendar_quarter smallint not null,
  calendar_month smallint not null,
  month_name text not null,
  month_short_name text not null,
  year_month text not null unique,
  day_of_month smallint not null,
  is_month_end boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.dim_month (
  month_key smallint primary key check (month_key between 1 and 12),
  month_name text not null unique,
  month_short_name text not null unique
);

create table if not exists public.dim_area (
  area_key bigint generated always as identity primary key,
  area_name text not null unique,
  area_group text not null default 'territory',
  created_at timestamptz not null default now()
);

create table if not exists public.dim_product (
  product_key bigint generated always as identity primary key,
  product_name text not null unique,
  abc_classification text,
  product_group text,
  created_at timestamptz not null default now()
);

create table if not exists public.fact_monthly_sales (
  monthly_sales_key bigint generated always as identity primary key,
  period_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  source_period text not null unique,
  source_system text not null default 'medshield_dashboard',
  loaded_at timestamptz not null default now()
);

create table if not exists public.fact_area_summary (
  area_summary_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint not null references public.dim_area(area_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  source_rank integer not null default 0,
  source_scope text not null default 'all_time',
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, area_key)
);

create table if not exists public.fact_product_summary (
  product_summary_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references public.dim_product(product_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  quantity_sold numeric(18, 2) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  abc_classification text not null,
  pct_of_total numeric(6, 2) not null default 0,
  source_rank integer not null default 0,
  source_scope text not null default 'all_time',
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, product_key)
);

create table if not exists public.fact_year_summary (
  year_summary_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  year_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  transactions_count integer not null default 0,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, year_date_key)
);

create table if not exists public.fact_seasonality (
  seasonality_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  month_key smallint not null references public.dim_month(month_key) on update cascade on delete restrict,
  avg_revenue_amount numeric(18, 2) not null default 0,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, month_key)
);

alter table public.dim_date enable row level security;
alter table public.dim_month enable row level security;
alter table public.dim_area enable row level security;
alter table public.dim_product enable row level security;
alter table public.fact_monthly_sales enable row level security;
alter table public.fact_area_summary enable row level security;
alter table public.fact_product_summary enable row level security;
alter table public.fact_year_summary enable row level security;
alter table public.fact_seasonality enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'dim_date',
    'dim_month',
    'dim_area',
    'dim_product',
    'fact_monthly_sales',
    'fact_area_summary',
    'fact_product_summary',
    'fact_year_summary',
    'fact_seasonality'
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

create or replace view public.vw_dashboard_monthly as
with latest_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from public.fact_monthly_sales
)
select
  d.year_month as period,
  f.revenue_amount as revenue,
  f.income_amount as income
from public.fact_monthly_sales f
join latest_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
join public.dim_date d on d.date_key = f.period_date_key
order by d.calendar_date;

create or replace view public.vw_dashboard_by_area as
with latest_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from public.fact_area_summary
)
select
  a.area_name as area,
  f.revenue_amount as revenue,
  f.income_amount as income
from public.fact_area_summary f
join latest_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
join public.dim_area a on a.area_key = f.area_key
order by f.revenue_amount desc, a.area_name asc;

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
order by f.revenue_amount desc, p.product_name asc
limit 15;

create or replace view public.vw_dashboard_year_summary as
with latest_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from public.fact_year_summary
)
select
  d.calendar_year::text as year,
  f.revenue_amount as revenue,
  f.income_amount as income,
  f.transactions_count as transactions
from public.fact_year_summary f
join latest_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
join public.dim_date d on d.date_key = f.year_date_key
order by d.calendar_year asc;

create or replace view public.vw_dashboard_seasonality as
with latest_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from public.fact_seasonality
)
select
  m.month_key as month_num,
  m.month_short_name as month,
  f.avg_revenue_amount as avg_revenue
from public.fact_seasonality f
join latest_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
join public.dim_month m on m.month_key = f.month_key
order by m.month_key asc;

create or replace view public.vw_dashboard_kpis as
with latest_monthly_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from public.fact_monthly_sales
),
latest_area_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from public.fact_area_summary
),
latest_product_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from public.fact_product_summary
),
latest_year_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from public.fact_year_summary
),
monthly_totals as (
  select
    coalesce(sum(f.revenue_amount), 0) as total_revenue,
    coalesce(sum(f.income_amount), 0) as total_income
  from public.fact_monthly_sales f
  join latest_monthly_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
),
transaction_totals as (
  select coalesce(sum(f.transactions_count), 0) as total_transactions
  from public.fact_year_summary f
  join latest_year_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
),
top_product as (
  select p.product_name as product_name
  from public.fact_product_summary f
  join latest_product_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
  join public.dim_product p on p.product_key = f.product_key
  order by f.revenue_amount desc, p.product_name asc
  limit 1
),
top_area as (
  select a.area_name as area_name
  from public.fact_area_summary f
  join latest_area_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
  join public.dim_area a on a.area_key = f.area_key
  order by f.revenue_amount desc, a.area_name asc
  limit 1
)
select
  mt.total_revenue::numeric(18, 2) as total_revenue,
  mt.total_income::numeric(18, 2) as total_income,
  tt.total_transactions::integer as total_transactions,
  coalesce((select product_name from top_product), '') as top_product,
  coalesce((select area_name from top_area), '') as top_area,
  round(
    case
      when mt.total_revenue = 0 then 0
      else (mt.total_income / mt.total_revenue) * 100
    end,
    2
  )::numeric(6, 2) as avg_margin,
  now()::timestamptz as updated_at
from monthly_totals mt
cross join transaction_totals tt;

create or replace view public.vw_sales_with_dimensions as
select
  f.monthly_sales_key,
  f.source_period,
  d.year_month,
  d.calendar_year,
  d.calendar_month,
  d.month_name,
  f.revenue_amount,
  f.income_amount,
  f.source_system,
  f.loaded_at,
  f.snapshot_date_key
from public.fact_monthly_sales f
join public.dim_date d on d.date_key = f.period_date_key;

comment on table public.dim_date is 'Calendar dimension used by all time-based fact tables.';
comment on table public.dim_month is 'Reusable month dimension for seasonality analysis.';
comment on table public.dim_area is 'Sales territory and channel dimension.';
comment on table public.dim_product is 'Product dimension with ABC classification metadata.';
comment on table public.fact_monthly_sales is 'Monthly sales fact table. Source of truth for trend analysis.';
comment on table public.fact_area_summary is 'All-time area summary fact table for territorial analysis.';
comment on table public.fact_product_summary is 'All-time product summary fact table for product ranking analysis.';
comment on table public.fact_year_summary is 'Annual sales summary fact table used by the dashboard and reports.';
comment on table public.fact_seasonality is 'Month-level seasonality fact table for recurring trend analysis.';
