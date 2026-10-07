-- Enable Row Level Security (RLS) on MedShield Namespaced Schemas

-- 1. Enable RLS on core identity and fact tables
alter table if exists medshield_identity.accounts enable row level security;
alter table if exists medshield_sales.fact_sales_transactions enable row level security;
alter table if exists medshield_sales.stg_sales_transactions enable row level security;
alter table if exists medshield_analytics.fact_demand_forecast enable row level security;
alter table if exists medshield_analytics.fact_inventory_recommendation enable row level security;
alter table if exists medshield_analytics.fact_decision_alert enable row level security;

-- 2. Policies for medshield_identity.accounts
drop policy if exists "Accounts: service role full access" on medshield_identity.accounts;
create policy "Accounts: service role full access" on medshield_identity.accounts
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- 3. Policies for medshield_sales.fact_sales_transactions
drop policy if exists "Sales: service role write" on medshield_sales.fact_sales_transactions;
create policy "Sales: service role write" on medshield_sales.fact_sales_transactions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Sales: authenticated read" on medshield_sales.fact_sales_transactions;
create policy "Sales: authenticated read" on medshield_sales.fact_sales_transactions
  for select using (auth.role() in ('authenticated', 'anon', 'service_role'));

-- 4. Policies for medshield_analytics tables
drop policy if exists "Analytics: read published" on medshield_analytics.fact_demand_forecast;
create policy "Analytics: read published" on medshield_analytics.fact_demand_forecast
  for select using (true);

drop policy if exists "Analytics: service role write" on medshield_analytics.fact_demand_forecast;
create policy "Analytics: service role write" on medshield_analytics.fact_demand_forecast
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

