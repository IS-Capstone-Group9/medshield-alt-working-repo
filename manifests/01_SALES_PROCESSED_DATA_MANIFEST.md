# Sales Processed Data Manifest

## Dataset identity

| Field | Value |
|---|---|
| Dataset ID | `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4` |
| Gold fact | `workspace.medshield_gold.sales_restart_fact_candidate` |
| Policy | `sales_restart_gold_v5_2025_allocation_source` |
| Delta version | 15 |
| Coverage | 2017–2025 |
| Publication state | `CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW` |
| Product identity rule | Source product labels, not verified SKUs |

## Fact population and totals

| Measure | Verified value | Interpretation |
|---|---:|---|
| Accepted fact rows | 37,728 | Current Gold candidate population |
| Distinct DR numbers | 14,076 | Distinct recorded DR identifiers |
| Product-dimension rows | 4,561 | Distinct source product labels in the candidate dimension |
| Quantity | 1,744,567.269605 | Source units; units are not yet canonically harmonized |
| `net_cost` | ₱626,946,741.81 | Persisted field used as sales/revenue in the descriptive output |
| `total_cost` | ₱534,884,889.90 | Persisted cost aggregate |
| `total_trade_price` | ₱193,193,729.34 | Persisted trade-price aggregate |
| `net_income` | ₱288,487,498.72 | Transaction-level gross-margin/profit measure; not company net income |
| Margin rate | 60.262177% | Calculated on a ₱478,720,670.03 margin-revenue basis |

Financial reconciliation checked 34,105 rows, found 0 mismatched rows, and produced an aggregate rounding delta of -₱0.06.

## Yearly descriptive results

| Year | Revenue (`net_cost`) | Transaction-level income | Accepted rows |
|---:|---:|---:|---:|
| 2017 | ₱10,211,167.35 | ₱6,316,157.68 | 1,978 |
| 2018 | ₱51,619,691.27 | ₱28,328,721.76 | 6,181 |
| 2019 | ₱62,542,304.49 | ₱29,125,469.95 | 5,446 |
| 2020 | ₱63,593,274.63 | ₱28,013,993.68 | 3,980 |
| 2021 | ₱77,860,206.26 | ₱50,420,770.93 | 3,407 |
| 2022 | ₱63,234,990.04 | ₱40,799,049.06 | 3,980 |
| 2023 | ₱62,228,966.85 | ₱33,585,582.48 | 5,381 |
| 2024 | ₱50,259,319.88 | ₱19,563,837.42 | 2,831 |
| 2025 | ₱185,396,821.04 | ₱52,333,915.76 | 4,544 |
| **Total** | **₱626,946,741.81** | **₱288,487,498.72** | **37,728** |

These are observed aggregates. They do not by themselves establish causation, forecast accuracy, inventory outcomes, or loss reduction.

## Analytical table inventory

| Table | Rows | Grain |
|---|---:|---|
| `sales_restart_fact_candidate` | 37,728 | Accepted sales fact row |
| `sales_restart_dim_product_candidate` | 4,561 | Source product label |
| `sales_restart_dim_area_candidate` | 22 | Derived area label |
| `sales_restart_dim_date_candidate` | 3,287 | Calendar date |
| `sales_restart_monthly_candidate` | 108 | Calendar month |
| `sales_restart_yearly_candidate` | 9 | Calendar year |
| `sales_restart_business_product_yearly_candidate` | 7,649 | Business-product/year |
| `sales_restart_product_yearly_candidate` | 6,671 | Product/year |
| `sales_restart_territory_yearly_candidate` | 41 | Approved territory/year |
| `sales_restart_area_yearly_candidate` | 125 | Derived area/year |
| `sales_restart_returns_candidate` | 673 | Return/disposition record |
| `sales_restart_contract_evidence_candidate` | 62 | Contract-evidence record |
| `sales_restart_gold_quality_candidate` | 231 | Quality-rule result |
| `sales_restart_scope_candidate` | 6 | Scope classification record |
| `sales_restart_medical_monthly_candidate` | 0 | Approved medical-product/month |
| `sales_restart_external_input_candidate` | 0 | Approved integrated external input |
| `sales_restart_contract_labels_candidate` | 0 | Approved contract label |

## Calendar completeness

The monthly table deliberately contains all 108 months from January 2017 through December 2025. Ten months have zero observed transactions and must be treated as **missing coverage**, not proven zero demand:

- 2017: May, June, July, August, October
- 2018: January, February
- 2019: October, November, December

## Publication check

The 2026-09-26 publication audit returned 68 PASS and 2 FAIL checks. The technical verdict was FAIL and the publication status was `BLOCKED_PENDING_BUSINESS_ACCEPTANCE_AND_SCOPED_DATA_GATES`.

Both failures concern the 2020 and 2024 estimated replacement sources:

1. They were mislabeled as `ORIGINAL_SOURCE_EXPORT`.
2. Their estimated-source flags were absent in Gold.

The replacement audit reported preserved financial totals and 3 replaced records in 2020 and 124 in 2024, but the provenance-labeling defect prevents publication approval.

## Supporting receipts

- `outputs/descriptive_validation/2026-09-26T19-02-42-874Z/evidence.json`
- `outputs/publication_readiness/2026-09-26T18-36-04-060Z/evidence.json`

