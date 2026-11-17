-- Prepared and applied 2 November 2026 through the guarded gateway maintenance CLI.
-- Reuse the prepare/apply runbook; do not execute independently of its source/history checks.
-- Preserves all analytical rows, identities, publication flags and VERSION AS OF 0.
ALTER TABLE `workspace`.`medshield_original_gold_20261026`.`original_fd95b9e3abab028c8e41_itemized_candidates`
SET TBLPROPERTIES (
  'delta.logRetentionDuration' = 'interval 365 days',
  'delta.deletedFileRetentionDuration' = 'interval 365 days'
);
