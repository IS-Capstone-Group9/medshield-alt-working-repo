# Databricks notebook source
"""Load pinned itemized history into a NEW warehouse release (itemized only; contracts stay separate).

mode=plan is read-only and records the exact controls and hash. mode=apply needs that hash and, because
held and unclassified rows are always present, acknowledge_warnings=true. The source Gold table is only
read, the seed refuses to replace any real row, and dashboard reads do not change.
Parameters: volume, release_schema, base_release_id, approved_plan_sha256, mode, acknowledge_warnings.
"""
import sys

sys.path.insert(0, "/Workspace/medshield/medshield_project")

# COMMAND ----------

import warehouse_runners

if "dbutils" in globals() and "spark" in globals():
    warehouse_runners.run_seed(spark, dbutils)
