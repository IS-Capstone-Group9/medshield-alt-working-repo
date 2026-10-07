# Catalog candidate: operator deployment and rollback

This is a prepared local package, not a deployment or CEO release decision. Do not
run these write steps until the operator has a controlled candidate maintenance
window. Keep the application pinned to its current fact throughout preparation.
Never replace recorded CEO decisions or treat technical PASS as business approval.

## Bound predecessor and package

- Dataset: `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
- Fact Delta version: **16**, Gold policy `sales_restart_gold_v6_reviewed_source_provenance`.
- Previous product master SHA-256: `8a34ce4946d2b99f896b1dec9e93dd5865ece8fee5e582c64dc6c5b798cca921`.
- New header-only master SHA-256: `1361f7629d4dab4f1f6414db32a19e9eea9ab20acb99319d168aecc9fef48088`.
- Target policy: `sales_restart_gold_v7_independent_catalog`; resolution: `catalog_v1_independent_evidence`.
- [Local reconciliation receipt](../outputs/product_catalog_implementation/2026-09-27T07-51-00-423Z/summary.json).
- Full fact receipt SHA-256: `883a13a752211c5fff7dc9c43552a1dec4ec48eccfb2319f6506b9ff46e64341`.

`python databricks/medshield_project/package_catalog.py` creates the local ZIP and
manifest in `outputs/catalog_deployment/`. The manifest binds the current Git HEAD,
exact notebook/helper/application file hashes, preparation master/evidence hashes,
and local receipts. The working tree is not a clean commit; file hashes, not HEAD
alone, identify this package. Preserve existing unrelated work when committing later.

## Preflight and capture

1. Stop concurrent pipeline jobs through the Databricks operator controls. Save
   current job/notebook revisions, environment configuration and gateway revision.
   Keep `DATABRICKS_DESCRIPTIVE_FACT_VERSION=16` in the currently serving gateway.
2. Run and save `DESCRIBE HISTORY workspace.medshield_gold.sales_restart_fact_candidate LIMIT 1`.
   It must still be 16 and its dataset must match the identity above. If not, stop:
   refresh the complete read-only profile and rebind the catalog migration and receipts.
3. Save every table's current Delta version from the Gold publication table:
   `SELECT table_name FROM workspace.medshield_audit.sales_restart_gold_publication_candidate`.
   For each returned table, execute `DESCRIBE HISTORY <table_name> LIMIT 1` and save
   its version. Also capture the publication table and
   `workspace.medshield_gold.sales_restart_stl_candidate` histories. Save `SHOW CREATE TABLE`
   for each bridge view created by 04/05, plus the old notebook files and reference CSVs.
   Do not VACUUM retained rollback versions.
4. Run locally:

   ```powershell
   python -m unittest discover -s databricks/medshield_project/tests
   python databricks/medshield_project/render_readme.py --check
   python databricks/medshield_project/package_catalog.py
   ```

   Verify ZIP and manifest hashes and compare the deployed product/evidence CSV
   bytes to the authoritative preparation masters. The package script fails on
   divergent copies. Product and transaction-evidence masters remain header-only;
   adding reviewed entries creates a new package/hash and requires new tests/receipts.

## Candidate execution (no activation)

1. Import `03_sales_gold.py` and `06_sales_stl.py` as notebooks under
   `/Workspace/medshield/medshield_project/`. Upload `product_catalog.py` there as
   a **Python file**, preserving its bytes. Gold checks its SHA-256 before execution.
   Upload the two preparation CSVs to `/Workspace/medshield/medshield_reference_csv/`.
   Preserve the existing area master and nonmedical suggestion reference. Verify all
   uploaded bytes against the package manifest. Gold prints the product master and
   records product, helper, resolution and transaction-evidence identities in the fact.
2. Run **03 Gold only** from Cell 1 to completion. It compares source records,
   financial values and financial eligibility to fact version 16 before writing.
   Do not run Bronze/Silver: their inputs and logic have not changed in this task.
   A mismatch is a deployment stop, not permission to weaken the assertion.
3. Run **04 monthly bridge → 05 system bridge → 06 STL** in that order. Upload
   unchanged 04/05 from the package if required. STL requires the v7 policy and
   records its source fact version. If any job fails, keep the application at 16;
   repair and rerun the candidate sequence before validation.
4. Capture the new fact version **V**, every new output version, the publication
   table, STL version, dataset, mapping hashes, resolution policy, helper hash and
   job run IDs. These are observed deployment values; do not assume V is 17.
5. In a separate backend validation shell, set the candidate version only for that
   shell, not the serving process:

   ```powershell
   Set-Location C:\Users\Adrian\projects\medshield1\medshield\backend
   $env:DATABRICKS_DESCRIPTIVE_FACT_VERSION = '<V from step 4>'
   node --import tsx scripts/publication-readiness.ts
   node --import tsx scripts/validate-descriptive.ts
   node --import tsx scripts/validate-catalog.ts
   ```

   All required checks must pass; catalog validation must report warehouse_catalog
   PASS, not legacy NOT_DEPLOYED. Save and hash the receipts. Confirm exact financial
   reconciliation, category partitions, source IDs, evidence guards, STL identity,
   original aliases, filtered ABC, and compatible-unit quantities. The earlier
   version-16 receipt only proves compatibility, not candidate cloud execution.

## Controlled activation

Only after the CEO's separate, explicit, version-bound acceptance of the intended
scope: record that actual decision outside this task, referencing dataset, V,
product/evidence/helper hashes, resolution policy, exact notebook/application
revision, related output versions and the new reconciliation receipt SHA-256.
Deploy the matching application artifact; set the serving gateway's
`DATABRICKS_DESCRIPTIVE_FACT_VERSION=V` and restart it once. Verify `/api/products`,
`/api/sales/sectors`, `/api/sales/heatmap` and STL all identify V. Verify company totals,
category selection, returns, unresolved coverage, aliases and exports. No local
test pass authorizes these activation steps.

## Rollback

1. Stop candidate jobs. Restore the previous application artifact/configuration,
   set the gateway fact pin to **16** (or the captured previously approved version),
   and restart. Confirm fact-derived endpoints identify that exact version/dataset.
2. If candidate table writes or bridge replacements affect dependent consumers,
   restore **each** changed pre-existing candidate table to its captured preflight
   version, using this exact SQL form per saved table/version:

   ```sql
   RESTORE TABLE workspace.medshield_gold.sales_restart_fact_candidate TO VERSION AS OF 16;
   -- Repeat RESTORE TABLE <captured table> TO VERSION AS OF <captured version>
   -- for all changed Gold/audit outputs, publication table and STL.
   ```

   RESTORE creates a new latest Delta version; keep the application's explicit pin
   at retained version 16. Restore the saved 04/05 view definitions and old notebook,
   helper and reference files. Do not drop the new canonical dimension; leave it
   unused for investigation. Never delete Bronze/Silver/source archives.
3. Restore the matching retained STL output or leave STL explicitly unavailable;
   do not serve components bound to another fact version. Re-run read-only financial
   and endpoint checks against the restored version and record a rollback receipt.
   Publication-readiness must be run against the matching restored preparation
   master; the v7 header hash deliberately differs from v6.

## Status boundaries

Implemented and locally verified: deterministic resolution, validation, review
outputs, Gold package, typed API/UI, safe exports and exact offline reconciliation.
Not deployed or approved: Gold v7, new dimensions/mappings, notebook execution,
candidate activation, product approvals and final CEO release decision. The
historical batch does not implement future client uploads or stable DR line IDs.
