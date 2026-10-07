# Remaining Work Checklist

Last reviewed: 2026-09-25

This checklist replaces the earlier Supabase-warehouse, local-fallback, and Python-runtime task list. Use [MEDSHIELD_DSS_MASTER_CHECKLIST.md](MEDSHIELD_DSS_MASTER_CHECKLIST.md) for full status.

## Immediate: accept and publish the data

- [ ] Reconcile Bronze source, Silver accepted/rejected, Gold fact, bridge, and API totals.
- [ ] Verify the current nine-year/37,728-row checksum-bound snapshot.
- [ ] Prove every estimated 2025 child allocation reconciles to its contract parent.
- [ ] Review canonical SKU and medical/non-medical mappings.
- [ ] Review buyer-sector, channel, geography, Mindoro split, and Unknown handling.
- [ ] Obtain named business/finance/mapping approvals.
- [ ] Publish stable approved views while preserving candidate history.

## Descriptive analytics

- [ ] Freeze KPI definitions and the accepted data version.
- [ ] Regenerate annual/monthly, product, territory, buyer, Pareto/ABC, seasonality, and quality evidence.
- [ ] Reconcile each final table to the API/dashboard.
- [ ] Capture Chapter 4 screenshots with provenance and limitations.

## Predictive analytics

- [ ] Define forecast target, grain, horizon, and eligible series.
- [ ] Run seasonal-naive and last-observation baselines.
- [ ] Use rolling-origin validation within 2017-2025.
- [ ] Compare candidates with MAE, RMSE, WAPE/sMAPE, and bias.
- [ ] Approve external territory-month joins before DOH/PAGASA/NASA features.
- [ ] Publish the accepted model/version/metrics to Databricks.

## Prescriptive analytics

- [ ] Obtain real stock, lead time, supplier, cost, pack, service-level, budget, and expiry inputs if operational recommendations are required.
- [ ] Keep missing inputs as visible scenario assumptions.
- [ ] Validate feasible/infeasible cases with a planner.
- [ ] Preserve human review and no-purchase-execution boundaries.

## System and capstone acceptance

- [ ] Run backend/frontend builds and Python tests.
- [ ] Run the full authenticated Playwright suite against live Databricks.
- [ ] Verify failure/empty/blocked/scenario states.
- [ ] Complete Chapters 4-5 from current evidence.
- [ ] Record adviser/business sign-off and remaining limitations.
- [ ] Decide on deployment hosting only after analytics acceptance; AWS is optional.
