# MedShield Databricks Data-Cleaning Project

This folder is the source-controlled Databricks workspace for cleaning the MedShield 2017–2025 sales CSV files. It contains the notebooks, reusable PySpark modules, SQL checks and views, job definition, tests, and supporting documentation needed to implement the Bronze → Silver → Gold workflow.

## Project Layout

```text
databricks/
├── databricks.yml                 # Declarative Automation Bundle entry point
├── resources/                     # Lakeflow Job definitions
├── notebooks/                     # Thin, ordered Databricks notebook entry points
├── src/medshield_etl/             # Reusable PySpark cleaning implementation
├── sql/                           # Setup, validation, and compatibility SQL
├── tests/                         # Local contract and transformation tests
├── docs/                          # All dataset and data-cleaning documentation
└── pyproject.toml                 # Local development and test configuration
```

## How This Maps to Your Current Workspace

Your screenshot shows:

- a Git folder named `medshield_project` under **Repos**;
- separate `BRONZE LAYER`, `SILVER LAYER`, and `GOLD LAYER` notebooks under your user workspace;
- all nine CSV files from 2017 through 2025 under `medshield_project_csv`;
- serverless notebook compute.

Keep the repository as the source of truth. Use the notebooks in this folder instead of maintaining separate blank notebooks with spaces in their names. Upload the CSVs to a Unity Catalog volume rather than storing the long-term source copy beside notebooks.

## Target Unity Catalog Layout

The starter uses the `workspace` catalog by default:

```text
workspace.medshield_bronze.raw_files          # Unity Catalog volume
workspace.medshield_bronze.sales_raw_lines    # Immutable raw lines and lineage
workspace.medshield_silver.sales_staging      # Source-version-mapped raw fields
workspace.medshield_silver.sales_clean        # Standardized approved records
workspace.medshield_audit.sales_quarantine    # Rejected and duplicate candidates
workspace.medshield_audit.pipeline_runs       # Batch reconciliation results
workspace.medshield_gold.sales_monthly_candidate    # Monthly candidate aggregate
workspace.medshield_gold.sales_by_product_candidate # Product candidate aggregate
workspace.medshield_gold.sales_by_area_candidate    # Area candidate aggregate
```

Raw CSV upload destination:

```text
/Volumes/workspace/medshield_bronze/raw_files/sales/
```

## First-Time Setup in Databricks

1. Open the Git-backed `medshield_project` folder under **Repos**.
2. Pull or upload this repository so the `databricks/` folder is visible there.
3. Open and run [`notebooks/00_setup.py`](notebooks/00_setup.py) using serverless compute.
4. In **Catalog**, open `workspace.medshield_bronze.raw_files`.
5. Create or open its `sales` directory and upload:
   - `medshield_data_2017.csv`
   - `medshield_data_2018.csv`
   - `medshield_data_2019.csv`
   - `medshield_data_2020.csv`
   - `medshield_data_2021.csv`
   - `medshield_data_2022.csv`
   - `medshield_data_2023.csv`
   - `medshield_data_2024.csv`
   - `medshield_data_2025.csv`
6. Run the notebooks in numerical order for the first controlled test.
7. Compare the results from `05_validate.py` with the known issues in [`docs/MEDSHIELD_CSV_DATA_CLEANING_PLAN.md`](docs/MEDSHIELD_CSV_DATA_CLEANING_PLAN.md).

Do not edit the uploaded raw CSVs. Correct data by changing version-controlled rules or reference mappings and rerunning with a new batch ID.

## Notebook Order

| Notebook | Purpose |
|---|---|
| `00_setup.py` | Create the four schemas and raw-file volume. Run manually once per environment. |
| `01_bronze.py` | Ingest every CSV as immutable source lines with file and batch lineage. |
| `02_stage.py` | Locate each source header and map year-specific positions to named raw fields. |
| `03_clean_quality.py` | Standardize types and values, detect issues and duplicates, and split clean from quarantine. |
| `04_gold.py` | Rebuild candidate monthly, product, and area aggregates for review. |
| `05_validate.py` | Reconcile row counts and assert publication gates. |

## Run as a Databricks Job

The bundle defines one sequential five-task job. There is intentionally no automatic schedule yet; schedule it only after the first batch reconciles successfully.

From a machine with the current Databricks CLI configured:

```powershell
cd databricks
databricks bundle validate
databricks bundle deploy -t dev
databricks bundle run medshield_cleaning -t dev
```

You can also create or deploy the bundle from inside the Databricks Git folder using the workspace deployment panel.

## Local Validation

Databricks provides Spark at runtime. For local tests, install the optional development dependencies:

```powershell
cd databricks
uv sync --extra dev
uv run python -m unittest discover -s tests -v
uv run python -m compileall src notebooks
```

## Configuration

The job accepts these parameters:

| Parameter | Default | Meaning |
|---|---|---|
| `catalog` | `workspace` | Unity Catalog catalog containing the four MedShield schemas. |
| `import_batch_id` | Databricks job run ID | Stable ID used for lineage and idempotency. |
| `year_min` | `2017` | Minimum accepted delivery year. |
| `year_max` | `2025` | Maximum accepted delivery year. |
| `financial_tolerance` | `0.02` | Peso tolerance used for row-level financial checks. |

Change environment defaults in [`databricks.yml`](databricks.yml). Do not hard-code credentials, workspace tokens, or Supabase keys in notebooks, SQL files, bundle configuration, or `.mcp_servers.json`.

## Data Rules Already Encoded

- 2017 two-row header and its two quantity candidates;
- 2018 column order and eight trailing padding columns;
- distinct 2019 gross `TOTAL CP` and net `TotalCP` positions;
- 2020 records without a source margin percentage;
- shared 2021–2025 layout;
- explicit date formats and 2017–2025 range validation;
- null preservation instead of silently inventing financial zeroes;
- missing required fields and spreadsheet error values;
- source-year versus delivery-year mismatch warnings;
- exact duplicate candidates using a business hash;
- row-level financial relationship checks;
- clean, warning, rejected, and duplicate disposition;
- file, line, checksum, batch, and record lineage.

## Important Free Edition Notes

- Use serverless compute; custom compute configuration is unavailable in Free Edition.
- The account has limited quotas and no SLA, so keep tasks sequential and avoid unnecessary full reruns.
- A Free Edition account supports at most five concurrent job tasks; this project uses five sequential tasks.
- Verify your identity if the workspace offers it, but do not assume that verification removes all Free Edition limits.
- Keep a local/Git copy of code and documentation because inactive Free Edition accounts may eventually be removed.

## Documentation

Start with [`docs/README.md`](docs/README.md), then read the [Databricks workflow](docs/DATABRICKS_DATA_CLEANING_WORKFLOW.md) and the [CSV cleaning plan](docs/MEDSHIELD_CSV_DATA_CLEANING_PLAN.md).

## Official Databricks References

- [Free Edition limitations](https://docs.databricks.com/aws/en/getting-started/free-edition-limitations)
- [Work with files in Unity Catalog volumes](https://docs.databricks.com/aws/en/volumes/volume-files)
- [Create and deploy a bundle in the workspace](https://docs.databricks.com/aws/en/dev-tools/bundles/workspace-tutorial)
- [Bundle configuration](https://docs.databricks.com/aws/en/dev-tools/bundles/settings)
- [Medallion architecture](https://docs.databricks.com/aws/en/lakehouse/medallion)
