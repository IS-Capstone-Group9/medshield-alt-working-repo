# Study findings: 2021–2025

Derived from the 9 October 2026 retained fact-20 calculation receipt and passing authenticated study exports. This packet is reporting evidence for Chapter 4. Final client release acceptance and any academic scope amendment remain separately recorded decisions.

## Financial results

**Eligible signed net sales: ₱438,980,304.07. Supported gross margin amount: ₱196,703,155.65. Weighted gross margin: 57.32%**, using the same margin-eligible sales basis of ₱343,154,299.03. The study contains 20,143 Gold source records and sales activity in 60/60 calendar months. Activity does not certify source reporting completeness.

| Year | Net sales | Gross margin amount | Matching margin sales basis | Weighted margin | Source records |
|---|---:|---:|---:|---:|---:|
| 2021 | ₱77,860,206.26 | ₱50,420,770.93 | ₱77,804,247.26 | 64.80% | 3,407 |
| 2022 | ₱63,234,990.04 | ₱40,799,049.06 | ₱60,493,221.21 | 67.44% | 3,980 |
| 2023 | ₱62,228,966.85 | ₱33,585,582.48 | ₱59,822,843.64 | 56.14% | 5,381 |
| 2024 | ₱50,259,319.88 | ₱19,563,837.42 | ₱49,956,893.05 | 39.16% | 2,831 |
| 2025 | ₱185,396,821.04 | ₱52,333,915.76 | ₱95,077,093.87 | 55.04% | 4,544 |

[Financial summary CSV](study_financial_summary.csv) preserves cents, six decimal places for rates, counts and release identity. Gross margin is before operating expenses. Records without supported gross margin do not enter its numerator or denominator.

## Product contribution

These are **3,307 source-label reporting groups in 2021–2025**, not verified sellable SKUs or normalized medicine demand. Medical combines medicine, medical supply and medical equipment in this dashboard export.

| Reporting category | Selected labels | Signed net sales | Share of study net sales |
|---|---:|---:|---:|
| Medical | 1,099 | ₱256,889,910.87 | 58.52% |
| Non-Medical | 183 | ₱18,745,081.47 | 4.27% |
| Unclassified | 2,025 | ₱163,345,311.73 | 37.21% |

Accepted reporting-category Unclassified remains visible with unresolved underlying identity. The study's counts differ from the All Time master: 598 medicine, 646 medical supply, 131 medical equipment, 209 non-medical and 2,977 Unclassified labels across 2017–2025. Do not copy those broader counts into study-period figures.

ABC uses **positive sales** of ₱439,331,718.46 before cohort/display filtering. Signed negative financial adjustments total ₱-351,414.39. They do not prove physical inventory returns. The threshold-crossing label stays in its starting class under `positive_sales_crossing_inclusive_v2_candidate`.

| ABC class | Selected labels | Share of positive sales |
|---|---:|---:|
| A | 333 | 80.01% |
| B | 693 | 14.99% |
| C | 2,262 | 4.99% |
| Unclassified | 19 | 0.00% |

ABC Unclassified counts labels with no positive-sales contribution. It is separate from reporting-category Unclassified.

## Interpretation for Chapter 4

1. The selected financial population reconciles to ₱438,980,304.07 net sales and 20,143 source records. Use these study figures instead of the broader All Time dashboard total.
2. Recorded annual net sales fell 35.45% from 2021 to 2024. The higher 2025 amount contributes 42.23% of study net sales and retains adjusted allocation/estimated provenance. It does not independently prove actual item mix, demand growth or a disease effect.
3. Only 78.17% of study net sales belongs to the supported margin population. The weighted 57.32% rate describes that population; dividing gross margin by all study revenue would answer a different question.
4. Reporting-category Unclassified contributes 37.21% of signed study sales. Keep that contribution in financial reporting and prioritize identity/unit review before claiming SKU-demand or quantity-order readiness.
5. The 333 A-class labels account for about 80% of positive sales. This supports commercial/catalog review focus, with returns and category uncertainty disclosed; it does not authorize procurement or establish clinical priority.

Company STL remains a separate **January 2020–December 2025, 72-month PHP-revenue** decomposition. It is earlier context plus the study history, not daily territorial/SKU decomposition or a forecast. No disease causality or verified quantity units are established by these figures.

## Sources and method

- [Fresh calculation receipt](../descriptive_validation/2026-10-09T07-40-39-615Z/evidence.json), generated `2026-10-09T07:40:39.615Z`. SHA-256: `19662860d526ca2efb5ccf4256645211bfb916fb8590060901e6e2573b991def`.
- [Authenticated study test receipt](study-delivery.json): one expected passing test, zero unexpected failures. SHA-256: `855072a76fbe71ef2670211e6e33fdf082f0b168ddfabe71bf8957192294f728`. Source-backed category/CSV reconciliation and exact apostrophe search are covered; this does not grant business approval.
- Fact: `workspace.medshield_gold.sales_restart_fact_candidate`, Delta **20**. Dataset `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`. Policy `sales_restart_gold_v7_independent_catalog`. Product master `2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29`.

| Source export | SHA-256 |
|---|---|
| [All export](study-delivery-artifacts/descriptive-acceptance-liv-03583-s-API-dashboard-and-exports-chromium/study-products-All.csv) | `afdf63fc86ff573548185c13e5221a58112b9b0705eae4576dbff6eb10e23a56` |
| [Medical export](study-delivery-artifacts/descriptive-acceptance-liv-03583-s-API-dashboard-and-exports-chromium/study-products-Medical.csv) | `5087d30841fcf56ab9cd072d3fe309186cfba46cdfb711210c93d7a2df858e6f` |
| [Non-Medical export](study-delivery-artifacts/descriptive-acceptance-liv-03583-s-API-dashboard-and-exports-chromium/study-products-Non-Medical.csv) | `961de4c20097d859e4f5bc42f27e977c3b557c87e1c0b0c5eeecaa2a0c0a3913` |
| [Unclassified export](study-delivery-artifacts/descriptive-acceptance-liv-03583-s-API-dashboard-and-exports-chromium/study-products-Unclassified.csv) | `e868abd9549a051fd4436409db4292b03188c36993ce3ddcc7956d5b74401d4c` |

Method: parse retained receipt numbers and CSV amounts with Python `Decimal`; select calendar years/months 2021–2025; sum annual additive amounts and source-record counts; compute `100 × SUM(eligible gross margin) / SUM(same-population net sales)`. Annual sums reconcile independently to the monthly receipt within ₱0.01. Category exports partition the All export, and positive amounts plus signed adjustments reconcile within ₱0.01. ABC class boundaries are independently recomputed from cumulative positive sales before each label. Currency is rounded to cents using half-up rounding; figures do not substitute invented missing values. These are inherited live artifacts with fresh local recomputation, not a new warehouse query.

Reproduction: run `build_study_packet.py --matrix-json <temporary JSON path>` with the bundled Python runtime, then author the summary CSV from that matrix. The file contains aggregated finance/category findings only; credentials and customer-level records are excluded. [Chapter 4 checklist](CHAPTER4_CHECKLIST.md) covers the remaining client/paper review packet.
