# Databricks notebook source
"""Build derived analytical marts for the current warehouse release: yearly, same-month YoY, seasonal profile,
territory by month, and a snapshot of external signals keyed by territory and month.

Sales and signals are separate tables sharing territory_id + calendar_month; never sum sales across signal rows.
Read-only on facts and signals; creates new tables only and never moves the release pointer.
Parameters: volume, release_schema.
"""
import sys

sys.path.insert(0, "/Workspace/medshield/medshield_project")

# COMMAND ----------

import warehouse_runners

if "dbutils" in globals() and "spark" in globals():
    warehouse_runners.run_marts(spark, dbutils)
