-- MedShield system bridge for the rebuilt sales pipeline.
-- Run after 03_sales_gold.py publishes the sales_restart_*_candidate tables.
-- The MedShield backend reads this view through the SQL Statement API.

CREATE OR REPLACE VIEW workspace.medshield_gold.vw_dashboard_yearly_sales_candidate AS
WITH fact_quality AS (
  SELECT
    calendar_year,
    MIN(date_delivered) AS first_delivery_date,
    MAX(date_delivered) AS last_delivery_date,
    COUNT(DISTINCT dr_number) AS distinct_dr_count,
    COUNT(DISTINCT normalized_area) AS distinct_area_count,
    COUNT(DISTINCT normalized_product) AS distinct_product_count,
    SUM(CASE WHEN SIZE(quality_rule_codes) > 0 THEN 1 ELSE 0 END) AS warning_transaction_count,
    SUM(CASE
      WHEN is_quantity_observation_eligible
       AND is_gross_sales_eligible
       AND is_net_sales_eligible
       AND is_acquisition_cost_eligible
       AND is_gross_margin_eligible
      THEN 1 ELSE 0 END
    ) AS fully_eligible_transaction_count,
    SUM(CASE
      WHEN (
        is_quantity_observation_eligible OR is_gross_sales_eligible
        OR is_net_sales_eligible OR is_acquisition_cost_eligible
        OR is_gross_margin_eligible
      ) AND NOT (
        is_quantity_observation_eligible AND is_gross_sales_eligible
        AND is_net_sales_eligible AND is_acquisition_cost_eligible
        AND is_gross_margin_eligible
      ) THEN 1 ELSE 0 END
    ) AS partially_eligible_transaction_count,
    SUM(CASE
      WHEN NOT (
        is_quantity_observation_eligible OR is_gross_sales_eligible
        OR is_net_sales_eligible OR is_acquisition_cost_eligible
        OR is_gross_margin_eligible
      ) THEN 1 ELSE 0 END
    ) AS dimension_only_transaction_count,
    SUM(CASE WHEN data_source_year <> calendar_year THEN 1 ELSE 0 END) AS source_year_mismatch_count,
    SUM(CASE WHEN quantity < 0 THEN 1 ELSE 0 END) AS negative_quantity_review_count,
    SUM(CASE
      WHEN ARRAY_CONTAINS(quality_rule_codes, 'GROSS_VALUE_FORMULA_MISMATCH')
        OR ARRAY_CONTAINS(quality_rule_codes, 'NET_VALUE_FORMULA_MISMATCH')
        OR ARRAY_CONTAINS(quality_rule_codes, 'TRANSFER_VALUE_FORMULA_MISMATCH')
        OR ARRAY_CONTAINS(quality_rule_codes, 'GROSS_MARGIN_FORMULA_MISMATCH')
      THEN 1 ELSE 0 END
    ) AS financial_formula_warning_count
  FROM workspace.medshield_gold.sales_restart_fact_candidate
  GROUP BY calendar_year
),
yearly_base AS (
  SELECT
    y.calendar_year,
    q.first_delivery_date,
    q.last_delivery_date,
    y.calendar_month_count,
    y.observed_month_count AS active_month_count,
    y.unobserved_month_count AS zero_activity_month_count,
    CASE
      WHEN y.unobserved_month_count = 0 THEN 'ACTIVITY_OBSERVED_ALL_12_MONTHS'
      ELSE 'ZERO_ACTIVITY_MONTHS_PRESENT'
    END AS month_activity_status,
    y.transaction_count,
    q.distinct_dr_count,
    q.distinct_area_count,
    q.distinct_product_count,
    q.warning_transaction_count,
    q.fully_eligible_transaction_count,
    q.partially_eligible_transaction_count,
    q.dimension_only_transaction_count,
    q.source_year_mismatch_count,
    q.negative_quantity_review_count,
    q.financial_formula_warning_count,
    y.signed_quantity_observation_count AS quantity_eligible_transaction_count,
    y.gross_sales_observation_count AS gross_sales_eligible_transaction_count,
    y.net_sales_observation_count AS net_sales_eligible_transaction_count,
    y.total_acquisition_cost_observation_count AS transfer_value_eligible_transaction_count,
    y.gross_margin_amount_observation_count AS gross_margin_eligible_transaction_count,
    y.signed_quantity AS total_quantity_candidate,
    y.gross_sales AS gross_sales_candidate,
    y.net_sales AS net_sales_candidate,
    y.total_acquisition_cost AS transfer_value_candidate,
    y.gross_margin_amount AS gross_margin_candidate,
    y.weighted_gross_margin_pct AS weighted_gross_margin_pct_candidate
  FROM workspace.medshield_gold.sales_restart_yearly_candidate AS y
  INNER JOIN fact_quality AS q USING (calendar_year)
),
with_previous AS (
  SELECT
    *,
    LAG(calendar_year) OVER (ORDER BY calendar_year) AS previous_calendar_year,
    LAG(transaction_count) OVER (ORDER BY calendar_year) AS previous_transaction_count,
    LAG(total_quantity_candidate) OVER (ORDER BY calendar_year) AS previous_total_quantity_candidate,
    LAG(gross_sales_candidate) OVER (ORDER BY calendar_year) AS previous_gross_sales_candidate,
    LAG(net_sales_candidate) OVER (ORDER BY calendar_year) AS previous_net_sales_candidate,
    LAG(gross_margin_candidate) OVER (ORDER BY calendar_year) AS previous_gross_margin_candidate,
    LAG(zero_activity_month_count) OVER (ORDER BY calendar_year) AS previous_zero_activity_month_count
  FROM yearly_base
)
SELECT
  calendar_year,
  first_delivery_date,
  last_delivery_date,
  calendar_month_count,
  active_month_count,
  zero_activity_month_count,
  month_activity_status,
  transaction_count,
  distinct_dr_count,
  distinct_area_count,
  distinct_product_count,
  warning_transaction_count,
  fully_eligible_transaction_count,
  partially_eligible_transaction_count,
  dimension_only_transaction_count,
  source_year_mismatch_count,
  negative_quantity_review_count,
  financial_formula_warning_count,
  quantity_eligible_transaction_count,
  gross_sales_eligible_transaction_count,
  net_sales_eligible_transaction_count,
  transfer_value_eligible_transaction_count,
  gross_margin_eligible_transaction_count,
  total_quantity_candidate,
  gross_sales_candidate,
  net_sales_candidate,
  transfer_value_candidate,
  gross_margin_candidate,
  weighted_gross_margin_pct_candidate,
  ROUND(warning_transaction_count / NULLIF(transaction_count, 0), 4) AS warning_transaction_rate,
  ROUND(fully_eligible_transaction_count / NULLIF(transaction_count, 0), 4) AS fully_eligible_transaction_rate,
  ROUND(quantity_eligible_transaction_count / NULLIF(transaction_count, 0), 4) AS quantity_coverage_rate,
  ROUND(net_sales_eligible_transaction_count / NULLIF(transaction_count, 0), 4) AS net_sales_coverage_rate,
  ROUND(gross_margin_eligible_transaction_count / NULLIF(transaction_count, 0), 4) AS gross_margin_coverage_rate,
  previous_calendar_year,
  previous_transaction_count,
  previous_total_quantity_candidate,
  previous_gross_sales_candidate,
  previous_net_sales_candidate,
  previous_gross_margin_candidate,
  ROUND(100 * (transaction_count - previous_transaction_count)
    / NULLIF(ABS(previous_transaction_count), 0), 2) AS transaction_count_yoy_pct,
  ROUND(100 * (total_quantity_candidate - previous_total_quantity_candidate)
    / NULLIF(ABS(previous_total_quantity_candidate), 0), 2) AS quantity_yoy_pct_candidate,
  ROUND(100 * (gross_sales_candidate - previous_gross_sales_candidate)
    / NULLIF(ABS(previous_gross_sales_candidate), 0), 2) AS gross_sales_yoy_pct_candidate,
  ROUND(100 * (net_sales_candidate - previous_net_sales_candidate)
    / NULLIF(ABS(previous_net_sales_candidate), 0), 2) AS net_sales_yoy_pct_candidate,
  ROUND(100 * (gross_margin_candidate - previous_gross_margin_candidate)
    / NULLIF(ABS(previous_gross_margin_candidate), 0), 2) AS gross_margin_yoy_pct_candidate,
  CASE
    WHEN previous_calendar_year IS NULL THEN 'NO_PREVIOUS_YEAR'
    WHEN zero_activity_month_count > 0 OR previous_zero_activity_month_count > 0
      THEN 'REVIEW_ZERO_ACTIVITY_MONTHS'
    ELSE 'FULL_12_MONTH_ACTIVITY_BOTH_YEARS'
  END AS yoy_comparison_status,
  'CANDIDATE_PENDING_FINANCE_APPROVAL' AS financial_definition_status
FROM with_previous;

-- Expected for dataset d7fb65992bc6c0d485499529b0f62e2da97388048326457aa6b6ba39a2b0aeaf:
-- 9 yearly rows, 2017-2025, 37,178 accepted transactions, 12 months per year,
-- and zero eligibility reconciliation failures.
SELECT
  COUNT(*) AS yearly_rows,
  MIN(calendar_year) AS minimum_year,
  MAX(calendar_year) AS maximum_year,
  COUNT(DISTINCT calendar_year) AS distinct_years,
  SUM(transaction_count) AS accepted_transactions,
  MIN(calendar_month_count) AS minimum_calendar_months,
  MAX(calendar_month_count) AS maximum_calendar_months,
  COUNT(*) FILTER (
    WHERE fully_eligible_transaction_count
        + partially_eligible_transaction_count
        + dimension_only_transaction_count <> transaction_count
  ) AS eligibility_reconciliation_failures
FROM workspace.medshield_gold.vw_dashboard_yearly_sales_candidate;

DESCRIBE TABLE workspace.medshield_gold.vw_dashboard_yearly_sales_candidate;
