spark.sql("""
SELECT COUNT(*) AS fact_rows
FROM workspace.medshield_gold.sales_restart_fact_candidate
""").display()

spark.sql("""
SELECT COUNT(*) AS monthly_rows
FROM workspace.medshield_gold.vw_dashboard_monthly_sales_candidate
""").display()