# Databricks SQL Files

Run these files in Databricks SQL Editor when you want to inspect or expose the pipeline without opening the PySpark notebooks.

1. `00_setup_catalog.sql` creates the default schemas and raw-file volume.
2. `01_quality_checks.sql` profiles clean and quarantined records.
3. `02_compatibility_views.sql` exposes the current application field names without changing the governed base table.
4. `03_gold_checks.sql` performs basic Gold reconciliation queries.

The scripts use the default `workspace` catalog. Change the catalog consistently if your workspace uses another one.
