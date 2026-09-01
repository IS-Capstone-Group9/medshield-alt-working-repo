# Databricks notebook source
# MAGIC %md
# MAGIC # 03 — Clean, Validate, and Quarantine
# MAGIC Produces the governed 28-column schema, applies quality rules, and separates approved rows from rejected and duplicate candidates.

# COMMAND ----------
import json
import sys
from pathlib import Path

from pyspark.sql import functions as F

_SOURCE_DIR = (Path.cwd().parent / "src").resolve()
if str(_SOURCE_DIR) not in sys.path:
    sys.path.insert(0, str(_SOURCE_DIR))

from medshield_etl.cleaning import clean_and_quarantine
from medshield_etl.notebook import batch_id_from_widgets, config_from_widgets

# COMMAND ----------
config = config_from_widgets(dbutils)
import_batch_id = batch_id_from_widgets(dbutils)
result = clean_and_quarantine(spark, config, import_batch_id)
print(json.dumps({"import_batch_id": import_batch_id, **result}, indent=2))

# COMMAND ----------
display(
    spark.table(config.table("audit", "sales_quarantine"))
    .where(F.col("import_batch_id") == import_batch_id)
    .groupBy("quality_status")
    .count()
    .orderBy("quality_status")
)
