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
| PAGASA | 2021-2024 | `datasources/clean/pagasa/pagasa_historical_clean.csv` | Date or month by location |
| DOH | 2021-2025 | `datasources/clean/doh/doh_historical_clean.csv` | Date or month by disease and location |
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

> The external datasets were prepared as historical contextual signals. PAGASA records were used as official historical weather reference data for 2021 to 2024. DOH records were used as historical disease signal data for 2021 to 2025. Weather API records collected by latitude and longitude were treated as provider-derived weather proxy observations, not as official PAGASA alerts.
