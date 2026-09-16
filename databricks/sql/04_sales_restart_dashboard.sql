-- MedShield Sales Analytics dashboard datasets
-- Source policy: sales_restart_gold_v4_area_master
-- Create one Databricks dashboard dataset per numbered SELECT statement.
-- All values remain candidate outputs until the stated business/master-data reviews are complete.

-- 1. Executive KPIs — use as counter visualizations.
-- Population: all retained business-sales facts, including contracts and non-medical items.
SELECT
  SUM(transaction_count) AS retained_transaction_count,
  SUM(net_sales) AS net_sales,
  SUM(gross_margin_amount) AS gross_margin_amount,
  ROUND(
    100 * SUM(gross_margin_amount) / NULLIF(SUM(margin_net_sales_basis), 0),
    2
  ) AS weighted_gross_margin_pct,
  SUM(contract_label_transaction_count) AS contract_label_transaction_count,
  SUM(financial_review_transaction_count) AS financial_review_transaction_count
FROM workspace.medshield_gold.sales_restart_yearly_candidate;

-- 2. Monthly sales trend — line charts for net sales and gross margin; bars for transactions.
-- A missing observation stays NULL. Do not convert it to zero sales.
SELECT
  month_start,
  calendar_year,
  calendar_month,
  transaction_count,
  net_sales,
  gross_margin_amount,
  weighted_gross_margin_pct,
  observation_status,
  source_completeness_status
FROM workspace.medshield_gold.sales_restart_monthly_candidate
ORDER BY month_start;

-- 3. Yearly business-sales trend — bars or a table.
SELECT
  calendar_year,
  transaction_count,
  distinct_source_product_labels,
  signed_quantity,
  net_sales,
  gross_margin_amount,
  weighted_gross_margin_pct,
  observed_month_count,
  unobserved_month_count,
  source_completeness_status
FROM workspace.medshield_gold.sales_restart_yearly_candidate
ORDER BY calendar_year;

-- 4. Approved territory performance — horizontal bars and a detail table.
-- Population: only records whose area mapping is approved as geographic territory.
SELECT
  territory_id,
  territory,
  SUM(transaction_count) AS transaction_count,
  SUM(net_sales) AS net_sales,
  SUM(gross_margin_amount) AS gross_margin_amount,
  ROUND(
    100 * SUM(gross_margin_amount) / NULLIF(SUM(margin_net_sales_basis), 0),
    2
  ) AS weighted_gross_margin_pct,
  MIN(calendar_year) AS first_observed_year,
  MAX(calendar_year) AS last_observed_year
FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate
GROUP BY territory_id, territory
ORDER BY net_sales DESC NULLS LAST;

-- 5. Area-classification coverage — stacked bar or table.
-- This is the governance denominator for all 37,178 retained facts.
SELECT
  area_mapping_status,
  proposed_area_type,
  SUM(retained_record_count) AS retained_record_count,
  SUM(approved_territory_record_count) AS approved_territory_record_count,
  SUM(external_geography_candidate_count) AS external_geography_candidate_count,
  SUM(external_join_ready_count) AS external_join_ready_count,
  ROUND(
    100 * SUM(retained_record_count)
      / SUM(SUM(retained_record_count)) OVER (),
    2
  ) AS retained_record_share_pct
FROM workspace.medshield_audit.sales_restart_area_coverage_candidate
GROUP BY area_mapping_status, proposed_area_type
ORDER BY retained_record_count DESC;

-- 6. Product-scope composition — donut or horizontal bars.
-- Product master is pending, so this is classification status, not approved medical demand.
SELECT
  product_scope_status,
  transaction_count,
  distinct_source_product_labels,
  net_sales,
  gross_margin_amount,
  contract_label_transaction_count,
  provisional_product_demand_quantity,
  approved_medical_demand_quantity
FROM workspace.medshield_gold.sales_restart_label_partition_candidate
ORDER BY transaction_count DESC;

-- 7. Top business product labels — table or horizontal bars.
-- These are source labels, not necessarily canonical medicine SKUs.
SELECT
  normalized_product,
  product_scope_status,
  SUM(transaction_count) AS transaction_count,
  SUM(net_sales) AS net_sales,
  SUM(gross_margin_amount) AS gross_margin_amount,
  ROUND(
    100 * SUM(gross_margin_amount) / NULLIF(SUM(margin_net_sales_basis), 0),
    2
  ) AS weighted_gross_margin_pct
FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate
GROUP BY normalized_product, product_scope_status
ORDER BY net_sales DESC NULLS LAST
LIMIT 20;

-- 8. Data-quality review — table sorted by affected records.
SELECT
  quality_rule_code,
  SUM(affected_source_records) AS affected_source_records,
  COUNT(DISTINCT data_source_year) AS affected_source_years
FROM workspace.medshield_audit.sales_restart_gold_quality_candidate
GROUP BY quality_rule_code
ORDER BY affected_source_records DESC;

-- 9. Source disposition — stacked bars by source year and disposition.
SELECT
  data_source_year,
  record_kind,
  disposition,
  is_analysis_candidate,
  source_record_count
FROM workspace.medshield_audit.sales_restart_gold_disposition_candidate
ORDER BY data_source_year, is_analysis_candidate DESC, source_record_count DESC;

