# Product Grouping Review, 2017-2025

Source: `sales_restart_business_product_yearly_candidate` extracted 2026-09-17T12:30:47.669Z

All classifications are review candidates. No heuristic row is approved automatically.

| Product group | Raw product strings | Transactions | Net sales | Share |
|---|---:|---:|---:|---:|
| medical_device | 71 | 181 | 6,371,829.94 | 1.0% |
| medical_supply | 798 | 2,237 | 48,167,863.26 | 7.8% |
| medicine | 2,163 | 29,362 | 367,122,421.64 | 59.7% |
| non_medical | 360 | 700 | 12,528,649.66 | 2.0% |
| non_product | 339 | 349 | 116,917,873.20 | 19.0% |
| unresolved | 1,169 | 4,349 | 64,148,308.36 | 10.4% |

## Governance rules

- Contract aggregates and transaction references are excluded as product SKUs.
- Medical supplies and devices remain separate from pharmaceutical medicines.
- Non-medical business supplies remain reportable but are excluded from disease/weather medicine models.
- Unresolved products remain blocked until a product owner approves a category and canonical SKU.
- ABC is calculated on raw strings only and must be recalculated after approved alias consolidation.

## Product-master validation

- Existing product-master rows passed structural validation.
