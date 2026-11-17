# Demand profile per product group, 15 November 2026

Offline, read-only, retrospective (`run.py`). Rules and the check were fixed in the docstring before the first run
(SHA-256 prefix `a559a129811f`); category mapping candidate v0.1 (SHA-256 prefix `47e709adbde9`).

**What it is.** One row per therapeutic category: how much of its sales comes from large orders (documents of ₱500,000
or more), how steady its regular sales are, and the planning approach that follows from fixed rules. It joins the
category mapping, the routine and large-order split, the ABC–XYZ steadiness cut-offs (0.5 and 1.0) and the registered
seasonality and disease tests.

**Result of the check: description only.** Classes assigned on October 2022 to September 2024 were judged on October
2024 to September 2026.

| Check | Result | Rule | Outcome |
|---|---|---|---|
| C1 Forecast error rises from steadier to more erratic classes | Uneven 54.3% < erratic 93.2% median error (5 groups each; the single steady group had 26.4%) | Strictly rising | Pass |
| C2 Groups keep their class between the two periods | 7 of 13 (53.8%) | At least 60% | **Fail** |

Because C2 failed, the classes are **not a validated planning guide**. They describe recent behaviour. Four of the six
changes were groups moving into the large-order class (antibacterials, respiratory medicines, vaccines and immune sera,
non-medical goods), which is the structural shift seen throughout the study.

## Profile, October 2024 to September 2026

| Product group | Share of all sales | From large orders | Regular sales | Months with regular sales | Suggested reading |
|---|---|---|---|---|---|
| Other products (not classified) | 35.7% | 45% | Uneven | 24 of 24 | Reorder with a larger buffer; also keep ready for large orders |
| Antibacterials | 16.9% | 62% | Mostly large orders | 24 of 24 | Plan for readiness; do not forecast |
| Vaccines and immune sera | 10.3% | 65% | Mostly large orders | 17 of 24 | Plan for readiness; do not forecast |
| Childbirth medicines | 4.4% | 33% | Uneven | 24 of 24 | Larger buffer; also keep ready for large orders |
| Critical care | 3.4% | 86% | Mostly large orders | 23 of 24 | Plan for readiness |
| Stomach acid and cramps | 3.1% | 35% | Erratic | 22 of 24 | Order on demand; also keep ready for large orders |
| Heart medicines | 2.8% | 2% | Uneven (CV 0.50) | 24 of 24 | Reorder with a larger buffer |
| Vitamins and minerals | 2.6% | 31% | Steady | 24 of 24 | Reorder from the 6-month average; also keep ready for large orders |
| Anaesthetics | 2.5% | 45% | Erratic | 23 of 24 | Order on demand; also keep ready for large orders |
| Medical supplies | 2.3% | 45% | Erratic | 16 of 24 | Order on demand; also keep ready for large orders |
| Blood thinners | 2.2% | 91% | Mostly large orders | 9 of 24 | Plan for readiness |
| Non-medical goods | 1.6% | 98% | Mostly large orders | 1 of 24 | Plan for readiness |
| Kidney and anaemia | 1.4% | 0% | Erratic | 3 of 24 | Order on demand |
| Respiratory medicines | 1.3% | 59% | Mostly large orders | 24 of 24 | Plan for readiness |
| Pain and fever | 1.2% | 20% | Steady | 24 of 24 | Reorder from the 6-month average |
| Metronidazole and similar | 0.9% | 32% | Erratic | 23 of 24 | Order on demand; also keep ready for large orders |
| Epilepsy medicines | 0.2% | 96% | Mostly large orders | 1 of 24 | Plan for readiness |

Groups with under ₱1M of sales in the period (antivirals, antiseptics, protective gear, diabetes medicines, medical
equipment) are not profiled.

## What it shows

1. **Half of recent sales (50.0%) sit in groups driven by large orders.** Uneven groups hold 39.2%, erratic 8.5% and
   steady groups only 2.3% (vitamins and minerals; pain and fever).
2. **No group is seasonal and none moved with disease cases** (0 of 19 and 0 of 64 in the registered tests), so the
   "steady chronic, seasonal infection" split assumed in the literature does not describe MedShield.
3. **Heart medicines are the cleanest routine group** (2% from large orders, sales every month) but they are 2.8% of sales.
4. **The classes are forecastable in the expected order but not stable.** A group's class two years ago is a weak guide
   to its class now, mainly because groups keep moving toward large orders.

## Limits

- Retrospective; a suggested reading authorizes no purchase.
- Categories come from candidate mapping v0.1, inferred from product names and not confirmed by the client. Families
  outside the top 200 and low-confidence families form one unclassified group (35.7% of sales).
- "New-product share" in `results.json` counts only mapped families and is not shown here.
- 13 groups entered the check; a result of 7 of 13 would have needed 8 to pass.

## In the system

Served live by `GET /api/sales/demand-profile` (Products page, "How each product group behaves"). The category mapping
table was created in Databricks on 16 November 2026 with
`outputs/category_mapping_20261115/create_category_table.ts` (version 0, hash verified). A live read on the same day
returned the same figures as this study: 17 groups, class shares 50.0 / 39.2 / 8.5 / 2.3%, 7 of 13 groups keeping
their class, and total recorded net of ₱638,015,351.53. The panel has been rendered in a test page; it has not yet been
checked in the signed-in dashboard.
