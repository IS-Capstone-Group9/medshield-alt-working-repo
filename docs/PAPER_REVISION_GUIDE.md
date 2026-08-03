# Paper Revision Guide - System Changes to Reflect

Use this checklist when revising the capstone paper so the manuscript matches the current MedShield system implementation. This guide is based on the current repository implementation and documentation, especially `docs/IMPLEMENTATION.md`, `docs/ANALYTICS.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, and `docs/SETUP.md`.

## Revision Priority

| Priority | Paper Area | Why It Needs Revision |
|---|---|---|
| High | System architecture and implementation | The system now has a TypeScript gateway, Python analytics/product services, Supabase warehouse tables, local fallback behavior, authentication, sales ingestion, and weather validation. |
| High | Data pipeline and database design | The current system is no longer only a dashboard over static data. It now includes raw staging, cleaned facts, ETL lineage, model-output tables, and processed local artifacts. |
| High | Data preprocessing / data cleaning | Uploaded `.xlsx` and `.csv` sales files are cleaned by the backend pipeline before display or warehouse write. |
| High | Weather data scope | NASA POWER and Open-Meteo are implemented as historical meteorological validation/backfill sources. They must be described as proxies, not official PAGASA RSI or typhoon warnings. |
| Medium | UI and user workflows | The frontend now has login/session handling, View Sales Data, Data Upload, Weather API Validation, audit log, pagination, filters, and computation cards. |
| Medium | Testing and validation | The paper should mention unit tests, frontend build, backend build, API validation, and manual QA expectations. |
| Medium | Security and deployment limitations | The system uses bearer-token auth locally, service-role Supabase writes server-side only, and has production hardening requirements. |

## Current System Summary to Use in the Paper

MedShield is now implemented as a business analytics decision-support system with:

- A Next.js + TypeScript frontend dashboard.
- A TypeScript API gateway in `backend/`.
- Python Flask analytics and product microservices in `services/`.
- Supabase PostgreSQL warehouse migrations and seed data.
- Authentication through Supabase Auth when configured, with local fallback auth for demo use.
- Server-side upload and cleaning of MedShield sales `.xlsx` and `.csv` files.
- A canonical transaction view showing all 13 standardized sales columns.
- Year-aware ingestion so uploading one year replaces only that year instead of overwriting all history.
- Daily weather validation and monthly weather-to-sales planning aggregates using NASA POWER or Open-Meteo.
- Local fallback artifacts under `data/medshield/processed` when Supabase warehouse writes are unavailable.

## Chapter 1 - Problem, Scope, and Objectives

Revise the scope to reflect that the system is not only a static reporting dashboard.

### Add or Update

- State that the system supports pharmaceutical sales analytics, product prioritization, territory analysis, inventory planning support, and external weather/disease signal validation.
- Mention that uploaded sales files can be raw or messy and are cleaned before becoming decision-support data.
- Clarify that weather data is used as a supporting planning signal, not as official warning data.
- Add that the system includes a validation view for checking weather API coverage before using the signal in planning.

### Avoid Claiming

- Do not claim that NASA POWER or Open-Meteo replaces PAGASA.
- Do not claim causal proof that weather changes sales demand.
- Do not claim full production SaaS readiness unless production controls are completed.

## Chapter 2 - Review of Related Literature / Related Systems

Add references or discussion for the implemented system topics.

### Add or Update

- Data cleaning and ETL pipelines for decision-support systems.
- Pharmaceutical sales analytics and demand planning.
- ABC/Pareto product classification.
- Time-series forecasting and external regressors.
- Weather or climate data as contextual demand planning signals.
- NASA POWER and Open-Meteo as historical meteorological datasets.
- Official PAGASA/DOH data as preferred authoritative sources for weather/disease signals when available.

### Needed Alignment

If the paper discusses PAGASA RSI or official typhoon alerts, separate that from the implemented `rainfall_severity_proxy`. The implemented proxy is a bounded planning feature derived from rainfall, rainy days, humidity, temperature, and wind features.

## Chapter 3 - Methodology

Revise the methodology to match the actual pipeline and system workflow.

### Data Sources

| Source | Current System Use | Paper Revision Needed |
|---|---|---|
| `data/medshield/raw/sales/Sales Report.xlsx` / yearly `.csv` files under `data/medshield/raw/sales/yearly_csv/` | Main internal sales source, 2021-2025, transaction-level rows. | Explain that sales are ingested from workbook or CSV, cleaned, standardized, and stored at transaction grain. |
| Supabase PostgreSQL | Warehouse source of truth when configured. | Add database persistence, staging, facts, views, and ETL lineage. |
| NASA POWER Daily API | Historical meteorological backfill and validation. | Describe as external weather validation/backfill only. |
| Open-Meteo Historical API | Secondary historical fallback/validation. | Describe as backup or comparison source. |
| DOH/PAGASA | Official disease/weather signals preferred when available. | Keep as authoritative external sources in scope, even if the implemented demo currently uses NASA/Open-Meteo for weather validation. |

### Data Cleaning Pipeline

Add a subsection describing the implemented sales cleaning process:

1. Accept `.xlsx` or `.csv` upload from Data Upload or View Sales Data.
2. Detect whether the uploaded file is raw or already cleaned.
3. Map source headers to the 13 canonical MedShield sales columns.
4. Preserve raw values in staging.
5. Standardize delivery dates, areas, product names, DR numbers, numeric fields, costs, discounts, trade prices, net income, and margin percentage.
6. Generate row quality status: valid, warning, or rejected.
7. Flag exact duplicates using source hashes.
8. Generate SKU/product counts from unique standardized products.
9. Replace only the year(s) included in the upload.
10. Publish cleaned rows to local processed artifacts and Supabase warehouse when the service-role connection is configured.

### Weather Methodology

Add a subsection explaining:

- Daily observations are fetched because sales delivery records are daily.
- Monthly aggregates are used for planning/regressor summaries.
- The weather validation page reports provider, period, territory, row counts, sales-matched rows, severity proxy, alert level, and planning uplift.
- The rainfall-sales association is exploratory and descriptive. It is not a causal model.

## Chapter 4 - System Design and Implementation

This chapter needs the largest update.

### Architecture Revision

Update the architecture diagram and narrative to include:

| Layer | Implemented Component |
|---|---|
| Frontend | Next.js, React, TypeScript dashboard |
| Gateway | TypeScript backend API in `backend/` |
| Services | Python Flask analytics and product services |
| Database | Supabase PostgreSQL warehouse |
| Local fallback | JSON/GZIP processed data under `data/medshield/processed` |
| External APIs | NASA POWER Daily and Open-Meteo Historical, called by backend/service logic |
| Auth | Gateway bearer sessions with Supabase/local fallback |

### Database Revision

Add or revise the ERD/data model section to include:

- `dim_date`
- `dim_area`
- `dim_product`
- `dim_source_system`
- `dim_model`
- `stg_sales_transactions`
- `fact_sales_transactions`
- `fact_weather_signal`
- `fact_disease_signal`
- `etl_pipeline_run`
- `etl_source_extract`
- `fact_monthly_sales`
- `fact_area_summary`
- `fact_product_summary`
- `fact_year_summary`
- `fact_seasonality`
- DSS model-output facts such as forecast, priority, inventory recommendation, allocation recommendation, decision alert, and model evaluation tables.

Mention that `004_dss_schema.sql` adds the DSS layer and `005_sales_ingestion_weather.sql` adds sales ingestion, canonical transaction publication, aggregate refresh, weather provenance, and restricted access policies.

### UI Revision

Update screenshots and descriptions for these implemented views:

- Login page and session restore.
- Dashboard overview.
- Data Upload page.
- View Sales Data page.
- Weather API Validation page.
- Audit Log panel.

For View Sales Data, describe:

- Server-backed cleaned transaction table.
- All 13 MedShield columns.
- Year filter.
- Quality filter.
- Search.
- Pagination.
- Rows-per-page selector.
- Upload Messy XLSX/CSV button.
- Computation options: overview KPIs, sums, averages, counts/SKU.

For Weather API Validation, describe:

- Provider selector: NASA POWER or Open-Meteo Archive.
- Territory selector, including All Territories.
- Year selector.
- Validation grain: Daily API Rows or Monthly Planning Aggregate.
- Refresh Weather button.
- Summary cards and validation table.

### API Revision

Add these endpoint groups to the implementation chapter:

| Endpoint Group | Examples |
|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Dashboard | `GET /api/summary`, `GET /api/monthly`, `GET /api/by_area`, `GET /api/products` |
| Sales ingestion | `POST /api/sales/upload`, `GET /api/sales/status`, `GET /api/sales/transactions`, `GET /api/sales/summary` |
| Weather | `POST /api/weather/refresh`, `GET /api/weather/effects` |
| DSS outputs | forecasts, external signals, priorities, recommendations, alerts, model evaluation |

## Chapter 5 - Results, Testing, and Evaluation

Revise testing/results to reflect what has been verified in the system.

### Add Evidence

- Sales upload result: accepted row count, rejected row count, duplicate count, and matched columns.
- Screenshots of the View Sales Data page after upload.
- Screenshot of computation cards for sums, averages, and SKU counts.
- Screenshot of Weather API Validation showing daily rows and monthly aggregate rows.
- Screenshot or table showing all configured territories in weather validation.
- Example API responses for sales status, sales summary, and weather effects.

### Technical Validation to Mention

Use these as the validation categories:

- Python unit tests for data pipeline and analytics behavior.
- Backend TypeScript build.
- Frontend Next.js build.
- Manual QA for upload, pagination, filters, computation cards, and weather refresh.
- Database migration order validation.

If exact command outputs are included, use current commands:

```powershell
python -m unittest discover -s services\tests -p "test_*.py" -v
cd backend
npm run build
cd frontend
npm run build
```

## Chapter 6 - Conclusions and Recommendations

Revise the conclusion to say the project now demonstrates an end-to-end analytics workflow, not only dashboard visualization.

### Add

- The system accepts messy sales data and turns it into standardized decision-support records.
- The system can validate historical weather observations and align them with sales grain.
- The DSS database design can support future model outputs for forecasting, prioritization, inventory, allocation, and alerts.

### Future Work

Move unfinished or production-grade items into recommendations:

- Replace local demo sessions with production Supabase Auth/JWT validation.
- Persist audit logs server-side.
- Add tenant/role-based row-level security.
- Integrate official DOH and PAGASA data feeds when stable sources are available.
- Train and validate Prophet, XGBoost, K-Means, MCDA, EOQ/ROP, allocation, and recommendation models using warehouse data.
- Add full model evaluation dashboards.
- Add deployment CI/CD and monitoring.

## Paper Claims That Must Be Corrected

| Current Risky Claim | Corrected Claim |
|---|---|
| "Weather API predicts sales demand." | "Weather observations are used as exploratory external signals and planning proxies aligned with sales records." |
| "NASA API provides official rainfall severity index." | "NASA POWER provides historical meteorological observations used to derive a rainfall severity proxy." |
| "Uploaded data is immediately used as clean data." | "Uploaded files pass through server-side cleaning, standardization, validation, and quality reporting before being displayed or persisted." |
| "CSV upload replaces the sales dataset." | "Year-specific uploads replace only the uploaded year(s), preserving other historical years." |
| "The system is production ready." | "The system is capstone/demo ready with documented production hardening requirements." |
| "The dashboard reads only static JSON." | "The dashboard reads from the API gateway, which prefers Supabase/service data and falls back to local processed artifacts when needed." |

## Required Figure and Table Updates

Add or revise these paper assets:

- System architecture diagram showing frontend, gateway, Python services, Supabase, local fallback, and external APIs.
- Data pipeline diagram from raw upload to staging, cleaning, facts, aggregates, and dashboard.
- ERD or schema table for staging, facts, dimensions, ETL lineage, and DSS output tables.
- UI screenshots for View Sales Data and Weather API Validation.
- API endpoint table.
- Data quality summary table.
- Weather validation/provider provenance table.
- Testing matrix.

## Suggested Data Quality Table

Use the latest pipeline numbers from `docs/IMPLEMENTATION.md` unless a newer upload changes them.

| Metric | Current Value |
|---|---|
| Extracted rows | 20,418 |
| Accepted rows | 19,674 |
| Rejected rows | 744 |
| Exact duplicates flagged | 100 |
| Source columns matched | 13 |
| Covered years | 2021-2025 |

## Open Items Before Final Paper Submission

- Confirm final accepted/rejected row counts after the last official dataset upload.
- Confirm whether the paper should include local fallback artifacts or describe only Supabase-backed operation.
- Confirm whether official DOH/PAGASA datasets were actually loaded. If not, keep them as planned/authoritative sources and describe NASA/Open-Meteo as implemented weather validation.
- Add screenshots from the running system after the latest UI capitalization pass.
- Rotate any service-role key that was pasted into chat or shared tools before deployment or public defense.
- Make sure all screenshots avoid exposing `.env`, service-role keys, or private Supabase credentials.
