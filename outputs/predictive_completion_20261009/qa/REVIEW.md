# Independent predictive QA — 9 October 2026, Asia/Manila

The bounded offline predictive delivery passes independent numerical, temporal
and candidate-storage checks. **This does not certify an operational forecasting
release or fulfill the original medicine-demand objective.** The registered
21-configuration extension selects last value again; no challenger satisfies the
unchanged development criteria.

Accountable role: supporting QA Engineer, separately delegated by the task owner.
Allowed writes: new verification scripts and records in this `qa/` directory.
Product and existing test files were reviewed without modification.

## Checked source and data

- Dataset `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`,
  fact Delta version **20**, policy `sales_restart_gold_v7_independent_catalog`.
- Frozen input: [input.json](../../predictive_validation/2026-10-09T13-28-48-501Z/input.json),
  SHA-256 `04be4f529101f2117a5045d686158708e2b39d55957a3b119b22a30aa72c63ba`.
- Original run `11648be69f44f87d746b45904acc01a4790bf24d348940941940f01caab7997c`.
- Extended run `eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a`:
  [run.json](../models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json).
  Run byte SHA-256 `9889baea07a1f222edc9d2d2576fefc0d2be4bc8e52dc4d9a3ff9919e0056f45`.
- The fresh extension retains the five registered source-file hashes, exact
  package versions, code revision, schedule, criteria, configurations and seed.
  Current source matches that registered code map. The receipts also retain
  current predictive package-file hashes; a dirty repository's commit alone is
  not treated as complete code identity.
- Target: financially eligible recorded company-month **net sales, PHP**.
  The input preserves 108 historical calendar rows; evaluation uses the
  separately user-attested complete 72-month 2020–2025 segment. That attestation
  is inherited, not independent source-completeness verification.

## Independent checks

| Criterion | Result | Evidence and meaning |
|---|---|---|
| Exact input, run identity, artifacts and source hashes | PASS | [Extended receipt](extended-verification.json): all ten retained artifact hashes, registration/input/environment binding and current registered source hashes agree. |
| Common calendar scoring population | PASS | All 21 models retain exactly 60 development and 12 audit keys; 1,524 rows = 1,260 development + 252 audit + 12 future. No incomplete model shrinks the scoring cohort. |
| Independent metrics and frozen development selection | PASS | 441 groups recomputed using standalone Decimal arithmetic, with no scoring/evaluator imports. Tolerances fixed at PHP 0.000001 and 0.000000001 percentage points. All MAE, RMSE, WAPE, signed bias and normalized bias agree. Independently selected last value; zero qualifying challengers. |
| Original protocol/result preservation | PASS | All original configurations, schedule, criteria and seed retained; all 1,092 original prediction/actual records agree within the fixed money tolerance. Original baseline receipt independently passes 388 checks / 315 metric groups. |
| Exact origin-local training populations | PASS | All six recorded training populations/counts/hashes and target calendars reconcile to accepted frozen rows. Engine supplies only values at or before the origin. |
| No post-origin value leakage in added adapters | PASS | [Adapter receipt](adapter-leakage-verification.json): 30 independent probes across six new adapters and all five development origins replace every later value with alternating ±10¹⁵. Predictions/reasons remain unchanged and every retained lead agrees with the artifact. Direct ridge training targets end at the origin; recursive ridge feeds its own predictions into unknown lags. Feature transforms fit training rows only. |
| Uncertainty support and future-outcome exclusion | PASS | Independent lead-specific support reconciliation; all unsupported 80%/95% bounds remain null. Maximum six errors per lead is below the required 20/40. This verifies honest unavailability, not calibrated confidence intervals. |
| Post-audit exploratory labels and publication separation | PASS | `exploratory_evaluated_unpublished`, explicit previously inspected 2025 audit, nonpromoting protocol, false publication approval, exploratory model cards and no release draft. |
| Focused Python regressions on changed source | PASS | [QA test log](contract-tests.log): **35 tests passed in 9.853 seconds**, exit 0. Covers predictive, coverage, diagnosis, rolling, legacy forecast-validation and extended-model suites. Nonconvergence warnings in controlled fixtures are retained; actual extended run has complete predictions and only documented initialization warnings. |
| Candidate-storage code and actual artifact validation | PASS | Read-only review of `predictive-candidate-contract.ts` and the persistence diff; actual `readCandidateArtifact` execution returns the exact extension run hash, 1,524 predictions, 21 evaluations and 2025-12-01 cutoff. [Final validator receipt](backend-candidate-validation.json) binds the amended validator/persistence bytes and independently probes the separate approval flags and forbidden exploratory untouched-holdout stage. Hash validation precedes warehouse calls; values use existing SQL literal encoding; candidate namespace and full readback remain distinct from approved publication. No pointer-write operation exists in the persistence script. |
| Untouched final assessment of revised recipes | FAIL for operational promotion | 2025 was already inspected before the extension was designed. It remains a retrospective audit. Later untouched accepted actuals are required. |
| Supported operational uncertainty | FAIL for operational promotion | Five development origins / six errors after audit cannot supply the registered 20/40 per-lead support thresholds. |
| Current twelve-month October 2026–September 2027 window | FAIL for complete current-window forecasting | December 2025 origin makes the requested months leads 10–21; current evaluation supports leads 1–12. October–December 2026 are within that range; later requested leads are unsupported. |
| Business acceptable-error policy and artifact-bound data/model approval | NOT VERIFIED | Current criteria are experimental and supplied data publication approval remains false. Passing technical checks does not change these decisions. |
| Historical source/feature availability vintages | NOT VERIFIED | Revised snapshot has no historical availability vintages; technical leakage probes do not create them. |
| SKU/unit/territory demand, external regressors and replenishment | NOT VERIFIED | Company PHP forecasts do not validate the separate quantity/mapping/issue-time-feature or inventory/supplier/lead-time/expiry contracts. |
| Fresh warehouse persistence, active pointer and rollback | NOT VERIFIED by this QA worker | No warehouse mutation or direct cloud-pointer query was performed here. The task owner owns fresh persistence/readback and any cloud evidence. |

The extended receipt records **538 passing checks**. SARIMA airline is the best
new development configuration at **87.879445% WAPE**, still worse than last
value's **83.199360%**. Its 2025 audit WAPE is **63.376322%**; last value's is
**37.763644%**. Adding model families does not improve this measured outcome.

The final candidate validator correctly permits explicitly approved **data**
to train a still-unpublished model. It rejects model publication approval and
rejects `untouched_holdout` point labels in the post-audit exploratory suite.
All four independent final-validator probes pass; both approval flags remain
false in the exact stored extension artifact. This amendment does not change
model code, model metrics or the preceding numerical verification.

## Reproduction

From the repository root, use `.venv-predictive/Scripts/python.exe`:

```powershell
.\.venv-predictive\Scripts\python.exe outputs/predictive_completion_20261009/qa/verify_run.py --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --run outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a --baseline outputs/predictive_validation/2026-10-09T13-28-48-501Z/model-run/11648be69f44f87d746b45904acc01a4790bf24d348940941940f01caab7997c --output outputs/predictive_completion_20261009/qa/extended-verification.json --verify-current-code
.\.venv-predictive\Scripts\python.exe outputs/predictive_completion_20261009/qa/verify_adapters.py --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --run outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a --output outputs/predictive_completion_20261009/qa/adapter-leakage-verification.json
.\.venv-predictive\Scripts\python.exe -m unittest services.tests.test_predictive services.tests.test_predictive_coverage_review services.tests.test_predictive_diagnosis services.tests.test_predictive_rolling services.tests.test_forecast_validation services.tests.test_predictive_extended
```

The first verifier imports no predictive implementation. The adapter verifier
imports adapters only to test input sensitivity and does not claim independent
model implementation or historical source availability.

Skills applied: `.skills/testing-standards.md` for risk-scaled acceptance checks;
`.skills/analytics-frameworks.md` for temporal cohorts, independent numerical
expectations and bias/uncertainty definitions; `.skills/database-standards.md`
for source/grain/hash reconciliation and candidate/publication separation;
`.skills/coding-standards.md` and `.skills/technology-stack.md` for standalone
offline verification; `.skills/backend-standards.md` and
`.skills/security-standards.md` for the subsequent persistence-boundary review.
Canonical predictive blueprint, operations, testing, database, API and security
guidance informed the bounded plan and actual failure selection.

No blocking product defect was found in the reviewed local delivery. The next
owner is the task owner for warehouse evidence and integrated documentation,
and the named data/model owners for later accepted actuals, error tolerance and
artifact-bound operational acceptance.
