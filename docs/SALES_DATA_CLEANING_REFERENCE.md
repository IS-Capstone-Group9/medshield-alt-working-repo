# MedShield Sales Data — Cleaning Reference

> **Version:** 2026-08-25
> **Analysis Window:** 2017–2025
> **Governed by:** `services/data_pipeline.py` — `clean_sales_rows()`

This document is the authoritative reference for every column in the cleaned MedShield sales dataset. It specifies the source mapping, validation rules, data type, and analytics usage for each field.

---

## Raw Source Files

| File | Years | Row Count (approx.) | Notes |
|---|---|---|---|
| `medshield_data_2017.csv` | 2017 | ~5,700 | Older header format (DR, DATE, AREA, PRODUCT, GROSS SALES, UNIT PRICE, GROSS, DISCOUNT, QTY, TP, TOTAL, NET INCOME) |
| `medshield_data_2018.csv` | 2018 | ~4,300 | Variant headers (DRNumber, DRDate, SalesRep, CP/UNIT, TOTAL CP, NET CP, TP/UNIT, Total TP) |
| `medshield_data_2019.csv` | 2018–2019 | ~10,300 | Contains ~4,857 carry-over rows from Dec 2018 / Mar 2018. Business hash deduplication prevents double-counting. |
| `medshield_data_2020.csv` | 2020 | ~3,900 | Standard format (Area, DR Number, Date Delivered, CP, Total CP, Disc, Net CP, TP/UNIT, TOTAL TP, Net Income) |
| `medshield_data_2021.csv` | 2021 | ~3,400 | Standard + `%` column for margin |
| `medshield_data_2022.csv` | 2022 | ~4,000 | Standard + `%` |
| `medshield_data_2023.csv` | 2023 | ~5,900 | Standard + `%`; 503 rows have blank product name |
| `medshield_data_2024.csv` | 2024 | ~2,900 | Standard + `%`; 108 rows have blank product name |
| `medshield_data_2025.csv` | 2025 | ~4,100 | Standard + `%`; 108 rows have blank product name |

---

## Header Alias Map

The pipeline normalizes inconsistent column names across all source files using `HEADER_ALIASES`.

| Raw Column Name(s) | Canonical Field |
|---|---|
| DR, DRNumber, DeliveryReceiptNumber | `dr_number` |
| DATE, DRDate, DateDelivered, DeliveryDate | `date_delivered` |
| AREA, SalesRep | `area` |
| Product | `product` |
| QTY, Qty, GROSS SALES | `quantity` |
| CP, CP/UNIT, UnitPrice, ContractPrice | `unit_cost` |
| GROSS, Total CP, TotalCP | `total_cost` |
| Disc, Discount | `discount` |
| NET CP, NetCP, TotalCP (alias) | `net_cost` |
| TP, TP/UNIT, TransferPrice | `trade_price_unit` |
| TOTAL, Total TP | `total_trade_price` |
| Net Income | `net_income` |
| `%` | `margin_pct` |

---

## Column Dictionary (All 26 Columns)

### Business / Transaction Fields

| Column | Type | Description |
|---|---|---|
| `area` | `str` | Standardized sales territory or account label. See Area Standardization table below. |
| `area_type` | `str` | Classification: `geographic` (eligible for weather/disease joins), `non_geographic` (channel/account label), or `unmapped` (unrecognized — needs review). |
| `dr_number` | `str \| null` | Delivery receipt number, normalized to `DR-XXXXX` format. Null allowed — not required for acceptance. |
| `date_delivered` | `str (ISO 8601)` | Delivery date in `YYYY-MM-DD` format. Required for acceptance. Must fall within 2017–2025. |
| `year` | `int \| null` | Integer year from `date_delivered`. Always set for accepted rows. |
| `product` | `str (UPPER)` | Product name in uppercase. Required for acceptance. Excel formula errors (`#REF!`, `#N/A`, etc.) are coerced to null. |

### Financial Fields

| Column | Type | Description | Valid Range |
|---|---|---|---|
| `quantity` | `float` | Units sold. Blank → `0.0`. | ≥ 0 (negative → `warning`) |
| `unit_cost` | `float` | Contract price per unit (CP/UNIT). Blank → `0.0`. | ≥ 0 |
| `total_cost` | `float` | Gross cost before discount (`unit_cost × quantity`). Blank → `0.0`. | ≥ 0 |
| `discount` | `float` | Applied rebate or discount amount. Can be negative (credit note). Blank → `0.0`. | Any |
| `net_cost` | `float` | Cost basis after discount (`total_cost - discount`). Blank → `0.0`. | Expected ≥ 0; negative rows flagged as `warning`. |
| `trade_price_unit` | `float` | Selling price per unit to the hospital or customer. Blank → `0.0`. | ≥ 0 |
| `total_trade_price` | `float` | **Primary revenue metric.** Total revenue from transaction (`trade_price_unit × quantity`). Blank → `0.0`. Zero with nonzero quantity → `warning`. | ≥ 0 |
| `net_income` | `float` | Gross profit (`total_trade_price - net_cost`). Can be negative (loss transaction). Blank → `0.0`. | Any |
| `margin_pct` | `float` | Gross margin ratio. Source `%` column or derived as `net_income / net_cost`. Normal range: `0.05` to `0.50`. Outside `[-0.5, 1.5]` → `warning`. | `[-0.5, 1.5]` expected |

### Quality / Lineage Fields

| Column | Type | Description |
|---|---|---|
| `quality_status` | `str` | Row quality verdict: **`valid`** (all checks passed), **`warning`** (accepted with flags), **`rejected`** (missing required field or year out of range). |
| `quality_notes` | `str` | Semicolon-separated list of quality issue descriptions for the row. Empty string for `valid` rows. |
| `duplicate` | `bool` | `True` if the business hash appeared in a prior row within the same merge pass. Duplicates are assigned `quality_status = warning`. |
| `standardization_applied` | `list[str]` | List of transformations applied to the row (e.g., `"dr_number: standardized identifier format"`, `"margin_pct: derived from net income / net cost"`). |
| `input_stage` | `str` | Identifies whether the source was raw (`raw_medshield`, `raw_tabular`) or pre-cleaned (`cleaned`). |

### New Analytical Flags (Added 2026-08-25)

| Column | Type | Description |
|---|---|---|
| `data_source_year` | `int \| null` | Year extracted from the source workbook filename (e.g., `medshield_data_2019.csv` → `2019`). Used for carry-over detection. |
| `in_analysis_range` | `bool` | `True` if `year` is within 2017–2025. Always `True` for accepted rows (rows outside range are rejected). Safety column for downstream filters. |

### ETL Lineage Fields

| Column | Type | Description |
|---|---|---|
| `source_workbook` | `str` | Filename of the uploaded source file (e.g., `medshield_data_2021.csv`). |
| `source_sheet` | `str` | Sheet tab name (XLSX) or derived from the date column (CSV). |
| `source_row_number` | `int` | 1-indexed row number in the source file. |
| `source_hash` | `str (SHA-256)` | Hash of the source file coordinates (workbook + sheet + row + raw values). Unique per raw row. |
| `business_hash` | `str (SHA-256)` | Hash of the 13 canonical field values. Used for cross-file deduplication. |

---

## Area Standardization

The pipeline applies `AREA_STANDARDIZATION` to normalize raw area strings before classification:

| Raw Value | Canonical Value | Area Type |
|---|---|---|
| CAM NORTE, CAMARINES NORTE | Camarines Norte | geographic |
| CAM SUR, CAMARINES SUR | Camarines Sur | geographic |
| METRO MANILA, NCR | Metro Manila | geographic |
| QUEZON PROVINCE, EASTERN QUEZON | Quezon | geographic |
| BATNGAS | Batangas | geographic |
| LAGUMA | Laguna | geographic |
| HOPITAL | Hospital | non_geographic |
| LAGASPI, LEGAZPI | Legaspi | geographic |
| LOWER CAVITE | Cavite | geographic |
| SUPPLLIES | Supplies | non_geographic |
| EASTERN | East | geographic |

### Geographic Territories (weather/disease model eligible)

Batangas, Camarines Norte, Camarines Sur, Cavite, Laguna, Marinduque, Metro Manila, Quezon, Rizal, Albay, Bicol, Legaspi, Mindoro, Lucena, East

### Non-Geographic Labels (sales analytics only)

Government, Admin, Hospital, Supplies, Equipment, Pharma, Personal, Losses

---

## Quality Status Decision Rules

```
REJECT if:  area is null
         OR date_delivered is null or unparseable
         OR product is null
         OR year < 2017 OR year > 2025  ← NEW (Fix 1.1)

WARNING if (and not rejected):
  • delivery year differs from source workbook year  ← NEW (Fix 1.6)
  • zero quantity AND zero total_trade_price          ← NEW (Fix 1.2)
  • zero total_trade_price with nonzero quantity      ← NEW (Fix 1.2)
  • zero quantity with nonzero total_trade_price      ← NEW (Fix 1.2)
  • negative quantity                                 ← NEW (Fix 1.3)
  • negative net_cost                                 ← RECLASSIFIED (Fix 1.3)
  • margin_pct < -0.5 or > 1.5                        ← TIGHTENED (Fix 1.4, was ±2)
  • exact duplicate business hash
  • extreme quantity (> 50,000 units)
  • extreme revenue (> ₱50M)

VALID: all other accepted rows
```

---

## Analytics Usage Guide

| Use Case | Filter |
|---|---|
| **Demand forecasting (model training)** | `quality_status = 'valid'` AND `area_type = 'geographic'` |
| **Revenue reporting** | `quality_status IN ('valid', 'warning')` AND `year BETWEEN 2017 AND 2025` |
| **Weather / disease model join** | `area_type = 'geographic'` only |
| **Channel/government sales analysis** | `area_type = 'non_geographic'` |
| **Full ledger audit** | All rows including `rejected` |
| **Deduplication check** | `duplicate = True` |
| **Carry-over investigation** | `data_source_year != year` |

---

## Known Data Issues

| Issue | Status | Rows Affected |
|---|---|---|
| 2019 CSV contains 2018 carry-over rows | Tagged as `warning` with note; business hash dedup prevents double-counting | ~4,857 |
| 2023–2025 CSVs have blank product names | Rows rejected (`missing product`) | ~719 |
| Null `net_cost` rows (blank → 0.0) | `valid` or `warning` depending on other flags; margin derived from `net_income / net_cost` will be 0.0 | ~6,000+ |
| Non-geographic area labels with `area_type = 'unmapped'` | Logged for review — may need to be added to `NON_GEOGRAPHIC_LABELS` | Varies |
