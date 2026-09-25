# MedShield North Star Analytics Execution Blueprint

> **Status: governed delivery plan.** Last reviewed 2026-09-25. This document describes the path from the current candidate system to approved descriptive, predictive, and prescriptive analytics. For implemented facts, use [CURRENT_STATE.md](CURRENT_STATE.md).

## Objective

The North Star is a defensible monthly decision cycle:

1. explain historical demand and performance;
2. estimate future demand with measured uncertainty;
3. turn approved forecasts and operational inputs into reviewable actions; and
4. retain lineage, assumptions, validation results, and human approval.

The dashboard must never present a planned model, synthetic result, or unpublished local artifact as live analytical evidence.

## Current baseline

| Capability | Current state |
|---|---|
| Runtime analytics | Databricks Unity Catalog queried through the TypeScript gateway |
| Sales history | 2017-2025 actuals; 37,728 accepted Gold candidate rows |
| External history | DOH 2018-2026 with 2026 partial; PAGASA 2017-2024 |
| Weather proxy | NASA POWER refresh is implemented and publishes through Databricks |
| Identity and audit | Supabase Auth/account linkage and audit persistence |
| Descriptive analytics | Dashboard-ready Gold aggregates exist; controlled descriptive jobs also exist offline |
| Forecast validation | Seasonal-naive and last-observation baselines are available for evaluation |
| External regression | Blocked until geography, time, disease-product, and representativeness gates are approved |
| Inventory optimization | Scenario-only; no approved procurement recommendation |
| Publication | Candidate-only until the owner accepts reconciliations and policy limitations |

Open-Meteo and OpenWeather are not runtime sources. Python analytics code is offline tooling; the browser does not call it and it is not a dashboard fallback.

## Data authority

    Controlled source files -> Databricks Bronze -> Databricks Silver
    NASA POWER API -----------------------> Databricks Silver external data
    Databricks Silver -> Databricks Gold candidate tables and views
    Databricks Gold -> TypeScript gateway -> Next.js dashboard
    Supabase Auth and audit -> TypeScript gateway
    Offline Python jobs -> validation artifacts -> owner review -> governed Databricks publication

Rules:

- Databricks Gold is the analytical system of record.
- The gateway is the only application component that reads Databricks.
- Supabase does not supply chart or KPI measures.
- Local CSV, XLSX, JSON, generated outputs, and mock objects are not runtime fallbacks.
- Offline model results become visible only after validation and controlled publication to Databricks.
- A failed Databricks query produces an unavailable response instead of substitute analytics.

## Analytical workstreams

### Descriptive

The descriptive layer answers what happened and where. Required outputs include:

- monthly and yearly demand and financial measures;
- territory and buyer-sector performance;
- product contribution, Pareto/ABC grouping, and seasonality;
- source coverage, nulls, rejected rows, and financial eligibility; and
- explicit labels for derived geography and buyer-sector mappings.

Descriptive measures must reconcile to the same Gold contract used by the dashboard. Historical reports with other row counts remain evidence of their original runs and are not current totals.

### Predictive

The predictive layer estimates future demand. Delivery order:

1. define forecast grain and target;
2. create time-aware training, validation, and holdout windows;
3. evaluate seasonal-naive and last-observation baselines;
4. evaluate more complex candidates only where history supports them;
5. publish the champion only when it improves the approved baseline and passes stability checks; and
6. show horizon, interval, metric, training cutoff, and model version.

Prophet, XGBoost, or external-signal regressions are candidate methods, not approved system outputs. Sparse SKU histories require aggregation, pooling, or a documented insufficient-history status.

### Prescriptive

The prescriptive layer recommends actions only when required operational inputs are supplied and approved. Required inputs can include:

- on-hand and on-order inventory;
- lead times and their variability;
- order and holding costs;
- pack sizes, minimum orders, supplier capacity, and budget;
- service-level policy; and
- approved forecast demand.

Until those inputs exist, the system may calculate user-entered scenarios. It must label them as scenarios and must not describe them as procurement instructions.

## External-signal policy

External signals need controlled joins before they can influence forecasts or recommendations:

| Gate | Required evidence |
|---|---|
| Geography | Approved mapping between sales territories, DOH geography, PAGASA stations, and NASA coordinates |
| Time | Common monthly grain, coverage period, missing-month policy, and cutoff |
| Disease-product | Owner-approved mapping between disease signals and canonical SKU/category demand |
| Representativeness | Explanation of station/province coverage and its limitations |
| Incremental value | Time-based comparison showing improvement over the sales-only baseline |

DOH 2026 is partial and PAGASA 2025 is absent. These limitations must remain visible in any analysis. NASA POWER is a provider-derived weather proxy and must not be relabeled as official PAGASA data.

## Governance and publication states

Use explicit states for every output:

    generated -> validated -> reviewed -> published -> acknowledged -> measured

A publishable artifact includes:

- source dataset ID and checksum;
- code/model version;
- training and evaluation periods;
- row counts and exclusions;
- metrics and baseline comparison;
- assumptions and limitations;
- approver and approval timestamp; and
- target Databricks object.

Candidate objects keep the “_candidate” suffix until their acceptance criteria are signed.

## Delivery phases

| Phase | Deliverable | Exit gate |
|---|---|---|
| 0. Contract stabilization | Sales/external reconciliation and mapping review | Counts, checksums, schemas, and limitations accepted |
| 1. Descriptive completion | Reconciled dashboard measures and evidence pack | Dashboard values match Gold for all supported filters |
| 2. Forecast baseline | Backtested baseline forecasts and intervals | Time-based metrics and failure behavior accepted |
| 3. Forecast candidates | Approved advanced and external-signal comparisons | Candidate beats baseline without leakage |
| 4. Inventory foundation | Controlled inventory, supplier, cost, and service inputs | Required inputs are complete and owned |
| 5. Prescriptive scenarios | Feasible, traceable scenarios | Constraint tests and human review pass |
| 6. Publication | Scheduled, monitored Databricks outputs | Owner signs publication and rollback plan |

## Acceptance criteria

The North Star is complete only when:

1. every chart and KPI traces to Databricks Gold;
2. sales totals reconcile by year, month, product, and territory for the displayed scope;
3. derived mappings and estimated allocations are labeled and versioned;
4. forecasts beat an approved baseline on held-out periods;
5. prediction intervals and unsupported series are handled explicitly;
6. prescriptive calculations have complete operational inputs and satisfy constraints;
7. candidate and published outputs are distinguishable;
8. authentication, authorization, audit, and server-only secrets are verified; and
9. the paper reports the exact methods, periods, metrics, and limitations demonstrated by the system.

## Immediate priorities

1. Accept or revise the 37,728-row sales candidate and its financial eligibility policy.
2. Approve territory, buyer-sector, SKU, and contract-allocation mappings.
3. Close the seven external geography review rows.
4. Reconcile every dashboard route against its named Gold object.
5. Freeze descriptive evidence before training new forecast candidates.
6. Keep external regression and procurement recommendations blocked until their gates pass.

Related documents:

- [MEDSHIELD_DSS_MASTER_CHECKLIST.md](MEDSHIELD_DSS_MASTER_CHECKLIST.md)
- [NORTH_STAR_HOW_TO_EXECUTE.md](NORTH_STAR_HOW_TO_EXECUTE.md)
- [MODEL_EXPLAINER.md](MODEL_EXPLAINER.md)
- [ANALYTICS.md](ANALYTICS.md)
- [DATABASE.md](DATABASE.md)
