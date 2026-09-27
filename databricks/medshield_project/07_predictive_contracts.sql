-- Run through the controlled Databricks deployment process. No activation here.
CREATE TABLE IF NOT EXISTS workspace.medshield_gold.mart_forecast_monthly_candidate (
  input_hash STRING NOT NULL, dataset_id STRING NOT NULL, fact_delta_version BIGINT NOT NULL,
  mapping_version STRING NOT NULL, series_id STRING NOT NULL, target_name STRING NOT NULL,
  period DATE NOT NULL, target_value DECIMAL(24,2), unit STRING NOT NULL,
  period_closed BOOLEAN NOT NULL, coverage_status STRING NOT NULL,
  eligible_for_evaluation BOOLEAN NOT NULL, eligible_for_publication BOOLEAN NOT NULL,
  payload_json STRING NOT NULL
) USING DELTA;
CREATE TABLE IF NOT EXISTS workspace.medshield_gold.fact_forecast_run_candidate (
  run_id STRING NOT NULL, model_id STRING NOT NULL, dataset_id STRING NOT NULL,
  input_hash STRING NOT NULL, code_hash STRING NOT NULL, artifact_hash STRING NOT NULL,
  training_cutoff DATE NOT NULL, payload_json STRING NOT NULL
) USING DELTA;
CREATE TABLE IF NOT EXISTS workspace.medshield_gold.fact_forecast_point_candidate (
  run_id STRING NOT NULL, model_id STRING NOT NULL, series_id STRING NOT NULL,
  origin_period DATE NOT NULL, target_period DATE NOT NULL, lead_months INT NOT NULL,
  role STRING NOT NULL, prediction DOUBLE, payload_json STRING NOT NULL
) USING DELTA;
CREATE TABLE IF NOT EXISTS workspace.medshield_gold.fact_model_evaluation_candidate (
  run_id STRING NOT NULL, evaluation_id STRING NOT NULL, dataset_id STRING NOT NULL,
  protocol STRING NOT NULL, common_key_checksum STRING NOT NULL, payload_json STRING NOT NULL
) USING DELTA;
CREATE TABLE IF NOT EXISTS workspace.medshield_gold.fact_model_review (
  review_id STRING NOT NULL, run_id STRING NOT NULL, dataset_id STRING NOT NULL,
  artifact_hash STRING NOT NULL, reviewer STRING NOT NULL, decision STRING NOT NULL,
  reviewed_at TIMESTAMP NOT NULL, evidence_reference STRING NOT NULL, payload_json STRING NOT NULL
) USING DELTA;
CREATE TABLE IF NOT EXISTS workspace.medshield_gold.model_release_manifest (
  release_id STRING NOT NULL, run_id STRING NOT NULL, artifact_hash STRING NOT NULL,
  publication_status STRING NOT NULL, expected_point_count BIGINT NOT NULL,
  expected_evaluation_count BIGINT NOT NULL, payload_json STRING NOT NULL
) USING DELTA;
CREATE TABLE IF NOT EXISTS workspace.medshield_gold.model_release_pointer (
  channel STRING NOT NULL, release_id STRING NOT NULL, previous_release_id STRING,
  changed_at TIMESTAMP NOT NULL, reviewer STRING NOT NULL, reason STRING NOT NULL
) USING DELTA;
CREATE VIEW IF NOT EXISTS workspace.medshield_gold.vw_dashboard_forecasts AS
SELECT m.release_id, p.* FROM workspace.medshield_gold.model_release_pointer a
JOIN workspace.medshield_gold.model_release_manifest m ON a.release_id = m.release_id
JOIN workspace.medshield_gold.fact_forecast_point_candidate p ON m.run_id = p.run_id
WHERE a.channel = 'company_revenue' AND m.publication_status = 'approved';
CREATE VIEW IF NOT EXISTS workspace.medshield_gold.vw_dashboard_model_evaluation AS
SELECT m.release_id, e.* FROM workspace.medshield_gold.model_release_pointer a
JOIN workspace.medshield_gold.model_release_manifest m ON a.release_id = m.release_id
JOIN workspace.medshield_gold.fact_model_evaluation_candidate e ON m.run_id = e.run_id
WHERE a.channel = 'company_revenue' AND m.publication_status = 'approved';
