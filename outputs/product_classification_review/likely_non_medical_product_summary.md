# Likely Non-Medical Product Candidate Summary

Source: `data/medshield/processed/sales_transactions_area_allocated.json.gz`

- Distinct likely non-medical product strings: 330
- Sales rows matched: 1,653
- Candidate total trade price: 41,144,527.85

These are keyword-based candidates for review, not approved product master classifications.

| Proposed category | Product strings | Rows | Total trade price |
|---|---:|---:|---:|
| office_stationery | 167 | 936 | 23,065,453.49 |
| printer_it_supplies | 35 | 285 | 7,108,278.09 |
| clothing_personal | 12 | 106 | 4,345,146.54 |
| janitorial_cleaning | 49 | 179 | 3,505,449.01 |
| equipment_appliance | 22 | 56 | 2,575,828.71 |
| electrical_hardware | 28 | 68 | 409,389.56 |
| food_admin_other | 17 | 23 | 134,982.45 |

Recommended next step: review the CSV, approve true non-medical items in `datasources/templates/product_master_mapping.csv`, and set `is_medicine=false` plus `forecast_eligible=false` for excluded items.