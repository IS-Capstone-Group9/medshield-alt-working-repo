# Service Management

## Service catalog

| Service | Owner responsibility | Health evidence |
|---|---|---|
| Next.js dashboard | Render authenticated UI and explicit loading/unavailable states | `http://localhost:3000` plus Playwright checks |
| TypeScript API gateway | Auth, validation, bounded Databricks queries, NASA refresh orchestration | `GET /api/health` on port 5000 |
| Databricks SQL warehouse | Serve candidate Gold views and accept controlled refresh writes | Admin integration status and dashboard validation script |
| Supabase Auth/audit | Authenticate users, resolve roles, persist audit records | Login/me flow and audit checks |

Python analytics and product services are offline/legacy utilities, not required runtime services.

## Operating rules

- Start or attach the SQL warehouse before live dashboard validation.
- Treat `502`/`503` Databricks responses as a source incident; do not enable a local analytical fallback.
- A NASA POWER refresh must complete the Databricks Silver write and Gold publication before it is considered visible.
- Record dataset/version changes and rerun reconciliation before promotion.
- Keep candidate status visible until named approval is recorded.

## Recovery

1. Check `/api/health` for gateway availability and `dashboard_fallback: false`.
2. Use the administrator Databricks status routes to distinguish configuration, warehouse, and view failures.
3. Verify the warehouse is running and the configured catalog/schema/views exist.
4. Rerun the applicable bridge only after its Gold pipeline passes.
5. Roll back application changes independently; never overwrite Bronze source evidence to recover a dashboard.

See [SETUP.md](SETUP.md), [TESTING.md](TESTING.md), and [DEPLOYMENT.md](DEPLOYMENT.md).
