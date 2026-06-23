# MedShield Business Analytics

Capstone workspace for the MedShield Pharma Corp. business analytics system.

## Workspace layout

- `frontend/` - Next.js + TypeScript dashboard UI
- `backend/` - TypeScript API gateway for the dashboard
- `services/analytics_service/` - analytics microservice
- `services/product_service/` - product microservice
- `services/shared_snapshot.py` - shared Supabase warehouse reader for dashboard views
- `supabase/` - SQL migration and seed files for the Supabase project
- `docs/` - setup and capstone documentation
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

4. In Supabase, run `supabase/migrations/001_init.sql`, `supabase/migrations/002_accounts.sql`, `supabase/migrations/003_auth_rpc.sql`, and `supabase/migrations/004_dss_schema.sql`, then load `supabase/seed.sql` to create the connected warehouse schema, auth tables, DSS model-output layer, and current MedShield dataset.

## Reference Materials

Use `references/` and `docs/` as the canonical capstone references for this workspace.
