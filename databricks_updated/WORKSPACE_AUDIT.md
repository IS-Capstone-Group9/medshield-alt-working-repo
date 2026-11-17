# Workspace file audit — 24 October 2026

**26 October full-folder audit supersedes this upload handoff:** see
[FULL_FOLDER_AUDIT.md](FULL_FOLDER_AUDIT.md) and [individual upload files](UPLOAD_FILES.md).
The 24 October comparison below is historical. Current pure provenance/parser
corrections and the malformed query-comment repair are retained with before/after
hashes; they are no longer claimed byte-identical to the original export.
Historical runtimes and publication guards remain in place.

`databricks_updated/` is now the main local Databricks folder. It was supplied by
Adrian as the latest workspace export; this is a local comparison, not a fresh
cloud Workspace inventory. All 46 original export files are preserved unchanged.
The old folder is retained. Machine-readable before/after checks are in
[migration evidence](../outputs/databricks_folder_migration_20261024/verification.json).

## Missing runtime files

**No required file for the completed 01 Bronze → 02 Silver → 03 Gold intake is
missing.** Both trees contain the same ten yearly sales CSVs and four reference
CSVs. Their bytes match. All ten source hashes and all five reference/helper
hashes in `source_rebuild_20261022.json` match the updated files.

The export includes `source_rebuild.py`, `product_catalog.py`,
`catalog_publication.py`, the source descriptor and both catalog JSON receipts.
The notebooks' fixed `/Workspace/medshield/...` paths resolve to those exported
relative locations. The local folder rename does not rename remote paths.

The old main project had 54 files. At 25 matching relative paths, eight are
byte-identical, fourteen differ only by line endings and three differ logically:
01, 02 and 03. The updated notebooks explicitly select the source contract;
Gold adds batch/dataset/schema/upstream guards. Do not overwrite them with the
older notebook versions.

## Files brought forward locally

26 missing local support files were added without replacing export files:

| Group | Added files | Workspace upload needed? |
| --- | --- | --- |
| Operating guidance | `GUIDE.md`, generated `README.md`, `SOURCE_INGESTION_2026.md`, `maintenance/MARGIN_RATE_PATCH.md` | No; current guide/intake text updated for this export |
| Source checks/preparation | `verify_local_sources.py`, `prepare_source_rebuild.py` | No; local tools, now using flat CSV/reference folders |
| Catalog review/preparation | `catalog_interchange.py`, `package_catalog.py`, `prepare_product_evidence.py`, `product_review_rules.py`, `review_catalog.py`, `review_product_sales.py` | No; offline review or historical package tools |
| Documentation generation | `render_readme.py` | No |
| Regression checks | Eleven `tests/test_*.py` files | No |
| Maintenance sources | `maintenance/20261020_positive_margin_basis.sql`, `maintenance/20261020_verify_margin_current.sql` | Optional query sources; not missing runtime dependencies |

The two old `medshield_project/references/*.csv` files are duplicates of the
flat `medshield_reference_csv/` copies. They were not duplicated again; current
local review tools use the flat canonical references. Historical catalog
validation intentionally retains hash-bound predecessor artifacts and recorded
`databricks/...` identities. Those receipts and the exported validator bytes
remain unchanged; old category-only packages are not new 2026 deployment plans.

## Findings requiring care

- **Malformed exported maintenance query:**
  `maintenance/20261020_positive_margin_basis.dbquery.ipynb` starts its SQL code
  with `MMMMMMMMMMMMPREPARED ONLY:` instead of `-- PREPARED ONLY:`. Its remaining
  SQL matches the valid `.sql` source brought forward. The exported notebook is
  preserved as evidence; correct that comment in Databricks only if the optional
  maintenance query is deliberately prepared for execution. The verification
  query's code matches its `.sql` source. No patch was run.
- **04–08 retain historical targets.** Their presence does not make them ready
  for the isolated 2026 batch. Prepare any serving/STL/predictive changes against
  the intended source identity separately.
- **External source folders are outside both exports.** External setup expects
  `DOH_datasources/` and `PAGASA_datasources/` at the workspace root, or existing
  raw-file Volume archives for subsequent steps. They are not files forgotten
  in the old folder. Their live availability was not checked here.
- **Optional duplicates/diagnostics:** the dated `product_catalog 2026-10-09
  02_47_18.py` is byte-identical to the normal helper. `New Query...`,
  `VALIDATION_QUERY.py` and query-status notebooks are optional diagnostics.
  Old-only `sales_bridge_databrick.py` is a read-only yearly-view diagnostic;
  it stays historical rather than adding another current bridge.

## Verification scope

Original-file and source/reference hashes, offline notebook regression checks,
generated README consistency, migrated local links and focused backend
catalog/publication checks are retained in the migration evidence. No service
restart, frontend build, credential change, workspace upload, cloud notebook run,
warehouse write, model fit or release approval was performed for this migration.
Existing application/model state is owned by [Current State](../docs/CURRENT_STATE.md).
