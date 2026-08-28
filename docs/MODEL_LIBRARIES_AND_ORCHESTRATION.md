# Model Libraries and Orchestration Plan

## Purpose

This document defines the model library set and production-grade execution pattern for the MedShield North Star analytics workflow.

## Library Strategy

Keep the Flask service requirements lightweight for dashboard runtime. Put heavier modeling dependencies in a separate requirements file so local demos do not break when a workstation cannot compile or install forecasting packages.

| Capability | Recommended package | Purpose |
|---|---|---|
| Data frames and feature engineering | `pandas`, `numpy` | Analytical marts, joins, lag features, completeness checks |
| Statistical tests and STL | `statsmodels` | STL decomposition and baseline diagnostics |
| Machine learning utilities | `scikit-learn` | encoding, train/test splitting, metrics, clustering |
| Gradient boosting | `xgboost` | demand priority / provisional ABC when target is approved |
| Forecasting | `prophet` | sales-only and external-regressor forecasting |
| Optimization | `scipy`, `pulp` | allocation and constrained scenario solving |
| File IO | `openpyxl` | workbook ingestion and review outputs |
| HTTP / ETL | `requests`, `python-dotenv` | provider calls and environment configuration |

## Runtime Boundary

The dashboard request path must not train models. Model training and scoring should run as controlled jobs that write validated outputs to Supabase DSS tables or local processed artifacts.

Allowed dashboard behavior:

- Read latest published outputs.
- Show model version, data period, status, provider, and limitations.
- Show empty or demo states when validated outputs do not exist.

Disallowed dashboard behavior:

- Train Prophet/XGBoost synchronously.
- Call external providers directly from the browser.
- Publish draft model outputs as current recommendations.
- Label scenario or proxy data as official DOH/PAGASA data.

## Proposed Job Flow

```text
model_run_request
  -> data contract validation
  -> analytical mart build
  -> model execution
  -> metric evaluation
  -> draft output write
  -> human review
  -> published output write
  -> dashboard read
```

## Model Run Statuses

| Status | Meaning |
|---|---|
| `queued` | Job request accepted but not started. |
| `running` | Job is executing. |
| `failed` | Job failed validation or execution. |
| `draft` | Outputs exist but are not reviewed. |
| `validated` | Automated checks passed. |
| `review_required` | Human review is needed before publication. |
| `published` | Output is approved for dashboard use. |
| `superseded` | A newer published run replaced this run. |
| `measured` | Outcome data has been attached for later evaluation. |

## Minimum Model Run Metadata

Every model run should record:

- `run_id`
- `model_code`
- `model_version`
- `training_period_start`
- `training_period_end`
- `evaluation_period_start`
- `evaluation_period_end`
- `forecast_period_start`
- `forecast_period_end`
- `input_dataset_version`
- `feature_version`
- `status`
- `metrics`
- `limitations`
- `created_by`
- `reviewed_by`
- `published_at`

## Local Implementation Recommendation

For the capstone workspace, use a simple command-driven job runner before introducing a queue service:

```text
services/analytics_service/jobs/
  build_marts.py
  run_descriptive.py
  run_forecast_baseline.py
  run_weather_challenger.py
  run_product_priority.py
  publish_run.py
```

This is enough for repeatable local and Supabase-backed execution. A production SaaS version can later move these jobs into GitHub Actions, a scheduled worker, or a managed queue.

The current workspace includes one readiness utility:

```bash
node tools/profile_data_readiness.mjs
```

Use it before model execution to regenerate 2025 completeness, area counts, and SKU alias candidates.

## Expense Data Constraint

Because expense data is unavailable:

- Do not publish cost-minimizing EOQ as a real procurement recommendation.
- Do not calculate full net profit.
- Do not call `net_income` company net income.
- Use gross margin wording for workbook margin outputs.
- Keep EOQ/ROP as formula demos or scenario outputs until inventory and procurement inputs exist.

## Acceptance Criteria

The orchestration layer is production-grade enough for the capstone when:

1. Every model can be run from a repeatable command.
2. Every run writes metadata, metrics, and limitations.
3. Failed data quality checks stop or downgrade the run.
4. Draft outputs cannot appear as current recommendations.
5. Published outputs can be traced back to input data versions.
6. The dashboard reads published outputs only.
