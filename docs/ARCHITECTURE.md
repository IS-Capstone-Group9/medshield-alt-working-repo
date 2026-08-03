# MedShield Architecture

## Layering

- Frontend: Next.js App Router and TypeScript UI in `frontend/`.
- API Gateway: TypeScript service in `backend/` that handles routing, auth, CORS, and fallback behavior.
- Analytics Services: Python Flask microservices in `services/` for analytics and product reporting.
- Data: Supabase PostgreSQL warehouse schema in `supabase/`.

## Runtime Flow

1. The frontend calls the TypeScript gateway.
2. The gateway tries the Python analytics services for reporting data.
3. If the analytics services are unavailable, the gateway falls back to the checked-in reference export.
4. For auth, the frontend signs users in through Supabase Auth when public Supabase environment variables are configured.
5. Protected frontend routes are guarded by Supabase session middleware, and protected gateway endpoints validate the Supabase bearer token before serving analytics data.
6. If Supabase frontend variables are not configured, the app can still use the local demo auth store for development.

## Boundary Rules

- Keep frontend code free of direct database access.
- Keep auth and HTTP orchestration in the TypeScript gateway.
- Use Supabase Auth only for identity/session handling in the browser; keep analytics and warehouse access behind the gateway.
- Keep analytical calculations and reporting snapshots in the Python services.
- Keep the warehouse schema as the source of truth for persisted business data.
