spark.sql("""
WITH fact_check AS (
  SELECT
    COUNT(*) AS fact_rows,
    SUM(
      CASE WHEN data_source_year = 2025 AND is_contract_label
           THEN 1 ELSE 0 END
    ) AS raw_2025_contract_rows,
    SUM(
      CASE WHEN data_source_year < 2024 AND is_contract_label
           THEN 1 ELSE 0 END
    ) AS historical_contract_rows
  FROM workspace.medshield_gold.sales_restart_fact_candidate
),
monthly_check AS (
  SELECT
    COUNT(*) AS monthly_rows,
    COUNT(DISTINCT year_month) AS distinct_months,
    MIN(year_month) AS first_month,
    MAX(year_month) AS last_month,
    SUM(transaction_count) AS monthly_transactions
  FROM workspace.medshield_gold.vw_dashboard_monthly_sales_candidate
),
yearly_check AS (
  SELECT
    COUNT(*) AS yearly_rows,
    MIN(calendar_year) AS first_year,
    MAX(calendar_year) AS last_year,
    SUM(transaction_count) AS yearly_transactions,
    MIN(calendar_month_count) AS minimum_months,
    MAX(calendar_month_count) AS maximum_months,
    SUM(
      CASE
        WHEN fully_eligible_transaction_count
           + partially_eligible_transaction_count
           + dimension_only_transaction_count
           <> transaction_count
        THEN 1 ELSE 0
      END
    ) AS eligibility_failures
  FROM workspace.medshield_gold.vw_dashboard_yearly_sales_candidate
)
SELECT
  f.*,
  m.*,
  y.*,
  CASE
    WHEN f.fact_rows = 37728
     AND m.monthly_rows = 108
     AND m.distinct_months = 108
     AND m.monthly_transactions = f.fact_rows
     AND y.yearly_rows = 9
     AND y.first_year = 2017
     AND y.last_year = 2025
     AND y.yearly_transactions = f.fact_rows
     AND y.minimum_months = 12
     AND y.maximum_months = 12
     AND y.eligibility_failures = 0
    THEN 'PASS'
    ELSE 'FAIL'
  END AS population_reconciliation_status,
  CASE
    WHEN f.raw_2025_contract_rows = 0
    THEN '2025_RAW_CONTRACT_FREE'
    ELSE '2025_CONTRACT_REVIEW_REQUIRED'
  END AS contract_status
FROM fact_check f
CROSS JOIN monthly_check m
CROSS JOIN yearly_check y
""").display()