# O4 data-driven prescriptive policy, 13 November 2026

**Exploratory, retrospective, offline.** Rules were fixed in `run.py` before the first run (hash in `results.json`), but
every month had already been inspected, so this is not registered evidence. Nothing was written to the warehouse,
dashboard or model register. Candidate results do not authorize procurement.

## What changed

Before this study, Prescriptive Planning computed EOQ and reorder points only from values the user typed in, including
demand and safety stock. This study connects the prescription to the models that passed their tests:

| Input | Source | Evidence |
|---|---|---|
| Expected demand | mean_6 per product family | Beat 15+ challengers (O3) |
| Service target | ABC–XYZ class: steady (X) and variable (Y) 95%, erratic (Z) 90% | ABC–XYZ passed; the targets are a stated policy choice |
| Safety stock | 95th or 90th percentile of the family's last 24 known forecast errors | Safety stock at 95% passed (96.2%) |
| Lead time | 7, 14 or 30 days (assumption A3 range) | Assumption |
| Order frequency | EOQ in pesos at cost, holding 15/25/35% (A1), ordering ₱500/1,500/5,000 (A2) | Assumption ranges |

Policy: review each high-value (A-class) family monthly and order up to `S = (1 + L/30) × demand + safety stock`.
Backtest: 6,896 family-months, origins December 2021 to July 2026, using only data known at each origin.

## Results

| Test | Rule | Result | Outcome |
|---|---|---|---|
| T1 Calibration | Achieved service within ±5 points of target, every lead time and class | 94.4% vs 91.1% pooled target (14 days); 93.0% for 95% families, 94.8% for 90% families; 94.2–94.6% across 7–30 days | **Pass** |
| T2 Value | ≥10% less stock than the best single "keep k months of stock" rule at equal service, both halves | All origins: 34.1% less. Second half: 39.5% less. First half: the rule could not reach the policy's service within the search limit of 6 months | **Fail as written** (see below) |
| T3 Robustness | Order-frequency band unchanged in ≥6 of 9 cost combinations for ≥70% of families | 55% (36 of 65) | **Fail** |

**T2 supplementary (added after the first run, not a registered rule).** With the search widened to 24 months, the
simple rule needs 6.6 months of stock in the first half to match the policy. The policy holds 34.1% less, and 34–39% less
in both halves. The registered rule failed only because its search range was too narrow, and the gap favours the policy.
Only a re-test on new months can confirm this.

**Peso fill rate (share of demand value covered), 14 days:**

| Class | Cycle service | Fill rate |
|---|---|---|
| X steady | 91.6% | 97.2% |
| Y variable | 93.7% | 90.5% |
| Z erratic | 94.8% | 64.1% |

For erratic families, the buffer covers most months but misses the large institutional orders, which are too big to
stock against. Safety stock is the wrong tool for those orders. They need advance notice from the buyer, which the
large-order frequency signal (in use) flags as a readiness alert.

**Lead time drives stock.** Moving from 7 to 14 days adds 22% to total order-up-to stock, and moving to 30 days adds 68%.
The client's lead-time answer (C4) changes the prescription more than any other input.

## Current prescription (as of September 2026, 14-day lead time)

[prescription_2026_09.csv](prescription_2026_09.csv) lists 65 A-class families from 2025 with enough history: 7 X, 13 Y
and 45 Z. For each family it gives monthly demand, safety stock, order-up-to level (at sales value and approximately at
cost), and the order frequency with how many cost combinations agree.

| Total for the 65 families | Value |
|---|---|
| Expected monthly demand | ₱6.35M |
| Safety stock | ₱7.84M |
| Order-up-to level | ₱17.15M at sales value, about ₱7.03M at cost (about 2.7 months of demand) |

SPEEDA alone is ₱3.19M a month, half of the 65-family demand. Order frequencies are guidance only, because T3 failed:
they depend on holding and ordering costs that have not been supplied.

## On the dashboard and in the re-test queue

- Prescriptive Planning shows these levels live from pinned Gold (`GET /api/sales/prescriptive-policy`, panel "Recommended
  stock levels from sales history"), with a 7/14/30-day lead-time selector and CSV export. Given the same family series,
  the gateway reproduces this study to floating-point precision. On the dashboard's mapping v1.1 the backtest has 6,908
  family-months: 94.5% service vs 91.1% target. The uniform rule needs 5.4, 6.0 and 7.4 months of stock at 7, 14 and 30
  days, so the policy holds 40%, 34% and 27% less.
- Registered as re-test R6 on 13 November 2026 (`outputs/retest_queue_20261112/addendum_r6.py`), pending 12 new months.

## What the paper may claim

- The prescription is data-driven. Demand and safety stock come from tested models, not typed values.
- Stock levels hit their service targets historically, in pesos, at the family level.
- Differentiated buffers needed about a third less stock than a uniform months-of-cover rule (exploratory).
- Erratic families cannot be protected by stock alone (64% fill rate). Large-order readiness is the prescribed response.
- Order frequency cannot be prescribed until the client supplies holding and ordering costs.

It may not claim purchase quantities (no stock on hand or units), measured savings, or expiry outcomes (no batch data).

## Limits

Pesos stand in for units; the cost share 0.4097 is the company-wide figure (gross margin 59.03%), not per family;
families are the v1 candidate mapping; lead times and costs are assumptions A1–A3; sales are fulfilled demand, so
stockouts cannot be seen in the history.

Run from the repository root: `python -X utf8 outputs/o4_prescriptive_policy_20261113/run.py`
