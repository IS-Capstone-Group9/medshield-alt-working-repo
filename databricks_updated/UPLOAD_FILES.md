# Individual files to upload after the full-folder audit

**Current first run:** import/update only maintenance/20261026_assess_original_sales.
It is now self-contained, contains the current reviewed parser and has no external
helper-file, __file__ or cached-helper-version dependency. Its first output is
`Assessment version: 20261026-self-contained-v1`. Earlier two-helper patch instructions
are superseded for this assessment. No CSV edit or ZIP is required.

26 October 2026. Use **upload_ready/** inside databricks_updated. It contains only
the current assessment/classification files, arranged like the remote Workspace.
No ZIP is needed or created. Do not upload the entire development/export folder.

The originals are already uploaded according to Adrian; do not repeat the source
replacement or run the declined original-CSV verification notebook.

## 1. Upload and run ONE self-contained assessment notebook

Local file: `upload_ready/medshield_project/maintenance/20261026_assess_original_sales.py`.
The same current file is in `databricks_updated_2/medshield_project/maintenance/`.
Destination: `/Workspace/medshield/medshield_project/maintenance/`.
Import/update this Python notebook, select Serverless, and click Run all.

It reads the ten CSVs already in `/Workspace/medshield/medshield_project_csv/`.
Parsing and assessment are embedded from the reviewed modules, so old external
helpers cannot cause __file__ or payload keyword failures. The first output must be
`Assessment version: 20261026-self-contained-v1`. Leave helper files in place; they
are optional tooling, not notebook dependencies.

The notebook never writes files/tables, trains models or grants approvals. Its CSV
assessment preserves raw source rows and contract amounts, excluding contract
summary labels from named-product profiles. It is not financial publication.

Expected current-source checks:

- raw physical lines: **62,065**, all preserved/disposed;
- analysis-candidate rows: **40,523**, including **40,171** itemized candidates and **352** contract candidates;
- recorded contract-candidate net sales: **PHP118,330,249.95**;
- contract physical quantity: **null**, product breakdown: **unavailable**;
- approvals/models/source modifications: **0 / 0 / false**.

Expected final message:

```text
PASS_ORIGINAL_CSV_ASSESSMENT. No files or tables changed; no approvals added.
```

The report's financial eligibility is only the parser's technical net-value checks.
It does not establish revenue recognition, full-company coverage or parent/child
overlap clearance. Missing months remain unknown, including unobserved later 2026
months; source records are not silently filled with zero sales.

## 2. Upload the 13 classification files individually

Local folder: `upload_ready/classification_releases/classification_52342363a7ef3211/`.

In Workspace > medshield, create/open **classification_releases**, then create/open
**classification_52342363a7ef3211**. Import the 13 files directly into this folder;
do not upload another enclosing copy of the folder inside it.

Required destination: `/Workspace/medshield/classification_releases/classification_52342363a7ef3211`.

| File | Workspace type |
| --- | --- |
| MedShield_product_classification_filled_final.xlsx | Ordinary file |
| product_master_review.csv | Ordinary file |
| classification_proposals.csv | Ordinary file |
| classification_proposals.json | Ordinary file |
| category_transitions.csv | Ordinary file |
| predecessor_product_master_review.csv | Ordinary file |
| current_source_capture.json | Ordinary file |
| live_product_parity.json | Ordinary file |
| candidate_verification.json | Ordinary file |
| release_validation.py | Ordinary Python file, keep .py |
| validate_classification_preview.py | Ordinary Python file, keep .py |
| OPERATOR.md | Ordinary file |
| manifest.json | Ordinary file |

Keep all filenames/bytes intact. The immutable packaged OPERATOR's older ZIP transport
wording is superseded by these individual-file directions; do not edit it and break
its checksum. Leave the shared `medshield_reference_csv/product_master_review.csv`
in place. The staged candidate is not an accepted shared-master replacement.

## 3. Upload and run classification validation

Local file: `upload_ready/medshield_project/maintenance/20261026_validate_classification.py`.
Destination: `/Workspace/medshield/medshield_project/maintenance/`.
Import/update this notebook, select Python Serverless and click Run all only after
the 13 package files are present. It verifies the pinned manifest and all files
before loading package code. Parameters are fixed to validate-only; no widgets need editing.

Expected final message:

```text
Validation complete. Zero table writes; proposal columns remain review-only.
```

This second notebook checks the existing immutable corrected Gold snapshot with
40,160 rows. That is a different population from the new original-CSV assessment,
not an instruction to delete candidate rows until counts match. It does not ingest
the newly uploaded CSVs, approve product categories, create a preview or publish
contract-inclusive totals. It requires SELECT/time-travel access to its pinned
fact and excluded tables. If it fails, preserve the exact error and stop.

## Keep these out of this upload/run

- Old 01_sales_bronze, 02_sales_silver and 03_sales_gold runtimes: still bound to
  historical adjusted inputs. Their pure declarations were corrected for current
  assessment, but their old source/publication guards intentionally remain.
- Old 04–08, margin-maintenance queries, external restart scripts, dashboards,
  category acceptance/source-rebuild receipts: historical or separate workflows.
- Tests, generators, local review/packaging tools, __pycache__ and .pyc files.
- The older classification release, duplicate submission archives and existing ZIP.
- Original_source_intake is an optional historical evidence workflow whose SQL
  equivalent already ran. Do not rerun it merely because CSVs were uploaded.

The current **upload_ready/** view contains 17 actual upload files: two optional ordinary
helpers, two maintenance notebooks and the 13-file classification set. It is a
mirror of the current source files, not a replacement source directory. The
[upload manifest](UPLOAD_MANIFEST.json) records exact source/copy hashes and targets.

## Remaining implementation

The full-original financial/contract reconciliation, accepted product-category
publication, versioned Gold consumers, gateway/dashboard/export checks and actual
acceptance remain separate. The audit does not authorize running old bridges or
adding the contract sum directly to existing dashboard totals. Local tests are not
Spark execution; no remote upload or warehouse change was performed in this audit.

References: [audit findings](FULL_FOLDER_AUDIT.md), [contract analysis](CONTRACT_RETENTION_ANALYSIS.md),
[current state](../docs/CURRENT_STATE.md), [Workspace import](https://docs.databricks.com/aws/en/files/workspace-basics).
