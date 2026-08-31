# MedShield Project Progress Tracker

**Last updated:** 2026-09-01  
**Purpose:** Keep one readable record of the dataset, Databricks, Supabase, and MedShield application work discussed during the project.

## Current headline

Databricks Gold is reachable from the MedShield backend and has passed the yearly pilot checks. The complete application cutover is **not finished**: Supabase currently rejects the protected yearly-cache write because the backend service role is missing schema permissions, and the dashboard still displays its bundled demonstration fallback.

No existing dashboard data has been deleted.

## Source-of-truth decision

The intended target architecture is:

```text
CSV source files
    -> Databricks Bronze (immutable raw lines)
    -> Databricks Silver (standardized, validated, quarantined)
    -> Databricks Gold (authoritative analytical outputs)
    -> protected Supabase serving/cache layer
    -> TypeScript API gateway
    -> MedShield dashboard
```

Databricks Gold should be the authoritative analytical source. Supabase is the protected application-serving layer, not a second manually maintained business dataset.

Bronze, Silver, quarantine, duplicate-review, and lineage data should be retained. They are needed for auditability, reprocessing, and capstone evidence. They should not be served as dashboard facts.

The bundled JSON demonstration snapshot should be disabled only after a complete Gold-backed source has been published and reconciled.

## Dataset discovery

### Files and years

- Nine CSV files were identified under `data/medshield/dataset_csv` / the Databricks `medshield_project_csv` folder.
- Years present: **2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025**.
- The source files cover the continuous range **2017–2025**.
- No source year outside 2017–2025 was accepted into the analysis-ready Gold set.
- The pipeline keeps out-of-range dates as review/quarantine records rather than silently changing them.

### Standardized transaction columns

The application and cleaned transaction contract use these 13 fields:

1. `area`
2. `dr_number`
3. `delivery_date`
4. `product_name`
5. `quantity`
6. `cost`
7. `discount_percent`
8. `discount_amount`
9. `net_cost`
10. `trade_price`
11. `total_trade_price`
12. `net_income`
13. `margin_percent`

Lineage and quality metadata are retained in the warehouse in addition to these business columns. Examples include source workbook, source sheet, source row number, source hash, quality status, and quality rule codes.

### Business definitions recorded

- Demand is based on quantity sold.
- Revenue uses the workbook total trade/transfer price definition.
- Workbook `net_income` is treated as gross margin/profit, not company net income, until a Finance owner approves the definition.
- Product aliases and contract-name rows require controlled review.
- Area values are separated into geographic territory, customer type, and business line where the source allows it.
- Disease and weather data are historical/contextual signals, not live alerts.
- EOQ, ROP, safety stock, allocation, and urgency outputs remain scenarios unless operational inventory and policy inputs are available.

## Databricks progress

### Bronze layer — completed

- All nine yearly CSV files were ingested.
- Raw source values and file/row lineage were preserved.
- Bronze is intended to remain immutable.

### Silver staging and cleaning — completed with review queues

Observed Silver staging total: **89,906 staged rows**.

The Silver workflow performed:

- Header and schema normalization.
- Date parsing and year checks.
- Numeric parsing and sign checks.
- Product, area, DR-number, and transaction-type standardization.
- Formula/reconciliation checks for quantity and financial values.
- Duplicate candidate detection.
- Non-transaction detection.
- Quarantine and rule-level diagnostics.

### Silver final validation — passed

| Measure | Result |
|---|---:|
| Analysis-ready rows | 40,086 |
| Duplicate exclusions | 0 |
| Duplicate manual-review rows | 234 |
| Remaining quarantine rows | 4,633 |
| Persistent Silver pipeline total | 44,953 |

The Silver validation showed that the analysis-ready rows reconcile with the persistent Silver pipeline total:

```text
40,320 clean + 4,633 quarantine = 44,953
```

The 40,086 rows are the Gold fact population after the approved exclusions/quality policy.

### Quarantine and quality review — completed for first pass

The quarantine review contained **4,633 rows**. The main observed rule groups were:

| Quality rule | Affected rows | Intended handling |
|---|---:|---|
| `INVALID_OR_MISSING_PRODUCT` | 4,548 | Review source product manually |
| `INVALID_OR_MISSING_QUANTITY` | 224 | Manual review |
| `GROSS_VALUE_FORMULA_MISMATCH` | 181 | Manual review |
| `2017_QUANTITY_CANDIDATES_DISAGREE` | 159 | Manual review |
| `EXACT_BUSINESS_DUPLICATE_CANDIDATE` | 103 | Manual review |
| `SOURCE_YEAR_MISMATCH` | 91 | Manual review |
| `DATE_OUTSIDE_2017_2025` | 87 | Keep quarantined outside analysis scope |
| `INVALID_OR_MISSING_DELIVERY_DATE` | 56 | Review source date manually |
| `NON_TRANSACTION_RECORD` | 12 | Keep quarantined as expected non-transaction data |
| `TRANSFER_VALUE_FORMULA_MISMATCH` | 10 | Manual review |
| `UNMAPPED_AREA` | 8 | Review source area manually |
| `NEGATIVE_QUANTITY` | 1 | Manual review |

Rule counts can overlap because one row may have multiple quality rules. Quarantine is not automatically deleted; it remains an explainable review artifact.

### Gold dimensions, facts, and quality model — passed

Observed Gold validation results:

| Object/result | Count |
|---|---:|
| Analysis-ready sales facts | 40,086 |
| Calendar dates | 3,287 |
| Areas | 20 |
| Products | 4,900 |
| Governed quality rules | 18 |
| Fact-rule occurrences | 8,236 |
| Product-year rows | 7,893 |

Primary keys, foreign keys, bridge mappings, date coverage, source-year coverage, and Silver-to-Gold fact reconciliation passed in the Gold star-schema validation.

### Gold marts — completed as candidate outputs

| Mart | Result |
|---|---:|
| Monthly sales mart | 108 rows, 2017-01 through 2025-12 |
| Yearly sales mart | 9 rows, one for each year 2017–2025 |
| Area-year performance mart | 180 rows, 20 areas × 9 years |
| Product-year performance mart | 7,893 rows |

Financial measures remain labeled as candidate values pending Finance/business-owner approval.

### Dashboard SQL views — created

The Databricks dashboard presentation layer contains:

- Monthly view: 108 rows.
- Yearly view: 9 rows.
- Area-year view: 180 rows.
- Product-year view: 7,893 rows.
- Quality view: 37 rows.
- Exclusions view: 26 rows.
- Quality occurrences reconciled: 8,236.
- Excluded records reconciled: 4,867.

## MedShield application progress

### Backend and frontend integration — implemented

Implemented repository components include:

- `backend/src/databricks.ts`
- `backend/src/databricksYearlySync.ts`
- `backend/src/supabaseWarehouse.ts`
- `frontend/services/api/integrations.service.ts`
- Databricks controls in `frontend/services/api/dashboard-markup.ts` and `dashboard-enhancement-listeners.ts`

The admin-only controls are on **View Sales Data**:

- **Verify Gold Connection**
- **Sync Yearly Gold Data**

The browser never receives the Databricks token, warehouse ID, Supabase secret key, or service-role key.

### Databricks connection check — passed

The backend live check reached:

```text
workspace.medshield_gold.vw_dashboard_yearly_sales_candidate
```

Verified:

- Connected: true.
- Rows: 9.
- Years: 2017–2025.
- One row per year.

### Supabase yearly candidate cache — not yet synchronized

Migration `013_databricks_yearly_candidate_sync.sql` defines:

- `medshield_sales.databricks_yearly_sales_candidate`
- `medshield_sales.vw_databricks_yearly_sales_candidate`
- `public.sync_databricks_yearly_sales_candidate(...)`

The RPC is visible, but the live protected write failed with:

```text
permission denied for schema medshield_sales
```

That is why the MedShield panel currently shows:

```text
Connected — Databricks Gold connection
Failed — Yearly candidate cache
```

The previous candidate cache was preserved and published dashboard facts were not changed.

### Permission fix prepared

Migration `014_databricks_yearly_candidate_permissions.sql` was added to grant only the backend `service_role`:

- `USAGE` on `medshield_sales` and `medshield_etl`.
- Required candidate table privileges.
- Required ETL lineage table privileges.
- Sequence privileges for ETL identity columns.
- Execute privilege on the protected sync function.

The backend TypeScript build passed after this change. The migration still needs to be run in the Supabase SQL Editor.

### Current dashboard source — not cut over

The screenshot showing **Demo Dataset** is expected under the current fallback behavior. The application currently reads the Supabase warehouse through the analytics services and falls back to the bundled reference export when the service/warehouse read fails.

The 9-row yearly candidate cache does not contain transaction-level DR numbers, delivery dates, product details, or quality fields. It cannot replace the full **View Sales Data** ledger by itself.

## What the layers mean

| Layer | Meaning | Should the dashboard read it? |
|---|---|---|
| Bronze | Immutable raw CSV lines and source metadata | No |
| Silver | Standardized rows, quality flags, accepted rows, quarantine, duplicate review | Only through governed publication, not directly |
| Gold | Validated facts, dimensions, quality model, and analytical marts | Yes, after approval/publication |
| Supabase serving layer | Protected application-facing copy/views of approved Gold outputs | Yes, through the API |
| Bundled demo snapshot | Local demonstration fallback JSON | No after cutover |

## Progress checklist

### Completed

- [x] Identified all nine CSV files and years 2017–2025.
- [x] Defined the standardized transaction columns.
- [x] Documented cleaning rules and review categories.
- [x] Created/ran the Databricks Bronze workflow.
- [x] Created/ran the Databricks Silver cleaning and quarantine workflow.
- [x] Validated Silver counts and lineage.
- [x] Built and validated Gold dimensions, facts, quality model, and marts.
- [x] Created Databricks dashboard views.
- [x] Added backend-only Databricks configuration.
- [x] Added admin-only connection verification.
- [x] Added admin-only yearly candidate synchronization workflow.
- [x] Prepared the Supabase permission repair migration.
- [x] Passed the backend TypeScript build.

### In progress

- [ ] Apply migration 014 in the Supabase project.
- [ ] Run the first successful yearly candidate synchronization.
- [ ] Validate 9 rows, years 2017–2025, and 40,086 transactions in the protected cache.

### Remaining before removing old/demo data

- [ ] Publish a full transaction-level Databricks Gold view/sync for the 40,086 analysis-ready rows.
- [ ] Publish or synchronize the Gold monthly, area, product, quality, and exclusion outputs required by the dashboard.
- [ ] Reconcile every dashboard metric against Databricks Gold.
- [ ] Switch the API and analytics services to the Gold-backed serving source.
- [ ] Disable the bundled demo fallback for normal application use.
- [ ] Create a rollback/export checkpoint.
- [ ] Only then archive or remove superseded old serving data.

## Immediate next step

1. Open `supabase/migrations/014_databricks_yearly_candidate_permissions.sql` in VS Code.
2. Copy the entire file.
3. In Supabase, open **SQL Editor → New query**.
4. Paste the file and click **Run**.
5. Return to MedShield → **View Sales Data**.
6. Click **Verify Again**.
7. Click **Try Sync Again**.

Expected result: **Synchronized**, 9 of 9 rows, years 2017–2025, and 40,086 transactions reconciled.

Do not delete the old dashboard data yet. After this pilot succeeds, the next engineering milestone is the full transaction-level Gold publication and reconciliation.

## Key files

- [Project overview](PROJECT.md)
- [Architecture](ARCHITECTURE.md)
- [Database design](DATABASE.md)
- [Implementation](IMPLEMENTATION.md)
- [Requirements](REQUIREMENTS.md)
- [Databricks workflow](../databricks/docs/DATABRICKS_DATA_CLEANING_WORKFLOW.md)
- [Databricks connection walkthrough](../databricks/docs/MEDSHIELD_DATABRICKS_SYSTEM_CONNECTION_WALKTHROUGH.md)
- [Yearly candidate sync migration](../supabase/migrations/013_databricks_yearly_candidate_sync.sql)
- [Permission repair migration](../supabase/migrations/014_databricks_yearly_candidate_permissions.sql)
