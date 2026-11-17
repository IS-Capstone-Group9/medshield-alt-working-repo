# Databricks workspace notebook guide

## Current original-source upload — 26 October 2026

Use [the individual-file upload guide](../UPLOAD_FILES.md) and
[the full-folder audit](../FULL_FOLDER_AUDIT.md). No ZIP is required or created.
The original CSVs have already been uploaded according to Adrian. Current
read-only assessment uses `sales_csv_assessment.py` and `verify_local_sources.py`
as ordinary Workspace files, called by `maintenance/20261026_assess_original_sales`.
It preserves contract summaries and excludes their labels from product profiles.
Neither this assessment nor classification validation publishes financial/category
changes. The copyable 01–03 code below is HISTORICAL and must not be run on originals.

Canonical local root: `databricks_updated/`. Before-change exported bytes are
preserved in the dated audit evidence outside this upload folder. The audit fixes
pure source provenance and one malformed query comment while retaining historical
runtime/publication guards. Local runbooks, tests and review tools are separate.
The old `databricks/` folder is historical. See the [folder audit](../WORKSPACE_AUDIT.md).

## Current 2026 configuration

Exported 01–03 explicitly select
`/Workspace/medshield/medshield_project/references/source_rebuild_20261022.json`.
Gold also rejects the wrong dataset, batch, target schemas or missing upstream
tables. Preserve these safeguards. This export intentionally differs from the
older general-purpose widget-based notebook sources.

The isolated intake is completed according to the
[24 October persisted verification](../../outputs/gold_completion_20261024/README.md).
Another run is not needed for that batch. Consult
[Current State](../../docs/CURRENT_STATE.md) for later application activation and
forecast status; a local directory change does not change those states.

## Required workspace files

Keep remote paths under `/Workspace/medshield/` unchanged:

- `medshield_project/`: 01–03, `source_rebuild.py`, `product_catalog.py`,
  `catalog_publication.py`.
- `medshield_project/references/`: `source_rebuild_20261022.json`,
  `catalog_publication.json`, `category_acceptance.json`.
- `medshield_project_csv/`: ten original yearly sales CSVs.
- `medshield_reference_csv/`: product master, transaction evidence, area mapping
  and nonmedical-candidate reference CSVs.

Helpers are Python workspace files, not additional notebook cells. All these
dependencies are present. Preserve source and JSON receipt bytes; historical
literal paths in bound receipts are evidence identities, not the current local
folder layout.

## Downstream and optional files

04/05 bridges, 06 STL and 07/08 predictive notebooks retain historical contracts.
They are not an automatic continuation for the 2026 batch. External restart
notebooks also need DOH/PAGASA source folders or existing Volume archives;
those source folders are outside both exports and were not checked remotely.

The [audit](../WORKSPACE_AUDIT.md) identifies optional duplicates and the formerly
malformed exported maintenance query. Its comment is corrected locally; the valid
maintenance `.sql` sources still target historical contracts. No patch is executed.

## Local tools

Run `python -X utf8 -m unittest discover -s databricks_updated/medshield_project/tests`.
Run `render_readme.py --check` to compare the generated README with this guide
and the exact notebook cells. Regenerate without `--check` after intentional edits.
Run `render_csv_assessment.py --check` to compare the ordinary Workspace parser
module with the reviewed pure declarations in the notebook sources. Regenerate
that module after intentional parsing/provenance edits, then rerun parser tests.
`verify_local_sources.py` reads flat sibling `medshield_project_csv/`;
catalog review tools read flat sibling `medshield_reference_csv/`.

`package_catalog.py` and the exported catalog validator retain the historical
category-only contract and archived predecessor receipts. They are not a new
2026 deployment package. Historical validation deliberately reads some bound
artifacts from the old folder; this does not make that folder canonical.
`prepare_source_rebuild.py` retains the reviewed batch/predecessor guards and
must not overwrite an existing batch or manufacture a new review.
