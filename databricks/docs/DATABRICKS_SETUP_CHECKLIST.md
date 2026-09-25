# Databricks Setup Checklist

Last reviewed: 2026-09-25

## Workspace

- [ ] Verify the Databricks user identity and workspace URL.
- [ ] Select or start the SQL warehouse used by MedShield.
- [ ] Confirm `workspace.medshield_bronze`, `medshield_silver`, `medshield_audit`, and `medshield_gold` exist.
- [ ] Confirm the raw-file Unity Catalog volume exists.
- [ ] Keep tokens out of notebooks, screenshots, Git, and frontend settings.

## Sales restart

- [ ] Upload exactly one controlled source for each year 2017-2025, using the checksum-bound replacement 2025 file.
- [ ] Follow `databricks/sales_restart/README.md` rather than the earlier bundle notebooks.
- [ ] Run `01_sales_bronze.py`, `02_sales_silver.py`, and `03_sales_gold.py` in order.
- [ ] Confirm `PASS_CANDIDATE`/`PASS_CANDIDATE_ONLY` and inspect audit tables.
- [ ] Run `databricks/sql/05_sales_restart_system_bridge.sql`.
- [ ] Confirm nine years, 37,728 accepted transactions, 12 calendar months per year, and zero eligibility reconciliation failures for the current snapshot.

## DOH/PAGASA restart

- [ ] Follow `databricks/external_restart/GUIDE.md`.
- [ ] Keep supplied raw files unchanged.
- [ ] Run setup/copy, Bronze, Silver, and Gold in order.
- [ ] Run `databricks/sql/06_external_restart_system_bridge.sql`.
- [ ] Keep mapping and forecast eligibility false until approved.

## Gateway connection

- [ ] Put host origin, token, and warehouse ID in `backend/.env`.
- [ ] Grant the token identity `CAN USE`, `USE CATALOG`, `USE SCHEMA`, and required `SELECT`/controlled write permissions.
- [ ] Run `npm run databricks:check:dashboard` and `npm run databricks:check:external` from `backend/`.
- [ ] Verify `GET /api/health` reports `source: databricks` and `dashboard_fallback: false`.

## Publication governance

- [ ] Reconcile source, accepted, rejected, duplicate, and excluded populations.
- [ ] Reconcile all estimated 2025 allocation children to their contract parents.
- [ ] Approve finance definitions, canonical SKUs, product scope, buyer/geographic mapping, and external joins.
- [ ] Record dataset IDs, hashes, policy versions, reviewers, and approval dates.
- [ ] Promote stable approved views only after these gates pass.

Technical PASS output is not publication approval.
