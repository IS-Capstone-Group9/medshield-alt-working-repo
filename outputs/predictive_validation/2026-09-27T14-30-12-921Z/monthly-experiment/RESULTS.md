# Monthly refresh development experiment

Targets: January 2023–December 2024 (24 shared target months). Training begins January 2020.
Exploratory revised-snapshot evaluation; no 2025 inputs/scores, selection, intervals or publication.
Annual fixed forecasts use the preceding December; monthly forecasts use the preceding month.
Cross-schedule comparison matches targets, not identical origins/leads. Within-schedule models use exact common keys.

| Model | Monthly WAPE | Annual fixed WAPE | Monthly MAE PHP | Monthly bias % |
|---|---:|---:|---:|---:|
| last_value | 73.78% | 71.80% | 3,457,952.64 | -11.66% |
| seasonal_naive | 77.31% | 77.31% | 3,623,662.41 | 11.54% |
| mean_3 | 70.21% | 63.29% | 3,290,672.47 | -10.81% |
| mean_6 | 69.41% | 60.08% | 3,253,378.57 | -9.56% |
| ets_none | 78.62% | 73.69% | 3,684,951.36 | 9.23% |
| ets_damped | 82.38% | 72.64% | 3,860,949.41 | 14.93% |
| prophet_cp0.01_sp0.1 | 70.37% | 67.85% | 3,298,465.35 | 8.19% |
| prophet_cp0.01_sp1.0 | 71.06% | 70.04% | 3,330,415.94 | 9.29% |
| prophet_cp0.01_sp10.0 | 71.85% | 70.10% | 3,367,846.88 | 9.76% |
| prophet_cp0.05_sp0.1 | 70.55% | 69.30% | 3,306,696.53 | 8.76% |
| prophet_cp0.05_sp1.0 | 70.77% | 69.95% | 3,317,013.00 | 9.06% |
| prophet_cp0.05_sp10.0 | 70.85% | 70.47% | 3,320,763.78 | 9.13% |
| prophet_cp0.1_sp0.1 | 70.51% | 69.05% | 3,304,881.67 | 8.62% |
| prophet_cp0.1_sp1.0 | 70.76% | 70.19% | 3,316,491.81 | 9.05% |
| prophet_cp0.1_sp10.0 | 70.77% | 70.06% | 3,316,861.67 | 9.14% |

## Limits

- Protocol informed by previously inspected retrospective audit.
- Revised snapshot lacks historical data-availability vintages.
- Assumes the preceding month is available before issuing each forecast.
- Schedule comparison pairs targets; origins and lead lengths differ.
- Coverage is user-attested; no intervals or business acceptance inferred.
