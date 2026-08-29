-- Migration: 012_retire_legacy_auth_surface.sql
-- Description: Removes the legacy password functions and an obsolete public-read account policy.

drop policy if exists "Accounts: owner read" on medshield_identity.accounts;

revoke all on medshield_identity.accounts from public, anon;

drop function if exists public.verify_login(text, text);
drop function if exists public.create_account(text, text, text, text);
drop function if exists medshield_identity.verify_login(text, text);
drop function if exists medshield_identity.create_account(text, text, text, text);

alter function medshield_identity.accounts_set_updated_at()
  set search_path = pg_catalog, medshield_identity;
