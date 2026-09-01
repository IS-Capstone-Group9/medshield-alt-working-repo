# Chapter 4 and Chapter 5 Evidence Plan

## Purpose

Use this as the checklist for writing Chapter 4 and Chapter 5. Chapter 4 should show what was built. Chapter 5 should explain what the results mean, what is limited, and what should be improved.

## Chapter 4 Evidence Checklist

| Evidence | File or source | Needed action | Status |
|---|---|---|---|
| System architecture | `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION.md` | Add architecture diagram or screenshot. | Pending |
| Database/schema design | `docs/DATABASE.md`, `supabase/migrations/` | Add table summary or ERD. | Pending |
| Sales cleaning summary | `docs/IMPLEMENTATION.md`, processed status files | Include extracted, accepted, rejected, duplicate counts. | Pending |
| Contract-name breakdown | `outputs/contract_backward_allocation_20260623/` | Include reconciliation and explain estimated rows. | Pending |
| Product/SKU mapping | `datasources/templates/product_master_mapping.csv` | Add approved mapping summary after review. | Pending |
| 2025 data issue | `databricks/docs/2025_DATA_ISSUE_REMEDIATION.md` | Explain missing months and holdout policy. | Pending |
| PAGASA data readiness | Clean PAGASA file after upload | Show coverage and missing values. | Pending |
| DOH data readiness | Clean DOH file after upload | Show disease coverage and missing values. | Pending |
| Weather API readiness | Weather API validation page/output | Show provider, region, date coverage, and limitations. | Pending |
| Dashboard screenshots | Running frontend | Capture sales dashboard, upload, sales table, weather validation, and outputs. | Pending |
| API evidence | Backend endpoints | Include sample response summaries, not secrets. | Pending |
| Model outputs | DSS tables or local model outputs | Include forecasts, ABC/Pareto, seasonality, priority/scenario outputs. | Pending |
| QA evidence | Test/build commands | Include test/build results and manual QA table. | Pending |

## Chapter 4 Suggested Structure

1. System overview.
2. System architecture.
3. Database and data warehouse design.
4. Sales data ingestion and cleaning.
5. Contract-name row backward allocation.
6. Product and area mapping.
7. External data preparation.
8. Analytics and modeling workflow.
9. Dashboard implementation.
10. Validation and testing.

## Chapter 5 Evidence Checklist

| Result area | What to explain | Evidence |
|---|---|---|
| Sales trends | What happened to sales and demand over time. | Monthly sales charts and summary tables. |
| Product contribution | Which products drive most revenue/demand. | ABC/Pareto outputs. |
| Territory performance | Which areas contribute demand/revenue. | Area summaries and maps/tables. |
| 2025 limitation | Whether 2025 can be used for model testing. | 2025 coverage table. |
| Forecast result | Whether baseline forecasts are useful. | MAE, RMSE, MAPE/WAPE/sMAPE, bias. |
| Weather usefulness | Whether weather proxy improved model or only adds context. | Weather model comparison or descriptive correlation. |
| Disease usefulness | Whether DOH signals support scenario analysis. | Disease feature table and comparison after upload. |
| Decision-support value | How the dashboard helps planning review. | Screenshots and user workflow explanation. |
| Limitations | What data is missing or historical only. | Limitations table. |
| Recommendations | What to improve after the capstone. | Future work list. |

## Chapter 5 Suggested Structure

1. Summary of findings.
2. Discussion of sales and product insights.
3. Discussion of forecast and model evaluation.
4. Discussion of weather and disease signals.
5. Decision-support value of the system.
6. Limitations.
7. Conclusions.
8. Recommendations and future work.

## Screenshot Checklist

Capture these after the latest data is loaded:

1. Login page without credentials exposed.
2. Dashboard overview.
3. View Sales Data table.
4. Data Upload page after successful upload or status summary.
5. Weather API Validation page.
6. Contract-name allocation output summary.
7. Model/evaluation output page if available.

## QA Commands To Record

```powershell
python -m unittest discover -s services\tests -p "test_*.py" -v
cd backend
npm run build
cd frontend
npm run build
```

If a command cannot be run, record why and list the manual checks performed instead.

## Limitation Wording

Use this wording:

> The study is limited by the availability and completeness of historical datasets. PAGASA data covers 2021 to 2024 only, DOH data covers 2021 to 2025, and weather API observations are provider-derived proxy data by coordinates. The system does not provide live official alerts or automatic procurement execution. Because inventory, supplier lead time, ordering cost, holding cost, and operating expense data are not yet available, inventory recommendations are treated as scenario-based decision-support outputs.
