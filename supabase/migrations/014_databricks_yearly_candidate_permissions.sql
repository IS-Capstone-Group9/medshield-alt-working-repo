-- Restore the least-privilege grants required by the protected Databricks
-- yearly-candidate RPC. Migration 013 creates the objects and revokes all
-- browser-role access; this migration grants only the backend service_role
-- access that the security-invoker function needs.

begin;

grant usage on schema medshield_sales to service_role;
grant usage on schema medshield_etl to service_role;

grant select, insert, update, delete
on table medshield_sales.databricks_yearly_sales_candidate
to service_role;

grant select
on table medshield_sales.vw_databricks_yearly_sales_candidate
to service_role;

grant select
on table medshield_etl.dim_source_system
to service_role;

grant select, insert, update
on table medshield_etl.etl_pipeline_run,
           medshield_etl.etl_source_extract
to service_role;

grant usage, select
on all sequences in schema medshield_etl
to service_role;

grant execute on function public.sync_databricks_yearly_sales_candidate(
  jsonb,
  text,
  timestamptz,
  text
) to service_role;

notify pgrst, 'reload schema';

commit;
