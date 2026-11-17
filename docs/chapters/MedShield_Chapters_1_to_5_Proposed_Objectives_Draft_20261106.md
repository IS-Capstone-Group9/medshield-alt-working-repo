# MedShield DSS — Chapters 1–5 working draft under the proposed objectives

**Status: working manuscript draft, 6 November 2026 (Asia/Manila).** Written for the capstone adviser and panel. The five objectives below are **proposed, not adviser-approved**: the [amendment memo](../ADVISER_AMENDMENT_MEMO_20261030.md) records its decision as "not recorded". Original objectives ([CapstonePaper_1.pdf, viewer pp. 11–12](../../references/CapstonePaper_1.pdf#page=11)) and the 12.5/33 (37.9%) original-clause score are unchanged. Delete the status banners in each chapter only after an attributable decision is stored in `outputs/` and linked from the [objective register](../OBJECTIVE_EVIDENCE_REGISTER.md).

**How this draft was built.** Prose is assembled from the [2 Nov objective-change guide](MedShield_Objective_Change_Chapter_1_to_5_Guide_20261102.md), the [working Chapters 4–5](MedShield_Chapter_4_5_Revised_20261016.md) and [CURRENT_STATE](../CURRENT_STATE.md). No model, test or live query was run for this draft; every figure is inherited from the source it names. Items marked **[VERIFY]** need a check against the original manuscript or an external source before submission. No citation was invented.

**Not used.** The [Objective Amendment Proposal](../../outputs/thesis_storyline_and_system_audit_20261101/OBJECTIVE_AMENDMENT_PROPOSAL.md) and the [storyline PDF](../../outputs/objective_comparison_and_storyline_20261102/README.md) state "100% verified", "95%+ completion", "Next.js 14" and "simulated expiry below 3.2%". These conflict with the repository's evidence rules and current state (Next.js 16; adviser decision unrecorded; simulated expiry describes a scenario only). They were not carried into this draft.

---

# Chapter 1 — Introduction

> *Status: proposed objectives pending adviser decision.*

## 1.1 Company Background
Retain the verified company description from the original Chapter 1.1 (CapstonePaper_1.pdf pp. 8–9). Add no measured wastage, savings, stockout or clinical-outcome figure. Industry statistics keep their original attribution **[VERIFY]**.

## 1.2 Project Context
MedShield maintains historical sales records that can support review of financial performance, product contribution and recorded delivery-area activity. Their usefulness depends on coverage, financial eligibility, identity and level of detail. Missing months, mixed source labels and the absence of inventory records limit what can be inferred about comparable medicine demand and stock conditions. The study therefore develops and evaluates a decision-support dashboard that organizes supported recorded-sales findings, compares forecasting methods on documented historical series, and examines procurement planning scenarios under explicit assumptions. Outputs support commercial and planning review and keep the evidence and limits needed to interpret them.

## 1.3 Purpose and Objectives

### 1.3.1 General Objective
To develop and evaluate a decision-support dashboard for MedShield that integrates recorded-sales diagnostics, product and delivery-area prioritization, historical forecast-performance evaluation, and explicitly assumed procurement planning scenarios to support evidence-based sales and inventory-planning review.

### 1.3.2 Specific Objectives (proposed)
1. **SO1.** To analyze MedShield's recorded sales performance from 2017 to September 2026 using financial summaries, matched-period year-over-year comparisons, and STL decomposition where sufficient historical data are available, to identify sales trends, seasonal patterns, and differences across supported delivery areas through the Sales Diagnostic module.
2. **SO2.** To identify products and delivery areas that warrant commercial review using recorded sales, revenue contribution, matched-period growth, Pareto analysis, and descriptive ABC classification, supported by a comparative evaluation of baseline and XGBoost ABC classifiers through the Product and Area Prioritization modules.
3. **SO3.** To evaluate the forecasting performance of baseline and selected statistical and machine-learning models on supported sales series and a documented product-unit pilot using time-ordered historical evaluation, error metrics, and external variables where valid data are available, and to present the results and limitations through the Forecast Modeling module.
4. **SO4.** To develop and evaluate procurement planning scenarios using explicitly entered inventory, demand, cost, lead-time, and expiry assumptions through EOQ, ROP, weighted integer-pack allocation, and dated supply-feasibility checks, to compare budget use, demand coverage, and potential expiry exposure through the Prescriptive Planning module.
5. **SO5.** To integrate sales diagnostics, product prioritization, area prioritization, forecast evaluation, and prescriptive planning into a decision-support dashboard that provides filters, source provenance, data-availability notices, exportable results, and evidence-based review recommendations to support MedShield's sales and inventory planning.

**Table 1.1. Change from the original objectives.**

| | Original commitment | Proposed objective | Why it changed |
|---|---|---|---|
| SO1 | 2021–2025 regional baseline | 2017–Sept 2026 recorded sales, supported delivery areas | Longer history is available; area labels are what the source supports |
| SO2 | Territories/accounts, predictive XGBoost ABC | Products and areas for review; descriptive ABC plus baseline-vs-XGBoost evaluation | No stable account IDs; classifier is evaluated, not assumed superior |
| SO3 | Demand forecast from Dec 2026 with Prophet + DII/RSI | Time-ordered model evaluation with real external variables only when valid | Prospective accuracy cannot be measured before the period occurs |
| SO4 | Reduce expiry wastage ≤5% | Entered-assumption EOQ/ROP, integer-pack and dated-feasibility scenarios | No physical stock, batch or expiry records exist |
| SO5 | CSV workflow, Signal-2 alerts, collaborative filtering | Filters, provenance, availability notices, exports, review recommendations | Alerts and recommender are not implemented as verified outputs |

## 1.4 Scope and Limitations

### 1.4.1 Scope
The study uses MedShield recorded sales from January 2017 through September 2026. The current original-itemized candidate retains 40,171 records; 39,286 support eligible net sales totaling ₱638,015,351.53. These controls describe the assessed source population, not certified complete company revenue. The calendar holds 107 observed company months across 117 study-month slots; missing months stay unavailable and 2026 is a partial year. Gross margin is reported before operating expenses.

CALABARZON, MIMAROPA and Bicol remain the intended regional context. Delivery-area comparison uses the nine confirmed delivery labels (19,455 retained records; ₱115,614,895.77 eligible signed net). Government, Hospital and Admin remain separate nongeographic categories. Regional totals are an optional rollup of supported areas, not complete regional activity.

### 1.4.2 Limitations
- Sales files do not establish stock, batch/expiry balances, supplier lead times or ordering/holding costs. Planning outputs are therefore scenarios.
- Recorded quantity is not a universally comparable medicine unit; the BUPIRIGHT HOSPITAL ampoule pilot keeps its own unit boundary.
- No stable client-account identity exists. Customer-concentration claims are not made.
- 2026 is partial. 3,343 itemized records remain unreviewed at source and 77 physical lines are withheld pending review ([source triage](../../outputs/source_review_20261106/README.md)).
- Real DOH/PAGASA variables are used only where source, geography and timing support the specific comparison.
- Technical verification does not equal adviser, client or business acceptance.

## 1.5 Conceptual Framework
Controlled source assessment and provenance feed five analytical modules. Sales diagnostics and prioritization use eligible recorded financial data and supported mappings. Forecast Modeling uses saved, source-bound historical evaluations. Prescriptive Planning uses entered assumptions and disclosed constraints. All modules feed human review through charts, tables, availability notices and exports. A required source failure produces an explicit unavailable state, never a substitute dataset.

*Figure 1.1. Evidence flow for the MedShield DSS.* Redraw to show source/coverage gates and to mark outputs as observed, derived, forecast, assumed, simulated or unavailable. Remove the old disease/typhoon → demand multiplier → procurement arrows.

## 1.6 Timeline
Keep the dated Capstone 1 and Capstone 2 activities. Separate completed work from proposed closeout and remove any implied acceptance without a record.

---

# Chapter 2 — Review of Related Literature, Studies, Systems and Technologies

> *Status: retain original literature; change its role in the argument. Citations stay as in CapstonePaper_1.pdf pp. 24–68 [VERIFY before submission].*

## 2.1 Related literature and studies
Retain the pharmaceutical-industry, wastage and digital-transformation sections. Another organization's wastage or accuracy figure is context, not MedShield's baseline.

## 2.2 Models and technologies
| Topic | Treatment under the proposed objectives |
|---|---|
| Fact-constellation modelling (2.2.1) | Retain; map to the Databricks Bronze/Silver/Gold design |
| Pareto, ABC, rule-based encoding (2.2.5–2.2.7) | Retain. Separate a descriptive class (assigned from current-period contribution) from predicting a later class |
| ARIMA/SARIMA/SARIMAX, Holt-Winters, Prophet, comparative review (2.2.8) | Retain as competing candidates. Rewrite the claim that Prophet is the only acceptable model |
| XGBoost (2.2.9) | Retain as a candidate classifier/regressor evaluated against baselines |
| DII/RSI and disease/weather integration (2.2.4) | Retain as a conditional extension; add availability, revision and join-validity issues |
| EOQ, ROP, safety stock, allocation (2.2.10–2.2.12) | Retain the theory. Distinguish formula review, integer-pack allocation and dated feasibility from measured savings |
| Collaborative filtering and official alerts (2.2.13–2.2.14) | Shorten and move to future work; no longer mandatory delivered mechanisms |
| Evaluation metrics (2.2.15) | Add class-sensitive metrics, calendar lead, common-cohort comparison, bias and zero-denominator policy |
| CRISP-DM/SEMMA, DSS (2.3–2.4) | Retain as the organizing process; describe steps actually applied |

## 2.5 Synthesis and research gap
The reviewed studies motivate analytical methods that may support pharmaceutical distribution decisions, but performance depends on target, source quality, temporal design and operating context. For MedShield, the central need is to connect recorded-sales evidence, comparative model results and planning assumptions in one traceable decision-support workflow. Historical financial observations, verified physical units and operational inventory facts are different evidence and need different interpretation.

The study therefore uses transparent descriptive methods and baselines, evaluates selected statistical and machine-learning candidates on supported time-ordered series, and compares entered planning scenarios under disclosed constraints. Disease/weather literature informs a conditional extension where geography and issue-time data are valid. Literature on alerts and recommenders stays relevant to future development but does not show they are implemented or effective here. The contribution is the evaluated integration, reproducible local findings and explicit availability boundaries, not a presumption that a particular model beats its baseline.

---

# Chapter 3 — Methodology

> *Status: replaces the execution claims of CapstonePaper_1.pdf pp. 69–121 under the proposed objectives.*

## 3.1 Research design
Applied, retrospective evaluation research building a decision-support system, organized by CRISP-DM. Five objectives map to the four analytics layers: descriptive and diagnostic (SO1–SO2), predictive (SO2–SO3), prescriptive (SO4), integrated delivery (SO5).

## 3.2 Data sources and preparation
The analysis uses a version-bound original-itemized sales candidate. Source identity, row dispositions, financial eligibility and coverage carry through the pipeline. Months without supported observations are not imputed as zero. Area comparisons keep their observed month sets and mapping coverage. Contract summaries are a separate financial scope and supply no product or unit detail. External DOH, PAGASA and NASA POWER data are separate Databricks candidates; NASA POWER is a provider-derived proxy, not official PAGASA data.

## 3.3 Architecture
Next.js frontend → Express/TypeScript gateway → Databricks Gold (analytical system of record). Supabase provides authentication, roles and audit only. Python jobs run offline; dashboard requests never train models or start Python services. A Databricks or Gold failure returns an explicit error and an unavailable state.

## 3.4 Methods by objective

**SO1 — Sales diagnostics.** Eligible financial summaries; matched-period year-over-year; signed contribution bridge; gross-margin percentages computed only on matching numerator/denominator eligibility. STL is a retrospective diagnostic on a sufficiently long contiguous observed segment: period 12, seasonal window 13, robust fitting, no imputation, 36-month minimum. Component reconstruction, fitted window and trend/seasonal strength are reported.

**SO2 — Prioritization.** Pareto and descriptive ABC from cumulative positive contribution: below 80% is A, below 95% is B, otherwise C; the crossing label stays in its starting class; nonpositive contributions stay unclassified. The predictive ABC experiment compares majority and prior-year ABC baselines with frozen XGBoost recipes using prior-year features, training-only preprocessing and an exact-label-disjoint split. A separately declared fixed-recipe retrospective comparison on 2025 and partial-2026 labels involves no tuning or reselection.

**SO3 — Forecast evaluation.** For each case define target unit, source population, training cutoff, origin, target month and actual calendar lead. Compare transparent baselines and selected statistical/ML recipes on identical targets. Report MAE, RMSE, WAPE, signed bias and origin-local MASE where valid, with denominator rules, sample counts and failed-fit reasons. A descriptive on-target rate (share within ±15% of actual) is a reporting band, not a client tolerance. Repeatedly inspected windows are labelled retrospective. PHP and ampoule-count results are never pooled. Real external variables enter only after a source/geography/as-of validity check.

**SO4 — Planning scenarios.** Entered inventory, demand, cost, lead-time and expiry assumptions. Classical EOQ/ROP; shared-budget weighted integer-pack allocation under exact whole-pack and cent constraints; dated FEFO feasibility with a one-slot-per-product, 0–20-pack domain. Optimality is claimed only within the declared domain and completed proof. Baseline and candidate share assumptions and are compared on budget use, demand coverage, unmet quantity and modeled expiry exposure.

**SO5 — Integration.** Checks of source/API/chart/table/export consistency, filters, partial-period behavior, provenance and availability notices, error and stale states, access, and responsive/keyboard behavior.

## 3.5 Evaluation matrix (replaces Table 3.5)
| Output | Evaluation | Qualification |
|---|---|---|
| Financial/YoY | Exact eligible totals, comparable periods, signed conservation | Scope, units, eligibility, partial year visible |
| STL | Eligibility, reconstruction, fit interval, strength | Retrospective; unavailable if history is short |
| Pareto/descriptive ABC | Full-population cumulative totals, thresholds, ties | Source-label identity retained |
| ABC classifiers | Confusion, support, macro-F1, per-class recall, A recall | Same target and cohort; actual partition |
| Forecast candidates | MAE/RMSE/WAPE/bias/MASE by lead on identical targets | Origin-safe preprocessing; failed models disclosed |
| External features | Valid cohort, then common-cohort ablation | Blocked cohort reported as blocked |
| EOQ/ROP, allocation | Units, exact feasible packs/spend, no-purchase baseline, proof or bound | Entered-input scenario; no savings claim |
| Dated feasibility | Stock-flow conservation, event order, unmet demand, expiry exposure | Assumed supply and demand; horizon and censoring disclosed |
| Dashboard | Source/API/chart/table/export agreement; error states | Technical checks separate from client acceptance |

Remove MAPE <15%, urgency MAPE <20%, 100% real mapping and wastage ≤5% as completion claims. If a threshold is kept, label its origin and whether it was met, and do not change a protocol after seeing results.

## 3.6 Ethics, security and governance
Databricks and Supabase server credentials stay in the gateway. Evidence gates apply: a passing check or `PASS_CANDIDATE` is not business approval, and candidate results never authorize procurement.

---

# Chapter 4 — Results and Discussion

> *Status: inherited results; figures are historical-window specific. Preserve all negative findings.*

## 4.1 Data identity, coverage and eligibility
107 observed company months of 117; 39,286 net-eligible records, ₱638,015,351.53. Ten absent months all precede the 2020 training start. Nine confirmed delivery labels cover 19,455 records and ₱115,614,895.77. The itemized series behind forecasts and ABC holds 83.4/99.6/99.7/83.1/48.5/47.7/98.5% of stated sales for 2020–2026; the remainder is mostly contract rows and withheld rows, so the "2024 dip" and much of the "2026 jump" are recording effects ([improvement plan](../../outputs/analytical_improvement_plan_20261106/README.md)).

## 4.2 SO1 — Sales diagnostics
Area-first comparisons use common periods and January–September 2025/2026 matched months. Quezon and Batangas are the geographic labels in the displayed CALABARZON total. Unavailable area-months are not zero. Retained STL: CALABARZON January 2020–September 2026, seasonal strength about 0.0834; area/province fits give 0.0000 (Quezon), 0.0737 (Batangas) and 0.2985 (historical Cavite province). MIMAROPA and Bicol do not meet the contiguous-history rule. **Discussion:** the fits do not establish strong recurring seasonality; the finding is retained as weak. Sources: [area acceptance](../../outputs/all_area_acceptance_20261102/README.md), [delivery area](../../outputs/delivery_area_20261102/README.md).

## 4.3 SO2 — Product and area review
Original validation (83 labels): prior-year ABC macro-F1 ≈0.5367, A recall 54.55%; the two XGBoost recipes ≈0.4321/0.4347 and 36.36%. Neither meets the frozen guard.

| Method | 2025 macro-F1 | 2025 A recall | Partial-2026 macro-F1 | Partial-2026 A recall |
|---|---:|---:|---:|---:|
| Majority | 0.2481 | 0.00% | 0.2667 | 0.00% |
| Prior-year ABC | 0.4379 | 42.11% | 0.3664 | 16.00% |
| XGBoost depth 2 | 0.4496 | 31.58% | 0.3664 | 16.00% |
| XGBoost depth 3 | 0.4348 | 31.58% | 0.3664 | 16.00% |

**Discussion:** the 2025 depth-2 macro-F1 gain comes with lower A recall; both 2026 challengers reproduce persistence. The original selection remains prior-year ABC. This is an inspected retrospective comparison, not a blind test or evidence of XGBoost superiority. Pooled ABC accuracy across recipes is 61.9–64.7% ([accuracy table](../../outputs/model_accuracy_table_20261106/README.md)); 35–61% of actual A labels had no prior-year sales under the same text.

## 4.4 SO3 — Forecast evaluation
The company-PHP tournament has 1,980 attempted predictions, 1,170 supported. Mean6 one-month WAPE: ≈71.66% (development), 58.23% (audit), 56.53% (extension). In the 6 Nov per-model table, lowest pooled WAPE is 61.1% (company PHP) and 24.9% (CALABARZON); on-target rates are 6.7–15.6% and 28.9–46.7%. The 10–15% error target is unmet. BUPIRIGHT HOSPITAL pilot (18 months, ampoules): seasonal-naive WAPE 31.6%/30.0% at leads 1/3 versus mean6 37.33%/32.05%; no method selected. An all-recorded sensitivity moves 2026 bias from −27.7% to −0.5% but raises WAPE from 49.7% to 53.3%; 231 documents ≥₱500,000 (2.6%) carry 44.6% of net. Registered improvement attempts PD2 (negative) and PD3 (interval coverage 75.7%, but pre-2026 sensitivity failed) activated no model. **Discussion:** document size and target inconsistency, not model choice, explain much of the error. Prophet, external-signal, MIMAROPA/Bicol and territory-unit models have no current score.

## 4.5 SO4 — Planning scenarios
EOQ/ROP, weighted integer-pack allocation and dated feasibility are implemented and compared with a no-purchase baseline under entered assumptions ([planning](../../outputs/system_first_20261102/planning/README.md)). Allocation results distinguish a feasible bounded answer from a proved optimum. Simulated zero expiry under long assumed shelf lives does not show avoided loss, and terminal expiry censoring is part of the reading. No actual stock, supplier or cost record supports an operational claim.

## 4.6 SO5 — Dashboard implementation and verification
Nine pages with filters, provenance and availability notices. Local technical verification on 6 Nov: 67 frontend fixture cases, 100 backend and 35 offline Python cases pass; five authenticated Forecast loads took 9.020–15.513 seconds ([Phase 5](../../outputs/improvement_phase5_20261106/README.md)). The 2 Nov [SO5 acceptance packet](../../outputs/so5_acceptance_20261102/README.md) records 18 browser cases and 97 gateway checks. These are local engineering evidence, not production capacity or client acceptance.

## 4.7 Integrated discussion
Descriptive findings are well supported but depend on source completeness. Predictive error is large and baselines stay competitive. Scenarios are conditional on assumptions. Delivery is local and technical.

**Proposed-objective delivery checklist (not an official grade):** 24/25 on 2 Nov, later recorded as 25/25 technical delivery credit ([scorecard](../../outputs/proposed_objective_progress_20261102/README.md)). Report beside the original 12.5/33 (37.9%), never in place of it. It does not measure accuracy, operational benefit or approval.

---

# Chapter 5 — Conclusions and Recommendations

> *Status: conclusions are bounded by the proposed objectives and retrospective evidence.*

## 5.1 Summary of findings
- **SO1.** Supported financial patterns, comparable-period changes and conditional seasonality were analyzed. Seasonality is weak where fitted; delivery-area results do not cover complete geography.
- **SO2.** Descriptive contribution, Pareto/ABC and growth identify source labels and areas for commercial review. Prior-year ABC remained ahead of the tested XGBoost recipes under the validation rule.
- **SO3.** A reproducible comparative evaluation was delivered, including substantial errors, unavailable recipes and temporal limits. It supports research review, not operational model approval.
- **SO4.** Entered-input scenarios make budget, coverage and expiry assumptions explicit. Measured expiry reduction and turnover improvement were not established.
- **SO5.** Integration improves traceability of the review workflow. That is an engineering contribution, distinct from demonstrated benefit or human acceptance.

## 5.2 Conclusions
The study delivers an evidence-bounded decision-support dashboard and shows what MedShield's recorded sales can and cannot support. Its main findings are honest negatives: weak seasonality, baselines that remain competitive, forecast error concentrated in a few large documents, and scenarios that cannot be tied to physical inventory. The general objective is met as a bounded analytical and evaluation purpose, not as improved demand visibility or reduced wastage.

## 5.3 Limitations
Source completeness; unreviewed and withheld records; no inventory data; no stable account identity; partial 2026; retrospective evaluation on repeatedly inspected windows; local-only deployment; adviser decision unrecorded.

## 5.4 Recommendations
| Audience | Recommendation |
|---|---|
| Commercial reviewer | Review high-contribution and changing labels with transaction evidence and known coverage; investigate causes |
| Source/data owner | Resolve the 3,343 unreviewed and 77 withheld records, five net-measure exclusions first; keep stable SKU/pack/unit and delivery evidence; retain missing months as missing |
| Analyst/model owner | Keep baselines and lead-specific error reports; register any new recipe before fitting; settle the error-target wording (D1) and reporting target series (D2) |
| Operations | Supply verified stock batches, suppliers, costs, lead times and expiry before any replenishment conclusion |
| Engineering/QA | Keep period, provenance, units and exports aligned; verify changes on a named revision |
| Researcher/adviser | Record the objective decision, reassemble the manuscript, audit references, obtain formal review |

## 5.5 Future work
Prospective forecast capture; official-bulletin connector for alerts; collaborative-filtering evaluation; physical inventory integration; hosted deployment and client usability study.

---

## Open items before submission
1. Adviser decision on the five objectives, recorded in `outputs/` and linked from the objective register.
2. **[VERIFY]** Every Chapter 2 citation and the Chapter 1.1 industry figures against CapstonePaper_1.pdf.
3. Rebuild Figure 1.1 and architecture/schema figures; refresh screenshots from a verified current UI.
4. Update abstract, lists of figures/tables, cross-references and bibliography.
5. Render to the institutional Word/PDF template; this Markdown has not been formatted or reviewed.
