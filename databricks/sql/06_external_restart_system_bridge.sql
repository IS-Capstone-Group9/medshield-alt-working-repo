-- Candidate-only system bridge for the Databricks-native DOH/PAGASA restart.
-- Run after external_restart/03_external_gold.py finishes with PASS_CANDIDATE_ONLY.
-- These views expose historical context. They do not approve forecasting use.

CREATE OR REPLACE VIEW workspace.medshield_gold.vw_external_doh_context_candidate AS
WITH coverage AS (
  SELECT
    territory,
    signal,
    COUNT(DISTINCT period_start) AS observed_case_months,
    96 AS expected_months_2018_2025,
    96 - COUNT(DISTINCT period_start) AS no_observation_months,
    CASE
      WHEN COUNT(DISTINCT period_start) = 96 THEN 'OBSERVED_ALL_MONTHS'
      WHEN COUNT(DISTINCT period_start) >= 72 THEN 'SUBSTANTIAL_COVERAGE_REVIEW_GAPS'
      ELSE 'SPARSE_OBSERVATIONS'
    END AS coverage_status
  FROM workspace.medshield_audit.external_restart_doh_territory_candidate
  GROUP BY territory, signal
)
SELECT
  d.period,
  d.period_start,
  d.territory,
  d.territory_id,
  d.signal,
  CAST(d.value AS DOUBLE) AS reported_case_signal,
  d.unit,
  d.source_record_count,
  d.included_classification_groups,
  c.observed_case_months,
  c.expected_months_2018_2025,
  c.no_observation_months,
  c.coverage_status,
  d.external_mapping_status AS mapping_status,
  d.is_external_join_ready,
  false AS is_forecast_eligible,
  'OBSERVED_SOURCE_ROWS_ONLY' AS observation_policy,
  'ABSENT_DISEASE_MONTHS_REMAIN_UNKNOWN_NOT_ZERO' AS no_observation_policy,
  'HISTORICAL_CONTEXT_CANDIDATE' AS publication_status,
  d.provider AS source,
  d.source_dataset_version,
  d.external_dataset_id,
  d.policy_version
FROM workspace.medshield_audit.external_restart_doh_territory_candidate AS d
INNER JOIN coverage AS c
  ON d.territory = c.territory
 AND d.signal = c.signal;

CREATE OR REPLACE VIEW workspace.medshield_gold.vw_external_pagasa_context_candidate AS
SELECT
  m.period,
  m.period_start,
  r.territory,
  r.territory_id,
  r.proposed_station_name AS station_name,
  m.latitude,
  m.longitude,
  m.elevation_m,
  m.rainfall_total_mm,
  m.rainfall_observed_total_mm,
  m.trace_rainfall_days,
  m.temperature_mean_c,
  m.humidity_mean_pct,
  m.wind_speed_mean_kph,
  m.monthly_analysis_status,
  r.mapping_status,
  r.external_mapping_status,
  r.external_join_ready AS is_external_join_ready,
  false AS is_forecast_eligible,
  'SAME_PROVINCE_STATION_PROXY_CANDIDATE' AS geography_policy,
  'STATION_OBSERVATION_NOT_PROVINCE_WIDE_AVERAGE' AS interpretation_policy,
  'INCOMPLETE_MONTH_MEASURES_REMAIN_NULL_NOT_ZERO' AS no_observation_policy,
  'HISTORICAL_CONTEXT_CANDIDATE' AS publication_status,
  m.source,
  m.source_dataset_version,
  m.external_dataset_id,
  m.policy_version
FROM workspace.medshield_gold.external_restart_pagasa_monthly_candidate AS m
INNER JOIN workspace.medshield_audit.external_restart_pagasa_mapping_review_candidate AS r
  ON UPPER(TRIM(REGEXP_REPLACE(REPLACE(m.station_name, '%20', ' '), '(?i) Daily Data[.]csv$', '')))
   = UPPER(TRIM(r.proposed_station_name))
WHERE r.proposed_station_name IS NOT NULL;

CREATE OR REPLACE VIEW workspace.medshield_gold.vw_dss_external_signals_candidate AS
SELECT
  period,
  period_start,
  territory,
  territory_id,
  'DISEASE' AS signal_family,
  signal,
  reported_case_signal AS signal_value,
  unit,
  source,
  CAST(NULL AS STRING) AS station_name,
  coverage_status AS observation_status,
  mapping_status,
  is_external_join_ready,
  is_forecast_eligible,
  no_observation_policy,
  publication_status,
  source_dataset_version,
  external_dataset_id,
  policy_version
FROM workspace.medshield_gold.vw_external_doh_context_candidate

UNION ALL

SELECT
  period,
  period_start,
  territory,
  territory_id,
  'WEATHER' AS signal_family,
  'RAINFALL_TOTAL_MM' AS signal,
  CAST(rainfall_total_mm AS DOUBLE) AS signal_value,
  'millimetres' AS unit,
  source,
  station_name,
  monthly_analysis_status AS observation_status,
  mapping_status,
  is_external_join_ready,
  is_forecast_eligible,
  no_observation_policy,
  publication_status,
  source_dataset_version,
  external_dataset_id,
  policy_version
FROM workspace.medshield_gold.vw_external_pagasa_context_candidate;

CREATE OR REPLACE VIEW workspace.medshield_gold.vw_external_mapping_availability_candidate AS
WITH doh AS (
  SELECT
    territory,
    COUNT(DISTINCT signal) AS doh_signal_count,
    COUNT(DISTINCT period_start) AS doh_observed_month_count_any_signal
  FROM workspace.medshield_audit.external_restart_doh_territory_candidate
  GROUP BY territory
)
SELECT
  p.territory,
  p.territory_id,
  p.proposed_station_name,
  p.observed_start_year AS pagasa_start_year,
  p.observed_end_year AS pagasa_end_year,
  p.analysis_ready_rainfall_months,
  p.mapping_status AS pagasa_mapping_status,
  p.external_join_ready AS pagasa_join_ready,
  COALESCE(d.doh_signal_count, 0) AS doh_signal_count,
  COALESCE(d.doh_observed_month_count_any_signal, 0) AS doh_observed_month_count_any_signal,
  false AS is_forecast_eligible,
  p.review_notes,
  p.external_dataset_id,
  p.policy_version
FROM workspace.medshield_audit.external_restart_pagasa_mapping_review_candidate AS p
LEFT JOIN doh AS d USING (territory);

-- Expected candidate-only reconciliation:
-- DOH: 1,787 observed territory/disease/month rows.
-- PAGASA: 384 station/territory/month rows for four proposed stations, of which
-- 383 have analysis-ready rainfall and one Ambulong month is incomplete.
SELECT
  source,
  signal_family,
  COUNT(*) AS rows,
  SUM(CASE WHEN signal_value IS NOT NULL THEN 1 ELSE 0 END) AS rows_with_value,
  SUM(CASE WHEN is_external_join_ready THEN 1 ELSE 0 END) AS join_ready_rows,
  SUM(CASE WHEN is_forecast_eligible THEN 1 ELSE 0 END) AS forecast_eligible_rows
FROM workspace.medshield_gold.vw_dss_external_signals_candidate
GROUP BY source, signal_family
ORDER BY source, signal_family;

SELECT
  COUNT(*) AS territory_rows,
  SUM(CASE WHEN proposed_station_name IS NOT NULL THEN 1 ELSE 0 END) AS territories_with_station_candidate,
  SUM(CASE WHEN pagasa_join_ready THEN 1 ELSE 0 END) AS pagasa_join_ready_territories,
  SUM(CASE WHEN is_forecast_eligible THEN 1 ELSE 0 END) AS forecast_eligible_territories
FROM workspace.medshield_gold.vw_external_mapping_availability_candidate;
