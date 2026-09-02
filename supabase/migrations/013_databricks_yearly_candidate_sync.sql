-- Protected Databricks Gold yearly-candidate cache and atomic pilot sync.
-- Apply after 012_retire_legacy_auth_surface.sql.
--
-- This migration deliberately does not replace fact_year_summary or any
-- published dashboard view. Financial measures remain candidates pending
-- Finance/business-owner approval.

create extension if not exists pgcrypto;

create schema if not exists medshield_sales;
create schema if not exists medshield_etl;

insert into medshield_etl.dim_source_system (
  source_code,
  source_name,
  source_type,
  base_url,
  refresh_cadence,
  credibility_note,
  is_active
) values (
  'DATABRICKS_GOLD',
  'MedShield Databricks Gold Candidate Views',
  'internal',
  null,
  'Administrator-triggered controlled synchronization',
  'Validated Gold candidate aggregates. Financial measures remain pending Finance/business-owner approval.',
  true
)
on conflict (source_code) do update set
  source_name = excluded.source_name,
  source_type = excluded.source_type,
  base_url = null,
  refresh_cadence = excluded.refresh_cadence,
  credibility_note = excluded.credibility_note,
  is_active = true;

create table if not exists medshield_sales.databricks_yearly_sales_candidate (
  -- Keep the storage contract future-capable. The pilot RPC below applies the
  -- stricter 2017-2025 acceptance gate requested for this first synchronization.
  calendar_year smallint primary key check (calendar_year between 2000 and 2100),
  first_delivery_date date,
  last_delivery_date date,
  calendar_month_count bigint not null,
  active_month_count bigint not null,
  zero_activity_month_count bigint not null,
  month_activity_status text not null,
  transaction_count bigint not null,
  distinct_dr_count bigint not null,
  distinct_area_count bigint not null,
  distinct_product_count bigint not null,
  warning_transaction_count bigint not null,
  fully_eligible_transaction_count bigint not null,
  partially_eligible_transaction_count bigint not null,
  dimension_only_transaction_count bigint not null,
  source_year_mismatch_count bigint not null,
  negative_quantity_review_count bigint not null,
  financial_formula_warning_count bigint not null,
  quantity_eligible_transaction_count bigint not null,
  gross_sales_eligible_transaction_count bigint not null,
  net_sales_eligible_transaction_count bigint not null,
  transfer_value_eligible_transaction_count bigint not null,
  gross_margin_eligible_transaction_count bigint not null,
  total_quantity_candidate numeric(30, 6),
  gross_sales_candidate numeric(30, 6),
  net_sales_candidate numeric(30, 6),
  transfer_value_candidate numeric(30, 6),
  gross_margin_candidate numeric(30, 6),
  weighted_gross_margin_pct_candidate numeric(37, 4),
  warning_transaction_rate double precision,
  fully_eligible_transaction_rate double precision,
  quantity_coverage_rate double precision,
  net_sales_coverage_rate double precision,
  gross_margin_coverage_rate double precision,
  previous_calendar_year smallint,
  previous_transaction_count bigint,
  previous_total_quantity_candidate numeric(30, 6),
  previous_gross_sales_candidate numeric(30, 6),
  previous_net_sales_candidate numeric(30, 6),
  previous_gross_margin_candidate numeric(30, 6),
  transaction_count_yoy_pct double precision,
  quantity_yoy_pct_candidate double precision,
  gross_sales_yoy_pct_candidate double precision,
  net_sales_yoy_pct_candidate double precision,
  gross_margin_yoy_pct_candidate double precision,
  yoy_comparison_status text not null,
  financial_definition_status text not null check (
    financial_definition_status = 'CANDIDATE_PENDING_FINANCE_APPROVAL'
  ),
  pipeline_run_key bigint not null references medshield_etl.etl_pipeline_run(pipeline_run_key) on update cascade on delete restrict,
  source_extract_key bigint not null references medshield_etl.etl_source_extract(source_extract_key) on update cascade on delete restrict,
  source_view text not null check (
    source_view = 'workspace.medshield_gold.vw_dashboard_yearly_sales_candidate'
  ),
  source_row_hash text not null check (source_row_hash ~ '^[0-9a-f]{64}$'),
  source_checked_at timestamptz not null,
  synced_at timestamptz not null default now()
);

comment on table medshield_sales.databricks_yearly_sales_candidate is
  'Protected shadow cache of the nine validated Databricks Gold yearly candidate rows. Not a Finance-approved publication table.';
comment on column medshield_sales.databricks_yearly_sales_candidate.transfer_value_candidate is
  'Candidate dashboard revenue measure derived from workbook total trade/transfer price; pending approval.';
comment on column medshield_sales.databricks_yearly_sales_candidate.gross_margin_candidate is
  'Candidate workbook gross margin/profit measure; never company net income.';

create index if not exists idx_databricks_yearly_candidate_run
  on medshield_sales.databricks_yearly_sales_candidate (pipeline_run_key);
create index if not exists idx_databricks_yearly_candidate_extract
  on medshield_sales.databricks_yearly_sales_candidate (source_extract_key);

alter table medshield_sales.databricks_yearly_sales_candidate enable row level security;

drop policy if exists "Databricks yearly candidate: service role only"
  on medshield_sales.databricks_yearly_sales_candidate;

-- Intentionally create no browser-role policy. The backend secret maps to the
-- service_role Postgres role, which bypasses RLS; anon and authenticated are
-- also denied at the object-grant layer below.

revoke all on table medshield_sales.databricks_yearly_sales_candidate
  from public, anon, authenticated;
grant select, insert, update, delete
  on table medshield_sales.databricks_yearly_sales_candidate
  to service_role;

create or replace view medshield_sales.vw_databricks_yearly_sales_candidate
with (security_invoker = true)
as
select *
from medshield_sales.databricks_yearly_sales_candidate;

revoke all on table medshield_sales.vw_databricks_yearly_sales_candidate
  from public, anon, authenticated;
grant select on table medshield_sales.vw_databricks_yearly_sales_candidate
  to service_role;

create or replace function public.sync_databricks_yearly_sales_candidate(
  p_rows jsonb,
  p_source_checksum text,
  p_source_checked_at timestamptz,
  p_requested_by text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '30s'
as $$
declare
  v_pipeline_run_key bigint;
  v_source_system_key bigint;
  v_source_extract_key bigint;
  v_input_count integer := 0;
  v_year_count integer := 0;
  v_minimum_year smallint;
  v_maximum_year smallint;
  v_source_transaction_count bigint := 0;
  v_loaded_rows integer := 0;
  v_loaded_transaction_count bigint := 0;
  v_bad_financial_status_count integer := 0;
  v_bad_calendar_count integer := 0;
  v_bad_count_metric_count integer := 0;
  v_source_period_start date;
  v_source_period_end date;
  v_canonical_source_checksum text;
  v_canonical_target_checksum text;
  v_synced_at timestamptz := now();
  v_source_view constant text := 'workspace.medshield_gold.vw_dashboard_yearly_sales_candidate';
begin
  if not pg_catalog.pg_try_advisory_xact_lock(
    pg_catalog.hashtext('medshield:databricks:yearly-candidate-sync')
  ) then
    raise exception 'A Databricks yearly candidate synchronization is already running';
  end if;

  select source_system_key
  into v_source_system_key
  from medshield_etl.dim_source_system
  where source_code = 'DATABRICKS_GOLD'
    and is_active = true;

  if v_source_system_key is null then
    raise exception 'DATABRICKS_GOLD source-system registration is missing';
  end if;

  if jsonb_typeof(p_rows) = 'array' then
    v_input_count := jsonb_array_length(p_rows);
  end if;

  insert into medshield_etl.etl_pipeline_run (
    pipeline_name,
    run_status,
    rows_extracted,
    quality_summary
  ) values (
    'databricks_gold_yearly_candidate_sync',
    'running',
    v_input_count,
    jsonb_build_object(
      'candidate_only', true,
      'requested_by', left(coalesce(p_requested_by, 'unknown'), 200),
      'source_view', v_source_view
    )
  )
  returning pipeline_run_key into v_pipeline_run_key;

  insert into medshield_etl.etl_source_extract (
    pipeline_run_key,
    source_system_key,
    source_name,
    source_uri,
    extracted_at,
    record_count,
    checksum,
    metadata_json
  ) values (
    v_pipeline_run_key,
    v_source_system_key,
    v_source_view,
    null,
    coalesce(p_source_checked_at, v_synced_at),
    v_input_count,
    p_source_checksum,
    jsonb_build_object(
      'catalog', 'workspace',
      'schema', 'medshield_gold',
      'view', 'vw_dashboard_yearly_sales_candidate',
      'candidate_only', true,
      'requested_by', left(coalesce(p_requested_by, 'unknown'), 200)
    )
  )
  returning source_extract_key into v_source_extract_key;

  begin
    if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
      raise exception 'Yearly candidate payload must be a JSON array';
    end if;

    if p_source_checksum is null or p_source_checksum !~ '^[0-9a-f]{64}$' then
      raise exception 'Source checksum must be a lowercase SHA-256 value';
    end if;

    with input_rows as (
      select *
      from jsonb_populate_recordset(
        null::medshield_sales.databricks_yearly_sales_candidate,
        p_rows
      )
    )
    select
      count(*)::integer,
      count(distinct calendar_year)::integer,
      min(calendar_year),
      max(calendar_year),
      coalesce(sum(transaction_count), 0),
      count(*) filter (
        where financial_definition_status is distinct from 'CANDIDATE_PENDING_FINANCE_APPROVAL'
      )::integer,
      count(*) filter (
        where calendar_month_count <> 12
          or active_month_count + zero_activity_month_count <> 12
      )::integer,
      count(*) filter (
        where calendar_month_count < 0
          or active_month_count < 0
          or zero_activity_month_count < 0
          or transaction_count < 0
          or distinct_dr_count < 0
          or distinct_area_count < 0
          or distinct_product_count < 0
          or warning_transaction_count < 0
          or fully_eligible_transaction_count < 0
          or partially_eligible_transaction_count < 0
          or dimension_only_transaction_count < 0
          or source_year_mismatch_count < 0
          or negative_quantity_review_count < 0
          or financial_formula_warning_count < 0
          or quantity_eligible_transaction_count < 0
          or gross_sales_eligible_transaction_count < 0
          or net_sales_eligible_transaction_count < 0
          or transfer_value_eligible_transaction_count < 0
          or gross_margin_eligible_transaction_count < 0
          or coalesce(previous_transaction_count, 0) < 0
      )::integer,
      min(first_delivery_date),
      max(last_delivery_date)
    into
      v_input_count,
      v_year_count,
      v_minimum_year,
      v_maximum_year,
      v_source_transaction_count,
      v_bad_financial_status_count,
      v_bad_calendar_count,
      v_bad_count_metric_count,
      v_source_period_start,
      v_source_period_end
    from input_rows;

    if v_input_count <> 9
      or v_year_count <> 9
      or v_minimum_year <> 2017
      or v_maximum_year <> 2025 then
      raise exception 'Expected exactly nine unique yearly rows covering 2017 through 2025';
    end if;

    if v_bad_financial_status_count <> 0 then
      raise exception 'Every financial row must remain CANDIDATE_PENDING_FINANCE_APPROVAL';
    end if;

    if v_bad_calendar_count <> 0 then
      raise exception 'Every yearly row must reconcile to a twelve-month calendar scaffold';
    end if;

    if v_bad_count_metric_count <> 0 then
      raise exception 'Gold count metrics cannot be negative';
    end if;

    with input_rows as (
      select *
      from jsonb_populate_recordset(
        null::medshield_sales.databricks_yearly_sales_candidate,
        p_rows
      )
    ), row_hashes as (
      select
        calendar_year,
        encode(
          extensions.digest(
            (
              to_jsonb(input_rows)
              - 'pipeline_run_key'
              - 'source_extract_key'
              - 'source_view'
              - 'source_row_hash'
              - 'source_checked_at'
              - 'synced_at'
            )::text,
            'sha256'
          ),
          'hex'
        ) as row_hash
      from input_rows
    )
    select encode(
      extensions.digest(string_agg(row_hash, '' order by calendar_year), 'sha256'),
      'hex'
    )
    into v_canonical_source_checksum
    from row_hashes;

    delete from medshield_sales.databricks_yearly_sales_candidate
    where calendar_year between 2017 and 2025;

    with input_rows as (
      select *
      from jsonb_populate_recordset(
        null::medshield_sales.databricks_yearly_sales_candidate,
        p_rows
      )
    )
    insert into medshield_sales.databricks_yearly_sales_candidate (
      calendar_year,
      first_delivery_date,
      last_delivery_date,
      calendar_month_count,
      active_month_count,
      zero_activity_month_count,
      month_activity_status,
      transaction_count,
      distinct_dr_count,
      distinct_area_count,
      distinct_product_count,
      warning_transaction_count,
      fully_eligible_transaction_count,
      partially_eligible_transaction_count,
      dimension_only_transaction_count,
      source_year_mismatch_count,
      negative_quantity_review_count,
      financial_formula_warning_count,
      quantity_eligible_transaction_count,
      gross_sales_eligible_transaction_count,
      net_sales_eligible_transaction_count,
      transfer_value_eligible_transaction_count,
      gross_margin_eligible_transaction_count,
      total_quantity_candidate,
      gross_sales_candidate,
      net_sales_candidate,
      transfer_value_candidate,
      gross_margin_candidate,
      weighted_gross_margin_pct_candidate,
      warning_transaction_rate,
      fully_eligible_transaction_rate,
      quantity_coverage_rate,
      net_sales_coverage_rate,
      gross_margin_coverage_rate,
      previous_calendar_year,
      previous_transaction_count,
      previous_total_quantity_candidate,
      previous_gross_sales_candidate,
      previous_net_sales_candidate,
      previous_gross_margin_candidate,
      transaction_count_yoy_pct,
      quantity_yoy_pct_candidate,
      gross_sales_yoy_pct_candidate,
      net_sales_yoy_pct_candidate,
      gross_margin_yoy_pct_candidate,
      yoy_comparison_status,
      financial_definition_status,
      pipeline_run_key,
      source_extract_key,
      source_view,
      source_row_hash,
      source_checked_at,
      synced_at
    )
    select
      input_rows.calendar_year,
      input_rows.first_delivery_date,
      input_rows.last_delivery_date,
      input_rows.calendar_month_count,
      input_rows.active_month_count,
      input_rows.zero_activity_month_count,
      input_rows.month_activity_status,
      input_rows.transaction_count,
      input_rows.distinct_dr_count,
      input_rows.distinct_area_count,
      input_rows.distinct_product_count,
      input_rows.warning_transaction_count,
      input_rows.fully_eligible_transaction_count,
      input_rows.partially_eligible_transaction_count,
      input_rows.dimension_only_transaction_count,
      input_rows.source_year_mismatch_count,
      input_rows.negative_quantity_review_count,
      input_rows.financial_formula_warning_count,
      input_rows.quantity_eligible_transaction_count,
      input_rows.gross_sales_eligible_transaction_count,
      input_rows.net_sales_eligible_transaction_count,
      input_rows.transfer_value_eligible_transaction_count,
      input_rows.gross_margin_eligible_transaction_count,
      input_rows.total_quantity_candidate,
      input_rows.gross_sales_candidate,
      input_rows.net_sales_candidate,
      input_rows.transfer_value_candidate,
      input_rows.gross_margin_candidate,
      input_rows.weighted_gross_margin_pct_candidate,
      input_rows.warning_transaction_rate,
      input_rows.fully_eligible_transaction_rate,
      input_rows.quantity_coverage_rate,
      input_rows.net_sales_coverage_rate,
      input_rows.gross_margin_coverage_rate,
      input_rows.previous_calendar_year,
      input_rows.previous_transaction_count,
      input_rows.previous_total_quantity_candidate,
      input_rows.previous_gross_sales_candidate,
      input_rows.previous_net_sales_candidate,
      input_rows.previous_gross_margin_candidate,
      input_rows.transaction_count_yoy_pct,
      input_rows.quantity_yoy_pct_candidate,
      input_rows.gross_sales_yoy_pct_candidate,
      input_rows.net_sales_yoy_pct_candidate,
      input_rows.gross_margin_yoy_pct_candidate,
      input_rows.yoy_comparison_status,
      input_rows.financial_definition_status,
      v_pipeline_run_key,
      v_source_extract_key,
      v_source_view,
      encode(
        extensions.digest(
          (
            to_jsonb(input_rows)
            - 'pipeline_run_key'
            - 'source_extract_key'
            - 'source_view'
            - 'source_row_hash'
            - 'source_checked_at'
            - 'synced_at'
          )::text,
          'sha256'
        ),
        'hex'
      ),
      coalesce(p_source_checked_at, v_synced_at),
      v_synced_at
    from input_rows;

    get diagnostics v_loaded_rows = row_count;

    select coalesce(sum(transaction_count), 0)
    into v_loaded_transaction_count
    from medshield_sales.databricks_yearly_sales_candidate;

    select encode(
      extensions.digest(
        string_agg(
          encode(
            extensions.digest(
              (
                to_jsonb(target_rows)
                - 'pipeline_run_key'
                - 'source_extract_key'
                - 'source_view'
                - 'source_row_hash'
                - 'source_checked_at'
                - 'synced_at'
              )::text,
              'sha256'
            ),
            'hex'
          ),
          '' order by calendar_year
        ),
        'sha256'
      ),
      'hex'
    )
    into v_canonical_target_checksum
    from medshield_sales.databricks_yearly_sales_candidate as target_rows;

    if v_loaded_rows <> 9
      or v_loaded_transaction_count <> v_source_transaction_count
      or v_canonical_target_checksum is distinct from v_canonical_source_checksum then
      raise exception 'Target reconciliation failed';
    end if;

    update medshield_etl.etl_source_extract
    set
      source_period_start = v_source_period_start,
      source_period_end = v_source_period_end,
      record_count = v_loaded_rows,
      metadata_json = metadata_json || jsonb_build_object(
        'canonical_source_checksum', v_canonical_source_checksum,
        'canonical_target_checksum', v_canonical_target_checksum,
        'checksums_match', true,
        'source_transaction_count', v_source_transaction_count
      )
    where source_extract_key = v_source_extract_key;

    update medshield_etl.etl_pipeline_run
    set
      run_status = 'completed',
      finished_at = now(),
      source_period_start = v_source_period_start,
      source_period_end = v_source_period_end,
      rows_extracted = v_input_count,
      rows_loaded = v_loaded_rows,
      rows_rejected = 0,
      quality_summary = quality_summary || jsonb_build_object(
        'year_count', v_year_count,
        'minimum_year', v_minimum_year,
        'maximum_year', v_maximum_year,
        'source_transaction_count', v_source_transaction_count,
        'loaded_transaction_count', v_loaded_transaction_count,
        'canonical_source_checksum', v_canonical_source_checksum,
        'canonical_target_checksum', v_canonical_target_checksum,
        'checksums_match', true,
        'financial_definition_status', 'CANDIDATE_PENDING_FINANCE_APPROVAL'
      )
    where pipeline_run_key = v_pipeline_run_key;

    return jsonb_build_object(
      'ok', true,
      'pipeline_run_key', v_pipeline_run_key,
      'source_extract_key', v_source_extract_key,
      'extracted_rows', v_input_count,
      'loaded_rows', v_loaded_rows,
      'minimum_year', v_minimum_year,
      'maximum_year', v_maximum_year,
      'year_count', v_year_count,
      'source_transaction_count', v_source_transaction_count,
      'loaded_transaction_count', v_loaded_transaction_count,
      'checksums_match', true,
      'candidate_only', true,
      'synced_at', v_synced_at
    );
  exception
    when others then
      update medshield_etl.etl_pipeline_run
      set
        run_status = 'failed',
        finished_at = now(),
        rows_loaded = 0,
        rows_rejected = v_input_count,
        error_message = left(sqlerrm, 1000),
        quality_summary = quality_summary || jsonb_build_object(
          'validation_failed', true,
          'candidate_cache_preserved', true
        )
      where pipeline_run_key = v_pipeline_run_key;

      return jsonb_build_object(
        'ok', false,
        'code', 'DATABRICKS_YEARLY_SYNC_VALIDATION_FAILED',
        'error', sqlerrm,
        'pipeline_run_key', v_pipeline_run_key,
        'candidate_cache_preserved', true
      );
  end;
end;
$$;

revoke all on function public.sync_databricks_yearly_sales_candidate(
  jsonb,
  text,
  timestamptz,
  text
) from public, anon, authenticated;
grant execute on function public.sync_databricks_yearly_sales_candidate(
  jsonb,
  text,
  timestamptz,
  text
) to service_role;

notify pgrst, 'reload schema';
