# Business Rules Approval Checklist

## Purpose

Use this checklist before running final models or writing final Chapter 4 and Chapter 5 claims. The group should approve these rules so the dashboard, analytics, and paper use the same meaning.

## Approval Summary

| Rule | Decision needed | Recommended decision | Status | Approver | Date |
|---|---|---|---|---|---|
| Demand unit | What field represents demand? | Use delivered `quantity`. | Approved | Project owner | 2026-09-02 |
| Revenue | What field represents sales revenue? | Use Net CP (`net_cost`) as net sales revenue. | Approved | Project owner | 2026-09-02 |
| Acquisition cost | What field represents acquisition cost? | Use Total TP (`total_trade_price`) as total acquisition cost. | Approved | Project owner | 2026-09-02 |
| Gross margin/profit | What does `net_income` mean? | Treat as transaction gross margin/profit (`net_cost - total_trade_price`), not company net income. | Approved | Project owner | 2026-09-02 |
| Medicine/product scope | What counts as a medicine product? | Use `is_medicine = true` and `forecast_eligible = true` from product mapping. | Pending |  |  |
| Contract-name rows | How are `#` rows handled? | Use documented backward allocation and mark rows as estimated. | Pending |  |  |
| SKU aliases | How are duplicate product names mapped? | Map raw names to approved `canonical_sku`; do not merge different strength/form/pack. | Pending |  |  |
| 2025 forecast eligibility | Can 2025 be used for holdout testing at the selected grain? | Verify monthly observations and series eligibility from current Gold before approving a holdout. | Pending |  |  |
| Weather source labels | How should weather API data be named? | Label as provider-derived weather proxy. | Pending |  |  |
| PAGASA limits | How should PAGASA be used? | Use official historical PAGASA for 2017-2024 only; do not fill 2025 with NASA under the PAGASA label. | Pending |  |  |
| DOH limits | How should DOH be used? | Use historical DOH 2018-2026 only after approved geography/time/product joins; label 2026 partial. | Pending |  |  |
| Inventory outputs | Can EOQ/ROP be real recommendations? | Keep as scenario/formula outputs until inventory, lead time, ordering cost, and holding cost exist. | Pending |  |  |

## What The Group Needs To Do

1. Open `docs/BUSINESS_DEFINITIONS.md`.
2. Review each metric definition.
3. Fill the `Status`, `Approver`, and `Date` columns in this checklist.
4. Open `datasources/templates/product_master_mapping.csv`.
5. Approve mappings for A-class or high-revenue products first.
6. Open `datasources/templates/area_classification_mapping.csv`.
7. Approve which values are territories, customer types, and business lines.
8. Open `databricks/docs/2025_DATA_ISSUE_REMEDIATION.md`.
9. Decide which 2025 series and grains are complete enough for model testing.

## Acceptance Criteria

The business rules are ready when:

1. Every dashboard KPI has an approved source field or formula.
2. Every product used in forecasting has a canonical SKU or is excluded.
3. Every geographic join uses approved territory values only.
4. Contract-name rows are clearly marked as estimated.
5. 2025 holdout eligibility is recorded by model grain and unsupported series are excluded or labeled.
6. Chapter 3, Chapter 4, and dashboard labels use the same wording.
