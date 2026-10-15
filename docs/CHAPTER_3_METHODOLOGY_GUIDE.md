# Chapter 3 Methodology Guide

## Purpose

Use this document when revising Chapter 3. It gives the simple methodology wording for the current MedShield system.

## Recommended Methodology Position

MedShield uses a combined CRISP-DM and SEMMA methodology.

- CRISP-DM is the overall project lifecycle.
- SEMMA is the data mining and modeling workflow inside the analytics phase.
- The system is a historical decision-support system, not a live prediction, live alerting, or automated procurement system.

## Simple Chapter 3 Wording

The study followed a combined CRISP-DM and SEMMA methodology to guide the development of the MedShield Business Analytics Decision Support System. CRISP-DM was used as the overall lifecycle because the project required business understanding, data understanding, data preparation, modeling, evaluation, and deployment. SEMMA was applied within the analytics phase to organize the data mining steps: sampling, exploration, modification, modeling, and assessment.

The system uses historical data only. The current Databricks candidate contracts cover 2017-2025 sales, 2018-2026 DOH surveillance with 2026 partial, and 2017-2024 PAGASA station observations. NASA POWER observations based on latitude and longitude are separately labeled provider-derived proxies. Exact included periods, exclusions, and join-readiness must be reported for each analysis. The system supports historical analysis, forecast comparison, product prioritization, and scenario planning; it does not claim live disease surveillance, official live PAGASA alerts, or automatic procurement decisions.

## CRISP-DM Application

| CRISP-DM phase | MedShield application | Expected evidence |
|---|---|---|
| Business Understanding | Define the decision problem: demand planning, product prioritization, territory analysis, and inventory planning support. | Approved business definitions, Chapter 1 scope, system objectives. |
| Data Understanding | Review sales, DOH, PAGASA, and weather API data coverage, quality, and limitations. | Data profile, 2025 completeness review, source period table. |
| Data Preparation | Clean sales rows, standardize fields, classify products and areas, allocate contract-name rows, and prepare external signal files. | Cleaned sales dataset, product master, area mapping, external data templates. |
| Modeling | Run descriptive analytics; compare company monthly net-sales benchmarks, ETS, Prophet and the separately registered exploratory SARIMA/ridge suite; retain lagged external regression and allocation scenarios as separate scopes. | Model outputs, metrics, charts, run metadata and approval status. |
| Evaluation | Check reconciliation and compare MAE, RMSE, WAPE and bias on identical observed origin/target pairs. No champion is automatically published. | QA checklist, evaluation table, limitations section. |
| Deployment | Publish validated outputs through the API/dashboard and document the workflow. | Dashboard screenshots, API examples, Chapter 4 evidence. |

## SEMMA Application

| SEMMA phase | MedShield application | Expected evidence |
|---|---|---|
| Sample | Select usable historical sales, DOH, PAGASA, and weather API records. | Data source table and coverage notes. |
| Explore | Profile missing dates, rejected rows, product aliases, territory values, and trend patterns. | Data readiness profile and exploratory charts. |
| Modify | Clean, transform, map, aggregate, and engineer features. | Analytical marts, mapping files, feature tables. |
| Model | Apply provenance-aware source quantity profiles and Pareto shortlisting; compare sales-only revenue models; keep paired external regression and integer-pack scenarios separate from accepted SKU-demand forecasts. | Model output tables, candidate evidence and dashboard charts. |
| Assess | Compare paired development and retrospective-audit errors and data coverage; validate assumptions and record publication gates before approving any model. | Forecast metrics, model comparison, limitations. |

## RRL Notes

Use these sources in Chapter 2 or Chapter 3 when explaining the methodology and data sources:

Use `docs/RRL_DISEASE_WEATHER_PHARMA_DEMAND_GUIDE.md` for the literature-backed argument connecting disease, weather, and pharmaceutical demand forecasting.

| Topic | Source | How to use it |
|---|---|---|
| CRISP-DM | Chapman et al., CRISP-DM 1.0, and IBM SPSS Modeler CRISP-DM documentation | Supports the six-phase project lifecycle used in the capstone. |
| SEMMA | SAS SEMMA / Enterprise Miner references and Azevedo & Santos comparison of KDD, SEMMA, and CRISP-DM | Supports the sample, explore, modify, model, assess modeling workflow. |
| Historical weather proxy | NASA POWER API documentation | Supports describing NASA POWER as an API for historical analysis-ready weather data. |
| Historical weather proxy | NASA POWER Daily API documentation | Supports describing NASA POWER as provider-derived historical weather data by coordinates. |
| Decision support | Decision-support system and analytics literature from the paper RRL | Use to justify dashboard, forecast comparison, and scenario recommendations. |

## Claims To Use

- The system supports decision-making using historical sales and external context data.
- Weather API data is a provider-derived weather proxy, not official PAGASA data.
- DOH data supports historical disease signal analysis, not live alerting.
- The gateway exposes transparent baseline evidence; the separate offline comparison evaluates benchmarks, ETS, Prophet and exploratory SARIMA/ridge on common calendar leads 1–12. A 3/6/12-month display length is distinct from the actual lead from the accepted origin. No approved champion is served.
- Scenario outputs require human review before action.

## Claims To Avoid

- Do not say the system predicts disease outbreaks.
- Do not say the system provides official PAGASA alerts.
- Lagged observational regression measures conditional association; these results do not establish weather or disease causality.
- Do not call `net_income` company net income.
- Do not present EOQ, ROP, or allocation as real procurement optimization without inventory, lead time, and cost-policy data.

## Chapter 3 Checklist

1. State that CRISP-DM is the overall methodology.
2. State that SEMMA is used inside the analytics/modeling phase.
3. List all data sources with exact year coverage.
4. Explain the sales cleaning and contract-name row allocation.
5. Explain product/SKU alias mapping and area classification.
6. Explain 2025 data limitations.
7. Explain descriptive, predictive, and scenario analytics separately.
8. Explain common time-ordered forecast pairs, overlapping development folds, origin-local preprocessing, the inspected 2025 retrospective audit, paired metrics and the distinction between scenarios and approved operational recommendations.
9. State that final outputs are historical decision-support outputs.

## Predictive methods and paper results

Use [the predictive explanation](logic/PREDICTIVE_ANALYTICS_EXPLAINER.md) for the
executed model families, target/unit, evaluation protocol, formulas and defensible
interpretation. The [recomputed scorecard](../outputs/predictive_explanation_20261010/SCORECARD.md)
supports the predictive results table. [Current state](CURRENT_STATE.md) owns
current numerical results and acceptance status. Distinguish the 2017–2025 current
project reporting scope from the 2020–2025 modeling window. If the paper still
uses its original 2021–2025 dates, reconcile them with the recorded project-scope
change and academic requirements.

## Historical implemented revision methods (September 12, 2026)

Use [the Section 8 evidence record](SECTION_8_ACCEPTANCE_EVIDENCE.md) and its reproducible JSON for the implemented methods. Heatmaps and forecast quantities use one raw product at a time and exclude estimated rows. Government, Private and Unknown ownership remain separate. Regression uses earlier signal months and reports retrospective evaluation limitations. Planning maximizes equal-product fulfillment fractions then minimizes cost, with integer packs, budget, stock protection and supplier caps. Client acceptance of that objective remains pending.
