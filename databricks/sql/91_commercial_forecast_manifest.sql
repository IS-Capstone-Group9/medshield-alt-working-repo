-- Preparation only: review and execute in the intended workspace. Not run by the HTTP gateway.
CREATE TABLE IF NOT EXISTS workspace.medshield_gold.commercial_forecast_manifest_candidate (
  run_id STRING NOT NULL,
  anchor_period STRING NOT NULL,
  scope_kind STRING NOT NULL,
  scope_id STRING NOT NULL,
  category STRING,
  dataset_id STRING NOT NULL,
  fact_version BIGINT NOT NULL,
  payload_json STRING NOT NULL,
  payload_sha256 STRING NOT NULL,
  created_at TIMESTAMP NOT NULL
) USING DELTA;
-- The gateway rejects duplicate candidates per source/anchor/scope. Publication and replacement
-- require a reviewed transaction. Being in this table never means production-model approval.
