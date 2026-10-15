# Weather provider research — 8 October 2026

## Scope and recommendation

Support MedShield's historical monthly planning research for CALABARZON, MIMAROPA and Bicol, with rainfall, air temperature, relative humidity and wind. Add Open-Meteo historical API options to the existing NASA POWER/PAGASA evidence, then compare each model with equivalent PAGASA station periods. Preserve model/provider identity and candidate status. A second distinct no-key provider, MET Norway, passed one current-forecast accessibility probe; its Philippine historical forecast archive is unavailable, so it is a future evaluation option rather than a scored historical source.

**No universal weather reliability percentage is established by this research.** API accessibility, value completeness, historical station agreement and forecast skill are different measures. The companion benchmark owns numerical station comparisons. One successful HTTP call does not establish uptime, and reanalysis agreement with a station does not establish weather forecast reliability at any future lead.

## Provider comparison

| Provider/product | Historical coverage relevant to 2017–2025 | Spatial/source meaning | Variables and forecast use | Access/business-use considerations | Recommendation |
|---|---|---|---|---|---|
| NASA POWER daily | 1981 to near real time; covers study years | Global meteorological grid, approximately 0.5° × 0.625°, primarily NASA MERRA-2/GEOS-IT assimilation products | `PRECTOTCORR`, `T2M`, `RH2M`, `WS10M`; historical model-derived weather context | No API key; NASA states POWER data are public domain and usable commercially with source acknowledgment requested | Keep as existing, separately labeled proxy; coarse cells cannot establish local station accuracy. [Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/), [data origins/resolution](https://power.larc.nasa.gov/docs/faqs/data/), [NASA reuse statement](https://forum.earthdata.nasa.gov/viewtopic.php?t=82). |
| Open-Meteo ERA5 | 1940 onward; full study interval | Global ECMWF reanalysis, 0.25° (~25 km) | All four requested variables; historical estimates | No key for hosted noncommercial research; commercial hosted use needs subscription/customer endpoint and key; data CC BY 4.0 | Main new reproducible historical candidate. [Archive documentation](https://open-meteo.com/en/docs/historical-weather-api), [terms](https://open-meteo.com/en/terms). |
| Open-Meteo ERA5-Land / ERA5-Seamless | Land component 1950 onward | Land 0.1° (~11 km); driven by ERA5 atmospheric forcing | ERA5-Land alone supplies temperature/humidity but rainfall/wind are unsupported in this API. Seamless combines land temperature/humidity with ERA5 atmospheric fields | Same hosted-access conditions as ERA5; related source family, not independent provider votes | Use explicit `era5_seamless` when all four variables are required; do not relabel it pure ERA5-Land. [Variable matrix and forcing](https://open-meteo.com/en/docs/historical-weather-api). |
| Open-Meteo ECMWF IFS archive | 2017 onward | Global ~9 km archive assembled from operational 00/06/12/18 UTC simulation runs; operational model changes over time | All four requested variables; historical estimates are distinct from retained issued forecast horizons | Same hosted-access conditions; shares ECMWF family with ERA5 but differs in operational model/product | Additional historical comparison candidate, with coverage checked by live retrieval and model changes disclosed. [Product semantics](https://open-meteo.com/en/docs/historical-weather-api), [exact model identifiers](https://github.com/open-meteo/open-meteo/blob/main/openapi/historical-weather.yml). |
| MET Norway Locationforecast 2.0 | Current forecasts only for Philippine coordinates; no global retrospective archive served | Outside Nordic/Arctic regions, ECMWF global model ~9 km; related to IFS, not independent meteorological evidence | Instant temperature/RH/wind; precipitation over next 1/6/12 hours as present; roughly 9–10 days ahead | No API key; identifying User-Agent required, caching/expiry rules; CC BY 4.0/NLOD with attribution, no SLA | One successful accessibility probe below. Research future lead-specific forecast validation before introducing a dashboard forecast contract. [Documentation](https://api.met.no/weatherapi/locationforecast/2.0/documentation), [global data model](https://api.met.no/doc/locationforecast/datamodel), [terms](https://api.met.no/doc/TermsOfService), [license](https://api.met.no/doc/License). |
| OpenWeather One Call 4.0 | Advertises global 47-year history; study years supported by product | Proprietary OWHL model; no fixed grid resolution established by the inspected One Call docs | Temperature, RH, wind and rainfall; historical/current/forecast timelines | API key and separate One Call subscription required; commercial product. No account or paid test performed | Optional keyed benchmark after access is supplied. 3.0 is currently marked deprecated; use 4.0 documentation for new work. [Current API catalog](https://openweathermap.org/api), [4.0 docs](https://openweathermap.org/api/one-call-4), [pricing](https://openweathermap.org/price). |
| WeatherAPI.com | 2010 onward, full archive on Business/Enterprise; Free covers only past day | Blends GFS/ECMWF and observations; advertised 1–11 km depends on model/location, not proven Philippine effective resolution | Hourly `temp_c`, `humidity`, `wind_kph`, `precip_mm`; daily totals/statistics; future forecasts | API key; commercial use allowed on all plans, free attribution required. No keyed test performed | Optional. Provider explicitly says its history is archived forecast data rather than actual observations; retain that evidence label. [Docs](https://www.weatherapi.com/docs/), [archive/actuals FAQ and plan scope](https://www.weatherapi.com/pricing.aspx), [terms](https://www.weatherapi.com/terms.aspx). |
| Meteostat | Station/variable dependent; no complete Philippine study coverage established here | Aggregates government interfaces, METAR and SYNOP; point products interpolate; missing values filled with model data by default | Daily temperature/rain/wind; humidity requires hourly `rhum`; hourly includes all four | JSON API requires RapidAPI key (500 monthly free calls). Bulk datasets can be fetched without a key. Current developer license says CC BY 4.0; older support material differs, so use product/provider-specific license evidence | Useful supplementary observation coverage check, with model filling disabled or explicitly traced; not scored here. [API/access](https://dev.meteostat.net/api), [daily/model option](https://dev.meteostat.net/api/point/daily.html), [hourly humidity](https://dev.meteostat.net/api/point/hourly.html), [bulk/source columns](https://dev.meteostat.net/data/bulk/hourly), [current license](https://dev.meteostat.net/license). |
| PAGASA TenDay / official climatological data | TenDay is short-term forecast, not the existing 2017–2024 station files. No 2017–2025 API archive established here | Official Philippine station evidence and separate municipal/provincial forecasts | TenDay documentation includes rainfall/temp/RH/wind; historical station fields depend on supplied files | API token required. PAGASA's 20 August 2026 official response states API access currently limited to government agencies. Climate raw Excel has formal request/terms process | Retain authorized station files as reference evidence; request additional station/year coverage through official process. Do not promise API integration without access. [Official API PDF](https://tenday.pagasa.dost.gov.ph/static/media/api-doc.c9cf6abbaa781437ed96.pdf), [current access restriction](https://www.foi.gov.ph/agencies/pagasa/request-for-access-to-the-pagasa-tenday-weather-forecast-api/), [climate-data service](https://www.pagasa.dost.gov.ph/climate/climate-data). |

## Exact Open-Meteo historical request contract

The official [OpenAPI source](https://github.com/open-meteo/open-meteo/blob/main/openapi/historical-weather.yml) includes `models=era5`, `era5_land`, `era5_seamless`, and `ecmwf_ifs`, as well as the daily mean fields below.

```text
GET https://archive-api.open-meteo.com/v1/archive
latitude=<reviewed station latitude>
longitude=<reviewed station longitude>
start_date=2017-01-01
end_date=2025-12-31
models=era5                  # separate request for era5_seamless/ecmwf_ifs
daily=precipitation_sum,temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_mean
timezone=Asia/Manila
temperature_unit=celsius
wind_speed_unit=ms
precipitation_unit=mm
cell_selection=land
```

Record requested coordinates, returned grid coordinates/elevation, model, units, retrieval time, daily missingness and completeness before aggregation. Monthly rainfall is the sum of daily precipitation; the other fields are monthly means of available daily means, with complete-period eligibility stated. Default `best_match` is a changing blend; do not use it as a supposedly fixed model. Selecting the nearest cell instead of the land/elevation-aware default is a separate modeling choice that must be documented.

ERA5-Seamless source attribution must distinguish land temperature/humidity from ERA5 rainfall/wind. ERA5/ERA5-Land share inputs; agreement between them is not independent confirmation. Grid weather remains a proxy for station/territory weather, particularly on coasts and mountains. Source publication lag and reanalysis updates must be considered before using historical values as features that would have been available at a past forecast origin.

The numerical benchmark does not require a commercial deployment. Free API terms permit public research/educational use; no subscription was created. Open-Meteo production refresh must use the proper commercial entitlement if MedShield becomes a commercial product.

## MET Norway read-only availability probe

Executed once on **8 October 2026, Asia/Manila**, using PowerShell `Invoke-WebRequest`, a 30-second timeout and identifying application header `User-Agent: MedShieldWeatherResearch/1.0`. No credential, account creation or purchase was used. The probe coordinate is a Quezon example, not an approved station-to-territory mapping.

```text
GET https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=14.02&lon=121.59
```

| Check | Captured response |
|---|---|
| HTTP status | 200 |
| Successful requests / attempted requests | 1 / 1 (100% in this single accessibility probe) |
| Provider `updated_at` | 2026-10-08T09:22:26Z (17:22:26 Asia/Manila) |
| Time-series entries | 90 |
| First / last forecast-valid timestamp | 2026-10-08T09:00:00Z / 2026-10-17T12:00:00Z |
| Instant units | Temperature °C; humidity %; wind m/s; pressure hPa |
| Precipitation unit reported | mm |
| First instant details | 25.9 °C, 88.2% RH, 4.9 m/s wind; provider forecast values |
| Server `Expires` | 2026-10-08T10:14:55Z |

This demonstrates accessible structured forecast data at one Philippine point. It **does not measure meteorological accuracy, retained historical coverage, latency distribution or service uptime**. No repeated probe was performed. Respect `Expires`, use `If-Modified-Since`, truncate coordinates to four decimals and include a real operational contact in any maintained application's User-Agent. Exact wall-clock execution seconds were not separately retained; provider update and expiry times above are response metadata, not the execution timestamp.

MET Norway's global model is ECMWF. It is a distinct delivery provider, but counting it and Open-Meteo IFS as statistically independent forecasts would overstate evidence. Forecast reliability requires stored issue-time snapshots and later matched observations at explicit leads; current forecast retrieval cannot fill that historical gap.

## Alternatives: parameters and test limits

- **NASA POWER:** daily point URL `/api/temporal/daily/point`, `parameters=PRECTOTCORR,T2M,RH2M,WS10M`, `community=AG`, lat/lon, `start=YYYYMMDD`, `end=YYYYMMDD`, `format=JSON`. Daily default is Local Solar Time; explicitly preserve `time-standard=LST` or `UTC` and reconcile with station reporting intervals. The same date label does not guarantee matching daily accumulation boundaries.
- **OpenWeather 4.0:** `/data/4.0/onecall/timeline/1h` or `/timeline/1day` with `lat`, `lon`, `appid`, `units=metric`, and `start` UTC timestamp for timeline navigation. Hourly responses contain up to 20 records and daily up to 10; follow returned pagination without exposing keys. Daily `temp.day` is not a daily mean and cannot silently replace one. No key was provided or tested.
- **WeatherAPI:** `https://api.weatherapi.com/v1/history.json`, `key`, `q=lat,lon`, `dt=YYYY-MM-DD`, optional `end_dt` (up to 30-day span on eligible plans). Prefer hourly aggregation for comparable mean wind; daily `maxwind_kph` is not mean wind. Full study archive needs appropriate plan. No key was tested.
- **Meteostat JSON:** `/point/hourly`, `lat`, `lon`, `start`, `end`, `tz=Asia/Manila`, `model=false`, RapidAPI headers; maximum 30 days per hourly request. Daily endpoint allows 10 years/request but lacks humidity. Current bulk hourly annual URL `https://data.meteostat.net/hourly/{year}.parquet` includes per-variable `_source` columns and requires station metadata joining. No station-specific Philippine completeness was tested.
- **PAGASA TenDay:** official PDF documents `/api/v1/tenday/current`, `/full`, province/region/municipality filters and token headers. The documentation's prose and header example are not perfectly consistent; confirm the authorized token contract if agency access is granted. No restricted endpoint was probed and no access workaround attempted.

## Boundaries and handoff

One accountable parent Orchestrator owns final integration. This worker provided supporting Architect/Data Analyst research; allowed edit scope was only this report. Existing unrelated working-tree changes were inspected and preserved. No service was stopped, no application build was run, and no Databricks/table/API runtime changes were made by this worker.

Skills read/applied: `.skills/architecture-patterns.md` preserved gateway/warehouse boundaries; `.skills/analytics-frameworks.md` separated accessibility, station agreement and forecast claims; `.skills/database-standards.md` informed grain/lineage and missing-value treatment, reconciled against canonical Databricks ownership; `.skills/technology-stack.md` constrained provider orchestration to the backend/offline pipeline; `.skills/security-standards.md` kept tokens server-side and avoided access bypass; `.skills/documentation-standards.md` kept research evidence separate from canonical runtime contracts. Role and shared execution guidance were also read. Canonical context included `docs/ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, affected API/current-state sections, and business/evidence definitions.

Verification scope: official-source research complete; one MET accessibility probe passed; keyed providers and PAGASA API not tested; numerical weather agreement delegated to the benchmark worker. Research snapshot HEAD was `cc03b4c05398880b18987eca5ca9c1e140bf9dcb` with existing uncommitted work, so this hash is context rather than a clean implementation identity. Report prepared at 2026-10-08 17:44 Asia/Manila; consequential implementation/benchmark evidence must retain its own exact file/data hashes.

Next owner: integration worker verifies archive model parsing, provenance, no-key research versus commercial configuration and explicit failure states; benchmark worker assesses equivalent complete station-month populations; root checks evidence before exposing any percentage. Business publication and forecast activation remain separate acceptance gates.
