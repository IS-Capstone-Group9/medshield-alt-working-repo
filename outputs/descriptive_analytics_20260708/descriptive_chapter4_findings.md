# Descriptive Analytics Findings

## Scope

This descriptive layer explains what happened in the historical MedShield sales data. It does not forecast future demand and does not create procurement recommendations.

## Key Findings

- Clean rows analyzed: 21,058.
- Historical period: 2021-01-11 to 2025-12-31.
- Total demand units: 968,109.10.
- Sales revenue from `total_trade_price`: PHP 203,363,302.28.
- Workbook gross margin/profit from `net_income`: PHP 134,155,954.29.
- Top product by revenue: MONOWEL 1G IV with PHP 5,791,588.87.
- Top area by revenue: Quezon with PHP 6,339,579.62.
- Estimated contract-allocation rows included: 1,730.
- Estimated-date rows included: 0.
- Rows where workbook gross margin/profit exceeds revenue: 13,256.
- Rows with negative workbook gross margin/profit: 1,099.

## Chapter 4 Use

Use these outputs as evidence for historical descriptive analytics: monthly trend, yearly summary, ABC/Pareto, area summary, seasonality index, and YoY growth. Label outputs as draft until business definitions and product/area mappings are formally approved.

## Limitations

- `net_income` is workbook gross margin/profit, not company net profit.
- Margin anomaly counts should be reviewed before making profitability claims.
- Product-level findings depend on the current backward-allocation estimate and still need approved SKU mapping.
- 2025 remains partial according to the data-quality notes, so use 2025 YoY interpretations carefully.
- Output folder: `outputs\descriptive_analytics_20260708`.
