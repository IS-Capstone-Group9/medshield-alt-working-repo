# Descriptive Analytics Findings

## Scope

This descriptive layer explains what happened in the historical MedShield sales data. It does not forecast future demand and does not create procurement recommendations.

## Key Findings

- Clean rows analyzed: 37,340.
- Historical period: 2017-01-02 to 2025-12-31.
- Total demand units: 1,438,964.92.
- Sales revenue from `total_trade_price`: PHP 273,096,715.70.
- Workbook gross margin/profit from `net_income`: PHP 393,917,128.16.
- Top product by revenue: T SHIRT WITH PRINT with PHP 6,790,203.69.
- Top area by revenue: Quezon with PHP 10,190,450.85.
- Estimated contract-allocation rows included: 1,730.
- Estimated-date rows included: 0.
- Rows where workbook gross margin/profit exceeds revenue: 26,768.
- Rows with negative workbook gross margin/profit: 185.

## Chapter 4 Use

Use these outputs as evidence for historical descriptive analytics: monthly trend, yearly summary, ABC/Pareto, area summary, seasonality index, and YoY growth. Label outputs as draft until business definitions and product/area mappings are formally approved.

## Limitations

- `net_income` is workbook gross margin/profit, not company net profit.
- Margin anomaly counts should be reviewed before making profitability claims.
- Product-level findings depend on the current backward-allocation estimate and still need approved SKU mapping.
- 2025 remains partial according to the data-quality notes, so use 2025 YoY interpretations carefully.
- Output folder: `outputs\descriptive_analytics_20260825`.
