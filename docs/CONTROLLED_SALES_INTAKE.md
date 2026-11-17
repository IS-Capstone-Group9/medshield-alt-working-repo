# Controlled sales intake

Prepared 1 November 2026. This optional workflow submits private CSV source evidence to a configured Databricks Job and reads back a separate, immutable candidate. It does not append to dashboard facts, replace a published period, promote a release or grant business approval. The legacy `POST /api/sales/upload` remains HTTP 409.

## Client workflow

On **Data source**, Admin and Analyst users can check intake availability, download a template, choose a CSV, explicitly submit, retain its candidate ID, check processing/validation status, and download issue/category reports. Other roles have no intake controls and are denied by the gateway. Merely choosing a file sends nothing. File contents are not stored in browser storage. Keep the candidate ID to resume a later status check.

When configuration is absent, intake reports unavailable and submission stays disabled. An interrupted client request may still have reached Databricks: retry the identical bytes under the same account, even if the filename changes. The policy/account/source SHA256 identity and Databricks idempotency token select the same candidate and job run. Do not alter source bytes just to bypass a retry. A failed terminal job needs operator investigation; replaying an idempotent run-now call is not a new job attempt.

The exact UTF-8 header is:

```csv
source_record_id,delivery_date,dr_number,product,area,quantity,net_sales,gross_profit
```

Limits: 10 MiB, 1–100,000 records, eight columns and 10,000 characters per field; quoted commas, escaped quotes and embedded newlines are supported. No binary/NUL, invalid UTF-8, blank records or malformed quoting. `source_record_id` is a unique **file-local row reference**, such as row-1; it is not an established business transaction, SKU or client key. Preserve legitimate repeated transactions with distinct row references and original DR numbers. It cannot deduplicate transactions across corrected files.

Databricks validates ISO dates from 2017 onward, required product/area and signed decimal money. Net sales is required; quantity and gross profit may be blank. Zero remains zero, blank remains unknown, signed returns remain signed. Quantity remains reported quantity with unverified physical compatibility. Rejected rows remain in Bronze/Silver with reasons and are excluded from Gold candidate totals. Unmatched product categories remain unclassified and require review. Category lookup uses only the pinned approved reference, never fuzzy/clinical inference.

`NEEDS_REVIEW` means rejected records or category review exists. `READY_FOR_APPROVAL` means those checks are clear; it is not approval, source completeness, reviewed SKU/unit/geography, accepted model or operational authority. All responses retain `candidate_only:true,published:false`.

## Server and Databricks setup

The deployment/data operator selects an approved private Unity Catalog volume and isolated candidate schema and configures a Databricks notebook Job. The 1 November local inspection found intake disabled, with no volume/job ID configured. These steps are preparation until real execution evidence exists; no target was provisioned in that turn.

Read-only discovery using the current server credential returned HTTP403 for both Jobs listing and the intended candidate-schema volume metadata. Resolve the principal's appropriate permissions before attempting setup; no live intake was tested or enabled.

1. Install [controlled_sales_intake.py](../databricks_updated_2/medshield_project/controlled_sales_intake.py) as a notebook in the existing remote `/Workspace/medshield/` hierarchy. Do not run the historical Bronze/Silver/Gold chain or change existing sales pins.
2. Use an approved private `/Volumes/<catalog>/<schema>/<volume>` path. Place the exact pinned [accepted category reference](../databricks_updated_2/category_releases/category_b160d6aad4376d64/accepted_product_master.csv) at `<volume>/references/accepted_product_master.csv`; its SHA256 must be `470afb59b6ef3f720c54c3d1bb27345ae1629665917b361c10362f8fb2d9f74c`. Do not regenerate/replace it with proposals. A changed approved reference requires a reviewed new policy/package and compatible consumers.
3. Configure Job notebook parameters `volume` (the same volume) and `candidate_schema` (`<catalog>.medshield_intake`). The gateway supplies the `ingestion_id` parameter. This separate schema contains only `bronze_sales_candidate`, `silver_sales_candidate`, `gold_sales_candidate`; the job creates them if absent and uses insert-only MERGE. Review table/schema ownership and permissions before enabling it. Use the supported Databricks runtime with Unity Catalog volumes and Delta/Spark access.
4. Grant the server principal only the required volume read/write and Job run/status access. The job principal needs the private source/reference volume and isolated schema/table operations. No anonymous/public storage and no serving-table or pointer privileges are needed by this workflow. Scope Admin inspection to the same application organization; this implementation is single-organization and does not supply multitenant isolation.
5. Set server-only configuration: `DATABRICKS_INGESTION_ENABLED=true`, `DATABRICKS_HOST`, `DATABRICKS_INGESTION_TOKEN` (or the existing server `DATABRICKS_TOKEN`), `DATABRICKS_INGESTION_VOLUME`, positive integer `DATABRICKS_INGESTION_JOB_ID`. Never add `NEXT_PUBLIC_` equivalents. Follow the normal gateway configuration/restart procedure; do not run a Next production build alongside development.
6. Verify an isolated source-bound submission, exact source/readback and decimal controls, retry after lost receipt, invalid file/quarantine, denied roles/other owners, provider failure, immutable conflicts and report hashes. Record the real job/run IDs, source/policy/reference hashes, candidate table versions, permissions and actual observations. Local fixtures are not this deployment proof.

The server audits submission intent before remote writes using the existing durable audit mechanism. Audit failure blocks submission. It stores immutable `source.csv`, `manifest.json` and `run.json` under `<volume>/submissions/<candidate-id>/`. Manifest identity includes policy, account, source SHA256, byte size and record count. Retry filenames do not change identity.

The notebook preserves raw row/DR lineage and insert-only candidate envelopes, then reads back **all envelope fields and exact decimal amounts**. It writes formula-safe `issues.csv` and `classifications.csv`, verifies exact bytes, and writes `report.json` last. That report binds each downloadable file's SHA256 and byte length. The gateway validates source identity, counts, candidate flags and report schema before exposing status/download; it returns allowlisted fields and sanitized errors, with bounded provider bodies and timeouts. No local analytical fallback is used.

## Correction, recovery and publication

A corrected complete-period file is a **new separate candidate** because its bytes change. Under **Review a complete-period correction**, use the earlier candidate ID, corrected ID, inclusive first/last replacement months and an explicit complete-period assertion. The assertion is user-entered; the preview does not independently establish completeness or grant release approval.

The read-only correction route requires both candidates to have verified manifests/reports, zero rejected rows, the same source account/policy/category-reference identity, and exact source-byte/hash/count/net controls. Category-review flags can remain unresolved; the preview does not accept those mappings. It revalidates source fields and computes a proposed row set: retain every earlier row outside the declared months, remove every earlier row inside those months, then add every corrected row. Corrected rows outside the period, an empty prior replacement scope, mismatched metadata/source or unsupported fields fail closed. Empty corrected files are not accepted, so whole-period deletion needs a separate reviewed design.

The dashboard shows before/removed/added/after record and signed-PHP controls. Its downloadable JSON binds the two source identities, declared months, same category reference, all summary/monthly controls and a deterministic `plan_sha256`; it contains no raw records. The monthly table uses the union of observed source months, without filling missing months. An empty row-set control sum is additive zero, not evidence of observed zero sales. Gross-profit controls distinguish known and missing values; no physical quantities or units are aggregated. Matching uses a multiset of exact source fields excluding the file-local row reference: repeated transactions remain repeated, and unchanged matches are not established business-record links. Exact numeric formatting changes can count as a changed source row.

JSON requests are limited to4KiB, each file to the existing10MiB/100,000-row limit, the declared period and observed-month union to1,200 months. Larger reviews fail explicitly rather than truncate. The response always has `candidate_only:true,published:false,release_authorized:false` and `completeness:operator_assertion_not_independently_verified`. No provider write, replacement, approval or signed/persisted attestation is created by this review. A hash proves consistency of the supplied proposal bytes, not authenticity, completeness or trusted creation time.

The operator must still retain both candidate IDs/source files, validate real period completeness and any overlap against the actual serving release, obtain applicable decisions, and use the controlled release process. The earlier candidate is not automatically the live dataset; this preview is between two intake snapshots only. Do not append both snapshots. Source/run/Delta identity, real correction and publication/recovery acceptance remain open. Live Jobs/volume access was previously403 and configuration remains a separate prerequisite; local tests do not certify it.

### Verify a saved correction handoff

From `backend/`, run the read-only local verifier against the JSON downloaded from the dashboard:

```powershell
node --import tsx scripts/verify-intake-correction.ts <review.json>
```

It checks the exact nested field allowlist, candidate/period bounds, false publication/authorization flags, known/missing counts, exact signed monetary arithmetic, full-period removal rules, observed-month controls and the gateway's canonical SHA256. It accepts formatting/property-order changes but rejects digest/content mismatches, malformed UTF-8/JSON, unexpected raw fields, nonregular/empty files and input above2MiB. It reads the supplied file only; it does not alter it, persist acceptance, load server credentials, contact the gateway/Databricks or populate dashboard analytics. Exit0 means `PASS_LOCAL_REVIEW_INTEGRITY`; exit1 is validation/read failure,exit2 is incorrect command usage. Failure output omits raw file content, parser excerpts and filesystem details.

Pass output explicitly retains `source_revalidated:false,completeness_verified:false,release_authorized:false,published:false`. Anyone able to edit and recompute a hash can create another internally consistent proposal. The verifier supplies local consistency,not authenticity,current source truth,trusted timestamps or approval. Re-run the authenticated correction preview against the actual candidate identities and retain the applicable source/run/Delta evidence before any release decision. The [synthetic smoke example](../outputs/correction_handoff_integrity_20261101/SYNTHETIC_REVIEW.json) demonstrates the command only; its repeated-character identities are fixtures,not real candidates.

### Recheck candidate source controls

With a correction preview loaded, **Recheck candidate evidence** submits that exact review to the authenticated gateway. The server checks schema/hash first,then rereads both candidate manifests,reports and source CSVs without cache,validates ownership/hash/count/amount/reference controls and recomputes the proposal from those source rows. No write,ingestion job or serving switch is requested. A self-consistently edited/rehashed proposal cannot substitute its saved totals for those provider reads.

If the recomputed plan hash differs,the gateway returns409 `INGESTION_CORRECTION_CHANGED`; unavailable,missing,invalid or denied source evidence also fails. The dashboard clears stale review/receipt/export state on failures and relevant input/source changes. Source invalidation cancels pending preview/recheck requests without cancelling an explicitly submitted source file. A separate downloadable receipt binds the checked plan hash,time and exact verification scope; the original review JSON is unchanged.

A successful response is `MATCHES_CURRENT_CANDIDATE_CONTROLS` for `intake_candidate_sources_and_correction_controls`. Only `source_revalidated` is true. `completeness_verified`, `serving_release_verified`, `release_authorized` and `published` remain false. The check concerns the two candidate snapshots,not whether they are complete or match the actual serving release. Source files are checked during the request; future changes remain possible. The server clock and editable receipt are not an independently trusted timestamp or signature. Real ACL/deployment/source/run/Delta and client/release evidence remain separate. Existing cloud access/configuration prerequisites still apply.

Unknown/invalid report identity, changed CSV, mismatched envelope or partial evidence fails closed. After provider interruption, retry the identical request and inspect its ID. A partially written immutable artifact or a terminal failed idempotent Job requires operator investigation and an explicit reviewed recovery; the code does not overwrite conflicting evidence. Restoring/relaunching a failed run and any serving rollback remain operator procedures requiring actual isolated evidence. Retain source/reference/job identities when recovering; never delete historical evidence merely to pass validation.

Publication remains separate under [objective acceptance](OBJECTIVE_EVIDENCE_REGISTER.md), [architecture](ARCHITECTURE.md), [API](API.md), [security](SECURITY.md) and the [Databricks guide](../databricks_updated_2/README.md). This implementation alone does not change the 33-clause objective score.

## Local verification

From `backend/`:

```powershell
node --import tsx --test tests/correction-review-integrity.test.ts tests/intake-correction.test.ts tests/sales-ingestion.test.ts tests/sales-ingestion-pipeline.test.ts
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
```

The cross-layer test executes the real offline Python assessment/artifact functions with synthetic input, then consumes those exact reports through the gateway reader. It requires Python on PATH (`python` on Windows, `python3` elsewhere); it does not execute Spark or contact Databricks.

From repository root:

```powershell
python -X utf8 -m unittest discover -s databricks_updated_2/medshield_project/tests -p test_controlled_sales_intake.py -v
```

From `frontend/`:

```powershell
node node_modules/@playwright/test/cli.js test e2e/sales-intake.spec.ts --workers=1
node node_modules/typescript/bin/tsc --noEmit
```

The browser suite exercises actual compiled intake handlers and authenticated-fetch transport against isolated HTTP responses, including desktop/phone layout. It is not a legitimate-user/live-cloud acceptance test. [Dated evidence and remaining gates](../outputs/controlled_intake_20261101/README.md) distinguish those scopes.

## Staged pipeline and versioned promotion

Prepared 7 November 2026 under [decision 010](DECISIONS.md). **Live status (7 November 2026):** provisioned in workspace `dbc-470e400f-fa68` (schema and volume
`workspace.medshield_intake` / `.raw`, pinned reference, notebooks and files, upload Job `487013522149255`, promote Job
`46234348141857`, serverless). One synthetic template CSV passed Bronze → Silver → Gold through the real gateway code
(`READY_FOR_APPROVAL`, 4 of 4 accepted, net 180.00, identical retry resolved to the same run, both reports digest-verified).
Promotion also ran live (plan, then apply with the exact approved hash): release `acc946d4d553ada8` in `workspace.medshield_warehouse` holds 4 records / 180.00 net, an independent SQL readback matched, and `business_approval` and `dashboard_serving_changed` are false. See the audit status below for later live checks. Intake stays disabled in `.env` (`DATABRICKS_INGESTION_ENABLED=false`). Local fake-Spark tests check orchestration,
not Delta execution. [Live evidence](../outputs/databricks_staged_pipeline_20261107/README.md).

**Audit status (7 November 2026):** the source-year, promotion-gate, category and completeness defects found by the
[audit](../outputs/warehouse_audit_20261107/README.md) are fixed, redeployed and checked live with a synthetic client-layout file dated
March 2025: release `ef462b5c6933035d` (8 records, 360.00 net) on top of `acc946d4d553ada8`, with wrong-hash, missing-acknowledgement
and out-of-date-base runs all refused. A file's source year is its most common delivery year; rows dated in another year stay held.
Later the same day, release `16fbf69189702e7a` replaced a month that already had rows (4 rows / 180.00 replaced by 1 row / 40.00, other months unchanged), and these were refused live:
a shrink without acknowledgement, a declared month with rows but none in the file, an unmapped product, a malformed file, and another account reading a candidate. Two uploads ran
concurrently through the queue. Not run live: route-level role denial through an authenticated gateway, or any real client file. History is seeded (release `5df98130b9ec13ef`, [decision 011](DECISIONS.md)) through `warehouse_seed.py` and Job `medshield-seed-warehouse`, which refuses to replace any non-synthetic row. Adrian enabled intake with client exports in the local gateway configuration on 7 November 2026; it takes effect when the gateway restarts. The real 2026 export then ran through the
gateway code (candidate `7f68e32f…c89f`: 3,322 accepted, 100 held, ₱140,199,402.67), and a read-only plan against the seeded head replaced 2026-01 to 2026-09 with exactly the same
3,322 line keys and net, so it was not applied.

| Task | Notebook (under `/Workspace/medshield/medshield_project/`) | Writes |
|---|---|---|
| `bronze` | `intake_stage_bronze.py` | `wh_bronze_lines` — raw lines (client export) or CSV records (template) with format evidence |
| `silver` | `intake_stage_silver.py` | `wh_silver_rows` — both layouts in one schema; every row ACCEPTED, REJECTED (reason) or NON_TRANSACTION |
| `gold` | `intake_stage_gold.py` | `wh_gold_fact_sales_line`, `wh_gold_dim_date/area/product`, `wh_gold_mart_monthly`, then the existing gateway `report.json` last |
| `promote` (separate Job) | `intake_promote.py` | `<catalog>.medshield_warehouse.release_<id>_*` typed tables, then `release_pointer` last |

Job templates are in [`databricks_updated_2/jobs/`](../databricks_updated_2/jobs/). Replace their
`<PLACEHOLDER>` defaults and attach compute per workspace policy. Install the notebooks **and**
`warehouse_pipeline.py`, `warehouse_runners.py`, `controlled_sales_intake.py` and
an identical file copy of the Silver parser named `original_source_20261026/silver_parser_20261026.py` (the generated notebook of
the other name cannot coexist as a file) as workspace *files* (the stages import them
and reuse the reviewed Silver parser rather than copying it). Also place the pinned [regional mapping](../databricks_updated_2/medshield_project/references/regional_delivery_mapping_4c5f44013464395e.json) at `<volume>/references/regional_delivery_mapping.json`. Queueing is enabled so a concurrent
submission waits instead of being SKIPPED.

Each stage writes an immutable receipt to `<volume>/submissions/<id>/stages/stage_<name>.json`, hash-chained to the
previous one. The gateway status response adds `stages:[{name,state,counts}]` from those receipts only
(`SUCCEEDED` or `NO_EVIDENCE_YET`); an invalid, out-of-order or tampered chain returns
`INGESTION_REPORT_INVALID`. A run that terminates successfully without a verified report is returned as `FAILED` with
`evidence_missing:true`. Stage rows appear on **Data source** after **Check candidate status**.

**Rules enforced in the pure library (`warehouse_pipeline.py`):** accepted rows need a net value with cent precision
(never rounded), a delivery date not after the run's as-of date, and no contract-parent label (held for the financial-scope
review). Exact repeated lines in a client export are held for review, not collapsed or dropped. Unmapped categories stay
`unclassified`/`review_required`. A fact row key is `sha256(date, area, DR, product, measures, occurrence index)`: repeated
transactions stay distinct and the key ignores the file-local row reference and row order.

**Promotion.** Run the promote Job with `mode=plan` first: it is read-only and records `promotions/plan_<hash>.json` with the
exact before/removed/added/after record and signed-net controls (overall and per month). An operator who approves that plan
runs `mode=apply` with the same `approved_plan_sha256` and the current `base_release_id` (`NONE` for the first release). Apply
requires the saved preview to match the recomputed plan byte for byte. The
hash binds the target schema, base release and exact base and candidate rows.
Held rows (with reason, known net and unknown-net count), recorded `unclassified` rows and months losing over 20% of records or net
appear as plan warnings bound into the hash, and apply then also needs `acknowledge_warnings=true`.
Apply
fails closed when a product is missing from the approved reference, a declared month has existing rows and none in the file, the candidate contains months outside the declared window,
collides with a retained line key, is not based on the current release, or the recomputed hash differs. It never overwrites a
release table, writes the pointer last, and treats a retry of a completed promotion as an idempotent replay. Keep
`max_concurrent_runs` at 1 (single-writer pointer).

Set server-only `DATABRICKS_INGESTION_CLIENT_EXPORTS=true` after verifying that
the configured Job runs the three staged tasks. The default supports the
eight-column template. The flag also enables `modern_12`, `modern_13` and
`modern_grouped_17` uploads. The gateway records the physical-line count,
including headers and blank lines, and the stages verify it before writing
the terminal report. The template keeps its CSV data-record count. Legacy
2017–2019 layouts remain tied to their original source years.

Promotion runs through the operator Job. Dashboard reads still use the
existing serving contracts. The itemized history is seeded and reconciled to pinned Gold; contract rows are not in the warehouse fact.

### Workspace acceptance

1. The workspace admin verifies access to the configured upload Job and private
   volume with the gateway identity, and separately verifies the stage and promotion
   run-as grants. A 7 November read-only Jobs list probe with the configured gateway
   credential returned HTTP 403. Check the specific upload Job once its ID is known.
2. The data operator submits a synthetic template and a synthetic modern export
   using an approved category label and a test target. Retain candidate and Job
   run IDs, all three receipts, the terminal report hash, and Delta table readbacks.
   Reconcile counts and signed net sales. Retry identical bytes and verify that the
   candidate and run IDs remain the same.
3. In the test target, preview and apply a declared month. Confirm the versioned
   fact and monthly mart reconcile and that the pointer appears after the release
   tables. Apply a correction and confirm the adjacent month is preserved. Replay
   the approved request and verify that it returns the same release ID.
4. The data owner signs off on the historical seed population, period coverage,
   and treatment of contract and repeated lines. Reconcile a seed release to the
   pinned original Gold before considering a separately reviewed dashboard cutover.

### Historical seed baseline

From `backend/`, run `npx tsx scripts/preview-databricks-warehouse-seed.ts`
with the gateway SQL warehouse configuration. This read-only command validates
the pinned original Gold receipt and source keys at Delta version 0, then
reconciles monthly counts and signed eligible net sales to the same pin.
It emits aggregate controls and a reproducible baseline hash. Preserve the
result with the seed review. Missing months are absent from the output, and
observed months with no eligible net have a null eligible amount.

The 7 November 2026 SQL run reconciled 40,171 itemized source rows, of which
39,286 qualified for technical net-sales aggregation (₱638,015,351.53).
The 885 remaining rows are counted separately. The 107 observed months span
January 2017 through September 2026. The scope excludes contract summaries.
Baseline SHA256:
`1fea3e772ded36ecb7d5394cea80c4a1094220e2dec7be1398907d360d521854`.

Use the baseline to review which rows and measures enter the first release
and where excluded evidence remains queryable. Compare the resulting fact
and mart to the agreed monthly population, including signed returns. A
matching SQL baseline establishes source read access and conservation. The
Jobs, volume, Delta write and publication acceptance checks remain separate.
