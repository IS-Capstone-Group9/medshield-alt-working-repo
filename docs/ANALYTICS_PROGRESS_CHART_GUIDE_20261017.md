# MedShield analytics progress and chart reading guide

Dated companion to the 16-slide progress presentation. Evidence reviewed through 17 October 2026, Asia/Manila. This is a presentation snapshot; canonical definitions and later dated evidence take precedence.

Companion to the progress presentation
Evidence reviewed through 17 October 2026
For the project team and presentation audience

### Purpose and current conclusion

MedShield now has a working local recorded-sales analytics workflow backed by Databricks Gold, stored company-revenue research in the dashboard, and clearer source and chart evidence. The latest work reconciles all deployment exports and prepares independent product approval handling. Historical medicine units, complete reporting and operational model acceptance still require evidence.

Use the deck to explain progress. Use this guide during questions about a chart, calculation or claim. It explains the data behind each view, the filters that change its population and the conclusions the available evidence supports. Source references S1–S13 appear on the final page and in the deck’s presenter notes.

### Recent progress at a glance

| Date | Evidence-backed progress |
| --- | --- |
| 15 October | Stored research UI, API and CSV integration, with source-bound numerical checks. |
| 16 October | Forecast YoY beside stored PHP projections, with prior-year baselines and explicit unavailable reasons. |
| 17 October | Current-Gold offline adapter, five-dimension approval bridge, full source audit and shared product queue. |
| 17 October | Latest graph repairs clarify partial years, missing mapped regions, historical Qty and unavailable forecast plots. |

These are separate milestones. An offline adapter is not a deployed warehouse view. A passing technical check is not business, model, academic or procurement approval. The later [40-checkpoint delivery assessment](ANALYTICS_COMPLETION_ASSESSMENT_20261017.md) defines a proposed progress denominator: 23/40, or 57.5%. That reporting score does not measure effort remaining, forecast accuracy or original-study acceptance. [S1, S2, S6–S10]

## 1 How data reaches a chart

| Layer | What it does | What the reader should expect |
| --- | --- | --- |
| Bronze | Preserves source evidence and row/file identity. | Original bytes and file hashes remain traceable. |
| Silver | Parses and assesses records with explicit quality and disposition rules. | Invalid or uncertain evidence stays distinguishable. |
| Gold | Publishes candidate facts, dimensions, marts and SQL bridge views. | Financial eligibility, source provenance and release identity accompany measures. |
| Gateway | Queries Databricks and calculates bounded responses. | Authenticated filters and source metadata govern the response. |
| Dashboard | Displays selected scopes in charts, tables and CSV. | The same population and units should agree across representations. |

### Runtime boundaries

Next.js calls the Express/TypeScript gateway. Databricks Unity Catalog is the analytical system of record. Supabase supplies authentication, application roles and audit persistence. Python jobs evaluate analytics offline. A dashboard request does not start a Python service or train a model. Required-source failure must show an unavailable state and clear affected stale results. [S3]

### Identity to retain with a figure

Current evidence uses Gold fact Delta version 20 and policy sales_restart_gold_v7_independent_catalog. The dataset ID is b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4. Retain the selected period, grain, filters, evidence mode, extraction date and matching receipt/export. Stored research also needs experiment, model, stage, origin and true calendar lead. [S2, S7, S8]

### Source availability

Sales files enter controlled Databricks ingestion. Direct sales upload returns 409 DATABRICKS_INGESTION_REQUIRED. The latest Data Source page explains that path and exposes source identity. A healthy gateway alone does not prove every Gold view is reachable. [S3, S10]

## 2 Source scope and annual chart values

Slide 6 sums financially eligible signed Net CP by Date Delivered calendar year from the audit’s monthly observation calendar. It does not group by the year in a filename. This matters because cross-year delivery records change the 2018 and 2019 calendar totals. Exact arithmetic uses decimal amounts. [S2]

| Delivery year | Eligible net sales | Observed months | Source interpretation |
| --- | --- | --- | --- |
| 2017 | ₱10,211,167.35 | 7/12 | Original, low trust |
| 2018 | ₱51,619,691.27 | 10/12 | Original export |
| 2019 | ₱62,542,304.49 | 9/12 | Original export |
| 2020 | ₱63,593,274.63 | 12/12 | Adjusted allocation |
| 2021 | ₱77,860,206.26 | 12/12 | Original export |
| 2022 | ₱63,234,990.04 | 12/12 | Original export |
| 2023 | ₱62,228,966.85 | 12/12 | Original export |
| 2024 | ₱50,259,319.88 | 12/12 | Adjusted allocation |
| 2025 | ₱185,396,821.04 | 12/12 | Adjusted allocation |

Total eligible recorded net sales is ₱626,946,741.81 over 36,848 eligible records. The retained population contains 37,728 records. The 59,039 physical source lines also include headings, blanks and reviewed/excluded material, so they are not transactions. [S2]

### How to read the annual bars

Bar height is a sales level in PHP millions. Amber identifies adjusted-allocation years 2020, 2024 and 2025. Their financial inclusion does not establish original SKU mix or medicine demand. The 2025 level is higher, but a chart of revenue cannot establish a change in physical units or a disease-related cause. Do not compare partial early-year observation coverage as if every year had complete reporting.

## 3 Evidence labels and coverage

| Label | Correct interpretation |
| --- | --- |
| Observed record | The retained source contains a record for the selected period. Presence alone does not establish completeness or independent delivery authenticity. |
| Adjusted source | Source allocation has documented adjustments. Financial eligibility and original physical-demand evidence remain separate. |
| Derived | A calculation or controlled mapping applied to source evidence, such as YoY or geographic classification. |
| Gap estimate | An explicitly labeled estimate for an unobserved period. It cannot become an observed zero or verified historical sale. |
| Proxy | A provider-derived representation, such as NASA POWER weather, with its own provenance. |
| Forecast | A candidate model output for a target month with an origin, lead and actual generation time. |
| Scenario | A result based on entered planning assumptions. It is not evidence that those inputs occurred. |

### The coverage chart on slide 7

The numerator counts calendar months with at least one retained record. The denominator is 108 months in January 2017–December 2025. The result is 98 observed months and ten unknown months. It measures record presence, not the percentage of all real transactions captured.

Unknown months are May, June, July, August and October 2017; January and February 2018; and October, November and December 2019. Keep their values null. Neither a blank period nor a dash proves zero sales. [S2]

### Chart gaps and estimates

When enabled, the dashboard uses a recency-weighted same-calendar-period estimate based on up to three prior years, with weights 60%, 30% and 10% renormalized for available years. Dashed segments and triangle markers identify gap estimates. Exact evidence mode matters: the overview screenshot on slide 9 uses observed sales only. [S4]

## 4 Core measures and Overview charts

| Measure | Reading rule |
| --- | --- |
| Net sales | Eligible Net CP, exposed as net_cost. Keep signed financial adjustments. This is revenue, not cash collection or medicine demand. |
| Gross margin amount | Supported source net_income reconciled against net sales less TOTAL TP. It is before operating expenses. |
| Weighted gross margin rate | Eligible gross margin divided by revenue from the same margin-eligible records, multiplied by 100. Do not average row percentages or divide by a different revenue population. |
| Negative adjustment | A signed financial stratum. The legacy returns_value label does not prove a physical return or returned stock. |
| Unavailable | Missing or unsupported input, ineligible denominator or source error. Preserve its reason instead of displaying zero. |

### Sales and gross profit trend

Horizontal position represents time at the displayed grain. Vertical position represents pesos. A measure selector shows sales, gross profit or both on the same scale. Read the selected period and evidence mode first. Endpoint difference does not describe the path between points or explain why sales changed. Gross profit is withheld when a selected observed sales period lacks profit support. [S4, S5]

### Matched growth card

The card compares eligible paired observed periods with the same calendar periods a year earlier. Open current months and estimates are excluded. A percentage needs positive prior sales. All Time shows no growth rate because a bounded comparison is required. Exact custom date boundaries can leave partial months. [S4]

### Supporting Overview charts

Calendar-month averages take the mean of observed year-month sales totals. Compare the sample counts because different months may have unequal coverage. Observed zero and negative sales stay in the mean; unavailable periods and gap estimates do not. The sales-versus-profit scatter compares peso levels across periods. A relationship between plotted values does not establish causation, full profitability or disease seasonality. [S4]

## 5 Sales Diagnostics and decomposition

### Period and year over year comparisons

The period view summarizes selected recorded sales. Y/Y Compare aligns the same calendar periods in base and target years, with explicit paired coverage. Daily charts remain sales-only. Read the visible growth unit: percent change and peso difference answer different questions. For an eligible positive prior amount, percent change is the difference divided by the prior amount, multiplied by 100. [S4]

### Month to month sales movement

Each value subtracts the preceding calendar month from the current month. Both must be full observed months within the selected scope. Missing periods, estimates, current incomplete months and partial custom boundary months are excluded. The percentage requires a positive preceding-month value. Empty results can therefore be correct even when the page contains sales records. [S4]

### Quantity index

The index expresses a monthly recorded quantity relative to that selected year’s monthly average. A value of 1 means the average, and 2 means twice the average. Index values are multiples rather than percent growth. Historical units and product identity still constrain interpretation. It cannot establish comparable medicine quantities across mixed or unresolved presentations. [S4, S5]

### STL charts

STL separates the company monthly PHP series into trend, seasonal contribution and remainder. These components retain the source unit: pesos. A seasonal value describes an additive repeating monthly contribution, not a growth percentage. The remainder is unexplained variation and does not prove an error or external cause. The labeled company decomposition uses the separate January 2020–December 2025 scope of 72 contiguous months. [S4]

Read the full-history scope in the STL heading even when the rest of the dashboard has a narrower filter. An additive reconstruction should agree with the original series. Historical decomposition does not establish predictive skill, causal disease effects or a territory/SKU model.

### Change investigation

Drill-down contributions localize a signed change by month, source product label, raw area or buyer group. Contributions must reconcile to the selected total. They show where the change sits. Root-cause explanations such as stockouts, contracts, disease or pricing need separate evidence. [S4, S5]

## 6 Product Prioritization and review status

### Sales ranking and Pareto

Horizontal product bars rank source labels by eligible signed net sales. Read positive amounts and negative adjustments separately. The Pareto view shows cumulative positive-sales contribution over the selected population. Full labels and exact values remain in details. A source label is not automatically a verified sellable SKU. [S4, S5]

### ABC classes and their denominators

The candidate policy classifies a positive-sales label using cumulative share before that label: below 80% is A, 80% to below 95% is B, and 95% onward is C. The label crossing a boundary stays in the class where it started. Nonpositive contribution stays Unclassified. ABC expresses financial contribution and does not assign clinical importance. [S5]

The ABC comparison uses two separate denominators. Sales shares use the reconciled positive-sales basis. Label shares use the full selected label population, including zero-sales and return-only labels. Both percentages can sum to 100% while describing different populations. Apply classification before the top-5%, top-10% or top-20% display cohort. [S4]

### Filters and exports

Changing the cohort or date scope recalculates the selected observed cohort. Table search and 20-row paging affect the table display only. CSV keeps the complete selected cohort and original ABC codes. Compare exports using the same period, category, buyer scope and source identity, rather than comparing a visible page with a full download. [S4, S10]

### Independent approvals on slide 10

The offline current-Gold bridge carries 4,561 review keys: 4,491 with eligible financial rows and 70 review-only keys. Category dispositions are approved for reporting, including the accepted Unclassified bucket. Identity, historical unit and forecast suitability remain needs_review for all keys. Item-kind decisions remain 3,331 proposed and 1,230 needs_review. Category approval cannot approve these other dimensions. [S6]

The bridge preserves controlled-master proposals separately from source-effective values and rejects conflicting release identities or duplicate joins. It is verified offline software. Its creation neither deploys a new Gold contract nor supplies missing historical evidence.

## 7 Area charts and external observations

### Regional and buyer type bars

Regional bars show sales linked to mapped delivery geography within the selected filters. The dashboard discloses excluded or unallocated amounts. Buyer type and buyer ownership use separate classifications. A record can have unknown geography but a known ownership label, or the reverse. Derived mapping is not a source-recorded fact. [S3–S5]

### Coverage and the historical sales score

Revenue mapping coverage divides mapped net sales by all selected net sales under the displayed filters and actual/estimate mode. Missing amounts, a nonpositive total or negative components can make that percentage unavailable. A region filter can exclude other and unmapped geography, so clear it when reviewing full-scope coverage. Source-row coverage is a different measure and excludes gap estimates. [S4]

The latest graph correction labels regional charts as mapped areas only and buyer charts as all selected sales including unassigned areas. A region without mapped records shows No mapped records and Share unavailable. A mapped region with observed zero still shows zero. [S13]

The historical sales score uses displayed sales-size and period-coverage weights. Its leader may differ from the highest-sales region because the score combines dimensions. This is a commercial ranking under a candidate policy, not disease risk, clinical need, inventory urgency or an approved allocation priority. [S4]

### Disease and weather evidence

DOH and PAGASA represent historical source evidence. NASA POWER is a separate provider weather proxy. Keep provider, period, geography, unit, completeness and joins visible. Coincident movement in weather, disease reports and sales does not prove a causal relationship or future forecast benefit. [S3, S5]

Open-Meteo ERA5, ERA5-Seamless and ECMWF IFS archive contracts are prepared candidates. Code or a prepared schema does not establish a successful controlled refresh or a deployed feed. Follow the latest deployment/readback receipt before presenting availability. External regression stays blocked until geographic/time mappings, eligible inputs and issue-time feature availability satisfy their gates. [S3, S11]

### How to describe the map or rank

Say “Recorded sales linked to the selected mapped area” and identify unmapped coverage. A stronger claim such as “highest disease demand” requires reviewed medicine units, disease linkage and validation that the current charts do not establish.

## 8 Predictive research and historical errors

Slide 11 compares selected examples from company monthly eligible recorded net-sales research in PHP. The original experiment contains 21 configurations. Six later error-reduction recipes form a separate exploratory experiment and do not replace the original last-value research reference. The dashboard exposes stored original-grid evidence; later offline trials do not silently enter serving. [S7, S9]

| Recipe | Development WAPE | 2025 audit WAPE | Audit MAE |
| --- | --- | --- | --- |
| Last-value reference | 83.199360% | 37.763644% | ₱5,834,383.00 |
| Median 12 months | 62.483157% | 81.927078% | ₱12,657,516.49 |
| Bounded calibration | 78.260840% | 37.363553% | ₱5,772,569.95 |

### Evaluation populations

Development has five origins, 60 origin–target cases for leads 1–12 and 24 distinct target months in January 2023–December 2024. The audit uses the December 2024 cutoff and 12 January–December 2025 targets. The audit had already been inspected before the later recipes were designed. It is a retrospective audit, not a newly untouched final test. Nested lead groups 1–3, 1–6 and 1–12 overlap and must not be added as independent samples. [S7]

### How the metrics read

MAE is mean absolute error in pesos, so lower values indicate a smaller average peso miss. RMSE is the square root of mean squared error and gives larger misses more weight. WAPE divides total absolute error by total absolute actual sales, multiplied by 100. It is an error ratio. Subtracting WAPE from 100 does not produce forecast accuracy. [S7]

Signed error is prediction minus actual. Positive normalized signed bias means net overforecasting. A small net bias can hide offsetting large misses. Metrics with no matched cases are unavailable; zero absolute-actual totals make percentage measures unavailable. [S7]

### Supported conclusion

Median 12 improves development error but deteriorates in the audit. Calibration improves audit WAPE by only 0.400091 percentage points and remains unselected. None reaches the proposed 10% WAPE research goal. The results support research discussion while operational publication remains open. These are inherited results, with no new model fit for this presentation.

## 9 Forecast projections and planning scenarios

### Forecast YoY on slide 12

The derived percentage compares a stored prediction with its eligible prior-year recorded baseline. January 2026 uses ₱23,493,882.59 against January 2025 sales of ₱16,374,092.18, giving 43.48%. The prior-year denominator must be positive and meet frozen-source eligibility and origin-availability checks. Zero, negative, missing or unsupported baselines leave the percentage unavailable with a reason. [S8]

Read the prediction, baseline month, baseline amount and provenance together. A large YoY percentage can reflect a small baseline. It does not establish observed 2026 growth or measured model accuracy. Actual 2026 sales and projection errors remain unavailable in this retained evidence. [S8]

### Origin target and actual generation time

The retained stored series has a December 2025 origin and January–December 2026 targets at true leads 1–12. It was actually generated on 9 October 2026 at 22:07 Asia/Manila. A January target label does not establish that the prediction existed before January. For a current October 2026 planning window, true leads start at 10; a twelve-month display extends beyond a release that only supports lead 12. Unsupported targets stay unavailable. [S5, S8]

### Display windows and uncertainty

The number of months displayed differs from lead distance from the accepted origin. Model selection in a research detail control changes the evidence displayed, not model activation. Keep interval availability reasons visible. Missing actuals prevent a measured-error claim, and unsupported intervals cannot become a confidence band. [S8, S9]

Latest plots show numerical evidence through its last numerical period and omit an entirely unavailable future series from the legend. Historical-only captions explain this when needed. Full requested months, unavailable reasons, true leads and historical errors remain in tables and CSV. Interior gaps, zero and negative predictions remain distinct. [S13]

### Prescriptive planning

Planning accepts entered demand, stock and other assumptions for the selected shortlist. Its bounded greedy allocation supplies a reviewable scenario. It does not prove a globally optimal solution or prescribe a purchase. A not_solved result records the computation limit, rather than a completed allocation. Operational use still needs verified inventory, supplier, lead-time, expiry, cost, budget and capacity inputs with accepted data and model contracts. [S5, S11]

## 10 Product pilot and remaining milestones

### The reporting example on slide 13

The user approved grouping TRIVASC 35MG MR and TRIVASC 35MG for a QUEZON original-source 2021–2023 reporting review. The combined view has 36 months with records and 193 retained rows. Positive recorded Qty totals 2,163, with a signed adjustment of −60 and a net recorded Qty of 2,103. June 2023 preserves both labels’ contributions. [S12]

This is reporting-group approval. Original keys remain distinct. Historical physical equivalence, units and complete reporting remain unverified. A dash in a constituent-label row means no record for that label; it does not prove zero sales. No box/tablet conversion, physical demand forecast or live alias deployment follows from grouping. [S12]

### What is complete and what comes next

| Milestone | Current status | Next owner and evidence |
| --- | --- | --- |
| Deployment-source verification | Reconciled to pinned fact20 | Analyst retains source hashes and consistent scope. |
| Current-Gold adapter and approval bridge | Bounded offline software complete | Data/backend owner prepares governed integration. |
| Physical product input readiness | Historical evidence still pending | Source/catalog owner records scoped identity, units and coverage. |
| Financial research | Supported with stated limitations | Analyst freezes eligible series, evaluation and baselines. |
| Model and operational use | Separate acceptance gates open | Model/project owners obtain matching receipts and actual decisions. |

### Verification interpretation

Retained source evidence records 273 reconciliations and 89 tests. The bridge records 43 tests, including prior adapter/policy regressions. Dashboard repairs record 171 backend tests and 24 scoped browser scenarios plus one separate Product export scenario. Research integration records 883 live numeric checks across 126 model/stage/lead groups. These counts overlap across packets and must not be added into one completion score. [S2, S6, S9, S10]

The later graph-clarity packet records 29 passing browser scenarios, with 18 captured chart series preserved and 186 source hashes unchanged through verification. It corrects partial-year endpoint wording, missing-region states, unavailable forecast tails, historical Qty wording and repeated product values. This is inherited scoped evidence, not a new usability study or model improvement. [S13]

This delivery checked artifact values, source links, layouts and package structure. It did not rerun model training, cloud ingestion, source-owner reviews or business acceptance. Source records and runtime configuration were not changed.

## 11 Presentation sources and discussion cues

These are repository sources reviewed for the 17 October 2026 snapshot. Later scoped evidence can supersede older status text. The presentation’s speaker notes link the specific sources for each slide. This guide explains the current contracts and does not replace them.

**S1 Current status and ordered next steps**

- [docs/CURRENT_STATE.md](../docs/CURRENT_STATE.md)

- [docs/ANALYTICAL_COMPLETION_STEPS.md](../docs/ANALYTICAL_COMPLETION_STEPS.md)

**S2 Nine-source audit and dated monthly values**

- [outputs/source_verification_20261017/README.md](../outputs/source_verification_20261017/README.md)

- [outputs/source_verification_20261017/local-audit.json](../outputs/source_verification_20261017/local-audit.json)

**S3 Runtime architecture and data boundaries**

- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)

- [docs/DATABASE.md](../docs/DATABASE.md)

**S4 Descriptive chart methods and filters**

- [docs/DESCRIPTIVE_ANALYTICS_LOGIC.md](../docs/DESCRIPTIVE_ANALYTICS_LOGIC.md)

**S5 Financial definitions and approved terminology**

- [docs/BUSINESS_DEFINITIONS.md](../docs/BUSINESS_DEFINITIONS.md)

**S6 Independent product decision bridge**

- [outputs/product_approval_bridge_20261017/README.md](../outputs/product_approval_bridge_20261017/README.md)

**S7 Predictive findings and error comparison**

- [docs/chapters/MedShield_Predictive_Findings_Update_20261015.md](../docs/chapters/MedShield_Predictive_Findings_Update_20261015.md)

**S8 Stored projection YoY and issue timing**

- [outputs/predictive_yoy_20261016/README.md](../outputs/predictive_yoy_20261016/README.md)

**S9 Stored research integration and numeric checks**

- [outputs/analytics_system_completion_20261015/README.md](../outputs/analytics_system_completion_20261015/README.md)

**S10 Latest interface and export QA**

- [outputs/qa_remediation_20261017/README.md](../outputs/qa_remediation_20261017/README.md)

**S11 API, external and scenario contracts**

- [docs/API.md](../docs/API.md)

**S12 Bounded grouped-product reporting review**

- [outputs/pilot_evidence_step3_20261017/GROUPED_MONTHLY_REVIEW.md](../outputs/pilot_evidence_step3_20261017/GROUPED_MONTHLY_REVIEW.md)

**S13 Latest graph meaning and output corrections**

- [outputs/graph_clarity_20261017/README.md](../outputs/graph_clarity_20261017/README.md)

### Slide navigation

Slides 1–5 introduce progress and the Databricks flow. Slides 6–7 show reconciled sales and observation coverage. Slides 8–10 explain chart meaning, current UI and product decisions. Slides 11–12 explain predictive error and forecast YoY. Slides 13–16 cover the pilot, external/scenario boundaries, verification and next owners.
