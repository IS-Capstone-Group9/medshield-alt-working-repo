# Peso benefit and sensitivity of the stock policy (SO4) — 17 November 2026

Offline, retrospective, **simulated** (`run.py`). It reuses the O4 study's data and policy code
(`o4_prescriptive_policy_20261113`) without changing that study. The default setting reproduces O4 exactly (14 days:
94.4% service, 34.1% less stock). There are about 6,900 family-months of backtest (A-class families, origins December
2021 to July 2026). Pesos are at sales value; stock at cost uses the company cost share of 0.4097.

**Benefit question:** at the same service level, how much less stock does the policy need than one uniform
"keep k months of demand" rule?

## Results

| Lead time | Service target | Service reached | Demand value covered | Uniform rule needs | Policy holds less stock by |
|---|---|---|---|---|---|
| 7 days | Default (95/95/90) | 94.6% | 71.6% | 5.4 months | **39.6%** |
| 7 days | 90% | 93.9% | 70.6% | 4.3 months | 27.3% |
| 7 days | 95% | 96.3% | 77.2% | 11.2 months | 52.0% |
| 7 days | 98% | 97.7% | 82.4% | over 24 months | uniform rule cannot reach it |
| **14 days** | **Default** | **94.4%** | **73.2%** | **6.0 months** | **34.1%** |
| 14 days | 90% | 93.7% | 72.2% | 5.0 months | 23.9% |
| 14 days | 95% | 96.4% | 79.4% | 13.9 months | 50.1% |
| 14 days | 98% | 97.6% | 82.9% | over 24 months | uniform rule cannot reach it |
| 30 days | Default | 94.2% | 73.3% | 7.4 months | 26.9% |
| 30 days | 90% | 93.6% | 72.4% | 6.1 months | 15.2% |
| 30 days | 95% | 96.4% | 80.6% | 20.2 months | 44.7% |
| 30 days | 98% | 97.3% | 82.7% | over 24 months | uniform rule cannot reach it |

At the default 14 days, average stock per family-month is ₱37,067 at cost for the policy against ₱56,276 for the uniform
rule. That is ₱19,209 less per family. At 15/25/35% yearly holding cost this is about ₱2,900 / ₱4,800 / ₱6,700 less
carrying cost per family per year, or about ₱187k / ₱312k / ₱437k across the 65 current A-class families.
**Illustrative:** holding cost is assumption A1.

## Reading

- **The policy holds 15–52% less stock than a uniform rule in every setting** where the uniform rule can reach the same
  service. The saving is largest at higher targets, because a uniform rule over-stocks steady families to protect
  erratic ones.
- **Lead time matters more than the target:** 30 days roughly halves the saving at 90%. The client's lead-time answer
  is the most important missing input.
- **Value covered (fill rate) stays at 71–83%.** Large institutional orders on erratic families cannot be covered by
  stock. Those need large-order readiness, not safety stock.
- **98% is not worth it:** service rises only about 1 point over 95%, while stock rises 30–45%.

## Limits

This is simulated and retrospective, not measured savings. Sales are fulfilled demand, so stockouts are invisible.
Values are in pesos, not units. The cost share is company-wide. The family mapping is a candidate. Lead time and holding
cost are assumptions. It authorizes no purchase.
