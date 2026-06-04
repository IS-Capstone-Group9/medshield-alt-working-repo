-- Seed data transformed from the current MedShield dashboard snapshot.
-- The warehouse tables are the source of truth for the API and dashboard views.

truncate table
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
