# Analytics Jobs

This folder contains repeatable local jobs for the MedShield model computation workflow.

## Descriptive Analytics

Run:

```powershell
python services\analytics_service\jobs\run_descriptive.py
```

Outputs are written by default to:

```text
outputs/descriptive_analytics_YYYYMMDD/
```

The job performs the sales-only descriptive analytics layer:

- monthly and yearly sales trends,
- product ABC/Pareto,
- territory ABC/Pareto,
- area and area-type summaries,
- seasonality index,
- year-over-year growth,
- contract-allocation and estimated-date visibility,
- Chapter 4 findings notes.

Use this job before predictive or prescriptive model runs. It answers what happened; it does not forecast or recommend procurement action.

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
