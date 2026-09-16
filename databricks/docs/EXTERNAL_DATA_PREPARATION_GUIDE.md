# External Data Preparation Guide

## Purpose

Use this guide when preparing PAGASA, DOH, and weather API data before loading it into the MedShield analytics workflow.

## Folder Rule

Do not mix raw files and cleaned files.

Recommended local structure:

```text
datasources/
  raw/
    pagasa/
    doh/
    weather_api/
  clean/
    pagasa/
    doh/
    weather_api/
  templates/
```

Raw files may contain private or large source exports, so do not commit them unless the group confirms they are safe to publish. Commit only templates, documentation, and small non-sensitive sample files.

## Required Clean Files

| Dataset | Current coverage | Clean file target | Required grain |
|---|---|---|---|
| PAGASA | Observed 2017-2024; requested 2025 is absent | `datasources/clean/pagasa/pagasa_historical_daily_clean.csv` and `pagasa_historical_monthly_clean.csv` | Day and month by station |
| DOH | Declared 2018-2026; 2026 partial through September 13 | `datasources/clean/doh/doh_historical_monthly_clean.csv` | Onset month by disease, classification, and province |
| Weather API | Provider-supported historical range | `datasources/clean/weather_api/weather_api_observations_clean.csv` | Date by target region coordinates |

## Minimum PAGASA Fields

Use `datasources/templates/pagasa_historical_template.csv`.

Required columns:

- `date`
- `year`
- `month`
- `region`
- `province_city`
- `station_name`
- `rainfall_mm`
- `temperature_mean_c`
- `humidity_mean_pct`
- `wind_speed_mean_kph`
- `weather_indicator`
- `source`
- `source_file`
- `notes`

## Minimum DOH Fields

Use `datasources/templates/doh_historical_template.csv`.

Required columns:

- `date`
- `year`
- `month`
- `region`
- `province_city`
- `disease_name`
- `case_count`
- `death_count`
- `population`
- `disease_intensity_indicator`
- `source`
- `source_file`
- `notes`

## Minimum Weather API Fields

Use `datasources/templates/weather_api_observations_template.csv`.

Required columns:

- `date`
- `year`
- `month`
- `target_region`
- `province_city`
- `latitude`
- `longitude`
- `provider`
- `rainfall_mm`
- `temperature_mean_c`
- `humidity_mean_pct`
- `wind_speed_mean_kph`
- `severity_proxy`
- `source_url`
- `notes`

## Cleaning Steps

1. Keep the raw export unchanged.
2. Create a clean copy using the correct template.
3. Standardize dates to `YYYY-MM-DD`.
4. Standardize region and province/city spelling.
5. Keep units explicit in the column name.
6. Add `source`, `source_file`, or `source_url`.
7. Leave unavailable numeric values blank, not zero.
8. Add notes when a value is estimated, aggregated, or unavailable.
9. Run data profiling before joining to sales.
10. Join external data only to approved territory mappings.

## Current execution

The primary Databricks workflow now reads the unchanged raw files from the
Unity Catalog volume and runs these notebooks in order:

```text
external_restart/00_external_setup.py
external_restart/01_external_bronze.py
external_restart/02_external_silver.py
external_restart/03_external_gold.py
```

The local commands below remain a reproducibility and profiling path. Their
clean CSV outputs are not required by the Databricks-native workflow.

Run from the repository root:

```powershell
python -m services.analytics_service.jobs.prepare_external_sources
python -m services.analytics_service.jobs.prepare_regression_sources
```

The September 14, 2026 run read 4,484,337 DOH source rows from 19
disease-specific CSV files and preserved 4,608,155 reported cases in 138,673
monthly disease/province/classification rows. It produced 1,787 unique
disease/territory/month candidates for 2018-2025. All remain join-ineligible while
`external_mapping_status` is pending.

The same run read 161,742 valid PAGASA station-days from 125 files and 64
stations. It produced 5,314 station-month rows: 5,214 have complete rainfall
coverage and 100 are retained as incomplete. The supplied files end in 2024;
official 2025 PAGASA values are not inferred.

## Validation Checks

Before loading external data:

1. Coverage matches the documented period.
2. There are no impossible dates.
3. Numeric fields are numeric.
4. Missing values are counted.
5. Region names match the approved area mapping.
6. Weather API data is labeled by provider.
7. PAGASA fields are not mixed with weather API proxy fields.
8. DOH fields are not described as live alerts.

## Paper Wording

Use this wording:

> The external datasets were prepared as historical contextual candidates. The supplied official PAGASA station records cover 2017 to 2024; no official 2025 observations were inferred. The new DOH extract declares 2018 to 2026 coverage, with 2026 treated as partial through September 13, 2026. DOH values represent retrospectively reported surveillance cases by onset month and classification, not confirmed incidence or live alerts. External signals remain excluded from forecasting until geography and medical-product mappings are approved.
