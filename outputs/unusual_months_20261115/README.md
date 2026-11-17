# Unusual months, 15 November 2026

Offline, read-only, retrospective (`run.py`). Rules were fixed in the docstring before the first run (SHA-256 prefix
`4a7220608179`, full hash in `results.json`) and were not changed afterwards.

**Method.** Each recorded month is compared with the median of the 12 recorded months before it (no look-ahead; missing
months are skipped, never zero). A month is flagged when it is at least 3 robust standard deviations (1.4826 × MAD) above
or below that median. Each flagged month's gap from the median is split into large orders (documents ≥ ₱500,000) and
routine sales by product family, and labelled LARGE ORDERS, NEW PRODUCTS, ONE PRODUCT or BROAD when one part explains at
least half of it. Original itemized sales, contracts excluded, January 2017 to September 2026; 101 of 107 recorded months
have enough history to score.

## Total sales: 16 flagged months

| Month | Flag | Sales vs usual | Cause | What moved |
|---|---|---|---|---|
| 2017-12 | Low | ₱0.004M vs ₱2.38M | Data gap | Only ₱3,900 recorded: an incomplete source month, not a business event |
| 2018-04 | High | ₱6.4M vs ₱2.4M | Large orders | 3 large documents, +₱2.2M |
| 2019-03 | High | ₱7.0M vs ₱4.6M | New products | GYNE TOCIN, CEFZIME, new wheelchair line |
| 2019-04, 2019-05 | High | ₱9.4M, ₱9.6M vs ₱4.8M | Broad | SPEEDA and MAXIFER at their peak, many products up together |
| 2021-07, 2021-08 | High | ₱9.6M, ₱10.5M vs ₱3.3–3.7M | Large orders | Plus pandemic supplies: vinyl gloves, PPE sets, face masks, ethyl alcohol |
| 2021-10 | High | ₱15.3M vs ₱4.9M | Large orders | 8 large documents, +₱6.5M |
| 2023-02, 2023-05 | High | ₱13.8M, ₱14.5M vs ₱3.6–4.8M | Large orders | 7 and 6 large documents (+₱4.9M, +₱9.1M) |
| 2024-06 | High | ₱6.2M vs ₱2.1M | Large orders | 2 large documents; routine sales normal |
| 2025-02, 04, 05, 06 | High | ₱4.4–12.5M vs ₱2.0–2.7M | Large orders | 2–10 large documents each, plus new products (CUROXIM, MONOWEL, GENVAC B) |
| 2025-09 | High | ₱16.2M vs ₱3.5M | Broad | 9 large documents (+₱5.8M) and routine spikes: ANTITET +₱1.4M, volumetric infusion pumps +₱1.2M |

## Routine sales (large orders removed): 13 flagged months

- **2021-07 and 2021-08:** pandemic supplies (gloves, PPE sets, masks, alcohol), mostly products not sold before.
- **2023-01 and 2023-02:** broad rise across established products (EVAPROST, NEUROBE, SYRINGE, PROFUREX).
- **2024-10 and 2024-11, low:** routine sales fell to ₱1.4M and ₱1.1M against a usual ₱1.9M, spread across many
  products. This matches the 2024 dip from lost product families in the sales-change breakdown.
- **2025-02, 05, 06 and 12, high:** each driven by new products (CUROXIM, MONOWEL, GENVAC B, SEZUVIN, EPOGEN).
- **2025-09, high:** ₱9.0M against ₱2.0M, led by ANTITET and volumetric infusion pumps.

## What this shows

1. **Unusual months are mostly big-order months.** 11 of the 15 genuinely high months are explained mainly by large
   orders. This repeats Section 4.4 month by month: the hard-to-predict part of sales is large institutional orders.
2. **2025 is the most unusual year:** 5 flagged total months and 5 flagged routine months, from large orders and a wave
   of new products.
3. **New products are the second driver.** When routine sales spike, it is usually because products not sold in the
   previous year arrive, not because established products sell more.
4. **One data gap found:** December 2017 is nearly empty in the source files and should be treated as missing in
   any future analysis.

## Limits

- Retrospective description only: a flag is not a forecast or an alert, and authorizes no purchase.
- The area view (`area_routine` in `results.json`, 45 flags) is not used for any claim. Area labels changed between
  years, and areas with near-zero usual sales produce extreme scores (for example LAGUNA in 2020–2021).
- A threshold of 3 is a convention, fixed before running; a different threshold would flag a different number of months.
- Family grouping uses candidate mapping v1.1, not yet confirmed by the client.

## Use in the system

The same rule can run each month on the dashboard's Gold data once a new month is loaded, to show "this month was
unusual, and here is what moved". That integration waits for the other session's dashboard work.
