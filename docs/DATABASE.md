# Data Stores

## Current warehouse readback — 20 October 2026

The [currency review](../outputs/warehouse_review_20261020/README.md) verifies the active fact 20 source and current descriptive/frozen-input/STL/research relationships. It identifies one bounded derived-rate discrepancy: 81 aggregate margin percentages require NULL for nonpositive matching revenue. The [controlled maintenance migration](../databricks/medshield_project/maintenance/MARGIN_RATE_PATCH.md) is prepared, with existing baseline versions 11/10/11/10 for the four targets. It has not been applied remotely. Source fact, financial amounts, model inputs and publication state are unchanged. Use this current readback ahead of historical predecessor 19 preparation instructions; preserve old objects until dependencies/recovery are assessed.


## Backup/restore readiness —17 October2026

The [runbook](BACKUP_RESTORE.md) and [local rehearsal](../outputs/backup_restore_20261017/README.md)
record a passing synthetic PostgreSQL16 logical backup/loss/restore with effective
permissions, linked profiles, all-table fingerprints and audit checkpoint/append
continuity. This is separate from the metadata-only live-rollout snapshot and is
not full managed17.6 Auth/PostgREST/role/file/platform/warehouse recovery.
No live source backup/restore or account change occurred. Complete live backup,
separate approved destination, protected storage and actual recovery acceptance
remain open. Stopped local fixture directories remain after cleanup deletion was
rejected by automatic approval review; no fixture server is left running.

## Live Supabase operational rollout — 17 October 2026

The [verified rollout](../outputs/supabase_live_migration_20261017/README.md)
applies ledger20261017011431 (audit),20261017011439 (analytical permissions) and
20261017011928 (explicit service reads) to the existing MedShield target.
Canonical timestamped SQL filenames match those ledger versions. The live
layout already had21 private legacy views and no public refresh wrapper; audit
objects were missing. Reviewed targeted migrations reconcile that layout without
replaying the historical001–017 chain or replacing accounts/business records.
Do not blind-push the historical migration directory into this target; inspect
its ledger and structure before future migration selection.

All35 original table/stable-Auth fingerprints match;21 private views use invoker
semantics, browser analytical privileges are denied, and actual service reads
of57 relations succeed. The service grant repair adds only schema USAGE and
SELECT on existing analytical objects. Supabase analytical tables remain legacy
or candidate storage; dashboard measures continue to come from Databricks.
Actual API login/profile/audit checks pass39/39. A private metadata-only recovery
snapshot exists; full platform backup/restore was not verified. Earlier dated
local-only sections below remain history; see the rollout for current live scope.

The latest governed predictive continuation retains the source-bound monthly
input and the exploratory model experiment in the existing candidate contracts.
Exact readback receipts are linked from the
[predictive delivery](../outputs/predictive_completion_20261009/README.md).
Candidate storage preserves the supplied approval fields; it does not create
model reviews or approved release manifests. See [current state](CURRENT_STATE.md)
for current counts, source identity and publication readiness.

Predictive continuation: the complete 15-configuration experiment is persisted
in candidate run/point/evaluation tables under an artifact-hash experiment ID.
Readback reconciled all 1,092 prediction/backtest rows and 15 evaluations. This
experiment namespace is distinct from a reviewed selected-model release. No
release pointer was changed. See the final run's `candidate-warehouse-receipt.json`
under `outputs/predictive_validation/2026-09-27T14-30-12-921Z/model-run/`.

Predictive warehouse preparation: `07_predictive_contracts.sql` defines the frozen
monthly mart, immutable run/point/evaluation candidates, append-only model reviews,
release manifest, single active pointer and stable dashboard views. The associated
`08_predictive_frozen_input.py` loader checks input hash and stored content.
The nine additive DDL statements and 108 frozen candidate input rows were deployed
and reconciled by the TypeScript deployment script; the alternate Python notebook
remains unverified in Databricks. The model release pointer is empty. Publication
requires exact artifact-bound data/model review and verified readback before the
pointer changes. See [PREDICTIVE_OPERATIONS.md](PREDICTIVE_OPERATIONS.md).

## Responsibility split

| Store | Current responsibility | Excluded responsibility |
|---|---|---|
| Databricks Unity Catalog | Bronze source evidence, Silver assessed data, Gold candidate analytics, bridge views, NASA POWER history | Authentication and browser sessions |
| Supabase PostgreSQL/Auth | User identity, application-account linkage, roles, password lifecycle, and audit persistence | Runtime dashboard measures |
| Repository files | Raw/preparation inputs, mapping templates, offline QA, generated evidence | Live dashboard fallback |

## Databricks schemas

| Schema | Purpose |
|---|---|
| `workspace.medshield_bronze` | Immutable source manifests and raw rows |
| `workspace.medshield_silver` | Parsed, typed, assessed, and accepted candidate rows |
| `workspace.medshield_audit` | Dispositions, mapping reviews, replacement validation, quality and publication evidence |
| `workspace.medshield_gold` | Candidate fact, aggregate, external-context, weather, and application bridge views |

Current sales and external objects retain `_candidate` until the applicable business, mapping, and model gates are approved. Use [CURRENT_STATE.md](CURRENT_STATE.md) for the current population and pipeline versions.

## Supabase schemas and migrations

The files under `supabase/migrations/` document the identity, audit, and earlier analytical schema evolution. Apply them only in order and only to a compatible Supabase project. `supabase/schema.md` is a contextual schema dump, not an executable migration.

Some migrations and seed files contain earlier Supabase analytical models. Those tables remain useful for historical context and offline work, but the live dashboard no longer reads them for KPIs or charts. The administrator yearly synchronization route may maintain a protected candidate cache; that cache does not replace the live Databricks contract.

### Bootstrap and analytical access repair — 16 October 2026

Migration 011 now guards all five optional legacy function signatures before
revoking their browser execution. Fresh databases need neither namespaced
password-function stubs nor the optional platform event helper. Migration 012
continues to remove the retired password functions.

Apply [017](../supabase/migrations/017_retire_legacy_analytical_browser_access.sql)
after 016 through the reviewed migration process. It revokes PUBLIC, anonymous
and authenticated access, including independent column grants, from the five
dedicated analytical schemas and 21 named legacy public views. Retained views
use invoker semantics and explicit service SELECT. Legacy browser-read policies
and aggregate-refresh execution are retired; linked own-profile, service account
resolution, protected cache synchronization and atomic audit contracts remain.
It changes permissions and view options, not analytical rows or model outputs.

The [native verification record](../outputs/database_remediation_20261016/README.md)
reproduces the old failures and passes 237 assertions on disposable PostgreSQL 16
with synthetic Supabase roles/auth helpers. This verifies the declared ordered
bootstrap and old/custom-grant cases; it is not a remote Supabase migration.
The current connected audit endpoints return PGRST205, which cannot distinguish
missing objects from unexposed/stale schema metadata.

Before deployed acceptance, review backup/rollback and execute the ordered
pending migrations on the target project, then run the read-only
[effective-access inventory](../supabase/verification/legacy_analytical_access.sql)
as a permitted database owner/operator. Treat FAIL, MISSING_GATE and REVIEW_SCOPE
as unresolved gates. Check actual PostgREST/audit readback separately. Custom
dependent public views, inherited roles and future object creators/default
privileges need owner review;017 deliberately does not change global defaults
or unrelated public objects. Do not restore browser analytical grants to roll
back. Preserve data/identity objects and use a reviewed corrective migration.

## Data integrity rules

- Bronze source data is append-only evidence; corrections create new versions.
- Silver records explicit acceptance, warning, and rejection reasons.
- Gold metrics use eligibility flags and preserve dataset/policy identifiers.
- Estimated contract allocations must reconcile to their parent totals and remain labeled.
- Missing months or unavailable measures remain missing unless a documented calendar rule explicitly represents zero activity.
- Provider identity is preserved for PAGASA, NASA POWER, and DOH.
- The prepared Open-Meteo contract uses
  `workspace.medshield_silver.weather_open_meteo_monthly_candidate` and
  `workspace.medshield_gold.vw_weather_open_meteo_monthly_candidate`. Its refresh
  MERGE key is provider, period start and territory; model variant is retained
  metadata rather than an additional MERGE key. Expected/valid metric days,
  requested/grid coordinates, source hash/URL, timezone and point policy accompany
  each row. These remain candidate-only, join-unapproved and forecast-ineligible.
  The first authorized provider refresh creates/upserts this isolated contract;
  local tests are not cloud publication evidence. See [API](API.md#external-observations).

See the current [Databricks project README](../databricks/medshield_project/README.md)
and [project guide](../databricks/medshield_project/GUIDE.md) for sales and external
pipeline instructions.

## Schema documentation snapshot — 17 October 2026

The [schema documentation receipt](../outputs/schema_documentation_20261017/README.md)
retains read-only live catalog metadata, separate repository-defined inventories,
source hashes and dictionary/graph checks. The connected Obsidian project has
`MedShield/schemas/START_HERE.md`, linked field dictionaries and native Canvas
maps; access follows [project memory](PROJECT_MEMORY.md).

The snapshot distinguishes deployed identity, intended audit, retained Supabase
analytics, current warehouse contracts and additional live warehouse objects.
It is dated structural evidence, not a data-quality, active-release or migration
acceptance result. A separate live rollout was being prepared concurrently;
use its later execution/readback receipt when available. No schema/data changes
were made by the documentation task.


## Commercial extension

See [commercial backend contracts and verification](COMMERCIAL_BACKEND.md) for additive sales/forecast/allocation/reconciliation routes, optional operational migrations, offline jobs, and source acceptance limits.
