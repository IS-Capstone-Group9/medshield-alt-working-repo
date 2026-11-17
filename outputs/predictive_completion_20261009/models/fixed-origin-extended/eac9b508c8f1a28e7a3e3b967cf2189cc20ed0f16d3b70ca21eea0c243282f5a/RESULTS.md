# Registered extended predictive experiment

Run: `eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a`. Status: `exploratory_evaluated_unpublished`.
Company monthly recorded net sales, PHP; same five development origins, leads 1–12, 2025 retrospective audit.
The original 15 configurations are retained and six exploratory candidates are added.

| Model | Dev n | Dev WAPE % | Dev bias % | Audit n | Audit WAPE % | Audit MAE PHP |
|---|---:|---:|---:|---:|---:|---:|
| last_value | 60 | 83.199360 | 1.259230 | 12 | 37.763644 | 5,834,383.001667 |
| seasonal_naive | 60 | 93.896222 | 46.625559 | 12 | 72.890948 | 11,261,458.430000 |
| mean_3 | 60 | 95.125671 | 29.733140 | 12 | 59.628313 | 9,212,416.360556 |
| mean_6 | 60 | 93.507915 | 35.480379 | 12 | 68.136824 | 10,526,958.881111 |
| ets_none | 60 | 92.744543 | 56.651692 | 12 | 67.969011 | 10,501,032.199995 |
| ets_damped | 60 | 100.303092 | 62.958715 | 12 | 67.487871 | 10,426,697.234025 |
| prophet_cp0.01_sp0.1 | 60 | 93.769183 | 58.877907 | 12 | 72.467545 | 11,196,043.735292 |
| prophet_cp0.01_sp1.0 | 60 | 94.347115 | 60.258385 | 12 | 72.182384 | 11,151,987.094871 |
| prophet_cp0.01_sp10.0 | 60 | 93.542363 | 59.331378 | 12 | 72.105184 | 11,140,059.960805 |
| prophet_cp0.05_sp0.1 | 60 | 94.529614 | 60.343878 | 12 | 72.612682 | 11,218,467.027590 |
| prophet_cp0.05_sp1.0 | 60 | 94.634118 | 60.577057 | 12 | 72.162100 | 11,148,853.270395 |
| prophet_cp0.05_sp10.0 | 60 | 94.817580 | 60.964532 | 12 | 72.228841 | 11,159,164.568499 |
| prophet_cp0.1_sp0.1 | 60 | 94.215044 | 59.903717 | 12 | 72.567798 | 11,211,532.501051 |
| prophet_cp0.1_sp1.0 | 60 | 94.855291 | 60.913205 | 12 | 72.203635 | 11,155,270.254011 |
| prophet_cp0.1_sp10.0 | 60 | 94.969146 | 60.979939 | 12 | 72.373751 | 11,181,552.735189 |
| sarima_ar_seasonal | 60 | 106.649572 | 62.262874 | 12 | 67.438112 | 10,419,009.696579 |
| sarima_airline | 60 | 87.879445 | 44.278418 | 12 | 63.376322 | 9,791,473.905371 |
| ridge_direct_a1 | 60 | 120.210555 | 67.570268 | 12 | 73.317874 | 11,327,417.246424 |
| ridge_direct_a10 | 60 | 111.522889 | 70.585978 | 12 | 72.664743 | 11,226,510.272195 |
| ridge_recursive_a1 | 60 | 111.015780 | 66.108634 | 12 | 70.400407 | 10,876,676.332344 |
| ridge_recursive_a10 | 60 | 106.554455 | 64.698463 | 12 | 69.805660 | 10,784,789.509069 |

Selection: {"audit_previously_inspected": true, "criteria": {"absolute_normalized_bias_max": 10, "critical_horizon_mae_deterioration_max": 0.1, "relative_mae_rmse_deterioration_max": 0.1, "relative_wape_improvement": 0.05, "status": "experimental_not_business_approval"}, "frozen_before_audit": true, "model_id": "last_value", "reason": "No challenger qualifies; retain best complete benchmark candidate", "stage": "development_only", "status": "exploratory_candidate_only"}

## Limitations

- Extension was designed after the original retrospective 2025 audit was inspected.
- Selection uses development only, but 2025 remains a retrospective audit and cannot be an untouched final test.
- Any revised recipe requires later untouched accepted actuals before promotion.
- Historical issue-time availability is unverified because inputs are a revised snapshot.
- 2020–2025 reporting completeness is inherited user attestation, not independent source verification.
- Company PHP revenue is not SKU quantity demand, disease causation or operational replenishment.
- Five development origins are dependent and provide too little per-lead support for empirical intervals.
- Leads 1–12 do not cover an October 2026–September 2027 display from a December 2025 origin.
- Existing comparison criteria are experimental; business error tolerance remains unset.
- SARIMA nonconvergence produces unavailable predictions rather than an accepted fitted result.

## Numerical/model warnings

- {"category": "UserWarning", "count": 1, "message": "Non-invertible starting seasonal moving average Using zeros as starting parameters."}
- {"category": "UserWarning", "count": 5, "message": "Too few observations to estimate starting parameters for seasonal ARMA. All parameters except for variances will be set to zeros."}

## Unavailable candidates


Primary method documentation: [statsmodels SARIMAX](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.sarimax.SARIMAX.html), [maximum likelihood fitting](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.sarimax.SARIMAX.fit.html), [ridge objective](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html).
These describe methods; the grid, origin-local transform, minimum examples and nonconvergence policy are project choices.
