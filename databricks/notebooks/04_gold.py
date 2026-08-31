# Databricks notebook source
# MAGIC %md
# MAGIC # 04 — Gold Analytics
# MAGIC Rebuilds candidate monthly, product, and area aggregates for review. These are not Finance-approved publication tables.

# COMMAND ----------
import json
import sys
from pathlib import Path

_SOURCE_DIR = (Path.cwd().parent / "src").resolve()
if str(_SOURCE_DIR) not in sys.path:
    sys.path.insert(0, str(_SOURCE_DIR))

from medshield_etl.gold import build_gold_tables
from medshield_etl.notebook import config_from_widgets

# COMMAND ----------
config = config_from_widgets(dbutils)
result = build_gold_tables(spark, config)
print(json.dumps(result, indent=2))
