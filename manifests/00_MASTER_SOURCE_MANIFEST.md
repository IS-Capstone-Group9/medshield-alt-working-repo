# Master Source Manifest

## Manifest identity

| Field | Value |
|---|---|
| Manifest scope | MedShield transformed and processed data available in the current checkout |
| Manifest prepared | 2026-09-29 |
| Sales evidence cutoff | 2026-09-26T19:02:42.874Z |
| Sales dataset ID | `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4` |
| Sales policy version | `sales_restart_gold_v5_2025_allocation_source` |
| Sales Delta version | 15 |
| Sales publication state | `CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW` |
| External-source policy | `external_sources_clean_v1_20260914` |
| External-source publication state | `CANDIDATE_ONLY` |

## Evidence inventory

| Source | What it verifies | Availability | Use |
|---|---|---|---|
| `outputs/descriptive_validation/2026-09-26T19-02-42-874Z/evidence.json` | Sales identity, Delta version, aggregate totals, monthly coverage, yearly summaries, and empty/non-empty analytical output families | Present | Primary descriptive evidence |
| `outputs/publication_readiness/2026-09-26T18-36-04-060Z/evidence.json` | Gold table row counts, reconciliation, provenance checks, publication checks, and table identity | Present | Primary publication-readiness evidence |
| `outputs/external_sources/external_source_cleaning_report.json` | DOH and PAGASA source coverage, cleaning counts, output hashes, and integration gate | Present | Primary external-source evidence |
| `data/medshield/processed/weather_signals.json` | NASA POWER proxy coverage, areas, daily rows, monthly rows, and interpretation | Present | Weather-proxy evidence |
| `outputs/area_mapping_review/summary.json` | Area mapping hash and older mapping-review population | Present but superseded for population counts | Mapping lineage only |
| `docs/CURRENT_STATE.md` | Canonical narrative claiming a later Delta version 16 state | Present; cited version-16 receipts absent | Context only until receipts are supplied |
| `datasources/clean/doh/*.csv` | Cleaned DOH outputs named by the cleaning report | Absent in this checkout | Do not claim direct row-level verification |
| `datasources/clean/pagasa/*.csv` | Cleaned PAGASA outputs named by the cleaning report | Absent in this checkout | Do not claim direct row-level verification |

## Current transformed-data families

| Family | Coverage | Verified size | Grain or interpretation | Current status |
|---|---:|---:|---|---|
| Sales Gold fact candidate | 2017–2025 | 37,728 accepted rows | Accepted sales fact row | Candidate |
| Product dimension | 2017–2025 population | 4,561 rows | Source product label; not an approved SKU master | Candidate |
| Area dimension | 2017–2025 population | 22 rows | Derived area label | Candidate |
| Monthly sales | 2017-01 to 2025-12 | 108 rows | One row per calendar month, including explicit missing months | Candidate |
| Yearly sales | 2017–2025 | 9 rows | One row per year | Candidate |
| DOH historical monthly clean | Observed 2017–2026 | 138,673 reported output rows | Disease/geography/month aggregate | Report verified; CSV absent |
| DOH sales-territory candidate | Approved territory subset | 1,787 reported output rows | Candidate disease/territory/month aggregate | Not join-ready |
| PAGASA daily clean | 2017–2024 | 161,742 reported output rows | Station/day | Report verified; CSV absent |
| PAGASA monthly clean | 2017–2024 | 5,314 reported output rows | Station/month | Report verified; CSV absent |
| NASA POWER proxy | 2025 | 3,285 daily and 108 monthly rows | Area/day and area/month weather-severity proxy | Scenario input, not official PAGASA RSI |

## Superseded evidence

The following artifacts remain useful for historical lineage but must not replace the current verifiable population:

- `data/medshield/certification/sales_2017_2025_v1_*`: older certification population with 44,954 extracted rows, 40,320 accepted rows, and 38,273 publication-candidate rows.
- `data/medshield/processed/sales_dataset_status.json`: older local processing population.
- `outputs/product_grouping_2017_2025/`: older 37,178-row and 4,900-product grouping run.
- `outputs/area_mapping_review/summary.json`: older 37,178-record mapping review; retain its mapping hash but not its population count as the current fact count.

## Interpretation rule

All figures in these manifests are either copied from a present machine-generated receipt or calculated directly from a present artifact. A reported output whose underlying file is absent is labeled **report verified; file absent**. No value should be presented to an REC reviewer as approved, production-ready, causal, or externally validated unless its status explicitly says so.

