# Security

MedShield should be treated as a SaaS-style decision-support system. Even during capstone/demo use, sales, product, inventory, and regional planning data should not be exposed through anonymous backend routes.

## Current Controls

| Area | Control |
|---|---|
| Login | Frontend uses Supabase Auth email/password when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured; otherwise local demo auth can be used for development. |
| Session | Supabase Auth manages the browser session for the production-style path. Local fallback mode still uses gateway-issued bearer tokens. |
| Route protection | Next.js middleware redirects unauthenticated users away from protected app routes when Supabase Auth is configured. |
| Reload behavior | Supabase sessions are restored through the Supabase client. Local fallback mode restores the gateway token through `/api/auth/me`. |
| Logout | Supabase logout clears the Supabase browser session. Local fallback mode calls `/api/auth/logout` and clears browser token storage. |
| Dashboard APIs | Analytics and model endpoints require `Authorization: Bearer <token>` and the gateway validates Supabase Auth tokens before serving data. |
| Dashboard audit | The dashboard records local browser audit entries for navigation, theme changes, filters, uploads, help, dataset refreshes, and logout. |
| Password storage | Local fallback accounts use salted scrypt password hashes. |
| External data | DOH, PAGASA, and weather API keys must stay server-side or in ETL jobs, never in frontend code. |
| Upload validation | Gateway accepts only `.xlsx`/`.csv`, enforces a 30 MB limit, and passes files to the cleaning service. |
| Warehouse write | `SUPABASE_SERVICE_ROLE_KEY` is used only by the Python service. |

## Local Development

Use `USE_SUPABASE=false` when Supabase credentials are not configured. To test Supabase Auth locally, configure the public Next.js variables and server-side Supabase variables with the same `medshield` project, then set `USE_SUPABASE=true`.

Default local admin account:

| Field | Value |
|---|---|
| Username | `admin` |
| Email | `admin@medshield.local` |
| Password | `medshield2025` |

Change or disable the demo admin before any shared deployment.

## Production Requirements

Before real SaaS deployment:

1. Enforce Supabase row-level security by tenant, role, and organization.
2. Persist uploads to private storage and staging tables, not public frontend files.
3. Validate file type, size, row counts, required columns, and malformed values on upload.
4. Persist audit logs server-side for login, logout, upload, model run, and recommendation publish events.
5. Keep external API keys in environment variables or secret storage only.
6. Allowlist weather provider hosts, record provenance, and retain last-known-good data on provider failure.
7. Rotate any Supabase service-role key that has been pasted into chat, screenshots, issue trackers, or shared terminals.
