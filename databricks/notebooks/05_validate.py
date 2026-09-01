# Databricks notebook source
# MAGIC %md
# MAGIC # 05 — Publication Validation
# MAGIC Reconciles the current import batch and fails the job when a publication gate is not satisfied.

# COMMAND ----------
import json
import sys
from pathlib import Path

from pyspark.sql import functions as F

_SOURCE_DIR = (Path.cwd().parent / "src").resolve()
if str(_SOURCE_DIR) not in sys.path:
    sys.path.insert(0, str(_SOURCE_DIR))

from medshield_etl.notebook import batch_id_from_widgets, config_from_widgets
from medshield_etl.validation import validate_batch

# COMMAND ----------
config = config_from_widgets(dbutils)
import_batch_id = batch_id_from_widgets(dbutils)
result = validate_batch(spark, config, import_batch_id)
print(json.dumps(result, indent=2, default=str))

# COMMAND ----------
display(
    spark.table(config.table("audit", "pipeline_runs"))
    .where(F.col("import_batch_id") == import_batch_id)
    .orderBy("validated_at", ascending=False)
)
