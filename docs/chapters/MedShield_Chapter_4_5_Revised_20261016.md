# Chapter 4
## Results and Discussion

The implemented MedShield Decision Support System provided traceable historical sales reporting, product and area contribution analysis, stored company-revenue forecasting research, and allocation scenarios based on entered assumptions. Its strongest evidence concerns recorded commercial activity and the reproducibility of analytical outputs. The study did not establish reduced expiry losses, a production-approved medicine-demand forecast, or an optimized operational purchasing policy. These boundaries determine how the findings answer the objectives in the post-defense Chapters 1–3 manuscript. [E1–E10]

The original study specifies 2021–2025 performance across CALABARZON, MIMAROPA and Bicol. The implemented reporting population extends from 2017 to 2025, while company-revenue STL and forecasting use a separate contiguous 2020–2025 series. The extended history provides analytical context; it does not silently amend the original territorial, product-unit or methodological commitments. Results below identify the population, period and evidence status of each output.

### 4.1 Presentation of Results

Data preparation established which records could support historical reporting and which proposed analyses remained constrained. The pipeline preserved source identities, quality dispositions and original or adjusted provenance. Accepted records were aggregated for reporting, while unresolved mappings and missing operational inputs remained visible. Acceptance into an analytical candidate is a technical data-processing outcome and does not independently authenticate a physical delivery or authorize business publication.

#### 4.1.1 Data Sources and Coverage

MedShield supplied historical sales files covering 2017–2025. The retained processing inventory contains 59,039 source lines, of which 37,728 entered the accepted candidate fact population. Source descriptions contain 4,561 distinct product labels; these are not 4,561 verified medicine stock-keeping units. The records include dates, financial amounts, source quantities and mixed product or customer descriptions. The field used for monthly grouping is Date Delivered. [E2, E3, E6]

The available source evidence consists of the supplied sales files. Original delivery receipts are unavailable to the study. An identifier recorded in a sales file does not demonstrate access to, or independent verification of, the corresponding receipt. Agreement between processed records and supplied files establishes consistency within that source lineage. It does not establish independent completeness, original product quantities, physical delivery events or the reason for an unusual month.

**Table 4.1 Data sources and analytical coverage**

| Source | Coverage and grain | Use and limitation |
|---|---|---|
| MedShield sales files | 2017–2025; accepted source-record facts and monthly aggregates | Historical reporting and company-PHP research; 98 of 108 calendar months contain observations |
| DOH surveillance files | Declared 2018–2026 coverage; 2026 partial | Independently prepared disease context; approved predictive joins and issue-time evidence remain required |
| PAGASA station observations | 2017–2024; daily observations aggregated monthly | Official historical weather evidence; official 2025 observations absent |
| NASA POWER and supported Open-Meteo archive candidates | Provider/model-specific historical observations | Separately labelled gridded proxies; publication and coverage differ by provider |
| DOH/PAGASA reference PDFs | Publication-specific reporting periods | Supplementary reference material; not proof of a fitted external-feature model |
| Inventory, expiry, supplier and replenishment records | Required operational feeds not established | Operational EOQ, ROP, expiry outcomes and purchasing benefits cannot be verified |

The source inventory supports separate preparation of sales, disease and weather evidence. Coexistence in the platform does not mean these sources have been joined successfully or that an external variable improves prediction.

#### 4.1.2 Data Profiling and Quality Assessment

Profiling identified blank and structural lines, unusable transaction identities, historical restatements, duplicate risks and date problems. Product descriptions also varied in strength, formulation, packaging and item type. Source area values sometimes described geography and sometimes buyer categories such as Government or Hospital. Those meanings must remain distinct. [E3, E10]

The current category dispositions improve reporting without resolving sellable product identity. Medicine, medical supply and medical equipment are separate catalog categories, but the dashboard's broader Medical reporting group combines them. Category acceptance therefore does not establish compatible medicine units, verified packs or an approved SKU-level demand series. Adjusted-source allocations retain estimated provenance even when aggregate finance reconciles.

**Table 4.2 Quality issues and implications**

| Issue | Observed condition | Interpretation |
|---|---|---|
| Monthly coverage | Ten missing observations in 108 calendar months | Missing records remain unknown rather than zero sales |
| Source identity | 4,561 master/source labels | Labels require separate SKU, strength, formulation, pack and unit review |
| Reporting population | 4,491 financially eligible source-label groups in full-period export | Different denominator from the complete catalog |
| Geography and buyer meaning | Mixed location, institutional and channel labels | Geographic attribution and account identity need evidence |
| Financial eligibility | Revenue and supported margin have different eligible populations | Each rate must use its matching denominator |
| Original/adjusted provenance | Historical allocations and adjusted files remain included with labels | Reconciled amounts do not verify original item mix |
| Independent source verification | Sales files available; original receipts unavailable | Physical events, completeness and causes remain unverified |

These conditions limit interpretation rather than justify arbitrary removal of large values. An inaccurate forecast is not evidence that a reconciled observation should be deleted, clipped or assigned a different date.

#### 4.1.3 Data Preprocessing and Cleaning Results

The source-line disposition accounting reconciles to 59,039 lines. Table 4.3 distinguishes accepted records from held or excluded lines. The 1,835 historical backfill records identified in the preparation evidence are a subset retained within the accepted population, not additional records to add to the table total. [E3]

**Table 4.3 Reconciled source-line dispositions**

| Disposition | Lines | Processing outcome |
|---|---:|---|
| Accepted analytical facts | 37,728 | Retained subject to quality and provenance labels |
| Blank lines | 13,643 | Excluded as non-transaction content |
| Invalid transaction identity | 4,436 | Held from accepted facts |
| Historical restatements | 2,373 | Held to prevent unsupported replacement or double counting |
| Historical snapshot duplicates | 639 | Excluded from accepted facts |
| Possible duplicates | 87 | Held for review |
| Before the defined source-period boundary | 86 | Held from analytical processing |
| Future-dated records | 8 | Held for review |
| Titles, headers and summaries | 39 | Excluded as structural content |
| Total source lines | 59,039 | Disposition accounting reconciles |

Missing sales observations occur in May–August and October 2017, January–February 2018, and October–December 2019. Thus, 98/108 calendar months, or 90.74%, contain recorded activity. This is observed-month coverage, not an independently verified percentage of all transactions that should have existed. Every calendar month from January 2020 through December 2025 contains an observation, which supports the contiguous 72-month series used for the stated company-revenue analyses.

![Figure 4.1 Observed monthly sales coverage from 2017 to 2025](../../outputs/paper_revision_20261016/assets/coverage.png)

Figure 4.1 distinguishes months with recorded activity from missing observations. No missing month was converted to zero for these reported totals.

#### 4.1.4 Data Transformation and Standardization

The transformations made records comparable without erasing differences in evidence quality. Dates were parsed for period aggregation. Signed amounts and financial eligibility were preserved. Product and location fields retained source labels alongside controlled reporting classifications. Transformations did not convert mixed source quantities into a common medicine unit. [E2, E3, E10]

**Table 4.4 Transformation rules used in interpretation**

| Field or measure | Reporting rule | Boundary |
|---|---|---|
| Date Delivered | Source date basis for monthly eligible recorded sales | Does not independently verify the delivery event |
| Net CP or net_cost | Recorded eligible net sales in PHP | Not cash collections, medicine quantities or market demand |
| Total TP or total_trade_price | Acquisition-cost measure under the recorded definition | Not a complete operating-expense ledger |
| Workbook net_income | Supported transaction gross margin before operating expenses | Not company net profit |
| Weighted gross margin | Sum of supported margin divided by matching eligible revenue | Do not divide by all independently revenue-eligible sales |
| Negative financial adjustments | Preserve signed amounts and report separately where required | Not independently verified physical returns |
| Product identity | Keep source label and category/mapping provenance | Do not merge incompatible strength, formulation, pack or units |
| Geography and buyer classification | Preserve derived mapping basis and unresolved records | Buyer categories are not automatically locations or verified accounts |

For the full reporting period, the supported gross margin of ₱288,487,498.72 uses a corresponding revenue basis of ₱478,720,670.03. Dividing these matching populations gives 60.262177%, displayed as 60.26%. The independently eligible net-sales total is ₱626,946,741.81. Using that larger amount as the margin denominator would change the metric's population and misstate the supported rate.

#### 4.1.5 Data Integration and Feature Engineering

The analytical runtime uses Databricks Unity Catalog. Controlled ingestion preserves source evidence in Bronze; Silver parses records and applies quality dispositions; Gold provides candidate facts and aggregates. Stable serving views support the Express/TypeScript gateway, which supplies the authenticated Next.js dashboard. Supabase supplies authentication, linked application roles and audit persistence. Python prepares and evaluates analytics offline. [E7, E10]

![Figure 4.2 Implemented analytical architecture and evidence flow](../../outputs/paper_revision_20261016/assets/architecture.png)

Figure 4.2 describes the implemented architecture. It differs from the analytical Supabase/PostgreSQL and Power BI proposal in Chapter 3. Offline predictive inputs are frozen from reconciled Gold evidence; results reach serving only through the governed candidate/publication path. The dashboard does not read local model files or start training when a user opens a module.

Calendar periods, lagged sales and origin-known features were prepared for the evaluated company-PHP models. Feature preprocessing is limited to information available within the relevant training window. A decomposition of the complete historical series is descriptive evidence and cannot be inserted into an earlier-origin forecast without rebuilding it inside that origin.

DOH, PAGASA and proxy weather records remain independently identified. A predictive external join requires geography, time, disease-product relevance, representativeness and issue-time availability evidence. The reviewed implementation does not establish an accepted disease/weather increment for the original territory medicine-demand task. Prepared variables and available interface controls are not evidence that a predictor was actually fitted.

#### 4.1.6 Analytical Staging and Data Readiness

**Table 4.5 Readiness of analytical components**

| Component | Supported state | Remaining boundary |
|---|---|---|
| Company financial reporting | Reconciled candidate reporting | Source completeness and business publication remain separate |
| Company monthly STL | Descriptive 2020–2025 decomposition checked | Not daily territory/SKU decomposition |
| Product contribution and observed ABC | Source-label commercial reporting | Verified SKU/pack/unit/account identity still required |
| Area rankings | Derived mapped-area reporting | Unresolved geography and buyer attribution remain visible |
| Company-PHP forecasting research | Original 21-model comparison stored and exposed in dashboard | Not operational medicine-demand approval |
| Later six error-reduction recipes | Retained offline exploratory experiment | Not automatically served or selected for activation |
| Disease/weather forecasting | External data and readiness checks available | Approved joins and incremental predictive value not established |
| Inventory allocation | Tested scenarios with entered assumptions | Actual inputs, global optimality and operational benefit not established |

The states in Table 4.5 describe bounded technical capability. They do not replace business usefulness review, publication approval or academic acceptance.

A separate 16 October local readiness assessment examined an exact-label medicine review candidate, TRIVASC 35MG MR under QUEZON. Its 164 positive original-source records span January 2021–June 2023, but historical presentation, quantity unit and territorial meaning remain unapproved. The complete 2021–2023 label/area population also contains one negative quantity requiring interpretation. This archived fact-17/current-master inspection is not a new fact-20 warehouse certification or a fitted quantity model. December 2026 would be calendar lead 42 from June 2023, beyond a 1–12 lead claim. The assessment therefore reinforces the original O3 readiness gap rather than closing it. [E12]

#### 4.1.7 Model Evaluation and Validation

The forecast target was company monthly eligible recorded net sales in PHP, using the contiguous January 2020–December 2025 series. This differs from the original objective of territory-level pharmaceutical demand with DII/RSI and urgency scoring. The research compared simple benchmarks before retaining more complex challengers. [E1, E4, E5]

The original expanded comparison contains 21 configurations: four benchmarks, two ETS configurations, nine Prophet configurations, two SARIMA configurations and four ridge-regression recipes. The five development origins are December 2022 and March, June, September and December 2023. Leads 1–12 produce 60 origin–target cases per model across 24 distinct target months. A December 2024 cutoff supplies 12 January–December 2025 audit targets. Overlapping development windows mean that 60 cases are not 60 independent months.

The audit had already been inspected before later extensions were designed. Its scores therefore remain retrospective audit evidence; extensions do not restore an untouched final test. Model selection uses the registered development procedure and is not changed by choosing the lowest audit error after inspection.

MAE measures the mean absolute peso error. RMSE gives greater weight to larger squared errors. WAPE is the sum of absolute errors divided by the sum of absolute actual values, multiplied by 100. Normalized signed bias uses prediction minus actual, so a positive value indicates net overforecasting. Percentage errors are unavailable when their denominator is zero. A value of 100 minus WAPE is not a forecast-accuracy score.

**Table 4.6 Representative members of the original model families**

| Member selected by development WAPE for presentation | Development WAPE | Audit WAPE | Audit MAE in PHP |
|---|---:|---:|---:|
| Last observed value | 83.199360% | 37.763644% | 5,834,383.00 |
| ETS without trend | 92.744543% | 67.969011% | 10,501,032.20 |
| Prophet cp0.01 sp10 | 93.542363% | 72.105184% | 11,140,059.96 |
| SARIMA airline | 87.879445% | 63.376322% | 9,791,473.91 |
| Recursive ridge alpha 10 | 106.554455% | 69.805660% | 10,784,789.51 |

The table is a compact view of the complete retained experiment rather than a new selection procedure. No challenger in that original comparison met all unchanged experimental criteria. The last-value research reference retained audit RMSE of ₱6,956,031.72 and normalized signed bias of +8.383545%. These errors remain material.

#### 4.1.8 Model Selection and Output Publication

The original selected research reference remains last_value. It is an unpublished candidate, not an approved operational demand model. A later six-recipe experiment is reported separately in Section 4.2.5 and does not replace this original selection. [E4–E7]

The 15 October implementation exposes the original 21 configurations through authenticated, read-only warehouse access. Stored research can be viewed and exported without activating it. Six later recipes remain in their offline evidence packet. Model review, business numerical tolerances, approved manifests and release-pointer requirements remain separate from candidate storage and interface display.

The post-defense proposal includes planned Prophet MAPE below 15%, urgency MAPE below 20% and expiry wastage at or below 5%. These are commitments or targets in the methodology, not achieved study findings. The later proposed 10% WAPE research goal is a different metric and decision; it cannot silently replace those thresholds. Actual business maximum MAE and WAPE remain unset. [E1, E6]

### 4.2 Data Analysis

#### 4.2.1 Historical Sales and Margin

The full reporting population contains ₱626,946,741.81 in eligible signed net sales and ₱288,487,498.72 in supported gross margin. Table 4.7 gives annual results with coverage. The original 2021–2025 study window is identifiable within the broader context rather than being replaced by it. [E2]

**Table 4.7 Annual company financial results and observed coverage**

| Year | Net sales in PHP | Supported gross margin in PHP | Matching margin revenue in PHP | Observed months |
|---|---:|---:|---:|---:|
| 2017 | 10,211,167.35 | 6,316,157.68 | 9,212,606.10 | 7/12 |
| 2018 | 51,619,691.27 | 28,328,721.76 | 44,882,495.39 | 10/12 |
| 2019 | 62,542,304.49 | 29,125,469.95 | 41,211,281.42 | 9/12 |
| 2020 | 63,593,274.63 | 28,013,993.68 | 40,259,988.09 | 12/12 |
| 2021 | 77,860,206.26 | 50,420,770.93 | 77,804,247.26 | 12/12 |
| 2022 | 63,234,990.04 | 40,799,049.06 | 60,493,221.21 | 12/12 |
| 2023 | 62,228,966.85 | 33,585,582.48 | 59,822,843.64 | 12/12 |
| 2024 | 50,259,319.88 | 19,563,837.42 | 49,956,893.05 | 12/12 |
| 2025 | 185,396,821.04 | 52,333,915.76 | 95,077,093.87 | 12/12 |
| Total | 626,946,741.81 | 288,487,498.72 | 478,720,670.03 | 98/108 |

![Figure 4.3 Annual recorded net sales with monthly coverage disclosed](../../outputs/paper_revision_20261016/assets/annual-sales.png)

Eligible net sales rose from ₱50,259,319.88 in 2024 to ₱185,396,821.04 in 2025. Both years contain observations in all twelve months, so the annual comparison does not have the early-period missing-month mismatch. Recorded growth was approximately 268.88%. Nevertheless, all-month activity does not independently establish source completeness, and 2025 retains adjusted-source allocation provenance.

The increase localizes a change in recorded commercial activity. It does not establish increased medicine-unit demand or identify disease, weather, procurement expansion or reporting practices as its cause. The original/adjusted files and within-source reconciliations support financial consistency at their checked scope; independent explanations remain unavailable. Management should investigate unusual periods without relabelling plausible explanations as findings.

The earliest three annual totals have seven, ten and nine observed months respectively. Their differences from a fully observed later year are not automatically like-for-like growth. The dashboard's matched-period controls must identify the compared months and denominators.

#### 4.2.2 Product Contribution and Observed ABC

The full-period financially eligible product export contains 4,491 source-label groups. Of these, 1,363 are in the Medical reporting category, 206 are Non-Medical and 2,922 are Unclassified. Their signed net sales sum to the full eligible company total. These exported groups differ from the 4,561 labels in the complete source/master population. [E2]

**Table 4.8 Reporting categories in the eligible product export**

| Category | Source-label groups | Signed net sales in PHP | Share of eligible net sales |
|---|---:|---:|---:|
| Medical | 1,363 | 362,376,811.94 | 57.80% |
| Non-Medical | 206 | 21,287,340.11 | 3.40% |
| Unclassified | 2,922 | 243,282,589.76 | 38.80% |
| Total | 4,491 | 626,946,741.81 | 100.00% |

The Medical group combines medicines, supplies and equipment. The substantial Unclassified share limits claims about medicine-specific priorities. Retaining unclassified revenue preserves the financial population while identifying the need for further source review.

Candidate ABC uses ₱628,569,441.39 in positive sales. Signed negative financial adjustments of ₱−1,622,699.58 are preserved separately. The crossing-inclusive policy assigns the label crossing a cumulative threshold to its starting class.

**Table 4.9 Observed positive-sales ABC distribution**

| Class | Source-label groups | Share of positive sales |
|---|---:|---:|
| A | 442 | 80.02% |
| B | 932 | 14.99% |
| C | 3,097 | 4.99% |
| ABC Unclassified | 20 | 0.00% |

![Figure 4.4 Source-label concentration under the observed ABC policy](../../outputs/paper_revision_20261016/assets/abc.png)

The concentration supports a commercial review queue: a relatively small group accounts for most positive sales. It does not establish clinical importance, stock urgency, future ABC class or a quantity order. Negative adjustments cannot be called verified physical returns without corresponding operational evidence. ABC Unclassified indicates no positive-sales contribution and is distinct from the broader reporting-category Unclassified.

#### 4.2.3 Territory and Account Interpretation

Area prioritization separates mapped geographic results from records that lack usable attribution. Values such as Government and Hospital describe buyer characteristics and cannot be interpreted as complete physical territories. Likewise, the existence of a client-reference registry does not prove transaction-level linkage to every account.

The supplied draft's captured area view reports approximately ₱89.9 million mapped and ₱537 million outside the geographic rankings, with CALABARZON and MIMAROPA shares calculated within that selected mapped population. Those rounded screenshot observations must not be generalized to a complete independently verified three-region distribution. In particular, absence from a displayed ranked subset is not proof of zero Bicol sales. [E11]

The implemented commercial score combines sales value and active-period coverage. The captured 60:40 setting is a weighting preference for sensitivity analysis, not a validated optimal allocation rule. Disease risk, supplier lead times and verified stock requirements are not established by that score. Consequently, mapped rankings support review of source attribution and commercial concentration; verified territorial medicine allocation remains a separate requirement.

#### 4.2.4 Seasonal Decomposition

The checked STL series covers January 2020–December 2025, comprising 72 contiguous company-revenue months. The preparation splits history at gaps and excludes segments with insufficient continuous observations rather than imputing the ten unknown months. Trend, seasonal and residual components reconstruct the eligible PHP series within the retained validator's tolerance. [E2, E3]

![Figure 4.5 Company monthly revenue and checked STL components](../../outputs/paper_revision_20261016/assets/stl.png)

Figure 4.5 is descriptive decomposition at the supported company-month grain. It does not establish a recurring medicine-demand cycle in every territory. Residual variation identifies departures from the fitted trend and seasonality; it does not explain those departures causally. Full-series components are not automatically available at an earlier forecasting origin.

The implemented monthly company analysis therefore provides a narrower contribution to O1 than the daily or territorial decomposition described in the proposal. That difference requires explicit methodology reconciliation and the applicable academic decision.

#### 4.2.5 Forecast Errors and Later Error Reduction

The original last-value research reference had development MAE of ₱3,090,470.93 and WAPE of 83.199360%. On the twelve 2025 audit targets, MAE was ₱5,834,383.00 and WAPE was 37.763644%. The lower percentage error in the higher-revenue audit population coexists with a larger peso error; it does not alone indicate improved future reliability. [E4–E6]

The later experiment registered six recipes, adding 432 evaluated points: 360 development cases and 72 retrospective-audit cases. The retained reference supplies separate comparison points. These six recipes are distinct from the SARIMA/ridge extensions that originally expanded the comparison to 21 configurations.

**Table 4.10 Separate error-reduction experiment on common cumulative leads 1–12**

| Recipe | Development MAE in PHP | Development WAPE | Audit MAE in PHP | Audit WAPE |
|---|---:|---:|---:|---:|
| Last-value reference | 3,090,470.93 | 83.199360% | 5,834,383.00 | 37.763644% |
| Median 3 months | 3,285,721.75 | 88.455757% | 12,489,155.88 | 80.837346% |
| Median 6 months | 2,880,858.36 | 77.556326% | 12,184,140.75 | 78.863105% |
| Median 12 months | 2,320,959.94 | 62.483157% | 12,657,516.49 | 81.927078% |
| Weighted median 6 months | 3,023,795.65 | 81.404378% | 12,489,155.88 | 80.837346% |
| Seasonal median shrinkage | 2,764,291.00 | 74.418186% | 11,699,027.54 | 75.723159% |
| Bounded last-value calibration | 2,907,027.78 | 78.260840% | 5,772,569.95 | 37.363553% |

The development procedure chose median 12 months, reducing development MAE by 24.899473%. Its audit MAE, however, increased by 116.946959%, with normalized bias of −81.694163%. Lower development error did not translate into acceptable retrospective performance.

The unselected calibration reduced full-audit MAE by ₱61,813.06 per scored month, a relative reduction of 1.059462%. Its WAPE improvement was 0.400091 percentage points. This modest retrospective change cannot justify selecting a replacement using an already inspected audit.

![Figure 4.6 Development and retrospective-audit WAPE for the reference and later recipes](../../outputs/paper_revision_20261016/assets/error-trials.png)

**Table 4.11 Audit errors by nested calendar-lead group**

| Recipe | Cumulative leads | Cases | MAE in PHP | WAPE |
|---|---|---:|---:|---:|
| Last-value reference | 1–3 | 3 | 5,946,519.14 | 55.068259% |
| Last-value reference | 1–6 | 6 | 5,895,422.98 | 47.560869% |
| Last-value reference | 1–12 | 12 | 5,834,383.00 | 37.763644% |
| Bounded calibration | 1–3 | 3 | 5,141,101.24 | 47.609616% |
| Bounded calibration | 1–6 | 6 | 5,213,631.19 | 42.060567% |
| Bounded calibration | 1–12 | 12 | 5,772,569.95 | 37.363553% |
| Median 12 months | 1–3 | 3 | 8,114,186.87 | 75.142135% |
| Median 12 months | 1–6 | 6 | 9,639,298.54 | 77.764296% |
| Median 12 months | 1–12 | 12 | 12,657,516.49 | 81.927078% |

The lead groups overlap and must not be added or treated as independent confirmations. Development has 15, 30 and 60 cases across 15, 18 and 24 distinct target months for the respective groups. Audit groups cover January–March, January–June and January–December 2025.

The proposed 10% WAPE research goal remains unachieved and separate from unset business error limits. No result establishes that either overforecasting or underforecasting has a known operational cost under the current PHP target. Unsupported uncertainty intervals remain unavailable.

Retained 2026 research projections use a December 2025 data cutoff but were generated in October 2026. The stored selected-model candidate exposed in the dashboard records its 9 October generation; the separate 21-model annual-release packet records 10 October generation. These are distinct artifacts. January–September had already elapsed, October was current and November–December were future at generation. Neither artifact was issued in December 2025. Accepted 2026 actuals and measured 2026 errors are absent, and the later six recipes generated no new annual projections.

#### 4.2.6 External Signals and Planning Scenarios

The disease/weather interface reports readiness rather than a demonstrated external-variable effect for the blocked selection. The supplied draft captures zero aligned months for its selected territory/product/provider combination. That selected unavailable state cannot support a claim that disease or rainfall improved forecasts, caused the 2025 increase, or supplied operational alerts. No accepted held-out XGBoost ABC or urgency evaluation is established by the reviewed evidence. The proposal's classifier addresses new or low-history SKU labels; a next-period ABC forecast, as separately described in the North Star, would require a temporal target and evaluation. [E1, E6, E10, E11]

Planning scenarios have stronger calculation evidence than an unsolved screenshot alone suggests. The retained scenario review reports thirteen focused fixtures and 1,000 synthetic cases: 614 completed and 386 correctly infeasible. Those checks address integer packs, costs, constraints, missing or duplicate inputs, protected stock, minimum fulfillment and bounded computation. They support tested scenario behavior, not observed procurement outcomes. [E8]

The active gateway uses a bounded greedy allocation method. The active scenario does not compute EOQ, reorder points, lead times or expiry reduction. An offline mixed-integer implementation is a separate method; it is not proof that the active workflow solves the proposed MCDA-weighted regional linear program or guarantees global optimality. Entered demand, stock, reserves, pack sizes, cost and supplier caps remain assumptions until supported by operational records. The expiry outcome remains unavailable without lot-level shelf life and stock evidence.

### 4.3 Dashboard

The dashboard presents the preceding analytical results through an authenticated Next.js interface backed by the TypeScript gateway and Databricks candidate contracts. Its five analytical modules are Sales Diagnostics, Product Prioritization, Area Prioritization, Forecast Modeling and Prescriptive Planning. Supporting views expose source status, record details and weather provenance. The interface is evidence of implemented access and behavior within its checked scope; it does not independently prove operational benefit. [E7, E10]

#### 4.3.1 Executive Overview

The Executive Overview displays the selected period, company financial measures, coverage and source status. For 2017–2025, the retained full-history checks reconcile eligible net sales of ₱626,946,741.81 and supported gross margin of ₱288,487,498.72. Coverage identifies the 98 observed months rather than concealing the ten missing observations.

A selected overview helps the reader locate unusual changes before inspecting underlying records. Growth interpretation still requires comparable periods and source definitions. The nine reporting years do not, by themselves, establish an eight-year business cycle. Rounded on-screen amounts should be supported by the exact values and populations in the results tables.

#### 4.3.2 Sales Diagnostics

Sales Diagnostics presents annual and monthly recorded performance, variation and calculation scope. It supports investigation of changes such as the 2024–2025 increase in Section 4.2.1. The diagnostic contribution is localization and reconciliation: the user can inspect which periods or reporting groups account for a change.

The module does not establish an underlying cause without additional evidence. Revenue, quantity, margin and coverage are different measures, and a financial spike cannot be labelled a disease-driven medicine-demand increase solely from its timing.

#### 4.3.3 Product Prioritization

Product Prioritization shows contribution, observed ABC, cumulative concentration and activity coverage. Table 4.9 supplies the full-period 442-label A-class result with its positive-sales denominator. The interface supports a review of commercially important source labels, including whether high value accompanies recurring or intermittent activity.

Source labels remain subject to identity and unit limitations. A large occasional contract, an adjusted allocation and a verified recurring medicine sale have different evidential meanings. Current ABC is a deterministic description of the selected historical portfolio. It does not establish the proposal's learned classification performance for held-out new or low-history SKUs, or a separate forecast of next-period class.

#### 4.3.4 Area Prioritization

Area Prioritization displays mapped and unresolved attribution, geographic rankings and commercial-weight sensitivity. The client-reference registry provides supporting context, while unresolved transaction links remain explicit. Rankings must retain the selected mapped-population denominator rather than being presented as complete company geography.

Weight changes allow users to compare commercial assumptions. They do not validate the original revenue/growth/outbreak MCDA policy or establish where stock should be moved. Any proposed territorial allocation also needs verified medicine quantities, inventory and logistics inputs.

#### 4.3.5 Forecast Modeling

The Forecast Modeling module retains four dynamic benchmarks and adds the separately identified Stored predictive research workflow. The latter reads the original warehouse experiment and permits selection of development or inspected audit evidence, cumulative calendar leads and a detail model. It displays model errors and origin–target–lead records and exports the selected evidence as CSV. Selecting a model for inspection does not replace the frozen selection. [E7]

![Figure 4.7 Stored predictive research controls and explicit candidate status](../../outputs/paper_revision_20261016/assets/research-controls.png)

Figure 4.7 is a crop from retained 15 October authenticated browser evidence. Its candidate label and evidence-stage controls are part of the interpretation, not decorative interface details. The full numerical results remain readable in Tables 4.6, 4.10 and 4.11.

A separate projection view preserves generation time, cutoff, true leads and unavailable actual errors. Unsupported intervals or missing required sources produce an explicit unavailable state. The six later recipes are not silently read from local files.

The external-regression interface identifies insufficient approved alignment for its blocked selections. Its presence demonstrates a guarded analytical boundary, not a fitted or successful disease/weather forecasting model.

#### 4.3.6 Prescriptive Planning

Prescriptive Planning accepts scenario demand, usable stock, reserves, pack conversions, costs and supplier limitations. The user acknowledges that the entries are reviewed assumptions. The gateway returns completed allocations or infeasibility where its input contract is satisfied; reaching the computation limit returns not_solved without a partial completed allocation.

The screenshot in the supplied draft shows Not solved and unavailable expiry loss. That image is evidence of the captured state only. The separate retained fixture results support scenario logic, while neither source establishes a completed real purchasing plan or prevented expiry. EOQ, ROP, safety stock, greedy allocation and an offline mixed-integer solver must be named according to the method actually demonstrated.

#### 4.3.7 Supporting Data Management Views

The source-status and Data Upload interface identifies the active analytical contract. Direct POST /api/sales/upload returns HTTP 409 DATABRICKS_INGESTION_REQUIRED. Sales files enter the controlled Databricks pipeline. Visible CSV/JSON controls cannot be reported as a working direct-upload ingestion path or a completed client upload-to-publication acceptance test. [E10]

View Sales Data permits inspection of source dates, labels, financial measures and quality flags. A warning does not necessarily exclude a record from every metric; eligibility follows the measure's contract. Source quantities retain their original units. The matching revenue basis must remain visible when interpreting supported gross margin.

Weather validation separates official PAGASA observations from named gridded proxies and displays available coverage. A historical provider comparison does not measure future weather-forecast accuracy or establish an official live typhoon warning. A selected zero-match result identifies a local join-readiness limitation.

#### 4.3.8 Technical Evaluation and Objective Alignment

The 15 October local integration packet retains 130 passing backend tests, successful runtime and strict-validator compilation, a frontend production build, 52 broader isolated browser fixtures, six final research fixtures and four authenticated live browser cases. It also retains 883 live numerical/key comparisons across 126 model/stage/lead groups. These populations answer different verification questions and cannot be added into one accuracy or test-coverage percentage. [E7]

The packet includes initial warehouse failures, later successful recovery and a corrected browser test that uses the real navigation path. Earlier failed attempts remain recorded. The scoped operational-validator repair supersedes that specific earlier finding; it does not close unrelated clean-bootstrap, dependency, authentication-recovery or deployment gates from the broader 10 October QA.

No inspected usability survey or formal user-acceptance result supports a numerical satisfaction or ISO-style rating. Screenshots demonstrate selected views; the retained tests support only their executed cases and checked identities.

**Table 4.12 Alignment with the five original objectives**

| Objective from the latest post-defense manuscript | Demonstrated contribution | Remaining original commitment |
|---|---|---|
| O1 Regional performance, territory YoY and STL for 2021–2025 | Historical finance, matched-period controls and company monthly STL | Verified territorial/unit interpretation and promised decomposition scope or actual academic amendment |
| O2 Territory/account/SKU priorities, Pareto and XGBoost ABC | Source-label contribution, deterministic observed ABC and mapped commercial rankings | Verified sellable/account identity, supported slow-mover meaning and held-out XGBoost ABC evaluation if retained |
| O3 Territory medicine demand from December 2026 with DII/RSI and urgency | Company-PHP comparative research, errors, candidate projections and guarded external-data workflow | Compatible quantity target, issue-time joins, urgency truth and approved operational publication |
| O4 EOQ/ROP/MCDA-weighted allocation and expiry wastage ≤5% | Assumption-based allocation inputs and tested bounded scenario calculations | Verified operational inputs, agreed method and measured expiry or turnover outcomes |
| O5 Five governed modules, CSV workflow, official alerts and matching | Authenticated analytical modules, controlled ingestion foundations, research display and exports | Complete client ingestion/retry/correction/publication acceptance, evaluated official alerts and collaborative recommendations |

Table 4.12 summarizes rather than rewrites the objectives; their full wording remains in the source manuscript and objective register. A component's implementation does not close every conjunctive criterion of its objective. The evidence does not support a claim that all five original objectives have been completely achieved.

#### 4.3.9 Contribution to Inventory Planning

The DSS centralizes recorded-sales evidence, exposes uncertainty and identifies the information still needed for an inventory decision. Its contribution is practical visibility and a reproducible review process. Commercial priorities can direct attention to records for investigation; research errors can prevent unjustified confidence in a complex model; scenarios can reveal the consequences of entered constraints.

Reduced expiry, fewer stockouts, higher turnover, lower procurement cost and superiority over existing practice require a defined baseline, verified operational data and an evaluation design. Those outcomes were not measured. The North Star of optimizing inventory and reducing losses remains an intended operational outcome rather than an established effect of the delivered system.

### 4.4 Summary of Findings

The accepted candidate contains 37,728 source records and supports 2017–2025 historical reporting with 98 observed months. Missing months remain unknown, while original/adjusted provenance and unverified completeness limit interpretation. Supported gross margin uses its matching revenue denominator and cannot be called company net profit.

Commercial concentration is observable: 442 source-label groups account for 80.02% of positive sales under the stated ABC policy. That result supports catalog and commercial review, while unresolved SKU, account and geographic identity prevents automatic conversion into medicine-demand or purchasing priorities.

The company-PHP modeling study demonstrates substantial historical errors and preserves unsuccessful challengers. Median 12 months improved later development performance but deteriorated sharply in the inspected audit. Calibration supplied a modest unselected retrospective improvement. The original reference, business-limit status and publication decision remain unchanged.

Authenticated reporting and stored research inspection are implemented and checked locally. Planning calculations are bounded scenarios, external forecasting remains gated and wider production acceptance remains separate. The five original objectives therefore have differing levels of supporting evidence, with material unfulfilled criteria that must remain visible in the conclusions.

# Chapter 5
## Conclusions and Recommendations

The study developed a decision-support environment that makes recorded commercial performance, forecast uncertainty and planning assumptions inspectable. Its evidence supports historical visibility and reproducible analytical review. It does not establish successful medicine-demand forecasting, optimized real procurement or reduced expiry losses. The conclusions below answer the original objectives using the results and limits reported in Chapter 4.

### 5.1 Conclusions

#### 5.1.1 Regional Performance and Seasonal Analysis

O1 is partly supported by reconciled financial reporting, comparable-period controls and the checked company-month STL series. The recorded 2025 increase is a financial observation with source-provenance limitations; the cause was not established. Missing earlier observations constrain annual comparisons.

The original regional and decomposition commitments are broader than the demonstrated company-month analysis. Verified territory attribution and the promised series/frequency must be completed or addressed through an explicit academic scope decision. Extending context to 2017–2025 does not itself amend the original 2021–2025 objective.

#### 5.1.2 Product and Area Prioritization

O2 is partly supported by source-label contribution, observed ABC and mapped-area commercial sensitivity. These outputs organize historical evidence for management review. They cannot establish clinical priority or inventory urgency without compatible product and operational meaning.

The distinction between 4,561 complete master labels and 4,491 eligible export groups shows why population definitions matter. Category acceptance does not approve SKU units or account identity. No accepted held-out XGBoost ABC result closes the classification commitment. Deterministic observed class and learned classification remain different tasks.

#### 5.1.3 Forecasting and External Signals

O3 remains unfulfilled at its original territory medicine-demand target. The implemented company-PHP research provides useful supporting evidence about forecast reliability and failure. The selected reference retains material errors, and the later development winner's audit deterioration shows why development gains cannot be treated as dependable future improvement.

The findings are specific to the recorded target, recipes and historical origins. They do not prove that every method family is unsuitable, that an outlying sales month is wrong, or that a future model cannot improve. Historical availability vintages, overlapping folds, the inspected audit, sparse lead support and absent accepted 2026 actuals limit generalization.

The proposal's MAPE targets, the later WAPE research goal and actual business tolerances have different meanings. No evidence establishes that the original targets or later goal were achieved. Disease/weather increment, XGBoost urgency and supported operational forecast intervals remain unestablished.

#### 5.1.4 Inventory Planning and Loss Reduction

O4 has partial scenario-method support but no demonstrated operational outcome. The entered-input workflow and retained feasibility checks establish a bounded planning tool. They do not establish global cost optimality, actual EOQ/ROP policy performance or expiry wastage at or below 5%.

Inventory balances, on-order quantities, commitments, packs, supplier lead times, costs and lot expiry are needed to evaluate real replenishment. Their absence prevents a defensible conclusion about stockout prevention, turnover improvement, savings or reduced expired stock. The project must retain these as unmeasured outcomes.

#### 5.1.5 Governed Dashboard Delivery

O5 is partly supported by five analytical module areas, authenticated gateway access, source-aware reporting, exports and stored predictive research controls. The retained local tests show concrete integration beyond the presence of screens.

The original complete workflow also promises ingestion validation, official typhoon alerts and collaborative recommendations. A disabled direct-upload endpoint, incomplete external and identity gates, broader release findings and missing formal acceptance prevent complete objective closure. Candidate inspection is a delivered capability; operational publication and procurement authority remain separate.

#### 5.1.6 Overall Research Contribution and Limitations

MedShield's defensible contribution is a traceable environment for understanding recorded sales, reviewing model errors and exploring explicit planning assumptions. It helps expose where a proposed decision lacks sufficient evidence. This supports the decision-making process while leaving the intended inventory benefit for later measurement.

The study relies on supplied sales files, including adjusted-source allocations, without original receipts for independent event verification. Monthly activity does not prove complete reporting. Mixed product units, unresolved account/geographic meaning, unavailable operational feeds and unapproved external joins restrict the original demand-planning scope.

The research therefore should not be summarized as complete achievement of all objectives. Chapters 1–3 and the implemented results require explicit reconciliation of scope, architecture, methods and acceptance criteria. The project team prepares that comparison; the adviser/panel determines academic amendments, while the client decision owner separately determines business acceptance.

### 5.2 Recommendations

Recommendations follow the supported findings. They prioritize evidence and safe use before stronger operational claims and do not authorize procurement from current research or scenarios.

#### 5.2.1 For Strategic Planning

MedShield should maintain a governed reporting and evidence baseline. The baseline should identify source files, checksum, transformation policy, reporting period, mapping version and publication state. Changes to source allocations or category mappings should preserve prior versions and show which downstream tables, charts and manuscript claims require revalidation.

The project team should reconcile each original objective with the demonstrated scope. The comparison should state what exists, what remains technically feasible with available evidence and which proposed changes need academic acceptance. It should preserve the original wording and decision history rather than silently replacing quantity demand with company revenue or operational optimization with scenarios.

A controlled product and account reference should distinguish medicine identity, strength, formulation, pack, unit, buyer, channel and geography. The large unclassified revenue share and unresolved quantity meaning make these priorities more consequential than simply adding model complexity. Approval of a broad reporting category should not be reused as approval of clinical grouping or unit conversion.

Operational inventory evaluation should begin with owned data contracts for stock, on-order quantities, commitments, lot expiry, supplier lead times, order/holding costs and service policy. The expiry-wastage target needs an agreed numerator, denominator, baseline and outcome period. A future evaluation should distinguish simulated performance from observed before-and-after outcomes and account for other operational changes.

Forecast governance should register the target, intended decision, source availability, issue date, cutoff, supported calendar leads, error consequences and review criteria before examining confirmation actuals. Later untouched accepted observations are needed for stronger confirmation. The original research artifacts and true October generation dates should be preserved.

#### 5.2.2 For Competitive Advantage

The current system's potential advantage is the ability to inspect definitions, provenance, errors and assumptions within one governed workflow. Management can compare evidence and identify unsupported claims before acting. This potential is grounded in delivered traceability; no comparative study establishes superiority over another firm, manual practice or competing software.

To evaluate an actual advantage, the company should define measurable outcomes such as time required to reconcile reports, time to identify a data issue, completeness of a reviewed decision record or error in an accepted planning target. A baseline and repeated comparable user tasks would be needed. User satisfaction, productivity gains and financial returns should be reported only after appropriate observation.

Further model or recommendation features should be added when they answer a defined decision and improve against a suitable baseline on the same population. A complex model should not be selected solely because it appears more advanced. Official warning and collaborative-matching claims require their own source, label, coverage and evaluation evidence.

#### 5.2.3 For Tactical Decisions

Analysts should first inspect the selected period, source identity, coverage and candidate status before interpreting a chart or export. They should distinguish missing months from zero, use matched periods for growth and use the matching supported revenue population for gross-margin rates.

Commercial review can start with high-contribution source labels and unusual monthly movements. The review should check original/adjusted provenance, product identity and account/geographic attribution. High value or low observed activity is a reason for investigation, not an automatic instruction to buy more, stop purchasing or classify a product as clinically nonessential.

Users reviewing forecasts should examine peso error, percentage error, bias, supported leads and the actual issue time together. They should retain the original reference and failed recipes, treat the audit as inspected evidence and avoid interpreting the proposed research goal as an achieved reliability level. Unsupported intervals or absent accepted actuals should remain unavailable.

Planners should enter scenarios only with reviewed units and constraints, preserve the assumption set and inspect feasible and infeasible results. Before operational use, the entered values should be replaced or verified against controlled inventory and supplier evidence. A scenario result alone should not be used as a procurement authorization or claimed inventory saving.

Engineers and reviewers should resolve the remaining applicable security, clean-bootstrap, recovery and deployment findings, then retain same-release workflow evidence. The 15 October validator repair should be recognized at its actual scope rather than reopening a superseded defect or claiming every release issue is closed.

The writing team should integrate these results with the latest post-defense manuscript, retain a claim-to-evidence ledger, reconcile chapter numbering and citations, and obtain actual client and academic review. Any later source, model or runtime change should trigger review of its affected figures, tables and conclusions.

### Project Evidence References

[E1] Latest post-defense Chapters 1–3 manuscript, supplied by the project team on 16 October 2026. Repository copy: [CapstonePaper_1.pdf](../../references/CapstonePaper_1.pdf). Objectives on PDF pages 11–12; methodology and evaluation on pages 92–121.

[E2] MedShield project records. Historical descriptive findings and financial/product exports, 9 October 2026. [Study findings](../../outputs/descriptive_activation_20261009/full_history_2017_2025/STUDY_FINDINGS.md) and [financial summary](../../outputs/descriptive_activation_20261009/full_history_2017_2025/study_financial_summary.csv).

[E3] MedShield project records. Source preparation, quality and decomposition evidence. [Dataset-matched source profile, databricks_export section](../../outputs/databricks_analytical_review_20261007/source_profile.json), [Current State](../CURRENT_STATE.md), [retained descriptive validator](../../outputs/descriptive_validation/2026-10-10T04-43-47-407Z/evidence.json) and [business definitions](../BUSINESS_DEFINITIONS.md).

[E4] MedShield project records. Original expanded company-revenue forecast comparison, 9 October 2026. [Research delivery](../../outputs/predictive_completion_20261009/README.md) and its linked complete experiment.

[E5] MedShield project records. Bounded six-recipe error-reduction experiment, 10 October 2026. [Complete results](../../outputs/predictive_error_optimization_20261010/RESULTS.md).

[E6] MedShield project records. Research scope and findings, updated 15 October 2026. [Client brief](../PREDICTIVE_CLIENT_DECISION_BRIEF.md), [findings supplement](MedShield_Predictive_Findings_Update_20261015.md), [objective/evidence register](../OBJECTIVE_EVIDENCE_REGISTER.md) and [annual projection packet](../../outputs/predictive_annual_release_20261010/README.md).

[E7] MedShield project records. Authenticated descriptive and stored predictive research integration, 15 October 2026. [Implementation and verification packet](../../outputs/analytics_system_completion_20261015/README.md).

[E8] MedShield project records. Bounded planning scenario verification, 7 October 2026. [Planning QA](../../outputs/business_analytics_review_20261007/planning_final_qa.md).

[E9] MedShield project records. Broader system QA, 10 October 2026. [QA report](../../outputs/system_qa_20261010/QA_REPORT.md). Later scoped repairs are identified separately in E7.

[E10] MedShield project contracts. [Architecture](../ARCHITECTURE.md), [API](../API.md), [business definitions](../BUSINESS_DEFINITIONS.md), [database](../DATABASE.md) and [security](../SECURITY.md), with dated scope interpreted through Current State.

[E11] Project team. Supplied Chapters 4–5 draft, received 16 October 2026. [Preserved source PDF](../../references/chapters/GROUP%209_MedShield_CP2_Chapter%204_5.pdf). Captured interface observations are attributed to their selected scope rather than treated as fresh runtime measurements.

[E12] MedShield project records. Medicine forecasting pilot readiness, 16 October 2026. [Source-bound assessment and verification](../../outputs/predictive_pilot_readiness_20261016/README.md). Bounded archived-source inspection; no quantity-model training or new warehouse certification.
