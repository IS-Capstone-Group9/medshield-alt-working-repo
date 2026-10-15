# Analytics Jobs

## Dataset Certification Candidate

Run:

```powershell
python -m services.analytics_service.jobs.certify_sales_dataset
```

This reads all nine yearly CSV files together so cross-file duplicates and the
2018-dated rows inside the 2019 source are evaluated without replacing either
source. It writes a versioned manifest, reconciliation report, and ignored
compressed audit candidate under `data/medshield/certification/`. The output is
blocked from publication until P2 financial reconciliation and formal reviewer
approval are complete.

Then run the P2 financial comparison:

```powershell
python -m services.analytics_service.jobs.reconcile_financial_metrics
```

This compares both plausible source-column mappings against workbook
`net_income`, emits row-level financial-quality flags, and keeps dashboard
financial publication blocked until the business/finance owner approves the
field semantics and mismatch disposition.

Build the P3 master-data candidates and coverage report:

```powershell
python -m services.analytics_service.jobs.build_master_data_candidates
```

Only explicitly approved mappings can enable product forecasting or territory
weather joins. Proposed, needs-review, and unmapped values remain blocked.

This folder contains repeatable local jobs for the MedShield model computation workflow.

## Descriptive Analytics

Current dashboard and Chapter 4 reporting use Databricks Gold through the TypeScript gateway. Validate the chosen fact release from the repository root with configured server-side Databricks credentials:

```powershell
Push-Location backend
$env:DATABRICKS_DESCRIPTIVE_FACT_VERSION = '20'
node --dns-result-order=ipv4first --import tsx scripts/validate-descriptive.ts
node --dns-result-order=ipv4first --import tsx scripts/publication-readiness.ts
Pop-Location
```

Fact 20 is the 9 October 2026 validated candidate, not an instruction to choose an unvalidated future version. Consult [Current state](../../../docs/CURRENT_STATE.md) for the selected release. The validators are read-only and write receipts under `outputs/descriptive_validation/` and `outputs/publication_readiness/`. They do not activate a saved backend configuration, establish authenticated dashboard acceptance, or grant business approval.

Notebook [06_sales_stl.py](../../../databricks/medshield_project/06_sales_stl.py) publishes the company monthly PHP-revenue decomposition after Gold and the bridges. Its candidate components must match the selected fact identity. This is historical decomposition, not a forecast or verified SKU-demand output.

The legacy `run_descriptive.py` job and its `outputs/descriptive_analytics_YYYYMMDD/` files remain historical local preparation artifacts. [9 October QA](../../../outputs/system_qa_20261009/QA_REPORT.md) identified mismatched ABC contribution thresholds, margin populations and missing-month semantics. **Do not use that job for current publication or Chapter 4 results until repaired and independently reconciled to Gold.** Existing offline files never supply dashboard measures.

Use [Descriptive analytics logic](../../../docs/DESCRIPTIVE_ANALYTICS_LOGIC.md) for metric/reporting rules and [Testing](../../../docs/TESTING.md) for authenticated API, chart and export acceptance. The current project and Chapter 4 reporting scope is **2017–2025**, confirmed by the user on 9 October 2026. Earlier 2021–2025 packets are historical subset results. Keep the 108 calendar months, 98 months with sales observations and ten unknown months visible; label the separate 72-month 2020–2025 company STL scope. Project-scope confirmation does not record business or academic release approval. Accepted reporting categories include Unclassified and do not approve sellable identity, normalized units, clinical priority, forecasts or procurement.

## Model Computation Start

Before running model computation for pharmaceutical demand, build the provisional medical-demand split:

```powershell
python services\analytics_service\jobs\build_medical_demand_dataset.py
```

This writes:

- `data/medshield/processed/sales_transactions_medical_demand.json.gz`,
- `data/medshield/processed/sales_transactions_non_medical_excluded.json.gz`,
- `outputs/medical_demand_cleaning_YYYYMMDD/medical_demand_cleaning_report.json`.

The split excludes likely non-medical business items from pharmaceutical model inputs while preserving a reconciliation and exclusion audit.

Run:

```powershell
python services\analytics_service\jobs\run_model_computation_start.py
```

Outputs are written to:

```text
outputs/model_computation_start_20260623/
```

The current job performs the feasible sales-only computation steps:

- data contract validation,
- monthly demand marts,
- ABC/Pareto rankings,
- seasonal indices,
- year-over-year growth,
- seasonal naive baseline forecast,
- local DSS-style forecast, priority, and evaluation output files.

When `sales_transactions_medical_demand.json.gz` exists, this job uses it as the model input. Otherwise it falls back to the full adjusted sales dataset and reports the contamination limitation.

The job intentionally blocks or downgrades DOH, PAGASA, weather-adjusted, XGBoost, and real inventory optimization outputs until their required inputs are present and approved.
