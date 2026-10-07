# MedShield diagnostic analytics: complete question and evidence framework

Prepared **3 October 2026**, Asia/Manila. Accountable role: **Data Analyst**. Supporting work: BI question design and independent analytical QA.

## Purpose, scope and completion meaning

The central diagnostic question is: **Why did recorded MedShield sales and eligible gross profit change, which periods and reporting segments explain the change, and what evidence is needed to establish the business reasons?** The intended users are the analyst and CEO reviewing commercial performance, source quality, product priorities and territory/buyer contributions.

This package supplies the full question specification and the accounting diagnostics supported by the current sales candidate. It includes actual calculations, a data dictionary, analytical rules, stakeholder evidence questions, proposed dashboard outputs, a reporting template and acceptance criteria. It does not record a business release decision or claim that a new diagnostic dashboard has been implemented. Questions requiring missing operational inputs or approved external joins remain explicitly unanswered.

The primary capstone period is **2021–2025**, with **2017–2025** history retained for context and coverage review. Methods use available calendar periods rather than fixed year buttons; future submitted years require their own version-bound evidence. Early-year comparisons use equivalent recorded months. Revenue, gross profit, quantity, geography and pricing have independent evidence requirements.

Interpretation has four levels:

1. **Recorded finding:** a number, eligibility condition, source flag or calendar gap that can be reproduced.
2. **Accounting explanation:** the sum of month, product or area contributions that reconciles to a change in the candidate total.
3. **Business hypothesis:** an explanation such as a government contract, discount agreement, stockout or expanded account base that needs documents and a reliable link to transactions.
4. **Causal conclusion:** a supported mechanism and research design addressing alternatives, timing and confounding. Neither a variance waterfall nor a correlation is sufficient on its own.

For example, “November adds ₱22,995,568.20 to the 2024→2025 sales change” is an accounting explanation. “Disease increased November purchases” is an untested hypothesis. A month missing from either comparison year remains unavailable, even if the business assumes submitted coverage is complete. These distinctions follow the [analytics framework](../.skills/analytics-frameworks.md) and the existing [business acceptance record](DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md).

## Evidence package and current data coverage

The analytical source is `workspace.medshield_gold.sales_restart_fact_candidate VERSION AS OF 17`, policy `sales_restart_gold_v7_independent_catalog`. All included receipts bind the same dataset ID and product/area mapping hashes. The new segment queries were read-only and explicitly pinned to 17; latest history was 17 at both ends. Company monthly totals/STL and transaction/pricing evidence come from saved, checksum-bound receipts for that same release. No source, master, table, model pointer or dashboard runtime was changed.

| Evidence | Grain and extent | Use |
|---|---|---|
| Complete sales fact extraction | 37,728 retained source records, 2017–2025 | Dates, signed measures, eligibility, quality codes, recorded prices and provenance |
| Company calendar | 108 monthly positions; 98 months with recorded sales | Coverage, monthly movement, equivalent-month comparisons |
| Company annual metrics | 9 calendar years | Revenue, eligible profit, eligible denominator and record counts |
| Product master/reporting extract | 4,561 current reporting groups; 4,985 raw title variants | Group identity review and full-population financial concentration |
| Fresh product-year partitions | 7,649 reporting-group/year rows | Annual product contribution and presence comparisons |
| Fresh area-month partitions | 988 raw-area/month rows | Area contributions, proposed buyer grouping, mapping coverage |
| Fresh provenance partitions | 98 evidence-stratum/month rows | Original versus adjusted financial evidence |
| Published STL components | 72 months, January 2020–December 2025 | Trend, seasonal components, residual review |
| Sealed pricing review | All 37,728 fact records | CP frequencies, missing numeric values, package/identity limitations |

Deliverables:

- [Full diagnostic data](../outputs/diagnostic_data_20261003/complete_diagnostic_data.json): all listed aggregates, financial bridges, matched comparisons, quality/pricing summary and complete source manifest.
- [Detailed calculated findings](../outputs/diagnostic_data_20261003/DETAILED_FINDINGS.md): readable segment, concentration, provenance and finance tables.
- [Original company report](../outputs/diagnostic_data_20261003/REPORT.md): coverage, annual/monthly comparisons and largest STL residuals.
- [Fresh extraction receipt](../outputs/diagnostic_data_20261003/segment_receipt.json): SQL, result columns, release identity and checksums.
- [Verification receipt](../outputs/diagnostic_data_20261003/complete_verification.json): generated checks and exact output hash.
- [Question status and owners](../outputs/diagnostic_data_20261003/QUESTION_STATUS.md) and [structured question register](../outputs/diagnostic_data_20261003/question_register.json): all 40 questions, accountable/evidence roles, result keys and remaining boundaries.
- [Independent final-addition verification](../outputs/diagnostic_data_20261003/extension_verification.json): 2,272 separate recalculations/checks of the final concentration, sensitivity, line, exclusion and quality-context additions, plus document integrity.
- [Full transaction input](../outputs/product_sales_rules/2026-10-02T21-00-51-469Z/facts.json) and [sealed review receipt](../outputs/product_sales_rules/2026-10-02T21-00-51-469Z/sealed-review/receipt.json): original checksum-bound preparation evidence. Transactions are referenced rather than duplicated into a second 72 MB raw file.

These files are local analytical review artifacts. Databricks remains the sole analytical runtime source; none is a browser fallback.

## What the current data actually establishes

### Sales and periods

Recorded eligible net sales total **₱626,946,741.81** across 2017–2025. The study-period total for 2021–2025 is **₱438,980,304.07**. There are 37,728 retained lines, 36,848 revenue-eligible lines and 34,105 margin-eligible lines. Lines are not orders, customers or standardized medicine units.

| Comparison | Matched months | Sales change | Growth |
|---|---:|---:|---:|
| 2021→2022 | 12 | −₱14,625,216.22 | −18.78% |
| 2022→2023 | 12 | −₱1,006,023.19 | −1.59% |
| 2023→2024 | 12 | −₱11,969,646.97 | −19.23% |
| 2024→2025 | 12 | ₱135,137,501.16 | 268.88% |

Recorded 2025 eligible sales are **₱185,396,821.04**, compared with **₱50,259,319.88** in 2024. November contributes **₱22,995,568.20**, September **₱18,027,856.60**, May **₱17,774,038.43** and July **₱16,287,749.70** to the annual increase. These are changes against equivalent months, not each month's total sales.

Ten calendar positions have no recorded eligible sales: **2017 May–August and October; 2018 January–February; 2019 October–December**. Their values stay unavailable. Twelve recorded months in 2020–2025 demonstrate activity in each month, not independent proof of complete submitted coverage.

### Area and buyer contributions

| Source/mapped area label | 2024 contribution | 2025 contribution | Change |
|---|---:|---:|---:|
| Government | ₱25,106,298.76 | ₱119,900,480.14 | ₱94,794,181.38 |
| Hospital | ₱15,438,238.52 | ₱54,495,611.93 | ₱39,057,373.41 |
| Marinduque | ₱624,719.51 | ₱1,711,910.00 | ₱1,087,190.49 |
| Quezon | ₱3,189,426.78 | ₱3,779,939.91 | ₱590,513.13 |
| Admin | ₱2,288,346.86 | ₱2,013,777.15 | −₱274,569.71 |
| Batangas | ₱3,595,134.45 | ₱3,495,101.91 | −₱100,032.54 |

The complete table retains Pharma and Personal decreases as well. Government and Hospital explain most of the recorded financial increase. They are customer-type reporting labels and do not establish geographic allocation, an individual buyer, a tender award or a disease-related purchase.

The proposed buyer bridge is **Government +₱94,794,181.38**, **Private +₱40,618,244.49**, **Internal −₱274,924.71**. It follows the current gateway's ordered buyer rules and remains proposed/CEO review pending. Government and Pagbilao precede internal labels; internal labels precede territory/private rules; unmatched labels stay Unknown. Hospital falls under the existing Private proposal, not an inferred public hospital owner. Individual-account identity is unavailable.

### Products, concentration and adjustments

Large 2024→2025 reporting-group contributions include **PROHAB 10MG/ML 20ML +₱14,420,532.11**, **BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML +₱12,988,102.39**, **F6 FETAL MONITOR SINGLE +₱7,458,998.50** and **MONOWEL 1G IV +₱5,890,232.50**. Negative contributions include **SPEEDA 2.5IU/0.5ML −₱3,232,682.37** and **ALBUMINAR-20 20% 50ML −₱2,697,000.00**.

“Recorded only in 2025” means no retained base-year group appears in the eligible accounting partition. It does not establish a product launch, a newly acquired customer or zero prior real demand. All 4,561 reporting groups remain unresolved; verified canonical SKU count is zero. No medicine category, clinical equivalence or pack conversion is inferred from the titles.

The top ten reporting groups account for **51.81%** of positive eligible sales in 2024 and **39.63%** in 2025. This is a decrease in candidate positive-sales concentration, not proof of broader real medicine demand. Eligible signed negative-sales adjustments total **−₱71,933.00** in 2024 and **₱0.00** in 2025. The arithmetic effect of that difference is +₱71,933.00; absence of recorded negative eligible sales is not proof of no returns, cancellations or expiry losses.

### Margin and source provenance

All-year eligible gross profit is **₱288,487,498.72**, divided by **₱478,720,670.03** from the same margin-eligible records, giving **60.262177%**. Do not divide that numerator by full eligible sales and call the result the published margin, or average transaction percentages.

In 2025, eligible profit is **₱52,333,915.76** and its matching revenue basis is **₱95,077,093.87**. The eligible margin is **55.04%**. That basis is **51.28%** of total 2025 revenue, so the rate cannot describe complete-year company profitability. Company expenses are absent; this is transaction gross profit, not company net income.

The 2024→2025 eligible gross-profit increase is **₱32,770,078.34**. The ordered accounting bridge allocates **₱17,669,719.22** to the larger eligible basis at the prior rate and **₱15,100,359.12** to the different eligible rate at the current basis. Changes in row composition and eligibility remain possible explanations; the bridge does not isolate real price, cost or demand effects.

**2020, 2024 and 2025 source files are classified adjusted/estimated at file level.** Consequently, all recorded 2024 and 2025 candidate revenue belongs to that stratum. Annual financial reconciliation does not verify product allocation, quantities or individual prices. Comparisons crossing 2023→2024 also cross an original/adjusted source boundary. Retain the recorded conditional annual-reconciliation acceptance; do not infer final release acceptance.

### Quality, pricing and seasonality

The retained fact contains **11,355 adjusted-source lines**, **1,835 backfill/source-year-mismatch lines**, **880 missing net-sales records**, **835 missing CP records**, **11 missing quantity records** and **432 negative net-sales records**. Codes can overlap. The publication's assessed-source rule counts include excluded/review records and must not use the retained 37,728 rows as their denominator.

The pricing review identifies **1,609 reporting groups with multiple positive original-source CP values**, and **2,240 groups with multiple CP values across all source strata**. It establishes **zero validated comparable unit-price records**. Dates, package identity, source units, trust and pricing agreements are still needed to explain differences. CP is the recorded unit selling price before any separately recorded discount; effective net price is a different derived metric.

Published company STL represents **72 contiguous months**, January 2020–December 2025, with period 12, seasonal window 13 and robust fitting. The largest absolute residual is **May 2020, +₱21,799,765.92**. A residual is departure from fitted trend and seasonal components; it is not a proven data error or a disease effect. The current output is company-level monthly STL, not daily territorial STL. See [the published STL implementation reference](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.STL.html).

## Diagnostic data dictionary and required joins

### Current financial and source fields

| Field | Meaning and diagnostic use | Rule |
|---|---|---|
| `source_record_id` | Stable source-line evidence key | Require non-null uniqueness; distinct IDs can still hide business duplicates |
| `date_delivered`, `month_start`, `calendar_year` | Recorded delivery time | Date/year grouping is separate from source workbook year |
| `dr_number` | Document identifier | Not a verified customer key, order key or stable uploaded line ID |
| `canonical_group_id` | Current reporting identity, including unresolved RAW IDs | Stable comparison key; retain source aliases |
| `canonical_title`, `product_raw`, `normalized_product` | Reporting and source labels | Names do not establish clinical identity or packaging |
| `canonical_sku`, `identity_status`, `unit_of_measure`, packaging fields | Reviewed sellable-product identity | Missing review blocks standardized quantity and comparable price claims |
| `net_sales` | Recorded Net CP / eligible sales revenue | Aggregate only `is_net_sales_eligible`; preserve signed values |
| `gross_sales`, `discount_amount`, `unit_selling_price` | Total CP, recorded discount and CP | Use compatible eligible rows; do not subtract discount twice |
| `total_acquisition_cost`, `unit_acquisition_cost` | Total TP and recorded per-source-unit TP | Require acquisition-cost eligibility and units for price/cost comparisons |
| `gross_margin_amount` | Supported transaction gross profit | Aggregate with `is_gross_margin_eligible` and matching net-sales denominator |
| `quantity` | Recorded delivered amount in source units | Require quantity eligibility; separate original/adjusted evidence and product units |
| Measure eligibility flags | Independent trust/availability boundary for each measure | Valid revenue does not automatically validate quantity, cost or profit |
| `transaction_evidence`, `is_adjusted_source`, source hash/status/policy | Evidence strata and lineage | Preserve adjusted/estimated attribution at every drill-down |
| `quality_rule_codes`, low-trust/backfill flags | Derivation, mismatch and trust findings | Show population, overlap and financial impact where amounts are known |

### Area, external and operational fields

| Data domain | Required fields / join keys | Current status |
|---|---|---|
| Source area | `normalized_area`, display label, `proposed_area_type` | Financial area-month partitions available; buyer proposals remain explicit |
| Geography | Territory ID, region/province/city, mapping status/evidence, approved-flag | Warehouse legacy flags available; revalidation separate; unassigned geography retained |
| Verified accounts and contracts | Account ID, account owner/type, dated contract/tender ID, invoice/DR line link | Not available as verified account-level joins in current fact |
| Comparable product units | Approved SKU, strength/form/container/pack, source unit and conversion version | Unresolved; do not merge Box/Piece or incompatible sizes |
| Disease history | Disease/category, territory ID, reporting period, case definition, counts, provider/file identity | DOH historical candidates exist; approved territory-month sales joins unavailable |
| Weather history | Station/provider grid, territory bridge, month, rainfall/temperature/other field units, completeness | PAGASA 2017–2024; 2025 absent; NASA POWER is a separate proxy |
| Inventory | SKU/location/date, opening/closing stock, receipts, reservations, adjustments and stockout duration | No verified operational series supplied for diagnostic use |
| Demand/order fulfilment | Ordered/fulfilled/cancelled/backordered quantities, reasons, account and SKU | Needed to distinguish unmet demand from low delivered sales |
| Expiry and returns | Batch, expiry date, expiry/wastage/return reason, credit-note amount, original sale link | Negative sales alone cannot establish these reasons |
| Purchasing and lead time | PO/order/receipt dates, supplier, promised delivery, quantity, shipping constraints | Needed for supplier/lead-time explanations |
| Commercial events | Promotions, dated price lists, agreements, tender awards and disruptions | Needed for event explanations and counterexamples |

## Calculation and interpretation rules

### Revenue and matched comparisons

Let `R(P)` be the sum of eligible signed net sales over population `P`. Missing values do not enter the sum as measured zeros. Whole missing months retain null/calendar-gap flags.

For base year `B` and target year `T`, let `M` contain calendar months with recorded eligible revenue in both years:

```text
BaseMatched = Σ R(B,m), m in M
TargetMatched = Σ R(T,m), m in M
Delta = TargetMatched − BaseMatched
GrowthPct = 100 × Delta / BaseMatched, only if BaseMatched > 0
MonthContribution(m) = R(T,m) − R(B,m)
GrowthContributionPP(m) = 100 × MonthContribution(m) / BaseMatched
```

Every chart/table/export must retain `M`, both sums and the base denominator. Contributions sum to the matched delta and percentage-point contributions sum to the growth rate. An 18.78% annual decrease is not the sum of separate month growth percentages. Custom-boundary partial months cannot be treated as full months; compare equivalent supported dates or declare that comparison unavailable.

### Segment contributions and absence

For product or area segment `s`, calculate its eligible contribution over exactly the same company-level compared population. Sort signed `Delta(s)` by absolute amount for investigation; show the largest increases and decreases. The sum across every segment, including unknown/unassigned, must equal the company delta.

The exported product-year comparisons require **12 recorded months in both years**. The area-month comparisons support the exact company matched months even in incomplete early years. Product-year aggregates cannot answer an arbitrary date-range or month-specific product question; obtain an equally bound product-month partition before claiming that behavior.

An absent segment or one with no eligible revenue has zero **arithmetic contribution to the selected eligible total**, while its raw measurement/absence remains separately flagged. This does not mean proven zero actual sales or demand. `target_only` and `base_only` describe retained-record presence, not a product launch or discontinuation. Year filtering must not silently remove zero/null/unknown comparison buckets or only keep top-N groups.

### Positive sales, credits and concentration

```text
PositiveSales = Σ eligible net_sales where net_sales > 0
NegativeAdjustments = Σ eligible net_sales where net_sales < 0
NetSales = PositiveSales + NegativeAdjustments
NetChange = ChangeInPositiveSales + ChangeInNegativeAdjustments
AdjustmentRatio = 100 × abs(NegativeAdjustments) / PositiveSales, if positive
TopKShare = 100 × Σ positive_sales of top K reporting groups / full positive-sales population
```

The separate sign buckets preserve zero-valued eligible records and missing amounts. Financial adjustment reasons require documentary evidence. Net-delta contribution shares can exceed 100% or be negative; use peso and percentage-point contributions by default. ABC/Pareto thresholds retain their existing candidate status and do not establish clinical priority.

### Eligible gross profit and its bridge

```text
GP = Σ gross_margin_amount over margin-eligible records
Basis = Σ net_sales over those same margin-eligible records
Margin = GP / Basis, only if Basis > 0
BasisRatio = 100 × Basis / total eligible net sales, if denominator > 0
```

The basis ratio is a signed financial ratio, not the percentage of rows complete. Retain row eligibility counts separately. A zero/nonpositive or missing denominator makes the rate unavailable.

For comparable declared periods with positive eligible denominators, use the following ordered accounting bridge; margin `m` is a fraction:

```text
BasisEffect = (BasisT − BasisB) × mB
RateEffect = BasisT × (mT − mB)
ΔGP = BasisEffect + RateEffect
```

This exact identity uses base rate first, then current basis. Reversing that order allocates the interaction differently. It does not identify a price/cost cause or remove composition differences between the eligible populations.

### Comparable price, volume and discounts: gated method

After approved physical SKU/unit identity, trusted transaction evidence and compatible price/cost fields exist, derive `NetUnitPrice = net_sales / positive quantity` on a declared same-population scope. Preserve CP separately. Split recorded negative adjustments before modelling positive quantities. Do not calculate a company “average price” by dividing mixed-pack quantities into company sales.

For genuinely comparable common SKUs, the DQ18 specification uses a symmetric two-period identity: `PriceEffect = Σ[(QB+QT)/2 × (PT−PB)]` and `QuantityEffect = Σ[(PB+PT)/2 × (QT−QB)]`. Their sum equals the common-population sales change. The quantity effect can include composition differences; a separate pure volume/mix claim needs defensible cross-SKU unit normalization. Before attributing a price change to discounts, compare recorded discount, dated price list, contract agreement and source formula reconciliation. There are currently **zero validated comparable unit-price records**, so this bridge is specified but not reported as a measured MedShield cause.

### Seasonality, residuals and external association

STL uses `RecordedRevenue = Trend + Seasonal + Residual` for each qualified company month. The existing warehouse components use the 72-month qualifying segment and remain independent of dashboard date selection. Early short/gapped segments are unavailable. The calendar-month observed average is a separate descriptive statistic and cannot substitute for STL. The configuration and distinction follow [statsmodels STL documentation](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.STL.html).

Rank residuals by absolute amount as review candidates, then inspect documents, source strata, contracts and calendar completeness. A statistical threshold, significance label or seasonal-strength score requires an explicitly defined method and sufficient observations; this package does not invent an approved business anomaly threshold. Seasonal subseries and autocorrelation plots are useful future checks of a proposed repeating pattern. [NIST seasonality guidance](https://www.itl.nist.gov/div898/handbook/pmc/section4/pmc443.htm).

For external association, first approve and validate a territory-month join; retain provider, units and overlap. Do not compare national disease counts with an unallocated government-sales total and label it a territorial effect. Keep PAGASA observations and NASA POWER proxy results separate. Predeclare tested variables/lags, handle trend, seasonality, serial dependence, multiple comparisons and missingness, and report sample size and sensitivity to adjusted-source periods. Pearson/Spearman statistics or regression are conditional methods, not computations completed in this package. Associations alone cannot establish cause and effect. [NIST scatter-plot guidance](https://www.itl.nist.gov/div898/handbook/eda/section3/scatterp.htm).

## Detailed diagnostic questions

The question bank below maps the business decision to the necessary population, calculation, output, evidence status and interpretation limit. Computed means the declared candidate calculation is supplied; it does not imply a verified real-world cause.

### How to use the questions

The objective is to explain changes in recorded MedShield sales, determine whether they are commercial movements or evidence problems, and identify which additional facts are needed before planning decisions. The diagnostic chain is: establish a valid comparison → decompose the change → locate contributing records or groups → test competing explanations → record evidence and limitations → assign a review action.

Use these evidence classes consistently:

| Class | Meaning | Permitted wording |
| --- | --- | --- |
| Decomposition | An accounting identity locates where a recorded difference appears. | “November contributed ₱X to the year-on-year difference.” |
| Association | A relationship is estimated between measured variables, with uncertainty and confounding discussed. | “Rainfall and eligible recorded quantity were associated within this historical sample.” |
| Hypothesis | A plausible mechanism remains unverified or only partially evidenced. | “Contract timing could explain the spike; delivery and award records are required.” |
| Verified operational explanation | Independent source documents support the event, timing, affected records and mechanism. | “The listed deliveries were recorded in November under the verified contract.” |

An operational explanation for specific transactions does not establish that a disease, weather event or policy caused the whole sales change. Seasonal decomposition is not causal identification. Source quantities are delivered quantities in their recorded unit, not total market demand. Record counts are source lines, not orders or customers.

Answerability labels below mean:

- **Computed:** the stated numerical calculation exists in `complete_diagnostic_data.json`; this status applies only to the named computed scope, not every method extension or causal interpretation in the question.
- **Receipt-ready:** saved, version-bound aggregates or extracts provide the necessary fields for the stated candidate calculation. The accompanying results package must show whether that calculation was actually executed.
- **Partial:** saved evidence supports part of the question; another extraction, validated mapping or reviewed source document is needed to complete the stated interpretation.
- **Additional evidence required:** the required operational, approved-unit, external-join or causal evidence is absent; return “unavailable” with a concrete dependency.

The current candidate identity is fact Delta version 17 and Gold policy `sales_restart_gold_v7_independent_catalog`. Saved evidence reports 37,728 records, 4,561 unresolved reporting groups, 98 observed months out of 108 calendar months and ten missing historical months. These counts describe this snapshot. Every rerun must discover and record the current identity; they are not permanent invariants.

The delivery combines a fresh read-only version-17 segment extraction (product-year, area-month and provenance-month) with saved descriptive, catalog, publication, full-record, reporting-group and product/pricing receipts. They are audit inputs, not dashboard fallback sources or business release approvals. Candidate financial amounts can reconcile even when product identity, source units and adjusted allocations remain unresolved.

### Sales movement and comparison validity

#### DQ01 — How much did recorded net sales change between comparable periods?

- **Decision:** determine which period changes deserve investigation before revising commercial plans.
- **Data and grain:** eligible `net_cost`, dated source records or monthly aggregates, observation flags, calendar month and exact selection boundaries; comparison period × calendar month.
- **Method:** compare only the paired observed periods under the same filters. `ΔR = R1 − R0`; `growth % = 100 × ΔR / R0` only when `R0 > 0`. Report full selected totals separately from matched-period totals. Open current months and gap estimates stay outside closed-period growth.
- **Output:** both matched totals, peso change, growth, matched keys/count, excluded months and coverage; a comparison table and variance waterfall.
- **Answerability:** **Computed** for the eight adjacent annual matched-month comparisons in `matched_yoy`; exact partial-month custom comparisons require dated records.
- **Interpretation:** a matched-month growth rate controls calendar coverage, but does not prove that all transactions were reported. A missing comparison or nonpositive baseline makes the percentage unavailable, not zero.

#### DQ02 — Which months account for the annual sales difference?

- **Decision:** prioritize source-document review for the months contributing most to the change.
- **Data and grain:** the identical matched month population from DQ01; month pair × eligible net sales.
- **Method:** `ΔRm = R1m − R0m`; growth contribution in percentage points `= 100 × ΔRm / ΣR0m`. Sum all contributions, including negative offsets, back to annual change. Rank by absolute peso contribution and show signed direction.
- **Output:** every month's prior/current sales, contribution in pesos and percentage points, and share of net change where the total change is nonzero.
- **Answerability:** **Computed** for matched monthly contributions in `matched_yoy`; all eight annual comparison scopes are explicit.
- **Interpretation:** contribution is an accounting explanation of where change appears. It does not identify contracts, prices, disease demand or stock availability as its cause. A contributor may exceed 100% when other months offset it.

#### DQ03 — Is the change spread across months or dominated by a few large contributors?

- **Decision:** distinguish broad commercial movement from a concentrated review exception.
- **Data and grain:** matched-month differences from DQ02; comparison × month.
- **Method:** count positive, negative and zero differences; calculate top-three absolute contribution share `Σtop3 |ΔRm| / Σall |ΔRm|`. Also show each contributor's signed impact on net change and median monthly difference. Do not replace the signed bridge with absolute amounts.
- **Output:** contribution concentration, count of advancing/declining months, sensitivity with each largest month removed and an explanation of the changed scope.
- **Answerability:** **Computed** in `matched_month_change_concentration`: positive/negative/zero month counts, median difference, top-three absolute-change share and separately labeled sensitivity after removing each of the three largest contributions.
- **Interpretation:** a concentrated result suggests targeted review; it does not prove an abnormal transaction. Exclusion sensitivity is a diagnostic comparison, not a corrected or approved total.

#### DQ04 — Which adjacent closed months show the strongest rise or fall?

- **Decision:** identify periods for timing, delivery and source-completeness investigation.
- **Data and grain:** eligible monthly sales and observed/missing flags; adjacent calendar-month pair.
- **Method:** compute `Rt − Rt−1` and percentage change only for genuinely adjacent, observed, closed months with a positive prior total. Preserve negative/zero recorded values and break the series at missing periods.
- **Output:** ranked increases/decreases, both amounts, eligible comparison count and unavailable reasons.
- **Answerability:** **Computed** in `adjacent_month_changes`, including explicit unavailable entries for missing/nonadjacent periods and invalid percentage bases.
- **Interpretation:** never compare September directly with November when October is missing and call it month-on-month. Large movement may reflect timing or reporting coverage; investigate before naming a cause.

#### DQ05 — Did sales move with the number of retained source records or recorded value per eligible record?

- **Decision:** establish whether the first investigation should focus on recorded activity counts or value concentration.
- **Data and grain:** eligible revenue and the count of that same revenue-eligible row population, dates and provenance; period × source stratum.
- **Method:** `value per eligible record = ΣR / eligible row count`. Use the exact bridge `ΔR = (N1 − N0) × A0 + N1 × (A1 − A0)`, where `A = R/N`, only for positive counts and a common definition. Publish the order used and a reverse-order sensitivity if presenting attribution.
- **Output:** record-count and value-per-record effects, reconciliation, and top-valued lines where row evidence is available.
- **Answerability:** **Computed** for five full-year comparisons in `eligible_record_count_value_bridges`, using revenue-eligible counts and an explicitly ordered count/value bridge. Retained-record counts are not interchangeable with eligible counts; reverse-order sensitivity is not included.
- **Interpretation:** this is a source-record accounting bridge. It does not measure purchase frequency, customer growth, order size or medical unit demand.

### Product contributions, returns and reporting mix

#### DQ06 — Which reporting labels contribute the most recorded positive sales and net sales?

- **Decision:** prioritize high-value identity and source-document reviews.
- **Data and grain:** all selected reporting groups, `positive_sales`, `negative_adjustments`, eligible net sales, group ID, raw aliases and identity status; reporting group × selected period.
- **Method:** rank positive contribution using the full eligible positive-sales denominator; also show signed net revenue and negative adjustments. Retain every group before applying Top-N display filters.
- **Output:** complete contribution table, top labels, positive-sales share, net share when valid, provenance counts and unresolved identity flags.
- **Answerability:** **Computed** for all 4,561 all-year groups and 7,649 product-year rows in `product_groups_all_years` and `product_yearly`. Selected month/custom-boundary product scopes require a separate product-month or dated-record aggregation.
- **Interpretation:** a reporting label is not a verified medicine SKU. All-year rank cannot explain a particular year's change. A net share may exceed 100% when signed adjustments offset positive sales elsewhere.

#### DQ07 — Which reporting groups contributed to the selected year-on-year change?

- **Decision:** locate the labels and underlying lines behind a period movement.
- **Data and grain:** eligible sales for both selected matched scopes, stable reporting group ID and unchanged grouping identity; group × period × source stratum.
- **Method:** outer-join the union of groups across the two fully assessed scopes; calculate group revenue differences and reconcile to DQ01. Missing group activity may become zero only where absence of eligible records in a complete extracted scope is verified; unresolved source coverage remains unknown.
- **Output:** gainers, decliners, first-recorded and last-recorded groups, signed contribution and source-line drill-down.
- **Answerability:** **Computed** for five full-calendar-year comparisons, 2020→2021 through 2024→2025, in `product_yoy_contributions`. The 2017–2019 partial-year matched-month product comparisons and product-month attribution require an additional aggregation. Reviewed aliases are required for canonical-SKU conclusions.
- **Interpretation:** “first recorded in 2025” does not prove a product launch; “no selected records” does not prove discontinuation. Grouping changes or estimated allocations can create apparent movement.

#### DQ08 — How much did negative sales adjustments reduce the recorded result?

- **Decision:** identify return/credit candidates needing finance and delivery review.
- **Data and grain:** signed revenue, quantity, source ID, date, group, document and credit/return linkage where supplied; period × group × adjustment reason.
- **Method:** separate `P = Σmax(Ri, 0)` and `C = Σmin(Ri, 0)` under revenue eligibility; prove `net R = P + C`. A candidate adjustment-intensity measure is `|C|/P` for `P > 0`; do not call it a confirmed return rate without reason codes.
- **Output:** positive-sales/negative-adjustment bridge, counts, largest negative lines, confirmed versus unconfirmed reason and matched original document if available.
- **Answerability:** **Computed** for all-year group totals, yearly financial partitions and five full-year signed-sales change bridges. Reasons and original-invoice linkages require additional evidence; adjustment-intensity rates remain a derived method unless shown as executed.
- **Interpretation:** negative revenue and negative quantity are different conditions. A negative line can be a correction, return or credit; its commercial reason cannot be inferred from sign alone.

#### DQ09 — Did sales concentration or ABC composition change between periods?

- **Decision:** assess reliance on a small set of reporting groups and focus review capacity.
- **Data and grain:** full positive-sales eligible population, stable group IDs and the same selected cohort definition; group × comparison period.
- **Method:** compute cumulative positive-sales shares in deterministic descending order. Use the documented crossing-inclusive 80/95% ABC rule; labels crossing a threshold stay in their starting class. Compare top-5/10/20% label cohorts, class counts and sales shares after calculating the full denominator.
- **Output:** Pareto curves, ABC transition table and concentration measures with tie-breaking rules and selected population size.
- **Answerability:** **Computed** for yearly top-five/top-ten/top-twenty reporting-group positive-sales shares in `positive_sales_concentration_yearly`. These are label counts, not top-5/10/20% label cohorts. ABC transitions and percentage-cohort comparisons are receipt-ready from complete yearly groups but require their own executed calculation.
- **Interpretation:** ABC measures financial contribution, not clinical essentiality, medicine demand, service risk or stock urgency. Negative/nonpositive contribution remains visible as Unclassified; return amounts remain separate.

#### DQ10 — How much do adjusted product allocations affect the conclusions?

- **Decision:** decide which label-level results can be discussed as recorded attribution and which need source recovery.
- **Data and grain:** eligible sales, source provenance, allocation parent/child linkage, grouping identity and allocation-method/version; group × month × provenance.
- **Method:** compare combined candidate sales with separately reported original-source and adjusted-source financial strata. Reconcile child allocation sums to each verified parent and total; show rank and contribution sensitivity across permitted strata.
- **Output:** provenance bridge, affected labels/months, financial shares, row shares, allocation reconciliation and changes in ranking.
- **Answerability:** **Computed** for yearly/source financial strata in `source_provenance_yearly` and `provenance_monthly`; **partial** for label-specific original/adjusted financial shares, alternative ranks and parent allocation validation. Group extracts provide adjusted record counts and separate quantities, not an interchangeable revenue share. Parent-source accuracy requires original documents.
- **Interpretation:** adjusted record share is not adjusted revenue share. A file marked adjusted can contain an annual total that reconciles while product attribution and quantities remain estimates. Excluding it changes the scope; it does not recover actual history.

### Geography, buyer ownership and channel

#### DQ11 — Which raw areas and reviewed territories account for the sales change?

- **Decision:** target commercial/source review by location without misclassifying buyer type as territory.
- **Data and grain:** raw area, reviewed territory/region, mapping identity, eligible sales, source provenance and date; raw area or mapped territory × matched period.
- **Method:** decompose the same selected difference across mutually exclusive mapped territories plus unmapped geography. Keep raw-area totals alongside derived mapping totals and any estimated geographic splits.
- **Output:** contribution waterfall, mapped/unmapped reconciliation, location review table and drill-down to source records.
- **Answerability:** **Computed** for 988 raw-area/month rows and all eight matched annual raw-area contribution comparisons in `area_monthly` and `area_yoy_contributions`. Warehouse geographic yearly partitions are also profiled; reviewed-territory contribution and mapping acceptance remain separate gates.
- **Interpretation:** `Government` is not a province. A raw area label, reference anchor or Mindoro display split does not establish transaction delivery geography.

#### DQ12 — Did the Government, Private, Internal or Unknown buyer composition change?

- **Decision:** assess commercial dependence by proposed buyer ownership and direct classification review.
- **Data and grain:** raw area/account evidence, buyer mapping rule/hash, eligible sales and date; derived buyer cluster × matched period, including Unknown.
- **Method:** sum signed sales in exhaustive, nonoverlapping clusters; reconcile to all selected revenue, including unmapped geography. Calculate buyer composition only where the signed denominator and components make a proportion meaningful.
- **Output:** buyer shares and peso contributions, Unknown amount, mapping basis, observed/adjusted strata and unresolved-classification list.
- **Answerability:** **Computed** for proposed monthly buyer assignments and eight matched annual proposal bridges in `buyer_proposals_monthly` and `buyer_yoy_contributions`. They are labeled `proposed_CEO_review_pending`; source ownership and final acceptance require reviewed account evidence.
- **Interpretation:** inferred buyer ownership is distinct from source-recorded ownership, geographic coverage and channel. Do not drop Unknown and present the remaining shares as the whole business.

#### DQ13 — Is an area movement explained by its buyer or reporting-product composition?

- **Decision:** distinguish a broad territory movement from a limited buyer/product contribution before reallocating review effort.
- **Data and grain:** eligible sales, period, raw/reviewed geography, derived buyer cluster and stable reporting group; territory × buyer × group × period.
- **Method:** build a cross-tab and an additive contribution bridge across disjoint cells. Compare within-cell changes with changes in composition; retain Unknown/unmapped cells. Avoid summing separate product and buyer bridges into one total because they overlap.
- **Output:** largest contributing cells, area-specific gainers/decliners and an explicit reconciliation to the selected territorial difference.
- **Answerability:** **Partial:** the supplied product-year and area-month marginals support separate contribution explanations. A fresh pinned joint area × product partition is required for their cross-tab; the saved fact extraction does not contain area fields, so these marginals cannot reconstruct it. Approved geography/buyer interpretation and canonical products remain separate dependencies.
- **Interpretation:** a compositional shift identifies where revenue moved. It does not prove that a territory's population, disease intensity or buyer behavior changed.

#### DQ14 — Are geographic comparisons distorted by unequal evidence coverage or mapping confidence?

- **Decision:** determine whether area rankings are fit for planning review.
- **Data and grain:** selected eligible sales, mapped/unmapped flag, source-row counts, observed months, mapping evidence/confidence and estimated-child records; territory × month.
- **Method:** report mapped financial amount and signed total first; mapped revenue coverage is available only when its denominator and components are valid. Separately measure valid source-row mapping coverage and observed-month coverage. Reconcile estimated Mindoro children to their parent without counting the parent twice.
- **Output:** coverage matrix, Unknown rows/amounts, excluded-region amounts, mapping-confidence distribution and ranking sensitivity.
- **Answerability:** **Computed** for yearly warehouse geographic financial/record partitions in `geographic_mapping_yearly`, including evidence-status flags. Coverage ratios, ranked sensitivities and independent mapping correctness remain separate review/computation steps; legacy approval flags are not revalidated by this report.
- **Interpretation:** revenue coverage, row coverage and month presence answer different questions. None proves complete reporting or verified geography. A region filter can remove unmapped records; disclose that changed population.

### Gross margin, recorded prices and price/quantity hypotheses

#### DQ15 — Did gross margin amount and the weighted margin rate change on a comparable eligible basis?

- **Decision:** identify finance review periods while avoiding unsupported company-profit claims.
- **Data and grain:** `net_income`, `net_cost`, margin eligibility, dates and matched periods; period × same eligible source-row population.
- **Method:** `gross margin rate = Σeligible net_income / Σsame eligible net_cost`. Compare gross margin amount and rates separately, with both revenue bases and eligible-row coverage. A nonpositive reporting denominator is not a meaningful profitability percentage.
- **Output:** peso gross-margin change, percentage-point rate change, revenue basis and excluded amount/count by period.
- **Answerability:** **Computed** for annual/monthly eligible margin and five full-year eligible-basis/rate accounting bridges in `eligible_gross_profit_change_bridges`; the ordered bridge is not causal and eligible-population changes remain visible.
- **Interpretation:** weighted rate is never an average of row rates. The 2025 candidate basis is roughly 51.28% of total eligible revenue; this is a signed financial-basis ratio, not a row-completeness percentage. No operating expenses are available.

#### DQ16 — Which records and reasons prevent a fuller gross-margin interpretation?

- **Decision:** recover missing cost/profit evidence or approve a narrower finance scope.
- **Data and grain:** revenue eligibility, margin eligibility and rejection/warning reasons, gross-margin amount, net sales, acquisition cost and provenance; exclusion reason × month × source.
- **Method:** partition the revenue-eligible population into margin-eligible and ineligible rows; report excluded signed revenue, counts and reasons. For overlapping warnings, publish a mutually exclusive primary-reason rule plus the separate warning-frequency list.
- **Output:** margin-eligibility reconciliation, largest excluded lines, cost/profit missingness and recovery queue.
- **Answerability:** **Computed** for annual revenue-eligible/margin-ineligible counts, excluded known sales, missing cost/profit fields, associated warning frequencies and the largest excluded lines in `margin_eligibility_exclusions`. **Partial** for mutually exclusive primary exclusion causes and recovery, which require eligibility-policy/source review; an overlapping warning is not assumed to be the cause.
- **Interpretation:** the observed eligible margin cannot be projected to excluded rows by assuming the same rate. A warning count is not automatically a count of ineligible rows and warnings may overlap.

#### DQ17 — Which labels and periods have variable recorded CP, and what can be verified about those prices?

- **Decision:** prioritize packaging, invoice and price-field review.
- **Data and grain:** recorded CP/`unit_cost`, date, raw title, reporting group, source provenance and pricing eligibility; group × recorded price × year × provenance.
- **Method:** describe exact recorded price frequencies/ranges independently in original and adjusted strata; show years/dates and quantity ranges as context. Preserve null, zero and negative states separately. Do not derive a canonical sellable identity from price equality or difference.
- **Output:** varying-price groups, example rows, source-stratified price table, verified comparison eligibility and documentary review list.
- **Answerability:** **Computed** for reported-price variation/state/warning counts under `pricing_review`, derived from the sealed full review; **additional evidence required** for validated unit-price comparison. Current eligible comparison count is zero.
- **Interpretation:** differences may arise from dates, units, transcription or terms. They do not prove bulk discounts, negotiated pricing, inflation or different SKUs. File-level adjusted provenance in 2020/2024/2025 must remain explicit.

#### DQ18 — Can the sales change be attributed to verified price, delivered quantity and product mix?

- **Decision:** determine whether commercial pricing or quantity/mix needs review after physical identity and unit validation.
- **Data and grain:** independently reviewed SKU, comparable sellable unit, positive eligible delivered quantity, trusted net sales/CP, date and matched periods; reviewed SKU × period.
- **Method:** for common verified SKUs use `p = R/q` as an explicitly derived effective net price. A symmetric exact two-factor bridge uses price effect `Σ[(q0+q1)/2 × (p1−p0)]` and quantity effect `Σ[(p0+p1)/2 × (q1−q0)]`. Report new/absent verified SKUs and returns separately. This quantity effect includes composition effects; do not rename it pure volume. Split aggregate volume and mix only if cross-SKU quantity normalization is defensible, with a documented path and order sensitivity.
- **Output:** reconciliation of permitted effects, comparable population, rejected-unit reasons and sensitivity to decomposition order.
- **Answerability:** **Additional evidence required:** verified product identities, units, trusted prices and quantities. The current zero validated unit-price rows prevent a factual price/volume conclusion.
- **Interpretation:** changes in unreviewed source quantities or unresolved CP cannot explain medical demand. A revenue increase alone does not establish either more medicine sold or a selling-price rise.

#### DQ19 — Did discounts, acquisition cost or formula inconsistencies change recorded gross margin?

- **Decision:** focus finance review on commercial terms, purchasing cost evidence or source errors.
- **Data and grain:** quantity, CP, gross sales, discount amount, net sales, TP/unit, total acquisition cost, gross-margin amount, formula diagnostics and source trust; source record × period.
- **Method:** retain recorded fields and check `q × CP ≈ gross`, `gross − discount ≈ net`, `q × TP ≈ acquisition cost`, `net − acquisition cost ≈ gross margin` where all inputs are eligible. Use the documented ₱0.02 monetary reconciliation tolerance for the supported record checks. Compare discounts and acquisition costs only within consistent scopes; produce a sales/discount/cost bridge rather than double-counting discounts already in net sales.
- **Output:** formula exception ledger, signed discrepancy amounts, discounts and acquisition costs by comparable group and source, and verified finance explanations.
- **Answerability:** **Partial:** sealed review provides recorded sales-price formula diagnostics; full cost-field checks and reason evidence require the relevant row fields and finance review.
- **Interpretation:** a mismatch flag prompts review, not automatic replacement of a field. Absence of ordering, freight, holding and operating expenses prevents total landed-cost or net-profit conclusions.

### Seasonality, trend and exceptional months

#### DQ20 — Do the same calendar months repeatedly have higher recorded sales?

- **Decision:** identify historical scheduling patterns for review without assuming recurring disease demand.
- **Data and grain:** eligible monthly revenue and observed flags; calendar month × year.
- **Method:** compute observed calendar-month mean, median, range and contributing year count; compare a full-history panel with the contiguous 2020–2025 panel. Missing months are omitted as unknown, not zero. Show year-normalized shares only for years with a comparable, explicitly stated observation scope.
- **Output:** calendar-month profile with individual-year values, sample count and sensitivity to unusually large months.
- **Answerability:** **Computed** for observed means/counts in `calendar_month_average` and full-history medians, ranges and every leave-one-year-out mean in `calendar_month_distribution_sensitivity`. Year-normalized profiles and separate 2020–2025 distribution panels are method extensions; no recurring causal seasonal effect is asserted.
- **Interpretation:** a pooled calendar average is not STL. It combines growth, one-off contracts, adjusted evidence and seasonality; unequal year counts or large transactions can create an apparent seasonal peak.

#### DQ21 — How much of each recorded month is described by STL trend, seasonality and residual?

- **Decision:** distinguish modeled repeating patterns from exceptional periods needing source review.
- **Data and grain:** contiguous monthly eligible candidate revenue, pinned STL components and computation metadata; month in the qualifying full-history segment.
- **Method:** verify `observed = trend + seasonal + residual` for every month and match the fact/mapping identity. Use the actual published segment and parameters; preserve breaks at missing months. Current supported segment is 2020–2025, 72 months.
- **Output:** components, segment boundary, parameter/version record, reconstruction residual and ranked exceptional months.
- **Answerability:** **Computed** for all 72 version-matched monthly components in `stl_all_components` and their reconstruction checks. Interpretation remains full-history descriptive decomposition.
- **Interpretation:** full-history smoothing uses information from later observations and is not a real-time forecast. Date-filtered dashboard values do not silently redefine the published STL fit. Adjusted source evidence remains in the candidate series.

#### DQ22 — Which residual months deserve investigation, and what happens if the flag rule changes?

- **Decision:** order the exception-review queue reproducibly.
- **Data and grain:** STL residual, observed amount, trend/seasonal components, source coverage and eligible record IDs; month.
- **Method:** rank absolute residuals. For optional candidate flags, document a robust threshold such as `|r − median(r)| > 3 × 1.4826 × MAD(r)` and report the threshold and sensitivity; if MAD is zero, withhold the standardized flag and use an explicit alternate rule. Keep the ranking even when no approved flag threshold exists.
- **Output:** flagged or ranked months, signed residual, magnitude, coverage/provenance context and linked source review status.
- **Answerability:** **Computed** for the complete 72-month absolute-residual ranking in `stl_residual_ranked_all_months`. Statistical threshold/flag sensitivity is specified but not executed; business anomaly acceptance requires review.
- **Interpretation:** a residual is unexplained by this fitted decomposition, not proof of a fraudulent transaction, disease surge, stockout or data error. The flag threshold is a proposed investigation rule, not a new business policy.

#### DQ23 — Are apparent seasonal patterns stable across years and source strata?

- **Decision:** judge whether calendar patterns are credible enough to inform historical planning review.
- **Data and grain:** comparable monthly revenue, observed/source flags and the candidate segment; month × year × source stratum.
- **Method:** compare within-year calendar profiles, leave-one-year-out calendar summaries and original-versus-adjusted scope. Refit STL only when a revised stratum has a qualifying contiguous series; do not fill gaps to make it eligible. Show differences in segment and sample size.
- **Output:** year-by-month panel, seasonal rank stability and leave-one-year-out/source-stratum sensitivity.
- **Answerability:** **Computed** for pooled calendar-month leave-one-year-out means in `calendar_month_distribution_sensitivity` and the 98 provenance-month partitions. Within-year seasonal ranks, source-stratum seasonal comparisons and alternative qualifying STL fits are method extensions rather than evidence of stability.
- **Interpretation:** sensitivity can weaken confidence in recurring patterns. It does not identify an alternative source as more accurate without independent evidence, and a short original-only series may not support STL.

#### DQ24 — Does an exceptional month represent a few large source lines or widespread recorded activity?

- **Decision:** choose between targeted documentary review and a broader commercial investigation.
- **Data and grain:** eligible records for flagged month and comparable month, group, raw area, amount, source/document IDs and provenance; source line within month.
- **Method:** calculate top-one/top-five/top-ten positive-line shares against that month's full positive-sales denominator; show signed negative adjustments and net amount separately. Inspect document clusters only after validating whether document IDs identify one invoice or multiple legitimate lines.
- **Output:** line concentration, amount/record distribution, contributing labels/areas and reviewable document list.
- **Answerability:** **Computed** for all 98 recorded months' top-one/top-five/top-ten positive-line shares and linked high-value source IDs in `monthly_source_line_concentration`. **Partial** for a joint area × product × source-line attribution and original contract/invoice verification, which need their corresponding data/documents.
- **Interpretation:** one large contract allocation can dominate the recorded month. Many retained source lines can still arise from one document; never equate line counts with independent purchases.

### Data quality, lineage and alternative evidence explanations

#### DQ25 — Are missing months and incomplete reporting changing the comparison?

- **Decision:** recover source gaps or constrain the historical scope.
- **Data and grain:** expected calendar, monthly observation flags, source-file/sheet manifests, record counts, period closure and finance control totals; source × calendar month.
- **Method:** enumerate all expected months, classify observed/missing/confirmed-zero/partial states, and reconcile imported totals to source controls. Compare common months without estimates. A confirmed zero requires explicit source evidence of closed-period zero activity.
- **Output:** coverage matrix, the ten current missing months, evidence owner, matched comparison eligibility and unresolved completeness decisions.
- **Answerability:** **Computed** for all 108 calendar-month presence states, 98 observed and ten missing; **additional evidence required** for complete reporting and confirmed zero claims.
- **Interpretation:** the existence of one record proves presence, not completeness. Recovering gaps can change ranks, annual totals and growth; such revisions require a new version-bound analysis.

#### DQ26 — Which missing fields, warnings and formula issues affect each analytic measure?

- **Decision:** prioritize data repairs by material financial or analytical impact.
- **Data and grain:** field state, source-row ID, eligible flags, warning/reject reason, amount and provenance; issue × year × measure.
- **Method:** distinguish null, recorded zero and negative fields; report unique affected-row counts and overlapping issue frequencies separately. Create measure-specific eligibility intersections so revenue, margin, price and medical-demand availability are not conflated.
- **Output:** missingness/state profile, affected revenue when known, eligibility matrix and repair queue with preserved source values.
- **Answerability:** **Computed** for numeric states, warning counts and retained fact quality-rule counts in `pricing_review` and `retained_fact_quality_rule_counts`, plus associated known eligible sales/profit amounts in `retained_quality_rule_financial_context`. Mutually exclusive issue intersections and a verified repair disposition remain separate steps; associated revenue is not the amount of an error or loss.
- **Interpretation:** 32,749 warning rows do not mean 32,749 invalid sales records. Some issues block only identity, unit-price or medical-demand conclusions while existing eligible financial reporting remains usable.

#### DQ27 — Are there duplicated business events, even though source-record IDs are unique?

- **Decision:** identify possible duplicate imports or legitimately repeated lines before changing totals.
- **Data and grain:** source hash/workbook/sheet/row, source ID, document number, date, raw area/product, quantity, price and financial fields; candidate event fingerprint × source lineage.
- **Method:** verify source-ID uniqueness, then profile exact and plausible business-key collisions across files. Compare source documents and import history before deciding that an event is duplicated. Retain a suspected/confirmed/legitimate outcome for each review group.
- **Output:** duplicate-candidate ledger, affected amount, provenance match and signed-off disposition; no silent deletion.
- **Answerability:** **Receipt-ready** for zero duplicated saved source IDs; **partial** for business duplication because no stable verified sales line identifier exists and source documents are required.
- **Interpretation:** different IDs can represent one duplicated event; identical amounts or DR numbers can also represent legitimate multiple lines. Neither finding authorizes deletion or proves an error.

#### DQ28 — How do source trust and adjusted/backfilled strata change the findings?

- **Decision:** decide which statements can be made with which evidence label.
- **Data and grain:** eligible financial fields, original/adjusted/backfill/low-trust flags and source acceptance record; period × source stratum × analytic measure.
- **Method:** produce separate strata, their combined total and reconciliation; compare movement, concentration, margins and quantity availability under disclosed scopes. Record whether classification is file-level or row-level. Reconcile totals without implying that reconciliation verifies attribution.
- **Output:** evidence-stratified fact table, allowed metric matrix, unavailable conclusions and material sensitivity findings.
- **Answerability:** **Computed** for yearly and monthly provenance financial partitions and row counts. Original-versus-adjusted finding sensitivity, backfill/low-trust intersections and independent source verification remain partial rather than confirmed explanations.
- **Interpretation:** adjusted 2020/2024/2025 files do not become independently observed medicine quantities or prices. An original-only exclusion analysis changes coverage, including whole years, and is not an approved replacement series.

#### DQ29 — Does every diagnostic result reproduce against one identifiable dataset?

- **Decision:** determine whether the diagnostic package is safe to cite and review.
- **Data and grain:** dataset ID, fact Delta version, policy/mapping hashes, SQL/extraction receipt, input checksums, transformation code/version, run time and result file; analytical run × input artifact.
- **Method:** verify input bytes against checksums, enforce identity consistency, reconcile period/group/source partitions, record decimal precision/tolerances and rerun the exact calculation. If current SQL access fails, label saved-receipt analysis as offline and do not substitute it into runtime analytics.
- **Output:** lineage manifest, executed check counts/results, formula registry, reproducible commands and remaining unverified checks.
- **Answerability:** **Computed** for delivery input identities/checksums and executed partition/arithmetic checks; a fresh read-only fixed-version segment extraction is bound to the result. Current unpinned live state, source completeness and notebook/operator execution are separate verification tasks.
- **Interpretation:** a checksum verifies file identity, not commercial truth. A technical pass or candidate status does not grant CEO release approval.

### Disease and weather association questions

#### DQ30 — Can sales and external observations be joined at a defensible territory-month grain?

- **Decision:** decide whether external association analysis is admissible at all.
- **Data and grain:** reviewed sales territory, month and eligible measure; DOH disease/onset/reporting/geography metadata; PAGASA station-month and NASA coordinate-month/provider metadata; mapping version and coverage.
- **Method:** define one target key, aggregate each source to one row per target key before joining, test join cardinality, retain unmatched records and prohibit multiplication of sales totals. Restrict to closed overlap periods and document onset-versus-reporting date semantics.
- **Output:** join manifest, eligible keys/month count, excluded sales amounts, external missingness, mapping review and readiness decision.
- **Answerability:** **Additional evidence required:** territory/external joins remain unapproved and current external-ready sales row count is zero.
- **Interpretation:** DOH 2018–2026 declaration does not create a complete 2026 sales comparison. Official PAGASA supplied coverage ends in 2024. NASA POWER is a separately labeled proxy and cannot fill 2025 as official PAGASA data.

#### DQ31 — Are approved disease indicators associated with eligible recorded sales or delivered quantity?

- **Decision:** assess historical disease context for commercial review after DQ30 passes.
- **Data and grain:** matched closed territory-month disease indicator and sales outcome; reviewed medical product/disease linkage where a medicine-specific outcome is used; territory × disease × month.
- **Method:** first inspect paired scatter/time plots and Spearman/Pearson association with paired sample counts. Use a documented disease-intensity formula appropriate to source denominators. Compare raw and seasonality/trend-adjusted associations; preserve source provenance and quantify uncertainty using a method that respects temporal dependence.
- **Output:** effect/association estimate, uncertainty, sample/exclusion counts, territory/medicine eligibility and competing explanations.
- **Answerability:** **Additional evidence required:** approved geographic and disease-product mappings and independently eligible quantity/SKU evidence.
- **Interpretation:** a recorded sales association is not proof of disease-driven market demand. Raw case counts across unequal populations and administrative aggregation require explicit denominator caveats; no arbitrary disease index weights may be presented as approved.

#### DQ32 — Do historical rainfall, temperature or other weather measures associate with recorded movement?

- **Decision:** determine whether weather is useful historical context rather than an unsupported explanation.
- **Data and grain:** approved territory-month sales and provider-specific weather measures in documented units, stations/coordinates, missingness and source provenance; territory × month × provider.
- **Method:** analyse PAGASA and NASA separately within their covered periods, with pairwise sample counts and trend/seasonality controls. Document monthly aggregation rules; do not sum temperature averages or mix precipitation definitions. Inspect proxy-versus-official overlap before substituting provider features.
- **Output:** paired plots, association estimates/uncertainty, provider comparison, coverage matrix and interpretation statement.
- **Answerability:** **Additional evidence required:** reviewed station/coordinate mapping and territory joins.
- **Interpretation:** weather-sales correlation can reflect shared seasonality, reporting changes or contracts. Provider-derived exposure is not direct evidence of weather at each delivery point or an official warning.

#### DQ33 — Are associations delayed, and are the results stable after seasonality and multiple comparisons?

- **Decision:** test whether a proposed mechanism survives obvious alternative explanations.
- **Data and grain:** the approved paired series from DQ31/DQ32, with a prespecified small set of lags and outcomes; territory × month.
- **Method:** predeclare plausible lag direction/window, compare contemporaneous and lagged associations, and report every tested specification. Include seasonal/time controls, temporal dependence checks and a documented multiple-testing correction or clearly label exploratory results. Report sensitivity to exceptional months and adjusted-source periods.
- **Output:** lag-effect table, corrected/exploratory status, robustness results and rejected competing explanations.
- **Answerability:** **Additional evidence required:** approved joins, adequate paired coverage and reproducible statistical computation.
- **Interpretation:** selecting only the best correlation after testing many lags exaggerates evidence. Autocorrelation can make naive significance tests misleading. Lagged correlation alone is not causation or proof of forecast usefulness.

#### DQ34 — Could disease or weather explain a spike beyond contracts, reporting and availability changes?

- **Decision:** decide whether to retain the external explanation as context, an association or a testable causal hypothesis.
- **Data and grain:** verified event timing, comparison/control territories or products, contracts/campaigns, coverage changes, inventory constraints and approved external signals; intervention/exposure × comparable group × time.
- **Method:** write competing mechanisms before analysis. A causal design requires a documented identification strategy, credible comparison, pre-period diagnostics and sensitivity to confounding. Without those conditions, report an observational explanation register, not a causal effect.
- **Output:** evidence-for/evidence-against matrix and, only if warranted, an identified effect estimate with uncertainty and explicit assumptions.
- **Answerability:** **Additional evidence required:** independent operational events, exposure definition and defensible comparison design.
- **Interpretation:** a disease increase, rainfall peak and revenue spike occurring together do not establish which caused which. Diagnostic completion may correctly conclude that the causal explanation remains unknown.

### Operational and commercial mechanisms requiring independent evidence

The following operational field names describe required input concepts, not columns asserted to exist in the current Gold contract. Their schemas and source owners must be agreed before ingestion.

#### DQ35 — Did contract awards, delivery schedules or posting cutoffs drive concentrated months?

- **Decision:** distinguish transaction timing from sustained commercial movement.
- **Data and grain:** contract/award ID and value, award date, scheduled/actual delivery, invoice and posting dates, product lines, credit adjustments and verified source lineage; contract × delivery/invoice line × date.
- **Method:** link independently verified contracts to contributing lines in DQ02/DQ24; compare award, delivery and posting timelines and reconcile contract totals. Test alternate timing explanations without reassigning dates unless finance approves a correction.
- **Output:** contract timing bridge, affected periods/amounts and verified versus estimated allocations.
- **Answerability:** **Additional evidence required:** original award, delivery and invoice evidence. Reporting labels containing contract names identify review targets, not verified contracts or physical SKUs.
- **Interpretation:** high November revenue may reflect scheduled fulfillment or posting, but the sales aggregate alone cannot decide between them. Contract value is not automatically recognized sales revenue.

#### DQ36 — Did stock constraints suppress fulfilled sales while customer demand remained unmet?

- **Decision:** determine whether a sales decline warrants stock-availability review.
- **Data and grain:** timestamped on-hand/available stock, customer order quantity/date, fulfilled/cancelled/backordered quantity, lost-sale reason and verified SKU/unit; SKU × location × day/order line.
- **Method:** reconcile order demand to fulfillment and backlog; calculate stockout duration from stock snapshots and unfilled quantities from order records. Compare periods with similar demand and expose censored sales; do not infer lost demand from zero recorded sales.
- **Output:** verified stockout episodes, unfilled quantities/value where supported, fulfillment rate and affected lines.
- **Answerability:** **Additional evidence required:** current stock, order-demand/backorder data and reviewed units are unavailable.
- **Interpretation:** delivered quantity captures fulfilled activity only. A sales fall can also reflect lower orders, reporting gaps or timing; zero revenue does not prove a stockout.

#### DQ37 — Did fulfillment or delivery delays move sales between periods or create credits?

- **Decision:** identify service/process improvements supported by actual order evidence.
- **Data and grain:** requested/committed/delivered dates, order/delivery line linkage, quantity requested/fulfilled, acceptance and credit reason; order line × shipment.
- **Method:** calculate on-time delivery against one approved commitment rule and fill rate against requested quantities; reconcile partial deliveries across months. Compare late/short deliveries with linked credit records and revenue timing.
- **Output:** late-delivery and short-fill cohorts, shifted delivery quantities/amounts and confirmed credit explanations.
- **Answerability:** **Additional evidence required:** stable order-line IDs, commitment and fulfillment records. DR numbers alone do not provide a verified line-level fulfillment history.
- **Interpretation:** posting-date sales cannot establish promised delivery performance. Do not present service levels or logistics causes without agreed denominators and timestamps.

#### DQ38 — Did supplier lead-time or purchasing constraints affect availability and margins?

- **Decision:** prioritize supplier/process review before proposing procurement parameters.
- **Data and grain:** supplier ID, purchase-order/requisition dates, promised/actual receipt, ordered/received quantities, reviewed SKU/unit, invoice costs and linked stock availability; purchase-order line × receipt.
- **Method:** calculate observed lead-time distributions, late/short receipt rates and verified cost changes; align affected receipts to downstream fulfillment. Separate requested, supplier-confirmed and actual lead time and document partial receipts.
- **Output:** supplier exception ledger, quantiles/variation, cost bridge and supported availability links.
- **Answerability:** **Additional evidence required:** supplier, procurement and receipt evidence is absent from sales-only diagnostics.
- **Interpretation:** acquisition-cost fields on sales rows do not measure supplier performance. No EOQ, reorder point, safety stock or cost-minimizing purchase conclusion is supported until required policies and operational inputs exist.

#### DQ39 — Did expiry, damage or aging inventory contribute to credits or low movement?

- **Decision:** review avoidable losses and stock handling where evidence exists.
- **Data and grain:** batch/lot, received quantity/cost, on-hand age, expiry date, disposal/write-off event, reason, transfer and credit linkage; SKU × lot × location × time.
- **Method:** reconcile batch movement and remaining stock, compute expiry exposure within an explicitly chosen horizon, and link write-offs/credits to verified causes. Slow recorded sales alone may identify a review candidate; dead stock requires on-hand/age evidence.
- **Output:** confirmed loss/expiry events, at-risk stock when supported and evidence-linked adjustment amounts.
- **Answerability:** **Additional evidence required:** batch, stock age, expiry, inventory balance and disposal history are unavailable.
- **Interpretation:** low revenue, a label containing “losses” or a negative line does not prove expired medicine or dead stock. Do not report an invented expiry KPI.

#### DQ40 — Did customer terms, tenders, campaigns or account changes alter sales and recorded prices?

- **Decision:** identify commercial mechanisms worth repeating, reviewing or correcting.
- **Data and grain:** verified customer/account ID, terms/price agreement and effective dates, tender/contract/campaign IDs, eligible invoice lines and reviewed SKU/unit; account × SKU × event period.
- **Method:** link documentary terms to recorded transactions, compare within-account/SKU periods under stable units, and separate new accounts from first-recorded labels. A comparison group and confounding controls are needed for a campaign-effect claim; otherwise record a supported event association.
- **Output:** confirmed agreement/event timeline, associated amounts, comparable account/SKU cohort and explanation confidence.
- **Answerability:** **Additional evidence required:** verified account identifiers and commercial agreements. Source area, DR number, transaction quantity and price variation do not identify a customer or prove negotiation.
- **Interpretation:** a discount exists only if recorded/verified; its reason remains unknown without evidence. Do not infer retention, repeat buying, bulk terms or tender wins from aggregates.

### Stakeholder interview and evidence request register

An interview establishes context and ownership; it is not a substitute for records. For every answer, record respondent role, interview date, exact period/scope, documentary reference, contradictions and verification status. Request only the fields required for the question, mask customer identifiers in public thesis material, and keep commercial documents in the approved access boundary.

| ID | Owner to interview | Questions to ask | Evidence requested | Linked diagnostic questions |
| --- | --- | --- | --- | --- |
| EI01 | Finance/source owner | Are each year's imported files complete? Which months were unavailable, genuinely zero, partial or intentionally excluded? Who can attest a closed period? | File/sheet manifest, closed-period controls, import totals and signed completeness record. | DQ01, DQ04, DQ25 |
| EI02 | Finance/source owner | Why are 2020, 2024 and 2025 files adjusted? Which fields are reconstructed? Which original documents survive? What exactly did financial acceptance approve? | Original workbooks/documents, adjustment methodology, parent-child allocation ledger and scoped acceptance. | DQ10, DQ28, DQ35 |
| EI03 | Finance | What prevents profit/cost eligibility in the excluded 2025 population? Can cost or margin be recovered without guessing? Are unusual rates corrections, free items or recording conventions? | Cost invoices, reconciliation schedules, field definitions and row-level reason disposition. | DQ15, DQ16, DQ19 |
| EI04 | Finance | What do negative revenue, quantity, discounts and CP mean in each source? Can each material candidate credit be linked to the original transaction? | Credit/return notes, original invoice linkage and approved adjustment reason codes. | DQ08, DQ19, DQ39 |
| EI05 | Sales/contracts owner | Which verified contracts and deliveries explain the largest 2025 contributions and large STL residual months? Were award, delivery, invoice and posting dates different? | Award/contract schedule, delivery acceptance, invoices and cutoff policy, starting with the ranked months. | DQ02, DQ22, DQ24, DQ35 |
| EI06 | Product/catalog owner | Which raw labels represent the same physical sellable product? Which package size, unit, form or model distinguishes them? Can a title or pricing clue be verified? | Product master, manufacturer/packaging documentation and invoice unit evidence with approval record. | DQ06, DQ07, DQ17, DQ18 |
| EI07 | Finance/sales pricing owner | Do CP changes reflect effective dates, different packages, discounts, transcription or signed terms? Which prices and net prices are independently verifiable? | Effective price lists, agreements, original invoices and discount policy. | DQ17, DQ18, DQ19, DQ40 |
| EI08 | Sales/account owner | Does a geographic label represent an account, territory, buyer type or business line? Which records identify actual customers and delivery locations? | Reviewed account crosswalk, stable account IDs, delivery geography and scoped ownership rules. | DQ11, DQ12, DQ13, DQ14, DQ40 |
| EI09 | Operations/data custodian | Could one business event appear in multiple files? Do DR numbers identify documents or unique sales lines? Are repeated lines legitimate? | Original source sheets, import history and verified document/line identifier specification. | DQ05, DQ24, DQ27, DQ37 |
| EI10 | Warehouse/inventory owner | Are there dated stock snapshots, backorders or lost-sale records? Which shortages were verified and how were substitute items recorded? | SKU/location/day stock, orders, backorders, cancellations and lost-sale reason records. | DQ36 |
| EI11 | Delivery/service owner | What is the approved promised-date rule? Which deliveries were late, partial, rejected or posted later? | Order/delivery line history, promised/actual dates, acceptance and linked credits. | DQ35, DQ37 |
| EI12 | Procurement owner | Which suppliers had late or short receipts? What are the observed and contracted lead times? Are changes linked to downstream unfulfilled orders? | Purchase orders, supplier confirmations, receipt events and supplier invoice costs. | DQ38 |
| EI13 | Inventory/quality owner | Are write-offs due to expiry, damage, loss or returns? Which batches remained on hand? | Lot/expiry ledger, batch movement, disposal approvals and credit linkages. | DQ08, DQ39 |
| EI14 | DOH/PAGASA/data mapping reviewer | Which administrative levels, dates and covered stations are appropriate? Which disease/medicine relationships and territory joins can be approved? How are partial periods handled? | Source dictionaries, onset/reporting definitions, station/coordinate mappings, missingness and written join acceptance. | DQ30, DQ31, DQ32, DQ33, DQ34 |
| EI15 | Business approver | Which candidate source-label, buyer and geographic outputs may be released? Which interpretations require additional review? Who owns unresolved high-value exceptions? | Acceptance bound to dataset/fact/policy/mapping identities and permitted output scope. | DQ09, DQ14, DQ29 |
| EI16 | Research lead/adviser | Are causal claims expected, or are decomposition and clearly labeled observational findings sufficient? Which hypotheses and methods should be prespecified? | Research question approval, analysis protocol and Chapter 4/5 evidence rubric. | DQ20–DQ24, DQ31–DQ34 |

### Investigation record required for each material finding

Use one row per finding or hypothesis, rather than treating every chart as a separate conclusion. A materiality rule should be approved or clearly labeled as an analyst's review-priority proposal; rank-based review is acceptable until business thresholds are approved.

| Required field | What must be recorded |
| --- | --- |
| Finding ID and diagnostic question IDs | Stable reference to the question(s) and result table rows. |
| Scope and evidence identity | Filters, matched keys, grain, measure, fact/policy/mapping version and input receipt/checksums. |
| Observed result | Exact amount/rate, denominator, coverage and executed calculation reference. |
| Evidence class | Decomposition, association, hypothesis or verified operational explanation. |
| Competing explanations | At least the plausible reporting, allocation, timing, mix, price, quantity and operational alternatives relevant to that result. |
| Evidence supporting each explanation | Document or dataset reference, period, linked records and why it bears on the mechanism. |
| Evidence against or unresolved | Conflicting documents, missing fields, failed diagnostics and untested assumptions. |
| Status | Supported within scope; partially supported; rejected by evidence; unknown; or unavailable pending the named dependency. |
| Decision/action | Review/recover source evidence, constrain interpretation, approve mapping, correct confirmed issue through its owner, or defer operational action. |
| Owner and closure test | Responsible stakeholder and the exact documentary/reconciliation/statistical evidence required to close. |

Do not write “caused by” when the recorded evidence establishes only correlation or contribution. “Unknown” is a legitimate diagnostic result when the data cannot discriminate competing mechanisms.

### Diagnostic analytics acceptance criteria

These criteria distinguish a completed analytical package from completed operational or causal investigations. A question registry can be complete while some questions correctly remain unavailable. It cannot be called a fully evidenced causal explanation or approved inventory analysis until their prerequisites pass.

| ID | Observable acceptance criterion | Verification and required evidence |
| --- | --- | --- |
| DA01 | Every in-scope question has an owner, business decision, grain, formula/method, output, evidence class and answerability status. | Review DQ01–DQ40; no unsupported “answered” entries. Mark out-of-scope questions explicitly with reason. |
| DA02 | Each reported numerical answer is traceable to a stable result row and checksum-bound inputs from one compatible release identity. | Verify fact Delta, dataset/policy/mapping identities and input checksums; record actual command/output and failures. A formula specification alone is not a passed calculation. |
| DA03 | Annual, monthly and every disjoint diagnostic partition reconcile to their selected eligible source totals within the documented precision/tolerance. | Exact-decimal sum checks; period, group, buyer/geography and provenance partitions where actually computed. Record missing or overlapping groups rather than force-balancing. |
| DA04 | All year-on-year and adjacent-month comparisons expose paired keys, both totals and coverage; missing periods remain null. | Verify the ten current missing months are preserved; test missing prior period, observed zero/negative amount, nonpositive baseline, exact boundary and nonadjacent month cases. |
| DA05 | Contribution bridges sum exactly to the signed total difference and use the stated denominator. | Verify peso and percentage-point identities, negative offsets, zero net change, deterministic sorting and cohort denominator before Top-N filtering. |
| DA06 | Margin results use one shared eligible numerator/denominator population and disclose exclusions. | Recompute weighted margin, bases and counts; verify zero/nonpositive denominator state and document the current 2025 eligible financial-basis ratio. No company net-profit claim. |
| DA07 | Product identity, recorded quantity, packaging, recorded CP and derived net unit price have separate gates. | Verify unresolved labels remain unresolved, mixed/unreviewed units are not summed as standardized medicine units, and zero validated unit-price rows block factual DQ18 price/volume conclusions. |
| DA08 | Original, adjusted, backfilled and estimated allocations remain distinguishable wherever they affect interpretation. | Verify provenance partition totals/counts, file-level limitation labels and child/parent reconciliation when allocation evidence is available. Row shares cannot be substituted for revenue shares. |
| DA09 | Raw area, derived geography, buyer ownership and channel are separated, with Unknown/unmapped populations preserved. | Reconcile selected classifications and parent/child estimates; record mapping basis, excluded amounts and candidate acceptance status. |
| DA10 | STL uses a qualifying contiguous series, identifies its independent scope and reconstructs observed values. | Check all 72 current component months, identity/parameters, missing-boundary handling and reconstruction tolerance; record executed residual ranking and any exploratory flag threshold. |
| DA11 | Any external association passes reviewed geography/period/measure joins and reports uncertainty, confounding and tested specifications. | Before DQ31–DQ34, prove one-to-one target joins, no duplicated sales totals, paired sample counts and missingness. Preserve PAGASA/NASA labels and partial-2026 exclusion. Unapproved joins keep analysis unavailable. |
| DA12 | Every claimed underlying cause has evidence appropriate to the claim and an explicit competing-explanation assessment. | Review the investigation register; contribution is not causation, correlation is not causal identification, and interview answers need documentary corroboration for verified mechanisms. |
| DA13 | Operational claims have the required independent stock/order/supplier/expiry/account inputs. | Check DQ35–DQ40 prerequisite fields and linkage. Absent inputs produce named unavailable states; no invented stockouts, customer counts, expiry, lead time or purchase parameters. |
| DA14 | Stakeholders can see what is answered, partially answered, unavailable and still awaiting business acceptance. | Publish a question-status matrix with result/evidence references, named owner, dependency and closure test. Technical calculation passes are separate from business approval. |
| DA15 | Chapter 4 documents executed implementation and Chapter 5 draws only conclusions supported by executed evidence. | Match each table/figure/conclusion to its receipt/run and question; label offline saved-receipt analysis, candidate/estimated/proxy inputs and unexecuted methodological plans. Screenshots alone do not establish cause. |
| DA16 | Final package verification inspects links, scope, arithmetic and unresolved limitations without changing application behavior. | Check local links and final diff; record checks run and not run. Documentation-only delivery requires no application build or service restart. |

### Completion statement to use only after the corresponding checks pass

“The diagnostic analytics package specifies the business questions, reproduces the answerable accounting decompositions, identifies material exceptions and data limitations, and records unresolved causal and operational questions with evidence requirements and owners. Results remain bound to the stated candidate dataset and review scope. Disease/weather causation, verified medicine price/volume movement and stock/supplier/expiry mechanisms remain unavailable until their independent evidence and approval gates are satisfied.”

## Proposed dashboard and report outputs

These are implementation requirements for a later dashboard pass, not a claim of UI delivery in this package. Reuse the current Sales Diagnostics page, its shared period/year comparison controls and authenticated Databricks gateway.

| Panel | Main result | Supporting evidence / drill-down |
|---|---|---|
| Sales change explanation | Matched base/target sales, peso delta, growth and month waterfall | Included months, coverage, selected population, both year values and source strata |
| Product contribution | Largest signed reporting-group changes and concentration | All-group table/export, presence flags, identity/category status and adjusted attribution |
| Area and buyer explanation | Raw-area and proposed-buyer contributions | Geography-unassigned bucket, mapping status/evidence, region only where supported |
| Gross-profit explanation | Same-population margin and eligible-basis/rate bridge | Profit/basis, row eligibility, excluded scope and signed adjustments |
| Seasonality and exceptions | Published trend/seasonal/residual components | Full-history scope, parameters, source identity and residual document-review queue |
| Evidence quality | Calendar gaps, provenance, eligibility and warning counts | Retained versus assessed populations, financial effect where known, review owner |
| External/operational investigation | Answerable hypotheses and required evidence | Unavailable/needs-evidence states with reason; no fabricated correlation/stockout scores |

Every output needs the question ID, base/target populations, currency/unit, calculation, source version, evidence status, caveat, next document/action and review owner. Provide accessible tabular alternatives and consistent exports. A chart heading should answer a question, for example “Which areas contributed to the 2025 sales increase?” rather than “Root cause score.”

Shared year/period filters must apply to the compared populations, tables and exports. Month-level product or selected-product STL displays need their own matching data; current product-year partitions and company STL cannot silently satisfy those filters. Keep no-data, unknown, negative/zero denominator and partial-period states visible. The historical first/last observed year is determined from data. A future year with no rows remains empty.

If implementing a new inline handler in `MEDSHIELD_MARKUP`, register it in `DASHBOARD_GLOBAL_HANDLERS` and bridge it to `window` inside the execution closure. Preserve sidebar indicator isolation and real UTF-8 currency/symbols. Do not run a build concurrently with `next dev`; inspect running tasks before implementation.

## Evidence-gathering worksheet

For each unexplained event, record: question ID; exact period; source/group/area; calculated financial contribution; evidence stratum; proposed cause; alternative explanations; required document IDs; owner; requested date; received evidence; matched transaction IDs; result; limitations; reviewer; review date. An interview response is attributed evidence, not a replacement for transaction reconciliation.

Use these response states: **supported**, **partly supported**, **contradicted**, **unverified**, **unavailable**, **out of accepted scope**. Attach no invented signatures, account IDs, contract outcomes or CEO decisions. A claim is supported only within the population and dates actually checked.

## Ready-to-use capstone narrative

Diagnostic analytics was applied to locate changes in MedShield's recorded sales and eligible transaction gross profit through equivalent-period comparison, signed month/product/area contribution analysis, financial eligibility review and seasonal decomposition. All calculations were bound to Databricks fact version 17 and the corresponding candidate policy and mapping identities. The primary study period was 2021–2025, while earlier history was retained to disclose coverage limitations. Whole missing months were not treated as zero sales.

Recorded eligible revenue increased from ₱50,259,319.88 in 2024 to ₱185,396,821.04 in 2025, a 268.88% increase over twelve matched months. November supplied the largest equivalent-month contribution, ₱22,995,568.20. At the area-reporting level, Government and Hospital contributed ₱94,794,181.38 and ₱39,057,373.41 respectively. These results identify where the candidate financial change is concentrated. Since both years use files classified adjusted/estimated at source level and product identities remain unresolved, the results do not establish observed medicine-unit growth, verified product mix or a causal explanation for the increase.

Profitability interpretation was restricted to eligible transactions. The 2025 gross-margin denominator of ₱95,077,093.87 represents 51.28% of recorded eligible revenue; its 55.04% gross-margin rate therefore describes that population rather than complete company profitability. The company monthly STL components provided a further diagnostic view of fitted trend, seasonality and residual departures. External disease/weather explanations and stockout, supplier or expiry hypotheses were retained as questions requiring approved joins and operational evidence. The output is traceable decision support for review, not proof of disease-driven demand or automated inventory improvement.

The narrative is suitable as a calculation-based draft. Academic reviewers should approve its relationship to the paper's original territorial/daily decomposition promises; company monthly STL is not evidence that those promises have been met. See [objective evidence mapping](OBJECTIVE_EVIDENCE_REGISTER.md).

## Reproduction, ownership and acceptance record

Reproduce the original company report with `python outputs/diagnostic_data_20261003/build_report.py`. Reproduce the expanded local package with `python outputs/diagnostic_data_20261003/build_complete_data.py`, check its final additions with `python outputs/diagnostic_data_20261003/verify_extension.py`, then export the register/archive with `python outputs/diagnostic_data_20261003/package_diagnostics.py`. For a new version-17 segment read, run `node --require ./backend/node_modules/tsx/dist/cjs/index.cjs outputs/diagnostic_data_20261003/extract_segments.cjs` from the repository root; it uses the server-only configured identity and SELECT/history reads. A different fact revision needs a separately versioned extraction and fresh validation; do not edit the old evidence to look current. Scripts contain no credential values and their receipts contain no authentication tokens.

| Deliverable criterion | Current result | Evidence |
|---|---|---|
| Source identity, full-group completeness and monetary partitions reconcile | PASS | 10,406 generated checks in complete verification receipt |
| Monthly, annual, matched-month and signed segment explanations exist | PASS within declared scope | Complete diagnostic JSON and readable findings |
| Data fields, question methods, interpretation limits and completion tests are documented | PASS for this package | This document and its question bank |
| A new end-to-end diagnostic dashboard implementation is delivered | NOT IMPLEMENTED BY THIS TASK | Dashboard section is a specification |
| Causes such as contracts, discounts, disease, stockouts or expiry are established | NOT VERIFIED | Required documentary/operational inputs remain listed |
| Business publication, reviewed SKU/unit/geographic scope and original paper objectives are accepted | NOT GRANTED BY THIS TASK | Existing named approval and academic evidence gates remain separate |

The Data Analyst owns calculations and diagnostic evidence. The BI Specialist owns presentation meaning; the Frontend/Backend Engineer owns a later dashboard/API implementation; the operator owns version-bound deployment; the CEO owns the applicable business decisions. Nothing in this package changes existing financial definitions or grants approval. Tests for a later implementation must verify API/chart/table/export reconciliation, filters, missing/negative cases, provenance and authentication. This documentation/data task requires no application build or service restart.

Canonical references: [current state](CURRENT_STATE.md), [analytics](ANALYTICS.md), [business definitions](BUSINESS_DEFINITIONS.md), [descriptive rules](DESCRIPTIVE_ANALYTICS_LOGIC.md), [product and pricing rules](PRODUCT_REVIEW_RULES.md), [architecture](ARCHITECTURE.md), [testing](TESTING.md) and [business acceptance](DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md).

## Dashboard implementation follow-up — 5 October 2026

The earlier package above remains an offline, version-bound analysis record. A later source implementation now adds interactive chart/table drill-down, an authenticated live diagnostic endpoint, reconciled signed contribution partitions and transaction lineage, plus an unverified root-cause evidence review and export. See [DRILLDOWN_DIAGNOSTICS.md](DRILLDOWN_DIAGNOSTICS.md) for behavior, filters, limits and executed acceptance evidence. This does not turn the hypotheses in this package into established business causes or imply a cloud release or migration was applied.
