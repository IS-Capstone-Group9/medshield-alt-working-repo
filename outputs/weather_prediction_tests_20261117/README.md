# Weather-driven prediction tests W1 and W2 — 17 November 2026

Offline, read-only, retrospective (`run.py`). Rules were fixed in the docstring before the first run (SHA-256 prefix
`b75a862253c4`, recorded before execution and matched in `results.json`). Governed by [decision 017](../../docs/DECISIONS.md):
weather may enter prediction only through a pre-registered test that passes. **Both tests failed. Decision 017 stands.**

## W1. Does a weather regime make forecast ranges reliable? Failed

mean_6 forecast of company monthly net. The 80% range uses earlier error ratios: all months (baseline) or only months of
the same season (weather: wet Jun–Oct versus dry, PAGASA climate type I). There are 62 evaluated months (2021-08 to 2026-09).

| Range | Coverage | 2021–2023 | 2024–2026 | Wet months | Dry months | Mean width |
|---|---|---|---|---|---|---|
| Weather (season-specific) | 66.1% | 55.2% | 75.8% | 70.4% | 62.9% | 1.52× forecast |
| Baseline (all months) | 67.7% | 48.3% | 84.8% | 63.0% | 71.4% | 1.59× forecast |

The rule was 75–85% overall and in each half, with width at most 1.25× the baseline. The weather range missed on overall
coverage and on the first half. Season-specific ranges cover wet months better (70% vs 63%) but dry months worse, so there
is no overall gain. Both ranges are very wide, about ±75% of the forecast, because large tender orders dominate the
monthly error.

## W2. Do strong typhoons disrupt deliveries? Failed

The test counted routine delivery documents per working day while each TY/STY was inside PAR (25 events, 2021–2024). It
compared them with the same calendar dates in the other years.

- Median ratio 1.03 (no change). 12 of 25 events were lower. One-sided Wilcoxon p = 0.43 (rule p < 0.05).
- This **does not confirm** the exploratory "typhoon disruption" observation in `surge_preparedness_20261117`.
- Some single storms coincide with very low activity (Odette, December 2021: 0.2 vs 3.7 a day; the November 2024 cluster
  Marce–Pepito). These are anecdotes, not a pattern. PAR entry is not landfall in the territory.

## What this means

- Weather does not improve forecast ranges or predict delivery disruption with the available data.
- mean_6 remains the forecast. Weather stays in the risk calendar, indicator and buffer scenario.
- For the paper: weather was tested as a demand driver (earlier), as an uncertainty driver (W1) and as a supply-disruption
  driver (W2). None was supported. This is a clear, pre-registered negative result.

## Limits

- No order dates exist, so delivery delay cannot be measured directly. Activity counts are a proxy.
- PAR entry is national, not territory landfall. The wet season is a fixed calendar regime, not an actual forecast.
- Data covers 2021–2024 for typhoons and up to 2026-09 for sales. The analysis is retrospective. No forecast, model or
  purchase approval follows.

## What could change it (future work)

Territory landfall tracks, order or request dates, buyer type (retail vs tender) and PAGASA seasonal outlooks known at
forecast time.
