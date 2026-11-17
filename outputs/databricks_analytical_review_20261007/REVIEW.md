# MedShield Databricks and analytical data review

Prepared 7 October 2026, Asia/Manila. Accountable role: Data Analyst. Supporting reviews covered source CSV reconciliation, pipeline architecture and external-source coverage.

## Decision

The inspected live fact, configured gateway release and STL identities match the latest validated descriptive candidate. This fresh check does not revalidate every dependent Gold table or bridge. Keep the present Bronze → Silver → Gold → bridges → API structure. The next improvements should establish product identities, recover allocation evidence, control source versions and measure analytical coverage.

The screenshot contains the expected descriptive notebooks 01–06, required `product_catalog.py`, sales inputs and reference files. Names alone do not establish deployed source revisions. Read-only SQL confirms fact Delta version **17**, policy **sales_restart_gold_v7_independent_catalog**, resolution **catalog_v1_independent_evidence**, the configured gateway release and matching 72-row STL. The fact stayed at version 17 throughout the check.

The fact's last write shown by history is 27 September 2026. The latest recorded candidate validation is 3 October; this review verifies its output identity again on 7 October. This is current against that validated candidate, not evidence that a new data upload occurred today or that business release approval has been granted.

An additional read-only Workspace list/export request returned HTTP 403. Therefore exact cloud notebook bytes and operator run IDs remain unverified. Local notebook 01–08 hashes match the sealed 3 October package; local required helper and both review-master hashes match live Gold metadata. [Live SQL receipt](live_check.json), [Workspace access receipt](workspace_check.json), [previous candidate evidence](../candidate_release_20261003/README.md).

## What was studied

- All nine yearly CSVs from `data/medshield/dataset_csv`, plus all nine corresponding CSVs from `databricks/medshield_project_csv/medshield_project_csv`.
- All 37,728 records in the complete archived version-17 Databricks extraction. Its checksum, unique source IDs and sealed preparation outputs were verified. Aggregate finance and coverage were independently recomputed and compared with live SQL at version 17.
- Four modeled DOH disease files: Dengue, Leptospirosis, Cholera and Typhoid Fever, totaling 2,518,227 source records. This is not a profile of every DOH file.
- Four proposed PAGASA stations: Ambulong, Daet, Sangley Point and Tayabas, totaling 11,688 daily rows. This is not a profile of every PAGASA station.
- The local transformation, review, bridge and validation code, current architecture, financial definitions and publication records.

The CSV analysis reused AST-selected pure decoding and Silver assessment/reconciliation helpers without executing Spark cells. All external outputs are aggregate-only. No source file, notebook, application, warehouse object, model release or business approval was changed.

## Verified sales findings

| Finding | Measurement | Analytical implication |
|---|---:|---|
| Retained records / unique source IDs | 37,728 / 37,728 | No duplicate retained source IDs in this release; repeated DR numbers are not automatically duplicates. |
| Current reporting groups / raw title variants | 4,561 / 4,985 | Reporting labels exist; verified sellable identities do not. |
| Approved identity / category records | 0 / 0 | A successful Gold run does not approve the product catalog. |
| Explicit sellable packaging absent in literal proposals | 4,406 of 4,561 groups | These are parser proposal gaps, not verified packaging classifications. |
| Explicit pack count absent in literal proposals | 4,509 groups | No default Piece/Box count or dose conversion can be justified. |
| Adjusted-source-file records | 11,355, or 30.10% | These files are marked adjusted; this is not the count of individually allocated lines. |
| Eligible sales in adjusted-source-file stratum | ₱299,249,415.55, or 47.73% | Nearly half of eligible sales belongs to files carrying estimated-allocation provenance. File status does not prove that every record was substituted. |
| Observed revenue months / calendar positions | 98 / 108 | Ten months remain unknown, not zero. |
| Quantity × recorded CP differs from gross by more than ₱0.02 | 1,424 of 36,885 complete records | Keep exceptions visible and retain existing metric eligibility; do not rewrite source amounts automatically. |
| Missing net-sales value / recorded selling price / quantity | 880 / 835 / 11 records | Missingness differs by metric; one complete-record filter would discard otherwise usable financial evidence. |
| Validated comparable unit-price records | 0 | Price variation cannot prove package equivalence, bulk discounts or negotiation. |

Recorded CP is the selling price. TP/UNIT is acquisition cost. Gross margin amount is not company net profit. Weighted margin uses gross margin divided by revenue for the same margin-eligible records. [Definitions](../../docs/BUSINESS_DEFINITIONS.md).

Eligible net sales sum to **₱626,946,741.81**. Margin-eligible revenue is **₱478,720,670.03**; its gross margin is **₱288,487,498.72**, giving **60.262177%**. These denominator restrictions must accompany the output.

| Calendar year | Retained records | Observed revenue months | Eligible net sales | File provenance |
|---|---:|---:|---:|---|
| 2017 | 1,978 | 7 | ₱10,211,167.35 | Original; low-trust historical source |
| 2018 | 6,181 | 10 | ₱51,619,691.27 | Original, includes retained historical backfill |
| 2019 | 5,446 | 9 | ₱62,542,304.49 | Original |
| 2020 | 3,980 | 12 | ₱63,593,274.63 | Adjusted |
| 2021 | 3,407 | 12 | ₱77,860,206.26 | Original |
| 2022 | 3,980 | 12 | ₱63,234,990.04 | Original |
| 2023 | 5,381 | 12 | ₱62,228,966.85 | Original |
| 2024 | 2,831 | 12 | ₱50,259,319.88 | Adjusted |
| 2025 | 4,544 | 12 | ₱185,396,821.04 | Adjusted |

Missing months: May–August and October 2017; January–February 2018; October–December 2019. Source filenames cannot determine calendar coverage: the 2019 file supplies retained 2018 backfill. Observed months do not independently prove complete submitted records.

2025 sales are 268.88% higher than 2024. This financial change is descriptive evidence; it does not establish increased disease demand or the truth of allocated SKU quantities. In 2025, only **₱95,077,093.87** of the **₱185,396,821.04** revenue belongs to the margin-eligible population. Show that coverage beside a 2025 margin rate.

[Recomputed complete fact profile](gold_profile.json), [sealed product/pricing review](../product_sales_rules/2026-10-02T21-00-51-469Z/sealed-review/summary.json).

## Source version mismatch

The Databricks export's nine-file dataset ID matches the live fact. Recomputing its Silver survivors yields exactly the same 37,728 source-record IDs as the archived fact, with zero absent or extra IDs.

The other local CSV directory is a different snapshot. Preserve both the original evidence and the controlled deployment source instead of overwriting one with the other.

| File year | Difference between local data directory and Databricks export |
|---|---|
| 2017, 2021 | Raw hashes differ; decoded content is identical after BOM/newline normalization. |
| 2020 | Three physical positions differ; original versus reviewed adjusted source. |
| 2024 | 124 physical positions differ; original transaction candidates contain 123 recognized contract-parent labels, while adjusted export contains none. |
| 2025 | Other local source copy contains 4,137 transaction candidates, including 223 recognized contract-parent labels; its hash is unreviewed by the current Bronze contract. Reviewed export contains 4,544 product rows and no contract-parent labels. |
| 2018, 2019, 2022, 2023 | Source bytes agree between these two directories. |

For 2025, both source versions have identical financial totals across all transaction candidates: gross **₱185,777,264.24**, net **₱185,396,821.04**, acquisition **₱94,760,630.25**, gross margin **₱90,636,190.79**. The source-candidate gross margin is not the eligible reported gross margin. Different cleaning subsets explain why summing only retained rows from the other local copy produces a smaller amount. Financial equality does not establish that this other copy is original-source evidence.

This is an allocation transformation that preserves finances. It is not proof that the introduced product identities or quantities were observed invoice details.

The other local 2025 copy has SHA-256 beginning `2738afaf`; the currently reviewed replacement begins `d05fec98`. Bronze intentionally rejects an unreviewed 2025 hash. Preserve that check and review the next snapshot explicitly. [Full source reconciliation](source_profile.json), [Bronze](../../databricks/medshield_project/01_sales_bronze.py), [Silver](../../databricks/medshield_project/02_sales_silver.py).

## External-source findings

Live Gold exposes **2,171 external signal rows**, with **zero join-ready rows and zero forecast-eligible rows**. This matches 1,787 DOH disease/territory/month rows plus 384 PAGASA station/month positions under the current policy. Signals being present does not make them approved predictive features.

The selected DOH files have zero invalid onset dates, invalid case counts or blank province values under the current parser. Reproducing Gold's four-disease, seven-territory, 2018–2025 selection yields 1,787 monthly rows and 233,531 summed case counts. Some rows represent aggregated counts; file row counts are not case totals. Raw Dengue/Cholera files include 2017 and all four selected sources include partial 2026. Current Gold intentionally excludes years outside 2018–2025.

PAGASA has all 2,922 expected dates per selected station from 2017–2024 and no duplicate dates. Rainfall is complete for **383 of 384 station-months**. Ambulong January 2020 has 14 missing daily rainfall values and requires an incomplete-month label. Daily temperature/humidity/wind also have limited gaps at Ambulong and Sangley. New-batch mean temperature is derived from TMAX/TMIN; keep that method visible. Retain separate NASA POWER proxy labels for supplementary periods.

| Disease | Batangas / Ambulong | Camarines Norte / Daet | Cavite / Sangley | Quezon / Tayabas |
|---|---:|---:|---:|---:|
| Dengue | 83 / 84 | 84 / 84 | 84 / 84 | 84 / 84 |
| Leptospirosis | 47 / 84 | 50 / 84 | 73 / 84 | 55 / 84 |
| Cholera | 3 / 84 | 20 / 84 | 6 / 84 | 5 / 84 |
| Typhoid Fever | 74 / 84 | 67 / 84 | 81 / 84 | 75 / 84 |

The table counts months with both a disease observation and complete official rainfall during 2018–2024. It is a coverage candidate, without approved sales/product associations. An absent disease record is not automatically a zero-case month. Dengue is a stronger initial coverage candidate than Cholera; this does not establish an association with any product or better forecast accuracy.

Seven territory mappings remain pending. Camarines Sur, Laguna and Marinduque lack a proposed PAGASA station in the present mapping. Resolve station representativeness and territory evidence explicitly. A label such as Government or Hospital does not identify a province.

Retrospective onset dates lack source release timestamps. A one-month lag alone cannot establish that these data were available at historical forecast origins. Capture publication/availability dates or clearly limit an experiment to retrospective explanatory analysis. Never evaluate forecasts using future observed weather or disease records that would have been unavailable to the forecaster. [External profile](external_profile.json), [external Silver](../../databricks/medshield_project/external_restart/02_external_silver.py), [external Gold](../../databricks/medshield_project/external_restart/03_external_gold.py).

## Ordered implementation recommendations

| Priority and owner | Change | Acceptance evidence |
|---|---|---|
| 1 — Data Analyst / data owner | Establish a versioned source registry distinguishing originals, adjusted deployment inputs, file hashes and reviewed supersessions. Obtain the next Workspace export before treating its notebook contents as verified. | Exact source identity; originals retained; source-to-Silver-to-Gold totals and IDs reconciled; new batch never bypasses historical hash guards. |
| 2 — Data Analyst / business approver | Populate the existing product master, starting with the high-revenue review cohort. Review identity, category, item kind, unit and forecast scope independently. Include brand/model/strength/form/package/count where applicable. | Approved aliases map to one compatible sellable SKU; Piece/Box/strength/model conflicts remain separate; source finance and record count preserved. |
| 3 — Data Analyst / data engineer | Recover original line items for summary/contract labels and add row-level allocation lineage: parent reference, method/version, actual versus allocated status, evidence and amount reconciliation. | Recoveries reconcile with parents without double counting; adjusted rows qualify as verified detail only with independent identity/quantity evidence. |
| 4 — Database Engineer / BI Specialist | Add an explicit coverage/quality output by source, year/month, SKU/unit, territory, metric and provider. Show observed, missing, verified-zero, excluded and adjusted scope; add margin denominator coverage and prioritized formula exceptions. | Ten known missing sales months remain null; incomplete rainfall remains incomplete; weighted margin uses its eligible denominator; incompatible quantities never sum as medicine demand. |
| 5 — Database Engineer / Data Analyst | Reconcile the Databricks Lakeview dashboard and app populations, identities and release metadata. Following approval, use canonical identity and compatible unit in product marts; retain raw aliases and provenance for drilldown. | Same population/filter/release yields equal measures; product approval changes grouping without deleting financial transactions. |
| 6 — Data Analyst / domain reviewers | Review geography, station policy and supported disease-to-product associations separately. Build a monthly feature dataset with per-source completeness and availability times. | No implicit allocation of Government/Hospital sales to provinces; approved joins only; absent disease months not zero-filled; provider labels and unit conversions retained. |
| 7 — Data Analyst | Use existing sales-only baselines and evaluate additional methods with rolling origins and the same eligible observations. Add a separate SKU/unit forecast contract for reviewed products; compare external features only when their timing and joins are defensible. | Accuracy by actual lead month; all preprocessing/feature selection fitted before the origin; external model beats or is rejected against baseline on matching test cases. Revenue forecasts are never renamed as quantity forecasts. |
| 8 — DevOps / database owner | Make the next dataset path configurable and record a complete candidate release bundle: input/helper/reference hashes, run IDs, table versions, bridges, STL/model versions and validation receipts. | New years and changed row counts pass dynamic reconciliation; activation only after all dependent objects match; complete recovery evidence exists. |

The existing Gold resolver, canonical dimension, conservative duplicate handling, exact-decimal financial checks, dynamic calendar spine, weighted margin, signed adjustments and version-bound STL should be retained. Gold currently writes its output tables separately; validate the complete bundle before changing the active release.

The current restart is bound to historical hashes/counts and a version-16 catalog predecessor. Its calendars already support later years, but new uploads need a governed batch/publication path. Preserve the hardcoded historical 37,728 / 108 / nine-year validation as a regression fixture and add dynamic checks for later snapshots. The count-only monthly utility cannot prove financial or SKU quality.

The screenshot's absent `product_review_rules.py` and `review_product_sales.py` are local proposal/pricing tools, not required imports for deployed Gold. Optional 07/08 notebooks support predictive contracts/frozen inputs and are not required to keep descriptive 01–06 working. Deploy predictive additions through the existing publication workflow when needed; do not rerun Bronze/Silver solely because a helper filename is missing from this view.

Stock positions, incoming orders, lead times, expiry, supplier constraints and reviewed ordering/holding costs remain inputs for actual restock decisions. Until supplied, procurement outputs remain explicitly assumed scenarios. [Product/forecast plan](../../docs/AI_PRODUCT_CLASSIFICATION_IMPLEMENTATION_PLAN.md), [future ingestion contract](../../docs/SALES_DATA_PIPELINE_SPECIFICATION.md).

Forecast evaluation recommendations follow [rolling-origin evaluation](https://otexts.com/fpp3/tscv.html) and [simple baseline methods](https://otexts.com/fpp3/simple-methods.html). Warehouse version verification follows [Databricks DESCRIBE HISTORY](https://docs.databricks.com/aws/en/sql/language-manual/delta-describe-history).

## Verification and limits

| Criterion | Result | Evidence |
|---|---|---|
| Live output identity, configured release, row/financial/month counts | PASS | `live_check.ts` read-only SQL, `live_check.json`; fact version 17 at start/end. |
| STL source version, dataset and policy agree | PASS | Live SQL grouped STL identity, 72 rows bound to fact 17 / v7. This check does not rerun full STL reconstruction. |
| Complete archived extraction and sealed review checksums | PASS | `profile_gold.py`, `gold_profile.json`; all 37,728 rows processed, unique source IDs and hash checks. |
| All nine deployment CSVs reproduce the retained source population | PASS | `source_profile.json`; 37,728 IDs, zero missing/excess; dataset identity agrees. |
| Other local source directory equals deployment source package | DIFFERENT SNAPSHOTS | Provenance and encoding differences quantified; originals preserved. |
| External source profiling and current policy aggregation | PASS, SELECTED SCOPE | Four diseases/four stations; hashes/counts/missingness and Gold-equivalent monthly population recorded. |
| Current Workspace notebook bytes and operator run IDs | NOT VERIFIED | Read-only Workspace endpoint returned HTTP 403; no permission bypass attempted. |
| Business approval, new product identity evidence, forecast activation | NOT PERFORMED | Review deliverable only; these are next-work dependencies. |

Application builds, server restarts and notebook reruns were unnecessary for this read-only study. Existing development processes were inspected and preserved. Recommendations above are proposed work, not deployed changes or new business approvals.
