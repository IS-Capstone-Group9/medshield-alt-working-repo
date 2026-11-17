# Model Status and Interpretation

Last reviewed: 5 November 2026, Asia/Manila.

Use this guide to explain what each model result measures and what decision it
can support. [Current State](CURRENT_STATE.md) owns source/model readiness;
[Predictive Operations](PREDICTIVE_OPERATIONS.md) owns evaluation and issue-time
contracts. The [current evidence packet](../outputs/client_model_evidence_20261102/README.md)
records the new bounded experiments, including failed improvement attempts.
The [5 November model error comparison](../outputs/model_error_comparison_20261105/README.md)
adds a full model table for the retained PHP, ABC and ampoule studies and their
new seasonal and label-history candidates.

The [historical-only benchmark and error review](../outputs/historical_model_benchmark_20261105/README.md)
reconciles all 551 score rows, adds complete-case descriptive rankings, paired
comparisons and error ledgers, and separates original frozen research choices
from comparison baselines. This is the current study direction. Future outcome
validation remains separate future work.

The working sales source covers 2017–September 2026. Each frozen experiment
retains its actual history, target months, population and lead. A dashboard
filter does not rewrite an independent frozen research cohort. Runtime values
come through authenticated, source-validating Gold readers; local experiment
files never replace unavailable dashboard data.

## Four-layer progress against the proposed objectives

The four layers form a sequence of decision questions. SO1–SO5 are the five
proposed objectives; a layer can support several objectives. The
[evidence matrix](ANALYTICS_EVIDENCE_MATRIX.md) retains all 25 deliverables,
their exact wording, dated checks and acceptance owners. The 2 November
25/25 score is a bounded technical/research delivery checklist. Future model
accuracy, observed business benefits and formal objective acceptance each
require their own evidence.

| Layer | Client question | Proposed objectives and dashboard | Delivered progression | Remaining acceptance boundary |
|---|---|---|---|---|
| Descriptive | What recorded sales and contribution do we have? | SO1/SO2; Overview, Sales Diagnostic, Product and Area | Financial summaries, paired margins, matched growth, Pareto/observed ABC and all nine delivery labels | Source completeness, supported identities and interpretation |
| Diagnostic | Where did the recorded change occur, and what should we investigate? | SO1, with SO2 comparisons; Sales Diagnostic and Area | Signed contributions, common-period comparisons and fitted eligible area/province STL | Actual business causes and unsupported history/geography need additional evidence |
| Predictive | How well did a declared method predict later recorded outcomes? | SO2 classifiers/SO3 forecasts; Product and Forecast | Time-ordered baseline/challenger comparisons, error readouts and a confirmed ampoule pilot | Reliable future performance, valid external joins and model promotion remain open |
| Prescriptive | What plan is feasible under the entered assumptions? | SO4; Prescriptive Planning | EOQ/ROP, weighted whole-pack allocation, dated receipt/expiry checks and scenario comparisons | Verified operating inputs, real outcome measurement and procurement authority |

SO5 connects all four layers through authenticated filters, provenance,
availability notices, review recommendations and exports. The
[5 November local production QA](../outputs/current_integration_20261105/README.md)
passed 40 cases, comprising 20 authenticated live and 20 isolated/pure cases.
Its 146 gateway tests and 11,283 independent numerical checks have separate
scopes. Those are inherited execution results for the named snapshot. This
guide update checks documentation and retained evidence without rerunning the
application. Actual client understanding remains deferred.

Read a case in this order. Establish the recorded amount and coverage, localize
the change, inspect a correctly scoped historical prediction, then compare
planning assumptions. Planning inputs remain explicitly entered until their
required data/model and operating contracts are accepted.

## Descriptive layer

| Method | Purpose | Current status |
|---|---|---|
| Year/month aggregation | Recorded sales, supported gross margin and coverage; matching-month YoY | Source-bound candidate evidence; partial periods remain visible |
| Observed Pareto/ABC | Describe positive eligible financial contribution | Deterministic calculation for a historical scope, not a future classifier |
| Delivery-area/buyer/product ranking | Compare supported commercial evidence | Confirmed delivery mappings and recorded channel labels remain distinct |

The verified itemized study contains ₱638,015,351.53 recorded net sales across
107 observed months in 117 calendar slots. Its margin-eligible revenue basis
is ₱566,954,921.92. Use gross profit and revenue from the same eligible records
when computing margin. A record with unsupported acquisition cost cannot supply
a reliable gross margin. Financial scope excludes Contracts, and missing
observations remain unavailable.
[Source reconciliation](../outputs/system_first_20261102/filters/source-reconciliation.json)

The selected Jan–Sep 2026 period compares with Jan–Sep 2025. All nine supported
delivery labels remain available for historical review, including labels whose
latest observation is earlier than 2026. Compare coverage before comparing
totals. Observed ABC describes financial contribution in the selected reporting
population. Its A class can guide commercial investigation; clinical priority,
verified SKU identity and future A membership have separate evidence needs.

## Diagnostic layer

| Method | What it establishes | How to interpret the result |
|---|---|---|
| Signed contribution/change bridge | Which recorded sectors/products/areas account for a matched total change | Preserve negative adjustments and reconcile contributions to the total |
| Common observed-period comparison | Differences between areas over the same supported months | Disclose excluded months and keep unequal lifetime histories separate |
| Area/province STL | Retrospective trend, seasonal and residual components in eligible contiguous history | Retain weak or absent seasonality, gaps, fitted windows and source identity |
| Source-case follow-up | Recorded transactions behind a localized movement | Treat order timing, tenders, stockouts or disease explanations as hypotheses until supported |

For Jan–Sep 2026 versus the same months in 2025, Quezon's matched recorded
net sales rose 45.55%, while Batangas fell 42.46%. This localizes the financial
movement for follow-up. It does not identify its cause. Eligible fitted STL
reports seasonal strength 0 for Quezon and approximately 0.073692 for Batangas.
These weak seasonal findings support caution about adding seasonality merely
because the chart has peaks. Historical decomposition uses its fitted window;
a forecast feature must be rebuilt using only information available at issue time.
[Area comparisons](../outputs/delivery_area_20261102/independent-checks.json) ·
[Fitted source response](../outputs/delivery_area_20261102/actual-response.json)

The next action is to inspect source-linked commercial events for the localized
change. Source/sales owners supply legitimate evidence. The analyst records the
supported explanation or keeps the cause unresolved.

## Predictive layer

| Method | Purpose | Current status |
|---|---|---|
| Company itemized-PHP forecasts | Compare predictions of signed recorded net sales | Frozen mean6 and other baseline/challenger research; large errors remain; money is not physical medicine demand |
| CALABARZON itemized-PHP forecasts | Evaluate the supported regional financial series | Separate region/time windows; incomplete MIMAROPA/Bicol histories retain unavailable scores |
| Next-period financial ABC | Predict A/B/C contribution for exact recorded labels | Original baseline selection is prior-year ABC; class balance and A recall matter alongside accuracy; source labels are not verified SKUs |
| BUPIRIGHT 4 mL / HOSPITAL units | Compare recorded ampoules for two user-confirmed labels | Four baseline methods at leads 1/3; only six/four targets; no selected operational method or verified geographic scope |
| DOH/PAGASA/NASA regression | Test external-signal value in a declared eligible cohort | Provider/mapping/as-of limits remain; no blanket operational disease-demand approval |

The three research panels now explain their target, units, current displayed
error, period and review boundary in plain language. They use the existing
gateway response. Newly evaluated offline candidates below are not inserted
into those original runs or loaded from local files.

## Read the error before using the prediction

- **WAPE is an error measure:** `100 × sum(abs(prediction − actual)) / sum(abs(actual))`.
  The unchanged company mean6 development WAPE of 71.66% means aggregate absolute
  error of ₱71.66 per ₱100 of absolute actual sales across those 19 cases. It is
  not a guarantee for one month, a confidence probability or “28.34% accuracy.”
  A zero denominator makes the rate unavailable. Bias uses prediction minus actual;
  negative aggregate bias means underforecasting.
- **ABC accuracy is the share of correct classes.** A recall is the share of
  actual A labels detected; macro-F1 weights the defined classes equally. The
  prior-year comparator in the offline partial-2026 comparison has 67.62% accuracy but detects only 4 of
  25 actual A labels. High headline accuracy can still miss important review
  cases. This is retrospective exact-label evidence, not verified product identity.
- **Unit MAE is average absolute error in ampoules.** Seasonal naive has the
  lowest observed MAE, 13.17/9.75 ampoules at leads 1/3, on only six/four scored
  targets. That neither selects a dependable future method nor supplies an
  order quantity. Leads have different cohorts; compare methods within each lead.
- **An empirical prediction range is evaluated evidence, not a guarantee.**
  Report its tested coverage, width, case count and period. Do not display a new
  range as calibrated future confidence when its development guard fails.

## New bounded accuracy work — 2 November 2026

All protocols were recorded before their execution; outcomes had already been
historically inspected. None is an untouched prospective test or publication approval.

| Family | New comparison and result | Decision |
|---|---|---|
| Company PHP | Fixed asymmetric scaled-error range around unchanged mean6; development interval score improves 2.35% but empirical coverage falls 84.21%→63.16% | Fails the declared range guard; point accuracy unchanged |
| ABC | Fixed train-only smoothed transition learner; all 433 new class predictions equal persistence | No accuracy/macro-F1/A-recall gain; new comparison guard fails |
| Confirmed ampoules | Fixed median of four existing baseline predictions; MAE improves 5.36%/4.00% versus mean6 | Seasonal naive still has lower error at both leads; no method selected |

See the [company](../outputs/client_model_evidence_20261102/company/README.md),
[ABC](../outputs/client_model_evidence_20261102/abc/README.md) and
[unit](../outputs/client_model_evidence_20261102/unit/README.md) receipts for
all cases, regressions, source/code identities and independent numerical checks.
No overall accuracy solution, original-objective completion or operational
benefit follows. Repeating already-inspected tests cannot create future evidence.

## Current model summary — 5 November 2026

This table summarizes references within each target/lead. It does not pool
money, classes and ampoules into an overall accuracy number. The
[full 551-row score table](../outputs/model_error_comparison_20261105/model-metrics.csv)
contains every retained recipe, cohort, unavailable reason and new candidate
in that comparison. The [registered study](../outputs/model_error_comparison_20261105/README.md)
retains the fixed selection rules and all regressions.

| Scope and lead | Fixed comparison reference | Development / audit / inspected extension | Interpretation and current decision |
|---|---|---|---|
| Company PHP, 1 month | Six-month mean | WAPE 71.66% / 58.23% / 56.53% | SO3 priority; large error remains. No new candidate passes the development guard |
| Company PHP, 3 months | Three-month mean | WAPE 68.41% / 45.46% / 36.41% | Retained research reference; the new seasonal recipe regresses in development and audit |
| Company PHP, 6 months | Six-month mean | WAPE 96.55% / 58.16% / 56.79% | Lower inspected extension error for a new recipe does not pass its development guard |
| CALABARZON PHP, 1 month | Six-month mean | WAPE 22.19% / 17.40% / 26.14% | Regional comparison has its own cases; the new seasonal recipe regresses in audit |
| CALABARZON PHP, 3 months | Six-month mean | WAPE 21.43% / 7.30% / 58.56% | Small audit error does not remove the inspected extension deterioration |
| CALABARZON PHP, 6 months | Three-month mean | WAPE 20.98% / 18.82% / 58.51% | Later errors remain substantial; no operational selection |
| Financial ABC, partial Jan–Sep 2026 | Prior-year class | Accuracy 67.62%; A recall 4/25 = 16.00% on 210 labels | Historical exact-label comparison; misses 21 actual A labels. Keep human commercial review |
| Separate fixed-recipe ABC comparator, 2025 | Prior-year class versus XGBoost depth 2 | Accuracy 60.71% → 63.57%; A detections 8/19 → 6/19 on 140 labels | Better headline accuracy accompanies worse A recall. Both tie on the later partial-2026 confusion matrix |
| BUPIRIGHT/HOSPITAL ampoules, 1 month | Seasonal naive | MAE 13.17 ampoules on six cases | Lowest observed pilot MAE; no dependable future or operational claim |
| BUPIRIGHT/HOSPITAL ampoules, 3 months | Seasonal naive | MAE 9.75 ampoules on four cases | Different lead cohort; evaluate methods within this lead |

PHP development/audit/extension columns use 19/7/4 cases per lead. These windows
were already inspected. The mean3/mean6 entries above are fixed comparison
references. The original company research run retains seasonal naive at leads
3/6; its CALABARZON counterpart retains ridge_direct_a10 at lead 6. The new
benchmark reports both sets of scores and does not change those original choices.
The separate [XGBoost extension](../outputs/so2_closeout_20261102/README.md)
was evaluated offline; original dashboard run identities and selections remain
separate. The added seasonal and label-history candidates failed all 14 PHP/ABC
development checks. The [calendar exposure study](../outputs/so3_calendar_exposure_20261105/README.md)
also increased one-month WAPE in each window for both day and weekday scaling.
No model was promoted from these studies.

MIMAROPA/Bicol financial coverage, real external-feature admissibility and
territory-wide verified medicine quantities retain their source/model gates.
Unavailable models must show their actual reason. The team reports that the
new sales snapshot and order archive are unavailable. Keep the current
sales-only findings and the registered forward protocol ready for later
eligible observations. Reusing inspected outcomes to choose another recipe
cannot establish a new prospective result.

## Prescriptive layer

| Method | Required evidence | Current status |
|---|---|---|
| Commercial priority/MCDA | Supported financial criteria and explicit weights | Commercial review/sensitivity; no automatic clinical priority |
| Scenario allocation / dated purchase selection | Explicit demand, stock, reserve, pack, costs, supplier, budget and timeline assumptions | Implemented entered-input methods; feasible arithmetic does not verify operating inputs |
| EOQ / ROP / safety stock | Compatible units, ordering/holding policy, lead-time and stock evidence | Implemented scenario/formula evidence; operational acceptance remains separate |
| Offline optimization | Declared objective, constraints, solver and independent feasibility checks | Research/scenario evidence; retain differences from the gateway's objective |

The [44-case scenario book](../outputs/system_first_20261102/planning/README.md)
uses synthetic entered assumptions. Its EOQ/ROP example computes a 500-unit
lot and a 294-unit reorder point, while budget, supplier-cap and shelf-life
screens identify infeasibility. Correct formula output must be read with those
constraints. Weighted allocation and dated receipt/expiry checks compare
feasible plans against the same entered domain, including no new purchases.

Operations owns actual stock, lot, pack, demand, cost, supplier, lead-time and
expiry evidence. Real turnover or expiry improvement requires observed outcomes
over a declared period. A solved scenario supplies a reviewable comparison;
procurement execution needs its applicable approvals.

## Completion sequence and owners

| Next action | Owner | Observable exit evidence |
|---|---|---|
| Use this explanation with the proposed-scope matrix | Research team/writer | Each claim retains its objective, actual source/window, evidence kind and limitation; formal wording approval remains with adviser/team |
| Resolve the intended source/identity coverage | Data steward/catalog owner | Source-linked completeness dispositions and reviewed label/unit mappings for the claim |
| Continue SO3 prospective evaluation when eligible observations exist | Model owner/data operator | Correctly timed immutable issue, controlled successor actuals and same-case baseline comparison under the frozen protocol |
| Validate planning for real operating use | Operations/model owner | Verified compatible inputs, feasible reviewed plans and measured outcomes before any benefit claim |
| Perform client understanding tasks when the deferral ends | Facilitator/client | Attributable responses about units, missingness, model error, A recall and scenario assumptions, plus an actual decision |
| Recheck later releases or changed runtime flows | QA/release owner | Named target/source/code acceptance with appropriate native, role and hosted checks |

The remaining work depends on the intended claim. The bounded proposed
implementation/evaluation deliverables have recorded technical evidence.
Source certification, future accuracy, business outcomes and actual human
acceptance remain separately open. The [matrix gates G1–G7](ANALYTICS_EVIDENCE_MATRIX.md#remaining-gates-and-ownership)
retain their canonical ownership. Main manuscript revision remains deferred;
this guide supplies the requested explanation for review.

## Interpretation standard

Every reported result states its dataset/version, population, period, method,
design, metric, status and limits. Scholarly discussion can cite source-bound
offline research with its actual limitations; that does not make it a runtime
source or approved operational model.

Before claiming stronger future accuracy, source/model owners need legitimate
origin-known predictors and reviewed identities, a controlled successor source
snapshot, correctly timed immutable issues and later actuals under the existing
forward contracts. Missing observations stay unavailable. Client/model owners
define acceptable error and intended use before business acceptance; no limit
is inferred from the errors already observed. Inventory/supplier/lead-time/expiry
evidence is still required for operational replenishment.

Use the [client understanding tasks](CLIENT_ACCEPTANCE_WALKTHROUGH.md#model-understanding-supplement--2-november-2026)
to check whether a representative can interpret the displayed evidence. Prepared
tasks and automated UI checks are not actual client comprehension or signoff.
