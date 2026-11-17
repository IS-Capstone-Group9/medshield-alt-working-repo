# MedShield business analytics assessment

Reviewed 7 October 2026, Asia/Manila. Accountable role: Orchestrator, supported by Data Analyst, Database Engineer and Backend Engineer reviews. Scope: current sales release, all product-master drafts, selected modeled external sources, forecasting evidence, planning calculations and publication controls. This assessment records local corrections and read-only warehouse verification. It grants no business approval and performs no Databricks publication or purchase action.

## Conclusion

The current pipeline supports **historical descriptive sales analysis** with explicit coverage and provenance. Fresh checks reconcile fact **19** and its matching **72-month STL**. The local review master covers every one of the **4,561 product labels**, but it contains proposals: **zero approved categories, identities, sales units or forecast products**.

The first complete classification-plus-monthly-forecasting feature is still unfinished. Reliable SKU quantity forecasts depend on reviewed physical identity, source sales units and accepted observation history. Operational restocking additionally needs inventory and supplier evidence. External DOH and weather data can support context or controlled historical experiments; it cannot resolve missing product identity, pack size or stock.

The review plan was to verify current source identity, profile business/KPI evidence, inspect dependent analytics and planning contracts, correct confirmed local defects, run meaningful regression checks, and document the remaining acceptance evidence. Existing source values, approval decisions and earlier receipts are preserved.

## What the current data establishes

| Measure | Verified value | Business interpretation |
|---|---:|---|
| Accepted fact records | 37,728 | One record per accepted source record; no inferred transaction deduplication |
| Normalized product labels / raw title variants | 4,561 / 4,985 | Reporting descriptions; not 4,561 verified sellable SKUs |
| Eligible net sales | ₱626,946,741.81 | Includes signed negative adjustments under the financial eligibility policy |
| Positive sales | ₱628,569,441.39 | Basis for current positive-sales ABC and review prioritization |
| Signed negative sales/adjustments | −₱1,622,699.58 | Legacy `returns_value`; does not independently prove physical product returns |
| Gross margin amount | ₱288,487,498.72 | Transaction gross margin; company operating expenses are absent |
| Margin-eligible net-sales basis | ₱478,720,670.03 | Shared population used with the gross margin numerator |
| Weighted gross margin | 60.262177% | Gross margin ÷ matched margin-eligible sales, not ÷ total net sales |
| Observed monthly periods | 98 / 108 | Missing periods remain unknown; cannot be filled with zero by default |
| STL observations | 72, January 2020–December 2025 | Trend, seasonal and residual description; not a forecast |
| Adjusted-source contribution | 11,355 records; ₱299,249,415.55, or 47.73% of net sales | File provenance. Reconciled annual money does not verify each product allocation or quantity |

Unobserved historical months: May, June, July, August and October 2017; January and February 2018; October, November and December 2019. Use matched observed months for annual YoY comparisons. Show observed-month counts and accepted completeness policy beside growth measures. Financial eligibility, quantity evidence and product review are separate dimensions.

The fresh [direct gateway/warehouse receipt](../descriptive_validation/2026-10-07T06-58-17-441Z/evidence.json) binds fact 19, the dataset, policy and published reference hashes. The backend is already pinned to 19. It still identifies the earlier header-only master; a locally populated CSV does not change warehouse categories. The direct check does not exercise HTTP authentication, browser charts or exports.

## Product evidence and corrections

The authoritative file is [product_master_review.csv](../../databricks/medshield_project/references/product_master_review.csv). Its [deployment copy](../../databricks/medshield_reference_csv/medshield_reference_csv/product_master_review.csv) has identical bytes. Both contain **4,561 rows, 29 columns**, and preserve the established schema.

Current SHA-256: `21ba704cb2fb3b39dab214f5e6ac7d3689b17967946889b3f838eb353f1f183c`. File size is **4,746,906 bytes**, leaving **253,094 bytes** under Gold's 5,000,000-byte input limit. Keep extended diagnostics outside the master and recheck the bound after human evidence additions.

| Category evidence | Labels | Eligible net-sales coverage | Meaning |
|---|---:|---:|---|
| Product/brand or product-type sources | 224 | 31.58% | Research-supported category proposals; not verified historical SKU/pack identity |
| Description alone | 2,916 | 59.95% | Title-based suggestions requiring review |
| Unresolved | 1,421 | 8.46% | Remain explicitly unclassified |
| Approved category / identity / unit / forecasting | 0 in each dimension | 0% | No proposals have been activated |

Local policy `product_review_v3_context_literal_pricing` corrects **nine food/cleaning gram-weight clues** that had appeared in medicine strength and **one specimen-cup calibration context warning**. Food and cleaning weights now remain container/net-mass proposals. Specimen markings do not imply a calibration service. Genuine medicine strength and explicit calibration-service examples remain separately reviewable. Historical research citations, research-note prefixes, 19 conflicts and all approval fields remain unchanged.

Three documentary issues remain visible: `DENGUE 1G/1GM` can contain a diagnostic abbreviation, and two nebulizer mouthpiece/tubing kits need accessory-versus-machine and contents evidence. Do not approve those from token extraction alone. Price differences and order quantities do not determine sellable identity or pack count.

Package clues appear in 155 labels, count clues in 52, and contained-unit clues in five; only one label has all three literal clues. None establishes an approved historical sales unit. Title cleanup is useful for a review queue but cannot prove pharmaceutical classification accuracy.

The first **442 labels cover 80% of positive sales**, so they are a useful evidence-collection priority. Clinical importance and a representative classification evaluation require separate selection. A high-revenue-only sample would not measure rare, ambiguous, nonmedical, service or unresolved cases fairly.

Independent [CSV QA](product_final_qa.md) passes 22 checks. The [conservation receipt](catalog_refresh/conservation_receipt.json) shows that all existing fields except the intended category-proposal status remain equal across 37,728 archived facts, and monthly/yearly financial populations and values are unchanged. Full-row simulation uses checksum-verified **archived fact 17**. Fresh **fact 19** evidence covers complete label aggregates and live descriptive calculations; it is not a new full-row quantity/date certification. Original research provenance must remain version 17.

## Appropriate analytical composition

| Business question | Output to retain or deliver | Required evidence or restriction |
|---|---|---|
| How did sales and transaction margin change? | Net sales, negative adjustments, gross margin amount/rate, matched-month YoY, monthly coverage | Same eligible numerator/denominator populations; no company net-profit claim |
| Which descriptions contribute most sales? | Positive-sales ABC/Pareto, label revenue/margin, provenance and unresolved share | Full selected population before Top-N; descriptions remain unresolved until identity approval |
| How reliable is product classification? | Confusion matrix, per-class precision/recall/F1, accepted-suggestion coverage, abstentions, false identity merges/splits, review effort | Independently reviewed representative evaluation set; keep aliases/families together across splits |
| What quantity will a reviewed SKU sell? | Monthly fulfilled-sales quantities, actual origin/target/lead, unit, error/bias and supported intervals | Approved identity/unit/history; time-based held-out evaluation at the actual lead |
| Do external signals improve predictions? | Provider-specific coverage and sales-only versus external-feature comparisons | Reviewed territory/product associations and origin-known source availability; historical association is not causation |
| What could we buy within entered constraints? | Scenario packs/units, spend, remaining budget, fulfillment, unmet units and binding limits | Explicit entered assumptions; no implied inventory observation, mathematical optimality or purchase authorization |
| What should be reordered operationally? | Stock-aware, pack-rounded draft order and explanation | Supported unit forecasts plus timestamped stock/on-order/commitments, supplier lead times, costs, packs/MOQ and service/expiry rules |

Expose readiness separately by label count, record count and revenue: category, identity, sales unit, quantity observation, forecasting and transaction verification. One overall green status would hide which claim lacks evidence. Do not aggregate incompatible physical units across products. Verified source selling price CP is distinct from acquisition price TP and from recorded net-sales-per-unit.

## Forecasting readiness

Archived original-source diagnostics find **22,172 positive quantity candidates** after adjusted/low-trust/backfill/invalid/contract exclusions. **66 labels** have at least 24 distinct positive-observation months, and **12** have 24 consecutive positive months. These screens do not approve a cohort, establish complete zero-sale months or certify fresh fact-19 quantities. Their latest candidate original-source observation is **December 2023**.

Company monthly revenue history reaches December 2025. The existing retrospective experiment executed four benchmarks, two ETS and nine Prophet configurations. Last value remains the unpublished development selection, with **83.20% development WAPE** and **37.76% 2025 retrospective-audit WAPE**. No approved champion or supported intervals exist. Company-PHP errors do not measure SKU quantity forecasting accuracy.

Use a documentary-verifiable medical cohort for retrospective capstone evaluation while acquiring newer accepted observations for current decisions. Freeze the target, unit, scope, coverage rules, origin and forecast leads. Compare naive and seasonal-naive methods with candidates on common time-based keys. Fit preprocessing and feature selection inside training windows and keep the final audit untouched. Report sample counts, MAE, WAPE where valid, bias and errors by lead; interval claims require calibration evidence. [Rolling-origin guidance](https://otexts.com/fpp3/tscv.html) explains why training must precede each forecast target.

The existing company-PHP display contract uses 3/6/12 months from the current Manila month. The separately proposed SKU contract uses next-month and 1/3/6 future-month views; it is not shipped. Display length cannot replace actual model lead. On 7 October 2026, a December 2025 origin makes October lead 10 and November lead 11. A December 2023 quantity origin makes November 2026 lead 35. Newer history or explicitly supported recency/lead evidence is necessary before representing those targets as current operational forecasts. See the [classification-plus-forecasting implementation proposal](../../docs/AI_PRODUCT_CLASSIFICATION_IMPLEMENTATION_PLAN.md).

## External sources

The external review covers the **four currently modeled DOH diseases and four proposed PAGASA stations**, not every raw disease/station collection. It reused the existing aggregate profile after verifying **12/12 raw-file hashes unchanged**.

- Selected national DOH files contain **2,518,227 records**. The current 2018–2025 territory/disease/month filter produces **1,787 rows and 233,531 reported surveillance cases**. These are summed case counts under the existing classification rules, not unique patients, confirmed-only counts or population incidence. Raw 2026 observations are partial and excluded by current Gold policy.
- Four PAGASA stations have **11,688 daily records**, covering 2017–2024. Rainfall is complete in **383/384 station-months**; Ambulong January 2020 lacks fourteen rainfall days. Other measures need their own completeness flags. Official PAGASA 2025 observations are absent from these files.
- The saved 7 October warehouse check reports **2,171 external signal rows**: 1,787 DOH plus 384 weather. All seven territory mappings remain pending. Camarines Sur, Laguna and Marinduque lack proposed stations. No external row is approved for predictive joining. NASA POWER remains a separately labeled proxy.

Absent disease months are unknown unless reporting completeness establishes zero. Keep provider, territory, disease, observation period and metric-specific completeness in the grain. DOH onset dates are retrospective; without release vintages, a one-month lag alone does not prove the value was known at the forecast origin. Such experiments must disclose revised-snapshot retrospective availability. Realized future disease/weather cannot enter earlier forecasts. Broad business product categories do not establish therapeutic labels or condition associations.

The [external assessment](EXTERNAL_PLANNING_FINDINGS.md) records coverage and conditional joint samples. External sources are a later incremental-value test; they are not a dependency for ordinary observed sales finance or a substitute for verified SKU units.

## Local planning and publication fixes

Confirmed planning defects are corrected: blank/null/Boolean numbers no longer become zero; each shortlisted product must occur exactly once; budget and pack cost use exact cents; a 100,000-step allocation that remains unfinished reports `not_solved` with no completed rows. Historical shortlist queries exclude open/future Manila months and use deterministic tie order.

All is the default buyer scope. Explicit Unknown now selects only the residual buyer class, and Government → Internal → Private → Unknown use one exclusive CASE expression. This also prevents geography proposals from including a government/internal account under Private. The frontend selector and fallback match. Existing global API middleware already rejects repeated/structured filters. The algorithm remains an entered **greedy scenario**, not an optimal procurement solver or real stock forecast. [Independent planning QA](planning_final_qa.md) verifies budget, packs, reserve, cents and fulfillment behavior, including 1,000 deterministic scenarios.

Publication-readiness now compares captured fact version, dataset, policy, area/product-master hashes and publication status with the gateway summary and STL release. Each STL row must retain the same source identity; fact/STL table versions are captured and checked for change. Equal financial totals alone no longer substitute for matching release identity. Existing strict local-master checksum checks remain.

Three next-publication gaps remain unresolved by this audit:

1. **Stale predecessor/package:** Gold03, `package_catalog.py` and `validate-catalog.ts` still bind baseline 16 and old receipts. Prepare one consistent captured-predecessor-19 descriptor with input/helper/reference hashes and fresh preservation evidence. Ship that descriptor and receipts explicitly. Do not run the old package unchanged or use mutable latest as a baseline.
2. **Complete preservation:** the current migration/validator compare selected financial/source fields, not every immutable raw/Silver field. A future publication must prove all source columns and eligibility are retained, including CP/TP, discount, raw area/document/source lineage and quality rules. Add meaningful price-only, lineage-only and quality-only mutation checks when implementing that contract.
3. **Recovery bundle:** capture versions and bytes for all dependent Gold/audit outputs, STL, bridge definitions, notebooks/helpers/references and application release. Saved fact retention is 30 days for deleted files and logs; that does not prove all dependency retention or a complete restoration rehearsal. A fact pin alone cannot restore overwritten STL/marts/views. [Databricks table-history guidance](https://docs.databricks.com/aws/en/tables/history) explains retention boundaries.

The new CSV is intentionally unpublished. A current local-master checksum mismatch is expected until a new publication deploys those exact bytes. Earlier passing receipts describe the earlier master and must not be rewritten. The audit did not rerun publication-readiness to present a predictable checksum mismatch as a new full release verdict.

## Concrete next delivery sequence

| Order | Deliverable and accountable owner | Evidence that completes the step |
|---|---|---|
| 1 | Business/Data Analyst: define the pilot cohort and collect invoice, supplier/catalog and package evidence | Accepted sellable identity, category, item kind, historical source unit, packaging/count and evidence/reviewer/date; adjusted transaction verification remains separate |
| 2 | Database Engineer: prepare the version-19-based catalog publication and full recovery bundle | Consistent descriptor/package; complete source/financial/eligibility conservation; bound references; recoverable dependency snapshots and restoration evidence |
| 3 | Operator: publish a separately validated candidate | Catalog-only 03 → 04 → 05 → 06; capture actual new versions; run publication/descriptive/catalog and authenticated API/UI/export checks against that same release |
| 4 | Data Analyst/Backend Engineer: deliver the reviewed classification and SKU quantity forecasting feature | Independent classification evaluation; accepted unit-history cohort; common-origin baseline comparison at supported target leads; versioned candidate outputs and applicable acceptance |
| 5 | Business Analyst/Database Engineer: supply operational inventory/supplier data | Timestamped stock/on-order/commitments, lead time, costs, order packs/MOQ, service and expiry policies; evaluated stock-aware draft orders |
| 6 | Data Analyst: evaluate external increments | Accepted geographical and product/condition evidence, origin-known availability, identical holdouts and repeatable incremental improvement |

Bronze01 preserves raw inputs; Silver02 types/assesses them; Gold03 creates governed facts/marts; 04/05 bridge outputs; 06 decomposes eligible monthly history. **06 does not replace Bronze01**, approve products or train a quantity forecast. A mapping-only publication does not need an unnecessary 01/02 raw reingestion. External notebooks and predictive07/08 preparation remain separate.

The [product review guide](../../docs/PRODUCT_MASTER_REVIEW_GUIDE.md) gives the exact 29-column review workflow. The next useful capstone milestone is an evidenced classification-plus-quantity-forecast demonstration for a defensible cohort, with honest evaluation and limitations. Completing every proposal or adding every external source is not a substitute for that evidence.

## Verification and practical limits

| Executed check | Result |
|---|---|
| Fresh read-only descriptive validator | Fact19, financial/coverage checks and matching72STL verified; saved hashed receipt |
| Full Databricks local notebook/helper suite | 62 tests passed |
| Complete backend test suite | 75 tests passed |
| Backend and frontend TypeScript checks | Passed |
| Notebook README/code parity | Every cell matches |
| Independent saved-CSV QA | 22 checks passed, no defects |
| Offline full-row source/financial conservation | 37,728 archived17 records preserved; only declared proposal-status metadata changes |
| Independent planning QA | 13 focused tests and 1,000 deterministic scenarios passed |

No new authenticated browser acceptance, production build, warehouse write, model activation, clinical validation, purchase execution or complete recovery rehearsal was performed. Existing services were not started or restarted. Earlier full data profiles and receipts are explicitly distinguished from fresh checks.

Assessment files `PRODUCT_FINDINGS.md` and `PIPELINE_FINDINGS.md` describe the initial 507fe… draft before correction. This integrated report, `catalog_refresh/receipt.json`, conservation receipt and final QA describe the corrected 21ba… draft. Preserve both stages as dated evidence.
