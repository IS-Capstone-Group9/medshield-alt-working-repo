# Databricks notebook source
"""Promote an approved candidate into a NEW versioned warehouse release.

Replaces ONLY the declared months. Requires every product to be in the approved category reference,
the current base release id (or NONE), and the exact approved plan hash. Held rows, recorded unclassified rows and
shrinking months appear as plan warnings and need acknowledge_warnings=true on apply. Never overwrites an existing
release and writes the release pointer last. Creating a release grants no business approval and does not
change what the dashboard gateway reads.
Parameters: ingestion_id, volume, candidate_schema, release_schema (<catalog>.medshield_warehouse),
base_release_id, first_month, last_month, approved_plan_sha256, mode, acknowledge_warnings.
mode=plan is read-only and records the exact controls and plan hash to approve; mode=apply requires that hash.
"""
import sys

sys.path.insert(0, "/Workspace/medshield/medshield_project")

# COMMAND ----------

import warehouse_runners

if "dbutils" in globals() and "spark" in globals():
    warehouse_runners.run_promote(spark, dbutils)
