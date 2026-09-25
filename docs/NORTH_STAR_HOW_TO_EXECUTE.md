# How to Execute the MedShield North Star

> **Status: operating playbook.** Last reviewed 2026-09-25. This playbook starts from the current Databricks candidate system. It does not certify planned models as implemented. See [CURRENT_STATE.md](CURRENT_STATE.md) before beginning a run.

## Execution principle

Run the work as a dependency chain:

    approve definitions
      -> validate source contracts
      -> reconcile descriptive measures
      -> evaluate forecast baselines
      -> evaluate gated model candidates
      -> collect operational inputs
      -> solve and validate scenarios
      -> review and publish

Stop a downstream step when an upstream gate fails.

## Step 1: freeze business definitions

Approve and version:

- demand quantity;
- gross sales, net sales, transfer value, and gross margin;
- transaction and return handling;
- canonical SKU/product identity;
- territory, buyer sector, and customer identity;
- actual versus estimated product allocation;
- financial eligibility; and
- forecast and service-level policies.

Use [BUSINESS_DEFINITIONS.md](BUSINESS_DEFINITIONS.md), [MAPPED_CLIENT_REFERENCE.md](MAPPED_CLIENT_REFERENCE.md), and the Databricks mapping artifacts as controlled references.

Exit condition: every dashboard metric has an owner, formula, grain, source fields, null behavior, and display label.

## Step 2: validate the sales restart

Run the Databricks sales sequence in order:

1. 01_sales_bronze.py
2. 02_sales_silver.py
3. 03_sales_gold.py
4. 05_sales_restart_system_bridge.sql

Validate:

- source file inventory and checksum;
- Bronze, Silver, rejected, warning, and Gold counts;
- 2017-2025 date scope;
- year/month coverage;
- original totals versus estimated contract allocation;
- canonical product and area mappings;
- negative quantities and returns;
- financial eligibility coverage; and
- the 37,728-row current fact candidate.

The bridge creates stable dashboard-facing views. It does not promote candidate data or approve its business semantics.

Exit condition: the run is reproducible, balanced, and signed for candidate use.

## Step 3: validate external data

Run the external pipeline and bridge, then verify:

- DOH coverage is 2018-2026 and 2026 is marked partial;
- PAGASA coverage is 2017-2024;
- the seven territory mapping review rows remain visible;
- NASA POWER records include provider, retrieval time, coordinates, and period;
- weather and disease data are not silently joined to sales; and
- the system reports zero join-ready territories until the mapping gate is passed.

Use 06_external_restart_system_bridge.sql for stable candidate views.

Exit condition: coverage and provenance pass; model joins remain blocked unless geography and disease-product mappings are approved.

## Step 4: reconcile the application contract

Run:

    cd backend
    npm run databricks:check:dashboard
    npm run databricks:check:external
    npm run build

Then verify authenticated gateway responses for summary, sales, products, territories, external signals, and models.

For every endpoint, record:

- Databricks object;
- selected filters;
- returned row count;
- source/version metadata;
- candidate status; and
- unavailable behavior.

Exit condition: all dashboard measures come from Databricks and a warehouse failure returns an explicit error.

## Step 5: freeze descriptive evidence

Produce the approved historical evidence pack:

- KPI reconciliation;
- monthly/yearly trends;
- product contribution and ABC/Pareto;
- territory and buyer-sector performance;
- data-quality and eligibility coverage; and
- limitations for derived mappings and estimated allocation rows.

An offline Python job may create validation artifacts. Those files are evidence only until an approved equivalent is published to Databricks.

Exit condition: screenshots, tables, queries, and paper claims refer to the same dataset ID and policy version.

## Step 6: run forecast baselines

For each approved series:

1. define the target and monthly grain;
2. create a complete calendar;
3. keep time order in all splits;
4. train seasonal-naive and last-observation baselines;
5. calculate MAE, RMSE, MAPE only where valid, and interval coverage;
6. flag insufficient-history series; and
7. save training cutoff and evaluation window.

Do not select a complex model before the baseline results are reviewed.

Exit condition: baseline metrics reproduce from the frozen dataset and unsupported series fail clearly.

## Step 7: evaluate model candidates

Candidates may include statistical forecasting, Prophet, gradient boosting, or pooled/hierarchical methods. For each candidate:

- use the same holdout window as the baseline;
- prevent future information from entering training features;
- compare accuracy and stability by relevant segment;
- record model/version and parameters;
- explain failures and excluded series; and
- select a champion only under an approved rule.

External-signal candidates add five required checks: geography, time, disease-product mapping, representativeness, and incremental value. NASA POWER is a proxy feature; it is not official PAGASA data. Open-Meteo and OpenWeather are outside the current runtime unless a future controlled ingestion is separately approved.

Exit condition: the candidate improves the accepted baseline and passes model review.

## Step 8: collect prescriptive inputs

Do not infer missing procurement facts from sales alone. Obtain controlled values for:

- on-hand and on-order inventory;
- supplier and replenishment lead time;
- order cost and holding cost;
- pack size and minimum order quantity;
- budget and capacity;
- service-level target; and
- expiry/aging where relevant.

Exit condition: completeness, ownership, effective dates, and allowed defaults are approved.

## Step 9: solve and validate scenarios

Calculate EOQ, reorder point, safety stock, or allocation only for rows that meet their input contract. Validate:

- units and dimensions;
- non-negative and integer/pack constraints;
- stock, budget, and capacity limits;
- infeasible cases;
- sensitivity to demand and lead-time changes; and
- exact reconciliation of totals.

Label results “scenario” until a business owner approves operational use.

## Step 10: publish

The publication path is:

1. offline job creates a versioned candidate;
2. QA validates data and model evidence;
3. business owner reviews the candidate;
4. approved output is written to a governed Databricks object;
5. the TypeScript gateway exposes the approved contract; and
6. the dashboard displays version, cutoff, status, and limitations.

Supabase may retain identity, audit, and the optional protected yearly cache. It is not the publication target for dashboard analytical measures.

## Monthly operating cycle

| Stage | Owner activity | Evidence |
|---|---|---|
| Data close | Ingest and reconcile sales/external changes | Counts, checksums, coverage |
| Descriptive refresh | Rebuild approved Gold aggregates | KPI reconciliation |
| Forecast run | Backtest and score eligible series | Metrics and intervals |
| Scenario run | Apply approved operational inputs | Feasibility and sensitivity |
| Review | Accept, reject, or request changes | Approval record |
| Publish | Replace governed candidate/published object | Version and rollback record |
| Monitor | Compare forecasts/actions with outcomes | Drift and exception report |

## Definition of done

A North Star release is done when:

- all visible analytics trace to named Databricks objects;
- no local, mock, Python-snapshot, or Supabase analytical fallback exists;
- filters reconcile across KPIs, charts, tables, and exports;
- forecast candidates are compared with baselines on held-out time periods;
- external signals pass join and incremental-value gates;
- scenarios have complete inputs and constraint evidence;
- failure states are explicit;
- security and audit checks pass; and
- the manuscript describes only verified behavior.

Use [REMAINING_WORK_DETAILED_CHECKLIST.md](REMAINING_WORK_DETAILED_CHECKLIST.md) to track open items.
