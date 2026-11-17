# Add the supplied 2026 source through Bronze, Silver and Gold

This source-change run uses the existing three notebooks with an explicit
isolated-batch contract. It writes candidate tables in
`workspace.medshield_{bronze,silver,gold,audit}_source_20261022`.
The serving schemas, bridge views, fact version 20, frozen model input and stored
forecasts remain unchanged. This is ingestion and candidate validation, not
serving activation, a study-scope decision or model approval.

## Current preparation and access

**24 October completion update:** the operator completed the isolated Gold run.
[Fresh persisted verification](../../outputs/gold_completion_20261024/README.md)
confirms 41,073 unique fact records, 3,345 from source 2026, all 22 expected output
audits passing, complete historical immutable-field preservation and core metric
reconciliation. Another intake run is not needed for this completed batch.
Serving and model activation remain separate as described below. The 22 October
preparation/access account that follows is retained as dated history.

The 22 October 2026 read-only capture confirms the serving fact is version 20,
the nine baseline CSV identities match, and the four proposed batch schemas do
not exist. The available credential can execute SQL. Workspace and Jobs reads
return HTTP 403 for missing `workspace` and `jobs` scopes. An operator with the
required notebook upload/run and Run as catalog/schema/volume/table privileges
must execute the prepared package. No notebook or cloud write has been performed
by preparing it.

Preparation and local results are retained under
`outputs/source_ingestion_20261022/`. The generated ZIP contains the original
2026 CSV, the updated notebooks, helpers, unchanged review references/receipts,
the new source-change descriptor, this runbook and an upload checksum manifest.
It excludes credentials and application configuration.

## Prepare or refresh the package

1. Capture the current serving predecessor and access status with the read-only
   preflight used for this batch. Its retained statements are in
   `outputs/source_ingestion_20261022/live-preflight.json`. Recheck immediately
   before execution. If the serving fact or sources change, prepare a new reviewed
   contract. Do not edit expected hashes or weaken the guards to force a run.
2. Run local source validation and notebook tests, then regenerate the copyable
   README from the updated notebook sources.
3. Build the bound package:

```powershell
python databricks/medshield_project/prepare_source_rebuild.py --preflight outputs/source_ingestion_20261022/live-preflight.json --output outputs/source_ingestion_20261022/package
```

The preparation command accepts a capture at most 24 hours old and verifies all
historical files and reference hashes. Runtime guards verify the predecessor
version/identity again. Preparation alone is not cloud execution.

## Upload and run

Preserve the prior deployed notebook/helper bytes before replacing them. Use the
ZIP's `upload-manifest.json` to verify every uploaded file. Paths inside the ZIP
are relative to `/Workspace/medshield/`:

| Package path | Upload treatment |
| --- | --- |
| `medshield_project/01_sales_bronze.py` | Import/replace the `01_sales_bronze` Python notebook |
| `medshield_project/02_sales_silver.py` | Import/replace the `02_sales_silver` Python notebook |
| `medshield_project/03_sales_gold.py` | Import/replace the `03_sales_gold` Python notebook |
| `medshield_project/source_rebuild.py` | Upload as a Python workspace file, not an extra notebook cell |
| `medshield_project/product_catalog.py`, `catalog_publication.py` | Verify/upload unchanged helpers as workspace files |
| `medshield_project/references/catalog_publication.json`, `category_acceptance.json` | Preserve the existing category-only descriptor/receipt bytes; these govern inherited label classifications |
| `medshield_project/references/source_rebuild_20261022.json` | Upload the newly prepared source-change descriptor |
| `medshield_reference_csv/*.csv` | Verify/upload the unchanged reference bytes |
| `medshield_project_csv/medshield_data_2026.csv` | Upload original bytes beside the existing nine files |

In **each** of the three notebooks, set the `source_rebuild_contract` widget to:

```text
/Workspace/medshield/medshield_project/references/source_rebuild_20261022.json
```

If the widget is not visible after import, run only Cell 1 once to create it,
enter the path, then rerun Cell 1 before continuing. Confirm the loaded target
schemas use the batch suffix. The text-widget/get pattern also supports passing
this same value as a notebook-task parameter, as described in the
[Databricks parameter documentation](https://docs.databricks.com/aws/en/jobs/parameter-use).

Run **01 Bronze → 02 Silver → 03 Gold**, top to bottom. Run only one source-change
pipeline at a time. Confirm the widget is set in every notebook before execution.
An empty widget retains the historical mode; additional years in that mode fail
before writes. The old category-only descriptor must not be repurposed as a
source-change descriptor.

- Bronze validates the exact ten-file manifest and archives original bytes in
  the batch's own raw-file volume. Every physical line keeps a deterministic key.
- Silver reassembles the quoted multiline record for parsing. Its continuation
  physical line remains in the assessed ledger with an explicit exclusion, so
  source rows are neither lost nor counted as a second transaction.
- Silver recognizes the two-row 17-column header and full English delivery dates.
  Source MO/DATE do not replace missing delivery dates. Sales and cost quantities
  stay separate; the cost formula uses the source's cost quantity.
- Gold retains all historical accepted record keys and compares every historical
  field except the explicit dataset/pipeline-version/timestamp fields. Existing
  reporting categories and demand gates are preserved. New aliases stay pending.
  After validating incoming archive paths against the bound batch manifest and
  matching historical workbook/hash/physical-row identity, it retains historical
  Gold archive pointers. New records keep their isolated batch paths; `source_path`
  remains part of the immutable comparison. For the 24 October Cell 3 failure,
  import and run the [corrected standalone Gold notebook](../../outputs/gold_immutable_recovery_20261024/03_sales_gold_2026_archive_fix.py)
  from the top after the existing Bronze/Silver runs; no CSV re-upload is needed.
- 2026 provenance remains `UNREVIEWED_SOURCE_EXPORT`; it is not falsely labeled as
  an original verified or adjusted/estimated record. The new rows cannot become
  approved or provisional medicine-demand inputs through this intake.
- All writes are restricted to the four batch schemas. A pre-existing target with
  another dataset is rejected. Per-table exact persisted readback and Gold
  aggregate/eligibility/null checks remain enabled.

## Required cloud evidence

Retain actual output for each stage, including dataset ID, source hashes, ledger
dispositions, accepted keys, financial eligibility, Delta versions and every Gold
publication-audit result. The prepared dataset ID must match all three stages.
Compare the 2026 and historical partitions separately; raw whole-file totals
are not Gold-eligible KPI totals. Missing identities, repeated rows, date/month
differences, historical backfills and arithmetic warnings require explicit
dispositions rather than invented source values.

Do **not** run 04/05 serving bridges, 06 STL or 07/08 predictive notebooks as part
of this intake. They would change serving/model dependencies and require their
own source-bound preparation and verification. Leave the gateway pin and saved
forecasts intact. Any later 2026 forecast evaluation must first bind frozen
issue-time predictions to the accepted actual target population.
Serving activation also requires gateway/UI support for the new policy and
unreviewed-provenance state; an unreviewed row must not be counted as original
merely because its adjusted-source flag is false.

If a stage fails, keep its evidence and the source archive. The serving targets
are unchanged. Repair and rerun only this same isolated dataset, or prepare a new
batch when identity changes. Do not delete source evidence or overwrite an
unrelated batch to recover.

## Local verification commands

```powershell
python -X utf8 -m unittest discover -s databricks/medshield_project/tests
python -X utf8 databricks/medshield_project/verify_local_sources.py --output outputs/source_ingestion_20261022/local-source-profile.json
python -X utf8 databricks/medshield_project/render_readme.py --check
```

These commands check local parsing, historical preservation and contract logic.
They do not establish Spark/Databricks execution or serving approval.
