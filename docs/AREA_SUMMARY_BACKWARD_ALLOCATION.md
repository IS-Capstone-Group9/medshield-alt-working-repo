# Area Summary Backward Allocation

## Purpose

Some sales rows use the product column to store an area, office, facility, or account label followed by `#` and an amount, for example:

- `PAGBILAO # 31,350.00`
- `QMC # 162,922.00`
- `PROVINCIAL TOURISM OFFICE # 306,000.00`

These rows cannot be treated as medicine SKUs. This transformation creates a separate analytical dataset where recognized area-summary rows are replaced by estimated product-level child rows without changing the dataset's additive totals.

The original sales dataset remains unchanged.

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

Product descriptions that legitimately use `#`, such as `SURGICAL BLADES #20`, are not classified as area summaries.

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

The transformation replaces each parent row rather than appending new revenue.

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

## Acceptance Criteria

- The source dataset is unchanged.
- Only controlled area-summary labels are transformed.
- Legitimate product numbers containing `#` are preserved.
- Every transformed parent has source-row lineage.
- Every estimated row is explicitly labeled.
- All additive-field reconciliation deltas are zero.
