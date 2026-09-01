-- Migration: 011_supabase_auth_account_bridge.sql
-- Description: Links MedShield accounts to Supabase Auth and retires legacy password RPCs.

alter table medshield_identity.accounts
  add column if not exists auth_user_id uuid,
  add column if not exists password_reset_required boolean not null default true,
  add column if not exists auth_migrated_at timestamptz;

-- Legacy hashes are retained only until the one-time Auth Admin migration succeeds.
alter table medshield_identity.accounts
  alter column password_hash drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_auth_user_id_fkey'
      and conrelid = 'medshield_identity.accounts'::regclass
  ) then
    alter table medshield_identity.accounts
      add constraint accounts_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;
end
$$;

create unique index if not exists accounts_auth_user_id_key
  on medshield_identity.accounts (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists accounts_username_lower_key
  on medshield_identity.accounts (lower(username));

create unique index if not exists accounts_email_lower_key
  on medshield_identity.accounts (lower(email));

-- The API calls this function with a server-only key. It never exposes password hashes.
create or replace function medshield_identity.resolve_login_identifier(p_identifier text)
returns table (
  account_id bigint,
  auth_user_id uuid,
  username text,
  email text,
  role text,
  is_active boolean,
  password_reset_required boolean
)
language sql
stable
security invoker
set search_path = pg_catalog, medshield_identity
as $$
  select
    a.account_id,
    a.auth_user_id,
    a.username,
    a.email,
    a.role,
    a.is_active,
    a.password_reset_required
  from medshield_identity.accounts a
  where lower(a.username) = lower(trim(p_identifier))
     or lower(a.email) = lower(trim(p_identifier))
  limit 1;
$$;

revoke all on function medshield_identity.resolve_login_identifier(text) from public, anon, authenticated;
grant execute on function medshield_identity.resolve_login_identifier(text) to service_role;

drop policy if exists "Accounts: service role full access" on medshield_identity.accounts;
drop policy if exists "Accounts: linked user read own profile" on medshield_identity.accounts;

create policy "Accounts: service role full access"
  on medshield_identity.accounts
  for all
  to service_role
  using (true)
  with check (true);

create policy "Accounts: linked user read own profile"
  on medshield_identity.accounts
  for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);

revoke all on medshield_identity.accounts from anon, authenticated;
grant select on medshield_identity.accounts to authenticated;
grant all on medshield_identity.accounts to service_role;

-- These SECURITY DEFINER password functions are retired. Password verification now
-- belongs exclusively to Supabase Auth through the server-side login bridge.
revoke all on function public.verify_login(text, text) from public, anon, authenticated;
revoke all on function public.create_account(text, text, text, text) from public, anon, authenticated;
revoke all on function medshield_identity.verify_login(text, text) from public, anon, authenticated;
revoke all on function medshield_identity.create_account(text, text, text, text) from public, anon, authenticated;

-- Event-trigger helpers must not be executable by API roles.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
