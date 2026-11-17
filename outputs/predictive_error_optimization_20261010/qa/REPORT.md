# Independent QA — bounded predictive error optimization

**PASS: 7,691 post-run checks, zero failures.** The separate synthetic prefit
review passed 758 checks before root registration. Eight independent oracle
tests passed. These are technical reproduction checks; business acceptance and
forecast activation remain open.

The frozen experiment is
`f749f47ef44db53a35f56a822e2b35edc0877ad5126c4352a996dfb2f5a20e8b`.
QA owns only this directory. Root executed the registered experiment and built
the presentation. The model implementer's 14 synthetic tests and root's 25
fixture tests are inherited evidence, distinct from this separate QA review.

## Independently confirmed outcome

| Recipe | Development MAE PHP | Development WAPE % | 2025 audit MAE PHP | 2025 audit WAPE % |
|---|---:|---:|---:|---:|
| Retained last value | 3,090,470.93 | 83.199360 | 5,834,383.00 | 37.763644 |
| Median 12: frozen new development winner | 2,320,959.94 | 62.483157 | 12,657,516.49 | 81.927078 |
| Bounded scalar calibration: unselected trial | 2,907,027.78 | 78.260840 | 5,772,569.95 | 37.363553 |

Median 12 lowers development MAE by 24.90% but increases retrospective-audit MAE
by 116.95%. The unselected calibration trial lowers development MAE by 5.94% and
audit MAE by 1.06%. Both median 12 and calibration pass the retained experimental
challenger gates on development; median 12 wins those development comparisons.
The previously inspected audit cannot select a replacement. The original
selected `last_value` remains unchanged and unpublished.

## Expected basis and checked scope

- The frozen input remains fact version 20, with exactly 72 contiguous eligible
  company-month net-sales/PHP values dated January 2020 through December 2025.
  All 11 original source/model/runtime/manuscript identities remain unchanged.
- Recreated all 432 new predictions with the separate Decimal formulas in
  `independent_oracle.py`; no production forecasting or fitting functions were
  imported by the post-run verifier. All 72 retained baseline predictions were
  also checked directly against their source origin endpoints and target values.
- All six recipes retain the same 60 development keys over 24 target months and
  five origins, plus 12 retrospective-audit keys. Actuals, lead arithmetic,
  finite predictions, scope, units, unsupported intervals and unpublished flags
  reconcile. The original benchmark strength and five original adapter hashes
  remain verified; the annual evidence helper and new code/test hashes are pinned.
- Independently recomputed MAE, RMSE, WAPE, signed and normalized bias, actual and
  prediction sums, absolute/signed/squared errors, maximum errors and all
  directional counts/amounts for every cohort, origin, lead and cumulative
  3/6/12-lead group. Source-oracle values also reconcile to the published metrics.
- Reconstructed scalar ratios, lower weighted median, duplicate mass, fixed
  bounds, zero-endpoint constant loss, both inner losses and all inner cases and
  training hashes. Inner-origin support is 1/2/3/4/5 for development and 9 for
  audit; all 12 inner targets end by the outer origin. This dependent support
  does not establish reliable calibration.
- Independently checked development-only best-new ordering, all unchanged
  original challenger gates, the decision freeze before audit, registration
  before execution, actual UTC/Manila dates, original selection and package
  identity. All model artifacts and standalone JSON parity pass.
- Final report tables, reductions, origin results, 12 audit rows, scalar trace
  table and all 12 chart labels reconcile. The report builder performs no fit or
  forecast call and asserts the already frozen choice. QA separately viewed the
  final PNG: legend, bars, labels and units are readable. Two earlier root chart
  layouts remain preserved without additional model evaluation.

Prefit synthetic failure probes cover signed/even medians, duplicate and exact
half weight ties, upper/lower scalar clamps, zero endpoints, future sentinels,
gaps, short history, invalid leads, nonfinite targets, changed configurations and
coherent all-null malformed/convergence-warning folds. The cancellation example
with actuals 100/100 and predictions 200/0 produces MAE 100, WAPE 100% and bias 0.

Currency tolerance is `0.000001 PHP`; rate tolerance is `0.0000000001` percentage
points. Displayed PHP is checked to the exact expected two-decimal text (rounding
precision 0.005 PHP). The final JSON receipt contains 51 current source/output/code
bindings and all expected/observed checks. The QA artifact manifest separately
binds this report and the verification records.

## Reproduction and evidence

The actual independent commands were:

```powershell
& 'C:/Users/Adrian/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 outputs/predictive_error_optimization_20261010/qa/prepare_expectations.py
& 'C:/Users/Adrian/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 outputs/predictive_error_optimization_20261010/qa/check_prefit.py --module-sha256 0a07f75c83ed44c05524ad5032e86c3d3e889b32276dd6f3226a3dbd062e6bd6 --test-sha256 6eed6913afc702bedee334803a37f0b0d15acecef1d1fffeb82797c3e73e1e98
& 'C:/Users/Adrian/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 outputs/predictive_error_optimization_20261010/qa/verify_results.py --run outputs/predictive_error_optimization_20261010/models/f749f47ef44db53a35f56a822e2b35edc0877ad5126c4352a996dfb2f5a20e8b/run.json
```

QA used bundled Python 3.12.14 for separate Decimal arithmetic. This is distinct
from the unchanged registered model environment. Receipt writers refuse to
overwrite their first verification. `prefit-expectations.json` remains intact;
`prefit-review.json` records the final production IDs and explicit oracle aliases.

Applied guidance: `.agents/qa-engineer.md`, worker/execution contracts,
`.skills/testing-standards.md` for proportional synthetic and output checks,
`.skills/analytics-frameworks.md` for independent same-population metrics and
evidence limits, `.skills/database-standards.md` for source lineage/eligibility,
and `.skills/coding-standards.md` for isolated reproducible verifier code.

## Claim limits

No application build, original model refit, cloud write, runtime activation or
source correction occurred in QA. No 2026 actuals, measured 2026 error, new annual
projection or release draft was generated. Both client error limits remain null;
equal directional loss weights remain a provisional research assumption.

All new rankings are exploratory: development and the 2025 audit were already
inspected before recipe design. Later untouched accepted actuals are still needed
for confirmation. Historical availability vintages and independently verified
completeness remain unresolved. Company revenue errors do not establish medicine
quantity demand, inventory losses, disease effects or procurement authority.

Handoff: root may seal the technically verified research packet. No defect or
required numerical check remains open; business/publication acceptance remains
with its named owners.
