-- Migration: 009_saas_compliance_audit.sql
-- Description: Creates the medshield_identity.audit_logs table and enables row-level security for SaaS security and compliance auditing (SOC 2, HIPAA, GDPR).

create table if not exists medshield_identity.audit_logs (
  log_id bigint generated always as identity primary key,
  username text,
  action text not null,
  detail text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table medshield_identity.audit_logs enable row level security;

-- Drop existing policy if any
drop policy if exists "Audit logs: service role only" on medshield_identity.audit_logs;

-- Policy to allow all operations by the service_role
create policy "Audit logs: service role only"
  on medshield_identity.audit_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Grant permissions to standard roles
grant select, insert on medshield_identity.audit_logs to anon, authenticated, service_role;

-- Add index for fast compliance auditing queries
create index if not exists idx_medshield_identity_audit_logs_action on medshield_identity.audit_logs (action);
create index if not exists idx_medshield_identity_audit_logs_created_at on medshield_identity.audit_logs (created_at);
