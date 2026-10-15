# Predictive operation and review

## Evaluate a bounded error reduction revision

The [registered six-recipe experiment](../outputs/predictive_error_optimization_20261010/README.md)
adds recent medians, a fixed weighted median, seasonal median shrinkage and a
bounded origin-local absolute-loss calibration. These are exploratory methods
on the same company revenue target; they do not establish medicine demand.
The code deliberately supports the retained 2020–2025 window and five original
development origins. Changing that window or protocol requires a reviewed
revision. Register the recipes, source/comparison/code hashes and packages
before execution, using a new empty output directory:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 -m services.analytics_service.predictive.robust_error_experiment --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output NEW_ROBUST_DIRECTORY --prepare
.\.venv-predictive\Scripts\python.exe -X utf8 -m services.analytics_service.predictive.robust_error_experiment --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output NEW_ROBUST_DIRECTORY
```

Each outer recipe needs 36 contiguous eligible origin-known months. Calibration
uses only complete inner quarterly origins and next-twelve-month targets known
by the outer origin, with a fixed 0.9–1.1 scalar bound. Retain the small dependent
inner support, learned scalars, traces and warnings. Missing or malformed output
leaves the entire fold unavailable. Do not drop difficult targets, clip signed
values or alter eligibility to improve a score.

Freeze the lowest-MAE complete new development recipe before the audit and
record qualification under the unchanged original gates separately. Retain all
trials and compare MAE/PHP and WAPE/% on identical keys within each cohort.
The earlier development and 2025 audit were already inspected: this supplement
is exploratory and cannot produce an untouched test. Stop after the registered
six recipes; do not reselect from audit rankings or tune additional methods in
response to them. [Current state](CURRENT_STATE.md) records the mixed results.

The original model selection and annual projections remain intact. The new
run does not publish a model, produce 2026 accuracy or supply runtime fallback
values. Client tolerance, later accepted actuals and applicable source/model
acceptance remain separate requirements. See [verification](TESTING.md) and
the [complete same-cohort report](../outputs/predictive_error_optimization_20261010/RESULTS.md).

## Interpret the evaluated results

Use [the predictive explanation](logic/PREDICTIVE_ANALYTICS_EXPLAINER.md) for the
client question, executed model families, temporal validation, formulas and paper
wording. The [recomputed scorecard](../outputs/predictive_explanation_20261010/SCORECARD.md)
provides development-only family representatives, all model rankings, the twelve
2025 retrospective-audit months, over/underforecast amounts and actual calendar
lead mappings. Its [delivery record](../outputs/predictive_explanation_20261010/README.md)
retains numerical verification and source identity. It is a derivation of existing
predictions, not a new fit, model selection or approved release. Current status and
changing counts remain in [current state](CURRENT_STATE.md).

## Review error policy before business acceptance

The [guided error-policy record](OBJECTIVE_EVIDENCE_REGISTER.md#predictive-error-policy--10-october-2026)
defines joint MAE/PHP and WAPE/% reporting with provisional equal absolute-error
weights and explicit direction diagnostics. The
[error-policy packet](../outputs/predictive_error_policy_20261010/README.md)
derives the existing 21 recipes' development and retrospective-audit results
without fitting, reselection or publication. Its numerical QA binds the exact
saved populations and source artifacts.

The maximum cohort MAE and WAPE limits remain null. Capture the client's peso
amount and percentage together with the target, evaluation period, required
actual leads and intended decision before assessing business acceptability.
Both agreed limits must be met on that same cohort; a missing limit is not a
pass. Do not use prior audit errors as automatic limits or treat aggregate error
as each month's maximum. Retained 2026 projections lack actuals and receive no
accuracy assessment. A later cost-based revision needs its own frozen policy;
the original comparison criteria and selection remain intact.

## Read errors in dashboard outputs

The monthly evidence table and its CSV export report absolute error and signed
error in the selected target's units. Signed error is prediction minus actual:
positive is overforecasting and negative is underforecasting. A zero miss remains
zero. A monthly error is scored only for a historical backtest with finite
prediction and actual values whose backtest actual matches the displayed actual.
Missing, mismatched, history-only and future-period pairs remain unavailable with
an explicit reason; they are not replaced with zero.

Historical MAE, RMSE, WAPE and mean signed error use the selected gateway result's
evaluation cohort. The cards identify target units and the CSV retains the
historical evaluation period, protocol and scored count. These summaries can cover
more history than the displayed table. A future row carrying historical summary
columns does not have measured future-period error. Source, model, scope and
publication labels remain attached to each export. This presentation does not
load the offline 21-model scorecard into the live four-benchmark response.

Lower MAE/WAPE is preferable on the same targets and forecast leads. Assess model
usefulness against simple benchmarks and the client's agreed decision-specific
limits; there is no universal WAPE percentage that establishes acceptability.
WAPE is total absolute error divided by total absolute actual sales. For example,
10% means an aggregate absolute miss of ₱10 per ₱100 of absolute actual sales;
it is an illustration, not an approved limit or an accuracy percentage. See
[point forecast evaluation](https://otexts.com/fpp3/accuracy.html) and
[the WAPE definition and limitations](https://robjhyndman.com/hyndsight/wape.html).
The [output verification packet](../outputs/predictive_error_visibility_20261010/README.md)
records presentation checks; it does not establish model performance or client
acceptance. Current business tolerance status remains in [current state](CURRENT_STATE.md).

## Project from the latest annual release

The [annual projection packet](../outputs/predictive_annual_release_20261010/README.md)
uses the retained 21-recipe comparison to fit each recipe once through December
2025 and project January–December 2026. Monthly targets remain monthly even when
actuals are released yearly. This is a final-origin research fit, with inherited
selection and historical metrics; it neither repeats evaluation nor measures
2026 error. [Current state](CURRENT_STATE.md) owns executed counts and results.

Register before fitting, using a new directory for each execution:

```powershell
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive.annual_projection --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output NEW_ANNUAL_DIRECTORY --as-of 2026-10-10 --prepare
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive.annual_projection --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output NEW_ANNUAL_DIRECTORY --as-of 2026-10-10
```

Use the actual current Manila reference date when reproducing. The run separately
records its actual UTC generation time; `--as-of` does not create a historical
issue date. The present module deliberately accepts this frozen comparison's
January 2020–December 2025 window and leads 1–12. A later source window needs a
new reconciled input and reviewed protocol, rather than silently extending it.
Input/comparison checksums, adapter code, packages, recipes and training values
must match registration. Partial, malformed, nonfinite or nonconverged adapter
results leave the entire recipe unavailable; signed predictions are preserved.

Output status is `annual_projection_research_unpublished`. Actuals and unsupported
80%/95% intervals remain null, and elapsed/current/future target labels reflect
the reference date. The report retains all configurations, prior evaluation
metrics and warnings. This format emits no release draft and is not an accepted
input to the existing warehouse candidate publisher. It is not a gateway fallback.

At the next annual source release, whose date remains unconfirmed, reconcile
the source and period closure, assess retained projections against accepted
actuals, and distinguish elapsed targets from targets future at generation.
Freeze any revised recipes and evaluation protocol before fitting. Preserve
issue dates, prior outputs and the inspected-audit limitation. Data/model
acceptance, business error tolerance, uncertainty and quantity/inventory
contracts remain separate requirements for operational use.

## Source review before another model revision

The [10 October continuation packet](../outputs/predictive_readiness_20261010/README.md)
retains the fresh read-only source check, original-to-eligible Net CP bridges,
independent QA and specific source-owner questions. [Current state](CURRENT_STATE.md)
owns its counts and readiness conclusion. No new accepted actuals or verified
origin-available explanatory feature was identified; the existing evaluated
models remain unchanged. Use [the source-owner review](../outputs/predictive_readiness_20261010/SOURCE_OWNER_REVIEW.md)
to bind timing explanations and any corrections to original records before
freezing a revised recipe. The inspected 2025 audit remains retrospective.

## Registered SARIMA and lag-regression extension

The [completed research delivery](../outputs/predictive_completion_20261009/README.md)
retains the original frozen comparison and adds an explicit exploratory suite.
Its model cards, warnings, origin-local folds, predictions, independent QA and
candidate-storage receipts are inspectable. [Current state](CURRENT_STATE.md)
owns the latest results and acceptance status; [study overview](STUDY_OVERVIEW.md)
connects this work to the original objectives.

Register a new experiment directory before fitting, then evaluate without changing
the registered input, code, environment, configurations or criteria:

```powershell
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive.extended_experiment --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --output NEW_EXPERIMENT_DIRECTORY --prepare
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive.extended_experiment --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --output NEW_EXPERIMENT_DIRECTORY
```

The optional suite adds two restrained SARIMA specifications and four regularized
lag recipes, direct and recursive at two fixed penalties. All transformations
fit origin-known training rows. Direct-model training targets end at the origin;
recursive unknown lags use the model's own predictions. The engine also enforces
the cutoff before calling an adapter. Missing observations are not imputed,
signed values are preserved, and SARIMA nonconvergence remains unavailable.

This suite emits `exploratory_evaluated_unpublished`, never an approved release
draft. Since it was designed after the old audit was inspected, later untouched
accepted actuals are needed for promotion. The original command below still
uses the original model grid. The candidate-persistence command accepts both
unpublished forms, verifies all declared artifact hashes and model/calendar
identities, and stores a deterministic hash for either source-identity format.
Data approval does not automatically approve the model. Candidate persistence
does not create reviews, release manifests or pointer writes.

## Current candidate — 9 October 2026

The [Gold-20 evaluation](../outputs/predictive_validation/2026-10-09T13-28-48-501Z/REVIEW.md)
refreshes the source binding and reproduces all 15 existing configurations.
The full input retains 2017–2025; training/evaluation uses the separately
attested contiguous 2020–2025 window. The prior user decision is inherited only
after [exact monthly target/provenance comparison](../outputs/predictive_validation/2026-10-09T13-26-49-490Z/training-inheritance-comparison.json),
with its original attribution and date preserved. It is not new independent
completeness verification or model publication approval.

Current frozen input:
`outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json`.
The offline evaluation and 21 contract tests pass. Last value remains unpublished;
no challenger qualifies, development WAPE is 83.199360%, and the 2025 retrospective
audit WAPE is 37.763644%. Fact identity refresh does not improve these unchanged
targets. No new warehouse persistence or model activation was performed.

Continue with source/order/price composition investigation and a documented
acceptable-error policy. Revised recipes require later untouched accepted actuals;
the already-inspected 2025 audit cannot become a new untouched holdout. Current
sales history ends December 2025, so a current October 2026 12-month view needs
leads 10–21 beyond the existing 1–12 evaluation. Medicine-unit forecasts require
verified SKU/unit inputs, and disease/weather regressors require accepted joins.

`07_predictive_contracts.sql` and `08_predictive_frozen_input.py` are parameterized;
they need no year/version edits solely for this source refresh. Their warehouse
deployment is separate from the completed local model evaluation below.

## Earlier checkpoint — 27 September 2026

Previously evaluated run: `outputs/predictive_validation/2026-09-27T14-30-12-921Z/REVIEW.md`.
The user provided training-only completeness attestation; all 15 configurations
now run, including Prophet 1.4.0 in `.venv-predictive`. Last value is selected but
recommended to remain unpublished due to high errors. Earlier missing-package and
training-blocked statements below describe the initial checkpoint.

Persist complete offline experiment evidence without publication from `backend/`:
`node --import tsx scripts/persist-predictive-candidate.ts PATH_TO_RUN_JSON`.
This verifies artifact hashes, stages all candidates and reads back every payload.
Warehouse experiment IDs are artifact-hash namespaced to avoid colliding with the
later selected-model publication representation. It does not create a review,
approve a release, or change the publication pointer.

The company-month target is eligible recorded `net_sales` (source `net_cost`),
in PHP, including signed returns and all financially eligible item kinds.
Databricks is the analytical source. Local artifacts are offline audit inputs;
the gateway never reads them as fallback data.

## Freeze and reconcile

To prepare an unsigned monthly decision artifact from a frozen input, run
`python -m services.analytics_service.predictive.prepare_coverage --input INPUT.json --output NEW_DIRECTORY`.
It verifies the input hash, writes a review table and leaves every decision unknown.
The extractor rejects malformed, mismatched and contradictory coverage decisions.
The user subsequently attested 2020–2025 completeness in this session; that
training-only decision is retained in `outputs/predictive_validation/coverage-review-v16/`.
It does not constitute independent verification or model publication approval.

From `backend/`:

```powershell
node --dns-result-order=ipv4first --import tsx scripts/extract-predictive-input.ts ../outputs/descriptive_validation/2026-10-09T07-40-39-615Z/evidence.json ../outputs/predictive_validation/2026-10-09T13-26-49-490Z/coverage-review.inherited-training.json
```

Use a new descriptive receipt for a new accepted source. The script verifies its
sidecar SHA-256, reads the exact fact Delta version, reconciles source counts and
monthly/yearly revenue in cents, and writes `input.json`, `input.sha256`,
`reconciliation.json`, `eligibility.json`, and `exclusions.json` under a timestamped
`outputs/predictive_validation/` directory. Independent transaction verification
counts are null when that field is absent in the pinned warehouse version.

The optional second file is a real coverage/acceptance receipt. It must bind
`dataset_id`, integer `fact_delta_version`, `descriptive_receipt_sha256`,
`reviewer`, `reviewed_at`, and `evidence_reference`. It carries explicit
`training_approved` and `publication_approved` decisions and a `periods` mapping
keyed by `YYYY-MM`, with `period_closed`, `coverage_status` (`complete`, `partial`,
or `unknown`) and, only where supported, `confirmed_zero_activity`.
Do not create approval from transaction presence or calendar closure. The current
receipt is still a business-review candidate; absent coverage leaves training blocked.

## Evaluate offline

From the repository root, substituting the generated input path:

```powershell
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --output NEW_MODEL_DIRECTORY
```

The input sidecar checksum is required. The run records input/configuration/code
hashes, package versions, seed, runtime, exact fold populations, predictions,
metrics, model cards and artifact hashes. `--benchmarks-only` excludes challengers.
`--schedule reviewed-schedule.json` allows a reasoned schedule adjustment before
evaluation. Default: training starts January 2020, quarterly development origins
December 2022–December 2023, leads 1–12, and December 2024 origin for a 2025
**retrospective audit**. Coverage gates must pass. Selection uses development
results only and the blueprint's frozen experimental criteria.

Models: last value, seasonal naive, 3/6-month means, two additive seasonal ETS
variants and nine restrained sales-only Prophet configurations. Missing packages
produce unavailable candidates. The current predictive environment executes
statsmodels and Prophet; earlier missing-package statements are historical.
No actual champion is selected when input acceptance is blocked. Five development origins cannot supply the
required 20/40 errors per lead for 80/95% empirical intervals; null bands are expected.

## Warehouse preparation, publication and rollback

1. Deploy `databricks/medshield_project/07_predictive_contracts.sql` through the
   controlled deployment process. This creates candidate tables and coherent
   release views; it does not activate a model.
2. The checked TypeScript deployment path is, from `backend/`:
   `node --import tsx scripts/deploy-predictive-contracts.ts input.json output-directory`.
   It applies additive DDL, persists the checksum-bound candidate input with an
   idempotent MERGE and verifies every stored payload. Alternatively upload the
   frozen artifact to a governed Unity Catalog Volume and run
   `08_predictive_frozen_input.py` with its path and byte SHA-256. It reconciles
   persisted candidate rows. This alternate notebook path is not cloud-verified.
3. An eligible evaluated run emits `release-draft.json`. Review its actual audit,
   selection, scope, completeness and data approval. Only an authorized review
   may change `publication_status` from `candidate` to `approved`. Compute the
   approved payload byte SHA-256 and bind it in a separate model review containing
   `review_id`, `run_id`, `dataset_id`, `artifact_hash`, `reviewer`, `decision`,
   `reviewed_at` and `evidence_reference`.
4. From `backend/`, prepare inspectable SQL without remote writes:
   `node --import tsx scripts/publish-predictive-release.ts approved-payload.json review.json preparation.json --prepare`.
   After review, the same command with `--activate` stages idempotent immutable
   run/point/evaluation/review/manifest rows, checks readback and changes one pointer.
   **Serialize publication jobs**; concurrent publishers are not supported.
5. Roll back by replaying the previous compatible approved payload and its exact
   review through the same validator/publisher. Its source versions stay visible;
   the reader never attaches newer descriptive actuals. The pointer records its
   predecessor. Cloud activation/rollback remains unverified until deployed.

At the initial deployment checkpoint, nine additive DDL statements were executed and 108 candidate input rows were
persisted and fully reconciled in Databricks. `warehouse-receipt.json` records
the DDL/input hashes and an empty model pointer. No training/model approval or
model activation was performed at that checkpoint. This training blocker was
subsequently superseded by user-attested acceptance and the full 15-configuration
evaluation recorded in the blueprint. Model publication remains unapproved.

## Monthly-refresh development experiment

Use the separately registered exploratory protocol; this does not replace the
fixed-origin release evaluation or consume 2025 observations as training targets.
From the root, run with a new output directory:

```powershell
python -m services.analytics_service.predictive.rolling_experiment --input <frozen-input.json> --output <experiment-directory> --prepare
python -m services.analytics_service.predictive.rolling_experiment --input <frozen-input.json> --output <experiment-directory>
```

Registration binds the input hash, code hashes, environment and frozen schedule
before evaluation. January 2023–December 2024 targets are shared across annual
fixed-origin and monthly one-step schedules; each adapter receives only history
through its origin. Incomplete models cannot shrink the complete-model scoring
population. Results include per-year scores and missing predictions. The command
refuses changed registration or replacement of existing result files. It writes
local exploratory evidence only; there is no automatic selection or publication.
Historical source availability remains an assumption because the input is a revised
snapshot. The experiment was proposed after inspecting the old audit; any resulting
new recipe needs a later untouched evaluation.

## Verification

For a frozen error assessment, run
`python -m services.analytics_service.predictive.diagnose --run <run-directory>/run.json --output <diagnosis-directory>`.
Optionally supply `--composition <diagnosis-directory>/composition.json`, produced
from `backend/` with
`node --import tsx scripts/extract-predictive-composition.ts <frozen-input.json> <diagnosis-directory>`.
The extractor reads the pinned fact version and reconciles monthly counts/revenue;
the diagnosis checks hashes and source identity. Composition attribution currently
assumes the selected last-value method. It explains recorded changes, not causation.
The September 27 completed assessment and limitations are in
`outputs/predictive_validation/2026-09-27T14-30-12-921Z/diagnosis/FINDINGS.md`.

From root: `python -m unittest services.tests.test_predictive services.tests.test_forecast_validation`.
From backend: `node --import tsx --test tests/forecast*.test.ts tests/predictiveRelease.test.ts`
and `node node_modules/typescript/bin/tsc --noEmit`.
From frontend: `node node_modules/@playwright/test/cli.js test e2e/forecast-validation.spec.ts --workers=1`
and `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
Live authenticated checks: `node node_modules/@playwright/test/cli.js test e2e/predictive-live.spec.ts --workers=1`.
Do not run a frontend production build while `next dev` owns `.next`.

Fixture checks prove contracts, leakage safeguards and display parity, not model
accuracy or cloud deployment. See the blueprint milestone record and timestamped
predictive evidence directory for actual outcomes and unresolved checks.
