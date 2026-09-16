# Missing sales identity investigation

Source: all nine original MedShield CSVs (2017–2025) and the available
`Sales Report.xlsx` (2021–2025 sheets). No source records were edited. The
row-level review CSV and JSON summary in this directory are reproducible with
`python databricks/sales_restart/audit_missing_identity.py`.

## Findings

| Missing product evidence | Records | Treatment |
|---|---:|---|
| Source `#REF!` values | 3,793 | Request the original 2017 workbook and its referenced sheets |
| Blank product with nonzero numeric activity | 691 | Request delivery receipt/invoice line detail; do not infer a medicine |
| Blank product without nonzero measures | 49 | Review possible placeholder/continuation lines; absence of measures is not proof of a sale |
| No sufficient identity | 9 | Possible summaries/incomplete rows; retain for review |
| **Total missing product identities** | **4,542** | **No product identities inferred** |

The original workbook corroborates absent product cells on 735 rows anchored
by the same row number, delivery receipt and area. There are no merged cells in
the available five sheets. This does not prove the business reason for the blanks.
The workbook has no 2017 sheet, so the broken 2017 references cannot be resolved
from this workbook.

472 identity-review records have a same-file/receipt/date/area lead containing
a product label. These are leads, not assignments: a receipt can contain several
products, contract parents and incomplete lines. Neighboring labels are included
in the review CSV but are never filled down.

## Demonstrated parser repair

CSV 2025 row 2411 has `45,913.00` in its delivery-date column. Workbook cell
`2025!C2411` contains numeric Excel serial 45913, equivalent to 2025-09-13.
The parser now accepts integer serial dates with valid thousands formatting and
zero decimal places, preserves the raw value, and flags the conversion.
Fractional/ambiguous numbers are not silently truncated.

The recovered date exposes a possible duplicate. Consequently the current
candidate count remains **37,178**. Identity-review records become **4,544**;
possible-duplicate review becomes **123**. The other two identity cases with
product names are an ambiguous `1'17` date (2017) and a 2024 product-only line
without date or quantitative measures. Neither was invented into a transaction.

## Next steps

1. Replace the Databricks Silver notebook with the current `02_sales_silver.py`
   and run all cells. Expect version `sales_restart_silver_v3_serial_dates`.
2. Replace Gold with current `03_sales_gold.py` and run all cells after Silver.
   Expect policy `sales_restart_gold_v3_placeholders`.
3. Keep business-sales outputs labeled partial/candidate. Product scope approval
   and the system integration remain separate gates; a run PASS is not business
   approval or a completed dashboard connection.
4. Give the source owner the review CSV; obtain original 2017 references and
   receipt/invoice line detail for blank products before correcting identities.

Cloud execution has not been performed in this investigation. Local test
results and source reconciliation do not verify Databricks Spark/Delta writes.
