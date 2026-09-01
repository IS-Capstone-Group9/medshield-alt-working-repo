# MedShield Dataset and Data-Cleaning Documentation

This folder contains the working documentation for inspecting, standardizing, cleaning, validating, and publishing MedShield datasets. Implementation code, notebooks, SQL, tests, and deployment configuration live one level up in the [`databricks/`](../README.md) project.

## Recommended Reading Order

1. [MedShield CSV Data-Cleaning Plan](MEDSHIELD_CSV_DATA_CLEANING_PLAN.md) — dataset inventory, year coverage, standard columns, and cleaning requirements.
2. [Databricks Setup Checklist](DATABRICKS_SETUP_CHECKLIST.md) — workspace setup and first-run checklist based on the current Free Edition workspace.
3. [MedShield Databricks-to-System Connection Walkthrough](MEDSHIELD_DATABRICKS_SYSTEM_CONNECTION_WALKTHROUGH.md) — click-by-click connection verification, Supabase pilot-sync gates, troubleshooting, and suggested one-week plan.
4. [Databricks Data-Cleaning Workflow](DATABRICKS_DATA_CLEANING_WORKFLOW.md) — recommended implementation workflow from raw CSV ingestion through Supabase publication.
5. [Sales Data Cleaning Reference](SALES_DATA_CLEANING_REFERENCE.md) — detailed cleaning rules for the sales data.
6. [Sales Data Layer Flow](SALES_DATA_LAYER_FLOW.md) — separation of raw, estimated, cleaned, and analytical data layers.
7. [2025 Data Issue Remediation](2025_DATA_ISSUE_REMEDIATION.md) — handling incomplete or anomalous 2025 records.

## Master-Data and Classification Guides

- [SKU Alias Mapping Plan](SKU_ALIAS_MAPPING_PLAN.md)
- [Non-Medical Product Classification Guide](NON_MEDICAL_PRODUCT_CLASSIFICATION_GUIDE.md)
- [Medical Demand Cleaning Workflow](MEDICAL_DEMAND_CLEANING_WORKFLOW.md)

## Supporting Data Preparation

- [External Data Preparation Guide](EXTERNAL_DATA_PREPARATION_GUIDE.md)
- [Area Summary Backward Allocation](AREA_SUMMARY_BACKWARD_ALLOCATION.md)

## Working Rule

Raw source files must remain immutable. Cleaned, rejected, quarantined, duplicate-candidate, and analytical outputs must be stored separately with source-file and import-batch lineage.
