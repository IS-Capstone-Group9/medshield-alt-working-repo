# MedShield Approved Business Definitions

## Purpose

This document records the working business definitions for the MedShield North Star execution. These definitions are designed for the current workspace data and should be reviewed by the group before model training.

## Current Constraint

MedShield does not currently have operating expense data. The system must not claim company net profit, full profitability, cost-minimizing procurement, or total landed cost optimization from the sales workbook alone.

The workbook supports sales revenue, product quantity, transaction cost fields, and transaction-level gross margin/profit. Until expense data exists, use the wording below.

## Approved Working Definitions

| Metric or concept | Working definition | Source field or formula | Grain | Owner | Status |
|---|---|---|---|---|---|
| Units sold (fulfilled demand) | Delivered quantity sold in source units; not total market demand. Mixed packs require unit normalization before quantity comparison. | `quantity` / `quantity_sold` | Transaction, month, SKU, territory | Data Analyst | Approved for modeling |
| Selling price per unit | Workbook CP: the unit selling price. The legacy API field remains `unit_cost` for compatibility. | `unit_cost` / source `CP` | Transaction | Finance / Business Analyst | Approved 2026-09-02 |
| Gross sales value | Quantity multiplied by CP before discount. The legacy API field remains `total_cost` for compatibility. | `total_cost` / source `Total CP` | Transaction, month, SKU, territory | Finance / Business Analyst | Approved 2026-09-02 |
| Net sales revenue | Gross sales value after discount. | `net_cost` / source `Net CP` | Transaction, month, SKU, territory | Finance / Business Analyst | Approved 2026-09-02 |
| Acquisition price per unit | Workbook TP/UNIT: MedShield's unit acquisition cost. | `trade_price_unit` / source `TP/UNIT` | Transaction | Finance / Business Analyst | Approved 2026-09-02 |
| Total acquisition cost | Quantity multiplied by TP/UNIT. | `total_trade_price` / source `TOTAL TP` | Transaction, month, SKU, territory | Finance / Business Analyst | Approved 2026-09-02 |
| Gross margin amount | Transaction net sales less total acquisition cost, using the workbook field when supplied. | `net_income`; reconcile against `net_cost - total_trade_price` | Transaction, month, SKU, territory | Finance / Business Analyst | Approved 2026-09-02 |
| Margin percentage | At every reporting grain, sum eligible gross profit divided by net sales from those same margin-eligible records. Never average transaction rates or mix separately eligible populations. A zero denominator produces an unavailable rate. | `margin_pct`; `100 × SUM(gross_margin_amount) / SUM(net_sales)` over the same margin-eligible population | Transaction, SKU, territory | Data Analyst | Approved 2026-09-02 |
| Net income | Not available as company net income. Use `gross_margin_amount` wording instead. | Not applicable | Not applicable | Business Analyst | Approved terminology rule |
| Canonical SKU | One sellable product identity after alias cleanup. | Product alias map from `product` raw value to `canonical_sku` | SKU | Data Analyst | Needs mapping |
| Product alias | A raw product string that points to a canonical SKU. | `product_raw` -> `canonical_sku` | Product string | Data Analyst | Needs mapping |
| Transaction price variation | Retain each row's recorded CP/discount independently of product identity. Price variation can be described; bulk or negotiated pricing requires separate evidence. | `unit_selling_price`, `discount_amount`; original/adjusted strata | Source sales record | Data Analyst | Technical interpretation; no new business approval |
| Effective net unit price | Recorded eligible net sales divided by positive recorded quantity in a reviewed, consistent sellable unit, with source-trust and formula checks. Preserve CP separately. | `net_sales / quantity`; unavailable when unit/identity or evidence is insufficient | Source sales record | Data Analyst | Preparation diagnostic; current eligible count 0 |
| Package count | Explicit reviewed number of contained units per sellable package; independent of the quantity purchased on an invoice. | Product/packaging evidence; literal title proposal only | Sellable SKU presentation | Data Analyst / CEO | Needs review; never inferred from transaction quantity |
| Territory | Geographic delivery area only. | Area map where `area_type = territory` | Territory | Business Analyst | Needs mapping |
| Customer type | Non-geographic customer/channel label such as Government, Hospital, Pharma. | Area map where `area_type = customer_type` | Customer type | Business Analyst | Needs mapping |
| Business line | Internal/non-sales or special label such as Admin, Supplies, Equipment, Personal, Losses. | Area map where `area_type = business_line` | Business line | Business Analyst | Needs mapping |
| ABC class | Deterministic positive-sales contribution class, computed before cohort or Top-N display filtering. | Classify by share before the current label: below 80% = A; 80% to below 95% = B; 95% onward = C. The label crossing a cutoff stays in its starting class. Nonpositive contribution = Unclassified. Returns remain separate in net revenue. | Selected reporting-label population | BI Specialist | Revised at user request 2026-09-29; candidate publication |
| Forecast horizon | User-selectable 3, 6, or 12 calendar months beginning with the current Philippine calendar month. The current month counts as month 1; training still excludes current and future-month observations. | Model run metadata | Model run | Business Analyst | Approved |
| Government buyer cluster | National government, public hospitals, and accounts explicitly named as an LGU, municipal/city government, or provincial government. Explicit institutional wording takes precedence over geography. | Buyer classification rule | Transaction/account | Business Analyst | Approved |
| Private buyer cluster | Generic provincial sales areas not explicitly named as LGUs, private/hospital accounts, pharmacies/drugstores, and individual sales accounts. | Buyer classification rule | Transaction/account | Business Analyst | Approved |
| Internal buyer cluster | MedShield administration, supplies, equipment, personal, losses, and explicitly internal business labels. | Buyer classification rule | Transaction/account | Business Analyst | Approved |
| Unknown buyer cluster | Records that do not meet the Government, Private, or Internal rules. | Buyer classification rule | Transaction/account | Business Analyst | Approved |
| Recommendation status | Lifecycle state for model outputs. | Draft, validated, review required, published, superseded, measured | Model output | Service Manager | Approved |

## Implementation interpretation (7 October 2026)

These clarifications explain the existing definitions and current implementation.
They do not record new business, product-master, forecast, or procurement approvals.

The approved fulfilled-sales definition selects recorded delivered quantity as
the source measure. It does not approve every raw product's sellable identity,
unit, package count, or conversion. As of this review, there are **0 approved SKU
unit mappings**. Source quantities may be described with their original/adjusted
evidence status, but cannot be combined into verified medicine units or used as
approved SKU demand merely because the measure definition is approved. A Medical
category decision does not approve these separate gates. See the
[product review guide](PRODUCT_MASTER_REVIEW_GUIDE.md).

The margin numerator and denominator must use the same eligible records.
`margin_revenue_basis` identifies the net sales associated with eligible gross
margin. Dividing eligible margin by all independently eligible revenue can
produce a different, misleading rate. Preserve signed adjustments and null
measures; neither a missing value nor a zero denominator supplies a usable rate.

The legacy `returns_value` name means eligible negative net-sales adjustments
in the current API. It is a signed financial stratum, not verified physical
returns, returned units, return reasons, or inventory receipts. Descriptive net
revenue keeps these adjustments; a physical-return claim requires source evidence.

The approved 3/6/12-month forecast definition is retained for the existing
company net-sales/PHP display, whose default starts in the current Manila month.
It does not approve every future point or a SKU quantity model. The separate
[SKU quantity target contract](AI_PRODUCT_CLASSIFICATION_IMPLEMENTATION_PLAN.md)
proposes 1/3/6 successive displayed months starting with the month after the
selected Manila planning month. That channel still requires reviewed SKU units,
observations, evaluation, and a scoped model release.

In both contracts, actual forecast lead is the calendar distance from the
accepted model origin to the target month, separate from the number of displayed
months. For example, an October 2026 planning month and September 2026 origin
make November 2026 lead 2; a six-month November–April view needs leads 2–7.
A release validated only through lead 6 cannot provide April in that example.
Current MedShield history ending in 2025 cannot be treated as fresh 2026 history.

Planning uses `All` by default; explicit `Unknown` means only unmatched buyer
labels. The implementation applies exclusive Government → Internal → Private →
Unknown precedence and ranks only closed Manila months. These classification
rules preserve the approved buyer-cluster definitions, while their application
to raw source labels remains proposed and review pending.

The current 1/3/6/12-month planning scenario accepts entered demand and stock
assumptions; it does not generate or approve forecast demand. Inputs must cover
every shortlisted product exactly once, with blanks/nulls/Booleans rejected and
budget/pack costs represented in exact cents. Its bounded greedy allocation is
for review, without a global-optimum or purchasing claim. `not_solved` means the
computation limit was reached while an allocation step remained; no completed
allocation is returned. See the [planning API contract](API.md#planning-contract-7-october-2026).

## Terms That Must Not Be Used Yet

| Avoid this wording | Use this wording instead | Reason |
|---|---|---|
| Net profit | Gross margin amount | Operating expenses are unavailable. |
| Expense-optimized EOQ | Scenario EOQ or formula demonstration | Ordering and holding costs are unavailable. |
| Inventory urgency | Demand priority | Current stock, lead time, and service levels are unavailable. |
| Dead stock | Dead-stock candidate or slow-moving candidate | On-hand inventory, age, expiry, and purchase history are unavailable. |
| Official disease alert | Historical DOH signal or disease scenario | DOH history is loaded, but the geography/product join and a current operational feed are not approved. |
| Official PAGASA alert | Historical PAGASA observation or provider weather proxy | PAGASA history is loaded through 2024; NASA POWER remains separately labeled and no live official alert feed exists. |

## Decisions Needed From The Group

1. Approve the first version of the product master and alias map.
2. Approve the first version of the area classification map.
3. Approve whether the reconciled 2025 candidate has enough observation coverage for the selected forecast holdout grain.

## Acceptance Criteria

The definitions are ready for implementation when:

1. Every dashboard KPI maps to one source field or formula.
2. Every model input uses approved terminology.
3. The dashboard labels gross margin correctly and does not imply full expense accounting.
4. Territory, customer type, and business line are separated before weather joins, territory forecasting, MCDA, or allocation.
5. The team can reproduce ABC classes from source data using the documented revenue field.


## Catalog implementation prepared — 27 September 2026

The [3 October product/pricing review rules](PRODUCT_REVIEW_RULES.md) preserve
transaction pricing while refining literal title proposals. Different prices do not
establish distinct sellable identities or verified negotiation. Unknown source units
and adjusted allocations remain explicitly limited; descriptive financial totals
continue under their existing eligibility definitions.

[Product catalog contract](PRODUCT_CATALOG.md) defines independent category,
sellable identity, item kind and transaction evidence. Local deterministic rules,
Gold enrichment, stable-ID API/UI grouping, category filters and provenance-aware
quantity/export handling are implemented. The complete version-16 review includes
37,728 records and 4,561 labels; all remain unresolved because no approved master
entries were supplied. Category approval cannot approve SKU, quantity conversion,
forecasting or observed medical demand. Adjusted provenance remains file-level.

The [operator runbook](CATALOG_DEPLOYMENT.md) specifies catalog-only 03 → 04 → 05 →
06 → publication-readiness → descriptive/catalog validation, version-bound activation
and rollback. This is local preparation: no Databricks writes, release activation
or additional CEO decisions occurred. Databricks remains the sole analytical source.
