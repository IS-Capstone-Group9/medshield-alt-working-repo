# Data Stores

## Staged upload pipeline and warehouse release model — 7 November 2026

Provisioned and run live on 7 November 2026. Current head `5df98130b9ec13ef` holds the itemized 2017–2026 history seeded from pinned Gold (39,286 rows, ₱638,015,351.53 net); three earlier
synthetic test releases remain in the chain but no longer contribute rows. Dashboard reads are unchanged. Candidate stages live in `<catalog>.medshield_intake`
(`wh_bronze_lines`, `wh_silver_rows`, `wh_gold_fact_sales_line`, `wh_gold_dim_date`, `wh_gold_dim_area`,
`wh_gold_dim_product`, `wh_gold_mart_monthly`): insert-only envelopes keyed `(ingestion_id, record_key)`.
A promoted release is a new set of **typed** tables in `<catalog>.medshield_warehouse`, never an in-place update:

| Table | Grain / key |
|---|---|
| `release_<id>_fact_sales_line` | one accepted line; `sales_line_id` = hash of date, area, DR, product, measures and occurrence index; decimals `DECIMAL(24,6)` |
| `release_<id>_dim_date` | every day of every month from first to last sale; `has_sales` shows months without sales, which stay unknown and are not zero |
| `release_<id>_dim_area` | `area_key`; province, region, PSGC code and `territory_id` come only from the confirmed mapping `4c5f4401…`; every other label stays `unallocated`, with no inference; `is_external_join_ready=false` |
| `release_<id>_dim_product` | `product_key` (sha256 of normalized label); category and `category_status` (`approved`, `approved_unclassified`) |
| `release_<id>_mart_monthly` | `(calendar_month, product_category)`; records and net, plus margin measures over one eligible population (`margin_record_count`, `margin_net_sales`, `gross_margin`) |
| `release_<id>_mart_area_monthly` | `(calendar_month, area_key, product_category)` with `territory_id` and the same measures; reconciled to the fact |
| `release_pointer` | insert-only; the current release is the one no later row names as `previous_release_id`; written last |

Fact rows carry `candidate_only`, `forecast_eligible=false`, `source_unit_approved=false`,
`financial_release_approved=false`. Joins are by key only; the mart and dimensions are derived from the fact and
checked to reconcile (net sales and key integrity) before any write. External DOH/PAGASA/NASA signals are not
joined (mapping review is open); a future signal table must join by `territory_id` and month with an explicit
`external_join_ready` gate. Replacement is by declared month window with conservation checks. See
[staged pipeline](CONTROLLED_SALES_INTAKE.md#staged-pipeline-and-versioned-promotion) and [decision 010](DECISIONS.md).

## Delivery-area retrospective STL candidate — 2 November 2026

`backend/scripts/stage-delivery-area-stl.ts` follows prepare/apply/verify for a
separate immutable Delta0 candidate, with exact source/artifact/code preflight
and payload/history readback. Source tables and mappings are unchanged. Runtime
revalidates Gold inputs, calendar/windows, reconstruction and strengths.
[Exact table, hashes and receipts](../outputs/delivery_area_20261102/README.md).
Research staging does not grant financial/model activation approval.

## Original itemized snapshot retention — 2 November 2026

The bound original itemized candidate now explicitly retains Delta logs and
deleted files for 365 days. Metadata version 3 is `SET TBLPROPERTIES`; analytical
readers remain pinned to version 0. Receipt and contract tables were not changed.
The [guarded maintenance/evidence runbook](../outputs/snapshot_retention_20261102/README.md)
records preflight controls, exact SQL, live readback and idempotence. Data operator
reviews preservation by 26 September 2027; retention is not archival backup.

Optional controlled intake uses a separate `<catalog>.medshield_intake` schema
with `bronze_sales_candidate`, `silver_sales_candidate` and `gold_sales_candidate`.
Envelope keys are `(ingestion_id,record_key)`; source/account/policy hashes identify
the immutable file snapshot, not business transaction uniqueness across files.
Insert-only MERGE and full-envelope/decimal readback precede a verified report.
The tables are not dashboard analytical sources or an automatic replacement
path. Provisioning/permissions and actual Delta versions require operator evidence.
See [contract/setup](CONTROLLED_SALES_INTAKE.md).

## Regional PHP research candidate — 31 October 2026

The existing Gold `workspace.medshield_gold.fact_forecast_run_candidate` contains
one immutable `regional_php_dbb21eef89a5a90ba68460650b4490fb5c2cd5694ff95351734abaab13e92ce1`
row. `backend/scripts/stage-regional-forecast-research.ts` prepare/apply/verify
checks the retained artifact/registration/code and fresh regional Gold inputs,
then uses insert-only MERGE with exact byte readback. One insertion and an
identical zero-insert retry were verified. The 1.82 MB payload uses the existing
byte-preserving SQL literal path; metadata uses named parameters. No schema,
source fact, mapping, model pointer or approval changed. Runtime reads Gold and
fresh source controls only; local files are packaging/evidence, never fallback.
[Receipts and rollback boundary](../outputs/wp4_regional_php_ui_20261031/README.md).

## ABC research candidate — 31 October 2026

The existing Gold `fact_forecast_run_candidate` now has one immutable
`abc_5620b4d9af3b79258d0f687b00d102e7e3ea3625c78d70906c0ec460ba453dac`
row. Offline packaging verifies exact retained protocol/prediction/registration/
selection/report hashes; controlled `backend/scripts/stage-abc-research.ts`
prepare/apply/verify checks current original Gold inputs before an insert-only
MERGE. Exact readback and a zero-insert identical retry passed. This is a new
research artifact, not a schema/source/reference/model-pointer change. Runtime
reads only that fixed Gold key and fresh pinned Delta-0 aggregates; repository
packaging files never provide dashboard fallback values. Namespaces for existing
forecast research remain separate. [Receipts](../outputs/wp6_abc_ui_20261031/README.md).

## PHP tournament research candidate — 30 October 2026

The existing `workspace.medshield_gold.fact_forecast_run_candidate` now has one
insert-only `tournament_6f48c17c1e581864a42b5e34acc0747eff008fc7e8b87155e8bab0562d92055d`
row for the registered lead-1/3/6 retrospective PHP artifact. Controlled
`backend/scripts/stage-tournament-research.ts` prepare/apply/verify checks exact
registration/code/artifact identity and fresh original Gold monthly controls.
An identical retry inserts no row; missing, duplicate or conflicting content
rejects. No schema, source fact, category/mapping approval or operational model
pointer changes. Runtime reads Gold only; local preparation artifacts are never
fallback measures. [Receipts and limitations](../outputs/wp4_tournament_ui_20261030/README.md).

## Regional recorded-product sales priorities — 30 October 2026

No new table, schema, mapping, model row or publication pointer is created.
The gateway reads the current original itemized Gold fact pinned to Delta 0,
grouped by recorded area, calendar month and `normalized_product`, restricted
to the latest two recorded years and the nine confirmed delivery labels.
Values are encoded SQL literals; no browser-supplied identifier or join is used.
The complete bounded detail query must reconcile to the validated regional/month
record counts, signed net, supported gross profit and matching margin basis.
The gateway then derives the matched-month source-label ranking; other labels
remain unallocated, and product absence is not imputed as zero demand.
Query/aggregate hashes, existing dataset/policy/mapping identity and false
identity/unit/clinical/publication/procurement approvals travel with the result.
[Read-only evidence and limitations](../outputs/wp2_regional_product_priority_20261030/README.md).

## Original source metadata maintenance — 30 October 2026

The original itemized fact/receipt remain analytical Delta-0 contracts. Gateway
validation permits later `SET TBLPROPERTIES`/`COMPUTE STATS` commits only after
reading the complete contiguous descending chain to v0, bounded at 25 later
commits. Unknown, data/schema-changing, missing or excessive history rejects;
existing receipt hashes, source keys and full measure/count checks remain.
No migration or table write is introduced. The observed fact v1/v2 maintenance
and fresh v0 read are retained in [WP3 evidence](../outputs/wp3_regional_anomaly_ledgers_20261030/README.md).

## Confirmed-area derived API — 29 October 2026

The confirmed-area review adds no warehouse or application table. It reads the
existing original itemized Delta-0 fact and nine-label regional mapping, retaining
the exact 1,032 area-month control hash. The gateway projects checked amounts and
counts; the client derives selected-period signed area-net concentration and
matching-month comparisons. Unconfirmed labels remain unallocated. No Supabase
analytical source, data migration or source/master change occurs.
[Evidence](../outputs/so2_area_completion_20261029/README.md).


## Regional STL diagnostic candidate - 28 October 2026

`workspace.medshield_original_gold_20261026.regional_stl_b681c59b6fa1365d_candidate`
is a new immutable one-row Delta-0 diagnostic artifact. Controlled preparation,
CTAS, exact readback and identical zero-create verification pass. Its source is
the existing nine-label regional mapping and original Gold; source/master/mapping/
operational pointers are unchanged. The gateway rechecks current source identity,
calendars and reconstruction; this candidate grants no forecast or external-join
publication. [Exact identity and limits](../outputs/so1_regional_stl_20261028/README.md).

## Scoped delivery-region candidate - 27 October 2026

The isolated one-row Delta-0 candidate
`workspace.medshield_original_gold_20261026.regional_4c5f44013464395e_candidate`
stores the immutable user-confirmed nine-label mapping. Prepared CTAS, exact
readback and identical zero-create verification pass. Its financial consumer
validates current original Gold and all 1,032 source monthly groups; it does not
rewrite the original source's mapping flags or shared master. Unconfirmed/channel
labels remain in a conserving unallocated bucket; no proportional distribution.
[Exact identity, status and checks](../outputs/so1_regional_connection_20261027/README.md).

## BUPIRIGHT unit research candidate — 27 October 2026

The existing `workspace.medshield_gold.fact_forecast_run_candidate` holds one new
immutable `unit_baseline_<artifact_sha256>` row; prepared insert-only publication,
exact readback and zero-insert verification pass. Original source/master/schema
and operational pointers remain unchanged. Gateway checks exact payload bytes,
current original Gold and 50 selected rows before exposing the scoped conditional
retrospective comparison. [Identity and evidence](../outputs/bupiright_research_connection_20261027/README.md).

## Original-source SO1 diagnostic candidate — 27 October 2026

[Controlled original-source rebuild/staging](../outputs/original_so1_20261027/README.md)
created `workspace.medshield_original_gold_20261026.so1_d25cea62e59712b6_candidate`
at Delta 0 via one immutable CTAS: one manifest and 23 series rows. Row and reconstructed
package hashes bind current original release/receipt, net eligibility, protocol,
monthly history and conditional daily evidence. Source data, geography and model
approvals are not altered; exact area labels are recorded strata, not approved
territorial mappings. Candidate readback and identical zero-write retry pass.
Live reader rechecks 1,032 label-month controls before serving. Old corrected-source
candidates remain preserved; no destructive schema, source or model update.

## Separate rolling experiment candidate — 27 October 2026

[Controlled staging and actual readback](../outputs/rolling_research_connection_20261027/README.md)
inserted one `rolling_<artifact_sha256>` row into the existing Databricks forecast
run-candidate table. Exact payload hash/key separates it from original fixed-origin
and historical runs. Prepare/apply/verify validate saved execution registration,
code/selection, active original Gold and fresh monthly controls. Differing/duplicate
records fail; identical retry writes nothing. The saved payload holds 1,722 evaluated
cases; two checked lead views each serve 441 audit cases. Latest training origin
August 2026 and observed target September 2026 remain distinct. No source/schema,
operational model pointer, approval or future forecast is modified by staging.

## Original-itemized evaluated research row — 27 October 2026

[Actual candidate staging and connection](../outputs/original_research_connection_20261027/README.md)
inserted one new `original_<artifact_sha256>` row into the existing
`workspace.medshield_gold.fact_forecast_run_candidate`. Fixed key plus exact
artifact byte hash is the immutable binding in this shared appendable table.
The controlled prepare/apply/verify script validates frozen registration/code,
original Gold/receipt/monthly inputs and exact readback; identical retry does not
write, while differing/duplicate rows fail. No schema or source-table mutation,
operational model pointer or approval update is performed. Candidate payload holds
all 1,701 evaluated cases; the checked gateway exposes441 audit cases and 21 model
comparisons. Final training origin is December 2025; observed audit source ends
September 2026. No future prediction is implied by candidate persistence.

## Original-itemized STL candidate staged and consumed — 27 October 2026

[Staging notebook](../outputs/original_stl_candidate_20261027/README.md)
created the isolated release-specific Delta table under
workspace.medshield_original_stl_20261027. Its202 records separate calendar,
component and receipt grains using unique row IDs; per-record canonical JSON and
hashes preserve exact exported decimal strings, gaps, source/method identity and
false approval flags. Existing differing data/version is rejected; identical
Delta0 readback is a zero-table-write retry. No original tables, views, roles or
serving pointers are modified by staging. Adrian's passing receipt and the
[independent gateway readback](../outputs/original_stl_connection_20261027/README.md)
confirm persistence. The source-matched diagnostic reader now consumes this
candidate at Delta0 and rechecks current original Gold monthly inputs. This is
candidate reporting, not a financial/model business approval; source data,
warehouse tables and approval flags were not changed by the reader connection.

## Unified financial reporting relation — 27 October 2026

The [financial scope adapter](../outputs/unified_sales_scope_20261027/README.md)
reads existing typed original Gold itemized and contract partitions at Delta0.
Combined review is a validated logical UNION ALL with count/unique-key/eligible-net
conservation against the financial receipt. It creates no tables or migrations,
changes no records or approval flags, and establishes no economic additivity.
Selected table identities live in release.financial_scope; product/area/model
readers retain the itemized partition and their independent contracts.

## Original-source candidate layers — 26 October 2026

The new [original-source chain](../databricks_updated_2/ORIGINAL_LAYERS_RUNBOOK.md)
uses separate workspace.medshield_original_bronze_20261026, silver and gold schemas.
Batch table prefixes bind actual CSV hashes, parser/core/generator/reconciliation
identities and the accepted-category manifest. Bronze preserves exact source bytes
and physical-line evidence. Silver retains a disposition and full checksummed
encoded assessed evidence for every line; encoding is not encryption. Gold has
explicit typed itemized, anonymous-contract and technical financial candidates.
Every candidate record retains its source key/hash/year/date. Contract products,
quantities and inferred geography remain unavailable; itemized recorded quantities
have unapproved units. Metric flags and financial-release/forecast statuses remain
explicit. No Supabase table or gateway source is changed.

The new schema is not a drop-in replacement for the serving 144-field corrected
fact. Candidate readback and source/financial conservation precede versioned API/
chart/export integration and financial-scope acceptance. New V2 create, immutable
version0 readback and exact comparison protect retries; existing differing data
fails. Current State and the dated verification own actual results; local checks
are not evidence of executed Spark or serving activation.

## Immutable SO1 diagnostic candidate — 25 October 2026

The active isolated Gold source now has an additive `so1_<package hash prefix>_candidate`
Delta table, containing one metadata record and one checksummed aggregate JSON
record per source-area series. Version 0 is selected explicitly. Controlled
preparation reconciles the same pinned fact/population and produces exact SQL;
staging creates a new table atomically and never updates an existing candidate.
Identical retry validates all content and makes zero writes. Source fact,
reference approvals, original STL/research tables and model pointers are preserved.

Runtime reads only the server-selected Gold package and validates exact source/
reference/financial identity and live monthly controls. Local preparation files
and Python outputs are never runtime substitutes. Candidate staging grants no
business/model/academic approval. No Supabase schema or account change.
[Actual identity, readback and retry](../outputs/so1_dashboard_20261025/README.md).

## Separate current-source research namespace — 25 October 2026

The existing Gold `fact_forecast_run_candidate` contains an insert-only
`extension_<artifact SHA-256>` row for the checked current-source financial
research. This reuses the established candidate schema; no table/view or
Supabase schema change is required. The original research reader selects only
`experiment_` IDs, while the new authenticated reader requests exactly the
server-pinned extension ID and verifies its payload against the current fact.
No operational release pointer is updated. The separate payload retains base
run, nine-case extension, frozen selection and source/approval lineage.
[Actual staging/readback](../outputs/workflow_completion_20261025/README.md).

## Historical external-source presence verified — 25 October 2026

[Current warehouse evidence](../outputs/external_readiness_20261025/README.md)
verifies the existing `external_restart_doh_raw_candidate` and
`external_restart_pagasa_raw_candidate` Bronze sources, DOH monthly and PAGASA
daily Silver candidates, PAGASA monthly Gold candidate, published external views
and their audit. Current State owns dated counts/coverage. These historical
sources already exist; no reingestion is needed merely to inspect their context.
The actual monthly station keys include encoded source filenames; the published
context resolves named stations separately. Preserve both identities and do not
interpret a short-name lookup failure as missing weather data. Source presence
and descriptive period alignment do not grant external model-join approval.

## Approved financial contract — 25 October 2026

The isolated source schema now also holds `financial_0b178092136f93e0_fact`
and `financial_0b178092136f93e0_manifest`, both read at Delta 0. The first is an
exact materialized snapshot of the accepted reporting population; the second
binds source identity, decision/evidence hashes, scope, limitations and counts.
A pinned Delta serving table avoids relying on the source's future time-travel
retention and keeps rollback explicit. Existing candidate/source/research objects
are retained. This implements versioned approved objects using immutable tables;
it does not rename candidates or certify medicine units, mappings or models.
The [guarded publisher and evidence](../outputs/sales_publication_20261025/README.md)
describe the actual creation, conservation checks and runtime pins.

## Local descriptive source selection active — 24 October 2026

[Application activation and checked rollback](../outputs/app_2026_activation_20261024/README.md)
now route local descriptive reads to the completed isolated Gold fact, with one
explicit dataset/policy/Delta pin and a complete publication-audit guard. The
original serving warehouse and trained-research tables remain intact. Stored
research uses its own original fact pin; provider sources remain independently
identified. No warehouse table/view, reference approval or dataset was rewritten
by the application update. New trained input preparation is blocked pending
source-bound coverage/training acceptance; local descriptive activation does not
grant that acceptance.

## Isolated 2026 batch completed — 24 October 2026

[Fresh SQL verification](../outputs/gold_completion_20261024/README.md) supersedes
the earlier preparation-only status: the operator completed Gold on the isolated
source batch. All 22 expected output audit entries pass and match saved row counts;
keys are unique. Batch Gold fact 0 contains 41,073 records including 3,345 source-2026
records. All 140 protected historical fields match fact 20 for 37,728 keys, and
core analytical aggregates reconcile. Gold/Silver survivor keys agree exactly.
Existing serving fact 20 remains unchanged. No agent warehouse write or schema
change was performed; gateway/dashboard v8 support and controlled serving
activation remain the next separate engineering phase. The unreviewed source
does not grant medicine-demand, external-join or model approval.

## Isolated 2026 source-change preparation — 22 October 2026

The [source ingestion runbook](../databricks/medshield_project/SOURCE_INGESTION_2026.md)
adds a contract-bound mode to the existing three notebooks. Its planned schemas
are `workspace.medshield_{bronze,silver,gold,audit}_source_20261022`; table names
retain the existing candidate contracts. The current serving schemas and fact 20
are preserved. Source hashes, current predecessor, historical values, reference
identity and target dataset ownership are checked before isolated writes.
The new source's provenance remains explicitly unreviewed and does not activate
medicine demand or joins. [Local evidence and package](../outputs/source_ingestion_20261022/README.md)
pass the stated parser/contract checks; actual cloud creation/ingestion and Gold
persisted readback are not executed because Workspace/Jobs scopes are unavailable.

## Margin maintenance observed applied — 20 October 2026, 11:08 Asia/Manila

[Fresh readback](../outputs/margin_preflight_retention_20261020/README.md) supersedes
the earlier same-day prepared/unapplied state: the user's run committed the four
bounded rate updates, advancing marts to 12/11/12/11. The 81 affected aggregate
rates are unavailable as intended; current keys, defined aggregate metrics and
rates reconcile to unchanged fact20, prior financial controls match and the live
gateway validator passes. Original historical all-column equality remains
unverified because the 9 October versions are outside the enforced seven-day
time-travel window. Use [current-state verification](../databricks/medshield_project/maintenance/20261020_verify_margin_current.sql),
not another Phase 2 execution. No retention/property change, remote write or
backup was performed by the diagnosis; model/source approvals remain unchanged.

## Fresh source and forecast-readiness recheck — 20 October 2026

[Fresh read-only evidence](../outputs/warehouse_accuracy_recheck_20261020/README.md)
confirms current fact 20, accepted counts, source-bound monthly/annual/frozen
input/STL relationships, five serving view definitions and the correctly selected
current-source research artifact. The existing gateway validator passes; exact
scope/assertions and limitations are in the packet. The four nonpositive-basis
margin-rate defects remain at their earlier versions and require the existing
bounded repair, not a source rebuild. Zero approved demand/external/model-release
rows and absent operational named serving relations remain readiness gaps rather
than permission to fabricate measures or approve publication. No remote write,
source change or new model run occurred. Workspace/Jobs reads remain unavailable
with the inspected credential; full notebook/job parity is not established.

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

See the current [Databricks project README](../databricks_updated_2/medshield_project/README.md)
and [project guide](../databricks_updated_2/medshield_project/GUIDE.md) for sales and external
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
