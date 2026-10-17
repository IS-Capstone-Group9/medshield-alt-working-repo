-- Read-only PostgreSQL 16/17 effective-ACL verification for migration 017.
-- Run as the database owner/review operator, e.g.:
--   psql --no-psqlrc --set=ON_ERROR_STOP=1 --csv --file=legacy_analytical_access.sql
-- Connection configuration belongs outside this file. This statement reads only
-- catalogs; it never reads business rows, calls application routines, changes a
-- role, writes objects or starts a transaction. Run in a quiet migration window:
-- a metadata snapshot does not prevent a later concurrent grant/object change.
-- PASS covers existing declared objects/privileges only. MISSING_GATE is never
-- evidence of denial. REVIEW_SCOPE requires owner disposition, including custom
-- dependent public views. Default ACLs/owners are inventory, not future approval.
-- has_*_privilege includes PUBLIC and immediately inherited role privileges.
-- Object privileges are tested even when schema USAGE/RLS would currently deny
-- a query, so those layers cannot conceal an unretracted object/column grant.
with recursive
expected_schemas(schema_name) as (
  values ('medshield_common'), ('medshield_etl'), ('medshield_sales'),
         ('medshield_external'), ('medshield_analytics')
),
expected_views(view_name) as (
  values ('vw_dashboard_monthly'), ('vw_dashboard_by_area'),
         ('vw_dashboard_top_products'), ('vw_dashboard_year_summary'),
         ('vw_dashboard_seasonality'), ('vw_dashboard_kpis'),
         ('vw_sales_with_dimensions'), ('vw_sales_transactions'),
         ('vw_dss_forecasts'), ('vw_dss_external_signals'),
         ('vw_dss_inventory_recommendations'), ('vw_dss_regional_priorities'),
         ('vw_dss_area_clusters'), ('vw_dss_product_priorities'),
         ('vw_dss_allocation_recommendations'), ('vw_dss_product_region_matches'),
         ('vw_dss_decision_alerts'), ('vw_dss_model_evaluation'),
         ('vw_product_master_status'), ('vw_area_mapping_status'),
         ('vw_data_completeness_status')
),
required_roles(role_name) as (values ('anon'), ('authenticated'), ('service_role')),
role_inventory as (
  select expected.role_name, r.oid, r.rolsuper, r.rolbypassrls, r.rolinherit
  from required_roles expected left join pg_catalog.pg_roles r
    on r.rolname = expected.role_name
),
browser_subjects(role_name) as (
  select 'public'::text
  union all
  select role_name from role_inventory
  where role_name in ('anon', 'authenticated') and oid is not null
),
schema_inventory as (
  select expected.schema_name, n.oid, n.nspowner
  from expected_schemas expected left join pg_catalog.pg_namespace n
    on n.nspname = expected.schema_name
),
view_inventory as (
  select expected.view_name, c.oid, c.relkind, c.relowner, c.reloptions
  from expected_views expected
  left join pg_catalog.pg_namespace n on n.nspname = 'public'
  left join pg_catalog.pg_class c on c.relnamespace = n.oid
    and c.relname = expected.view_name
),
relation_inventory as materialized (
  select c.oid, n.nspname, c.relname, c.relkind, c.relowner,
         c.relrowsecurity, c.relforcerowsecurity,
         pg_catalog.format('%I.%I', n.nspname, c.relname) as object_name
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p', 'v', 'm', 'f') and (
    n.nspname in (select schema_name from expected_schemas)
    or (n.nspname = 'public' and c.relname in (select view_name from expected_views))
  )
),
sequence_inventory as materialized (
  select c.oid, c.relowner, n.nspname,
         pg_catalog.format('%I.%I', n.nspname, c.relname) as object_name
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'S' and n.nspname in (select schema_name from expected_schemas)
),
required_functions(signature, expected_security_definer) as (
  values ('medshield_identity.resolve_login_identifier(text)', false),
         ('medshield_identity.append_audit_log(uuid,text)', true),
         ('public.sync_databricks_yearly_sales_candidate(jsonb,text,timestamptz,text)', false),
         -- Existing service-only refresh routines remain SECURITY DEFINER in
         -- migrations 007 and 015; this verification does not expand that scope.
         ('public.refresh_sales_aggregates(integer)', true),
         ('medshield_sales.refresh_sales_aggregates(integer)', true)
),
function_expectations as (
  select signature, expected_security_definer,
         pg_catalog.to_regprocedure(signature)::oid as oid
  from required_functions
),
routine_inventory as (
  select p.oid, p.proowner, p.prosecdef,
         pg_catalog.format('%I.%I(%s)', n.nspname, p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid)) as object_name
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname in (select schema_name from expected_schemas)
    or p.oid in (select oid from function_expectations where oid is not null)
),
table_privileges(privilege_name) as (
  select pg_catalog.unnest(
    array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
    || case when pg_catalog.current_setting('server_version_num')::integer >= 170000
            then array['MAINTAIN'] else array[]::text[] end
  )
),
column_privileges(privilege_name) as (values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')),
sequence_privileges(privilege_name) as (values ('USAGE'), ('SELECT'), ('UPDATE')),
schema_privileges(privilege_name) as (values ('USAGE'), ('CREATE')),
effective_schema_privileges as (
  select s.schema_name as object_name, subject.role_name,
         pg_catalog.jsonb_object_agg(p.privilege_name,
           pg_catalog.has_schema_privilege(subject.role_name::name, s.oid, p.privilege_name)) as privileges,
         pg_catalog.bool_or(pg_catalog.has_schema_privilege(subject.role_name::name, s.oid, p.privilege_name)) as any_granted
  from schema_inventory s cross join browser_subjects subject cross join schema_privileges p
  where s.oid is not null group by s.schema_name, subject.role_name
),
effective_relation_privileges as (
  select relation.object_name, subject.role_name,
         pg_catalog.jsonb_object_agg(p.privilege_name,
           pg_catalog.has_table_privilege(subject.role_name::name, relation.oid, p.privilege_name)) as privileges,
         pg_catalog.bool_or(pg_catalog.has_table_privilege(subject.role_name::name, relation.oid, p.privilege_name)) as any_granted
  from relation_inventory relation cross join browser_subjects subject cross join table_privileges p
  group by relation.object_name, subject.role_name
),
effective_column_privileges as (
  select relation.object_name, a.attname as column_name, subject.role_name,
         pg_catalog.jsonb_object_agg(p.privilege_name,
           pg_catalog.has_column_privilege(subject.role_name::name, relation.oid, a.attnum, p.privilege_name)) as privileges,
         pg_catalog.bool_or(pg_catalog.has_column_privilege(subject.role_name::name, relation.oid, a.attnum, p.privilege_name)) as any_granted
  from relation_inventory relation
  join pg_catalog.pg_attribute a on a.attrelid = relation.oid and a.attnum > 0 and not a.attisdropped
  cross join browser_subjects subject cross join column_privileges p
  group by relation.object_name, a.attname, subject.role_name
),
effective_sequence_privileges as (
  select sequence.object_name, subject.role_name,
         pg_catalog.jsonb_object_agg(p.privilege_name,
           pg_catalog.has_sequence_privilege(subject.role_name::name, sequence.oid, p.privilege_name)) as privileges,
         pg_catalog.bool_or(pg_catalog.has_sequence_privilege(subject.role_name::name, sequence.oid, p.privilege_name)) as any_granted
  from sequence_inventory sequence cross join browser_subjects subject cross join sequence_privileges p
  group by sequence.object_name, subject.role_name
),
retired_policies(schema_name, relation_name, policy_name) as (
  values ('medshield_sales', 'fact_sales_transactions', 'Sales: authenticated read'),
         ('medshield_analytics', 'fact_demand_forecast', 'Analytics: read published')
),
service_table_expectations(object_name, privilege_name, should_have) as (
  values ('medshield_identity.accounts', 'SELECT', true),
         ('medshield_identity.accounts', 'INSERT', true),
         ('medshield_identity.accounts', 'UPDATE', true),
         ('medshield_identity.accounts', 'DELETE', true),
         ('medshield_identity.audit_logs', 'SELECT', true),
         ('medshield_identity.audit_logs', 'INSERT', false),
         ('medshield_identity.audit_logs', 'UPDATE', false),
         ('medshield_identity.audit_logs', 'DELETE', false),
         ('medshield_identity.audit_logs', 'TRUNCATE', false),
         ('medshield_identity.audit_chain_state', 'SELECT', false),
         ('medshield_identity.audit_chain_state', 'INSERT', false),
         ('medshield_identity.audit_chain_state', 'UPDATE', false),
         ('medshield_identity.audit_chain_state', 'DELETE', false),
         ('medshield_identity.audit_chain_state', 'TRUNCATE', false),
         ('medshield_sales.databricks_yearly_sales_candidate', 'SELECT', true),
         ('medshield_sales.databricks_yearly_sales_candidate', 'INSERT', true),
         ('medshield_sales.databricks_yearly_sales_candidate', 'UPDATE', true),
         ('medshield_sales.databricks_yearly_sales_candidate', 'DELETE', true),
         ('medshield_sales.vw_databricks_yearly_sales_candidate', 'SELECT', true),
         ('medshield_etl.dim_source_system', 'SELECT', true),
         ('medshield_etl.etl_pipeline_run', 'SELECT', true),
         ('medshield_etl.etl_pipeline_run', 'INSERT', true),
         ('medshield_etl.etl_pipeline_run', 'UPDATE', true),
         ('medshield_etl.etl_source_extract', 'SELECT', true),
         ('medshield_etl.etl_source_extract', 'INSERT', true),
         ('medshield_etl.etl_source_extract', 'UPDATE', true)
),
service_table_checks as (
  select expected.*, pg_catalog.to_regclass(expected.object_name)::oid as oid,
         r.oid as role_oid
  from service_table_expectations expected
  left join role_inventory r on r.role_name = 'service_role'
),
service_sequence_expectations(object_name) as (
  values ('medshield_etl.etl_pipeline_run_pipeline_run_key_seq'),
         ('medshield_etl.etl_source_extract_source_extract_key_seq')
),
service_sequence_checks as (
  select expected.object_name, pg_catalog.to_regclass(expected.object_name)::oid as oid,
         r.oid as role_oid
  from service_sequence_expectations expected
  left join role_inventory r on r.role_name = 'service_role'
),
dependency_edges as (
  select distinct rewrite.ev_class as dependent_oid, dependency.refobjid as referenced_oid
  from pg_catalog.pg_rewrite rewrite
  join pg_catalog.pg_depend dependency on dependency.objid = rewrite.oid
    and dependency.classid = 'pg_catalog.pg_rewrite'::regclass
    and dependency.refclassid = 'pg_catalog.pg_class'::regclass
  where rewrite.ev_class <> dependency.refobjid
),
medshield_relations as (
  select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p', 'v', 'm', 'f') and (
    n.nspname in (select schema_name from expected_schemas) or n.nspname = 'medshield_identity'
  )
),
dependent_relations(oid) as (
  select oid from medshield_relations
  union
  select edge.dependent_oid from dependent_relations source
    join dependency_edges edge on edge.referenced_oid = source.oid
),
custom_public_views as (
  select c.oid, c.relowner, c.reloptions,
         pg_catalog.format('%I.%I', n.nspname, c.relname) as object_name
  from dependent_relations related
  join pg_catalog.pg_class c on c.oid = related.oid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v', 'm')
    and c.relname not in (select view_name from expected_views)
),
default_acl_inventory as (
  select pg_catalog.pg_get_userbyid(d.defaclrole) as owner_name,
         case when d.defaclnamespace = 0 then '(global)'
              else n.nspname::text end as schema_name,
         d.defaclobjtype::text as object_type,
         case when expanded.grantee = 0 then 'PUBLIC'
              else pg_catalog.pg_get_userbyid(expanded.grantee)::text end as grantee,
         expanded.privilege_type, expanded.is_grantable
  from pg_catalog.pg_default_acl d
  left join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral pg_catalog.aclexplode(d.defaclacl) expanded
  where d.defaclnamespace = 0 or n.nspname = 'public'
    or n.nspname in (select schema_name from expected_schemas)
    or n.nspname = 'medshield_identity'
),
object_owners(owner_oid) as (
  select nspowner from schema_inventory where oid is not null
  union select relowner from relation_inventory
  union select relowner from sequence_inventory
  union select proowner from routine_inventory
  union select relowner from custom_public_views
),
checks(check_type, object_name, role_name, status, details) as (
  select 'environment'::text, pg_catalog.current_database()::text, current_user::text, 'INFO'::text,
    pg_catalog.jsonb_build_object('server_version_num', pg_catalog.current_setting('server_version_num'),
      'checked_at', pg_catalog.statement_timestamp(), 'expected_public_views', 21,
      'expected_analytical_schemas', 5, 'metadata_only', true)
  union all
  select 'required_role', role_name, role_name,
    case when oid is null then 'MISSING_GATE' else 'PASS' end,
    pg_catalog.jsonb_build_object('exists', oid is not null, 'superuser', rolsuper,
      'bypass_rls', rolbypassrls, 'inherits', rolinherit)
  from role_inventory
  union all
  select 'browser_role_safety', role_name, role_name,
    case when rolsuper or rolbypassrls then 'FAIL' else 'PASS' end,
    pg_catalog.jsonb_build_object('superuser', rolsuper, 'bypass_rls', rolbypassrls)
  from role_inventory where oid is not null and role_name in ('anon', 'authenticated')
  union all
  select 'expected_schema', schema_name, null,
    case when oid is null then 'MISSING_GATE' else 'PASS' end,
    pg_catalog.jsonb_build_object('exists', oid is not null)
  from schema_inventory
  union all
  select 'expected_public_view', 'public.' || view_name, null,
    case when oid is null then 'MISSING_GATE'
         when relkind <> 'v' then 'FAIL'
         when not coalesce('security_invoker=true' = any(reloptions), false) then 'FAIL'
         else 'PASS' end,
    pg_catalog.jsonb_build_object('exists', oid is not null, 'relation_kind', relkind,
      'security_invoker', coalesce('security_invoker=true' = any(reloptions), false),
      'owner', case when relowner is not null then pg_catalog.pg_get_userbyid(relowner) end)
  from view_inventory
  union all
  select 'browser_schema', object_name, role_name,
    case when any_granted then 'FAIL' else 'PASS' end, privileges
  from effective_schema_privileges
  union all
  select 'browser_relation', object_name, role_name,
    case when any_granted then 'FAIL' else 'PASS' end, privileges
  from effective_relation_privileges
  union all
  select 'browser_column', object_name, role_name,
    case when any_granted then 'FAIL' else 'PASS' end,
    pg_catalog.jsonb_build_object('column', column_name, 'privileges', privileges)
  from effective_column_privileges
  union all
  select 'browser_sequence', object_name, role_name,
    case when any_granted then 'FAIL' else 'PASS' end, privileges
  from effective_sequence_privileges
  union all
  select 'browser_routine', routine.object_name, subject.role_name,
    case when pg_catalog.has_function_privilege(subject.role_name::name, routine.oid, 'EXECUTE')
      then 'FAIL' else 'PASS' end,
    pg_catalog.jsonb_build_object('EXECUTE', pg_catalog.has_function_privilege(subject.role_name::name, routine.oid, 'EXECUTE'),
      'security_definer', routine.prosecdef)
  from routine_inventory routine cross join browser_subjects subject
  union all
  select 'retired_public_read_policies', schema_name, null,
    case when exists (select 1 from pg_catalog.pg_policy policy
      join pg_catalog.pg_class relation on relation.oid = policy.polrelid
      join pg_catalog.pg_namespace n on n.oid = relation.relnamespace
      where n.nspname = schema_name and policy.polname = 'Public read')
      then 'FAIL' else 'PASS' end,
    pg_catalog.jsonb_build_object('remaining', (select pg_catalog.jsonb_agg(relation.relname)
      from pg_catalog.pg_policy policy
      join pg_catalog.pg_class relation on relation.oid = policy.polrelid
      join pg_catalog.pg_namespace n on n.oid = relation.relnamespace
      where n.nspname = schema_name and policy.polname = 'Public read'))
  from expected_schemas
  union all
  select 'retired_named_policy', schema_name || '.' || relation_name, null,
    case when pg_catalog.to_regclass(pg_catalog.format('%I.%I', schema_name, relation_name)) is null then 'MISSING_GATE'
      when exists (select 1 from pg_catalog.pg_policy policy where policy.polrelid =
        pg_catalog.to_regclass(pg_catalog.format('%I.%I', schema_name, relation_name)) and policy.polname = policy_name)
      then 'FAIL' else 'PASS' end,
    pg_catalog.jsonb_build_object('retired_policy', policy_name)
  from retired_policies
  union all
  select 'service_table_contract', object_name, 'service_role',
    case when oid is null or role_oid is null then 'MISSING_GATE'
      when pg_catalog.has_table_privilege(role_oid, oid, privilege_name) is distinct from should_have then 'FAIL'
      else 'PASS' end,
    pg_catalog.jsonb_build_object('privilege', privilege_name, 'expected', should_have,
      'actual', case when oid is not null and role_oid is not null then
        pg_catalog.has_table_privilege(role_oid, oid, privilege_name) end)
  from service_table_checks
  union all
  select 'service_function_contract', expected.signature, 'service_role',
    case when expected.oid is null or role.oid is null then 'MISSING_GATE'
      when not pg_catalog.has_function_privilege(role.oid, expected.oid, 'EXECUTE')
        or actual.prosecdef is distinct from expected.expected_security_definer then 'FAIL' else 'PASS' end,
    pg_catalog.jsonb_build_object('EXECUTE', case when role.oid is not null and expected.oid is not null then
        pg_catalog.has_function_privilege(role.oid, expected.oid, 'EXECUTE') end,
      'expected_security_definer', expected.expected_security_definer, 'actual_security_definer', actual.prosecdef)
  from function_expectations expected
  left join role_inventory role on role.role_name = 'service_role'
  left join pg_catalog.pg_proc actual on actual.oid = expected.oid
  union all
  select 'service_schema_usage', required.schema_name, 'service_role',
    case when n.oid is null or role.oid is null then 'MISSING_GATE'
      when pg_catalog.has_schema_privilege(role.oid, n.oid, 'USAGE') then 'PASS' else 'FAIL' end,
    pg_catalog.jsonb_build_object('USAGE', case when n.oid is not null and role.oid is not null then
      pg_catalog.has_schema_privilege(role.oid, n.oid, 'USAGE') end)
  from (select schema_name from expected_schemas union all select 'medshield_identity' union all select 'public') required
  left join pg_catalog.pg_namespace n on n.nspname = required.schema_name
  left join role_inventory role on role.role_name = 'service_role'
  union all
  select 'service_cache_sequence_contract', sequence.object_name, 'service_role',
    case when sequence.oid is null or sequence.role_oid is null then 'MISSING_GATE'
      when pg_catalog.has_sequence_privilege(sequence.role_oid, sequence.oid, 'USAGE')
       and pg_catalog.has_sequence_privilege(sequence.role_oid, sequence.oid, 'SELECT') then 'PASS' else 'FAIL' end,
    pg_catalog.jsonb_build_object('required_privileges', array['USAGE', 'SELECT'])
  from service_sequence_checks sequence
  union all
  select 'service_legacy_view_read', 'public.' || view.view_name, 'service_role',
    case when view.oid is null or role.oid is null then 'MISSING_GATE'
      when pg_catalog.has_table_privilege(role.oid, view.oid, 'SELECT') then 'PASS' else 'FAIL' end,
    pg_catalog.jsonb_build_object('SELECT', case when view.oid is not null and role.oid is not null then
      pg_catalog.has_table_privilege(role.oid, view.oid, 'SELECT') end)
  from view_inventory view left join role_inventory role on role.role_name = 'service_role'
  union all
  select 'linked_profile_select', 'medshield_identity.accounts', 'authenticated',
    case when relation.oid is null or role.oid is null then 'MISSING_GATE'
      when not relation.relrowsecurity or not pg_catalog.has_table_privilege(role.oid, relation.oid, 'SELECT')
        or not exists (select 1 from pg_catalog.pg_policy policy where policy.polrelid = relation.oid
          and policy.polname = 'Accounts: linked user read own profile' and policy.polcmd = 'r') then 'FAIL'
      else 'PASS' end,
    pg_catalog.jsonb_build_object('rls_enabled', relation.relrowsecurity, 'policy',
      (select pg_catalog.pg_get_expr(policy.polqual, policy.polrelid) from pg_catalog.pg_policy policy
       where policy.polrelid = relation.oid and policy.polname = 'Accounts: linked user read own profile'))
  from (values (1)) anchor(dummy)
  left join pg_catalog.pg_class relation on relation.oid = pg_catalog.to_regclass('medshield_identity.accounts')
  left join role_inventory role on role.role_name = 'authenticated'
  union all
  select 'custom_public_view_dependency', view.object_name, null, 'REVIEW_SCOPE',
    pg_catalog.jsonb_build_object('owner', pg_catalog.pg_get_userbyid(view.relowner),
      'security_invoker', coalesce('security_invoker=true' = any(view.reloptions), false),
      'browser_select', (select pg_catalog.jsonb_object_agg(subject.role_name,
        pg_catalog.has_any_column_privilege(subject.role_name::name, view.oid, 'SELECT')) from browser_subjects subject),
      'reason', 'Direct/transitive MedShield relation dependency outside the 21-view declared scope; owner must review.')
  from custom_public_views view
  union all
  select 'default_acl_inventory', schema_name || ':' || object_type, owner_name, 'INFO',
    pg_catalog.jsonb_build_object('grantee', grantee, 'privilege', privilege_type, 'is_grantable', is_grantable,
      'future_objects_approved', false)
  from default_acl_inventory
  union all
  select 'object_owner_inventory', pg_catalog.pg_get_userbyid(owner_oid), null, 'INFO',
    pg_catalog.jsonb_build_object('default_acl_owner_review_required', true,
      'future_defaults_verified', false)
  from object_owners
  union all
  select 'browser_owner_role_membership', pg_catalog.pg_get_userbyid(owner.owner_oid), browser.role_name,
    case when pg_catalog.pg_has_role(browser.oid, owner.owner_oid, 'USAGE')
           or pg_catalog.pg_has_role(browser.oid, owner.owner_oid, 'SET') then 'REVIEW_SCOPE' else 'PASS' end,
    pg_catalog.jsonb_build_object('immediate_owner_privileges', pg_catalog.pg_has_role(browser.oid, owner.owner_oid, 'USAGE'),
      'can_set_owner_role', pg_catalog.pg_has_role(browser.oid, owner.owner_oid, 'SET'))
  from object_owners owner cross join role_inventory browser
  where browser.oid is not null and browser.role_name in ('anon', 'authenticated')
),
summary as (
  select 'summary'::text as check_type, 'legacy_analytical_access'::text as object_name,
    null::text as role_name,
    case when pg_catalog.count(*) filter (where status = 'FAIL') > 0 then 'FAIL'
         when pg_catalog.count(*) filter (where status = 'MISSING_GATE') > 0 then 'MISSING_GATE'
         when pg_catalog.count(*) filter (where status = 'REVIEW_SCOPE') > 0 then 'REVIEW_SCOPE'
         else 'PASS' end as status,
    pg_catalog.jsonb_build_object('failures', pg_catalog.count(*) filter (where status = 'FAIL'),
      'missing_gates', pg_catalog.count(*) filter (where status = 'MISSING_GATE'),
      'scope_reviews', pg_catalog.count(*) filter (where status = 'REVIEW_SCOPE'),
      'passed_checks', pg_catalog.count(*) filter (where status = 'PASS'),
      'informational_rows', pg_catalog.count(*) filter (where status = 'INFO'),
      'future_default_privileges_approved', false,
      'application_routines_executed', false, 'remote_migration_proven', false) as details
  from checks
)
select check_type, object_name, role_name, status, details from (
  select check_type, object_name, role_name, status, details from summary
  union all
  select check_type, object_name, role_name, status, details from checks
) report
order by check_type, object_name, role_name, details::text;
