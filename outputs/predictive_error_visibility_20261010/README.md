# Predictive error visibility — 10 October 2026

Request: show error in predictive outputs and explain what constitutes a good
error. Accountable role: Data Analyst; supporting Frontend/BI implementation,
independent QA and Technical Writer documentation.

## Plan and acceptance

1. Preserve gateway-selected source, target, model, evaluation cohort and
   publication status; do not inject offline scorecard values into the dashboard.
2. Show monthly absolute and signed errors in target units in the monthly table
   and CSV, along with historical summary metrics and evaluation context.
3. Hand-check overforecast (+10), underforecast (−10), observed zero, negative
   actuals and unavailable/mismatched/future pairs. Missing errors remain null.
4. Verify PHP versus other units, escaping, scope/source failure clearing and
   responsive output. Record actual checks before completion.
5. Document interpretation without inventing client thresholds, 2026 actuals,
   model approval or operational benefits.

For actual 100 and prediction 110, signed error is +10 and absolute error is 10.
For actual 100 and prediction 90, signed error is −10 and absolute error is 10.
A forecast with no matching historical actual has no measured error.

## Scope and evidence

Presentation changes are in
[forecast-validation-runtime.ts](../../frontend/services/api/forecast-validation-runtime.ts),
with focused frontend fixture tests. Historical cards/export summaries come from
the selected gateway result; the live unpublished benchmark response and the
separately retained 21-model offline comparison are distinct. No model fit,
warehouse mutation, API contract change, publication or deployment is part of
this task. Existing unrelated working-tree changes are preserved.

The existing offline selected benchmark's **2025 retrospective audit** retains
MAE **₱5,834,383.00** and WAPE **37.763644%** on 12 monthly targets forecast from
December 2024. These are inherited historical results, not fresh performance
tests or measured 2026 accuracy. See the
[error-policy record](../predictive_error_policy_20261010/README.md).
Both client limits remain null. A 37.76% WAPE represents a substantial historical
miss; being the best tested recipe does not establish business acceptability.

## Applied guidance

- `.agents/worker-operating-model.md` and `.agents/execution-contract.md`: one
  accountable owner, bounded handoffs, source-bound evidence and actual checks.
- `.agents/data-analyst.md` and `.skills/analytics-frameworks.md`: matched metric
  populations, target units, signed-error definition, zero versus missing and
  historical versus future evidence. Prior source/lineage guidance is reused.
- Supporting Frontend/BI and QA roles load their primary and relevant conditional
  skills; their handoffs record application to presentation, exports and checks.
- `.agents/technical-writer.md` and `.skills/documentation-standards.md`: update
  canonical operations/testing/current-state guidance with delivered behavior.
- `.skills/coding-standards.md`, `.skills/testing-standards.md` and
  `.skills/technology-stack.md`: existing runtime patterns, isolated meaningful
  fixture checks and no additional analytical runtime source.

## Verification and limits

Status: done for error presentation and interpretation. The
[frontend receipt](frontend-results.md) records six passing isolated Playwright
cases and source/screenshot hashes. The [independent QA report](qa/REPORT.md)
records 369 checks with zero final failures; it retains the first attempt's ten
verifier expectation/parsing failures. No runtime defect required correction.
Root's final frontend TypeScript check (`node node_modules/typescript/bin/tsc
--noEmit --incremental false`) and scoped `git diff --check` passed. Root visually
inspected both [desktop](frontend-desktop.png) and [390px mobile](frontend-mobile.png)
screenshots: historical cards and units are readable, monthly errors are exposed,
and wide tables scroll inside the panel. The screenshots contain synthetic test
values, not study results. The [delivery record](delivery.json) binds final files
and verification scope.

No project Node/Python process was found at task intake. No application service,
build, live warehouse query or deployment was run. Fixtures demonstrate tested UI
behavior, not live integration, forecasting reliability or business approval.
Business impact is clearer revenue-error interpretation. Architecture, gateway,
database and approval boundaries are unchanged; no credentials or new analytical
runtime sources are introduced. Numeric business acceptance remains pending.

Interpretation uses primary references:
[point forecast accuracy](https://otexts.com/fpp3/accuracy.html) and
[WAPE definition and limitations](https://robjhyndman.com/hyndsight/wape.html).
Lower error must be assessed on comparable targets/leads; no universal WAPE
cutoff is recorded. The client's decision-specific peso and percentage limits
are still required for business acceptance.
