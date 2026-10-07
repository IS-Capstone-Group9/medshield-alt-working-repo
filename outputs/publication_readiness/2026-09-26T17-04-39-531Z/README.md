# Descriptive publication readiness

Collected: 2026-09-26T17:04:39.531Z

Dataset: `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`

Technical verdict: **PASS**. Business approval: **not recorded**. This is read-only evidence; no warehouse objects were changed or approved.

Evidence SHA-256: `f7a32fb9f7b8c59c3d228031ef5af458e26db20f63590cb55d4d170d33d9c2ba`

## Scope and limitations

Databricks remains the analytical source. Local evidence files are review artifacts, never dashboard inputs. This audit checks source accounting, persisted mappings, analytical aggregates, and a fresh gateway summary. It does not establish medical SKU identity, source completeness, original allocation validity, buyer ownership, browser usability, or owner approval. A matching hash is not a business sign-off. Empty medical outputs do not block arithmetic reconciliation but block approved medicine-demand claims.

## Executed checks

| Result | Check | Evidence |
|---|---|---|
| PASS | Publication audit contains only passing outputs | 21 declared outputs |
| PASS | Publication dataset is unambiguous | All published outputs must share a dataset ID |
| PASS | Single fact identity | {"dataset_id":"b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4","policy_version":"sales_restart_gold_v5_2025_allocation_source","area_mapping_sha256":"a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949","product_master_sha256":"8a34ce4946d2b99f896b1dec9e93dd5865ece8fee5e582c64dc6c5b798cca921","publication_status":"CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW"} |
| PASS | Area mapping checksum matches local master | a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949 |
| PASS | Product master checksum matches local master | 0 local entries; 0 approved |
| PASS | Fact and publication share identity | Dataset, policy, area master, and product master |
| PASS | Live area dimensions agree with local mapping | 22 observed labels compared; 0 differences |
| PASS | Every source file is accounted for in Silver | Counts and dataset IDs by file checksum |
| PASS | Source identities survive Bronze/Silver/Gold | {"bronze_only":"0","silver_only":"0","clean_only":"0","fact_only":"0","invalid_dispositions":"0"} |
| PASS | Silver/Gold source values reconcile | {"mismatches":"0"} |
| PASS | Persisted output workspace.medshield_audit.sales_restart_area_coverage_candidate | 125 rows; audit expected 125 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_gold_quality_candidate | 231 rows; audit expected 231 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_gold_disposition_candidate | 63 rows; audit expected 63 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_contract_evidence_candidate | 62 rows; audit expected 62 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_scope_candidate | 6 rows; audit expected 6 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_area_yearly_candidate | 125 rows; audit expected 125 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_provisional_year_candidate | 0 rows; audit expected 0 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_returns_candidate | 673 rows; audit expected 673 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_dim_date_candidate | 3287 rows; audit expected 3287 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_contract_labels_candidate | 0 rows; audit expected 0 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_dim_area_candidate | 22 rows; audit expected 22 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_business_product_yearly_candidate | 7649 rows; audit expected 7649 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_external_input_candidate | 0 rows; audit expected 0 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_label_partition_candidate | 3 rows; audit expected 3 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_fact_candidate | 37728 rows; audit expected 37728 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_dim_product_candidate | 4561 rows; audit expected 4561 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_territory_yearly_candidate | 41 rows; audit expected 41 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_monthly_candidate | 108 rows; audit expected 108 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_medical_monthly_candidate | 0 rows; audit expected 0 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_product_yearly_candidate | 6671 rows; audit expected 6671 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_yearly_candidate | 9 rows; audit expected 9 |
| PASS | Fact IDs unique and present | {"fact_rows":"37728","duplicate_ids":"0","null_ids":"0","net_sales":"626946741.810000","gross_margin":"288487498.720000","warning_rows":"32749","revenue_eligible_rows":"36848","margin_eligible_rows":"34105","medical_eligible_rows":"0","external_ready_rows":"0","adjusted_rows":"4544"} |
| PASS | Fact/monthly reconciliation | {"mismatches":"0"} |
| PASS | Fact/yearly reconciliation | {"mismatches":"0"} |
| PASS | Fact/area_yearly reconciliation | {"mismatches":"0"} |
| PASS | Yearly bridge reconciles | {"mismatches":"0"} |
| PASS | Gateway summary matches eligible Gold totals | Fresh gateway function executed against live Databricks; not a browser acceptance test |
| PASS | 2025 replacement retains validated provenance and totals | Reconciles replacement evidence; does not independently approve the original parent allocation methodology |
| PASS | Stable version workspace.medshield_audit.sales_restart_area_coverage_candidate | start=5; end=5 |
| PASS | Stable version workspace.medshield_audit.sales_restart_gold_quality_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_audit.sales_restart_gold_disposition_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_audit.sales_restart_contract_evidence_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_audit.sales_restart_provisional_year_candidate | start=6; end=6 |
| PASS | Stable version workspace.medshield_gold.sales_restart_area_yearly_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_audit.sales_restart_scope_candidate | start=6; end=6 |
| PASS | Stable version workspace.medshield_audit.sales_restart_returns_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_gold.sales_restart_contract_labels_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_gold.sales_restart_business_product_yearly_candidate | start=6; end=6 |
| PASS | Stable version workspace.medshield_gold.sales_restart_dim_area_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_gold.sales_restart_dim_date_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_gold.sales_restart_external_input_candidate | start=6; end=6 |
| PASS | Stable version workspace.medshield_gold.sales_restart_label_partition_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_gold.sales_restart_dim_product_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_gold.sales_restart_fact_candidate | start=15; end=15 |
| PASS | Stable version workspace.medshield_gold.sales_restart_product_yearly_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_gold.sales_restart_monthly_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_gold.sales_restart_medical_monthly_candidate | start=6; end=6 |
| PASS | Stable version workspace.medshield_gold.sales_restart_territory_yearly_candidate | start=6; end=6 |
| PASS | Stable version workspace.medshield_audit.sales_restart_replacement_year_validation_candidate | start=1; end=1 |
| PASS | Stable version workspace.medshield_audit.sales_restart_gold_publication_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_gold.sales_restart_yearly_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_bronze.sales_restart_manifest_candidate | start=2; end=2 |
| PASS | Stable version workspace.medshield_bronze.sales_restart_rows_candidate | start=2; end=2 |
| PASS | Stable version workspace.medshield_silver.sales_restart_clean_candidate | start=7; end=7 |
| PASS | Stable version workspace.medshield_silver.sales_restart_assessed_candidate | start=3; end=3 |
| PASS | Local review inputs unchanged | Local code and mapping checksums rechecked at end |

## Business decision required

Review the acceptance record in docs/DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md. Bind any decision to this exact evidence hash, dataset, source manifest, and mapping/code versions. Keep candidate labels until approved views and their consumers have been deployed and verified.
