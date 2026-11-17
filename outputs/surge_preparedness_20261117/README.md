# Surge preparedness: disease and weather risk calendar, alerts and uplift scenarios — 17 November 2026

Offline, read-only, retrospective (`run.py`). Rules were fixed in the docstring before the first run
(SHA-256 prefix `9345374b932b`). Category mapping v0.1 top-200, H/M confidence (prefix `47e709adbde9`).
Outputs: `results.json`, `risk_calendar.csv`. Candidate evidence. Authorizes no purchase.

**Purpose.** This makes the DSS disease- and weather-*informed* for planning. It does not claim that disease or
weather predicts sales. Earlier tests found no supported link (`category_disease_test_20261115`: 0 of 64;
`signal_analysis_20261110`: not supported).

## C. Risk calendar (observed)

Territory = CALABARZON + MIMAROPA + Bicol, DOH weekly cases 2021–2025. A surge month has a month median ≥ 1.2×
the average month. Per-region calendars are in `risk_calendar.csv`.

| Disease | Surge months (territory) | Cases 2021–2025 |
|---|---|---|
| Dengue | Jul–Oct | 221,425 |
| ILI | Aug–Oct | 108,436 |
| SARI | Jun, Sep–Dec | 16,671 |
| Typhoid | Jul, Oct | 12,540 |
| Leptospirosis | Aug–Nov | 5,149 |
| Chikungunya | May–Aug | 2,679 |
| Diarrhoeal (ABD, rotavirus, cholera) | Feb | 9,815 |
| Rabies | Jan–Feb | 406 |
| COVID-19 | Jan, Jun, Dec (pandemic waves, not seasonal) | 615,498 |

Weather (PAGASA). 70 tropical cyclones entered PAR in 2021–2024, peaking Jul–Oct (8, 9, 14, 10).
Mean monthly rainfall at Science Garden + Port Area is ≥ 200 mm in Jun–Oct, highest in July at 659 mm. These
two stations are in Metro Manila, so they are a **proxy** for the territory.

**Reading:** July to November is the main preparedness window. Rainy and typhoon season overlaps dengue, ILI,
leptospirosis and SARI surges.

## A. Surge alerts (retrospective test)

An alert fires when territory cases exceed the 75th percentile of the same calendar month in earlier years (no
look-ahead), or when a TY or STY enters PAR. A hit means routine sales of an exposed category in that month or
the next are ≥ 10% above its prior 6-month mean. The test is one-sided Fisher with Holm correction over 8 alert types.

| Alert | Alert months | Hit rate with alert | Hit rate without | Holm p | Rule result |
|---|---|---|---|---|---|
| Diarrhoeal | 28 of 36 | 66.1% | 18.8% | 0.007 | Passes (see caveat) |
| Chikungunya | 21 | 61.9% | 46.7% | 1.0 | Not useful |
| Dengue | 26 | 57.7% | 65.0% | 1.0 | Not useful |
| Leptospirosis | 25 | 56.0% | 63.6% | 1.0 | Not useful |
| ILI | 21 | 47.6% | 63.3% | 1.0 | Not useful |
| SARI | 33 | 54.5% | 88.9% | 1.0 | Not useful |
| Typhoid | 26 | 50.0% | 80.0% | 1.0 | Not useful |
| Typhoon (TY/STY) | 17 | 45.1% | 73.3% | 1.0 | Not useful |

**Diarrhoeal caveat.** It passes the pre-registered rule, but the alert fires in 28 of 36 months. That pattern
comes from reported diarrhoeal cases rising every year after 2022, not from distinct surges. The comparison
group is only 8 non-alert months (16 category-months). **It is not a usable early warning.** It is recorded as
a rule pass that is confounded by trend.

**Exploratory observation (not pre-registered, not a finding).** After strong typhoons, and during most disease
surges, exposed sales are *less* likely to rise (typhoon 45% vs 73%). One possibility is that deliveries or
orders are disrupted during storms. That would make weather a *supply-disruption* risk rather than a demand
signal. It needs its own registered test using order dates. **Update 17 Nov:** the registered follow-up (W2, `weather_prediction_tests_20261117`) did not confirm it (median ratio 1.03, p = 0.43).

**Conclusion.** Disease and typhoon alerts are kept as **preparedness reminders** (calendar and status). They
are not demand signals and must not change forecasts.

## S. Uplift scenarios (assumed)

These figures are the mean routine monthly sales (PHP) of each exposed category in its diseases' territory surge
months. The extra stock column is a planner-chosen uplift over one month of cover. They are PHP value proxies:
no verified units or costs are included.

| Category | Surge months | Mean PHP/month | +20% | +40% | +60% |
|---|---|---|---|---|---|
| Antibacterial | Feb, Jun–Dec | 508,281 | 101,656 | 203,312 | 304,968 |
| Fever and pain | May–Oct | 61,926 | 12,385 | 24,770 | 37,155 |
| Respiratory | Jun, Aug–Dec | 54,501 | 10,900 | 21,800 | 32,701 |
| Critical care | Jun–Dec | 49,964 | 9,993 | 19,986 | 29,979 |
| Antiprotozoal | Feb | 40,290 | 8,058 | 16,116 | 24,174 |

These are scenarios. The planner decides the uplift. Section A shows that past surges did not reliably raise
these sales, so the uplift is a hedge against risk and is not forecast demand.

## Limits

- The category mapping is AI-inferred (v0.1 candidate) and covers the top 200 families (68.7% of sales).
- Sales are company-wide routine sales. Only 18.1% of sales have a confirmed territory, so sales are not
  matched to province.
- Rainfall is a Metro Manila proxy. Cyclone data covers entering PAR, not landfall in the territory.
- DOH data covers 2021–2025 and is shaped by COVID-era reporting. The alert window is 2023–2025 (36 months).
- The analysis is retrospective. It makes no causal claim and approves no forecast change, model or purchase.

## Next steps

1. Dashboard: show the risk calendar (Forecast/Overview context) and add an "Outbreak / typhoon season"
   uplift scenario in Planning. Labels: observed calendar, assumed uplift.
2. Optional registered follow-up: a weekly event study by order date on 5–8 specific products, including the
   typhoon supply-disruption hypothesis.
