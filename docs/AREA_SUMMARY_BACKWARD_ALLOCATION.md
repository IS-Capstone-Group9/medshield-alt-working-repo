# Contract Name / Area Summary Backward Allocation

## Purpose

Some sales rows use the product column to store a contract, area, office, facility, or account label followed by `#` and an amount, for example:

- `PAGBILAO # 31,350.00`
- `QMC # 162,922.00`
- `PROVINCIAL TOURISM OFFICE # 306,000.00`

These rows cannot be treated as medicine SKUs. This transformation creates a separate analytical dataset where recognized area-summary rows are replaced by estimated product-level child rows without changing the dataset's additive totals.

The original sales dataset remains unchanged. The adjusted dataset is a separate analytical copy.

## Recognized Labels

The current controlled list is:

- Aboitiz
- Gulang Gulang
- Marinduque
- Padre Burgos
- Pagbilao
- PESO
- PESO Provincial
- PHO
- PPDC
- PPOC
- Provincial Tourism Office
- QMC
- Tourism

Product descriptions that legitimately use `#`, such as `SURGICAL BLADES #20`, `INK #003`, or `STAPLE WIRE #35`, are not classified as contract summaries.

## Allocation Method

For every recognized area-summary row:

1. Preserve the original row and lineage in the audit output.
2. Search only earlier comparable transactions.
3. Prefer transactions with the same original area and DR channel within the previous three years.
4. Fall back to the same area, same channel, or all prior history only when the preferred profile is insufficient.
5. Build a product profile using a blend of historical value, frequency, and recency.
6. Deterministically select five products from the strongest 30 historical candidates.
7. Divide the parent row into five estimated child rows using the selected product weights.
8. Assign the embedded `#` amount to the child rows for audit purposes only.

The method never uses a later transaction to estimate an earlier dated transaction. Rows with invalid or missing dates use only earlier source years.

## Total Preservation

The transformation replaces each parent row in the adjusted analytical dataset rather than appending new revenue. This increases row detail without increasing totals. The source dataset remains available with the original parent contract rows.

The following fields are divided across the estimated child rows:

- Quantity
- Total cost
- Discount
- Net cost
- Total trade price
- Net income

Remainders are assigned deterministically. The sum of the child rows must equal the parent row at the stored precision. Consequently, the totals of the complete adjusted dataset must equal the totals of the complete source dataset.

`unit_cost`, `trade_price_unit`, and `margin_pct` are recalculated from the allocated additive fields because rates and percentages must not be summed.

## Output Fields

Estimated child rows include:

- `allocation_status`
- `allocation_confidence`
- `allocation_method`
- `allocation_profile_level`
- `allocation_profile_rows`
- `allocation_profile_products`
- `allocation_weight`
- `allocation_child_number`
- `allocation_child_count`
- `original_area`
- `original_product`
- `embedded_area_amount`
- `allocated_embedded_area_amount`
- `parent_source_hash`
- `parent_business_hash`
- `estimated`

## Analytical Use

Use the adjusted dataset only for exploratory product-mix, area, and forecasting analysis where an approximation is preferable to treating an area label as a product.

Do not present estimated child products as recovered invoice details. Dashboards and model outputs must label them as estimated. Where actual delivery receipts, purchase orders, or invoice line items become available, replace the estimates with the verified product records.

## Execution

Run:

```powershell
node tools/backward_allocate_area_rows.mjs
```

The script produces:

- `data/medshield/processed/sales_transactions_area_allocated.json.gz`
- `data/medshield/processed/sales_area_allocation_audit.json`

The 2026-06-23 run also exported review files:

- `outputs/contract_backward_allocation_20260623/parent_contract_rows_allocated.csv`
- `outputs/contract_backward_allocation_20260623/estimated_child_rows.csv`
- `outputs/contract_backward_allocation_20260623/allocation_summary_by_contract_prefix.csv`
- `outputs/contract_backward_allocation_20260623/reconciliation.json`

## 2026-06-23 Execution Result

| Measure | Value |
|---|---:|
| Original row count | 20,418 |
| Contract / area-summary parent rows replaced | 346 |
| Estimated child rows created | 1,730 |
| Adjusted row count | 21,802 |

The run preserved all additive totals:

| Field | Original | Adjusted | Delta |
|---|---:|---:|---:|
| Quantity | 1,076,005.56 | 1,076,005.56 | 0 |
| Total cost | 926,774,318.12 | 926,774,318.12 | 0 |
| Discount | 4,307,478.04 | 4,307,478.04 | 0 |
| Net cost | 921,917,689.86 | 921,917,689.86 | 0 |
| Total trade price | 424,337,912.08 | 424,337,912.08 | 0 |
| Gross margin/profit (`net_income`) | 550,600,746.46 | 550,600,746.46 | 0 |

Estimated child rows by contract prefix:

| Contract prefix | Estimated child rows | Total trade price | Net cost | Gross margin/profit |
|---|---:|---:|---:|---:|
| Pagbilao | 1,230 | 51,826,339.93 | 84,730,621.16 | 39,708,600.23 |
| QMC | 255 | 7,530,374.88 | 12,052,056.60 | 4,749,955.72 |
| PESO | 15 | 2,317,160.16 | 3,521,520.00 | 1,204,359.84 |
| Tourism | 55 | 921,686.79 | 1,416,676.00 | 494,989.21 |
| Provincial Tourism Office | 25 | 855,305.26 | 836,410.00 | 373,249.74 |
| Marinduque | 20 | 823,692.80 | 1,245,007.00 | 421,314.20 |
| PESO Provincial | 15 | 710,699.22 | 1,070,570.00 | 359,870.78 |
| PPDC | 70 | 614,539.86 | 986,429.75 | 371,889.89 |
| PHO | 15 | 109,077.31 | 166,788.00 | 57,710.69 |
| Gulang Gulang | 15 | 80,151.00 | 118,855.00 | 38,704.00 |
| PPOC | 5 | 64,000.00 | 116,500.00 | 52,500.00 |
| Padre Burgos | 5 | 50,889.00 | 74,380.00 | 23,491.00 |
| Aboitiz | 5 | 44,400.00 | 68,307.69 | 23,907.69 |

## Recommended Use

Use `sales_transactions_area_allocated.json.gz` for product-mix exploration, product-level forecasting experiments, and ABC/Pareto analysis when contract-name rows would otherwise distort product names.

Use `sales_transactions.json.gz` when the analysis must show the original source records exactly as received.

Do not treat estimated child rows as recovered invoice details. They are deterministic planning estimates and are explicitly marked with `allocation_status = estimated_backward_allocation`.

## Acceptance Criteria

- The source dataset is unchanged.
- Only controlled area-summary labels are transformed.
- Legitimate product numbers containing `#` are preserved.
- Every transformed parent has source-row lineage.
- Every estimated row is explicitly labeled.
- All additive-field reconciliation deltas are zero.
