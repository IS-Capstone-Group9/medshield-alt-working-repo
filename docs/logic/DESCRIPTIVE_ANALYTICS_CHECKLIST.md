# Descriptive Analytics Checklist

Scope: MedShield sales actuals for 2017-2025 from the current Databricks candidate contract.

## Implemented evidence

- [x] Databricks-backed annual/monthly sales, areas, products, and transaction ledger.
- [x] Metric-specific eligibility and quality flags.
- [x] Paginated/filtered sales evidence and quantity heatmap.
- [x] Deterministic Pareto/ABC candidates.
- [x] Derived buyer-sector/channel and geographic views with an Unknown state.
- [x] Period filters, All Time behavior, and YoY comparisons.
- [x] Fail-closed dashboard behavior when Databricks is unavailable.

## Acceptance work remaining

- [ ] Obtain named business/finance approval for Gold definitions and totals.
- [ ] Approve canonical product/SKU and medical/non-medical mappings.
- [ ] Reconcile estimated 2025 allocation children to every contract parent.
- [ ] Approve buyer/geographic mappings and document remaining Unknown rows.
- [ ] Regenerate Chapter 4 descriptive tables from the current 37,728-row candidate population.
- [ ] Record dataset ID, policy version, run date, and limitations with every final result.

## Interpretation rules

- Use Net CP as candidate revenue, Total TP as acquisition cost, and workbook `net_income` as transaction gross margin/profit.
- Keep mixed source units separate unless a conversion is approved.
- Label contract allocations as estimated and buyer/geographic classifications as derived.
- Do not describe 2026 as a MedShield sales actual or a holdout year.
- Do not treat technical pipeline PASS as business publication approval.
