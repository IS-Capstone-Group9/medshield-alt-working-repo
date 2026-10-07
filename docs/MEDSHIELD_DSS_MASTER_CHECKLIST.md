# MedShield Decision-Support System Master Checklist

Last reviewed: 2026-09-25

This is the maintained completion checklist. A checked technical item does not imply business approval; approval items name the remaining gate explicitly.

## 1. Runtime integrity

- [x] Dashboard analytical source is Databricks Gold.
- [x] Frontend reaches Databricks only through the TypeScript gateway.
- [x] Required Databricks failure produces an unavailable state.
- [x] Browser/local/mock/Supabase analytical fallback is disabled.
- [x] Supabase is limited to authentication, account roles, candidate cache administration, and audit concerns.
- [x] Sales browser upload is disabled in favor of Databricks ingestion.
- [x] NASA POWER refresh writes through Databricks before display.

## 2. Sales candidate pipeline

- [x] Bronze-Silver-Gold notebooks support 2017-2025.
- [x] Checksum-bound 2025 replacement validation is implemented.
- [x] Current candidate bridge expects nine yearly rows and 37,728 accepted facts.
- [x] Contract allocation provenance is represented in Gold.
- [x] `05_sales_restart_system_bridge.sql` exposes the application yearly contract.
- [ ] Obtain named business/finance approval for the candidate population and definitions.
- [ ] Reconcile every 2025 contract parent to allocated child products in the final acceptance pack.
- [ ] Approve canonical SKU and medical/non-medical mapping.
- [ ] Promote a stable approved view contract.

## 3. External-source candidate pipeline

- [x] DOH/PAGASA Bronze-Silver-Gold restart exists.
- [x] PAGASA is limited to supplied official 2017-2024 history.
- [x] DOH 2026 remains partial and excluded from complete-year claims.
- [x] NASA POWER is labeled as a provider proxy and stored separately.
- [x] `06_external_restart_system_bridge.sql` exposes candidate context views.
- [ ] Approve station-to-territory and disease-to-sales mappings.
- [ ] Demonstrate leakage-safe improvement before using external regressors in an approved forecast.

## 4. Descriptive analytics

- [x] Annual/monthly, product, area, transaction, quantity, and quality evidence is Databricks-backed.
- [x] Deterministic Pareto/ABC and commercial 60/40 MCDA are available.
- [x] Buyer sector, channel, and geography are separated in the current derived mapping logic.
- [x] Actual, derived, estimated, proxy, baseline, and scenario statuses are documented.
- [ ] Regenerate final Chapter 4 descriptive tables from the accepted publication.
- [ ] Obtain owner approval for buyer/geographic mapping rules and Unknown handling.

## 5. Predictive analytics

- [x] Seasonal-naive and last-observation baseline evaluation is available.
- [x] External regression fails safely with a blocked status while mappings are unapproved.
- [ ] Freeze an approved training dataset.
- [ ] Run rolling-origin validation and report MAE, RMSE, WAPE/sMAPE, and bias.
- [ ] Compare candidate models against the same baselines.
- [ ] Publish an approved model version and outputs to Databricks.

## 6. Prescriptive analytics

- [x] Historical shortlist comes from Databricks.
- [x] Scenario solver requires explicit user assumptions and reports infeasibility.
- [x] No purchase execution is exposed.
- [ ] Obtain real inventory, lead-time, supplier, ordering-cost, holding-cost, service-level, and expiry inputs for operational use.
- [ ] Validate final scenarios with a planner and record decisions.

## 7. Security, quality, and operations

- [x] Databricks and Supabase server credentials remain backend-only.
- [x] Protected routes use authentication and role checks.
- [x] Backend/frontend builds and automated analytics/UI tests exist.
- [x] Docker reflects the two-service runtime boundary.
- [ ] Run the final authenticated E2E suite against the accepted live dataset.
- [ ] Select a production host, monitoring, rollback, and cost owner only if deployment is required.

## 8. Capstone completion

- [ ] Chapters 1-3 match the historical-only, candidate/scenario boundaries.
- [ ] Chapter 4 uses current dataset IDs, screenshots, and reproducible implementation evidence.
- [ ] Chapter 5 reports validated findings, model comparisons, limitations, and recommendations.
- [ ] Adviser/business reviewers sign the data, model, and interpretation acceptance record.

The immediate priority is the Gold acceptance pack and stable publication contract. See [CURRENT_STATE.md](CURRENT_STATE.md) and [ROADMAP.md](ROADMAP.md).
