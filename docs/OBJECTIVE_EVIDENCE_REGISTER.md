# MedShield objective, scope and evidence register

Prepared: 3 October 2026 (Asia/Manila).  
Accountable documentation role: Business Analyst, with integration review performed sequentially.  
Status: **Step 1 deliverable prepared and checked; business release and academic scope decisions remain pending.**

## Purpose and authority

This register connects the original capstone objectives to implementable capabilities, required inputs, owners and measurable acceptance. It is the central objective/evidence index; [REQUIREMENTS.md](REQUIREMENTS.md) remains the detailed functional contract, [BUSINESS_DEFINITIONS.md](BUSINESS_DEFINITIONS.md) owns metric meanings, and [DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md](DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md) owns recorded descriptive business decisions. Link to those records instead of duplicating or inventing approvals.

The paper being assessed is the original [CapstonePaper_1.pdf](../references/CapstonePaper_1.pdf), objectives on PDF pages 11–12. Its general objective is an integrated descriptive, predictive and prescriptive DSS by December 2026, improving demand visibility and reducing expiry-driven wastage. The five original objectives remain commitments unless the adviser/panel accepts an explicit amendment. The CEO is the sole client business approver; technical reviewers do not grant business approval, and CEO business acceptance does not substitute for academic acceptance.

The latest evidence used here was collected on 1–2 October 2026. This document was prepared on 3 October; the warehouse and tests were **not rerun today**. Status must be rebound to new evidence before release. A claimed implementation is not equivalent to a successful authenticated production demonstration.

## Proposed delivery boundaries

| Milestone | Deliverable and client value | Completion boundary |
|---|---|---|
| A: descriptive release | Explain recorded sales, profit coverage, growth, product contribution and mapped geographic contribution, with historical evidence and warehouse STL | Publish a specific coherent release only after technical reconciliation, usable UI, limitations and CEO acceptance. Source-label financial reports may be accepted while verified medicine/territory demand remains unavailable. |
| B: client operations | CEO can submit sales, understand exceptions, review corrections, publish a candidate and export updated results | Demonstrated authenticated upload, retry, complete-period correction, candidate isolation, acceptance/publication and recovery; documented support owner. |
| C: full agreed DSS | Evaluated forecasts and reviewed planning recommendations support the accepted academic/business objectives | Original objectives satisfied with demonstrated evidence, or their amendments formally accepted. Forecast/model approval and operational outcome evaluation have their own gates. |

These milestones sequence work; they do not remove original commitments. Proposed A uses the existing 2017–2025 historical data, preserving the original **2021–2025 study period** as an explicit filter. Extra 2017–2020 context and the currently published 2020–2025 company STL must be described as such. Future-year ingestion/filter support is a software requirement, not evidence of existing future sales.

## Evidence baseline

| Evidence ID | Checked source | What it supports and its limit |
|---|---|---|
| E01 | [System review](../outputs/system_audit_20261001/REVIEW.md) | Code, paper and warehouse alignment findings; includes verification limitations. |
| E02 | [Refreshed live profile](../outputs/system_audit_20261001/live.json) | Latest fact 17/v7, configured pin 16/v6, 37,728 records, source/mapping identity, STL and no model release pointer as observed on 2 October local time. |
| E03 | [Layer profile](../outputs/system_audit_20261001/layer_profile_20261002.json) | All category/identity records need review; 11,355 adjusted rows; external/model counts; 540 NASA POWER monthly observations. |
| E04 | [Source inventory](../outputs/system_audit_20261001/source_inventory_20261002.json) | Nine sales files, reference master headers, XLSX structure, invalid/empty local station files; format inspection is not exhaustive source validation. |
| E05 | [Publication receipt](../outputs/publication_readiness/2026-10-01T15-42-38-521Z/evidence.json) | 72 PASS/0 FAIL/0 UNVERIFIED against candidate 17/v7. Does not approve any business scope. |
| E06 | [Descriptive receipt](../outputs/descriptive_validation/2026-10-01T15-42-22-781Z/evidence.json) | Eligible totals, common margin denominator, gaps and STL tested for 17. Default version-16 matching-STL failure is recorded in E01/E02. |
| E07 | [Catalog receipt](../outputs/catalog_validation/2026-10-01T15-42-44-691Z/evidence.json) | Version-17 enrichment preserves source finances/eligibility versus 16; deployed catalog schema with unresolved entries. |
| E08 | [Model evaluation review](../outputs/predictive_validation/2026-09-27T14-30-12-921Z/REVIEW.md) and [metric recomputation](../outputs/system_audit_20261001/independent_metrics.json) | Fifteen evaluated configurations; independent recomputation matches 30 metric groups; unpublished company PHP experiment. |
| E09 | [Verification record](../outputs/system_audit_20261001/checks.json) | Previous backend 42 tests, notebook 40 tests, chart fixtures 9 tests and type checks passed. Fixture tests are distinct from real client/production acceptance. |
| E10 | [Recorded CEO decisions](DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md) | Financial definitions and conditional allocation acceptance relayed directly from CEO by user; pending final release and mappings retained. |

Candidate identity in E02/E05–E07: dataset `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`; fact version 17; policy `sales_restart_gold_v7_independent_catalog`. These values identify evidence, not a permanently required production version.

## Original objectives mapped to execution

The wording below summarizes each original objective rather than rewriting it. All criteria are conjunctive for the full objective; partial evidence cannot close an objective.

| Objective | Business output, data and required capability | Current evidence and gap | Owner and acceptance contract |
|---|---|---|---|
| O1, p11: 2021–2025 performance across CALABARZON/MIMAROPA/Bicol; territory YoY and STL | Comparable territory sales/quantity series with mapped geography, period coverage, financial eligibility and product-unit meaning. Sales Diagnostics identifies changes without overstating completeness or cause. FR2–FR4, FR10. | Company finance/YoY and monthly company STL exist. Latest candidate passes E05–E07; app pin mismatch remains. Government/Hospital geography is unresolved; actual STL is company/monthly/2020–2025, not the paper's daily territorial decomposition. | Analyst owns calculations; developer owns UI/API; operator binds release. **AC-O1:** same selected study-period SQL/API/chart/table/export totals; matched YoY coverage; explicit unallocated geography; decomposition per promised series/frequency with enough history and published identity, or approved academic amendment. Missing/zero/partial states and CEO walkthrough pass. |
| O2, p11: territories/accounts, sales volume, revenue/growth, Pareto and XGBoost ABC to prioritize SKUs/slow movers | Evidence-backed product/pack aliases, customer account identifiers, buyer/geography separation, compatible quantity units and contribution/growth. Predictive classification needs a defined future target. FR3, FR4, FR8, FR9. | Deterministic positive-contribution ABC/returns and provisional area ranking exist. All current catalog identity/category rows need review; no canonical units/SKUs. Account-level attribution is not established. Fixed ABC does not itself require XGBoost. | Analyst/catalog reviewer; CEO confirms evidenced business mappings; model developer for any future classifier. **AC-O2:** exact source-to-approved group trace; no merged incompatible packs or changed finance; cohort/filter ranking recomputation and reconciled returns; mapped geographic ranking. Account concentration supported by a verified key. For predictive ABC: future labels/as-of features/time split and per-class evaluation, or explicit amendment retaining deterministic ABC. |
| O3, p12: territory pharmaceutical demand for December 2026 onward with Prophet+DII+RSI and XGBoost urgency | Demand quantity and unit per verified SKU/territory, fresh accepted actuals, aligned disease/weather features available at forecast issue time, and a measurable urgency target. FR5–FR8, FR10. | E08 evaluates company monthly PHP revenue; retained last-value audit WAPE 37.76%, development WAPE 83.20%. Neither disease nor weather candidate is join-ready. No approved model review/manifest/pointer. Current quantity identity cannot support the original target. | Model developer/analyst, operator publication, CEO usefulness review, adviser method review. **AC-O3:** frozen target/unit/geography/cutoff and folds; benchmarks before challengers; leakage-free features; MAE/RMSE/WAPE-or-sMAPE/bias and supported intervals; demonstrated horizon beginning at the stated date; coherent model publication/API/UI. Urgency truth and evaluation defined. If only PHP is supported, rename/scope it explicitly through amendment. |
| O4, p12: EOQ/ROP/LP under revenue/growth/outbreak MCDA; expiry wastage ≤5% | Stock/lot expiry, purchases, pack conversion, supplier lead times, ordering/holding cost, budget/capacity/service policy; defined wastage baseline and prospective outcome period. FR9, FR10. | Live scenario solver is greedy; offline Python contains mixed-integer solver. Current commercial score uses sales value/coverage, not outbreak/growth. Operational inputs are user assumptions. No verified expiry baseline/outcome supports the target. | Operations analyst and developer; CEO policy/usefulness; adviser method/outcome evaluation. **AC-O4:** agreed objective and units; operational input provenance or scenario labels; hand-solvable optimality/constraint tests; feasible/infeasible UI; reviewed assumptions and sensitivity. Demonstrate real EOQ/ROP/expiry evaluation using inventory feed or amend claims to tested scenarios. ≤5% remains a target until measured. |
| O5, p12: five modules with CSV validation, Signal-2 alerts and collaborative filtering | Usable authenticated screens, safe ingestion/retry/correction/history, mapped product-region evidence and official warning source or accurately labelled scenarios. FR1, FR3, FR9, FR10 and nonfunctional requirements. | Module shells exist, but upload returns HTTP 409. DR-only input has no stable line ID. No operational warning feed or accepted collaborative-filtering evidence established by audit. Screen presence does not close the workflow. | Frontend/backend engineer, operator and QA; CEO client-task acceptance. **AC-O5:** client upload→validated candidate→acceptance→publication survives retry/failure; complete-period replacement demonstrated; chart/export filters and keyboard/error states pass; real or explicitly scoped warning/recommendation behavior demonstrated and evaluated. |

## Functional delivery checklist

This checklist prevents a requirement inside an objective from disappearing during implementation. Status is based on E01–E10; “partial” is an open requirement, not approval.

| Requirement | Measurable evidence required | Current status / next action |
|---|---|---|
| FR1 upload/cleaning | Source hashes, primary dispositions/reasons, file lineage; authenticated new period, retry, correction and failure demonstration | Historical pipeline exists; client upload incomplete. Implement agreed DR-only replacement contract. |
| FR2 definitions | Each measure has field/formula, grain, unit, eligibility, coverage and UI/export label | Financial decisions recorded; finish explicit metric contract and resolve broad quantity/margin wording. |
| FR3 masters | Reviewed alias/pack evidence; geography/buyer/internal separation; unresolved queue and impact | Schema deployed, product masters empty, mapping review pending. |
| FR4 historical descriptive | Reconciled filtered metrics, actual ABC/Pareto, YoY, quantity evidence, STL, gaps and study scope | Technically validated candidate; coherent serving pin and business release outstanding. |
| FR5 sales-only prediction | Time-aware benchmark/challenger evaluation with target, metrics, errors by lead, supported window and release | Actual PHP experiment exists; no approved champion. Resolve medicine-demand target commitment. |
| FR6 weather | File validity, station/proxy provenance, geographic/time coverage and incremental-model comparison | Invalid/empty local files; candidate join readiness zero; proxy context available. |
| FR7 disease | Sheet/case definitions, onset/week and region/province mappings, lag/as-of date, documented DII, partial-period handling | Historical candidates available, forecasting joins ineligible. |
| FR8 priorities | Filters/cohorts/ranking denominator and tie rules tested; observed/estimated/returns separate; future ML target where used | Deterministic/source-label and commercial candidates available; catalog/ABC business scope pending. |
| FR9 scenarios | Inputs/units, objectives/weights, method, constraints, infeasibility, sensitivity, human review; matching and alert evidence where promised | Useful scenario logic, method inconsistency and operational data/outcomes remain. |
| FR10 publication | One complete manifest, API/chart/CSV identity, truthful status, unavailable states and release acceptance | Candidate validated; pin/acceptance/real UI release evidence open. |
| NFR traceability/reproducibility | Source→row→mapping→table→run→API→export→paper chain; exact code/file hashes and repeatable commands | Evidence exists; integrate full release receipt instead of HEAD-only identity. |
| NFR usability/explainability | CEO finds revenue, interprets margin/gaps, distinguishes adjusted data, reviews upload and exports scope; keyboard/zoom/contrast checks | Fixture checks passed; authenticated client task acceptance remains. |
| NFR security/operations | Server-side credentials, allowed/denied roles, private uploads, durable audit, recovery, rollback/support | Requires affected-boundary verification with upload/publication implementation; prior tests are not a full security audit. |

## Business decisions: preserve and request correctly

| Decision ID | Attribution and status | Execution consequence |
|---|---|---|
| D01 financial meanings | CEO directly confirmed, relayed by user in E10 | Use Net CP revenue, Total TP acquisition cost and supported transaction gross profit. Reapproval only if those meanings change. Dataset arithmetic and final release still need evidence. |
| D02 completeness assumption | CEO directly confirmed assumption of complete submitted sales | Preserve source gaps and disclose coverage. A linear calendar/sales assumption does not prove linear demand or zero missing sales. |
| D03 deterministic cleaning | CEO target is clean/standardized data; affected-scope exception handling is the documented technical proposal | Automatically fix safe formatting; isolate unresolved attributes/records and disclose effect. Whole-batch hold when trustworthy finance or boundaries cannot be established. |
| D04 adjusted allocations | CEO conditional acceptance when original annual sales totals reconcile | Preserve estimated provenance for 2020/2024/2025. Reconcile periods/parent-child detail too; equality does not approve actual product identity or quantity. |
| D05 product mapping approach | Technical choice delegated by CEO as recorded in E10 | Conservative verified identity, pack and unit rules may be prepared/implemented; specific unsupported product facts cannot be marked approved. |
| D06 positive-contribution ABC with returns separate | Selected by user for preparation; CEO policy approval not recorded | Prepare exact denominator/cohort examples and retain candidate status pending CEO decision. |
| D07 upload correction | Client has DR only; complete-period replacement is recommended, not accepted/deployed | Prepare sample complete-period/retry/correction demonstration for client confirmation. Do not invent stable business line IDs. |

Pending CEO review packet: exact descriptive dataset release and permitted source-label outputs, affected exclusions/coverage, proposed ABC policy, evidence-backed geographic/buyer mappings, upload replacement contract, and any new planning assumptions. Do not ask the CEO to sign technical model-training settings or to repeat D01/D04.

Pending academic choices: retain and implement the original territory/unit forecasts and daily/territory STL, or accept documented scope changes to the demonstrated granularity/target; define the role of XGBoost versus deterministic ABC; define the inventory evaluation/≤5% outcome evidence; align official alert/collaborative-filtering scope. The project team should present feasible choices and their evidence to the adviser, not silently rewrite the original objectives.

## Quantitative and methodological claim register

Every claim is tied to a reproducible input/result. “Not reproduced” does not allege fabrication; a different earlier dataset or scope may explain a discrepancy, but its evidence must be provided.

| Claim ID / paper location | Assessment | Required evidence or manuscript treatment | Owner |
|---|---|---|---|
| C01, p95 and p115: 3,631 SKUs; 449 vs 4,449 top tier | Confirmed internal count discrepancy; latest 2021–2025 normalized labels count 3,382 is not a verified SKU count | Recompute fixed-period catalog/cohort/returns counts; correct typo; use source-label terminology until verified SKU mapping. | Analyst/writer |
| C02, p93: Antizoal peaks Dec–Jan consistently in five years | Exact `ANTIZOAL 5MG/ML` label peaks July 2021; broad product alias claim not reproduced | Reviewed product/alias identity plus per-year monthly query and evidence; revise/remove “all five years” if unsupported; no seasonal disease causality claim from sales alone. | Analyst |
| C03, pp92–93: daily territorial STL and direct Prophet input | Actual published STL is monthly/company/2020–2025 | Publish required territory decomposition or accept explicit granularity change; define model input pipeline and fold-local transformations. | Analyst/adviser |
| C04, pp95–98: 2021–2024 training with full 2021–2025 DII mean | Design risks holdout leakage if followed literally | Training-only normalization/feature availability per fold; do not claim current sales-only experiment executed this risk. | Model developer |
| C05, pp98–99: RSI probability thresholds/demand uplifts | Probability and measured mm are different inputs; calibration evidence missing | Identify actual probability source or redesign feature; evaluate/calibrate rather than presenting multipliers as proven effects. | Analyst |
| C06, p103: MCDA-weighted territorial LP with `Max Z=x+y` | Equation lacks claimed weights/territory variables; live/offline algorithms differ | Agreed mathematical objective, inputs/units and optimality evidence; use accurate scenario/algorithm labels. | Operations analyst |
| C07, p105: safety-stock Z controls expiry ≤5% | Formula alone does not establish expiry outcome | Stock/lot/expiry and realized outcome protocol; retain as unverified target until measurement. | Operations analyst/CEO |
| C08, p107: provider measurements detect Signal 2 before declaration | Internal weather trigger cannot be attributed as an official warning | Cite official advisory feed separately; label internal scenario triggers and validate any multipliers. | Data engineer/writer |
| C09, p119: Supabase/PostgreSQL analytical persistence | Current runtime reads Databricks | Final architecture diagram/source boundaries match deployed code and release. | Architect/writer |
| C10, pp116–117: error targets | Targets are not achieved results; WAPE and MAPE differ | Defined metric and target-specific temporal evaluation; report actual result with limitations, not substituted metric success. | Analyst/adviser |

## Implementation handoff and step 1 acceptance

| Check | Result for this documentation task | Next owner |
|---|---|---|
| Five original objectives indexed with original pages | Prepared from original paper extraction and audit | Project lead/adviser verifies amendments only if proposed |
| Every FR1–FR10 and NFR family linked to observable tests | Prepared; execution remains open as shown | Owning engineer/QA |
| Existing decisions distinguished from pending decisions | Prepared against E10; no new approval inferred | Project lead prepares concrete CEO packet |
| Evidence date, identity and limitations disclosed | Prepared; no live rerun claimed on 3 October | Operator rechecks in step 2 |
| Claims tracked with required correction/evidence | Prepared, ten claim records | Analyst/writer/adviser |
| Coherent final scope accepted | **Pending**; registry preparation is not scope acceptance | CEO for business scope; adviser for academic changes |

Step 1's document deliverable is ready for implementation handoff. Its agreement criterion stays open until the applicable scope decisions are actually recorded. Step 2 may proceed with read-only candidate revalidation and technical preparation while those decisions are pending. Activation, objective removal and final approval labels depend on the real decision.

Next technical work: recheck fact/STL/output identity, resolve the configured 16 versus candidate 17 mismatch through a coherent candidate deployment, then finalize the metric dictionary and UI tests. Follow the [full workflow](../outputs/system_audit_20261001/WORKFLOW.md) for dependency order. Do not rerun all notebooks merely to change an application pin.
