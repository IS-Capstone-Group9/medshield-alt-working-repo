-- MedShield Master Seed (Dynamic Ingestion Ready)
-- Generated on: 2026-08-24T15:18:50.187356+00:00

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

-- 3. Geographic and Account Areas
with area_source(area_name, area_group, revenue_amount, income_amount) as (
  values
    ('Government', 'institution', 128274474.22, 217736983.93),
    ('Hospital', 'institution', 98946447.39, 119234204.98),
    ('Batangas', 'territory', 12678087.98, 29121351.62),
    ('Quezon', 'territory', 11851897.91, 22099610.37),
    ('Admin', 'channel', 8426822.57, 12389424.98),
    ('Laguna', 'territory', 7154542.63, 17661832.57),
    ('Marinduque', 'territory', 6173116.35, 8241681.35),
    ('Equipment', 'territory', 6058595.41, 9303716.22),
    ('Camarines Norte', 'territory', 5372298.71, 11628139.20),
    ('Camarines Sur', 'territory', 3249589.15, 6891285.16),
    ('Supplies', 'territory', 2872917.66, 3816457.18),
    ('Cavite', 'territory', 2472292.08, 5959795.26),
    ('Supplies And Equipment', 'territory', 867447.00, 563668.50),
    ('Albay', 'territory', 599319.28, 1214211.50),
    ('Lower Cavite', 'territory', 474008.64, 1154773.02),
    ('Pharma', 'channel', 304397.24, 881737.76),
    ('Bicol', 'territory', 271191.76, 929329.67),
    ('Hopital', 'territory', 207590.00, 169850.00),
    ('Mindoro', 'territory', 153311.76, 116227.24),
    ('East', 'territory', 111683.10, 163160.90),
    ('Eastern', 'territory', 40532.20, 77754.80),
    ('Losses', 'territory', 18131.96, 41133.94),
    ('Personal', 'territory', 13879.40, 8988.67),
    ('Eastern Quezon', 'territory', 12184.90, 23456.10),
    ('Legaspi', 'territory', 9336.60, 19593.40),
    ('Unassigned', 'territory', 9105.00, 21975.00),
    ('Batngas', 'territory', 6185.00, 9778.60),
    ('Lucena', 'territory', 2801.80, 4089.80),
    ('Lagaspi', 'territory', 815.00, 2601.00),
    ('Laguma', 'territory', 600.00, 2900.00),
    ('Rakkk', 'territory', 0.00, 0.00)
)
insert into public.dim_area (area_name, area_group)
select distinct area_name, area_group
from area_source
order by area_name;

-- 4. Monthly Historical Sales
with monthly_source(period, revenue_amount, income_amount) as (
  values
    ('2017-01', 734084.18, 1582562.70),
    ('2017-02', 759887.94, 1736473.26),
    ('2017-03', 763709.56, 2041729.91),
    ('2017-04', 748187.71, 2121378.09),
    ('2017-05', 730646.37, 2812920.73),
    ('2017-06', 685846.53, 1604888.02),
    ('2017-07', 1482332.59, 3719914.67),
    ('2017-08', 1568736.86, 2594779.19),
    ('2017-09', 1206353.31, 1974151.84),
    ('2017-10', 1346711.92, 2084270.26),
    ('2017-11', 1318286.76, 2081887.52),
    ('2017-12', 1066081.36, 2644647.17),
    ('2018-03', 1516641.05, 4033367.16),
    ('2018-04', 3303763.85, 5789981.29),
    ('2018-05', 2339386.47, 5248698.93),
    ('2018-06', 2165492.23, 4638261.26),
    ('2018-07', 2745980.62, 5809696.08),
    ('2018-08', 2416349.37, 4229029.57),
    ('2018-09', 2380660.36, 4636099.59),
    ('2018-10', 4070574.83, 7416183.08),
    ('2018-11', 4143764.67, 8092871.78),
    ('2018-12', 1202631.02, 3341101.22),
    ('2019-01', 1377897.05, 3134252.13),
    ('2019-02', 1988246.07, 3846358.50),
    ('2019-03', 2027713.64, 5685202.99),
    ('2019-04', 2444016.94, 7512816.02),
    ('2019-05', 2801484.16, 6914453.94),
    ('2019-06', 1694271.10, 5322736.55),
    ('2019-07', 2909970.88, 5920123.29),
    ('2019-08', 1630592.85, 4053717.18),
    ('2019-09', 1794561.17, 3661326.45),
    ('2020-01', 2295213.56, 5563225.37),
    ('2020-02', 2038024.63, 5110121.31),
    ('2020-03', 3176219.27, 5895742.50),
    ('2020-04', 530651.40, 1193167.60),
    ('2020-05', 2791831.41, 17160658.86),
    ('2020-06', 1470882.67, 3143300.32),
    ('2020-07', 1090499.30, 2607432.10),
    ('2020-08', 926064.64, 1561540.39),
    ('2020-09', 696220.17, 843952.77),
    ('2020-10', 673345.47, 1462677.53),
    ('2020-11', 2008037.57, 3689949.07),
    ('2020-12', 627359.39, 1608464.33),
    ('2021-01', 2568258.34, 6268892.09),
    ('2021-02', 1196801.75, 1876557.41),
    ('2021-03', 892637.62, 1778655.66),
    ('2021-04', 1633582.56, 2814742.51),
    ('2021-05', 1596115.50, 3516188.48),
    ('2021-06', 1234173.36, 3789214.33),
    ('2021-07', 1816717.48, 4165528.98),
    ('2021-08', 4536065.84, 6114492.31),
    ('2021-09', 3141134.71, 5349791.61),
    ('2021-10', 5253594.01, 7254358.03),
    ('2021-11', 2706945.66, 7342041.19),
    ('2021-12', 1045500.64, 1742056.27),
    ('2022-01', 652570.28, 1811995.95),
    ('2022-02', 3302345.12, 6284459.61),
    ('2022-03', 3138472.37, 6342342.63),
    ('2022-04', 1018999.00, 1668960.63),
    ('2022-05', 1626832.89, 2914688.12),
    ('2022-06', 2991522.04, 7419915.99),
    ('2022-07', 1264932.41, 2638013.09),
    ('2022-08', 1165582.55, 1651889.69),
    ('2022-09', 1170788.48, 1737073.40),
    ('2022-10', 2247923.19, 4972578.17),
    ('2022-11', 1572687.92, 3533906.30),
    ('2022-12', 1171112.88, 1809811.75),
    ('2023-01', 2665390.57, 3576350.03),
    ('2023-02', 656437.76, 598507.74),
    ('2023-03', 1061895.38, 1521862.18),
    ('2023-04', 598573.51, 1010371.84),
    ('2023-05', 6484681.07, 18134834.73),
    ('2023-06', 22178785.66, 23569508.41),
    ('2023-07', 1923731.26, 3255444.88),
    ('2023-08', 1234421.04, 1935273.12),
    ('2023-09', 858007.13, 4291104.51),
    ('2023-10', 1209293.65, 1657954.75),
    ('2023-11', 7719362.23, 11931595.68),
    ('2023-12', 156033.19, 289864.81),
    ('2024-01', 590911.41, 1155435.70),
    ('2024-02', 756058.34, 1299111.80),
    ('2024-03', 675553.97, 1317230.14),
    ('2024-04', 1042702.00, 1057349.08),
    ('2024-05', 1298307.64, 2472488.09),
    ('2024-06', 3920718.94, 4127046.73),
    ('2024-07', 1820005.52, 2556899.55),
    ('2024-08', 2280339.14, 2475195.49),
    ('2024-09', 1683287.05, 2579619.75),
    ('2024-10', 2541620.43, 2420504.64),
    ('2024-11', 1546044.76, 2190384.36),
    ('2024-12', 12351001.30, 12513855.20),
    ('2025-01', 6954559.51, 9419532.67),
    ('2025-02', 7986052.00, 5313433.85),
    ('2025-03', 1323106.33, 1289188.77),
    ('2025-04', 2773899.84, 2739267.03),
    ('2025-05', 11979174.30, 9405906.95),
    ('2025-06', 7396665.28, 7964376.25),
    ('2025-07', 8178558.98, 12174334.83),
    ('2025-08', 4353766.78, 4721280.53),
    ('2025-09', 11696682.84, 8864880.13),
    ('2025-10', 7374922.58, 5137755.73),
    ('2025-11', 12222850.13, 12853159.07),
    ('2025-12', 12505691.68, 10744536.98)
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

-- 5. Area Summary
with area_source(area_name, area_group, revenue_amount, income_amount) as (
  values
    ('Government', 'institution', 128274474.22, 217736983.93),
    ('Hospital', 'institution', 98946447.39, 119234204.98),
    ('Batangas', 'territory', 12678087.98, 29121351.62),
    ('Quezon', 'territory', 11851897.91, 22099610.37),
    ('Admin', 'channel', 8426822.57, 12389424.98),
    ('Laguna', 'territory', 7154542.63, 17661832.57),
    ('Marinduque', 'territory', 6173116.35, 8241681.35),
    ('Equipment', 'territory', 6058595.41, 9303716.22),
    ('Camarines Norte', 'territory', 5372298.71, 11628139.20),
    ('Camarines Sur', 'territory', 3249589.15, 6891285.16),
    ('Supplies', 'territory', 2872917.66, 3816457.18),
    ('Cavite', 'territory', 2472292.08, 5959795.26),
    ('Supplies And Equipment', 'territory', 867447.00, 563668.50),
    ('Albay', 'territory', 599319.28, 1214211.50),
    ('Lower Cavite', 'territory', 474008.64, 1154773.02),
    ('Pharma', 'channel', 304397.24, 881737.76),
    ('Bicol', 'territory', 271191.76, 929329.67),
    ('Hopital', 'territory', 207590.00, 169850.00),
    ('Mindoro', 'territory', 153311.76, 116227.24),
    ('East', 'territory', 111683.10, 163160.90),
    ('Eastern', 'territory', 40532.20, 77754.80),
    ('Losses', 'territory', 18131.96, 41133.94),
    ('Personal', 'territory', 13879.40, 8988.67),
    ('Eastern Quezon', 'territory', 12184.90, 23456.10),
    ('Legaspi', 'territory', 9336.60, 19593.40),
    ('Unassigned', 'territory', 9105.00, 21975.00),
    ('Batngas', 'territory', 6185.00, 9778.60),
    ('Lucena', 'territory', 2801.80, 4089.80),
    ('Lagaspi', 'territory', 815.00, 2601.00),
    ('Laguma', 'territory', 600.00, 2900.00),
    ('Rakkk', 'territory', 0.00, 0.00)
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

-- 6. Year Summary
with year_source(year_label, revenue_amount, income_amount, transactions_count) as (
  values
    ('2017', 12410865.09, 26999603.36, 5718),
    ('2018', 26285244.47, 53235289.96, 9217),
    ('2019', 18668753.86, 46050987.05, 5459),
    ('2020', 18324349.48, 49840232.15, 3995),
    ('2021', 27621527.47, 52012518.87, 3415),
    ('2022', 21323769.13, 42785635.33, 4026),
    ('2023', 46746612.45, 71772672.68, 5889),
    ('2024', 30506550.50, 36165120.53, 2943),
    ('2025', 94745930.25, 90627652.79, 4136)
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

-- 7. Monthly Seasonality
with seasonality_source(month_key, avg_revenue_amount) as (
  values
    (1, 2229860.61),
    (2, 2335481.70),
    (3, 1619549.91),
    (4, 1566041.87),
    (5, 3516495.53),
    (6, 4859817.53),
    (7, 2581414.34),
    (8, 2234657.67),
    (9, 2736410.58),
    (10, 3089748.26),
    (11, 4154747.46),
    (12, 3765676.43)
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

-- 8. Source Systems & DSS Model Registry
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
