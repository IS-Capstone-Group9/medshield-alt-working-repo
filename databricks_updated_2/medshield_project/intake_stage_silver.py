# Databricks notebook source
"""Upload pipeline stage: silver. Normalize both CSV layouts with the reviewed Silver rules.

Runs ONE stage for ONE immutable submission and writes only to the isolated
<catalog>.medshield_intake schema. It never changes serving tables, release pins or
the pinned original/historical Gold objects. Parameters: ingestion_id, volume, candidate_schema.
Install this file, warehouse_pipeline.py, warehouse_runners.py, controlled_sales_intake.py and
original_source_20261026/02_original_sales_silver_20261026.py as workspace FILES under /Workspace/medshield/medshield_project.
"""
import sys

sys.path.insert(0, "/Workspace/medshield/medshield_project")

# COMMAND ----------

import warehouse_runners

if "dbutils" in globals() and "spark" in globals():
    warehouse_runners.run_stage(spark, dbutils, "silver")
