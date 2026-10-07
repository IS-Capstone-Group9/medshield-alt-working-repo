# Capstone Paper Revision Guide

Last reviewed: 2026-09-25

Revise the paper from implemented evidence, not from older architecture or model plans.

## Claims the paper may make

- MedShield is a historical pharmaceutical decision-support system.
- The runtime uses a Next.js frontend, TypeScript gateway, Databricks analytical source, and Supabase Auth/audit boundary.
- The current sales candidate covers 2017-2025 and contains 37,728 accepted fact rows for the checksum-bound replacement snapshot.
- PAGASA supplies official historical observations for 2017-2024; NASA POWER supplies a separately labeled provider proxy; DOH 2026 is partial.
- Descriptive sales evidence, deterministic Pareto/ABC, derived area/buyer prioritization, simple forecast baselines, and user-entered planning scenarios are implemented.
- Required Databricks failures fail closed without local/mock analytical fallback.

## Claims that require additional evidence

- Final/approved revenue, gross margin, SKU, medical-scope, buyer, or geographic definitions.
- A champion Prophet, XGBoost, disease-adjusted, or weather-adjusted forecast.
- A 2026 sales holdout or any 2026 MedShield sales actual.
- Proven causal disease/weather effects.
- Real EOQ, ROP, safety stock, stockout, expiry, supplier, purchase-order, or savings results.
- Live disease surveillance or official weather alerts.

## Chapter alignment

### Chapters 1-2

Frame the business problem as historical planning support. Literature can motivate seasonality, weather, disease, forecast evaluation, and inventory methods, but must not imply that every cited method is implemented.

### Chapter 3

Document:

1. immutable Bronze, assessed Silver, candidate Gold, and SQL bridge flow;
2. source coverage and candidate publication gates;
3. metric eligibility and business definitions;
4. derived/estimated mapping and contract-allocation provenance;
5. rolling-origin predictive validation against simple baselines;
6. scenario-based prescriptive methods when operational inputs are absent;
7. human review and fail-closed system behavior.

### Chapter 4

Use current screenshots and reproducible evidence for architecture, pipeline results, data quality, dashboard behavior, and executed tests. Every table should state dataset ID/version, period, population, status, and run date.

### Chapter 5

Interpret validated descriptive findings and forecast comparisons. State whether external features improved the baseline. Explain candidate/mapping limitations and the absence of real inventory/procurement inputs. Recommend future operational validation without describing it as completed.

## Terminology

| Use | Avoid |
|---|---|
| transaction gross margin/profit | company net profit |
| candidate Gold publication | certified production truth |
| derived buyer/geography mapping | observed ownership/location when absent from source |
| NASA POWER weather proxy | official PAGASA replacement |
| baseline forecast evaluation | approved forecast/champion model |
| planning scenario | purchase recommendation/order |

Use [CURRENT_STATE.md](CURRENT_STATE.md), [REQUIREMENTS.md](REQUIREMENTS.md), and [IMPLEMENTATION.md](IMPLEMENTATION.md) as the paper's technical baseline.
