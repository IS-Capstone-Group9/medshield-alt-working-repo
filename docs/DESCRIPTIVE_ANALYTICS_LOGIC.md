# Descriptive Analytics Logic

## Purpose

Descriptive analytics is the first analytics layer for MedShield. It answers what happened in the historical sales data before the group moves to predictive forecasting or prescriptive scenario planning.

This layer must be finished first because predictive and prescriptive outputs depend on the same cleaned sales grain, KPI definitions, product mappings, area mappings, and completeness rules.

## Business Questions

| Question | Descriptive output | Decision supported |
|---|---|---|
| How did recorded sales and gross profit move over time? | Monthly and yearly trends, with coverage | Identify periods for financial review. |
| Which product names contribute most sales? | Source-label ABC/Pareto ranking | Prioritize catalog review and commercial attention. |
| Which territories or customer groups drive sales? | Area, territory, and area-type summaries | Focus management review by geography or customer type. |
| Which calendar months have higher recorded sales? | Observed monthly averages and company-revenue STL | Describe historical sales patterns with sample counts and scope. |
| How did current periods compare with prior year? | Year-over-year growth | Explain growth, decline, and volatility. |
| How much of the analysis depends on estimated records? | Contract-allocation and estimated-date counts | Keep limitations visible in Chapter 4 and dashboard labels. |

## Required Inputs

| Input | Current path | Rule |
|---|---|---|
| Published Gold fact and bridge views | `workspace.medshield_gold.sales_restart_fact_candidate`, exposed through the gateway | Bind every reported value to the validated fact Delta version, dataset, policy and mapping hashes. Use metric-specific eligibility; do not read local processed files as dashboard inputs. |
| Accepted reporting-category decisions | [Product catalog](PRODUCT_CATALOG.md) and the product-master hash in the release | Medicine, medical supply, medical equipment, non-medical and Unclassified are reporting dispositions. An accepted Unclassified disposition preserves unresolved identity; it does not approve a SKU or sales unit. |
| Published area mapping and client reference | [Mapped client reference](MAPPED_CLIENT_REFERENCE.md) and release area hash | Separate territory, customer type, business line and unmapped areas. Use only reviewed matches as mapping evidence; defaults and ambiguous names must not create transaction geography or ownership. |
| Metric meanings | [Business definitions](BUSINESS_DEFINITIONS.md) | Net CP is net sales revenue; Total TP is acquisition cost; workbook `net_income` represents supported gross margin amount. Margin numerator and denominator use the same eligible records. |
| Current evidence and operating sequence | [Current state](CURRENT_STATE.md), [Databricks guide](../databricks/medshield_project/README.md), [API contract](API.md) | Keep observed, adjusted-source, gap-estimated and unavailable evidence distinct. Candidate calculations and release acceptance are separate. |

The current project reporting scope is **January 1, 2017 through December 31, 2025**, as confirmed by the user on 9 October 2026. Use this scope for the dashboard's Capstone preset and current Chapter 4 packet. Earlier 2021–2025 findings are a historical subset and must retain that label; they are not the full-project totals. This scope confirmation does not record adviser/panel or business release approval. Company PHP sales, source product names and source quantity fields must not be described as verified medicine/SKU demand. Category acceptance does not establish normalized packs, source units, clinical priority or disease attribution.

Fact 20 contains 108 calendar months in this scope, with 98 months having sales observations. The ten months without observations are May–August and October 2017, January–February 2018, and October–December 2019. Preserve them as unknown rather than zero and disclose unequal coverage in annual comparisons. The published company-revenue STL uses the separate contiguous January 2020–December 2025 series of 72 months; it does not decompose all nine study years.

## Descriptive Methods

| Method | Logic | Output |
|---|---|---|
| Monthly trend | Aggregate eligible financial records by calendar month. Preserve signed net sales, separate gross-profit coverage, unknown months and adjusted-source provenance. Source quantities retain their recorded units and are not normalized demand. | Gold monthly contract; Overview and Sales Diagnostics |
| Yearly summary | Aggregate the same eligible records by calendar year; disclose observed-month counts and incomplete comparisons. | Gold yearly contract; Overview |
| Area summary | Group by the published area classification; preserve unallocated geography and disclose its financial effect. | Area Prioritization and gateway area response |
| Buyer-type summary | Group using the published derived ownership rules, retaining unknown ownership separately from geography. | Area Prioritization; mapping status remains visible |
| Product ABC/Pareto | Runtime ranks eligible positive sales; returns remain separate. A includes the label crossing 80%; B includes subsequent labels through the one crossing 95%; C is the remainder. Zero-positive-sales labels have ABC class Unclassified, which is separate from reporting category Unclassified. | Dashboard and product CSV with `positive_sales_crossing_inclusive_v2_candidate`; legacy offline CSVs are not publication evidence. |
| Product focus cohort | Rank observed positive-revenue products inside the selected period and let the user retain the top 5%, 10%, or 20% by product count (rounded up). Gap-fill estimates do not determine cohort membership. The performance table and cohort-versus-remainder donut use the complete selected cohort; charts show at most the ten highest-ranked products for readability. The cohort is recalculated whenever the historical period or percentage changes. This is descriptive prioritization, not a purchase recommendation. | Product Prioritization dashboard |
| Calendar-month sales averages | Mean observed year-month sales by calendar month, with observation counts. Missing months and gap estimates are excluded; partial periods and unequal coverage remain disclosed. | Overview supporting chart and exact-value detail |
| Company-revenue STL | Decompose contiguous observed monthly PHP revenue into trend, seasonal and residual components. Notebook 06 splits at gaps without imputing observations. Its separate full-history scope is displayed explicitly. | Published STL candidate, Sales Diagnostics and STL component CSV |
| YoY growth | Compare matched observed calendar periods, with exact custom boundaries and positive prior-sales denominator for percentage growth. | Sales Diagnostics and matched-growth detail |
| Estimation audit | Retain adjusted-source/allocation, estimated-date and gap-estimate provenance. Reconciled annual finance does not verify the allocated item mix. | Gold audit contracts and dashboard evidence details |

## Dashboard Period and Grain Rules

### Chart integrity corrections — 29 September 2026

- Overview adds an observed monthly sales calendar (one common absolute-value color scale; negative, zero and unavailable cells remain distinct) and a net-sales/gross-profit scatterplot at the selected display grain. These answer when observed sales were concentrated and whether the largest sales periods also yielded the largest absolute gross profits. Estimates and missing profit are excluded from scatter points; coverage differences and partial periods remain disclosed. Calendar detail retains monthly totals even at yearly display grain; custom daily selections sum only their selected observed dates. Neither visual establishes seasonality or causality.
- The executive presentation keeps the sales trend and full-width calendar visible, with the scatterplot in an expandable “Explore sales and profit” card. Short scope/evidence labels and partial-period cautions remain visible; longer coverage and method notes are expandable. Empty selections show messages instead of empty scatter axes or a calendar of missing cells. Trend height is 280–380px; scatter height is 320px on desktop and 260px on small screens. Monthly calendar overflow stays inside its card.

- Yearly Y/Y overlays and growth use the same matched observed months, with exact dated records for custom boundary months. The KPI retains the full selected observed population; the comparison subtitle explains this difference.
- Revenue and gross profit share one peso axis. Axis bounds include all displayed observations, prior-year values and gap estimates. Prior-year estimates have explicit labels and triangle markers.
- Observed and estimated values now occupy one continuous series per measure in Overview and Sales Diagnostics. Segments touching an estimate are dashed; estimated points use triangles and tooltips identify their evidence. Estimate transitions do not introduce missing points. Truly unavailable values remain null. Observed KPIs and YoY calculations continue to exclude estimates.
- Daily prior-year dates clamp leap days to the valid February date. If two displayed days map to the same prior day, the second comparison is unavailable, so the summary never counts that prior day twice.
- Gross margin is unavailable for a nonpositive eligible revenue denominator, consistent with the API.
- Regional net totals retain zero and negative area totals. Only recognized mapped regional groups enter the rollup; excluded unmapped net sales are disclosed. Revenue bars sort by revenue; the separate table retains commercial-score ranking. Concentration shares are unavailable when group net totals are negative or the denominator is nonpositive.
- Product bars display positive sales and negative returns on the same scale. ABC counts include Unclassified and disclose each class's positive-sales share across the full selected population. The follow-up implementation uses the crossing-inclusive rule: classify by cumulative share before each label. The largest positive seller is A, including a single-label population. API and export identify `positive_sales_crossing_inclusive_v2_candidate`; this does not activate a production publication.
- Product Pareto uses a fixed 0–100% scale and states how many labels reach 80% of positive sales. Cohort, top-ten display and full-population scopes are distinguished.
- The initial view is All Time at yearly grain, containing observed annual totals. Optional trailing periods remain anchored to the current Philippine calendar and retain explicitly labeled estimates. Straight line segments replace smoothing in the overview; endpoint summaries disclose observed coverage.
- Quantity trend is primary; the heatmap is expandable exact-value detail. Both use the same selected measure, including within-year index. Red indicates negative quantities, blue positive quantities, white recorded zero and gray missing evidence.
- Revenue/coverage scatter, regional concentration and STL residual plots are expandable supporting views. They remain available without duplicating the primary storyline.
- STL plots insert nulls for missing months and independently fitted segment boundaries; plot gaps never become exported observations. A prominent full-history scope label, within-segment trend summary, signed seasonal contribution and largest absolute residual explain the three charts without implying causes or forecasts.

Evidence: `frontend/e2e/descriptive-chart-integrity.spec.ts`. This validation uses synthetic regression fixtures, not a new warehouse reconciliation. The original audit and remaining presentation recommendations are in `outputs/chart_story_audit_20260929/REVIEW.md`.

Overview, Sales Diagnostics, Product Prioritization, and Area Prioritization use one shared historical-period filter:

| Filter | Display grain | Calendar rule |
|---|---|---|
| Capstone · 2017–2025 | Monthly under Automatic; Yearly selectable | January 1, 2017 through December 31, 2025, with the selected period retained across the four descriptive pages. Missing observations remain unknown. |
| Last 30 Days | Daily | Current Philippine calendar day and the preceding 29 days. Uses dated transactions; missing days are estimated from the same calendar dates in up to three prior years. Monthly totals are never divided into synthetic daily values. |
| Last 3 Months | Monthly | Current Philippine calendar month and the preceding two months. |
| Last 6 Months | Monthly | Current Philippine calendar month and the preceding five months. |
| Last 12 Months | Monthly | Current Philippine calendar month and the preceding eleven months. |
| Custom Date Range | Daily up to 31 days; monthly above 31 days | Calendar start and end dates from January 1, 2017 through the current Philippine date. Exact dated transactions are used; longer selections are summarized into monthly buckets to control chart noise. |

Trailing periods are descriptive counterparts to the forward-looking 3-, 6-, and 12-month forecast horizons. Missing daily and monthly observations are filled with a recency-weighted same-calendar-period estimate using up to three prior years (60%, 30%, and 10%, renormalized when fewer years exist). Every filled value remains labeled as an estimate, is never treated as an observed zero, and is replaced when an uploaded actual arrives.

Product Prioritization recalculates its selected observed top-5%, top-10%, or top-20% cohort whenever the cohort percentage, a period preset, or either Custom Date Range calendar boundary changes. Presets anchor to the current calendar date and month backwards (PHT), while Custom Date Range allows arbitrary historical date selection.

Overview and Sales Diagnostics expose Period View and Y/Y Compare. The comparison aligns every displayed day or month to the same calendar period one year earlier; Custom Date Range shifts the selected start and end dates back by one calendar year, with leap-day dates clamped to the last valid February date. Product Prioritization intentionally remains period-only.

## Validate the warehouse release

Use the gateway's read-only validators with configured server-side Databricks credentials. The 9 October 2026 validated candidate is fact 20; consult [Current state](CURRENT_STATE.md) before choosing a later version. Run from the repository root:

```powershell
Push-Location backend
$env:DATABRICKS_DESCRIPTIVE_FACT_VERSION = '20'
node --dns-result-order=ipv4first --import tsx scripts/validate-descriptive.ts
node --dns-result-order=ipv4first --import tsx scripts/publication-readiness.ts
Pop-Location
```

`validate-descriptive.ts` reconciles monthly/yearly net sales and same-population margin, verifies missing-month semantics, and checks STL inputs, reconstruction and release identity. It writes a JSON receipt and checksum under `outputs/descriptive_validation/`. The readiness collector checks the persisted publication and dependencies and writes under `outputs/publication_readiness/`. These are audit artifacts, never dashboard data sources. A process-local version pin does not change the saved backend configuration or prove authenticated browser/API/export acceptance; follow [Testing](TESTING.md) for those checks.

The legacy `services/analytics_service/jobs/run_descriptive.py` reads local prepared files. The [9 October QA assessment](../outputs/system_qa_20261009/QA_REPORT.md) found calculation differences from the current runtime contract, including ABC thresholds, margin population and missing-month treatment. Retain its historical outputs for audit; do not generate Chapter 4 or publication results with that job until it has been repaired and independently reconciled. Re-running it does not finish the Databricks descriptive release.

## Acceptance Criteria

Descriptive analytics is ready for Chapter 4 when:

1. The same fact version, dataset, policy and mapping identities reconcile across warehouse, gateway, authenticated charts, tables and exports for the selected study period.
2. Revenue uses Net CP (`net_cost`); acquisition cost uses Total TP (`total_trade_price`). Signed financial adjustments remain visible.
3. Gross margin amount is not labeled company net profit. Weighted gross margin uses eligible gross profit and net sales from the same records; unsupported amounts and nonpositive-denominator rates remain unavailable.
4. Product contribution uses source-label financial reporting with accepted categories. Unclassified labels remain visible. Verified sellable identity, compatible unit quantities and medical-demand approval are separate gates.
5. Adjusted 2025 allocation and other estimates retain provenance. Missing observations remain unknown; an annual-total reconciliation does not validate actual item mix or prove reporting completeness.
6. Geographic and derived buyer summaries disclose mapping basis, coverage and unallocated amounts. Commercial ranking does not establish disease risk or clinical priority.
7. The current 2017–2025 study filter is explicit, including its 98 observed months and ten missing months. Historical 2021–2025 subset results and the separate 2020–2025 company STL scope are labeled with their actual periods. Academic scope acceptance and any promised frequency or territory decomposition require their own evidence; the user's project-scope confirmation does not grant those approvals.
8. Each retained figure/table answers a business question, states its population and limitations, and links to a matching receipt/export. Test evidence includes unavailable, genuine zero, negative adjustment, partial period and empty-selection behavior.
9. The client reviews the usable version-bound descriptive packet and the permitted reporting scope is recorded in [Publication acceptance](DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md). Technical passes do not themselves record business or academic acceptance.

## Chapter 4 Wording

Use this simple explanation:

> The descriptive layer summarized eligible MedShield sales from January 2017 through December 2025 using a version-bound Databricks Gold candidate. Of 108 calendar months, 98 had sales observations; the ten remaining months stayed unknown rather than being treated as zero. Net CP represented net sales revenue, while supported workbook net income represented gross margin amount before operating expenses. Product contribution was reported by source product name and accepted reporting category, including Unclassified; it did not establish verified SKU demand. Matched observed periods supported year-over-year comparison. Company monthly PHP revenue was decomposed using a separately labeled 2020–2025 STL series of 72 contiguous months. Adjusted-source allocation, missing observations, financial eligibility and mapping coverage remained visible.

## What Comes Next

The dashboard's additional descriptive views are:

- **Calendar-month sales averages:** average observed year-month net sales, with sample counts. Missing periods and gap estimates are excluded; zero and negative observations remain. Partial months and unequal coverage can affect comparisons. This is a description of sales activity, not proof of recurring seasonality or disease effects.
- **Observed months by year:** observed versus unavailable months within the selected elapsed period. Counts describe activity evidence, not reporting completeness. Both Overview summaries use a monthly source independent of chart display grain and YoY matching.
- **Month-to-month sales change:** current minus preceding calendar-month net sales. Both full months must be observed within the selection. Missing months, gap estimates, current incomplete months and partial custom boundary months are excluded. Percentage change requires a positive preceding-month total.
- **ABC sales versus label shares:** two independent 100% denominators over the full selected population before the displayed cohort. Positive-sales class shares require a reconciled basis; source-label shares include zero-sales and return-only unclassified labels. This remains a candidate ABC policy.
- **Buyer ownership sales:** signed net sales split between actual and gap-estimated evidence using the existing area filters. Unknown ownership is separate from unknown geography. This view includes selected unmapped geography; regional charts continue to exclude it and disclose the excluded amount.

Charts retain exact values in accessible tables/details and full labels in tooltips.
Headlines show concise scope and units; methods remain expandable. Chart heights,
axis label density and horizontal product bars adapt to the available width.
STL retains its separate full-history scope, and planning charts describe scenarios.

### Default chart presentation

The four descriptive Analytics pages lead with the primary comparison and keep supporting evidence expandable:

- **Overview:** four compact metrics, the selected period, the sales trend and calendar. The trend initially shows sales; a selector exposes gross profit or both measures on the same peso scale. A short takeaway compares the first and last recorded points, and a reading cue explains gaps. Monthly averages, annual observation coverage and sales-versus-profit scatter are supporting views. All Time growth displays `—` with the explanation that a bounded period is required.
- **Sales Diagnostics:** period and Y/Y trend comparisons initially show sales. A measure selector exposes gross profit or both measures; daily views remain sales-only. Growth displays either percentage or peso change on one visible scale, with exact matched-period values in expandable detail. A reading cue explains above/below zero and unavailable comparisons. Gross margin is expandable. Movement replaces empty axes with an explanation when no observed adjacent full-month pairs exist. Quantity index describes multiples of the selected year's monthly average; its takeaway uses index values when index is selected. STL headings explain underlying direction, repeating monthly contribution and unusual periods while retaining its full-history scope.
- **Product Prioritization:** the sales ranking and full-population ABC share comparison are primary. Display names explain A as largest contributors, B as next contributors, C as remaining contributors and Unclassified as not grouped. Direct values and an exact share key reduce dependence on hovering. Positive amounts and negative adjustments remain distinct; negative adjustments do not establish physical stock returns. ABC counts and Pareto are expandable. The six-column table supports source-label search and 20-row pages; expandable row evidence retains signed adjustments, observed months and catalog status. Search and paging affect the table only, and CSV export retains the complete selected cohort and original ABC codes.
- **Area Prioritization:** three summaries lead with sales linked to an area, revenue mapping coverage and the highest-sales region. Regional and buyer type bars show direct totals, factual takeaways and their respective denominators. The five-column score table retains actual/estimate totals, coverage and composition in expandable row and footer evidence. The existing commercial score is displayed as a historical sales score, with current sales-size/period-coverage weights visible. Its score leader is labeled separately from the highest-sales region. The client directory sits under Mapping details.

These display choices preserve the existing filters, metric definitions, signed values, candidate-policy labels, source evidence and publication limits. Browser fixtures validate the controls, scope retention, exports and responsive chart areas; they do not establish live warehouse reconciliation.

Each chart presents a business question, a short result, the plot and a reading cue where needed. Exact values and technical methods remain available in details. This clarity pass is limited to descriptive analytics. Readability checks do not establish usability acceptance by management or procurement users.

Overview's matched-growth card compares the sum of paired observed monthly net sales with the same calendar periods one year earlier. A bounded period is required; all-history annual comparisons are not summed into one growth rate. The open current month and estimates are excluded, a percentage requires positive prior sales, and exact custom boundaries use dated records where available. Matched counts and both totals accompany the result. Gross profit is withheld if any selected observed sales period lacks profit. Month coverage counts observations, including zero and negative sales, and does not attest reporting completeness.

Areas revenue coverage is mapped net sales divided by all selected net sales under the displayed filters and actual/estimate mode. Missing amounts, nonpositive totals or negative components make the percentage unavailable; signed known amounts remain visible. The separate source-row coverage excludes gap estimates and requires valid row counts. Region-filtered coverage excludes other and unmapped geography, with a cue to clear Region for the full selected scope. Buyer ownership remains a separate proposed classification.

To finish this descriptive reporting scope, collect the matched study-period screenshots, exact tables and exports after authenticated acceptance, then record the client's version-bound release decision. Use the [Chapter 4 checklist](../outputs/descriptive_activation_20261009/CHAPTER4_CHECKLIST.md) to assemble that packet. Category acceptance is already distinct from unresolved SKU/unit evidence; do not relabel accepted reporting categories as proposals or silently remove Unclassified rows.

Predictive model acceptance, disease/weather territory joins and operational replenishment remain separate work. Keep planning outputs as scenarios until verified inventory, supplier, lead-time, expiry, cost, budget and capacity inputs exist. Completing company/source-label descriptive reporting does not demonstrate every original capstone objective; follow the [Objective/evidence register](OBJECTIVE_EVIDENCE_REGISTER.md) for the remaining scope.
