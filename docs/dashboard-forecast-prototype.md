# Forecast Dashboard Contract

> **Design status:** This document defines the forecast UI contract. Current runtime evidence is limited to sales-only seasonal-naive and last-observation baselines from 2017-2025 Databricks history.

## Required panels

1. Scope controls: buyer cluster, product, metric, and validation horizon.
2. Historical series: observed Databricks periods only.
3. Baseline comparison: seasonal naive versus last observation.
4. Evaluation: validation windows, MAE, RMSE, WAPE/sMAPE, and bias when available.
5. Status: dataset/version, source, candidate/model state, and limitations.
6. External-model panel: blocked until approved DOH/PAGASA/NASA territory-month joins exist.

## Date rules

- MedShield sales actuals end in 2025 in the current Gold contract.
- Do not label 2026 as actual or use it as a holdout.
- Forecast periods begin after the final observed closed month for the selected series.
- Rolling-origin validation must not mix future observations into training.

## Interaction rules

- A scope change cancels/ignores stale asynchronous responses.
- Empty history shows an empty state rather than a generated line.
- A source error clears prior charts and metrics.
- Baseline evidence must remain distinguishable from a published champion model.
- External overlays preserve provider and mapping status.

## Publication gate

A final forecast chart requires a versioned Databricks model output with training/evaluation periods, target/grain, metrics, limitations, and approval status. Until then, the page is a baseline-validation workspace.
