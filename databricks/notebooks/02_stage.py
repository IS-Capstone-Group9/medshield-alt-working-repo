# Databricks notebook source
# MAGIC %md
# MAGIC # 02 — Silver Staging
# MAGIC Detects the transaction header and maps each year-specific CSV layout to source-faithful raw fields.

# COMMAND ----------
import json
import sys
from pathlib import Path

_SOURCE_DIR = (Path.cwd().parent / "src").resolve()
if str(_SOURCE_DIR) not in sys.path:
    sys.path.insert(0, str(_SOURCE_DIR))

from medshield_etl.notebook import batch_id_from_widgets, config_from_widgets
from medshield_etl.staging import stage_sales

# COMMAND ----------
config = config_from_widgets(dbutils)
import_batch_id = batch_id_from_widgets(dbutils)
result = stage_sales(spark, config, import_batch_id)
print(json.dumps({"import_batch_id": import_batch_id, **result}, indent=2))
