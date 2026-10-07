# External data and replenishment assessment

Reviewed 7 October 2026. Supporting Data Analyst; assigned Backend Engineer for confirmed planning defects. This assessment reuses the source-bound aggregate profile and verifies twelve raw-file hashes. No source files, warehouse objects, mappings or approvals were changed. Live SQL findings supplied by the root reviewer are distinguished from local inspection in the companion JSON.

External disease and weather data supports historical context and controlled experiments. It cannot identify missing SKUs, prove clinical disease-product associations, or provide present stock for replenishment.

## Source coverage

| Selected local scope | Verified result |
|---|---|
| Four DOH diseases | 2,518,227 records; zero invalid onset/case-count or blank-province rows in this scope |
| Current Gold-equivalent DOH filter | 1,787 territory/disease/month records; 233,531 reported non-discarded surveillance cases |
| Four PAGASA stations | 11,688 daily rows; all 2,922 expected unique dates per station; no invalid/duplicate dates |
| Complete rainfall | 383/384 station-months; Ambulong January 2020 has fourteen missing rainfall observations |
| Other analytical measures | Ambulong sixteen days with a missing measure; Sangley one day missing temperature/humidity/wind; Daet and Tayabas complete |

Case totals sum **Number of Cases** under the current CONFIRMED, PROBABLE and SUSPECT_OR_COMPATIBLE classification rules. They are not unique patient counts, confirmed-only disease counts or population incidence. Missing province/disease months cannot be inferred zero.

Raw Dengue and Cholera include 2017 onsets, although the declared scope and Gold policy start in 2018. All four selected national files cover every month in closed years and January–September 2026. Provincial coverage varies substantially. Current Gold deliberately selects 2018–2025; partial 2026 remains excluded. PAGASA 2025 is absent. NASA POWER remains a separately labeled weather proxy.

PAGASA source wind is m/s; Silver correctly converts to kph. The older batch reports TMEAN; the newer batch uses a disclosed TMAX/TMIN midpoint. Missing -999 becomes null, and trace -1 rainfall becomes a disclosed lower-bound zero. Monthly means need metric-specific coverage flags because a complete rainfall month can contain incomplete temperature/humidity/wind observations.

## Joint coverage candidates

| Disease | Batangas / Ambulong | Camarines Norte / Daet | Cavite / Sangley | Quezon / Tayabas |
|---|---:|---:|---:|---:|
| Dengue | 83/84 | 84/84 | 84/84 | 84/84 |
| Leptospirosis | 47/84 | 50/84 | 73/84 | 55/84 |
| Cholera | 3/84 | 20/84 | 6/84 | 5/84 |
| Typhoid Fever | 74/84 | 67/84 | 81/84 | 75/84 |

These counts mean observed disease plus complete rainfall months during 2018–2024. They do not establish eligible SKU-sales pairs or approved clinical associations. Lagging and missing sales can reduce the usable sample further. Camarines Sur, Laguna and Marinduque still lack proposed stations. All seven external mappings remain pending.

Root-reported live SQL has 2,171 external signal rows: 1,787 DOH territory/disease/month records plus 384 weather territory/month records. Of the weather rows, 383 have complete rainfall and one is incomplete. Zero rows are join-ready or forecast-eligible. A distinct-month count needs provider/territory/disease grain; mixed signal rows do not form one continuous monthly series.

## Decision matrix

| Intended use | Present outcome | Required next evidence |
|---|---|---|
| Descriptive context | Provider-specific historical observations and explicit candidate coverage | Geography, classification and reporting-completeness review; clinical or causal claims remain unsupported |
| Historical forecasting | Company-revenue evaluation; conditional retrospective external experiments | Frozen common holdouts, origin-known availability, reviewed joins and train-only feature selection with baseline improvement |
| Current forecasting | Unpublished, with history ending December 2025 | Accepted 2026 sales, validated true leads, run/release evidence and publication review |
| Replenishment/order | Entered scenario allocation | Physical SKU/unit evidence, timestamped stock/on-order/reserve, lead times, costs, pack/MOQ/capacity, service/expiry rules and procurement review |

On 7 October 2026, a December 2025 origin makes October **lead 10**. October–December requires leads 10–12, the six-month window requires 10–15, and the twelve-month window requires 10–21. Display horizon cannot replace actual lead. Revenue forecasts cannot supply physical medicine units for EOQ or reorder points.

DOH supplies retrospective onset dates without historical release timestamps. A one-month lag alone does not prove availability at the forecast origin. Without release vintages, label the result revised-snapshot retrospective association. Future regressors need known, separately forecast or explicit scenario paths; realized future disease/weather cannot enter an earlier fixed-origin test.

## Confirmed local planning defects repaired

- **Missing inputs:** Blank, null and Boolean values previously became zero through numeric coercion. Planning-specific validators now reject them and preserve explicitly entered zero.
- **Currency:** Fractional cents previously rounded silently. Exact two-decimal cents parsing now rejects unsupported precision, and budget comparisons avoid unsafe multiplication for infeasible large requests.
- **Shortlist membership:** Repeated permitted labels could omit another required product. Each shortlisted product must now occur exactly once; malformed scope fails with the gateway's input-error contract.
- **Computation limit:** The 100,000-pack loop could report a completed allocation while affordable candidates remained. It now returns `not_solved` with no partial rows and an actionable computation-limit reason. A scenario finishing exactly at the boundary still succeeds.
- **Historical selection:** Latest-month and ranking queries now exclude open/future Manila months and order equal revenues deterministically.

Implementation is limited to the planning functions/import in `backend/src/databricksDashboard.ts`, the pure `backend/src/planningScenario.ts`, and `backend/tests/planningScenario.test.ts`. Greedy allocation, scenario disclosure and the existing successful response shape remain. The offline Python MILP is a different algorithm and its tests do not verify the live gateway.

Eight focused planning tests pass, backend no-emit TypeScript checking passes, and the gateway diff has no whitespace errors. Tests cover missing input semantics, exact membership, cents, unsafe infeasible requests, resource-limit and exact-boundary behavior, protected stock/minimum service, stale checksum and Manila month rollover. No live scenario, browser order action, warehouse write or forecast activation was performed by this supporting worker.

## Business sequence and useful KPIs

1. Keep observed descriptive finance and source coverage available. Review a useful high-value SKU cohort with catalog/invoice/package evidence independently of disease/weather sources.
2. Freeze an accepted company-revenue series and source/submission coverage. Compare mandatory naive baselines and candidate models on identical time-based keys. Show MAE, RMSE, WAPE, bias, sample count and interval support by origin and lead.
3. Ingest accepted 2026 sales. Validate current display windows at their true leads before making current operational forecast claims.
4. Review geography/station representativeness and disease-product clinical/business rationale separately. Evaluate DOH, PAGASA and NASA ablations under origin-known feature policies; retain context where incremental predictive value is absent.
5. Add timestamped SKU inventory position, supplier lead-time/receipts, quotes/MOQ/pack, costs, service policy and expiry inputs before claiming reorder points, stockout days, safety stock, EOQ or restock orders.

Useful outputs are observed and metric-complete months over an explicit calendar/provider/territory/disease scope; last accepted actual and months stale; true forecast lead and supported range; holdout error/bias/interval coverage; category versus identity/unit/forecast/transaction readiness; and per-product scenario fulfillment, unmet units, packs, spend, budget and constraints. Do not pool incompatible product units. Inventory KPIs remain unavailable until their governed inputs exist.

## Evidence

- Fresh local profile: `outputs/databricks_analytical_review_20261007/external_profile.json:7813`; twelve source hashes rechecked unchanged.
- Pending station proposals: `databricks/medshield_project/external_restart/03_external_gold.py:121`.
- Missing release dates: `databricks/medshield_project/external_restart/02_external_silver.py:136`.
- Disease-product rationale and approval: `docs/PRESCRIPTIVE_CLIMATE_DISEASE_MODULE.md:54`.
- External evaluation protocol: `docs/NORTH_STAR_EXECUTION_BLUEPRINT.md:415`.
- Operational scenario inputs: `docs/PRESCRIPTIVE_CLIMATE_DISEASE_MODULE.md:74`.
- Live allocation disclosure: `frontend/services/api/prescriptive-planning-runtime.ts:156`.
- Corrected planning helper: `backend/src/planningScenario.ts:11`; gateway wrapper: `backend/src/databricksDashboard.ts:999`.
