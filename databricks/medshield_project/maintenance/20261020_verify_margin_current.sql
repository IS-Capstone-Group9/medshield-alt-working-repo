-- READ ONLY: verification after the user's four margin updates on 20 October 2026.
-- No UPDATE, retention change, historical-version read, source rebuild or model activation.
-- Reconciles current mart keys and all 27 aggregated metric/count columns plus rate
-- to unchanged fact20, using the local Gold metric/eligibility definitions.
-- This is NOT proof of full row-by-row equality to the inaccessible pre-update snapshot.
-- Check the current source/mart histories first; expected versions fact20, marts12/11/12/11.
-- Keep the original migration as historical evidence. Do not rerun its Phase2.

WITH aggregated AS (
  SELECT calendar_year,
    product_key,
    normalized_product,
    product_scope_status,
    COUNT(*) AS transaction_count,
    COUNT(DISTINCT product_key) AS distinct_source_product_labels,
    SUM(CAST(is_contract_label AS BIGINT)) AS contract_label_transaction_count,
    SUM(CAST(is_adjusted_source AS BIGINT)) AS adjusted_source_transaction_count,
    SUM(CAST(is_low_trust_2017 AS BIGINT)) AS low_trust_2017_transaction_count,
    SUM(CAST(is_historical_backfill_candidate AS BIGINT)) AS historical_backfill_transaction_count,
    SUM(CAST(financial_review_required AS BIGINT)) AS financial_review_transaction_count,
    SUM(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS signed_quantity,
    COUNT(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS signed_quantity_observation_count,
    SUM(CASE WHEN is_positive_delivery_quantity_eligible THEN quantity END) AS positive_delivered_quantity,
    COUNT(CASE WHEN is_positive_delivery_quantity_eligible THEN quantity END) AS positive_delivered_quantity_observation_count,
    SUM(CASE WHEN is_return_quantity_eligible THEN return_quantity_abs END) AS return_quantity_abs,
    COUNT(CASE WHEN is_return_quantity_eligible THEN return_quantity_abs END) AS return_quantity_abs_observation_count,
    SUM(CASE WHEN is_provisional_product_demand_eligible THEN quantity END) AS provisional_product_demand_quantity,
    COUNT(CASE WHEN is_provisional_product_demand_eligible THEN quantity END) AS provisional_product_demand_quantity_observation_count,
    SUM(CASE WHEN is_approved_medical_demand_eligible THEN quantity END) AS approved_medical_demand_quantity,
    COUNT(CASE WHEN is_approved_medical_demand_eligible THEN quantity END) AS approved_medical_demand_quantity_observation_count,
    SUM(CASE WHEN is_gross_sales_eligible THEN gross_sales END) AS gross_sales,
    COUNT(CASE WHEN is_gross_sales_eligible THEN gross_sales END) AS gross_sales_observation_count,
    SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales,
    COUNT(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales_observation_count,
    SUM(CASE WHEN is_acquisition_cost_eligible THEN total_acquisition_cost END) AS total_acquisition_cost,
    COUNT(CASE WHEN is_acquisition_cost_eligible THEN total_acquisition_cost END) AS total_acquisition_cost_observation_count,
    SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_amount,
    COUNT(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_amount_observation_count,
    SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_net_sales_basis,
    COUNT(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_net_sales_basis_observation_count
  FROM workspace.medshield_gold.sales_restart_fact_candidate
  WHERE is_provisional_product_demand_eligible = true
  GROUP BY calendar_year,product_key,normalized_product,product_scope_status
), expected AS (
  SELECT *, CASE WHEN margin_net_sales_basis > 0
    THEN ROUND(gross_margin_amount / margin_net_sales_basis * 100, 4) END AS weighted_gross_margin_pct
  FROM aggregated
), actual_minus_expected AS (
  SELECT calendar_year,product_key,normalized_product,product_scope_status,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_product_yearly_candidate
  EXCEPT ALL SELECT calendar_year,product_key,normalized_product,product_scope_status,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM expected
), expected_minus_actual AS (
  SELECT calendar_year,product_key,normalized_product,product_scope_status,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM expected
  EXCEPT ALL SELECT calendar_year,product_key,normalized_product,product_scope_status,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_product_yearly_candidate
), controls AS (
  SELECT COUNT(*) AS rows,
    SUM(CASE WHEN margin_net_sales_basis <= 0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END) AS invalid_rates,
    SUM(CASE WHEN NOT (dataset_id <=> 'b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4') OR NOT (policy_version <=> 'sales_restart_gold_v7_independent_catalog') OR NOT (product_master_sha256 <=> '2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29') OR NOT (area_mapping_sha256 <=> 'a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949') OR NOT (publication_status <=> 'CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW') THEN 1 ELSE 0 END) AS identity_mismatches,
    SUM(net_sales) AS net_sales, SUM(gross_margin_amount) AS gross_profit,
    SUM(margin_net_sales_basis) AS margin_basis
  FROM workspace.medshield_gold.sales_restart_product_yearly_candidate
)
SELECT 'sales_restart_product_yearly_candidate' AS table_name, controls.*,
  (SELECT COUNT(*) FROM expected) AS source_groups,
  (SELECT COUNT(*) FROM actual_minus_expected) AS actual_minus_source,
  (SELECT COUNT(*) FROM expected_minus_actual) AS source_minus_actual,
  assert_true(rows = 6671 AND invalid_rates = 0 AND identity_mismatches = 0
    AND net_sales = 586300522.360000 AND gross_profit = 265331733.100000
    AND margin_basis = 445647716.940000
    AND (SELECT COUNT(*) FROM actual_minus_expected) = 0
    AND (SELECT COUNT(*) FROM expected_minus_actual) = 0,
    'Current source reconciliation failed: sales_restart_product_yearly_candidate') AS current_source_check
FROM controls;

-- COMMAND ----------

WITH aggregated AS (
  SELECT calendar_year,
    product_key,
    normalized_product,
    product_scope_status,
    COUNT(*) AS transaction_count,
    COUNT(DISTINCT product_key) AS distinct_source_product_labels,
    SUM(CAST(is_contract_label AS BIGINT)) AS contract_label_transaction_count,
    SUM(CAST(is_adjusted_source AS BIGINT)) AS adjusted_source_transaction_count,
    SUM(CAST(is_low_trust_2017 AS BIGINT)) AS low_trust_2017_transaction_count,
    SUM(CAST(is_historical_backfill_candidate AS BIGINT)) AS historical_backfill_transaction_count,
    SUM(CAST(financial_review_required AS BIGINT)) AS financial_review_transaction_count,
    SUM(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS signed_quantity,
    COUNT(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS signed_quantity_observation_count,
    SUM(CASE WHEN is_positive_delivery_quantity_eligible THEN quantity END) AS positive_delivered_quantity,
    COUNT(CASE WHEN is_positive_delivery_quantity_eligible THEN quantity END) AS positive_delivered_quantity_observation_count,
    SUM(CASE WHEN is_return_quantity_eligible THEN return_quantity_abs END) AS return_quantity_abs,
    COUNT(CASE WHEN is_return_quantity_eligible THEN return_quantity_abs END) AS return_quantity_abs_observation_count,
    SUM(CASE WHEN is_provisional_product_demand_eligible THEN quantity END) AS provisional_product_demand_quantity,
    COUNT(CASE WHEN is_provisional_product_demand_eligible THEN quantity END) AS provisional_product_demand_quantity_observation_count,
    SUM(CASE WHEN is_approved_medical_demand_eligible THEN quantity END) AS approved_medical_demand_quantity,
    COUNT(CASE WHEN is_approved_medical_demand_eligible THEN quantity END) AS approved_medical_demand_quantity_observation_count,
    SUM(CASE WHEN is_gross_sales_eligible THEN gross_sales END) AS gross_sales,
    COUNT(CASE WHEN is_gross_sales_eligible THEN gross_sales END) AS gross_sales_observation_count,
    SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales,
    COUNT(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales_observation_count,
    SUM(CASE WHEN is_acquisition_cost_eligible THEN total_acquisition_cost END) AS total_acquisition_cost,
    COUNT(CASE WHEN is_acquisition_cost_eligible THEN total_acquisition_cost END) AS total_acquisition_cost_observation_count,
    SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_amount,
    COUNT(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_amount_observation_count,
    SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_net_sales_basis,
    COUNT(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_net_sales_basis_observation_count
  FROM workspace.medshield_gold.sales_restart_fact_candidate
  WHERE true
  GROUP BY calendar_year,product_key,normalized_product,product_scope_status
), expected AS (
  SELECT *, CASE WHEN margin_net_sales_basis > 0
    THEN ROUND(gross_margin_amount / margin_net_sales_basis * 100, 4) END AS weighted_gross_margin_pct
  FROM aggregated
), actual_minus_expected AS (
  SELECT calendar_year,product_key,normalized_product,product_scope_status,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate
  EXCEPT ALL SELECT calendar_year,product_key,normalized_product,product_scope_status,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM expected
), expected_minus_actual AS (
  SELECT calendar_year,product_key,normalized_product,product_scope_status,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM expected
  EXCEPT ALL SELECT calendar_year,product_key,normalized_product,product_scope_status,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate
), controls AS (
  SELECT COUNT(*) AS rows,
    SUM(CASE WHEN margin_net_sales_basis <= 0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END) AS invalid_rates,
    SUM(CASE WHEN NOT (dataset_id <=> 'b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4') OR NOT (policy_version <=> 'sales_restart_gold_v7_independent_catalog') OR NOT (product_master_sha256 <=> '2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29') OR NOT (area_mapping_sha256 <=> 'a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949') OR NOT (publication_status <=> 'CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW') THEN 1 ELSE 0 END) AS identity_mismatches,
    SUM(net_sales) AS net_sales, SUM(gross_margin_amount) AS gross_profit,
    SUM(margin_net_sales_basis) AS margin_basis
  FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate
)
SELECT 'sales_restart_business_product_yearly_candidate' AS table_name, controls.*,
  (SELECT COUNT(*) FROM expected) AS source_groups,
  (SELECT COUNT(*) FROM actual_minus_expected) AS actual_minus_source,
  (SELECT COUNT(*) FROM expected_minus_actual) AS source_minus_actual,
  assert_true(rows = 7649 AND invalid_rates = 0 AND identity_mismatches = 0
    AND net_sales = 626946741.810000 AND gross_profit = 288487498.720000
    AND margin_basis = 478720670.030000
    AND (SELECT COUNT(*) FROM actual_minus_expected) = 0
    AND (SELECT COUNT(*) FROM expected_minus_actual) = 0,
    'Current source reconciliation failed: sales_restart_business_product_yearly_candidate') AS current_source_check
FROM controls;

-- COMMAND ----------

WITH aggregated AS (
  SELECT calendar_year,
    area_key,
    normalized_area,
    COUNT(*) AS transaction_count,
    COUNT(DISTINCT product_key) AS distinct_source_product_labels,
    SUM(CAST(is_contract_label AS BIGINT)) AS contract_label_transaction_count,
    SUM(CAST(is_adjusted_source AS BIGINT)) AS adjusted_source_transaction_count,
    SUM(CAST(is_low_trust_2017 AS BIGINT)) AS low_trust_2017_transaction_count,
    SUM(CAST(is_historical_backfill_candidate AS BIGINT)) AS historical_backfill_transaction_count,
    SUM(CAST(financial_review_required AS BIGINT)) AS financial_review_transaction_count,
    SUM(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS signed_quantity,
    COUNT(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS signed_quantity_observation_count,
    SUM(CASE WHEN is_positive_delivery_quantity_eligible THEN quantity END) AS positive_delivered_quantity,
    COUNT(CASE WHEN is_positive_delivery_quantity_eligible THEN quantity END) AS positive_delivered_quantity_observation_count,
    SUM(CASE WHEN is_return_quantity_eligible THEN return_quantity_abs END) AS return_quantity_abs,
    COUNT(CASE WHEN is_return_quantity_eligible THEN return_quantity_abs END) AS return_quantity_abs_observation_count,
    SUM(CASE WHEN is_provisional_product_demand_eligible THEN quantity END) AS provisional_product_demand_quantity,
    COUNT(CASE WHEN is_provisional_product_demand_eligible THEN quantity END) AS provisional_product_demand_quantity_observation_count,
    SUM(CASE WHEN is_approved_medical_demand_eligible THEN quantity END) AS approved_medical_demand_quantity,
    COUNT(CASE WHEN is_approved_medical_demand_eligible THEN quantity END) AS approved_medical_demand_quantity_observation_count,
    SUM(CASE WHEN is_gross_sales_eligible THEN gross_sales END) AS gross_sales,
    COUNT(CASE WHEN is_gross_sales_eligible THEN gross_sales END) AS gross_sales_observation_count,
    SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales,
    COUNT(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales_observation_count,
    SUM(CASE WHEN is_acquisition_cost_eligible THEN total_acquisition_cost END) AS total_acquisition_cost,
    COUNT(CASE WHEN is_acquisition_cost_eligible THEN total_acquisition_cost END) AS total_acquisition_cost_observation_count,
    SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_amount,
    COUNT(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_amount_observation_count,
    SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_net_sales_basis,
    COUNT(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_net_sales_basis_observation_count
  FROM workspace.medshield_gold.sales_restart_fact_candidate
  WHERE true
  GROUP BY calendar_year,area_key,normalized_area
), expected AS (
  SELECT *, CASE WHEN margin_net_sales_basis > 0
    THEN ROUND(gross_margin_amount / margin_net_sales_basis * 100, 4) END AS weighted_gross_margin_pct
  FROM aggregated
), actual_minus_expected AS (
  SELECT calendar_year,area_key,normalized_area,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_area_yearly_candidate
  EXCEPT ALL SELECT calendar_year,area_key,normalized_area,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM expected
), expected_minus_actual AS (
  SELECT calendar_year,area_key,normalized_area,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM expected
  EXCEPT ALL SELECT calendar_year,area_key,normalized_area,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_area_yearly_candidate
), controls AS (
  SELECT COUNT(*) AS rows,
    SUM(CASE WHEN margin_net_sales_basis <= 0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END) AS invalid_rates,
    SUM(CASE WHEN NOT (dataset_id <=> 'b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4') OR NOT (policy_version <=> 'sales_restart_gold_v7_independent_catalog') OR NOT (product_master_sha256 <=> '2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29') OR NOT (area_mapping_sha256 <=> 'a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949') OR NOT (publication_status <=> 'CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW') THEN 1 ELSE 0 END) AS identity_mismatches,
    SUM(net_sales) AS net_sales, SUM(gross_margin_amount) AS gross_profit,
    SUM(margin_net_sales_basis) AS margin_basis
  FROM workspace.medshield_gold.sales_restart_area_yearly_candidate
)
SELECT 'sales_restart_area_yearly_candidate' AS table_name, controls.*,
  (SELECT COUNT(*) FROM expected) AS source_groups,
  (SELECT COUNT(*) FROM actual_minus_expected) AS actual_minus_source,
  (SELECT COUNT(*) FROM expected_minus_actual) AS source_minus_actual,
  assert_true(rows = 125 AND invalid_rates = 0 AND identity_mismatches = 0
    AND net_sales = 626946741.810000 AND gross_profit = 288487498.720000
    AND margin_basis = 478720670.030000
    AND (SELECT COUNT(*) FROM actual_minus_expected) = 0
    AND (SELECT COUNT(*) FROM expected_minus_actual) = 0,
    'Current source reconciliation failed: sales_restart_area_yearly_candidate') AS current_source_check
FROM controls;

-- COMMAND ----------

WITH aggregated AS (
  SELECT calendar_year,
    territory_id,
    territory,
    COUNT(*) AS transaction_count,
    COUNT(DISTINCT product_key) AS distinct_source_product_labels,
    SUM(CAST(is_contract_label AS BIGINT)) AS contract_label_transaction_count,
    SUM(CAST(is_adjusted_source AS BIGINT)) AS adjusted_source_transaction_count,
    SUM(CAST(is_low_trust_2017 AS BIGINT)) AS low_trust_2017_transaction_count,
    SUM(CAST(is_historical_backfill_candidate AS BIGINT)) AS historical_backfill_transaction_count,
    SUM(CAST(financial_review_required AS BIGINT)) AS financial_review_transaction_count,
    SUM(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS signed_quantity,
    COUNT(CASE WHEN is_quantity_observation_eligible THEN quantity END) AS signed_quantity_observation_count,
    SUM(CASE WHEN is_positive_delivery_quantity_eligible THEN quantity END) AS positive_delivered_quantity,
    COUNT(CASE WHEN is_positive_delivery_quantity_eligible THEN quantity END) AS positive_delivered_quantity_observation_count,
    SUM(CASE WHEN is_return_quantity_eligible THEN return_quantity_abs END) AS return_quantity_abs,
    COUNT(CASE WHEN is_return_quantity_eligible THEN return_quantity_abs END) AS return_quantity_abs_observation_count,
    SUM(CASE WHEN is_provisional_product_demand_eligible THEN quantity END) AS provisional_product_demand_quantity,
    COUNT(CASE WHEN is_provisional_product_demand_eligible THEN quantity END) AS provisional_product_demand_quantity_observation_count,
    SUM(CASE WHEN is_approved_medical_demand_eligible THEN quantity END) AS approved_medical_demand_quantity,
    COUNT(CASE WHEN is_approved_medical_demand_eligible THEN quantity END) AS approved_medical_demand_quantity_observation_count,
    SUM(CASE WHEN is_gross_sales_eligible THEN gross_sales END) AS gross_sales,
    COUNT(CASE WHEN is_gross_sales_eligible THEN gross_sales END) AS gross_sales_observation_count,
    SUM(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales,
    COUNT(CASE WHEN is_net_sales_eligible THEN net_sales END) AS net_sales_observation_count,
    SUM(CASE WHEN is_acquisition_cost_eligible THEN total_acquisition_cost END) AS total_acquisition_cost,
    COUNT(CASE WHEN is_acquisition_cost_eligible THEN total_acquisition_cost END) AS total_acquisition_cost_observation_count,
    SUM(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_amount,
    COUNT(CASE WHEN is_gross_margin_eligible THEN gross_margin_amount END) AS gross_margin_amount_observation_count,
    SUM(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_net_sales_basis,
    COUNT(CASE WHEN is_gross_margin_eligible THEN net_sales END) AS margin_net_sales_basis_observation_count
  FROM workspace.medshield_gold.sales_restart_fact_candidate
  WHERE is_geographic_territory_approved = true
  GROUP BY calendar_year,territory_id,territory
), expected AS (
  SELECT *, CASE WHEN margin_net_sales_basis > 0
    THEN ROUND(gross_margin_amount / margin_net_sales_basis * 100, 4) END AS weighted_gross_margin_pct
  FROM aggregated
), actual_minus_expected AS (
  SELECT calendar_year,territory_id,territory,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate
  EXCEPT ALL SELECT calendar_year,territory_id,territory,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM expected
), expected_minus_actual AS (
  SELECT calendar_year,territory_id,territory,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM expected
  EXCEPT ALL SELECT calendar_year,territory_id,territory,transaction_count,distinct_source_product_labels,contract_label_transaction_count,adjusted_source_transaction_count,low_trust_2017_transaction_count,historical_backfill_transaction_count,financial_review_transaction_count,signed_quantity,signed_quantity_observation_count,positive_delivered_quantity,positive_delivered_quantity_observation_count,return_quantity_abs,return_quantity_abs_observation_count,provisional_product_demand_quantity,provisional_product_demand_quantity_observation_count,approved_medical_demand_quantity,approved_medical_demand_quantity_observation_count,gross_sales,gross_sales_observation_count,net_sales,net_sales_observation_count,total_acquisition_cost,total_acquisition_cost_observation_count,gross_margin_amount,gross_margin_amount_observation_count,margin_net_sales_basis,margin_net_sales_basis_observation_count,weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate
), controls AS (
  SELECT COUNT(*) AS rows,
    SUM(CASE WHEN margin_net_sales_basis <= 0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END) AS invalid_rates,
    SUM(CASE WHEN NOT (dataset_id <=> 'b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4') OR NOT (policy_version <=> 'sales_restart_gold_v7_independent_catalog') OR NOT (product_master_sha256 <=> '2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29') OR NOT (area_mapping_sha256 <=> 'a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949') OR NOT (publication_status <=> 'CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW') THEN 1 ELSE 0 END) AS identity_mismatches,
    SUM(net_sales) AS net_sales, SUM(gross_margin_amount) AS gross_profit,
    SUM(margin_net_sales_basis) AS margin_basis
  FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate
)
SELECT 'sales_restart_territory_yearly_candidate' AS table_name, controls.*,
  (SELECT COUNT(*) FROM expected) AS source_groups,
  (SELECT COUNT(*) FROM actual_minus_expected) AS actual_minus_source,
  (SELECT COUNT(*) FROM expected_minus_actual) AS source_minus_actual,
  assert_true(rows = 41 AND invalid_rates = 0 AND identity_mismatches = 0
    AND net_sales = 89926757.310000 AND gross_profit = 54909943.650000
    AND margin_basis = 83937907.930000
    AND (SELECT COUNT(*) FROM actual_minus_expected) = 0
    AND (SELECT COUNT(*) FROM expected_minus_actual) = 0,
    'Current source reconciliation failed: sales_restart_territory_yearly_candidate') AS current_source_check
FROM controls;
