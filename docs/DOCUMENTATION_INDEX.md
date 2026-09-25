# Documentation Index and Status Policy

Last audited: 2026-09-25

The repository contains more than 100 Markdown files across product documentation, runbooks, plans, historical evidence, generated outputs, and contributor instructions. They should not all be interpreted as current implementation claims.

## Status meanings

| Status | Meaning |
|---|---|
| Canonical | Current instructions or contracts. Update these whenever behavior changes. |
| Current runbook | Executable workflow for the current Databricks pipeline or application. |
| Controlled reference | Mapping or business reference used by code; derived values still require owner review. |
| Plan or design | Proposed or target behavior. It is not proof that the feature or model is published. |
| Historical evidence | Point-in-time report retained for traceability. Its numbers must not override the current state. |
| Generated output | Reproducible analysis artifact tied to its named input and generation date. |
| Process | Contributor or agent working rules rather than product behavior. |

## Canonical project documents

| Document | Status | Purpose |
|---|---|---|
| [CURRENT_STATE.md](CURRENT_STATE.md) | Canonical | Implemented architecture, data coverage, publication state, and open gates |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Canonical | Scope, data rules, functional requirements, and definition of done |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Canonical | Runtime boundaries and failure behavior |
| [API.md](API.md) | Canonical | Gateway endpoints and Databricks contracts |
| [BUSINESS_DEFINITIONS.md](BUSINESS_DEFINITIONS.md) | Canonical pending named approvals | KPI and analytical definitions |
| [SETUP.md](SETUP.md) | Canonical | Local environment and startup steps |
| [TESTING.md](TESTING.md) | Canonical | Verification commands and acceptance checks |
| [SECURITY.md](SECURITY.md) | Canonical | Authentication, secrets, and trust boundaries |
| [DATABASE.md](DATABASE.md) | Canonical | Databricks analytical store and Supabase identity/audit roles |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Canonical implementation narrative | Current Chapter 4 technical baseline |
| [ANALYTICS.md](ANALYTICS.md) | Canonical analytics status | Published evidence, limitations, and promotion rules |
| [DECISIONS.md](DECISIONS.md) | Canonical | Accepted architecture decisions |

## Current data runbooks

| Document | Status |
|---|---|
| [../databricks/sales_restart/README.md](../databricks/sales_restart/README.md) | Current sales Bronze-Silver-Gold notebook source |
| [../databricks/sales_restart/GUIDE.md](../databricks/sales_restart/GUIDE.md) | Current sales restart operating guide |
| [../databricks/docs/CURRENT_DATABRICKS_SYSTEM_CONNECTION.md](../databricks/docs/CURRENT_DATABRICKS_SYSTEM_CONNECTION.md) | Current gateway/warehouse connection guide |
| [../databricks/external_restart/GUIDE.md](../databricks/external_restart/GUIDE.md) | Current DOH/PAGASA restart guide |
| [../databricks/docs/SALES_RESTART_DASHBOARD_GUIDE.md](../databricks/docs/SALES_RESTART_DASHBOARD_GUIDE.md) | Current Databricks dashboard inspection guide |

## Controlled references

- [MAPPED_CLIENT_REFERENCE.md](MAPPED_CLIENT_REFERENCE.md) contains derived client and LGU mapping candidates used by the current classification logic. It is not evidence that every source account recorded those attributes.
- `datasources/templates/*.csv` contains reviewable mapping inputs.
- [../references/NStar.md](../references/NStar.md) describes the analytical questions and boundaries.
- [../supabase/schema.md](../supabase/schema.md) is a schema snapshot for context, not an executable migration or the analytics runtime source.

## Plans and design documents

Files named `*_PLAN.md`, `*_GUIDE.md`, `*_BLUEPRINT.md`, `*_CHECKLIST.md`, `*_EXPLAINER.md`, or `dashboard-forecast-prototype.md` describe intended methods, acceptance work, or UI/model designs unless a canonical document explicitly marks a capability as implemented. Checkboxes and prose in a plan are not publication approval.

The model and dashboard explainers under `docs/logic/` are methodology references. Their equations and scenarios do not prove that Prophet, XGBoost, EOQ, ROP, MILP, disease regressors, or procurement automation are live.

## Historical evidence

The following remain intentionally point-in-time:

- `docs/reports/**`
- `docs/THESIS_ADVISER_PROGRESS_REPORT_2026-09-04.md`
- `docs/SECTION_8_ACCEPTANCE_EVIDENCE.md`
- `docs/YEAR_SCOPE_ANOMALY_AUDIT.md`
- `databricks/NOTEBOOK_REVIEW_2026-09-04.md`
- `databricks/SALES_SNAPSHOT_RECONCILIATION_2026-09-05.md`
- `databricks/docs/MEDSHIELD_DATABRICKS_SYSTEM_CONNECTION_WALKTHROUGH.md`, which already identifies its superseded 40,086-row pipeline

Branch names, totals, test counts, and open issues in those files describe the date shown. Preserve them for audit history.

## Generated outputs

Everything under `outputs/**` is evidence for the source, policy, and generation date stated in that output. Generated results may use earlier populations such as 2021-2025 or the pre-replacement 37,178-row dataset. Do not edit generated findings to imitate the latest run; regenerate them from the current approved input instead.

## Process documentation

- `AGENTS.md`, `.agents/**`, and `.skills/**` define repository work practices.
- `README.md` is the contributor entry point.
- `references/README.md`, `datasources/README.md`, and `services/analytics_service/jobs/README.md` explain their directory contents.

## Known superseded claims corrected by this audit

- The dashboard analytical source is Databricks, not Supabase or a checked-in snapshot.
- The certified sales scope is 2017-2025; no 2026 MedShield sales actuals are in the current Gold contract.
- Current sales Gold contains 37,728 accepted fact rows for the checksum-bound replacement snapshot, not 37,178 or 40,086.
- NASA POWER is the implemented provider-derived weather proxy. Open-Meteo references describe earlier or optional design work.
- Python services are offline/legacy utilities and are not required by the dashboard runtime.
- Gold objects remain candidates. Technical `PASS` output is not business or model approval.
- Buyer-sector and geographic classifications are derived mappings; their source and confidence must remain visible.

## Maintenance rule

When implementation changes, update `CURRENT_STATE.md` and the affected canonical document in the same change. Add a dated report only when point-in-time evidence is useful. Never resolve a conflict by silently copying old totals into a current document.
