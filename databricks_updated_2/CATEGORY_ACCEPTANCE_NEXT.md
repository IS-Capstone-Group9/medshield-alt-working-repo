# Stage the accepted reporting categories — 26 October 2026

**Current status:** candidate staging already passed in Adrian's supplied output.
[Current State](../docs/CURRENT_STATE.md) and
[retained staging output](../outputs/databricks_assessment_20261026/category_acceptance_accepted/staging-user-output.json)
record scope and provenance. Do not repeat this run for the workspace migration.
Instructions below are retained for reproducibility; next engineering prepares
corrected-original/contract financial reconciliation and controlled publication.

Adrian delegated the best category-only decision after the exact scope was shown.
Recorded acceptance: preserve 1,584 existing known classifications, accept 3,235
known category proposals (3,233 currently active), keep 875 explicitly Unclassified.
Total 5,694 accepted reporting dispositions, including 4,819 known categories.
Unclassified is an accepted unresolved bucket, not a verified product identity.
The shared master and all cloud serving pointers remain unchanged.

## 1. Upload four ordinary files

Local folder: databricks_updated_2/category_releases/category_b160d6aad4376d64/

Create/open this new Workspace folder, beside classification_releases:
/Workspace/medshield/category_releases/category_b160d6aad4376d64/

Upload the four files directly inside it, preserving bytes and filenames:
- accepted_product_master.csv
- category_acceptance.json
- publication_contract.json
- manifest.json

Leave the existing 13-file classification release and shared reference master
unchanged. This is a separate accepted-category package, not a replacement for it.

## 2. Import the candidate-staging notebook

Local: databricks_updated_2/medshield_project/maintenance/20261026_stage_accepted_categories.py
Remote: /Workspace/medshield/medshield_project/maintenance/

Import as a new Python notebook. Select Serverless and Run all. No parameters need
changing. Its first success message is:
PASS_ACCEPTED_CATEGORY_PACKAGE: category-only receipt and all package files verified.

The notebook checks source Delta0 schema/identity, keys, exclusions and signed
eligible finance; joins accepted decisions by exact key and normalized label;
preserves every field outside seven category/publication metadata fields; and
checks all candidate values against the exact expected result. Only the new
category_b160d6aad4376d64_candidate table may be created. V2 create refuses an existing target;
an existing version0 identical candidate is verified without writes. A changed
existing table fails. No overwrite, delete, append or serving switch exists.

Expected final success:
Accepted-category candidate created and read back. Live serving unchanged.
An identical retry instead says:
Identical accepted-category candidate verified; zero writes.

Send the complete final output or exact error. Do not change guards to make a
failure pass. Local tests establish package/approval guards, not Spark execution.

## Remaining publication work

This stages a candidate with accepted categories; it does not activate the
website. Engineering must bind a coherent current-source gateway publication,
verify candidate/Gold/API/dashboard/export parity and relevant unavailable states,
and retain source/STL/model compatibility before any serving switch. All source
records, signed financial amounts and independent demand gates are conserved.
Full-original/contract-inclusive finance, SKU/unit/forecast and business release
approval remain separate; no acceptance of those is inferred from this decision.
