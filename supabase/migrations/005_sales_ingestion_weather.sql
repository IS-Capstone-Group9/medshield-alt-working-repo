-- Production ingestion, canonical sales view, aggregate refresh, and weather provenance.
-- Apply after 004_dss_schema.sql.

alter table public.dim_date
  drop constraint if exists dim_date_year_month_key;
create index if not exists idx_dim_date_year_month
  on public.dim_date (year_month);

alter table public.fact_monthly_sales
  drop constraint if exists fact_monthly_sales_source_period_key;
create unique index if not exists uq_fact_monthly_sales_snapshot_period
  on public.fact_monthly_sales (snapshot_date_key, source_period);

alter table public.stg_sales_transactions
  add column if not exists pipeline_run_key bigint references public.etl_pipeline_run(pipeline_run_key) on delete set null,
  add column if not exists input_stage text not null default 'raw_medshield',
  add column if not exists standardization_applied jsonb not null default '[]'::jsonb;

alter table public.fact_sales_transactions
  add column if not exists pipeline_run_key bigint references public.etl_pipeline_run(pipeline_run_key) on delete set null;

alter table public.fact_weather_signal
  add column if not exists rainfall_severity_proxy numeric(9, 4) not null default 0,
  add column if not exists rainy_days integer not null default 0,
  add column if not exists avg_temperature_c numeric(9, 4),
  add column if not exists avg_relative_humidity_pct numeric(9, 4),
  add column if not exists max_wind_speed_kph numeric(9, 4),
  add column if not exists weather_adjustment_factor numeric(9, 4) not null default 1,
  add column if not exists high_wind_watch boolean not null default false,
  add column if not exists provider_code text;

update public.fact_weather_signal
set rainfall_severity_proxy = rainfall_severity_index
where rainfall_severity_proxy = 0
  and rainfall_severity_index <> 0;

create unique index if not exists uq_fact_weather_signal_period_area_source
  on public.fact_weather_signal (period_date_key, area_key, source_system_key);

insert into public.dim_source_system (
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
    sum(f.net_cost_amount),
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
    sum(f.net_cost_amount),
    sum(f.net_income_amount),
    dense_rank() over (order by sum(f.net_cost_amount) desc),
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
      sum(f.net_cost_amount) as revenue,
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
    sum(f.net_cost_amount),
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
      sum(f.net_cost_amount) as revenue
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

drop view if exists public.vw_dss_external_signals cascade;
create or replace view public.vw_dss_external_signals as
with disease as (
  select
    period_date_key,
    area_key,
    avg(disease_intensity_index) as disease_intensity_index,
    max(alert_level) as disease_alert_level,
    string_agg(distinct disease_name, ', ' order by disease_name) as disease_names
  from public.fact_disease_signal
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
  from public.fact_weather_signal
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
join public.dim_date d on d.date_key = coalesce(disease.period_date_key, weather.period_date_key)
left join public.dim_area a on a.area_key = coalesce(disease.area_key, weather.area_key)
order by d.calendar_date, area;

-- Transaction rows, raw staging rows, and ETL ledgers are server-side only.
drop policy if exists "Public read" on public.stg_sales_transactions;
drop policy if exists "Public read" on public.fact_sales_transactions;
drop policy if exists "Public read" on public.etl_pipeline_run;
drop policy if exists "Public read" on public.etl_source_extract;

comment on view public.vw_sales_transactions is
  'Canonical 13-column cleaned MedShield sales transaction view with source lineage.';
comment on column public.fact_weather_signal.rainfall_severity_proxy is
  'Derived planning proxy from NASA POWER or Open-Meteo observations; not official PAGASA RSI.';
