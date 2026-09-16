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
| Business definitions | `docs/BUSINESS_DEFINITIONS.md` | Net sales revenue is `net_cost`; total acquisition cost is `total_trade_price`; gross margin/profit is workbook `net_income`. |
| Sales data layer rules | `databricks/docs/SALES_DATA_LAYER_FLOW.md` | Keep raw, semi-raw estimated, and cleaned data labels distinct. |

## Descriptive Methods

| Method | Logic | Output |
|---|---|---|
| Monthly trend | Group clean rows by `YYYY-MM`; sum quantity, net sales (`net_cost`), acquisition cost (`total_trade_price`), `net_income`, discount, and gross sales (`total_cost`). | `descriptive_monthly_trends.csv` |
| Yearly summary | Group clean rows by calendar year; sum the same additive measures. | `descriptive_yearly_summary.csv` |
| Area summary | Group by `area_type` and standardized area. | `descriptive_area_summary.csv` |
| Area-type summary | Group by territory/customer/business-line/unmapped. | `descriptive_area_type_summary.csv` |
| Product ABC/Pareto | Rank products by net sales revenue (`net_cost`); A covers cumulative 0-80%, B covers >80-95%, C covers >95-100%. | `descriptive_product_abc_pareto.csv` |
| Product focus cohort | Rank observed positive-revenue products inside the selected period and retain the top 5% by product count (rounded up). Gap-fill estimates do not determine cohort membership. Dashboard charts and the performance table show at most the five highest-ranked products from that cohort; the cohort-versus-remainder donut uses revenue from the complete top-5% cohort. This is descriptive prioritization, not a purchase recommendation. | Product Prioritization dashboard |
| Territory ABC/Pareto | Rank mapped territories by net sales revenue (`net_cost`) using the same ABC thresholds. | `descriptive_territory_abc_pareto.csv` |
| Seasonality index | Monthly average demand divided by average demand across all months. | `descriptive_seasonality_overall.csv`, `descriptive_seasonality_territory.csv` |
| YoY growth | Compare each month against the same month in the prior year. | `descriptive_yoy_overall.csv`, `descriptive_yoy_territory.csv` |
| Estimation audit | Count rows from backward allocation and estimated dates. | `descriptive_contract_allocation_summary.csv`, `descriptive_run_summary.json` |

## Dashboard Period and Grain Rules

Overview, Sales Diagnostics, Product Prioritization, and Area Prioritization use one shared historical-period filter:

| Filter | Display grain | Calendar rule |
|---|---|---|
| Last 30 Days | Daily | Current Philippine calendar day and the preceding 29 days. Uses dated transactions; missing days are estimated from the same calendar dates in up to three prior years. Monthly totals are never divided into synthetic daily values. |
| Last 3 Months | Monthly | Current Philippine calendar month and the preceding two months. |
| Last 6 Months | Monthly | Current Philippine calendar month and the preceding five months. |
| Last 12 Months | Monthly | Current Philippine calendar month and the preceding eleven months. |
| Custom Date Range | Daily up to 31 days; monthly above 31 days | Calendar start and end dates from January 1, 2017 through the current Philippine date. Exact dated transactions are used; longer selections are summarized into monthly buckets to control chart noise. |

Trailing periods are descriptive counterparts to the forward-looking 3-, 6-, and 12-month forecast horizons. Missing daily and monthly observations are filled with a recency-weighted same-calendar-period estimate using up to three prior years (60%, 30%, and 10%, renormalized when fewer years exist). Every filled value remains labeled as an estimate, is never treated as an observed zero, and is replaced when an uploaded actual arrives.

Product Prioritization recalculates its observed top-5% cohort whenever a preset changes or either Custom Date Range calendar boundary changes. Presets anchor to the current calendar date and month backwards (PHT), while Custom Date Range allows arbitrary historical date selection.

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

After this layer is reviewed:

1. Approve product and area mappings.
2. Use descriptive outputs as the baseline for Chapter 4 screenshots.
3. Move to predictive analytics only after the descriptive totals and limitations are accepted.
4. Keep prescriptive analytics as scenario-based until inventory, lead time, ordering cost, holding cost, budget, and capacity data exist.
