# Category-level disease link and seasonality, 15 November 2026

Offline, read-only, retrospective (`run.py`). Rules fixed in the docstring before the first run (SHA-256 prefix
`f2e3ddbefe24`); category mapping candidate v0 (`../category_mapping_20261115/`, SHA-256 prefix `801ac9c16c46`).

## Why this test

Earlier disease tests used brands and product families and only four DOH diseases. This test gives the disease idea
its strongest fair chance:

- **Products grouped by therapeutic category** (antibacterials, respiratory, fever and pain, critical care, vaccines…).
  The top 200 product families (68.7% of sales) were classified from label names, strengths and forms; 174 with high or
  medium confidence. The 26 low-confidence guesses are excluded.
- **All relevant DOH diseases:** the DOH file holds 15 diseases, 2021–2025, weekly by province. Nine were matched to
  categories in advance: ILI, SARI, COVID-19, dengue, typhoid, diarrhoeal disease (acute bloody diarrhoea, rotavirus,
  cholera), leptospirosis, rabies and chikungunya.
- **MedShield's regions** (CALABARZON, MIMAROPA, Bicol) and the whole country.
- **Routine sales only**, since large tender orders follow budgets, not this month's cases.

## Category mix (top 200 families)

| Driver | Share of all sales | Main categories |
|---|---|---|
| Programme and hospital | 27.8% | Vaccines and immune sera 10.3%, obstetric 4.4%, GI 3.1%, critical care 2.9%, anaesthetic 2.5%, anticoagulant 2.2% |
| Infection | 20.7% | Antibacterials 17.1%, respiratory 1.3%, fever and pain 1.2%, antiprotozoal 0.9%, antiviral 0.3% |
| Supplies | 8.5% | Antiseptics, PPE, medical supplies, equipment |
| Chronic disease | 4.6% | Cardiovascular 2.8%, kidney anaemia 1.4%, diabetes 0.2%, CNS 0.2% |
| Unclassified or non-medical | 7.1% | |

## T1. Do categories move with disease cases? Not supported

64 pre-registered tests (16 disease–category pairs × same month or one month later × regional or national). Measure:
correlation of month-to-month changes, 2021–2025. Rule: positive and significant after Holm correction.

**Result: 0 of 64 supported.** The strongest pairs:

| Disease → category | Where, timing | Correlation | Raw p | After correction |
|---|---|---|---|---|
| COVID-19 → anticoagulants (enoxaparin) | National, 1 month later | +0.34 | 0.005 | 0.30 |
| Typhoid → antibacterials | National, same month | +0.26 | 0.023 | 1.00 |
| Dengue → fever and pain medicines | National, same month | +0.25 | 0.029 | 1.00 |
| SARI → critical care | Regional, 1 month later | +0.25 | 0.032 | 1.00 |
| Diarrhoeal → antibacterials | Regional, same month | +0.22 | 0.048 | 1.00 |

The strongest pairs are medically sensible (enoxaparin was widely used for COVID-19 clotting; antibacterials treat
typhoid; paracetamol is the dengue fever drug), but none is strong enough to rule out chance across 64 tests.
Exploratory check (not pre-registered): same-month pairs leaned positive in 10 of 16 (regional) and 11 of 16 (national)
cases, which is not more than chance (p = 0.23 and 0.11); one-month-later pairs leaned positive in only 5 of 16.

## T2. Is any category seasonal? No

No category's routine sales showed a reliable calendar pattern (all 18 categories with at least ₱1M routine sales;
smallest raw p = 0.12 for vitamins and minerals; all Holm-adjusted p = 1.00). Antibacterials, respiratory medicines and
fever medicines are not seasonal in MedShield's sales, even though the diseases they treat are.

## Sensitivity rerun with mapping v0.1 (not a new registered test)

`sensitivity_v0_1.py` runs `run.py` unchanged with only the mapping swapped (`results_sensitivity_v0_1.json`). Mapping
v0.1 classifies JUBI-R as remdesivir and CORBAL as a probable hydrocortisone injection, and corrects DROXISUR from an
antibiotic to hydrocortisone. The registered v0 result stays the result of record.

- **Same answer:** 0 of 64 pairs supported; 0 of 19 categories seasonal (antivirals now pass the ₱1M threshold).
- Five correlations moved by 0.02 or more, all involving critical care (for example SARI → critical care, regional,
  one month later: 0.245 → 0.259). The strongest pair is unchanged (COVID-19 → anticoagulants, ρ = 0.34).
- **Exploratory, not registered:** antiviral sales (remdesivir and aciclovir, ₱6.2M) occurred in only 4 months of
  2021–2022 and none in 2023–2025. That fits the pandemic, but 4 months cannot be tested, and it counts toward no claim.

## What this means

1. **The disease link was given its strongest fair test and was not supported.** Brand, family and now category level,
   with 9 diseases, regional and national, all lead to the same answer.
2. **There may be a weak signal.** Same-month pairs lean positive and the best pairs make medical sense. A weak link
   would fit a distributor whose routine sales partly follow hospital patient loads, but 60 months of data cannot
   separate it from chance.
3. **The likely reason fits the literature.** Retail studies find disease moves over-the-counter sales within weeks.
   MedShield sells to hospitals and government offices that buy in batches for stock and programmes, which smooths out
   short disease swings.

## Limits

- The category mapping is an AI-inferred candidate, not verified against FDA registrations or the client catalog.
- 31% of sales (families outside the top 200) and 26 low-confidence families are excluded.
- DOH counts are reported cases (week of report), not true incidence; 2021–2022 are affected by COVID-19 reporting.
- Sales have no reliable location for most orders, so regional matching uses MedShield's territory as a whole.
- 60 months limits power: a correlation near 0.25 cannot be confirmed after correction for 64 tests.

## Register status

Category-level disease link: **tested, not supported** (0 of 64 after Holm). Category seasonality: **not supported**
(0 of 18). The category mapping itself is kept as a candidate grouping for planning views.
