# Current Databricks workspace — databricks_updated_2

## Staged upload pipeline and versioned promotion — prepared 7 November 2026

New, offline-tested files (not uploaded or executed in Databricks): `medshield_project/warehouse_pipeline.py`
(pure rules), `warehouse_runners.py` (Spark runners), notebooks `intake_stage_bronze.py`, `intake_stage_silver.py`,
`intake_stage_gold.py`, `intake_promote.py`, and Job templates in `jobs/`. They process an uploaded CSV
Bronze → Silver → Gold one stage per Job task in the isolated intake schema, then promote an approved plan into a new
versioned release that replaces only the declared months. Historical `01`–`03`, the original chain and the pinned Gold
objects are untouched. Operator steps, limits and what remains open are in the
[staged pipeline runbook](../docs/CONTROLLED_SALES_INTAKE.md#staged-pipeline-and-versioned-promotion).
`controlled_sales_intake.py` gained shared helpers (`load_submission`, `merge_layer`) with unchanged behavior.

## Pinned itemized retention recovery — 2 November 2026

The [guarded maintenance runbook](../outputs/snapshot_retention_20261102/README.md)
and [exact SQL](medshield_project/maintenance/original_itemized_snapshot_retention.sql)
record the applied metadata-only 365-day log/data retention repair. Original
itemized version 0 and its source identity remain unchanged; nine live gateway
readers pass. Use the prepare/apply CLI and its history/source checks rather than
running the SQL alone. No BSG rerun or new publication is required. Data operator
reviews preservation by 26 September 2027.

## Optional client candidate intake — 1 November 2026

`medshield_project/controlled_sales_intake.py` prepares isolated private
Bronze/Silver/Gold candidate envelopes and hash-bound reports from the optional
gateway handoff. It does not run the historical sales chain, change current
source/model pins, approve a release or replace a period. Local offline/fake-Spark
tests are distinct from a deployed Job. Configure the private volume, isolated
`<catalog>.medshield_intake` schema, pinned accepted category reference and Job
parameters through the [controlled-intake runbook](../docs/CONTROLLED_SALES_INTAKE.md).
No cloud target, Job or serving change is implied by the notebook's presence.

Selected by Adrian on 26 October 2026. Make future local Databricks changes here.
`databricks_updated/` is the prior workspace, retained for evidence; `databricks/`
is the older archive. Remote paths remain `/Workspace/medshield/` with the same
subfolders: do not upload an enclosing `databricks_updated_2` directory.

## Current validity check — 30 October 2026

[Fresh folder and Gold validation](../outputs/databricks_updated_2_validation_20261030/README.md)
passes200 local tests, seven generator checks, both pinned release manifests and
15 payload hashes. All ten CSVs match original ordered values; eight match exact
bytes, while2017/2021 differ only in BOM/newline representation. Fresh itemized
Gold Delta0 readback validates40,171 records,39,286 technically eligible records
and₱638,015,351.53 net. The local byte-manifest ID differs from the existing Gold
ID; do not replace pins/source keys or rerun BSG merely to validate this folder.
This is a valid historical-sales workspace, not verified current stock, supplier
lead/cost or EOQ operating evidence. Existing operating-input and approval gates
remain. Current State owns readiness; the dated handoff below is retained history.

## Completed STL connection handoff — 27 October 2026

Original Gold and the main financial-scope connection are already verified; no
repeat Bronze/Silver/Gold run is needed. Adrian's new read-only original-itemized
STL notebook passed in Databricks. [Verified calendar/components exports](../outputs/original_monthly_stl_20261027/README.md)
match local observations exactly and fitted values within PHP0.000001. The review
notebook created no stored tables or dashboard/model activation. Adrian then ran
the [candidate staging notebook](../outputs/original_stl_candidate_20261027/README.md)
and supplied its passing receipt. [Independent gateway readback and UI/export
connection](../outputs/original_stl_connection_20261027/README.md) now pass against
the saved candidate and fresh original Gold monthly inputs. Refresh the dashboard
and inspect Sales Diagnostics → Seasonality; no further notebook run is needed
for STL. Forecast/model evaluation remains separate work. Keep historical06
notebooks untouched. Current State owns exact identities and remaining gates.

## Historical integration preparation handoff — superseded

All original layers and the financial technical review have supplied passing
results. The recommended path is [itemized-first integration preparation](../outputs/original_layers_20261026/ITEMIZED_FIRST_RECOMMENDATION.md)
while source owner resolves contract overlap separately. Keep contract values
preserved and excluded from itemized KPIs; do not claim complete-company totals.
No more notebook runs are needed now. Engineering prepares coherent versioned
gateway/dashboard/export calculations, labels and source compatibility; live
serving stays unchanged until validation and applicable changed-release acceptance.
Existing COO authority/prior approvals remain scoped; this recommendation creates
no new financial or model approval. Current State owns exact results and gates.

## Folder contents and upload rules

| Location | Use |
| --- | --- |
| `medshield_project_csv/` | Ten sales CSVs, 2017–2026, with original ordered values; current exact-byte/transport identities are documented above. Adrian reports originals already uploaded; no repeat upload required by this migration. |
| `medshield_reference_csv/` | Four existing reference CSVs; preserve current approvals and bytes. Do not replace the shared master with proposals. |
| `medshield_project/maintenance/20261026_stage_accepted_categories.py` | Completed category-staging notebook; retained for reproducibility. |
| `category_releases/category_b160d6aad4376d64/` | Four immutable accepted-category files; upload as ordinary files using the linked instructions. |
| `classification_releases/classification_52342363a7ef3211/` | Existing immutable 13-file proposal package; preserve files and hashes. |
| `medshield_project/maintenance/20261026_assess_original_sales.py` | Completed assessment entrypoint; reviewed self-contained version retained. No helper imports or table writes. |
| `medshield_project/sales_csv_assessment.py`, `verify_local_sources.py` | Ordinary helper files for local/source tooling; not notebook entrypoints. |
| `medshield_project/01_sales_bronze.py`, `02_sales_silver.py`, `03_sales_gold.py` | Retained parser/reference sources required by generation and regression checks. NOT an approved restored-originals run chain. |
| `medshield_project/06_sales_stl.py`, `06_sales_stl_2026.py` | Retained for numerical/provenance regression checks; no cloud run is requested. |
| `medshield_project/tests/`, generators and catalog review helpers | Local checks and their actual dependencies; do not upload everything as notebooks. |
| `medshield_project/references/` | Historical bound JSON contracts; immutable source identities do not change when the local folder changes. |

## Cleanup and Bronze → Silver → Gold status

Removed 33 out-of-scope or historical files and 36 cache files from this folder.
The dated [cleanup archive and verification](../outputs/workspace_cleanup_20261026/README.md)
preserve the exact removed bytes. Old query/dashboard exports, the duplicate
catalog helper/submission, external notebooks, historical bridges/model setup,
margin patches and unused preparation tools are outside the active folder.

The necessary existing pipeline sources, helpers, CSVs, references and checks are
now available here. File transfer does not update their adjusted-batch runtime
contracts. Do not run historical 01–03 against restored originals or remove guards.
Original-evidence SQL intake and the corrected itemized Gold subset already exist
according to retained evidence. Full-original dispositions, overlap/contract
financial reconciliation and controlled Gold publication still need engineering
work before a complete financial refresh. Category staging requires no Bronze or
Silver rerun. No cloud upload, Spark/SQL execution or serving switch occurred here.

Preserve eligible contract financial value once, leave restricted product/quantity
details unavailable, and keep category, unit, model and business approvals separate.
See [contract treatment](CONTRACT_RETENTION_ANALYSIS.md) and
[current state](../docs/CURRENT_STATE.md) for evidence and remaining gates.

## Local verification

```powershell
python -X utf8 -m unittest discover -s databricks_updated_2/medshield_project/tests -v
python -X utf8 databricks_updated_2/medshield_project/render_csv_assessment.py --check
python -X utf8 databricks_updated_2/medshield_project/render_selfcontained_assessment.py --check
python -X utf8 databricks_updated_2/medshield_project/render_readme.py --check
```

Run these from the repository root. Numerical STL checks require the documented
`.venv-predictive` environment if the default Python lacks dependencies.
[Migration evidence](../outputs/workspace_migration_20261026/README.md) records
the earlier transfer. [Cleanup evidence](../outputs/workspace_cleanup_20261026/README.md)
supersedes that inventory for the current folder contents. All original CSVs,
references, immutable releases and the complete local test suite remain (162 tests at cleanup; 200 pass in the current validation).
