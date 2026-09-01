# Databricks notebook source
# MAGIC %md
# MAGIC # 01 — Bronze Ingestion
# MAGIC Reads the uploaded CSV files as immutable lines and records file, row, checksum, and batch lineage.

# COMMAND ----------
import json
import sys
from pathlib import Path

_SOURCE_DIR = (Path.cwd().parent / "src").resolve()
if str(_SOURCE_DIR) not in sys.path:
    sys.path.insert(0, str(_SOURCE_DIR))

from medshield_etl.bronze import ingest_bronze
from medshield_etl.notebook import batch_id_from_widgets, config_from_widgets
from medshield_etl.tables import ensure_environment

# COMMAND ----------
config = config_from_widgets(dbutils)
import_batch_id = batch_id_from_widgets(dbutils)
ensure_environment(spark, config)

result = ingest_bronze(spark, config, import_batch_id)
print(json.dumps({"import_batch_id": import_batch_id, **result}, indent=2))
