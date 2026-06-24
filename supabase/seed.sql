-- Seed data transformed from the current MedShield dashboard snapshot.
-- The warehouse tables are the source of truth for the API and dashboard views.

truncate table
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
insert into public.dim_area (area_name, area_group)
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
insert into public.dim_product (product_name, abc_classification, product_group)
select distinct product_name, abc_classification, 'product'
from product_source
order by product_name;

update public.dim_product
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
from public.dim_product p
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
  'medshield_dashboard'
from monthly_source m
join public.dim_date p on p.year_month = m.period
cross join (
  select date_key
  from public.dim_date
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
  'all_time'
from area_source s
join public.dim_area a on a.area_name = s.area_name
cross join (
  select date_key
  from public.dim_date
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
join public.dim_product p on p.product_name = s.product_name
cross join (
  select date_key
  from public.dim_date
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

insert into public.etl_source_extract (
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
from public.etl_pipeline_run run
cross join public.dim_source_system source
where run.pipeline_name = 'medshield_sales_external_signals_baseline'
  and source.source_code = 'MEDSHIELD_XLSX'
order by run.pipeline_run_key desc
limit 1;

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
insert into public.fact_disease_signal (
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
join public.dim_date d on d.year_month = signal.period
cross join public.dim_source_system s
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
insert into public.fact_weather_signal (
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
join public.dim_date d on d.year_month = signal.period
cross join public.dim_source_system s
where s.source_code = 'PAGASA_CLIMATE';

with run as (
  insert into public.fact_forecast_run (
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
    (select date_key from public.dim_date where year_month = '2021-01' limit 1),
    (select date_key from public.dim_date where year_month = '2025-12' limit 1),
    (select date_key from public.dim_date where year_month = '2026-01' limit 1),
    (select date_key from public.dim_date where year_month = '2026-12' limit 1),
    'baseline-demo-v1',
    '{"seasonality":"monthly","external_regressors":["disease_intensity_index","rainfall_severity_index"]}'::jsonb,
    '{"mae":0,"rmse":0,"mape":0,"status":"placeholder_until_model_training"}'::jsonb,
    'Seeded baseline forecast path for API/dashboard validation.'
  from public.dim_model m
  cross join public.dim_source_system s
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
insert into public.fact_demand_forecast (
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
join public.dim_date d on d.year_month = f.period;

with product_source(product_name, abc, rank_no, cumulative_pct, demand_score, margin_score, urgency_score, risk_level, recommendation) as (
  values
    ('PAGBILAO # 13,500,000', 'A', 1, 27.70, 0.96, 0.92, 0.88, 'high', 'Protect allocation and review bid replenishment early.'),
    ('PAGBILAO # 6,334,470', 'A', 2, 41.90, 0.91, 0.84, 0.78, 'medium', 'Keep allocation visible in weekly planning.'),
    ('MONOWEL 1G IV', 'A', 3, 51.00, 0.86, 0.58, 0.82, 'high', 'Monitor hospital demand and reorder buffer.'),
    ('BUPIRIGHT AMPULE', 'A', 4, 56.30, 0.79, 0.77, 0.70, 'medium', 'Maintain stock buffer for recurring demand.'),
    ('JUBI -R 100MG', 'A', 5, 61.40, 0.74, 0.69, 0.65, 'medium', 'Keep in priority review cycle.')
)
insert into public.fact_product_priority (
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
join public.dim_product p on p.product_name = src.product_name
cross join public.dim_model m
cross join (select date_key from public.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'XGBOOST_URGENCY';

with cluster_source(area_name, cluster_label, profile, revenue_score, growth_score, risk_index, implication) as (
  values
    ('Government', 'Cluster A', 'High-volume / institutional', 0.98, 0.72, 0.05, 'Refresh forecasts often and monitor bids.'),
    ('Hospital', 'Cluster A', 'High-volume / institutional', 0.82, 0.66, 0.08, 'Protect fast-moving critical SKUs.'),
    ('Quezon', 'Cluster B', 'Stable commercial demand', 0.44, 0.52, 0.07, 'Keep steady replenishment cycles.'),
    ('Batangas', 'Cluster B', 'Stable commercial demand', 0.38, 0.47, 0.04, 'Maintain targeted replenishment.'),
    ('Marinduque', 'Cluster D', 'Low-scale / variable movement', 0.20, 0.34, 0.10, 'Keep typhoon contingency stock.')
)
insert into public.fact_area_cluster (
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
join public.dim_area a on a.area_name = src.area_name
cross join public.dim_model m
cross join (select date_key from public.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'KMEANS_AREA';

with priority_source(rank_no, area_name, revenue_score, growth_score, risk_index, score, recommendation) as (
  values
    (1, 'Government', 0.40, 0.18, 0.05, 0.63, 'Prioritize bid readiness and allocation.'),
    (2, 'Hospital', 0.22, 0.14, 0.08, 0.44, 'Protect fast-moving critical SKUs.'),
    (3, 'Quezon', 0.13, 0.09, 0.07, 0.29, 'Increase forecast refresh cadence.'),
    (4, 'Batangas', 0.09, 0.07, 0.04, 0.20, 'Maintain targeted replenishment.'),
    (5, 'Marinduque', 0.03, 0.05, 0.10, 0.18, 'Keep typhoon contingency stock.')
)
insert into public.fact_regional_priority (
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
join public.dim_area a on a.area_name = src.area_name
cross join public.dim_model m
cross join (select date_key from public.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'MCDA_REGIONAL';

with inventory_source(product_name, demand_units, eoq_units, rop_units, safety_units, stock_units, forecast_units, gap_units, risk_level, recommendation) as (
  values
    ('MONOWEL 1G IV', 18400, 240, 80, 35, 62, 96, 34, 'high', 'Reorder before January forecast peak; protect hospital allocation.'),
    ('EUROXONE 1G', 42800, 360, 120, 52, 144, 155, 11, 'medium', 'Keep monthly review and supplier lead-time watch.'),
    ('BUPIRIGHT AMPULE', 86200, 420, 160, 70, 215, 198, -17, 'low', 'Maintain normal replenishment.'),
    ('TRIVASC 35MG MR', 51000, 310, 110, 48, 128, 142, 14, 'medium', 'Replenish within the next planning cycle.'),
    ('ANTITET 1500IU/0.7ML', 98400, 500, 190, 82, 166, 225, 59, 'high', 'Pre-position stock for surge and contingency demand.')
)
insert into public.fact_inventory_recommendation (
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
join public.dim_product p on p.product_name = src.product_name
cross join public.dim_model m
cross join (select date_key from public.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'EOQ_ROP_SAFETY';

with allocation_source(product_name, area_name, available_units, recommended_units, objective_value, optimization_gap, notes, recommendation) as (
  values
    ('MONOWEL 1G IV', 'Hospital', 320, 180, 0.92, 0.04, 'Hospital demand constraint prioritized.', 'Allocate first replenishment to hospital accounts.'),
    ('EUROXONE 1G', 'Quezon', 420, 150, 0.84, 0.06, 'Regional growth constraint prioritized.', 'Reserve stock for Quezon before lower-priority routes.'),
    ('ANTITET 1500IU/0.7ML', 'Marinduque', 260, 120, 0.88, 0.05, 'Weather-risk constraint applied.', 'Pre-position contingency stock before typhoon season.')
)
insert into public.fact_allocation_recommendation (
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
join public.dim_product p on p.product_name = src.product_name
join public.dim_area a on a.area_name = src.area_name
cross join public.dim_model m
cross join (select date_key from public.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'LINEAR_ALLOCATION';

with match_source(product_name, area_name, similarity_score, match_rank, recommendation) as (
  values
    ('MONOWEL 1G IV', 'Hospital', 0.91, 1, 'Strong institutional product-area fit.'),
    ('EUROXONE 1G', 'Quezon', 0.83, 2, 'Good demand similarity with prior regional movement.'),
    ('ANTITET 1500IU/0.7ML', 'Marinduque', 0.79, 3, 'Keep as contingency match for variable demand.')
)
insert into public.fact_product_region_match (
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
join public.dim_product p on p.product_name = src.product_name
join public.dim_area a on a.area_name = src.area_name
cross join public.dim_model m
cross join (select date_key from public.dim_date where year_month = '2025-12' limit 1) snapshot
where m.model_code = 'COLLAB_PRODUCT_REGION';

with alert_source(alert_date, area_name, product_name, model_code, alert_type, severity, trigger_metric, threshold_value, observed_value, multiplier, recommendation) as (
  values
    ('2026-01-01', 'Hospital', 'MONOWEL 1G IV', 'EOQ_ROP_SAFETY', 'stock_gap', 'high', 'stock_gap_units', 0, 34, 1.00, 'Demand exceeds safety stock. Create replenishment order.'),
    ('2026-05-01', null, 'ANTITET 1500IU/0.7ML', 'ALERT_THRESHOLDS', 'disease_surge', 'high', 'disease_intensity_index', 1.40, 1.48, 1.35, 'Increase antipyretic and emergency stock review.'),
    ('2026-07-01', 'Marinduque', null, 'ALERT_THRESHOLDS', 'weather_risk', 'critical', 'rainfall_severity_index', 0.60, 0.68, 1.40, 'Pre-position wound care and ORS stock before severe rainfall window.')
)
insert into public.fact_decision_alert (
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
join public.dim_date d on d.calendar_date = src.alert_date::date
left join public.dim_area a on a.area_name = src.area_name
left join public.dim_product p on p.product_name = src.product_name
join public.dim_model m on m.model_code = src.model_code
cross join (select date_key from public.dim_date where year_month = '2025-12' limit 1) snapshot;

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
insert into public.fact_model_evaluation (
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
  (select date_key from public.dim_date where year_month = '2021-01' limit 1),
  (select date_key from public.dim_date where year_month = '2025-12' limit 1),
  src.metric_name,
  src.metric_value,
  src.target_direction,
  src.benchmark_value,
  src.passed,
  src.notes
from eval_source src
join public.dim_model m on m.model_code = src.model_code;
