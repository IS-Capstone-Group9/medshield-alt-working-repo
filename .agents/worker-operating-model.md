# Worker Operating Model

Select one accountable role for the outcome. The [execution contract](execution-contract.md) owns the shared lifecycle, skill loading, delegation, verification, and handoff. Read the selected role and its required skills, then add specialist guidance for the affected boundaries.

## Worker Assignment Matrix

| Outcome | Primary role | Supporting expertise when needed |
|---|---|---|
| Clarify an unclear business goal, scope, or acceptance | [Business Analyst](business-analyst.md) | QA, Architect |
| Integrate changes across more than two layers, dependent owners, or release gates | [Orchestrator](orchestrator.md) | Owners of each affected layer |
| Dashboard UI, interaction, layout, or accessibility | [Frontend Engineer](frontend-engineer.md) | BI, QA, Security |
| API, service contracts, validation, or business logic | [Backend Engineer](backend-engineer.md) | Database, Security, QA |
| Schema, warehouse model, migrations, or query behavior | [Database Engineer](database-engineer.md) | Backend, Data Analysis, Security |
| Metric presentation, KPIs, charts, or insight wording | [BI Specialist](bi-specialist.md) | Data Analysis, Frontend |
| Data quality, analytical methods, calculations, or trends | [Data Analyst](data-analyst.md) | Database, BI |
| System boundaries, interfaces, or integration design | [Architect](architect.md) | Affected implementation owners, Security |
| Cross-domain business, application, data, or technology alignment | [Enterprise Architect](enterprise-architect.md) | Architect, Service Management |
| CI/CD, environments, deployment, or rollback | [DevOps Engineer](devops-engineer.md) | QA, Security, Service Management |
| Threats, authorization policy, secrets, or data exposure | [Security Engineer](security-engineer.md) | Backend, DevOps, QA |
| Reproduction, test strategy, or regression evidence | [QA Engineer](qa-engineer.md) | Affected implementation owners |
| Incidents, service levels, operations, or support flow | [Service Manager](service-manager.md) | DevOps, Security, Technical Writing |
| Documentation, runbooks, setup, or agent instructions | [Technical Writer](technical-writer.md) | Owning specialist, QA |
| Analytics lesson review, helper coaching, or lesson-based evaluation | [Analytics Learning Coach](analytics-learning-coach.md) | Data Analysis, Technical Writing, QA |
| Independent review of a scoped diff | [Code Reviewer](code-reviewer.md) | Owning specialist, QA, Security |

## Assignment Rules

- Keep a bounded task with its specialist. Use the Orchestrator when implementation crosses more than two layers or requires sequencing across owners. Reading another layer's contract alone does not expand ownership.
- Clarify unclear goals with Business Analysis before implementation. Apply Architecture to shared contracts and boundaries, Security to trust boundaries or sensitive data, and Database to schema, migrations, grain, or query changes.
- Apply QA to changed behavior and Technical Writing to changed public contracts, setup, behavior, or operations. A specialist can apply supporting guidance in the same turn. Separate workers need a scoped assignment and the expected evidence defined in the [execution contract](execution-contract.md#assignment-and-handoff-record).
- Agree shared contracts before parallel implementation. Resolve disagreements using canonical decisions, user value, maintainability, and security/data integrity. Escalate scope, architecture, or delivery conflicts to the accountable owner and relevant specialist.
- Keep business, academic, release, and analytical publication approvals with the authorities named in canonical guidance.
