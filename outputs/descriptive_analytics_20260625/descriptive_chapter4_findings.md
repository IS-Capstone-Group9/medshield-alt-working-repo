# Descriptive Analytics Findings

## Scope

This descriptive layer explains what happened in the historical MedShield sales data. It does not forecast future demand and does not create procurement recommendations.

## Key Findings

- Clean rows analyzed: 20,961.
- Historical period: 2021-01-02 to 2025-12-31.
- Total demand units: 1,016,664.41.
- Sales revenue from `total_trade_price`: PHP 220,958,269.80.
- Workbook gross margin/profit from `net_income`: PHP 259,767,098.70.
- Top product by revenue: MONOWEL 1G IV with PHP 5,780,546.00.
- Top area by revenue: Quezon with PHP 7,708,883.18.
- Estimated contract-allocation rows included: 1,725.
- Estimated-date rows included: 3,541.
- Rows where workbook gross margin/profit exceeds revenue: 12,985.
- Rows with negative workbook gross margin/profit: 185.

## Chapter 4 Use

Use these outputs as evidence for historical descriptive analytics: monthly trend, yearly summary, ABC/Pareto, area summary, seasonality index, and YoY growth. Label outputs as draft until business definitions and product/area mappings are formally approved.

## Limitations

- `net_income` is workbook gross margin/profit, not company net profit.
- Margin anomaly counts should be reviewed before making profitability claims.
- Product-level findings depend on the current backward-allocation estimate and still need approved SKU mapping.
- 2025 remains partial according to the data-quality notes, so use 2025 YoY interpretations carefully.
- Output folder: `outputs\descriptive_analytics_20260625`.
