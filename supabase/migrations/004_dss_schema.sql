-- MedShield DSS warehouse extension.
-- Paste/run after 001_init.sql, 002_accounts.sql, 003_auth_rpc.sql, then seed.sql.
-- This migration keeps the current dashboard warehouse and adds the paper-aligned DSS layer.

create extension if not exists pgcrypto;

-- Legacy flat analytics tables from the earlier prototype are superseded by
-- the connected warehouse facts and views. The dashboard now reads the
-- vw_dashboard_* and vw_dss_* views.
drop table if exists public.analytics_totals cascade;
drop table if exists public.analytics_monthly cascade;
drop table if exists public.analytics_by_area cascade;
drop table if exists public.analytics_top_products cascade;
drop table if exists public.analytics_year_summary cascade;
drop table if exists public.analytics_seasonality cascade;

create table if not exists public.dim_source_system (
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

create table if not exists public.dim_model (
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

create table if not exists public.stg_sales_transactions (
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

create table if not exists public.fact_sales_transactions (
  sales_transaction_key bigint generated always as identity primary key,
  delivery_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references public.dim_area(area_key) on update cascade on delete restrict,
  product_key bigint references public.dim_product(product_key) on update cascade on delete restrict,
  source_system_key bigint references public.dim_source_system(source_system_key) on update cascade on delete restrict,
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

create table if not exists public.fact_disease_signal (
  disease_signal_key bigint generated always as identity primary key,
  period_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references public.dim_area(area_key) on update cascade on delete restrict,
  source_system_key bigint references public.dim_source_system(source_system_key) on update cascade on delete restrict,
  disease_name text not null,
  case_count numeric(18, 2),
  incidence_rate numeric(18, 6),
  disease_intensity_index numeric(9, 4) not null default 0,
  alert_level text not null default 'normal' check (alert_level in ('normal', 'watch', 'warning', 'critical')),
  source_period text not null,
  loaded_at timestamptz not null default now(),
  unique (period_date_key, area_key, disease_name, source_system_key)
);

create table if not exists public.fact_weather_signal (
  weather_signal_key bigint generated always as identity primary key,
  period_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references public.dim_area(area_key) on update cascade on delete restrict,
  source_system_key bigint references public.dim_source_system(source_system_key) on update cascade on delete restrict,
  rainfall_mm numeric(18, 4),
  rainfall_severity_index numeric(9, 4) not null default 0,
  typhoon_flag boolean not null default false,
  weather_alert_level text not null default 'normal' check (weather_alert_level in ('normal', 'watch', 'warning', 'critical')),
  source_period text not null,
  loaded_at timestamptz not null default now(),
  unique (period_date_key, area_key, source_system_key)
);

create table if not exists public.fact_forecast_run (
  forecast_run_key bigint generated always as identity primary key,
  model_key bigint not null references public.dim_model(model_key) on update cascade on delete restrict,
  source_system_key bigint references public.dim_source_system(source_system_key) on update cascade on delete restrict,
  run_at timestamptz not null default now(),
  training_start_date_key integer references public.dim_date(date_key) on update cascade on delete restrict,
  training_end_date_key integer references public.dim_date(date_key) on update cascade on delete restrict,
  forecast_start_date_key integer references public.dim_date(date_key) on update cascade on delete restrict,
  forecast_end_date_key integer references public.dim_date(date_key) on update cascade on delete restrict,
  model_version text not null default 'v1',
  parameter_json jsonb not null default '{}'::jsonb,
  metric_json jsonb not null default '{}'::jsonb,
  run_status text not null default 'completed' check (run_status in ('queued', 'running', 'completed', 'failed')),
  notes text
);

create table if not exists public.fact_demand_forecast (
  demand_forecast_key bigint generated always as identity primary key,
  forecast_run_key bigint not null references public.fact_forecast_run(forecast_run_key) on update cascade on delete cascade,
  forecast_period_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references public.dim_area(area_key) on update cascade on delete restrict,
  product_key bigint references public.dim_product(product_key) on update cascade on delete restrict,
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

create table if not exists public.fact_product_priority (
  product_priority_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references public.dim_product(product_key) on update cascade on delete restrict,
  model_key bigint references public.dim_model(model_key) on update cascade on delete restrict,
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

create table if not exists public.fact_area_cluster (
  area_cluster_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint not null references public.dim_area(area_key) on update cascade on delete restrict,
  model_key bigint references public.dim_model(model_key) on update cascade on delete restrict,
  cluster_label text not null,
  cluster_profile text not null,
  revenue_score numeric(9, 4) not null default 0,
  demand_growth_score numeric(9, 4) not null default 0,
  outbreak_risk_index numeric(9, 4) not null default 0,
  planning_implication text,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, area_key)
);

create table if not exists public.fact_regional_priority (
  regional_priority_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint not null references public.dim_area(area_key) on update cascade on delete restrict,
  model_key bigint references public.dim_model(model_key) on update cascade on delete restrict,
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

create table if not exists public.fact_inventory_recommendation (
  inventory_recommendation_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references public.dim_product(product_key) on update cascade on delete restrict,
  area_key bigint references public.dim_area(area_key) on update cascade on delete restrict,
  model_key bigint references public.dim_model(model_key) on update cascade on delete restrict,
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

create table if not exists public.fact_allocation_recommendation (
  allocation_recommendation_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references public.dim_product(product_key) on update cascade on delete restrict,
  area_key bigint not null references public.dim_area(area_key) on update cascade on delete restrict,
  model_key bigint references public.dim_model(model_key) on update cascade on delete restrict,
  available_units numeric(18, 4) not null default 0,
  recommended_units numeric(18, 4) not null default 0,
  objective_value numeric(18, 4),
  optimization_gap numeric(9, 4),
  constraint_notes text,
  recommendation text,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, product_key, area_key)
);

create table if not exists public.fact_product_region_match (
  product_region_match_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  product_key bigint not null references public.dim_product(product_key) on update cascade on delete restrict,
  area_key bigint not null references public.dim_area(area_key) on update cascade on delete restrict,
  model_key bigint references public.dim_model(model_key) on update cascade on delete restrict,
  similarity_score numeric(9, 4) not null default 0,
  match_rank integer not null,
  recommendation text,
  loaded_at timestamptz not null default now(),
  unique (snapshot_date_key, product_key, area_key)
);

create table if not exists public.fact_decision_alert (
  decision_alert_key bigint generated always as identity primary key,
  snapshot_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  alert_date_key integer not null references public.dim_date(date_key) on update cascade on delete restrict,
  area_key bigint references public.dim_area(area_key) on update cascade on delete restrict,
  product_key bigint references public.dim_product(product_key) on update cascade on delete restrict,
  model_key bigint references public.dim_model(model_key) on update cascade on delete restrict,
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

create table if not exists public.fact_model_evaluation (
  model_evaluation_key bigint generated always as identity primary key,
  model_key bigint not null references public.dim_model(model_key) on update cascade on delete restrict,
  evaluation_start_date_key integer references public.dim_date(date_key) on update cascade on delete restrict,
  evaluation_end_date_key integer references public.dim_date(date_key) on update cascade on delete restrict,
  metric_name text not null,
  metric_value numeric(18, 6) not null,
  target_direction text not null check (target_direction in ('minimize', 'maximize', 'monitor')),
  benchmark_value numeric(18, 6),
  passed boolean,
  notes text,
  evaluated_at timestamptz not null default now(),
  unique (model_key, metric_name, evaluation_start_date_key, evaluation_end_date_key)
);

create table if not exists public.etl_pipeline_run (
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

create table if not exists public.etl_source_extract (
  source_extract_key bigint generated always as identity primary key,
  pipeline_run_key bigint references public.etl_pipeline_run(pipeline_run_key) on update cascade on delete cascade,
  source_system_key bigint references public.dim_source_system(source_system_key) on update cascade on delete restrict,
  source_name text not null,
  source_uri text,
  extracted_at timestamptz not null default now(),
  source_period_start date,
  source_period_end date,
  record_count integer not null default 0,
  checksum text,
  metadata_json jsonb not null default '{}'::jsonb
);

insert into public.dim_source_system (
  source_code,
  source_name,
  source_type,
  base_url,
  refresh_cadence,
  credibility_note
) values
  ('MEDSHIELD_XLSX', 'MedShield 2021-2025 Sales Report workbook', 'internal', null, 'Manual upload per reporting cycle', 'Internal source workbook supplied by MedShield for capstone analysis.'),
  ('SUPABASE_WAREHOUSE', 'Supabase PostgreSQL warehouse', 'internal', null, 'Near real-time after ETL load', 'Repository-controlled analytical warehouse and dashboard source of truth.'),
  ('DOH_FOI_OR_OPEN_DATA', 'Department of Health disease surveillance data', 'external_dataset', 'https://www.foi.gov.ph/agencies/doh/', 'Monthly or per approved data request', 'Credible public-sector source for disease signals; use FOI/Open Data exports when a stable public API is unavailable.'),
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

insert into public.dim_model (
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

create index if not exists idx_fact_sales_transactions_date on public.fact_sales_transactions (delivery_date_key);
create index if not exists idx_fact_sales_transactions_area on public.fact_sales_transactions (area_key);
create index if not exists idx_fact_sales_transactions_product on public.fact_sales_transactions (product_key);
create index if not exists idx_fact_demand_forecast_period on public.fact_demand_forecast (forecast_period_date_key);
create index if not exists idx_fact_inventory_recommendation_snapshot on public.fact_inventory_recommendation (snapshot_date_key);
create index if not exists idx_fact_regional_priority_snapshot on public.fact_regional_priority (snapshot_date_key);
create index if not exists idx_fact_decision_alert_status on public.fact_decision_alert (status, severity);

alter table public.dim_source_system enable row level security;
alter table public.dim_model enable row level security;
alter table public.stg_sales_transactions enable row level security;
alter table public.fact_sales_transactions enable row level security;
alter table public.fact_disease_signal enable row level security;
alter table public.fact_weather_signal enable row level security;
alter table public.fact_forecast_run enable row level security;
alter table public.fact_demand_forecast enable row level security;
alter table public.fact_product_priority enable row level security;
alter table public.fact_area_cluster enable row level security;
alter table public.fact_regional_priority enable row level security;
alter table public.fact_inventory_recommendation enable row level security;
alter table public.fact_allocation_recommendation enable row level security;
alter table public.fact_product_region_match enable row level security;
alter table public.fact_decision_alert enable row level security;
alter table public.fact_model_evaluation enable row level security;
alter table public.etl_pipeline_run enable row level security;
alter table public.etl_source_extract enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'dim_source_system',
    'dim_model',
    'fact_disease_signal',
    'fact_weather_signal',
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
      where schemaname = 'public'
        and tablename = tbl
        and policyname = 'Public read'
    ) then
      execute format('create policy "Public read" on public.%I for select using (true);', tbl);
    end if;
  end loop;
end $$;

create or replace view public.vw_dss_forecasts as
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
from public.fact_demand_forecast f
join public.fact_forecast_run r on r.forecast_run_key = f.forecast_run_key
join public.dim_model m on m.model_key = r.model_key
join public.dim_date d on d.date_key = f.forecast_period_date_key
left join public.dim_area a on a.area_key = f.area_key
left join public.dim_product p on p.product_key = f.product_key
order by d.calendar_date, area, product;

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
    avg(rainfall_severity_index) as rainfall_severity_index,
    max(weather_alert_level) as weather_alert_level,
    bool_or(typhoon_flag) as typhoon_flag
  from public.fact_weather_signal
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
join public.dim_date d on d.date_key = coalesce(disease.period_date_key, weather.period_date_key)
left join public.dim_area a on a.area_key = coalesce(disease.area_key, weather.area_key)
order by d.calendar_date, area;

create or replace view public.vw_dss_inventory_recommendations as
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
from public.fact_inventory_recommendation f
join public.dim_date d on d.date_key = f.snapshot_date_key
join public.dim_product p on p.product_key = f.product_key
left join public.dim_area a on a.area_key = f.area_key
left join public.dim_model m on m.model_key = f.model_key
order by
  case f.risk_level when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
  p.product_name;

create or replace view public.vw_dss_regional_priorities as
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
from public.fact_regional_priority f
join public.dim_date d on d.date_key = f.snapshot_date_key
join public.dim_area a on a.area_key = f.area_key
left join public.dim_model m on m.model_key = f.model_key
order by f.priority_rank;

create or replace view public.vw_dss_area_clusters as
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
from public.fact_area_cluster f
join public.dim_date d on d.date_key = f.snapshot_date_key
join public.dim_area a on a.area_key = f.area_key
left join public.dim_model m on m.model_key = f.model_key
order by f.cluster_label, a.area_name;

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
order by f.pareto_rank;

create or replace view public.vw_dss_allocation_recommendations as
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
from public.fact_allocation_recommendation f
join public.dim_date d on d.date_key = f.snapshot_date_key
join public.dim_product p on p.product_key = f.product_key
join public.dim_area a on a.area_key = f.area_key
left join public.dim_model m on m.model_key = f.model_key
order by p.product_name, a.area_name;

create or replace view public.vw_dss_product_region_matches as
select
  d.year_month as snapshot_period,
  p.product_name as product,
  a.area_name as area,
  m.model_code,
  f.similarity_score,
  f.match_rank,
  f.recommendation
from public.fact_product_region_match f
join public.dim_date d on d.date_key = f.snapshot_date_key
join public.dim_product p on p.product_key = f.product_key
join public.dim_area a on a.area_key = f.area_key
left join public.dim_model m on m.model_key = f.model_key
order by f.match_rank, p.product_name, a.area_name;

create or replace view public.vw_dss_decision_alerts as
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
from public.fact_decision_alert f
join public.dim_date sd on sd.date_key = f.snapshot_date_key
join public.dim_date ad on ad.date_key = f.alert_date_key
left join public.dim_area a on a.area_key = f.area_key
left join public.dim_product p on p.product_key = f.product_key
left join public.dim_model m on m.model_key = f.model_key
order by
  case f.severity when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
  ad.calendar_date desc;

create or replace view public.vw_dss_model_evaluation as
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
from public.fact_model_evaluation f
join public.dim_model m on m.model_key = f.model_key
order by m.analytics_layer, m.model_code, f.metric_name;

comment on table public.stg_sales_transactions is 'Raw landing table for Sales Report.xlsx rows. Preserves messy source values before transformation.';
comment on table public.fact_sales_transactions is 'Normalized transaction-level sales fact from the 2021-2025 workbook.';
comment on table public.fact_disease_signal is 'DOH/FOI/Open Data disease indicators used as external forecast regressors and alert inputs.';
comment on table public.fact_weather_signal is 'PAGASA or approved weather indicators used as external forecast regressors and typhoon contingency inputs.';
comment on table public.fact_demand_forecast is 'Prophet baseline and external-regressor demand forecast output.';
comment on table public.fact_product_priority is 'ABC/Pareto and XGBoost product prioritization output.';
comment on table public.fact_inventory_recommendation is 'EOQ, reorder point, safety stock, and stock gap recommendation output.';
comment on table public.fact_regional_priority is 'MCDA regional priority ranking output.';
comment on table public.fact_allocation_recommendation is 'Linear programming stock allocation recommendation output.';
comment on table public.fact_product_region_match is 'Collaborative filtering product-region matching output.';
comment on table public.etl_pipeline_run is 'ETL run ledger for internal sales, DOH, PAGASA, and model output loads.';
