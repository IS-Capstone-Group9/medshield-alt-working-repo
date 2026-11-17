# Predictive error reduction experiment — 10 October 2026

Request: reduce forecast error. Accountable role: Data Analyst. Supporting model
implementation and independent analytical QA are separate workers; source
diagnosis is read-only. This is a bounded exploratory revision of the saved
company-month recorded net-sales/PHP research comparison.

## Plan and acceptance

1. Preserve the frozen source, 72 eligible 2020–2025 months, original 21-model
   comparison and current selection. Explain endpoint sensitivity with existing
   diagnostics; do not change targets, dates or unexplained spikes.
2. Freeze six small recipes, code, packages, input/comparison hashes and temporal
   protocol before calculating their new development/audit results.
3. Evaluate the same five fixed origins and leads 1–12: 60 development cases over
   24 dependent target months. Match all keys and actuals to retained last-value.
4. Freeze the best complete new development recipe and assess the original
   experimental challenger gates separately. Then evaluate the 12 already
   inspected 2025 retrospective-audit targets without reselection.
5. Independently check numerical values, leakage, source identity, failure states
   and stated reductions. Report unsuccessful methods as well as improvements.

Expected example: a recent sample `[-5, 0, 15]` has median 0; signed values are
retained. Changing an observation after a forecast origin must not change that
origin's prediction. A missing training month leaves the recipe unavailable.

## Predetermined recipes

| Recipe | Origin-known method |
|---|---|
| Median 3 | Median of the most recent 3 observations |
| Median 6 | Median of the most recent 6 observations |
| Median 12 | Median of the most recent 12 observations |
| Weighted median 6 | Chronological weights 1, 2, 3, 4, 5, 6, retaining duplicate-value mass |
| Seasonal median shrinkage | Half recent median6 plus half the median of target−12/24/36 observations |
| Conservative last-value calibration | An origin-local absolute-loss scalar, bounded to 0.9–1.1, applied to the last observed value |

Every outer recipe requires 36 contiguous eligible origin-known months and
integer leads 1–12. The scalar uses complete quarterly inner origins beginning
after 24 training months and ending at least 12 months before the outer origin.
Each inner endpoint forecasts its next 12 known months. Minimize absolute loss
with the lower weighted median of target/endpoint, weighted by absolute endpoint;
zero endpoints contribute constant loss but no informative ratio. Clamp the
scalar to the frozen bounds. With no informative cases, use 1 and disclose the
uncalibrated fallback. Record inner support and learned scalars. At the first
outer origin there is only one complete inner origin; this limited dependent
evidence does not establish reliable calibration. No outer forecast target is
used to learn its scalar.

The windows, weights, blend, bounds and inner schedule are predetermined project
research choices. Median methods suit symmetric absolute loss; they do not
guarantee the future conditional median. See
[point forecast accuracy](https://otexts.com/fpp3/accuracy.html). MAE and WAPE
measure the same absolute-error numerator on these matched cases. Neither an
improvement nor a technical pass establishes client acceptability.

## Boundaries and guidance

Existing model/engine modules and old output packets remain unchanged. New code
is confined to `robust_error_experiment.py` and its focused test. All fits and
evaluation run offline; no gateway/frontend/cloud path or publication pointer
changes. The strongest retained benchmark is an inherited reference, not newly
fitted evidence. No SKU/territory/disease feature or operational benefit is
invented. Historical source-vintage availability remains unverified.

The original 5% relative WAPE improvement, 10% normalized-bias maximum,
MAE/RMSE deterioration and lead-group gates are retained as experimental
criteria; new median methods stay challengers. The two client error limits
remain null. Previously inspected 2025 data cannot become an untouched final
test; later accepted actuals are still required for confirmation. Measured
2026 error remains unavailable.

Applied guidance: worker/execution contracts; Data Analyst and analytics
frameworks for same-target loss, origin-local fitting and evidence distinctions;
database standards for source identity and eligibility; coding/testing/stack
for isolated implementation and numerical/leakage checks. Supporting workers'
handoffs record their role-specific skills. Root reuses Technical Writer and
documentation guidance for canonical results and limitations.

## Execution and results

Status: six registered recipes evaluated once; full results and presentation
generated. Original selected model remains `last_value`; the new experiment is
`robust_error_exploratory_evaluated_unpublished`, with publication approval false.
The grid stops here without audit-driven additions or reselection.

Development-only winner and gate-qualified choice: `median_12`. Development MAE
falls **24.899473%**, from **₱3,090,470.93 to ₱2,320,959.94**; WAPE falls from
**83.199360% to 62.483157%**. Its 2025 audit MAE rises **116.946959%** to
**₱12,657,516.49**, with **81.927078% WAPE**, so activation is not supported.
The unselected bounded-calibration trial also qualifies under the development
gates and gives **5.935767%** development / **1.059462%** audit MAE reductions.
Its audit **₱5,772,569.95 MAE / 37.363553% WAPE** remains substantial.
These are mixed exploratory results; no reliable future improvement is claimed.

Registration occurred at **08:19:42 UTC / 16:19:42 Manila on 10 October 2026**.
The development choice was frozen at **08:20:08.091728 UTC**, before the audit
began at **08:20:08.096952 UTC**. Each new recipe contributes 60 development and
12 retrospective-audit points: **432 new points**, plus **72 retained baseline
points**. No new 2026 projection or evaluated actual was created.

- [Protocol](models/protocol.json), binding source/comparison/code/packages and six exact configurations.
- [Run](models/f749f47ef44db53a35f56a822e2b35edc0877ad5126c4352a996dfb2f5a20e8b/run.json) and [development freeze](models/f749f47ef44db53a35f56a822e2b35edc0877ad5126c4352a996dfb2f5a20e8b/development-freeze.json).
- [Full result report](RESULTS.md), [Decimal reconstruction](report.json) and [comparison figure](error-comparison.png).
- [Read-only source diagnosis](diagnosis.md), retaining unconfirmed causes and source timing limitations.
- [Original file identities](original-identities.json), captured before any new evaluation.
- [Independent pre-fit expectations](qa/prefit-expectations.json), [758-check pre-fit review](qa/prefit-review.json), and [post-run review](qa/REPORT.md).

The root [fixture log](root-fixture-tests.log) records **25 passing tests**
(14 new experiment and 11 annual-helper tests). The separate
[oracle fixture log](qa/independent-oracle-tests.log) records **eight passing
independent tests**. The model implementer performed a separate read-only
interpretation/trace review and reported 167 passing checks; this is that worker's
self-review, not the independent numerical oracle. Independent post-run commands,
counts and bound artifact hashes are recorded in `qa/REPORT.md` and its JSON review.

Actual root execution, with stdout retained in [prepare.log](prepare.log) and
[evaluation.log](evaluation.log):

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 -m services.analytics_service.predictive.robust_error_experiment --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output outputs/predictive_error_optimization_20261010/models --prepare
.\.venv-predictive\Scripts\python.exe -X utf8 -m services.analytics_service.predictive.robust_error_experiment --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output outputs/predictive_error_optimization_20261010/models
.\.venv-predictive\Scripts\python.exe -X utf8 -m unittest services.tests.test_predictive_robust_error services.tests.test_predictive_annual_projection -v
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/predictive_error_optimization_20261010/build_report.py --run outputs/predictive_error_optimization_20261010/models/f749f47ef44db53a35f56a822e2b35edc0877ad5126c4352a996dfb2f5a20e8b/run.json --best-new median_12
```

Reproduction must use a new empty model directory; the original refuses overwrite.
The report author also refuses overwrite. `report-attempt-1/` and
`report-attempt-2/` retain the first two chart layouts with overlapping legends;
the final rendering has been visually checked by root. Numeric results and model
execution were unchanged during these presentation repairs. The final code and
delivery bindings are recorded separately; no old evidence packet was resealed.

No running project Node/Python process was found at intake. No application build,
live service, cloud write, gateway/frontend change or operational publication was
required. Client tolerance, historical release availability, independent source
completeness, medicine/territory O3 and inventory acceptance remain open.
