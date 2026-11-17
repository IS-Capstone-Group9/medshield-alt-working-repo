# Databricks workspace notebook guide

## Current workspace — 26 October 2026

Canonical local root: `databricks_updated_2/`. Start with [the workspace README](../README.md)
and [accepted-category staging](../CATEGORY_ACCEPTANCE_NEXT.md). Assessment,
validation, preview and accepted-category staging have passed in retained user-supplied output.
Do not repeat them merely because files were consolidated locally.

The assessment entrypoint is self-contained and does not import external helpers.
Original sales/reference files, helper modules and local tests are now colocated.
`databricks_updated/` and `databricks/` retain historical evidence. Remote paths
remain under `/Workspace/medshield/`.

The 01–03 code and bound receipts below retain historical contracts. They are
reference material, not the next run chain for restored originals. Full-original
and contract-inclusive financial processing/publication remains separate.
See [migration verification](../../outputs/workspace_migration_20261026/README.md).

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

Historical 04/05 bridges, 07/08 model setup, external notebooks, old margin
patches and duplicate query/dashboard exports were removed from this active
folder. Their exact bytes are retained in the dated
[cleanup archive](../../outputs/workspace_cleanup_20261026/README.md).
The two 06 STL sources remain because numerical/provenance checks use them;
their presence is not an instruction to execute a historical cloud contract.

## Local tools

Run `python -X utf8 -m unittest discover -s databricks_updated_2/medshield_project/tests`.
Run `render_readme.py --check` to compare the generated README with this guide
and the exact notebook cells. Regenerate without `--check` after intentional edits.
Run `render_csv_assessment.py --check` to compare the ordinary Workspace parser
module with the reviewed pure declarations in the notebook sources. Regenerate
that module after intentional parsing/provenance edits, then rerun parser tests.
`verify_local_sources.py` reads flat sibling `medshield_project_csv/`;
catalog review tools read flat sibling `medshield_reference_csv/`.

Unused historical package/rebuild preparation tools were archived. Retained
catalog validation may read hash-bound historical receipts outside this folder;
those evidence paths do not make the prior workspace current. Keep all tests
and their helper dependencies together when preparing the corrected flow.
