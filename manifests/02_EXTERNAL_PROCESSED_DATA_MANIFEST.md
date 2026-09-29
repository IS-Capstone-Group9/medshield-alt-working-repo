# External Processed Data Manifest

## External integration status

| Field | Value |
|---|---|
| Policy | `external_sources_clean_v1_20260914` |
| Publication status | `CANDIDATE_ONLY` |
| Area mapping SHA-256 | `a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949` |
| External join ready | No |

The external integration gate is closed because territory-to-external mappings remain pending, official PAGASA 2025 station data is absent, and the product master has not approved medical-demand SKUs.

## DOH disease surveillance

| Measure | Reported transformed value |
|---|---:|
| Declared coverage | 2018–2026 |
| Observed coverage | 2017–2026 |
| Latest onset date | 2026-09-13 |
| 2026 status | Partial through 2026-09-13 |
| Source rows | 4,484,337 |
| Valid rows | 4,484,337 |
| Reported cases | 4,608,155 |
| Historical monthly clean rows | 138,673 |
| Sales-territory candidate rows | 1,787 |
| Partial-2026 rows | 315,295 |
| Missing-province rows | 1,437 |
| Discarded rows | 25,151 |
| Classification-review rows | 316 |
| Rows outside declared years | 300,540 |

The report covers 19 disease-specific source files. Some disease files include 2017 observations even though the supplied directory is described as 2018–2026. The 2026 records are incomplete and cannot be compared with full prior years without a partial-period adjustment.

Reported outputs:

| Output | SHA-256 | Checkout status |
|---|---|---|
| `datasources/clean/doh/doh_historical_monthly_clean.csv` | `537d30065559ba95e0281394a34055925a515a2b3238a18715f47da73a4a0cef` | File absent; report present |
| `datasources/clean/doh/doh_sales_territory_monthly_candidate.csv` | `482e4b80a21699c8803ffc568644f26c12f0d8f8dc3541ce4c56e8f71c8372df` | File absent; report present |

## PAGASA station observations

| Measure | Reported transformed value |
|---|---:|
| Observed coverage | 2017–2024 |
| Requested coverage | 2017–2025 |
| 2025 status | Missing from supplied source |
| Source files | 125 |
| Stations | 57 |
| Source rows | 161,744 |
| Valid-date/daily clean rows | 161,742 |
| Monthly clean rows | 5,314 |
| Invalid-date rows | 2 |
| Mapping-review rows | 7 |
| Rainfall trace rows | 9,860 |
| Derived mean-temperature rows | 76,180 |

The cleaning audit also records missing-value sentinels and a small number of out-of-range temperature and humidity values. Station-to-territory mapping remains under review.

Reported outputs:

| Output | SHA-256 | Checkout status |
|---|---|---|
| `datasources/clean/pagasa/pagasa_historical_daily_clean.csv` | `2770ff49c9334f93be75531a82b3d4fcdfb537bba3bb323b43b1fb7b510b2c91` | File absent; report present |
| `datasources/clean/pagasa/pagasa_historical_monthly_clean.csv` | `7d1784f9300c018405b26c511f70d0957685d87cd22c68cee742dffbe95e2aab` | File absent; report present |
| `datasources/clean/pagasa/pagasa_station_territory_review.csv` | `7a67635b29384ad904e0ba1d4f1018e51fa3017c04d520012e42f6e3c549713a` | File absent; report present |

## NASA POWER weather proxy

| Measure | Artifact value |
|---|---:|
| Provider | NASA POWER |
| Coverage | 2025-01-01 to 2025-12-31 |
| Areas | 9 |
| Daily rows | 3,285 |
| Monthly rows | 108 |
| Refreshed | 2026-09-02T22:32:57.684795+08:00 |

Areas: Batangas, Camarines Norte, Camarines Sur, Cavite, Laguna, Marinduque, Metro Manila, Quezon, and Rizal.

This artifact is a weather-severity proxy used for a bounded 0–20% planning scenario. It is not official PAGASA RSI, not a typhoon warning, and not evidence that weather caused pharmaceutical demand.

## Supporting artifacts

- `outputs/external_sources/external_source_cleaning_report.json`
- `data/medshield/processed/weather_signals.json`

