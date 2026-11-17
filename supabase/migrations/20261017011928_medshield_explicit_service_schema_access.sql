-- Preserve explicit server-side analytical reads after removing PUBLIC grants.
-- Supabase remains application/auth/audit storage; these legacy relations do not
-- become a dashboard analytics source. No browser or write privilege is added.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

grant usage on schema
    medshield_common,
    medshield_etl,
    medshield_sales,
    medshield_external,
    medshield_analytics
to service_role;

grant select on all tables in schema
    medshield_common,
    medshield_etl,
    medshield_sales,
    medshield_external,
    medshield_analytics
to service_role;

notify pgrst, 'reload schema';
commit;
