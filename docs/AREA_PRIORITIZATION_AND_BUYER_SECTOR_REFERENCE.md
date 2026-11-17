# Area Prioritization and Buyer-Sector Reference

Last reviewed: 2026-09-25

This document describes the current derived classification and ranking contract. It replaces earlier fixed totals tied to the 37,178-row snapshot. Current totals must always be queried from Databricks for the active dataset.

## Separate dimensions

| Dimension | Question | Examples | Use |
|---|---|---|---|
| Geography | Where is demand attributed? | Batangas, Cavite, Quezon, Marinduque, Camarines Sur | Area ranking and regional rollup |
| Buyer sector | Who is buying? | Government, Private, Internal, Unknown | Filter and composition |
| Channel | How is it purchased/distributed? | Government Bidding, LGU, Retail Pharmacy, Private Hospital, Internal Supplies | Drill-down |

These dimensions must not be substituted for each other. `Government` is a buyer sector; it is not a province.

## Current mapping basis

The gateway classifies the current raw area strings using controlled rules derived from [MAPPED_CLIENT_REFERENCE.md](MAPPED_CLIENT_REFERENCE.md). Representative rules include:

| Raw value/pattern | Sector | Channel | Geographic handling |
|---|---|---|---|
| `GOVERNMENT` | Government | Government Bidding | Other National / DOH Central context unless a more specific reviewed location exists |
| `PAGBILAO` | Government | LGU | Quezon / Pagbilao reference context |
| Province/territory labels | Private | Retail Pharmacy | Mapped to their named province/region |
| `HOSPITAL`, `HOPITAL`, `RAKKK` | Private | Private Hospital | Current reference anchors to Quezon context |
| `LUCENA` | Private | Private Care | Quezon / Lucena context |
| `ADMIN`, supplies/equipment/personal/loss labels | Internal | Matching internal channel | MedShield HQ / Other National |
| Unrecognized value | Unknown | Unassigned | Unknown until reviewed |

The raw source did not record a complete buyer-ownership and LGU master. These outputs are derived mappings. Keep the original value, mapping rule/reference, and Unknown population visible.

## Mindoro display split

Where the source contains only the composite `Mindoro` label, the UI may present an explicitly estimated Oriental/Occidental split using the documented 63.2%/36.8% weights. This is a display/allocation estimate, not observed transaction geography. It must reconcile exactly to the unsplit source total.

## Area score

The commercial area score uses only available sales evidence:

```text
score = normalized net-sales scale * sales weight
      + active-period coverage * coverage weight
```

The weights are complementary and sum to 100%; the governed default is 60% sales scale and 40% coverage. Disease risk, weather risk, lead time, stock, and supplier performance do not enter this score until approved territory-level inputs are published.

## Candidate PSA geographic & socioeconomic context (unactivated)

- **Quarterly PSGC updates** ([PSA PSGC portal](https://psa.gov.ph/classification/psgc/), 3Q 2026 release dated 12 October 2026 covering codes as of 30 September 2026, plus `https://psa.gov.ph/classifications-api/psgc`) support standardized province/city/municipality verification alongside `release_<id>_dim_area` when source/client owners review remaining unmapped delivery labels. PSGC cannot resolve channel-only strings (`GOVERNMENT`, `HOSPITAL`).
- **2024 POPCEN density/households (`0221A6DLPD0.px`, `0191A6DTHP8.px`), regional PNHA (`0332B5CREG0.px` 2014–2021 / `0342B5CREG1.px` 2022–2024), 2023 FIES Health expenditure (`0071E3ATME0.px`), and provincial poverty (`0011F3DF010.px` / `0041F3DF02A.px`, 2018/2021/2023)** ([PSA OpenSTAT](https://openstat.psa.gov.ph)) provide candidate catchment-demand context if a future approved MCDA ranking expands beyond sales and coverage. They do not enter the active commercial area score until territory-level joins and weights are formally approved.

## Filters and evidence

- Period filters operate on bounded historical dates and All Time covers observed 2017-2025 sales.
- Buyer sector and product filters change the ranked population.
- Actual and estimated geographic evidence remain distinguishable.
- Fixed totals in screenshots or dated reports are historical evidence only.

## Acceptance rules

1. All mapped and Unknown rows reconcile to the selected Gold fact population.
2. Buyer and geography mappings remain traceable to their raw values and controlled reference.
3. Estimated Mindoro children reconcile to the source parent.
4. Ranking changes when valid filters or weights change.
5. No external-risk or inventory criterion appears without a published source.
