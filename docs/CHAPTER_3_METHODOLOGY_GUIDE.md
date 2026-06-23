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

The system used historical data only. The sales dataset covers 2021 to 2025, the DOH dataset covers 2021 to 2025, and the PAGASA dataset covers 2021 to 2024. Weather API observations based on latitude and longitude were used as provider-derived weather proxy data where official historical coverage was incomplete. Because of this scope, the system supports historical analysis, forecast comparison, product prioritization, and scenario-based planning. It does not claim to provide live disease surveillance, official live PAGASA alerts, or automatic procurement decisions.

## CRISP-DM Application

| CRISP-DM phase | MedShield application | Expected evidence |
|---|---|---|
| Business Understanding | Define the decision problem: demand planning, product prioritization, territory analysis, and inventory planning support. | Approved business definitions, Chapter 1 scope, system objectives. |
| Data Understanding | Review sales, DOH, PAGASA, and weather API data coverage, quality, and limitations. | Data profile, 2025 completeness review, source period table. |
| Data Preparation | Clean sales rows, standardize fields, classify products and areas, allocate contract-name rows, and prepare external signal files. | Cleaned sales dataset, product master, area mapping, external data templates. |
| Modeling | Run descriptive analytics, baseline forecasting, optional external-regressor models, and priority/scenario scoring. | Model outputs, metrics, charts, run metadata. |
| Evaluation | Check reconciliation, missing periods, forecast accuracy, model usefulness, and limitations. | QA checklist, evaluation table, limitations section. |
| Deployment | Publish validated outputs through the API/dashboard and document the workflow. | Dashboard screenshots, API examples, Chapter 4 evidence. |

## SEMMA Application

| SEMMA phase | MedShield application | Expected evidence |
|---|---|---|
| Sample | Select usable historical sales, DOH, PAGASA, and weather API records. | Data source table and coverage notes. |
| Explore | Profile missing dates, rejected rows, product aliases, territory values, and trend patterns. | Data readiness profile and exploratory charts. |
| Modify | Clean, transform, map, aggregate, and engineer features. | Analytical marts, mapping files, feature tables. |
| Model | Apply ABC/Pareto, STL, baseline forecasting, optional regressors, and priority scoring. | Model output tables and dashboard charts. |
| Assess | Compare models, check metrics, validate assumptions, and document whether outputs are usable. | Forecast metrics, model comparison, limitations. |

## RRL Notes

Use these sources in Chapter 2 or Chapter 3 when explaining the methodology and data sources:

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
- Forecasts are planning estimates and must be evaluated against benchmarks.
- Scenario outputs require human review before action.

## Claims To Avoid

- Do not say the system predicts disease outbreaks.
- Do not say the system provides official PAGASA alerts.
- Do not say weather causes sales changes unless tested and proven.
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
8. Explain model evaluation metrics and validation.
9. State that final outputs are historical decision-support outputs.
