-- Compatibility view for the current MedShield application field names.
-- The governed base table keeps source-faithful terminology.

CREATE OR REPLACE VIEW workspace.medshield_gold.sales_transactions_candidate_compat AS
SELECT
  area,
  dr_number,
  date_delivered,
  product,
  quantity,
  contract_price_unit AS unit_cost,
  gross_contract_value AS total_cost,
  discount_amount AS discount,
  net_contract_value AS net_cost,
  transfer_price_unit AS trade_price_unit,
  total_transfer_price,
  gross_margin_amount AS net_income,
  gross_margin_pct AS margin_pct,
  area_type,
  year,
  quality_status,
  quality_notes,
  duplicate,
  data_source_year,
  source_workbook,
  source_row_number,
  source_hash,
  business_hash,
  import_batch_id
FROM workspace.medshield_silver.sales_clean
WHERE quality_status IN ('valid', 'warning')
  AND duplicate = false
  AND in_analysis_range = true;
