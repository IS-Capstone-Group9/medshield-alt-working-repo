# 2026 source intake in the current workspace export

**26 October original-source handoff:** the adjusted source_20261022 intake below
is historical. The [full audit](../FULL_FOLDER_AUDIT.md) and [individual-file guide](../UPLOAD_FILES.md)
use ordinary parser modules and a new read-only assessment for the restored CSVs.
Existing original-evidence SQL intake is already preserved; this is not a reason
to replay the historical adjusted pipeline or publish contract totals automatically.

The main local folder is `databricks_updated/`. Remote workspace paths still
start with `/Workspace/medshield/`.

Isolated Bronze → Silver → Gold intake is completed for `source_20261022`.
The [24 October verification](../../outputs/gold_completion_20261024/README.md)
records persisted checks. Do not rerun solely because the local folder changed.
[Current State](../../docs/CURRENT_STATE.md) owns later application and model status.

## Included dependencies

- Original 2017–2026 sales CSVs in flat `medshield_project_csv/`.
- Four reference CSVs in flat `medshield_reference_csv/`.
- `source_rebuild.py`, `product_catalog.py`, `catalog_publication.py` and all
  three JSON descriptors/receipts in their expected project locations.
- 01–03 explicitly selecting
  `/Workspace/medshield/medshield_project/references/source_rebuild_20261022.json`.
- Gold's batch/dataset/schema/input checks and archive preservation correction.

The [workspace audit](../WORKSPACE_AUDIT.md) verifies local identities. No runtime
dependency is missing for the completed intake. Restored local tools, tests
and docs do not require another upload.

## Later work

Candidate tables are in
`workspace.medshield_{bronze,silver,gold,audit}_source_20261022`.
New-source provenance remains `UNREVIEWED_SOURCE_EXPORT`. Technical checks do not
approve completeness, medicine quantities, external joins or a model.

Do not run 04/05 bridges, 06 STL or 07/08 predictive notebooks automatically.
Their exports retain historical contracts; source-bound changes and verification
are separate work. Preserve frozen predictions before evaluating eligible 2026
targets or retraining.

Keep source hashes and JSON receipt bytes intact. A later source change needs a
current predecessor capture and reviewed contract, not edited expected hashes.
The old [intake runbook](../../databricks/medshield_project/SOURCE_INGESTION_2026.md)
records earlier preparation/widget instructions; this snapshot's explicit
configuration supersedes those selection instructions.

## Local verification

```powershell
python -X utf8 -m unittest discover -s databricks_updated/medshield_project/tests
python -X utf8 databricks_updated/medshield_project/verify_local_sources.py --output NEW_PROFILE_PATH.json
python -X utf8 databricks_updated/medshield_project/render_readme.py --check
```

These checks do not run Spark or verify current cloud permissions or source
availability. Choose a new profile output path to preserve previous evidence.
