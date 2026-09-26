# MedShield descriptive candidate deployment

Canonical notebook package: `databricks/medshield_project`. This replaces the old
`sales_restart` paths without undoing their staged deletion. Nothing here grants
business approval or makes an offline file a dashboard data source.

## Deployment sequence

1. Record the deployed notebook revisions, job configuration, current source hashes
   and Delta versions before changes. Serialize this historical rebuild.
2. Upload the reviewed Bronze, Silver and Gold notebooks from this folder. Gold must
   report `sales_restart_gold_v6_reviewed_source_provenance`. Deploy the matching
   reference files to the configured Workspace reference directory. Do not alter
   the historical source files or clear mapping warnings.
3. Run `01_sales_bronze.py`, `02_sales_silver.py`, then `03_sales_gold.py`.
   Gold rejects mislabeled adjusted sources, including the known 2020/2024 hashes.
   Those files contain product-label estimates even though annual finances reconcile.
4. Run `04_sales_restart_monthly_bridge.py` and
   `05_sales_restart_system_bridge.sql`. Run the evidence collector before promotion.
5. Configure numpy and statsmodels in the job environment, record their versions,
   then run `06_sales_stl.py`. It reads a pinned fact version, splits at gaps and
   writes only `workspace.medshield_gold.sales_restart_stl_candidate`.
6. From backend run `node --import tsx scripts/publication-readiness.ts` and
   `node --import tsx scripts/validate-descriptive.ts`. Every required technical
   check must pass. A passing receipt never changes CEO approval status.
7. Configure `DATABRICKS_DESCRIPTIVE_FACT_VERSION` to the reviewed fact Delta version
   and restart the gateway during controlled activation. Without that setting the
   gateway pins the latest fact version at its first read for that process.
   This is a candidate consistency guard, not the final approved-publication workflow.
8. Check actual dates, partial filters, product/area totals, exports and the STL
   panel. Obtain the CEO's release decision against the exact new receipt.

## Permissions and current blocker

The inspected credential can read SQL but Workspace and Jobs reads returned 403
for missing `workspace` and `jobs` scopes. An authorized operator must deploy and
run the job. Token scope and resource ACLs are separate: notebook edit, job manage
(configuration) / manage-run (execution), compatible compute, and Run as catalog,
schema, volume and table privileges must all be configured for the intended objects.
Keep credentials server-side. Do not grant application users Databricks credentials.

## Rollback

Keep prior code, source archives, mapping files and Delta history. Change the
explicit fact-version setting back to a retained previously reviewed version and
restart the gateway; verify all consumers identify that version. STL must match it
or remain unavailable. Restore candidate tables/bridges only through the operator's
recorded runbook; never erase source archives or manufacture approval.

## Local verification

`python -m unittest discover -s databricks/medshield_project/tests`

`python databricks/medshield_project/render_readme.py --check`

The recovered notebook tests exercise the original parser and mapping contracts;
new provenance tests cover original, adjusted and unreviewed hashes. Notebook
syntax/local tests do not prove cloud execution. The generated README contains
exact Bronze/Silver/Gold cells; STL is its separate notebook.

## Remaining boundaries

This is a historical restart, not the new client-upload engine. The batch workflow,
transaction identity, review controls and version-bound approved activation must
be completed before turnover. Product master entries remain pending unless backed
by reviewed identity evidence. Buyer grouping and positive-sales ABC are candidate
policies; financial definitions already approved need no duplicate approval.
