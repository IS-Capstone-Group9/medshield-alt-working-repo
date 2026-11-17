spark.sql("""
SELECT
    area_mapping_sha256,
    product_master_sha256,
    COUNT(*) AS fact_rows,
    SUM(CASE WHEN is_geographic_territory_approved THEN 1 ELSE 0 END)
        AS approved_territory_rows
FROM workspace.medshield_gold.sales_restart_fact_candidate
GROUP BY area_mapping_sha256, product_master_sha256
""").display()