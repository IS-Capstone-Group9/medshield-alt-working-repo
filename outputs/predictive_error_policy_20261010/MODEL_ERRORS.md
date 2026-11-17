# Predictive error policy and model review — 10 October 2026

Report both **MAE in PHP** and **WAPE %** on identical forecast cases. Use RMSE, signed bias and separate overforecast/underforecast errors to diagnose the result. This is a presentation derivative of the retained 21-recipe experiment; it does not refit, tune, reselect, approve or assess new 2026 accuracy.

The user endorsed equal provisional research weights of **1 for overforecast absolute error and 1 for underforecast absolute error**, without intentionally shifting forecasts upward or downward. These weights are a modelling/reporting convention, not measured business costs or inventory loss.

**Both acceptance limits remain unset:** `max_mae_php = null`, `max_wape_percent = null`. `tolerance_status = not_assessed_thresholds_missing`; publication approval is false. Both limits would be required for a future joint cohort assessment. A mean-error limit would not be a cap on each monthly miss. These artifacts implement no future assessment or approval.

Target: company monthly recorded net sales in PHP. Signed error = prediction minus actual. MAE = sum(|error|)/n; RMSE = sqrt(sum(error²)/n); WAPE = 100 × sum(|error|)/sum(|actual|); normalized bias = 100 × sum(error)/sum(|actual|). WAPE is an error rate, not accuracy = 100 − WAPE. An empty cohort has unavailable metrics; a zero actual denominator has unavailable percentage metrics.

Development uses 60 origin-target pairs across 24 distinct months and five dependent origins. The 2025 audit uses 12 months from one origin and was previously inspected; it is retrospective, not an untouched test. All recipes use the same keys. Original recipe order and selection are preserved.

## Development

| Recipe | n | MAE PHP | WAPE % | RMSE PHP | Signed bias % | Over count / amount PHP | Under count / amount PHP | Largest absolute miss PHP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| last_value | 60 | 3,090,470.93 | 83.199360 | 4,300,604.37 | 1.259230 | 36 / 94,117,365.03 | 24 / 91,310,891.06 | 15,849,220.01 |
| seasonal_naive | 60 | 3,487,809.81 | 93.896222 | 5,434,895.69 | 46.625559 | 40 / 156,592,002.10 | 20 / 52,676,586.28 | 15,849,220.01 |
| mean_3 | 60 | 3,533,478.17 | 95.125671 | 4,649,384.26 | 29.733140 | 39 / 139,137,799.08 | 21 / 72,870,891.39 | 14,983,997.66 |
| mean_6 | 60 | 3,473,386.01 | 93.507915 | 4,419,745.38 | 35.480379 | 45 / 143,739,533.77 | 15 / 64,663,627.00 | 14,205,356.42 |
| ets_none | 60 | 3,445,030.30 | 92.744543 | 4,264,377.52 | 56.651692 | 55 / 166,481,349.54 | 5 / 40,220,468.41 | 13,292,435.72 |
| ets_damped | 60 | 3,725,795.38 | 100.303092 | 4,511,523.75 | 62.958715 | 53 / 181,932,602.48 | 7 / 41,615,120.15 | 13,048,738.30 |
| prophet_cp0.01_sp0.1 | 60 | 3,483,090.93 | 93.769183 | 4,179,834.10 | 58.877907 | 52 / 170,103,975.63 | 8 / 38,881,480.23 | 13,374,762.98 |
| prophet_cp0.01_sp1.0 | 60 | 3,504,558.43 | 94.347115 | 4,196,167.55 | 60.258385 | 52 / 172,286,351.90 | 8 / 37,987,153.81 | 13,533,914.30 |
| prophet_cp0.01_sp10.0 | 60 | 3,474,665.62 | 93.542363 | 4,171,161.12 | 59.331378 | 52 / 170,356,547.08 | 8 / 38,123,389.98 | 13,522,221.56 |
| prophet_cp0.05_sp0.1 | 60 | 3,511,337.42 | 94.529614 | 4,187,454.57 | 60.343878 | 53 / 172,584,991.49 | 7 / 38,095,253.72 | 13,365,229.35 |
| prophet_cp0.05_sp1.0 | 60 | 3,515,219.25 | 94.634118 | 4,205,644.29 | 60.577057 | 52 / 172,961,291.79 | 8 / 37,951,862.97 | 13,547,905.54 |
| prophet_cp0.05_sp10.0 | 60 | 3,522,034.02 | 94.817580 | 4,206,001.87 | 60.964532 | 52 / 173,597,522.35 | 8 / 37,724,519.02 | 13,501,221.56 |
| prophet_cp0.1_sp0.1 | 60 | 3,499,652.58 | 94.215044 | 4,179,654.78 | 59.903717 | 53 / 171,743,948.11 | 7 / 38,235,206.50 | 13,393,528.13 |
| prophet_cp0.1_sp1.0 | 60 | 3,523,434.78 | 94.855291 | 4,210,355.22 | 60.913205 | 52 / 173,582,347.35 | 8 / 37,823,739.42 | 13,531,789.43 |
| prophet_cp0.1_sp10.0 | 60 | 3,527,663.96 | 94.969146 | 4,216,057.43 | 60.979939 | 52 / 173,783,589.67 | 8 / 37,876,248.14 | 13,544,444.88 |
| sarima_ar_seasonal | 60 | 3,961,537.71 | 106.649572 | 4,497,831.88 | 62.262874 | 48 / 188,229,454.05 | 12 / 49,462,808.61 | 10,553,241.91 |
| sarima_airline | 60 | 3,264,314.43 | 87.879445 | 4,277,834.50 | 44.278418 | 49 / 147,271,577.79 | 11 / 48,587,287.92 | 15,285,679.99 |
| ridge_direct_a1 | 60 | 4,465,265.44 | 120.210555 | 5,280,350.98 | 67.570268 | 47 / 209,255,639.63 | 13 / 58,660,286.72 | 12,149,246.42 |
| ridge_direct_a10 | 60 | 4,142,558.88 | 111.522889 | 4,745,588.72 | 70.585978 | 51 / 202,935,032.78 | 9 / 45,618,500.15 | 11,962,153.61 |
| ridge_recursive_a1 | 60 | 4,123,722.12 | 111.015780 | 4,647,192.29 | 66.108634 | 49 / 197,380,551.54 | 11 / 50,042,775.72 | 11,512,793.41 |
| ridge_recursive_a10 | 60 | 3,958,004.57 | 106.554455 | 4,442,914.49 | 64.698463 | 49 / 190,837,585.68 | 11 / 46,642,688.63 | 10,656,415.49 |

## 2025 retrospective audit

| Recipe | n | MAE PHP | WAPE % | RMSE PHP | Signed bias % | Over count / amount PHP | Under count / amount PHP | Largest absolute miss PHP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| last_value | 12 | 5,834,383.00 | 37.763644 | 6,956,031.72 | 8.383545 | 7 / 42,777,710.55 | 5 / 27,234,885.47 | 14,132,675.41 |
| seasonal_naive | 12 | 11,261,458.43 | 72.890948 | 13,000,988.08 | -72.890948 | 0 / 0.00 | 12 / 135,137,501.16 | 22,995,568.20 |
| mean_3 | 12 | 9,212,416.36 | 59.628313 | 10,647,446.50 | -52.845691 | 2 / 6,287,382.72 | 10 / 104,261,613.60 | 17,790,793.35 |
| mean_6 | 12 | 10,526,958.88 | 68.136824 | 12,165,944.39 | -65.145859 | 1 / 2,772,577.33 | 11 / 123,550,929.25 | 19,691,136.77 |
| ets_none | 12 | 10,501,032.20 | 67.969011 | 12,194,034.95 | -65.947644 | 1 / 1,873,775.36 | 11 / 124,138,611.04 | 20,999,700.07 |
| ets_damped | 12 | 10,426,697.23 | 67.487871 | 12,335,068.27 | -66.634555 | 1 / 791,010.26 | 11 / 124,329,356.55 | 20,540,744.95 |
| prophet_cp0.01_sp0.1 | 12 | 11,196,043.74 | 72.467545 | 12,952,644.19 | -72.127871 | 1 / 314,872.86 | 11 / 134,037,651.97 | 21,929,298.77 |
| prophet_cp0.01_sp1.0 | 12 | 11,151,987.09 | 72.182384 | 12,928,195.13 | -72.046690 | 1 / 125,786.28 | 11 / 133,698,058.86 | 22,047,881.30 |
| prophet_cp0.01_sp10.0 | 12 | 11,140,059.96 | 72.105184 | 12,916,026.39 | -71.958452 | 1 / 136,018.13 | 11 / 133,544,701.40 | 22,034,867.39 |
| prophet_cp0.05_sp0.1 | 12 | 11,218,467.03 | 72.612682 | 12,976,769.23 | -72.317756 | 1 / 273,391.58 | 11 / 134,348,212.75 | 21,960,534.04 |
| prophet_cp0.05_sp1.0 | 12 | 11,148,853.27 | 72.162100 | 12,924,999.86 | -72.023571 | 1 / 128,413.90 | 11 / 133,657,825.34 | 22,044,767.92 |
| prophet_cp0.05_sp10.0 | 12 | 11,159,164.57 | 72.228841 | 12,935,956.16 | -72.105206 | 1 / 114,607.56 | 11 / 133,795,367.26 | 22,059,208.24 |
| prophet_cp0.1_sp0.1 | 12 | 11,211,532.50 | 72.567798 | 12,969,170.21 | -72.263541 | 1 / 282,040.73 | 11 / 134,256,349.28 | 21,948,402.53 |
| prophet_cp0.1_sp1.0 | 12 | 11,155,270.25 | 72.203635 | 12,931,663.39 | -72.072454 | 1 / 121,602.60 | 11 / 133,741,640.45 | 22,052,501.90 |
| prophet_cp0.1_sp10.0 | 12 | 11,181,552.74 | 72.373751 | 12,959,317.88 | -72.277239 | 1 / 89,464.99 | 11 / 134,089,167.84 | 22,087,210.37 |
| sarima_ar_seasonal | 12 | 10,419,009.70 | 67.438112 | 12,152,629.14 | -63.335951 | 2 / 3,802,637.99 | 10 / 121,225,478.37 | 20,576,488.42 |
| sarima_airline | 12 | 9,791,473.91 | 63.376322 | 11,464,941.12 | -61.317873 | 1 / 1,908,149.65 | 11 / 115,589,537.22 | 20,529,461.99 |
| ridge_direct_a1 | 12 | 11,327,417.25 | 73.317874 | 12,783,853.38 | -61.457620 | 2 / 10,994,266.77 | 10 / 124,934,740.19 | 20,195,677.70 |
| ridge_direct_a10 | 12 | 11,226,510.27 | 72.664743 | 12,667,058.67 | -62.742256 | 2 / 9,197,987.24 | 10 / 125,520,136.03 | 20,433,459.66 |
| ridge_recursive_a1 | 12 | 10,876,676.33 | 70.400407 | 12,321,155.13 | -60.222552 | 2 / 9,434,709.76 | 10 / 121,085,406.23 | 20,868,508.84 |
| ridge_recursive_a10 | 12 | 10,784,789.51 | 69.805660 | 12,252,973.38 | -61.191235 | 2 / 7,985,435.03 | 10 / 121,432,039.08 | 20,273,424.74 |

## Directional reconciliation and interpretation

The inherited selected recipe `last_value` has 2025 audit MAE **PHP 5,834,383.00**, WAPE **37.763644%** and normalized signed bias **8.383545%**. Its 7 overforecasts total PHP 42,777,710.55; 5 underforecasts total PHP 27,234,885.47. Their difference is signed error PHP 15,542,825.08, while their sum is absolute error PHP 70,012,596.02.

Positive and negative errors can cancel in bias while large misses remain. The hand-calculable smoke example uses actuals 1,000/1,000 and predictions 1,100/900: bias is zero, but MAE is 100, WAPE is 10% and absolute error totals 200. Therefore bias alone cannot establish accuracy.

These are revenue prediction errors. Overforecast is not measured excess stock, underforecast is not measured lost sales, and equal weights do not establish equal monetary consequences. Physical inventory, service and expiry evidence would be needed for those claims.

2026 actuals remain unavailable in this frozen evidence. No 2026 error or tolerance assessment is produced. The new policy does not replace the old experimental selection criteria or transfer training permission into publication approval.

All ten source-artifact checksums, the frozen input and sidecar, and five evaluated adapter-code hashes were verified before derivation. Decimal recomputation reconciles 42 aggregate metric groups (210 values) within PHP 0.01 and 0.000001 percentage points. Full precision, sums, keys, identity and smoke evidence are retained in the JSON/receipt. The recorded UTC/Manila derivation time is not an approval timestamp.
