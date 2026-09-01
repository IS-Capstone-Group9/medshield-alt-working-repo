# Databricks notebook source
# MAGIC %md
# MAGIC # 00 — MedShield Databricks Setup
# MAGIC Creates the Unity Catalog schemas and raw-file volume used by the cleaning pipeline. Run this manually once per environment.

# COMMAND ----------
import sys
from pathlib import Path

_SOURCE_DIR = (Path.cwd().parent / "src").resolve()
if str(_SOURCE_DIR) not in sys.path:
    sys.path.insert(0, str(_SOURCE_DIR))

from medshield_etl.notebook import config_from_widgets
from medshield_etl.tables import ensure_environment

# COMMAND ----------
config = config_from_widgets(dbutils)
ensure_environment(spark, config)
dbutils.fs.mkdirs(config.input_directory)

print(f"Catalog setup complete: {config.catalog}")
print(f"Upload the nine source CSV files to: {config.input_directory}")
