# Large-order profile, 15 November 2026

Offline, read-only, retrospective (`run.py`). Rules and pass criteria were fixed in the docstring before the first run
(SHA-256 prefix `88f353fe0007`, full hash in `results.json`) and were not changed afterwards. A large order is a delivery
document of ₱500,000 or more within a month: 267 documents, January 2017 to September 2026. Tests use the 81 contiguous
months from January 2020.

## A. How often

| Year | Months with a large order | Documents | Large-order sales | Share of sales |
|---|---|---|---|---|
| 2017 | 0 of 7 | 0 | ₱0 | 0% |
| 2018 | 7 of 10 | 13 | ₱8.3M | 16% |
| 2019 | 9 of 9 | 23 | ₱17.6M | 28% |
| 2020 | 8 of 12 | 27 | ₱20.7M | 39% |
| 2021 | 9 of 12 | 34 | ₱31.9M | 41% |
| 2022 | 8 of 12 | 23 | ₱18.9M | 30% |
| 2023 | 6 of 12 | 19 | ₱23.0M | 37% |
| 2024 | 3 of 12 | 5 | ₱6.8M | 24% |
| 2025 | 11 of 12 | 49 | ₱43.5M | 49% |
| 2026 (Jan–Sep) | 9 of 9 | 74 | ₱84.4M | 60% |

Large orders were occasional until 2024 and became a monthly event from 2025. The first nine months of 2026 already have
more large documents than any full year.

## B. How big

- **Per document (2020–2026, 231 documents):** typical ₱846k; 1 in 4 above ₱1.07M; 1 in 10 above ₱1.56M; largest ₱4.89M.
- **Per month, when there is at least one (54 months):** typically 3 documents totalling ₱3.0M; 80% of such months
  fall between ₱0.8M and ₱9.0M; at most 13 documents in one month.

## C. When: no reliable calendar pattern

Average large-order sales differ by calendar month (highest in June, February and September; lowest in January, March,
November and December), and every June from 2020 to 2026 had one. But a test that shuffles months within each year gives
p = 0.134, so the calendar pattern is not reliable (rule: p < 0.05). Large orders cannot be scheduled by calendar month.

## D. What is in them: spread across many products

- Large orders contained 1,001 different product families. The top 10 (SPEEDA, SHARJVAX, SEROALBUMIN, PROFUREX, MONOWEL,
  ZINACARE, HYCLENS WOUND CARE, BUPIRIGHT, LOMOH, JUBI R) make up only 28.5% of large-order sales.
- Each year, only 29–48% of large-order sales were in products that had appeared in earlier large orders.
- 56% of large-order sales (2020–2026) were in products MedShield had sold routinely in the previous 12 months, so about
  half of what large orders ask for is already in the regular range; the other half is new to it.

Because the content changes from order to order, pre-stocking specific products for large orders is not supported by
the data. Readiness is better framed as supplier access, delivery capacity and working capital.

## E. Forward test of a readiness estimate

Each month from January 2021, the estimate used only earlier months.

**E1. Chance of at least one large order next month.** Two candidates were compared on 2021–2023, and the better one
was then checked on 2024 to September 2026.

| | Result | Rule | Outcome |
|---|---|---|---|
| Selected on 2021–2023 | Long-run share since 2020 (Brier 0.239 vs 0.247 for the last-12-months share) | Lower Brier | Long-run share |
| Holdout 2024–2026, 33 months | Brier 0.216; predicted 61% on average vs 70% observed (gap −9 points) | Brier < 0.25 and gap ≤ 10 points | Usable, narrowly |

The estimate is only slightly better than a coin flip (0.25) and runs low, because large orders became more frequent.
The last-12-months share, not selected, would have scored better on the holdout (0.161). We report the pre-registered
choice and do not switch after seeing the holdout.

**E2. Range of next month's large-order total** (10th to 90th percentile of the previous 24 months).

| Period | Months inside the range | Rule | Outcome |
|---|---|---|---|
| 2021–2023 | 83% | 70–90% | Pass |
| 2024–Sep 2026 | 73% | 70–90% | Pass, narrowly |

All 15 misses were above the range, and 5 of them came in 2026 (Feb, Apr, Jun, Jul, Sep). The range keeps lagging
because large orders keep growing. The lower end is always ₱0, since more than 10% of past months had no large order.

## What this means for MedShield

1. **Large orders are now monthly.** Since January 2025, 20 of 21 months had at least one. Planning should assume a
   large order every month, not treat it as an exception.
2. **Plan for size, not content.** A typical large-order month is about ₱3M, and 1 in 10 such months goes above ₱9M
   (2026 months reached ₱13–15M). The products vary too much to pre-stock, so readiness means credit lines, supplier
   lead times and delivery capacity.
3. **History-based readiness estimates pass but lag.** Both passed their rules narrowly, and both underestimate in a
   growing market. They are useful as a floor, not a ceiling.
4. **Calendar timing does not help.** The pattern by month is not reliable.

## Status in the model register

| Item | Status |
|---|---|
| Chance-of-large-order estimate (long-run share) | Benchmark: passed narrowly; its one claim is "a floor for the chance of a large order" |
| Large-order range (24-month p10–p90) | Benchmark: passed narrowly; misses only on the high side |
| Calendar timing of large orders | Not supported (p = 0.134) |

## Limits

- Retrospective; no result authorizes a purchase.
- Large orders are defined by document size, not by buyer type, because buyer names are confidential and not used.
- Family grouping uses candidate mapping v1.1.
- The client's notice of upcoming large orders (meeting question 4 and 10) would add more than any history-based
  estimate here.
