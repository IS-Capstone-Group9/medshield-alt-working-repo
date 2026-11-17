# Objective evaluation table (proposed SO1–SO5) — 17 November 2026

This table is for Chapter 4. Objective wording comes from the
[proposed-objectives draft](chapters/MedShield_Chapters_1_to_5_Proposed_Objectives_Draft_20261106.md). Adviser approval of
the amendment is **pending**. Original-objective clause scores (12.5/33) are unchanged by this table. The status values
are:

- **Met**: the method was implemented and evaluated, and the result is reported against its rule.
- **Met with limits**: delivered, but a named gap remains.
- **Open**: needs data or acceptance that does not exist yet.

Detailed traceability lives in [ANALYTICS_EVIDENCE_MATRIX.md](ANALYTICS_EVIDENCE_MATRIX.md) and
[MODEL_REGISTER.md](MODEL_REGISTER.md).

## Summary

| Objective | Status | Key result | Main limit |
|---|---|---|---|
| SO1 Sales trends, seasonality, area differences | Met with limits | 2017–Sept 2026 summaries, matched-period Y/Y, STL; seasonality weak (0 of 19 categories seasonal) | Only 18.1% of sales have a confirmed territory |
| SO2 Products and areas for review | Met | Family ABC–XYZ passed (82% A-X value kept vs 60% random); XGBoost ABC evaluated and not better than prior-year class | No stable account IDs; mapping is a candidate |
| SO3 Forecast evaluation | Met (negative findings reported) | mean_6 lead-1 WAPE 49.7%; beat 15+ challengers incl. SARIMA, Ridge, HistGBDT; external variables tested and not supported | No prospective accuracy yet; the 10%/5% original targets are not reached |
| SO4 Procurement planning scenarios | Met with limits | EOQ/ROP/allocation scenarios; data-driven stock policy 94.4% service vs 91.1% target, 15–52% less stock than a uniform rule (simulated) | No stock, batch or expiry data, so expiry exposure is not measured |
| SO5 Integrated decision-support dashboard | Met with limits | 9 pages, provenance, unavailable states, exports, surge preparedness, 662 gateway tests | Client acceptance, hosted deployment and actual screen-reader checks pending |

## Detail

| Obj. | Method | Metric and rule | Result | Outcome | Evidence |
|---|---|---|---|---|---|
| SO1 | Financial summaries 2017–Sept 2026 | Reconciles to Gold control ₱638,015,351.53 | Exact reconciliation | Met | `docs/DESCRIPTIVE_ANALYTICS_LOGIC.md` |
| SO1 | Matched-period year-over-year | Same months only | Implemented in Sales Diagnostic | Met | `outputs/delivery_area_20261102/` |
| SO1 | STL decomposition (company, area, province) | Seasonal strength reported | Weak or zero seasonal strength in most series | Met (finding: weak seasonality) | `outputs/delivery_area_20261102/` |
| SO1 | Category seasonality test | Permutation, Holm p < 0.05 | 0 of 19 categories seasonal | Met (negative finding) | `outputs/category_disease_test_20261115/` |
| SO1 | Diagnostic breakdowns | Exact accounting identities | Family mix explains −17.1 of −21.3 pt margin fall (2019–25) | Met | `outputs/diagnostic_breakdowns_20261115/` |
| SO2 | Pareto and descriptive ABC | Classes by value share | Implemented (Products / Areas pages) | Met | `docs/AREA_AND_PRODUCT_PRIORITIZATION_IMPLEMENTATION_PLAN.md` |
| SO2 | Family ABC–XYZ (mapping v1.1) | A-X value kept vs random groupings (60%) | 82% | Met | `outputs/family_rerun_20261111/` |
| SO2 | Baseline vs XGBoost/logistic ABC classifier | Beat prior-year class | Barely above the majority floor; baseline kept | Met (negative finding) | `docs/MODEL_REGISTER.md` |
| SO2 | Area prioritization score | Scale × coverage | Implemented; only labels the source supports | Met with limits | `docs/AREA_PRIORITIZATION_AND_BUYER_SECTOR_REFERENCE.md` |
| SO3 | Time-ordered evaluation, win rule vs mean_6 | Bootstrap difference < 0, bias ≤ 5%, both halves | No challenger beat mean_6 (WAPE 49.7%) | Met | `outputs/model_scorecard_20261107/` |
| SO3 | Statistical and ML challengers | Same rule | SARIMA 63–77%, Ridge/HistGBDT 77–85% WAPE | Met (negative finding) | `docs/MODEL_REGISTER.md` |
| SO3 | Day-20 mid-month estimate | Win rule | 28.8% vs 41.8% WAPE, bias −2.3%: passed | Met | `outputs/accuracy_round2_20261111/` |
| SO3 | Large-order chance and range | Brier < 0.25; coverage 70–90% | 0.216; 73–83%: narrow pass. Government range 78–79%: passed | Met | `outputs/large_order_profile_20261115/`, `outputs/new_prediction_targets_20261117/` |
| SO3 | External variables (DOH, PAGASA, NASA POWER) | Pre-registered tests | Disease 0/64; DII/RSI not significant; alerts 0 usable of 8; weather ranges W1 and disruption W2 failed | Met (negative finding, decision 017) | `outputs/category_disease_test_20261115/`, `outputs/weather_prediction_tests_20261117/` |
| SO3 | Product-unit pilot | Units vs pesos | Units 18% worse; too few unit cases | Met with limits | `outputs/accuracy_round2_20261111/` |
| SO4 | EOQ, ROP, integer-pack allocation, dated feasibility | Entered assumptions, explicit status | Implemented with exports and draft validation | Met | `docs/CURRENT_STATE.md` (Planning) |
| SO4 | Data-driven stock policy (mean_6 + error-quantile safety stock) | Service within ±5 pts of target | 94.4% vs 91.1% (14 days) | Met (exploratory; re-test R6 queued) | `outputs/o4_prescriptive_policy_20261113/` |
| SO4 | Benefit vs uniform months-of-cover rule | Less stock at equal service | 15–52% less across lead 7–30 days and targets 90–95%; about ₱312k/yr carrying cost at 25% holding, 65 families (illustrative) | Met with limits (simulated) | `outputs/benefit_sensitivity_20261117/` |
| SO4 | Surge buffer scenario | Planner-chosen +20/40/60% | Extra stock per category in outbreak months | Met (scenario) | `outputs/surge_preparedness_20261117/` |
| SO4 | Expiry exposure | Measured expiry | Not measurable: no batch or expiry data | Open | Client data request |
| SO5 | Dashboard integration (9 pages) | Live Gold only, explicit unavailable states | Implemented; no analytical fallbacks | Met | `docs/ARCHITECTURE.md` |
| SO5 | Provenance, exports, availability notices | Dataset IDs, hashes, CSV per panel | Implemented | Met | `docs/API.md` |
| SO5 | Automated verification | Gateway and browser suites | 662 gateway tests pass; focused Playwright suites pass | Met | `docs/TESTING.md` |
| SO5 | Client acceptance (SUS + usefulness) | SUS ≥ 68 (average usability) | In-app survey built; responses not yet collected | Open | Survey panel (Data Source page) |
| SO5 | Hosted deployment, actual screen-reader check | Release checks | Not done | Open | `docs/DEPLOYMENT.md` |

## Remaining gaps to close before the defense

1. **Adviser approval** of SO1–SO5 wording (amendment memo).
2. **Client walkthrough and survey responses** (SO5 acceptance).
3. **Client operating inputs** (lead time, holding and ordering cost, stock on hand) to replace SO4 assumptions.
4. **Hosted staging deployment** and one actual screen-reader check.
