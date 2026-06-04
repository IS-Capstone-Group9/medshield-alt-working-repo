# MedShield Business Analytics

Capstone workspace for the MedShield Pharma Corp. business analytics system.

## Workspace layout

- `frontend/` - Next.js + TypeScript dashboard UI
- `backend/` - API gateway for the dashboard
- `services/analytics_service/` - analytics microservice
- `services/product_service/` - product microservice
- `services/shared_snapshot.py` - shared Supabase warehouse reader for dashboard views
- `supabase/` - SQL migration and seed files for the Supabase project
- `docs/` - setup and capstone documentation
- `references/` - source documents and the cloned reference frontend

## Documentation index

| File | Purpose |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Single canonical setup guide with overview, stack, and run steps |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | Chapter 4 implementation draft |

## Quick start

1. Copy the environment variables from `.env.example` into `.env`.
2. Run the backend:

```powershell
cd backend
pip install -r requirements.txt
python app.py
```

3. Run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

4. In Supabase, run `supabase/migrations/001_init.sql` and then load `supabase/seed.sql` to create the connected warehouse schema and seed it with the current MedShield dataset.

## Reference clone

The local clone under `external/medshield_frontend` is a guide only. It is not the canonical repository for this workspace.
