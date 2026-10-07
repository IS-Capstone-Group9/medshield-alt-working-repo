# Descriptive Analytics Logic

> **Current boundary:** Historical MedShield sales actuals cover 2017-2025. Gold remains candidate-only. See [Current State](../CURRENT_STATE.md).

## Purpose

Descriptive analytics answers what happened before predictive or prescriptive work begins. Every result must reconcile to an eligible Gold population and show whether evidence is observed, mapped, or estimated.

## Processing

1. Select Gold sales rows within the requested period.
2. Apply each metric's eligibility flag rather than a single universal row filter.
3. Preserve missing periods and zero-activity calendar periods according to the Gold contract.
4. Group by approved product, geography, buyer, channel, and time dimensions.
5. Return the dataset ID, policy version, population count, and limitations.

## Metrics

- Demand: sum of eligible delivered quantity in source units.
- Revenue: sum of eligible Net CP (`net_cost`).
- Acquisition cost: sum of eligible Total TP (`total_trade_price`).
- Transaction gross margin/profit: eligible workbook `net_income`, pending finance reconciliation.
- YoY: `(current - prior) / abs(prior)` only when both comparison periods are interpretable.
- Pareto share: cumulative positive eligible sales divided by the full selected positive-sales population, before display limits. Returns are preserved separately in net revenue.
- ABC candidate (29 September 2026): class uses cumulative share before the current label: below 80% A, 80% to below 95% B, 95% onward C. The label reaching a cutoff stays in its starting class. Nonpositive contributors are Unclassified. A dominant first label remains A. API and CSV identify `positive_sales_crossing_inclusive_v2_candidate`.
- Coverage: active observed periods divided by applicable calendar periods.

## Contract allocation and mappings

Parent contract labels are not products. Estimated child allocations must preserve the parent total and retain allocation provenance. Buyer, channel, and geography classifications are derived where the source omitted those fields. Unknown remains a valid review state.

## Output rules

- Do not describe 2026 as MedShield sales actuals.
- Do not combine mixed pack units without an approved conversion.
- Do not call gross margin company net profit.
- Do not fill missing official PAGASA observations with NASA POWER under the PAGASA label.
- Do not interpret a candidate or derived value as business-approved evidence.
