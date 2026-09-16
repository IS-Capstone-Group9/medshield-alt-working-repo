# MedShield Databricks Sales Dashboard

## Purpose

Build a Databricks dashboard from the validated `sales_restart_*_candidate`
tables. The dashboard supports thesis review and data-governance decisions. It
must preserve the population labels in `04_sales_restart_dashboard.sql`.

## Create the dashboard

1. In Databricks, open **SQL > Dashboards**.
2. Select **Create dashboard** and name it `MedShield Sales Analytics — Candidate`.
3. Select the SQL warehouse used for the Gold checks.
4. Open `databricks/sql/04_sales_restart_dashboard.sql` locally. For each numbered
   query, create one dashboard dataset and paste only that query.
5. Name the datasets `01 Executive KPIs` through `09 Source Disposition`.
6. Run each dataset query before adding its visualization. A dataset error must
   be resolved before publishing; do not substitute a table from the old pipeline.

## Suggested layout

| Row | Visual | Dataset | Configuration |
|---|---|---|---|
| 1 | Six counters | 01 Executive KPIs | Transactions, net sales, gross margin, weighted margin, contracts, financial review |
| 2 | Line chart | 02 Monthly Sales Trend | X = month; Y = net sales and gross margin |
| 2 | Bar chart | 03 Yearly Business Sales | X = year; Y = net sales; tooltip = transactions and margin |
| 3 | Horizontal bar | 04 Approved Territory Performance | Category = territory; value = net sales |
| 3 | Stacked bar | 05 Area Classification Coverage | Category = mapping status; series = area type; value = retained records |
| 4 | Donut or bar | 06 Product Scope Composition | Category = product scope; value = transactions |
| 4 | Table | 07 Top Business Product Labels | Show scope beside every source product label |
| 5 | Table | 08 Data Quality Review | Rule and affected records |
| 5 | Stacked bar | 09 Source Disposition | X = source year; series = disposition; Y = source records |

Add a dashboard filter for `calendar_year` to datasets 02, 03 and 09. Territory
performance is aggregated across years in the supplied query; create an
additional year-specific dataset if the reviewer needs that comparison.

## Required dashboard wording

Use this subtitle:

> Candidate business-sales analytics from the MedShield 2017–2025 source files.
> Unresolved identities, product-master approvals and external-data joins remain
> separately governed and visible in the audit outputs.

Use `Net sales` for source `Net CP`, `Acquisition cost` for `Total TP`, and
`Gross margin` for source `Net Income`. Do not label gross margin as company net
profit because operating expenses are unavailable.

## Acceptance checks

Before publishing, confirm:

- Executive transactions equal **37,178** for the current dataset snapshot.
- Area-coverage records sum to **37,178**.
- Approved territory records equal **14,008** under the current inherited approvals.
- Territory-year table contains **41** observed territory/year combinations.
- Missing-observation months display null measures rather than invented zero sales.
- Product scope states that approved medical demand is pending.
- External-data readiness is zero until station, DOH geography and period checks pass.

These counts are checks for the current source snapshot, not permanent constants.
If input files or mapping approvals change, rerun the pipeline and replace the
expected values with the new reconciled outputs.

