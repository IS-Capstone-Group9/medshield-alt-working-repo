# Descriptive publication readiness

Collected: 2026-10-09T07:20:05.882Z

Dataset: `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`

Technical verdict: **PASS**. Business approval: **not recorded**. This is read-only evidence; no warehouse objects were changed or approved.

Evidence SHA-256: `526d647004daa0644972fbb4dfb37b25d8512da48901756d1cc4b3aa54fa353b`

## Scope and limitations

Databricks remains the analytical source. Local evidence files are review artifacts, never dashboard inputs. This audit checks source accounting, persisted mappings, analytical aggregates, and a fresh gateway summary. It does not establish medical SKU identity, source completeness, original allocation validity, buyer ownership, browser usability, or owner approval. A matching hash is not a business sign-off. Empty medical outputs do not block arithmetic reconciliation but block approved medicine-demand claims.

## Executed checks

| Result | Check | Evidence |
|---|---|---|
| PASS | Publication audit contains only passing outputs | 22 declared outputs |
| PASS | Publication dataset is unambiguous | All published outputs must share a dataset ID |
| PASS | Single fact identity | {"dataset_id":"b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4","policy_version":"sales_restart_gold_v7_independent_catalog","area_mapping_sha256":"a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949","product_master_sha256":"2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29","publication_status":"CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW"} |
| PASS | Area mapping checksum matches local master | a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949 |
| PASS | Product master checksum matches local master | 4561 local entries; 0 approved |
| PASS | Fact and publication share identity | Dataset, policy, area master, and product master |
| PASS | Live area dimensions agree with local mapping | 22 observed labels compared; 0 differences |
| PASS | Every source file is accounted for in Silver | Counts and dataset IDs by file checksum |
| PASS | Source identities survive Bronze/Silver/Gold | {"bronze_only":"0","silver_only":"0","clean_only":"0","fact_only":"0","invalid_dispositions":"0"} |
| PASS | Silver/Gold source values reconcile | {"mismatches":"0"} |
| PASS | Preparation artifact identity 2020 | 3 estimated product-label replacements; verifies artifact identity, not allocation accuracy |
| PASS | Preparation artifact identity 2024 | 124 estimated product-label replacements; verifies artifact identity, not allocation accuracy |
| PASS | Known adjusted sources are labeled as estimates | Prepared historical file hashes checked against Bronze provenance |
| PASS | Known historical adjustments remain labeled in Gold | Known adjusted source provenance is retained |
| PASS | Persisted output workspace.medshield_audit.sales_restart_area_coverage_candidate | 125 rows; audit expected 125 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_gold_disposition_candidate | 63 rows; audit expected 63 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_gold_quality_candidate | 231 rows; audit expected 231 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_contract_evidence_candidate | 62 rows; audit expected 62 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_provisional_year_candidate | 0 rows; audit expected 0 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_returns_candidate | 673 rows; audit expected 673 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_area_yearly_candidate | 125 rows; audit expected 125 |
| PASS | Persisted output workspace.medshield_audit.sales_restart_scope_candidate | 12 rows; audit expected 12 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_contract_labels_candidate | 0 rows; audit expected 0 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_dim_area_candidate | 22 rows; audit expected 22 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_business_product_yearly_candidate | 7649 rows; audit expected 7649 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_dim_canonical_product_candidate | 4561 rows; audit expected 4561 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_external_input_candidate | 0 rows; audit expected 0 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_fact_candidate | 37728 rows; audit expected 37728 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_dim_product_candidate | 4561 rows; audit expected 4561 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_dim_date_candidate | 3287 rows; audit expected 3287 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_medical_monthly_candidate | 0 rows; audit expected 0 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_monthly_candidate | 108 rows; audit expected 108 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_label_partition_candidate | 6 rows; audit expected 6 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_product_yearly_candidate | 6671 rows; audit expected 6671 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_yearly_candidate | 9 rows; audit expected 9 |
| PASS | Persisted output workspace.medshield_gold.sales_restart_territory_yearly_candidate | 41 rows; audit expected 41 |
| PASS | Fact IDs unique and present | {"fact_rows":"37728","duplicate_ids":"0","null_ids":"0","net_sales":"626946741.810000","gross_margin":"288487498.720000","warning_rows":"32749","revenue_eligible_rows":"36848","margin_eligible_rows":"34105","medical_eligible_rows":"0","external_ready_rows":"0","adjusted_rows":"11355"} |
| PASS | Fact/monthly reconciliation | {"mismatches":"0"} |
| PASS | Fact/yearly reconciliation | {"mismatches":"0"} |
| PASS | Fact/area_yearly reconciliation | {"mismatches":"0"} |
| PASS | Yearly bridge reconciles | {"mismatches":"0"} |
| PASS | Gateway summary uses captured fact release | Fact version 20; dataset, policy, area master, product master, and publication status match |
| PASS | Gateway summary matches eligible Gold totals | Fresh gateway function executed against live Databricks; not a browser acceptance test |
| PASS | STL gateway uses captured fact release | Fact version 20; descriptive release identity matches |
| PASS | STL rows retain captured fact source identity | 72 STL rows match the captured fact version, dataset, policy, and mapping checksums |
| PASS | 2025 replacement retains validated provenance and totals | Reconciles replacement evidence; does not independently approve the original parent allocation methodology |
| PASS | Stable version workspace.medshield_audit.sales_restart_area_coverage_candidate | start=9; end=9 |
| PASS | Stable version workspace.medshield_audit.sales_restart_gold_quality_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_audit.sales_restart_contract_evidence_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_audit.sales_restart_gold_disposition_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_gold.sales_restart_area_yearly_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_audit.sales_restart_scope_candidate | start=10; end=10 |
| PASS | Stable version workspace.medshield_audit.sales_restart_returns_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_audit.sales_restart_provisional_year_candidate | start=10; end=10 |
| PASS | Stable version workspace.medshield_gold.sales_restart_business_product_yearly_candidate | start=10; end=10 |
| PASS | Stable version workspace.medshield_gold.sales_restart_contract_labels_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_gold.sales_restart_dim_area_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_gold.sales_restart_dim_canonical_product_candidate | start=2; end=2 |
| PASS | Stable version workspace.medshield_gold.sales_restart_dim_date_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_gold.sales_restart_fact_candidate | start=20; end=20 |
| PASS | Stable version workspace.medshield_gold.sales_restart_external_input_candidate | start=10; end=10 |
| PASS | Stable version workspace.medshield_gold.sales_restart_dim_product_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_gold.sales_restart_product_yearly_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_gold.sales_restart_monthly_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_gold.sales_restart_medical_monthly_candidate | start=10; end=10 |
| PASS | Stable version workspace.medshield_gold.sales_restart_label_partition_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_gold.sales_restart_stl_candidate | start=4; end=4 |
| PASS | Stable version workspace.medshield_gold.sales_restart_territory_yearly_candidate | start=10; end=10 |
| PASS | Stable version workspace.medshield_audit.sales_restart_gold_publication_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_gold.sales_restart_yearly_candidate | start=11; end=11 |
| PASS | Stable version workspace.medshield_silver.sales_restart_assessed_candidate | start=8; end=8 |
| PASS | Stable version workspace.medshield_audit.sales_restart_replacement_year_validation_candidate | start=4; end=4 |
| PASS | Stable version workspace.medshield_bronze.sales_restart_manifest_candidate | start=4; end=4 |
| PASS | Stable version workspace.medshield_bronze.sales_restart_rows_candidate | start=4; end=4 |
| PASS | Stable version workspace.medshield_silver.sales_restart_clean_candidate | start=10; end=10 |
| PASS | Local review inputs unchanged | Local code and mapping checksums rechecked at end |

## Business decision required

Review the acceptance record in docs/DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md. Bind any decision to this exact evidence hash, dataset, source manifest, and mapping/code versions. Keep candidate labels until approved views and their consumers have been deployed and verified.
