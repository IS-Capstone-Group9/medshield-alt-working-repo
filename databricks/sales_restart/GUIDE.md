# MedShield sales restart: Bronze → Silver → Gold

Use this guide for the sales-data rebuild reviewed on **9 September 2026**.
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
    └── likely_non_medical_product_candidates.csv
```

Use the original CSV exports, not previously aggregated or backward-allocated
files. Keep the reference CSV as a review list; it is not an approved medicine
master. You need permission to create schemas, a Unity Catalog volume, and
Delta tables in the `workspace` catalog.

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
| Non-medical reference matches | Retain valid business financial facts; exclude these provisional reference matches from the pharmaceutical demand candidate. The list is subject to review. |
| Unmatched products | Mark product master approval as pending. Absence from a non-medical list does not establish that an item is medicine. |
| 2017 | Retain descriptive evidence with low-trust warnings. Exclude from provisional predictive demand. |
| Missing months | Display zero observed row counts and null measures. “No observed records” does not mean true zero demand. |
| Completeness | Seeing transactions in all 12 months does not prove complete reporting. No year is automatically approved as a model holdout. |
| Area labels | Preserve normalized source labels. Geographic region mapping and customer/channel classification require a reviewed area master before external-source joins. |

The Gold provisional demand measure is a **screened product-delivery
candidate**, not approved medical demand. The approved-medical eligibility
flag remains false until an approved product master is integrated. Aggregating
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
