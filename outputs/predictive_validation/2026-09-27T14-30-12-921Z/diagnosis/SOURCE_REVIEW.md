# Source reconciliation follow-up

## Verified in the pinned assessment

Composition extraction from fact version 16 reconciled every month to the frozen input counts and eligible net-sales revenue. The source-workbook labels for the largest audit changes are `medshield_data_2024.csv` and `medshield_data_2025.csv`. Both are classified as adjusted estimated product-allocation sources. The existing composition hash and frozen input identify the exact assessed population.

| Comparison with December 2024 | Company revenue change PHP | GOVERNMENT-labelled change PHP | Unresolved source check |
|---|---:|---:|---|
| March 2025 | -14,132,675.41 | -13,926,770.45 | Reconcile booked/delivery dates, large orders and any source corrections |
| April 2025 | -11,074,216.64 | -13,773,584.75 | Explain government decline and offsetting hospital increase |
| November 2025 | +8,331,038.69 | +7,313,039.54 | Reconcile large orders and allocation preparation |

These differences are accounting contributions, not causal explanations. No records were removed, relabelled or shifted between months.

## Additional repository evidence inspected

`outputs/2020_2024_databricks_final/reconciliation.json` describes `one_to_one_same_year_same_area_nearest_financial_profile` replacement. For its 2024 file it records 124 replaced rows with preserved financial totals. Its net-CP total is ₱58,731,059.63, whereas the pinned assessment's eligible 2024 net-sales total is ₱50,259,319.88. This record has source/output checksums but has not been reconciled through the current eligibility/transformation policy to fact version 16. Therefore it cannot certify current monthly correctness or be treated as evidence of an error in the pinned totals.

`outputs/data_readiness_profile/sales_data_readiness_summary.json` profiles a different processed population of 20,418 rows with rejected/missing-date records and a different 2025 coverage profile. It is historical evidence, not a replacement for the current user-attested receipt. Applying its exclusions to the current dataset would require an explicit lineage reconciliation.

`docs/SALES_DATA_PIPELINE_SPECIFICATION.md` defines a proposed future source contract with transaction/line identifiers, transaction dates and original customer/product identities. This specification is not evidence that such records are available for the assessed observations.

## Remaining dependency

Source-owner review must bind original invoice/order records and source preparation rules to the pinned source checksums, then reconcile eligible monthly totals and the GOVERNMENT label. Current aggregate and historical reconciliation artifacts do not establish invoice timing, source completeness independently, or true SKU demand. The monthly-refresh experiment can proceed on the accepted company-revenue population, but a causal or segment-demand model cannot be justified from this review alone.
