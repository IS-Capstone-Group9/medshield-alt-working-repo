# Predictive operation and review

Latest evaluated run: `outputs/predictive_validation/2026-09-27T14-30-12-921Z/REVIEW.md`.
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
node --import tsx scripts/extract-predictive-input.ts ../outputs/descriptive_validation/2026-09-27T06-41-37-034Z/evidence.json
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
python -m services.analytics_service.predictive --input outputs/predictive_validation/2026-09-27T08-56-19-553Z/input.json --output outputs/predictive_validation/2026-09-27T08-56-19-553Z/model-run
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
produce unavailable candidates. The current environment has statsmodels; Prophet
was not installed or trained by this delivery. No actual champion is selected
when input acceptance is blocked. Five development origins cannot supply the
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
