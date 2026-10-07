# MedShield descriptive candidate deployment

Canonical notebook package: `databricks/medshield_project`. This replaces the old
`sales_restart` paths without undoing their staged deletion. Nothing here grants
business approval or makes an offline file a dashboard data source.

## Catalog-only deployment sequence

Follow [the exact catalog deployment and rollback runbook](../../docs/CATALOG_DEPLOYMENT.md).
This package prepares Gold v7 and does not activate a release or grant approvals.
The current source is version 16; `CATALOG_BASE_FACT_VERSION=16` protects unchanged
source records and finances before any catalog write. Keep Bronze/Silver unchanged.

1. Capture prior notebook/application revisions, all candidate Delta versions, bridge
   definitions, and mapping hashes. Keep the serving gateway pinned to 16.
2. Upload `product_catalog.py` as a workspace file beside Gold. Upload both header-only
   preparation masters to the configured reference directory and verify their hashes.
3. Run **03 Gold → 04 monthly bridge → 05 system bridge → 06 STL**. Gold must report
   `sales_restart_gold_v7_independent_catalog` and `catalog_v1_independent_evidence`.
4. Against the newly observed candidate fact version, run publication-readiness,
   descriptive validation and catalog validation. Save matching receipts/output versions.
5. Only a later explicit CEO decision bound to that exact release permits controlled
   application activation. Neither local tests nor successful notebooks record approval.

Run Bronze/Silver only if their inputs or logic change under a separately reviewed
rebuild; this catalog-only package intentionally asserts the original source identity.

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
