# Independent forecast error-policy QA

**PASS: 1,331 checks, zero failures.** The packet correctly reports the retained historical model errors and an unapproved provisional research policy. Business error acceptance remains **not assessed**, because both MAE and WAPE limits are unset.

The 21 recipes retain their original configurations, order and inherited `last_value` selection. Every development cohort has 60 common origin/target pairs covering 24 distinct months and five dependent origins; each previously inspected 2025 retrospective-audit cohort has twelve months from one origin. Source actuals match the checksum-bound frozen input. No future 2026 prediction enters these error calculations.

Independent expected results were frozen before reviewing the derived packet, using separate Decimal arithmetic over the original sealed predictions. All 42 model/cohort populations reconcile for MAE, WAPE, RMSE, mean signed bias, normalized signed bias, actual/prediction totals, absolute/signed/squared errors, largest miss and overforecast/underforecast counts and magnitudes. The largest difference against the original stored metric values is below **₱0.000000002** and **0.000000000000017 percentage points**, within the predefined **₱0.01 / 0.000001 percentage-point** tolerances. The complete 42-row report and README's selected-model table match the independent values at their stated display precision.

Both `max_mae_php` and `max_wape_percent` are null. The policy and every model retain `not_assessed_thresholds_missing`, publication approval false, and null 2026 actuals/assessment. Equal directional weights of 1:1 are explicitly a requesting-user-endorsed research assumption, not measured business costs. The client-review card supplies no invented numerical limit, external approver or approval date. Derivation UTC/Manila timestamps describe the execution, not approval.

Isolated probes exercise the actual pure builder scoring functions without executing the builder's write path. For actuals 100/100 and predictions 200/0, signed bias is zero but **MAE = 100, WAPE = 100%, RMSE = 100**; overforecast and underforecast magnitudes are each 100 and absolute error totals 200. Available numeric metrics do not change the absent-limit assessment. Empty cohorts, zero actual denominators, nonfinite pairs, duplicate/nonfinite JSON and source checksum drift are handled as expected. The builder's separate 1,000/1,000 cancellation example correctly has WAPE 10%; these examples have different denominators.

All ten original source-artifact hashes, input/sidecar identities and five original model-code hashes agree. The derivation receipt matches the builder and its outputs. Original annual model QA receipts and their eight-file seal remain unchanged. Read-only source review confirms no fitting, tuning, new model selection, cloud write or new 2026 accuracy assessment. The verifier binds the original source, input, builder, policy, model review, both reports and its own code in `verification.json`.

Supporting accountable role: QA Engineer. Applied current `.agents/worker-operating-model.md`, `.agents/execution-contract.md`, `.agents/qa-engineer.md`, `.skills/testing-standards.md`, `.skills/analytics-frameworks.md`, `.skills/database-standards.md`, `.skills/coding-standards.md`, and relevant business-definition/testing/predictive-operation contracts. Numerical expected results, credible failure probes, same-grain lineage and candidate/publication separation informed the work. Changes are confined to this `qa/` directory.

No defect remains in the checked scope. This QA establishes historical numerical correctness and truthful policy reporting; it does not establish client error tolerance, measured inventory loss, prospective 2026 performance, business approval or model serving acceptance. Root owns integration and the final delivery seal.

Reproduce from the repository root:

```powershell
.\.venv-predictive\Scripts\python.exe outputs/predictive_error_policy_20261010/qa/independent_errors.py --source outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output outputs/predictive_error_policy_20261010/qa/reproduced-expected-errors.json
.\.venv-predictive\Scripts\python.exe outputs/predictive_error_policy_20261010/qa/verify_error_policy.py --packet outputs/predictive_error_policy_20261010 --expected outputs/predictive_error_policy_20261010/qa/expected-errors.json --output outputs/predictive_error_policy_20261010/qa/reproduced-verification.json
```

The verifier imports the derivative builder only to exercise pure functions; it does not call its `main()` or fit a model. Preserve the original `expected-errors.json` for the chronology assertion. Later independent recomputation demonstrates numerical reproducibility but cannot precede an already completed derivation.
