# Staged classification package classification_e4e495787e4a23b5

Prepared 26 October 2026 for Adrian's finalized submission. Steps 1–4 authorize preparation/upload only. This notebook has NOT been executed and live dashboard data/master/serving pins have NOT changed.

The 29-column product_master_review.csv is a proposed candidate, not the active accepted master. Existing unrelated decisions and every noncategory metadata value are preserved; 1,133 previously absent exact aliases have unresolved physical specifications. All 5,694 exact keys have a reporting/evidence sidecar. Two labels have zero retained current activity. Known conflicts, guesses, low-confidence medicine cues and unsupported master enums retain explicit Unclassified. All original extended-family/confidence/evidence wording remains in classification_proposals.csv/json and the supplied Excel. Category-only proposals never approve SKU identity, sales units, item kind or models.

## Upload set (no execution)

Create a NEW Workspace directory `/Workspace/medshield/classification_releases/classification_e4e495787e4a23b5`. Upload every file in this local folder as an ordinary Workspace file, preserving filenames and bytes. Keep `validate_classification_preview.py` as the checksummed source file. In a separate later execution step, import a notebook copy under a different name; do not replace the checksummed file. Do not overwrite `/Workspace/medshield/medshield_reference_csv/product_master_review.csv` or any active notebook. The old fact19 script/package is historical and cannot prepare this corrected-source release.

Upload instructions use the current folder as a matched set. `manifest.json` records content hashes. A remote upload is complete only when file exports/readback agree with those hashes. Workspace API permission is separate from SQL access. Permission changes or new tokens are not part of this request.

## Next separate step, only when requested

After all files are uploaded, import a separate notebook copy of `validate_classification_preview.py` and open it. Set `package_directory` to `/Workspace/medshield/classification_releases/classification_e4e495787e4a23b5` and leave mode=`validate`. This verifies file checksums, corrected Delta0 schema/identity/key population, exclusions and eligible signed net. It performs zero table writes.

Only a separately requested `create_preview` run creates `workspace.medshield_gold_source_20261022.classification_e4e495787e4a23b5_review_preview`. It retains all 144 source fields unchanged and appends clearly prefixed review-only proposal columns. It does not rebuild old ingestion, promote classifications, rebuild model artifacts or activate serving. An identical retry validates the preview and makes zero writes; a different existing object fails. No replace/overwrite/drop/delete operation exists in the notebook. If preview verification fails, leave live source/serving untouched and retain evidence; do not activate it. Isolated recovery/warehouse execution is not claimed tested.

Actual effective category publication, downstream marts/STL, gateway compatibility and dashboard/export comparison require a later current-source acceptance/publication step. New proposals remain needs_review under the existing product_catalog.resolve contract; this package is not an accepted-category receipt or a ready operational forecast.

## Controls

Source `workspace.medshield_gold_source_20261022.truth_48a447f8fe9556d3_fact` VERSION AS OF 0; correction `truth_48a447f8fe9556d3`; 40,160 retained records and 911 excluded keys with zero overlap. Eligible signed net PHP637,922,399.53. Raw sum of net_sales is a different population and is preserved separately in capture metadata. No excluded contracts or synthetic replacement quantities were added. Full company totals remain incomplete. Fresh metadata capture is attached; earlier offline research/identity limits remain distinct from live verification.

Read-only upload API documentation: https://docs.databricks.com/api/workspace-files/v1/import and https://docs.databricks.com/api/workspace-files/v1/get-status . No credentials are packaged.
