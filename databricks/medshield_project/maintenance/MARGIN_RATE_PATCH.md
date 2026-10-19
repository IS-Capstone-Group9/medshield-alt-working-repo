# Positive matching-revenue margin correction — 20 October 2026

**Prepared, not executed in Databricks.** This is a derived-mart maintenance change. It does not approve data/models or rebuild the source fact. The current API already returns an unavailable margin rate for a nonpositive matching revenue basis.

## Observed impact

| Candidate mart | Captured Delta version | Rows | Rate cells needing NULL |
|---|---:|---:|---:|
| `sales_restart_product_yearly_candidate` |11|6,671|7|
| `sales_restart_business_product_yearly_candidate` |10|7,649|71|
| `sales_restart_area_yearly_candidate` |11|125|2|
| `sales_restart_territory_yearly_candidate` |10|41|1|

The 81 rate cells are at overlapping aggregate grains, not 81 bad transactions. Signed revenue, profit and matching basis amounts are valid and remain intact. Company monthly/yearly bases are positive; the checked overall totals and forecast targets are unaffected.

The local Gold helper now uses `margin_net_sales_basis > 0`, retaining four-decimal rate rounding. Future controlled Gold runs therefore follow the API's existing policy. This source change alone has not changed cloud tables. A full Gold rerun would also rebuild fact/marts and is unnecessary for this maintenance correction. The old category-publication contract is bound to predecessor 19 and must not be relabelled as a new 20-to-21 source deployment.

## Operator execution

1. Read the [review evidence](../../../outputs/warehouse_review_20261020/README.md) and [exact patch contract](../../../outputs/warehouse_review_20261020/margin-patch-contract.json). Arrange controlled maintenance and preserve recoverable table versions and current definitions. Confirm no competing table writer; this review could not inspect Jobs through its token.
2. Inspect `DESCRIBE HISTORY` for each target and require the versions above. Confirm the serving fact is still 20 on the recorded dataset/policy/mapping identities. If any identity/version differs, recapture/review the plan rather than changing a guard to make it pass.
3. Open [the versioned SQL](20261020_positive_margin_basis.sql). Run **every Phase 1 preflight first**. These compare exact rowsets with the captured versions and verify row counts, source identities and expected affected counts. All must pass before a write.
4. After actual operator authorization for this concrete maintenance change, execute the four Phase 2 updates. They set only `weighted_gross_margin_pct=NULL` where its matching revenue basis is nonpositive. The four Delta commits are separate; this is not one multi-table transaction.
5. Run all Phase 3 readback assertions immediately. They verify unchanged row counts, zero remaining nonpositive-basis rates, exact two-way equality of every other column against the captured versions, and equality to the intended corrected rowset. Capture query IDs, before/after versions and results.
6. Run the read-only gateway validator from `backend/`: `node --import tsx scripts/validate-databricks-dashboard.ts`. Refresh direct Databricks dashboards after readback. Keep fact 20, frozen targets, source approvals and model pointers unchanged. Record the actual applied state in Current State and the review evidence only after the cloud checks pass.

## Recovery

If a Phase 2/3 step fails, stop and inspect the actual committed versions. During the same maintenance window, an authorized operator can restore affected tables to captured versions 11/10/11/10 using Databricks' documented Delta restore process after confirming no competing writes. Preserve the failed receipts; do not rerun the historical Bronze/Silver/Gold publication sequence as recovery. Retained Delta files and suitable privileges must be confirmed before execution; this audit has not rehearsed a destructive recovery.

## Current verification

The patch generator binds source/release identities and observed counts in the contract. Read-only Phase 1 checks and SELECT-only before/after previews are recorded in the review packet. The preview evaluates the corrected Gold formula, counts changed rates and requires zero changes to positive-basis rates. Local tests execute the actual Gold expression on hand-calculated positive, zero, negative and missing bases. These are preparation evidence; no live UPDATE/RESTORE or post-write verification is claimed.
