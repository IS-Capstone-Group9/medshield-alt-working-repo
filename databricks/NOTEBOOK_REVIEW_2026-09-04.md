# MedShield Databricks notebook review

## Overall assessment

Status: **Ready for a controlled Databricks clean run; not yet production
approved.**

The exported notebooks were not reproducible from a fresh session because
Notebook 10 consumed a medical-demand table that was created only near the end
of Notebook 11. The revised package removes that circular dependency by adding
`09A_MEDICAL_DEMAND_GOVERNANCE` between integration and feature engineering.

## Scope reviewed

- 15 exported Databricks Python notebooks and their cell boundaries
- sales CSV files for 2017 through 2025
- DOH workbooks and PAGASA source assets included in the export
- the 330-row non-medical product candidate reference
- table reads/writes, candidate/production naming, temporal feature logic, and
  model-selection flow

## Material fixes

1. Added the missing closing parenthesis in `01_PAGASA_BRONZE`.
2. Split the PAGASA package installation from its Python ingestion code so the
   cells execute correctly in sequence.
3. Removed exact duplicate cells from Sales Silver, Sales Gold, and Notebook
   10.
4. Removed temporary Delta history and production restore cells from Notebook
   10.
5. Created `09A_MEDICAL_DEMAND_GOVERNANCE` from the product-scope, returns,
   quantity-policy, and publication logic that had been appended after model
   evaluation in Notebook 11.
6. Reduced Notebook 11 to model input validation, chronological evaluation,
   governed selection, MIMAROPA sales-only evaluation, and candidate output
   publication.
7. Changed Notebook 10 and Notebook 11 to consume and publish `_candidate`
   feature/model tables.
8. Replaced user-email-specific workspace paths with paths based on
   `current_user()`.
9. Replaced key fixed 2017–2025 spine and date-dimension assumptions with
   bounds derived from available source data.
10. Added candidate model metrics, fit, decision, and selected holdout
    prediction tables in Notebook 11.
11. Added source-year-priority reconciliation after duplicate disposition in
    Sales Silver. Repeated historical snapshot rows are excluded, changed
    restatements are routed to review, unmatched historical rows remain
    labelled backfill candidates, and Gold carries the reconciliation lineage.

## Data-quality evidence

- Original export: 182 ZIP entries, 167 files, 15 notebooks, and no empty
  files.
- Revised package: 16 notebooks after adding Notebook 09A.
- Static validation: 164 executable Python cells parsed successfully; zero
  syntax failures.
- Duplicate-cell validation: zero exact duplicate cells remain.
- Product reference: 330 rows and 330 normalized unique product values.
- All 330 product-reference records remain `needs_review` and
  `forecast_eligible=false`; no automatic medical approval was introduced.

## Analytical fitness

- **Descriptive:** governed full sales, dimensions, marts, quality views, and
  region/source coverage are retained.
- **Predictive:** a separate positive-delivered medical-demand candidate is
  used, returns are separated, 2017 is excluded, features are lagged, splits
  are chronological, and external signals remain challengers.
- **Prescriptive:** intentionally deferred. The current export lacks governed
  inventory position, supplier lead time, service-level target, and cost inputs
  required for defensible reorder or allocation decisions.

## Remaining validation gap

This computer does not have the Databricks Spark runtime or access to the
workspace Unity Catalog. Therefore, table-level counts, schemas, Delta writes,
and model results must be validated by running the package in Databricks using
the included `RUN_ORDER.md`. Any failed assertion blocks downstream execution.

Product-master approval remains the principal governance blocker for promoting
medical-demand, feature, and model candidate tables to production names.

The 2026-09-05 clean run also identified historical 2018 transactions repeated
inside the 2019 report. The revised Silver and Gold notebooks must be rerun and
pass the snapshot-reconciliation gate before downstream integration is
considered validated. See `SALES_SNAPSHOT_RECONCILIATION_2026-09-05.md`.
