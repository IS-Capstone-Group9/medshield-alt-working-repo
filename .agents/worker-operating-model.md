# Worker Operating Model

## Purpose

This file defines how specialist worker roles are assigned, sequenced, and handed off in any software project. Project-specific files can keep domain language, but the operating model should stay reusable across products, capstones, internal tools, SaaS apps, data platforms, and service integrations.

## Core Principle

Every worker must connect their output to a business outcome, a technical change, a validation method, and an owner for the next step. A worker is not finished when they produce notes; they are finished when their recommendation can be implemented, tested, reviewed, or operated by another role without hidden assumptions.

## Standard Worker Lifecycle

1. Intake
   - Restate the request in concrete business and technical terms.
   - Identify the affected users, systems, data, processes, and constraints.
   - Confirm whether the work is discovery, design, implementation, review, testing, documentation, or operations.

2. Context Review
   - Read project instructions, decisions, requirements, architecture, setup, security, database, testing, and deployment docs before making changes.
   - Inspect the current code, schema, APIs, workflows, and tests touched by the request.
   - Separate facts from assumptions and list anything that must be verified.

3. Impact Analysis
   - Business impact: user value, process impact, acceptance criteria, priority.
   - Architecture impact: boundaries, dependencies, integration points, maintainability.
   - Data impact: schema, data quality, migration, reporting, analytics definitions.
   - Security impact: trust boundaries, auth, authorization, validation, secrets, logging.
   - Operations impact: deployability, observability, support, rollback, runbooks.
   - QA impact: test level, regression scope, acceptance validation.

4. Plan
   - Break the work into ordered steps with owners or responsible worker roles.
   - Identify dependencies, risks, and parallelizable tasks.
   - Define what must be true before implementation starts.
   - Define what evidence will prove the work is complete.

5. Execute
   - Make the smallest maintainable change that satisfies the requirement.
   - Follow existing project patterns before introducing new tools or abstractions.
   - Keep changes traceable to requirements, decisions, defects, or operational needs.

6. Verify
   - Run the lowest useful test layer first, then broader checks when risk requires it.
   - Validate user-facing behavior, API contracts, data outputs, security assumptions, and operational steps.
   - Record any checks that could not be run and the residual risk.

7. Handoff
   - Summarize what changed, why it changed, how it was verified, and what remains.
   - Link affected files, docs, decisions, tests, dashboards, or deployment steps.
   - Name the next responsible worker when follow-up is needed.

## Worker Assignment Matrix

| Situation | Primary Worker | Supporting Workers |
|---|---|---|
| Vague business request, scope, acceptance criteria | Business Analyst | Product Manager, QA Engineer, Architect |
| New feature or user workflow | Orchestrator | Business Analyst, Architect, Frontend Engineer, Backend Engineer, QA Engineer |
| UI, dashboard, interaction, responsive behavior | Frontend Engineer | BI Specialist, Data Analyst, QA Engineer, Accessibility/Security review as needed |
| API, service contract, validation, business logic | Backend Engineer | Architect, Database Engineer, Security Engineer, QA Engineer |
| Schema, migrations, query behavior, warehouse model | Database Engineer | Data Analyst, Backend Engineer, Security Engineer |
| Metrics, KPIs, charts, insight wording | BI Specialist | Data Analyst, Business Analyst, Frontend Engineer |
| Data quality, analytical method, trend interpretation | Data Analyst | BI Specialist, Database Engineer, Business Analyst |
| System structure, boundaries, integration design | Architect | Enterprise Architect, Backend Engineer, Frontend Engineer, Database Engineer |
| Business/application/data/technology alignment | Enterprise Architect | Business Analyst, Architect, Service Manager |
| CI/CD, deployment, environments, rollback | DevOps Engineer | QA Engineer, Security Engineer, Service Manager |
| Threats, secrets, auth, exposure, abuse cases | Security Engineer | Backend Engineer, Database Engineer, DevOps Engineer |
| Test strategy, defects, regression checks | QA Engineer | Frontend Engineer, Backend Engineer, Business Analyst |
| Service levels, support, incidents, change management | Service Manager | DevOps Engineer, Security Engineer, Technical Writer |
| Documentation, setup, runbooks, release notes | Technical Writer | Owning implementation worker, QA Engineer, Service Manager |
| Code review before merge or release | Code Reviewer | Owning implementation worker, Security Engineer, QA Engineer |

## Assignment Rules

- Assign one accountable primary worker for each task. Supporting workers provide input but do not blur ownership.
- Use the Orchestrator when work crosses more than two layers or requires sequencing across roles.
- Use the Business Analyst before implementation when the business goal, user, acceptance criteria, or priority is unclear.
- Use the Architect before implementation when a change affects boundaries, shared contracts, data flow, integration strategy, or maintainability.
- Use the Security Engineer whenever the change touches authentication, authorization, secrets, personal/sensitive data, third-party calls, file upload, logging, or deployment exposure.
- Use the Database Engineer whenever the change touches schema, migrations, seed data, warehouse views, reporting grain, query performance, or data retention.
- Use the QA Engineer before closing work whenever behavior changes, a bug is fixed, or acceptance criteria need proof.
- Use the Technical Writer whenever setup, behavior, architecture, deployment, or operating procedures change.

## Standard Inputs

Each worker should ask for or discover:

- Business goal and success measure.
- Users, roles, and permissions involved.
- Current workflow and desired workflow.
- Affected components, APIs, data sources, integrations, and environments.
- Known constraints, deadlines, risks, and non-goals.
- Existing decisions, standards, and templates that apply.
- Acceptance criteria and verification evidence.

## Standard Outputs

Each worker should produce outputs that another role can act on:

- Business Analyst: requirements, user stories, acceptance criteria, business rules, assumptions.
- Architect: target design, boundaries, tradeoffs, integration notes, decisions.
- Frontend Engineer: typed UI implementation, responsive states, accessibility notes, UI tests where useful.
- Backend Engineer: validated endpoints, service logic, error handling, contract updates, tests.
- Database Engineer: migrations, schema notes, data impact, performance considerations.
- Data Analyst: data profile, metric definitions, limitations, insights, recommendations.
- BI Specialist: dashboard layout, KPI definitions, chart logic, decision-support narrative.
- Security Engineer: risk-ranked findings, threat notes, remediation steps, control assumptions.
- QA Engineer: test plan, executed checks, defects, regression coverage, acceptance evidence.
- DevOps Engineer: pipeline changes, environment notes, deployment and rollback steps.
- Service Manager: support model, incident/change guidance, service targets, runbook needs.
- Technical Writer: current docs, setup instructions, release notes, runbooks.
- Code Reviewer: blocking findings, non-blocking suggestions, missing tests, residual risk.
- Orchestrator: ordered plan, dependency map, milestone status, final integration summary.

## Definition of Ready

Work is ready to implement when:

- The user or business objective is clear.
- Acceptance criteria are testable.
- The affected layers and owners are known.
- Key data, security, and architecture risks have been reviewed.
- Required dependencies, environment variables, migrations, or external services are identified.
- The verification approach is defined.

## Definition of Done

Work is done when:

- The requested behavior or document update exists in the repository.
- The implementation follows the project stack and local patterns.
- Relevant tests, builds, lint checks, or manual verification have been run.
- Business, architecture, data, security, analytics, and operations impacts are either addressed or explicitly marked as not applicable.
- Documentation is updated when setup, behavior, architecture, deployment, or support flow changes.
- Remaining risks or follow-ups are stated plainly.

## Handoff Template

Use this structure for worker-to-worker handoffs:

```text
Context:
Decision or change:
Files or systems affected:
Business impact:
Technical impact:
Data impact:
Security impact:
Verification performed:
Open risks:
Next worker:
```

## Conflict Resolution

When worker recommendations conflict:

1. Prefer documented project decisions over undocumented preference.
2. Prefer user/business value over isolated technical preference.
3. Prefer maintainability and testability over short-term convenience.
4. Prefer security and data integrity over speed when sensitive data or trust boundaries are involved.
5. Escalate to the Orchestrator and Architect when the conflict changes scope, architecture, or delivery risk.

## Reuse Guidance

To use this model in another project:

1. Keep this file mostly unchanged.
2. Replace project-specific domain language in individual worker files.
3. Update the technology stack, canonical docs, source-of-truth data, deployment path, and quality gates.
4. Keep the same lifecycle, assignment rules, definition of ready, definition of done, and handoff template.
