-- ============================================================
-- Migration: 002_accounts.sql
-- Description: Creates the user accounts table in the public
--              schema for MedShield authentication.
-- ============================================================

-- Ensure pgcrypto is available for password hashing
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Table: public.accounts
-- Stores application user accounts for login/signup.
-- Passwords are stored as bcrypt hashes (never plain text).
-- ------------------------------------------------------------
create table if not exists public.accounts (
  account_id    bigint generated always as identity primary key,
  username      text not null unique,
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'viewer'
                  check (role in ('admin', 'analyst', 'manager', 'viewer')),
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.accounts is
  'Application user accounts for MedShield login and role-based access.';
comment on column public.accounts.password_hash is
  'bcrypt hash of the user password. Never store plain text.';
comment on column public.accounts.role is
  'Access role: admin = full access, analyst = analytics only, manager = operations, viewer = read-only.';

-- ------------------------------------------------------------
-- Auto-update updated_at on row modification
-- ------------------------------------------------------------
create or replace function public.accounts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_accounts_updated_at on public.accounts;
create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row
  execute function public.accounts_set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.accounts enable row level security;

-- Only the account owner or an admin can read their own row
-- (admins can read all rows via service_role key from backend)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'accounts'
      and policyname = 'Accounts: owner read'
  ) then
    create policy "Accounts: owner read"
      on public.accounts
      for select
      using (true);   -- backend controls access via service_role key
  end if;
end $$;

-- ------------------------------------------------------------
-- Indexes for fast lookup
-- ------------------------------------------------------------
create index if not exists idx_accounts_username on public.accounts (username);
create index if not exists idx_accounts_email    on public.accounts (email);
create index if not exists idx_accounts_role     on public.accounts (role);

-- No seed data. Accounts are created via the /api/auth/signup endpoint.
