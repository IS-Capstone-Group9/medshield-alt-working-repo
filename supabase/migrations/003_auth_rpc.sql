-- ============================================================
-- Migration: 003_auth_rpc.sql
-- Description: RPC functions for login verification and
--              account creation used by the Flask backend.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Function: verify_login
-- Checks username + password against bcrypt hash.
-- Returns the account row on success, or empty on failure.
-- ------------------------------------------------------------
create or replace function public.verify_login(
  p_username text,
  p_password text
)
returns table (
  account_id    bigint,
  username      text,
  email         text,
  role          text,
  is_active     boolean
)
language plpgsql
security definer
as $$
begin
  return query
  select
    a.account_id,
    a.username,
    a.email,
    a.role,
    a.is_active
  from public.accounts a
  where
    (a.username = p_username or a.email = p_username)
    and a.password_hash = crypt(p_password, a.password_hash)
    and a.is_active = true
  limit 1;

  -- Update last_login_at if a match was found
  update public.accounts
  set last_login_at = now()
  where
    (accounts.username = p_username or accounts.email = p_username)
    and accounts.password_hash = crypt(p_password, accounts.password_hash)
    and accounts.is_active = true;
end;
$$;

-- ------------------------------------------------------------
-- Function: create_account
-- Creates a new account with a bcrypt-hashed password.
-- Returns error text if username/email already exists.
-- ------------------------------------------------------------
create or replace function public.create_account(
  p_username text,
  p_email    text,
  p_password text,
  p_role     text default 'viewer'
)
returns table (
  account_id bigint,
  username   text,
  email      text,
  role       text,
  error_msg  text
)
language plpgsql
security definer
as $$
declare
  v_id bigint;
begin
  -- Validate role
  if p_role not in ('admin', 'analyst', 'manager', 'viewer') then
    return query select null::bigint, null::text, null::text, null::text, 'Invalid role';
    return;
  end if;

  -- Check for duplicate username
  if exists (select 1 from public.accounts where accounts.username = p_username) then
    return query select null::bigint, null::text, null::text, null::text, 'Username already taken';
    return;
  end if;

  -- Check for duplicate email
  if exists (select 1 from public.accounts where accounts.email = p_email) then
    return query select null::bigint, null::text, null::text, null::text, 'Email already registered';
    return;
  end if;

  -- Insert
  insert into public.accounts (username, email, password_hash, role)
  values (p_username, p_email, crypt(p_password, gen_salt('bf', 10)), p_role)
  returning accounts.account_id into v_id;

  return query select v_id, p_username, p_email, p_role, null::text;
end;
$$;

-- Grant execute to anon and authenticated roles
grant execute on function public.verify_login(text, text)     to anon, authenticated;
grant execute on function public.create_account(text, text, text, text) to anon, authenticated;
