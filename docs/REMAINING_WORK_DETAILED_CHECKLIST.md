# Remaining Work Detailed Checklist

## Purpose

This checklist is the practical tracker for finishing MedShield after the schema, `.env`, RRL, medical-demand cleaning, backward approximation, and product-classification decisions.

Use this as the group's working task list. Mark each item as `Not started`, `In progress`, `Blocked`, or `Done`.

## Current Direction

MedShield should be finished as a historical decision-support system focused on medical/pharmaceutical demand planning.

The core model scope is:

```text
medical/pharmaceutical sales demand
  + disease signals
  + weather signals
  -> forecast comparison
  -> reviewed decision-support recommendations
```

The system should not claim:

- live disease surveillance
- official live PAGASA alerts
- automatic procurement
- proof that weather or disease causes all demand
- disease/weather forecasting for office supplies, equipment, ink, paper, and other non-medical business items

## Priority Order

| Priority | Workstream | Why it comes first |
|---|---|---|
| 1 | Security and environment | The exposed Supabase service-role key must be rotated before shared use. |
| 2 | Database schema alignment | The app and Supabase project must agree on schemas before ingestion and dashboard testing. |
| 3 | Medical-demand cleaning | Disease/weather models must use medical-only demand, not full mixed business sales. |
| 4 | Product and area approval | Forecasting requires canonical SKUs and valid geographic territories. |
| 5 | External data preparation | DOH/PAGASA/weather signals must be loaded and source-labeled. |
| 6 | Descriptive analytics | Baseline facts must reconcile before forecasting. |
| 7 | Predictive modeling | Benchmarks and sales-only forecast must come before external regressors. |
| 8 | Prescriptive/scenario outputs | Recommendations require assumptions and review labels. |
| 9 | Dashboard and paper evidence | Final outputs need screenshots, metrics, and defensible wording. |

## 1. Security And `.env`

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Rotate exposed Supabase keys | In Supabase, rotate anon and service-role keys because they were pasted in chat. | New Supabase keys. | Old keys no longer work. | DevOps / Security |
| Update local `.env` | Paste the rotated keys into `.env`, then set `USE_SUPABASE=true`. | Valid local `.env`. | Backend dotenv parser reads all variables. | DevOps |
| Replace `SESSION_SECRET` | Generate a long random secret for shared demo. | Updated `SESSION_SECRET`. | No placeholder remains. | DevOps |
| Keep secrets out of Git | Confirm `.env` is ignored. | No secret committed. | `git check-ignore -v .env` confirms ignore rule. | Security |
| Avoid frontend secret exposure | Confirm only `NEXT_PUBLIC_*` values are browser-exposed. | Safe frontend environment boundary. | No service-role key in frontend files. | Security |

Reference:

- `docs/ENV_SCHEMA_ALIGNMENT_GUIDE.md`
- `docs/SECURITY.md`

## 2. Supabase Schema Alignment

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Apply migration 007 | Run `supabase/migrations/007_namespaced_schema_alignment.sql` in Supabase SQL editor. | Namespaced MedShield schemas aligned. | No SQL errors. | Database Engineer |
| Expose schemas in Supabase API settings | Add `medshield_common`, `medshield_etl`, `medshield_identity`, `medshield_sales`, `medshield_external`, `medshield_analytics`. | PostgREST can access MedShield schemas. | Service writes do not fail with schema/profile errors. | Database Engineer |
| Confirm common dimensions | Check `dim_date`, `dim_month`, `dim_area`, `dim_product`, `dim_product_alias`. | Shared dimensions exist. | Tables are visible under `medshield_common`. | Database Engineer |
| Confirm ETL lineage | Check `dim_source_system`, `etl_pipeline_run`, `etl_source_extract`. | ETL tables exist. | Sales/weather ingestion can create pipeline runs. | Database Engineer |
| Confirm identity | Check `medshield_identity.accounts` and Auth linkage. | Login targets the correct schema and accounts remain administrator-managed. | Login works with Supabase or falls back clearly. | Backend / Security |
| Confirm sales tables | Check sales staging/fact/aggregate tables. | `medshield_sales` ready. | Upload can write rows or returns clear error. | Database / Backend |
| Confirm external tables | Check weather/disease staging or fact tables. | `medshield_external` ready. | Weather refresh can write provider data. | Data Engineer |

Reference:

- `docs/DATABASE.md`
- `docs/SETUP.md`
- `supabase/migrations/007_namespaced_schema_alignment.sql`

## 3. Sales Cleaning And Backward Approximation

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Preserve raw sales | Keep uploaded XLSX/CSV unchanged. | Raw source file retained. | Source hash and row counts are recorded. | Data Analyst |
| Run standard sales cleaning | Standardize columns, dates, products, areas, numeric fields. | Cleaned full sales dataset. | Accepted/rejected/warning counts reported. | Data Analyst |
| Run backward approximation | Run contract-name allocation for rows like `PAGBILAO # ...` and `QMC # ...`. | Adjusted analytical sales dataset. | Additive totals reconcile with delta `0`. | Data Analyst |
| Keep allocation audit | Preserve parent rows, estimated child rows, weights, and source hashes. | Allocation audit files. | Every estimated row has parent lineage. | QA / Data Analyst |
| Do not overclaim estimates | Label estimated rows as planning approximations. | Limitation wording. | Docs/dashboard never call them recovered invoice details. | Technical Writer |

Reference:

- `databricks/docs/AREA_SUMMARY_BACKWARD_ALLOCATION.md`
- `data/medshield/processed/sales_transactions_area_allocated.json.gz`
- `data/medshield/processed/sales_area_allocation_audit.json`

## 4. Medical-Demand Dataset

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Review non-medical candidates | Open `outputs/product_classification_review/likely_non_medical_product_candidates.csv`. | Reviewed product classification list. | High-value candidates are approved or corrected. | Business Analyst / Data Analyst |
| Classify product master | Set `product_category`, `is_medicine`, `forecast_eligible`, `mapping_status`, `review_notes`. | Product master mapping. | All A-class products reviewed. | Business Analyst |
| Split datasets | Generate full sales, medical-demand, and non-medical exclusion outputs. | Three datasets plus report. | Full sales reconciles; medical-only excludes non-medical rows. | Data Engineer |
| Audit exclusions | Report removed product count, row count, total cost, net cost, and sales value. | Exclusion audit. | Panel can see what was excluded and why. | QA / Technical Writer |
| Use medical-only for models | Point disease/weather modeling jobs to the medical-demand dataset. | Correct model input. | Forecast inputs exclude office/admin/equipment/IT supplies. | Analytics Engineer |

Current candidate totals:

| Group | Rows | Distinct products | Total cost |
|---|---:|---:|---:|
| Non-medical candidates | 1,653 | 330 | 70,681,888.97 |
| Medical or unclassified candidates | 19,308 | 3,005 | 359,451,346.98 |
| Overall accepted adjusted sales | 20,961 | 3,335 | 430,133,235.95 |

Reference:

- `databricks/docs/MEDICAL_DEMAND_CLEANING_WORKFLOW.md`
- `databricks/docs/NON_MEDICAL_PRODUCT_CLASSIFICATION_GUIDE.md`
- `outputs/product_classification_review/likely_non_medical_product_candidates.csv`
- `outputs/product_classification_review/medical_vs_non_medical_cost_2021_2025.md`

## 5. Product And Area Mapping

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Approve SKU aliases | Review duplicate/variant product names. | Canonical SKU mapping. | Same-strength/same-form aliases are merged only when defensible. | Business Analyst / Data Analyst |
| Separate medicine vs supply | Identify medicine, medical supply, equipment, admin supply, and non-medical supply. | Product category field. | Disease/weather model includes only approved categories. | Business Analyst |
| Set forecast eligibility | Mark products eligible/ineligible for SKU forecasting. | `forecast_eligible` values. | Sparse/unmapped/non-medical products blocked. | Data Analyst |
| Approve area mapping | Separate territory, customer type, and business line. | Area classification mapping. | Weather joins use only geographic territories. | Data Analyst |
| Add coordinates | Ensure approved territories have latitude/longitude where weather API is used. | Geographic area table. | Weather refresh works for target territories. | Data Engineer |

Reference:

- `databricks/docs/SKU_ALIAS_MAPPING_PLAN.md`
- `datasources/templates/product_master_mapping.csv`
- `datasources/templates/area_classification_mapping.csv`

## 6. External Disease And Weather Data

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Prepare DOH data | Load historical disease records by date/month, disease, region/province/city, case count, and source. | DOH clean/staging file. | Source period and disease definitions documented. | Data Analyst |
| Prepare PAGASA data | Load official historical weather records where available. | PAGASA clean/staging file. | Official fields are not mixed with API proxy fields. | Data Analyst |
| Refresh weather API proxy | Use NASA POWER/Open-Meteo for coordinate-based historical observations. | Weather proxy file/table. | Provider labeled as proxy, not official PAGASA. | Data Engineer |
| Join by grain | Aggregate external signals to territory-month or approved modeling grain. | External signal mart. | No mismatched area/customer/business-line joins. | Analytics Engineer |
| Test lags | Prepare same-month, 1-month lag, and 2-month lag candidates where coverage supports it. | Feature table. | No future leakage in validation. | Analytics Engineer |

Reference:

- `databricks/docs/EXTERNAL_DATA_PREPARATION_GUIDE.md`
- `datasources/templates/doh_historical_template.csv`
- `datasources/templates/pagasa_historical_template.csv`
- `datasources/templates/weather_api_observations_template.csv`
- `docs/RRL_DISEASE_WEATHER_PHARMA_DEMAND_GUIDE.md`

## 7. Descriptive Analytics

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Reconcile totals | Compare source, cleaned full, adjusted full, and medical-demand totals. | Reconciliation table. | Differences are explained by filtering or rejection. | QA / Data Analyst |
| Monthly trend | Aggregate medical-demand quantity, total trade price, net cost, and gross margin/profit. | Monthly trend table/chart. | Uses approved demand/revenue definitions. | Data Analyst |
| Product contribution | Run Pareto/ABC on approved medical products. | Product ABC table. | Non-medical candidates excluded from pharma model ABC. | Data Analyst |
| Territory summary | Summarize approved territories only. | Territory demand table. | Customer type and business line are not treated as geography. | BI Specialist |
| Seasonality | Calculate month-level demand pattern. | Seasonality index/STL output. | Incomplete periods are labeled. | Data Analyst |
| Estimated-row audit | Count backward-allocated and estimated-date rows. | Limitation table. | Estimated rows are visible in Chapter 4/5. | Technical Writer |

Reference:

- `docs/DESCRIPTIVE_ANALYTICS_LOGIC.md`
- `docs/DESCRIPTIVE_PREDICTIVE_PRESCRIPTIVE_GUIDE.md`

## 8. Predictive Modeling

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Define forecast target | Use medical-demand quantity as primary target. | Target definition. | Target excludes non-medical rows. | Analytics Engineer |
| Decide validation period | Confirm whether 2025 is complete enough for holdout. | Validation plan. | No missing months treated as zero demand. | Data Analyst |
| Run simple benchmarks | Last value, seasonal naive, moving average. | Benchmark metrics. | Baselines reported before advanced models. | Analytics Engineer |
| Run sales-only forecast | Train Prophet or selected time-series model on medical demand. | Sales-only forecast. | Beats or is compared honestly against benchmarks. | Analytics Engineer |
| Test disease regressor | Add DOH historical disease features where mapped. | Disease-adjusted challenger. | Promoted only if holdout metrics improve. | Analytics Engineer |
| Test weather regressor | Add weather features/proxy where mapped. | Weather-adjusted challenger. | Promoted only if holdout metrics improve. | Analytics Engineer |
| Report metrics | MAE, RMSE, WAPE/sMAPE, bias. | Model evaluation table. | Metrics include model period and limitations. | QA / Analytics Engineer |
| Select champion | Choose model based on accuracy and interpretability. | Champion model decision. | Decision is documented. | Business Analyst / Analytics Engineer |

Reference:

- `docs/MODEL_LIBRARIES_AND_ORCHESTRATION.md`
- `docs/RRL_DISEASE_WEATHER_PHARMA_DEMAND_GUIDE.md`

## 9. Prescriptive And Scenario Outputs

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| MCDA ranking | Rank territories using revenue, growth, and approved disease/weather signals. | Regional priority table. | Weights and assumptions shown. | BI / Analytics |
| Product priority | Use ABC, demand, growth, margin, seasonality, and risk signals. | Product priority table. | Labeled as demand priority unless inventory exists. | Analytics |
| EOQ/ROP formula demo | Run only if assumptions are approved. | Scenario table. | Clearly labeled scenario, not procurement instruction. | Analytics |
| Allocation optimization | Block unless stock, budget, capacity, and constraints exist. | Blocked status or scenario. | No false optimization claims. | Architect / Analytics |
| Recommendation review labels | Add `draft`, `validated`, `review_required`, `published`, `scenario`, or `blocked`. | Status labels. | Dashboard never hides limitations. | QA / BI |

Reference:

- `docs/DASHBOARD_MODEL_PUBLICATION_GUIDE.md`
- `docs/DESCRIPTIVE_PREDICTIVE_PRESCRIPTIVE_GUIDE.md`

## 10. Dashboard And API

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Confirm login/logout | Test Supabase/local login and logout. | Auth working. | Logout clears token and returns to login. | Frontend / QA |
| Confirm chart availability | Check Chart.js install/load and API/fallback data availability. | Charts render. | Empty model data shows empty state, not broken chart. | Frontend / QA |
| Add dataset labels | Show whether chart uses full sales, medical-demand, proxy weather, official data, scenario, or estimate. | Clear dashboard labels. | Panel can identify input type. | BI / Frontend |
| Add cleaning audit view | Show non-medical exclusions, backward approximation, and medical-demand totals. | Audit section/table. | Counts match generated reports. | Frontend / BI |
| Ensure API contracts | Gateway routes return stable JSON for sales, forecasts, external signals, and recommendations. | API samples. | Authenticated endpoints work. | Backend |
| Keep fallback behavior | Local JSON fallback still works when services are unavailable. | Demo resilience. | App does not crash when model outputs are missing. | Backend / QA |

Reference:

- `docs/API.md`
- `docs/IMPLEMENTATION.md`

## 11. Capstone Paper And RRL

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Chapter 1 scope | State historical decision-support scope. | Revised scope/limitations. | No live alert or automatic procurement claims. | Technical Writer |
| Chapter 2 RRL | Use disease/weather/pharma demand guide. | RRL section. | Sources support external-regressor logic. | Technical Writer |
| Chapter 3 methodology | Explain CRISP-DM, SEMMA, cleaning, backward approximation, medical filtering, model validation. | Methodology chapter. | Workflow matches implementation. | Technical Writer |
| Chapter 4 implementation | Show system, dataset, schema, dashboard, and model outputs. | Implementation evidence. | Screenshots and output files cited. | Technical Writer |
| Chapter 5 findings | Explain results, limitations, recommendations, future work. | Findings chapter. | Limitations match data coverage. | Technical Writer |
| References | Format all sources consistently. | Reference list. | Every cited source appears in references. | Technical Writer |

Reference:

- `docs/RRL_DISEASE_WEATHER_PHARMA_DEMAND_GUIDE.md`
- `docs/CHAPTER_3_METHODOLOGY_GUIDE.md`
- `docs/CHAPTER_4_5_EVIDENCE_PLAN.md`

## 12. QA And Final Evidence

| Task | Specific action | Output | Acceptance check | Owner |
|---|---|---|---|---|
| Data QA | Validate row counts, accepted/rejected rows, duplicates, missing dates, and totals. | QA report. | Totals reconcile. | QA |
| Model QA | Validate no future leakage, correct train/test split, and metric calculations. | Model QA notes. | Metrics are reproducible. | QA / Analytics |
| Dashboard QA | Test desktop/mobile, chart rendering, auth, upload, filters, and empty states. | QA checklist. | Critical user flows pass. | QA |
| Security QA | Verify secrets, auth boundaries, service-role use, and upload controls. | Security checklist. | No exposed secrets. | Security |
| Evidence capture | Capture screenshots of dashboard, cleaning audit, model outputs, and schema. | Evidence folder. | Images match paper claims. | Technical Writer |

## Blockers To Resolve

| Blocker | Why it matters | Resolution |
|---|---|---|
| Rotated Supabase keys not yet applied | Live Supabase use is unsafe with exposed keys. | Rotate keys and update `.env`. |
| Product master not approved | Medical-demand model cannot be final. | Review candidate file and approve categories. |
| Medical-demand output not generated | Disease/weather model may use mixed sales. | Implement filtering output after product classification. |
| DOH/PAGASA actual files not fully loaded | External regressors cannot be defended. | Prepare and load external datasets with provenance. |
| 2025 completeness uncertain | Holdout evaluation may be invalid. | Decide complete, partial, or rolling validation approach. |
| Inventory/procurement data missing | EOQ/ROP/allocation cannot be real recommendations. | Keep prescriptive outputs as scenario-only. |

## Minimum Final Deliverables

The capstone is defensible when these exist:

1. Rotated `.env` secrets and applied schema migration.
2. Approved product and area mappings.
3. Full sales dataset, medical-demand dataset, and non-medical exclusion audit.
4. Backward approximation audit with zero additive-total deltas.
5. Descriptive analytics outputs from medical-demand data.
6. Sales-only forecast and benchmark metrics.
7. Disease/weather challenger model or documented reason it is not promoted.
8. Dashboard labels showing source, status, estimate/proxy/scenario, and limitations.
9. RRL section explaining disease/weather/product demand relationship without causation overclaim.
10. Chapter 4/5 evidence screenshots and limitation wording.

## Next Work Item To Ask Codex

Ask:

```text
Implement the medical-demand cleaning output and exclusion audit from the classified product list.
```

That should create the actual medical-only dataset needed before disease/weather modeling.
