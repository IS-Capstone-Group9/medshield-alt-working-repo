# Capstone Paper Revision Guide

Last reviewed: 2026-10-07 (Asia/Manila)

Revise the paper from implemented evidence, not from older architecture or model plans.

## Chapter 1–3 model disposition — 7 October 2026

Accountable role: Business Analyst, with sequential Data Analyst assessment.
Source: [current supplied paper](../references/PRIVATE_SUMMER_CAPSTONE_2%20-%20GROUP9_ISB.pdf),
PDF pages 11–15, 91–107 and 113–118. Recommendations below are proposed scope
revisions, not an adviser decision or edits to the original PDF. The older chapter
files in `references/_extracted/` mostly contain contents entries; the full PDF
was extracted to inspect objectives, formulas and evaluation commitments.

The plan for this review was to identify the paper's actual commitments, compare
current source and version-bound evidence, specify retain/revise/defer decisions,
then define a reproducible completion denominator. No application, schema,
warehouse or model publication changes are part of this documentation review.

### Model-by-model recommendation and current evidence

I = a corresponding method family is implemented in the narrower scope stated.
P = a related evaluated model or scenario exists, but substantial promised behavior
is absent. N = no qualifying current delivery evidence for the promised task.
Legacy scripts, installed libraries and formula demonstrations do not qualify.
None of these labels implies original-scope acceptance or operational readiness.

| ID | Paper method / Chapter 3 section | Recommended disposition | Evidence status and remaining difference |
|---|---|---|---|
| M01 | Area encoding, 3.4.1.1.1.1 | Retain; disclose proposed/approved geography and Unknown | I: mapped area reporting exists; full geographic accuracy/ownership acceptance is open |
| M02 | Industry encoding, 3.4.1.1.1.2 | Revise into independent buyer sector and customer channel | I: Government/Private/Internal/Unknown sector logic exists; Hospital/Pharmaceutical are channels, not mutually exclusive ownership classes |
| M03 | STL, 3.4.1.2 | Retain as descriptive/diagnostic monthly decomposition | I: 72 company-revenue months, 2020–2025, verified against fact19; daily SKU/territory demand and automatic Prophet seeding are not delivered |
| M04 | 80/20 and concentration, 3.4.1.3 | Retain; include deterministic observed ABC | I: positive-sales rankings and ABC thresholds implemented; reporting labels are not approved SKUs and raw areas are not verified customer accounts |
| M05 | Prophet sales-only baseline, 3.4.2.1.1.1 | Retain as challenger alongside naive, seasonal-naive and ETS | P: company-PHP evaluation executed; accepted territory/SKU-unit forecasts and a promoted Prophet champion are absent |
| M06 | Prophet + disease/DII, 3.4.2.1.1.2 | Conditional retrospective experiment | N: no accepted origin-safe disease-feature forecast; context/OLS utilities are not this Prophet task |
| M07 | Prophet + weather/RSI, 3.4.2.1.1.3 | Conditional experiment; revise RSI to actual available input | N: no accepted external-feature forecast; observed rainfall cannot stand in for archived above-normal-rainfall forecast probabilities |
| M08 | XGBoost ABC classifier, 3.4.2.1.2.1 | Remove for current observed ABC; optional future-period/cold-start experiment | N: no current accepted classifier at the promised target; direct current ABC needs no learned approximation |
| M09 | XGBoost urgency, 3.4.2.1.2.2 | Defer until a measurable forward target exists | N: a model equation does not define urgency ground truth; sales-only priority does not prove stock urgency |
| M10 | MCDA, 3.4.3.1.1 | Retain commercial scoring and sensitivity; defer outbreak criteria | P: selected-period sales-value/active-coverage weighting exists; promised revenue/growth/outbreak weights and integration with allocation differ |
| M11 | LP allocation, 3.4.3.1.2 | Retain scenario allocation; use MILP if claiming optimal integer packs | P: active gateway is bounded greedy; offline Python has two-stage equal-fulfillment MILP, not the promised MCDA-weighted regional model |
| M12 | EOQ, 3.4.3.1.3 | Retain in literature; conditional scenario or future operational feature | N: ordering/holding costs, supported unit demand and evaluated current feature are absent |
| M13 | ROP, 3.4.3.1.4 | Retain conditionally with lead-time demand and inventory position | N: accepted supplier lead times, stock/on-order/commitments and operational trigger evaluation are absent |
| M14 | Safety stock, 3.4.3.1.5 | Retain conditionally; correct service-level versus expiry wording | N: lead-time uncertainty, service policy and validated stock simulation are absent |
| M15 | Collaborative filtering, 3.4.3.1.6 | Move to future work unless expansion recommendation remains essential | N: no accepted SKU-region recommendation evaluation; sparse sales cannot prove an item was unstocked |
| M16 | Disease procurement threshold alerts, 3.4.3.1.7.1 | Retain only retrospective evidence flags initially | N: no validated live disease-to-product procurement intervention; diagnostic residual flags are a different task |
| M17 | Typhoon contingency alerts, 3.4.3.1.7.2 | Remove unofficial Signal inference; defer to official bulletin/manual scenarios | N: no accepted official warning feed or tested contingency policy; proxy rainfall/wind does not certify a PAGASA declaration |

### Completion rate and denominator

Count the 17 named analytical tasks above equally, with area and industry encoding
separate, disease/weather extensions separate and the two alert mechanisms separate.
Do not count literature-only ARIMA/SARIMA reviews, architecture, CRISP-DM/SEMMA,
screens, catalog proposals or diagnostic question counts as additional models.

- Implemented corresponding families in revised/narrower scope: **4/17 = 23.5%**.
- Partial corresponding tasks: **3/17 = 17.6%**; not counted as complete.
- Tasks without qualifying delivery evidence: **10/17 = 58.8%**.
- Implementation/partial coverage together: **7/17 = 41.2%**; coverage is not completion.
- Recorded fully accepted end-to-end tasks at the original promised target:
  **0/17 = 0%**. This acceptance figure does not mean no engineering work exists.

These are evidence counts, not estimates of person-hours or overall capstone
completion. A tested company-revenue Prophet experiment cannot close an approved
medical SKU-unit forecast requirement. No defensible whole-capstone percentage
exists without an agreed weighted rubric covering data, system, analytics, paper
and acceptance. Do not rebase the denominator silently after scope removal.

### Corrections required in Chapters 1–3

1. Chapter 1 objectives 1–2 and scope: align historical coverage with 2017–2025,
   but specify actual modeling subsets independently. Replace fixed 3,631-SKU and
   ABC counts with version-bound reporting-label counts and approved SKU coverage.
   The current 4,561 labels are not 4,561 verified sellable products. Government
   59%/Hospital25% claims require reproducible, approved buyer/channel evidence.
2. Chapter 1 objective3: say evaluated forecasts at supported origins/leads, not
   guaranteed current December2026 territory demand. Company PHP and SKU units
   are separate targets. Quantity candidate history ending December2023 requires
   recency/lead evidence or newer observations before a current planning claim.
3. Chapter 1 objectives4–5: change demonstrated expiry reduction ≤5%, optimal
   procurement and live typhoon alerts to evaluated planning scenarios/future
   operational validation unless supporting stock, expiry and official alerts exist.
   Define any future wastage numerator, denominator, period and baseline explicitly.
4. Chapter 2: retain relevant literature on conditional methods, clearly distinguishing
   reviewed alternatives from selected, implemented and accepted models. K-Means,
   ARIMA and SARIMA mentioned in older drafts are not additional Chapter3 delivery
   commitments. Product category classification is also distinct from revenue ABC.
5. Chapter 3 STL/Prophet: use monthly supported history; full-history STL is not a
   leakage-safe forecast feature. Fit any feature/decomposition within each training
   window. Prophet does not receive STL components automatically through ordinary fitting.
6. Chapter 3 XGBoost: same-period revenue features predicting same-period ABC are
   circular/leakage-prone. A future ABC experiment must derive target bands from the
   future evaluation portfolio and use origin-known features only. Test low-history
   and unseen families separately; current cumulative bands remain deterministic.
   Define urgency as future unit movement or verified stockout risk before fitting;
   evaluate demand with forecast metrics and stockout risk with probability/ranking metrics.
7. Chapter 3 external features: compute DII normalization and lag selection inside
   training windows, handle zero denominators and missing surveillance, and preserve
   reporting vintages. The paper's 2021–2025 mean would leak the 2025 audit into
   2021–2024 training. Remove automatic DII>1 uplift and fixed RSI/alert multipliers;
   learned associations may be absent or negative. Avoid double-counting effects
   through regressors plus separate unvalidated post-forecast multipliers.
8. Chapter 3 allocation: reconcile text and mathematics. The printed `max Z=x+y`
   does not contain the promised MCDA weights. Supply one reviewed product-territory
   objective, compatible units and actual constraints. Never sum different product
   units as one physical supply/capacity quantity without a valid conversion.
   EOQ is an order policy quantity, not proof of available stock/supplier capacity.
9. Chapter 3 safety stock: Z represents a chosen service quantile under explicit
   assumptions, not a direct calibration guarantee for ≤5% expiry. Expiry needs
   shelf-life/lot/FEFO data and simulation. Spreading monthly means over days cannot
   establish daily demand variability or justify an empirical daily service guarantee.
10. Chapter 3 evaluation: use rolling origins and common targets for baselines and
    challengers; preserve the existing 2025 retrospective-audit label. Add WAPE
    where its denominator is valid, MAE/RMSE and bias; use MAPE only on justified
    nonzero targets. Targets below15%/20% are proposed thresholds, not achieved
    results. Last-value WAPE37.76% is not a Prophet MAPE score or completion rate.
11. Mapping validation needs reviewed accuracy and Unknown coverage, not merely
    non-null values. Alert evaluation needs independently defined event labels;
    a mean-plus-two-SD exceedance is not itself evidence of a procurement need.
12. Correct WeatherAPI/PAGASA wording: consume an official issued signal with its
    timestamp/province or label a manually entered scenario. Historical rainfall is
    not a live warning. Replace guaranteed stock doubling with approved scenario
    sensitivity and constraints. Future external regressors must be available,
    forecast separately or explicitly scenario-entered at the forecast origin.

### Implementation path if retained methods are pursued

| Gate | Owner | Deliverable and observable exit evidence |
|---|---|---|
| 1. Scope and target | Business Analyst + adviser/client | Agreed retained/conditional/future scope; exact target, unit, horizon, metrics and approval rubric |
| 2. Data readiness | Product/source/account owners + Data Analyst | Reviewed pilot SKU/unit/territory cohort, observation completeness and source/adjustment evidence; independent classification reference set |
| 3. Predictive evaluation | Data Analyst | Frozen input; origin-only preparation; naive/seasonal-naive/ETS/Prophet common-key rolling evaluation; errors/bias by lead; champion or explicit no-promotion decision |
| 4. External increments / optional XGBoost | Data Analyst + external reviewers | Accepted joins/vintages and future input policy; leakage-safe targets; improvement and coverage against sales-only/simple rules |
| 5. Operational inputs | Inventory/procurement/finance | Timestamped stock/on-order/commitments, lead times, costs, packs/MOQ, service and expiry policies |
| 6. Prescriptive delivery | Backend/Data Analyst + business owner | Reviewed MCDA objective and sensitivity; exact integer-pack solver if optimality claimed; feasibility/infeasibility and stock/cost/expiry simulation versus agreed baseline |
| 7. Publication and paper | Operator/QA + Technical Writer | Recovery prerequisites; same-release warehouse/API/UI/export acceptance; signed decisions; Chapters1–5 matched to actual methods and results |

Recommended first release: rule-based mappings, historical finance/diagnostics,
monthly STL, observed Pareto/ABC, a reviewed SKU-unit forecast comparison,
commercial MCDA sensitivity and transparent constrained allocation scenarios.
Keep operational EOQ/ROP/safety stock conditional on Gate5; treat external
regressors, XGBoost, collaborative filtering and live contingencies as separate
experiments rather than prerequisites for every descriptive screen.

Technical references: [Prophet extra regressors](https://facebook.github.io/prophet/docs/seasonality,_holiday_effects,_and_regressors.html),
[rolling-origin evaluation](https://otexts.com/fpp3/tscv.html),
[SciPy integer optimization](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.milp.html),
[official PAGASA wind signals](https://www.pagasa.dost.gov.ph/learning-tools/tropical-cyclone-wind-signal).
Local evidence: [current state](CURRENT_STATE.md), [analytics tracker](ROADMAP.md),
[actual predictive evaluation](../outputs/predictive_validation/2026-09-27T14-30-12-921Z/REVIEW.md),
[planning QA](../outputs/business_analytics_review_20261007/planning_final_qa.md),
[current greedy gateway](../backend/src/planningScenario.ts),
[offline MILP utility](../services/analytics_service/prescriptive_planning.py),
[commercial sensitivity](../frontend/services/api/dashboard-mcda.ts).

## Claims the paper may make

- MedShield is a historical pharmaceutical decision-support system.
- The runtime uses a Next.js frontend, TypeScript gateway, Databricks analytical source, and Supabase Auth/audit boundary.
- The current sales candidate covers 2017-2025 and contains 37,728 accepted fact rows for the checksum-bound replacement snapshot.
- PAGASA supplies official historical observations for 2017-2024; NASA POWER supplies a separately labeled provider proxy; DOH 2026 is partial.
- Descriptive sales evidence, deterministic Pareto/ABC, derived area/buyer prioritization, simple forecast baselines, and user-entered planning scenarios are implemented.
- Required Databricks failures fail closed without local/mock analytical fallback.

## Claims that require additional evidence

- Final/approved revenue, gross margin, SKU, medical-scope, buyer, or geographic definitions.
- A champion Prophet, XGBoost, disease-adjusted, or weather-adjusted forecast.
- A 2026 sales holdout or any 2026 MedShield sales actual.
- Proven causal disease/weather effects.
- Real EOQ, ROP, safety stock, stockout, expiry, supplier, purchase-order, or savings results.
- Live disease surveillance or official weather alerts.

## Chapter alignment

### Chapters 1-2

Frame the business problem as historical planning support. Literature can motivate seasonality, weather, disease, forecast evaluation, and inventory methods, but must not imply that every cited method is implemented.

### Chapter 3

Document:

1. immutable Bronze, assessed Silver, candidate Gold, and SQL bridge flow;
2. source coverage and candidate publication gates;
3. metric eligibility and business definitions;
4. derived/estimated mapping and contract-allocation provenance;
5. rolling-origin predictive validation against simple baselines;
6. scenario-based prescriptive methods when operational inputs are absent;
7. human review and fail-closed system behavior.

### Chapter 4

Use current screenshots and reproducible evidence for architecture, pipeline results, data quality, dashboard behavior, and executed tests. Every table should state dataset ID/version, period, population, status, and run date.

### Chapter 5

Interpret validated descriptive findings and forecast comparisons. State whether external features improved the baseline. Explain candidate/mapping limitations and the absence of real inventory/procurement inputs. Recommend future operational validation without describing it as completed.

## Terminology

| Use | Avoid |
|---|---|
| transaction gross margin/profit | company net profit |
| candidate Gold publication | certified production truth |
| derived buyer/geography mapping | observed ownership/location when absent from source |
| NASA POWER weather proxy | official PAGASA replacement |
| baseline forecast evaluation | approved forecast/champion model |
| planning scenario | purchase recommendation/order |

Use [CURRENT_STATE.md](CURRENT_STATE.md), [REQUIREMENTS.md](REQUIREMENTS.md), and [IMPLEMENTATION.md](IMPLEMENTATION.md) as the paper's technical baseline.
