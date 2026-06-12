# Security

MedShield should be treated as a SaaS-style decision-support system. Even during capstone/demo use, sales, product, inventory, and regional planning data should not be exposed through anonymous backend routes.

## Current Controls

| Area | Control |
|---|---|
| Login | Gateway validates credentials through Supabase RPC when configured, otherwise through the local demo auth store. |
| Session | Gateway issues random bearer tokens with expiration after successful login. |
| Reload behavior | Frontend stores the token in `sessionStorage` by default or `localStorage` when "remember me" is selected, then restores the user through `/api/auth/me`. |
| Logout | Frontend calls `/api/auth/logout` and clears browser token storage. |
| Dashboard APIs | Analytics and model endpoints require `Authorization: Bearer <token>`. |
| Dashboard audit | The dashboard records local browser audit entries for navigation, theme changes, filters, uploads, help, dataset refreshes, and logout. |
| Password storage | Local fallback accounts use salted scrypt password hashes. |
| External data | DOH, PAGASA, and weather API keys must stay server-side or in ETL jobs, never in frontend code. |
| Upload validation | Gateway accepts only `.xlsx`/`.csv`, enforces a 30 MB limit, and passes files to the cleaning service. |
| Warehouse write | `SUPABASE_SERVICE_ROLE_KEY` is used only by the Python service. |

## Local Development

Use `USE_SUPABASE=false` when Supabase credentials are not configured. If `USE_SUPABASE=true` with invalid or placeholder keys, the gateway will fall back to local auth and log a warning.

Default local admin account:

| Field | Value |
|---|---|
| Username | `admin` |
| Email | `admin@medshield.local` |
| Password | `medshield2025` |

Change or disable the demo admin before any shared deployment.

## Production Requirements

Before real SaaS deployment:

1. Replace local in-memory gateway sessions with Supabase Auth or signed JWT validation.
2. Move token storage to secure, HttpOnly, SameSite cookies if the deployment model allows it.
3. Enforce Supabase row-level security by tenant, role, and organization.
4. Persist uploads to private storage and staging tables, not public frontend files.
5. Validate file type, size, row counts, required columns, and malformed values on upload.
6. Persist audit logs server-side for login, logout, upload, model run, and recommendation publish events.
7. Keep external API keys in environment variables or secret storage only.
8. Allowlist weather provider hosts, record provenance, and retain last-known-good data on provider failure.
9. Rotate any Supabase service-role key that has been pasted into chat, screenshots, issue trackers, or shared terminals.
