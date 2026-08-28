# Group Task Assignment Plan

## Purpose

This plan splits the remaining MedShield capstone work across four group members. The goal is to finish the historical decision-support system, keep the paper aligned with the implementation, and produce evidence that can be defended in Chapter 4 and Chapter 5.

## Delivery Rules

| Rule | Required action |
|---|---|
| One owner per task | Each workstream has one accountable owner even when others help. |
| Work from source documents | Use `docs/BUSINESS_DEFINITIONS.md`, `docs/SKU_ALIAS_MAPPING_PLAN.md`, `docs/2025_DATA_ISSUE_REMEDIATION.md`, and `docs/NORTH_STAR_EXECUTION_BLUEPRINT.md` before changing logic. |
| Keep raw data separate | Put raw uploads in `data/medshield/raw/`; generated cleaned files belong in `data/medshield/processed/` or `outputs/`. |
| Historical only | The system should be described as historical decision-support, not live forecasting or alerting. |
| Every output needs evidence | Screenshots, CSV summaries, QA reports, model metrics, and limitations must be saved for Chapter 4. |
| No secrets in Git | Supabase keys, SonarQube tokens, and AWS credentials stay in `.env` or provider settings only. |

## Member 1: Project Lead, Business Analyst, and Paper Owner

Primary outcome: the paper, business rules, and system scope are approved and consistent.

| Task | Specific work | Files or outputs | Acceptance criteria |
|---|---|---|---|
| Approve business definitions | Confirm the meaning of `net_income`, product, medicine, equipment, contract-name `#` rows, 2025 partial data, and duplicate SKU handling. | `docs/BUSINESS_DEFINITIONS.md`, `docs/BUSINESS_RULES_APPROVAL_CHECKLIST.md` | Every decision has an approved definition, limitation, and owner. |
| Revise Chapter 1 to Chapter 3 | Align the paper with CRISP-DM as the overall lifecycle and SEMMA inside analytics/modeling. State that the system is historical decision-support. | Paper draft, `docs/CHAPTER_3_METHODOLOGY_GUIDE.md` | Methodology matches the actual system and does not promise live alerts. |
| Build Chapter 4 evidence list | Track what screenshots, CSVs, model outputs, and reconciliation reports must appear in Chapter 4. | `docs/CHAPTER_4_5_EVIDENCE_PLAN.md`, `outputs/` | Evidence list maps each requirement to a generated artifact. |
| Draft Chapter 5 | Summarize conclusions, limitations, recommendations, future work, and deployment/maintenance notes. | `docs/drafts/MedShield_Chapter_4_5_Draft.docx` | Chapter 5 conclusions are supported only by actual Chapter 4 outputs. |
| Final integration review | Check that documentation, dashboard labels, and oral defense story use the same terms. | Review notes in `docs/` | No mismatch between paper, dashboard, and data definitions. |

## Member 2: Data Analyst and Modeling Owner

Primary outcome: the datasets and model outputs are clean, reproducible, and defensible.

| Task | Specific work | Files or outputs | Acceptance criteria |
|---|---|---|---|
| Sales data QA | Verify yearly sales rows, missing products, missing area allocations, invalid dates, duplicate rows, and totals after contract-name breakdown. | `data/medshield/raw/sales/`, `data/medshield/processed/`, `outputs/` | Clean sales totals reconcile to source totals by year. |
| Contract-name breakdown | Maintain the semi-raw layer where `#` contract names are allocated backward into estimated product rows. | `docs/SALES_DATA_LAYER_FLOW.md`, generated sales CSVs | Breakdown rows are documented and total value remains unchanged. |
| Product master and SKU aliases | Fill duplicate product/SKU mapping using controlled aliases. | `datasources/templates/product_master_mapping.csv`, `docs/SKU_ALIAS_MAPPING_PLAN.md` | Dashboard and model logic use one canonical product identity. |
| DOH and PAGASA preparation | When uploaded, clean DOH 2021-2025 and PAGASA 2021-2024 into consistent historical CSVs with source/provenance columns. | `data/medshield/raw/`, cleaned external CSVs, `docs/EXTERNAL_DATA_PREPARATION_GUIDE.md` | Every external row has date, geography, metric fields, source, and notes. |
| Model computation | Run model jobs only from cleaned/published data. Save metrics and charts for Chapter 4. | `docs/MODEL_COMPUTATION_START_REPORT.md`, model outputs | Outputs include method, parameters, period covered, metrics, and limitations. |

## Member 3: Backend, Database, and API Owner

Primary outcome: the API and database layer reliably serve the dashboard and model outputs.

| Task | Specific work | Files or outputs | Acceptance criteria |
|---|---|---|---|
| API gateway check | Verify backend routes return stable JSON for dashboards, sales uploads, weather validation, and model outputs. | `backend/src/`, `docs/API.md` | Frontend talks to the TypeScript gateway, not directly to Python services. |
| Python service boundary | Keep analytics and product logic inside the Python services and document health endpoints. | `services/analytics_service/`, `services/product_service/` | Services can run independently and through Docker Compose. |
| Supabase schema alignment | Confirm migrations support staging, facts, external signals, DSS outputs, model registry, and ETL lineage. | `supabase/migrations/`, `docs/DATABASE.md` | Schema matches the paper and dashboard data flow. |
| Data publication logic | Ensure cleaned sales and model outputs can be published without overwriting unrelated history. | `services/data_pipeline.py`, processing tools | Year replacement and fallback behavior are documented and tested. |
| Backend validation | Add or update tests when API behavior changes. | `backend/`, `services/tests/` | Build and tests pass before handoff. |

## Member 4: Frontend, BI, QA, and DevOps Owner

Primary outcome: the system is professional, scannable, testable, and repeatable to run.

| Task | Specific work | Files or outputs | Acceptance criteria |
|---|---|---|---|
| Dashboard cleanup | Keep dashboard screens compact, reduce wordy cards, make Power BI/dashboard evidence easy to distinguish, and prioritize KPI/charts over explanation text. | `frontend/` | Screens are readable on laptop/mobile and support Chapter 4 screenshots. |
| BI evidence screenshots | Capture sales dashboard, cleaned data summary, contract breakdown, product mapping, external data readiness, and model output views. | `outputs/`, paper screenshots | Each screenshot has a caption and related requirement. |
| QA regression | Run frontend build, backend build, service tests, Docker config checks, and manual dashboard smoke test. | `docs/TESTING.md`, terminal evidence | Failed checks are fixed or documented with reason. |
| Docker setup | Maintain local containers for frontend, backend, analytics service, and product service. | `docker-compose.yml`, Dockerfiles | `docker compose up` starts the stack locally. |
| SonarQube quality gate | Run local SonarQube scan and record major findings before final defense. | `docker-compose.sonar.yml`, `sonar-project.properties` | Scanner completes after token setup and critical issues are triaged. |

## Weekly Workflow

| Day or phase | Owner | Work |
|---|---|---|
| Day 1 | Member 1 | Confirm approved business definitions and update Chapter 1 to Chapter 3 scope. |
| Day 1-2 | Member 2 | Rebuild clean sales data, product mapping, and QA summaries. |
| Day 2-3 | Member 3 | Verify backend, service, and database paths against the cleaned data outputs. |
| Day 3-4 | Member 4 | Update dashboard screens, run Docker/Sonar setup, and collect screenshots. |
| Day 4-5 | All | Review Chapter 4 evidence and check that every claim has a matching artifact. |
| Final day | Member 1 | Merge paper revisions and prepare oral defense flow. |

## Branch and Handoff Workflow

| Step | Command or action |
|---|---|
| Update local branch | `git checkout feature/flow` then `git pull` |
| Make task changes | Work only in assigned files unless coordination is needed. |
| Validate | Run the commands listed in `docs/DEVOPS_DOCKER_SONARQUBE.md` and `docs/TESTING.md`. |
| Commit | Use a clear message such as `docs: add group task assignment plan`. |
| Push | Push to `feature/flow` so groupmates can clone or pull the same workspace. |
| Handoff | State changed files, validation performed, open risks, and next owner. |

## Immediate Priorities

1. Approve the business rules checklist before changing model logic.
2. Finish product/SKU alias mapping before final dashboard screenshots.
3. Upload and clean DOH/PAGASA/weather data into the raw and cleaned folders.
4. Run model jobs from the cleaned historical dataset only.
5. Use Docker Compose and SonarQube to prove the system can run and be quality-checked repeatably.
