# Large-order readiness sizing, 15 November 2026

Offline, read-only, retrospective (`run.py`). Rules were fixed in the docstring before the first run (SHA-256 prefix
`fa1c91b84965`, full hash in `results.json`).

**Question.** How much large-order value should MedShield be ready to fulfil next month, in cash, supplier credit and
delivery capacity? Each option sets the reserve to a percentile of past monthly large-order totals (documents of
₱500,000 or more), using only months before each forecast month.

## Result: the pre-registered choice fails narrowly

The selection rule picked, on 2021–2023, the cheapest option covering at least 80% of months: the 90th percentile of the
last 12 months (81% coverage, average reserve ₱4.5M). On January 2024 to September 2026 it covered 23 of 33 months
(69.7%), just under the 70% rule. **It is not usable as a recommended reserve.** We do not reselect after seeing the
holdout.

## The trade-off (holdout, January 2024 to September 2026, 33 months)

| Option | Months covered | Average reserve | Average unused reserve | Average shortfall |
|---|---|---|---|---|
| Median of last 12 months | 39% | ₱1.7M | ₱0.1M | ₱2.5M |
| 75th percentile, last 12 | 55% | ₱2.9M | ₱0.6M | ₱1.8M |
| 90th percentile, last 12 (selected) | 70% (23 of 33) | ₱5.9M | ₱2.6M | ₱0.8M |
| Highest of last 12 months | 79% | ₱8.3M | ₱4.5M | ₱0.4M |
| 90th percentile, last 24 | 73% | ₱5.6M | ₱2.5M | ₱1.0M |
| Highest of last 24 months | 88% | ₱10.1M | ₱6.4M | ₱0.3M |

Every option covered fewer months in 2024–2026 than in 2021–2023, because large orders kept growing. The only options
above 75% coverage hold the highest past month, which leaves ₱4.5–6.4M unused in an average month.

## For October 2026 (scenario, not a recommendation)

| Option | Large-order value to be ready for | Cash at 2025 cost share (50.6%) |
|---|---|---|
| Median of last 12 months | ₱7.8M | ₱3.9M |
| 90th percentile, last 12 | ₱14.7M | ₱7.4M |
| Highest of last 12 or 24 months | ₱15.2M | ₱7.7M |

Cash is a planning scenario: sales value times the 2025 cost share (1 − 49.4% gross margin), ignoring supplier credit
terms and timing, which are not in the data.

## What this means

1. **History cannot set a reliable readiness amount while large orders keep growing.** The best history-based option
   failed its holdout narrowly, and the safer ones tie up a lot of unused capacity.
2. **The useful output is the trade-off table.** MedShield chooses its own risk level: for example, being ready for the
   highest month of the past year covered 79% of months but left ₱4.5M unused on average.
3. **Advance notice beats history.** A yes/no on upcoming large orders and the usual notice period (meeting questions 4
   and 10) would let readiness follow real signals instead of past months.

## Register status

Readiness reserve (history percentile): **benchmark, failed holdout (69.7% vs 70%)**. Kept only as the trade-off table
for user-chosen scenarios; no default amount is claimed.

## Limits

- Retrospective; no result authorizes a purchase or a credit line.
- Large orders are defined by document size, not buyer.
- The cash figure uses an average cost share; actual large-order products may differ.
