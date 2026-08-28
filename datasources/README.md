# Datasources

Store exported data, sample datasets, and source descriptions here.

Guidelines:
- Do not commit sensitive data or personal information.
- Use `.gitignore` to exclude large or private datasets, and reference them in this README.

## Recommended Structure

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

Keep raw exports unchanged. Put cleaned, standardized copies under `datasources/clean/` before loading them into the analytics workflow.

## Templates

| Template | Use |
|---|---|
| `templates/pagasa_historical_template.csv` | Clean PAGASA 2021-2024 historical weather reference data |
| `templates/doh_historical_template.csv` | Clean DOH 2021-2025 historical disease data |
| `templates/weather_api_observations_template.csv` | Clean provider-derived weather API observations by latitude/longitude |
| `templates/product_master_mapping.csv` | Product/SKU alias mapping approval |
| `templates/area_classification_mapping.csv` | Area, customer type, and business-line classification |

Follow `docs/EXTERNAL_DATA_PREPARATION_GUIDE.md` before adding PAGASA, DOH, or weather API files.
