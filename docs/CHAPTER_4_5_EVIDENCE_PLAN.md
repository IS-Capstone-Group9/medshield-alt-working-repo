# Chapter 4 and Chapter 5 Evidence Plan

> **Current evidence boundary (2026-09-25):** Use the 37,728-row checksum-bound sales candidate and the current DOH/PAGASA/NASA Databricks candidates. Earlier Section 8 evidence is historical and must retain its original counts. See [CURRENT_STATE.md](CURRENT_STATE.md).

## Purpose

Use this as the checklist for writing Chapter 4 and Chapter 5. Chapter 4 should show what was built. Chapter 5 should explain what the results mean, what is limited, and what should be improved.

## September 2026 revision evidence

Use [Section 8 acceptance evidence](SECTION_8_ACCEPTANCE_EVIDENCE.md) for executed checks, reproducible source reconciliation, scoped numerical findings and open gates. The repository methodology guide now reflects the implemented benchmarks, lagged regression and allocation scenarios. Authenticated screenshots and live upload acceptance remain pending a provisioned sign-in; isolated browser results must not be captioned as deployed end-to-end validation. Preserve gross-profit discrepancies and unknown buyer ownership in the discussion.

## Chapter 4 Evidence Checklist

| Evidence | File or source | Needed action | Status |
|---|---|---|---|
| System architecture | `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION.md` | Add architecture diagram or screenshot. | Pending |
| Database/schema design | `docs/DATABASE.md`, Databricks schemas, `supabase/migrations/` | Show Databricks analytics and Supabase identity/audit as separate boundaries. | Pending |
| Sales cleaning summary | `docs/IMPLEMENTATION.md`, Databricks audit tables | Include source, accepted, rejected, warning, duplicate, and financial-eligibility counts. | Pending |
| Contract-name breakdown | `outputs/contract_backward_allocation_20260623/` | Include reconciliation and explain estimated rows. | Pending |
| Product/SKU mapping | `datasources/templates/product_master_mapping.csv` | Add approved mapping summary after review. | Pending |
| 2025 data issue | `databricks/docs/2025_DATA_ISSUE_REMEDIATION.md` | Explain missing months and holdout policy. | Pending |
| PAGASA data readiness | Databricks external candidate | Show 2017-2024 station coverage, missingness, review mappings, and absent 2025. | Pending review |
| DOH data readiness | Databricks external candidate | Show 2018-2026 coverage, classifications, geography, and partial 2026. | Pending review |
| NASA POWER readiness | Databricks weather proxy candidate | Show provider, coordinates, retrieval time, date coverage, and limitations. | Pending review |
| Dashboard screenshots | Running frontend | Capture sales dashboard, upload, sales table, weather validation, and outputs. | Pending |
| API evidence | Backend endpoints | Include sample response summaries, not secrets. | Pending |
| Model outputs | Databricks candidates plus versioned offline evidence | Separate implemented baselines and scenarios from blocked advanced/external models. | Pending |
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
| Disease usefulness | Whether DOH signals support scenario analysis. | Loaded-candidate feature table and comparison after join approval. |
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
5. External-data and NASA POWER validation page.
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

> The study uses candidate datasets whose current coverage is 2017-2025 for sales, 2018-2026 for DOH surveillance with 2026 partial, and 2017-2024 for official PAGASA observations. NASA POWER values are provider-derived proxies by coordinates and are not official PAGASA data. Geography and disease-product joins remain unapproved, and the system does not provide live official alerts or automatic procurement execution. Because complete inventory, supplier lead time, ordering cost, holding cost, budget, capacity, expiry, and operating-expense inputs are unavailable, prescriptive outputs remain review-only scenarios.
