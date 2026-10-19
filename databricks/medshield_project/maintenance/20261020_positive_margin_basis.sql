-- PREPARED ONLY: not executed against Databricks by this review.
-- Read maintenance/MARGIN_RATE_PATCH.md first. Run during controlled maintenance.
-- Run every preflight before any UPDATE. These four Delta updates are NOT one transaction.
-- Source Gold fact20, all financial amounts, mappings, model inputs and approval state stay intact.
-- Capture versions and arrange recovery; if anything differs, stop and recapture the plan.

-- PHASE1: all read-only drift guards.
-- Preflight sales_restart_product_yearly_candidate: inspect DESCRIBE HISTORY and require baseline version11.
SELECT assert_true(COUNT(*)=6671
  AND COUNT(DISTINCT dataset_id)=1 AND MIN(dataset_id)='b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4'
  AND MIN(policy_version)='sales_restart_gold_v7_independent_catalog'
  AND MIN(product_master_sha256)='2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29'
  AND MIN(area_mapping_sha256)='a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949'
  AND SUM(CASE WHEN margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END)=7,
  'Margin patch preflight changed: sales_restart_product_yearly_candidate, stop and recapture') FROM workspace.medshield_gold.sales_restart_product_yearly_candidate;
SELECT assert_true(COUNT(*)=0,'Current table differs from captured baseline: sales_restart_product_yearly_candidate')
FROM ((SELECT * FROM workspace.medshield_gold.sales_restart_product_yearly_candidate) EXCEPT ALL (SELECT * FROM workspace.medshield_gold.sales_restart_product_yearly_candidate VERSION AS OF 11)) AS changes;
SELECT assert_true(COUNT(*)=0,'Captured baseline differs from current table: sales_restart_product_yearly_candidate')
FROM ((SELECT * FROM workspace.medshield_gold.sales_restart_product_yearly_candidate VERSION AS OF 11) EXCEPT ALL (SELECT * FROM workspace.medshield_gold.sales_restart_product_yearly_candidate)) AS changes;

-- Preflight sales_restart_business_product_yearly_candidate: inspect DESCRIBE HISTORY and require baseline version10.
SELECT assert_true(COUNT(*)=7649
  AND COUNT(DISTINCT dataset_id)=1 AND MIN(dataset_id)='b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4'
  AND MIN(policy_version)='sales_restart_gold_v7_independent_catalog'
  AND MIN(product_master_sha256)='2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29'
  AND MIN(area_mapping_sha256)='a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949'
  AND SUM(CASE WHEN margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END)=71,
  'Margin patch preflight changed: sales_restart_business_product_yearly_candidate, stop and recapture') FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate;
SELECT assert_true(COUNT(*)=0,'Current table differs from captured baseline: sales_restart_business_product_yearly_candidate')
FROM ((SELECT * FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate) EXCEPT ALL (SELECT * FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate VERSION AS OF 10)) AS changes;
SELECT assert_true(COUNT(*)=0,'Captured baseline differs from current table: sales_restart_business_product_yearly_candidate')
FROM ((SELECT * FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate VERSION AS OF 10) EXCEPT ALL (SELECT * FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate)) AS changes;

-- Preflight sales_restart_area_yearly_candidate: inspect DESCRIBE HISTORY and require baseline version11.
SELECT assert_true(COUNT(*)=125
  AND COUNT(DISTINCT dataset_id)=1 AND MIN(dataset_id)='b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4'
  AND MIN(policy_version)='sales_restart_gold_v7_independent_catalog'
  AND MIN(product_master_sha256)='2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29'
  AND MIN(area_mapping_sha256)='a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949'
  AND SUM(CASE WHEN margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END)=2,
  'Margin patch preflight changed: sales_restart_area_yearly_candidate, stop and recapture') FROM workspace.medshield_gold.sales_restart_area_yearly_candidate;
SELECT assert_true(COUNT(*)=0,'Current table differs from captured baseline: sales_restart_area_yearly_candidate')
FROM ((SELECT * FROM workspace.medshield_gold.sales_restart_area_yearly_candidate) EXCEPT ALL (SELECT * FROM workspace.medshield_gold.sales_restart_area_yearly_candidate VERSION AS OF 11)) AS changes;
SELECT assert_true(COUNT(*)=0,'Captured baseline differs from current table: sales_restart_area_yearly_candidate')
FROM ((SELECT * FROM workspace.medshield_gold.sales_restart_area_yearly_candidate VERSION AS OF 11) EXCEPT ALL (SELECT * FROM workspace.medshield_gold.sales_restart_area_yearly_candidate)) AS changes;

-- Preflight sales_restart_territory_yearly_candidate: inspect DESCRIBE HISTORY and require baseline version10.
SELECT assert_true(COUNT(*)=41
  AND COUNT(DISTINCT dataset_id)=1 AND MIN(dataset_id)='b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4'
  AND MIN(policy_version)='sales_restart_gold_v7_independent_catalog'
  AND MIN(product_master_sha256)='2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29'
  AND MIN(area_mapping_sha256)='a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949'
  AND SUM(CASE WHEN margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END)=1,
  'Margin patch preflight changed: sales_restart_territory_yearly_candidate, stop and recapture') FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate;
SELECT assert_true(COUNT(*)=0,'Current table differs from captured baseline: sales_restart_territory_yearly_candidate')
FROM ((SELECT * FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate) EXCEPT ALL (SELECT * FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate VERSION AS OF 10)) AS changes;
SELECT assert_true(COUNT(*)=0,'Captured baseline differs from current table: sales_restart_territory_yearly_candidate')
FROM ((SELECT * FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate VERSION AS OF 10) EXCEPT ALL (SELECT * FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate)) AS changes;

-- PHASE2: approved operator execution only.

-- Expected changes:7 aggregate rate cells. Signed financial amounts remain untouched.
UPDATE workspace.medshield_gold.sales_restart_product_yearly_candidate
SET weighted_gross_margin_pct=NULL
WHERE margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL;

-- Expected changes:71 aggregate rate cells. Signed financial amounts remain untouched.
UPDATE workspace.medshield_gold.sales_restart_business_product_yearly_candidate
SET weighted_gross_margin_pct=NULL
WHERE margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL;

-- Expected changes:2 aggregate rate cells. Signed financial amounts remain untouched.
UPDATE workspace.medshield_gold.sales_restart_area_yearly_candidate
SET weighted_gross_margin_pct=NULL
WHERE margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL;

-- Expected changes:1 aggregate rate cells. Signed financial amounts remain untouched.
UPDATE workspace.medshield_gold.sales_restart_territory_yearly_candidate
SET weighted_gross_margin_pct=NULL
WHERE margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL;

-- PHASE3: mandatory readback.

SELECT assert_true(COUNT(*)=6671
  AND SUM(CASE WHEN margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END)=0,
  'Margin correction incomplete: sales_restart_product_yearly_candidate') FROM workspace.medshield_gold.sales_restart_product_yearly_candidate;
SELECT assert_true(COUNT(*)=0,'Immutable mart fields changed: sales_restart_product_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_product_yearly_candidate)
  EXCEPT ALL (SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_product_yearly_candidate VERSION AS OF 11)) AS changes;
SELECT assert_true(COUNT(*)=0,'Immutable mart fields removed: sales_restart_product_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_product_yearly_candidate VERSION AS OF 11)
  EXCEPT ALL (SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_product_yearly_candidate)) AS changes;
SELECT assert_true(COUNT(*)=0,'Unexpected corrected-rate values: sales_restart_product_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct),weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_product_yearly_candidate) EXCEPT ALL
  (SELECT * EXCEPT(weighted_gross_margin_pct),
    CASE WHEN margin_net_sales_basis<=0 THEN NULL ELSE weighted_gross_margin_pct END AS weighted_gross_margin_pct
   FROM workspace.medshield_gold.sales_restart_product_yearly_candidate VERSION AS OF 11)) AS changes;

SELECT assert_true(COUNT(*)=7649
  AND SUM(CASE WHEN margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END)=0,
  'Margin correction incomplete: sales_restart_business_product_yearly_candidate') FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate;
SELECT assert_true(COUNT(*)=0,'Immutable mart fields changed: sales_restart_business_product_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate)
  EXCEPT ALL (SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate VERSION AS OF 10)) AS changes;
SELECT assert_true(COUNT(*)=0,'Immutable mart fields removed: sales_restart_business_product_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate VERSION AS OF 10)
  EXCEPT ALL (SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate)) AS changes;
SELECT assert_true(COUNT(*)=0,'Unexpected corrected-rate values: sales_restart_business_product_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct),weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate) EXCEPT ALL
  (SELECT * EXCEPT(weighted_gross_margin_pct),
    CASE WHEN margin_net_sales_basis<=0 THEN NULL ELSE weighted_gross_margin_pct END AS weighted_gross_margin_pct
   FROM workspace.medshield_gold.sales_restart_business_product_yearly_candidate VERSION AS OF 10)) AS changes;

SELECT assert_true(COUNT(*)=125
  AND SUM(CASE WHEN margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END)=0,
  'Margin correction incomplete: sales_restart_area_yearly_candidate') FROM workspace.medshield_gold.sales_restart_area_yearly_candidate;
SELECT assert_true(COUNT(*)=0,'Immutable mart fields changed: sales_restart_area_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_area_yearly_candidate)
  EXCEPT ALL (SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_area_yearly_candidate VERSION AS OF 11)) AS changes;
SELECT assert_true(COUNT(*)=0,'Immutable mart fields removed: sales_restart_area_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_area_yearly_candidate VERSION AS OF 11)
  EXCEPT ALL (SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_area_yearly_candidate)) AS changes;
SELECT assert_true(COUNT(*)=0,'Unexpected corrected-rate values: sales_restart_area_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct),weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_area_yearly_candidate) EXCEPT ALL
  (SELECT * EXCEPT(weighted_gross_margin_pct),
    CASE WHEN margin_net_sales_basis<=0 THEN NULL ELSE weighted_gross_margin_pct END AS weighted_gross_margin_pct
   FROM workspace.medshield_gold.sales_restart_area_yearly_candidate VERSION AS OF 11)) AS changes;

SELECT assert_true(COUNT(*)=41
  AND SUM(CASE WHEN margin_net_sales_basis<=0 AND weighted_gross_margin_pct IS NOT NULL THEN 1 ELSE 0 END)=0,
  'Margin correction incomplete: sales_restart_territory_yearly_candidate') FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate;
SELECT assert_true(COUNT(*)=0,'Immutable mart fields changed: sales_restart_territory_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate)
  EXCEPT ALL (SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate VERSION AS OF 10)) AS changes;
SELECT assert_true(COUNT(*)=0,'Immutable mart fields removed: sales_restart_territory_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate VERSION AS OF 10)
  EXCEPT ALL (SELECT * EXCEPT(weighted_gross_margin_pct) FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate)) AS changes;
SELECT assert_true(COUNT(*)=0,'Unexpected corrected-rate values: sales_restart_territory_yearly_candidate')
FROM ((SELECT * EXCEPT(weighted_gross_margin_pct),weighted_gross_margin_pct FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate) EXCEPT ALL
  (SELECT * EXCEPT(weighted_gross_margin_pct),
    CASE WHEN margin_net_sales_basis<=0 THEN NULL ELSE weighted_gross_margin_pct END AS weighted_gross_margin_pct
   FROM workspace.medshield_gold.sales_restart_territory_yearly_candidate VERSION AS OF 10)) AS changes;
