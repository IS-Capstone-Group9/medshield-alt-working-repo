# Supabase Auth Account Migration

MedShield accepts a username or email in the login UI, but only the TypeScript API resolves that identifier. Password verification and refreshable sessions are owned by Supabase Auth.

## Security model

- `medshield_identity.accounts.auth_user_id` links each application account to `auth.users.id`.
- Username, active status, and application role are read from the linked accounts table with a server-only Supabase key.
- `app_metadata.medshield_role` mirrors the application role for Supabase session metadata. Clients cannot edit `app_metadata`.
- Every migrated account starts with `password_reset_required=true`. Protected API routes reject the session until the user changes the imported password.
- The public `verify_login` and `create_account` RPC grants are revoked. Public signup through the MedShield API is disabled when Supabase mode is active.
- Legacy password hashes are cleared from `medshield_identity.accounts` immediately after a successful Auth Admin import.

## One-time migration

1. Apply `supabase/migrations/011_supabase_auth_account_bridge.sql`.
2. In the Supabase dashboard, create or copy a server secret from **Project Settings → API Keys**. Prefer a modern `sb_secret_...` key; the legacy service-role key is also supported.
3. Put it only in the ignored `backend/.env` as `SUPABASE_SECRET_KEY=...`. Never put it in a `NEXT_PUBLIC_*` variable, commit it, or paste it into chat.
4. From `backend/`, run `npm run auth:migrate`.
5. Verify that the script reports one linked Auth user for each active account. It is idempotent: existing Auth users are linked by normalized email.
6. Restart the TypeScript API, then sign in with either the existing username or email and existing password. The first session opens the required password-change screen.

The script imports supported bcrypt password hashes through the Auth Admin API, marks email as confirmed without sending email, writes server-controlled metadata, links the returned Auth UUID, and clears the legacy hash. It does not write directly to the protected `auth.users` schema.

## Operational checks

Run these without printing secrets:

```powershell
cd backend
npm run build
npm run auth:migrate
```

Then verify in Supabase that:

- `auth.users` has four users;
- all four active account rows have a non-null `auth_user_id`;
- all four begin with `password_reset_required=true`;
- `anon` and `authenticated` cannot execute the retired password RPCs.

Accounts using placeholder `example.com` addresses are not sent reset or invitation email. Their imported password must be changed through the in-app required reset flow.
