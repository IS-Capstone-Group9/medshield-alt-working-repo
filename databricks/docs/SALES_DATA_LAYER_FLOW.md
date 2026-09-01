# Sales Data Layer Flow

## Purpose

This document defines the sales data layers used for MedShield analysis. It separates raw source evidence, backward-approximated working data, and accepted clean sales data.

## Layer 1 - Raw Sales Data

Location:

- `data/medshield/raw/sales/Sales Report.xlsx`
- `data/medshield/raw/sales/yearly_csv/`
- `outputs/sales_data_layers/raw_sales_report/`

Meaning:

- Direct yearly CSV exports from `Sales Report.xlsx`.
- No product cleanup, date repair, backward allocation, or row exclusion is applied.
- This layer is used as source evidence only.

## Layer 2 - Semi-Raw Backward Approximation

Location:

- `outputs/sales_data_layers/semi_raw_backwards_approx/`

Meaning:

- Starts from the backward allocation output.
- Contract-name rows with `#` are treated as parent contract rows, not product names.
- Where possible, contract parent rows are replaced by estimated child product rows.
- Missing dates are estimated from nearby dated rows in the same source workbook for traceability.
- Rows are not yet fully accepted as clean sales. They include `sales_acceptance_status` and `sales_rejection_reason`.

Use this layer when explaining how raw workbook records became analytical records.

## Layer 3 - Cleaned Sales

Location:

- `outputs/sales_data_layers/cleaned_sales/`
- `data/medshield/processed/sales_transactions_area_allocated.json.gz`

Meaning:

- Accepted analytical sales rows only.
- A row must have product, area, valid `date_delivered`, positive quantity, and positive `total_trade_price`.
- Date-only issues can be accepted when the date is repaired and marked with `date_is_estimated = true`.
- Rows with missing product, missing area, non-positive quantity, or non-positive sales value are excluded and retained in the QA audit.

Important note:

- This layer removes invalid sales rows and prevents `#` contract names from being treated as product names.
- It does not finalize medicine, medical supply, and equipment classification. That classification still depends on the approved product master/SKU mapping.

## QA Evidence

Location:

- `outputs/sales_data_qa_20260623/`

Important files:

- `clean_sales_acceptance_summary.json`
- `excluded_from_clean_sales.csv`
- `source_vs_clean_year_comparison.csv`

## Final Paper Wording

Use this wording:

> The sales data pipeline was organized into three layers. The raw layer preserved the original yearly records from the Sales Report workbook. The semi-raw layer applied backward approximation to contract-name rows marked with `#`, repaired missing delivery dates where defensible, and retained row-level acceptance flags. The cleaned layer retained only accepted sales records with product, area, date, quantity, and sales value required for analysis. Excluded rows were preserved in an audit file for traceability.
