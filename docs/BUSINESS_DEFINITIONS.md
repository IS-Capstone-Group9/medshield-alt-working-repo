# MedShield Approved Business Definitions

## Purpose

This document records the working business definitions for the MedShield North Star execution. These definitions are designed for the current workspace data and should be reviewed by the group before model training.

## Current Constraint

MedShield does not currently have operating expense data. The system must not claim company net profit, full profitability, cost-minimizing procurement, or total landed cost optimization from the sales workbook alone.

The workbook supports sales revenue, product quantity, transaction cost fields, and transaction-level gross margin/profit. Until expense data exists, use the wording below.

## Approved Working Definitions

| Metric or concept | Working definition | Source field or formula | Grain | Owner | Status |
|---|---|---|---|---|---|
| Demand units | Delivered quantity sold. | `quantity` / `quantity_sold` | Transaction, month, SKU, territory | Data Analyst | Approved for modeling |
| Sales revenue | Gross sales value from delivered line items. | `total_trade_price` | Transaction, month, SKU, territory | Finance / Business Analyst | Proposed for approval |
| Sales cost | Workbook cost after discounts when available. | `net_cost` | Transaction, month, SKU, territory | Finance / Business Analyst | Proposed for approval |
| Gross margin amount | Transaction sales value less net cost, using the workbook field when supplied. | `net_income`; reconcile against `total_trade_price - net_cost` | Transaction, month, SKU, territory | Finance / Business Analyst | Proposed for approval |
| Margin percentage | Gross margin divided by net cost or workbook-provided margin percent. | `margin_pct`; validate against `net_income / net_cost` | Transaction, SKU, territory | Data Analyst | Needs validation |
| Net income | Not available as company net income. Use `gross_margin_amount` wording instead. | Not applicable | Not applicable | Business Analyst | Approved terminology rule |
| Service Contract | A bulk package or contract containing an unknown mix of medicines/supplies (indicated by '#' in raw product name). | `is_service_contract` (boolean) | Transaction, SKU | Business Analyst | Approved |
| Canonical SKU | One sellable product identity after alias cleanup. | Product alias map from `product` raw value to `canonical_sku` | SKU | Data Analyst | Needs mapping |
| Product alias | A raw product string that points to a canonical SKU. | `product_raw` -> `canonical_sku` | Product string | Data Analyst | Needs mapping |
| Territory | Geographic delivery area only. | Area map where `area_type = territory` | Territory | Business Analyst | Needs mapping |
| Customer type | Non-geographic customer/channel label such as Government, Hospital, Pharma. | Area map where `area_type = customer_type` | Customer type | Business Analyst | Needs mapping |
| Business line | Internal/non-sales or special label such as Admin, Supplies, Equipment, Personal, Losses. | Area map where `area_type = business_line` | Business line | Business Analyst | Needs mapping |
| ABC class | Deterministic cumulative revenue contribution class. | A: 0-80%, B: >80-95%, C: >95-100% | SKU snapshot | BI Specialist | Approved |
| Forecast horizon | Next 12 calendar months after the latest trusted actual period. | Model run metadata | Model run | Business Analyst | Approved |
| Recommendation status | Lifecycle state for model outputs. | Draft, validated, review required, published, superseded, measured | Model output | Service Manager | Approved |

## Terms That Must Not Be Used Yet

| Avoid this wording | Use this wording instead | Reason |
|---|---|---|
| Net profit | Gross margin amount | Operating expenses are unavailable. |
| Expense-optimized EOQ | Scenario EOQ or formula demonstration | Ordering and holding costs are unavailable. |
| Inventory urgency | Demand priority | Current stock, lead time, and service levels are unavailable. |
| Dead stock | Dead-stock candidate or slow-moving candidate | On-hand inventory, age, expiry, and purchase history are unavailable. |
| Official disease alert | Disease scenario or pending DOH integration | DOH data will be uploaded later. |
| Official PAGASA alert | Weather provider watch or PAGASA-pending scenario | PAGASA data will be uploaded later. |

## Decisions Needed From The Group

1. Confirm `total_trade_price` as the revenue field for dashboards and model evaluation.
2. Confirm `net_income` represents transaction gross margin/profit, not full company net income.
3. Confirm that `quantity` is the demand unit for forecasting.
4. Approve the first version of the product master and alias map.
5. Approve the first version of the area classification map.
6. Decide whether incomplete 2025 periods should be excluded, repaired, or used only as partial secondary validation.

## Acceptance Criteria

The definitions are ready for implementation when:

1. Every dashboard KPI maps to one source field or formula.
2. Every model input uses approved terminology.
3. The dashboard labels gross margin correctly and does not imply full expense accounting.
4. Territory, customer type, and business line are separated before weather joins, territory forecasting, MCDA, or allocation.
5. The team can reproduce ABC classes from source data using the documented revenue field.
