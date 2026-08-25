import gzip
import json
from collections import defaultdict
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path('.').resolve()
sales_path = ROOT / 'data' / 'medshield' / 'processed' / 'sales_transactions.json.gz'
seed_path = ROOT / 'supabase' / 'seed.sql'

with gzip.open(sales_path, 'rt', encoding='utf-8') as gz:
    p = json.load(gz)

rows = [
    r for r in p.get('rows', [])
    if r.get('date_delivered') and len(r['date_delivered']) == 10 and '2017-01-01' <= r['date_delivered'] <= '2025-12-31'
]

# 1. Monthly totals (2017 to 2025)
monthly_stats = defaultdict(lambda: {'revenue': 0.0, 'income': 0.0, 'qty': 0.0})
for r in rows:
    ym = r['date_delivered'][:7]
    monthly_stats[ym]['revenue'] += float(r.get('total_trade_price') or 0)
    monthly_stats[ym]['income'] += float(r.get('net_income') or 0)
    monthly_stats[ym]['qty'] += float(r.get('quantity') or 0)

# 2. Area totals
area_stats = defaultdict(lambda: {'revenue': 0.0, 'income': 0.0, 'qty': 0.0})
for r in rows:
    area = (r.get('area') or 'Unassigned').strip()
    area_stats[area]['revenue'] += float(r.get('total_trade_price') or 0)
    area_stats[area]['income'] += float(r.get('net_income') or 0)
    area_stats[area]['qty'] += float(r.get('quantity') or 0)

sorted_areas = sorted(area_stats.items(), key=lambda x: x[1]['revenue'], reverse=True)

# 3. Yearly totals
yearly_stats = defaultdict(lambda: {'revenue': 0.0, 'income': 0.0, 'txns': 0})
for r in rows:
    yr = r['date_delivered'][:4]
    yearly_stats[yr]['revenue'] += float(r.get('total_trade_price') or 0)
    yearly_stats[yr]['income'] += float(r.get('net_income') or 0)
    yearly_stats[yr]['txns'] += 1

# 4. Seasonality
monthly_rev_by_m = defaultdict(list)
for ym, s in monthly_stats.items():
    m = int(ym.split('-')[1])
    monthly_rev_by_m[m].append(s['revenue'])

seasonality = {m: (sum(revs) / len(revs) if revs else 0) for m, revs in monthly_rev_by_m.items()}

# Generate SQL script
sql = []
sql.append(f"-- MedShield Master Seed (Dynamic Ingestion Ready)\n-- Generated on: {datetime.now(timezone.utc).isoformat()}\n")

sql.append('''truncate table
  public.stg_weather_api_observations,
  public.stg_pagasa_historical,
  public.stg_doh_historical,
  public.fact_data_completeness,
  public.dim_product_alias,
  public.fact_model_evaluation,
  public.fact_decision_alert,
  public.fact_product_region_match,
  public.fact_allocation_recommendation,
  public.fact_inventory_recommendation,
  public.fact_regional_priority,
  public.fact_area_cluster,
  public.fact_product_priority,
  public.fact_demand_forecast,
  public.fact_forecast_run,
  public.fact_weather_signal,
  public.fact_disease_signal,
  public.fact_sales_transactions,
  public.stg_sales_transactions,
  public.etl_source_extract,
  public.etl_pipeline_run,
  public.fact_seasonality,
  public.fact_year_summary,
  public.fact_product_summary,
  public.fact_area_summary,
  public.fact_monthly_sales,
  public.dim_product,
  public.dim_area,
  public.dim_month,
  public.dim_date
restart identity cascade;

-- 1. Month Dimension
insert into public.dim_month (month_key, month_name, month_short_name) values
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

-- 2. Date Dimension (2017 to 2035)
insert into public.dim_date (
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
from generate_series(date '2017-01-01', date '2035-12-01', interval '1 month') as d;
''')

# 3. Area Master
area_values = []
for a_name, s in sorted_areas:
    safe_name = a_name.replace("'", "''")
    grp = 'institution' if a_name.lower() in ['government', 'hospital'] else ('channel' if a_name.lower() in ['pharma', 'admin'] else 'territory')
    area_values.append(f"    ('{safe_name}', '{grp}', {s['revenue']:.2f}, {s['income']:.2f})")

sql.append('''-- 3. Geographic and Account Areas
with area_source(area_name, area_group, revenue_amount, income_amount) as (
  values
''' + ',\n'.join(area_values) + '''
)
insert into public.dim_area (area_name, area_group)
select distinct area_name, area_group
from area_source
order by area_name;
''')

# 4. Monthly Sales Facts
month_values = []
for ym in sorted(monthly_stats.keys()):
    s = monthly_stats[ym]
    month_values.append(f"    ('{ym}', {s['revenue']:.2f}, {s['income']:.2f})")

sql.append('''-- 4. Monthly Historical Sales
with monthly_source(period, revenue_amount, income_amount) as (
  values
''' + ',\n'.join(month_values) + '''
)
insert into public.fact_monthly_sales (
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
  'medshield_dataset_2017_2025'
from monthly_source m
join public.dim_date p on p.year_month = m.period
cross join (
  select date_key
  from public.dim_date
  where year_month = '2025-12'
  limit 1
) as snapshot
order by m.period;
''')

# 5. Area Summary Facts
sql.append('''-- 5. Area Summary
with area_source(area_name, area_group, revenue_amount, income_amount) as (
  values
''' + ',\n'.join(area_values) + '''
)
insert into public.fact_area_summary (
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
  '2017-2025'
from area_source s
join public.dim_area a on a.area_name = s.area_name
cross join (
  select date_key
  from public.dim_date
  where year_month = '2025-12'
  limit 1
) as snapshot
order by s.revenue_amount desc, s.area_name asc;
''')

# 6. Yearly Summary Facts
year_values = []
for yr in sorted(yearly_stats.keys()):
    s = yearly_stats[yr]
    year_values.append(f"    ('{yr}', {s['revenue']:.2f}, {s['income']:.2f}, {s['txns']})")

sql.append('''-- 6. Year Summary
with year_source(year_label, revenue_amount, income_amount, transactions_count) as (
  values
''' + ',\n'.join(year_values) + '''
)
insert into public.fact_year_summary (
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
join public.dim_date y on y.calendar_date = make_date(s.year_label::integer, 1, 1)
cross join (
  select date_key
  from public.dim_date
  where year_month = '2025-12'
  limit 1
) as snapshot
order by s.year_label;
''')

# 7. Seasonality
seas_values = []
for m in range(1, 13):
    seas_values.append(f"    ({m}, {seasonality.get(m, 0):.2f})")

sql.append('''-- 7. Monthly Seasonality
with seasonality_source(month_key, avg_revenue_amount) as (
  values
''' + ',\n'.join(seas_values) + '''
)
insert into public.fact_seasonality (
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
  from public.dim_date
  where year_month = '2025-12'
  limit 1
) as snapshot
order by s.month_key;
''')

# 8. Source Systems and Models
sql.append('''-- 8. Source Systems & DSS Model Registry
insert into public.dim_source_system (source_code, source_name, source_type, base_url, refresh_cadence, credibility_note) values
  ('MEDSHIELD_CSV_UPLOAD', 'MedShield Dynamic Sales CSV Ingestion', 'internal', null, 'Automatic on CSV Upload', 'Dynamic upload pipeline parsing raw sales transactions.'),
  ('DOH_EPIDEMIOLOGY', 'Department of Health Epidemiology Bureau', 'external_dataset', 'https://doh.gov.ph', 'Annual publication / historical extract', 'Official historical health authority records for Dengue, ILI, Leptospirosis.'),
  ('PAGASA_METEOROLOGY', 'DOST-PAGASA Climate and Agrometeorological Data', 'external_dataset', 'https://www.pagasa.dost.gov.ph', 'Monthly climate review', 'Official historical meteorological observations and rainfall products.'),
  ('OPEN_METEO_ARCHIVE', 'Open-Meteo Historical Weather API', 'external_api', 'https://archive-api.open-meteo.com', 'On demand', 'Provider-derived historical weather proxy source.'),
  ('MEDSHIELD_FORECAST_ENGINE', 'MedShield Prophet/SARIMAX Forecasting Engine', 'model', null, 'Monthly planning run', 'Dynamic champion-challenger multi-variate forecasting microservice.'),
  ('MEDSHIELD_PRESCRIPTIVE_ENGINE', 'MedShield Prescriptive Optimization Solver', 'model', null, 'On demand / planning cycle', 'Linear programming and EOQ/ROP constrained optimization engine.')
on conflict (source_code) do update set
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  refresh_cadence = excluded.refresh_cadence,
  credibility_note = excluded.credibility_note;

insert into public.dim_model (model_code, model_name, analytics_layer, model_family, purpose, expected_metrics) values
  ('STL_DECOMPOSITION', 'Seasonal-Trend Decomposition using Loess', 'descriptive', 'statistical_decomposition', 'Isolate Habagat/Amihan seasonality cycles from core growth trend', array['seasonal_strength', 'trend_range']),
  ('ABC_PARETO_CLASSIFIER', '80/20 ABC Product Priority Classifier', 'descriptive', 'pareto_analysis', 'Segment Class A/B/C products by cumulative revenue contribution', array['cumulative_revenue_pct', 'sku_count']),
  ('PROPHET_BASELINE', 'Facebook Prophet Sales-Only Baseline', 'predictive', 'generalized_additive_model', 'Baseline 12-month rolling demand forecast', array['MAE', 'RMSE', 'MAPE']),
  ('PROPHET_MULTIVARIATE', 'Prophet Disease & Weather Adjusted Champion', 'predictive', 'generalized_additive_model', 'Multi-variate forecast with DOH and weather regressors', array['MAE', 'RMSE', 'MAPE', 'Uplift_pct']),
  ('SARIMAX_CHALLENGER', 'Seasonal Auto-Regressive Integrated Moving Average (Exog)', 'predictive', 'classical_time_series', 'Statistical challenger benchmark with weather exog features', array['MAE', 'RMSE', 'MAPE']),
  ('XGBOOST_REGRESSOR', 'Extreme Gradient Boosting Lagged Regressor', 'predictive', 'tree_ensemble', 'Autoregressive feature importance and demand urgency classification', array['MAE', 'RMSE', 'Feature_Importance']),
  ('HOLT_WINTERS', 'Holt-Winters Triple Exponential Smoothing', 'predictive', 'exponential_smoothing', 'Classical additive/multiplicative benchmark', array['MAE', 'RMSE', 'MAPE']),
  ('EOQ_ROP_OPTIMIZER', 'Economic Order Quantity & Dynamic ROP Solver', 'prescriptive', 'inventory_optimization', 'Cost-minimizing batch order quantity and 95% service level safety buffer', array['EOQ_units', 'ROP_units', 'Safety_Stock_units']),
  ('LP_STOCK_ALLOCATOR', 'Linear Programming Constrained Margin Optimizer', 'prescriptive', 'constrained_optimization', 'Maximizes revenue and fulfillment across constrained territories', array['allocated_units', 'objective_value']),
  ('MCDA_REGIONAL_SCORER', 'Multi-Criteria Decision Analysis Regional Scorer', 'prescriptive', 'multi_criteria_analysis', 'Ranks territories for emergency medical supply priority', array['mcda_score', 'priority_rank'])
on conflict (model_code) do update set
  model_name = excluded.model_name,
  purpose = excluded.purpose,
  expected_metrics = excluded.expected_metrics;

insert into public.etl_pipeline_run (
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
  'medshield_dynamic_ingestion_ready',
  'completed',
  now(),
  now(),
  date '2017-01-01',
  date '2025-12-31',
  0,
  0,
  0,
  '{"status":"ready_for_csv_upload","dynamic_product_seeding":true}'::jsonb
);

-- 9. Initial User Accounts
-- Password for both accounts is: Medshield!2025
insert into public.accounts (username, email, password_hash, role)
values
  ('admin', 'admin@medshield.local', crypt('Medshield!2025', gen_salt('bf', 10)), 'admin'),
  ('adrian', 'adrian@medshield.local', crypt('Medshield!2025', gen_salt('bf', 10)), 'admin')
on conflict (username) do update set
  password_hash = excluded.password_hash,
  role = 'admin';
''')

final_sql = '\n'.join(sql)
seed_path.write_text(final_sql, encoding='utf-8')
print('SUCCESS: Updated supabase/seed.sql (removed hardcoded products, added dynamic ingestion structure, created adrian & admin accounts)!')
