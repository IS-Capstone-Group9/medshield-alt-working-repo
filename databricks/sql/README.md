# Databricks SQL Files

Run these files in Databricks SQL Editor when you want to inspect or expose the pipeline without opening the PySpark notebooks.

1. `00_setup_catalog.sql` creates the default schemas and raw-file volume.
2. `01_quality_checks.sql` profiles clean and quarantined records.
3. `02_compatibility_views.sql` exposes the current application field names without changing the governed base table.
4. `03_gold_checks.sql` performs basic Gold reconciliation queries.
5. `04_sales_restart_dashboard.sql` provides the datasets for the Databricks
   `MedShield Sales Analytics — Candidate` dashboard. Create one dashboard
   dataset per numbered query and follow
   `../docs/SALES_RESTART_DASHBOARD_GUIDE.md` for visual configuration.
6. `05_sales_restart_system_bridge.sql` creates the exact yearly compatibility
   view read by the MedShield backend and validates the rebuilt 2017-2025 source.
7. `06_external_restart_system_bridge.sql` exposes candidate-only DOH and PAGASA
   context views for the system without zero-filling absent observations or
   enabling any external signal for forecasting.

The scripts use the default `workspace` catalog. Change the catalog consistently if your workspace uses another one.
