# MedShield CSV Data Cleaning Plan

**Version:** 1.0<br>
**Prepared:** 2026-08-30<br>
**Status:** Pre-implementation specification<br>
**Scope:** Raw MedShield annual sales CSV files for 2017–2025

## 1. Purpose

This document defines the data-cleaning scope, target schema, quality rules, and recommended Supabase workflow for the MedShield sales datasets in `data/medshield/dataset_csv`.

The raw CSV files must remain immutable. Cleaning must produce separate staged, accepted, warning, rejected, and published outputs with enough lineage to trace every record back to its source file and row.

## 2. Executive Decision

1. The intended analysis period is **2017–2025 inclusive**.
2. Dates outside that range must be quarantined until verified against the original business record.
3. The raw files must be parsed and structurally normalized before database loading.
4. The cleaned transaction schema should contain **14 source-faithful business fields**, including the 2017 discount-rate field.
5. The governed master dataset should contain **28 fields**: 14 business fields and 14 quality/lineage fields.
6. Supabase is recommended for staging, SQL validation, constraints, deduplication, quality reporting, and analytics serving. It should not be the only tool used to parse the original messy CSV layouts.
7. Financial metrics must not be published until the Finance/business owner approves the meaning of CP, TP, sales value, cost basis, and gross margin.

## 3. Source Inventory

| Source file | Intended year | Raw header location | Physical schema |
|---|---:|---:|---|
| `medshield_data_2017.csv` | 2017 | Rows 5–6 | 13 positions; two-row header |
| `medshield_data_2018.csv` | 2018 | Row 5 | 12 named columns plus 8 empty trailing columns |
| `medshield_data_2019.csv` | 2019 | Row 5 | 12 named columns plus 1 empty trailing column |
| `medshield_data_2020.csv` | 2020 | Row 6 | 12 named columns |
| `medshield_data_2021.csv` | 2021 | Row 6 | 13 named columns |
| `medshield_data_2022.csv` | 2022 | Row 6 | 13 named columns |
| `medshield_data_2023.csv` | 2023 | Row 6 | 13 named columns |
| `medshield_data_2024.csv` | 2024 | Row 6 | 13 named columns |
| `medshield_data_2025.csv` | 2025 | Row 6 | 13 named columns |

All files are comma-delimited UTF-8 CSVs with a UTF-8 BOM. The principal ingestion risks are structural and semantic rather than file encoding.

## 4. Actual Date Coverage

### 4.1 Intended versus observed years

| Source file | Actual years found | Required disposition |
|---|---|---|
| 2017 | 2000, 2001, 2007, 2015, 2016, 2017, 2018, 2020, 2047 | Quarantine 87 outside-range rows; review 12 rows dated 2018 or 2020; resolve invalid dates |
| 2018 | 2018 | Retain; document that the file covers March–November only |
| 2019 | 2018 and 2019 | Reconcile 4,857 rows dated 2018 against the standalone 2018 source; retain the actual delivery year |
| 2020 | 2020 | Retain after ordinary validation |
| 2021 | 2021 | Retain after ordinary validation |
| 2022 | 2022 | Resolve transaction-like rows with blank dates |
| 2023 | 2023 | Retain after ordinary validation |
| 2024 | 2024 | Resolve the transaction-like row with a blank date |
| 2025 | 2025 | Convert the formatted Excel serial `45,913.00` to `2025-09-13`, then validate |

The complete set of raw date years is:

`2000, 2001, 2007, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2047`

### 4.2 Date-specific issues

- The 2017 source contains 87 dates outside the approved 2017–2025 analysis window:
  - 2000: 5 rows
  - 2001: 2 rows
  - 2007: 5 rows
  - 2015: 2 rows
  - 2016: 72 rows
  - 2047: 1 row
- The 2017 source also contains four rows dated 2018 and eight rows dated 2020.
- Invalid 2017 values include `9/817` and `1'17`.
- The 2019 source contains 4,857 rows dated 2018 and 5,459 rows dated 2019.
- The standalone 2018 data does not contain January, February, or December.
- The 2019-dated portion does not contain October, November, or December.
- Missing months must be documented as coverage limitations. They must not be synthesized or imputed as transactions.

## 5. Standard Transaction Schema

### 5.1 Recommended 14 business fields

| Standard field | Type | Raw aliases or source | Rule |
|---|---|---|---|
| `area` | `text` | `AREA`, `Area`, `SalesRep` | Standardized territory or business-channel label |
| `dr_number` | `text` | `DR`, `DRNumber`, `DR Number` | Preserve leading zeros; normalize format without losing raw value |
| `date_delivered` | `date` | `DATE`, `DRDate`, `Date Delivered` | ISO `YYYY-MM-DD`; required for accepted transactions |
| `product` | `text` | `PRODUCT`, `Product` | Canonical product/SKU description; required for accepted transactions |
| `quantity` | `numeric` | `GROSS SALES`, `QTY`, `Qty` | Reconcile both 2017 quantity positions before selecting the canonical value |
| `contract_price_unit` | `numeric` | `UNIT PRICE`, `CP/UNIT`, `ContractPrice`, `CP` | Source-faithful CP per unit |
| `gross_contract_value` | `numeric` | `GROSS`, `TOTAL CP` | Expected to equal quantity multiplied by contract price per unit |
| `discount_rate` | `numeric` | 2017 `DISCOUNT %` | Optional decimal rate; preserve because 689 source rows contain it |
| `discount_amount` | `numeric` | 2017 `DISCOUNT AMOUNT`, `Discount`, `Disc` | Monetary discount amount |
| `net_contract_value` | `numeric` | `NET CP`, 2019 `TotalCP` | Expected gross contract value after discount |
| `transfer_price_unit` | `numeric` | `TP`, `TP/UNIT`, `TransferPrice` | Source-faithful transfer price per unit |
| `total_transfer_price` | `numeric` | `TOTAL`, `Total TP`, `TOTAL TP` | Expected to equal quantity multiplied by transfer price per unit |
| `gross_margin_amount` | `numeric` | `NET INCOME`, `Net Income` | Transaction gross margin; do not call company net income |
| `gross_margin_pct` | `numeric` | `%` or derived | Gross margin divided by net contract value when denominator is nonzero |

### 5.2 Compatibility with the current application

The current pipeline uses these 13 canonical fields:

`area`, `dr_number`, `date_delivered`, `product`, `quantity`, `unit_cost`, `total_cost`, `discount`, `net_cost`, `trade_price_unit`, `total_trade_price`, `net_income`, `margin_pct`

For compatibility, an API or database view can expose the current field names while the governed base table uses source-faithful names:

| Governed field | Current application field |
|---|---|
| `contract_price_unit` | `unit_cost` |
| `gross_contract_value` | `total_cost` |
| `discount_amount` | `discount` |
| `net_contract_value` | `net_cost` |
| `transfer_price_unit` | `trade_price_unit` |
| `total_transfer_price` | `total_trade_price` |
| `gross_margin_amount` | `net_income` |
| `gross_margin_pct` | `margin_pct` |

This compatibility mapping must not be interpreted as final Finance-approved terminology.

## 6. Quality and Lineage Fields

The governed cleaned master should also include:

| Field | Purpose |
|---|---|
| `area_type` | `geographic`, `non_geographic`, or `unmapped` |
| `year` | Year derived from `date_delivered` |
| `quality_status` | `valid`, `warning`, or `rejected` |
| `quality_notes` | Machine-readable or semicolon-separated issue explanations |
| `duplicate` | Duplicate-review flag |
| `standardization_applied` | Transformations applied to the row |
| `input_stage` | Raw, staged, cleaned, or published source stage |
| `data_source_year` | Year extracted from the source filename |
| `in_analysis_range` | Whether the delivery year is between 2017 and 2025 inclusive |
| `source_workbook` | Source CSV filename |
| `source_sheet` | `CSV` or another explicit source partition label |
| `source_row_number` | Original 1-based source record position |
| `source_hash` | Hash of the source coordinates and raw values |
| `business_hash` | Hash of the standardized business fields for duplicate detection |

The resulting recommended master schema has **28 fields**: 14 business fields plus 14 quality and lineage fields.

## 7. Required Cleaning Work

### 7.1 Preserve and register raw sources

- Never edit or overwrite the original CSV files.
- Record the source filename, file hash, import batch, received timestamp, and row count.
- Keep a reproducible link from every staged or cleaned row to its original row.
- Store rejected rows and their reasons rather than deleting them.

### 7.2 Remove report-layout content

- Skip the company name, report title, report date, and blank preamble rows.
- Detect the real transaction header on row 5 or 6.
- Combine the two 2017 header rows.
- Remove fully blank records.
- Exclude report totals, summary rows, and `DISCREPANCY` footer records from transaction data.
- Remove the eight empty trailing fields in 2018.
- Remove the empty trailing field in 2019.
- Trim header and value whitespace.

### 7.3 Normalize headers safely

- Apply an explicit, versioned header-alias map.
- Preserve 2017 `DISCOUNT %` and `DISCOUNT AMOUNT` as separate fields.
- Reconcile the 2017 `GROSS SALES` and `QTY` values; flag disagreements.
- Keep 2019 `TOTAL CP` and `TotalCP` separate. They currently normalize to the same token if punctuation and case are removed.
- Create a null `gross_margin_pct` for 2017–2020 before any approved derivation.

### 7.4 Normalize dates and years

- Parse known source formats explicitly rather than relying on locale defaults.
- Support formatted Excel date serials.
- Store accepted dates as ISO `YYYY-MM-DD` values.
- Derive `year` from the parsed delivery date, not from the source filename.
- Retain `data_source_year` separately for cross-year reconciliation.
- Quarantine dates outside 2017–2025.
- Correct malformed dates only when the intended value is independently verifiable.
- Do not replace every malformed date with the file year.
- Produce a separate rejected-date report.

### 7.5 Normalize DR numbers

- Store DR numbers as text.
- Preserve leading zeros.
- Trim whitespace and standardize case.
- Normalize known forms such as numeric-only IDs, `DR`, `DR MS`, `DR RT`, and `PULL` identifiers.
- Preserve the original value through source lineage.
- Flag missing DR numbers for review; a missing DR number is not automatically a rejection if the transaction remains otherwise traceable.

### 7.6 Standardize areas

- Trim whitespace and normalize case.
- Apply an approved alias map for values such as `CAM NORTE`, `CAM SUR`, `LOWER CAVITE`, and `EASTERN QUEZON`.
- Correct verified spelling variants such as `LAGASPI`.
- Distinguish geographic territories from business-channel labels such as `Government`, `Admin`, `Hospital`, `Supplies`, `Equipment`, `Personal`, `Losses`, and `Pharma`.
- Populate `area_type`.
- Retain unmapped areas for review rather than silently assigning them to a province.

### 7.7 Standardize products and SKUs

- Treat spreadsheet errors such as `#REF!`, `#N/A`, and `#VALUE!` as missing values.
- The 2017 CSV contains approximately 3,807 `#REF!` product values that require recovery or rejection.
- Resolve blank product descriptions in later files, particularly 2023–2025.
- Normalize casing, whitespace, punctuation, dosage strength, units, and package notation.
- Maintain an approved product/SKU alias table.
- Do not use uncontrolled fuzzy replacement for product names.
- Classify medicines separately from equipment, supplies, administrative adjustments, and contract descriptions.
- Preserve the raw product text for audit.

### 7.8 Parse numeric values

- Remove formatting commas, extra spaces, currency symbols, and percent signs.
- Convert parentheses, such as `(330.00)`, to negative numbers.
- Interpret dashes according to an approved field-level rule.
- Preserve null values until a rule explicitly permits conversion to zero.
- Do not blanket-convert every missing financial value to zero.
- Store percentages as decimal values, for example `30%` as `0.30`.
- Use exact `numeric`/`decimal` database types for financial amounts instead of binary floating-point types.
- Retain source precision and round only for presentation or approved reconciliation tolerances.

### 7.9 Validate financial relationships

For rows with the necessary inputs, validate:

```text
gross_contract_value ≈ quantity × contract_price_unit
net_contract_value ≈ gross_contract_value − discount_amount
total_transfer_price ≈ quantity × transfer_price_unit
gross_margin_amount ≈ net_contract_value − total_transfer_price
gross_margin_pct ≈ gross_margin_amount ÷ net_contract_value
```

- Apply a documented currency tolerance.
- Keep the source-provided gross margin and percentage for comparison.
- Flag, rather than silently overwrite, source values that do not reconcile.
- Do not divide by zero when calculating margin percentage.
- Obtain Finance/business-owner approval before treating CP as revenue, TP as cost basis, or the source `Net Income` as gross margin.

The current financial reconciliation proposes `NET CP` as sales value and `TOTAL TP` as transfer-cost basis. Its status remains `proposed_pending_finance_owner_approval`, and financial dashboard publication is blocked.

### 7.10 Classify negative and adjustment records

Negative quantities or amounts may represent returns, pull-outs, credits, losses, or corrections. They must not be deleted merely because they are negative.

Introduce an approved `transaction_type` classification such as:

`sale`, `return`, `credit`, `pull_out`, `adjustment`, `unknown`

### 7.11 Distinguish missing values from zeros

Flag these conditions separately:

- Quantity present but a required financial total is missing.
- Zero quantity with nonzero financial values.
- Nonzero quantity with zero or missing transfer-price totals.
- Missing product with financial values present.
- Missing area or DR number.
- Zero denominator for margin calculations.
- A dash used as a placeholder versus an explicit numeric zero.

### 7.12 Deduplicate and reconcile carry-over

- Detect byte-for-byte duplicates.
- Detect repeated standardized business keys using date, DR number, product, quantity, and financial values.
- Reconcile the 4,857 rows dated 2018 inside the 2019 file with the standalone 2018 source.
- Flag duplicate candidates before removal because identical transaction lines can be legitimate.
- Preserve the source and business hashes used for the duplicate decision.
- Produce a duplicate-review report.

### 7.13 Detect outliers

Review rather than automatically delete:

- Extremely large quantities or amounts.
- Negative or unusually high margins.
- Unit prices inconsistent with the same canonical SKU.
- Total values that do not reconcile within tolerance.
- Sudden area, product, or monthly-volume spikes.
- Zero-value transactions and rows with partial financial data.

### 7.14 Assign quality outcomes

| Status | Rule |
|---|---|
| `valid` | Required identifiers and dates are present; values pass cleaning and validation rules |
| `warning` | Row is retained but contains a reviewable issue, anomaly, duplicate candidate, or approved exception |
| `rejected` | Required date or product is missing, the year is outside the approved range, or the record is not a transaction |

Every non-valid row must have a specific `quality_notes` value.

### 7.15 Reconcile the output

- Compare raw, staged, accepted, warning, rejected, and duplicate row counts.
- Reconcile totals by source file, actual delivery year, and area.
- Compare calculated totals against report footer totals without importing footer rows as transactions.
- Confirm that no transaction was silently reassigned to a different year.
- Confirm that every rejected or quarantined row appears in a review artifact.
- Re-run financial and row-count reconciliation before dashboard publication.

## 8. Supabase Assessment

### 8.1 Verdict

**Supabase is a good component of the MedShield data-cleaning architecture, but it should not perform the entire cleaning workflow by itself.**

Supabase is well suited for:

- Persisting immutable import-batch metadata and source lineage.
- Staging parsed records.
- Applying Postgres data types, constraints, and validation queries.
- Performing deterministic SQL transformations.
- Detecting duplicates with hashes and indexed business keys.
- Maintaining approved area and SKU alias tables.
- Separating accepted, warning, rejected, and published records.
- Producing governed views and materialized summaries for the dashboard.
- Enforcing access controls and auditability.

Supabase is not the best first-stage parser for these raw files because:

- The real headers do not start on row 1.
- The 2017 file has a two-row header.
- The schemas vary by year.
- The 2018 and 2019 files include unnamed padding columns.
- The files include blank lines, totals, discrepancy rows, spreadsheet errors, and formatted Excel serial dates.
- Header collisions must be resolved with year-specific logic before typed insertion.

### 8.2 Recommended hybrid workflow

```text
Immutable raw CSV files
        ↓
Versioned parser and structural normalizer
        ↓
Supabase private staging tables
        ↓
SQL validation, aliases, quality flags, and reconciliation
        ↓
Governed clean transaction table
        ↓
Security-invoker analytics views / dashboard API
```

### 8.3 Recommended Supabase layers

| Layer | Purpose |
|---|---|
| Raw file registry | Import batch, filename, checksum, received time, row counts, and processing status |
| Private staging | Parsed values, raw strings, source row number, and parse errors; not exposed through the Data API |
| Reference/master data | Approved product aliases, area aliases, transaction types, and rule versions |
| Quality/audit | Rejected rows, warning flags, duplicate candidates, reconciliation results, and cleaning history |
| Core cleaned data | Typed, standardized, accepted transaction records |
| Analytics | Security-invoker views and approved aggregates used by the application |

### 8.4 Import approach

Supabase supports dashboard CSV import, `COPY`, pgloader, and API-based imports. Its current documentation says dashboard CSV import is best for smaller development datasets and has a 100 MB limit; production imports should be planned for integrity and performance.

Although the MedShield files are individually small enough for dashboard upload, they should not be imported directly into the final table. First produce structurally normalized rows, then load them into a private staging table using a repeatable bulk process.

Official reference: <https://supabase.com/docs/guides/database/import-data>

### 8.5 Supabase security requirements

- Keep raw staging and audit tables in non-exposed schemas where practical.
- Enable RLS on every table in an exposed schema.
- Do not treat `TO authenticated` alone as row-level authorization.
- Use ownership or role predicates appropriate to MedShield's users.
- Use `security_invoker = true` for exposed Postgres 15+ views so they respect the querying user's RLS policies.
- Never expose a service-role or secret key to frontend code.
- Review explicit Data API grants. As of the 2026 Supabase platform changes, new tables are not necessarily exposed to the Data API automatically.
- Run Supabase security and performance advisors after schema changes.

Current platform changes: <https://supabase.com/changelog>

## 9. Recommended Implementation Sequence

1. Obtain Finance/business-owner decisions for CP, TP, gross margin, returns, and zero-value rules.
2. Freeze the 28-field target schema and versioned alias maps.
3. Preserve source files and create an import-batch manifest.
4. Implement year-aware structural parsing outside the database.
5. Load parsed raw strings into private Supabase staging tables.
6. Apply deterministic SQL standardization and quality rules.
7. Export rejected, warning, and duplicate-review records.
8. Reconcile year counts and financial totals against the source reports.
9. Publish approved records to the core cleaned table.
10. Expose only approved analytics views to the dashboard.
11. Run database security and performance advisors.
12. Record the cleaning-rule version and certification result.

## 10. Decisions Required Before Cleaning

- [ ] Confirm that `NET CP` is the sales value.
- [ ] Confirm that `TOTAL TP` is the transfer-cost basis.
- [ ] Confirm that raw `Net Income` represents transaction gross margin.
- [ ] Approve the currency reconciliation tolerance.
- [ ] Define whether dash placeholders mean zero or missing for each numeric field.
- [ ] Approve the handling of 2017 dates outside 2017–2025.
- [ ] Decide whether the 2018 rows inside the 2019 source supersede, complement, or duplicate the standalone 2018 file.
- [ ] Approve transaction types for returns, pull-outs, credits, losses, and adjustments.
- [ ] Approve the area alias map and geographic/non-geographic classification.
- [ ] Approve the product/SKU alias and non-medical classification process.

## 11. Acceptance Criteria

The data-cleaning implementation is complete only when:

- [ ] The original CSV files remain unchanged.
- [ ] All nine files are parsed using their correct header structure.
- [ ] Every staged record has source lineage.
- [ ] No 2019 `TOTAL CP`/`TotalCP` collision remains.
- [ ] The 2017 discount rate and amount are preserved separately.
- [ ] All dates are valid ISO dates or have explicit rejection reasons.
- [ ] All outside-range and cross-year rows are reported.
- [ ] Missing values remain distinguishable from genuine zeros.
- [ ] Product and area aliases are governed and reproducible.
- [ ] Negative records have an approved transaction classification or warning.
- [ ] Duplicate decisions are auditable.
- [ ] Financial relationships are reconciled within approved tolerances.
- [ ] Raw, staged, accepted, warning, rejected, and published row counts reconcile.
- [ ] Dashboard views use only Finance-approved metric definitions.
- [ ] Supabase RLS, grants, view security, and advisors have been verified.

## 12. Existing Project References

- `databricks/docs/SALES_DATA_CLEANING_REFERENCE.md`
- `docs/BUSINESS_DEFINITIONS.md`
- `databricks/docs/2025_DATA_ISSUE_REMEDIATION.md`
- `docs/reports/2026-08-29/P1_P14_REMEDIATION_STATUS.md`
- `data/medshield/processed/sales_dataset_status.json`
- `data/medshield/certification/sales_2017_2025_v1_financial_reconciliation.json`
- `services/data_pipeline.py`
