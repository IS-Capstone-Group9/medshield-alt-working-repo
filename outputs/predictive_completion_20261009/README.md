# Predictive modeling delivery — 9 October 2026

Accountable role: Orchestrator, supported by a Data Analyst, independent QA
Engineer and Technical Writer. This completes the bounded company monthly
net-sales research comparison and candidate retention. Operational forecasting,
the original medicine-demand objective and business/academic acceptance remain
open. The models have material errors; no challenger qualifies.

## Delivered behavior

- Preserve the original four benchmarks, two ETS and nine Prophet configurations.
- Add an explicitly registered exploratory suite with two SARIMA and four direct/
  recursive ridge recipes. The default original model grid stays unchanged.
- Enforce origin-local training at the engine and adapter boundaries. Fit feature
  scaling only from training rows; recursive lags use model predictions. Retain
  signed values and surges without imputation, clipping or outlier deletion.
- Preserve unavailable predictions for missing history, unsupported leads or
  nonconvergence. All fits in this actual experiment completed; initialization
  warnings remain in the model artifacts.
- Validate every declared artifact before candidate storage. Preserve approval
  fields, exact model/run identities and calendar leads. Data approval can coexist
  with an unpublished model; it never activates that model.
- Retain the frozen input and complete experiment in Databricks candidate tables,
  with exact payload readback and an unchanged empty release pointer.
- Make live browser evidence configurable so September receipts are not
  overwritten; assert the expected current fact version and dataset.
- Produce the [whole study overview](../../docs/STUDY_OVERVIEW.md), checked model
  figures and fresh fact-20 accounting-contribution diagnosis.

## Source and evaluation contract

Fact: `workspace.medshield_gold.sales_restart_fact_candidate`, Delta **20**.
Dataset: `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
Policy: `sales_restart_gold_v7_independent_catalog`.
Frozen input SHA-256:
`04be4f529101f2117a5045d686158708e2b39d55957a3b119b22a30aa72c63ba`.
Run SHA-256:
`9889baea07a1f222edc9d2d2576fefc0d2be4bc8e52dc4d9a3ff9919e0056f45`.

The study retains 2017–2025, 37,728 records and 98 observed months out of 108.
Training/evaluation uses the separately user-attested contiguous 2020–2025 window.
Earlier missing targets remain null. The target is recorded company net sales in
PHP, including eligible signed adjustments; it is not medicine-unit demand.
Completeness attestation and adjusted-source provenance remain explicit.

The extension was registered before fitting at 22:06:31 Asia/Manila. Each of 21
configurations has the same five development origins and leads 1–12: 60 development
keys per model. A December 2024 origin supplies twelve 2025 retrospective-audit
keys. Selection uses development only. Because the audit had already been inspected
before this extension was designed, it cannot become a new untouched test.

## Results

Last value remains selected: **83.199360% development WAPE**, **37.763644% audit
WAPE**, **₱5,834,383.00 monthly audit MAE**, **₱6,956,031.72 audit RMSE** and
**+8.383545% normalized audit bias**. Positive bias means overforecasting.
The best new SARIMA has 87.879445% development WAPE, worse than the benchmark.
All new ridge recipes are also worse. Existing improvement and bias/horizon rules
were not weakened to choose a fitted challenger. Lower audit percentage error
coexists with larger peso errors because the actual-sales denominator is larger.

![Checked family comparison](model-comparison.png)

Each displayed family member is chosen by development WAPE for presentation only.
The [full 21-model table and warnings](models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/RESULTS.md)
retain every configuration. [Audit plot](audit-comparison.png) shows the changing
2025 actuals alongside the benchmark and exploratory SARIMA.

The [fresh baseline diagnosis](diagnosis/baseline/DIAGNOSIS.md) binds the unchanged
benchmark errors to fact-20 source composition. All four dimensions reconcile
monthly counts and revenue. GOVERNMENT-labelled movements contribute substantially
to several largest misses; this is accounting attribution, not evidence of order
timing, disease causality or approved customer identity.

## Executed checks and candidate storage

| Criterion | Actual result | Evidence |
|---|---|---|
| Registered full model evaluation | 21 configurations, 1,524 points; no challenger qualifies | [Evaluation log](models/evaluation.log), model results above |
| Independent Decimal verification | 538 checks / 441 metric groups pass | [Receipt](qa/extended-verification.json) |
| Origin-local adapter sensitivity | 30 future-value sentinel probes pass | [Receipt](qa/adapter-leakage-verification.json) |
| Original prediction preservation | All 1,092 original points agree | Independent receipt above |
| Python predictive/coverage/rolling/diagnosis/extended regressions | 35 pass | [Independent log](qa/contract-tests.log) |
| Gateway and candidate-boundary regressions | 16 pass | [Final log](backend-final-tests.log) |
| Browser fixtures and live authenticated API/UI | 6 pass: four fixtures, two live | [Receipt](browser.json), [log](browser.log) |
| Candidate scripts/tests TypeScript | Exit 0 | [Log](backend-candidate-typecheck.log) |
| Frontend TypeScript | Exit 0 | [Log](frontend-typecheck.log) |
| Governed frozen-input storage | 108 rows; exact payload readback | [Receipt](warehouse-input/warehouse-receipt.json) |
| Governed experiment storage | 1,524 points and 21 evaluations; exact readback | [Receipt](models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/candidate-warehouse-receipt.json) |
| Publication separation | Empty pointer unchanged; zero model reviews/manifests | [Before](warehouse-before.json), [after](warehouse-after.json) |

The warehouse experiment ID is
`experiment_9889baea07a1f222edc9d2d2576fefc0d2be4bc8e52dc4d9a3ff9919e0056f45`.
Candidate stages use immutable artifact namespaces and exact readback. No new
data/model review, approved release, active forecast or remote hosting deployment
was created. Existing local services and unrelated working-tree changes were
preserved. No Next production build ran while its development server owned `.next`.

## Open acceptance requirements

Operational forecasting is not complete. The measured errors lack an agreed
business tolerance; revised recipes need later untouched accepted actuals. There
are only five development errors per lead, below the 20/40 support requirements,
so 80%/95% bands remain unavailable. A December 2025 origin supports the evaluated
leads 1–12, whereas October 2026–September 2027 requires leads 10–21. Updated
accepted actuals or separately evaluated longer leads are needed.

Historical issue-time source vintages remain unverified. SKU/pack/unit/territory
demand requires reviewed identities and quantity evidence. Disease/weather
regressors require approved joins and issue-time availability. Procurement
requires verified inventory, supplier, lead-time, expiry and cost inputs. None
of these missing contracts is supplied by a company-revenue model.

Reproduction and publication steps are in
[Predictive operations](../../docs/PREDICTIVE_OPERATIONS.md) and
[Testing](../../docs/TESTING.md); the [independent QA review](qa/REVIEW.md)
records exact verification commands and limits. The named data/model owners own
operational acceptance; the CEO owns business scope and the adviser/panel owns
academic amendments.

Applied repository skills: product management and business analysis scoped the
outcome and acceptance; analytics/database standards defined temporal populations,
provenance and independent expectations; architecture/stack standards preserved
offline training and the Gold gateway boundary; backend/security/coding standards
governed candidate validation; testing standards informed leakage, hashes and live
checks; frontend/documentation standards informed truthful display and the study
overview. Separate agents performed numerical QA and writing; root integrated
changes and verified warehouse persistence.
