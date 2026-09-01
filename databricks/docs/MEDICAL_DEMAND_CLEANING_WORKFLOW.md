# Medical Demand Cleaning Workflow

## Purpose

MedShield's capstone focus is disease/weather-aware demand planning for medical or pharmaceutical products. The raw sales data, however, contains mixed business sales such as medicines, medical supplies, office supplies, equipment, IT supplies, cleaning supplies, and contract-name rows.

This workflow explains how the system should separate full business sales from the medical-only analytical dataset used for disease/weather forecasting.

## Key Decision

Do not create a totally separate system unless the cleaning work becomes large enough to operate independently.

Use a separate cleaning stage or service boundary inside the MedShield data pipeline:

```text
Raw sales CSV/XLSX
  -> standardize columns and validate rows
  -> detect contract-name rows
  -> run backward approximation where approved
  -> classify product as medicine, medical supply, or non-medical
  -> publish two datasets:
       1. full sales dataset for business reporting
       2. medical-demand dataset for disease/weather forecasting
```

This keeps one source of truth while preventing non-medical items from contaminating the disease/weather model.

## Why Non-Medical Candidates Exist

The sales workbook is not purely pharmaceutical demand. It contains products such as:

- office supplies
- printer and IT supplies
- cleaning and janitorial supplies
- equipment and appliances
- electrical and hardware items
- clothing or administrative items

These are valid business sales, but they are not valid inputs for pharmaceutical disease/weather demand modeling unless the group explicitly creates a separate business-supplies model.

## Dataset Separation

| Dataset | Includes | Excludes | Use |
|---|---|---|---|
| Full sales dataset | All accepted sales rows, including medicines, supplies, equipment, and non-medical products. | Rejected rows only. | Business dashboard, revenue reports, reconciliation. |
| Medical-demand dataset | Approved medicine and approved medical-supply rows. | Office/admin/equipment/IT/cleaning/personal items. | Disease/weather forecasting, product demand planning, pharmaceutical model evaluation. |
| Non-medical exclusion dataset | Rows classified as non-medical. | Medicine and approved medical supplies. | Audit, business reporting, reviewer approval. |
| Contract allocation audit | Parent contract rows and estimated child rows. | None; this is a traceability file. | Explains backward approximation and limitations. |

## Product Classification Rules

| Product type | `is_medicine` | `forecast_eligible` | Disease/weather model use |
|---|---:|---:|---|
| Medicine / pharmaceutical SKU | `true` | `true` after SKU approval | Include. |
| Medical supply / clinical consumable | Usually `false` or separate flag | Include only if capstone scope approves it | Conditional include. |
| Office supply | `false` | `false` | Exclude. |
| Equipment / appliance | `false` | `false` | Exclude from disease/weather demand. |
| Cleaning / janitorial supply | `false` | `false` | Exclude unless approved as clinical infection-control supply. |
| IT / printer supply | `false` | `false` | Exclude. |
| Contract-name parent row | Not a product | `false` | Must be allocated or excluded before product modeling. |

## Backward Approximation Order

Run backward approximation before final medical filtering.

Reason: some contract-name rows may contain a mixed product profile. The system first estimates child product rows, then classifies each child product.

```text
Contract parent row
  -> estimated child product rows
  -> product classification
  -> medical child rows go to medical-demand dataset
  -> non-medical child rows go to exclusion dataset
```

The full adjusted dataset should still reconcile to the source totals. The medical-only dataset will not reconcile to full business sales, because non-medical rows are intentionally removed.

## How The System Should Handle The Split

1. Keep raw uploads unchanged.
2. Keep the full cleaned sales dataset for source reconciliation.
3. Keep backward-allocated rows with explicit estimation fields.
4. Maintain a product master with `product_category`, `is_medicine`, `forecast_eligible`, and `mapping_status`.
5. Generate a medical-only analytical dataset after product classification.
6. Use only the medical-only dataset for disease/weather forecasting.
7. Keep excluded non-medical rows in an audit output so the panel can see they were removed intentionally.

## Recommended Output Files

| Output | Purpose |
|---|---|
| `sales_transactions_cleaned_full.*` | Full accepted business sales. |
| `sales_transactions_area_allocated.*` | Full accepted sales after approved backward approximation. |
| `sales_transactions_medical_demand.*` | Medicine/approved medical-supply rows for disease/weather forecasting. |
| `sales_transactions_non_medical_excluded.*` | Excluded business-supply rows for audit. |
| `product_classification_review.csv` | Review queue for product master approval. |
| `medical_demand_cleaning_report.json` | Counts, costs, exclusions, and reconciliation notes. |

## Dashboard Handling

| Dashboard area | Dataset |
|---|---|
| Overall business KPIs | Full sales dataset. |
| Product revenue reporting | Full sales dataset with category filter. |
| Disease/weather forecast | Medical-demand dataset only. |
| Model evaluation | Medical-demand dataset only. |
| Cleaning audit | Full, medical-only, and excluded-row summaries. |

## Capstone Wording

Use this wording:

> Because the sales workbook contained both medical and non-medical business items, the system separated the cleaned sales data into a full business-sales dataset and a medical-demand analytical dataset. Full sales were retained for reconciliation and business reporting, while disease/weather forecasting used only products reviewed as medicine or approved medical supplies. Non-medical items were excluded from pharmaceutical demand modeling but preserved in an audit dataset.

## Acceptance Criteria

1. Full sales totals reconcile to the original cleaned accepted rows.
2. Backward approximation totals reconcile before filtering.
3. Every product has a reviewable category or is listed as unmapped.
4. Non-medical items are excluded from disease/weather forecasting.
5. Medical-demand totals are reported separately from full business-sales totals.
6. Exclusion counts and costs are documented for panel review.
7. The model does not claim non-medical business supplies are disease-driven pharmaceutical demand.
