# Weather provider reliability screening — 8 October 2026

Historical agreement with supplied PAGASA station observations. **Experimental screening; no scientific/business approval or forecast activation.**

Period: 2023-01-01 to 2024-12-31; 12 station points, four per region; 8,772 station-days. Four model variants use two HTTP APIs.

Protocol was saved before API execution; see `PROTOCOL.md`, `protocol.json`, `source_profile.json`, retained URL/response-hash receipts and `report.json`.

## Declared percentages

Monthly rain agrees when the absolute error is at most max(25 mm, 20% of PAGASA total). Both series need every calendar day in a month. Daily temperature agrees within ±2°C against the **derived TMAX/TMIN midpoint**. Daily RH agrees within ±10 percentage points. Percentages are counts meeting those tolerances, not a universal provider accuracy rating.

| Provider/model | Temperature agreement (paired days) | RH agreement (paired days) | Rain agreement (complete paired months) | Temperature MAE / RMSE / bias °C | Monthly rain MAE / RMSE / bias mm |
|---|---:|---:|---:|---:|---:|
| NASA POWER / MERRA-2 meteorology proxy | 77.4% (8,769) | 88.4% (8,771) | 45.0% (278) | 1.33 / 1.68 / -0.29 | 78.64 / 114.30 / 2.86 |
| Open-Meteo archive / era5 | 97.4% (8,769) | 96.9% (8,771) | 31.3% (278) | 0.72 / 0.91 / -0.36 | 104.00 / 156.50 / -9.88 |
| Open-Meteo archive / era5_seamless | 86.2% (8,769) | 95.3% (8,771) | 31.3% (278) | 1.16 / 1.38 / -1.03 | 104.00 / 156.50 / -9.88 |
| Open-Meteo archive / ecmwf_ifs | 82.8% (8,769) | 96.7% (8,771) | 35.3% (278) | 1.32 / 1.50 / -1.27 | 86.26 / 124.91 / -14.34 |

Coverage and request results:

| Provider | Daily temperature / RH / rainfall coverage | Valid HTTP attempts / actual attempts this run | Successful station queries / planned | Cache reads |
|---|---:|---:|---:|---:|
| nasa_power | 100.0% / 100.0% / 100.0% | 12 / 12 (100.0%) | 12 / 12 | 0 |
| open_meteo_era5 | 100.0% / 100.0% / 100.0% | 12 / 12 (100.0%) | 12 / 12 | 0 |
| open_meteo_era5_seamless | 100.0% / 100.0% / 100.0% | 12 / 12 (100.0%) | 12 / 12 | 0 |
| open_meteo_ifs | 100.0% / 100.0% / 100.0% | 12 / 12 (100.0%) | 12 / 12 | 0 |

HTTP success is a bounded experiment, **not long-term availability or uptime**. Cached responses retain original attempt receipts. ERA5-Seamless rainfall shares ERA5 forcing and is not independent evidence.

## Common-population comparison

Only pairs available for every applicable provider are used here; this prevents different missing-data populations from silently changing comparisons.

- temperature_c: nasa_power 77.4% (n=8,769); open_meteo_era5 97.4% (n=8,769); open_meteo_era5_seamless 86.2% (n=8,769); open_meteo_ifs 82.8% (n=8,769)
- humidity_pct: nasa_power 88.4% (n=8,771); open_meteo_era5 96.9% (n=8,771); open_meteo_era5_seamless 95.3% (n=8,771); open_meteo_ifs 96.7% (n=8,771)
- monthly_rain: nasa_power 45.0% (n=278); open_meteo_era5 31.3% (n=278); open_meteo_era5_seamless 31.3% (n=278); open_meteo_ifs 35.3% (n=278)

## Region and station variation

| Provider | Region | Temperature agreement / n | Monthly rain agreement / n |
|---|---|---:|---:|
| nasa_power | Bicol | 90.9% / 2922 | 39.1% / 87 |
| nasa_power | CALABARZON | 60.6% / 2923 | 47.4% / 95 |
| nasa_power | MIMAROPA | 80.9% / 2924 | 47.9% / 96 |
| open_meteo_era5 | Bicol | 99.6% / 2922 | 25.3% / 87 |
| open_meteo_era5 | CALABARZON | 98.7% / 2923 | 36.8% / 95 |
| open_meteo_era5 | MIMAROPA | 93.9% / 2924 | 31.2% / 96 |
| open_meteo_era5_seamless | Bicol | 90.7% / 2922 | 25.3% / 87 |
| open_meteo_era5_seamless | CALABARZON | 85.5% / 2923 | 36.8% / 95 |
| open_meteo_era5_seamless | MIMAROPA | 82.4% / 2924 | 31.2% / 96 |
| open_meteo_ifs | Bicol | 82.0% / 2922 | 25.3% / 87 |
| open_meteo_ifs | CALABARZON | 87.8% / 2923 | 45.3% / 95 |
| open_meteo_ifs | MIMAROPA | 78.8% / 2924 | 34.4% / 96 |

| Provider | Station | Temperature agreement / n | Rain agreement / n | Incomplete rainfall months |
|---|---|---:|---:|---:|
| nasa_power | Ambulong | 64.6% / 731 | 41.7% / 24 | 0 |
| nasa_power | Sangley Point | 71.3% / 731 | 54.2% / 24 | 0 |
| nasa_power | Tayabas | 86.0% / 731 | 62.5% / 24 | 0 |
| nasa_power | Tanay | 20.4% / 730 | 30.4% / 23 | 1 |
| nasa_power | Calapan | 97.8% / 731 | 50.0% / 24 | 0 |
| nasa_power | San Jose | 45.6% / 731 | 37.5% / 24 | 0 |
| nasa_power | Romblon | 82.9% / 731 | 58.3% / 24 | 0 |
| nasa_power | Puerto Princesa | 97.3% / 731 | 45.8% / 24 | 0 |
| nasa_power | Daet | 96.2% / 731 | 50.0% / 24 | 0 |
| nasa_power | Legazpi | 83.5% / 729 | 53.3% / 15 | 9 |
| nasa_power | Masbate | 85.0% / 731 | 20.8% / 24 | 0 |
| nasa_power | Virac Synop | 98.8% / 731 | 37.5% / 24 | 0 |
| open_meteo_era5 | Ambulong | 99.6% / 731 | 33.3% / 24 | 0 |
| open_meteo_era5 | Sangley Point | 97.8% / 731 | 45.8% / 24 | 0 |
| open_meteo_era5 | Tayabas | 98.2% / 731 | 25.0% / 24 | 0 |
| open_meteo_era5 | Tanay | 99.3% / 730 | 43.5% / 23 | 1 |
| open_meteo_era5 | Calapan | 99.6% / 731 | 25.0% / 24 | 0 |
| open_meteo_era5 | San Jose | 81.7% / 731 | 33.3% / 24 | 0 |
| open_meteo_era5 | Romblon | 95.9% / 731 | 45.8% / 24 | 0 |
| open_meteo_era5 | Puerto Princesa | 98.5% / 731 | 20.8% / 24 | 0 |
| open_meteo_era5 | Daet | 98.9% / 731 | 8.3% / 24 | 0 |
| open_meteo_era5 | Legazpi | 100.0% / 729 | 33.3% / 15 | 9 |
| open_meteo_era5 | Masbate | 99.6% / 731 | 25.0% / 24 | 0 |
| open_meteo_era5 | Virac Synop | 99.7% / 731 | 37.5% / 24 | 0 |
| open_meteo_era5_seamless | Ambulong | 94.9% / 731 | 33.3% / 24 | 0 |
| open_meteo_era5_seamless | Sangley Point | 48.7% / 731 | 45.8% / 24 | 0 |
| open_meteo_era5_seamless | Tayabas | 99.6% / 731 | 25.0% / 24 | 0 |
| open_meteo_era5_seamless | Tanay | 98.9% / 730 | 43.5% / 23 | 1 |
| open_meteo_era5_seamless | Calapan | 75.6% / 731 | 25.0% / 24 | 0 |
| open_meteo_era5_seamless | San Jose | 67.9% / 731 | 33.3% / 24 | 0 |
| open_meteo_era5_seamless | Romblon | 95.9% / 731 | 45.8% / 24 | 0 |
| open_meteo_era5_seamless | Puerto Princesa | 90.2% / 731 | 20.8% / 24 | 0 |
| open_meteo_era5_seamless | Daet | 86.3% / 731 | 8.3% / 24 | 0 |
| open_meteo_era5_seamless | Legazpi | 93.0% / 729 | 33.3% / 15 | 9 |
| open_meteo_era5_seamless | Masbate | 84.3% / 731 | 25.0% / 24 | 0 |
| open_meteo_era5_seamless | Virac Synop | 99.3% / 731 | 37.5% / 24 | 0 |
| open_meteo_ifs | Ambulong | 94.9% / 731 | 50.0% / 24 | 0 |
| open_meteo_ifs | Sangley Point | 71.8% / 731 | 54.2% / 24 | 0 |
| open_meteo_ifs | Tayabas | 92.3% / 731 | 37.5% / 24 | 0 |
| open_meteo_ifs | Tanay | 91.9% / 730 | 39.1% / 23 | 1 |
| open_meteo_ifs | Calapan | 69.4% / 731 | 29.2% / 24 | 0 |
| open_meteo_ifs | San Jose | 78.4% / 731 | 33.3% / 24 | 0 |
| open_meteo_ifs | Romblon | 98.6% / 731 | 58.3% / 24 | 0 |
| open_meteo_ifs | Puerto Princesa | 68.9% / 731 | 16.7% / 24 | 0 |
| open_meteo_ifs | Daet | 86.0% / 731 | 12.5% / 24 | 0 |
| open_meteo_ifs | Legazpi | 74.1% / 729 | 20.0% / 15 | 9 |
| open_meteo_ifs | Masbate | 75.9% / 731 | 37.5% / 24 | 0 |
| open_meteo_ifs | Virac Synop | 91.8% / 731 | 29.2% / 24 | 0 |

## Data identity and interpretation limits

- Two purposively selected years and 12 stations; not random or exhaustive geographic coverage.
- Station points do not establish province/territory weather representativeness; inland, coastal, island and mountain errors may differ.
- PAGASA daily midpoint is a derived proxy, not an hourly-average observed temperature.
- Reanalysis/historical agreement does not test future forecasts, typhoon warnings, causal disease impact or incremental sales-model value.
- Thresholds are practical, predeclared analyst screening choices, not scientifically or business-approved reliability thresholds.
- Current provider availability, license terms and response freshness require operational review before runtime integration.
- Four model variants use TWO HTTP APIs. ERA5-Seamless combines ERA5-Land temperature/humidity with ERA5 rainfall; it is not independent corroboration. Pure ERA5-Land rainfall is unsupported and not requested. Reanalysis can assimilate stations: this is agreement, not fully independent ground-truth validation.
- Open-Meteo daily Asia/Manila; NASA explicitly LST (15-degree solar-time swath). PAGASA supplied documentation does not establish its daily observation/accumulation boundary. Daily alignment is approximate; no exact clock equivalence asserted.
- PAGASA -1 rainfall means <0.1 mm; lower bound zero; trace counts and maximum omitted <0.1 mm per trace day disclosed.
- PAGASA trace days in scope: 293; rainfall understatement from lower-bound trace handling is <29.3 mm pooled across all station-days, not one site's total.
- Raw supplied PAGASA records are not republished in these reports; station file hashes and derived paired metrics are retained.
- No dashboard fallback, warehouse publication, geographic mapping approval, model activation or procurement action occurs.

## Reproduce

```powershell
python -m services.analytics_service.jobs.evaluate_weather_providers --start 2023-01-01 --end 2024-12-31
python -m unittest services.tests.test_weather_provider_reliability
```

Use `--offline` to recompute from verified response caches. Responses and metrics are source-bound; rerunning live calls later can produce revised provider data.

Sources: [Open-Meteo archive documentation](https://open-meteo.com/en/docs/historical-weather-api), [NASA POWER daily documentation](https://power.larc.nasa.gov/docs/services/api/temporal/daily/).
