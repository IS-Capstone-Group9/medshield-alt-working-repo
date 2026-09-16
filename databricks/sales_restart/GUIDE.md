# MedShield sales restart: Bronze → Silver → Gold

Use this guide for the sales-data rebuild reviewed on **9 September 2026**.
Gold scope controls were updated on **12 September 2026**. Use these restart
notebooks for the migration; the older bundle job invokes a different pipeline.
The complete runnable code is embedded below in `README.md`. Work from that
README; `GUIDE.md` is its introductory source for maintainers.

## Start here

1. In your Databricks `medshield_project` folder, create three **Python notebooks**:
   `01_sales_bronze`, `02_sales_silver`, and `03_sales_gold`.
2. Use Serverless compute. Open the Bronze section below and copy **one code
   block into one Python cell**, in the numbered order shown. Repeat for Silver
   and Gold. Copy the code inside the blocks, not the Markdown fences.
3. Check the source-directory setting in Bronze and the reference-file setting
   in Gold. The defaults follow your `/Workspace/medshield` folder structure.
4. Run every Bronze cell from top to bottom. After its final validation passes,
   run every Silver cell, then every Gold cell. Stop at the first error.
5. Save the three final summaries, the dataset ID, and the disposition/quality
   tables. These are the evidence for deciding whether the candidate data is
   suitable for reporting.

There is no need to import a ZIP, copy a `.env`, install libraries, or run
notebooks 09–11 for this sales rebuild. Each notebook reads persisted input
tables and defines its own functions. Do not mix these cells with the older
`BRONZE LAYER`, `SILVER LAYER`, or `GOLD LAYER` notebooks.

## Required inputs

### Area master v4 (14 September 2026)

Upload the enhanced `datasources/templates/area_classification_mapping.csv` to
the configured `AREA_MAPPING_PATH`, then replace Gold with the current Python
source and run it from cell 1. Its policy is `sales_restart_gold_v4_area_master`.
No Bronze/Silver rerun is required when only the area master/Gold changes.
An older-format supplied CSV now fails the required-column check rather than
silently dropping geographic metadata. An absent file still leaves all areas
pending, prints `MAPPING PENDING`, and records `NOT_SUPPLIED` as its checksum.

The master retains its original columns for existing application readers and
adds `territory_id`, `region`, `province`, `city_municipality`, `geographic_level`,
`evidence_source`, `evidence_status`, and `external_mapping_status`. Territory IDs
such as `PH-PROVINCE-QUEZON` are internal project keys, not official PSGC codes.
No municipality is inferred from a province label. Lucena stays city-level;
Mindoro cannot identify one of its two provinces. East/Eastern remain unresolved.
Channels do not establish geography or public/private buyer ownership.

The existing seven territory approvals are retained and explicitly marked
`LEGACY_APPROVAL_NOT_REVALIDATED`; no source-owner signoff has been invented.
New observed aliases such as CAM NORTE/CAM SUR have proposed canonical geography
but remain `needs_review`. Validate and approve these with the source owner
before enabling their geographic eligibility flags. Non-geographic labels and
unresolved locations cannot enable territory joins. A business line does not
establish the product's medical category.

Gold's area dimension retains proposed metadata alongside `area_mapping_status`;
`territory_id` is populated only for approved territories. Consumers must check
that status before treating `mapped_*` geographic fields as verified. The
territory-year mart groups by the stable ID. The new audit table
`workspace.medshield_audit.sales_restart_area_coverage_candidate` accounts for
every retained fact by year and original normalized label, with approved
territory counts and external-join-ready counts. It preserves pending and
unmatched labels for review. Gold shows the master checksum and coverage table.

`is_external_geography_candidate` remains a screening flag; it does not mean a
station/DOH join is approved. `is_external_join_ready` remains false because this
notebook does not validate external station assignments, reporting geography,
temporal coverage or leakage. Keep station and DOH mappings separate, linking
through the internal territory ID once reviewed.

Local source coverage can be reproduced with
`python databricks/sales_restart/audit_area_mapping.py`. The CSV and JSON outputs
under `outputs/area_mapping_review/` distinguish inventory coverage from business
approval. No row is automatically approved just because its label is present.

### Missing-area and missing-date policy

Silver v2 uses `UNKNOWN_AREA` when the source area is absent, while retaining
`area_raw` and `is_area_placeholder`. A row with a real delivery date and product
can now enter normal candidate reconciliation despite the missing area. Gold
never enables geographic/external joins for `UNKNOWN_AREA`, even if a mapping
mistakenly approves it.

For missing delivery dates, `reporting_year` uses `data_source_year` from the
validated yearly CSV filename (for example `medshield_data_2022.csv`). Its basis
is `PROVISIONAL_SOURCE_FILE_YEAR`; the actual `date_delivered` and `calendar_year`
remain null. No day or month is invented. Invalid nonempty dates stay unresolved
rather than silently receiving the source year. Records with a product and a
quantity or sales amount become year-only review candidates, not accepted
dated sales; duplicate resolution still needs evidence.

Gold v3 publishes these records in
`workspace.medshield_audit.sales_restart_provisional_year_candidate`, separate
from observed yearly/monthly sales, forecasting and external joins. Missing
products, ambiguous duplicates and other review cases remain in the complete
Silver assessment ledger. Placeholders do not repair those other issues.

After installing this version, rerun Silver from cell 1, then Gold from cell 1.
Bronze can be reused if the source files did not change. Gold now requires the
new Silver fields and will stop if the old Silver tables are supplied.

Your workspace should contain:

```text
/Workspace/medshield/
├── medshield_project/                  ← create the three notebooks here
├── medshield_project_csv/
│   ├── medshield_data_2017.csv
│   ├── medshield_data_2018.csv
│   ├── ...
│   └── medshield_data_2025.csv
└── medshield_reference_csv/
    ├── likely_non_medical_product_candidates.csv
    ├── area_classification_mapping.csv
    └── product_master_review.csv
```

Use the original CSV exports, not previously aggregated or backward-allocated
files. Keep the reference CSV as a review list; it is not an approved medicine
master. You need permission to create schemas, a Unity Catalog volume, and
Delta tables in the `workspace` catalog.

Upload `datasources/templates/area_classification_mapping.csv` as the area map.
Use `sales_restart/references/product_master_review.csv` for the product master.
It starts with a header only: no medicine approvals are invented. This strict
template is different from the older alias template. Each approved row requires
`raw_product`, `canonical_sku`, `product_category` (`medicine`, `medical_supply`,
or `non_medical`), `unit_of_measure`, `forecast_eligible` (`true`/`false`), and
`mapping_status=approved`. Use a SKU identity that distinguishes strength, form,
and pack size. Source units must agree across aliases of the same SKU; the code
does not convert boxes to tablets or infer pack contents.

Missing masters leave mappings pending. Malformed supplied files or conflicting
approvals stop Gold. Proposed/needs-review rows cannot enable medical demand or
territory analysis. `INCLUDE_MEDICAL_SUPPLIES` defaults to false; change it only
when medical supplies are explicitly included in the thesis scope. Approved
product mappings can resolve hashtag sizes and override the keyword review
list; known contract parent labels can never become approved medicine units.

Gold now publishes separate `sales_restart_business_product_yearly_candidate`
(all retained business labels), `sales_restart_territory_yearly_candidate`
(approved territories), `sales_restart_medical_monthly_candidate` (eligible
approved products grouped by SKU/source unit), and
`sales_restart_external_input_candidate` (medical rows with approved external
geography eligibility). The last table is NOT an externally joined or
model-ready dataset: station mapping, DOH geography, time coverage and leakage
checks remain required. `sales_restart_scope_candidate` in the audit schema
accounts for each retained fact by scope. Empty medical outputs are expected
when there are no approved products. No-observation months are not filled in
these sparse product tables and must not be interpreted as zero demand.

The existing `sales_restart_product_yearly_candidate` remains a provisional,
unapproved-product subset for compatibility. Approved products move to the
appropriate new outputs, so it is not a total product-sales report. Every
published data table records both mapping checksums and the medical-supplies
scope setting. Rerun Gold and its downstream consumers after any map change.

The baseline inventory is 2017–2025. Additional yearly files must have a
recognized, validated source layout. A changed header must be investigated;
do not rename columns or force a new file through a different year's layout.

The supplied files previously contained **58,634 raw split lines**, including
headers, blank lines, and one trailing empty split element per file. That is
an ingestion reference, **not a sales transaction count or a required clean
row count**. The pipeline validates the current manifest and source keys.

## What each layer means

| Layer | Grain and purpose | What to check |
|---|---|---|
| Bronze | One physical source line, with file checksum and row number; original bytes archived in a volume. | All expected source files, stable dataset ID, complete source-key reconciliation. |
| Silver | One assessed record for every Bronze line; parsed transaction candidates and an explicit disposition for everything else. | Raw → assessed equality; kept + excluded/review/nontransaction counts; parse and snapshot exceptions. |
| Gold | One fact per retained Silver transaction; separate eligible measures, dimensions, marts, and audits. | Fact → mart reconciliation, product/contract scope, missing observations, quality and exclusion totals. |

Bronze's line representation normalizes line endings and removes the initial
UTF-8 byte-order marker; the archived source file remains byte-for-byte intact.

All restart tables have `sales_restart_` prefixes and `_candidate` suffixes.
They represent **one current input snapshot**. Rerunning replaces these
restart candidate tables. It does not publish to existing business dashboard
tables or silently update notebooks 09–11. Original archived source files
remain available under content-based dataset directories.

Writes to several tables are not a single database transaction. Run one
pipeline at a time. If a cell fails during publication, rerun that whole
notebook from its first cell; do not consume a partially published layer.
Dataset IDs and read-back checks catch mixed source snapshots. After changing
source files, rerun Bronze, Silver, and Gold in that order.
The dataset ID identifies the sales file contents, not notebook code or the
non-medical reference. After a rule/code change, rerun the changed layer and
every downstream layer. After a reference-list change, rerun Gold and its
downstream consumers even when the sales dataset ID has not changed.

## Analytical rules used in this rebuild

| Issue | Treatment and interpretation |
|---|---|
| Revenue | Net CP is net sales. CP is unit selling price; Total CP is gross sales. |
| Acquisition cost | TP/UNIT is acquisition price; Total TP is total acquisition cost. |
| Profit wording | Source “net income” is transaction gross margin. Company net profit cannot be calculated without operating expenses. |
| Missing financial values | Preserve nulls and record parse failures. A missing later-year net value is not replaced with gross sales. Any permitted 2017 derivation is explicitly marked. |
| Invalid or contradictory fields | Preserve the original source text. Eligibility is determined separately for each measure; a valid quantity does not prove valid revenue. |
| Year mismatch | Use the reported delivery date. Retain source year separately. Never change a delivery year to 2019 just because the file says 2019. |
| Historical snapshots | Prefer the dedicated source-year record. Resolve supported repeat matches before ordinary duplicate disposition; route changed or ambiguous historical records for review. This precedence is a candidate policy pending owner confirmation. |
| Duplicate-looking transactions | Matching values alone do not prove duplicate business events. Ambiguous repeated rows remain auditable and excluded pending review. Delivery references are retained in matching evidence. |
| Historical backfills | Keep unmatched earlier-year records as flagged candidates. Exclude unapproved backfills from provisional predictive demand. |
| Returns/credits | Retain signed quantities and eligible signed financial amounts. Show negative-quantity return candidates separately as absolute quantities. A negative sign alone does not confirm the business reason. |
| Zero or negative sales with positive quantity | Keep quantity and financial eligibility separate. Do not require positive revenue to recognize observed positive product deliveries. |
| Contracts | Known contract prefixes form a separate candidate scope. Exact normalized labels support summaries, not proof of a unique legal contract. Contract parent quantities are not SKU demand. |
| Unknown `#` labels | Review separately; `#` by itself is not proof of a contract (for example, a numbered surgical blade). |
| Blank continuation rows | Preserve them in the assessed/audit data. Do not infer products, delivery dates, or parent links from proximity alone. |
| Backward approximation | No estimated child products are created here. Allocation requires supporting detail, a documented method, reconciliation, and approval. Later estimates must remain separate from observed demand. |
| Non-medical reference matches | Retain valid business financial facts; exclude provisional matches from medical demand unless a reviewed product master supersedes the keyword candidate. |
| Unmatched products | Without an approved master entry, mark product approval as pending. Absence from a non-medical list does not establish that an item is medicine. |
| 2017 | Retain descriptive evidence with low-trust warnings. Exclude from provisional predictive demand. |
| Missing months | Display zero observed row counts and null measures. “No observed records” does not mean true zero demand. |
| Completeness | Seeing transactions in all 12 months does not prove complete reporting. No year is automatically approved as a model holdout. |
| Area labels | Preserve normalized source labels. Geographic region mapping and customer/channel classification require a reviewed area master before external-source joins. |

The Gold provisional demand measure is a **screened product-delivery
candidate**, not approved medical demand. Approved-medical eligibility requires
the reviewed master and per-record quality checks described above. Aggregating
units across products is descriptive only: pack sizes and units of measure
still require master-data review before inventory calculations.

The provisional product-demand summary uses normalized source labels after
excluding low-trust 2017, historical backfill candidates, contract labels, and
reference-matched non-medical labels. A separate label partition retains the
full business-sales classification. Neither claims completed SKU identity
resolution. Contract summaries and product summaries have different
populations, so their counts must be compared with the corresponding fact
subsets, not each other.

## Validation and next decision

### Missing identity investigation (12 September 2026)

Run `python databricks/sales_restart/audit_missing_identity.py` from the project
root to regenerate `outputs/identity_review/identity_review.csv` and its JSON
summary. This local audit reads the original CSVs and available `Sales Report.xlsx`
cells. It does not write source files or infer product identities. Same-receipt
and adjacent-product columns are investigation leads only.

The 4,542 missing product identities comprise 3,793 source error tokens, 691
blank-product records with nonzero numeric activity, 49 with no nonzero measures,
and 9 without sufficient identity (possible summaries or incomplete records).
The available workbook covers 2021–2025 only. It corroborates absent product
cells on 735 receipt/area-aligned rows; it cannot repair 2017 `#REF!` references.
472 identity-review records have same-file/receipt/date/area product leads, but
a multi-product receipt does not prove a particular row's missing product.

Silver v3 fixes the formatted Excel serial `45,913.00` at 2025 CSV row 2411,
corroborated by numeric 45913 at `Sales Report.xlsx`, sheet `2025`, cell `C2411`.
It becomes 2025-09-13 and is flagged `EXCEL_SERIAL_DELIVERY_DATE_PARSED`.
Reconciliation then routes it to possible-duplicate review; it is not simply
added to sales. With the current source files, retained candidates remain
37,178, identity review becomes 4,544 and possible-duplicate review becomes 123.

Ask the source owner for the original 2017 workbook/reference sheets and delivery
receipt/invoice line details for the blank-product rows, prioritizing records
with monetary activity. Corrections must carry source-row evidence and mapping
provenance before rerunning the pipeline. Do not fill down neighboring products.

The restart uses standard Python for bounded, inspectable CSV parsing and
Spark/Delta for tables and aggregates. Input size limits protect driver memory;
stop and redesign ingestion if those limits are exceeded. The code avoids
Serverless-unsupported cache/persist/RDD operations. See the official
[Serverless limitations](https://docs.databricks.com/aws/en/compute/serverless/limitations)
and [workspace file documentation](https://docs.databricks.com/aws/en/files/workspace).

Local validation checks cell syntax, helper behavior, source reconciliation,
and README/code agreement. **Databricks Serverless execution is still required**
to validate Unity Catalog permissions, Delta writes, Spark expressions and
persisted aggregate results. A successful code review or local test is not a
completed Databricks run.

After Gold passes, inspect the disposition and metric-coverage results before
using totals. Resolve contract and product-master questions, then deliberately
adapt the external-integration notebooks to these new tables. Do not continue
the old Notebook 11 against unrelated or stale feature tables.

## If something fails

| Symptom | Next action |
|---|---|
| File not found | Correct the explicit Databricks source/reference path in the setup cell; local Windows paths are not Databricks paths. |
| Unexpected/missing header | Inspect the original CSV and update its reviewed layout contract; do not skip validation. |
| Dataset IDs differ | Complete Bronze, rerun all Silver cells, then all Gold cells for the same snapshot. |
| Parse, duplicate or historical-review counts appear | Inspect the audit. These are explicit data dispositions, not necessarily notebook execution failures. |
| An assertion or publication fails | Stop. Save the complete error and rerun the affected notebook from cell 1 after fixing the cause. |
| `PERSIST TABLE` error | An old cell or notebook is still in use; the restart contains no cache/persist/unpersist calls. |

## Maintain this guide

Notebook `.py` files are the code source of truth. The remaining README sections
are generated from their exact cell bodies, so copied code cannot silently
drift from the reviewed files. From the repository root, maintainers run:

```powershell
python databricks/sales_restart/render_readme.py
python databricks/sales_restart/render_readme.py --check
python -m unittest discover -s databricks/sales_restart/tests -v
```

The legacy module/bundle workflow under `databricks/notebooks` is a separate
implementation. For this rebuild follow only the three notebook sections below.
