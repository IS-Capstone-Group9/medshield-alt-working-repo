# Technology Stack Standards

## Description
This file summarizes the documented stack for the MedShield capstone. Use it to keep implementation choices aligned across frontend, backend, database, deployment, and observability work. The stack supports pharmaceutical sales analysis, territory performance, product prioritization, and inventory decision support. Read [architecture](../docs/ARCHITECTURE.md) and [decisions](../docs/DECISIONS.md) for authoritative boundaries, [setup](../docs/SETUP.md) for environment requirements, and [current state](../docs/CURRENT_STATE.md) for dated readiness and acceptance evidence. Check package manifests before introducing dependencies.

## Canonical Stack

### Frontend
- Next.js App Router in `frontend/`
- React
- TypeScript
- CSS variables and responsive layout

### Backend
- Express/TypeScript API gateway in `backend/`
- Authentication checks, request validation, bounded Databricks queries, caching, and provider refresh orchestration
- Python jobs, model experiments, and tests under `services/` run offline; Flask is not a dashboard runtime dependency

### Database
- Databricks Unity Catalog for Bronze source evidence, Silver assessed data, Gold candidate analytics, and stable SQL bridge views
- Supabase PostgreSQL for application-account linkage, roles, and audit persistence
- Supabase analytical tables and seed data do not supply runtime dashboard measures; see [data-store responsibilities](../docs/DATABASE.md)

### Authentication
- Supabase Auth for production browser sessions and gateway token validation
- Local development auth requires explicit configuration outside production; follow [security guidance](../docs/SECURITY.md)

### Storage
- Sales files enter the controlled Databricks ingestion pipeline; preserve source evidence in Bronze
- Follow the [Databricks project guide](../databricks/medshield_project/README.md) and [API contract](../docs/API.md); direct sales uploads are rejected with `DATABRICKS_INGESTION_REQUIRED`
- Treat private upload storage as a deployment requirement where applicable, rather than assuming Supabase Storage is configured

### Validation
- Validate requests at the gateway using existing typed checks and error contracts; do not assume a validation library is installed

### Forms
- Use existing React form patterns; introduce a form library only when justified by the affected workflow

### State Management
- Keep state local first; introduce a shared store only when justified

### Charts
- Chart.js and `react-chartjs-2`, as declared in `frontend/package.json`
- Reuse the dashboard's existing chart/runtime patterns

### Deployment
- Local Node.js and Docker demonstrations with separate frontend and gateway services
- Production host selection and configuration require the documented release gates; see [deployment](../docs/DEPLOYMENT.md)

### Monitoring
- Use documented health, audit, and service-management checks; do not assume Sentry is configured
- Define production monitoring and ownership through [deployment guidance](../docs/DEPLOYMENT.md)

### Analytics
- Dashboard business analytics use Databricks Gold contracts and bounded gateway calculations
- Product usage telemetry is a separate concern; do not assume PostHog is configured

### Service Split
- Keep the HTTP gateway in TypeScript
- Keep Python analytics offline and publish reviewed outputs through Databricks contracts
- The frontend obtains dashboard analytics through the gateway; browser authentication uses Supabase Auth
- Fail visibly when a required analytical source is unavailable; do not replace it with local, seeded, bundled, or Supabase analytical data
- Keep warehouse/provider credentials and Supabase server secrets out of browser code
- Preserve candidate labels and provenance until the applicable named approvals; technical success does not authorize publication or procurement

### CI/CD
- GitHub Actions

## Workflow
1. Check the project docs before introducing a new library or pattern.
2. Follow [architecture](../docs/ARCHITECTURE.md), [decisions](../docs/DECISIONS.md), [setup](../docs/SETUP.md), and [implementation](../docs/IMPLEMENTATION.md) for the affected boundary.
3. Reuse existing packages and services before adding new dependencies.
4. Confirm that any new stack choice supports both the demo workflow and the capstone documentation.
5. Update the docs when the stack or delivery model changes.

## Rules
- Do not introduce a new foundational framework without a documented reason.
- Keep frontend, backend, and data responsibilities separated.
- Prefer the simplest stack that satisfies the project requirement.
- Do not let a convenience choice in one layer leak into other layers.
- Treat the docs as canonical when they conflict with a default assumption.
- Default to the stack already proven in this repository unless the change genuinely requires something else.
