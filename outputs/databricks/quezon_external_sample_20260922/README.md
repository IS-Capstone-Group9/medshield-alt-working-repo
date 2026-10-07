# Quezon external modeling source sample

Extracted: 2026-09-22T05:28:13.811Z

Product: **JAGA 300MG/100MG/100MCG**. Period: 2018-01 through 2024-12.

Read-only Databricks extraction. Candidate data, not a trained model or approved forecast.

## Coverage

- Calendar months: 84
- Observed sales months: 55
- External source rows: 303
- Months containing sales, dengue cases and rainfall: 55

## Latest 12 complete same-month examples

| Month | Delivered source units | Dengue cases | Rainfall (mm) | Station |
|---|---:|---:|---:|---|
| 2022-09 | 11 | 289 | 324.2 | Tayabas |
| 2022-10 | 4 | 220 | 712.5 | Tayabas |
| 2022-11 | 2 | 282 | 558.1 | Tayabas |
| 2022-12 | 7 | 212 | 440.3 | Tayabas |
| 2023-01 | 3 | 208 | 532.1 | Tayabas |
| 2023-02 | 15 | 121 | 133.4 | Tayabas |
| 2023-03 | 7 | 125 | 43.2 | Tayabas |
| 2023-04 | 6 | 130 | 55.5 | Tayabas |
| 2023-05 | 10 | 190 | 130.2 | Tayabas |
| 2023-06 | 5 | 440 | 245 | Tayabas |
| 2023-12 | 1 | 345 | 518.2 | Tayabas |
| 2024-02 | 1 | 235 | 28.28 | Tayabas |

## Interpretation

- Mappings remain subject to source approval flags.
- Product is a provisional demand identity, not proof of a validated canonical SKU.
- Missing months are not zero.
- DII is not computed; its historical denominator requires a documented baseline and coverage policy.
- Rainfall totals are not the paper-defined probability-based RSI.
- Same-month alignment illustrates source coverage only; it is not a leakage-safe forecasting dataset.
- No clinical product-disease association is established by this sample.

The companion sample.json preserves all 84 calendar rows, raw extracted source rows, exact SQL, source versions and approval flags. DII and RSI are deliberately null.
