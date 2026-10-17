"""Native PostgreSQL regression checks; creates only new local fixture databases.

Requires a disposable cluster with a superuser and pgcrypto, not a real Supabase
project. Supabase auth helpers/roles and old automatic grants are synthetic.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = sorted((ROOT / "supabase/migrations").glob("*.sql"))
SCHEMAS = "'medshield_common','medshield_etl','medshield_sales','medshield_external','medshield_analytics'"
VIEWS = sorted(set(re.findall(r"create\s+(?:or\s+replace\s+)?view\s+public\.(\w+)",
    "\n".join(p.read_text(encoding="utf-8") for p in MIGRATIONS if p.name < "017"), re.I)))
assert len(VIEWS) == 21
SETUP = """
do $$ begin
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth; create schema extensions;
create extension pgcrypto with schema extensions;
create table auth.users(id uuid primary key);
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth,extensions to anon,authenticated,service_role;
grant execute on function auth.role(),auth.uid() to anon,authenticated,service_role;
create table public.unrelated_fixture(value integer);
insert into public.unrelated_fixture values(42);
grant select on public.unrelated_fixture to anon,authenticated;
create view public.unrelated_fixture_view as select * from public.unrelated_fixture;
grant select on public.unrelated_fixture_view to anon,authenticated;
create function public.unrelated_fixture_function() returns integer language sql as $$ select 42 $$;
"""
OLD_DEFAULTS = """
alter default privileges in schema public grant all on tables to public,anon,authenticated,service_role;
alter default privileges in schema public grant all on sequences to public,anon,authenticated,service_role;
"""
OPTIONAL = """
create function medshield_identity.verify_login(text,text) returns void language sql as $$ select $$;
create function medshield_identity.create_account(text,text,text,text) returns void language sql as $$ select $$;
create function public.rls_auto_enable() returns event_trigger language plpgsql as $$ begin return; end $$;
grant execute on function medshield_identity.verify_login(text,text),medshield_identity.create_account(text,text,text,text),public.rls_auto_enable() to anon,authenticated;
"""
SEED = """
insert into medshield_common.dim_month(month_key,month_name,month_short_name) values(1,'January','Jan');
insert into medshield_common.dim_date(date_key,calendar_date,calendar_year,calendar_quarter,calendar_month,month_name,month_short_name,year_month,day_of_month)
values(20200101,'2020-01-01',2020,1,1,'January','Jan','2020-01',1);
insert into medshield_sales.fact_sales_transactions(delivery_date_key,source_workbook,source_sheet,source_row_number,source_hash,product_raw,net_cost_amount)
values(20200101,'synthetic.csv','Fixture',1,'synthetic-only','Synthetic product',123.45);
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--psql", required=True)
    parser.add_argument("--port", type=int, default=55432)
    parser.add_argument("--user", default="postgres")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--baseline-011", type=Path)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("Use an unprivileged disposable local port")
    args.output.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    receipt = {"checked_at_utc": datetime.now(timezone.utc).isoformat(), "engine": "native PostgreSQL",
        "scope": "Disposable loopback cluster; synthetic Supabase roles/auth/default grants and business fixtures; no remote migration",
        "migrations_sha256": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in MIGRATIONS},
        "checks": [], "profiles": [], "limitations": ["Not actual Supabase Auth/PostgREST or deployed ACL certification", "Custom inherited roles, aliases and future object creators require deployed inventory"]}
    base = [args.psql, "-X", "-qAt", "-h", "127.0.0.1", "-p", str(args.port), "-U", args.user,
            "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"]

    def run(db, sql, required=True):
        result = subprocess.run([*base, "-d", db], input="set search_path=public,extensions,pg_catalog;\n"+sql,
                                text=True, encoding="utf-8", capture_output=True, timeout=60,
                                env={**os.environ, "PGCLIENTENCODING": "UTF8", "PGCONNECT_TIMEOUT": "10"})
        if required and result.returncode:
            raise AssertionError(result.stderr)
        return result

    def check(db, name, sql, expected, role=None, denied=False, error_code=None):
        prefix = f"set role {role}; select set_config('request.jwt.claim.role','{role}',false);\n" if role else ""
        result = run(db, prefix+sql, required=False)
        actual = result.stdout.strip().splitlines()[-1] if result.stdout.strip() else ""
        code = error_code or ("42501" if denied else None)
        passed = result.returncode != 0 and code in result.stderr if code else result.returncode == 0 and actual == str(expected)
        receipt["checks"].append({"database": db, "name": name, "role": role or args.user,
            "status": "PASS" if passed else "FAIL", "expected": "SQLSTATE"+code if code else expected,
            "observed": "SQLSTATE"+code if code and passed else actual,
            "error": result.stderr.strip() if not passed else None})
        assert passed, (name, actual, result.stderr)

    def create(profile, old=False):
        db = f"medshield_t06_{profile}_{stamp}"
        run("postgres", f'create database "{db}";')
        run(db, SETUP + (OLD_DEFAULTS if old else ""))
        receipt["profiles"].append({"name": profile, "database": db, "migrations": []})
        return db

    def apply(db, path):
        run(db, path.read_text(encoding="utf-8"))
        receipt["profiles"][-1]["migrations"].append(path.name)

    try:
        receipt["version"] = run("postgres", "select version();").stdout.strip()
        if args.baseline_011:
            db = create("baseline", old=True)
            for path in MIGRATIONS[:10]: apply(db, path)
            run(db, SEED)
            failure = run(db, args.baseline_011.read_text(encoding="utf-8"), required=False)
            assert failure.returncode != 0 and "42883" in failure.stderr
            receipt["baseline_bootstrap"] = {"status": "EXPECTED_FAILURE", "sqlstate": "42883", "stderr": failure.stderr.strip()}
            for role in ["anon", "authenticated"]:
                check(db, "baseline_old_sales_view_exposes_synthetic_value", "select sum(net_cost)=123.45 from public.vw_sales_transactions;", "t", role)
                check(db, "baseline_old_forecast_view_allows_read", "select count(*) from public.vw_dss_forecasts;", 0, role)

        for old in [False, True]:
            db = create("legacy" if old else "restrictive", old)
            for path in MIGRATIONS[:16]:
                if path.name.startswith("011") and old: run(db, OPTIONAL)
                apply(db, path)
                if path.name.startswith("011"):
                    for signature in ["public.verify_login(text,text)", "public.create_account(text,text,text,text)"] + (["medshield_identity.verify_login(text,text)", "medshield_identity.create_account(text,text,text,text)", "public.rls_auto_enable()"] if old else []):
                        for role in ["anon", "authenticated"]:
                            check(db, "optional_existing_function_revoked", f"select has_function_privilege('{role}','{signature}','EXECUTE');", "f")
            run(db, SEED + """
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into medshield_identity.accounts(username,email,password_hash,auth_user_id) values
('fixture-one','one@example.test',null,'11111111-1111-4111-8111-111111111111'),
('fixture-two','two@example.test',null,'22222222-2222-4222-8222-222222222222');
"""
            )
            if old:
                for schema in SCHEMAS.replace("'", "").split(","):
                    run(db, f"grant usage on schema {schema} to public,anon,authenticated; grant all on all tables in schema {schema} to public,anon,authenticated; grant all on all sequences in schema {schema} to public,anon,authenticated;")
                run(db, """
revoke all on public.vw_sales_transactions from public,anon,authenticated;
grant select(net_cost) on public.vw_sales_transactions to public,anon,authenticated;
revoke all on medshield_sales.fact_sales_transactions from public,anon,authenticated;
grant select(net_cost_amount) on medshield_sales.fact_sales_transactions to public,anon,authenticated;
"""
                )
                check(db, "pre_repair_column_only_grant_exists", "select not has_table_privilege('anon','public.vw_sales_transactions','SELECT') and has_any_column_privilege('anon','public.vw_sales_transactions','SELECT');", "t")
            check(db, "pre_repair_synthetic_rows", "select count(*)=1 and sum(net_cost_amount)=123.45 from medshield_sales.fact_sales_transactions;", "t")
            apply(db, MIGRATIONS[16])
            apply(db, MIGRATIONS[16])
            check(db, "hardening_preserves_synthetic_rows", "select count(*)=1 and sum(net_cost_amount)=123.45 from medshield_sales.fact_sales_transactions;", "t")
            for role in ["anon", "authenticated"]:
                for view in VIEWS:
                    check(db, "legacy_view_read_denied:"+view, f"select * from public.{view} limit 1;", None, role, denied=True)
                check(db, "legacy_views_all_invoker", "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'vw_%' and not coalesce(c.reloptions @> array['security_invoker=true'],false);", 0)
                check(db, "analytical_relation_column_privileges_removed", f"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname in ({SCHEMAS}) or (n.nspname='public' and c.relname like 'vw_%')) and c.relkind in ('r','p','v','m','f') and (has_table_privilege('{role}',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or has_any_column_privilege('{role}',c.oid,'SELECT,INSERT,UPDATE,REFERENCES'));", 0)
                check(db, "analytical_schema_privileges_removed", f"select count(*) from pg_namespace where nspname in ({SCHEMAS}) and has_schema_privilege('{role}',oid,'USAGE,CREATE');", 0)
                check(db, "analytical_sequence_privileges_removed", f"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ({SCHEMAS}) and case when c.relkind='S' then has_sequence_privilege('{role}',c.oid,'USAGE,SELECT,UPDATE') else false end;", 0)
                check(db, "analytical_routine_privileges_removed", f"select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ({SCHEMAS}) and has_function_privilege('{role}',p.oid,'EXECUTE');", 0)
                for target in ["medshield_sales.fact_sales_transactions", "medshield_sales.databricks_yearly_sales_candidate", "medshield_identity.audit_logs"]:
                    check(db, "private_read_denied:"+target, f"select count(*) from {target};", None, role, denied=True)
                for rpc in ["public.refresh_sales_aggregates(20200101)", "public.sync_databricks_yearly_sales_candidate('[]'::jsonb,repeat('0',64),now(),null)"]:
                    check(db, "browser_rpc_denied", "select "+rpc+";", None, role, denied=True)
                check(db, "unrelated_public_acl_unchanged", "select sum(value) from public.unrelated_fixture;", 42, role)
                check(db, "unrelated_public_view_unchanged", "select sum(value) from public.unrelated_fixture_view;", 42, role)
                check(db, "unrelated_public_function_unchanged", "select public.unrelated_fixture_function();", 42, role)
                check(db, "invoker_denies_after_view_only_regrant", f"begin; grant select on public.vw_sales_transactions to {role}; set role {role}; select count(*) from public.vw_sales_transactions;", None, denied=True)
            check(db, "retired_browser_read_policies", f"select count(*) from pg_policies where schemaname in ({SCHEMAS}) and policyname in ('Public read','Sales: authenticated read','Analytics: read published');", 0)
            sub = "select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);"
            check(db, "linked_profile_own_only", sub+"select string_agg(username,',') from medshield_identity.accounts;", "fixture-one", "authenticated")
            check(db, "linked_profile_cannot_change_role", sub+"update medshield_identity.accounts set role='admin';", None, "authenticated", denied=True)
            check(db, "anonymous_account_read_denied", "select count(*) from medshield_identity.accounts;", None, "anon", denied=True)
            check(db, "service_resolves_identity", "select username from medshield_identity.resolve_login_identifier('fixture-one');", "fixture-one", "service_role")
            for view in VIEWS:
                check(db, "service_view_read:"+view, f"select count(*) >= 0 from public.{view};", "t", "service_role")
            check(db, "service_candidate_cache_read", "select count(*) from medshield_sales.vw_databricks_yearly_sales_candidate;", 0, "service_role")
            check(db, "service_candidate_rpc_reaches_validation", "select (public.sync_databricks_yearly_sales_candidate('[]'::jsonb,repeat('0',64),now(),null)->>'candidate_cache_preserved')::boolean;", "t", "service_role")
            check(db, "service_refresh_still_works", "select public.refresh_sales_aggregates(20200101); select sum(revenue_amount)=123.45 from medshield_sales.fact_year_summary;", "t", "service_role")
            event = "00000000-0000-4000-8000-000000000001"
            payload = json.dumps(dict(event_id=event,username="fixture",action="TEST",detail="Synthetic ₱ audit",ip_address="127.0.0.1",user_agent="native-fixture",created_at="2026-10-16T00:00:00Z"), ensure_ascii=False,separators=(",",":"))
            append = f"select entry_hash from medshield_identity.append_audit_log('{event}','{payload}');"
            digest = hashlib.sha256(("0"*64+":"+payload).encode()).hexdigest()
            check(db, "service_audit_utf8_digest", append, digest, "service_role")
            check(db, "service_audit_idempotent", append, digest, "service_role")
            check(db, "changed_uuid_payload_rejected", append.replace("Synthetic ₱ audit", "Changed fixture"), None, "service_role", error_code="22023")
            for role in ["anon", "authenticated"]:
                check(db, "browser_audit_append_denied", append, None, role, denied=True)
            check(db, "service_direct_audit_write_denied", "insert into medshield_identity.audit_logs(action,detail) values('TEST','fixture');", None, "service_role", denied=True)
            check(db, "audit_single_idempotent_row", "select count(*) from medshield_identity.audit_logs;", 1, "service_role")
            def concurrent_append(i):
                event_id = f"00000000-0000-4000-8000-{i:012d}"
                text = payload.replace(event, event_id)
                return run(db, f"set role service_role; select chain_sequence from medshield_identity.append_audit_log('{event_id}','{text}');").stdout.strip()
            with ThreadPoolExecutor(max_workers=4) as pool:
                sequences = list(pool.map(concurrent_append, range(2, 10)))
            assert sorted(map(int,sequences)) == list(range(2,10))
            check(db, "native_multi_connection_audit_chain", "select count(*)=9 and count(distinct chain_sequence)=9 and max(chain_sequence)=9 from medshield_identity.audit_logs;", "t", "service_role")
            chain = json.loads(run(db, "select json_agg(json_build_object('sequence',chain_sequence,'previous',previous_hash,'hash',entry_hash,'payload',hash_payload) order by chain_sequence) from medshield_identity.audit_logs;").stdout)
            previous = "0"*64
            for row in chain:
                assert row["previous"] == previous
                assert row["hash"] == hashlib.sha256((previous+":"+row["payload"]).encode()).hexdigest()
                previous = row["hash"]
            receipt["profiles"][-1]["independent_chain_reconciliation"] = {"rows":9,"status":"PASS"}
        receipt["status"] = "PASS"
    except Exception as error:
        receipt["status"] = "FAIL"
        receipt["failure"] = str(error)
        raise
    finally:
        receipt["summary"] = {"checks": len(receipt["checks"]), "passed": sum(c["status"]=="PASS" for c in receipt["checks"])}
        (args.output/"native-regression.json").write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        print(json.dumps({"status": receipt["status"], **receipt["summary"]}))


if __name__ == "__main__":
    main()
