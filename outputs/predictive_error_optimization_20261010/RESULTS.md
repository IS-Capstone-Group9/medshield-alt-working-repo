# Bounded forecast error reduction results

Company monthly recorded net sales, PHP. Six predetermined new methods are compared with retained last value.
Development: five fixed origins, leads 1–12, 60 overlapping cases over 24 distinct target months.
Audit: December 2024 origin, 12 January–December 2025 targets; already inspected retrospective evidence.

Frozen best complete new development recipe: **`median_12`**.
Unchanged experimental gate comparison: **`median_12`**.
This reporting choice does not replace the original selected model or imply publication approval.

The development winner lowers development MAE by 24.90%, but increases 2025 retrospective-audit MAE by 116.95%. This experiment does not support activating that winner.
The unselected bounded-calibration trial lowers development MAE by 5.94% and audit MAE by 1.06%. This modest retrospective improvement is exploratory evidence; it does not authorize audit-driven reselection.

| Model | Dev n | Dev MAE PHP | Dev WAPE % | Dev bias % | Audit n | Audit MAE PHP | Audit WAPE % | Audit bias % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| last_value | 60 | 3,090,470.93 | 83.199360 | 1.259230 | 12 | 5,834,383.00 | 37.763644 | 8.383545 |
| last_value_l1_calibrated_10pct | 60 | 2,907,027.78 | 78.260840 | -6.943860 | 12 | 5,772,569.95 | 37.363553 | -2.454810 |
| median_12 | 60 | 2,320,959.94 | 62.483157 | -2.568519 | 12 | 12,657,516.49 | 81.927078 | -81.694163 |
| median_3 | 60 | 3,285,721.75 | 88.455757 | 23.538337 | 12 | 12,489,155.88 | 80.837346 | -80.386486 |
| median_6 | 60 | 2,880,858.36 | 77.556326 | 10.552290 | 12 | 12,184,140.75 | 78.863105 | -78.017395 |
| seasonal_median_shrink_6_3y | 60 | 2,764,291.00 | 74.418186 | 18.854617 | 12 | 11,699,027.54 | 75.723159 | -75.444616 |
| weighted_median_6 | 60 | 3,023,795.65 | 81.404378 | 14.058146 | 12 | 12,489,155.88 | 80.837346 | -80.386486 |

## Same-cohort before and after

| Cohort | Baseline MAE PHP | New MAE PHP | MAE reduction % | Baseline WAPE % | New WAPE % | WAPE reduction percentage points |
|---|---:|---:|---:|---:|---:|---:|
| development | 3,090,470.93 | 2,320,959.94 | 24.899473 | 83.199360 | 62.483157 | 20.716203 |
| retrospective_audit | 5,834,383.00 | 12,657,516.49 | -116.946959 | 37.763644 | 81.927078 | -44.163434 |

Positive reduction means lower error; negative means deterioration. MAE and WAPE share the same absolute-error numerator on these matched cases.
Development ranking is exploratory and adaptively selected. The retrospective audit did not choose the recipe.

## Development lead groups for the baseline and new recipe

| Model | Leads | n | MAE PHP | RMSE PHP | WAPE % | Bias % |
|---|---|---:|---:|---:|---:|---:|
| last_value | 1–3 | 15 | 3,758,213.33 | 4,981,864.55 | 83.524584 | -16.406561 |
| last_value | 1–6 | 30 | 3,694,868.30 | 4,737,578.31 | 89.617016 | -8.771442 |
| last_value | 1–12 | 60 | 3,090,470.93 | 4,300,604.37 | 83.199360 | 1.259230 |
| median_12 | 1–3 | 15 | 2,829,809.72 | 4,086,922.74 | 62.891236 | -19.566517 |
| median_12 | 1–6 | 30 | 2,630,393.62 | 3,715,210.27 | 63.798763 | -12.220016 |
| median_12 | 1–12 | 60 | 2,320,959.94 | 3,467,550.27 | 62.483157 | -2.568519 |

## Development origin results

| Origin | Baseline MAE PHP | New MAE PHP | MAE reduction % |
|---|---:|---:|---:|
| 2022-12 | 3,437,929.12 | 3,595,552.74 | -4.584842 |
| 2023-03 | 2,011,285.72 | 2,665,639.43 | -32.534100 |
| 2023-06 | 4,159,955.48 | 1,661,671.63 | 60.055543 |
| 2023-09 | 2,550,658.20 | 1,480,757.84 | 41.946050 |
| 2023-12 | 3,292,526.16 | 2,201,178.08 | 33.146224 |

## 2025 retrospective monthly audit — frozen new recipe

| Month | Actual PHP | Baseline prediction PHP | New prediction PHP | New signed error PHP | New absolute error PHP |
|---|---:|---:|---:|---:|---:|
| 2025-01 | 16,374,092.18 | 16,744,970.51 | 2,828,203.30 | -13,545,888.88 | 13,545,888.88 |
| 2025-02 | 13,408,966.82 | 16,744,970.51 | 2,828,203.30 | -10,580,763.52 | 10,580,763.52 |
| 2025-03 | 2,612,295.10 | 16,744,970.51 | 2,828,203.30 | 215,908.20 | 215,908.20 |
| 2025-04 | 5,670,753.87 | 16,744,970.51 | 2,828,203.30 | -2,842,550.57 | 2,842,550.57 |
| 2025-05 | 21,382,925.25 | 16,744,970.51 | 2,828,203.30 | -18,554,721.95 | 18,554,721.95 |
| 2025-06 | 14,924,161.43 | 16,744,970.51 | 2,828,203.30 | -12,095,958.13 | 12,095,958.13 |
| 2025-07 | 20,352,893.81 | 16,744,970.51 | 2,828,203.30 | -17,524,690.51 | 17,524,690.51 |
| 2025-08 | 8,934,135.31 | 16,744,970.51 | 2,828,203.30 | -6,105,932.01 | 6,105,932.01 |
| 2025-09 | 20,654,027.17 | 16,744,970.51 | 2,828,203.30 | -17,825,823.87 | 17,825,823.87 |
| 2025-10 | 12,512,678.31 | 16,744,970.51 | 2,828,203.30 | -9,684,475.01 | 9,684,475.01 |
| 2025-11 | 25,076,009.20 | 16,744,970.51 | 2,828,203.30 | -22,247,805.90 | 22,247,805.90 |
| 2025-12 | 23,493,882.59 | 16,744,970.51 | 2,828,203.30 | -20,665,679.29 | 20,665,679.29 |

## Limitations and next use

All trials and unsuccessful results are retained. Original experimental gates, model selection, annual projections and business approvals remain separately recorded.
Both client error limits remain unset. No measured 2026 error or reliable uncertainty interval is supplied.
Do not infer medicine quantities, inventory losses, disease effects or procurement authority from revenue errors.
Confirm a frozen revision on later untouched accepted actuals when the annual source becomes available.
Issue-time historical vintages and independently verified reporting completeness remain limitations.

[Method background](https://otexts.com/fpp3/accuracy.html) · [Registered experiment](README.md) · [Source diagnosis](diagnosis.md)
