# MedShield Dataset and Data-Cleaning Documentation

This folder contains the working documentation for inspecting, standardizing, cleaning, validating, and publishing MedShield datasets. Implementation code, notebooks, SQL, tests, and deployment configuration live one level up in the [`databricks/`](../README.md) project.

## Recommended Reading Order

**Current sales rebuild:** use the [sales restart README](../sales_restart/README.md)
for the complete copy/paste notebook cells and current candidate policies.
The documents below also cover earlier pipelines and experimental allocations;
they do not override the restart's reported-value and approval rules.

1. [Current Databricks System Connection](CURRENT_DATABRICKS_SYSTEM_CONNECTION.md) — current 37,728-row gateway and validation workflow.
2. [MedShield CSV Data-Cleaning Plan](MEDSHIELD_CSV_DATA_CLEANING_PLAN.md) — pre-implementation inventory and requirements.
3. [Databricks Setup Checklist](DATABRICKS_SETUP_CHECKLIST.md) — workspace setup and first-run checklist.
4. [MedShield Databricks-to-System Connection Walkthrough](MEDSHIELD_DATABRICKS_SYSTEM_CONNECTION_WALKTHROUGH.md) — historical 40,086-row pilot walkthrough.
5. [Databricks Data-Cleaning Workflow](DATABRICKS_DATA_CLEANING_WORKFLOW.md) — earlier reusable/bundle workflow.
6. [Sales Data Cleaning Reference](SALES_DATA_CLEANING_REFERENCE.md) — detailed cleaning rules for the sales data.
7. [Sales Data Layer Flow](SALES_DATA_LAYER_FLOW.md) — separation of raw, estimated, cleaned, and analytical data layers.
8. [2025 Data Issue Remediation](2025_DATA_ISSUE_REMEDIATION.md) — historical issue analysis superseded by the checksum-bound replacement.

## Master-Data and Classification Guides

- [SKU Alias Mapping Plan](SKU_ALIAS_MAPPING_PLAN.md)
- [Non-Medical Product Classification Guide](NON_MEDICAL_PRODUCT_CLASSIFICATION_GUIDE.md)
- [Medical Demand Cleaning Workflow](MEDICAL_DEMAND_CLEANING_WORKFLOW.md)

## Supporting Data Preparation

- [External Data Preparation Guide](EXTERNAL_DATA_PREPARATION_GUIDE.md)
- [Area Summary Backward Allocation](AREA_SUMMARY_BACKWARD_ALLOCATION.md)

## Working Rule

Raw source files must remain immutable. Cleaned, rejected, quarantined, duplicate-candidate, and analytical outputs must be stored separately with source-file and import-batch lineage.
