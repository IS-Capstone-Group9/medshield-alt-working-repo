# Medical vs Non-Medical Candidate Cost, 2021-2025

Source: `data/medshield/processed/sales_transactions_area_allocated.json.gz`
Non-medical candidate list: `outputs/product_classification_review/likely_non_medical_product_candidates.csv`

Classification note: `medical_or_unclassified_candidate` means every accepted sales row not matched by the keyword-based non-medical review list. It still needs product-master approval before it is treated as final medical-only demand.

| Group | Rows | Distinct products | Total cost | Net cost | Total trade price |
|---|---:|---:|---:|---:|---:|
| non_medical_candidate | 1,653 | 330 | 70,681,888.97 | 70,681,888.97 | 41,144,527.85 |
| medical_or_unclassified_candidate | 19,308 | 3,005 | 359,451,346.98 | 357,022,510.85 | 179,813,741.95 |
| overall | 20,961 | 3,335 | 430,133,235.95 | 427,704,399.82 | 220,958,269.80 |

## Yearly Breakdown

| Group | Year | Rows | Total cost | Net cost | Total trade price |
|---|---:|---:|---:|---:|---:|
| non_medical_candidate | 2021 | 36 | 3,733,456.43 | 3,733,456.43 | 1,512,453.97 |
| non_medical_candidate | 2022 | 82 | 2,030,793.14 | 2,030,793.14 | 871,035.88 |
| non_medical_candidate | 2023 | 404 | 1,878,092.00 | 1,878,092.00 | 1,138,500.59 |
| non_medical_candidate | 2024 | 550 | 16,881,818.68 | 16,881,818.68 | 14,105,770.42 |
| non_medical_candidate | 2025 | 581 | 46,157,728.72 | 46,157,728.72 | 23,516,766.99 |
| medical_or_unclassified_candidate | 2021 | 3,376 | 75,256,558.63 | 74,706,364.41 | 26,109,073.50 |
| medical_or_unclassified_candidate | 2022 | 3,917 | 62,118,258.94 | 61,513,096.74 | 20,451,913.25 |
| medical_or_unclassified_candidate | 2023 | 4,919 | 60,089,162.17 | 59,538,407.43 | 45,608,111.86 |
| medical_or_unclassified_candidate | 2024 | 2,778 | 33,883,368.97 | 33,541,087.20 | 16,400,780.08 |
| medical_or_unclassified_candidate | 2025 | 4,318 | 128,103,998.27 | 127,723,555.07 | 71,243,863.26 |
| overall | 2021 | 3,412 | 78,990,015.06 | 78,439,820.84 | 27,621,527.47 |
| overall | 2022 | 3,999 | 64,149,052.08 | 63,543,889.88 | 21,322,949.13 |
| overall | 2023 | 5,323 | 61,967,254.17 | 61,416,499.43 | 46,746,612.45 |
| overall | 2024 | 3,328 | 50,765,187.65 | 50,422,905.88 | 30,506,550.50 |
| overall | 2025 | 4,899 | 174,261,726.99 | 173,881,283.79 | 94,760,630.25 |