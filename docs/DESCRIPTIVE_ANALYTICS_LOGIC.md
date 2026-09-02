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
| Product ABC/Pareto | Rank products by `total_trade_price`; A covers cumulative 0-80%, B covers >80-95%, C covers >95-100%. | `descriptive_product_abc_pareto.csv` |
| Territory ABC/Pareto | Rank mapped territories by `total_trade_price` using the same ABC thresholds. | `descriptive_territory_abc_pareto.csv` |
| Seasonality index | Monthly average demand divided by average demand across all months. | `descriptive_seasonality_overall.csv`, `descriptive_seasonality_territory.csv` |
| YoY growth | Compare each month against the same month in the prior year. | `descriptive_yoy_overall.csv`, `descriptive_yoy_territory.csv` |
| Estimation audit | Count rows from backward allocation and estimated dates. | `descriptive_contract_allocation_summary.csv`, `descriptive_run_summary.json` |

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

> The descriptive analytics layer summarized historical MedShield sales to show what happened before forecasting or scenario planning. The system grouped accepted cleaned sales records by month, year, product, and area. Revenue was computed from total trade price, while workbook net income was treated as gross margin/profit. Product and territory priority were described using ABC/Pareto classification, and seasonal patterns were described using a monthly demand index. Estimated contract-allocation rows were retained with flags so that totals remained traceable and limitations remained visible.

## What Comes Next

After this layer is reviewed:

1. Approve product and area mappings.
2. Use descriptive outputs as the baseline for Chapter 4 screenshots.
3. Move to predictive analytics only after the descriptive totals and limitations are accepted.
4. Keep prescriptive analytics as scenario-based until inventory, lead time, ordering cost, holding cost, budget, and capacity data exist.
