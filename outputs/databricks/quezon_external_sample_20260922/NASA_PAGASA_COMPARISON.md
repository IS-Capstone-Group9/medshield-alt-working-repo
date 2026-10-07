# Quezon NASA POWER and PAGASA comparison

Extracted 2026-09-22T05:31:09.433Z.

NASA months: 48; months with both rainfall sources: 48.

| Month | PAGASA rainfall mm | NASA rainfall mm | Existing NASA weather proxy (0–1) |
|---|---:|---:|---:|
| 2024-01 | 104.07 | 110.85 | 0.4063 |
| 2024-02 | 28.28 | 41.02 | 0.2459 |
| 2024-03 | 151.24 | 58.06 | 0.3043 |
| 2024-04 | 5.56 | 15.07 | 0.1335 |
| 2024-05 | 498.38 | 247.26 | 0.541 |
| 2024-06 | 214.24 | 207.89 | 0.4764 |
| 2024-07 | 450.02 | 444.08 | 0.7298 |
| 2024-08 | 189.79 | 172.09 | 0.435 |
| 2024-09 | 483.96 | 327.72 | 0.5997 |
| 2024-10 | 483.74 | 533.89 | 0.8237 |
| 2024-11 | 330.53 | 196.48 | 0.4786 |
| 2024-12 | 1146.21 | 682.38 | 0.7847 |

- NASA weather severity is an existing heuristic using rainfall, rainy days, wind and temperature; it is not a rainfall probability.
- PAGASA station and NASA coordinate represent different spatial measurements.
- No provider blending or model validation performed.
- Null means unavailable, never zero.

The JSON preserves the exact SELECT, source metadata, all source rows and all 84 comparison months.
