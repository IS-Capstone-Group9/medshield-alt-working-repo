# Uploaded Databricks export review — 9 October 2026

The user's export is under `databricks/medshield_project_backup/medshield_project`.
It was inspected without edits. Current execution files are in
`databricks/medshield_project`.

## Exact replacement set

1. Replace the deployed `03_sales_gold` notebook with the current
   `databricks/medshield_project/03_sales_gold.py`. Its old Cell 3 assertion checked
   an accepted reporting scope against the predecessor's pending scope. The fix
   checks the preserved demand gate against its bound original scope while
   continuing to validate current categories and all 137 immutable fields.
2. Replace `/Workspace/medshield/medshield_project/references/catalog_publication.json`
   with the current file at that relative location in the active local directory.
   The export has the earlier descriptor; three source dependency versions changed.

The other sales and external analytical code, catalog helpers and category receipt
match the export. The timestamped product helper is an identical extra copy; use
the canonical `product_catalog.py` path. The active `06_sales_stl.py` now preserves
the exported environment version 6 and `statsmodels` dependency. Its analytical
code is identical to the deployed export, so it needs no replacement for this fix.

## Verification and execution boundary

- All 82 local pipeline tests passed freshly in 25.313 seconds. Every Python file
  in the active directory and uploaded export parsed successfully.
- The fresh read-only warehouse check confirmed all 29 dependency versions still
  match the active descriptor, 37,728 unique fact records, exact equality for all
  55 current Silver source fields, and zero invalid predecessor demand gates.
- The four local reference CSV hashes match the bound contract and the accepted
  product master/category receipt validate together. The export does not contain
  the shared `medshield_reference_csv` folder, so this does not verify those cloud
  file uploads. Gold Cells 1–3 check the actual uploaded bytes and contracts.
- Gold Cells 1–6 perform no warehouse writes. Run Cells 1–3 first, then 4–6 to check
  dimensions and marts. Full publication begins in Cell 7 and follows the existing
  maintenance and rehearsed recovery requirements in `docs/CATALOG_DEPLOYMENT.md`.
  After that publication, the order is 04 monthly bridge → 05 SQL system bridge →
  06 STL. Do not rerun 01/02 for this category-only correction.

No cloud notebook execution, table write or application release activation was
performed in this review. A passing local suite/read-only source check is bounded
evidence; the actual notebook execution remains to be verified.

Machine-readable evidence: `uploaded-backup-verification.json`,
`uploaded-backup-comparison.json`, `uploaded-backup-diff.txt`, and
`uploaded-backup-cloud-recheck.json` beside this file.
