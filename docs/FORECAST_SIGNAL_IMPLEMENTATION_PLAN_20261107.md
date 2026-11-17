# Forecast signal implementation plan (7 November 2026)

**Owner:** Data Analyst (accountable), Adrian (data engineering and operator). **Reviewers:** adviser, source steward, client.
**Status:** proposed. Nothing in this plan authorizes procurement, model activation or publication. All candidate results go through MedShield's existing approval gates.

## 1. Why this plan exists

The 7 November forecast accuracy study (`outputs/forecast_accuracy_study_20261107/README.md`) found:

- **The current model can't be beaten on sales history alone.** The one-month company PHP forecast (`mean_6`) scores WAPE 49.67% with bias −10.76% on 57 cases. No simple method beats it, and two registered sales-only challengers failed: −0.16% and −0.43% relative change.
- **The misses look like purchase timing.** They are diffuse (the top 10 cases carry 48% of error) and are concentrated in 2025–26 underforecasts and June–September. They look like the timing of large government and hospital purchases.
- **No usable outside data exists yet.** PAGASA, DOH and NASA POWER all fail readiness: unapproved mappings, coverage ending in 2024 or 2025, and no issue-time vintage. No order or tender data exists.
- **The 15% goal is "not yet verifiable."** No untouched cases remain, and no new information is available at issue time.

**Goal:** within 12 months, have at least one information source that is (a) available before the forecast issue date, (b) dated and versioned, and (c) mapped to the sales scope. Then test it fairly against frozen `mean_6`, aiming for at least 15% lower WAPE.

## 2. Guiding rules

1. **Issue-time vintage first.** Every source is saved as a dated, append-only snapshot. A feature is usable only if it existed at the forecast issue date.
2. **Missing stays missing.** Never fill absent months with zeros. Flag partial months.
3. **Keep labels distinct.** Observed (PAGASA, DOH), proxy (NASA POWER, Open-Meteo, Google Trends), forecast (seasonal outlooks) and advance signal (tenders, orders) stay separately labeled.
4. **Offline until approved.** Jobs run offline. Loading into Databricks Bronze, then Silver, then Gold needs a separate approved pipeline change. The dashboard never trains models or reads local files.
5. **Fair tests only.** Freeze the registration before fitting. Score with and without the feature on identical cases. Use prospective cases for the final verdict.

## 3. Workstreams (in priority order)

### WS1. Procurement and tender signals (highest expected value)

**Why:** the remaining error behaves like lumpy institutional purchase timing, and tenders are published before delivery.

| Step | Task | Output | Owner |
|---|---|---|---|
| 1.1 | Ask the client for a dated order or tender archive: order date, expected delivery month, PHP value in the itemized scope, cancellations and reschedules, link to `dr_number`. Fields are listed in `docs/PREDICTIVE_OPERATIONS.md` L33–41. | Data request letter | Adrian → client via source steward |
| 1.2 | In parallel, check PhilGEPS public notices for CALABARZON, MIMAROPA and Bicol hospital, LGU and DOH medicine tenders: notice date, award date, ABC amount, procuring entity. | Feasibility memo plus a 12-month sample | Data Analyst |
| 1.3 | Build an offline snapshot job (same pattern as the weather job) that saves dated notices. Map procuring entities to sales channels (GOVERNMENT / HOSPITAL). | `services/analytics_service/jobs/refresh_tender_snapshots.py` | Data Analyst |
| 1.4 | Feature: PHP value of awarded or open tenders that MedShield could plausibly fill, known at issue time. | Feature rule in the registration | Data Analyst, reviewed by source steward |

**Gate:** client approval to link tenders to sales lines, and the source steward's sign-off on the entity-to-channel mapping.

### WS2. Weather (implemented; needs validation)

**Done (7 Nov):**
- `services/analytics_service/jobs/refresh_weather_snapshots.py` takes NASA POWER and Open-Meteo snapshots for the 7 territories, current to 4–6 Nov 2026. It has tests.
- Snapshots are in `outputs/weather_snapshots/`.
- The providers disagree: monthly rainfall correlation ranges from 0.55 to 0.91, and NASA reads wetter.

| Step | Task | Output | Owner |
|---|---|---|---|
| 2.1 | Run the refresh monthly on days 1–3, Asia/Manila (Windows Task Scheduler) | One snapshot per month | Adrian |
| 2.2 | Compare both providers with PAGASA stations for 2017–2024 (Ambulong, Tayabas, Daet, Sangley Point) and choose one per territory | `outputs/weather_validation_<date>/` | Data Analyst |
| 2.3 | Approve station and point mappings, including the 3 territories with no same-province station | Mapping decision in `docs/DECISIONS.md` | Source steward plus Adrian |
| 2.4 | Add typhoon proximity (IBTrACS, ≤200 km per month) | Snapshot job extension | Data Analyst |
| 2.5 | Add forward-looking climate: the ENSO index (NOAA ONI) and PAGASA monthly outlooks, saved at issue time | Snapshot job extension | Data Analyst |
| 2.6 | Optional: average several grid points per province instead of one point | Job option | Data Analyst |

### WS3. Disease surveillance

| Step | Task | Output | Owner |
|---|---|---|---|
| 3.1 | Extract the DOH Epidemiology Bureau weekly surveillance PDFs: region-week counts for dengue, leptospirosis, influenza-like illness and acute watery diarrhea, plus each report's publication date | `refresh_doh_weekly_snapshots.py` | Data Analyst |
| 3.2 | Cross-check against the WHO Western Pacific dengue situation updates | Validation note | Data Analyst |
| 3.3 | Fill historical gaps from OpenDengue, labeled as historical-only | Labeled backfill | Data Analyst |
| 3.4 | Send a formal request for province-week data with publication dates to the regional epidemiology units (CALABARZON, MIMAROPA, Bicol) | Request letter via adviser | Adrian plus adviser |
| 3.5 | Approve the territory mapping for the existing DOH table (`EXTERNAL_MAPPING_PENDING`) | Mapping decision | Source steward |
| 3.6 | Take daily Google Trends snapshots for Philippine disease searches ("dengue", "lagnat", "trangkaso"), labeled as a proxy | Snapshot job | Data Analyst |

### WS4. Sales data foundations

| Step | Task | Owner |
|---|---|---|
| 4.1 | Close defect 5 (contract fact) so a contracts-included scope can be studied separately | Data engineer |
| 4.2 | Close defect 6 (2017–2019 layouts) so more history can feed training. Keep absent months unknown. | Data engineer |
| 4.3 | Confirm delivery geography beyond the 18.1% of net now allocated, so area-level models are possible | Client plus source steward |
| 4.4 | Physical quantity and SKU fact for verified-unit forecasts (separate track) | Client |

### WS5. Model evaluation

| Step | Task | Owner |
|---|---|---|
| 5.1 | Keep issuing `mean_6` and the baselines under `outputs/company_php_forward_20261031/protocol.json`, starting with the 1–3 Dec 2026 window. The November window is recorded as unissued. | Adrian |
| 5.2 | For each source that passes readiness, register one challenger: the same base model with and without the feature, scored on identical cases | Data Analyst |
| 5.3 | Keep ABC classification, prediction intervals and verified-unit forecasts as separate tracks with their own baselines | Data Analyst |

## 4. Readiness checklist (required before any feature enters a model)

- [ ] Dated snapshots cover every issue window being tested
- [ ] Approved mapping to the sales territory or channel (recorded in `docs/DECISIONS.md`)
- [ ] Publication lag measured, with the feature using only data published before the issue date
- [ ] Historical coverage matches the evaluation cases (no 2025–26 gap)
- [ ] Provider and proxy labels preserved, and the dataset version and SHA-256 recorded
- [ ] Missing and partial periods flagged, never zero-filled

## 5. Acceptance (unchanged from the study)

- **Relative WAPE reduction:** 100 × (ref − challenger) / ref must be **at least 15%** on the same untouched, prospective cases. Use at least 12 matured cases.
- **Bias:** absolute normalized bias of **5% or less**.
- **Interval:** the paired 95% interval for the WAPE difference must sit **below 0** (`block_bootstrap_diff`, 4000 draws, block 3).
- **Verdict:** report "met", "not met" or "not yet verifiable". Negative results are kept.

## 6. Timeline (indicative)

| When | Milestone |
|---|---|
| Nov 2026 | Send the order and tender data request and the DOH letter. Schedule the monthly weather refresh. Finish the PAGASA validation (2.2). |
| Dec 2026 | First forward issue (1–3 Dec). Finish the PhilGEPS feasibility check and the DOH weekly extractor. Request mapping decisions. |
| Jan–Mar 2027 | Tender and disease snapshot jobs running monthly. Readiness checklist reviewed per source. Register the first challenger. |
| Mar–Dec 2027 | Accumulate prospective cases. Interim development checks only. |
| Nov 2027 | 12 matured forward issues allow the first adequately sized verdict. |

## 7. Risks

| Risk | Mitigation |
|---|---|
| The client can't share order data | Use PhilGEPS public tenders as the stand-in (WS1.2) |
| Free APIs change or rate-limit | Append-only snapshots, two weather providers, errors recorded per request |
| Too few prospective cases by the capstone defense | Present the honest retrospective development evidence and the registered prospective design; label the verdict "not yet verifiable" |
| Proxy signals mistaken for observations | Keep the labels in every table, chart and paper section |

## 8. Decisions needed

1. **Client:** can MedShield share dated order and tender records? Owner: Adrian to ask.
2. **Source steward:** approval of the weather point and station mapping, and of the DOH territory mapping.
3. **Adviser:** sign-off on the DOH and regional epidemiology data request letters.
4. **Adrian:** approval to load weather snapshots into Databricks Bronze as a separate pipeline change.
