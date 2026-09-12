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

The system used historical data only. The sales interface supports multi-year history; exact included periods and exclusions must be reported for each selected source and scope, the DOH dataset covers 2021 to 2025, and the PAGASA dataset covers 2021 to 2024. Weather API observations based on latitude and longitude were used as provider-derived weather proxy data where official historical coverage was incomplete. Because of this scope, the system supports historical analysis, forecast comparison, product prioritization, and scenario-based planning. It does not claim to provide live disease surveillance, official live PAGASA alerts, or automatic procurement decisions.

## CRISP-DM Application

| CRISP-DM phase | MedShield application | Expected evidence |
|---|---|---|
| Business Understanding | Define the decision problem: demand planning, product prioritization, territory analysis, and inventory planning support. | Approved business definitions, Chapter 1 scope, system objectives. |
| Data Understanding | Review sales, DOH, PAGASA, and weather API data coverage, quality, and limitations. | Data profile, 2025 completeness review, source period table. |
| Data Preparation | Clean sales rows, standardize fields, classify products and areas, allocate contract-name rows, and prepare external signal files. | Cleaned sales dataset, product master, area mapping, external data templates. |
| Modeling | Run descriptive analytics, seasonal-naive and last-observed-value benchmarks, lagged OLS comparisons, and constrained integer-pack scenarios. | Model outputs, metrics, charts, run metadata. |
| Evaluation | Check reconciliation and compare MAE, RMSE, WAPE and bias on identical observed holdout months. No champion is automatically published. | QA checklist, evaluation table, limitations section. |
| Deployment | Publish validated outputs through the API/dashboard and document the workflow. | Dashboard screenshots, API examples, Chapter 4 evidence. |

## SEMMA Application

| SEMMA phase | MedShield application | Expected evidence |
|---|---|---|
| Sample | Select usable historical sales, DOH, PAGASA, and weather API records. | Data source table and coverage notes. |
| Explore | Profile missing dates, rejected rows, product aliases, territory values, and trend patterns. | Data readiness profile and exploratory charts. |
| Modify | Clean, transform, map, aggregate, and engineer features. | Analytical marts, mapping files, feature tables. |
| Model | Apply product-level quantity profiles, Pareto shortlisting, sales-only benchmarks, paired lagged regression and integer-pack allocation scenarios. | Model output tables and dashboard charts. |
| Assess | Compare paired holdout errors and data coverage; validate assumptions and record publication gates before approving any model. | Forecast metrics, model comparison, limitations. |

## RRL Notes

Use these sources in Chapter 2 or Chapter 3 when explaining the methodology and data sources:

Use `docs/RRL_DISEASE_WEATHER_PHARMA_DEMAND_GUIDE.md` for the literature-backed argument connecting disease, weather, and pharmaceutical demand forecasting.

| Topic | Source | How to use it |
|---|---|---|
| CRISP-DM | Chapman et al., CRISP-DM 1.0, and IBM SPSS Modeler CRISP-DM documentation | Supports the six-phase project lifecycle used in the capstone. |
| SEMMA | SAS SEMMA / Enterprise Miner references and Azevedo & Santos comparison of KDD, SEMMA, and CRISP-DM | Supports the sample, explore, modify, model, assess modeling workflow. |
| Historical weather proxy | NASA POWER API documentation | Supports describing NASA POWER as an API for historical analysis-ready weather data. |
| Historical weather proxy | Open-Meteo Historical Weather API documentation | Supports describing Open-Meteo as historical reanalysis/weather API data by coordinates. |
| Decision support | Decision-support system and analytics literature from the paper RRL | Use to justify dashboard, forecast comparison, and scenario recommendations. |

## Claims To Use

- The system supports decision-making using historical sales and external context data.
- Weather API data is a provider-derived weather proxy, not official PAGASA data.
- DOH data supports historical disease signal analysis, not live alerting.
- The revised forecast chart evaluates seasonal-naive and last-observed-value benchmarks using frozen historical origins and 3/6/12-month horizons. Legacy model infrastructure is not evidence of a deployed champion.
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
8. Explain frozen-origin forecast validation, paired holdout metrics, retrospective rolling regression, and the distinction between scenarios and approved operational recommendations.
9. State that final outputs are historical decision-support outputs.

## Implemented revision methods (September 12, 2026)

Use [the Section 8 evidence record](SECTION_8_ACCEPTANCE_EVIDENCE.md) and its reproducible JSON for the implemented methods. Heatmaps and forecast quantities use one raw product at a time and exclude estimated rows. Government, Private and Unknown ownership remain separate. Regression uses earlier signal months and reports retrospective evaluation limitations. Planning maximizes equal-product fulfillment fractions then minimizes cost, with integer packs, budget, stock protection and supplier caps. Client acceptance of that objective remains pending.
