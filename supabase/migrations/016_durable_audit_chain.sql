-- Apply after 015. Existing records remain legacy evidence without claimed chain integrity.
begin;

alter table medshield_identity.audit_logs
  add column if not exists event_id uuid,
  add column if not exists chain_id text,
  add column if not exists chain_sequence bigint,
  add column if not exists previous_hash text,
  add column if not exists entry_hash text,
  add column if not exists hash_payload text,
  add column if not exists hash_version text,
  add column if not exists tamper_evident boolean not null default false;

-- Hashes detect accidental changes when independently verified; they do not prevent
-- a privileged database administrator from rewriting a chain and its checkpoint.
update medshield_identity.audit_logs set tamper_evident = false where tamper_evident is distinct from false;
alter table medshield_identity.audit_logs alter column tamper_evident set default false;

create unique index if not exists audit_logs_event_id_key
  on medshield_identity.audit_logs (event_id) where event_id is not null;
create unique index if not exists audit_logs_chain_sequence_key
  on medshield_identity.audit_logs (chain_id, chain_sequence) where chain_id is not null;

create table if not exists medshield_identity.audit_chain_state (
  chain_id text primary key,
  last_sequence bigint not null default 0 check (last_sequence >= 0),
  last_hash text not null default repeat('0', 64) check (last_hash ~ '^[0-9a-f]{64}$')
);
insert into medshield_identity.audit_chain_state (chain_id) values ('remote-v1') on conflict do nothing;
alter table medshield_identity.audit_chain_state enable row level security;
revoke all on medshield_identity.audit_chain_state from public, anon, authenticated, service_role;

create or replace function medshield_identity.append_audit_log(p_event_id uuid, p_payload text)
returns medshield_identity.audit_logs
language plpgsql
security definer
set search_path = pg_catalog, medshield_identity
as $$
declare
  payload jsonb;
  predecessor text;
  next_sequence bigint;
  fingerprint text;
  result medshield_identity.audit_logs;
begin
  payload := p_payload::jsonb;
  if jsonb_typeof(payload) is distinct from 'object'
     or (payload->>'event_id')::uuid is distinct from p_event_id
     or not (payload ?& array['event_id', 'username', 'action', 'detail', 'ip_address', 'user_agent', 'created_at'])
     or exists (select 1 from jsonb_each(payload) as field where jsonb_typeof(field.value) is distinct from 'string')
     or length(trim(payload->>'action')) = 0 or length(trim(payload->>'detail')) = 0 then
    raise exception 'Invalid audit payload' using errcode = '22023';
  end if;

  -- The durable row lock serializes gateway instances and survives process restarts.
  select last_hash, last_sequence + 1 into predecessor, next_sequence
    from medshield_identity.audit_chain_state where chain_id = 'remote-v1' for update;
  if not found then raise exception 'Audit chain checkpoint is missing'; end if;

  select * into result from medshield_identity.audit_logs where event_id = p_event_id;
  if found then
    if result.hash_payload is distinct from p_payload then
      raise exception 'Audit event identifier already exists with a different payload' using errcode = '22023';
    end if;
    return result;
  end if;

  fingerprint := encode(sha256(convert_to(predecessor || ':' || p_payload, 'UTF8')), 'hex');
  insert into medshield_identity.audit_logs (
    username, action, detail, ip_address, user_agent, created_at, event_id,
    chain_id, chain_sequence, previous_hash, entry_hash, hash_payload, hash_version, tamper_evident
  ) values (
    payload->>'username', payload->>'action', payload->>'detail', payload->>'ip_address',
    payload->>'user_agent', (payload->>'created_at')::timestamptz, p_event_id,
    'remote-v1', next_sequence, predecessor, fingerprint, p_payload, 'sha256-json-v1', false
  ) returning * into result;
  update medshield_identity.audit_chain_state set last_sequence = next_sequence, last_hash = fingerprint
    where chain_id = 'remote-v1';
  return result;
end;
$$;

-- Remote writers use only the atomic RPC; ordinary API roles cannot read or write audits.
revoke all on function medshield_identity.append_audit_log(uuid, text) from public, anon, authenticated;
grant execute on function medshield_identity.append_audit_log(uuid, text) to service_role;
revoke all on medshield_identity.audit_logs from public, anon, authenticated, service_role;
grant select on medshield_identity.audit_logs to service_role;

notify pgrst, 'reload schema';
commit;
