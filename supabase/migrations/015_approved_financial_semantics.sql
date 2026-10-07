-- Record the project-owner-approved MedShield workbook financial semantics.
-- Legacy physical column names remain unchanged for API and ingestion compatibility.

comment on column medshield_sales.fact_sales_transactions.unit_cost_amount is
  'Source CP: selling price per unit. Legacy physical name retained for compatibility.';
comment on column medshield_sales.fact_sales_transactions.total_cost_amount is
  'Source Total CP: gross sales value before discount. Legacy physical name retained for compatibility.';
comment on column medshield_sales.fact_sales_transactions.net_cost_amount is
  'Source Net CP: approved net sales revenue after discount. Legacy physical name retained for compatibility.';
comment on column medshield_sales.fact_sales_transactions.trade_price_unit_amount is
  'Source TP/UNIT: acquisition price per unit. Legacy physical name retained for compatibility.';
comment on column medshield_sales.fact_sales_transactions.total_trade_price_amount is
  'Source TOTAL TP: approved total acquisition cost. This is not sales revenue.';
comment on column medshield_sales.fact_sales_transactions.net_income_amount is
  'Source Net Income: approved transaction gross profit, normally Net CP minus Total TP; never company net profit.';
comment on column medshield_sales.fact_sales_transactions.margin_pct is
  'Approved transaction gross margin percentage: gross profit divided by Net CP when Net CP is non-zero.';

create or replace view medshield_sales.vw_sales_transactions_financial_semantics
with (security_invoker = true)
as
select
  f.sales_transaction_key,
  d.calendar_year as year,
  d.calendar_date as date_delivered,
  a.area_name as area,
  f.dr_number,
  p.product_name as product,
  f.quantity_sold as quantity,
  f.unit_cost_amount as selling_price_unit_amount,
  f.total_cost_amount as gross_sales_amount,
  f.discount_amount,
  f.net_cost_amount as net_sales_revenue_amount,
  f.trade_price_unit_amount as acquisition_price_unit_amount,
  f.total_trade_price_amount as acquisition_cost_amount,
  f.net_income_amount as gross_profit_amount,
  f.margin_pct as gross_margin_pct,
  f.source_workbook,
  f.source_sheet,
  f.source_row_number,
  f.source_hash,
  f.loaded_at
from medshield_sales.fact_sales_transactions f
join medshield_common.dim_date d on d.date_key = f.delivery_date_key
left join medshield_common.dim_area a on a.area_key = f.area_key
left join medshield_common.dim_product p on p.product_key = f.product_key;

revoke all on medshield_sales.vw_sales_transactions_financial_semantics
  from public, anon, authenticated;
grant select on medshield_sales.vw_sales_transactions_financial_semantics to service_role;

create or replace view medshield_sales.vw_dashboard_yearly_sales_approved
with (security_invoker = true)
as
select
  calendar_year,
  transaction_count,
  total_quantity_candidate as quantity,
  gross_sales_candidate as gross_sales_amount,
  net_sales_candidate as net_sales_revenue_amount,
  transfer_value_candidate as acquisition_cost_amount,
  gross_margin_candidate as gross_profit_amount,
  weighted_gross_margin_pct_candidate as gross_margin_pct,
  warning_transaction_count,
  financial_formula_warning_count,
  pipeline_run_key,
  source_extract_key,
  source_view,
  source_checked_at,
  synced_at,
  'APPROVED_NET_CP_REVENUE_TOTAL_TP_COST'::text as approved_financial_definition_status
from medshield_sales.databricks_yearly_sales_candidate;

revoke all on medshield_sales.vw_dashboard_yearly_sales_approved
  from public, anon, authenticated;
grant select on medshield_sales.vw_dashboard_yearly_sales_approved to service_role;

comment on view medshield_sales.vw_dashboard_yearly_sales_approved is
  'Approved semantic projection of the protected Databricks yearly candidate cache. This view does not replace published dashboard facts.';

comment on column medshield_sales.databricks_yearly_sales_candidate.net_sales_candidate is
  'Approved candidate net sales revenue from workbook Net CP.';
comment on column medshield_sales.databricks_yearly_sales_candidate.transfer_value_candidate is
  'Approved candidate total acquisition cost from workbook Total TP; not revenue.';
comment on column medshield_sales.databricks_yearly_sales_candidate.gross_margin_candidate is
  'Approved candidate transaction gross profit; never company net income.';

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
  select min(f.delivery_date_key), p_snapshot_date_key, sum(f.net_cost_amount),
    sum(f.net_income_amount), d.year_month, 'medshield_cleaned_transactions'
  from medshield_sales.fact_sales_transactions f
  join medshield_common.dim_date d on d.date_key = f.delivery_date_key
  group by d.year_month;

  insert into medshield_sales.fact_area_summary (
    snapshot_date_key, area_key, revenue_amount, income_amount, source_rank, source_scope
  )
  select p_snapshot_date_key, f.area_key, sum(f.net_cost_amount), sum(f.net_income_amount),
    dense_rank() over (order by sum(f.net_cost_amount) desc), 'all_time'
  from medshield_sales.fact_sales_transactions f
  where f.area_key is not null
  group by f.area_key;

  insert into medshield_sales.fact_product_summary (
    snapshot_date_key, product_key, revenue_amount, quantity_sold, income_amount,
    abc_classification, pct_of_total, source_rank, source_scope
  )
  with product_totals as (
    select f.product_key, sum(f.net_cost_amount) as revenue,
      sum(f.quantity_sold) as quantity, sum(f.net_income_amount) as income
    from medshield_sales.fact_sales_transactions f
    where f.product_key is not null
    group by f.product_key
  ), ranked as (
    select product_totals.*,
      dense_rank() over (order by revenue desc) as source_rank,
      revenue / nullif(sum(revenue) over (), 0) as revenue_share,
      sum(revenue) over (order by revenue desc rows unbounded preceding)
        / nullif(sum(revenue) over (), 0) as cumulative_share
    from product_totals
  )
  select p_snapshot_date_key, product_key, revenue, quantity, income,
    case when cumulative_share <= 0.80 then 'A'
         when cumulative_share <= 0.95 then 'B' else 'C' end,
    round((revenue_share * 100)::numeric, 4), source_rank, 'all_time'
  from ranked;

  update medshield_common.dim_product p
  set abc_classification = s.abc_classification
  from medshield_sales.fact_product_summary s
  where s.snapshot_date_key = p_snapshot_date_key and s.product_key = p.product_key;

  insert into medshield_sales.fact_year_summary (
    snapshot_date_key, year_date_key, revenue_amount, income_amount, transactions_count
  )
  select p_snapshot_date_key, min(f.delivery_date_key), sum(f.net_cost_amount),
    sum(f.net_income_amount), count(*)::integer
  from medshield_sales.fact_sales_transactions f
  join medshield_common.dim_date d on d.date_key = f.delivery_date_key
  group by d.calendar_year;

  insert into medshield_sales.fact_seasonality (
    snapshot_date_key, month_key, avg_revenue_amount
  )
  with monthly as (
    select d.calendar_year, d.calendar_month, sum(f.net_cost_amount) as revenue
    from medshield_sales.fact_sales_transactions f
    join medshield_common.dim_date d on d.date_key = f.delivery_date_key
    group by d.calendar_year, d.calendar_month
  )
  select p_snapshot_date_key, calendar_month, avg(revenue)
  from monthly
  group by calendar_month;
end;
$$;

revoke all on function medshield_sales.refresh_sales_aggregates(integer)
  from public, anon, authenticated;
grant execute on function medshield_sales.refresh_sales_aggregates(integer) to service_role;
