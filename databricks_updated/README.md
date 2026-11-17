# Prior workspace — superseded 26 October 2026

Adrian selected [databricks_updated_2](../databricks_updated_2/README.md) as the
current local Databricks workspace. Necessary source/data/reference/test files
were consolidated there; future changes belong there. This folder is retained
for historical evidence. Guidance below records the prior state and is superseded
for folder ownership and current run order. No remote path or serving change.

---

# Main Databricks workspace folder

**Current assessment entrypoint:** maintenance/20261026_assess_original_sales is
now self-contained. Replace/import that one notebook and Run all; its first output
is `Assessment version: 20261026-self-contained-v1`. External helper versions and
notebook __file__ no longer affect this run. [Instructions](UPLOAD_FILES.md).
Earlier paired-helper upload directions below are superseded for assessment.

## Current upload: individual files, no ZIP — 26 October 2026

Use [UPLOAD_FILES.md](UPLOAD_FILES.md) and the clean **upload_ready/** folder.
[UPLOAD_MANIFEST.json](UPLOAD_MANIFEST.json) lists exact source/copy hashes and
remote destinations. [FULL_FOLDER_AUDIT.md](FULL_FOLDER_AUDIT.md) records every
file's role, checks and remaining execution limits.

The full audit corrects the original 2025 provenance helper, separates contracts
from itemized product profiles, fixes ordinary Workspace parser dependencies,
and repairs one malformed historical SQL comment. The original CSVs, references,
finalized Excel, immutable classification releases and existing ZIP stay unchanged.
The old ZIP is retained as evidence only; no archive is created or used for upload.

Adrian reports originals already uploaded and declines a separate source-verifier
step. Upload the two ordinary assessment helpers, run the new read-only CSV
assessment, then upload the matched 13 classification files and run the read-only
classification launcher. Current checks do not activate categories or contract-inclusive
financial serving. Historical 01–03/04–08 remain outside the current run sequence.

The full local folder also contains historical exports, tests, generators, caches
and old receipts. They are audited but are not a single runnable upload bundle.
Do not upload the whole folder indiscriminately. The old copyable README under
medshield_project is explicitly marked historical.

[Contract retention analysis](CONTRACT_RETENTION_ANALYSIS.md) preserves eligible
reconciled financial value once while keeping unavailable product/quantity detail
explicit. Source/classification verification is not financial publication approval.

## Original-source correction — 25 October 2026

Original 2020/2024/2025 CSVs are restored locally; altered bytes are archived.
The exported 01–03 notebooks remain pinned to their historical adjusted batch:
**do not rerun them on these originals**. Use the new isolated
`medshield_project/original_source_intake.py` and
[correction evidence/operator instructions](../outputs/truth_correction_20261025/README.md).
The SQL corrected itemized snapshot and rebuilt STL are deployed; separate
original-evidence intake also completed through SQL and was readback-verified across
all ten years. The Spark intake notebook remains unrun; it is not a prerequisite
merely to recreate that evidence. Use [the executed continuation](../outputs/truth_correction_20261025/continuation/README.md).
Full-original/contract-inclusive serving still needs reconciliation and publication;
classification validation does not activate it. Contract labels are transaction
evidence with unavailable product detail, not automatically non-medical products.

`databricks_updated/` is the canonical local Databricks folder, selected by Adrian
on 24 October 2026. Its original 46-file workspace export is recorded in the migration audit;
before-change bytes for the current fixes are retained in the dated full-audit evidence. The old `databricks/` folder is retained for history
and evidence; use this folder for current work.

| Location | Purpose |
| --- | --- |
| `medshield_project/` | Exported sales, external and predictive notebooks, helpers and JSON contracts |
| `medshield_project_csv/` | Ten supplied sales CSVs, 2017–2026; original bytes |
| `medshield_reference_csv/` | Four supplied reference CSVs; canonical reference copies |
| `medshield_project/tests/` | Restored local regression checks; not workspace uploads |
| Local review, preparation, packaging and documentation scripts | Contributor tools; not automatic pipeline steps |

Start with the [workspace audit](WORKSPACE_AUDIT.md),
[notebook guide](medshield_project/GUIDE.md) and
[2026 intake status](medshield_project/SOURCE_INGESTION_2026.md).
[Copyable notebook code](medshield_project/README.md) is generated from the actual
exported 01–03 files. [Current State](../docs/CURRENT_STATE.md) owns current
application activation and model status.

The 01–03 walkthrough and [analytics next steps](ANALYTICS_NEXT_STEPS.md) describe
the historical adjusted batch; do not use them to rerun the restored originals.
The descriptive report and actual new financial research evaluation are delivered;
the new model remains unpublished for review.

The later [paper-to-system review and STL repair](../outputs/paper_analytics_closure_20261024/README.md)
adds `06_sales_stl_2026.py` for the active financial source. Its isolated candidate
was persisted and read back; original exported 06 is preserved. The review also
identifies original paper model requirements that financial analytics do not close.

The comparison found **no missing runtime dependency for the completed 01–03
intake**. Added local tools and runbooks are not evidence of a workspace upload.
Existing `/Workspace/medshield/...` paths remain unchanged.

Do not replay 04–08 against the new batch: those exports retain historical
serving/model contracts. The exported positive-margin maintenance query has a
malformed first line; its valid `.sql` counterpart is documented in the audit.
This migration executes no notebook and changes no warehouse object or approval.

Local checks, from the repository root:

```powershell
python -X utf8 -m unittest discover -s databricks_updated/medshield_project/tests
python -X utf8 databricks_updated/medshield_project/render_readme.py --check
```
