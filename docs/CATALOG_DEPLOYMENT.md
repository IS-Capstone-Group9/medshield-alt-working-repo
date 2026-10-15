# Accepted-category preparation, execution and recovery

Updated 8 October 2026. The current package accepts product categories for
descriptive reporting under Adrian's instruction. It is bound to predecessor
fact **19** on `sales_restart_gold_v7_independent_catalog`. Cloud deployment,
serving activation and CEO release acceptance remain separate steps. Earlier
version-16 and draft-only packages are historical.

Gold Cell 3 was corrected on 9 October 2026: category acceptance preserves the
predecessor provisional-demand flag, so its original scope must be validated
against the predecessor rather than the newly accepted reporting category. The
old 8 October package has a contradictory final assertion. Use the corrected
Gold source or latest 9 October package. Reference CSV/category-receipt/helper
bytes are unchanged. The publication descriptor was refreshed for three newer
Silver/validation table versions after all 55 current Silver fields were proven
equal to fact19. Use the refreshed descriptor together with corrected Gold.
The [9 October capture](../outputs/catalog_preparation/2026-10-09T03-03-37-411Z/predecessor-receipt.json)
binds 29 stable dependencies, 37,728 unique records and the same source identity.
See [the correction and regression evidence](../outputs/gold_assertion_fix_20261009/README.md).

## Current decisions and bound artifacts

All 4,561 labels have accepted reporting dispositions: 598 medicine, 646 medical
supply, 131 equipment, 209 nonmedical and 2,977 Unclassified. Unclassified is an
accepted reporting bucket with unresolved underlying category. The four medicine
gaps are accepted as medicine; 14 nebulizer kits are supplies/accessories.
Historical SKU, package, sales-unit, item-kind and forecast approvals remain
pending. Every alias and sales record is retained.

Both CSV copies are 4,755,483 bytes, SHA-256
`2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29`.
The [category receipt](../databricks/medshield_project/references/category_acceptance.json)
records actual user-directed provenance, per-label decisions and original/new
master hashes. It grants no business-release, SKU/unit or forecast approval.
[Full-file checks](../outputs/category_acceptance_20261008/README.md) independently
reconcile the inherited fact19 label totals: 37,728 records and net sales
₱626,946,741.81, including Unclassified and signed returns.

The shared [descriptor](../databricks/medshield_project/references/catalog_publication.json)
uses `category_acceptance_only` and binds all 144 fact columns. Exactly seven
fields may change: `product_category`, `category_status`, `display_category`,
`product_scope_status`, `catalog_evidence_source`, `product_master_sha256` and
`gold_published_at`. All other **137 fields** must equal their predecessor values,
including prices, financial amounts, original/adjusted provenance, identity,
quantities, quality and demand eligibility. Three scope-derived demand gates are
explicitly copied from the predecessor before rebuilding marts. This prevents
category acceptance from changing quantity eligibility.

Gold and gateway validation compare every accepted category transition to its
bound receipt, as well as exact schema/type and immutable-value equality.
Contract/hashtag scopes remain explicit. Categories do not create verified SKUs.
The old draft mode still rejects approved statuses. Future source ingestion
requires a separate source-change contract and review of new aliases.

The [earlier 8 October read-only capture](../outputs/catalog_preparation/2026-10-08T09-42-03-926Z/predecessor-receipt.json)
confirms 37,728 unique records, all 55 Silver source fields equal, 29 stable
dependencies and two bridge definitions. The [earlier same-day retention/access
check](../outputs/medicine_review_20261008/cloud-check.json) found captured versions
readable; 28 tables lacked explicit retention overrides and fact19 had 30-day
file/log retention. Neither check proves durable recovery. Workspace and Jobs
access returned HTTP403. Deployment and isolated recovery rehearsal remain
operator steps requiring suitable access.

## Local checks and package

From the repository root:

```powershell
python outputs/category_acceptance_20261008/verify.py
python -m unittest discover -s databricks/medshield_project/tests
python databricks/medshield_project/render_readme.py --check
python databricks/medshield_project/package_catalog.py
```

From `backend`: `node --import tsx --test tests/catalog-contract.test.ts`.
Local checks cover missing/duplicate decisions, tampered categories/quantities,
forbidden independent approvals, identical copies and Unclassified financial
partitions. They do not prove a replacement's cloud/API/STL execution.

Packaging writes a dated ZIP, manifest and checksums under
`outputs/catalog_deployment/`, including actual working-tree sources, descriptor,
receipt, archived original CSV, predecessor receipt, evidence and current runbook.
It states `ready_for_execution=false` and `recovery_rehearsal_verified=false`
until operator prerequisites pass. Credentials are excluded. Older ZIPs with a
different master hash must not be substituted.

Any CSV edit invalidates the descriptor/package. Archive the previous descriptor,
then run `node --import tsx scripts/prepare-catalog-publication.ts --category-acceptance`
from `backend` for a fresh read-only capture. The script currently expects19 and
creates the descriptor exclusively. A changed baseline requires review, not a
weakened guard. Keep the serving pin19 throughout preparation.

## Before warehouse writes

1. Arrange controlled maintenance, stop concurrent pipeline jobs and preserve
   deployed notebooks/helpers/references/application revisions.
2. Recheck all 29 dependency versions and uploaded artifact hashes. Changed
   data/code identities require fresh preparation; do not mix package versions.
3. Verify retained files and readability for every rollback version. Save durable
   recovery artifacts where retention is insufficient, covering all Gold/audit
   outputs, publication audit, STL, source inputs and bridge definitions. Do not
   VACUUM files needed for recovery.
4. Rehearse recovery in isolated targets and save the actual result before
   treating the package as executable. A version number or longer retention
   alone is insufficient.

Token scope and resource ACLs are separate. The operator needs the applicable
workspace edit, job/compute and Run as catalog/schema/table privileges. Keep
credentials server-side and out of the package/browser.

## Exact upload set

Use the files in the new category ZIP after the prerequisites. Verify uploaded
bytes against its manifest. Upload helpers/JSON as workspace files beside Gold;
do not paste them into extra notebook cells.

| File | Destination |
|---|---|
| `03_sales_gold.py` | Replace all cells of `/Workspace/medshield/medshield_project/03_sales_gold` |
| `product_catalog.py` (unchanged; verify bytes) | `/Workspace/medshield/medshield_project/product_catalog.py` |
| `catalog_publication.py` | `/Workspace/medshield/medshield_project/catalog_publication.py` |
| `references/catalog_publication.json` | `/Workspace/medshield/medshield_project/references/catalog_publication.json` |
| `references/category_acceptance.json` | `/Workspace/medshield/medshield_project/references/category_acceptance.json` |
| `product_master_review.csv` | `/Workspace/medshield/medshield_reference_csv/product_master_review.csv` |
| `transaction_evidence_review.csv` (unchanged) | `/Workspace/medshield/medshield_reference_csv/transaction_evidence_review.csv` |
| `area_classification_mapping.csv` (unchanged) | `/Workspace/medshield/medshield_reference_csv/area_classification_mapping.csv` |
| `likely_non_medical_product_candidates.csv` (unchanged) | `/Workspace/medshield/medshield_reference_csv/likely_non_medical_product_candidates.csv` |

Verify existing **04 monthly bridge**, **05 system bridge** and **06 STL** against
packaged sources; replace if different. Preserve Bronze/Silver and the already
ingested source files for this category-only publication. The archived original
CSV and preparation receipts are recovery/evidence artifacts in the package;
Gold consumes the current master, descriptor and category receipt above.

## Execute and validate

1. Run **03 Gold from Cell 1 → 04 monthly bridge → 05 system bridge → 06 STL**.
   Keep jobs stopped throughout. Gold checks every category decision, all 137
   immutable fields and dependency histories immediately before writing. Do not
   rerun 01/02 for this category-only operation.
2. Record actual new fact version **V**, every output version, job IDs and hashes.
   Do not assume the next version number or reuse old execution receipts.
3. In a separate validation shell in `backend`, set V for that shell only:

   ```powershell
   $env:DATABRICKS_DESCRIPTIVE_FACT_VERSION = '<observed V>'
   node --import tsx scripts/publication-readiness.ts
   node --import tsx scripts/validate-descriptive.ts
   node --import tsx scripts/validate-catalog.ts
   ```

   Catalog validation requires V greater than19, exact hashes, identical schema,
   null-safe equality of every immutable field and exact per-label categories.
   Save matching warehouse/API/STL and authenticated dashboard/export receipts.
   A business release gate can remain pending after technical checks pass.

## Partial failure, recovery and activation

Each write is atomic; the group is not. After partial failure, dependency guards
prevent a blind rerun. Stop jobs, recover changed outputs with the rehearsed
procedure, restore bridges/code/references and verify the complete group.
RESTORE creates a new latest version; capture a new descriptor before retrying
even if restored data equals the original. Preserve original receipts.

Keep serving pin19 with matching STL, or show STL unavailable on identity mismatch.
Successful notebooks/tests and `PASS_CANDIDATE` do not record CEO acceptance.
Activate the new pin only after the applicable separately recorded version-bound
release acceptance in the canonical publication-readiness contract.
