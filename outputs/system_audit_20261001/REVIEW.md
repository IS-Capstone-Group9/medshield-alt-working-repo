# MedShield: verified system and capstone review

Reviewed 1 October 2026. Accountable role: Orchestrator, with sequential business, data, BI, implementation, and QA review. This is an assessment, not business approval.

## Verdict

**The latest Databricks descriptive candidate is technically ready for candidate review. The configured application has a release-version mismatch. The overall pharmaceutical demand and inventory DSS promised in the original paper is not complete or operationally validated.**

This distinction matters: sound historical sales reporting can be released within an explicit scope without waiting for every forecasting feature. It cannot be described as proof of pharmaceutical demand, disease-driven procurement, or reduced expiry.

I inspected the current working tree, canonical documents, notebooks, API and dashboard logic, queried live Databricks, reran relevant checks, and compared them with `references/CapstonePaper_1.pdf`. No application source, environment configuration, paper, warehouse data, or approval record was changed. Audit scripts and receipts were saved locally. Existing user changes were preserved.

The paper is a **proposal**, so unimplemented objectives are remaining commitments, not necessarily false claims of completed work. Its stated empirical findings and internally inconsistent equations still require correction before reuse in the final manuscript.

## Fresh evidence and identity

| Item | Verified result |
|---|---|
| Original paper | 149 pages; SHA256 `4c40147be0de0563e2a58bc0210c0a13cf850bf1382577fff497422b44ebe862` |
| Dataset ID | `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4` |
| Latest fact table | `workspace.medshield_gold.sales_restart_fact_candidate`, Delta version **17** |
| Gold policy | `sales_restart_gold_v7_independent_catalog` |
| Product mapping hash | `1361f7629d4dab4f1f6414db32a19e9eea9ab20acb99319d168aecc9fef48088` |
| Area mapping hash | `a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949` |
| Warehouse status | `CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW` |
| Source records | 37,728; latest date 2025-12-31 |
| Current backend environment | Pinned to fact version **16**, policy v6 |
| STL table | 72 months, January 2020–December 2025, bound to **17/v7** |
| Publication readiness, process-only version 17 override | **72 PASS, 0 FAIL, 0 UNVERIFIED** |
| Descriptive validation | Default version 16 fails matching-STL lookup; version 17 **passes** |
| Catalog validation, version 17 | **PASS**; exact source-record financial/eligibility comparison against 16 unchanged |
| Backend unit tests | 42 passed |
| Notebook unit tests | 40 passed |
| Type checks | Backend and frontend passed |
| Chart integrity tests | 9 passed, using controlled browser fixtures |
| Predictive release | No rows in `model_release_pointer`; runtime reports unpublished |

Version 17 was selected only inside separate validation processes. The application's configuration was not changed. An earlier version-16 catalog compatibility result saying “NOT_DEPLOYED” does **not** describe the latest warehouse: the new catalog schema is deployed at version 17.

Primary receipts:

- [Live SQL, results and active release](C:/Users/Adrian/projects/medshield1/medshield/outputs/system_audit_20261001/live.json)
- [Publication evidence](C:/Users/Adrian/projects/medshield1/medshield/outputs/publication_readiness/2026-10-01T15-42-38-521Z/evidence.json), evidence hash `935ca5a2896bed3413444b5023ce0e0af288ddd401c8cc7f921ddce066f45993`
- [Descriptive evidence](C:/Users/Adrian/projects/medshield1/medshield/outputs/descriptive_validation/2026-10-01T15-42-22-781Z/evidence.json)
- [Catalog evidence](C:/Users/Adrian/projects/medshield1/medshield/outputs/catalog_validation/2026-10-01T15-42-44-691Z/evidence.json)
- [Independent metric recomputation](C:/Users/Adrian/projects/medshield1/medshield/outputs/system_audit_20261001/independent_metrics.json)

## What is right and should be retained

1. **Databricks as the analytical source of truth.** The gateway reads warehouse data and exposes identity/provenance. Local preparation and model artifacts are evidence, not dashboard substitutes.
2. **Revenue preservation with explicit allocation provenance.** Cleaning and adjusted historical allocations can support financial reconciliation while remaining ineligible as verified product-unit observations. Version 17 preserves the version-16 source-record financial values and eligibility flags.
3. **Separate metric eligibility.** Revenue, acquisition cost, quantity and gross profit have different usable populations. The matched margin denominator is better than silently dividing partial profit by every sale.
4. **Missing observations remain distinguishable from zero.** Matched-period YoY, partial-date handling and absence states have explicit logic. The chart integrity suite verifies leap days, negative values, returns-aware ABC, estimate labels, and STL scope/export behavior.
5. **Descriptive product ranking is deterministic.** Positive contribution ranking with separately visible returns is a defensible proposed ABC policy; an ML model is not needed to reproduce fixed cumulative thresholds.
6. **Actual STL exists in Databricks.** It uses period 12, seasonal window 13, robust fitting, a minimum of 36 contiguous months, and splitting at gaps without imputation. Calendar-month averages are a separate statistic.
7. **Forecast evaluation is more honest than simply choosing Prophet.** The inspected run actually evaluated benchmarks, ETS and Prophet and retained a simple benchmark when challengers did not qualify. Unavailable intervals and absent release approval are visible.
8. **The UI increasingly describes limitations.** Gross profit is labelled before operating expenses; missing values and estimates have explanations. These are useful safeguards, not reasons to hide otherwise valid reporting.

## Issue register

“Confirmed” means observed in code, live data, the paper, or fresh checks. “Risk” is not a proven production failure. Priorities: P1 blocks the affected release or claim; P2 is a material interpretation/maintainability correction.

| Priority / type | Problem and evidence | Business effect | Smallest sufficient action and acceptance |
|---|---|---|---|
| P1 confirmed configuration defect | Backend selects fact 16; current STL is bound to 17. `backend/src/databricksDashboard.ts:165`, `:1169`; fresh default validation fails. | A financial view can load while STL fails; the app and operator are discussing different releases. | Developer/operator: select one coherent candidate and deploy its configuration. For 17, rerun publication, descriptive and catalog checks through the restarted authenticated app. Verify export metadata also says 17/v7. Keep a coherent rollback receipt, not just an old fact pin. |
| P1 confirmed missing catalog evidence | 4,561 API product groups, all revenue unresolved; 0 canonical SKUs and 0 units of measure in latest fact. Catalog structure is deployed, approved content is not. | Source labels cannot be presented as verified pharmaceutical SKUs or summed as comparable medicine units. | CEO/client catalog owner supplies reviewed identity/category/pack evidence; engineer loads versioned mappings. Keep category, identity, units and transaction provenance independent. Unknown pack size stays unknown; box and piece stay separate. Reconcile revenue and prove no adjusted transaction became observed medical demand. |
| P1 confirmed geographic limitation | “GOVERNMENT” and “HOSPITAL” hold ₱475,750,341.11, 75.88% of all-period eligible revenue, without province assignment; mapping approval statuses remain unresolved. | Province charts cover a subset. Industry labels cannot stand in for delivery geography, account identity, or hospital ownership. | Retain an explicit unallocated segment; publish coverage. Map only with invoice/client evidence. CEO approves unresolved business mappings once supported; validate province plus unallocated totals equal the selected-period total. |
| P1 confirmed delivery gap | `backend/src/server.ts:756` returns HTTP **409** for `/api/sales/upload`, `DATABRICKS_INGESTION_REQUIRED`. | The CEO cannot yet upload new sales through the promised client workflow. | Implement an upload-to-Databricks job flow with validation, progress, rejected-record feedback, dataset receipt and controlled activation. Document/DR number alone is not a safe line key: use batch/file retry identity and explicit whole-document correction semantics, preserving identical legitimate lines. Test retry, correction, new year and failure recovery. |
| P1 confirmed forecast scope/evidence gap | Runtime has no published model pointer. Inspected experiment targets company monthly **net sales in PHP**, not pharmaceutical quantities by territory. | A peso forecast cannot directly determine boxes/tablets to purchase. | Analyst and adviser: define a testable target and supported scope. Keep this experiment labelled company sales forecasting. Only extend to SKU/territory demand after identity, unit, geography, coverage and validation gates pass. |
| P1 confirmed external integration gap | Live external view contains 1,787 disease and 384 weather rows, but **zero join-ready and forecast-eligible rows** in both families. | Disease/weather-adjusted procurement is not currently supported. | Resolve geography, dates, publication lags and feature definitions; validate joins and incremental forecasting benefit. Do not include external sources in descriptive sales totals. |
| P1 confirmed prescriptive mismatch | `solveDatabricksPlanningScenario`, `backend/src/databricksDashboard.ts:936`, allocates packs greedily by fulfillment ratio. Paper p103 promises MCDA-weighted LP; actual MCDA uses sales and activity coverage. | A useful scenario calculator would be overstated as proven optimal procurement. | Either describe and test the existing heuristic honestly or implement the stated optimizer after defining its objective, units and constraints. Verify feasible/infeasible examples and compare a small case with exhaustive optimal results. |
| P1 missing outcome evidence | No verified batch stock, expiry, purchases, lead-time/cost baseline or operational outcome study supports the paper's ≤5% wastage target. | Sales-only analysis cannot prove expiry reduction or inventory turnover improvement. | Obtain and reconcile inventory/procurement/expiry data; define wastage numerator, denominator, observation period and comparison. Otherwise retain the target as an unverified proposal and use explicitly hypothetical scenarios. |
| P2 confirmed metric interpretation risk | ₱626,946,741.81 revenue; ₱288,487,498.72 eligible gross profit; gross-margin denominator only ₱478,720,670.03. | The valid **60.26%** margin describes a population covering **76.36%** of revenue. It is not whole-business net profit. | Keep the matched denominator; display coverage beside the KPI and in exports. Do not “fix” it by dividing partial profit by all revenue. For 2025, margin coverage is only about 51.28%. |
| P2 confirmed coverage limitation | Ten months have no observations in 2017–2019; 2017 September has only one candidate record. | Twelve calendar slots or one record in a month do not demonstrate business completeness. | Continue unknown-versus-zero semantics, disclose observed coverage and compare matched periods. Preserve the CEO's completeness assumption as an assumption, not a data-quality certificate. |
| P2 confirmed methodological governance gap | `frontend/services/api/descriptive-period-runtime.ts:328` generates missing-period estimates using 0.6/0.3/0.1 prior-year weights and nearby-day fallback. These are labelled but not a validated forecasting model. | A smooth historical curve can suggest observed activity or established forecasting accuracy. | Keep recorded history as the default. If estimates remain useful, expose an explicit estimate/scenario option, separate totals, methodology and exports. Publish governed estimate outputs/versioning through Databricks if used for decisions; keep them out of actual KPIs and model training observations. |
| P2 confirmed documentation drift | `docs/CURRENT_STATE.md` pins 16 and contains old financial-approval wording; catalog deployment text is stale; `docs/DESCRIPTIVE_ANALYTICS_LOGIC.md` retains local processed-file wording; paper p119 describes Supabase PostgreSQL analytics. | Conflicting instructions lead to rerunning the wrong notebook or overstating approval. | Update one release receipt and canonical runtime architecture, then link other documents to it. Preserve historical receipts rather than rewriting history. Distinguish existing financial-definition approval from dataset-release approval. |
| P2 usability risk | Dense chart captions and small labels; synthetic rendering confirms layout/logic, not a complete authenticated usability or accessibility review. | The CEO may miss critical scope, coverage or version limitations. | Simplify the primary chart message; put source, period, coverage and estimated status nearby. Verify keyboard use, contrast, zoom, narrow screens, error/loading states and real exports with a CEO task walkthrough. |

## Paper alignment: exact corrections

Page numbers below are PDF pages, matching the displayed page numbers inspected. Full extracted text and selected page renderings are stored beside this report.

| Paper objective / claim | Current implementation and evidence | Assessment / required correction |
|---|---|---|
| Objective 1, pp11–12: 2021–2025 territory baseline with STL | App supports 2017–2025; published STL is company monthly net revenue, 2020–2025. | Partially implemented. Document the extra historical years and separate study period; do not describe company monthly STL as daily territorial decomposition. |
| Objective 2: territories, client accounts, SKUs, concentration and XGBoost ABC | Source-label revenue rankings and provisional area groups exist; canonical SKUs and account-level attribution are not established. | Descriptive concentration is useful; SKU/account claims exceed evidence. Deterministic current ABC is appropriate. Future ABC prediction would require a future-period label, as-of features and temporal evaluation. |
| Objective 3, p12: territory pharmaceutical demand, Prophet+DII+RSI and XGBoost urgency | Company PHP experiments exist; no approved model release; external joins ineligible. | Not fulfilled. Define urgency ground truth and forecast unit before claiming implementation or accuracy. |
| Objective 4, p12: EOQ/ROP/MCDA LP and ≤5% expiry | Assumption-driven pack allocation exists; required operational input and outcome evidence is missing. | A scenario prototype cannot demonstrate operational optimization or expiry impact. |
| Objective 5, p12: client CSV upload, Signal-2 alerts and collaborative filtering | Dashboard modules exist; upload is disabled; approved external/model evidence is absent. | Interface presence is not capability completion. Demonstrate each promised end-to-end workflow or formally revise scope. |

Specific manuscript problems:

1. **Pages 95 and 115 disagree.** Page 95 reports 3,631 SKUs split into 449/835/2,347; p115 says **4,449** in the first class. That is a confirmed transcription/arithmetic error. The current 2021–2025 fact contains 3,382 distinct normalized source labels, not independently verified SKUs. Recompute the paper's counts from a frozen dataset, cohort, returns policy and mapping version; the numerical discrepancy alone does not prove the older analysis was fabricated.
2. **Page 93's five-year Antizoal seasonality claim is not reproduced.** An exact `ANTIZOAL 5MG/ML` series peaks in July 2021; other years contain label changes and adjusted allocations. The paper says “Antizoal IV Infusion,” so a reviewed alias/product definition is essential before a like-for-like claim can be tested. Withdraw “consistently across all five years” unless a reproducible query proves it. Even a recurring sales pattern would not by itself prove amihan or disease causality.
3. **Pages 92–93 confuse analytical granularity.** The paper specifies daily STL, then downstream monthly forecasts. The current validated decomposition is monthly company revenue. Specify series, frequency, units, minimum history, missingness and whether components are merely explanatory or actual model inputs.
4. **Pages 95–98 contain a potential evaluation leakage design.** Training on 2021–2024 while normalizing DII with the full 2021–2025 mean uses holdout information if followed literally. Fit normalization and any STL-derived predictor inside each training fold. This is a paper-design risk, not a claim that the present sales-only experiment executed that leakage. Future external inputs also require an available-at-time forecast/scenario, not future observed weather or disease counts. [Prophet regressor documentation](https://facebook.github.io/prophet/docs/seasonality,_holiday_effects,_and_regressors.html).
5. **Pages 98–99 define RSI as a probability, not rainfall in millimetres.** The proposed thresholds and demand uplifts need source justification and calibration. Historical rainfall measurements and above-normal rainfall forecast probabilities are different variables; they cannot be substituted silently.
6. **Page 103's displayed LP does not express its stated objective.** `Max Z = x + y` has no MCDA weights or territory indices even though the text claims MCDA-weighted territorial fulfillment. Define actual decision variables, weights, demand bounds and units before using this as an optimization specification.
7. **Page 105's safety-stock equation does not establish an expiry ceiling.** A Z value in a variability/lead-time formula is not evidence of ≤5% expiry. Expiry needs stock age, shelf life, depletion and replenishment evidence plus outcome evaluation.
8. **Page 107 must distinguish an internal weather trigger from an official warning.** WeatherAPI measurements cannot constitute a PAGASA Signal-2 declaration. PAGASA defines TCWS by expected wind threat and lead time; show the official advisory separately. Unvalidated category demand multipliers and automatic stock doubling must remain reviewed scenarios. [Official PAGASA definition](https://pagasa.dost.gov.ph/learning-tools/tropical-cyclone-wind-signal).
9. **Page 119 describes a different analytical architecture.** Update the final paper's diagram and data flow to show Databricks Delta/Gold as the analytical source, the TypeScript gateway and dashboard, and Supabase's actual authentication role. Do not maintain two competing analytical warehouses merely to match the proposal.

## Forecast evidence: what can actually be defended

The inspected latest model run is `1a232ddd58100e6e25d2623276dc94d13587664216d831e675df5b5922e890bc`, under `outputs/predictive_validation/2026-09-27T14-30-12-921Z/model-run/`.

It evaluated 15 configurations: four benchmarks, two ETS and nine Prophet. Artifact hashes were checked; independent recomputation of 30 development/audit metric groups from predictions agrees with saved evaluations. The selected last-value benchmark has development WAPE **83.20%**, and retrospective 2025 audit WAPE **37.76%**, MAE **₱5.83 million**, RMSE **₱6.96 million**. Prophet audit WAPE is approximately **72.11–72.61%**. These are experiment results, not evidence of low-error pharmaceutical demand prediction. WAPE is not directly interchangeable with the paper's MAPE targets.

The 2025 evaluation is explicitly retrospective; do not promote it to an untouched final holdout. Supported empirical interval samples are insufficient, so absence of 80/95% intervals is appropriate. Actual sales end in December 2025: as of October 2026, an immediate forecast begins at lead 10, while a new 12-month window would require leads beyond the evaluated maximum of 12. Refresh observations or restrict the supported horizon. No active warehouse model release was found.

## Recommended sequence and decision ownership

1. **Repair release consistency first.** Developer/operator aligns the candidate application with 17/v7 and matching STL, repeats the three receipts, then checks authenticated chart/table/export identity. This does not require reapproving already confirmed financial definitions. Roll back only to a complete retained release with matching dependencies.
2. **Finish the descriptive release within a truthful boundary.** Analyst and frontend developer retain observed sales, positive-contribution ABC with visible returns, matched YoY, margin coverage, unallocated geography and honest STL scope. Decide whether estimates are an optional scenario. Run a CEO task walkthrough and capture dataset-specific acceptance.
3. **Populate the catalog progressively.** Prioritize high-contribution products. Preserve source titles. Approve category separately from exact SKU identity, strength/form/pack, unit conversion and transaction provenance. Do not merge brands or “plain/Christine” based on text resemblance alone. A new unknown product should remain visible as Unclassified while its affected SKU analytics are withheld; unrelated financial reporting can continue.
4. **Reconcile capstone commitments with available evidence.** Team and adviser choose which original objectives will be completed and which require a formally approved scope amendment. The CEO approves business reporting/mapping/planning assumptions; the adviser/panel controls academic scope acceptance. Do not silently redefine pharmaceutical demand as peso revenue.
5. **Complete client ingestion and correction semantics.** Backend/Databricks owner implements upload-to-job orchestration, durable receipts, reconciliation and release selection. Client operates the dashboard, not notebooks. Unknown mappings enter a review queue; duplicate-looking lines are not automatically deleted when only a DR number is available.
6. **Then pursue operational predictive/prescriptive claims.** Obtain missing inventory and catalog data; validate external features; use temporal evaluation and benchmark comparisons; implement and test the intended optimizer; measure outcomes prospectively. Keep unavailable capabilities explicitly unavailable until their own gates pass.

CEO decisions still needed concern the exact dataset release and reporting limitations, remaining evidenced catalog/geography mappings, and any new operational planning assumptions. Preserve her existing financial-definition decisions and conditional annual-total acceptance of adjusted allocations. Equal annual totals never convert allocated product quantities into observed facts. The user's selected positive-contribution returns policy should not be attributed to CEO approval unless the record explicitly does so.

## Scope of confidence

This review combines fresh live warehouse reads, local API-function validation, code inspection, selected rendered paper pages, PDF text inspection and controlled browser tests. It is not a complete authenticated production deployment test, penetration test, accessibility certification, citation-by-citation verification of all 149 pages, or measurement of client operating outcomes. No source-file authenticity or missing-sales completeness proof can be inferred from successful reconciliation. No approval was added.
