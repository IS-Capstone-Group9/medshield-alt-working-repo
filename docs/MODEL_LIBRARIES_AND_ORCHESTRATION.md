# Model Libraries and Orchestration

## Runtime boundary

Dashboard requests do not train models. Controlled offline jobs prepare/evaluate models and publish accepted outputs to Databricks. The gateway reads published views.

## Candidate libraries

| Capability | Package | Use |
|---|---|---|
| Data preparation | `pandas`, `numpy` | Marts, joins, lags, completeness |
| Statistical diagnostics | `statsmodels` | STL and classical baselines |
| Model evaluation | `scikit-learn` | Metrics and feature pipelines |
| Gradient boosting | `xgboost` | Only after a forward-looking target is approved |
| Forecasting | `prophet` or an approved alternative | Candidate sales/external forecast comparison |
| Optimization | `scipy`, `pulp` | Scenario solving with explicit constraints |
| Workbook IO | `openpyxl` | Offline source/review work |
| Provider/ETL | `requests`, `python-dotenv` | Controlled server/job integrations |

Library availability does not make a model implemented or approved.

## Job sequence

```text
accepted dataset/version
  -> contract and leakage checks
  -> analytical marts
  -> baseline evaluation
  -> candidate training/evaluation
  -> draft Databricks output
  -> human review
  -> approved Databricks publication
  -> gateway/dashboard read
```

## Required metadata

- run and model IDs/versions;
- training, evaluation, and forecast periods;
- dataset and feature versions;
- target and grain;
- validation windows;
- metrics including bias;
- status and limitations;
- creator/reviewer and timestamps.

## Publication statuses

Use `draft`, `validated`, `review_required`, `published`, `rejected`, and `superseded` consistently. Automated checks may move an output to `validated`; only an authorized review can make it `published`.

The current live contract provides descriptive evidence and simple forecast baselines. Final predictive outputs are not yet published.
