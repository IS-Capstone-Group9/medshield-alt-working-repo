# Predictive models and annual-release projections

Completed research delivery, **10 October 2026**. All **21 model configurations** produced **252 monthly candidate values** for January–December 2026. All 21 recipes were executed once using the same **72 January 2020–December 2025 values**; four are computed benchmarks, and the fitted models were trained on that history. Actual generation was **10 October 2026 at 13:42 Manila**; December 2025 is the data cutoff, not the issue date.

The client can review company monthly recorded **net sales in pesos** using the available annual history. Annual release frequency changes when actuals become available; the target remains monthly. This work adds final-origin projections to the earlier evaluated study. It introduces no tuning, model reselection or new accuracy evaluation.

## What the selected candidate means

The inherited development selection remains **last value**. It repeats December 2025 sales, **₱23,493,882.59**, every month. The twelve candidate values sum to **₱281,926,591.08**. The flat line is the benchmark's assumption, not evidence that future sales will stay constant. No fitted challenger qualified under the frozen comparison criteria.

Its inherited **2025 retrospective-audit WAPE is 37.76%**, monthly **MAE is ₱5,834,383.00**, RMSE is **₱6,956,031.72**, and normalized bias is **+8.38%**. Development WAPE is **83.20%**. These material historical errors do not measure 2026 accuracy. WAPE is an error measure, not an accuracy percentage.

## Model families

| Family | Configurations | Method |
|---|---:|---|
| Benchmarks | 4 | Last value, seasonal naive, trailing 3/6-month means |
| ETS | 2 | Additive annual seasonality, no trend or damped additive trend |
| Prophet | 9 | Restrained sales-only trend/annual-seasonality prior grid |
| SARIMA | 2 | Fixed seasonal autoregressive / differenced moving-average recipes |
| Ridge regression | 4 | Direct and recursive lag forecasts at two fixed penalties |

The chart displays five representatives chosen by **earlier development WAPE only**. Projection values and 2025 audit errors do not select the representatives. All 21 recipes are available in the bound model cards and JSON points.

![Monthly annual-release research projections](candidate-projections.png)

## Monthly family representatives

Values below are projected **PHP millions**, rounded to three decimals for display. Every 2026 actual is null.

| Month | Last value | ETS | Prophet | SARIMA | Ridge | Target state |
|---|---:|---:|---:|---:|---:|---|
| 2026-01 | 23.494 | 22.025 | 13.297 | 22.777 | 18.655 | Elapsed; no actual |
| 2026-02 | 23.494 | 23.073 | 11.190 | 23.316 | 17.710 | Elapsed; no actual |
| 2026-03 | 23.494 | 18.808 | 8.214 | 18.360 | 20.453 | Elapsed; no actual |
| 2026-04 | 23.494 | 18.563 | 9.340 | 18.559 | 21.252 | Elapsed; no actual |
| 2026-05 | 23.494 | 24.731 | 13.345 | 26.192 | 19.853 | Elapsed; no actual |
| 2026-06 | 23.494 | 21.698 | 13.892 | 23.561 | 20.067 | Elapsed; no actual |
| 2026-07 | 23.494 | 20.586 | 10.844 | 22.554 | 19.014 | Elapsed; no actual |
| 2026-08 | 23.494 | 18.933 | 9.714 | 20.219 | 20.886 | Elapsed; no actual |
| 2026-09 | 23.494 | 20.490 | 11.414 | 23.208 | 19.876 | Elapsed; no actual |
| 2026-10 | 23.494 | 19.319 | 11.823 | 21.528 | 21.059 | Current; no actual |
| 2026-11 | 23.494 | 19.972 | 11.184 | 23.291 | 19.287 | Future; no actual |
| 2026-12 | 23.494 | 20.640 | 12.703 | 25.005 | 18.988 | Future; no actual |

## All configurations: historical errors and new candidate totals

Development uses 60 overlapping origin/target pairs covering 24 distinct months. The 2025 retrospective audit uses 12 months and was already inspected. The **2026 total is projected revenue**, separate from both historical error columns; a higher or lower total is not a performance ranking. Table order follows the registered recipe order.

| Recipe | Development WAPE (%) | 2025 audit WAPE (%) | 2026 candidate total (₱ million) |
|---|---:|---:|---:|
| last_value | 83.20 | 37.76 | 281.927 |
| seasonal_naive | 93.90 | 72.89 | 185.397 |
| mean_3 | 95.13 | 59.63 | 244.330 |
| mean_6 | 93.51 | 68.14 | 222.047 |
| ets_none | 92.74 | 67.97 | 248.838 |
| ets_damped | 100.30 | 67.49 | 314.786 |
| prophet_cp0.01_sp0.1 | 93.77 | 72.47 | 136.859 |
| prophet_cp0.01_sp1.0 | 94.35 | 72.18 | 136.957 |
| prophet_cp0.01_sp10.0 | 93.54 | 72.11 | 136.958 |
| prophet_cp0.05_sp0.1 | 94.53 | 72.61 | 136.972 |
| prophet_cp0.05_sp1.0 | 94.63 | 72.16 | 136.994 |
| prophet_cp0.05_sp10.0 | 94.82 | 72.23 | 137.081 |
| prophet_cp0.1_sp0.1 | 94.22 | 72.57 | 200.576 |
| prophet_cp0.1_sp1.0 | 94.86 | 72.20 | 201.307 |
| prophet_cp0.1_sp10.0 | 94.97 | 72.37 | 201.553 |
| sarima_ar_seasonal | 106.65 | 67.44 | 91.547 |
| sarima_airline | 87.88 | 63.38 | 268.570 |
| ridge_direct_a1 | 120.21 | 73.32 | 64.121 |
| ridge_direct_a10 | 111.52 | 72.66 | 76.046 |
| ridge_recursive_a1 | 111.02 | 70.40 | 243.142 |
| ridge_recursive_a10 | 106.55 | 69.81 | 237.101 |

## Verification and limits

[Independent QA](qa/REPORT.md) passes **1,156 artifact/numerical checks**, **11 fixture tests** and **3 independent math tests**. Four benchmarks were separately reconstructed with Decimal, and four ridge recipes with a separate NumPy solver, below the predeclared ₱0.01 tolerance. ETS/Prophet/SARIMA were checked for identities, finite coherent results and warnings; they were not independently refitted. One SARIMA starting-seasonal-parameter warning is retained; no convergence failure occurred. The plot was visually inspected for readable dates, units, legends and period states.

January–September are elapsed targets; October is current; November–December are future. All lack accepted actuals here. Projections generated in October cannot establish prospective performance for the elapsed months. The revised source snapshot lacks historical issue-time vintages. Reporting completeness remains inherited user attestation for training, not independent completeness or publication approval.

80%/95% interval bounds remain null because five dependent development errors per lead are insufficient for the documented calibration requirement. October–December 2026 are leads 10–12; a current six- or twelve-month display would exceed the evaluated 1–12 leads. The source-owner annual release date and the reasons for sales shifts remain unconfirmed.

Status is **annual_projection_research_unpublished**, with publication approval **false**. This execution emits no release draft, warehouse write or publication-pointer change. Dashboard requests do not read these local artifacts as fallback. Company peso revenue does not establish medicine-unit demand, disease effects, purchase quantities or inventory outcomes.

## When the next annual records arrive

Reconcile the new source and period closure, then compare retained projections with accepted actuals while preserving issue dates and elapsed-versus-future target status. Register any revised recipes and evaluation protocol before fitting. Business error tolerance and scoped data/model review remain necessary for publication; verified SKU/unit, territory and inventory inputs are necessary for operational demand planning. The client may release records annually; no 2026 data is needed to reproduce this completed historical model comparison and research projection.

## Paper wording

> MedShield compared transparent benchmarks, ETS, Prophet, SARIMA and regularized lag regression for company monthly recorded net sales. Selection used common time-ordered development pairs; no fitted challenger satisfied the frozen criteria, leaving last value as an unpublished candidate. The 2025 results were a retrospective audit, not an untouched final test. A separately registered final-origin fit used January 2020–December 2025 history to generate January–December 2026 research projections on 10 October 2026. All 2026 actuals and unsupported interval bounds remained unavailable. Annual source release frequency governs refresh, while the prediction target remains monthly. These results do not establish medicine-unit accuracy or operational inventory benefit.

## Evidence and reproduction

- [All recipe results](models/annual-origin-2025-12-asof-2026-10-10/a0047f8b88958a46152b457770211c53976f769bf24c9a9df097abb00dc6d39b/RESULTS.md), [model cards](models/annual-origin-2025-12-asof-2026-10-10/a0047f8b88958a46152b457770211c53976f769bf24c9a9df097abb00dc6d39b/model-cards.json), [252 exact points](models/annual-origin-2025-12-asof-2026-10-10/a0047f8b88958a46152b457770211c53976f769bf24c9a9df097abb00dc6d39b/projections.json) and [run identity](models/annual-origin-2025-12-asof-2026-10-10/a0047f8b88958a46152b457770211c53976f769bf24c9a9df097abb00dc6d39b/run.json).
- [Pre-fit protocol](models/annual-origin-2025-12-asof-2026-10-10/protocol.json), [all recipe summary](projection-summary.json), [QA report](qa/REPORT.md), [plot receipt](plot-receipt.json), and [exportable SVG](candidate-projections.svg).
- [Historical evaluated comparison](../predictive_completion_20261009/README.md), [recomputed scorecard](../predictive_explanation_20261010/SCORECARD.md), [study overview](../../docs/STUDY_OVERVIEW.md) and [method explanation](../../docs/logic/PREDICTIVE_ANALYTICS_EXPLAINER.md).
- [Reproduction and publication contracts](../../docs/PREDICTIVE_OPERATIONS.md), [testing commands](../../docs/TESTING.md) and [current state](../../docs/CURRENT_STATE.md).

Projection ID: `a0047f8b88958a46152b457770211c53976f769bf24c9a9df097abb00dc6d39b`. Source: `workspace.medshield_gold.sales_restart_fact_candidate`, Delta 20; policy `sales_restart_gold_v7_independent_catalog`; dataset `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`. The frozen manifest's source and approval statuses are preserved.

Accountable role: Data Analyst. Supporting roles: QA Engineer and Technical Writer. Applied repository worker/execution contracts, analytics frameworks, database lineage, coding, testing, technology-stack and documentation standards. Implementation, independent QA and reader review had separate ownership. Existing source/model artifacts and unrelated working-tree changes were preserved. [Delivery seal](delivery.json) binds the completed local packet and current documentation; it is technical evidence, not an approval.

