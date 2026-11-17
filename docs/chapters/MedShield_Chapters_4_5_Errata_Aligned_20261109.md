# CHAPTER 4

## RESULTS AND DISCUSSION

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;This chapter presents the results of the study organized by the five specific objectives established in Chapter 1. Section 4.1 describes the data preparation and population outcomes that established the analytical foundation. Section 4.2 reports the results of the descriptive, diagnostic, predictive, and prescriptive analyses. Section 4.3 discusses the dashboard implementation and evaluation evidence. Section 4.4 summarizes the findings in relation to each objective. Throughout, the reported figures were drawn from the confirmed analytical records. The chapter distinguished what the implemented system calculated and verified from what remained conditional on operational inputs or business acceptance.

---

## **4.1 Data Preparation and Presentation**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The analytical foundation of the study required a stable, version-bound data population. This section describes the source structure, the records retained after quality review, and the financial and regional summaries that the analysis reported. The Databricks Unity Catalog Gold tables served as the analytical system of record. Supabase performed authentication and audit functions only and did not supply an alternative source of dashboard sales measures.

### **4.1.1 Data Population and Coverage**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The source data comprised sales transaction files extracted from MedShield Pharmaceutical Corporation's internal records for the period January 2017 through September 2026. Ten data files contributed a total of 62,065 physical source lines. After deduplication, format validation, and quality screening, 40,171 records were retained as itemized sales entries. A further set of 352 contract summaries was identified as a structurally separate population that could not be distributed across itemized product-month cells; these were retained for separate contract-level review and excluded from the product, regional, and forecast analyses.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Of the 40,171 retained itemized records, 39,286 satisfied the net-sales-eligibility criteria: they carried a positive recorded net sales value and a valid product identifier. Among the eligible records, 36,798 were matched to a corresponding cost or margin support record, representing 91.60 percent of the retained itemized population. The 2,488 unmatched eligible records carried recorded net sales revenue but lacked a paired cost reference adequate for gross-profit computation.

**Table 4.1 Source population summary**

| Population | Count | Notes |
|---|---|---|
| Physical source lines (10 files) | 62,065 | Before deduplication and screening |
| Retained itemized records | 40,171 | After quality review; analytical base |
| Contract summaries | 352 | Separate; not distributable to product-month cells |
| Net-sales-eligible itemized records | 39,286 | Carry positive net sales and valid product ID |
| Margin-supported itemized records | 36,798 | 91.60% of retained; paired cost reference available |
| Unmatched eligible records | 2,488 | Net sales available; no paired cost reference |

*Source: Databricks Unity Catalog Gold, analytical system of record. Figures from [H1] version-bound snapshot.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Monthly coverage varied by year. The data began with a partial year in 2017, reaching seven of twelve calendar months. Full twelve-month coverage was recorded for 2020 through 2025. The 2026 partial year covered January through September, the latest complete month available at the time of extraction. Across all years the confirmed data spanned 107 months of recorded activity out of a possible 117 months from January 2017 through September 2026.

**Table 4.2 Monthly coverage by year**

| Year | Months with recorded sales | Full year |
|---|---|---|
| 2017 | 7 | No (Jul–Dec partial) |
| 2018 | 10 | No |
| 2019 | 9 | No |
| 2020 | 12 | Yes |
| 2021 | 12 | Yes |
| 2022 | 12 | Yes |
| 2023 | 12 | Yes |
| 2024 | 12 | Yes |
| 2025 | 12 | Yes |
| 2026 (Jan–Sep) | 9 | Partial (cutoff Sep 2026) |
| **Total** | **107 / 117** | — |

*Source: retained itemized records. Missing months reflected gaps in the recorded source, not confirmed zero-sales periods.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The quality review assessed five dimensions: completeness of required fields, internal consistency between line totals and header summaries, duplicate detection, date-range conformity, and cost-pairing coverage. Table 4.3 summarizes the dimensional outcomes. No dimension was resolved to a perfect pass rate because the source data contained inherent gaps; the review documented their scope rather than imputing replacements.

**Table 4.3 Quality dimensions and coverage outcomes**

| Quality dimension | Outcome |
|---|---|
| Field completeness | Required identifiers and date fields populated in all retained records |
| Internal consistency | Line totals reconciled to header aggregates within recorded rounding |
| Duplicate detection | Duplicates removed before retention count |
| Date-range conformity | All retained records fall within Jan 2017 – Sep 2026 |
| Cost-pairing coverage | 36,798 of 39,286 eligible records (91.60%) carry paired margin support |

*Source: source-review documentation.*

**Figure 4.1 Observation coverage by year**

*(Bar chart showing retained records per year: 2017 through 2026. The figure documented historical record density and partial-year status. Source: retained itemized records [H1].)*

#### **4.1.1.5 Transformation and Financial Definitions**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Recorded net sales represented the invoiced revenue carried in the source transaction records. Gross profit was computed as the difference between net sales and the matched cost of goods for the same record. The gross margin rate was expressed as gross profit divided by the net sales revenue from the same population of margin-supported records. Because not every net-sales-eligible record carried a confirmed cost match, the margin rate was computed only over the records where both values were available; it was not imputed for the unmatched population.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The weighted supported margin used the net sales from records that had a matching margin entry as the denominator. This denominator differed from total eligible net sales because it excluded the PHP 71,060,429.61 net sales carried in records without a paired margin reference. The distinction mattered for interpretation: a margin rate computed over the supported population described only the transactions where cost evidence was available. It did not establish a composite margin for all recorded sales.

##### **4.1.1.5.1 Financial Measures**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The analytical financial measures were defined as follows. Net sales eligible referred to all recorded revenue from net-sales-eligible itemized records. Supported gross profit was the sum of computed gross profit from margin-supported records. Matching margin revenue was the net sales subtotal restricted to margin-supported records. The weighted supported margin rate was supported gross profit divided by matching margin revenue, expressed as a percentage.

**Table 4.4 Summary financial definitions**

| Measure | Definition | Source population |
|---|---|---|
| Eligible net sales | Sum of net sales across net-sales-eligible records | 39,286 records |
| Supported gross profit | Sum of (net sales − cost) for margin-supported records | 36,798 records |
| Matching margin revenue | Sum of net sales restricted to margin-supported records | 36,798 records |
| Weighted supported margin | Supported gross profit ÷ matching margin revenue | 36,798 records |
| Net without paired margin | Eligible net sales − matching margin revenue | 2,488 records |

*Source: analytical financial definitions applied to retained population.*

#### **4.1.1.6 Integration Readiness**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The data population was bound to the Gold analytical release pinned in the Databricks Unity Catalog. Version control ensured that replication from the same release would reproduce the reported counts and totals. Table metadata advanced to version 3 during a November 2026 source-version recovery; the analytical reader retained version 0 and unchanged financial identities. The recovery restored the pinned original release without reconstructing source revisions available at every historical forecast date. Metadata retention was extended to 365 days to prevent premature version expiry.

### **4.1.2 Analytical Results by Population**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The analytical results were organized by financial aggregation, product contribution, and regional allocation. Each section reported observed values from the retained analytical population and identified the limits of the supporting evidence.

#### **4.1.2.1 Annual Financial Results**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The full-history eligible net sales total from January 2017 through September 2026 amounted to PHP 638,015,351.53. The corresponding supported gross profit from margin-supported records was PHP 334,666,271.55. The matching margin revenue—the net sales denominator restricted to margin-supported records—was PHP 566,954,921.92, yielding a weighted supported margin of 59.03 percent. Net sales from the 2,488 records without a paired margin reference totaled PHP 71,060,429.61.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The core analysis period of 2017 through 2025 contributed PHP 497,815,948.86 in eligible net sales and PHP 271,187,394.44 in supported gross profit across 98 of a possible 108 months. The January-through-September 2026 extension contributed PHP 140,199,402.67 in eligible net sales and PHP 63,478,877.11 in supported gross profit across all nine months available.

**Table 4.5 Full-history financial summary**

| Measure | Value |
|---|---|
| Full-history eligible net sales | PHP 638,015,351.53 |
| Supported gross profit | PHP 334,666,271.55 |
| Matching margin revenue (denominator) | PHP 566,954,921.92 |
| Weighted supported margin | 59.03% |
| Net without paired margin support | PHP 71,060,429.61 |
| Core 2017–2025 net sales | PHP 497,815,948.86 |
| Core 2017–2025 gross profit | PHP 271,187,394.44 |
| Jan–Sep 2026 extension net sales | PHP 140,199,402.67 |
| Jan–Sep 2026 extension gross profit | PHP 63,478,877.11 |

*Source: Databricks Unity Catalog Gold, analytical system of record. Figures from version-bound retained population.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Year-over-year comparison for the January-through-September period showed that 2026 net sales of PHP 140,199,402.67 exceeded the same nine-month period in 2025, which recorded PHP 64,499,873.14, by PHP 75,699,529.53, a year-on-year growth rate of approximately 117.4 percent. September 2026 alone contributed PHP 26,054,378.81 to the 2026 partial-year total.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The buyer-channel breakdown for the January-through-September comparison attributed the year-on-year increase as follows: the Government channel contributed PHP 48,088,506.56, representing 63.53 percent of the total increase; the Private channel contributed PHP 28,093,941.61, representing 37.11 percent; and the Internal channel recorded a decrease of PHP 482,918.64, representing negative 0.64 percent of the change.

**Table 4.6 Buyer-channel year-on-year comparison (Jan–Sep 2026 vs. Jan–Sep 2025)**

| Buyer channel | Jan–Sep 2025 | Jan–Sep 2026 | Change | Share of total change |
|---|---|---|---|---|
| Government | — | — | +PHP 48,088,506.56 | 63.53% |
| Private | — | — | +PHP 28,093,941.61 | 37.11% |
| Internal | — | — | −PHP 482,918.64 | −0.64% |
| **Total** | **PHP 64,499,873.14** | **PHP 140,199,402.67** | **+PHP 75,699,529.53** | **~117.4% YoY** |

*Source: retained itemized records matched to buyer-channel labels.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Annual net sales and gross profit by year are presented in Table 4.7. The annual figures reflected the partial-year status of 2017, 2018, 2019, and the 2026 cutoff. No zero-imputation was applied to missing months; the analysis retained the distinction between confirmed sales activity and unrecorded periods.

**Table 4.7 Annual financial results, 2017–Sep 2026**

| Year | Eligible net sales (PHP) | Supported gross profit (PHP) | Months recorded |
|---|---|---|---|
| 2017 | 10,211,167.35 | 6,316,157.68 | 7 / 12 |
| 2018 | 51,619,691.27 | 28,328,721.76 | 10 / 12 |
| 2019 | 62,542,304.49 | 29,125,469.95 | 9 / 12 |
| 2020 | 53,079,522.63 | 27,175,018.68 | 12 / 12 |
| 2021 | 77,860,206.26 | 50,420,770.93 | 12 / 12 |
| 2022 | 63,234,990.04 | 40,799,049.06 | 12 / 12 |
| 2023 | 62,228,966.85 | 33,585,582.48 | 12 / 12 |
| 2024 | 28,468,701.72 | 15,938,200.10 | 12 / 12 |
| 2025 | 88,570,398.25 | 39,498,423.80 | 12 / 12 |
| 2026 (Jan–Sep) | 140,199,402.67 | 63,478,877.11 | 9 / 9 |
| **Core 2017–2025** | **497,815,948.86** | **271,187,394.44** | **98 / 108** |
| **Full history** | **638,015,351.53** | **334,666,271.55** | **107 / 117** |

*Source: Databricks Unity Catalog Gold, retained itemized records. Partial-year years noted. No zero-imputation was applied to unrecorded months.*

##### **4.1.2.1.1 Matched Extension**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The Broad Medical product category recorded PHP 108,307,262.54 in net sales and PHP 55,245,417.84 in supported gross profit for the January-through-September 2026 period, yielding a margin rate of 52.95 percent over its 2,267 margin-supported records out of 2,337 total records in the period. This category represented the dominant revenue contributor in the 2026 partial year and anchored the overall financial extension for that period.

**Table 4.8 Broad Medical category — Jan–Sep 2026**

| Measure | Value |
|---|---|
| Net sales | PHP 108,307,262.54 |
| Supported gross profit | PHP 55,245,417.84 |
| Gross margin | 52.95% |
| Total records | 2,337 |
| Margin-supported records | 2,267 |

*Source: retained itemized records for Broad Medical category, Jan–Sep 2026 period.*

#### **4.1.2.2 Product Contribution**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Across the full retained history, 5,623 distinct product names were identified. The analysis distinguished products by their positive net sales contribution to the overall total. Products with net positive contribution over the full history constituted the principal commercial base, while those with zero or negative cumulative contribution were separately flagged.

**Table 4.9 Product name population**

| Classification | Count | Share |
|---|---|---|
| Total distinct product names | 5,623 | 100% |
| Class A — highest contribution | 629 | 11.2% |
| Class B — moderate contribution | 1,221 | 21.7% |
| Class C — lowest contribution | 3,754 | 66.8% |
| Unclassified | 19 | 0.3% |

*Source: ABC analysis of full-history eligible net sales by product name.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The 5,623 distinct product names were subject to Pareto-based ABC classification using cumulative net sales contribution as the ranking criterion. Class A products comprised 11.2 percent of the product population and accounted for approximately 80 percent of cumulative positive net sales. Class B products—21.7 percent of names—accounted for approximately 15 percent. Class C products—66.8 percent of names—accounted for approximately 5 percent. Nineteen products remained unclassified due to insufficient sales history or missing identifiers.

##### **4.1.2.2.1 ABC Distribution**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The ten highest-contributing products by eligible net sales over the full retained history are presented in Table 4.10. SPEEDA recorded the highest cumulative net sales. The remaining top products spanned injectable and therapeutic categories, reflecting the hospital and clinic delivery context of the confirmed buyer population.

**Table 4.10 Top ten products by eligible net sales (full history)**

| Rank | Product name | Eligible net sales (PHP) |
|---|---|---|
| 1 | SPEEDA | 27,203,970.97 |
| 2 | PROFUREX 750MG | 11,987,494.40 |
| 3 | SHARJVAX | 10,908,515.00 |
| 4 | EVAPROST 250MCG/ML | 9,401,497.00 |
| 5 | SEROALBUMIN | 8,634,183.36 |
| 6 | MONOWEL 1G IV | 8,111,735.00 |
| 7 | MAXIFER 20MG/ML | 7,290,626.40 |
| 8 | EUROXONE 1G | 6,986,714.95 |
| 9 | SITIXON 1G | 5,006,278.78 |
| 10 | BUPIRIGHT AMPULE | 4,711,236.74 |

*Source: ABC-ranked eligible net sales, full retained history. Product names are source labels; no clinical classification was applied.*

### **4.1.2.3 Confirmed Delivery Regions**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The regional allocation distinguished between records with a confirmed delivery label and those without. Of the 40,171 retained itemized records, 19,455 carried a confirmed regional label, representing 48.43 percent of total records. The PHP value associated with confirmed records was PHP 115,614,895.77, representing 18.12 percent of eligible net sales. The remaining 20,716 records (PHP 522,400,455.76) were unallocated because delivery destination could not be confirmed from the available source fields.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The confirmed delivery labels fell within three administrative regions: CALABARZON, MIMAROPA, and Bicol. Nine distinct delivery labels were identified from the confirmed records. The concentration of sales value among confirmed regions was high: five Class A delivery areas—Quezon, Batangas, Laguna, Marinduque, and Camarines Norte—accounted for 86.14 percent of positive confirmed-area net sales.

**Table 4.11 Regional allocation summary**

| Category | Record count | Eligible net sales (PHP) | Share of records | Share of value |
|---|---|---|---|---|
| Confirmed regional records | 19,455 | 115,614,895.77 | 48.43% | 18.12% |
| Unallocated records | 20,716 | 522,400,455.76 | 51.57% | 81.88% |
| **Total retained** | **40,171** | **638,015,351.53** | **100%** | **100%** |

*Source: delivery-label mapping applied to retained itemized records. Unallocated records lacked a confirmed destination label.*

#### **4.1.2.3.1 Regional Allocation and Area Concentration**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The 2026 partial-year confirmed regional total was PHP 5,779,139.51. Within this total, Quezon province contributed PHP 4,176,874.21 and Batangas contributed PHP 1,602,265.30. Year-on-year comparison between the confirmed amounts for these two areas showed contrasting directional changes: Quezon recorded a year-on-year increase of PHP 1,307,094.00 while Batangas recorded a year-on-year decrease of PHP 1,182,385.71 for the same comparison window.

**Figure 4.5 Confirmed delivery area net sales by region**

*(Map or bar chart illustrating the nine confirmed delivery label areas within CALABARZON, MIMAROPA, and Bicol. The figure documented geographic distribution of confirmed sales. Unallocated records were not plotted. Source: confirmed delivery labels from retained records [H1].)*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Delivery label coverage statistics for the nine confirmed areas are presented in Table 4.12a. The months column reflects the total count of months in which a given label appeared in the retained records, not necessarily contiguous. The longest consecutive run column identifies the maximum number of consecutive calendar months with at least one record. The latest recorded month indicates the most recent month with confirmed sales evidence. These statistics informed which areas supplied enough history for time-series analysis.

**Table 4.12a Delivery label coverage by area**

| Delivery label | Total months recorded | Latest month | Longest consecutive run |
|---|---|---|---|
| QUEZON | 103 | Sep 2026 | 76 |
| BATANGAS | 104 | Sep 2026 | 81 |
| CAVITE | 60 | Feb 2023 | 35 |
| LOWER CAVITE | 48 | Aug 2023 | 26 |
| LAGUNA | 40 | Oct 2023 | 19 |
| MARINDUQUE | 79 | Oct 2025 | 19 |
| ALBAY | 25 | Feb 2022 | 12 |
| CAM NORTE | 58 | Sep 2023 | 19 |
| CAM SUR | 54 | Feb 2023 | 19 |

*Source: confirmed delivery-label mapping, retained itemized records.*

---

## **4.2 Data Analysis**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The data analysis followed the analytical framework described in Chapter 3. Descriptive analysis characterized the historical financial and seasonal patterns. Diagnostic analysis investigated anomalous records and commercial exceptions. Predictive analysis evaluated forecast methods for product quantity and product classification. Prescriptive analysis translated demand and cost assumptions into inventory policy scenarios. Each section reports the results and identifies the claims supported by the evidence.

### **4.2.1 Descriptive Analysis**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The descriptive analysis examined historical patterns in company-level sales and in confirmed regional series. Time-series decomposition separated trend, seasonal, and residual components for areas with sufficient consecutive history.

#### **4.2.1.1 STL Interpretation**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Seasonal-Trend decomposition using LOESS (STL) was applied to company-level and area-level monthly net sales series. The STL specification used a Robust variant with a seasonal period of 12 months and a seasonal window of 13. The decomposition required a minimum of 36 consecutive monthly observations, consistent with the convention used in the analytical codebase.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CALABARZON supplied 81 consecutive months from January 2020 through September 2026, satisfying the minimum history requirement and enabling a full decomposition. The year-on-year change for the CALABARZON series over the matched September 2025-to-September 2026 comparison was attributed to three additive components: a trend contribution of negative PHP 1,089,642.40, a seasonality contribution of positive PHP 54,549.18, and a residual contribution of positive PHP 1,159,801.51. The net result was a positive year-on-year change driven by the residual component rather than a persistent trend or seasonal acceleration.

#### **4.2.1.2 Delivery Area Diagnostics**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;STL was applied to the delivery-area series with the longest available consecutive runs. The results for the three areas with sufficient history are presented in Table 4.12b. The seasonal strength and trend strength metrics summarize the relative contribution of those components to overall variance, with values near zero indicating a weak component and values near one indicating a strong component.

**Table 4.12b Delivery area STL results**

| Area | Contiguous run | Seasonal strength | Trend strength |
|---|---|---|---|
| QUEZON | Jun 2020–Sep 2026 (76 mo) | 0.0000 | 0.0431 |
| BATANGAS | Jan 2020–Sep 2026 (81 mo) | 0.0737 | 0.6367 |
| CAVITE province | Jan 2020–Feb 2023 (38 mo) | 0.2985 | 0.5631 |

*Source: STL applied to confirmed delivery-area net sales. Strength metrics: 0 = weak component, 1 = strong component. CALABARZON aggregate contributed 81 consecutive months to the STL used in predictive analysis.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The QUEZON series showed near-zero seasonal strength and low trend strength, indicating that neither component dominated its variance. BATANGAS showed moderate seasonal strength and high trend strength, suggesting a more structured directional pattern. CAVITE province had a shorter contiguous run and moderate values on both dimensions. The STL results described observed patterns and did not establish the operational cause of any component.

### **4.2.2 Diagnostic Analysis**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The diagnostic analysis examined records flagged during the quality review as requiring commercial verification. The 30 October diagnostic identified four period changes, eight full ledgers, and 27 retained records requiring investigation.

#### **4.2.2.1 Commercial Exception Interpretation**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Three product records required specific commercial interpretation, as summarized in Table 4.13. Each exception was documented with its recorded financial values and the nature of the exception. The flagged records were retained in the analytical population with their recorded values; no imputation or manual correction was applied.

**Table 4.13 Commercial exception records**

| Product | Exception type | Net sales (PHP) | Cost (PHP) | Computed gross profit (PHP) |
|---|---|---|---|---|
| ELCILLIN | Net sales below cost | 8,578.50 | 32,200.00 | −23,621.50 |
| CLONISUR | Partial offset | +2,504.50 offset by −2,851.20 | — | −346.70 net |
| CLINTOP | Incomplete margin support | 876,330.00 (net); 829,080.00 lacks paired margin | — | 8 of 9 records supported |

*Source: source-review flags applied to retained records. Values recorded as found; no commercial correction applied. Verification of cause remained outstanding.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ELCILLIN recorded net sales of PHP 8,578.50 against a source cost of PHP 32,200.00, producing a computed gross profit of negative PHP 23,621.50. CLONISUR carried a positive offset of PHP 2,504.50 against a negative adjustment of PHP 2,851.20, for a net position of negative PHP 346.70. CLINTOP had eight of its nine records matched to margin support, but PHP 829,080.00 of its PHP 876,330.00 total net sales lacked a paired cost reference. These commercial exceptions did not change the total financial figures reported in Section 4.1.2.1 because the records were retained with their source values.

### **4.2.3 Predictive Analysis**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The predictive analysis addressed two targets: product-unit quantity demand for BUPIRIGHT AMPULE and product ABC classification across the full retained product population. Historical pilot studies and regional PHP comparisons supplied additional evidence on forecast method behavior. The analysis preserved the distinction between retrospective error measurement and prospective accuracy.

#### **4.2.3.1 BUPIRIGHT Quantity Research**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;BUPIRIGHT AMPULE was selected for the unit quantity pilot because it carried sufficient monthly quantity records and fell in the HOSPITAL buyer channel. The pilot covered 50 source records spanning 35 observed months, representing a total recorded quantity of 1,526 net ampoules. Within the full history, 18 contiguous recent months supplied the principal evaluation window. Thirteen records were identified as unreviewed export entries and were separated from the domestic hospital quantity series.

**Table 4.14 BUPIRIGHT pilot data profile**

| Attribute | Value |
|---|---|
| Total source records | 50 |
| Observed months | 35 |
| Recorded quantity (net ampoules) | 1,526 |
| Contiguous recent months (evaluation window) | 18 |
| Unreviewed export records | 13 |

*Source: HOSPITAL channel BUPIRIGHT quantity series, retained itemized records.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The forecast evaluation compared baseline methods at two lead times. Lead-1 forecasts targeted one month ahead with six scored observations covering April through September 2026. Lead-3 forecasts targeted three months ahead with four scored observations covering June through September 2026. The evaluation windows were defined before observing the target months; models were not retrained after observing each target.

**Table 4.15 BUPIRIGHT evaluation windows**

| Lead | Forecast origins | Scored targets | Target count |
|---|---|---|---|
| Lead-1 | Mar–Aug 2026 | Apr–Sep 2026 | 6 |
| Lead-3 | Mar–Jun 2026 | Jun–Sep 2026 | 4 |

*Source: BUPIRIGHT quantity pilot evaluation design.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Four baseline methods were evaluated: last value, recent mean of three months, recent mean of six months, and seasonal naïve. Among these, the seasonal naïve method recorded the lowest error at both lead times. Additional candidate methods—including ARIMA, SARIMA, Holt-Winters ETS, and Prophet—were evaluated in related PHP-series comparisons. SARIMAX with external regressors remained conditional on external data availability and was not scored in the primary unit pilot.

**Table 4.15a Candidate forecast methods and evaluation status**

| Method | Status in BUPIRIGHT pilot |
|---|---|
| Last value | Evaluated; baseline reference |
| Recent mean (3 months) | Evaluated; baseline |
| Recent mean (6 months) | Evaluated; baseline |
| Seasonal naïve | Evaluated; lowest error at both leads |
| ARIMA | Candidate; not scored in primary unit pilot |
| SARIMA | Evaluated in updated PHP comparisons |
| ETS additive damped | Evaluated in regional PHP comparisons |
| Prophet | Evaluated in regional and expanded PHP comparisons |
| SARIMAX | Conditional on external regressor availability |
| XGBoost (ABC) | Separate classification experiment; not a quantity model |

*Source: forecast method inventory from pilot documentation.*

##### **4.2.3.1.1 Forecast Metrics**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The primary error metric was the Weighted Absolute Percentage Error (WAPE), computed as the sum of absolute errors divided by the sum of actual values over the scored targets. Mean Absolute Error (MAE) was reported in source units (ampoules). Mean bias indicated the average signed error, with a positive value indicating over-prediction and a negative value indicating under-prediction.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;At lead-1, the seasonal naïve method recorded MAE of 13.17 ampoules, WAPE of 31.6 percent, and a mean bias of negative 4.83 ampoules across six scored targets. At lead-3, the same method recorded MAE of 9.75 ampoules, WAPE of 30.0 percent, and a mean bias of positive 2.75 ampoules across four scored targets. The largest absolute error across both leads was 20 ampoules. At lead-1, the seasonal naïve forecast produced lower error than the last-value baseline in four of six targets, with one tie. At lead-1 after omitting the highest-error single target, seasonal naïve recorded the lowest error among all candidates in five of six positions.

**Table 4.14 (continued) BUPIRIGHT forecast evaluation results — Seasonal naïve**

| Lead | MAE (ampoules) | WAPE | Mean bias (ampoules) | Scored targets | Lower than Last value |
|---|---|---|---|---|---|
| Lead-1 | 13.17 | 31.6% | −4.83 | 6 | 4 of 6 (1 tie) |
| Lead-3 | 9.75 | 30.0% | +2.75 | 4 | 3 of 4 |

*Source: BUPIRIGHT unit quantity pilot, evaluation against Apr–Sep 2026 (lead-1) and Jun–Sep 2026 (lead-3) targets.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The WAPE and MAE results described retrospective errors on a small scored cohort. They did not establish prospective forecast accuracy, clinically validated demand, or procurement authorization. The small target count limited statistical interpretation. The results were retained as bounded, source-bound evidence of method behavior on the available quantity series.

#### **4.2.3.2 Predictive ABC Evaluation**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The ABC classification model aimed to predict whether a product would be assigned to Class A, B, or C in a held-out year, based on features constructed from prior-year sales records. The selection experiment evaluated four classifiers on 83 held-out 2024 product labels, using training data from 2,314 product-year examples drawn from 2021 through 2023.

**Table 4.16 Predictive ABC validation results (83 held-out 2024 labels)**

| Method | Macro F1 | A-class recall |
|---|---|---|
| Training majority | 0.2310 | 0.0000 |
| Prior-year ABC persistence | 0.5367 | 0.5455 |
| XGBoost depth 2 | 0.4321 | 0.3636 |
| XGBoost depth 3 | 0.4347 | 0.3636 |

*Source: ABC classification selection experiment, 83 held-out 2024 labels. F1 is macro-averaged. A-class recall measures the fraction of actual A products correctly identified.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Prior-year ABC persistence recorded the highest macro F1 (0.5367) and the highest A-class recall (0.5455 or 54.55 percent) on the held-out 2024 labels. The XGBoost candidates recorded lower F1 and lower A-class recall than persistence on this set, and were therefore not selected for the operational ABC module. Persistence was retained as the development-selected reference method. XGBoost remained a candidate challenger evaluated in a separate retrospective extension but not deployed as the operational classification model.

##### **4.2.3.2.1 Later-Window ABC**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Performance of the persistence method was evaluated on two later windows to assess whether the development selection remained informative. The 2025 retrospective audit used 140 product labels; the January-through-September 2026 extension used 210 labels.

**Table 4.17 Later-window performance of persistence classifier**

| Window | Labels | Macro F1 | Balanced accuracy | A-class recall | B-class recall |
|---|---|---|---|---|---|
| 2025 retrospective | 140 | 0.4379 | 0.4591 | 0.4211 | 0.0526 |
| 2026 Jan–Sep | 210 | 0.3664 | 0.3869 | 0.1600 | 0.0222 |

*Source: persistence classifier applied to later held-out windows. Missing-history cohorts: 97 products in 2025 and 190 products in 2026 lacked prior-year history; A/B recall was zero in those cohorts.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Performance declined from the 2024 development window to the 2025 audit and further to the 2026 extension. The decline was partly attributable to missing-history cohorts—products that appeared in the later period without prior-year records—for which persistence could not generate an A or B prediction. The A-class recall of 42.11 percent in 2025 and 16.00 percent in 2026 described retrospective outcomes; they did not establish future classification accuracy.

##### **4.2.3.2.2 Retrospective XGBoost Extension**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A separate retrospective extension compared the XGBoost classifiers against persistence on the same later windows using an expanded training set through 2024, comprising 2,742 training samples. The extension evaluated depth-2 and depth-3 XGBoost on the 2025 and 2026 windows.

**Table 4.17a Retrospective XGBoost extension (training through 2024, 2,742 samples)**

| Method | 2025 Macro F1 | 2025 A-recall | 2026 Macro F1 | 2026 A-recall |
|---|---|---|---|---|
| Majority classifier | 0.2481 | 0.0% | 0.2667 | 0.0% |
| Prior-year persistence | 0.4379 | 42.11% | 0.3664 | 16.00% |
| XGBoost depth 2 | 0.4496 | 31.58% | 0.3664 | 16.00% |
| XGBoost depth 3 | 0.4348 | 31.58% | 0.3664 | 16.00% |

*Source: retrospective ABC comparison. 2 saved fits, 1,400 predictions, 40 cohorts, 21 tests, 8,514 checks. The extension did not revise the development-window selection.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;In the 2025 window, XGBoost depth-2 marginally exceeded persistence in macro F1 (0.4496 vs. 0.4379) but recorded lower A-class recall (31.58 percent vs. 42.11 percent). In the 2026 window, all three non-majority methods produced identical macro F1 (0.3664) and identical A-class recall (16.00 percent). The extension did not establish consistent XGBoost superiority and did not revise the original persistence selection. The XGBoost extension module remained offline in the dashboard product classification view.

#### **4.2.3.3 Historical Studies and External Predictors**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Two historical pilot studies were conducted to supply context on forecast method behavior and on the relationship between external predictors and pharmaceutical demand. The TRIVASC historical pilot examined a closed product series with available quantity records. The company-revenue benchmark examined aggregate monthly revenue.

##### **4.2.3.3.1 TRIVASC Historical Profile**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;TRIVASC was selected for the historical pilot because it carried a complete quantity and revenue series within the study period. The pilot data spanned January 2021 through June 2023, covering 158 source rows, 30 monthly targets, 1,840 total source units, and PHP 1,767,572.45 in recorded net sales.

**Table 4.18 TRIVASC historical pilot annual profile**

| Year | Units | Net sales (PHP) |
|---|---|---|
| 2021 | 705 | 701,122.45 |
| 2022 | 743 | 729,625.00 |
| 2023 (Jan–Jun) | 392 | 336,825.00 |
| **Total** | **1,840** | **1,767,572.45** |

*Source: TRIVASC quantity and revenue records, retained itemized population.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The monthly quantity statistics over the 30-month period were as follows: mean of 61.33 units, median of 59.50 units, standard deviation of 32.51 units, coefficient of variation of approximately 0.53, minimum of 20 units, and maximum of 143 units. The high coefficient of variation (0.53) reflected substantial month-to-month variability in TRIVASC demand, which posed a challenge for all evaluated forecast methods.

##### **4.2.3.3.2 Disease and Weather Coverage**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Exploratory external predictor coverage was assessed for four disease surveillance series and multiple weather variables. The coverage described the number of months for which a contemporaneous paired observation was available alongside a TRIVASC record.

**Table 4.19 External disease predictor coverage (months with paired TRIVASC observation)**

| External variable | Same-month pairs |
|---|---|
| Dengue | 30 |
| Typhoid | 25 |
| Leptospirosis | 21 |
| Cholera | 3 |

*Source: original exploratory pilot [H1]. Coverage varied by variable availability.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Weather variables assessed included station-based and NASA-sourced wind, rainfall, and temperature indicators. Correlations between weather variables and TRIVASC monthly quantity were near-zero across both same-month and prior-month lags. The NASA maximum wind variable recorded same-month correlation of 0.038 and prior-month correlation of 0.164, among the higher observed values in the weather group.

**Table 4.20 Sample external weather predictor correlations with TRIVASC quantity**

| External variable | Same-month r | Prior-month r |
|---|---|---|
| NASA maximum wind | 0.038 | 0.164 |

*Source: original exploratory pilot [H1]. Pair counts varied by variable and lag. Full table omitted; representative row shown.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The large cholera correlations were based on only three pairs and changed sign with the lag, precluding a stable inference. More broadly, the exploratory correlations did not adjust for serial dependence or multiple comparisons. They were retained to document the investigation, not to establish clinical indications or causal effects. The difference between quantity and sales correlations further demonstrated that financial activity was not a direct substitute for unit demand.

##### **4.2.3.3.3 Historical Forecast Comparison and Error Concentration**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The TRIVASC historical pilot compared quantity-only baselines with ridge-based alternatives and external-feature variants across six retrospective targets. Table 4.21 presents the full comparison. The quantity ridge method recorded the lowest reported WAPE (42.75 percent) among all evaluated methods. Adding disease, station-weather, combined, or NASA features did not improve on the quantity-only score.

**Table 4.21 Historical TRIVASC six-target forecast results**

| Method | MAE (source units) | WAPE | Mean bias |
|---|---|---|---|
| Last month | 47.83 | 73.21% | −1.83 |
| Recent mean (3 months) | 37.61 | 57.57% | +0.61 |
| Seasonal naïve | 33.67 | 51.53% | −12.33 |
| Quantity ridge | 27.93 | **42.75%** | −5.21 |
| Ridge with disease | 33.32 | 50.99% | +1.76 |
| Ridge with station weather | 36.85 | 56.40% | −5.41 |
| Ridge with disease and station weather | 39.89 | 61.05% | +2.76 |
| Ridge with NASA weather | 33.14 | 50.73% | −7.14 |

*Source: original pilot [H1]. Rounded historical scores preserved. No current-source retraining was performed.*

**Figure 4.7 Historical TRIVASC forecast error comparison**

*(Bar chart comparing WAPE for each method across the six-target historical cohort. Quantity ridge (42.75%) recorded the lowest WAPE. Source: [H1].)*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Inspection of individual errors revealed that June 2023—where the actual quantity was 143 units and the ridge prediction was approximately 58 units—accounted for approximately 50.66 percent of total absolute error. The model remained near a relatively stable level while the June observation was substantially higher.

**Table 4.22 Historical quantity-ridge errors by target month (Jan–Jun 2023)**

| Month | Actual | Prediction | Prediction minus actual | Share of absolute error |
|---|---|---|---|---|
| January 2023 | 60 | 64.87 | +4.87 | 2.91% |
| February 2023 | 30 | 62.21 | +32.21 | 19.22% |
| March 2023 | 66 | 56.07 | −9.93 | 5.93% |
| April 2023 | 30 | 61.07 | +31.07 | 18.54% |
| May 2023 | 63 | 58.41 | −4.59 | 2.74% |
| June 2023 | 143 | 58.11 | −84.89 | 50.66% |

*Source: original pilot [H1]. Rounded row errors summed to 167.56 while the historical source reported 167.57 using its calculation precision; the rounding difference was retained.*

**Figure 4.8 Historical TRIVASC actual quantities and ridge predictions**

*(Line chart showing actual monthly TRIVASC quantity and quantity-ridge predictions for Jan–Jun 2023. The June 2023 target concentrated the largest error. Source: [H1].)*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The original sensitivity review reported WAPE of 33.21 percent for January-through-May and 32.40 percent when the 60 zero-value units were excluded under a diagnostic alternative. These values described changed evaluation conditions and did not replace the primary six-target score or establish a different model selection after observing June.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The result was a bounded negative result for the data, features, and evaluation targets. It did not establish that external factors were irrelevant to all medicines or future forecasting designs.

##### **4.2.3.3.4 Historical Company-Revenue Benchmarks**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Company-revenue forecasting addressed a different management question from product-unit forecasting. The benchmarks were reviewed separately to retain their monetary target and to examine the difference between development and audit performance.

**Table 4.23 Historical company-revenue audit results**

| Baseline | MAE (PHP) | RMSE (PHP) | WAPE |
|---|---|---|---|
| Seasonal naïve | 11,261,458.43 | 13,000,988.08 | 72.89% |
| Last observed value | 5,834,383.00 | 6,956,031.72 | **37.76%** |
| Recent mean (3 months) | 9,212,416.36 | 10,647,446.50 | 59.63% |
| Recent mean (6 months) | 10,526,958.88 | 12,165,944.39 | 68.14% |

*Source: original Chapter 4 historical revenue experiment [H1]. The amounts were not current-source errors or physical-demand errors. 12 audit observations in 2025.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The last observed value had the lowest reported audit WAPE among the listed baselines (37.76 percent). The earlier development WAPE for last observed value was 83.20 percent, demonstrating that performance varied across windows. A later 12-month median alternative reduced development MAE by 24.90 percent but increased audit MAE by 116.95 percent, with an audit bias of negative 81.69 percent. The results reinforced the need to preserve evaluation windows and avoid interpreting a development improvement as generalization.

##### **4.2.3.3.5 Pre-Registered External Signal Tests and Planning Role**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Decision 017 established that DOH disease surveillance, PAGASA observations, and NASA POWER weather proxies inform planning outputs—the risk calendar, risk indicator panel, and buffer scenario—and do not drive operational forecasts. The recent mean of six months (mean_6) remains the reference baseline. Only a new pre-registered challenger that beats mean_6 on held-out months can change the forecast reference.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Two pre-registered weather tests were conducted using data through September 2026. Test W1 assessed whether weather-regime ranges covered the target territory 75 to 85 percent of historical months; observed coverage was 66.1 percent, below the registered rule, and W1 failed. Test W2 assessed whether typhoon-season delivery disruption associated with monthly sales at a significance level of p ≤ 0.05; the observed p-value was 0.43, and W2 failed. Neither result authorized removing external data from planning inputs; both confirmed that the external variables could not qualify as forecast drivers under the registered criteria.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;An association study examined whether diarrhoeal disease indexes (DII) and respiratory symptom indexes (RSI) independently predicted monthly pharmaceutical sales across eight territories after the multi-year trend was removed. The study found no significant association in any of the eight territories. DII and RSI therefore remained available as contextual planning indicators but did not enter the operational forecast.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Surge preparedness alerts were reviewed for the July-through-November main alert window. Of eight candidate alerts, zero were assessed as usable for procurement planning. The diarrhoeal disease pass was trend-confounded and was not considered actionable. The findings reinforced the planning-only role for external signals established by Decision 017.

#### **4.2.3.4 Prophet Evaluation of Confirmed Regional Sales**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Prophet was fitted to confirmed regional monthly net sales and compared with five reference methods. The target was recorded signed financial activity in PHP. Nine confirmed delivery labels supplied the mapping, while unallocated channels and contract summaries remained excluded. The original regional experiment used an offline extraction of historical Delta version 0 after a source-version mismatch had interrupted dashboard access. The 2 November recovery subsequently restored access to the pinned original release.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The fixed Prophet specification used a linear trend, additive annual seasonality with Fourier order 3, and a changepoint prior scale of 0.05. Daily and weekly seasonality were disabled. Models were refitted at each monthly origin using only preceding observations. One-month and three-month leads were scored separately. No parameter search, clipping of signed predictions, or forecast-interval claim was introduced. Prophet version 1.5.0 was used.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The reference methods comprised last value, recent means of three and six months, seasonal naïve, and additive damped ETS with a 12-month seasonal period. The comparison produced 468 predictions from 42 origins. CALABARZON contributed 12 targets per lead in development (2024), 12 per lead in the retrospective audit (2025), and nine per lead in the January-through-September 2026 extension. MIMAROPA held only 19 contiguous months, which fell below the 24-month training minimum adopted for this experiment, and no model was fitted to that region. Bicol contributed seven lead-1 targets for October 2022 through April 2023 and five lead-3 targets.

**Table 4.24 Regional Prophet evaluation coverage**

| Region | Contiguous run | Months | Evaluation |
|---|---|---|---|
| CALABARZON | 2020-01 to 2026-09 | 81 | Evaluated |
| MIMAROPA | 2018-03 to 2019-09 | 19 | Insufficient contiguous history |
| BICOL | 2020-10 to 2023-04 | 31 | Evaluated (exploratory) |

*Source: retained regional Prophet experiment [P8].*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;For CALABARZON, development window results (2024) showed that recent mean of three months recorded the lowest lead-1 error (MAE PHP 107,418.72; WAPE 19.00 percent) while last value recorded the lowest lead-3 error (MAE PHP 131,959.59; WAPE 23.34 percent). Prophet did not lead either comparison in development.

**Table 4.25 CALABARZON development model comparison**

| Method | Lead 1 MAE (PHP) | Lead 1 WAPE | Lead 3 MAE (PHP) | Lead 3 WAPE |
|---|---|---|---|---|
| Last value | 135,089.93 | 23.89% | 131,959.59 | 23.34% |
| Recent mean (3 months) | 107,418.72 | **19.00%** | 135,084.61 | 23.89% |
| Recent mean (6 months) | 122,448.16 | 21.66% | 135,862.17 | 24.03% |
| Seasonal naïve | 226,807.66 | 40.12% | 226,807.66 | 40.12% |
| ETS additive damped | 193,139.89 | 34.16% | 219,603.95 | 38.84% |
| Prophet | 179,775.67 | 31.80% | 201,248.63 | 35.60% |

*Source: retained regional Prophet experiment [P8]. MAE expressed in PHP. Each column used its stated lead-specific cohort.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;In the 2025 retrospective audit, seasonal naïve recorded the lowest observed error at both leads (lead-1 WAPE 16.88 percent; lead-3 WAPE 16.88 percent). The development-selected references reached 21.63 percent and 24.72 percent WAPE at the respective leads.

**Table 4.26 CALABARZON retrospective audit model comparison**

| Method | Lead 1 MAE (PHP) | Lead 1 WAPE | Lead 3 MAE (PHP) | Lead 3 WAPE |
|---|---|---|---|---|
| Last value | 160,529.55 | 26.92% | 156,328.65 | 26.21% |
| Recent mean (3 months) | 128,985.91 | 21.63% | 147,415.07 | 24.72% |
| Recent mean (6 months) | 112,199.21 | 18.81% | 107,416.81 | 18.01% |
| Seasonal naïve | 100,654.35 | **16.88%** | 100,654.35 | **16.88%** |
| ETS additive damped | 128,104.69 | 21.48% | 142,167.35 | 23.84% |
| Prophet | 133,382.17 | 22.37% | 134,075.59 | 22.48% |

*Source: retained regional Prophet experiment [P8]. MAE expressed in PHP.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;In the January-through-September 2026 extension, Prophet recorded lead-1 WAPE of 49.77 percent and lead-3 WAPE of 48.17 percent. Seasonal naïve had the lowest lead-1 error (46.49 percent WAPE) while recent mean of three months had the lowest lead-3 error (43.91 percent WAPE).

**Table 4.27 CALABARZON extension model comparison (Jan–Sep 2026, 9 targets)**

| Method | Lead 1 MAE (PHP) | Lead 1 WAPE | Lead 3 MAE (PHP) | Lead 3 WAPE |
|---|---|---|---|---|
| Last value | 448,379.51 | 69.83% | 447,512.75 | 69.69% |
| Recent mean (3 months) | 427,725.12 | 66.61% | 281,946.66 | **43.91%** |
| Recent mean (6 months) | 332,084.28 | 51.72% | 290,611.51 | 45.26% |
| Seasonal naïve | 298,529.53 | **46.49%** | 298,529.53 | 46.49% |
| ETS additive damped | 310,319.98 | 48.33% | 290,156.69 | 45.19% |
| Prophet | 319,578.43 | 49.77% | 309,286.10 | 48.17% |

*Source: retained regional Prophet experiment [P8]. MAE expressed in PHP. Nine targets scored per lead in Jan–Sep 2026.*

**Figure 4.9 CALABARZON extension errors by forecast lead**

*(Two-panel bar chart showing WAPE for each method at lead-1 and lead-3 for the Jan–Sep 2026 extension. Seasonal naïve showed the lowest lead-1 error. Source: [P8].)*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Bicol's Prophet WAPE reached 98.62 percent over seven lead-1 targets and 163.37 percent over five lead-3 targets, with last value recording the lowest lead-1 error. The short Bicol cohort and older cutoff did not support recent procurement forecasting.

**Table 4.28 BICOL exploratory model comparison**

| Method | Lead 1 MAE (PHP) | Lead 1 WAPE | Lead 3 MAE (PHP) | Lead 3 WAPE |
|---|---|---|---|---|
| Last value | 97,629.57 | **89.53%** | 152,929.60 | 141.95% |
| Recent mean (3 months) | 105,985.67 | 97.19% | 131,101.87 | **121.69%** |
| Recent mean (6 months) | 107,033.46 | 98.16% | 136,668.78 | 126.85% |
| Seasonal naïve | 193,307.41 | 177.27% | 229,592.58 | 213.10% |
| ETS additive damped | 159,373.47 | 146.15% | 221,625.91 | 205.71% |
| Prophet | 107,537.52 | 98.62% | 176,014.79 | 163.37% |

*Source: retained regional Prophet experiment [P8]. Exploratory only; short cohort and old cutoff.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Prophet was therefore retained as an evaluated challenger rather than an approved regional demand model. The evidence supported retaining simpler references in several windows, and no single method led every window.

##### **4.2.3.4.1 Expanded Company and Territorial Forecast Comparisons**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The updated Forecast Modeling records included separate 22-recipe comparisons for company net sales and CALABARZON net sales at leads one, three, and six. Each recorded 1,980 prediction attempts and 198 score groups. The recipes comprised four baselines, two ETS specifications, nine Prophet specifications, two SARIMA specifications, four ridge specifications, and one histogram gradient boosting specification. Failed or unavailable fits retained their reasons. The comparisons used the immutable original Gold reader and supported chart, table, and native-CSV inspection.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The company comparison retained recent mean of six months as its development reference at lead one and seasonal naïve at leads three and six. The territorial comparison used 81 contiguous CALABARZON observations and retained recent mean of six months at leads one and three and direct ridge with alpha ten at lead six. In its four-case inspected extension, the territorial comparison recorded WAPE of 26.14 percent at lead one, 58.56 percent at lead three, and 63.37 percent at lead six. The small inspected cohort did not establish prospective superiority.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Independent checks recomputed 312 elementary-baseline predictions from dated source values and reconciled every reported MAE using decimal arithmetic within PHP 0.0000001. Common target sets and calendar leads were also verified. The checks established calculation consistency but did not establish prospective accuracy or operational approval. Follow-up bias correction improved some longer-lead errors, but activity, component, and grouped recipes failed the recorded acceptance guards. The separate ten percent and five percent WAPE research goals remained unmet; they described later forecast research and did not replace the capstone objectives stated in the errata.

#### **4.2.3.5 Extended Model Evaluation Study**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;An extended evaluation study assessed 36 models in total across the forecast research program. The study scorecard covered 79 cells and 5,123 paired rows. The evaluation confirmed the reference forecast mean_6 (recent mean of six months) at 49.67 percent WAPE with a mean bias of negative 10.76 percent. No model from the extended evaluation met the pre-registered win rule that would have replaced mean_6.

##### **4.2.3.5.1 D3 Large-Document Split Study**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The D3 split study examined whether separating the sales series into a base component and a trailing large-order mean could reduce total forecast error. The base series achieved lead-1 WAPE in the range of 37.1 to 38.4 percent, compared with 49.7 percent for the total series. However, the approach of forecasting total demand as base series plus trailing large-order mean failed the registered win rule. Mean_6 remained the selected reference. The large-order versus routine split panel recorded retrospective lead-1 WAPE of 36.7 percent for the base series and 46.6 percent for the total series, confirming that large-order inclusion drove the bulk of total forecast error.

##### **4.2.3.5.2 Models 1–5 Test**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Five candidate models were evaluated against the base series. Coverage ranges for leads one through six (69 to 71 percent) fell outside the registered rule bounds. The 95-percent safety stock achieved only 82 percent coverage, below its registration target. The Teunter-Syntetos-Babai (TSB) method performed worse than mean_6 on 366 intermittent-demand products. No model from this cohort was activated.

##### **4.2.3.5.3 Day-20 WAPE and Backtest Replay**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The backtest replay panel reported day-20 WAPE of 30.3 percent against 37.0 percent over the most recent twelve months. Backtest replay analysis showed that the day-20 estimate cut the September 2025 error from negative 62 percent to positive 11 percent, and the July 2026 error from negative 51 percent to positive 20 percent. These results represented retrospective reconstruction of planning-horizon estimates and did not establish prospective forecast accuracy.

##### **4.2.3.5.4 New Prediction Targets**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Four new prediction targets were evaluated. The government large-order range prediction passed registration with 77.8 percent and 78.8 percent coverage at the respective evaluation conditions. The late-reorder flag passed with 88 percent correct identification against a 7 percent base rate. The segment chance model, budget-cycle model, and survival model each failed their respective registration rules. No new target was placed in operational use.

##### **4.2.3.5.5 Family ABC-XYZ Classification**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The family ABC-XYZ classification identified 728 product families in the 2025 data. Of these, 8 families were classified as AX (high-value, predictable), accounting for 3.4 percent of net sales, and 91 families as AZ (high-value, erratic), accounting for 72.8 percent of net sales. The concentration of net sales in AZ families reinforced the erratic-demand challenge for inventory management. The classification was retained as a demand-structure descriptor and did not change the reference forecast selection.

### **4.2.4 Prescriptive Analysis**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Following the prescriptive methods described in Chapter 3, the analysis addressed Specific Objective 4 through Economic Order Quantity (EOQ), Reorder Point (ROP), weighted integer-pack allocation, and dated supply-feasibility checks. Scenarios compared budget use, demand coverage, and potential expiry exposure under explicitly entered inventory, demand, cost, lead-time, and expiry assumptions. The resulting outputs supported procurement review within the stated conditions.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The planning implementation included EOQ and reorder-point calculations, balanced greedy allocation, weighted whole-pack allocation, dated operating snapshots, daily supply and expiry scenarios, fixed-plan review, and bounded purchase selection. Inputs remained entered assumptions unless independently verified. Current inventory, batch-expiry, supplier-cost, and lead-time records were unavailable for an operating-outcome evaluation.

#### **4.2.4.1 Inventory Policy Calculations**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Inventory policy calculations translated demand and cost assumptions into reviewable quantities and thresholds. The EOQ review used constant-demand assumptions, entered ordering and holding costs, and compatible unit or pack definitions. The classical EOQ expression was Q = √(2DS/H), where D was demand over the defined annual basis, S was ordering cost, and H was holding cost per unit on the same annual basis. The implementation also compared whole-pack lot costs. The reorder-point calculation used entered demand and lead time with reserve added once. Incompatible units or missing policy inputs could not be treated as verified zero values.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A single-product EOQ cost comparison did not prove that several products jointly satisfied a shared budget. An entered reserve was not a statistically validated service-level safety stock. Technical verification established arithmetic behavior under the supplied assumptions. Business usefulness depended on whether the assumptions matched actual operations.

##### **4.2.4.1.1 Worked Policy Illustration**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A numerical illustration made the relationship between policy inputs and calculated quantities easier to follow. The illustration assumed annual demand of 1,200 confirmed units, an ordering cost of PHP 500 per order, and an annual holding cost of PHP 20 per unit. The EOQ expression gave the square root of 60,000, approximately 244.95 units. If orders needed to use packs of 10 units, nearby whole-pack quantities required cost comparison rather than treating 244.95 as an executable purchase.

**Table 4.29 Illustrative EOQ pack comparison**

| Quantity units | Packs of 10 | Annual ordering cost (PHP) | Annual holding cost (PHP) | Relevant annual cost (PHP) |
|---|---|---|---|---|
| 200 | 20 | 3,000.00 | 2,000.00 | 5,000.00 |
| 240 | 24 | 2,500.00 | 2,400.00 | 4,900.00 |
| 250 | 25 | 2,400.00 | 2,500.00 | 4,900.00 |
| 300 | 30 | 2,000.00 | 3,000.00 | 5,000.00 |

*Source: author-calculated illustration using explicitly assumed inputs. Purchase price, quantity discounts, uncertain demand, and expiry were outside the simplified example.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A separate reorder-point illustration assumed four units of daily demand, ten days of replenishment lead time, and a reserve of 15 units. Lead-time demand amounted to 40 units, giving a reorder point of 55 units after reserve was added once. The examples clarified why the DSS required compatible units and periods.

##### **4.2.4.1.2 SHARJVAX Forecast and Purchasing Illustration**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The SHARJVAX September forecast provided an example of how a buyer could translate a quantity estimate into a purchasing question. The three-month average produced 6,920 recorded units. The scenario assumed that one recorded unit equalled one stock unit and that a supplier pack contained ten units.

**Table 4.29a SHARJVAX purchasing calculation under entered assumptions**

| Input or result | Quantity or value | Basis |
|---|---|---|
| September forecast | 6,920 recorded units | Calculated from the three preceding reported months |
| Usable stock at review | 1,000 stock units | Assumed opening balance |
| Confirmed receipts | 500 stock units | Assumed receipt before the planning period |
| Reserve at month end | 200 stock units | Entered scenario assumption |
| Net requirement | 6,920 + 200 − 1,000 − 500 = **5,620 units** | Forecast plus reserve less available supply |
| Pack size and order | 10 units per pack. **562 packs** | Assumed conversion; rounded to whole packs |
| Unit cost and spending | PHP 100 per unit. **PHP 562,000** | Assumed cost multiplied by 5,620 units |
| Budget and headroom | PHP 600,000. **PHP 38,000 remaining** | Assumed budget less calculated spending |
| Delivery condition | 10-day lead time. Order placed at least 10 days before September | Assumed full receipt before the period |
| Later recorded September quantity | 8,900 recorded units | Held-out reported observation, unused in the estimate |

*Source: author-calculated illustration. The illustration assumed no stock expired and no additional receipt occurred.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Under the assumptions, the order and existing supply provided 7,120 units for the month, including the intended reserve. The later recorded September quantity of 8,900 units exceeded the scenario's total supply by 1,780 units. Meeting the later quantity while retaining the 200-unit reserve would have required 1,980 additional units beyond the planned order. At the assumed unit price, the revised total order would have cost PHP 760,000, exceeding the assumed budget by PHP 160,000. The illustration showed how an underestimate could affect cash requirements and the buyer's need to review the plan. Actual shortages remained unmeasured because customer requests, stock availability, and replenishments were unverified.

#### **4.2.4.2 Allocation and Dated Supply Scenarios**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Joint purchasing and dated supply introduced constraints that a single-product formula could not resolve alone. Balanced greedy allocation remained a distinct allocation method. Weighted allocation used explicitly entered revenue, growth, and outbreak weights and normalized scores to compare whole-pack choices. A bounded integer search reported its objective, bound, and gap. When a search limit was reached, a feasible result was labelled without claiming proved optimality.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Dated scenarios accepted batches, expected receipts, demand calendars, reserves, and expiry dates. A one- to 366-day supply timeline applied the implemented FEFO (First-Expiry, First-Out) and reserve assumptions and reported projected shortages, balances, and expiry. Proposed-lot comparisons showed each lot separately and all lots together against the unchanged baseline. Effects were not necessarily additive because lots interacted within the same demand and timing constraints.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The gateway's fixed-plan review checked entered whole packs, exact-cent shared budget, supplier caps, fulfillment, and projected-expiry limits. A separate bounded selector chose within the documented zero-to-20-pack and one-date-slot product domain. Feasible, infeasible, and bounded results remained distinguishable. Gross shelf-life screens were screening measures rather than certification that a lot was expiry-safe.

**Table 4.30 Planning capabilities and valid claims**

| Capability | Supported claim | Claim not established |
|---|---|---|
| EOQ and reorder-point review | Calculations under entered policy assumptions | Accepted operating replenishment policy |
| Weighted whole-pack allocation | Feasibility and stated objective bounds | Universal global optimum or actual cost saving |
| Dated FEFO supply timeline | Projected shortages and expiry under a scenario | Measured stockouts or actual wastage |
| Fixed-plan and bounded selection | Checks within the encoded domain | Procurement authorization |

*Source: planning documentation. Claims distinguished what the system calculated from what required additional evidence.*

##### **4.2.4.2.1 Constraint Interactions and Proof Status**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A scenario result needed to be interpreted in relation to both its constraints and its search domain. A product's individually preferred order could conflict with the shared budget or supplier limits when combined with other products. Balanced greedy allocation and weighted integer-pack search addressed the joint scenario using their stated objectives. They were not interchangeable algorithms and could legitimately produce different allocations because they valued fulfillment differently.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The weighted search's node limit was 25,000 bounded computations. When a feasible solution was found without completing proof, the result remained a feasible candidate with its reported bound or gap. A reviewer needed the status to distinguish a useful plan from a proved optimum within the search domain. The dated selector used a restricted decision domain of zero to 20 packs and one date slot per product. FEFO scenarios illustrated how two plans with the same total quantity could produce different shortages if one receipt arrived later.

#### **4.2.4.3 Verification and Decision Meaning**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Verification established what the implementation calculated correctly under the tested assumptions. A fresh local verification on 3 November 2026 passed all 47 existing tests in the inventory-policy, weighted-allocation, dated-selection, dated-review, feasibility-screen, and STL suites. The synthetic cases verified defined calculations and constraints; they did not constitute a live purchasing trial, a complete operating evaluation, or a supported acquisition-value expiry percentage.

**Table 4.30a Fresh local calculation and constraint checks (3 November 2026)**

| Test case and assumed inputs | Expected result | Observed assertion on 3 November |
|---|---|---|
| EOQ/ROP: annual demand 10,000; order cost PHP 2; holding cost PHP 0.16/unit; pack 100; lead 10 days; reserve 20; stock 100; inbound 50; backorders 10. | EOQ 500 units / 5 packs; combined holding plus ordering cost PHP 80; reorder point 294; inventory position 140. | Passed. Reorder review triggered; operational-input verification and procurement approval remained false. |
| Weighted allocation: A cost PHP 6, score 60; B/C cost PHP 5, score 50 each; demand/cap one each; budget PHP 10. | Expected allocation: purchased B and C; spent PHP 10; 62.5% weighted fulfillment with zero proof gap within the encoded domain. | Passed. With 100% minimum fulfillment and same budget, result was infeasible; budget PHP 16 restored feasibility. |
| Dated fixed plan: 3 days at 2 units/day; 6 units arrived day one; 2 units/pack at PHP 3/pack; budget PHP 10; expiry after horizon. | Spent PHP 9 and fulfilled 6 units; baseline fulfilled zero; fixed plan was feasible. | Passed. Result did not claim objective optimization or purchasing approval. |
| Same dated case with expiry advanced to day two. | Four units expected to expire; expiry and fulfillment constraints expected to fail. | Passed. Fixed plan reported infeasible; expired units described the entered scenario. |
| Invalid policy inputs, supplier/budget conflicts, exhausted search, and STL history conditions. | Invalid inputs to be rejected; hard caps and bounded or no-fit statuses to be retained. | Applicable checks passed within the 47-test batch; no live API/UI or source acceptance was implied. |

*Source: local verification run, 3 November 2026. 47 tests total across all suites.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Potential expiry exposure was reported in the units supported by each scenario. Expired units, spending, and coverage described the entered assumptions; they did not establish actual warehouse wastage or a guaranteed waste reduction. The dated-plan response reported projected expired units, purchase spending, and constraint conflicts. A monetary expiry measure would additionally require supported acquisition costs for the relevant existing and incoming lots and a consistent denominator.

##### **4.2.4.3.1 Policy Sensitivity and Purchase Capacity**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The updated BUPIRIGHT continuation recorded 2,500 sensitivity rows and 27,000 policy simulations using 12 training months and six evaluation months. Higher simulated fill was accompanied by lower turnover. Zero expiry in the short evaluation window did not establish zero actual wastage or an operating improvement. Recorded ampoule sales remained a proxy for fulfilled demand, since lost requests and stockout-constrained demand were unavailable.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The purchasing trade-off concerned cash as well as availability. Plans that covered a larger share of demand also moved stock more slowly. The central simulation assumptions included a 25 percent annual holding cost, PHP 1,500 per order, a 14-day lead time, three-day lead-time variability, a 95 percent service level, 365- or 730-day shelf life, and an opening stock of one mean month. Sensitivity ranges varied the inputs. Literature supported comparison of inventory policies but did not validate the exact MedShield assumption values.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A separate 42-case purchase-capacity comparison checked exact results and parity across three planning approaches. The shared purchase-capacity constraint was carried through ordinary allocation, dated fixed-plan review, bounded selection, drafts, and exports. The result established consistent constraint handling in the evaluated cases; it did not establish that weighted allocation produced better actual outcomes than balanced allocation. The branch also documented 31 synthetic MCDA probes. Verified clinical criteria remained unavailable, so the results did not establish clinical product priority.

#### **4.2.4.4 Benefit and Sensitivity Simulation**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A simulated benefit analysis compared the DSS scenario approach against a uniform months-of-cover rule across a representative product set. Under the same target service level, the scenario-based planning approach required 15 to 52 percent less stock than the uniform months-of-cover rule. The simulation described behavior under the entered assumptions and did not establish that actual stock reductions or cost savings would be realized in operations. Actual benefit remained unverified because current inventory balances, supplier lead times, and historical fulfillment records were unavailable.

#### **4.2.4.5 New Offline Analytical Modules**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Four new offline analytical modules were added to the services layer as part of the update_07 release: `horizon_routing.py` (selects the appropriate lead horizon for each product segment), `abc_cold_start_hybrid.py` (handles ABC classification for products without prior-year history using a hybrid approach), `tender_snapshots.py` (captures government tender order snapshots for large-order range analysis), and `external_signal_readiness.py` (assesses readiness of external data sources before they inform planning outputs). The modules ran offline as part of the Python analytics service and did not serve dashboard requests directly. Their outputs supplied evidence for the planning and risk-calendar panels without being treated as runtime data sources.

---

## **4.3 Dashboard Implementation and Evaluation**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The dashboard brought together the analytical components specified in Chapter 3 to address Specific Objective 5. Its evaluation considered how filters, provenance, availability notices, exports, and review recommendations communicated the meaning and limits of the results.

### **4.3.1 Executive Overview and Sales Diagnostics**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The Executive Overview and Sales Diagnostics modules provided the entry point for financial review. The Executive Overview presented recorded financial values with selected period, source scope, and coverage, distinguishing itemized reporting from contract-only and unreconciled combined review. Sales Diagnostics supported matching-month comparisons, signed contribution investigation, and qualifying decomposition.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The earlier local source-selection check demonstrated why provenance controls mattered. A technically reachable warehouse was insufficient when the selected analytical contract did not satisfy the gateway's checks. The application exposed unavailability rather than replacing the requested dataset with bundled values. After selection of the documented source adapter, the live dashboard snapshot returned its original-source identity and financial results.

#### **4.3.1.1 Overview and Diagnostic Evidence from 31 October**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Current interface captures from 31 October 2026 illustrated how the reporting controls and financial results appeared in the local release. The Executive Overview displayed the financial result alongside source and period context. Figure 4.10 shows the recorded Executive Overview as captured on 31 October.

**Figure 4.10 Recorded Executive Overview in the local DSS on 31 October 2026**

*(Screenshot of the Executive Overview interface showing: itemized net sales PHP 638,015,352; gross profit PHP 334,666,272; latest-year sales growth +117.4%; sales record coverage 107/117. Data range 1 Jan 2017 – 30 Sep 2026, Yearly. Financial scope: Exclude Contracts. Status: Approval pending. Source: [P6].)*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The overview displayed PHP 638,015,352 as itemized net sales and PHP 334,666,272 as gross profit—corresponding to the analytical figures documented in Section 4.1.2.1—alongside a sales record coverage of 107 out of 117 possible months and a latest-year sales growth indicator of positive 117.4 percent. The overview also showed that the data source remained in Approval pending status, distinguishing analytical availability from business authorization.

**Figure 4.11 Recorded Sales Diagnostics interface on 31 October 2026**

*(Screenshot of the Sales Diagnostics interface showing: net sales revenue PHP 638,015,352; gross profit PHP 334,666,272; gross margin 59.03%. Tabs visible: Sales Trend, Growth, Quantities, Seasonality, Disease & weather, Change investigation, Territory baseline. Status: Approval pending. Source: [P6]. The historical capture preceded the recovery and integrated checks recorded on 2 November. [P13])*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The Sales Diagnostics interface displayed the same financial totals alongside the gross margin percentage of 59.03 percent and multiple tab-based views for period comparison and contribution investigation. The exact financial values were retained in editable tables because a screenshot alone was less suitable for recalculation and may display rounded amounts. The diagnostic capture complemented the numerical matched-period table; a screenshot did not replace it.

### **4.3.2 Product and Area Prioritization**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Product review presented contribution and evidence-gap queues with suggested owners and next checks. The recommendation was a structured commercial follow-up, not an automated reorder quantity or a clinical urgency score. Area review used the confirmed delivery labels, retained unallocated values, and explained missing regional history. Matching-month changes, supported financial coverage, and provenance accompanied exports.

#### **4.3.2.1 Product and Area Views Recorded on 31 October**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The Product Prioritization interface displayed current observed ABC and commercial review evidence. The documented counts in Section 4.1.2.2 were read from the product view. Figure 4.12 shows the recorded Product Prioritization interface as it appeared on 31 October.

**Figure 4.12 Recorded Product Prioritization interface on 31 October 2026**

*(Screenshot of the Product Prioritization interface. Visible entries include SPEEDA (net sales PHP 27,203,971; supported gross profit PHP 14,410,163; margin 52.97%; evidence flag: records missing paired cost support), PROFUREX 750MG and SHARJVAX. Source: Databricks candidate data, 31 October 2026. The all-time itemized scope was used. Product names are source labels. Source: [P6].)*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The regional review panel returned an unavailable message on 31 October 2026, as documented in Figure 4.13. The signed-in regional review was unavailable due to a source-version mismatch that had interrupted access. Retained regional numerical results were attributed to project evidence records rather than to the failed interface refresh. The 2 November recovery subsequently restored access and checked the area outputs against the selected source.

**Figure 4.13 Recorded regional review availability state on 31 October 2026**

*(Screenshot of the regional Sales Diagnostics panel showing "Unavailable" for net sales, supported gross profit, and gross margin under the Region: CALABARZON, Year: (all), and Related Regions filters. Sections visible: Compare regional totals and export data; Exact monthly values and missing periods; Delivery labels, source and limitations; Explore historical patterns — research detail; Company and recorded-area detail. Source: [P6]. The historical capture preceded the recovery recorded on 2 November. [P13])*

### **4.3.3 Forecast Research Presentation**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Forecast presentation needed to communicate the target and evaluation conditions as clearly as the predicted values. The documented Forecast module presented the BUPIRIGHT target, HOSPITAL channel, ampoule unit, lead, target count, error metrics, and research status. Its selector changed a historical comparison rather than activating a production champion. Recorded-versus-baseline views and lead-specific readouts helped users inspect the magnitude and concentration of errors.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Research outputs did not automatically populate operating demand or stock assumptions in Planning. The documented boundary regression confirmed that extra research or operating fields could not silently fill blank planning assumptions, and source replacement or failure cleared stale state. The separation prevented a retrospective comparison from acquiring procurement authority through interface navigation.

#### **4.3.3.1 Forecast Screen and Unpublished Estimates on 31 October**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The forecast screen on 31 October contained outputs with different targets and availability states. Figure 4.14 shows the recorded forecast interface.

**Figure 4.14 Recorded forecast interface and research status on 31 October 2026**

*(Screenshot of the Forecast Modeling interface. The screen shows: Monthly forecast evidence panel; Last observed value model selected; display window "3 months from current month." Status banner: "Last observed value: 32.85% historical WAPE across 3 scored observations. 3/3 displayed future months have prediction values. Retrospective benchmark evidence — unpublished — All products — P net sales." The screen also indicates: "Exploratory revenue estimates — Sales outlook and revenue-budget discussion only; operational reliability is not established." Historical error range: 2026-07 to 2026-08; backtest origins: 2026-06; actual leads 1–3. Future months have no measured error. Requested: 2026-10–2026-12; last actual 2026-09. Source: [P6]. The historical capture preceded the recovery and integrated checks recorded on 2 November. [P13])*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The last observed value forecast repeated the September 2026 net sales value of PHP 26,054,378.81 for October, November, and December, with unpublished status. It reported 32.85 percent historical WAPE across three scored observations for July through September 2026 from a June 2026 origin at leads one through three. The results were monetary baseline estimates from a small retrospective cohort and did not establish an issued BUPIRIGHT quantity forecast, an approved operational model, or measured future accuracy. The displayed revenue continuation and the product-unit research had different targets and publication states.

### **4.3.4 Prescriptive Planning and Draft Review**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The planning workflow organized entered assumptions into a scenario that could be calculated and reviewed. Planning connected the historical shortlist to explicit scenario inputs and calculation controls. Optional policy fields, allocation choices, dated snapshots, and exported results retained their assumptions and proof limits. Draft review and stale-state handling supported continuity without representing a saved draft as an approved purchase order. Invalid or incomplete inputs produced a review requirement rather than an invented stock balance or cost.

#### **4.3.4.1 Planning Capture from 31 October and Subsequent Verification**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The 31 October planning screenshot documented an unavailable shortlist and an unsolved scenario. The 2 November integrated records subsequently documented a functioning shortlist and synthetic planning calculation, including export checks. Figure 4.15 shows the planning interface as captured on 31 October.

**Figure 4.15 Recorded planning interface with unavailable source evidence on 31 October 2026**

*(Screenshot of the Prescriptive Planning interface showing: Product/Historical Reference table with columns Horizon Demand (Units), Usable Stock (Units), Safety Reserve (Units), Units per Pack, Cost per Pack (P), Supplier Max Limit (Packs), EOQ/Reorder Point Inputs. Status panels: Scenario Purchase Products — Not solved; Scenario Unmet Products — Not solved; Scenario Spend — Not solved; Expiry Loss — Unavailable (Shelf life and batch data not modelled); Scenario Mean Fulfillment — Not solved. Note: "I reviewed these inputs as scenario assumptions. MedShield has not verified the demand, inventory or supplier values." Source: [P6]. The historical capture preceded the recovery and integrated checks recorded on 2 November. [P13])*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The 31 October planning screenshot recorded that the historical shortlist was unavailable, the calculation remained unsolved, and operating fields were identified as scenario assumptions. The 2 November integrated records subsequently documented a functioning shortlist and synthetic planning calculation. The successful calculation established workflow behavior under entered assumptions and did not establish a verified purchase or a measured inventory benefit. Draft persistence was distinct from result validity; loading a draft cleared calculated results and acknowledgment so that a previous solution could not silently acquire validity under changed assumptions.

### **4.3.5 Source Management and Access Controls**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Source management and access controls governed how analytical evidence entered the user workflow. Sales ingestion followed controlled preparation and review. The direct browser sales-upload endpoint continued to reject ingestion outside its contract; no browser-side upload pathway was available to bypass the controlled Databricks pipeline. The updated branch also included controlled candidate intake and correction review, with intake unavailable when the required cloud-volume and job configuration was absent. Source rechecking remained separate from ingestion and business approval.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Supabase authentication and role checks protected application access. Databricks credentials remained server-side. Source failures remained explicit, and financial review scopes had their own authorization rules. The locally verified health response and successful source reads established service availability. They did not alone certify all security, role, or user workflows.

**Figure 4.16 Recorded source-management interface on 31 October 2026**

*(Screenshot of the Databricks Source interface showing: Data source and ingestion panel with "Recheck source" button. Three-step ingestion process: (1) The data operator validates files and preserves the source evidence; (2) The pipeline prepares candidate records and runs quality checks; (3) Reviewers resolve data issues and record the required release decisions. Notice: "New candidate data is shown only after it is available through the gateway. Pipeline checks do not grant business approval." Status: Approval pending. Source: [P6]. The page described controlled ingestion and source rechecking without representing pipeline completion as business approval. The historical capture preceded the recovery and integrated checks recorded on 2 November. [P13])*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The source page separated the data operator's validation, pipeline preparation, and reviewer release decisions. The separation mattered because technical quality checks could establish consistency without deciding the financial or operational meaning of the candidate. A successful recheck would show that the configured source could be read; it would not approve the source for every possible use.

#### **4.3.5.1 Analytical Outputs and Provenance**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The updated dashboard organized nine pages: Executive Overview, Sales Diagnostics, Product Prioritization, Area Prioritization, Forecast Modeling, Prescriptive Planning, Data Source, View Sales Data, and Weather API Validation. Companion readouts stated the decision question, evidence type, and current findings and linked to native outputs. Source failure cleared the readouts rather than retaining unsupported values.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The displayed-summary JSON recorded capture time, scope, and evidence type, but its source-identity field remained null. Native exports retained the provenance required for source-bound verification. The proponents therefore relied on the native analytical outputs and dated project records for numerical attribution rather than treating a summary download alone as a complete source receipt.

### **4.3.6 Technical Evaluation and Client Acceptance**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Technical correctness and client acceptance required different forms of evaluation. Client participation and measured operational outcomes remained separate evidence requirements. The November 2026 (update_07) verification record comprised 686 passing Python service tests, 309 passing Databricks analytical tests (databricks_updated_2 suite), 678 passing gateway tests, and 25 focused Playwright end-to-end cases across nine dashboard pages at five viewport widths. A UI quality review documented 37 fixed issues and 5 partly fixed issues. Frontend and backend type checks and lint checks also passed. The counts described scoped technical verification; they did not establish client or adviser sign-off, production deployment, model activation, or measured operating benefit.

**Table 4.31 Evaluation evidence and its limits**

| Evidence type | Recorded evidence | Interpretation |
|---|---|---|
| Python service tests | 686 passing tests (services suite, update_07) | Supported the tested offline analytical module behaviors |
| Databricks analytical tests | 309 passing tests (databricks_updated_2 suite) | Supported the tested Gold-layer queries and analytical outputs |
| Gateway checks | 678 passing gateway tests | Supported the tested API and access behavior |
| End-to-end browser cases | 25 focused Playwright cases across 9 pages at 5 viewport widths | Supported the recorded dashboard rendering and interaction behavior |
| UI quality review | 37 issues fixed, 5 partly fixed | Supported the visual and functional quality of the dashboard interface |
| Client acceptance | No attributable completed client trial established | Client usability and formal acceptance required a separate trial |
| Operating evaluation | No verified before-and-after stock or expiry study | Measured operating benefit remained unestablished |

*Source: November 2026 (update_07) verification record. Test suite counts reflected scoped verification at that version; suites addressed different system layers and are not additive.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The 31 October interface inspection captured the state of the dashboard before the November recovery. Table 4.32 summarizes the component status as of 31 October.

**Table 4.32 Evidence status from the 31 October interface inspection**

| Component | Evidence available | Observed interface status on 31 October |
|---|---|---|
| Financial overview | Captured source response and current interface | Loaded successfully |
| Sales Diagnostics | Current matched comparison and contributors | Loaded successfully |
| Product Prioritization | Current ABC and financial review values | Loaded successfully |
| Regional review | Retained mapping and STL records | Current panel unavailable |
| ABC and unit research | Retained registered experiment records | Current research panels unavailable |
| Revenue baseline | Current unpublished baseline display | Visible with separate target and limits |
| Planning | Retained synthetic verification and exports | Source shortlist unavailable; no new solve |
| Data Source | Current ingestion-policy page | Loaded successfully |

*Source: [P1–P6]. The inspection was a writing-time check and did not repeat every earlier test suite.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The 2 November integrated checks supplied the recovery evidence required after the earlier failures in area review, forecast research, and the planning shortlist. For SO5, the recorded verification covered the five analytical modules and supporting dashboard pages, including filters, source provenance, availability notices, exported outputs, and review recommendations. The later recovery and integrated checks superseded the earlier access limitation within the tested local configuration. Client interpretation and acceptance required a separate trial.

**Table 4.32a Verification status of the five required modules**

| Module | Latest recorded technical evidence [P13] | Remaining evaluation boundary |
|---|---|---|
| Sales Diagnostics | Matched periods, contributions, source records, and native exports checked. | Business causes and reporting approval required attributable review. |
| Product Prioritization | Contribution, ABC, and commercial readouts checked. | Financial classes did not establish clinical priority; new XGBoost extension remained offline. |
| Area Prioritization | Restored access, nine-label diagnostics, and eligible area/province STL documented. | Unallocated value and incomplete histories limited geographic interpretation. |
| Forecast Modeling | Restored research outputs and chart, table, and native-CSV parity checked. | Retrospective errors did not establish prospective accuracy or model approval. |
| Prescriptive Planning | Shortlist, synthetic solve, capacity constraints, and exports checked. | Entered assumptions and synthetic outcomes did not establish actual inventory benefit. |

*Source: 2 November integrated acceptance record [P13].*

#### **4.3.6.1 Evaluation Traceability and Reproducibility**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;An evaluation finding was useful only when its scope and release could be identified. The retained 533-check record was therefore described with its scope: 15 exported rows, 86 columns, and synthetic assumptions, supported by separate enumerated comparisons. The counts would not be suitable for conversion into an overall accuracy percentage. The checks were selected assertions about particular calculations and behaviors, not a random sample of client decisions or operating outcomes.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The World Health Organization (2024) described a context-sensitive approach to sustainable digital health supply-chain architecture. The proponents related the guidance to clear information sources, responsibilities, and connected analytical workflows. The handbook did not certify MedShield or validate its particular implementation.

#### **4.3.6.2 Suggested Acceptance Tasks and Recorded Outcomes**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Client tasks would need to test whether intended users could interpret evidence and respond appropriately to limitations. Table 4.33 presents the proposed client tasks for the next evaluation.

**Table 4.33 Proposed client tasks for the next evaluation**

| Task | Expected evidence of understanding | Current acceptance status |
|---|---|---|
| Interpret a financial total | User identified scope, cutoff, and approval status | A completed client trial was not established. |
| Explain a matched change | User separated contributor from cause | A completed client trial was not established. |
| Review an evidence gap | User identified missing cost support without inventing margin | A completed client trial was not established. |
| Interpret an unavailable region | User distinguished missing history from zero demand | A completed client trial was not established. |
| Compare forecasts | User identified unit, lead, target count, and status | A completed client trial was not established. |
| Review an entered scenario | User checked assumptions, constraints, and proof status | A completed client trial was not established. |
| Recover a draft | User recognized cleared results and rechecked inputs | A completed client trial was not established. |

*Source: proposed client evaluation design. An attributable user trial remained necessary to assess independent interpretation, task completion, and satisfaction.*

---

## **4.4 Summary of Findings**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Table 4.34 related the findings to the five objectives established in Chapter 1. Financial summaries and diagnostic records supported the sales and commercial findings. Historical comparisons supplied the forecast errors. Entered scenarios supplied the planning results, and the dated integrated checks supplied the dashboard verification. The dashboard supported financial diagnostics, product and delivery-area review, baseline-versus-XGBoost comparisons, separate monetary and unit-forecast experiments, and assumption-based procurement planning. Sparse quantity histories, incomplete geographic attribution, unavailable operating records, and the retrospective nature of model evaluation limited the conclusions.

**Table 4.34 Findings in relation to the specific objectives**

| Objective | Finding supported by the study | Remaining limitation |
|---|---|---|
| SO1 Recorded-sales diagnostics | Financial summaries, matched comparisons, and eligible regional and area STL supported the reporting scope. | Missing months, partial periods, and incomplete geographic allocation remained material. |
| SO2 Commercial review and ABC comparison | Contribution and growth review identified follow-up; the separate XGBoost extension did not establish consistent superiority. | Exact-label identity, retrospective outcomes, and weak missing-history recall restricted interpretation. |
| SO3 Historical forecast evaluation | The unit pilot and separate PHP comparisons supplied time-ordered evidence; the updated recipes broadened the evaluated methods. | Quantity-specific candidate eligibility, conditional external predictors, and prospective accuracy remained unresolved. |
| SO4 Procurement scenarios | EOQ, ROP, allocation, dated plans, sensitivity runs, and capacity comparisons supplied scenario evidence. | Operating inputs remained unverified; simulated fill, turnover, and expiry did not establish actual gains. |
| SO5 Integrated dashboard | Restored access and the 2 November integrated record supported filters, source-bound outputs, exports, and recovery. | The technical record did not establish client sign-off or production and operating acceptance. |

*Source: Chapter 4 findings; Chapter 5 develops the conclusions and recommendations.*

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;For a procurement review, the analytical steps had distinct purposes. Sales Diagnostics identified where a recorded change occurred. Product and Area Prioritization located the labels involved. Forecast Modeling showed the size of past prediction errors. Planning compared feasible choices under entered constraints. A purchase decision still required verified stock, lot expiry, supplier terms, and an authorized reviewer.

---

# CHAPTER 5

## CONCLUSIONS AND RECOMMENDATIONS

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;This chapter draws conclusions from the findings reported in Chapter 4 and presents recommendations for practice and for future research. The conclusions follow the five specific objectives of the study. Each conclusion is bounded by the evidence described in the preceding chapter. The recommendations identify actions supported by the findings and directions for additional investigation.

---

## **5.1 Conclusions**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The study developed and evaluated a prescriptive analytics-driven Decision Support System (DSS) for pharmaceutical demand forecasting and procurement planning at MedShield Pharmaceutical Corporation. The DSS integrated descriptive, diagnostic, predictive, and prescriptive analytical modules drawing on sales transaction data spanning January 2017 through September 2026. The findings are summarized below by objective.

### **5.1.1 SO1: Recorded-Sales Diagnostics**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The study confirmed that a stable, version-bound sales data population could be established from MedShield's historical transaction records. The retained analytical population of 40,171 itemized records from 10 source files, supported by Databricks Unity Catalog Gold table versioning, provided a consistent reference for all analytical computations. Full-history eligible net sales of PHP 638,015,351.53 with a weighted supported margin of 59.03 percent were documented across 107 of 117 possible months from 2017 through September 2026.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The confirmed delivery label mapping linked 48.43 percent of records to CALABARZON, MIMAROPA, or Bicol delivery areas. The matched year-on-year comparison demonstrated that January-through-September 2026 net sales of PHP 140,199,402.67 exceeded the same period in 2025 by PHP 75,699,529.53 (approximately 117.4 percent). STL decomposition of the CALABARZON aggregate and eligible area series provided time-series pattern descriptions consistent with the broader regional analysis.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Limitations to SO1 included 10 of 117 months without recorded sales evidence, partial years for 2017, 2018, and 2019 limiting year-over-year comparison, and 81.88 percent of eligible net sales value remaining in unallocated records that could not be attributed to a confirmed delivery region. The findings documented the available evidence; they did not resolve the unallocated population or certify the completeness of the recorded sales history.

### **5.1.2 SO2: Commercial Review and ABC Comparison**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The study documented the product contribution structure of MedShield's recorded sales. Across 5,623 distinct product names, the ABC classification confirmed that 629 Class A products (11.2 percent of names) accounted for approximately 80 percent of cumulative positive net sales. The top ten products by eligible net sales were identified, with SPEEDA recording the highest cumulative contribution (PHP 27,203,970.97). Commercial exception records for ELCILLIN, CLONISUR, and CLINTOP were flagged and documented, indicating products whose recorded cost or margin evidence required further commercial verification.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The predictive ABC evaluation demonstrated that prior-year persistence recorded the highest macro F1 (0.5367) and highest A-class recall (0.5455 or 54.55 percent) on the 83 held-out 2024 product labels, outperforming both XGBoost candidates tested. In later windows, persistence performance declined to macro F1 of 0.4379 in 2025 and 0.3664 in January-through-September 2026, reflecting increasing proportions of products without prior-year history. The separate retrospective XGBoost extension using 2,742 training samples through 2024 did not establish consistent superiority over persistence across both later windows.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The commercial evidence informed a structured product follow-up workflow on the DSS Product Prioritization page. The conclusions did not establish clinical product priority, operational restocking recommendations, or confirmed sales causation. Exact product label identity across source files and the weak missing-history recall rate restricted the interpretation of classification results.

### **5.1.3 SO3: Historical Forecast Evaluation**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The study conducted time-ordered forecast evaluations for BUPIRIGHT AMPULE unit quantity and for regional PHP sales. The BUPIRIGHT unit pilot showed that the seasonal naïve baseline achieved WAPE of 31.6 percent at lead-1 (6 targets, April-September 2026) and 30.0 percent at lead-3 (4 targets, June-September 2026), with MAE of 13.17 and 9.75 ampoules respectively. These results represented the lowest errors among four evaluated baselines on the available scored targets.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The regional Prophet evaluation confirmed that for CALABARZON, development-selected reference methods (recent mean of three months at lead-1, last value at lead-3) achieved lower MAE than Prophet in development. In the 2025 retrospective audit, seasonal naïve recorded the lowest WAPE (16.88 percent). In the January-through-September 2026 extension, Prophet achieved WAPE of 49.77 percent at lead-1 and 48.17 percent at lead-3, while simpler references such as seasonal naïve (46.49 percent) and recent mean of three months (43.91 percent lead-3) matched or exceeded it. Bicol's short contiguous history and high WAPEs (98.62 percent lead-1; 163.37 percent lead-3) did not support reliable recent procurement forecasting.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The expanded 22-recipe territorial comparison recorded WAPE of 26.14 percent at lead-1, 58.56 percent at lead-3, and 63.37 percent at lead-6 in its four-case inspected extension, using recent mean of six months at leads one and three and direct ridge at lead six. The historical TRIVASC pilot found that quantity ridge (WAPE 42.75 percent) outperformed external-feature variants including disease surveillance and weather regressors on the six retrospective targets. The historical company-revenue experiment found last observed value WAPE of 37.76 percent over 12 audit observations in 2025.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;An extended evaluation study assessed 36 models in total across the forecast research program. The study scorecard covered 79 cells and 5,123 paired rows. The confirmed reference forecast mean_6 (recent mean of six months) recorded 49.67 percent WAPE with a mean bias of negative 10.76 percent. No model from the extended evaluation met the pre-registered win rule. The D3 large-document split study showed that the base series achieved lead-1 WAPE of 37.1 to 38.4 percent against 49.7 percent for the total series, but forecasting total demand as base plus trailing large-order mean failed the win rule. The day-20 WAPE panel recorded 30.3 percent against 37.0 percent over the most recent twelve months, and backtest replay reduced the September 2025 error from negative 62 percent to positive 11 percent. Two pre-registered weather tests both failed: W1 (weather-regime coverage 66.1 percent, below the 75 to 85 percent rule) and W2 (typhoon disruption association p = 0.43). An association study confirmed no significant association between DII/RSI and monthly pharmaceutical sales in any of the eight evaluated territories after trend removal. Among four new prediction targets, the government large-order range prediction and the late-reorder flag passed their registration rules; the segment chance, budget-cycle, and survival models failed.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Limitations to SO3 included the small scored cohorts for unit research (6 and 4 targets), the absence of prospective accuracy evidence beyond the current sales cutoff, the conditional nature of SARIMAX external regressors, and the retrospective rather than prospective character of all evaluated comparisons. The results described method behavior on the available data and did not establish an approved operational forecast model.

### **5.1.4 SO4: Procurement Scenarios**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The study implemented and verified EOQ/ROP calculations, balanced greedy allocation, weighted integer-pack allocation, dated FEFO supply timelines, fixed-plan review, and bounded purchase selection within the DSS Prescriptive Planning module. The SHARJVAX illustration demonstrated the transition from a quantity forecast to a purchasing scenario: a three-month average of 6,920 units, adjusted for available stock (1,000 units) and expected receipts (500 units) against a reserve target of 200 units, produced a net requirement of 5,620 units (562 packs at the assumed pack size of 10), with a computed spending of PHP 562,000 against an assumed budget of PHP 600,000. The later recorded September quantity of 8,900 units exceeded the scenario's planned supply by 1,780 units, illustrating the demand coverage risk present in assumption-based planning.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The 42-case purchase-capacity comparison confirmed consistent constraint handling across allocation methods. The 2,500 sensitivity rows and 27,000 BUPIRIGHT policy simulations documented the relationship between service level and stock turnover under varied input assumptions. A fresh local verification on 3 November 2026 passed all 47 existing tests across the inventory-policy, weighted-allocation, dated-selection, dated-review, feasibility-screen, and STL suites.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A simulated benefit analysis compared the scenario-based approach against a uniform months-of-cover rule. Under the same target service level, the scenario-based planning required 15 to 52 percent less stock than the uniform rule. The simulation described behavior under entered assumptions and did not establish actual stock reductions in operations. Four new offline analytical modules were added: `horizon_routing.py`, `abc_cold_start_hybrid.py`, `tender_snapshots.py`, and `external_signal_readiness.py`. These ran offline within the Python analytics service and supplied evidence for planning and risk-calendar outputs without acting as runtime dashboard sources.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Limitations to SO4 included the absence of verified current inventory, batch expiry, actual supplier costs, and historical demand-fulfillment records. Entered assumptions could not substitute for independently verified operating inputs. Simulated fill rates, projected expiry exposure, and boundary scenarios described behavior under those assumptions; they did not establish actual inventory improvements, stockout reductions, or cost savings. Procurement authorization remained outside the system's scope.

### **5.1.5 SO5: Integrated Dashboard**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The study implemented and verified a multi-module DSS dashboard covering five analytical pages: Sales Diagnostics, Product Prioritization, Area Prioritization, Forecast Modeling, and Prescriptive Planning. Supporting pages included Executive Overview, Data Source, View Sales Data, and Weather API Validation. The November 2026 (update_07) verification record comprised 686 passing Python service tests, 309 passing Databricks analytical tests, 678 passing gateway tests, and 25 focused Playwright end-to-end cases across nine dashboard pages at five viewport widths. A UI quality review documented 37 fixed and 5 partly fixed issues. Frontend type checks, backend type checks, and lint checks also passed.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The 31 October 2026 interface captures documented partial availability at the time of capture: financial overview, sales diagnostics, product prioritization, revenue baseline, and data source pages loaded successfully, while the regional review, ABC and unit research panels, and planning shortlist were unavailable due to the source-version mismatch resolved on 2 November. The recovery established that dashboard access was restorable within the tested local configuration.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The source management architecture separated data operator validation, pipeline preparation, and reviewer release decisions. Supabase handled authentication; Databricks credentials remained server-side. No browser-side upload pathway was available for sales data ingestion. The design kept technical quality checks separate from business authorization, preventing analytical availability from implying procurement approval.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Limitations to SO5 included the absence of a completed attributable client trial, the lack of production deployment evidence, and the absence of a measured operational outcome study. Technical verification established what the implemented system calculated correctly under tested inputs; it did not establish that users could independently interpret the results, that client workflows matched the designed intention, or that the system produced better operational decisions than the existing process.

---

## **5.2 Recommendations**

### **5.2.1 Establish and Maintain a Version-Bound Analytical Record**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MedShield should maintain the Databricks Unity Catalog Gold layer as the confirmed analytical system of record for all reporting, forecasting, and planning computations. Version binding prevented the ambiguity documented in the November 2026 source-version recovery incident. Analytical retention periods should be set to cover the full project horizon, and any new data source should pass the same provenance and quality-pairing checks before it enters the confirmed population.

### **5.2.2 Conduct Formal Commercial Exception Review**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The commercial flags on ELCILLIN, CLONISUR, and CLINTOP indicate that pricing and cost records for a subset of products require verification by the Finance and source owner. Resolving these exceptions would improve the reliability of supported gross profit figures for affected products and reduce the number of records carrying margin evidence flagged as incomplete. A periodic exception-review cycle aligned with the data preparation workflow is recommended.

### **5.2.3 Prioritize Resolution of the Unallocated Regional Population**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Approximately 81.88 percent of eligible net sales value could not be attributed to a confirmed delivery region. Extending the delivery-label mapping—through customer master data, invoice address fields, or logistics records—would significantly improve the geographic coverage available for regional analysis and procurement planning. MIMAROPA and Bicol require additional confirmed records before time-series methods can produce regionally relevant forecasts.

### **5.2.4 Expand Forecast Evaluation Windows Before Operational Selection**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Thirty-six models were evaluated across the forecast research program, and no model from the extended evaluation met the pre-registered win rule that would have replaced mean_6 as the reference forecast. The evaluation confirmed mean_6 at 49.67 percent WAPE and negative 10.76 percent bias. Before selecting an operational forecasting method, management should commission a prospective pilot covering at least 12 consecutive monthly predictions against realized outcomes. The evaluation should use the same target definition (net sales or confirmed quantity), the same lead time, and an independent scored cohort that was not observed at the time of model selection. The pilot should report WAPE, bias, and error-concentration analysis by product or area.

### **5.2.5 Deploy Clinical Prioritization Criteria for ABC Classification**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The current ABC classification ranked products by financial contribution alone. For pharmaceutical inventory management, clinical priority—therapeutic criticality, substitutability, and patient risk—constitutes a distinct and essential classification axis. MedShield should develop a clinically verified VEN (Vital, Essential, Non-essential) or equivalent classification to accompany the financial ABC tier. The DSS Product Prioritization module should expose both financial and clinical tiers so that procurement decisions can balance revenue contribution with patient care continuity.

### **5.2.6 Implement an Attributable Client Acceptance Trial**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Technical verification of the DSS did not establish that intended users could interpret results, recognize limitations, and respond appropriately to flags such as missing cost support or unavailable regional history. The proposed client tasks in Table 4.33 provide a structured starting point. The formal acceptance trial should recruit representative buyers and finance reviewers, present each participant with realistic scenarios drawn from the current dashboard, record whether participants identified the scope, approval status, and evidence boundaries of each result, and report completion rates, error rates, and qualitative feedback. Client sign-off should be conditional on the outcome of this trial.

### **5.2.7 Conduct a Prospective Operating Outcome Study**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Scenario-based procurement planning within the DSS documented projected shortages, budget utilization, and potential expiry exposure under entered assumptions. A prospective study that captured actual inventory levels, realized demand, stockout events, and expiry write-offs before and after DSS adoption would supply the operating-outcome evidence absent from the current evaluation. The study should run for at least one complete replenishment cycle for the included products and use a comparison condition (manual process or historical baseline) to attribute any change to the DSS.

---

## **5.3 Directions for Future Research**

### **5.3.1 Prospective Unit-Level Demand Modeling**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The BUPIRIGHT quantity pilot demonstrated that seasonal naïve methods achieved WAPE near 30 percent on a small retrospective cohort. Future research should extend unit-quantity pilots to additional products with sufficient monthly history, evaluate SARIMA and ETS models under proper prospective conditions, and explore the feasibility of collaborative forecasting with hospital procurement partners who may have forward-booking information not reflected in historical sales records.

### **5.3.2 External Predictor Integration Under Prospective Conditions**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The TRIVASC historical pilot found that disease surveillance and weather variables did not improve on quantity-ridge performance for that product under the available six-target retrospective cohort. Pre-registered weather tests W1 and W2 both failed their respective registration criteria using data through September 2026 (see Section 4.2.3.3.5), and an association study confirmed no significant independent relationship between DII/RSI and monthly pharmaceutical sales in any of the eight evaluated territories after trend removal. Per Decision 017, DOH, PAGASA, and NASA POWER data therefore inform planning outputs—the risk calendar, risk indicator, and buffer scenario—and do not drive operational forecasts. Mean_6 remains the reference baseline unless a new pre-registered challenger beats it on held-out months. Future research should systematically evaluate whether specific disease-burden indicators improve forecasting accuracy for therapeutically relevant product classes—for example, linking dengue and typhoid surveillance to relevant antimicrobial or antipyretic product demand—under prospective evaluation conditions with regressor values available at forecast issuance. SARIMAX or Prophet with regressors should be evaluated only when the regressor values can be confirmed available at the time of each prediction and the regressor meets a pre-registered accuracy threshold on held-out data.

### **5.3.3 Regional Demand Disaggregation**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The confirmed delivery labels cover three regions but only 18.12 percent of eligible net sales value. Future research should address the unallocated population through administrative and logistical data linkage. With broader regional coverage, hierarchical forecasting approaches—reconciling product-level, region-level, and total company forecasts—could be evaluated. Spatial analysis of the CALABARZON, MIMAROPA, and Bicol delivery patterns could identify which delivery areas show correlated or complementary demand cycles relevant to consolidated procurement.

### **5.3.4 Multi-Criteria Procurement Optimization**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The prescriptive module implemented EOQ, ROP, and weighted integer-pack allocation under single-period assumptions. Future research should incorporate multi-period stochastic demand models, empirically calibrated service-level targets using historical stockout records, and joint replenishment for products sharing a supplier or storage constraint. The 31 synthetic MCDA probes documented in this study indicate a pathway to multi-criteria prioritization; operationalizing MCDA requires verified clinical priority data and confirmed supplier-performance records not available during the current study period.

### **5.3.5 Dashboard Usability and Adoption Research**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The proposed client acceptance tasks established a structure for formal usability testing. Future research should apply validated health informatics usability instruments—such as the System Usability Scale or Technology Acceptance Model instruments adapted for clinical supply-chain contexts—to MedShield stakeholders. Longitudinal adoption research following a production deployment would document whether dashboard engagement, planning scenario frequency, and procurement cycle times changed after DSS introduction, providing the operational-outcome evidence absent from the current study.

### **5.3.6 Integration with Supplier and Regulatory Data**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The current DSS relied exclusively on internal sales and inventory assumptions. Future development should explore integration with supplier lead-time records, Philippine FDA registration and cold-chain requirements, and national PhilHealth reimbursement schedules. These external data sources would allow the DSS to flag regulatory constraints at the product level and to incorporate supplier reliability as a planning input alongside demand forecasts and cost assumptions.

---

*End of Chapters 4 and 5.*
