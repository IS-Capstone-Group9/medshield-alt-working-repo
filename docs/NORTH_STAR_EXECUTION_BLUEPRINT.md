# MedShield North Star Analytics Execution Blueprint

> **Status: governed delivery plan.** Last reviewed 2026-09-27. This document describes the path from the current candidate system to approved descriptive, predictive, and prescriptive analytics. For implemented facts, use [CURRENT_STATE.md](CURRENT_STATE.md). The detailed predictive implementation plan below records proposed work, not completed training or publication.

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

Use the model-artifact states defined in [MODEL_LIBRARIES_AND_ORCHESTRATION.md](MODEL_LIBRARIES_AND_ORCHESTRATION.md):

    draft -> validated -> review_required -> published -> superseded

`rejected` records an unsuccessful review. Acknowledgement and measured business outcomes are separate operational events, not substitutes for model publication approval.

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
4. advanced forecasts beat an approved baseline on held-out periods; when none qualifies, the baseline remains explicitly identified as baseline evidence rather than a successful advanced model;
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

## Predictive implementation plan — 27 September 2026

### Implementation milestone record — active delivery

Monthly-refresh follow-up — done: all 15 configurations completed both schedules
with 720 observations. Monthly updates improve no configuration's WAPE on the
same 24 development targets (14 worsen; seasonal-naive unchanged). Lowest monthly
WAPE is mean-6 at 69.41%, versus its 60.08% annual fixed-origin comparator.
25 Python tests passed; all 360 annual comparator points exactly reproduce the
original run and both runs' artifact hashes verify. No 2025 fitting/scoring or
publication change. See
`outputs/predictive_validation/2026-09-27T14-30-12-921Z/monthly-experiment/REVIEW.md`.
Next dependency: source-owner invoice/order and preparation-rule reconciliation
for the GOVERNMENT-labelled movements; available historical metadata does not
establish current source linkage. Keep unpublished. The ready record below is
the protocol plan recorded before execution, now completed as described here.

Monthly-refresh follow-up — ready: Orchestrator accountable, Data Analyst
implementation responsibilities performed sequentially. Scope: offline predictive
experiment, focused tests and documentation only. Plan: freeze protocol before
execution; compare the existing 15 configurations on January 2023–December 2024
targets with monthly one-step origins versus preceding-December fixed origins;
verify no target/future leakage, complete common keys and missing-month rejection;
run and record results. This is development exploration informed by the inspected
2025 audit, not an untouched evaluation or release-selection replacement. Preserve
2025 outside model inputs and scores. No schema, API, auth or publication changes.
Available composition reconciles recorded revenue but does not establish original
invoice/order timing or the cause of changes. Next dev/backend processes are active;
no production build is planned. Acceptance: reproducible hashed protocol/results,
all 24 targets accounted for, focused checks passing and suitability limits recorded.

Error diagnosis follow-up: accountable role Data Analyst, scoped to offline
diagnostic scripts/artifacts and read-only composition extraction. Plan: preserve
the frozen run, inspect error by origin/lead/target, reconcile pinned source-label
and provenance contributions, test calculations, and record suitability conclusions.
No model tuning, release activation or schema change is part of this diagnosis.

Diagnosis completed: pinned version-16 composition reconciles to frozen monthly
counts and eligible revenue. Three audit months contribute 47.9% of absolute
error; the largest changes are concentrated in the raw GOVERNMENT source label.
Short leads remain inaccurate (55.07% audit WAPE at leads 1–3), and the lower
audit WAPE accompanies larger peso MAE. Source attribution is not causal proof
or verified SKU demand. Findings and next evaluation gates are recorded in
`outputs/predictive_validation/2026-09-27T14-30-12-921Z/diagnosis/FINDINGS.md`.

Latest continuation result: user-attested training acceptance is now recorded;
all 15 benchmark/ETS/Prophet configurations executed on the frozen schedule. Last
value remains selected from development only (83.20% development WAPE, 37.76%
2025 retrospective-audit WAPE). Neither challenger family qualifies. Intervals
remain null for insufficient per-lead support. Recommendation: keep unpublished
because absolute errors are high; no business/model approval is inferred.
See `outputs/predictive_validation/2026-09-27T14-30-12-921Z/REVIEW.md` for actual
results, environment, validation and next actions. Latest checks: 21 Python tests,
15 gateway tests and backend typecheck passed. Candidate Databricks persistence
passed full content readback: 1,092 prediction/backtest rows and 15 evaluations,
without changing the release pointer. Older blocked-run entries below
describe the earlier checkpoint and are superseded for training/evaluation only.

Continuation: the requesting user confirmed complete 2020–2025 monthly submissions
and authorized the best engineering decision, citing the sales data. Recorded this
as **user-attested training acceptance, not independent completeness verification**,
with publication approval still false. The source-bound receipt is
`outputs/predictive_validation/coverage-review-v16/coverage-review.user-attested.json`.
Plan: validate the decision contract, re-extract the pinned input, install Prophet
in an isolated modeling environment, execute the frozen development/audit schedule,
then inspect results before any model publication decision. No running project
development processes were observed at the start of this continuation.

Accountable role: Orchestrator. Existing descriptive/catalog edits are preserved;
backend and Next.js development servers were observed running. No frontend
production build will share their `.next` directory.

1. P0 implemented: fixed-origin benchmarks, exact common keys, bounded/pinned
   extraction, Unknown isolation, missing values, evidence-only charts and CSV.
   Twelve focused gateway checks and four isolated browser checks pass. Live API
   verification passed after correcting a Spark DISTINCT ordering error and
   removing unnecessary enumeration of unapproved raw SKU labels.
2. P1 frozen input collected: 37,728 source rows, 108 calendar months, 98 observed
   months, month/year cents reconciliation passed against fact version 16 and the
   checksum-bound descriptive receipt. Training eligibility is blocked because
   reporting completeness and training approval are absent.
3. P2 implemented and P3 adapters prepared: 20 Python checks passed including
   known metrics, leakage, candidate selection, intervals and review drafts.
   Actual controlled run is blocked, with empty prediction/model-card artifacts.
   No actual ETS/Prophet comparison or champion is claimed; Prophet is unavailable
   in the local environment. These remain incomplete P3 acceptance items.
4. P4 prepared and partially deployed: SQL contracts, frozen-input notebook, coherent release
   reader, UI adapter, artifact-bound staged publication/readback and rollback
   procedure. Type checks pass. Nine additive DDL statements and 108 frozen
   candidate-input rows passed live content readback; the release pointer is empty.
   Model-run persistence, activation and rollback remain unverified because no
   eligible reviewed model run exists. No model publication was performed.

Observed gate: the version-16 descriptive receipt is technical candidate evidence,
not business approval; no accepted monthly reporting-coverage receipt has yet
been found. Do not claim model training or publication approval from it. Next:
obtain a version-bound coverage/training decision, rerun the frozen-input workflow,
evaluate the candidates and review the exact release artifact before activation.
Independent local implementation is available in [PREDICTIVE_OPERATIONS.md](PREDICTIVE_OPERATIONS.md).

Live exploratory evidence (not a verified-completeness holdout): train through
December 2024 and evaluate January–December 2025 on twelve identical keys.
WAPE: last value 37.7636%, seasonal naive 72.8909%, recent mean 3 months 59.6283%,
recent mean 6 months 68.1368%. Last-value MAE ₱5,834,383.00, RMSE ₱6,956,031.72,
signed bias +₱1,295,235.42. This single retrospective comparison does not select
the controlled offline champion. All future points and intervals remain unavailable.
Evidence directory: `outputs/predictive_validation/2026-09-27T08-56-19-553Z/`.

Acceptance ledger (fixture passes are not cloud/accuracy claims):

| Criterion | Result | Evidence / remaining dependency |
|---|---|---|
| Source version/count/month/year reconciliation | Passed | Live `input.json`, `reconciliation.json` and SHA-256 |
| Missing, zero, partial coverage distinctions | Passed | Frozen input contract and Python/gateway tests |
| Accepted training/reporting population | Not verified | Source-bound owner completeness/acceptance receipt required |
| Fixed-origin and temporal leakage prevention | Passed | Python and actual TypeScript tests |
| Common-key comparisons and known-answer metrics | Passed | Exact key intersection tests and 12-key live benchmark |
| Lead/calendar/future-year handling | Passed | Python, gateway and browser contracts |
| Sector/product scope isolation | Passed | Unknown gateway test; unapproved scope blocked |
| Intervals and insufficient support | Passed | 20/40 per-lead rules, null support and UI tests |
| ETS/Prophet actual results and final selection | Not verified | Training gate; Prophet package unavailable |
| Run/provenance consistency and interrupted staging | Passed locally | Reader/publisher tests; no pointer update after injected interruption |
| Auth and malformed filters | Passed live | Anonymous 401 and authenticated repeated-filter 400 |
| Warehouse outage behavior | Passed locally | Gateway/reader injected outage checks |
| Chart/table/export parity | Passed locally | Four browser tests including published-adapter fixture |
| Cloud DDL and frozen input persistence | Passed | `warehouse-receipt.json`: 9 DDL statements, 108 content-reconciled rows |
| Cloud model persistence/publication/rollback | Not verified | Reviewed eligible model artifact required; pointer empty |
| Conditional SKU/territory/external models | Not verified | Separate mapping, unit, coverage and approval gates remain |

The final isolated live full-dashboard rerun passed in 37.3 seconds and the
authenticated API check passed after deployment in 21.2 seconds, including the
v2 reader's unpublished state. Earlier combined attempts hit
dashboard-readiness timeouts while development files were changing; those failed
attempts are retained as limitations, not silently counted as passes. The final
live screenshot was visually inspected. No production build ran against `.next`.

### Delivery contract

The first deliverable is a reproducible monthly **recorded net-sales revenue forecast**, with truthful baseline comparisons, evaluation results and uncertainty. Eligible product-unit forecasting follows when identity, packaging, transaction evidence and forecast permissions exist. Revenue is a commercial planning measure; it cannot be renamed medicine demand or used as units in inventory formulas.

The accountable role is **Orchestrator**. Data Analyst owns target definitions and evaluation; Database Engineer owns frozen marts and output contracts; Backend Engineer owns gateway integration; Frontend Engineer owns display/export behavior; QA Engineer owns acceptance evidence. These are responsibilities, not claims that implementation workers are already running.

This planning change does not train a model, alter the running services, deploy notebooks, or activate a publication. The workspace already contains unrelated descriptive/catalog work. Implementation must inspect that work again, preserve it, and coordinate shared files before edits.

Expected example: a reviewer selects company revenue and a three-month window, sees the exact model/run, actuals through the accepted cutoff, predictions for the requested months, available prediction intervals, and MAE/WAPE/bias measured on named historical windows. Missing coverage, unapproved scope or an unsupported forecast lead produces a reason, not a manufactured value.

### 1. Verified starting point and prerequisite repairs

Evidence inspected includes current canonical documents, the version-16 [descriptive receipt](../outputs/descriptive_validation/2026-09-27T06-41-37-034Z/evidence.json), and the current gateway, Python evaluator and forecast runtime source. Receipt observations are evidence of that saved run, not a fresh cloud validation in this planning task.

| Finding | Implementation consequence |
|---|---|
| Current receipt identifies 37,728 accepted fact rows, sales during 2017–2025, and ten missing historical months | Bind the input to its dataset hash, Delta version and policy; never hardcode the row count as a permanent invariant |
| The contiguous STL segment is January 2020–December 2025, 72 months | Start profiling this segment for seasonal forecasts; having transactions in every month does not prove complete source submissions |
| No approved medical product identities exist in the current catalog review | Build aggregate revenue evaluation first; return `blocked` for canonical medicine demand until its separate gates pass |
| `frontend/services/api/forecast-validation-runtime.ts` contains synthetic Prophet scores, fallback metric values and sine/cosine disease/weather overlays | Remove these from the live predictive UI before introducing model results; show only models and evidence actually returned by the gateway |
| `backend/src/databricksDashboard.ts` evaluates last-value predictions using each prior month's actual, but describes a fixed training cutoff | Make fixed-origin and rolling one-step evaluation separate named protocols; never compare their scores as equivalent |
| The gateway uses the minimum of two sample counts as “common” coverage | Compute the actual intersection of `(series, origin, target, lead)` keys and report missing predictions per model |
| Forecast SQL can turn ineligible values into zero, has a 150-period result bound, and lacks a closed-period filter | Preserve unknowns, exclude open/future actuals, and replace silent truncation with bounded pagination plus count reconciliation |
| Forecast `Unknown` sector currently falls through to the unfiltered branch | Use the governed mapping contract and test disjoint sectors; `Unknown` must never mean `All` |
| Forecast browser tests create legacy Python fixtures and currently expect a Prophet label | Add tests of the actual TypeScript contract and remove assertions that legitimize invented results |
| Older Python jobs read local historical artifacts; `evaluate_prophet_xgboost.py` uses simulated rainfall and preprocessing before its split | Do not use those scripts as the production training entry point; reuse reviewed pure helpers only |

The prototype evaluator also forms test-period lag features from observed test values. That can describe a rolling one-step experiment, but does not prove a fixed-origin multi-month forecast. Centered smoothing/full-series outlier detection must not influence either the training fold or held-out truth.

### 2. Forecast scope and calendar semantics

| Order | Target and grain | Eligibility | User-facing interpretation |
|---|---|---|---|
| A | Eligible recorded net sales, company × calendar month, PHP | Exact accepted descriptive financial population and closed reporting periods | Commercial revenue forecast; all permitted categories/services remain in financial scope |
| B | The same measure, approved territory or buyer sector × month | Mapping version accepted; coverage and reconciliation proven for that slice | Territory/sector revenue forecast; mapping provenance visible |
| C | Fulfilled source-unit quantity, approved SKU × month; then SKU × territory × month | Physical item, approved identity/packaging/unit/forecast scope, eligible observed or independently verified detail | Fulfilled-demand forecast in the approved unit; lost/unmet demand remains unobserved |
| D | Disease/weather-augmented C, or a separately approved commercial target | Approved external joins and historical availability, adequate overlap, baseline improvement | Conditional forecast; associations are not causal or clinical claims |

Preserve the approved UI convention: 3, 6 or 12 calendar months beginning in the current **Asia/Manila** month. Store the training cutoff separately from the display window. Every point has `origin_period`, `target_period`, and `lead_months`; `display_horizon_months` is not a model lead.

Concrete current example: if the accepted last actual is December 2025, September 2026 is lead 9. September–November 2026 requires leads 9–11, September 2026–February 2027 requires 9–14, and September 2026–August 2027 requires 9–20. January–August 2026 must not be filled with invented actuals. Initially validate leads 1–12; leads beyond the validated maximum remain explicitly unsupported. A requested 12-row window may therefore contain unavailable forecast rows. Extend to leads 13–20 only through separate backtesting and uncertainty evidence, or ingest accepted 2026 actuals to reduce the gap.

Derive the maximum historical month from the accepted snapshot and period-close record, not the year 2025 or the system clock alone. New 2026/2027 and later accepted history must work without code changes. Forecast freshness displays the last actual period and lag; do not present a stale historical model as current operational stock guidance.

### 3. Build the training-data contract

Add a versioned `mart_forecast_monthly_candidate` in Databricks, initially one company-revenue series. Proposed uniqueness is `(dataset_id, fact_delta_version, mapping_version, series_id, target_name, period)`; unit, scope and evidence policy are part of series identity. Add scope-specific marts only after their eligibility is satisfied.

Required fields:

- Identity: dataset/source hashes, fact and transformation versions, catalog/geography versions, series ID, target, currency/unit, grain and filter scope.
- Time: period, `period_closed`, submission/coverage status, last observed date, accepted-data timestamp and extraction timestamp.
- Values: target value, positive sales, signed returns, eligible/excluded row counts and amounts, source-record lineage reference.
- Evidence: original/adjusted/independently verified counts and shares, quantity/identity/forecast permissions, missing reason and exclusion reason.
- Eligibility: `eligible_for_evaluation`, `eligible_for_publication`, and explicit blockers. Data status and model-review status remain separate.

Rules:

1. Use the exact accepted financial population and `net_cost`/Gold `net_sales` semantics. Reconcile by month and year to the pinned descriptive release before training. Do not copy legacy `total_trade_price` revenue assumptions.
2. Preserve actual signed returns. A negative net-revenue month is valid if reconciled; do not apply a positivity transform or floor to that target silently. Quantity demand and returns require a separately documented policy.
3. An absent month, an ineligible measure and a confirmed zero-activity month are distinct states. Only a complete, accepted coverage record can justify zero activity; an empty transaction group alone cannot.
4. Keep 2017–2019 available for profiling and sensitivity analysis. The missing months are 2017-05/06/07/08/10, 2018-01/02 and 2019-10/11/12. Do not interpolate them into training truth or score them as zeros.
5. Preserve adjusted-source attribution. Reconciled contract revenue does not verify its child SKU identities or quantities. Report sensitivity by evidence stratum; an exclusion changes the target population and must not masquerade as a comparable company total.
6. Reuse the current catalog contract, including independent category, identity, unit, transaction-evidence and forecast permissions. A Medical category by itself does not enable medicine forecasting. Unmapped areas remain explicitly unmapped.
7. Snapshot extraction is read-only, count-reconciled and checksum-bound. Frozen local extracts may be job inputs/evidence, but are never browser/gateway analytical fallbacks. Record source cutoff and snapshot availability to distinguish retrospective evaluation of revised data from a reconstruction of information actually available at that time.

Exit evidence: a manifest, data-quality report, eligibility-by-series table, excluded-population report, and exact monthly/yearly reconciliation. Full final training requires the accepted dataset/version and target scope; contract code and fixture tests can be built before that acceptance.

### 4. Implement the model ladder

Use one small offline package under `services/analytics_service/predictive/`, a controlled job entry point, and Databricks publication. Keep Flask and model training outside dashboard requests. Pin the resolved Python/package versions and record seeds, configuration and code identity, including a dirty-tree/diff hash when applicable.

| Model | Proposed initial configuration | Inclusion rule |
|---|---|---|
| Last observation | Repeat the final training value for every lead from a fixed origin | Mandatory benchmark; no reading of later actuals within the forecast block |
| Seasonal naive | Repeat the latest training observation for the matching calendar month, period 12 | Mandatory seasonal benchmark where history/reference months exist |
| Recent mean | Training-only mean over 3 or 6 months, selected on development folds | Low-cost benchmark for unstable monthly revenue |
| Exponential smoothing | Additive seasonality, period 12; no trend or damped additive trend | Classical challenger on eligible contiguous history; supported by the existing statsmodels dependency |
| Prophet, sales only | Monthly dates; weekly/daily seasonality disabled; restrained yearly Fourier order 3; additive model | First advanced challenger, not an assumed winner |
| XGBoost regression | Pooled eligible series; origin-known lags 1/2/3/6/12, shifted 3/6/12-month statistics, month encoding and stable series attributes | Later challenger only when adequate eligible panel history exists; do not fit thousands of tiny raw-label models |

Proposed Prophet search: changepoint prior `{0.01, 0.05, 0.1}` × seasonality prior `{0.1, 1, 10}` with a fixed seed and bounded compute. Keep the grid frozen before final evaluation. Evaluate a documented recent-history training window against expanding history on development data only if the profile shows a structural change. Do not erase sales surges as statistical “outliers” without source error evidence.

Seasonal challengers initially require at least 36 contiguous eligible training months; 24–35 months permit benchmark evaluation, while shorter series return insufficient-history or a separately validated pooled fallback. These are proposed engineering defaults, not a finding that every SKU is ready. True intermittent demand is profiled separately and can later justify Croston/SBA/TSB comparison after valid zeros and units are established.

For XGBoost multi-step forecasts, prefer a direct horizon-specific target with features frozen at the origin. Any recursive alternative must feed its own predictions into unknown lags. No test actual may enter a lag for a forecast made earlier. Feature selection, scaling, imputation and hyperparameter tuning occur inside training folds.

Keep deterministic ABC/Pareto as descriptive analytics. A future-quarter ABC classifier is a separate optional model: label from next-quarter positive-sales contribution over a fixed eligible SKU population; use only origin-known features; compare with persistence/current ABC using macro-F1, balanced accuracy, class recall and confusion matrices. Purge overlapping future-label windows between train and validation. Do not call that prediction stock urgency or dead stock.

### 5. Validation and uncertainty contract

Use calendar-based rolling origins, not shuffled transaction rows. Each fold stores its exact training population, cutoff, target months and feature availability. All model comparisons use identical eligible target keys and report both scored and missing counts.

Proposed first schedule, conditional on accepted monthly coverage:

| Purpose | Training/cutoffs | Evaluation |
|---|---|---|
| Development and bounded tuning | Initial January 2020–December 2022 training; quarterly origins December 2022 through December 2023 | Each origin predicts leads 1–12, with all targets ending by December 2024 |
| Final audit holdout | Freeze recipe, selected candidate and thresholds using only pre-2025 evaluation; fit through December 2024 | January–December 2025, fixed origin, plus reports for leads 1–3, 1–6 and 1–12 |
| Final artifact | Refit the accepted recipe through the latest accepted closed month | Future leads only within the validated range; no further tuning on the audit holdout |

2025 is a full-year holdout only after coverage is proven for the chosen target and slice. Otherwise, choose and record complete rolling windows within trusted history; label final-holdout evidence unavailable. If 2025 already influenced model tuning, record it as a retrospective audit, not an untouched test set. Do not tune repeatedly on the same audit result and continue calling it independent.

Report:

- MAE and RMSE in PHP or the approved quantity unit.
- WAPE = `100 × sum(abs(prediction - actual)) / sum(abs(actual))`; zero denominator returns unavailable with a reason.
- Signed bias = `mean(prediction - actual)` and normalized bias = `100 × sum(prediction - actual) / sum(abs(actual))`.
- Errors by origin, lead, year, series, approved territory/sector and evidence stratum. Show sample count and common coverage next to every score.
- Seasonal MASE only when its training-only scaling denominator is defined. MAPE, if retained, must be computed directly on eligible nonzero actuals with its exclusions shown; it cannot be a scaled WAPE.
- Change-point/source-policy and 2025 performance separately. A pooled score must not hide deterioration in the recent, much larger sales regime.

Proposed promotion thresholds, to be frozen with the target owner before evaluating the final holdout: at least 5% relative WAPE improvement over the best eligible simple benchmark, absolute normalized bias at most 10%, and no more than 10% relative deterioration in MAE/RMSE or an accepted critical horizon. Require complete expected predictions on eligible evaluation keys. These are initial engineering criteria, not promised accuracy or existing business approval. If benchmark error is zero, a challenger cannot claim percentage improvement; prefer the benchmark unless separately justified. If no challenger passes, retain the measured baseline as the champion candidate or mark the scope unsuitable for publication.

Prediction intervals must be generated from actual model/evaluation evidence. Evaluate nominal 80% and 95% intervals with held-out coverage, average width and interval score. Train/calibrate only on errors whose targets were available before the applicable cutoff. Initial conservative support rules: at least 20 out-of-fold errors for an 80% empirical band and 40 for a 95% band at the relevant lead, with sample counts displayed. Insufficient support returns a null band and reason. Do not reinterpret a 90th-percentile historical absolute error as a validated 95% interval. Overlapping temporal errors are dependent; empirical coverage is evidence, not a distribution-free guarantee. Pooling leads/series requires an explicit calibration policy and separate validation.

### 6. Disease and weather experiments

Run this workstream after sales-only evaluation and approved joins. It is not required to deliver the first revenue forecast.

1. Version the mapping from sales territory to DOH geography, PAGASA station and NASA coordinates. Include unmatched coverage, representation limits and reviewer evidence. Never broadcast a national/provincial count into every sales territory as independent evidence.
2. Create monthly features with `event_period`, `available_at`, source/provider, revision/vintage and mapping version. At origin `t`, use only observations available by `t`. If historical release vintages are unavailable, label the experiment retrospective association and do not claim real-time forecast performance.
3. Start with raw disease-specific counts and lagged 1/2/3-month signals, plus rainfall/temperature summaries. A proposed DII is a within-disease/territory standardized monthly count, `(cases - training_mean) / training_standard_deviation`; a proposed rainfall anomaly compares rainfall with the training-only mean and standard deviation for the same calendar month. These are candidate statistical features, not approved official indices. Require at least three prior observations of that calendar month for the rainfall normalization; undefined/zero-variance denominators remain unavailable. Fit all normalization on the training window only and freeze formula, units and minimum history before a run. Annual/partial disease totals must not be fabricated into monthly cases.
4. Compare sales only, sales + DOH, sales + PAGASA, sales + NASA, then a justified combined model, using the same target periods and eligible population. Compare PAGASA on its actual 2017–2024 coverage. Do not present a different-window score as an improvement over the 2025 sales-only holdout.
5. Future regressors require a known, separately forecast or explicitly assumed path. A lag available for lead 1 may be unavailable for lead 6. Use separately forecast signals with propagated uncertainty, a labeled scenario, or mark the lead unsupported; never join realized future weather/disease into a historical forecasting test.
6. Keep PAGASA official history, NASA proxy history and DOH partial 2026 context distinct. Retain only features demonstrating incremental out-of-sample value. Coefficients/feature contributions describe association, not disease-caused medicine demand.

### 7. Databricks model-output contract and publication

Implement version-controlled Databricks DDL/notebooks alongside the existing warehouse workflow. Proposed objects are new, not existing production tables:

| Object | Grain / purpose |
|---|---|
| `mart_forecast_monthly_candidate` | Frozen input series × target × month × dataset/mapping version |
| `fact_forecast_run_candidate` | One immutable model/configuration run with input/code/environment hashes, cutoff, target, fold specification, metrics summary and artifact checksum |
| `fact_forecast_point_candidate` | Run × series × origin × target month; prediction, lead, interval levels/bounds/support, and row role: backtest or future |
| `fact_model_evaluation_candidate` | Run × fold × slice × lead/horizon; actual sample counts, common-key checksum, metrics and interval results |
| `fact_model_review` | Append-only review/decision records tied to exact run, dataset, scope, policy and reviewer |
| `model_release_manifest` | One release identity selecting a coherent approved set of run IDs and compatible input versions |
| `vw_dashboard_forecasts`, `vw_dashboard_model_evaluation` | Stable gateway shapes resolved from one release manifest; drafts exposed only in an explicitly permitted review path |

Use primary-key/uniqueness checks, decimal-preserving source reconciliation, finite-value and interval-order validation, and non-null provenance. Record actual business approvals separately from automatic technical validation. Reconcile manifest counts/checksums before activating a release. Use one publication pointer update after all objects validate, rather than independently choosing the latest row from each table. Failed jobs never move the pointer. A rollback selects a previous compatible approved manifest and records the action.

The runtime reader must verify publication status, target/scope, expected run identity and compatible input versions. If the historical chart uses a newer descriptive release, display that difference explicitly or reject the combination; never silently attach new actuals to old evaluation metrics. Historical published runs can remain inspectable with their recorded versions. Staleness is visible; a Databricks outage still produces unavailable rather than a local fallback.

### 8. Gateway and dashboard integration

Preserve `/api/sales/forecast-validation` as a clearly labeled benchmark/evaluation route during migration. Replace its inconsistent evaluator with tested semantics, then make it a reader/adapter for persisted evidence where possible. Extend existing `/api/forecasts` and `/api/model_evaluation` additively for real published outputs rather than inventing a parallel runtime. Define a typed metadata envelope or a new versioned route if existing array consumers require it; document compatibility in `API.md`.

Required query dimensions: stable series/scope ID, target, approved territory/sector/product ID, run/release, display start and 3/6/12-month window. Reject repeated/structured/malformed values. A raw label never proves canonical SKU eligibility. Date/year validation remains dynamic. Cache keys include scope, run/release, model, target and all date/filter dimensions; invalidate on publication changes. Reject or clearly disable unsupported UI slices instead of showing an unrelated aggregate model.

Required response metadata: `schema_version`, release/run/model IDs, publication status, target/unit, dataset/fact/mapping versions, training period, last actual, display window, validated maximum lead, selected protocol, metrics, missing reasons, interval definition and limitations. Distinguish successful empty scope, ineligible scope, no published model and warehouse failure. Keep authentication before validation and preserve the existing error contract unless a documented version change is necessary.

The screen will contain:

- Forecast chart: observed history, historical backtests and future predictions as separate series; gaps remain gaps; supported uncertainty shaded and labeled.
- Comparison table: actual baseline/challenger metrics, identical-window coverage, relative improvement and explicit selected/rejected reason.
- Diagnostics: residuals over time, error/bias by lead and territory, seasonal/trend components only when actually produced by that model, and the latest-source freshness status.
- Readiness panel: blocked product/unit/external mappings with specific reasons and unresolved revenue/series coverage.
- CSV export: the same displayed points plus units, origin/lead, model/run/version, status and interval evidence. No hardcoded “Prophet” label for a baseline export.

Source names and model details belong in concise labels and an expandable methodology panel. Use the existing Chart.js/runtime architecture. Register each new inline handler in `DASHBOARD_GLOBAL_HANDLERS` and bridge it to `window`; preserve the sidebar indicator CSS rules and real UTF-8 currency characters.

### 9. Implementation files and ownership

Paths labeled “new” are proposals; others already exist. Avoid turning the large legacy model scripts or gateway file into a second modeling framework.

| Owner | Files/components | Work |
|---|---|---|
| Frontend Engineer + QA | `frontend/services/api/forecast-validation-runtime.ts`, `frontend/e2e/forecast-validation.spec.ts` | First remove synthetic claims and test that unavailable metrics stay unavailable |
| Backend Engineer | `backend/src/databricksDashboard.ts`, new `backend/src/forecastValidation.ts`, new `backend/tests/forecast-validation.test.ts` | Correct scope/closed-period/null handling; pure fixed-origin benchmark evaluator and tests; retire duplicate logic after persisted evaluation is adopted |
| Database Engineer | New `databricks/medshield_project/07_forecast_marts.py`, new `08_forecast_publication.sql`; existing Gold/catalog contracts | Frozen mart, model-output DDL, coherent publication and rollback checks; do not overwrite the sales/STL release |
| Data Analyst | New `services/analytics_service/predictive/{contracts,calendar,baselines,features,backtest,metrics,intervals,candidates}.py` | Shared calendar/eligibility interfaces, evaluators, candidate adapters, honest unsupported states |
| Data Analyst + Backend Engineer | New `services/analytics_service/jobs/run_predictive_evaluation.py`; new `backend/scripts/extract-predictive-input.ts` and `validate-predictive.ts` | Read-only pinned extraction, reproducible offline evaluation, output manifest and independent warehouse/API reconciliation |
| Backend Engineer | New `backend/src/predictivePublication.ts`; existing `server.ts`, `snapshot.ts`, `databricks.ts` | Published-view reader, typed response adapter, authentication, bounded filters and version-aware caching |
| Frontend Engineer | Existing API types/runtime/engine and forecast/model dashboard components | Connect only persisted evidence, display diagnostics and implement export/filter/loading/error states |
| QA Engineer | New `services/tests/test_predictive_contract.py`, `test_predictive_backtest.py`, `test_predictive_publication.py`; gateway tests; new `frontend/e2e/predictive-publication.spec.ts` | Temporal leakage, parity, publication, permission and UI contract tests |
| Owning implementers | `CURRENT_STATE.md`, `ANALYTICS.md`, `API.md`, `DATABASE.md`, `TESTING.md`, model/publication runbooks | Update implementation claims only when corresponding code and evidence exist |

A small TypeScript benchmark during migration does not become a second training service. Share deterministic JSON contract fixtures with the Python evaluator and prove semantic parity; final model/evaluation outputs are computed offline and read from Databricks.

### 10. Ordered delivery and dependencies

Effort estimates below are engineering person-days, not calendar promises. They exclude time waiting for business/source review and assume access to the existing configured warehouse and a supported Python environment. Re-estimate after the mart profile.

| Stage | Owner | Deliverable and exit gate | Estimate |
|---|---|---|---:|
| P0. Evidence repair | Backend + Frontend; Orchestrator accountable | Remove invented forecasts/metrics/signals; correct evaluation/filter/calendar semantics; tests demonstrate truthful behavior | 2–3 |
| P1. Frozen training inputs | Database + Data Analyst | Versioned mart/manifest, null/zero policy, target scope and exact reconciliation; accepted input gate for final training | 2–3 |
| P2. Baseline engine | Data Analyst + QA | Fixed-origin rolling evaluation, identical-key comparisons, metric and interval tests, reproducible baseline evidence | 2–3 |
| P3. First challengers | Data Analyst | Bounded ETS/Prophet comparisons, final audit evidence, model cards and baseline/challenger selection reason | 2–4 |
| P4. Publish and display | Database + Backend + Frontend | Candidate warehouse outputs, review flow, coherent release, real UI/export, rollback and outage tests | 3–4 |
| P5. Acceptance | QA + Orchestrator | End-to-end receipt, auth/negative paths, operational runbook and scoped owner review | 1–2 |
| P6. Expand eligible scope | Data Analyst + data owners | Approved territory/SKU series, optional pooled XGBoost, external ablations and future-priority target | Estimate after mapping/coverage gates |

The first revenue forecasting release is approximately **12–19 engineering person-days** under those assumptions. UI truth repair and the training contract can proceed in parallel once scope is agreed. Candidate fitting depends on the evaluator and frozen input. UI components can use explicitly isolated contract-test fixtures, but only warehouse-backed outputs can reach the product. External/SKU work does not block the first aggregate-revenue implementation.

First implementation batch: (1) remove synthetic UI values, (2) fix benchmark protocol and scope isolation, (3) add the pinned monthly-data contract and negative-path tests. The first reviewable result is honest baseline evaluation and a readiness report, not a claimed Prophet win.

### 11. Acceptance and operating checks

| ID | Required proof |
|---|---|
| A1 | Monthly/yearly training totals and exclusions reconcile exactly to the named financial population; hashes, versions and source row counts match |
| A2 | Missing versus true-zero, partial months, adjusted source, unapproved SKU and incompatible unit cases produce the specified values or explicit blockers |
| A3 | Changing any observation after a fold cutoff cannot change that fold's training features or fixed-origin predictions; changing holdout values changes only scoring |
| A4 | Seasonal/last-value fixtures produce known multi-step predictions; all comparisons use the exact common-key intersection, with matching Python/TypeScript transitional semantics |
| A5 | Metrics match hand-calculated zero, signed-return, constant and empty examples; intervals use only prior errors and disclose insufficient support |
| A6 | September 2026/December 2025 origin, year rollover and future accepted years preserve true lead; unsupported leads remain unavailable; no 2026 actuals are fabricated |
| A7 | All/Unknown/Government/Private/Internal scopes are distinct and governed; pagination cannot silently drop periods or series; UI filter values match trained scopes |
| A8 | UI/chart/table/export numbers and model names match the selected warehouse run; synthetic Prophet/DOH/PAGASA fallback values are absent |
| A9 | Unauthenticated access is denied; publishing requires the authorized scoped reviewer/operator; malformed filters fail; no warehouse secrets, raw sensitive rows or untrusted model deserialization reach the browser |
| A10 | A failed job, missing warehouse view, mismatched run/dataset or interrupted candidate write never activates partial output; rollback restores one compatible complete release |
| A11 | Challenger selection is justified against the baseline on the frozen protocol; failure results in baseline retention or a blocked/review state, not adjusted scores |
| A12 | Runbook, model card, status, limitations and reviewer record exist; no claim of approved product demand, clinical alerts or operational procurement exceeds the evidence |

Existing verification commands to use during implementation, with new targeted tests added to their discovered suites:

```powershell
# Repository root: temporal/data/model unit tests
python -m unittest discover -s services/tests
python -m unittest discover -s databricks/medshield_project/tests

# backend directory: pure contracts and type checks
node --import tsx --test tests/*.test.ts
node node_modules/typescript/bin/tsc --noEmit

# frontend directory: types and the existing forecast browser suite
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/@playwright/test/cli.js test e2e/forecast-validation.spec.ts --workers=1
```

Add the new publication E2E file to the browser command when it exists. Live validation must compare the active Databricks release with API/chart/export output using configured authenticated access; isolated mocks only prove contract behavior. Run builds only when appropriate, and never write a frontend production build into `.next` while `next dev` is running. This plan-only change requires document/link review, not model training or application builds.

Operational design: use the existing Databricks job facility after accepted data refresh/period close; ingest/profile → validate → fit/evaluate → candidate write → review → publication. No scheduler is installed by this plan. Record run duration, error, row counts, freshness, eligible-series count, model/version and evaluation drift. Limit concurrency and retries, use idempotent run keys, and record dependency/model artifacts with restricted access. Alert on failed runs, reconciliation/version mismatches and missing expected actuals. Refit after accepted new closed-period data; a new model is a candidate until its required checks/review pass. When actuals arrive, score archived forecasts at their original origin/lead rather than rewriting them.

Publication is the final governed action: the repository names the CEO as the business approver. Existing scoped financial decisions remain valid; do not ask to reapprove them. Prepare exact run evidence and the proposed release first, then obtain only any still-required model/dataset publication decision. Building the pipeline, tests, review reports and draft artifacts can proceed within the authorized implementation scope.

### 12. Scope limits and method references

Inventory EOQ/ROP/safety stock/allocation can consume approved **unit** forecasts only when unit-compatible inventory, lead-time, cost, service-level, supplier and expiry inputs exist. Until then they remain visible-input scenarios; revenue forecasts cannot fill missing stock or demand quantities. This predictive plan does not reopen the completed descriptive dashboard or add a new platform migration.

Method details were checked against primary documentation: Prophet supports cutoff-based historical evaluation ([diagnostics](https://facebook.github.io/prophet/docs/diagnostics.html)); its extra regressors require future values or separately forecast paths ([regressors](https://facebook.github.io/prophet/docs/seasonality,_holiday_effects,_and_regressors.html)); statsmodels provides additive/damped/seasonal smoothing ([ExponentialSmoothing](https://www.statsmodels.org/stable/generated/statsmodels.tsa.holtwinters.ExponentialSmoothing.html)); scikit-learn documents ordered splitting and exclusion gaps ([TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html)). MedShield's grains, thresholds, minimum history, calibration support and sequencing above are proposed project choices, not guarantees from those libraries.

Related documents:

- [MEDSHIELD_DSS_MASTER_CHECKLIST.md](MEDSHIELD_DSS_MASTER_CHECKLIST.md)
- [NORTH_STAR_HOW_TO_EXECUTE.md](NORTH_STAR_HOW_TO_EXECUTE.md)
- [MODEL_EXPLAINER.md](MODEL_EXPLAINER.md)
- [ANALYTICS.md](ANALYTICS.md)
- [DATABASE.md](DATABASE.md)
