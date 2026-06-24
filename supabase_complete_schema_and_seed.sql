-- ==========================================================================
-- CREATE CUSTOM SCHEMA AND CONFIGURE SEARCH PATHS
-- ==========================================================================
-- CREATE CUSTOM SCHEMAS
CREATE SCHEMA IF NOT EXISTS medshield_common;
CREATE SCHEMA IF NOT EXISTS medshield_identity;
CREATE SCHEMA IF NOT EXISTS medshield_sales;
CREATE SCHEMA IF NOT EXISTS medshield_external;
CREATE SCHEMA IF NOT EXISTS medshield_analytics;
CREATE SCHEMA IF NOT EXISTS medshield_etl;

-- Configure search paths so Supabase's API (PostgREST) and direct connections
-- can access the medshield schemas automatically without modifying backend requests.
ALTER ROLE postgres SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;
ALTER ROLE authenticator SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;
ALTER ROLE service_role SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;
ALTER ROLE anon SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;
ALTER ROLE authenticated SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;

-- Set session search path for the current deployment run
SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;
ALTER ROLE authenticator SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;
ALTER ROLE service_role SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;
ALTER ROLE anon SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;
ALTER ROLE authenticated SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;

-- Set session search path for the current deployment run
SET search_path TO public, medshield_common, medshield_identity, medshield_sales, medshield_external, medshield_analytics, medshield_etl;

-- ==========================================================================
-- COMBINED DATABASE MIGRATIONS AND SEED DATA FOR MEDSHIELD WAREHOUSE
-- Generated to bypass network database port blocks (5432/6543)
-- Paste this entire file into the Supabase Dashboard SQL Editor & Run.
-- ==========================================================================

-- START OF MIGRATION: 001_init.sql
create extension if not exists pgcrypto;

create table if not exists medshield_common.dim_date (
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

create table if not exists medshield_common.dim_month (
  month_key smallint primary key check (month_key between 1 and 12),
  month_name text not null unique,
  month_short_name text not null unique
);

create table if not exists medshield_common.dim_area (
  area_key bigint generated always as identity primary key,
  area_name text not null unique,
  area_group text not null default 'territory',
  created_at timestamptz not null default now()
);

create table if not exists medshield_common.dim_product (
  product_key bigint generated always as identity primary key,
  product_name text not null unique,
  abc_classification text,
  product_group text,
  created_at timestamptz not null default now()
);

create table if not exists medshield_sales.fact_monthly_sales (
  monthly_sales_key bigint generated always as identity primary key,
  period_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  source_period text not null unique,
  source_system text not null default 'medshield_dashboard',
  loaded_at timestamptz not null default now()
);

create table if not exists medshield_sales.fact_area_summary (
  area_summary_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint not null references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  source_rank integer not null default 0,
  source_scope text not null default 'all_time',
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, area_key)
);

create table if not exists medshield_sales.fact_product_summary (
  product_summary_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references medshield_common.dim_product(product_key) on update cascade on delete restrict,
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

create table if not exists medshield_sales.fact_year_summary (
  year_summary_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  year_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  revenue_amount numeric(18, 2) not null default 0,
  income_amount numeric(18, 2) not null default 0,
  transactions_count integer not null default 0,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, year_date_key)
);

create table if not exists medshield_sales.fact_seasonality (
  seasonality_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  month_key smallint not null references medshield_common.dim_month(month_key) on update cascade on delete restrict,
  avg_revenue_amount numeric(18, 2) not null default 0,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, month_key)
);

alter table medshield_common.dim_date enable row level security;
alter table medshield_common.dim_month enable row level security;
alter table medshield_common.dim_area enable row level security;
alter table medshield_common.dim_product enable row level security;
alter table medshield_sales.fact_monthly_sales enable row level security;
alter table medshield_sales.fact_area_summary enable row level security;
alter table medshield_sales.fact_product_summary enable row level security;
alter table medshield_sales.fact_year_summary enable row level security;
alter table medshield_sales.fact_seasonality enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'dim_date',
    'dim_month',
    'dim_area',
    'dim_product'
  ] loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'medshield_common'
        and tablename = tbl
        and policyname = 'Public read'
    ) then
      execute format('create policy "Public read" on medshield_common.%I for select using (true);', tbl);
    end if;
  end loop;

  foreach tbl in array array[
    'fact_monthly_sales',
    'fact_area_summary',
    'fact_product_summary',
    'fact_year_summary',
    'fact_seasonality'
  ] loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'medshield_sales'
        and tablename = tbl
        and policyname = 'Public read'
    ) then
      execute format('create policy "Public read" on medshield_sales.%I for select using (true);', tbl);
    end if;
  end loop;
end $$;

drop view if exists medshield_sales.vw_dashboard_monthly cascade;
create or replace view medshield_sales.vw_dashboard_monthly as
with latest_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from medshield_sales.fact_monthly_sales
)
select
  d.year_month as period,
  f.revenue_amount as revenue,
  f.income_amount as income
from medshield_sales.fact_monthly_sales f
join latest_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
join medshield_common.dim_date d on d.date_key = f.period_date_key
order by d.calendar_date;

drop view if exists medshield_sales.vw_dashboard_by_area cascade;
create or replace view medshield_sales.vw_dashboard_by_area as
with latest_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from medshield_sales.fact_area_summary
)
select
  a.area_name as area,
  f.revenue_amount as revenue,
  f.income_amount as income
from medshield_sales.fact_area_summary f
join latest_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
join medshield_common.dim_area a on a.area_key = f.area_key
order by f.revenue_amount desc, a.area_name asc;

drop view if exists medshield_sales.vw_dashboard_top_products cascade;
create or replace view medshield_sales.vw_dashboard_top_products as
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
order by f.revenue_amount desc, p.product_name asc
limit 15;

drop view if exists medshield_sales.vw_dashboard_year_summary cascade;
create or replace view medshield_sales.vw_dashboard_year_summary as
with latest_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from medshield_sales.fact_year_summary
)
select
  d.calendar_year::text as year,
  f.revenue_amount as revenue,
  f.income_amount as income,
  f.transactions_count as transactions
from medshield_sales.fact_year_summary f
join latest_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
join medshield_common.dim_date d on d.date_key = f.year_date_key
order by d.calendar_year asc;

drop view if exists medshield_sales.vw_dashboard_seasonality cascade;
create or replace view medshield_sales.vw_dashboard_seasonality as
with latest_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from medshield_sales.fact_seasonality
)
select
  m.month_key as month_num,
  m.month_short_name as month,
  f.avg_revenue_amount as avg_revenue
from medshield_sales.fact_seasonality f
join latest_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
join medshield_common.dim_month m on m.month_key = f.month_key
order by m.month_key asc;

drop view if exists medshield_sales.vw_dashboard_kpis cascade;
create or replace view medshield_sales.vw_dashboard_kpis as
with latest_monthly_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from medshield_sales.fact_monthly_sales
),
latest_area_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from medshield_sales.fact_area_summary
),
latest_product_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from medshield_sales.fact_product_summary
),
latest_year_snapshot as (
  select max(snapshot_date_key) as snapshot_date_key
  from medshield_sales.fact_year_summary
),
monthly_totals as (
  select
    coalesce(sum(f.revenue_amount), 0) as total_revenue,
    coalesce(sum(f.income_amount), 0) as total_income
  from medshield_sales.fact_monthly_sales f
  join latest_monthly_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
),
transaction_totals as (
  select coalesce(sum(f.transactions_count), 0) as total_transactions
  from medshield_sales.fact_year_summary f
  join latest_year_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
),
top_product as (
  select p.product_name as product_name
  from medshield_sales.fact_product_summary f
  join latest_product_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
  join medshield_common.dim_product p on p.product_key = f.product_key
  order by f.revenue_amount desc, p.product_name asc
  limit 1
),
top_area as (
  select a.area_name as area_name
  from medshield_sales.fact_area_summary f
  join latest_area_snapshot ls on ls.snapshot_date_key = f.snapshot_date_key
  join medshield_common.dim_area a on a.area_key = f.area_key
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

drop view if exists medshield_sales.vw_sales_with_dimensions cascade;
create or replace view medshield_sales.vw_sales_with_dimensions as
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
from medshield_sales.fact_monthly_sales f
join medshield_common.dim_date d on d.date_key = f.period_date_key;

comment on table medshield_common.dim_date is 'Calendar dimension used by all time-based fact tables.';
comment on table medshield_common.dim_month is 'Reusable month dimension for seasonality analysis.';
comment on table medshield_common.dim_area is 'Sales territory and channel dimension.';
comment on table medshield_common.dim_product is 'Product dimension with ABC classification metadata.';
comment on table medshield_sales.fact_monthly_sales is 'Monthly sales fact table. Source of truth for trend analysis.';
comment on table medshield_sales.fact_area_summary is 'All-time area summary fact table for territorial analysis.';
comment on table medshield_sales.fact_product_summary is 'All-time product summary fact table for product ranking analysis.';
comment on table medshield_sales.fact_year_summary is 'Annual sales summary fact table used by the dashboard and reports.';
comment on table medshield_sales.fact_seasonality is 'Month-level seasonality fact table for recurring trend analysis.';

-- END OF MIGRATION: 001_init.sql


-- START OF MIGRATION: 002_accounts.sql
-- ============================================================
-- Migration: 002_accounts.sql
-- Description: Creates the user accounts table in the public
--              schema for MedShield authentication.
-- ============================================================

-- Ensure pgcrypto is available for password hashing
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Table: medshield_identity.accounts
-- Stores application user accounts for login/signup.
-- Passwords are stored as bcrypt hashes (never plain text).
-- ------------------------------------------------------------
create table if not exists medshield_identity.accounts (
  account_id    bigint generated always as identity primary key,
  username      text not null unique,
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'viewer'
                  check (role in ('admin', 'analyst', 'manager', 'viewer')),
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table medshield_identity.accounts is
  'Application user accounts for MedShield login and role-based access.';
comment on column medshield_identity.accounts.password_hash is
  'bcrypt hash of the user password. Never store plain text.';
comment on column medshield_identity.accounts.role is
  'Access role: admin = full access, analyst = analytics only, manager = operations, viewer = read-only.';

-- ------------------------------------------------------------
-- Auto-update updated_at on row modification
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table medshield_identity.accounts enable row level security;

-- Only the account owner or an admin can read their own row
-- (admins can read all rows via service_role key from backend)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'medshield_identity'
      and tablename  = 'accounts'
      and policyname = 'Accounts: owner read'
  ) then
    create policy "Accounts: owner read"
      on medshield_identity.accounts
      for select
      using (true);   -- backend controls access via service_role key
  end if;
end $$;

-- ------------------------------------------------------------
-- Indexes for fast lookup
-- ------------------------------------------------------------
create index if not exists idx_accounts_username on medshield_identity.accounts (username);
create index if not exists idx_accounts_email    on medshield_identity.accounts (email);
create index if not exists idx_accounts_role     on medshield_identity.accounts (role);

-- No seed data. Accounts are created via the /api/auth/signup endpoint.

-- END OF MIGRATION: 002_accounts.sql


-- START OF MIGRATION: 003_auth_rpc.sql
-- ============================================================
-- Migration: 003_auth_rpc.sql
-- Description: RPC functions for login verification and
--              account creation used by the Flask backend.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Function: verify_login
-- Checks username + password against bcrypt hash.
-- Returns the account row on success, or empty on failure.
-- ------------------------------------------------------------
create or replace function medshield_identity.verify_login(
  p_username text,
  p_password text
)
returns table (
  account_id    bigint,
  username      text,
  email         text,
  role          text,
  is_active     boolean
)
language plpgsql
security definer
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

  -- Update last_login_at if a match was found
  update medshield_identity.accounts
  set last_login_at = now()
  where
    (accounts.username = p_username or accounts.email = p_username)
    and accounts.password_hash = crypt(p_password, accounts.password_hash)
    and accounts.is_active = true;
end;
$$;

-- ------------------------------------------------------------
-- Function: create_account
-- Creates a new account with a bcrypt-hashed password.
-- Returns error text if username/email already exists.
-- ------------------------------------------------------------
create or replace function medshield_identity.create_account(
  p_username text,
  p_email    text,
  p_password text,
  p_role     text default 'viewer'
)
returns table (
  account_id bigint,
  username   text,
  email      text,
  role       text,
  error_msg  text
)
language plpgsql
security definer
as $$
declare
  v_id bigint;
begin
  -- Validate role
  if p_role not in ('admin', 'analyst', 'manager', 'viewer') then
    return query select null::bigint, null::text, null::text, null::text, 'Invalid role';
    return;
  end if;

  -- Check for duplicate username
  if exists (select 1 from medshield_identity.accounts where accounts.username = p_username) then
    return query select null::bigint, null::text, null::text, null::text, 'Username already taken';
    return;
  end if;

  -- Check for duplicate email
  if exists (select 1 from medshield_identity.accounts where accounts.email = p_email) then
    return query select null::bigint, null::text, null::text, null::text, 'Email already registered';
    return;
  end if;

  -- Insert
  insert into medshield_identity.accounts (username, email, password_hash, role)
  values (p_username, p_email, crypt(p_password, gen_salt('bf', 10)), p_role)
  returning accounts.account_id into v_id;

  return query select v_id, p_username, p_email, p_role, null::text;
end;
$$;

-- Grant execute to anon and authenticated roles
grant execute on function medshield_identity.verify_login(text, text)     to anon, authenticated;
grant execute on function medshield_identity.create_account(text, text, text, text) to anon, authenticated;

-- END OF MIGRATION: 003_auth_rpc.sql


-- START OF MIGRATION: 004_dss_schema.sql
-- MedShield DSS warehouse extension.
-- Paste/run after 001_init.sql, 002_accounts.sql, 003_auth_rpc.sql, then seed.sql.
-- This migration keeps the current dashboard warehouse and adds the paper-aligned DSS layer.

create extension if not exists pgcrypto;

-- Legacy flat analytics tables from the earlier prototype are superseded by
-- the connected warehouse facts and views. The dashboard now reads the
-- vw_dashboard_* and vw_dss_* views.
drop table if exists medshield_sales.analytics_totals cascade;
drop table if exists medshield_sales.analytics_monthly cascade;
drop table if exists medshield_sales.analytics_by_area cascade;
drop table if exists medshield_sales.analytics_top_products cascade;
drop table if exists medshield_sales.analytics_year_summary cascade;
drop table if exists medshield_sales.analytics_seasonality cascade;

create table if not exists medshield_etl.dim_source_system (
  source_system_key bigint generated always as identity primary key,
  source_code text not null unique,
  source_name text not null,
  source_type text not null check (source_type in ('internal', 'external_api', 'external_dataset', 'model', 'manual')),
  base_url text,
  refresh_cadence text,
  credibility_note text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists medshield_analytics.dim_model (
  model_key bigint generated always as identity primary key,
  model_code text not null unique,
  model_name text not null,
  analytics_layer text not null check (analytics_layer in ('descriptive', 'predictive', 'prescriptive', 'evaluation')),
  model_family text not null,
  purpose text not null,
  expected_metrics text[] not null default '{}',
  is_in_scope boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists medshield_sales.stg_sales_transactions (
  staging_key bigint generated always as identity primary key,
  source_workbook text not null,
  source_sheet text not null,
  source_row_number integer not null,
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
  row_quality_status text not null default 'pending' check (row_quality_status in ('pending', 'valid', 'warning', 'rejected')),
  row_quality_notes text,
  source_hash text not null unique,
  loaded_at timestamptz not null default now()
);

create table if not exists medshield_sales.fact_sales_transactions (
  sales_transaction_key bigint generated always as identity primary key,
  delivery_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  product_key bigint references medshield_common.dim_product(product_key) on update cascade on delete restrict,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
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
  source_hash text not null unique,
  loaded_at timestamptz not null default now()
);

create table if not exists medshield_external.fact_disease_signal (
  disease_signal_key bigint generated always as identity primary key,
  period_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
  disease_name text not null,
  case_count numeric(18, 2),
  incidence_rate numeric(18, 6),
  disease_intensity_index numeric(9, 4) not null default 0,
  alert_level text not null default 'normal' check (alert_level in ('normal', 'watch', 'warning', 'critical')),
  source_period text not null,
  loaded_at timestamptz not null default now(),
  unique (period_date_key, area_key, disease_name, source_system_key)
);

create table if not exists medshield_external.fact_weather_signal (
  weather_signal_key bigint generated always as identity primary key,
  period_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
  rainfall_mm numeric(18, 4),
  rainfall_severity_index numeric(9, 4) not null default 0,
  typhoon_flag boolean not null default false,
  weather_alert_level text not null default 'normal' check (weather_alert_level in ('normal', 'watch', 'warning', 'critical')),
  source_period text not null,
  loaded_at timestamptz not null default now(),
  unique (period_date_key, area_key, source_system_key)
);

create table if not exists medshield_analytics.fact_forecast_run (
  forecast_run_key bigint generated always as identity primary key,
  model_key bigint not null references medshield_analytics.dim_model(model_key) on update cascade on delete restrict,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
  run_at timestamptz not null default now(),
  training_start_date_key integer references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  training_end_date_key integer references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  forecast_start_date_key integer references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  forecast_end_date_key integer references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  model_version text not null default 'v1',
  parameter_json jsonb not null default '{}'::jsonb,
  metric_json jsonb not null default '{}'::jsonb,
  run_status text not null default 'completed' check (run_status in ('queued', 'running', 'completed', 'failed')),
  notes text
);

create table if not exists medshield_analytics.fact_demand_forecast (
  demand_forecast_key bigint generated always as identity primary key,
  forecast_run_key bigint not null references medshield_analytics.fact_forecast_run(forecast_run_key) on update cascade on delete cascade,
  forecast_period_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  product_key bigint references medshield_common.dim_product(product_key) on update cascade on delete restrict,
  forecast_scope text not null check (forecast_scope in ('overall', 'area', 'product', 'product_area')),
  baseline_demand_value numeric(18, 2) not null default 0,
  adjusted_demand_value numeric(18, 2) not null default 0,
  lower_bound_value numeric(18, 2),
  upper_bound_value numeric(18, 2),
  disease_adjustment_factor numeric(9, 4) not null default 1,
  weather_adjustment_factor numeric(9, 4) not null default 1,
  confidence_level numeric(6, 4),
  created_at timestamptz not null default now(),
  unique (forecast_run_key, forecast_period_date_key, area_key, product_key, forecast_scope)
);

create table if not exists medshield_analytics.fact_product_priority (
  product_priority_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references medshield_common.dim_product(product_key) on update cascade on delete restrict,
  model_key bigint references medshield_analytics.dim_model(model_key) on update cascade on delete restrict,
  abc_classification text not null check (abc_classification in ('A', 'B', 'C')),
  pareto_rank integer not null,
  cumulative_revenue_pct numeric(9, 4) not null default 0,
  demand_score numeric(9, 4) not null default 0,
  margin_score numeric(9, 4) not null default 0,
  xgboost_urgency_score numeric(9, 4) not null default 0,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  recommendation text,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, product_key)
);

create table if not exists medshield_analytics.fact_area_cluster (
  area_cluster_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint not null references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  model_key bigint references medshield_analytics.dim_model(model_key) on update cascade on delete restrict,
  cluster_label text not null,
  cluster_profile text not null,
  revenue_score numeric(9, 4) not null default 0,
  demand_growth_score numeric(9, 4) not null default 0,
  outbreak_risk_index numeric(9, 4) not null default 0,
  planning_implication text,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, area_key)
);

create table if not exists medshield_analytics.fact_regional_priority (
  regional_priority_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint not null references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  model_key bigint references medshield_analytics.dim_model(model_key) on update cascade on delete restrict,
  revenue_weight numeric(9, 4) not null default 0.40,
  growth_weight numeric(9, 4) not null default 0.35,
  outbreak_risk_weight numeric(9, 4) not null default 0.25,
  revenue_score numeric(9, 4) not null default 0,
  growth_score numeric(9, 4) not null default 0,
  outbreak_risk_index numeric(9, 4) not null default 0,
  mcda_score numeric(9, 4) not null default 0,
  priority_rank integer not null,
  recommendation text,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, area_key)
);

create table if not exists medshield_analytics.fact_inventory_recommendation (
  inventory_recommendation_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references medshield_common.dim_product(product_key) on update cascade on delete restrict,
  area_key bigint references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  model_key bigint references medshield_analytics.dim_model(model_key) on update cascade on delete restrict,
  annual_demand_units numeric(18, 4) not null default 0,
  ordering_cost_php numeric(18, 2) not null default 0,
  holding_cost_php numeric(18, 2) not null default 0,
  lead_time_days numeric(9, 2) not null default 0,
  demand_stddev_units numeric(18, 4) not null default 0,
  service_level numeric(6, 4) not null default 0.95,
  eoq_units numeric(18, 4) not null default 0,
  reorder_point_units numeric(18, 4) not null default 0,
  safety_stock_units numeric(18, 4) not null default 0,
  current_stock_units numeric(18, 4),
  forecast_demand_units numeric(18, 4),
  stock_gap_units numeric(18, 4),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  recommendation text,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, product_key, area_key)
);

create table if not exists medshield_analytics.fact_allocation_recommendation (
  allocation_recommendation_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references medshield_common.dim_product(product_key) on update cascade on delete restrict,
  area_key bigint not null references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  model_key bigint references medshield_analytics.dim_model(model_key) on update cascade on delete restrict,
  available_units numeric(18, 4) not null default 0,
  recommended_units numeric(18, 4) not null default 0,
  objective_value numeric(18, 4),
  optimization_gap numeric(9, 4),
  constraint_notes text,
  recommendation text,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, product_key, area_key)
);

create table if not exists medshield_analytics.fact_product_region_match (
  product_region_match_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references medshield_common.dim_product(product_key) on update cascade on delete restrict,
  area_key bigint not null references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  model_key bigint references medshield_analytics.dim_model(model_key) on update cascade on delete restrict,
  similarity_score numeric(9, 4) not null default 0,
  match_rank integer not null,
  recommendation text,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, product_key, area_key)
);

create table if not exists medshield_analytics.fact_decision_alert (
  decision_alert_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  alert_date_key integer not null references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references medshield_common.dim_area(area_key) on update cascade on delete restrict,
  product_key bigint references medshield_common.dim_product(product_key) on update cascade on delete restrict,
  model_key bigint references medshield_analytics.dim_model(model_key) on update cascade on delete restrict,
  alert_type text not null check (alert_type in ('stock_gap', 'disease_surge', 'weather_risk', 'allocation', 'forecast_variance')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  trigger_metric text not null,
  threshold_value numeric(18, 4),
  observed_value numeric(18, 4),
  demand_multiplier numeric(9, 4) not null default 1,
  recommendation text not null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'closed')),
  loaded_at timestamptz not null default now()
);

create table if not exists medshield_analytics.fact_model_evaluation (
  model_evaluation_key bigint generated always as identity primary key,
  model_key bigint not null references medshield_analytics.dim_model(model_key) on update cascade on delete restrict,
  evaluation_start_date_key integer references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  evaluation_end_date_key integer references medshield_common.dim_date(date_key) on update cascade on delete restrict,
  metric_name text not null,
  metric_value numeric(18, 6) not null,
  target_direction text not null check (target_direction in ('minimize', 'maximize', 'monitor')),
  benchmark_value numeric(18, 6),
  passed boolean,
  notes text,
  evaluated_at timestamptz not null default now(),
  unique (model_key, metric_name, evaluation_start_date_key, evaluation_end_date_key)
);

create table if not exists medshield_etl.etl_pipeline_run (
  pipeline_run_key bigint generated always as identity primary key,
  pipeline_name text not null,
  run_status text not null check (run_status in ('queued', 'running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source_period_start date,
  source_period_end date,
  rows_extracted integer not null default 0,
  rows_loaded integer not null default 0,
  rows_rejected integer not null default 0,
  quality_summary jsonb not null default '{}'::jsonb,
  error_message text
);

create table if not exists medshield_etl.etl_source_extract (
  source_extract_key bigint generated always as identity primary key,
  pipeline_run_key bigint references medshield_etl.etl_pipeline_run(pipeline_run_key) on update cascade on delete cascade,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
  source_name text not null,
  source_uri text,
  extracted_at timestamptz not null default now(),
  source_period_start date,
  source_period_end date,
  record_count integer not null default 0,
  checksum text,
  metadata_json jsonb not null default '{}'::jsonb
);

insert into medshield_etl.dim_source_system (
  source_code,
  source_name,
  source_type,
  base_url,
  refresh_cadence,
  credibility_note
) values
  ('MEDSHIELD_XLSX', 'MedShield 2021-2025 Sales Report workbook', 'internal', null, 'Manual upload per reporting cycle', 'Internal source workbook supplied by MedShield for capstone analysis.'),
  ('SUPABASE_WAREHOUSE', 'Supabase PostgreSQL warehouse', 'internal', null, 'Near real-time after ETL load', 'Repository-controlled analytical warehouse and dashboard source of truth.'),
  ('DOH_FOI_OR_OPEN_DATA', 'Department of Health disease surveillance data', 'external_dataset', 'https://www.foi.gov.ph/agencies/doh/', 'Monthly or per approved data request', 'Credible public-sector source for disease signals; use FOI/Open Data exports when a stable medshield API is unavailable.'),
  ('PAGASA_CLIMATE', 'DOST-PAGASA climate and rainfall products', 'external_dataset', 'https://bagong.pagasa.dost.gov.ph/', 'Daily, ten-day, monthly, or published product cadence', 'Official Philippine meteorological agency source for rainfall and typhoon risk indicators.'),
  ('OPENWEATHER_ONECALL', 'OpenWeather One Call API', 'external_api', 'https://openweathermap.org/api/one-call-3', 'API provider update cadence', 'Optional fallback weather API for coordinate-based weather history/forecast when official PAGASA machine-readable data is not available.'),
  ('PYTHON_ANALYTICS', 'Python analytics services', 'model', null, 'On demand', 'Repository-owned model execution layer for DSS outputs.')
on conflict (source_code) do update set
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  base_url = excluded.base_url,
  refresh_cadence = excluded.refresh_cadence,
  credibility_note = excluded.credibility_note,
  is_active = true;

insert into medshield_analytics.dim_model (
  model_code,
  model_name,
  analytics_layer,
  model_family,
  purpose,
  expected_metrics
) values
  ('ABC_PARETO', 'ABC and Pareto product prioritization', 'descriptive', 'classification', 'Classify products by revenue contribution and cumulative concentration.', array['cumulative_revenue_pct', 'rank_consistency']),
  ('KMEANS_AREA', 'K-Means area clustering', 'descriptive', 'clustering', 'Group territories and channels by revenue, growth, and risk profile.', array['silhouette_score', 'davies_bouldin_index']),
  ('STL_SEASONALITY', 'STL seasonality decomposition', 'descriptive', 'time_series_decomposition', 'Expose recurring seasonal demand patterns before forecasting.', array['seasonal_strength']),
  ('PROPHET_BASELINE', 'Facebook Prophet baseline forecast', 'predictive', 'time_series_forecast', 'Forecast overall and territory demand from historical sales patterns.', array['mae', 'rmse', 'mape']),
  ('PROPHET_EXTERNAL', 'Prophet with DOH and PAGASA regressors', 'predictive', 'time_series_forecast', 'Adjust demand forecasts using disease and weather indicators.', array['mae', 'rmse', 'mape']),
  ('XGBOOST_URGENCY', 'XGBoost demand urgency scoring', 'predictive', 'gradient_boosting', 'Score product demand urgency for product prioritization and alerts.', array['mae', 'rmse', 'mape']),
  ('EOQ_ROP_SAFETY', 'EOQ, reorder point, and safety stock', 'prescriptive', 'inventory_optimization', 'Calculate reorder quantity, reorder point, and buffer stock from forecast demand.', array['cost_deviation', 'fulfillment_rate']),
  ('MCDA_REGIONAL', 'MCDA regional prioritization', 'prescriptive', 'weighted_scoring', 'Rank regions using revenue, demand growth, and outbreak risk.', array['ranking_consistency']),
  ('LINEAR_ALLOCATION', 'Linear programming stock allocation', 'prescriptive', 'optimization', 'Recommend constrained product allocation across territories.', array['optimization_gap']),
  ('COLLAB_PRODUCT_REGION', 'Collaborative filtering product-region matching', 'prescriptive', 'similarity_matching', 'Recommend product-region matches from historical demand similarity.', array['cosine_similarity']),
  ('ALERT_THRESHOLDS', 'Rule-based threshold alerts', 'prescriptive', 'rules_engine', 'Create procurement, disease, and weather contingency alerts from thresholds.', array['precision', 'recall', 'alert_accuracy'])
on conflict (model_code) do update set
  model_name = excluded.model_name,
  analytics_layer = excluded.analytics_layer,
  model_family = excluded.model_family,
  purpose = excluded.purpose,
  expected_metrics = excluded.expected_metrics,
  is_in_scope = true;

create index if not exists idx_fact_sales_transactions_date on medshield_sales.fact_sales_transactions (delivery_date_key);
create index if not exists idx_fact_sales_transactions_area on medshield_sales.fact_sales_transactions (area_key);
create index if not exists idx_fact_sales_transactions_product on medshield_sales.fact_sales_transactions (product_key);
create index if not exists idx_fact_demand_forecast_period on medshield_analytics.fact_demand_forecast (forecast_period_date_key);
create index if not exists idx_fact_inventory_recommendation_snapshot on medshield_analytics.fact_inventory_recommendation (snapshot_date_key);
create index if not exists idx_fact_regional_priority_snapshot on medshield_analytics.fact_regional_priority (snapshot_date_key);
create index if not exists idx_fact_decision_alert_status on medshield_analytics.fact_decision_alert (status, severity);

alter table medshield_etl.dim_source_system enable row level security;
alter table medshield_analytics.dim_model enable row level security;
alter table medshield_sales.stg_sales_transactions enable row level security;
alter table medshield_sales.fact_sales_transactions enable row level security;
alter table medshield_external.fact_disease_signal enable row level security;
alter table medshield_external.fact_weather_signal enable row level security;
alter table medshield_analytics.fact_forecast_run enable row level security;
alter table medshield_analytics.fact_demand_forecast enable row level security;
alter table medshield_analytics.fact_product_priority enable row level security;
alter table medshield_analytics.fact_area_cluster enable row level security;
alter table medshield_analytics.fact_regional_priority enable row level security;
alter table medshield_analytics.fact_inventory_recommendation enable row level security;
alter table medshield_analytics.fact_allocation_recommendation enable row level security;
alter table medshield_analytics.fact_product_region_match enable row level security;
alter table medshield_analytics.fact_decision_alert enable row level security;
alter table medshield_analytics.fact_model_evaluation enable row level security;
alter table medshield_etl.etl_pipeline_run enable row level security;
alter table medshield_etl.etl_source_extract enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'dim_source_system'
  ] loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'medshield_etl'
        and tablename = tbl
        and policyname = 'Public read'
    ) then
      execute format('create policy "Public read" on medshield_etl.%I for select using (true);', tbl);
    end if;
  end loop;

  foreach tbl in array array[
    'fact_disease_signal',
    'fact_weather_signal'
  ] loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'medshield_external'
        and tablename = tbl
        and policyname = 'Public read'
    ) then
      execute format('create policy "Public read" on medshield_external.%I for select using (true);', tbl);
    end if;
  end loop;

  foreach tbl in array array[
    'dim_model',
    'fact_forecast_run',
    'fact_demand_forecast',
    'fact_product_priority',
    'fact_area_cluster',
    'fact_regional_priority',
    'fact_inventory_recommendation',
    'fact_allocation_recommendation',
    'fact_product_region_match',
    'fact_decision_alert',
    'fact_model_evaluation'
  ] loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'medshield_analytics'
        and tablename = tbl
        and policyname = 'Public read'
    ) then
      execute format('create policy "Public read" on medshield_analytics.%I for select using (true);', tbl);
    end if;
  end loop;
end $$;

drop view if exists medshield_analytics.vw_dss_forecasts cascade;
create or replace view medshield_analytics.vw_dss_forecasts as
select
  d.year_month as period,
  coalesce(a.area_name, 'All') as area,
  coalesce(p.product_name, 'All') as product,
  m.model_code,
  m.model_name,
  f.forecast_scope,
  f.baseline_demand_value as baseline_forecast,
  f.adjusted_demand_value as adjusted_forecast,
  f.lower_bound_value as lower_bound,
  f.upper_bound_value as upper_bound,
  f.disease_adjustment_factor,
  f.weather_adjustment_factor,
  f.confidence_level
from medshield_analytics.fact_demand_forecast f
join medshield_analytics.fact_forecast_run r on r.forecast_run_key = f.forecast_run_key
join medshield_analytics.dim_model m on m.model_key = r.model_key
join medshield_common.dim_date d on d.date_key = f.forecast_period_date_key
left join medshield_common.dim_area a on a.area_key = f.area_key
left join medshield_common.dim_product p on p.product_key = f.product_key
order by d.calendar_date, area, product;

drop view if exists medshield_analytics.vw_dss_external_signals cascade;
create or replace view medshield_analytics.vw_dss_external_signals as
with disease as (
  select
    period_date_key,
    area_key,
    avg(disease_intensity_index) as disease_intensity_index,
    max(alert_level) as disease_alert_level,
    string_agg(distinct disease_name, ', ' order by disease_name) as disease_names
  from medshield_external.fact_disease_signal
  group by period_date_key, area_key
),
weather as (
  select
    period_date_key,
    area_key,
    avg(rainfall_severity_index) as rainfall_severity_index,
    max(weather_alert_level) as weather_alert_level,
    bool_or(typhoon_flag) as typhoon_flag
  from medshield_external.fact_weather_signal
  group by period_date_key, area_key
)
select
  d.year_month as period,
  coalesce(a.area_name, 'All') as area,
  disease.disease_names,
  coalesce(disease.disease_intensity_index, 0)::numeric(9, 4) as disease_intensity_index,
  coalesce(weather.rainfall_severity_index, 0)::numeric(9, 4) as rainfall_severity_index,
  coalesce(disease.disease_alert_level, 'normal') as disease_alert_level,
  coalesce(weather.weather_alert_level, 'normal') as weather_alert_level,
  coalesce(weather.typhoon_flag, false) as typhoon_flag
from disease
full outer join weather
  on weather.period_date_key = disease.period_date_key
 and weather.area_key is not distinct from disease.area_key
join medshield_common.dim_date d on d.date_key = coalesce(disease.period_date_key, weather.period_date_key)
left join medshield_common.dim_area a on a.area_key = coalesce(disease.area_key, weather.area_key)
order by d.calendar_date, area;

drop view if exists medshield_analytics.vw_dss_inventory_recommendations cascade;
create or replace view medshield_analytics.vw_dss_inventory_recommendations as
select
  d.year_month as snapshot_period,
  p.product_name as product,
  coalesce(a.area_name, 'All') as area,
  m.model_code,
  f.annual_demand_units,
  f.eoq_units,
  f.reorder_point_units,
  f.safety_stock_units,
  f.current_stock_units,
  f.forecast_demand_units,
  f.stock_gap_units,
  f.risk_level,
  f.recommendation
from medshield_analytics.fact_inventory_recommendation f
join medshield_common.dim_date d on d.date_key = f.snapshot_date_key
join medshield_common.dim_product p on p.product_key = f.product_key
left join medshield_common.dim_area a on a.area_key = f.area_key
left join medshield_analytics.dim_model m on m.model_key = f.model_key
order by
  case f.risk_level when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
  p.product_name;

drop view if exists medshield_analytics.vw_dss_regional_priorities cascade;
create or replace view medshield_analytics.vw_dss_regional_priorities as
select
  d.year_month as snapshot_period,
  a.area_name as area,
  m.model_code,
  f.priority_rank,
  f.revenue_weight,
  f.growth_weight,
  f.outbreak_risk_weight,
  f.revenue_score,
  f.growth_score,
  f.outbreak_risk_index,
  f.mcda_score,
  f.recommendation
from medshield_analytics.fact_regional_priority f
join medshield_common.dim_date d on d.date_key = f.snapshot_date_key
join medshield_common.dim_area a on a.area_key = f.area_key
left join medshield_analytics.dim_model m on m.model_key = f.model_key
order by f.priority_rank;

drop view if exists medshield_analytics.vw_dss_area_clusters cascade;
create or replace view medshield_analytics.vw_dss_area_clusters as
select
  d.year_month as snapshot_period,
  a.area_name as area,
  m.model_code,
  f.cluster_label,
  f.cluster_profile,
  f.revenue_score,
  f.demand_growth_score,
  f.outbreak_risk_index,
  f.planning_implication
from medshield_analytics.fact_area_cluster f
join medshield_common.dim_date d on d.date_key = f.snapshot_date_key
join medshield_common.dim_area a on a.area_key = f.area_key
left join medshield_analytics.dim_model m on m.model_key = f.model_key
order by f.cluster_label, a.area_name;

drop view if exists medshield_analytics.vw_dss_product_priorities cascade;
create or replace view medshield_analytics.vw_dss_product_priorities as
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
from medshield_analytics.fact_product_priority f
join medshield_common.dim_date d on d.date_key = f.snapshot_date_key
join medshield_common.dim_product p on p.product_key = f.product_key
left join medshield_analytics.dim_model m on m.model_key = f.model_key
order by f.pareto_rank;

drop view if exists medshield_analytics.vw_dss_allocation_recommendations cascade;
create or replace view medshield_analytics.vw_dss_allocation_recommendations as
select
  d.year_month as snapshot_period,
  p.product_name as product,
  a.area_name as area,
  m.model_code,
  f.available_units,
  f.recommended_units,
  f.objective_value,
  f.optimization_gap,
  f.constraint_notes,
  f.recommendation
from medshield_analytics.fact_allocation_recommendation f
join medshield_common.dim_date d on d.date_key = f.snapshot_date_key
join medshield_common.dim_product p on p.product_key = f.product_key
join medshield_common.dim_area a on a.area_key = f.area_key
left join medshield_analytics.dim_model m on m.model_key = f.model_key
order by p.product_name, a.area_name;

drop view if exists medshield_analytics.vw_dss_product_region_matches cascade;
create or replace view medshield_analytics.vw_dss_product_region_matches as
select
  d.year_month as snapshot_period,
  p.product_name as product,
  a.area_name as area,
  m.model_code,
  f.similarity_score,
  f.match_rank,
  f.recommendation
from medshield_analytics.fact_product_region_match f
join medshield_common.dim_date d on d.date_key = f.snapshot_date_key
join medshield_common.dim_product p on p.product_key = f.product_key
join medshield_common.dim_area a on a.area_key = f.area_key
left join medshield_analytics.dim_model m on m.model_key = f.model_key
order by f.match_rank, p.product_name, a.area_name;

drop view if exists medshield_analytics.vw_dss_decision_alerts cascade;
create or replace view medshield_analytics.vw_dss_decision_alerts as
select
  sd.year_month as snapshot_period,
  ad.calendar_date as alert_date,
  coalesce(a.area_name, 'All') as area,
  coalesce(p.product_name, 'All') as product,
  m.model_code,
  f.alert_type,
  f.severity,
  f.trigger_metric,
  f.threshold_value,
  f.observed_value,
  f.demand_multiplier,
  f.recommendation,
  f.status
from medshield_analytics.fact_decision_alert f
join medshield_common.dim_date sd on sd.date_key = f.snapshot_date_key
join medshield_common.dim_date ad on ad.date_key = f.alert_date_key
left join medshield_common.dim_area a on a.area_key = f.area_key
left join medshield_common.dim_product p on p.product_key = f.product_key
left join medshield_analytics.dim_model m on m.model_key = f.model_key
order by
  case f.severity when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
  ad.calendar_date desc;

drop view if exists medshield_analytics.vw_dss_model_evaluation cascade;
create or replace view medshield_analytics.vw_dss_model_evaluation as
select
  m.model_code,
  m.model_name,
  m.analytics_layer,
  f.metric_name,
  f.metric_value,
  f.target_direction,
  f.benchmark_value,
  f.passed,
  f.notes,
  f.evaluated_at
from medshield_analytics.fact_model_evaluation f
join medshield_analytics.dim_model m on m.model_key = f.model_key
order by m.analytics_layer, m.model_code, f.metric_name;

comment on table medshield_sales.stg_sales_transactions is 'Raw landing table for Sales Report.xlsx rows. Preserves messy source values before transformation.';
comment on table medshield_sales.fact_sales_transactions is 'Normalized transaction-level sales fact from the 2021-2025 workbook.';
comment on table medshield_external.fact_disease_signal is 'DOH/FOI/Open Data disease indicators used as external forecast regressors and alert inputs.';
comment on table medshield_external.fact_weather_signal is 'PAGASA or approved weather indicators used as external forecast regressors and typhoon contingency inputs.';
comment on table medshield_analytics.fact_demand_forecast is 'Prophet baseline and external-regressor demand forecast output.';
comment on table medshield_analytics.fact_product_priority is 'ABC/Pareto and XGBoost product prioritization output.';
comment on table medshield_analytics.fact_inventory_recommendation is 'EOQ, reorder point, safety stock, and stock gap recommendation output.';
comment on table medshield_analytics.fact_regional_priority is 'MCDA regional priority ranking output.';
comment on table medshield_analytics.fact_allocation_recommendation is 'Linear programming stock allocation recommendation output.';
comment on table medshield_analytics.fact_product_region_match is 'Collaborative filtering product-region matching output.';
comment on table medshield_etl.etl_pipeline_run is 'ETL run ledger for internal sales, DOH, PAGASA, and model output loads.';

-- END OF MIGRATION: 004_dss_schema.sql


-- START OF MIGRATION: 005_sales_ingestion_weather.sql
-- Production ingestion, canonical sales view, aggregate refresh, and weather provenance.
-- Apply after 004_dss_schema.sql.

alter table medshield_common.dim_date
  drop constraint if exists dim_date_year_month_key;
create index if not exists idx_dim_date_year_month
  on medshield_common.dim_date (year_month);

alter table medshield_sales.fact_monthly_sales
  drop constraint if exists fact_monthly_sales_source_period_key;
create unique index if not exists uq_fact_monthly_sales_snapshot_period
  on medshield_sales.fact_monthly_sales (snapshot_date_key, source_period);

alter table medshield_sales.stg_sales_transactions
  add column if not exists pipeline_run_key bigint references medshield_etl.etl_pipeline_run(pipeline_run_key) on delete set null,
  add column if not exists input_stage text not null default 'raw_medshield',
  add column if not exists standardization_applied jsonb not null default '[]'::jsonb;

alter table medshield_sales.fact_sales_transactions
  add column if not exists pipeline_run_key bigint references medshield_etl.etl_pipeline_run(pipeline_run_key) on delete set null;

alter table medshield_external.fact_weather_signal
  add column if not exists rainfall_severity_proxy numeric(9, 4) not null default 0,
  add column if not exists rainy_days integer not null default 0,
  add column if not exists avg_temperature_c numeric(9, 4),
  add column if not exists avg_relative_humidity_pct numeric(9, 4),
  add column if not exists max_wind_speed_kph numeric(9, 4),
  add column if not exists weather_adjustment_factor numeric(9, 4) not null default 1,
  add column if not exists high_wind_watch boolean not null default false,
  add column if not exists provider_code text;

update medshield_external.fact_weather_signal
set rainfall_severity_proxy = rainfall_severity_index
where rainfall_severity_proxy = 0
  and rainfall_severity_index <> 0;

create unique index if not exists uq_fact_weather_signal_period_area_source
  on medshield_external.fact_weather_signal (period_date_key, area_key, source_system_key);

insert into medshield_etl.dim_source_system (
  source_code,
  source_name,
  source_type,
  base_url,
  refresh_cadence,
  credibility_note
) values
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

drop view if exists medshield_sales.vw_sales_transactions cascade;
create or replace view medshield_sales.vw_sales_transactions as
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

revoke all on medshield_sales.vw_sales_transactions from public, anon, authenticated;
grant select on medshield_sales.vw_sales_transactions to service_role;

create or replace function medshield_sales.refresh_sales_aggregates(p_snapshot_date_key integer)
returns void
language plpgsql
security definer
set search_path = public
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
    sum(f.net_cost_amount),
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
    sum(f.net_cost_amount),
    sum(f.net_income_amount),
    dense_rank() over (order by sum(f.net_cost_amount) desc),
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
      sum(f.net_cost_amount) as revenue,
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
    sum(f.net_cost_amount),
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
      sum(f.net_cost_amount) as revenue
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

revoke all on function medshield_sales.refresh_sales_aggregates(integer) from public, anon, authenticated;
grant execute on function medshield_sales.refresh_sales_aggregates(integer) to service_role;

drop view if exists medshield_analytics.vw_dss_external_signals cascade;
create or replace view medshield_analytics.vw_dss_external_signals as
with disease as (
  select
    period_date_key,
    area_key,
    avg(disease_intensity_index) as disease_intensity_index,
    max(alert_level) as disease_alert_level,
    string_agg(distinct disease_name, ', ' order by disease_name) as disease_names
  from medshield_external.fact_disease_signal
  group by period_date_key, area_key
),
weather as (
  select
    period_date_key,
    area_key,
    avg(rainfall_severity_proxy) as rainfall_severity_proxy,
    max(weather_alert_level) as weather_alert_level,
    bool_or(high_wind_watch) as high_wind_watch,
    avg(weather_adjustment_factor) as weather_adjustment_factor,
    max(provider_code) as provider_code
  from medshield_external.fact_weather_signal
  group by period_date_key, area_key
)
select
  d.year_month as period,
  coalesce(a.area_name, 'All') as area,
  disease.disease_names,
  coalesce(disease.disease_intensity_index, 0)::numeric(9, 4) as disease_intensity_index,
  coalesce(weather.rainfall_severity_proxy, 0)::numeric(9, 4) as rainfall_severity_index,
  coalesce(disease.disease_alert_level, 'normal') as disease_alert_level,
  coalesce(weather.weather_alert_level, 'normal') as weather_alert_level,
  false as typhoon_flag,
  coalesce(weather.high_wind_watch, false) as high_wind_watch,
  coalesce(weather.weather_adjustment_factor, 1)::numeric(9, 4) as weather_adjustment_factor,
  weather.provider_code,
  coalesce(weather.rainfall_severity_proxy, 0)::numeric(9, 4) as rainfall_severity_proxy
from disease
full outer join weather
  on weather.period_date_key = disease.period_date_key
 and weather.area_key is not distinct from disease.area_key
join medshield_common.dim_date d on d.date_key = coalesce(disease.period_date_key, weather.period_date_key)
left join medshield_common.dim_area a on a.area_key = coalesce(disease.area_key, weather.area_key)
order by d.calendar_date, area;

-- Transaction rows, raw staging rows, and ETL ledgers are server-side only.
drop policy if exists "Public read" on medshield_sales.stg_sales_transactions;
drop policy if exists "Public read" on medshield_sales.fact_sales_transactions;
drop policy if exists "Public read" on medshield_etl.etl_pipeline_run;
drop policy if exists "Public read" on medshield_etl.etl_source_extract;

comment on view medshield_sales.vw_sales_transactions is
  'Canonical 13-column cleaned MedShield sales transaction view with source lineage.';
comment on column medshield_external.fact_weather_signal.rainfall_severity_proxy is
  'Derived planning proxy from NASA POWER or Open-Meteo observations; not official PAGASA RSI.';

-- END OF MIGRATION: 005_sales_ingestion_weather.sql


-- START OF MIGRATION: 006_business_rules_master_data.sql
-- Business-rule aligned master data, sales lineage, external staging, and revenue fix.
-- Apply after 005_sales_ingestion_weather.sql and before seed.sql on a fresh setup.

create extension if not exists pgcrypto;

alter table medshield_common.dim_area
  add column if not exists area_type text not null default 'unmapped'
    check (area_type in ('territory', 'customer_type', 'business_line', 'unmapped')),
  add column if not exists region_name text,
  add column if not exists province_city text,
  add column if not exists latitude numeric(10, 6),
  add column if not exists longitude numeric(10, 6),
  add column if not exists mapping_status text not null default 'needs_review'
    check (mapping_status in ('proposed', 'approved', 'rejected', 'needs_review')),
  add column if not exists review_notes text;

update medshield_common.dim_area
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

alter table medshield_common.dim_product
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

update medshield_common.dim_product
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

create table if not exists medshield_common.dim_product_alias (
  product_alias_key bigint generated always as identity primary key,
  raw_product text not null unique,
  product_key bigint references medshield_common.dim_product(product_key) on update cascade on delete set null,
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

insert into medshield_common.dim_product_alias (
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
from medshield_common.dim_product p
on conflict (raw_product) do update set
  product_key = excluded.product_key,
  canonical_sku = excluded.canonical_sku,
  product_category = excluded.product_category,
  forecast_eligible = excluded.forecast_eligible,
  mapping_status = excluded.mapping_status,
  is_contract_name = excluded.is_contract_name,
  allocation_method = excluded.allocation_method,
  review_notes = coalesce(medshield_common.dim_product_alias.review_notes, excluded.review_notes),
  updated_at = now();

alter table medshield_sales.stg_sales_transactions
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

alter table medshield_sales.fact_sales_transactions
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

update medshield_sales.fact_sales_transactions f
set
  product_raw = coalesce(f.product_raw, p.product_name),
  canonical_sku = coalesce(f.canonical_sku, p.canonical_sku, p.product_name),
  is_contract_allocation = coalesce(f.is_contract_allocation, false)
from medshield_common.dim_product p
where p.product_key = f.product_key
  and (f.product_raw is null or f.canonical_sku is null);

create table if not exists medshield_external.fact_data_completeness (
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

create table if not exists medshield_external.stg_doh_historical (
  doh_staging_key bigint generated always as identity primary key,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
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

create table if not exists medshield_external.stg_pagasa_historical (
  pagasa_staging_key bigint generated always as identity primary key,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
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

create table if not exists medshield_external.stg_weather_api_observations (
  weather_api_staging_key bigint generated always as identity primary key,
  source_system_key bigint references medshield_etl.dim_source_system(source_system_key) on update cascade on delete restrict,
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

insert into medshield_external.fact_data_completeness (
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
  0,
  'Known 2025 completeness issue from processed sales profile. Do not use 2025 as full holdout until reconciled.',
  s.source_system_key,
  false,
  'Use 2021-2024 for primary training; use 2025 only as partial secondary validation until approved.'
from medshield_common.dim_date d
left join medshield_etl.dim_source_system s on s.source_code = 'MEDSHIELD_XLSX'
where d.calendar_year = 2025
  and d.day_of_month = 1
on conflict (dataset_code, period_date_key, area_key) do update set
  completeness_status = excluded.completeness_status,
  expected_record_count = excluded.expected_record_count,
  actual_record_count = excluded.actual_record_count,
  rejected_record_count = excluded.rejected_record_count,
  issue_summary = excluded.issue_summary,
  source_system_key = excluded.source_system_key,
  approved_for_modeling = excluded.approved_for_modeling,
  notes = excluded.notes,
  loaded_at = now();

create index if not exists idx_dim_area_area_type on medshield_common.dim_area (area_type);
create index if not exists idx_dim_product_canonical_sku on medshield_common.dim_product (canonical_sku);
create index if not exists idx_dim_product_alias_canonical_sku on medshield_common.dim_product_alias (canonical_sku);
create index if not exists idx_fact_sales_transactions_canonical_sku on medshield_sales.fact_sales_transactions (canonical_sku);
create index if not exists idx_fact_sales_transactions_allocation on medshield_sales.fact_sales_transactions (is_contract_allocation, allocation_group_id);
create index if not exists idx_fact_data_completeness_dataset_period on medshield_external.fact_data_completeness (dataset_code, period_date_key);
create index if not exists idx_stg_doh_observation_date on medshield_external.stg_doh_historical (observation_date);
create index if not exists idx_stg_pagasa_observation_date on medshield_external.stg_pagasa_historical (observation_date);
create index if not exists idx_stg_weather_api_observation_date on medshield_external.stg_weather_api_observations (observation_date);

alter table medshield_common.dim_product_alias enable row level security;
alter table medshield_external.fact_data_completeness enable row level security;
alter table medshield_external.stg_doh_historical enable row level security;
alter table medshield_external.stg_pagasa_historical enable row level security;
alter table medshield_external.stg_weather_api_observations enable row level security;

do $$
declare
  tbl text;
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'medshield_common'
      and tablename = 'dim_product_alias'
      and policyname = 'Public read'
  ) then
    create policy "Public read" on medshield_common.dim_product_alias for select using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'medshield_external'
      and tablename = 'fact_data_completeness'
      and policyname = 'Public read'
  ) then
    create policy "Public read" on medshield_external.fact_data_completeness for select using (true);
  end if;
end $$;

drop policy if exists "Public read" on medshield_external.stg_doh_historical;
drop policy if exists "Public read" on medshield_external.stg_pagasa_historical;
drop policy if exists "Public read" on medshield_external.stg_weather_api_observations;

drop view if exists medshield_common.vw_product_master_status cascade;
create or replace view medshield_common.vw_product_master_status as
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
from medshield_common.dim_product p
left join medshield_common.dim_product_alias a on a.product_key = p.product_key
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

drop view if exists medshield_common.vw_area_mapping_status cascade;
create or replace view medshield_common.vw_area_mapping_status as
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
from medshield_common.dim_area
order by area_type, area_name;

drop view if exists medshield_external.vw_data_completeness_status cascade;
create or replace view medshield_external.vw_data_completeness_status as
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
from medshield_external.fact_data_completeness f
join medshield_common.dim_date d on d.date_key = f.period_date_key
left join medshield_common.dim_area a on a.area_key = f.area_key
order by f.dataset_code, d.calendar_date, area;

drop view if exists medshield_sales.vw_sales_transactions cascade;
create or replace view medshield_sales.vw_sales_transactions as
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
from medshield_sales.fact_sales_transactions f
join medshield_common.dim_date d on d.date_key = f.delivery_date_key
left join medshield_common.dim_area a on a.area_key = f.area_key
left join medshield_common.dim_product p on p.product_key = f.product_key;

revoke all on medshield_sales.vw_sales_transactions from public, anon, authenticated;
grant select on medshield_sales.vw_sales_transactions to service_role;

create or replace function medshield_sales.refresh_sales_aggregates(p_snapshot_date_key integer)
returns void
language plpgsql
security definer
set search_path = public
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

revoke all on function medshield_sales.refresh_sales_aggregates(integer) from public, anon, authenticated;
grant execute on function medshield_sales.refresh_sales_aggregates(integer) to service_role;

comment on table medshield_common.dim_product_alias is 'Controlled raw-product to canonical-SKU mapping table used before SKU-level modeling.';
comment on table medshield_external.fact_data_completeness is 'Period-level completeness ledger for sales, DOH, PAGASA, and weather API sources.';
comment on table medshield_external.stg_doh_historical is 'Raw-to-clean staging table for historical DOH disease data.';
comment on table medshield_external.stg_pagasa_historical is 'Raw-to-clean staging table for historical PAGASA weather data.';
comment on table medshield_external.stg_weather_api_observations is 'Raw-to-clean staging table for coordinate-based historical weather API observations.';
comment on column medshield_sales.fact_sales_transactions.total_trade_price_amount is 'Approved sales revenue field for dashboards and model evaluation.';
comment on column medshield_sales.fact_sales_transactions.net_income_amount is 'Workbook gross margin/profit amount. Do not describe as company net profit without expense data.';
comment on column medshield_sales.fact_sales_transactions.is_contract_allocation is 'True when a row came from backward approximation of a contract-name row.';

-- END OF MIGRATION: 006_business_rules_master_data.sql


-- START OF SEED DATA
-- Seed data transformed from the current MedShield dashboard snapshot.
-- The warehouse tables are the source of truth for the API and dashboard views.

truncate table
  medshield_external.stg_weather_api_observations,
  medshield_external.stg_pagasa_historical,
  medshield_external.stg_doh_historical,
  medshield_external.fact_data_completeness,
  medshield_common.dim_product_alias,
  medshield_analytics.fact_model_evaluation,
  medshield_analytics.fact_decision_alert,
  medshield_analytics.fact_product_region_match,
  medshield_analytics.fact_allocation_recommendation,
  medshield_analytics.fact_inventory_recommendation,
  medshield_analytics.fact_regional_priority,
  medshield_analytics.fact_area_cluster,
  medshield_analytics.fact_product_priority,
  medshield_analytics.fact_demand_forecast,
  medshield_analytics.fact_forecast_run,
  medshield_external.fact_weather_signal,
  medshield_external.fact_disease_signal,
  medshield_sales.fact_sales_transactions,
  medshield_sales.stg_sales_transactions,
  medshield_etl.etl_source_extract,
  medshield_etl.etl_pipeline_run,
  medshield_sales.fact_seasonality,
  medshield_sales.fact_year_summary,
  medshield_sales.fact_product_summary,
  medshield_sales.fact_area_summary,
  medshield_sales.fact_monthly_sales,
  medshield_common.dim_product,
  medshield_common.dim_area,
  medshield_common.dim_month,
  medshield_common.dim_date
restart identity cascade;

insert into medshield_common.dim_month (month_key, month_name, month_short_name) values
  (1, 'January', 'Jan'),
  (2, 'February', 'Feb'),
  (3, 'March', 'Mar'),
  (4, 'April', 'Apr'),
  (5, 'May', 'May'),
  (6, 'June', 'Jun'),
  (7, 'July', 'Jul'),
  (8, 'August', 'Aug'),
  (9, 'September', 'Sep'),
  (10, 'October', 'Oct'),
  (11, 'November', 'Nov'),
  (12, 'December', 'Dec');

insert into medshield_common.dim_date (
  date_key,
  calendar_date,
  calendar_year,
  calendar_quarter,
  calendar_month,
  month_name,
  month_short_name,
  year_month,
  day_of_month,
  is_month_end
)
select
  to_char(d, 'YYYYMMDD')::integer as date_key,
  d::date as calendar_date,
  extract(year from d)::smallint as calendar_year,
  extract(quarter from d)::smallint as calendar_quarter,
  extract(month from d)::smallint as calendar_month,
  to_char(d, 'FMMonth') as month_name,
  to_char(d, 'Mon') as month_short_name,
  to_char(d, 'YYYY-MM') as year_month,
  extract(day from d)::smallint as day_of_month,
  true as is_month_end
from generate_series(date '2020-01-01', date '2035-12-01', interval '1 month') as d;

with area_source(area_name, area_group, revenue_amount, income_amount) as (
  values
    ('Government', 'institution', 270117650, 153609835),
    ('Hospital', 'institution', 114314314, 58028510),
    ('Quezon', 'territory', 19987352, 11824349),
    ('Batangas', 'territory', 14418660, 9592370),
    ('Marinduque', 'territory', 10901126, 5718502),
    ('Cam Norte', 'territory', 3107190, 1448487),
    ('Cavite', 'territory', 1894007, 1170527),
    ('Laguna', 'territory', 1608953, 733910),
    ('Cam Sur', 'territory', 1476852, 996664),
    ('Pharma', 'channel', 581855, 448720),
    ('Albay', 'territory', 519920, 343562)
)
insert into medshield_common.dim_area (area_name, area_group)
select distinct area_name, area_group
from area_source
order by area_name;

with product_source(product_name, abc_classification, revenue_amount, quantity_sold, income_amount, pct_of_total, source_rank) as (
  values
    ('PAGBILAO # 13,500,000', 'A', 24797580, 2, 16338881, 27.7, 1),
    ('PAGBILAO # 6,334,470', 'A', 12666000, 2, 6599935, 14.2, 2),
    ('MONOWEL 1G IV', 'A', 8111735, 12600, 2331189, 9.1, 3),
    ('BUPIRIGHT AMPULE', 'A', 4744174, 7232, 3379912, 5.3, 4),
    ('JUBI -R 100MG', 'A', 4592500, 750, 2217500, 5.1, 5),
    ('EVAPROST 250MCG/ML', 'A', 4493050, 658, 2128047, 5.0, 6),
    ('PAGBILAO # 2,070,000', 'B', 4138000, 2, 1390000, 4.6, 7),
    ('ANTITET 1500IU/0.7ML', 'B', 3834892, 1448, 2112380, 4.3, 8),
    ('PESO # 3,450,000.00', 'B', 3448500, 1, 1179387, 3.9, 9),
    ('EUROXONE 1G', 'B', 3410596, 8766, 2770678, 3.8, 10),
    ('BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML', 'B', 3164845, 7873, 1773358, 3.5, 11),
    ('SITIXON 1G', 'C', 3076669, 11110, 2690993, 3.4, 12),
    ('TRIVASC 35MG MR', 'C', 3056145, 2183, 1454180, 3.4, 13),
    ('SPEEDA 2.5IU/0.5ML', 'C', 2975310, 425, 970810, 3.3, 14),
    ('TROYNOXA-60 60MG/0.6ML', 'C', 2887032, 2770, 1767952, 3.2, 15)
)
insert into medshield_common.dim_product (product_name, abc_classification, product_group)
select distinct product_name, abc_classification, 'product'
from product_source
order by product_name;

update medshield_common.dim_product
set
  canonical_sku = coalesce(canonical_sku, product_name),
  product_category = case when product_name like '%#%' then 'contract_name' else product_category end,
  forecast_eligible = case when product_name like '%#%' then false else forecast_eligible end,
  mapping_status = 'needs_review',
  review_notes = case
    when product_name like '%#%'
      then 'Contract-name row, not a direct sellable product. Requires backward allocation before product-level modeling.'
    else 'Seeded product master candidate. Requires group approval before SKU-level modeling.'
  end;

insert into medshield_common.dim_product_alias (
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
  p.product_name,
  case when p.product_name like '%#%' then 'contract_name' else 'needs_review' end,
  false,
  'needs_review',
  p.product_name like '%#%',
  case when p.product_name like '%#%' then 'backward_approximation' else 'none' end,
  case
    when p.product_name like '%#%'
      then 'Contract-name row, not a direct sellable product. Requires backward allocation before product-level modeling.'
    else 'Seeded product alias candidate. Requires group approval before SKU-level modeling.'
  end
from medshield_common.dim_product p
on conflict (raw_product) do update set
  product_key = excluded.product_key,
  canonical_sku = excluded.canonical_sku,
  product_category = excluded.product_category,
  forecast_eligible = excluded.forecast_eligible,
  mapping_status = excluded.mapping_status,
  is_contract_name = excluded.is_contract_name,
  allocation_method = excluded.allocation_method,
  review_notes = excluded.review_notes,
  updated_at = now();

with monthly_source(period, revenue_amount, income_amount) as (
  values
    ('2023-01', 7886979, 4396246),
    ('2023-02', 14524875, 7775425),
    ('2023-03', 2446808, 1464677),
    ('2023-04', 1452833, 916579),
    ('2023-05', 24332170, 17310994),
    ('2023-06', 8054552, 3066552),
    ('2023-07', 2671148, 1307843),
    ('2023-08', 2864360, 1700406),
    ('2023-09', 5174588, 4260018),
    ('2023-10', 2435790, 1375121),
    ('2023-11', 2215537, 1295268),
    ('2023-12', 938278, 596216),
    ('2024-01', 1854032, 1242955),
    ('2024-02', 935772, 610016),
    ('2024-03', 1882468, 1282649),
    ('2024-04', 1972572, 966663),
    ('2024-05', 3968829, 2400178),
    ('2024-06', 7680483, 3698235),
    ('2024-07', 6126047, 3001630),
    ('2024-08', 4199426, 1884904),
    ('2024-09', 2741719, 1398804),
    ('2024-10', 2970389, 1375746),
    ('2024-11', 2292046, 1175293),
    ('2024-12', 20160857, 7839037),
    ('2025-01', 16174874, 9288834),
    ('2025-02', 13256075, 5275840),
    ('2025-03', 2467557, 1192572),
    ('2025-04', 5591151, 2744402),
    ('2025-05', 21275754, 9332939),
    ('2025-06', 14762490, 7602219),
    ('2025-07', 20187605, 12057620),
    ('2025-08', 8798724, 4527893),
    ('2025-09', 20457958, 8797095),
    ('2025-10', 12475864, 5093701),
    ('2025-11', 24953581, 12773780),
    ('2025-12', 23338616, 10804071)
)
insert into medshield_sales.fact_monthly_sales (
  period_date_key,
  snapshot_date_key,
  revenue_amount,
  income_amount,
  source_period,
  source_system
)
select
  p.date_key,
  snapshot.date_key,
  m.revenue_amount,
  m.income_amount,
  m.period,
  'medshield_dashboard'
from monthly_source m
join medshield_common.dim_date p on p.year_month = m.period
cross join (
  select date_key
  from medshield_common.dim_date
  where year_month = '2025-12'
  limit 1
) as snapshot
order by m.period;

with area_source(area_name, area_group, revenue_amount, income_amount) as (
  values
    ('Government', 'institution', 270117650, 153609835),
    ('Hospital', 'institution', 114314314, 58028510),
    ('Quezon', 'territory', 19987352, 11824349),
    ('Batangas', 'territory', 14418660, 9592370),
    ('Marinduque', 'territory', 10901126, 5718502),
    ('Cam Norte', 'territory', 3107190, 1448487),
    ('Cavite', 'territory', 1894007, 1170527),
    ('Laguna', 'territory', 1608953, 733910),
    ('Cam Sur', 'territory', 1476852, 996664),
    ('Pharma', 'channel', 581855, 448720),
    ('Albay', 'territory', 519920, 343562)
)
insert into medshield_sales.fact_area_summary (
  snapshot_date_key,
  area_key,
  revenue_amount,
  income_amount,
  source_rank,
  source_scope
)
select
  snapshot.date_key,
  a.area_key,
  s.revenue_amount,
  s.income_amount,
  row_number() over (order by s.revenue_amount desc, s.area_name asc),
  'all_time'
from area_source s
join medshield_common.dim_area a on a.area_name = s.area_name
cross join (
  select date_key
  from medshield_common.dim_date
  where year_month = '2025-12'
  limit 1
) as snapshot
order by s.revenue_amount desc, s.area_name asc;

with product_source(product_name, abc_classification, revenue_amount, quantity_sold, income_amount, pct_of_total, source_rank) as (
  values
    ('PAGBILAO # 13,500,000', 'A', 24797580, 2, 16338881, 27.7, 1),
    ('PAGBILAO # 6,334,470', 'A', 12666000, 2, 6599935, 14.2, 2),
    ('MONOWEL 1G IV', 'A', 8111735, 12600, 2331189, 9.1, 3),
    ('BUPIRIGHT AMPULE', 'A', 4744174, 7232, 3379912, 5.3, 4),
    ('JUBI -R 100MG', 'A', 4592500, 750, 2217500, 5.1, 5),
    ('EVAPROST 250MCG/ML', 'A', 4493050, 658, 2128047, 5.0, 6),
    ('PAGBILAO # 2,070,000', 'B', 4138000, 2, 1390000, 4.6, 7),
    ('ANTITET 1500IU/0.7ML', 'B', 3834892, 1448, 2112380, 4.3, 8),
    ('PESO # 3,450,000.00', 'B', 3448500, 1, 1179387, 3.9, 9),
    ('EUROXONE 1G', 'B', 3410596, 8766, 2770678, 3.8, 10),
    ('BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML', 'B', 3164845, 7873, 1773358, 3.5, 11),
    ('SITIXON 1G', 'C', 3076669, 11110, 2690993, 3.4, 12),
    ('TRIVASC 35MG MR', 'C', 3056145, 2183, 1454180, 3.4, 13),
    ('SPEEDA 2.5IU/0.5ML', 'C', 2975310, 425, 970810, 3.3, 14),
    ('TROYNOXA-60 60MG/0.6ML', 'C', 2887032, 2770, 1767952, 3.2, 15)
)
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
select
  snapshot.date_key,
  p.product_key,
  s.revenue_amount,
  s.quantity_sold,
  s.income_amount,
  s.abc_classification,
  s.pct_of_total,
  s.source_rank,
  'all_time'
from product_source s
join medshield_common.dim_product p on p.product_name = s.product_name
cross join (
  select date_key
  from medshield_common.dim_date
  where year_month = '2025-12'
  limit 1
) as snapshot
order by s.source_rank;

with year_source(year_label, revenue_amount, income_amount, transactions_count) as (
  values
    ('2021', 63341656, 42079675, 2855),
    ('2022', 60040179, 39994801, 3199),
    ('2023', 74997919, 45465345, 5784),
    ('2024', 56784640, 26876110, 2560),
    ('2025', 183763487, 89499505, 3751)
)
insert into medshield_sales.fact_year_summary (
  snapshot_date_key,
  year_date_key,
  revenue_amount,
  income_amount,
  transactions_count
)
select
  snapshot.date_key,
  y.date_key,
  s.revenue_amount,
  s.income_amount,
  s.transactions_count
from year_source s
join medshield_common.dim_date y on y.calendar_date = make_date(s.year_label::integer, 1, 1)
cross join (
  select date_key
  from medshield_common.dim_date
  where year_month = '2025-12'
  limit 1
) as snapshot
order by s.year_label;

with seasonality_source(month_key, avg_revenue_amount) as (
  values
    (1, 25368),
    (2, 24143),
    (3, 10979),
    (4, 18738),
    (5, 35618),
    (6, 15622),
    (7, 29403),
    (8, 19704),
    (9, 27345),
    (10, 26750),
    (11, 25312),
    (12, 36272)
)
insert into medshield_sales.fact_seasonality (
  snapshot_date_key,
  month_key,
  avg_revenue_amount
)
select
  snapshot.date_key,
  s.month_key,
  s.avg_revenue_amount
from seasonality_source s
cross join (
  select date_key
  from medshield_common.dim_date
  where year_month = '2025-12'
  limit 1
) as snapshot
order by s.month_key;

insert into medshield_etl.etl_pipeline_run (
  pipeline_name,
  run_status,
  started_at,
  finished_at,
  source_period_start,
  source_period_end,
  rows_extracted,
  rows_loaded,
  rows_rejected,
  quality_summary
) values (
  'medshield_sales_external_signals_baseline',
  'completed',
  now(),
  now(),
  date '2021-01-01',
  date '2025-12-31',
  20418,
  20418,
  0,
  '{"sales_workbook_sheets":5,"external_signal_mode":"demo_baseline_until_api_extracts_are_configured"}'::jsonb
);

insert into medshield_etl.etl_source_extract (
  pipeline_run_key,
  source_system_key,
  source_name,
  source_uri,
  source_period_start,
  source_period_end,
  record_count,
  metadata_json
)
select
  run.pipeline_run_key,
  source.source_system_key,
  'Sales Report.xlsx',
  'Sales Report.xlsx',
  date '2021-01-01',
  date '2025-12-31',
  20418,
  '{"sheets":["2021","2022","2023","2024","2025"],"grain":"delivery line item"}'::jsonb
from medshield_etl.etl_pipeline_run run
cross join medshield_etl.dim_source_system source
where run.pipeline_name = 'medshield_sales_external_signals_baseline'
  and source.source_code = 'MEDSHIELD_XLSX'
order by run.pipeline_run_key desc
limit 1;

insert into medshield_external.fact_data_completeness (
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
  0,
  'Known 2025 completeness issue from processed sales profile. Do not use 2025 as full holdout until reconciled.',
  s.source_system_key,
  false,
  'Use 2021-2024 for primary training; use 2025 only as partial secondary validation until approved.'
from medshield_common.dim_date d
left join medshield_etl.dim_source_system s on s.source_code = 'MEDSHIELD_XLSX'
where d.calendar_year = 2025
  and d.day_of_month = 1
on conflict (dataset_code, period_date_key, area_key) do update set
  completeness_status = excluded.completeness_status,
  expected_record_count = excluded.expected_record_count,
  actual_record_count = excluded.actual_record_count,
  rejected_record_count = excluded.rejected_record_count,
  issue_summary = excluded.issue_summary,
  source_system_key = excluded.source_system_key,
  approved_for_modeling = excluded.approved_for_modeling,
  notes = excluded.notes,
  loaded_at = now();

with signal_source(period, disease_name, dii, disease_alert, rainfall_mm, rsi, weather_alert, typhoon_flag) as (
  values
    ('2026-01', 'Respiratory illness', 1.10, 'watch', 128.0, 0.34, 'normal', false),
    ('2026-02', 'Dengue', 1.18, 'watch', 104.0, 0.30, 'normal', false),
    ('2026-03', 'Dengue', 1.24, 'watch', 142.0, 0.38, 'watch', false),
    ('2026-04', 'Dengue', 1.32, 'warning', 188.0, 0.44, 'watch', false),
    ('2026-05', 'Dengue', 1.48, 'warning', 232.0, 0.52, 'warning', false),
    ('2026-06', 'Leptospirosis', 1.55, 'warning', 284.0, 0.61, 'warning', true),
    ('2026-07', 'Leptospirosis', 1.62, 'critical', 321.0, 0.68, 'critical', true),
    ('2026-08', 'Dengue', 1.44, 'warning', 298.0, 0.63, 'warning', true),
    ('2026-09', 'Influenza-like illness', 1.30, 'watch', 244.0, 0.53, 'warning', false),
    ('2026-10', 'Influenza-like illness', 1.22, 'watch', 201.0, 0.46, 'watch', false),
    ('2026-11', 'Respiratory illness', 1.28, 'watch', 166.0, 0.40, 'watch', false),
    ('2026-12', 'Respiratory illness', 1.36, 'warning', 152.0, 0.37, 'watch', false)
)
insert into medshield_external.fact_disease_signal (
  period_date_key,
  source_system_key,
  disease_name,
  disease_intensity_index,
  alert_level,
  source_period
)
select
  d.date_key,
  s.source_system_key,
  signal.disease_name,
  signal.dii,
  signal.disease_alert,
  signal.period
from signal_source signal
join medshield_common.dim_date d on d.year_month = signal.period
cross join medshield_etl.dim_source_system s
where s.source_code = 'DOH_FOI_OR_OPEN_DATA';

with signal_source(period, rainfall_mm, rsi, weather_alert, typhoon_flag) as (
  values
    ('2026-01', 128.0, 0.34, 'normal', false),
    ('2026-02', 104.0, 0.30, 'normal', false),
    ('2026-03', 142.0, 0.38, 'watch', false),
    ('2026-04', 188.0, 0.44, 'watch', false),
    ('2026-05', 232.0, 0.52, 'warning', false),
    ('2026-06', 284.0, 0.61, 'warning', true),
    ('2026-07', 321.0, 0.68, 'critical', true),
    ('2026-08', 298.0, 0.63, 'warning', true),
    ('2026-09', 244.0, 0.53, 'warning', false),
    ('2026-10', 201.0, 0.46, 'watch', false),
    ('2026-11', 166.0, 0.40, 'watch', false),
    ('2026-12', 152.0, 0.37, 'watch', false)
)
insert into medshield_external.fact_weather_signal (
  period_date_key,
  source_system_key,
  rainfall_mm,
  rainfall_severity_index,
  typhoon_flag,
  weather_alert_level,
  source_period
)
select
  d.date_key,
  s.source_system_key,
  signal.rainfall_mm,
  signal.rsi,
  signal.typhoon_flag,
  signal.weather_alert,
  signal.period
from signal_source signal
join medshield_common.dim_date d on d.year_month = signal.period
cross join medshield_etl.dim_source_system s
where s.source_code = 'PAGASA_CLIMATE';

with run as (
  insert into medshield_analytics.fact_forecast_run (
    model_key,
    source_system_key,
    training_start_date_key,
    training_end_date_key,
    forecast_start_date_key,
    forecast_end_date_key,
    model_version,
    parameter_json,
    metric_json,
    notes
  )
  select
    m.model_key,
    s.source_system_key,
    (select date_key from medshield_common.dim_date where year_month = '2021-01' limit 1),
    (select date_key from medshield_common.dim_date where year_month = '2025-12' limit 1),
    (select date_key from medshield_common.dim_date where year_month = '2026-01' limit 1),
    (select date_key from medshield_common.dim_date where year_month = '2026-12' limit 1),
    'baseline-demo-v1',
    '{"seasonality":"monthly","external_regressors":["disease_intensity_index","rainfall_severity_index"]}'::jsonb,
    '{"mae":0,"rmse":0,"mape":0,"status":"placeholder_until_model_training"}'::jsonb,
    'Seeded baseline forecast path for API/dashboard validation.'
  from medshield_analytics.dim_model m
  cross join medshield_etl.dim_source_system s
  where m.model_code = 'PROPHET_EXTERNAL'
    and s.source_code = 'PYTHON_ANALYTICS'
  returning forecast_run_key
),
forecast_source(period, baseline, adjusted, lower_bound, upper_bound, disease_factor, weather_factor) as (
  values
    ('2026-01', 16821869, 17158306, 14635026, 19345149, 1.0100, 1.0100),
    ('2026-02', 13945391, 14224299, 12132490, 16037200, 1.0120, 1.0080),
    ('2026-03', 2625481, 2691118, 2284168, 3019303, 1.0150, 1.0100),
    ('2026-04', 6016078, 6196560, 5233988, 6918490, 1.0200, 1.0100),
    ('2026-05', 23148020, 24189681, 20138777, 26620223, 1.0300, 1.0150),
    ('2026-06', 16238739, 17001964, 14127703, 18674550, 1.0320, 1.0150),
    ('2026-07', 22448617, 23615993, 19530297, 25815910, 1.0350, 1.0150),
    ('2026-08', 9889766, 10334705, 8604096, 11373231, 1.0300, 1.0150),
    ('2026-09', 23240240, 23937447, 20219009, 26726276, 1.0200, 1.0100),
    ('2026-10', 14322292, 14608738, 12460394, 16470636, 1.0120, 1.0080),
    ('2026-11', 28946154, 29525077, 25183154, 33288077, 1.0120, 1.0080),
    ('2026-12', 27352858, 28036679, 23796986, 31455787, 1.0170, 1.0080)
)
insert into medshield_analytics.fact_demand_forecast (
  forecast_run_key,
  forecast_period_date_key,
  forecast_scope,
  baseline_demand_value,
  adjusted_demand_value,
  lower_bound_value,
  upper_bound_value,
  disease_adjustment_factor,
  weather_adjustment_factor,
  confidence_level
)
select
  run.forecast_run_key,
  d.date_key,
  'overall',
  f.baseline,
  f.adjusted,
  f.lower_bound,
  f.upper_bound,
  f.disease_factor,
  f.weather_factor,
  0.9500
from forecast_source f
cross join run
join medshield_common.dim_date d on d.year_month = f.period;

with product_source(product_name, abc, rank_no, cumulative_pct, demand_score, margin_score, urgency_score, risk_level, recommendation) as (
  values
    ('PAGBILAO # 13,500,000', 'A', 1, 27.70, 0.96, 0.92, 0.88, 'high', 'Protect allocation and review bid replenishment early.'),
    ('PAGBILAO # 6,334,470', 'A', 2, 41.90, 0.91, 0.84, 0.78, 'medium', 'Keep allocation visible in weekly planning.'),
    ('MONOWEL 1G IV', 'A', 3, 51.00, 0.86, 0.58, 0.82, 'high', 'Monitor hospital demand and reorder buffer.'),
    ('BUPIRIGHT AMPULE', 'A', 4, 56.30, 0.79, 0.77, 0.70, 'medium', 'Maintain stock buffer for recurring demand.'),
    ('JUBI -R 100MG', 'A', 5, 61.40, 0.74, 0.69, 0.65, 'medium', 'Keep in priority review cycle.')
)
insert into medshield_analytics.fact_product_priority (
  snapshot_date_key,
  product_key,
  model_key,
  abc_classification,
  pareto_rank,
  cumulative_revenue_pct,
  demand_score,
  margin_score,
  xgboost_urgency_score,
  risk_level,
  recommendation
)
select
  snapshot.date_key,
  p.product_key,
  m.model_key,
  src.abc,
  src.rank_no,
  src.cumulative_pct,
  src.demand_score,
  src.margin_score,
  src.urgency_score,
  src.risk_level,
  src.recommendation
from product_source src
join medshield_common.dim_product p on p.product_name = src.product_name
cross join medshield_analytics.dim_model m
cross join (select date_key from medshield_common.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'XGBOOST_URGENCY';

with cluster_source(area_name, cluster_label, profile, revenue_score, growth_score, risk_index, implication) as (
  values
    ('Government', 'Cluster A', 'High-volume / institutional', 0.98, 0.72, 0.05, 'Refresh forecasts often and monitor bids.'),
    ('Hospital', 'Cluster A', 'High-volume / institutional', 0.82, 0.66, 0.08, 'Protect fast-moving critical SKUs.'),
    ('Quezon', 'Cluster B', 'Stable commercial demand', 0.44, 0.52, 0.07, 'Keep steady replenishment cycles.'),
    ('Batangas', 'Cluster B', 'Stable commercial demand', 0.38, 0.47, 0.04, 'Maintain targeted replenishment.'),
    ('Marinduque', 'Cluster D', 'Low-scale / variable movement', 0.20, 0.34, 0.10, 'Keep typhoon contingency stock.')
)
insert into medshield_analytics.fact_area_cluster (
  snapshot_date_key,
  area_key,
  model_key,
  cluster_label,
  cluster_profile,
  revenue_score,
  demand_growth_score,
  outbreak_risk_index,
  planning_implication
)
select
  snapshot.date_key,
  a.area_key,
  m.model_key,
  src.cluster_label,
  src.profile,
  src.revenue_score,
  src.growth_score,
  src.risk_index,
  src.implication
from cluster_source src
join medshield_common.dim_area a on a.area_name = src.area_name
cross join medshield_analytics.dim_model m
cross join (select date_key from medshield_common.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'KMEANS_AREA';

with priority_source(rank_no, area_name, revenue_score, growth_score, risk_index, score, recommendation) as (
  values
    (1, 'Government', 0.40, 0.18, 0.05, 0.63, 'Prioritize bid readiness and allocation.'),
    (2, 'Hospital', 0.22, 0.14, 0.08, 0.44, 'Protect fast-moving critical SKUs.'),
    (3, 'Quezon', 0.13, 0.09, 0.07, 0.29, 'Increase forecast refresh cadence.'),
    (4, 'Batangas', 0.09, 0.07, 0.04, 0.20, 'Maintain targeted replenishment.'),
    (5, 'Marinduque', 0.03, 0.05, 0.10, 0.18, 'Keep typhoon contingency stock.')
)
insert into medshield_analytics.fact_regional_priority (
  snapshot_date_key,
  area_key,
  model_key,
  revenue_score,
  growth_score,
  outbreak_risk_index,
  mcda_score,
  priority_rank,
  recommendation
)
select
  snapshot.date_key,
  a.area_key,
  m.model_key,
  src.revenue_score,
  src.growth_score,
  src.risk_index,
  src.score,
  src.rank_no,
  src.recommendation
from priority_source src
join medshield_common.dim_area a on a.area_name = src.area_name
cross join medshield_analytics.dim_model m
cross join (select date_key from medshield_common.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'MCDA_REGIONAL';

with inventory_source(product_name, demand_units, eoq_units, rop_units, safety_units, stock_units, forecast_units, gap_units, risk_level, recommendation) as (
  values
    ('MONOWEL 1G IV', 18400, 240, 80, 35, 62, 96, 34, 'high', 'Reorder before January forecast peak; protect hospital allocation.'),
    ('EUROXONE 1G', 42800, 360, 120, 52, 144, 155, 11, 'medium', 'Keep monthly review and supplier lead-time watch.'),
    ('BUPIRIGHT AMPULE', 86200, 420, 160, 70, 215, 198, -17, 'low', 'Maintain normal replenishment.'),
    ('TRIVASC 35MG MR', 51000, 310, 110, 48, 128, 142, 14, 'medium', 'Replenish within the next planning cycle.'),
    ('ANTITET 1500IU/0.7ML', 98400, 500, 190, 82, 166, 225, 59, 'high', 'Pre-position stock for surge and contingency demand.')
)
insert into medshield_analytics.fact_inventory_recommendation (
  snapshot_date_key,
  product_key,
  model_key,
  annual_demand_units,
  ordering_cost_php,
  holding_cost_php,
  lead_time_days,
  demand_stddev_units,
  eoq_units,
  reorder_point_units,
  safety_stock_units,
  current_stock_units,
  forecast_demand_units,
  stock_gap_units,
  risk_level,
  recommendation
)
select
  snapshot.date_key,
  p.product_key,
  m.model_key,
  src.demand_units,
  1250,
  42,
  14,
  18,
  src.eoq_units,
  src.rop_units,
  src.safety_units,
  src.stock_units,
  src.forecast_units,
  src.gap_units,
  src.risk_level,
  src.recommendation
from inventory_source src
join medshield_common.dim_product p on p.product_name = src.product_name
cross join medshield_analytics.dim_model m
cross join (select date_key from medshield_common.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'EOQ_ROP_SAFETY';

with allocation_source(product_name, area_name, available_units, recommended_units, objective_value, optimization_gap, notes, recommendation) as (
  values
    ('MONOWEL 1G IV', 'Hospital', 320, 180, 0.92, 0.04, 'Hospital demand constraint prioritized.', 'Allocate first replenishment to hospital accounts.'),
    ('EUROXONE 1G', 'Quezon', 420, 150, 0.84, 0.06, 'Regional growth constraint prioritized.', 'Reserve stock for Quezon before lower-priority routes.'),
    ('ANTITET 1500IU/0.7ML', 'Marinduque', 260, 120, 0.88, 0.05, 'Weather-risk constraint applied.', 'Pre-position contingency stock before typhoon season.')
)
insert into medshield_analytics.fact_allocation_recommendation (
  snapshot_date_key,
  product_key,
  area_key,
  model_key,
  available_units,
  recommended_units,
  objective_value,
  optimization_gap,
  constraint_notes,
  recommendation
)
select
  snapshot.date_key,
  p.product_key,
  a.area_key,
  m.model_key,
  src.available_units,
  src.recommended_units,
  src.objective_value,
  src.optimization_gap,
  src.notes,
  src.recommendation
from allocation_source src
join medshield_common.dim_product p on p.product_name = src.product_name
join medshield_common.dim_area a on a.area_name = src.area_name
cross join medshield_analytics.dim_model m
cross join (select date_key from medshield_common.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'LINEAR_ALLOCATION';

with match_source(product_name, area_name, similarity_score, match_rank, recommendation) as (
  values
    ('MONOWEL 1G IV', 'Hospital', 0.91, 1, 'Strong institutional product-area fit.'),
    ('EUROXONE 1G', 'Quezon', 0.83, 2, 'Good demand similarity with prior regional movement.'),
    ('ANTITET 1500IU/0.7ML', 'Marinduque', 0.79, 3, 'Keep as contingency match for variable demand.')
)
insert into medshield_analytics.fact_product_region_match (
  snapshot_date_key,
  product_key,
  area_key,
  model_key,
  similarity_score,
  match_rank,
  recommendation
)
select
  snapshot.date_key,
  p.product_key,
  a.area_key,
  m.model_key,
  src.similarity_score,
  src.match_rank,
  src.recommendation
from match_source src
join medshield_common.dim_product p on p.product_name = src.product_name
join medshield_common.dim_area a on a.area_name = src.area_name
cross join medshield_analytics.dim_model m
cross join (select date_key from medshield_common.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'COLLAB_PRODUCT_REGION';

with alert_source(alert_date, area_name, product_name, model_code, alert_type, severity, trigger_metric, threshold_value, observed_value, multiplier, recommendation) as (
  values
    ('2026-01-01', 'Hospital', 'MONOWEL 1G IV', 'EOQ_ROP_SAFETY', 'stock_gap', 'high', 'stock_gap_units', 0, 34, 1.00, 'Demand exceeds safety stock. Create replenishment order.'),
    ('2026-05-01', null, 'ANTITET 1500IU/0.7ML', 'ALERT_THRESHOLDS', 'disease_surge', 'high', 'disease_intensity_index', 1.40, 1.48, 1.35, 'Increase antipyretic and emergency stock review.'),
    ('2026-07-01', 'Marinduque', null, 'ALERT_THRESHOLDS', 'weather_risk', 'critical', 'rainfall_severity_index', 0.60, 0.68, 1.40, 'Pre-position wound care and ORS stock before severe rainfall window.')
)
insert into medshield_analytics.fact_decision_alert (
  snapshot_date_key,
  alert_date_key,
  area_key,
  product_key,
  model_key,
  alert_type,
  severity,
  trigger_metric,
  threshold_value,
  observed_value,
  demand_multiplier,
  recommendation
)
select
  snapshot.date_key,
  d.date_key,
  a.area_key,
  p.product_key,
  m.model_key,
  src.alert_type,
  src.severity,
  src.trigger_metric,
  src.threshold_value,
  src.observed_value,
  src.multiplier,
  src.recommendation
from alert_source src
join medshield_common.dim_date d on d.calendar_date = src.alert_date::date
left join medshield_common.dim_area a on a.area_name = src.area_name
left join medshield_common.dim_product p on p.product_name = src.product_name
join medshield_analytics.dim_model m on m.model_code = src.model_code
cross join (select date_key from medshield_common.dim_date where year_month = '2025-12' limit 1) snapshot;

with eval_source(model_code, metric_name, metric_value, target_direction, benchmark_value, passed, notes) as (
  values
    ('PROPHET_BASELINE', 'MAPE', 0.000000, 'minimize', 0.150000, null, 'Placeholder until historical train/test split is executed.'),
    ('PROPHET_EXTERNAL', 'MAPE', 0.000000, 'minimize', 0.150000, null, 'External-regressor model path configured for DOH/PAGASA signals.'),
    ('XGBOOST_URGENCY', 'MAPE', 0.000000, 'minimize', 0.150000, null, 'Urgency scoring placeholder until labeled demand outcomes are prepared.'),
    ('KMEANS_AREA', 'silhouette_score', 0.000000, 'maximize', 0.500000, null, 'Cluster validation placeholder until transaction-grain clustering runs.'),
    ('ALERT_THRESHOLDS', 'alert_accuracy', 0.000000, 'maximize', 0.800000, null, 'Alert validation placeholder until actual alert outcomes are recorded.'),
    ('EOQ_ROP_SAFETY', 'fulfillment_rate', 0.950000, 'maximize', 0.950000, true, 'Target service level aligned to proposal.'),
    ('MCDA_REGIONAL', 'ranking_consistency', 0.000000, 'maximize', 0.800000, null, 'Ranking consistency requires repeated scoring cycles.'),
    ('LINEAR_ALLOCATION', 'optimization_gap', 0.050000, 'minimize', 0.100000, true, 'Demo allocation gap within acceptable threshold.'),
    ('COLLAB_PRODUCT_REGION', 'cosine_similarity', 0.790000, 'maximize', 0.700000, true, 'Seeded top matches exceed baseline similarity threshold.')
)
insert into medshield_analytics.fact_model_evaluation (
  model_key,
  evaluation_start_date_key,
  evaluation_end_date_key,
  metric_name,
  metric_value,
  target_direction,
  benchmark_value,
  passed,
  notes
)
select
  m.model_key,
  (select date_key from medshield_common.dim_date where year_month = '2021-01' limit 1),
  (select date_key from medshield_common.dim_date where year_month = '2025-12' limit 1),
  src.metric_name,
  src.metric_value,
  src.target_direction,
  src.benchmark_value,
  src.passed,
  src.notes
from eval_source src
join medshield_analytics.dim_model m on m.model_code = src.model_code;

-- END OF SEED DATA
