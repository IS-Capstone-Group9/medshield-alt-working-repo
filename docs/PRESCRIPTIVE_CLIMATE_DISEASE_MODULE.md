# Prescriptive Climate-Disease Mapping Module

> **Status: gated design specification.** Last reviewed 2026-09-25. No climate-disease model or procurement recommendation is currently approved for live use. Implemented coverage and blockers are recorded in [CURRENT_STATE.md](CURRENT_STATE.md).

## Purpose

This module describes how MedShield may evaluate whether historical disease and weather signals improve demand forecasting and, if approved, how those forecasts may support inventory scenarios.

It must remain separate from the current descriptive dashboard until every data and model gate passes.

## Available source context

| Source | Current role | Limitation |
|---|---|---|
| Sales Gold candidate | Demand and financial history for 2017-2025 | Candidate-only; mappings and financial eligibility require owner acceptance |
| DOH candidate | Disease surveillance history for 2018-2026 | 2026 is partial; geography and disease-product joins are not approved |
| PAGASA candidate | Official station weather for 2017-2024 | 2025 is absent; station-to-territory representativeness requires review |
| NASA POWER candidate | Provider-derived historical weather proxy | Must remain labeled as NASA; it cannot be presented as PAGASA |
| Inventory/procurement inputs | Required for prescriptive outputs | Complete governed inputs are not currently available |

No published correlation coefficient, causal effect, disease forecast, EOQ, reorder point, or allocation recommendation should be claimed from this specification alone.

## Required analytical contracts

### Geography

Create an approved mapping with:

- sales territory ID;
- DOH geography ID;
- PAGASA station ID;
- NASA latitude/longitude;
- mapping method;
- effective dates;
- representativeness note;
- reviewer; and
- status.

The current seven territory review rows remain “needs_review”; zero territories are approved as join-ready.

### Time

Transform all sources to an explicit monthly grain and record:

- source period;
- partial-period flag;
- missing-month policy;
- aggregation formula;
- publication lag; and
- model cutoff.

Never impute future or unavailable official PAGASA values and label them as observations.

### Disease-product mapping

An owner-approved mapping must connect each disease signal to canonical product categories or SKUs. Each rule needs clinical/business rationale, effective date, source, reviewer, and status. A convenient seasonal association is not sufficient evidence.

## Predictive evaluation

The first question is whether external signals add measurable value over sales history.

1. Freeze an eligible territory/product demand series.
2. Train seasonal-naive and last-observation baselines.
3. Evaluate a sales-only candidate.
4. Add lagged disease features in a separate candidate.
5. Add official PAGASA features where coverage permits.
6. Add NASA proxy features in a separately labeled candidate.
7. Compare all candidates on identical time-based holdouts.
8. Review error, interval coverage, stability, leakage, and segment failures.
9. Publish an external-signal model only if its incremental value is accepted.

Because PAGASA ends in 2024 and DOH 2026 is partial, evaluation windows differ by provider. The model report must state the exact overlap period and cannot imply full 2017-2025 external coverage.

## Prescriptive scenario contract

A forecast does not by itself authorize purchasing. A scenario requires:

- approved forecast quantity and uncertainty;
- on-hand and on-order inventory;
- lead-time distribution;
- order and holding costs;
- pack size and minimum order;
- supplier capacity;
- budget;
- service-level policy; and
- expiry or shelf-life rules when applicable.

Every result must state:

- input values and units;
- formula or solver version;
- feasibility status;
- binding constraints;
- sensitivity range;
- data/model version; and
- human approval status.

Until these inputs exist, the UI may accept user-entered assumptions and must label the result as a scenario.

## Publication architecture

    Databricks sales Gold ----+
                              +-> offline controlled evaluation -> metrics and evidence
    Databricks external data -+                                  -> model/owner review
                                                                     -> governed Databricks output
                                                                     -> TypeScript gateway
                                                                     -> dashboard

The Python analytics code may support offline evaluation. It is not a live Flask dependency of the current dashboard. The browser receives approved results only through the TypeScript gateway and Databricks contract.

## Roles

| Role | Responsibility |
|---|---|
| Business owner | Approves decision use, disease-product mappings, and service policies |
| Data analyst | Profiles coverage, creates features, and documents limitations |
| Data engineer | Maintains Databricks ingestion, lineage, and quality checks |
| Model owner | Trains candidates, prevents leakage, and compares baselines |
| QA | Reproduces metrics, checks contracts, and tests failure states |
| Backend engineer | Exposes only approved Databricks contracts |
| BI/frontend | Labels provider, period, status, uncertainty, and scenario assumptions |
| Security | Protects credentials, routes, and audit records |

## Acceptance gates

The module remains blocked until:

- geography mappings are approved;
- disease-product mappings are approved;
- time coverage and missingness are documented;
- external-signal candidates beat the sales-only baseline;
- model uncertainty and limitations are visible;
- operational inventory inputs are complete;
- solver constraints and infeasible cases are independently tested; and
- a business owner signs publication.

Related documents:

- [NORTH_STAR_EXECUTION_BLUEPRINT.md](NORTH_STAR_EXECUTION_BLUEPRINT.md)
- [PREDICTIVE_ANALYTICS_EXPLAINER.md](logic/PREDICTIVE_ANALYTICS_EXPLAINER.md)
- [PRESCRIPTIVE_ANALYTICS_EXPLAINER.md](logic/PRESCRIPTIVE_ANALYTICS_EXPLAINER.md)
- [AREA_AND_PRODUCT_PRIORITIZATION_IMPLEMENTATION_PLAN.md](AREA_AND_PRODUCT_PRIORITIZATION_IMPLEMENTATION_PLAN.md)
