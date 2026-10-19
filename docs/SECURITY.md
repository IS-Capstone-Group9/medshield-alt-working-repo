# Security

## Explicit Auth recovery and HTTP repair — 17 October 2026

The [T08 implementation and evidence](../outputs/auth_http_remediation_20261017/README.md)
adds an administrator-only recovery CLI with read-only default, exact account/email
preflight, out-of-band ownership attestation, opaque proof reference and stable
operation ID. Fresh temporary credentials enter only through stdin. Remote intent
audit precedes identity writes; conflicts, invalid roles and stale conditional
updates fail closed. Forced reset is set in both stores; completion requires
readback and remote audit. Explicit same-operation resume handles uncertain
cross-service commits without deleting users or rotating passwords again.
Ordinary migration cannot use email matching to bypass this recovered-ownership
path after a completed migration's Auth deletion. [Runbook](SUPABASE_AUTH_MIGRATION.md).

Current isolated and configured checks pass with no existing-account/data changes.
Protected query checks follow authentication/reset denial; blocked CORS returns
generic 403 JSON and missing analytical configuration returns 503 with no fallback.
Operator attestation is not automated identity proof; password replacement is not
proof that every pre-existing access token was revoked. Existing backup/advisor,
tooling, release, model and business acceptance limits remain separate.

## Live operational audit and privilege verification — 17 October 2026

The [live evidence](../outputs/supabase_live_migration_20261017/README.md)
supersedes the earlier deployment gate: the matched PostgreSQL17.6 database has
the missing audit table/checkpoint and service-only atomic append RPC, retired
analytical browser/PUBLIC grants,21 private invoker views and explicit server
USAGE/SELECT. Current affected effective checks show zero privilege failures;
exactly43 historical public-layout expectations have explicit retired-baseline
dispositions rather than a blanket waiver. Existing own-profile access survives.

Actual Auth/PostgREST/gateway verification passes39 checks: linked login,
anonymous/authenticated denials, direct audit-insert denial for all API roles,
UTF-8 hash consistency, replay rejection/idempotence, concurrent serialization
and committed remote readback. Four synthetic verification events remain; the
gateway returns Supabase storage with nondegraded reads. Hash/checkpoint agreement
does not prevent privileged history rewrite. Full role-matrix/recovery/load tests
are outside this rollout; public future defaults remain inventoried and unapproved.

The security advisor still reports the pre-existing
[disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Performance also retains a pre-existing
[duplicate weather index](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index).
RLS-without-policy INFO rows are intentional for service-only relations; adding
browser policies to silence them would violate the boundary. A private schema/ACL
snapshot was retained; full independent backup/restore remains unverified.

## Legacy analytical permissions — 16 October 2026

[Migration017](../supabase/migrations/017_retire_legacy_analytical_browser_access.sql)
closes the declared older/custom-grant browser paths for obsolete Supabase
analytics, including column ACLs and owner-based public views. It preserves
identity self-profile and service-only cache/audit operations. The guarded 011
revocations also allow clean bootstrap without optional legacy functions.
The [T06 native evidence](../outputs/database_remediation_20261016/README.md)
passes fresh/upgrade permission and audit regressions; no remote migration was
applied. Connected endpoint denial/404 is not proof of deployed effective ACLs.
Owner-run [read-only verification](../supabase/verification/legacy_analytical_access.sql),
custom dependency/role/default-grant review and actual PostgREST audit readback
remain deployment gates. Global defaults and unrelated public objects are
intentionally unchanged.

## Dependency remediation — 16 October 2026

The [version-bound T05 record](../outputs/dependency_remediation_20261016/README.md)
retains current full/production audit receipts, primary advisories, package
decisions and actual auth/source/export regressions. Both package production
audits and the backend full audit report zero vulnerabilities. Frontend full
audit still reports one unpatched braces advisory through five development
lint-chain entries. Upstream ESLint10 peer constraints also retain EOL ESLint9.
These findings are recorded without audit suppression or peer bypass; the full
tooling gate remains open. This evidence does not certify Docker deployment,
every possible vulnerability, all roles or wider release acceptance.

MedShield should be treated as a SaaS-style decision-support system. Even during capstone/demo use, sales, product, inventory, and regional planning data should not be exposed through anonymous backend routes.

## Current Controls

| Area | Control |
|---|---|
| Login | Frontend uses Supabase Auth email/password when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured. The gateway requires Supabase Auth by default and fails startup if its URL/key are incomplete. Local demo auth requires explicit `USE_SUPABASE=false` outside production. |
| Session | Supabase Auth manages the browser session for the production path. The gateway validates tokens through its selected authentication mode only; Supabase mode never accepts local-session tokens. |
| Route protection | The Next.js proxy redirects unauthenticated users away from protected app routes when Supabase Auth is configured. |
| Reload behavior | Supabase sessions are restored through the Supabase client. Local fallback mode restores the gateway token through `/api/auth/me`. |
| Logout | Supabase logout clears the Supabase browser session. Local fallback mode calls `/api/auth/logout` and clears browser token storage. |
| Dashboard APIs | Analytics and model endpoints require `Authorization: Bearer <token>` and the gateway validates Supabase Auth tokens before serving data. |
| Identity outages | Token/account GETs have bounded retries and five-second attempt timeouts. Exhaustion returns `503 AUTHENTICATION_UNAVAILABLE`, without accepting local tokens, stale roles or fallback analytical data. Invalid sessions are denied immediately. Password and other writes are not replayed. See [API](API.md#authentication). |
| Dashboard audit | The dashboard records local browser audit entries for navigation, theme changes, filters, uploads, help, dataset refreshes, and logout. |
| Gateway audit | Audit writes acknowledge success after the Supabase atomic append RPC commits or a local file append is flushed. Exhausted persistence returns `503 AUDIT_PERSISTENCE_FAILED`. Privileged audit reads merge remote and local fallback records. |
| Password storage | Local fallback accounts use salted scrypt password hashes. |
| External data | DOH, PAGASA, and weather API keys must stay server-side or in ETL jobs, never in frontend code. |
| Sales ingestion | Direct dashboard uploads are disabled: authenticated `POST /api/sales/upload` returns `409 DATABRICKS_INGESTION_REQUIRED`. Files enter the controlled Databricks pipeline, with source preservation, validation, candidate review and release gates. See [API](API.md) and the [pipeline guide](../databricks/medshield_project/README.md). |
| Databricks access | Host, SQL warehouse ID, and token are used only by the TypeScript backend. |
| Supabase server operations | `SUPABASE_SECRET_KEY` or the legacy service-role key is used only by the backend for identity/audit/administrative paths. |

## Local Development

Use `USE_SUPABASE=false` when Supabase credentials are not configured. To test Supabase Auth locally, configure the public Next.js variables and server-side Supabase variables with the same `medshield` project, then set `USE_SUPABASE=true`.

Default local admin account:

| Field | Value |
|---|---|
| Username | `admin` |
| Email | `admin@medshield.local` |
| Password | `medshield2025` |

Local demo accounts and sessions cannot be provisioned, issued, or verified when `NODE_ENV=production` or Supabase authentication mode is selected. Production must set `NODE_ENV=production`, keep Supabase enabled, and configure `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Missing configuration fails startup, including when `USE_SUPABASE=true`; disabling Supabase in production also fails startup. The server secret remains necessary for account migration and privileged audit operations.

## Durable audit contract

Apply [016_durable_audit_chain.sql](../supabase/migrations/016_durable_audit_chain.sql) after migration 015 through the normal reviewed migration process. The migration adds the gateway's audit columns and `medshield_identity.append_audit_log(uuid, text)`. The gateway invokes that RPC with a backend-only server key. Its durable checkpoint row is locked inside the database transaction so sequential and concurrent gateway processes share the same predecessor; an event UUID makes a repeated RPC submission idempotent. Only `service_role` can execute the RPC or select audit rows. Direct API-role inserts, updates, and deletes are revoked. Existing events remain readable as legacy evidence and are not retroactively described as verified chain entries.

Each new entry stores its exact UTF-8 JSON payload and the SHA-256 digest of `previous_hash + ':' + hash_payload`, including username, action, detail, IP address, user agent, timestamp, and event UUID. [PostgreSQL's binary hashing functions](https://www.postgresql.org/docs/16/functions-binarystring.html) compute the same bytes as the gateway. Hash chaining supports integrity verification; a privileged operator can rewrite a chain and its checkpoint. Accordingly, `tamper_evident` is false. Independent retained checkpoints and an immutable external sink are required before making a stronger tamper-evidence claim.

During a remote audit failure, `backend/data/local_audit_logs.jsonl` is an explicit audit-only fallback. The gateway creates its parent directory, serializes writes to the same path within one gateway process, validates the current local chain before appending, and flushes the file before success. The fallback requires a persistent writable disk and a single gateway process per log file; deployments with multiple gateway processes must give each process its own persistent fallback volume/path. The local chain is separate from `remote-v1` and is retained across gateway restarts. A malformed store or exhausted remote/local writes fails visibly.

`POST /api/audit` returns `storage` and `event_id` on durable success. `GET /api/audit` keeps its array contract, tags each record with `storage_source`, merges recent local and remote records, and deduplicates a remote event whose response was lost and also reached fallback. When the remote read fails and local records are returned, `X-MedShield-Audit-Read-Degraded: true` identifies the partial view. A failed local read returns `503` rather than concealing fallback evidence. Remote failure with no available local events also returns `503`. Local files are retained; this change does not automatically replay them to Supabase or remove them.

Gateway unit tests cover selected authentication mode, production configuration denial, concurrent local audit writes, restart continuity, payload corruption, exhausted persistence, fallback visibility, and lost-receipt deduplication. The migration still needs execution against a disposable or reviewed Supabase-compatible PostgreSQL instance to verify SQL execution, role denial, distributed concurrency, and PostgREST readback. Docker was unavailable during the local 5 October 2026 remediation checks; no migration was applied to the live project.

## Production Requirements

Before real SaaS deployment:

1. Enforce Supabase row-level security by tenant, role, and organization.
2. Persist uploads to private storage and staging tables, not public frontend files.
3. Validate file type, size, row counts, required columns, and malformed values on upload.
4. Persist audit logs server-side for login, logout, upload, model run, and recommendation publish events.
5. Keep external API keys in environment variables or secret storage only.
6. Allowlist weather provider hosts, record provenance, and retain last-known-good data on provider failure.
7. Rotate any Supabase service-role key that has been pasted into chat, screenshots, issue trackers, or shared terminals.
