-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.analytics_totals (
  total_revenue numeric NOT NULL,
  total_income numeric NOT NULL,
  total_transactions integer NOT NULL CHECK (total_transactions >= 0),
  top_product text NOT NULL,
  top_area text NOT NULL,
  avg_margin numeric NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.analytics_monthly (
  period text NOT NULL,
  revenue numeric NOT NULL,
  income numeric NOT NULL,
  CONSTRAINT analytics_monthly_pkey PRIMARY KEY (period)
);
CREATE TABLE public.analytics_by_area (
  area text NOT NULL,
  revenue numeric NOT NULL,
  income numeric NOT NULL,
  CONSTRAINT analytics_by_area_pkey PRIMARY KEY (area)
);
CREATE TABLE public.analytics_top_products (
  product text NOT NULL,
  revenue numeric NOT NULL,
  qty numeric NOT NULL,
  income numeric NOT NULL,
  abc text NOT NULL,
  pct_of_total numeric NOT NULL,
  CONSTRAINT analytics_top_products_pkey PRIMARY KEY (product)
);
CREATE TABLE public.analytics_year_summary (
  year text NOT NULL,
  revenue numeric NOT NULL,
  income numeric NOT NULL,
  transactions integer NOT NULL,
  CONSTRAINT analytics_year_summary_pkey PRIMARY KEY (year)
);
CREATE TABLE public.analytics_seasonality (
  month_num smallint NOT NULL,
  month text NOT NULL,
  avg_revenue numeric NOT NULL,
  CONSTRAINT analytics_seasonality_pkey PRIMARY KEY (month_num)
);
CREATE TABLE public.dim_date (
  date_key integer NOT NULL,
  calendar_date date NOT NULL UNIQUE,
  calendar_year smallint NOT NULL,
  calendar_quarter smallint NOT NULL,
  calendar_month smallint NOT NULL,
  month_name text NOT NULL,
  month_short_name text NOT NULL,
  year_month text NOT NULL UNIQUE,
  day_of_month smallint NOT NULL,
  is_month_end boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dim_date_pkey PRIMARY KEY (date_key)
);
CREATE TABLE public.dim_month (
  month_key smallint NOT NULL CHECK (month_key >= 1 AND month_key <= 12),
  month_name text NOT NULL UNIQUE,
  month_short_name text NOT NULL UNIQUE,
  CONSTRAINT dim_month_pkey PRIMARY KEY (month_key)
);
CREATE TABLE public.dim_area (
  area_key bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  area_name text NOT NULL UNIQUE,
  area_group text NOT NULL DEFAULT 'territory'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dim_area_pkey PRIMARY KEY (area_key)
);
CREATE TABLE public.dim_product (
  product_key bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  product_name text NOT NULL UNIQUE,
  abc_classification text,
  product_group text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dim_product_pkey PRIMARY KEY (product_key)
);
CREATE TABLE public.fact_monthly_sales (
  monthly_sales_key bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  period_date_key integer NOT NULL,
  snapshot_date_key integer NOT NULL,
  revenue_amount numeric NOT NULL DEFAULT 0,
  income_amount numeric NOT NULL DEFAULT 0,
  source_period text NOT NULL UNIQUE,
  source_system text NOT NULL DEFAULT 'medshield_dashboard'::text,
  loaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fact_monthly_sales_pkey PRIMARY KEY (monthly_sales_key),
  CONSTRAINT fact_monthly_sales_period_date_key_fkey FOREIGN KEY (period_date_key) REFERENCES public.dim_date(date_key),
  CONSTRAINT fact_monthly_sales_snapshot_date_key_fkey FOREIGN KEY (snapshot_date_key) REFERENCES public.dim_date(date_key)
);
CREATE TABLE public.fact_area_summary (
  area_summary_key bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  snapshot_date_key integer NOT NULL,
  area_key bigint NOT NULL,
  revenue_amount numeric NOT NULL DEFAULT 0,
  income_amount numeric NOT NULL DEFAULT 0,
  source_rank integer NOT NULL DEFAULT 0,
  source_scope text NOT NULL DEFAULT 'all_time'::text,
  loaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fact_area_summary_pkey PRIMARY KEY (area_summary_key),
  CONSTRAINT fact_area_summary_snapshot_date_key_fkey FOREIGN KEY (snapshot_date_key) REFERENCES public.dim_date(date_key),
  CONSTRAINT fact_area_summary_area_key_fkey FOREIGN KEY (area_key) REFERENCES public.dim_area(area_key)
);
CREATE TABLE public.fact_product_summary (
  product_summary_key bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  snapshot_date_key integer NOT NULL,
  product_key bigint NOT NULL,
  revenue_amount numeric NOT NULL DEFAULT 0,
  quantity_sold numeric NOT NULL DEFAULT 0,
  income_amount numeric NOT NULL DEFAULT 0,
  abc_classification text NOT NULL,
  pct_of_total numeric NOT NULL DEFAULT 0,
  source_rank integer NOT NULL DEFAULT 0,
  source_scope text NOT NULL DEFAULT 'all_time'::text,
  loaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fact_product_summary_pkey PRIMARY KEY (product_summary_key),
  CONSTRAINT fact_product_summary_snapshot_date_key_fkey FOREIGN KEY (snapshot_date_key) REFERENCES public.dim_date(date_key),
  CONSTRAINT fact_product_summary_product_key_fkey FOREIGN KEY (product_key) REFERENCES public.dim_product(product_key)
);
CREATE TABLE public.fact_year_summary (
  year_summary_key bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  snapshot_date_key integer NOT NULL,
  year_date_key integer NOT NULL,
  revenue_amount numeric NOT NULL DEFAULT 0,
  income_amount numeric NOT NULL DEFAULT 0,
  transactions_count integer NOT NULL DEFAULT 0,
  loaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fact_year_summary_pkey PRIMARY KEY (year_summary_key),
  CONSTRAINT fact_year_summary_snapshot_date_key_fkey FOREIGN KEY (snapshot_date_key) REFERENCES public.dim_date(date_key),
  CONSTRAINT fact_year_summary_year_date_key_fkey FOREIGN KEY (year_date_key) REFERENCES public.dim_date(date_key)
);
CREATE TABLE public.fact_seasonality (
  seasonality_key bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  snapshot_date_key integer NOT NULL,
  month_key smallint NOT NULL,
  avg_revenue_amount numeric NOT NULL DEFAULT 0,
  loaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fact_seasonality_pkey PRIMARY KEY (seasonality_key),
  CONSTRAINT fact_seasonality_snapshot_date_key_fkey FOREIGN KEY (snapshot_date_key) REFERENCES public.dim_date(date_key),
  CONSTRAINT fact_seasonality_month_key_fkey FOREIGN KEY (month_key) REFERENCES public.dim_month(month_key)
);
CREATE TABLE public.accounts (
  account_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'viewer'::text CHECK (role = ANY (ARRAY['admin'::text, 'analyst'::text, 'manager'::text, 'viewer'::text])),
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (account_id)
);