# Chapter 4 and Chapter 5 Evidence Plan

> **Current evidence boundary (2026-09-25):** Use the 37,728-row checksum-bound sales candidate and the current DOH/PAGASA/NASA Databricks candidates. Earlier Section 8 evidence is historical and must retain its original counts. See [CURRENT_STATE.md](CURRENT_STATE.md).

## Purpose

Use this as the checklist for writing Chapter 4 and Chapter 5. Chapter 4 should show what was built. Chapter 5 should explain what the results mean, what is limited, and what should be improved.

## Current predictive writing packet

**Complete chapter revision — 16 October 2026:** use the [revised Chapters 4–5 working text](chapters/MedShield_Chapter_4_5_Revised_20261016.md) and [revision record](../outputs/paper_revision_20261016/REVISION_RECORD.md) for top-to-bottom integration of descriptive, system, predictive and scenario findings against the user-confirmed post-defense Chapters 1–3. It fills the supplied draft's empty 4.2/4.4 and Chapter 5 template sections, distinguishes held-out ABC classification from next-period prediction, and includes the 15 October system integration plus bounded 16 October pilot-readiness evidence. The dated predictive packets below remain sources; complete Chapters 1–5 assembly and institutional/formal review are still open.

Use the [15 October findings and limitations update](chapters/MedShield_Predictive_Findings_Update_20261015.md)
with the dated 10 October predictive draft. It adds the six-recipe error-reduction
experiment, cumulative lead-group reporting, user-endorsed research goal and
sales-only evidence constraint. It preserves the original selection and explains
why the inspected audit does not support activation or measured 2026 accuracy.
The update is a Markdown research supplement; complete-manuscript integration,
Word/PDF formatting and formal academic review remain separate tasks.

For predictive methods and interpretation, use [the predictive explanation](logic/PREDICTIVE_ANALYTICS_EXPLAINER.md)
and [recomputed model/monthly error scorecard](../outputs/predictive_explanation_20261010/SCORECARD.md).
The [annual projection packet](../outputs/predictive_annual_release_20261010/README.md)
adds final-origin 2026 research values, charts, actual generation dates and
independent QA. Describe them separately from the retained historical accuracy
evaluation; elapsed 2026 targets have no released actuals and no measured errors.
The [completed research delivery](../outputs/predictive_completion_20261009/README.md)
retains the evaluated model artifacts, plots, independent QA, candidate storage and
two authenticated live predictive checks. [Current state](CURRENT_STATE.md) owns
the current results and unresolved acceptance gates. Offline evaluation, warehouse
candidate storage and approved operational serving are three distinct statuses.
This packet supports a results section; it does not close the original SKU/territory
demand objective or grant business/academic acceptance. The dated September
instructions below are historical and do not override current evidence.

## Historical September 2026 revision evidence

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
| Model outputs | Current predictive packet above, Databricks candidates and versioned offline evidence | Report evaluated revenue models separately from scenarios, unapproved external features and operational demand targets. | Research evidence available; operational acceptance pending |
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
