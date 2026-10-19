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
| [Revised Chapters 4–5](chapters/MedShield_Chapter_4_5_Revised_20261016.md) | Working chapter revision, 16 October; sector update 19 October 2026 | Source-backed results, sector bridge and nested diagnostic findings, five-objective conclusions; [sector evidence](../outputs/sector_diagnostic_20261019/FINDINGS.md) and [original revision record](../outputs/paper_revision_20261016/REVISION_RECORD.md); complete-paper/Word integration and formal acceptance remain open |
| [STUDY_OVERVIEW.md](STUDY_OVERVIEW.md) | Current study overview, 9 October 2026 | Business problem, original objectives, data, methods, findings and limits |
| [CAPSTONE_COMPLETION_WORKFLOW.md](CAPSTONE_COMPLETION_WORKFLOW.md) | Current completion workflow, reviewed 19 October 2026 | System decision flow, analytical input rules, O1–O5 method/result/conclusion map and ordered evidence/paper handoffs; source authority and distinct acceptance gates retained; Obsidian is its working navigation view |
| [Predictive Chapter 4 and 5 research draft](chapters/MedShield_Predictive_Chapter_4_5_Research_Draft_20261010.docx) | Predictive manuscript insert, 10 October 2026 | Complete model comparison, error policy, 2026 projection timing, conclusions and open requirements; wider manuscript integration pending |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Canonical | Scope, data rules, functional requirements, and definition of done |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Canonical | Runtime boundaries and failure behavior |
| [API.md](API.md) | Canonical | Gateway endpoints and Databricks contracts |
| [BUSINESS_DEFINITIONS.md](BUSINESS_DEFINITIONS.md) | Canonical pending named approvals | KPI and analytical definitions |
| [SETUP.md](SETUP.md) | Canonical | Local environment and startup steps |
| [TESTING.md](TESTING.md) | Canonical | Verification commands and acceptance checks |
| [SECURITY.md](SECURITY.md) | Canonical | Authentication, secrets, and trust boundaries |
| [DATABASE.md](DATABASE.md) | Canonical | Databricks analytical store and Supabase identity/audit roles |
| [Schema documentation snapshot](../outputs/schema_documentation_20261017/README.md) | Dated structural evidence, 17 October 2026 | Read-only catalog metadata, source inventories and connected Obsidian field dictionaries/relationship maps; later rollout evidence may supersede this snapshot |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Canonical implementation narrative | Current Chapter 4 technical baseline |
| [ANALYTICS.md](ANALYTICS.md) | Canonical analytics status | Published evidence, limitations, and promotion rules |
| [PREDICTIVE_OPERATIONS.md](PREDICTIVE_OPERATIONS.md) | Current predictive runbook | Frozen offline evaluation, candidate storage, review and publication workflow |
| [logic/PREDICTIVE_ANALYTICS_EXPLAINER.md](logic/PREDICTIVE_ANALYTICS_EXPLAINER.md) | Predictive methodology reference | Executed models, time-ordered evaluation, error interpretation and paper wording; not release approval |
| [DECISIONS.md](DECISIONS.md) | Canonical | Accepted architecture decisions |

## Current data runbooks

| Document | Status |
|---|---|
| [../databricks/medshield_project/README.md](../databricks/medshield_project/README.md) | Canonical notebook package and bounded catalog deployment/rollback guidance; dated preparation is not current activation proof |
| [../databricks/medshield_project/GUIDE.md](../databricks/medshield_project/GUIDE.md) | Project notebook operating guide; check current source identities and publication gates before a run |
| [API.md](API.md), [SETUP.md](SETUP.md), [CURRENT_STATE.md](CURRENT_STATE.md) | Gateway/warehouse configuration, serving contracts and dated current evidence |

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
- [Project memory](PROJECT_MEMORY.md) defines the local Obsidian progress map, four workstreams, per-turn records, and optional lifecycle capture; canonical project contracts and acceptance evidence remain authoritative.
- [Analytics lesson review](../lessons/REVIEW.md) assesses the five course decks for helper/agent learning, including corrected examples and review limits; it is educational reference, not a runtime contract.
- [Analytics Learning Coach](../.agents/analytics-learning-coach.md) and [coaching skill](../.skills/analytics-lesson-coaching/SKILL.md) define applied lesson practice and evaluation responsibilities.
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

The [17 October analytics completion assessment](ANALYTICS_COMPLETION_ASSESSMENT_20261017.md)
defines a proposed 40-checkpoint delivery rubric and evidence/demonstration map.
Its percentages are planning assessments, not model accuracy or formal original-objective acceptance.
An [eight-page Word report and verification record](../outputs/analytics_completion_20261017/README.md)
package the same scores and all 40 checkpoints for stakeholder discussion.

The [17 October analytics progress and chart guide](ANALYTICS_PROGRESS_CHART_GUIDE_20261017.md)
supports the [presentation and editable reading guide](../outputs/analytics_progress_20261017/README.md).
This is a dated stakeholder snapshot of Databricks, analytical progress and chart interpretation;
canonical definitions and later evidence retain authority. It records no new source/model approval.

When implementation changes, update `CURRENT_STATE.md` and the affected canonical document in the same change. Add a dated report only when point-in-time evidence is useful. Never resolve a conflict by silently copying old totals into a current document.
