# Product Master and SKU Alias Mapping Plan

## Purpose

The current dataset contains thousands of product strings. Many are likely variants of the same sellable product, for example spacing, punctuation, dosage suffixes, and tablet/capsule wording. Forecasting, ABC classification, XGBoost features, EOQ, allocation, and product-region matching all need a canonical SKU before they can be trusted.

## Current Observations

The processed file currently contains 3,722 distinct product strings. Examples that should be reviewed for alias mapping include:

| Raw product example A | Raw product example B | Mapping question |
|---|---|---|
| `DOLO JAGA 500MG/50MG/100MG/100MCG` | `DOLO-JAGA 500MG/50MG/100MG/100MCG` | Same SKU? |
| `HYCLENS WOUND SPRAY (60ML)` | `HYCLENS WOUND SPRAY 2% 60ML` | Same SKU or different strength? |
| `LACTAMOX 500MG/125MG TAB` | `LACTAMOX 500MG/125MG` | Same SKU? |
| `JAGA 300MG/100MG/100MCG` | `JAGA 300MG/100MG/100MCG CAP` | Same SKU? |
| `SANOMAX - FA` | `SANOMAX-FA` | Same SKU? |

## Required Master Fields

The product master should use these minimum columns:

| Field | Meaning |
|---|---|
| `raw_product` | Exact product string from source data. |
| `canonical_sku` | Approved canonical SKU label. |
| `brand_name` | Brand or product family. |
| `generic_name` | Generic molecule or category if known. |
| `strength` | Strength or concentration. |
| `dosage_form` | Tablet, capsule, IV, spray, supply, equipment, etc. |
| `pack_size` | Pack size or unit if known. |
| `product_category` | Therapeutic, emergency, supply, equipment, admin, or other category. |
| `is_medicine` | `true` when medicine/pharmaceutical product. |
| `forecast_eligible` | `true` when allowed in product-level forecasting. |
| `mapping_status` | Proposed, approved, rejected, or needs review. |
| `review_notes` | Free-text explanation. |

## Mapping Rules

1. Do not merge products only because names are similar.
2. Strength, dosage form, and pack size must match before aliases are merged.
3. If strength or pack size is unclear, keep separate SKUs until reviewed.
4. Supplies, equipment, admin, personal, and loss rows should be classified separately from pharmaceutical demand.
5. A canonical SKU should be stable across all years.
6. Forecasting should use only approved canonical SKUs.

## Implementation Path

1. Generate a distinct raw product list with counts, revenue, quantity, and first/last sale dates.
2. Apply text normalization to suggest candidate aliases.
3. Review high-revenue and high-frequency products first.
4. Save approved mappings in `datasources/templates/product_master_mapping.csv` until a database master table is added.
5. Use unmapped products as an exception report.
6. Block SKU-level model training for products without approved mapping.

Run this utility to generate a first-pass alias candidate file:

```bash
node tools/profile_data_readiness.mjs
```

Review `outputs/data_readiness_profile/product_alias_candidates.csv`, then move approved mappings into `datasources/templates/product_master_mapping.csv`.

## Acceptance Criteria

The first product master is usable when:

1. All A-class products have approved canonical SKU mappings.
2. At least 95% of sales revenue maps to approved canonical SKUs.
3. Unmapped products are listed with counts and revenue impact.
4. Forecast-eligible products are explicitly flagged.
5. Non-medicine and non-sales products are not mixed into pharmaceutical SKU forecasts.
