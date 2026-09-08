# MedShield sales historical-snapshot reconciliation

## Decision

Use the dedicated source-year file as the primary record for a delivery year.
Treat prior-year transactions repeated in a later annual report as historical
snapshot records, not as additional sales by default.

The policy preserves every source row in Bronze. Silver publishes a canonical
analysis-ready table and a separate reconciliation audit; it never overwrites
the source delivery date or source year.

## Evidence

- `medshield_data_2018.csv` contains 4,356 parseable 2018-dated transaction
  rows.
- `medshield_data_2019.csv` contains 4,857 parseable 2018-dated rows in
  addition to its 2019-dated rows.
- 3,016 rows overlap across those files on normalized delivery date, area, and
  product.
- 2,999 rows also agree on quantity, gross sales, and net sales after numeric
  normalization.
- The first Gold candidate run retained 4,791 source-year mismatches after
  Silver quality and duplicate disposition, materially inflating 2018 row
  counts if both snapshots are treated as independent transactions.

These local-source counts are profiling evidence. Databricks must reproduce
the final post-Silver disposition counts before the revised Gold candidate is
accepted.

## Silver disposition rules

1. `KEEP_SOURCE_YEAR_ALIGNED`
   - Delivery year equals source report year.
   - Included in the canonical analytical table.
2. `EXCLUDE_HISTORICAL_SNAPSHOT_DUPLICATE`
   - A later source report repeats the same normalized delivery date, area,
     product, quantity, gross sales, and net sales as the dedicated year file.
   - Excluded from analytical totals and retained in the audit table.
3. `MANUAL_REVIEW_HISTORICAL_RESTATEMENT`
   - A later source report matches delivery date, area, and product but changes
     demand or revenue measures.
   - Excluded from analytical totals pending review.
4. `KEEP_HISTORICAL_BACKFILL_CANDIDATE`
   - A prior-year record in a later report has no corresponding dedicated-year
     record under the governed matching rules.
   - Included with a warning and an explicit backfill-candidate flag.
5. `MANUAL_REVIEW_FUTURE_DATED_SOURCE`
   - Delivery year is after the source report year.
   - Excluded pending review.

## Tables

- Pre-snapshot Silver candidate:
  `workspace.medshield_silver.sales_analysis_ready_pre_snapshot_candidate`
- Canonical Silver candidate:
  `workspace.medshield_silver.sales_analysis_ready_candidate`
- Reconciliation audit:
  `workspace.medshield_audit.sales_snapshot_reconciliation_candidate`

Gold continues to read the canonical Silver table and carries the snapshot
status, match method, reference year, backfill flag, and policy version into
`fact_sales_candidate`.

## Validation gate

The revised Silver and Gold notebooks must be rerun in order. Stop if:

- pre-snapshot rows do not reconcile to canonical plus removed rows;
- a manual-review or excluded snapshot disposition enters Gold;
- canonical business hashes are duplicated;
- persisted table counts do not match in-memory counts; or
- downstream regional sales no longer reconcile to the canonical Gold fact.

The Serverless-compatible importable package is
`databricks/imports/revised/medshield-databricks-snapshot-reconciled-serverless-2026-09-05.zip`.
The final Silver cell does not cache its reconciliation DataFrame because
Databricks Serverless does not support the resulting `PERSIST TABLE`
operation. This affects runtime only; the disposition rules and validation
gates are unchanged.
Its SHA-256 checksum is
`E81078B13A4B5DF6F54C9BEE72354BAAAC8813903D0157F4F327B529A88358D3`.

## Limitation

The rule is deterministic and conservative, but it is still a candidate
policy. Historical backfills and changed restatements require business-owner
review before candidate tables are promoted to production.
