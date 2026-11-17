# Retaining contracts in MedShield: recommendation and analytical treatment

26 October 2026, Asia/Manila. Accountable Data Analyst. This is an analysis and proposed implementation specification, not a warehouse publication or new business approval.

## Recommendation

Retain original contract records. Include permitted, supported and reconciled contract sales amounts in the appropriate financial population once. Keep unavailable product detail explicitly unavailable. Replace a summary representation with product-level reporting only when genuine, permitted itemization exists, is linked to its parent and reconciles. Preserve the original parent in source history regardless of which representation supplies a measure.

Under the reported NDA constraint, product itemization cannot be pursued or reconstructed. Guessing products, distributing amounts using historical product mix or deriving quantities from assumed prices would create synthetic observations. Such estimates must not supply actual product rankings, medicine demand, inventory requirements or observed-target model training. Retaining a contract does not classify its contents as medicine or non-medical goods.

## What the existing evidence shows

The completed original-evidence intake preserves 352 contract-candidate rows. A fresh local aggregate of the previously prepared contract evidence matched its published row-hash control. It did not reread or verify the original CSVs and did not query Databricks again.

| Recorded transaction year | Contract-candidate rows | Recorded net sales |
| --- | ---: | ---: |
| 2020 | 3 | ₱10,513,752.00 |
| 2024 | 124 | ₱21,790,618.16 |
| 2025 | 223 | ₱85,356,863.04 |
| 2026 | 2 | ₱669,016.75 |
| Total | 352 | **₱118,330,249.95** |

The recorded net-sales sum was calculated directly from the prepared original
contract evidence, matched to its prior SQL-intake row-hash control, and checked
with Decimal arithmetic against an independent integer-microunit sum. All 352
amounts are positive; none are missing. [Calculation receipt](../outputs/contract_analytics_review_20261025/contract_net_sales_20261026.json).
This is the sum of candidate source-record amounts, not an approved incremental
amount to add to current dashboard totals or a verified share of complete company sales.

These are rows identified by the existing reviewed-label rules, not proof of 352 distinct business contracts, completed deliveries, accepted revenue transactions or identical financial eligibility. The 2025 rows account for 63.35% of these candidate rows, not 63.35% of revenue. All 352 staged contract records represent quantity/unit as unavailable and product breakdown as unavailable under the reported NDA constraint. Their source-record IDs do not establish unique commercial contract IDs.

There are 42 rows recorded on December 31 across 2024 and 2025. This is a recorded-date observation, not proof of year-end demand, delivery or payment timing. Preserve the date and its known meaning; do not spread amounts across months or infer seasonality without evidence.

[Aggregate evidence and limitations](../outputs/contract_analytics_review_20261025/retention_analysis_20261026.json) binds the source dataset and control. [Executed SQL intake](../outputs/truth_correction_20261025/continuation/README.md) already preserved original raw/assessed evidence and separate itemized/contract candidates. The current serving fact is a different 40,160-row original-matched itemized subset. Full-original disposition and financial reconciliation remain open; neither its row count nor its sales amount can simply be added to the intake population or contract candidate sums.

The earlier allocation artifact had 346 parent references and 1,730 estimated children, with fractional allocated quantities. Those historical artifact counts are not current contract counts and cannot be equated to the 352 original-evidence rows. [Earlier allocation review](../outputs/contract_analytics_review_20261025/README.md).

## Compare the choices

| Choice | Financial effect | Product/model effect | Assessment |
| --- | --- | --- | --- |
| Delete valid contract sales from all reporting | Can understate supported recorded sales and distort customer/period comparisons | Removes unavailable detail, but loses useful financial evidence | Preserve raw records; exclude only from measures whose evidence requirements they cannot meet |
| Replace contract labels with guessed products | Annual totals might still match | Manufactures product identity, mix, quantities and possibly time/geography; can distort ABC and forecasts | Reject as observed business data |
| Retain supported contract summaries with unavailable detail | Preserves eligible financial value once | Product/quantity limits remain explicit | Recommended for present constraints |
| Use genuine reconciled itemized contract records | Financial contribution remains counted once | Adds supported product/quantity evidence where identity and units are verified | Valid if evidence is genuinely available and permitted; preserve parent lineage |

Equal annual financial totals alone do not establish correct product mix, historical quantities, monthly timing or disease relationships. Better-looking forecast errors are not a reason to manufacture observations.

## 1. Preserve the contract, determine what each record represents

Keep original files and raw rows immutable, along with the adjusted historical copies and exclusion lineage. Distinguish a contract header/award, an actual recorded sale or delivery/invoice, a subtotal, an installment/payment, a credit/return, and an unresolved record. Do not treat every occurrence of a contract number as a separate contract or a duplicate.

A signed contract's face value or cash received is not automatically the sales amount for that period. Use the approved source sales basis and permitted supporting evidence to establish amount, date and eligibility. IFRS 15 describes revenue in terms of satisfying obligations through transferring goods/services, rather than signing an award alone. [IFRS Foundation overview](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/). This analysis does not determine recognition for any particular MedShield record.

Do not identify contracts from a `#` character alone: legitimate product descriptions also use it. Apply documented transaction indicators and reviewed label rules; ambiguous records remain under review. Contract status, government/private buyer classification and medical product category are separate dimensions.

## 2. Keep the allowed fields and leave missing facts blank

Proposed logical fields, not a claim that the production schema already contains them:

| Information | Treatment |
| --- | --- |
| Source record, file/version and row | Preserve exact provenance; a derived source key is not a verified business contract ID |
| Contract/document linkage | Retain supported references internally; use a pseudonymous display reference where required |
| Transaction type and status | Record supported sale/award/payment/header/return status; unknown stays unknown |
| Amount and basis | Preserve supported source amount, currency and net/gross/tax basis; reconcile before financial inclusion |
| Recorded date and meaning | Preserve source date; distinguish delivery, invoice, award and payment timing when evidenced |
| Customer/sector/geography | Use only supported permitted values; retain unknown/unallocated otherwise |
| Acquisition cost | Use supported cost on the same transaction population; missing cost is not zero |
| Product identity/category | Unavailable where itemization is unavailable; do not force medicine/non-medical |
| Physical quantity, unit and packs | Null/unavailable unless genuinely supported; do not default a contract to one medicine unit |
| Financial/product/model eligibility | Keep separate explicit dispositions and reasons |

Use a reporting label such as **Contract — product breakdown unavailable**, outside the product-category classification itself. Do not add a fake product/SKU or an unsupported `contract` category to the existing five-enum product master. Keep confidential names, references and amounts out of outputs that are not permitted to disclose them. Pseudonyms do not by themselves authorize disclosure of other fields.

## 3. Count financial value once, even if itemization later exists

Use one financial representation for a sale: an eligible parent summary or its genuine reconciled itemized children, not both. Retain all source evidence, but record which representation contributes to each measure.

For example, if an eligible ₱200,000 sale is later represented by genuine ₱120,000 and ₱80,000 child lines, the financial result remains ₱200,000. Counting all three would incorrectly produce ₱400,000. This is an illustrative example, not a business record.

Reconcile parent/child values using the same currency, tax/discount basis, returns and relevant period. Preserve legitimate installments and repeated transactions; do not delete them merely because labels or amounts match. Hold unresolved overlap out of the affected published total with a visible reason until reconciled. A missing breakdown may remain unresolved indefinitely without blocking correctly supported contract-level financial reporting.

## 4. Use one governed evidence base with different analytical populations

| Output | Contract summary without product breakdown | Genuine supported itemized contract line |
| --- | --- | --- |
| Recorded financial sales | Include only eligible reconciled sales value once | Include once under the chosen financial representation |
| Gross margin | Include only with supported matched acquisition cost; disclose cost coverage | Same matched-population rule |
| Contract contribution and concentration | Include at permitted contract/account grain; unknown dimensions remain explicit | Retain linkage without adding duplicate financial value |
| Product/medicine sales and ABC | Exclude from named product/medicine totals; show unavailable breakdown separately | Include when product/category is supported, with documented ABC eligibility |
| Physical quantity and medicine-demand forecasting | Exclude unsupported quantities | Include only with verified identity, unit, timing and coverage |
| Inventory/replenishment/expiry planning | No inferred stock requirement | Requires supported quantities plus actual inventory, supplier, lead-time and expiry inputs |
| Financial forecasting | May contribute to a reconciled recorded-sales target | Include once, with the same target and timing policy |
| Disease/weather analysis | Do not infer products, delivery territory or disease demand | Requires separately accepted product/geography/time joins |

Commercial contracts can genuinely contain medicines, supplies, equipment, services or mixed goods. Genuine itemized government sales must not be automatically excluded from product analysis merely because they are under contract. Unknown contract contents must not become medicine sales merely because MedShield is a pharmaceutical supplier.

## 5. Show useful financial and product reporting together

Recommended dashboard measures:

- **Recorded financial sales:** eligible itemized and eligible unitemized contract sales, with overlap removed, signed adjustments retained and source completeness disclosed.
- **Itemized product sales:** the supported product-level population, with its own scope label.
- **Contract sales with unavailable product breakdown:** the eligible financial contribution without invented product detail.
- **Coverage:** what proportion of the eligible financial population supports the displayed product-level analysis.
- **Quality:** unresolved financial amount, unmatched parent/child overlaps, unknown dates/geographies and unavailable cost coverage.

Illustrative example: eligible positive itemized sales of ₱800,000 plus eligible positive unitemized contract sales of ₱200,000 give ₱1,000,000 recorded financial sales, assuming no overlap or adjustments. Product analysis covers ₱800,000, or 80% of that positive-sales value. Do not allocate the remaining ₱200,000 to medicines by assumption. A product's share of itemized sales and its share of recorded financial sales have different denominators and need different labels.

Define itemization coverage on an explicitly stated, same-period eligible positive-sales population, with returns reported separately. If using signed net contribution shares instead, label them as such; returns can make those shares negative or exceed 100%. A zero denominator produces unavailable/not applicable, not 0% coverage. Quantity coverage is a separate question from financial-value coverage.

Product ABC should use the documented positive-sales contribution scope, with returns separately visible. Medicine-only ABC uses eligible itemized medicine contribution as its denominator; all-product ABC uses the corresponding eligible all-product population. Unknown-content contracts must not silently enter either named-product denominator. Gross margin percentages use sales and cost from the same eligible cost-supported population. Missing acquisition cost does not justify a fabricated margin or company net-profit claim.

## 6. Keep forecasting targets honest

For recorded financial sales forecasting, evaluate the properly reconciled financial history. Contract-driven spikes may reflect procurement/delivery schedules; they are not automatically disease seasonality. Preserve real recorded timing and disclose uncertain date meaning. Do not smooth, move or spread contract amounts to manufacture a clean seasonal pattern.

For medicine quantity forecasting, use supported itemized medicine quantities and compatible units. Contract money, an assumed average price or a historical mix percentage cannot establish boxes or tablets delivered. The model then describes recorded supported itemized medicine sales, not complete company medicine demand. Report coverage and missingness; do not relabel unobserved demand as zero.

If an analytical target or eligible population changes, re-evaluate affected methods using time-ordered comparisons and data available at each forecast origin. Preserve old source-bound results as historical. Do not reuse model-error claims from the synthetic-product version or claim forecasts/procurement are approved by this analysis.

## 7. Proposed Databricks work and publication checks

1. **Bronze:** retain original contract-bearing sources and raw rows. Preserve adjusted history separately; no fabricated replacements become original evidence.
2. **Silver:** assess transaction kind, source lineage, amount/date meaning, confidentiality, candidate identity and separate eligibility flags. Link summaries and genuine children only with supported references. Preserve unresolved and excluded reasons.
3. **Reconcile:** explain every original-intake versus current-serving disposition; test overlap, missing records, returns and same-population financial differences by document, period and year. Current 40,160-row serving and original 38,320-itemized-candidate intake are different populations and must not be combined blindly.
4. **Gold:** prepare versioned financial, product and contract-reporting views from the governed evidence base. An individual sale contributes financial value once; unavailable product detail remains visible.
5. **Gateway/dashboard/export:** bind the same source versions, periods, filters, eligibility and coverage labels. Financial totals, product totals and unknown-breakdown contribution must reconcile across API, charts and downloads.
6. **Models:** reassess only affected targets/artifacts under their actual source identity; distinguish descriptive finance from approved medicine-demand models.
7. **Publication:** retain evidence of exact financial reconciliation, parent/child counting, no invented quantities, confidentiality scope and applicable acceptance. Activate through a controlled versioned change; old adjusted 01–03/04–08 are not the run sequence for this correction.

A contract-inclusive financial view may be published only after its reconciliation and acceptance. It must not be called complete company sales while overall coverage remains unknown. Current classification upload/validation does not perform this publication.

## Decision and scope

Recommended policy: **retain original contracts; retain eligible reconciled financial value once; keep unavailable product detail unavailable; use only genuine supported itemization for product/quantity analysis.** This answers the current NDA-limited situation without deleting legitimate business or manufacturing medicine demand.

No CSV, live table, serving pointer, active master, model or approval was changed by this analysis. The next engineering task is a source-bound original/contract financial reconciliation and publication specification, not another source-verification notebook. Adrian has already declined the latter.

Canonical basis: [business definitions](../docs/BUSINESS_DEFINITIONS.md), [contract treatment and counting once](../docs/DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md), [NDA-limited corrective specification](../outputs/contract_analytics_review_20261025/NDA_TREATMENT.md), and [current state](../docs/CURRENT_STATE.md).
