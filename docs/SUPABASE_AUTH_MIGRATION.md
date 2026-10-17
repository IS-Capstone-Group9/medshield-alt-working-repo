# Supabase Auth Account Migration

MedShield accepts a username or email in the login UI, but only the TypeScript API resolves that identifier. Password verification and refreshable sessions are owned by Supabase Auth.

## Security model

- `medshield_identity.accounts.auth_user_id` links each application account to `auth.users.id`.
- Username, active status, and application role are read from the linked accounts table with a server-only Supabase key.
- `app_metadata.medshield_role` mirrors the application role for Supabase session metadata. Clients cannot edit `app_metadata`.
- Every migrated account starts with `password_reset_required=true`. Protected API routes reject the session until the user changes the imported password.
- The public `verify_login` and `create_account` RPC grants are revoked. Account provisioning is administrator-managed; no public signup endpoint is available.
- Legacy password hashes are cleared from `medshield_identity.accounts` immediately after a successful Auth Admin import.

## One-time migration

1. Apply `supabase/migrations/011_supabase_auth_account_bridge.sql`.
2. In the Supabase dashboard, create or copy a server secret from **Project Settings → API Keys**. Prefer a modern `sb_secret_...` key; the legacy service-role key is also supported.
3. In **Project Settings → API → Exposed schemas**, add `medshield_identity` (and the other MedShield schemas listed in `docs/SETUP.md`). The gateway calls the identity resolver through PostgREST; leaving this schema unexposed produces a generic “Authentication service is unavailable” error backed by an HTTP 406.
4. Put the server key only in the ignored `backend/.env` as `SUPABASE_SECRET_KEY=...`. Never put it in a `NEXT_PUBLIC_*` variable, commit it, or paste it into chat.
5. From `backend/`, run `npm run auth:migrate`.
6. Verify that the script reports one linked Auth user for each active account. It is idempotent: existing Auth users are linked by stored UUID or normalized email, and accounts that already completed their password reset remain completed.
7. Restart the TypeScript API, then sign in with either the existing username or email and existing password. The first session opens the required password-change screen.

The script imports supported bcrypt password hashes through the Auth Admin API, marks email as confirmed without sending email, writes server-controlled metadata, links the returned Auth UUID, and clears the legacy hash. If a matching Auth user already exists, the script imports the legacy hash into that user before clearing it from the application table. It does not write directly to the protected `auth.users` schema.

The migration finishes with a postcondition check: every active account must have a unique, existing Auth user with the same normalized email, and no active account may retain a legacy hash. A failed Auth create or update leaves that account's legacy hash intact so the migration can be corrected and rerun safely.

## Operational checks

Run these without printing secrets:

```powershell
cd backend
npm run build
npm run auth:migrate
```

Then verify in Supabase that:

- each active application account has one distinct existing Auth user with matching normalized email;
- successfully imported accounts have a non-null `auth_user_id` and no retained legacy hash;
- newly imported accounts require a password change; completed resets stay completed;
- `anon` and `authenticated` cannot execute the retired password RPCs.

Accounts using placeholder `example.com` addresses are not sent reset or invitation email. Their imported password must be changed through the in-app required reset flow.

## Recovery after an Auth user is deleted — repaired 17 October 2026

Deleting a linked Auth user sets the account's `auth_user_id` to NULL. Login fails
closed. A completed migration already cleared the old password hash: ordinary
`auth:migrate` now rejects this state before any identity write, even if another
Auth user shares the email. A matching email alone cannot establish ownership.
Use the explicit server-administrator recovery command below after verifying
ownership out of band against the organization's approved records/process.
`--confirm-ownership` records that administrator assertion; the software does not
independently prove the person's identity. Keep sensitive verification evidence
outside logs; supply only its opaque review/ticket reference.

The command recovers exactly one active, previously migrated, hash-cleared
account. It checks account ID plus expected email and role, scans all relevant
Auth-user pages, rejects conflicts, commits a remote intent audit, creates a fresh
temporary credential and links through a conditional unchanged-account update.
It verifies both stores and commits a completion audit. Server-controlled metadata
and the account both require the existing in-app password change. It never
restores an old hash, grants a new role or automatically adopts an unrelated user.

From `backend/`, inspect help and prepare a read-only check. Replace the example
account ID, email, operator and proof reference with the reviewed target:

```powershell
npm run auth:recover -- --help
$medshieldRecoveryOperation = [guid]::NewGuid().ToString()
$medshieldRecoveryArgs = @('--account-id', 'REPLACE_ID', '--expected-email', 'person@company.example', '--operator', 'REPLACE_OPERATOR', '--ownership-reference', 'REPLACE_REVIEW_REF', '--operation-id', $medshieldRecoveryOperation)
npm run auth:recover -- @medshieldRecoveryArgs
```

Default execution reads only and prints `status: ready` after a valid preflight.
Apply requires explicit ownership attestation and a fresh temporary password of
12–128 characters containing uppercase, lowercase, number and a special character.
Use a hidden secure-string prompt and pipe the value only through UTF-8 stdin.
The example sets and restores the shell encoding; PowerShell 7 was the checked
environment. This avoids silently changing non-ASCII password characters:

```powershell
$medshieldRecoverySecure = Read-Host 'Fresh temporary password' -AsSecureString
$medshieldRecoveryPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($medshieldRecoverySecure)
$medshieldRecoveryOutputEncoding = $OutputEncoding
try {
  $OutputEncoding = [Text.UTF8Encoding]::new($false)
  [Runtime.InteropServices.Marshal]::PtrToStringBSTR($medshieldRecoveryPointer) | npm run auth:recover -- @medshieldRecoveryArgs --apply --confirm-ownership --password-stdin
} finally {
  $OutputEncoding = $medshieldRecoveryOutputEncoding
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($medshieldRecoveryPointer)
  $medshieldRecoverySecure.Dispose()
}
```

Never put the password in command arguments, chat, logs or an evidence file.
Deliver it to the verified owner through the organization's approved secure
channel, then verify required password change, new login and normal role access.
The code rejects credential-bearing redirects and does not print provider error
bodies or password values. It uses the existing ignored backend server secret;
this is not a public recovery endpoint. No command in this runbook authorizes
deleting an existing account or Auth identity.

### Partial state and explicit resume

Auth creation, account linking and audit append are separate transactions. A
timeout or rejected conditional link can leave an operation-tagged Auth user.
Errors report a bounded phase and whether identity state may have changed. Keep
the same operation UUID, inspect the specific account/Auth state and fix the
reported dependency/conflict. Do not delete a potentially linked user or retry
with a new operation UUID as a cleanup shortcut.

```powershell
npm run auth:recover -- @medshieldRecoveryArgs --apply --confirm-ownership --resume
```

Resume accepts only matching account/email/role and server-controlled operation
metadata. It does not rotate the credential again or relink an already verified
account. If completion auditing failed after a committed link, resume completes
verification/auditing and reports no false rollback. Audit attempts are distinct
entries tied to one recovery operation; they are not one idempotent audit event.
Complete a partial recovery before the owner changes the temporary password:
after a successful password change, the original forced-reset operation no
longer matches the resume contract.

Remote audit persistence is mandatory for recovery. If the standard audit store
falls back locally, the attempt remains durable evidence but recovery stops
before further identity changes. Retain local audit files and resolve remote
persistence; do not treat local-only acknowledgement as completed recovery.

### Verified scope

The [T08 delivery](../outputs/auth_http_remediation_20261017/README.md) retains
44 independent recovery cases, zero-write migration denials, HTTP status checks
and a 17-check actual configured recovery/password-change flow on a disposable
synthetic viewer. Existing table/stable-Auth fingerprints match before/after.
Synthetic identities were removed; all audit evidence remains. This does not
establish revocation of every already-issued access token, a full role/load
matrix, disaster recovery or broader release acceptance.
