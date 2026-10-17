"""Synthetic loopback-only PostgreSQL dump/loss/restore rehearsal; never cloud access."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bin', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    binary = args.bin.resolve()
    output = args.output.resolve()
    assert output.is_relative_to(ROOT / 'outputs'), 'Evidence must remain inside workspace outputs'
    run = output / ('run-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f'))
    run.mkdir(parents=True, exist_ok=False)
    data = run / 'cluster'
    receipt = {'started_at_utc': datetime.now(timezone.utc).isoformat(), 'status': 'RUNNING', 'checks': [],
               'scope': 'Synthetic native PostgreSQL16 cluster; actual repository migrations; no live Supabase/Databricks access',
               'run_directory': str(run), 'cluster_stopped': False}
    env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
    env.update(PGCLIENTENCODING='UTF8', PGCONNECT_TIMEOUT='5')
    started = False

    def command(name, extra, sql=None, required=True, timeout=60):
        if name == 'pg_ctl':
            # A detached Windows postgres can inherit pipe handles. Use real files
            # so waiting for pg_ctl never waits for the background server's EOF.
            with (run / ('pgctl-' + extra[-1] + '.stdout')).open('w', encoding='utf-8') as stdout, (run / ('pgctl-' + extra[-1] + '.stderr')).open('w', encoding='utf-8') as stderr:
                result = subprocess.run([str(binary / (name + '.exe')), *extra], stdin=subprocess.DEVNULL,
                                        stdout=stdout, stderr=stderr, env=env, timeout=timeout,
                                        creationflags=subprocess.CREATE_NO_WINDOW)
            result.stdout = (run / ('pgctl-' + extra[-1] + '.stdout')).read_text(encoding='utf-8')
            result.stderr = (run / ('pgctl-' + extra[-1] + '.stderr')).read_text(encoding='utf-8')
        else:
            result = subprocess.run([str(binary / (name + '.exe')), *extra], input=sql,
                                    capture_output=True, text=True, encoding='utf-8', errors='replace',
                                    env=env, timeout=timeout, creationflags=subprocess.CREATE_NO_WINDOW)
        with (run / 'commands.log').open('a', encoding='utf-8') as log:
            log.write(json.dumps({'tool': name, 'args': extra, 'exit_code': result.returncode}) + '\n')
            if result.returncode:
                log.write(result.stderr + '\n')
        if required and result.returncode:
            raise RuntimeError(name + ' failed: ' + result.stderr[:1800])
        return result

    def check(name, passed, **facts):
        receipt['checks'].append({'name': name, 'pass': bool(passed), **facts})
        if not passed:
            raise AssertionError(name)

    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    base = ['-h', '127.0.0.1', '-p', str(port), '-U', 'postgres']

    def query(db, sql, required=True):
        return command('psql', ['-X', '-qAt', *base, '-d', db, '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
                       'set search_path=public,extensions,pg_catalog;\n' + sql, required).stdout.strip()

    def denied(db, name, sql, role):
        result = command('psql', ['-X', '-qAt', *base, '-d', db, '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
                         'set role ' + role + ';\n' + sql, required=False)
        check(name, result.returncode != 0 and '42501' in result.stderr)

    def fingerprint(db):
        tables = json.loads(query(db, "select coalesce(json_agg(x),'[]') from (select n.nspname as schema,c.relname as name,c.relrowsecurity as rls,c.relforcerowsecurity as force_rls,pg_get_userbyid(c.relowner) as owner,coalesce(c.relacl,acldefault('r',c.relowner))::text as acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' and c.relkind in ('r','p') order by 1,2) x;"))
        for row in tables:
            table = '"' + row['schema'] + '"."' + row['name'] + '"'
            content = query(db, f"select coalesce(json_agg(x order by x::text)::text,'[]') from (select row_to_json(t) x from {table} t) s;")
            row['content_sha256'] = hashlib.sha256(content.encode()).hexdigest()
            row['rows'] = int(query(db, 'select count(*) from ' + table))
        return tables

    def schema(db):
        text = command('pg_dump', [*base, '-d', db, '--schema-only']).stdout
        return '\n'.join(line for line in text.splitlines() if not line.startswith(('\\restrict ', '\\unrestrict ')))

    def append(db, event):
        payload = json.dumps({'event_id': event, 'username': 'synthetic-restore', 'action': 'RESTORE_REHEARSAL',
                              'detail': 'Synthetic only: â‚± Â± â€“ â€”', 'ip_address': '127.0.0.1',
                              'user_agent': 'isolated-fixture', 'created_at': '2026-10-17T00:00:00Z'}, ensure_ascii=False, separators=(',', ':'))
        value = query(db, "set role service_role; select row_to_json(x) from medshield_identity.append_audit_log('" + event + "','" + payload + "') x;")
        return json.loads(value)

    source, target = 'medshield_restore_source', 'medshield_restore_target'
    try:
        receipt['engine'] = command('postgres', ['--version']).stdout.strip()
        command('initdb', ['-D', str(data), '-U', 'postgres', '-E', 'UTF8', '--locale=C', '--auth=trust'])
        (data / 'pg_hba.conf').write_text('host all all 127.0.0.1/32 trust\nhost all all ::1/128 reject\n', encoding='ascii')
        with (data / 'postgresql.conf').open('a', encoding='ascii') as config:
            config.write(f"\nlisten_addresses='127.0.0.1'\nport={port}\nshared_buffers='32MB'\nmax_connections=20\n")
        command('pg_ctl', ['-D', str(data), '-l', str(run / 'postgres.log'), '-w', '-t', '30', 'start'])
        started = True
        check('cluster-listens-on-loopback-only', query('postgres', 'show listen_addresses;') == '127.0.0.1')
        query('postgres', 'create database ' + source + ';')
        spec = importlib.util.spec_from_file_location('migration_fixtures', ROOT / 'supabase/tests/test_migrations.py')
        fixtures = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(fixtures)
        query(source, fixtures.SETUP)
        migrations = sorted((ROOT / 'supabase/migrations').glob('*.sql'))
        receipt['migration_sha256'] = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in migrations}
        for migration in migrations:
            query(source, migration.read_text(encoding='utf-8'))
        check('actual-migration-chain-applied', True, migrations=len(migrations))
        query(source, fixtures.SEED + """
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into medshield_identity.accounts(username,email,password_hash,auth_user_id,role,password_reset_required) values
('restore-one','one@restore.invalid',null,'11111111-1111-4111-8111-111111111111','viewer',false),
('restore-two','two@restore.invalid',null,'22222222-2222-4222-8222-222222222222','manager',true);
""")
        append(source, '11111111-aaaa-4111-8111-111111111111')
        last = append(source, '22222222-aaaa-4222-8222-222222222222')
        before = fingerprint(source)
        schema_before = schema(source)
        (run / 'baseline-fingerprint.json').write_text(json.dumps(before, indent=2), encoding='utf-8')
        archive = run / 'synthetic-full.dump'
        command('pg_dump', [*base, '-d', source, '-Fc', '-f', str(archive)])
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        receipt['archive'] = {'sha256': digest, 'bytes': archive.stat().st_size, 'synthetic_only': True}
        toc = command('pg_restore', ['--list', str(archive)]).stdout
        (run / 'archive-toc.txt').write_text(toc, encoding='utf-8')
        check('archive-contains-auth-account-audit-and-checkpoint-data', all(x in toc for x in ['TABLE DATA auth users', 'TABLE DATA medshield_identity accounts', 'TABLE DATA medshield_identity audit_logs', 'TABLE DATA medshield_identity audit_chain_state']))
        # A damaged copy must be rejected by the integrity gate before restore.
        damaged = run / 'corrupted-copy.dump'
        blob = bytearray(archive.read_bytes()); blob[len(blob)//2] ^= 1; damaged.write_bytes(blob)
        check('corrupted-archive-detected-before-restore', hashlib.sha256(damaged.read_bytes()).hexdigest() != digest)
        query('postgres', 'drop database ' + source + ';')
        check('fixture-source-loss-simulated', query('postgres', "select count(*) from pg_database where datname='" + source + "';") == '0')
        query('postgres', 'create database ' + target + ';')
        start = time.monotonic()
        check('archive-hash-matches-before-use', hashlib.sha256(archive.read_bytes()).hexdigest() == digest)
        command('pg_restore', [*base, '-d', target, '--exit-on-error', '--single-transaction', str(archive)])
        receipt['restore_seconds'] = round(time.monotonic()-start, 4)
        after = fingerprint(target)
        (run / 'restored-fingerprint.json').write_text(json.dumps(after, indent=2), encoding='utf-8')
        check('all-user-table-rows-content-owners-acls-rls-match', before == after, tables=len(before), rows=sum(x['rows'] for x in before))
        check('normalized-schema-including-policies-functions-constraints-sequences-matches', schema_before == schema(target))
        checkpoint = json.loads(query(target, "select row_to_json(s) from medshield_identity.audit_chain_state s where chain_id='remote-v1';"))
        check('restored-audit-checkpoint-tip-matches', checkpoint['last_sequence'] == 2 and checkpoint['last_hash'] == last['entry_hash'])
        chain = json.loads(query(target, "select json_agg(x order by chain_sequence) from medshield_identity.audit_logs x;"))
        previous = '0'*64
        for i, item in enumerate(chain, 1):
            check('restored-independent-utf8-audit-hash-' + str(i), item['chain_sequence'] == i and item['previous_hash'] == previous and item['entry_hash'] == hashlib.sha256((previous+':'+item['hash_payload']).encode('utf-8')).hexdigest())
            previous = item['entry_hash']
        own = query(target, "set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; select string_agg(username,',') from medshield_identity.accounts;")
        check('restored-linked-profile-rls-own-row-only', own == 'restore-one')
        for role in ['anon', 'authenticated']:
            for relation in ['medshield_identity.audit_logs', 'medshield_sales.fact_sales_transactions']:
                denied(target, 'restored-' + role + '-read-denied-' + relation, 'select count(*) from ' + relation + ';', role)
            denied(target, 'restored-' + role + '-append-rpc-denied', "select medshield_identity.append_audit_log('33333333-aaaa-4333-8333-333333333333','{}');", role)
        check('restored-service-audit-read', query(target, 'set role service_role; select count(*) from medshield_identity.audit_logs;') == '2')
        check('restored-service-legacy-sales-read', query(target, 'set role service_role; select sum(net_cost_amount)=123.45 from medshield_sales.fact_sales_transactions;') == 't')
        new = append(target, '33333333-aaaa-4333-8333-333333333333')
        check('restored-append-continues-checkpoint-and-identity', new['chain_sequence'] == 3 and new['previous_hash'] == last['entry_hash'] and new['log_id'] > last['log_id'])
        replay = append(target, '33333333-aaaa-4333-8333-333333333333')
        check('restored-rpc-idempotence', replay['event_id'] == new['event_id'] and replay['entry_hash'] == new['entry_hash'] and query(target, 'select count(*) from medshield_identity.audit_logs;') == '3')
        next_account = query(target, "insert into medshield_identity.accounts(username,email,password_hash) values('restore-third','third@restore.invalid',null) returning account_id;")
        check('restored-account-identity-sequence-continues', int(next_account) > 2)
        receipt['status'] = 'PASS_LOCAL_SYNTHETIC_RESTORE_ONLY'
    except Exception as error:
        receipt['status'] = 'FAIL'; receipt['error'] = str(error)
        raise
    finally:
        if started or (data / 'postmaster.pid').exists():
            result = command('pg_ctl', ['-D', str(data), '-m', 'fast', '-w', '-t', '30', 'stop'], required=False)
            receipt['cluster_stopped'] = result.returncode == 0
        receipt['summary'] = {'checks': len(receipt['checks']), 'passed': sum(x['pass'] for x in receipt['checks']), 'failed': sum(not x['pass'] for x in receipt['checks'])}
        receipt['finished_at_utc'] = datetime.now(timezone.utc).isoformat()
        (run / 'verification.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
        print(json.dumps({'status': receipt['status'], **receipt['summary'], 'cluster_stopped': receipt['cluster_stopped'], 'run_directory': str(run)}))


if __name__ == '__main__':
    main()
