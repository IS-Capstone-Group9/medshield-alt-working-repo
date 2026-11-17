# Accuracy round 2: day-level, unit and routine-method experiments, 11 November 2026

Offline, read-only, **retrospective**: every month was inspected by earlier studies, so results are candidates, not future
accuracy. Original itemized sales (contracts excluded, ₱638,015,351.53), 2020-01 to 2026-09. Choices were made on
development targets (2022–2023) and frozen before the evaluation targets (2024-01 to 2026-09, 33 months). Design and rules
are in the `run.py` docstring (registration SHA-256 `0976d8fc9811…`).

## Data used that earlier models did not

- **Delivery day within the month** (all 39,286 eligible rows carry a date).
- **Recorded quantity** (40,146 of 40,171 rows; unit and pack meaning unverified).
- Contracts (352 rows, ₱118.3M, no product breakdown) were already assessed: they fix bias, not error.

## Results

### E1: mid-month estimate of the current month's total

Blend of sales delivered so far (scaled by the usual share delivered by that day) and the 6-month mean. The blend weight
was chosen on 2022–2023 only.

| Series, day | Weight on month-to-date | Estimate WAPE / bias | Before-month mean_6 WAPE / bias | Win rule |
|---|---|---|---|---|
| Total, day 10 | 0.25 | 35.5% / −6.2% | 41.8% / −24.2% | Not met (bias) |
| Total, day 15 | 0.50 | 27.8% / −5.4% | 41.8% / −24.2% | Not met (bias just over 5%) |
| **Total, day 20** | **0.75** | **28.8% / −2.3%** | **41.8% / −24.2%** | **Met** |
| Routine, day 10 / 15 / 20 | 0.25 / 0.25 / 0.50 | 24.3% / 22.7% / 20.4%, bias about −12% | 32.7% / −20.0% | Not met (bias) |

**By the 20th of the month, the total can be estimated with 28.8% error instead of 41.8% (31% lower) and almost no bias.**
Day-15 estimates are about as accurate but miss the bias limit narrowly. Routine-only estimates are the most accurate in
absolute terms but stay biased low.

Caveat: delivery date stands in for when the data becomes known. Live use needs sales entered within days of delivery.

### E2: units vs pesos for steady high-value families

34 families (A class with X/Y steadiness on 2024). Lead-1 mean_6: **units 79.8% WAPE vs pesos 67.5%**, 18% worse. Recorded
quantities are noisier than pesos (pack sizes and units vary within families). **Not met.** Units need verified pack/unit
meaning before they help.

### E3: methods for routine sales

The development-chosen methods (median_6 at leads 1 and 6, an equal combination at lead 3) did not beat mean_6 on
evaluation: 33.9% vs 32.7%, 34.9% vs 36.9%, 46.1% vs 41.9%, all with bias below −26%. **Not met.** mean_6 stays.

## Conclusion

One new candidate passes its rule: a **day-20 mid-month estimate** of the total (28.8% vs 41.8% WAPE, −2.3% bias).
It is a nowcast, not a forecast, and needs timely data entry to be usable. Unit forecasts and alternative routine methods do
not help with current data. Nothing is activated.

## Day-15 retry (one pre-registered attempt, final)

`day15_retry.py` (registration SHA-256 `431c3d25…`) divided the day-15 estimate by a rolling 12-month median bias. It made
bias worse (−9.6% vs −5.4%) and WAPE 29.5% vs 27.8%. **Not met; the day-15 estimate is retired.**
