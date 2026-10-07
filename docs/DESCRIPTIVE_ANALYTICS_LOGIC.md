# Descriptive Analytics Logic

## Purpose

Descriptive analytics is the first analytics layer for MedShield. It answers what happened in the historical sales data before the group moves to predictive forecasting or prescriptive scenario planning.

This layer must be finished first because predictive and prescriptive outputs depend on the same cleaned sales grain, KPI definitions, product mappings, area mappings, and completeness rules.

## Business Questions

| Question | Descriptive output | Decision supported |
|---|---|---|
| How did demand and revenue move over time? | Monthly and yearly trends | Identify high and low demand periods. |
| Which products drive most revenue? | Product ABC/Pareto ranking | Prioritize SKU review and inventory planning focus. |
| Which territories or customer groups drive sales? | Area, territory, and area-type summaries | Focus management review by geography or customer type. |
| Which months usually have higher demand? | Seasonality index | Prepare planning assumptions before forecasting. |
| How did current periods compare with prior year? | Year-over-year growth | Explain growth, decline, and volatility. |
| How much of the analysis depends on estimated records? | Contract-allocation and estimated-date counts | Keep limitations visible in Chapter 4 and dashboard labels. |

## Required Inputs

| Input | Current path | Rule |
|---|---|---|
| Cleaned sales with contract allocation | `data/medshield/processed/sales_transactions_area_allocated.json.gz` | Use this for product-level analysis so `#` contract-name rows are not treated as products. |
| Area classification mapping | `datasources/templates/area_classification_mapping.csv` | Use this to separate territory, customer type, business line, and unmapped areas. |
| Client reference crosswalk | `docs/MAPPED_CLIENT_REFERENCE.md` | Use only exact, reviewed matches as mapping evidence. System-generated defaults and ambiguous client names must not create transaction geography or ownership. |
| Business definitions | `docs/BUSINESS_DEFINITIONS.md` | Net sales revenue is `net_cost`; total acquisition cost is `total_trade_price`; gross margin/profit is workbook `net_income`. |
| Sales data layer rules | `databricks/docs/SALES_DATA_LAYER_FLOW.md` | Keep raw, semi-raw estimated, and cleaned data labels distinct. |

## Descriptive Methods

| Method | Logic | Output |
|---|---|---|
| Monthly trend | Group clean rows by `YYYY-MM`; sum quantity, net sales (`net_cost`), acquisition cost (`total_trade_price`), `net_income`, discount, and gross sales (`total_cost`). | `descriptive_monthly_trends.csv` |
| Yearly summary | Group clean rows by calendar year; sum the same additive measures. | `descriptive_yearly_summary.csv` |
| Area summary | Group by `area_type` and standardized area. | `descriptive_area_summary.csv` |
| Area-type summary | Group by territory/customer/business-line/unmapped. | `descriptive_area_type_summary.csv` |
| Product ABC/Pareto | Runtime ranks eligible positive sales; returns remain separate. A includes the label crossing 80%; B includes subsequent labels through the one crossing 95%; C is the remainder. Zero-positive-sales labels are Unclassified. | Dashboard and product export; historical offline CSVs need regeneration before comparison with the revised policy. |
| Product focus cohort | Rank observed positive-revenue products inside the selected period and let the user retain the top 5%, 10%, or 20% by product count (rounded up). Gap-fill estimates do not determine cohort membership. The performance table and cohort-versus-remainder donut use the complete selected cohort; charts show at most the ten highest-ranked products for readability. The cohort is recalculated whenever the historical period or percentage changes. This is descriptive prioritization, not a purchase recommendation. | Product Prioritization dashboard |
| Territory ABC/Pareto | Rank mapped territories by net sales revenue (`net_cost`) using the same ABC thresholds. | `descriptive_territory_abc_pareto.csv` |
| Seasonality index | Monthly average demand divided by average demand across all months. | `descriptive_seasonality_overall.csv`, `descriptive_seasonality_territory.csv` |
| YoY growth | Compare each month against the same month in the prior year. | `descriptive_yoy_overall.csv`, `descriptive_yoy_territory.csv` |
| Estimation audit | Count rows from backward allocation and estimated dates. | `descriptive_contract_allocation_summary.csv`, `descriptive_run_summary.json` |

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
| Last 30 Days | Daily | Current Philippine calendar day and the preceding 29 days. Uses dated transactions; missing days are estimated from the same calendar dates in up to three prior years. Monthly totals are never divided into synthetic daily values. |
| Last 3 Months | Monthly | Current Philippine calendar month and the preceding two months. |
| Last 6 Months | Monthly | Current Philippine calendar month and the preceding five months. |
| Last 12 Months | Monthly | Current Philippine calendar month and the preceding eleven months. |
| Custom Date Range | Daily up to 31 days; monthly above 31 days | Calendar start and end dates from January 1, 2017 through the current Philippine date. Exact dated transactions are used; longer selections are summarized into monthly buckets to control chart noise. |

Trailing periods are descriptive counterparts to the forward-looking 3-, 6-, and 12-month forecast horizons. Missing daily and monthly observations are filled with a recency-weighted same-calendar-period estimate using up to three prior years (60%, 30%, and 10%, renormalized when fewer years exist). Every filled value remains labeled as an estimate, is never treated as an observed zero, and is replaced when an uploaded actual arrives.

Product Prioritization recalculates its selected observed top-5%, top-10%, or top-20% cohort whenever the cohort percentage, a period preset, or either Custom Date Range calendar boundary changes. Presets anchor to the current calendar date and month backwards (PHT), while Custom Date Range allows arbitrary historical date selection.

Overview and Sales Diagnostics expose Period View and Y/Y Compare. The comparison aligns every displayed day or month to the same calendar period one year earlier; Custom Date Range shifts the selected start and end dates back by one calendar year, with leap-day dates clamped to the last valid February date. Product Prioritization intentionally remains period-only.

## Command

Run:

```powershell
python services\analytics_service\jobs\run_descriptive.py
```

Default output folder:

```text
outputs/descriptive_analytics_YYYYMMDD/
```

The command can also target a specific folder:

```powershell
python services\analytics_service\jobs\run_descriptive.py --output-dir outputs\descriptive_analytics_20260624
```

## Acceptance Criteria

Descriptive analytics is ready for Chapter 4 when:

1. Outputs reconcile to cleaned sales totals.
2. Revenue uses Net CP (`net_cost`); Total TP (`total_trade_price`) is acquisition cost.
3. Gross margin/profit uses `net_income` and is not labeled company net profit.
4. Product-level analysis uses the area-allocated cleaned sales dataset.
5. `#` contract-name breakdown and estimated-date rows are counted as estimated.
6. Territory summaries use approved or proposed area mapping.
7. 2025 outputs are marked carefully because the 2025 completeness issue is not fully resolved.
8. The dashboard and paper present descriptive outputs as historical evidence, not forecasts.

## Chapter 4 Wording

Use this simple explanation:

> The descriptive analytics layer summarized historical MedShield sales to show what happened before forecasting or scenario planning. The system grouped accepted cleaned sales records by month, year, product, and area. Net sales revenue was computed from Net CP (`net_cost`), while workbook net income was treated as gross margin/profit. Product and territory priority were described using ABC/Pareto classification, and seasonal patterns were described using a monthly demand index. Estimated contract-allocation rows were retained with flags so that totals remained traceable and limitations remained visible.

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

Overview's matched-growth card compares the sum of paired observed monthly net sales with the same calendar periods one year earlier. A bounded period is required; all-history annual comparisons are not summed into one growth rate. The open current month and estimates are excluded, a percentage requires positive prior sales, and exact custom boundaries use dated records where available. Matched counts and both totals accompany the result. Gross profit is withheld if any selected observed sales period lacks profit. Month coverage counts observations, including zero and negative sales, and does not attest reporting completeness.

Areas revenue coverage is mapped net sales divided by all selected net sales under the displayed filters and actual/estimate mode. Missing amounts, nonpositive totals or negative components make the percentage unavailable; signed known amounts remain visible. The separate source-row coverage excludes gap estimates and requires valid row counts. Region-filtered coverage excludes other and unmapped geography, with a cue to clear Region for the full selected scope. Buyer ownership remains a separate proposed classification.

After this layer is reviewed:

1. Approve product and area mappings.
2. Use descriptive outputs as the baseline for Chapter 4 screenshots.
3. Move to predictive analytics only after the descriptive totals and limitations are accepted.
4. Keep prescriptive analytics as scenario-based until inventory, lead time, ordering cost, holding cost, budget, and capacity data exist.
