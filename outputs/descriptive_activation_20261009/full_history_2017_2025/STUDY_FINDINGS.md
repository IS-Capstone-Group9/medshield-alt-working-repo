# Study findings: 2017–2025

Current project reporting scope: **January 1, 2017–December 31, 2025**. This packet corrects the earlier 2021–2025 subset guidance while preserving that historical packet. Findings are bound to Gold fact **20** and the authenticated full-history exports. Final client release and academic scope acceptance remain separately recorded decisions.

## Financial results

**Eligible signed net sales: ₱626,946,741.81. Supported gross margin amount: ₱288,487,498.72. Weighted gross margin: 60.26%**, using a matching margin-eligible sales basis of **₱478,720,670.03**. The period contains **37,728 Gold source records and 98/108 months with sales observations**. Activity does not certify source completeness. Gross margin is before operating expenses; company net profit cannot be derived from these records.

| Year | Net sales | Gross margin amount | Matching margin sales basis | Weighted margin | Source records | Observed months |
|---|---:|---:|---:|---:|---:|---:|
| 2017 | ₱10,211,167.35 | ₱6,316,157.68 | ₱9,212,606.10 | 68.56% | 1,978 | 7/12 |
| 2018 | ₱51,619,691.27 | ₱28,328,721.76 | ₱44,882,495.39 | 63.12% | 6,181 | 10/12 |
| 2019 | ₱62,542,304.49 | ₱29,125,469.95 | ₱41,211,281.42 | 70.67% | 5,446 | 9/12 |
| 2020 | ₱63,593,274.63 | ₱28,013,993.68 | ₱40,259,988.09 | 69.58% | 3,980 | 12/12 |
| 2021 | ₱77,860,206.26 | ₱50,420,770.93 | ₱77,804,247.26 | 64.80% | 3,407 | 12/12 |
| 2022 | ₱63,234,990.04 | ₱40,799,049.06 | ₱60,493,221.21 | 67.44% | 3,980 | 12/12 |
| 2023 | ₱62,228,966.85 | ₱33,585,582.48 | ₱59,822,843.64 | 56.14% | 5,381 | 12/12 |
| 2024 | ₱50,259,319.88 | ₱19,563,837.42 | ₱49,956,893.05 | 39.16% | 2,831 | 12/12 |
| 2025 | ₱185,396,821.04 | ₱52,333,915.76 | ₱95,077,093.87 | 55.04% | 4,544 | 12/12 |

[Financial summary CSV](study_financial_summary.csv) retains cents, six-decimal percentage rates, month coverage, unknown month identifiers and release metadata. Do not calculate weighted margin by dividing supported margin by all independently eligible net sales or averaging annual percentages.

The ten unknown months are **May–August and October 2017, January–February 2018, and October–December 2019**. Preserve unknowns as missing observations rather than zero. Compare annual totals with their 7/12, 10/12 and 9/12 coverage in the first three years. Do not treat the difference from a fully observed later year as like-for-like growth; matched-period comparisons use their own eligible paired months. Optional dashboard gap estimates do not enter these observed totals.

## Product contribution

The authenticated exports contain **4,491 source-label reporting groups** in the complete period. Medical combines medicine, medical supply and medical equipment. Reporting groups do not establish sellable SKU identity or compatible medicine quantities.

| Reporting category | Exported source labels | Signed net sales | Share of project net sales |
|---|---:|---:|---:|
| Medical | 1,363 | ₱362,376,811.94 | 57.80% |
| Non-Medical | 206 | ₱21,287,340.11 | 3.40% |
| Unclassified | 2,922 | ₱243,282,589.76 | 38.80% |

The accepted full product-master dispositions are 598 medicine, 646 medical supply, 131 medical equipment, 209 non-medical and 2,977 Unclassified labels. Catalog disposition counts and financially eligible export populations are distinct. Unclassified remains an accepted reporting category with unresolved underlying identity.

Candidate ABC uses **₱628,569,441.39 positive sales**, with **₱-1,622,699.58 signed negative financial adjustments** kept separately. Those adjustments do not establish physical inventory returns. The label crossing 80% or 95% remains in its starting class under `positive_sales_crossing_inclusive_v2_candidate`.

| Candidate ABC class | Exported source labels | Share of positive sales |
|---|---:|---:|
| A | 442 | 80.02% |
| B | 932 | 14.99% |
| C | 3,097 | 4.99% |
| Unclassified | 20 | 0.00% |

ABC Unclassified indicates no positive-sales contribution and is separate from reporting-category Unclassified. Rankings support commercial and catalog review; they do not establish clinical priority or authorize quantity orders.

## Interpretation for Chapter 4

1. Use the full-project totals above for 2017–2025 findings. The earlier 2021–2025 packet is a narrower historical analysis and cannot replace these totals.
2. Missing observations affect historical comparisons. State selected periods and paired-month counts before describing a change; no gap is proof of zero demand.
3. The margin-eligible basis covers 76.36% of eligible net sales. The 60.26% rate describes that supported population.
4. The adjusted 2025 source contributes 29.57% of total net sales and retains estimated/allocation provenance. Its annual reconciliation does not independently verify actual product mix, territorial distribution or a disease-driven demand increase.
5. Reporting-category Unclassified contributes 38.80% of signed project sales. Keep it in financial reporting and review source identity/units before SKU-demand claims.

The published company-revenue STL is a separate **January 2020–December 2025 series of 72 contiguous months**. Notebook 06 split the history at gaps and excluded short segments rather than imputing observations. The series describes PHP revenue through trend, seasonal and residual components; it does not cover all nine years, prove disease causality, forecast demand or establish territorial/SKU decomposition.

## Sources and method

- [Retained live calculation receipt](../../descriptive_validation/2026-10-09T07-40-39-615Z/evidence.json), generated `2026-10-09T07:40:39.615Z`. SHA-256 `19662860d526ca2efb5ccf4256645211bfb916fb8590060901e6e2573b991def`.
- [Authenticated full-history acceptance](../full-history.json): one passing test, zero unexpected failures, zero skips. SHA-256 `81bec7a8e25475ee58c96932d7c3fca64619c3f744fd72c19edd16b4adae0400`. These checks establish technical reporting evidence and do not grant business approval.
- Fact `workspace.medshield_gold.sales_restart_fact_candidate`, Delta **20**. Dataset `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`. Policy `sales_restart_gold_v7_independent_catalog`. Product master `2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29`. Publication status `CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW`.

| Source export | SHA-256 |
|---|---|
| [All export](../full-history-artifacts/descriptive-acceptance-liv-72c64-s-API-dashboard-and-exports-chromium/study-products-All.csv) | `6e825c4945e09dece10743a9364883e623ffa2992a536a37eb5e1963d9345627` |
| [Medical export](../full-history-artifacts/descriptive-acceptance-liv-72c64-s-API-dashboard-and-exports-chromium/study-products-Medical.csv) | `3e26cf84bca1683da177320eef180f1b2173fa9eab7c8e8dc219038105d95918` |
| [Non-Medical export](../full-history-artifacts/descriptive-acceptance-liv-72c64-s-API-dashboard-and-exports-chromium/study-products-Non-Medical.csv) | `ee62c6ae2aed44629955d2b58887a23ad7bf22fb8debf81d9626e2b6810e0dcc` |
| [Unclassified export](../full-history-artifacts/descriptive-acceptance-liv-72c64-s-API-dashboard-and-exports-chromium/study-products-Unclassified.csv) | `811ecede0cac93009d41dacb85db3eeea60e46ef2a20b9a1b9d00ff005f49d88` |

Method: parse retained amounts with Python `Decimal`; recompute annual additive totals and source-record counts from monthly observations; independently compare annual and monthly populations within ₱0.01. The source has 108 unique chronological months, exactly ten null gaps, and 98 observed months. Sum the eligible margin numerator and its same-population sales denominator before calculating the rate. Category exports partition the All export by exact source label and reconcile signed net sales. Recompute ABC thresholds from positive-sales cumulative share before each label. Verify the 72 STL inputs and reconstruction within ₱0.00001. Currency presentation uses half-up cent rounding. No cloud query or source modification is performed by this builder.

Reproduction: run `build_full_history_packet.py --financial-only`, author the financial CSV with the bundled Artifact Tool builder, then run `build_full_history_packet.py --export-dir <authenticated export directory>`. All generated files stay in this folder. [Chapter 4 checklist](../CHAPTER4_CHECKLIST.md) retains the remaining figure collection, interpretation and client/paper review work.
