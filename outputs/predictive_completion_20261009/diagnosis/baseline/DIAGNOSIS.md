# Frozen forecast error diagnosis

Run: `11648be69f44f87d746b45904acc01a4790bf24d348940941940f01caab7997c`. Selected method: `last_value`.

No training, reselection, data correction or publication occurred in this diagnosis.
Development folds overlap: 60 origin/target/lead observations are not 60 independent months.
Audit is retrospective. Completeness is user-attested, not independently verified.

## development

| Lead band | N | WAPE | MAE PHP | Normalized bias |
|---|---:|---:|---:|---:|
| 1–3 | 15 | 83.52% | 3,758,213.33 | -16.41% |
| 4–6 | 15 | 96.93% | 3,631,523.28 | +0.40% |
| 7–12 | 30 | 75.20% | 2,486,073.57 | +13.77% |

| Origin | N | WAPE | Signed bias PHP |
|---|---:|---:|---:|
| 2022-12 | 12 | 66.30% | -1,560,282.63 |
| 2023-03 | 12 | 55.47% | -1,281,050.82 |
| 2023-06 | 12 | 150.42% | +4,145,287.74 |
| 2023-09 | 12 | 90.86% | +2,222,444.69 |
| 2023-12 | 12 | 78.61% | -3,292,526.16 |

Three worst origin/target observations account for 21.0% of absolute error.

| Origin | Target | Lead | Actual PHP | Prediction PHP | Signed error PHP | Error share |
|---|---|---:|---:|---:|---:|---:|
| 2023-12 | 2024-12 | 12 | 16,744,970.51 | 895,750.50 | -15,849,220.01 | 8.5% |
| 2023-03 | 2023-05 | 2 | 14,537,368.30 | 2,344,746.44 | -12,192,621.86 | 6.6% |
| 2022-12 | 2023-05 | 5 | 14,537,368.30 | 3,625,464.61 | -10,911,903.69 | 5.9% |
| 2022-12 | 2023-02 | 2 | 13,794,078.18 | 3,625,464.61 | -10,168,613.57 | 5.5% |
| 2023-12 | 2024-06 | 6 | 6,998,941.66 | 895,750.50 | -6,103,191.16 | 3.3% |
| 2023-06 | 2023-12 | 6 | 895,750.50 | 6,910,935.23 | +6,015,184.73 | 3.2% |
| 2023-06 | 2024-02 | 8 | 1,079,764.41 | 6,910,935.23 | +5,831,170.82 | 3.1% |
| 2023-06 | 2023-11 | 5 | 1,975,407.65 | 6,910,935.23 | +4,935,527.58 | 2.7% |
## retrospective_audit

| Lead band | N | WAPE | MAE PHP | Normalized bias |
|---|---:|---:|---:|---:|
| 1–3 | 3 | 55.07% | 5,946,519.14 | +55.07% |
| 4–6 | 3 | 41.77% | 5,844,326.82 | +19.67% |
| 7–12 | 6 | 31.20% | 5,773,343.02 | -9.51% |

| Origin | N | WAPE | Signed bias PHP |
|---|---:|---:|---:|
| 2024-12 | 12 | 37.76% | +1,295,235.42 |

Three worst origin/target observations account for 47.9% of absolute error.

| Origin | Target | Lead | Actual PHP | Prediction PHP | Signed error PHP | Error share |
|---|---|---:|---:|---:|---:|---:|
| 2024-12 | 2025-03 | 3 | 2,612,295.10 | 16,744,970.51 | +14,132,675.41 | 20.2% |
| 2024-12 | 2025-04 | 4 | 5,670,753.87 | 16,744,970.51 | +11,074,216.64 | 15.8% |
| 2024-12 | 2025-11 | 11 | 25,076,009.20 | 16,744,970.51 | -8,331,038.69 | 11.9% |
| 2024-12 | 2025-08 | 8 | 8,934,135.31 | 16,744,970.51 | +7,810,835.20 | 11.2% |
| 2024-12 | 2025-12 | 12 | 23,493,882.59 | 16,744,970.51 | -6,748,912.08 | 9.6% |
| 2024-12 | 2025-05 | 5 | 21,382,925.25 | 16,744,970.51 | -4,637,954.74 | 6.6% |
| 2024-12 | 2025-10 | 10 | 12,512,678.31 | 16,744,970.51 | +4,232,292.20 | 6.0% |
| 2024-12 | 2025-09 | 9 | 20,654,027.17 | 16,744,970.51 | -3,909,056.66 | 5.6% |

## Annual recorded revenue by source provenance

| Year | Provenance | Revenue PHP |
|---|---|---:|
| 2017 | ORIGINAL_SOURCE_EXPORT | 10,211,167.35 |
| 2018 | ORIGINAL_SOURCE_EXPORT | 51,619,691.27 |
| 2019 | ORIGINAL_SOURCE_EXPORT | 62,542,304.49 |
| 2020 | ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE | 63,593,274.63 |
| 2021 | ORIGINAL_SOURCE_EXPORT | 77,860,206.26 |
| 2022 | ORIGINAL_SOURCE_EXPORT | 63,234,990.04 |
| 2023 | ORIGINAL_SOURCE_EXPORT | 62,228,966.85 |
| 2024 | ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE | 50,259,319.88 |
| 2025 | ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE | 185,396,821.04 |

## Recorded sales composition at the largest misses

For last-value, target minus origin revenue is exactly the negative forecast error.
These decompositions explain accounting contributions, not causal business drivers.
Raw area/product labels are not approved customer/SKU identities. Provenance categories are source attribution, not independent verification.

### development: 2023-12 → 2024-12

**source_workbook** — signed revenue change (PHP):

- medshield_data_2024.csv: +16,744,970.51
- medshield_data_2023.csv: -895,750.50
- Remaining labels combined: +0.00

**source_provenance** — signed revenue change (PHP):

- ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE: +16,744,970.51
- ORIGINAL_SOURCE_EXPORT: -895,750.50
- Remaining labels combined: +0.00

**raw_area** — signed revenue change (PHP):

- GOVERNMENT: +14,809,093.75
- HOSPITAL: +1,133,695.00
- ADMIN: +235,307.26
- BATANGAS: -125,506.50
- QUEZON: -107,647.50
- Remaining labels combined: -95,722.00

**raw_product** — signed revenue change (PHP):

- SPEEDA 2.5IU/0.5ML: +12,018,490.30
- MONOWEL 1G IV: +743,360.00
- EQUIRAB 200IU/ML (1000IU/5ML) 5ML: +688,500.00
- IV CANNULA WITH WINGS LUER LOCK G18 1.5X38MM (CATHULA): +406,119.80
- IV CANNULA WITH INJECTION PORT LUER LOCK G24 0.7X19MM (CATHULA): +218,948.00
- Remaining labels combined: +1,773,801.91

### development: 2023-03 → 2023-05

**source_workbook** — signed revenue change (PHP):

- medshield_data_2023.csv: +12,192,621.86
- Remaining labels combined: +0.00

**source_provenance** — signed revenue change (PHP):

- ORIGINAL_SOURCE_EXPORT: +12,192,621.86
- Remaining labels combined: +0.00

**raw_area** — signed revenue change (PHP):

- GOVERNMENT: +11,854,111.18
- HOSPITAL: +264,560.50
- QUEZON: +141,564.30
- MARINDUQUE: -96,585.00
- SUPPLIES: -51,545.00
- Remaining labels combined: +80,515.88

**raw_product** — signed revenue change (PHP):

- PROHAB 10MG/ML 20ML: +2,110,000.00
- BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML: +1,865,000.00
- DOCOR 250MG VIAL: +875,000.00
- DOPABAS 40MG/ML: +630,000.00
- AIRCONDITION SPLIT TYPE INVERTER 2HP (CARRIER): +598,500.00
- Remaining labels combined: +6,114,121.86

### development: 2022-12 → 2023-05

**source_workbook** — signed revenue change (PHP):

- medshield_data_2023.csv: +14,537,368.30
- medshield_data_2022.csv: -3,625,464.61
- Remaining labels combined: +0.00

**source_provenance** — signed revenue change (PHP):

- ORIGINAL_SOURCE_EXPORT: +10,911,903.69
- Remaining labels combined: +0.00

**raw_area** — signed revenue change (PHP):

- GOVERNMENT: +11,049,463.50
- QUEZON: +295,243.30
- ADMIN: -184,485.61
- CAM SUR: -172,264.00
- CAM NORTE: -96,784.00
- Remaining labels combined: +20,730.50

**raw_product** — signed revenue change (PHP):

- PROHAB 10MG/ML 20ML: +2,110,000.00
- BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML: +1,865,000.00
- DOCOR 250MG VIAL: +816,800.00
- DOPABAS 40MG/ML: +630,000.00
- AIRCONDITION SPLIT TYPE INVERTER 2HP (CARRIER): +598,500.00
- Remaining labels combined: +4,891,603.69

### retrospective_audit: 2024-12 → 2025-03

**source_workbook** — signed revenue change (PHP):

- medshield_data_2024.csv: -16,744,970.51
- medshield_data_2025.csv: +2,612,295.10
- Remaining labels combined: +0.00

**source_provenance** — signed revenue change (PHP):

- ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE: -14,132,675.41
- Remaining labels combined: +0.00

**raw_area** — signed revenue change (PHP):

- GOVERNMENT: -13,926,770.45
- HOSPITAL: -268,871.80
- BATANGAS: +119,646.50
- ADMIN: -65,815.77
- MARINDUQUE: +13,132.00
- Remaining labels combined: -3,995.89

**raw_product** — signed revenue change (PHP):

- SPEEDA 2.5IU/0.5ML: -12,018,490.30
- MONOWEL 1G IV: -743,360.00
- EQUIRAB 200IU/ML (1000IU/5ML) 5ML: -688,500.00
- MORNEM 500MG: +377,208.62
- IV CANNULA WITH WINGS LUER LOCK G18 1.5X38MM (CATHULA): -365,559.80
- Remaining labels combined: -693,973.93

### retrospective_audit: 2024-12 → 2025-04

**source_workbook** — signed revenue change (PHP):

- medshield_data_2024.csv: -16,744,970.51
- medshield_data_2025.csv: +5,670,753.87
- Remaining labels combined: +0.00

**source_provenance** — signed revenue change (PHP):

- ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE: -11,074,216.64
- Remaining labels combined: +0.00

**raw_area** — signed revenue change (PHP):

- GOVERNMENT: -13,773,584.75
- HOSPITAL: +2,669,674.40
- BATANGAS: +142,893.40
- ADMIN: -129,602.19
- QUEZON: +11,446.50
- Remaining labels combined: +4,956.00

**raw_product** — signed revenue change (PHP):

- SPEEDA 2.5IU/0.5ML: -11,078,548.00
- TROYNOXA-60 60MG/0.6ML: +1,042,250.00
- MONOWEL 1G IV: -743,360.00
- ENDOPROST 250MCG/ML: +742,500.00
- EQUIRAB 200IU/ML (1000IU/5ML) 5ML: -688,500.00
- Remaining labels combined: -348,558.64

### retrospective_audit: 2024-12 → 2025-11

**source_workbook** — signed revenue change (PHP):

- medshield_data_2025.csv: +25,076,009.20
- medshield_data_2024.csv: -16,744,970.51
- Remaining labels combined: +0.00

**source_provenance** — signed revenue change (PHP):

- ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE: +8,331,038.69
- Remaining labels combined: +0.00

**raw_area** — signed revenue change (PHP):

- GOVERNMENT: +7,313,039.54
- HOSPITAL: +1,183,863.36
- QUEZON: -102,936.00
- ADMIN: -89,397.21
- BATANGAS: +26,469.00
- Remaining labels combined: +0.00

**raw_product** — signed revenue change (PHP):

- SPEEDA 2.5IU/0.5ML: -11,053,833.63
- F6 FETAL MONITOR SINGLE: +2,536,023.00
- TROYNOXA-60 60MG/0.6ML: +2,144,299.66
- LOMOH-60 60MG/0.6ML: +1,179,452.17
- LOMOH-40 40MG/0.4ML: +956,983.73
- Remaining labels combined: +12,568,113.76

