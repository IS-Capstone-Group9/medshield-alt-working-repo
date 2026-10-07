# Predictive Analytics Logic

> **Current boundary:** The live API exposes sales-only baseline evaluation. No Prophet, XGBoost, or external-regressor model is approved/published. See [Current State](../CURRENT_STATE.md).

## Objective

Estimate future demand from the frozen, accepted historical sales publication and prove whether a candidate model improves on simple baselines.

## Required sequence

1. Freeze the approved 2017-2025 sales dataset and mapping versions.
2. Choose an eligible monthly series with sufficient history and stable product/territory identity.
3. Evaluate seasonal-naive and last-observation baselines first.
4. Use rolling-origin or blocked time-series validation; never random row splitting.
5. Compare candidate models using MAE, RMSE, WAPE or sMAPE, and bias.
6. Inspect errors by horizon, product, territory, and sparse-demand class.
7. Publish only a model that has a version, training period, evaluation windows, metrics, limitations, and approval status.

## External features

DOH, PAGASA, and NASA POWER may enter a candidate model only after their geography and period joins are approved. Fit transformations and lag choices using training data. Compare the augmented model with the same sales-only baseline and keep weather/disease contextual if it does not improve out-of-sample performance.

## Product priority

Deterministic Pareto/ABC is descriptive. XGBoost requires a forward-looking target such as a future demand-spike or forecast-error-risk label. Historical ABC classes alone do not establish operational urgency.

## Current implementation

The gateway calculates transparent seasonal-naive and last-observation evidence from Databricks history. External regression returns a blocked status while mapping gates remain open. These responses are validation aids, not approved forecasts.
