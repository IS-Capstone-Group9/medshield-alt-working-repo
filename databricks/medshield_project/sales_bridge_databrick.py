spark.sql("""
SELECT
  COUNT(*) AS yearly_rows,
  MIN(calendar_year) AS first_year,
  MAX(calendar_year) AS last_year,
  SUM(transaction_count) AS transactions,
  MIN(calendar_month_count) AS minimum_months,
  MAX(calendar_month_count) AS maximum_months
FROM workspace.medshield_gold.vw_dashboard_yearly_sales_candidate
""").display()