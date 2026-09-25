# Business Analysis

## Decision problem

MedShield needs one reviewable historical evidence base for deciding which products and territories deserve planning attention. The system must help planners understand past demand, compare forecast methods, and test allocation assumptions without inventing inventory or procurement facts.

## Primary users

| User | Decision supported | System boundary |
|---|---|---|
| Analyst | Validate sales, mappings, trends, and forecast evidence | Can refresh NASA POWER history; cannot turn candidates into approved business truth |
| Planner | Compare product/territory priorities and enter scenario assumptions | Results are planning scenarios, not purchase orders |
| Executive/reviewer | Review KPIs, provenance, limitations, and capstone evidence | Sees historical/candidate status and cannot infer operational stock levels |
| Administrator | Manage access and verify Databricks integration | Credentials remain server-side |

## Business rules

- Historical sales quantity is the primary demand evidence.
- Net CP (`net_cost`) is the approved candidate revenue measure; Total TP (`total_trade_price`) is acquisition cost; workbook `net_income` is transaction gross margin/profit, not company net profit.
- Contract labels are not canonical products. Estimated allocations must preserve parent totals and provenance.
- Geography, buyer ownership, and channel are separate dimensions.
- PAGASA observations are official only for their supplied period. NASA POWER remains a provider-derived proxy.
- Missing inventory, lead-time, supplier, ordering-cost, holding-cost, and expiry inputs must be entered as visible scenario assumptions.
- Human review is required before candidate data, models, or recommendations are treated as approved.

## Success measures

1. Gold and API totals reconcile to the accepted Silver population.
2. Every displayed value identifies its source and status: observed, derived mapping, estimated allocation, proxy, forecast, or scenario.
3. Databricks failure produces an unavailable state with no analytical fallback.
4. Predictive methods are compared with transparent baselines using time-series validation.
5. Prescriptive results show assumptions and do not authorize procurement.

See [BUSINESS_DEFINITIONS.md](BUSINESS_DEFINITIONS.md), [REQUIREMENTS.md](REQUIREMENTS.md), and [CURRENT_STATE.md](CURRENT_STATE.md).
