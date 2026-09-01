-- Quality disposition by source year and status.
SELECT
  data_source_year,
  quality_status,
  COUNT(*) AS row_count
FROM workspace.medshield_silver.sales_clean
GROUP BY data_source_year, quality_status
ORDER BY data_source_year, quality_status;

-- Quarantine reason frequency. One record can contribute multiple rule codes.
SELECT
  data_source_year,
  quality_status,
  rule_code,
  COUNT(*) AS affected_rows
FROM workspace.medshield_audit.sales_quarantine
LATERAL VIEW explode(quality_rule_codes) exploded AS rule_code
GROUP BY data_source_year, quality_status, rule_code
ORDER BY affected_rows DESC, data_source_year;

-- Delivery years that differ from their source filename year.
SELECT
  data_source_year,
  year AS delivery_year,
  COUNT(*) AS row_count
FROM workspace.medshield_silver.sales_clean
WHERE year <> data_source_year
GROUP BY data_source_year, year
ORDER BY data_source_year, year;

-- Missing months are coverage limitations, not transactions to synthesize.
SELECT
  year,
  month(date_delivered) AS month_number,
  COUNT(*) AS row_count
FROM workspace.medshield_silver.sales_clean
GROUP BY year, month(date_delivered)
ORDER BY year, month_number;
