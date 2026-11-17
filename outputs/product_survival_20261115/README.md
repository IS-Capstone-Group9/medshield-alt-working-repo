# Product survival, 15 November 2026

Offline, read-only, retrospective (`run.py`). Rules were fixed in the docstring before the first run (SHA-256 prefix
`c180dcd6f1a1`, full hash in `results.json`). A new product family is one first sold between January 2020 and December
2025 with no sales in any earlier recorded month (2017–2019 provide 26 months of history). Windows are counted from each
family's first month: year 1 = months 1–12, year 2 = months 13–24, year 3 = months 25–36. A family is used in a window
only if that window ends by September 2026. 1,876 new families; ₱142.0M of first-year sales.

## How long new products last

| Cohort | New families | Still selling in year 2 | Still selling in year 3 | Year-2 sales as % of year 1 | Sold in one month only |
|---|---|---|---|---|---|
| 2020 | 246 | 34% | 29% | 53% | 48% |
| 2021 | 221 | 31% | 15% | 8% | 48% |
| 2022 | 299 | 24% | 10% | 17% | 50% |
| 2023 | 626 | 14% | 14% | 26% | 58% |
| 2024 | 134 of 154 with year 2 known | 36% | not yet known | 80% | 49% |
| **All** | **1,526 with year 2 known** | **23%** | **16%** | **27%** | **53%** |

- **About 1 in 4 new products still sells in its second year, and 1 in 6 in its third.**
- **About half sell in a single month and never again.**
- **New products keep about a quarter of their first-year sales in year 2.** Weighted by value, families holding 30% of
  first-year sales were still selling in year 2.
- **2021 was a one-off year:** year-2 sales were only 8% of year 1, consistent with pandemic supplies (gloves, PPE sets,
  masks, alcohol) that were not reordered.
- **2023 needs care:** it has 626 new families, about twice the usual number, and some returned in year 3 after a quiet
  year 2. Part of this is likely label changes the family mapping did not merge.

## Early signal: repeat sales in the first six months

A new family that sold in at least 3 of its first 6 months was much more likely to keep selling. Months 1–6 and months
13–24 do not overlap, so this is a genuine early signal, not the same data counted twice.

| Cohort | Sold in ≥ 3 of first 6 months | Still selling in year 2 | Others | Still selling in year 2 |
|---|---|---|---|---|
| 2020 | 26 | 62% | 220 | 31% |
| 2021 | 40 | 70% | 181 | 23% |
| 2022 | 39 | 51% | 260 | 20% |
| 2023 | 82 | 38% | 544 | 10% |
| 2024 | 27 | 59% | 107 | 30% |
| **All** | **214** | **52%** | **1,312** | **19%** |

The direction held in all 5 cohorts, which meets the pre-registered consistency rule. Products with early repeat sales
also kept 43% of their first-year value in year 2, against 20% for the rest.

## Products that started with a large order

Families whose first-year sales came mostly (over 50%) from large orders did not differ consistently in whether they
kept selling: they did worse in 2020–2022 and better in 2023–2024, so the rule calls the split mixed. They did keep far
less value: year-2 sales were 9% of year 1, against 49% for products that started with routine sales. A product
introduced through a large order usually keeps a small trickle of sales but rarely repeats the large amount.

## What this means for MedShield

1. **Be cautious with new products.** Most new products don't last, so committing heavy stock based on early sales is
   risky.
2. **Use the 3-in-6 rule as a check.** If a new product has sold in at least 3 of its first 6 months, it is about 2.7
   times as likely to still be selling a year later (52% vs 19%). That is a reasonable point to treat it as a regular
   product.
3. **Don't treat a large-order product as a new regular.** Its value almost never repeats (9%).
4. **This explains the yearly turnover.** New products add sales every year, but most fade within a year, so growth
   depends on a steady flow of new products and large orders rather than on building a stable range.

## Limits

- Retrospective; no result authorizes a purchase.
- Family grouping uses candidate mapping v1.1, not yet confirmed by the client. Unmerged label variants make products
  look newer and shorter-lived than they are, especially in 2023.
- The 3-in-6 rule is checked for direction across cohorts, not as a calibrated forecast.
- Year 2 for the 2024 cohort and year 3 for late-2023 families are not yet known and are excluded, not counted as
  stopped.
