# Predictive presentation scorecard — 10 October 2026

This is a presentation-only Decimal derivation of saved predictions, not a new fit, model-selection decision or publication approval. The original exploratory comparison retains `last_value`: no challenger qualifies under its registered experimental criteria. No causal or operational benefit is measured.

Target: monthly company recorded net sales in PHP. Development contains 60 origin-target pairs across 24 distinct target months and five origins; each lead has five dependent errors. The separately displayed 2025 audit contains 12 months from the December 2024 origin. That audit was previously inspected and is retrospective, not an untouched final test.

WAPE = 100 × sum(|prediction − actual|) / sum(|actual|). It is not accuracy = 100 − WAPE and can exceed 100%. Signed error is prediction minus actual; positive bias means overforecast. PHP revenue does not establish medicine-unit demand.

## Representatives chosen by development WAPE only

These five rows summarize families; they do not replace the recorded selection. Audit errors were not used to choose the representatives.

| Family | Configuration | Development WAPE % | Development MAE PHP | 2025 audit WAPE % | 2025 audit MAE PHP |
| --- | --- | ---: | ---: | ---: | ---: |
| benchmarks | `last_value` | 83.199360 | 3,090,470.93 | 37.763644 | 5,834,383.00 |
| ets | `ets_none` | 92.744543 | 3,445,030.30 | 67.969011 | 10,501,032.20 |
| prophet | `prophet_cp0.01_sp10.0` | 93.542363 | 3,474,665.62 | 72.105184 | 11,140,059.96 |
| sarima | `sarima_airline` | 87.879445 | 3,264,314.43 | 63.376322 | 9,791,473.91 |
| ridge | `ridge_recursive_a10` | 106.554455 | 3,958,004.57 | 69.805660 | 10,784,789.51 |

## All configurations ranked on development

| Rank | Configuration | Family | Development WAPE % | MAE PHP | RMSE PHP | Signed normalized bias % |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 1 | `last_value` | benchmarks | 83.199360 | 3,090,470.93 | 4,300,604.37 | 1.259230 |
| 2 | `sarima_airline` | sarima | 87.879445 | 3,264,314.43 | 4,277,834.50 | 44.278418 |
| 3 | `ets_none` | ets | 92.744543 | 3,445,030.30 | 4,264,377.52 | 56.651692 |
| 4 | `mean_6` | benchmarks | 93.507915 | 3,473,386.01 | 4,419,745.38 | 35.480379 |
| 5 | `prophet_cp0.01_sp10.0` | prophet | 93.542363 | 3,474,665.62 | 4,171,161.12 | 59.331378 |
| 6 | `prophet_cp0.01_sp0.1` | prophet | 93.769183 | 3,483,090.93 | 4,179,834.10 | 58.877907 |
| 7 | `seasonal_naive` | benchmarks | 93.896222 | 3,487,809.81 | 5,434,895.69 | 46.625559 |
| 8 | `prophet_cp0.1_sp0.1` | prophet | 94.215044 | 3,499,652.58 | 4,179,654.78 | 59.903717 |
| 9 | `prophet_cp0.01_sp1.0` | prophet | 94.347115 | 3,504,558.43 | 4,196,167.55 | 60.258385 |
| 10 | `prophet_cp0.05_sp0.1` | prophet | 94.529614 | 3,511,337.42 | 4,187,454.57 | 60.343878 |
| 11 | `prophet_cp0.05_sp1.0` | prophet | 94.634118 | 3,515,219.25 | 4,205,644.29 | 60.577057 |
| 12 | `prophet_cp0.05_sp10.0` | prophet | 94.817580 | 3,522,034.02 | 4,206,001.87 | 60.964532 |
| 13 | `prophet_cp0.1_sp1.0` | prophet | 94.855291 | 3,523,434.78 | 4,210,355.22 | 60.913205 |
| 14 | `prophet_cp0.1_sp10.0` | prophet | 94.969146 | 3,527,663.96 | 4,216,057.43 | 60.979939 |
| 15 | `mean_3` | benchmarks | 95.125671 | 3,533,478.17 | 4,649,384.26 | 29.733140 |
| 16 | `ets_damped` | ets | 100.303092 | 3,725,795.38 | 4,511,523.75 | 62.958715 |
| 17 | `ridge_recursive_a10` | ridge | 106.554455 | 3,958,004.57 | 4,442,914.49 | 64.698463 |
| 18 | `sarima_ar_seasonal` | sarima | 106.649572 | 3,961,537.71 | 4,497,831.88 | 62.262874 |
| 19 | `ridge_recursive_a1` | ridge | 111.015780 | 4,123,722.12 | 4,647,192.29 | 66.108634 |
| 20 | `ridge_direct_a10` | ridge | 111.522889 | 4,142,558.88 | 4,745,588.72 | 70.585978 |
| 21 | `ridge_direct_a1` | ridge | 120.210555 | 4,465,265.44 | 5,280,350.98 | 67.570268 |

All 21 configurations use the same 60 development keys and 12 audit keys. Development targets overlap between origins; the denominator counts each forecast case, not each calendar month once.

## Last-value aggregate error

| Cohort | n | MAE PHP | RMSE PHP | WAPE % | Mean signed bias PHP | Normalized signed bias % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Development | 60 | 3,090,470.93 | 4,300,604.37 | 83.199360 | 46,774.57 | 1.259230 |
| 2025 retrospective audit | 12 | 5,834,383.00 | 6,956,031.72 | 37.763644 | 1,295,235.42 | 8.383545 |

| Cohort | Sum actual PHP | Sum absolute actual PHP (denominator) | Sum prediction PHP | Sum signed error PHP | Sum absolute error PHP |
| --- | ---: | ---: | ---: | ---: | ---: |
| Development | 222,872,214.59 | 222,872,214.59 | 225,678,688.56 | 2,806,473.97 | 185,428,256.09 |
| 2025 retrospective audit | 185,396,821.04 | 185,396,821.04 | 200,939,646.12 | 15,542,825.08 | 70,012,596.02 |

## Last-value 2025 retrospective monthly audit

| Month / lead | Actual PHP | Prediction PHP | Signed error PHP | Absolute error PHP | Direction |
| --- | ---: | ---: | ---: | ---: | --- |
| 2025-01 / 1 | 16,374,092.18 | 16,744,970.51 | 370,878.33 | 370,878.33 | overforecast |
| 2025-02 / 2 | 13,408,966.82 | 16,744,970.51 | 3,336,003.69 | 3,336,003.69 | overforecast |
| 2025-03 / 3 | 2,612,295.10 | 16,744,970.51 | 14,132,675.41 | 14,132,675.41 | overforecast |
| 2025-04 / 4 | 5,670,753.87 | 16,744,970.51 | 11,074,216.64 | 11,074,216.64 | overforecast |
| 2025-05 / 5 | 21,382,925.25 | 16,744,970.51 | -4,637,954.74 | 4,637,954.74 | underforecast |
| 2025-06 / 6 | 14,924,161.43 | 16,744,970.51 | 1,820,809.08 | 1,820,809.08 | overforecast |
| 2025-07 / 7 | 20,352,893.81 | 16,744,970.51 | -3,607,923.30 | 3,607,923.30 | underforecast |
| 2025-08 / 8 | 8,934,135.31 | 16,744,970.51 | 7,810,835.20 | 7,810,835.20 | overforecast |
| 2025-09 / 9 | 20,654,027.17 | 16,744,970.51 | -3,909,056.66 | 3,909,056.66 | underforecast |
| 2025-10 / 10 | 12,512,678.31 | 16,744,970.51 | 4,232,292.20 | 4,232,292.20 | overforecast |
| 2025-11 / 11 | 25,076,009.20 | 16,744,970.51 | -8,331,038.69 | 8,331,038.69 | underforecast |
| 2025-12 / 12 | 23,493,882.59 | 16,744,970.51 | -6,748,912.08 | 6,748,912.08 | underforecast |

| Cohort | Overforecast cases | Overforecast amount PHP | Underforecast cases | Underforecast amount PHP | Exact cases |
| --- | ---: | ---: | ---: | ---: | ---: |
| Development | 36 | 94,117,365.03 | 24 | 91,310,891.06 | 0 |
| 2025 retrospective audit | 7 | 42,777,710.55 | 5 | 27,234,885.47 | 0 |

Direction amounts are magnitudes; overforecast minus underforecast reconciles to signed error, and their sum reconciles to absolute error. Errors measure revenue forecasts, not excess units purchased or lost sales.

## Last-value development errors by calendar lead

| Lead months | n | Sum absolute actual PHP | MAE PHP | RMSE PHP | WAPE % | Normalized signed bias % |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 5 | 16,277,194.92 | 2,684,887.68 | 3,088,682.62 | 82.473906 | 15.539302 |
| 2 | 5 | 33,974,645.44 | 5,984,482.12 | 7,484,792.43 | 88.072768 | -44.645317 |
| 3 | 5 | 17,241,102.56 | 2,605,270.20 | 2,982,422.70 | 75.554048 | 9.079784 |
| 4 | 5 | 10,510,924.49 | 2,132,138.69 | 2,621,087.01 | 101.424888 | 78.923913 |
| 5 | 5 | 23,789,454.08 | 4,550,748.85 | 5,769,766.87 | 95.646349 | -20.945822 |
| 6 | 5 | 21,895,297.78 | 4,211,682.30 | 4,477,796.26 | 96.177781 | -14.106866 |
| 7 | 5 | 13,016,465.65 | 2,452,581.37 | 2,943,907.09 | 94.210727 | 44.482826 |
| 8 | 5 | 13,014,358.12 | 2,305,048.59 | 3,014,988.79 | 88.557905 | 44.506223 |
| 9 | 5 | 17,610,533.12 | 2,280,763.70 | 2,625,842.90 | 64.755669 | 6.791528 |
| 10 | 5 | 13,709,623.18 | 1,873,181.05 | 2,464,247.86 | 68.316285 | 37.177785 |
| 11 | 5 | 12,506,772.22 | 1,733,833.23 | 1,909,772.54 | 69.315776 | 50.370991 |
| 12 | 5 | 29,325,843.03 | 4,271,033.45 | 7,273,440.71 | 72.820301 | -35.870361 |

Five development errors per lead are not sufficient interval support. The saved last-value audit has no available 80% or 95% intervals; dependence also prevents a coverage guarantee. No interval is constructed here.

## Calendar display horizon

Calendar arithmetic from the latest source origin, December 2025, gives:

| Display | Start–end | Displayed months | Required leads | Entire range within evaluated leads 1–12? |
| --- | --- | ---: | --- | --- |
| Current company display | 2026-10–2026-12 | 3 | 10–12 | Yes |
| Current company display | 2026-10–2027-03 | 6 | 10–15 | No |
| Current company display | 2026-10–2027-09 | 12 | 10–21 | No |
| Original objective illustration | 2026-12–2027-11 | 12 | 12–23 | No |

Within-range calendar arithmetic does not approve a point or establish acceptable errors. These are horizon mappings only; no future forecast value is generated or displayed.

## Verification and limits

All ten declared source-artifact checksums and the raw input checksum passed. Decimal recomputation reconciles 441 original metric groups within PHP 0.01 and 0.000001 percentage points. In-memory checksum, duplicate-key, invalid-lead and zero-denominator failure probes passed without editing originals.

Run: `eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a`. Fact Delta version: 20. The supplied completeness review is inherited user attestation, not independent source completeness verification. Historical availability vintages remain unverified. The output remains `exploratory_evaluated_unpublished`; no new approval tolerance, release or procurement action is introduced.

Full-precision decimal strings, all configuration aggregates, keys, source hashes, recorded selection, formulas and limitations are retained in `scorecard.json`; source/code/command and reconciliation checks are in `derivation-receipt.json`. No evaluator or model code is imported.

Applied Data Analyst guidance plus analytics, database lineage, coding, testing and technology-stack skills. Root owns canonical explanation/paper integration; independent QA is separate from this self-verification.
