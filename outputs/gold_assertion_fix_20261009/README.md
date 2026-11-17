# Gold Cell 3 assertion correction — 9 October 2026

The traceback at Cell 3 line133 identifies the final provisional-demand guard.
The category-only publication preserves the predecessor demand flags, but the
old guard still required the new reporting scope to be PRODUCT_MASTER_PENDING.
Accepted MEDICINE_APPROVED, SUPPLY/EQUIPMENT/NONMEDICAL scopes and
UNCLASSIFIED_APPROVED therefore failed despite unchanged quantities.

## Correction

Gold now selects the bound predecessor for this original-scope safety check when
category_decisions is not None. Ordinary/draft runs continue checking current
fact scope. Low trust, historical backfill and nonpositive-quantity guards remain.
All 137 immutable fields are still compared in both directions before the guard;
accepted current reporting categories remain checked against their exact receipt.
No quantity or eligibility flag is cleared, and no assertion is deleted.
Bare assertions now carry useful messages. No write was added before Cell 7.

Updated complete notebook: [03_sales_gold.py](../../databricks/medshield_project/03_sales_gold.py).
Copyable entire replacement Cell 3: [cell3_corrected.py](cell3_corrected.py).
Original Gold code and prior publication descriptor are archived in this folder.

## Refreshed contract required

The read-only check confirmed fact19 and 37,728 records, including 32,495
provisional records with zero invalid predecessor eligibility. All these scopes
would be rejected by the old current-scope assertion after category acceptance.
Three dependencies advanced after the previous package: replacement-year
validation3→4, assessed Silver7→8 and clean Silver9→10.

The [fresh read-only capture](../../outputs/catalog_preparation/2026-10-09T03-03-37-411Z/predecessor-receipt.json) proves all
55 current Silver source fields equal fact19, with 37,728 unique source records,
29 stable captured dependencies and two bridge definitions. The new descriptor
records those versions. This is a metadata rebind of identical source data,
not permission to admit changed records or weaken immutability.

Upload the updated [catalog_publication.json](../../databricks/medshield_project/references/catalog_publication.json)
alongside corrected Gold. The product CSV, category receipt, catalog helper,
transaction evidence and area mapping bytes are unchanged. Earlier ZIPs do not
contain this correction/current dependency binding.

## Verification and next action

The regression executes the actual notebook assertion with a small frame adapter;
it is not full Spark integration. Before the fix, five accepted reporting-scope
fixtures failed. After the fix, the full **82-test suite passed**. Separate QA
also checked divergent predecessor/current scopes, unchanged false eligibility,
strict ordinary/draft behavior and unsafe low-trust/backfill/nonpositive inputs.
README exactly matches all notebook cells; the replacement Cell 3 parses.
See [verification.json](verification.json) and [cloud diagnosis](cloud-diagnosis.json).

1. Upload corrected Gold (or replace its complete Cell 3) and the refreshed
   publication descriptor at the existing workspace paths.
2. Rerun Gold Cells1–3 so the new descriptor is loaded and the corrected guard
   is verified. Stop if any assertion fails; do not remove checks.
3. Complete remaining Gold cells and 04→05→06 only under the existing operator
   version/hash/maintenance/recovery prerequisites. Recovery rehearsal is still
   unverified. Keep serving pin19 until exact new-release validation and acceptance.

No cloud table write, notebook execution or release activation was performed by
this investigation. Captured fact/source/dependency identity is read-only evidence.
Accountable role: Database Engineer; supporting QA reviewed the fix. Repository
database and analytics guidance kept category acceptance separate from demand;
coding/testing guidance required reproduction and preserved failure checks.
