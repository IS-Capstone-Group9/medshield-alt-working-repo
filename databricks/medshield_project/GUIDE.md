# MedShield descriptive candidate deployment

Canonical notebook package: `databricks/medshield_project`. This replaces the old
`sales_restart` paths without undoing their staged deletion. Nothing here grants
business approval or makes an offline file a dashboard data source.

## Current warehouse check — 20 October 2026

The serving fact is Delta 20 on `sales_restart_gold_v7_independent_catalog`, with
37,728 unique accepted records and the current mapping/catalog identities.
The five inspected serving view definitions match this package; STL has 72
source-matched 2020–2025 months, and the current research run retains 21 models
bound to fact 20. The study remains 2017–2025. Recent sector/context/UI changes
are implemented in the gateway/frontend and do not require rebuilding 01/02/03.

One derived-mart mismatch remains: 81 rate cells across four aggregate marts
have a margin percentage despite a negative matching revenue basis. The local
`with_margin_rate` guard now requires a positive basis. The
[targeted maintenance patch](maintenance/MARGIN_RATE_PATCH.md) is prepared,
with exact version/count drift guards, read-only previews and immutable-field
readback checks; it has **not** been applied remotely. Signed financial amounts,
fact 20 and frozen model inputs remain unchanged. See the
[warehouse review](../../outputs/warehouse_review_20261020/README.md) for actual
verification and limits. Notebook source bytes could not be exported with the
current token; table/view/run readback is the evidence for currency.

The category-only sequence below records the historical predecessor 19→20
publication procedure. Its bound descriptor is not an instruction to replay it
against the now-serving 20 baseline. A future source/category rebuild needs its
own current predecessor capture, review and publication evidence.

## Catalog-only deployment sequence

Follow [the exact catalog deployment and rollback runbook](../../docs/CATALOG_DEPLOYMENT.md).
This package prepares Gold v7 and does not activate a release or grant approvals.
The prepared source is fact version **19**. `references/catalog_publication.json`
binds its identity, 29 dependency versions and all 137 immutable fact fields.
The category-only mode accepts 1,584 supported known classifications and 2,977
explicit Unclassified reporting dispositions. SKU/unit/forecast review remains
pending. Exactly seven category/publication metadata fields may change; every
financial/source/quality/quantity/demand field stays immutable. The local package
is marked not ready for execution until operator recovery preparation is complete.
Keep Bronze/Silver unchanged for this category-only metadata publication.

The 9 October Gold correction validates preserved provisional demand against the
predecessor's original pending scope. Accepted current reporting scopes remain
receipt-bound; all 137 immutable fields are still compared in both directions.
Use the corrected Gold source, not the earlier 8 October ZIP's Cell 3 guard.

The uploaded 9 October export is saved at `databricks/medshield_project_backup`.
Compared with that export, replace only the deployed `03_sales_gold` notebook
and `references/catalog_publication.json` with this directory's current files.
The other sales/external analytical code, helpers and category receipt match.
`06_sales_stl.py` now retains the exported serverless environment version 6 and
`statsmodels` dependency; its analytical code is unchanged. Leave the backup intact.
Verify the separate `medshield_reference_csv` uploads because the export does not
include them. Run Gold Cells 1–3 first, then Cells 4–6 for dimension/mart checks.
These cells are read-only; Cell 7 writes the candidate tables and requires the
runbook's recovery and maintenance prerequisites. Do not rerun 01/02 for this fix.

1. Capture prior notebook/application revisions, all candidate Delta versions, bridge
   definitions, and mapping hashes. Keep the serving gateway pinned to 19.
2. After the runbook preflight is complete, upload `product_catalog.py` and
   `catalog_publication.py` as workspace files beside Gold, and the bound contract
   to `medshield_project/references/catalog_publication.json` and the exact category
   receipt to `medshield_project/references/category_acceptance.json`. Upload the
   accepted-category product master and unchanged transaction-evidence master to the reference
   directory and verify their exact hashes.
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
