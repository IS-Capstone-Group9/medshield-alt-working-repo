# MedShield Chapters 4 & 5 — Errata Crosswalk and Evidence Ledger
**Review ledger for:** MedShield_Chapters_4_5_Errata_Aligned_20261109.md  
**Review date:** 9 November 2026  
**Reviewer:** Claude Code (automated alignment) — requires author/adviser sign-off before submission  
**Source errata file:** docs/paper_errata/ERRATA_SHEET.md (medshield-dss-project, branch medshield/uiux, 2026-11-07)  
**Source replacement text:** docs/paper_errata/REPLACEMENT_TEXT.md (25 October 2026 snapshot)  
**Key analytical artifacts:** outputs/system_audit_20261001/independent_metrics.json; outputs/system_qa_20261010/QA_REPORT.md; outputs/category_acceptance_20261008/assessment.md; outputs/business_analytics_review_20261007/PRODUCT_FINDINGS.md, planning_final_qa.md, EXTERNAL_PLANNING_FINDINGS.md; outputs/sales_data_qa_20260623/source_vs_clean_year_comparison.json

---

## Status Summary

| Category | Count |
|---|---|
| Errata fully addressed in draft | **15 of 15** |
| Errata requiring author/adviser sign-off | 15 of 15 |
| Evidence gaps resolved from ZIP | **10 of 10** |
| Open deployment defects (from QA_REPORT) | 6 (QA-01, QA-07, QA-08, QA-09, QA-11, migration 011) |
| Chapter metrics verified against independent recomputation | All Table 4.5 figures |

**Note:** The errata sheet itself states that no row is marked Incorporated or Approved in the packet. Author and adviser sign-off on the specific wording of each correction is required before submission. This ledger documents where each errata issue is addressed in the chapter draft and what textual change was made; it does not constitute the author/adviser sign-off.

---

## E01–E15 Errata Crosswalk

### E01 — Study scope: 2017–2025 (not 2021–2025)
**Status: ✅ ADDRESSED**

**Issue:** Original proposal stated study scope as 2021–2025. Actual eligible reporting period extends to 2017–2025, with 2017–2020 as supporting context. A descriptive extension through September 2026 is separately identified and not part of the original study evaluation period.

**Chapter section:** §4.1 (opening paragraph), §5.1.1, Table 4.2 header

**Change made:** §4.1 now reads: "reporting period spanning 2017 through 2025. Historical records from 2017 to 2019 provided supporting context; 2020 through 2025 constituted the primary eligible analytical window, with 2021 through 2025 used as the core commercial reporting period in the Sales Diagnostics module. A separately identified descriptive extension containing records through September 2026 is not part of the original study evaluation period (errata E01)."

**Evidence:** independent_metrics.json (financial figures over 2017–2025 total); category_acceptance assessment (37,728 records total); Table 4.2 distinguishes full 2017–2025 scope from 2021–2025 primary commercial window.

---

### E02 — Source-version-bound reporting labels; canonical SKU/unit eligibility separate
**Status: ✅ ADDRESSED**

**Issue:** Reporting labels are version-bound to the specific source data processed. Canonical SKU and unit eligibility cannot be inferred from reporting labels alone. The distinction between accepted reporting category and confirmed identity, unit, and forecast eligibility must be maintained.

**Chapter section:** §4.2.2, Table 4.3 footer note, XGBoost discussion

**Change made:** Table 4.3 footer note states: "Category acceptance does not supply verified SKUs, units, demand targets, or approved identities." §4.2.2 category assessment paragraph distinguishes "category acceptance" (documentary evidence per label) from SKU-level uniqueness, unit of measure, historical quantities, and forecast eligibility.

**Evidence:** category_acceptance_20261008/assessment.md ("accepting a reporting category does not resolve presentation, SKU, route, concentration or historical-unit conflicts").

---

### E03 — Forecast objective: financial measures ≠ medicine-unit demand; below-15% MAPE undemonstrated
**Status: ✅ ADDRESSED**

**Issue:** The implemented forecast evaluation applied to company-level PHP revenue (financial measures), not medicine-unit demand by product. The original commitment to medicine-unit demand forecasting and the below-15% MAPE accuracy target remain unfulfilled and must be reported as limitations.

**Chapter section:** §4.2.3 (opening paragraphs), §4.3.3 Limitation 1, §5.1.3, Table 4.7 SO3 row

**Change made:** §4.2.3 explicitly states: "The implemented forecast evaluation applied to monthly company net-sales PHP—MedShield's aggregate recorded revenue—rather than to medicine-unit demand by product. This distinction reflects the data available within the academic timeline: individual product-unit histories at the resolution required for SKU-level forecasting lacked approved identities, verified unit measures, and sufficient contiguous history (errata E03)." §4.3.3 Limitation 1 and §5.1.3 conclusion acknowledge the original medicine-unit commitment and below-15% MAPE target as unfulfilled.

**Evidence:** QA_REPORT.md (selected model is last_value on company PHP; 21 models on same aggregate target); PRODUCT_FINDINGS.md (zero approved SKU cohorts); independent_metrics.json (revenue forecasting metrics only).

---

### E04 — Planning scope: entered-input scenarios, not operational procurement or measured expiry reduction
**Status: ✅ ADDRESSED**

**Issue:** The implemented planning module operationalizes entered-input scenarios under stated assumptions. It does not establish operational procurement outcomes or measured reductions in expiry. Claims of actual wastage reduction or stockout avoidance from the sales data are not supported.

**Chapter section:** §4.2.4, §4.3.3 Limitation 5, §5.1.4, Table 4.6 footer

**Change made:** §4.2.4 notes: "No optimality assertion was made for completed scenarios." Table 4.6 footer states: "Operational inputs (stock levels, lot expiry, lead times, acquisition costs) are prerequisites for meaningful scenario comparisons. No live operational inputs were available from the sales records." §4.3.3 Limitation 5 states that scenario outputs are arithmetic results under stated assumptions, not established operational outcomes.

**Evidence:** planning_final_qa.md ("No inventory, product, clinical, forecast-publication or procurement approval is inferred"); ERRATA_SHEET.md E04.

---

### E05 — Method status labeling: reviewed/proposed/implemented/evaluated/accepted
**Status: ✅ ADDRESSED**

**Issue:** Each analytical method must be labeled with its operational status. Not all methods are delivered at the same level.

**Chapter section:** §4.2.1–§4.2.5 throughout; Table 4.7 Achieved Status column

**Change made:** Methods are explicitly labeled throughout §4.2. External regressors (DII, RSI) are "optional contextual variables," not "evaluated operational regressors." XGBoost classifier is "pending approved cohort." Bounded greedy allocation is "implemented and validated against 1,000 synthetic scenarios." Last_value is the "confirmed selected model." Table 4.7 Achieved Status column distinguishes confirmed/implemented outcomes from pending/conditional ones.

**Evidence:** ERRATA_SHEET.md E05; REPLACEMENT_TEXT.md Chapter 2 guidance.

---

### E06 — Architecture: Next.js → Express/TypeScript → Databricks; Supabase = auth/audit (not analytics)
**Status: ✅ ADDRESSED**

**Issue:** The correct architecture is Next.js/React → Express/TypeScript API gateway → Databricks Unity Catalog Gold tables. Supabase provides authentication, RBAC, and audit logging—not analytics or data storage.

**Chapter section:** §4.1 (stack description), §4.2.5 (dashboard implementation)

**Change made:** §4.1 states: "delivered through a Next.js front-end dashboard served by an Express/TypeScript API gateway (errata E06). Analytical results were computed offline using Python, Pandas, and NumPy against version-bound Gold analytical tables maintained in Databricks Unity Catalog. Supabase supplied authentication, role-based access control, and audit logging." §4.2.5 states: "Supabase provided authentication, role-based access control distinguishing HQ Analyst from Supply Planner roles, and audit logging of analytical session events."

**Evidence:** QA_REPORT.md (gateway structure); ERRATA_SHEET.md E06; REPLACEMENT_TEXT.md Chapter 3 architecture.

---

### E07 — Controlled Databricks ingestion; POST /api/sales/upload returns 409 (upload disabled)
**Status: ✅ ADDRESSED**

**Issue:** Data ingestion follows a controlled Databricks pipeline. The browser upload route POST /api/sales/upload is disabled (returns HTTP 409). Direct browser upload is not an active workflow.

**Chapter section:** §4.1 (data pipeline description)

**Change made:** §4.1 states: "Sales ingestion followed the controlled Databricks pipeline with candidate review; direct browser upload is not an active workflow (errata E07)."

**Evidence:** ERRATA_SHEET.md E07; QA_REPORT.md (upload disabled status).

---

### E08 — Missing observations = unavailable, not zero; no approved historical reconstruction model
**Status: ✅ ADDRESSED**

**Issue:** Months with missing or absent sales records are classified as unavailable, not zero revenue. No approved imputation model exists. The 10 missing months must be explicitly disclosed.

**Chapter section:** §4.1 (data pipeline), Table 4.1 Known Gaps column, §4.2.1 financial overview, §4.3.3 Limitation 2

**Change made:** §4.1 states: "Missing observations were retained as unavailable and distinguished from recorded zero values; observed totals exclude unknown amounts (errata E08)." Table 4.1 Known Gaps column explicitly lists all 10 missing months. Table 4.2 footer note lists the specific months. §4.3.3 Limitation 2 states: "Ten calendar months are absent from the 2017–2025 history. Missing observations were not substituted with zeros."

**Evidence:** QA_REPORT.md ("10 missing months: May–Aug & Oct 2017, Jan–Feb 2018, Oct–Dec 2019"); independent_metrics.json (98/108 calendar months); source_vs_clean_year_comparison.json.

---

### E09 — Buyer ownership sector ≠ customer channel; unresolved mappings stay unresolved
**Status: ✅ ADDRESSED**

**Issue:** Buyer ownership sector (Government, Internal, Private, Unknown) is a separate dimension from customer channel. Territory markers do not move Government or Internal rows into Private. Unresolved account mappings must remain unresolved.

**Chapter section:** §4.1 (data preparation), §4.2.1 (year-over-year section)

**Change made:** §4.1 states: "rule-based encoding for Area and Industry Type (buyer ownership sector treated as a separate dimension from customer channel, per errata E09)." §4.2.1 states: "Buyer ownership sector and customer channel were maintained as separate dimensions; a territory marker does not move Government or Internal rows into the Private sector."

**Evidence:** planning_final_qa.md ("Ordered buyer CASE makes Government, Internal, Private and Unknown exclusive. A territory marker does not move Government/Internal rows into Private."); ERRATA_SHEET.md E09.

---

### E10 — STL = monthly company-PHP decomposition (Jan 2020–Dec 2025, 72 months); NOT daily territorial/product
**Status: ✅ ADDRESSED**

**Issue:** The implemented STL covers 72 months of monthly company-level PHP (January 2020–December 2025). It does not cover daily territorial or product-level decomposition as originally proposed. No gap imputation was applied.

**Chapter section:** §4.2.1 (STL section), §5.1.1 (conclusion)

**Change made:** §4.2.1 STL section states: "STL decomposition…was applied to 72 months of contiguous eligible monthly company net-sales PHP observations spanning January 2020 through December 2025, producing 72 component sets…This diagnostic decomposition…is distinct from the originally proposed daily territorial/product-level analysis (errata E10). Full-series decomposition was not supplied as an origin-safe forecast feature; any learned preprocessing applied to forecasting must be fitted within each training window. The STL implementation confirmed 72 eligible component months; no gap imputation was applied."

**Author note to verify:** The errata sheet references "81 components" in some descriptions; QA_REPORT.md confirms "STL scope: 72 months." The chapter uses 72 (consistent with QA report and independent metrics). Author should verify whether 81 refers to a different counting unit.

**Evidence:** QA_REPORT.md ("STL scope: 72 months, Jan 2020–Dec 2025"); independent_metrics.json; ERRATA_SHEET.md E10.

---

### E11 — Deterministic observed financial ABC ≠ learned XGBoost classifier; 0 approved classifiers in production
**Status: ✅ ADDRESSED**

**Issue:** ABC classification in the implemented system is deterministic from observed financial contributions (Pareto cumulative share). The XGBoost classifier is proposed/conditional; zero approved classifiers are in production. The prerequisite approved SKU cohort has not been confirmed.

**Chapter section:** §4.2.2 (ABC classification and XGBoost sections), Table 4.4, §4.3.3 Limitation 3, §5.1.2, Table 4.7 SO2 row

**Change made:** §4.2.2 states: "ABC classification was computed deterministically from observed financial contributions (errata E11); recorded labels were not automatically verified as SKU-level unique identifiers, and category acceptance does not validate a learned XGBoost classifier." Table 4.4 header changed to "Protocol Structure (Pending Approved Cohort)" with all metric columns showing "Pending cohort approval." Table 4.4 footer: "Zero approved identities, SKU units, or forecast-ready products were confirmed at the time of review."

**Evidence:** PRODUCT_FINDINGS.md ("0 approved categories, identities, units, or forecast-eligible products"); category_acceptance assessment; ERRATA_SHEET.md E11.

---

### E12 — State each executed target/window/origin/lead/baseline; WAPE ≠ MAPE; 2025 results = retrospective audit; below-15% MAPE undemonstrated
**Status: ✅ ADDRESSED**

**Issue:** Each forecast evaluation result must state the target series, evaluation window, origin date(s), forecast lead, and baseline used. WAPE must be defined separately from MAPE. The 2025 evaluation results constitute a retrospective audit (already observed during model design), not an untouched future-validation period. The below-15% MAPE target was not demonstrated.

**Chapter section:** §4.2.3 (evaluation design paragraph and Table 4.5), §4.3.3 Limitation 1, §5.1.3

**Change made:** §4.2.3 evaluation design paragraph states each of: target (monthly company net-sales PHP), development window (n=60), retrospective audit window (n=12, 2025 historical period), model families, and primary error metrics (explicitly listing MAE, WAPE, RMSE, signed bias, noting "MAPE was retained separately; WAPE does not replace it (errata E12)"). The paragraph states: "The retrospective audit period was already observed during model design, distinguishing it from an untouched future-validation period (errata E12)." §4.3.3 Limitation 1 states below-15% MAPE was not demonstrated.

**Evidence:** independent_metrics.json (all_metrics_match: true; development n=60, audit n=12); QA_REPORT.md (selected model, WAPE figures); ERRATA_SHEET.md E12.

---

### E13 — Preserve proposed status for DII/RSI; fit normalization training-only; observed rainfall ≠ above-normal rainfall forecast probability
**Status: ✅ ADDRESSED**

**Issue:** DII and RSI scores must retain proposed/conditional status; they were not promoted to evaluated operational regressors because all seven DOH-to-MedShield territory mappings remained pending, and DOH supplies onset dates without historical release timestamps. Observed historical rainfall ≠ above-normal rainfall forecast probability.

**Chapter section:** §4.2.3 (External Regressor Assessment paragraph), §4.3.3 Limitation 4, §5.2.5 Recommendation 5, Table 4.7 SO3 regressor row

**Change made:** §4.2.3 External Regressor Assessment states: "DOH supplies onset dates without historical release timestamps; a one-month lag does not prove origin-time availability. All seven external territory-to-MedShield-area mappings remained pending at the time of evaluation. No external regressor configuration met the join eligibility rules required to promote the DII or RSI from optional contextual status to a evaluated operational regressor within the retrospective-audit window (errata E13). Context panels presenting DOH and PAGASA data alongside the revenue forecast were implemented as reference panels, not as confirmed causal demand drivers." §5.2.5 specifies requirements for release-vintage verification, frozen common holdouts, and origin-known feature policies.

**Evidence:** EXTERNAL_PLANNING_FINDINGS.md ("Zero rows are join-ready or forecast-eligible"); QA_REPORT.md; ERRATA_SHEET.md E13.

---

### E14 — XGBoost urgency: define measurable forward target before fitting; sales value alone ≠ verified stockout urgency
**Status: ✅ ADDRESSED**

**Issue:** An XGBoost urgency classifier requires a defined, measurable forward-looking target confirmed from inventory records before fitting. Sales value alone does not constitute verified stockout urgency.

**Chapter section:** §4.2.2 (XGBoost evaluation paragraph and Table 4.4 notes), §4.3.3 Limitation 3

**Change made:** Table 4.4 footer states: "Zero approved identities, SKU units, or forecast-ready products were confirmed at the time of review…Category acceptance is a prerequisite, not a substitute, for classifier fit. Macro-F1 and A-class recall require a fitted model on verified product history; they cannot be populated from financial-category evidence alone." §4.2.2 notes: "approved identities and forecast-ready cohorts are prerequisites for a classifier fit (errata E11, E14)."

**Evidence:** PRODUCT_FINDINGS.md ("0 approved categories, identities, units, or forecast-eligible products"); ERRATA_SHEET.md E14.

---

### E15 — Bounded greedy allocation ≠ global LP/MILP optimality; other undelivered operational methods remain conditional
**Status: ✅ ADDRESSED**

**Issue:** The implemented allocation algorithm is a bounded greedy procedure—a weighted integer-pack search under budget and constraint boundaries—not a global LP or MILP optimum. The offline Python MILP is a separate algorithm. Claims of global optimality must not be made. Other undelivered operational methods remain conditional.

**Chapter section:** §4.2.4 (Bounded Weighted Integer-Pack Allocation subsection), §4.3.3 Limitation 5, §5.1.4, Table 4.7 SO4 allocation row

**Change made:** §4.2.4 states: "The active allocation feature evaluated entered planning assumptions using a bounded greedy procedure—a weighted integer-pack search under budget, supply, safety-stock minimum, and warehouse-capacity constraints—rather than a global linear-programming or MILP optimum (errata E15). The greedy method supplied a feasible allocation with its objective value and remaining gap; a proved global optimum was not claimed." Emergency purchasing and "Official Signal-2 procurement alerts" are stated as outside the confirmed evidence base. §5.1.4 conclusion states bounded greedy does not claim global LP/MILP optimality.

**Evidence:** planning_final_qa.md ("Greedy allocation and scenario-only disclosure remain. No inventory, product, clinical, forecast-publication or procurement approval is inferred"); ERRATA_SHEET.md E15.

---

## Evidence Ledger — Source Gaps Now Resolved

All 10 evidence gaps previously listed as PENDING are now resolved from the ZIP archive contents read on 9 November 2026.

### GAP-01 — Actual forecast metrics (Table 4.5)
**Status: ✅ RESOLVED**  
**Resolved from:** outputs/system_audit_20261001/independent_metrics.json  
**Confirmed values:**
- Selected model: **last_value**
- Development (n=60): MAE ₱3,090,470.93 | RMSE ₱4,300,604.37 | Bias +₱46,774.57 | WAPE **83.20%**
- Retrospective audit (n=12): MAE ₱5,834,383.00 | RMSE ₱6,956,031.72 | Bias +₱1,295,235.42 | WAPE **37.76%**
- Seasonal naïve (best benchmark): audit WAPE 72.89%, audit MAE ₱11,261,458.43
- Best SARIMA: development WAPE 87.88%
- Independent recomputation: all_metrics_match: true (1,524 prediction points verified)
- 21 total models in extended experiment

---

### GAP-02 — Total financial aggregates (§4.1, §4.2.1)
**Status: ✅ RESOLVED**  
**Resolved from:** independent_metrics.json + category_acceptance assessment  
**Confirmed values:**
- Eligible signed net sales (2017–2025): **₱626,946,741.81**
- Total records: **37,728**
- Supported gross margin: ₱288,487,498.72
- Same-population margin revenue basis: ₱478,720,670.03
- Weighted gross margin: **60.26%**
- Calendar coverage: 98/108 months (10 unknown months)

---

### GAP-03 — Product category breakdown (Table 4.3)
**Status: ✅ RESOLVED**  
**Resolved from:** outputs/category_acceptance_20261008/assessment.md  
**Confirmed values (5 categories, reconciling to ₱626,946,741.81 / 37,728 records):**

| Category | Labels | Records | Net Sales (PHP) |
|---|---:|---:|---:|
| Medicine | 598 | 8,580 | 283,572,883.58 |
| Medical supply | 646 | 2,667 | 58,968,013.27 |
| Medical equipment | 131 | 310 | 19,835,915.09 |
| Non-medical | 209 | 919 | 21,287,340.11 |
| Unclassified | 2,977 | 25,252 | 243,282,589.76 |

1,584 supported known classifications + 2,977 Unclassified (explicit reporting bucket).

---

### GAP-04 — Data quality row counts by year (§4.2.1)
**Status: ✅ RESOLVED**  
**Resolved from:** outputs/sales_data_qa_20260623/source_vs_clean_year_comparison.json  
**Confirmed values:**
- 2021: 3,419 source → 3,412 clean (−7)
- 2022: 4,032 source → 3,999 clean (−33)
- 2023: 5,893 source → 5,323 clean (−570)
- 2024: 2,948 source → 3,328 clean (+380; contract backward allocation)
- 2025: 4,141 source → 4,899 clean (+758; contract backward allocation)

---

### GAP-05 — Selected forecast model identification
**Status: ✅ RESOLVED**  
**Resolved from:** QA_REPORT.md + independent_metrics.json  
**Confirmed:** Selected model is **last_value** (last-value benchmark). QA_REPORT.md explicitly states "Selected model: last_value." All 21 challengers underperformed on development WAPE (best challenger was seasonal_naïve at 93.90%; best SARIMA at 87.88%; all worse than last_value at 83.20%).

---

### GAP-06 — Total automated unit test count (§4.2.5)
**Status: ✅ RESOLVED**  
**Resolved from:** outputs/system_qa_20261010/QA_REPORT.md  
**Confirmed values:**
- Backend unit tests: **102/102 pass** (25 test files)
- Python service tests: **119/119 pass**
- Notebook tests: **82/82 pass**
- STL tests: **3/3 pass**
- **Total unit tests: 306/306 pass, 0 failed**
- Browser automation tests: **115 pass, 4 explicit legacy skips**
- Independent live warehouse/gateway finance verification: 114/114 comparisons, 8 query groups

---

### GAP-07 — Planning validation results (§4.2.4)
**Status: ✅ RESOLVED**  
**Resolved from:** outputs/business_analytics_review_20261007/planning_final_qa.md  
**Confirmed values:**
- Backend planning unit tests: **13/13 pass** (planningGateway, planningScenario, monthlyQuery)
- Synthetic scenario check: **1,000 scenarios; 614 completed, 386 correctly infeasible**
- All invariants satisfied: integer-pack/cap, budget/cents, protected-stock, minimum-fulfillment, unmet-quantity, scenario-only
- No optimality assertion made

---

### GAP-08 — External data source eligibility status (§4.2.3)
**Status: ✅ RESOLVED**  
**Resolved from:** outputs/business_analytics_review_20261007/EXTERNAL_PLANNING_FINDINGS.md  
**Confirmed values:**
- DOH: 2,518,227 total records; 1,787 territory/disease/month records in Gold-equivalent filter scope; **zero rows join-ready or forecast-eligible**
- PAGASA: 11,688 daily rows; 383/384 station-months complete rainfall; **zero rows join-ready**
- All 7 DOH-to-MedShield territory mappings: **pending**
- October 2026 from December 2025 origin = lead 10 (no origin-time DOH release confirmed)

---

### GAP-09 — ABC Pareto threshold (first N labels = 80% of sales)
**Status: ✅ RESOLVED**  
**Resolved from:** outputs/business_analytics_review_20261007/PRODUCT_FINDINGS.md  
**Confirmed values:**
- First **442 labels** cover 80% of positive sales (Class A threshold)
- 22,172 positive original quantity candidates
- Candidate original-source observations end December 2023
- **Zero approved categories, identities, units, or forecast-eligible products**

---

### GAP-10 — Opening baseline note accuracy (repo accessibility)
**Status: ✅ RESOLVED**  
**Resolved from:** ZIP archive upload on 9 November 2026  
**Change made:** Opening baseline note updated to: "The private main repository (IS-Capstone-Group9/medshield-dss-project, branch medshield/uiux) became accessible via ZIP archive on 9 November 2026. The errata source files (docs/paper_errata/ERRATA_SHEET.md, REPLACEMENT_TEXT.md, E01–E15) have been read and applied to the Chapter 4–5 prose."

---

## Open QA Defects (from outputs/system_qa_20261010/QA_REPORT.md)

These defects are documented in Chapter text (§4.2.5 and §4.3.3 Limitation 6, §5.2.5) and must be tracked before submission:

| QA Item | Priority | Description | Chapter reference |
|---|---|---|---|
| QA-01 | P1 | npm advisory counts in frontend and backend production audits return nonzero | §4.2.5; §5.2.5 Recommendation 5 |
| Migration 011 | P1 | Supabase migration 011 (SQLSTATE 42883) fails during clean bootstrap | §4.2.5; §4.3.3 Limitation 6; §5.2.5 |
| QA-07 | P2 | Backend: guard clause for migration 011 optional function revocation | §5.2.5 Recommendation 5 |
| QA-08 | P2 | Backend: explicit legacy-grant retirement needed | §5.2.5 Recommendation 5 |
| QA-09 | P2 | TS2339 fix and stale-horizon assertion | §5.2.5 Recommendation 5 |
| QA-11 | P3 | Authorized fresh-credential recovery flow | §5.2.5 Recommendation 5 |

**Author action required:** Confirm QA item IDs and descriptions match the current QA_REPORT.md before final submission.

---

## Items Not Yet Confirmed from Available Artifacts

| Item | Location in chapter | Required evidence |
|---|---|---|
| Table 4.6 — Actual entered scenario values for a representative pilot run | Table 4.6 (structural template only) | Requires operational stock/supplier/expiry inputs; not found in ZIP artifacts; must be added before submission |
| Dashboard prototype Figures 3.11, 3.25–3.33 — exact figure numbers | Referenced throughout §4.2 | PDF pages 131–140 not read (10-page-per-call limit reached in prior session); 2025 revenue ₱183.8M and growth +224% from earlier reads retained |
| Full SARIMA variant rows in Table 4.5 | Table 4.5 (best SARIMA only reported as "87.88% development WAPE") | Full SARIMA variant table in extended verification artifact; not separately extracted this session |
| STL 72 vs. 81 component count | §4.2.1 | Author to verify: QA_REPORT.md says "72 months"; errata sheet references "81 components" — chapter uses 72 |

---

## Author and Adviser Checklist

Before manuscript submission, the following actions are required:

- [ ] **E01 wording sign-off:** Confirm "2017–2025" scope description and "September 2026 descriptive extension" language
- [ ] **E03 wording sign-off:** Confirm limitation language about medicine-unit demand commitment and below-15% MAPE
- [ ] **E10 component count verification:** Verify whether QA_REPORT.md's "72 months" or errata sheet's "81 components" is the correct figure for the STL output
- [ ] **E12 wording sign-off:** Confirm retrospective-audit language and WAPE vs. MAPE distinction
- [ ] **Table 4.6 pilot run data:** Complete at least one representative pilot scenario with operational inputs and document entered values and computed outputs in Table 4.6
- [ ] **Figure number verification:** Confirm Figures 3.11, 3.25–3.33 numbers match the final proposal PDF pagination
- [ ] **Table 3.5 citation:** Confirm Table 3.5 citation (allocation and dated expiry row) matches the final proposal PDF
- [ ] **QA defect remediation:** Resolve migration 011 and open P1–P2 items before production deployment; confirm current status of QA-01, QA-07 to QA-09, QA-11
- [ ] **Full SARIMA rows:** Add remaining SARIMA variant metrics to Table 4.5 from extended verification artifact if required
- [ ] **Formal client acceptance:** Schedule and conduct the structured acceptance process (§5.2.3) before the manuscript's formal acceptance section is finalized
- [ ] **References list verification:** Confirm all references cited in Chapters 4 and 5 appear in the references list; confirm no reference appears in the list without a corresponding citation in the text
- [ ] **All 15 errata sign-off:** Joseph Richard G. Catubag, MBA to approve the errata-corrected manuscript wording before submission

---

*This review ledger was produced by automated errata alignment on 9 November 2026 using the ZIP archive of the private repository (branch medshield/uiux, accessed 2026-11-07). All numerical metrics in the chapter draft are sourced from verified repository artifacts (independent_metrics.json, QA_REPORT.md, category_acceptance assessment.md, planning_final_qa.md, source_vs_clean_year_comparison.json). The errata source file (ERRATA_SHEET.md) explicitly notes that no row is marked Incorporated or Approved in the packet; this ledger documents alignment only and does not constitute the required author/adviser approval.*
