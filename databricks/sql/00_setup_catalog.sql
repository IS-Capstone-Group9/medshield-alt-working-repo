-- MedShield development schemas for Databricks Free Edition.
-- Change `workspace` consistently if you use another catalog.

CREATE SCHEMA IF NOT EXISTS workspace.medshield_bronze;
CREATE SCHEMA IF NOT EXISTS workspace.medshield_silver;
CREATE SCHEMA IF NOT EXISTS workspace.medshield_audit;
CREATE SCHEMA IF NOT EXISTS workspace.medshield_gold;

CREATE VOLUME IF NOT EXISTS workspace.medshield_bronze.raw_files
COMMENT 'Immutable MedShield source files. Upload sales CSVs under the sales/ directory.';
