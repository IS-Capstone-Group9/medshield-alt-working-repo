# Business Rules Approval Checklist

## Purpose

Use this checklist before running final models or writing final Chapter 4 and Chapter 5 claims. The group should approve these rules so the dashboard, analytics, and paper use the same meaning.

## Approval Summary

| Rule | Decision needed | Recommended decision | Status | Approver | Date |
|---|---|---|---|---|---|
| Demand unit | What field represents demand? | Use delivered `quantity`. | Pending |  |  |
| Revenue | What field represents sales revenue? | Use `total_trade_price`. | Pending |  |  |
| Gross margin/profit | What does `net_income` mean? | Treat as workbook gross margin/profit, not company net income. | Pending |  |  |
| Medicine/product scope | What counts as a medicine product? | Use `is_medicine = true` and `forecast_eligible = true` from product mapping. | Pending |  |  |
| Contract-name rows | How are `#` rows handled? | Use documented backward allocation, set is_service_contract flag, and mark rows as estimated. | Approved | Supply Planner | 2026-06-30 |
| SKU aliases | How are duplicate product names mapped? | Map raw names to approved `canonical_sku`; do not merge different strength/form/pack. | Pending |  |  |
| 2025 completeness | Can 2025 be used for holdout testing? | Use only as partial secondary validation until all months are proven complete. | Pending |  |  |
| Weather source labels | How should weather API data be named? | Label as provider-derived weather proxy. | Pending |  |  |
| PAGASA limits | How should PAGASA be used? | Use official historical PAGASA only for 2021-2024. | Pending |  |  |
| DOH limits | How should DOH be used? | Use historical DOH 2021-2025 for disease signal/scenario analysis. | Pending |  |  |
| Inventory outputs | Can EOQ/ROP be real recommendations? | Keep as scenario/formula outputs until inventory, lead time, ordering cost, and holding cost exist. | Pending |  |  |

## What The Group Needs To Do

1. Open `docs/BUSINESS_DEFINITIONS.md`.
2. Review each metric definition.
3. Fill the `Status`, `Approver`, and `Date` columns in this checklist.
4. Open `datasources/templates/product_master_mapping.csv`.
5. Approve mappings for A-class or high-revenue products first.
6. Open `datasources/templates/area_classification_mapping.csv`.
7. Approve which values are territories, customer types, and business lines.
8. Open `docs/2025_DATA_ISSUE_REMEDIATION.md`.
9. Decide whether 2025 is complete enough for model testing.

## Acceptance Criteria

The business rules are ready when:

1. Every dashboard KPI has an approved source field or formula.
2. Every product used in forecasting has a canonical SKU or is excluded.
3. Every geographic join uses approved territory values only.
4. Contract-name rows are clearly marked as estimated.
5. 2025 is either approved for holdout testing or clearly labeled as partial validation only.
6. Chapter 3, Chapter 4, and dashboard labels use the same wording.
