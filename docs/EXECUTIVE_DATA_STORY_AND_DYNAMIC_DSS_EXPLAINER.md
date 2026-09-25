# MedShield Executive Data Story

> **Design-status notice (2026-09-25):** This narrative distinguishes implemented evidence from target analytics. Use [CURRENT_STATE.md](CURRENT_STATE.md) for the runtime contract.

## North Star

How can MedShield use historical sales evidence to improve demand planning, product prioritization, and territory allocation while reducing avoidable stockout and expiry risk?

## Evidence sequence

```text
Historical evidence -> Explain patterns -> Evaluate forecasts -> Test scenarios -> Human review
```

### 1. Historical evidence

The current Gold contract contains MedShield sales actuals for 2017-2025. It also exposes official PAGASA history for 2017-2024, provider-derived NASA POWER weather proxy observations, and candidate DOH history. Every source retains its own period and provenance.

### 2. Descriptive explanation

The implemented dashboard can explain sales totals, monthly/yearly movement, area and product contribution, delivered quantity, quality flags, Pareto/ABC candidates, and mapped buyer/geographic composition. Contract allocations and mappings remain visibly derived.

### 3. Predictive evaluation

The implemented baseline compares seasonal-naive and last-observation methods using historical Gold sales. Final model selection must use rolling-origin validation and report MAE, RMSE, WAPE or sMAPE, and bias. Prophet, XGBoost, and external regressors remain candidates until validated and published.

### 4. Prescriptive scenario

The current scenario workflow combines a Databricks-ranked historical shortlist with user-entered demand, stock, reserve, pack, cost, supplier, budget, and horizon assumptions. It can compare feasible allocations but cannot claim current inventory or execute purchasing.

### 5. Executive review

An executive view should answer:

- What was observed?
- What was derived or estimated?
- Which products and territories deserve review?
- How accurate is the forecast compared with simple baselines?
- Which assumptions drive the scenario result?
- Which approvals or missing inputs prevent operational use?

## Claims that require evidence before publication

Do not claim a live outbreak, a champion model, a specific forecast accuracy, stockout reduction, expiry reduction, savings, optimized purchase manifest, or approved external relationship unless the repository contains the named input dataset, reproducible method, validation output, and owner approval.

The executive story is therefore one of **traceable decision support**, not autonomous optimization.
