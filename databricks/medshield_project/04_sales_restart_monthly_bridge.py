spark.sql("""
CREATE OR REPLACE VIEW
workspace.medshield_gold.vw_dashboard_monthly_sales_candidate AS

SELECT
  m.*,
  DATE_FORMAT(m.month_start, 'yyyy-MM') AS year_month,
  m.calendar_month AS month_number,
  DATE_FORMAT(m.month_start, 'MMM') AS month_short_name,
  m.transaction_count > 0 AS has_sales_activity,
  m.signed_quantity AS total_quantity_candidate,
  m.gross_sales AS gross_sales_candidate,
  m.net_sales AS net_sales_candidate,
  m.total_acquisition_cost AS transfer_value_candidate,
  m.gross_margin_amount AS gross_margin_candidate,
  m.weighted_gross_margin_pct AS weighted_gross_margin_pct_candidate,
  'DEFINITIONS_APPROVED_DATASET_RELEASE_PENDING'
    AS financial_definition_status
FROM workspace.medshield_gold.sales_restart_monthly_candidate AS m
""")