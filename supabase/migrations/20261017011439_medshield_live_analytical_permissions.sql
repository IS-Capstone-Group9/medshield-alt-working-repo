-- Live-layout adaptation of017; historical migration files remain intact.
-- Supabase analytics are historical/candidate-only. Dashboard measures are served
-- by the authenticated gateway from Databricks, never directly to browser roles.
-- Apply after 016; preserve identity/profile and service-only cache/audit grants.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  analytical_schema text;
  legacy_view text;
  relation record;
  columns text;
  legacy_views text[] := array[
    'vw_dashboard_monthly', 'vw_dashboard_by_area', 'vw_dashboard_top_products',
    'vw_dashboard_year_summary', 'vw_dashboard_seasonality', 'vw_dashboard_kpis',
    'vw_sales_with_dimensions', 'vw_sales_transactions', 'vw_dss_forecasts',
    'vw_dss_external_signals', 'vw_dss_inventory_recommendations',
    'vw_dss_regional_priorities', 'vw_dss_area_clusters',
    'vw_dss_product_priorities', 'vw_dss_allocation_recommendations',
    'vw_dss_product_region_matches', 'vw_dss_decision_alerts',
    'vw_dss_model_evaluation', 'vw_product_master_status',
    'vw_area_mapping_status', 'vw_data_completeness_status'

  ];
begin
  foreach analytical_schema in array array[
    'medshield_common', 'medshield_etl', 'medshield_sales',
    'medshield_external', 'medshield_analytics'
  ] loop
    execute format('revoke all on schema %I from public, anon, authenticated', analytical_schema);
    execute format('revoke all on all tables in schema %I from public, anon, authenticated', analytical_schema);
    execute format('revoke all on all sequences in schema %I from public, anon, authenticated', analytical_schema);
    execute format('revoke all on all functions in schema %I from public, anon, authenticated', analytical_schema);

    -- Older migrations attached this permissive policy before moving tables.
    for relation in
      select schemaname, tablename from pg_policies
      where schemaname = analytical_schema and policyname = 'Public read'
    loop
      execute format('drop policy "Public read" on %I.%I', relation.schemaname, relation.tablename);
    end loop;
  end loop;

  -- Restrict only MedShield-owned legacy public views; leave other apps' public
  -- objects/default privileges alone. Underlying grants are also revoked below:
  -- invoker semantics or private schema usage alone cannot secure old view ACLs.
  foreach legacy_view in array legacy_views loop
    if to_regclass(format('public.%I', legacy_view)) is not null then
      execute format('revoke all on public.%I from public, anon, authenticated', legacy_view);
      execute format('alter view public.%I set (security_invoker = true)', legacy_view);
      execute format('grant select on public.%I to service_role', legacy_view);
    end if;
  end loop;

  -- This live project already moved the legacy views to private schemas.
  -- Preserve their definitions/service use and enforce caller-based base access.
  for relation in
    select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='v' and c.relname=any(legacy_views) and n.nspname in (
      'medshield_common','medshield_etl','medshield_sales',
      'medshield_external','medshield_analytics'
    )
  loop
    execute format('alter view %I.%I set (security_invoker = true)', relation.nspname,relation.relname);
    execute format('grant select on %I.%I to service_role', relation.nspname,relation.relname);
  end loop;

  -- Relation-level REVOKE does not remove independent column ACLs. Retire those
  -- too, including prior column grants on the public views and private tables.
  for relation in
    select n.nspname, c.relname, c.oid
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p', 'v', 'm', 'f') and (
      n.nspname in ('medshield_common', 'medshield_etl', 'medshield_sales',
                    'medshield_external', 'medshield_analytics')
      or (n.nspname = 'public' and c.relname = any(legacy_views))
    )
  loop
    select string_agg(format('%I', a.attname), ', ' order by a.attnum)
      into columns from pg_attribute a
      where a.attrelid = relation.oid and a.attnum > 0 and not a.attisdropped;
    if columns is not null then
      execute format('revoke all (%s) on table %I.%I from public, anon, authenticated',
                     columns, relation.nspname, relation.relname);
    end if;
  end loop;
end
$$;

drop policy if exists "Sales: authenticated read" on medshield_sales.fact_sales_transactions;
drop policy if exists "Analytics: read published" on medshield_analytics.fact_demand_forecast;

-- The public wrapper was already removed on this project; do not recreate it.
do $$
begin
  if to_regprocedure('public.refresh_sales_aggregates(integer)') is not null then
    revoke all on function public.refresh_sales_aggregates(integer) from public, anon, authenticated;
    grant execute on function public.refresh_sales_aggregates(integer) to service_role;
  end if;
end
$$;

notify pgrst, 'reload schema';
commit;
