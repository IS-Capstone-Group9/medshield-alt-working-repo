-- Compare the Gold monthly total with the approved Silver total.
WITH silver AS (
  SELECT
    ROUND(SUM(net_contract_value), 2) AS net_contract_value,
    ROUND(SUM(gross_margin_amount), 2) AS gross_margin_amount
  FROM workspace.medshield_silver.sales_clean
  WHERE quality_status IN ('valid', 'warning')
    AND duplicate = false
    AND in_analysis_range = true
),
gold AS (
  SELECT
    ROUND(SUM(net_contract_value), 2) AS net_contract_value,
    ROUND(SUM(gross_margin_amount), 2) AS gross_margin_amount
  FROM workspace.medshield_gold.sales_monthly_candidate
)
SELECT
  silver.net_contract_value AS silver_net_contract_value,
  gold.net_contract_value AS gold_net_contract_value,
  silver.net_contract_value - gold.net_contract_value AS net_contract_delta,
  silver.gross_margin_amount AS silver_gross_margin_amount,
  gold.gross_margin_amount AS gold_gross_margin_amount,
  silver.gross_margin_amount - gold.gross_margin_amount AS gross_margin_delta
FROM silver
CROSS JOIN gold;

-- Latest batch validation status.
SELECT *
FROM workspace.medshield_audit.pipeline_runs
ORDER BY validated_at DESC
LIMIT 20;
