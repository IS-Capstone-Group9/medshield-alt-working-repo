# MedShield Business Analytics

Capstone workspace for the MedShield Pharma Corp. business analytics system.

## Workspace layout

- `frontend/` - Next.js + TypeScript dashboard UI
- `backend/` - TypeScript API gateway for the dashboard
- `services/analytics_service/` - analytics microservice
- `services/product_service/` - product microservice
- `services/shared_snapshot.py` - shared Supabase warehouse reader for dashboard views
- `supabase/` - SQL migration and seed files for the Supabase project
- `data/medshield/raw/` - canonical raw sales and external source files
- `data/medshield/processed/` - local processed fallback datasets
- `outputs/` - generated QA reports, model outputs, and evidence exports
- `docs/` - setup and capstone documentation
- `docs/drafts/` - generated draft paper files and Word deliverables
- `datasources/templates/` - CSV templates for product, area, DOH, PAGASA, and weather preparation
- `references/` - source documents and capstone reference materials

## Documentation index

| File | Purpose |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Single canonical setup guide with overview, stack, and run steps |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | Chapter 4 implementation draft |
| [docs/CHAPTER_3_METHODOLOGY_GUIDE.md](docs/CHAPTER_3_METHODOLOGY_GUIDE.md) | CRISP-DM + SEMMA methodology guide for Chapter 3 |
| [docs/BUSINESS_RULES_APPROVAL_CHECKLIST.md](docs/BUSINESS_RULES_APPROVAL_CHECKLIST.md) | Group approval checklist for KPI, SKU, 2025, and scenario rules |
| [docs/EXTERNAL_DATA_PREPARATION_GUIDE.md](docs/EXTERNAL_DATA_PREPARATION_GUIDE.md) | PAGASA, DOH, and weather API cleaning guide |
| [docs/CHAPTER_4_5_EVIDENCE_PLAN.md](docs/CHAPTER_4_5_EVIDENCE_PLAN.md) | Chapter 4 and Chapter 5 evidence checklist |
| [docs/GROUP_TASK_ASSIGNMENT_PLAN.md](docs/GROUP_TASK_ASSIGNMENT_PLAN.md) | Four-member work allocation and handoff plan |
| [docs/DEVOPS_DOCKER_SONARQUBE.md](docs/DEVOPS_DOCKER_SONARQUBE.md) | Docker Compose and local SonarQube runbook |

## Quick start

1. Copy the environment variables from `.env.example` into `.env`.
2. Run the backend:

```powershell
cd backend
npm install
npm run dev
```

3. Run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

4. In Supabase, run `supabase/migrations/001_init.sql` through `supabase/migrations/006_business_rules_master_data.sql` in order, then load `supabase/seed.sql` to create the connected warehouse schema, auth tables, DSS model-output layer, business-rule controls, and current MedShield dataset.

### Docker quick start

```powershell
docker compose build
docker compose up
```

Then open `http://localhost:3000`. Use [docs/DEVOPS_DOCKER_SONARQUBE.md](docs/DEVOPS_DOCKER_SONARQUBE.md) for health checks and SonarQube scanning.

## Reference Materials

Use `references/` and `docs/` as the canonical capstone references for this workspace.
