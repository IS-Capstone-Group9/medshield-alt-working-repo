# Model and formula cross-reference

MedShield DSS capstone, 12 November 2026, updated 15 November 2026 with the descriptive extensions, diagnostic
breakdowns, large-order profile, readiness sizing, product survival and category-level disease test. Every model and
analytical method assessed, cross-referenced to its formula, data, test, integration and specific objective (SO1–SO5),
with a verdict on four criteria.

## Criteria

| Criterion | Meaning |
|---|---|
| **Reliable** | Passed a pre-registered test, or is a deterministic calculation that reconciles to the source (net sales ₱638,015,351.53 to the cent) |
| **Defensible** | Standard, citable method with stated assumptions and limits; no tuning on inspected results |
| **Integrated** | Served by the gateway from Databricks Gold to a dashboard page, with an explicit unavailable state and no substitute data |
| **Meaningful** | Answers a business question in an objective (SO1–SO5) |

Shared error metrics (SO3): **WAPE** = Σ|F − A| / Σ|A|; **normalized bias** = Σ(F − A) / Σ|A|; **on-target rate** = share of
forecasts with |F − A| ≤ 0.15·|A|. Standard forecast win rule: 90% block-bootstrap interval (block 6) of the paired
error difference wholly below 0, |bias| ≤ 5%, improvement in both halves of the cases.

## Selection funnel

Every model passed through the same four gates, with criteria fixed before testing. Models were eliminated by these
rules, never by picking the best score on inspected months.

| Gate | Question | Eliminated here |
|---|---|---|
| 1. Data validity | Does valid data exist for the model's target? | Unit forecasts (pack sizes unverified); price-based pack inference (v1 and its retry failed); DII/RSI as forecast inputs (no valid link); disease-to-medicine units (not testable); disease link at category level (0 of 64 tests) |
| 2. Beats the benchmark or meets its rule | Does it beat the 6-month mean under the pre-registered win rule, or meet its own registered rule? | Seasonal naive, SARIMA, ETS, Ridge, HistGBDT, TSB, split total, routine alternatives; readiness reserve (69.7% vs 70% coverage); calendar timing of large orders (p = 0.134) |
| 3. Bias and stability | Bias within ±5% and the gain present in both halves? | Day-15 estimate (−5.4%), 6-month median (−14.8%) |
| 4. Integration and meaning | Does it answer an objective, and can the system serve it with provenance? | Models answering no business question stay research only |

### Final pick per job

| Job | Picked | Winning reason | SO |
|---|---|---|---|
| Sales summaries and growth | Financial summaries, matched-period year-over-year | Exact; reconciles to ₱638,015,351.53 | SO1 |
| Seasonality check | STL decomposition | Standard method; shows seasonality is weak | SO1 |
| Product and area priority | Pareto/ABC; family ABC–XYZ | 82% year-to-year stability vs 60% for random groupings | SO2 |
| Monthly forecast | 6-month mean | No challenger met the rule in more than 15 attempts | SO3 |
| Current-month estimate | Day-20 estimate | 28.8% vs 41.8% WAPE, bias −2.3% | SO3 |
| Large orders | Frequency for readiness; large-order profile; chance and range benchmarks | 5.8–9.5% better than baseline; amounts unpredictable; chance and range pass narrowly as floors | SO3/SO4 |
| Why margin fell and where growth came from | Mix/rate decomposition; sales-change bridge | Exact identities; add up to the total change | SO1 |
| Which months were unusual and why | Robust z-score against the previous 12 months | Rule fixed before running; 11 of 15 high months were large orders | SO1 |
| Whether a new product will last | 3-of-first-6-months signal | 52% vs 19% year-2 survival, same direction in 5 of 5 cohorts | SO2 |
| Readiness amount | Trade-off table (no default) | Selected rule failed narrowly, so the user chooses the risk level | SO4 |
| Evidence for the findings | Benchmarks: seasonal naive, simple rules, SARIMA, ML | Each supports one stated claim | SO3 |
| Stock buffers | Per-family safety stock at 95% | 96.2% service (rule 90–98%) | SO4 |
| Planning scenarios | EOQ, reorder point, pack allocation, FEFO | Correct on entered inputs | SO4 |
| Delivery | Integrated dashboard | 643 gateway tests; CI 12/12 | SO5 |

Waiting for new months (pre-registered): routine blend, growth-adjusted budget mean, ETS and ranges on routine sales,
TSB on families.

## Tier 1: Core (all four criteria met)

| Model / method | Formula | Data | Test and result | Integration | SO | Business meaning |
|---|---|---|---|---|---|---|
| Financial summaries and gross margin | Net = Σ eligible net sales; GM% = Σ gross profit / Σ matching eligible revenue | Itemized Gold, 39,286 eligible lines | Reconciles to ₱638,015,351.53 in every route | Overview, Sales Diagnostics | SO1 | What was sold and earned, from records only |
| Matched-period year-over-year | Δ% = (Σ current matched months − Σ prior matched months) / Σ prior | Same; only months recorded in both years | Deterministic; absent months never treated as zero | Sales Diagnostics, Territory | SO1 | Fair growth comparison despite missing months |
| Pareto and descriptive ABC | Rank by positive contribution; cumulative share < 80% = A, < 95% = B, else C; non-positive unclassified | Itemized Gold by product label or area | Deterministic | Products, Territory | SO2 | Which products and areas carry the revenue |
| Family ABC–XYZ | ABC as above on families; XYZ by CV = σ/μ of 12 monthly values: ≤ 0.5 X, ≤ 1.0 Y, else Z | Gold 2025 sales + hash-pinned family mapping v1.1 | Pre-registered: A-X value kept next year 82% vs 52% for labels and 60% for random groupings (passed); 8 AX families = 3.4% of net, 91 AZ = 72.8% | Products (`/api/sales/family-abc-xyz`, decision 015) | SO2 | Which families suit reorder rules and which need manual, order-based planning |
| 6-month mean (reference forecast) | F(t+h) = (1/6) Σ y(t−i), i = 0..5 | Monthly net, 2017–2026 | No challenger met the win rule (more than 15 tested); lead-1 WAPE 49.7% total, 36.7% routine | Forecast page | SO3 | The honest benchmark every model must beat |
| Forecast evaluation framework | WAPE, bias, on-target rate, block bootstrap, time-ordered origins | All forecast cases | Registered, hashed, reproducible | Forecast page evidence tables | SO3 | Shows how far forecasts can be trusted |
| Routine vs large-order split | Document (month, DR) with net ≥ ₱500,000 = large; rest = routine | Itemized Gold, document level | Reconciles to the cent; routine error 36.7% vs 46.6% total | Forecast (`/api/sales/sales-streams`) | SO3 | Separates plannable routine flow from irregular tenders |
| Large-order frequency | p = share of last 24 recorded months with a large order; Brier = mean (p − o)² | Large documents by channel | Pre-registered: Brier 5.8% (Government) and 9.5% (Hospital) better than all-history; amounts unpredictable (84–95% WAPE) | Forecast panel | SO3/SO5 | Readiness for stock and cash, not a prediction |
| Dashboard integration | Gateway-only access, provenance, unavailable states, exports | All routes | Gateway 643/643 tests; CI 12/12 checks on PR #8 | Whole dashboard | SO5 | One traceable decision-support workflow |

### Comparison benchmarks (part of the evaluation framework)

These models are **not** used to forecast. Their job is to be compared against, and each supports one specific, true claim.
They passed the test for that job: they were run on identical cases under the same rules, so the comparison is fair.

| Benchmark | Formula | Result | Claim it supports (only this) | SO |
|---|---|---|---|---|
| Seasonal naive | F(t+h) = y(t+h−12) | 68.6% WAPE vs 49.7% for mean_6 (lead 1) | Seasonality in MedShield's sales is too weak to forecast from; last year's same month is a poor guide | SO1/SO3 |
| Last value, 12-month mean, 6-month median, simple combinations | F = y(t); mean or median of a fixed window; averages of these | 46.9–71.1% WAPE; none beats mean_6 under the win rule | The reference was not cherry-picked: nearby simple rules perform about the same or worse | SO3 |
| SARIMA (airline, AR seasonal) | Seasonal ARIMA(p,d,q)(P,D,Q)₁₂ | 63.3–76.9% WAPE | Classical seasonal time-series models do not beat a simple average on this data | SO3 |
| Ridge, HistGBDT | Regularized linear regression and gradient-boosted trees on lagged sales | 77.3–85.2% WAPE, the highest error | Machine learning needs more history than 81 monthly points; complexity does not help here | SO3 |

## Tier 2: Defensible and integrated, with stated limits

| Model / method | Formula | Test and result | Integration | SO | Limit |
|---|---|---|---|---|---|
| STL decomposition | y = Trend + Seasonal + Remainder; period 12, seasonal window 13, robust, ≥ 36 contiguous months; seasonal strength = max(0, 1 − Var(R) / Var(S + R)) | Reproducible diagnostic; seasonality weak where fitted | Sales Diagnostics, area and regional STL routes | SO1 | Descriptive only; delivery areas do not cover complete geography |
| Prior-year ABC class (classifier baseline) | Class(t) = Class(t − 1) | 64.0% accuracy vs 61.7% majority floor; A recall 32.7% | Products research panel | SO2 | Barely above the floor; label churn |
| EOQ and reorder point | EOQ = √(2DS / H); ROP = d·L + SS | Correct computation on entered inputs | Inventory page | SO4 | Inputs (stock, lead time, costs) unverified; scenario, not policy |
| Weighted integer-pack allocation | Maximize weighted demand coverage subject to Σ packs × pack cost ≤ budget, whole packs, cents | Exact within declared domain; optimality claimed only where proved | Inventory page | SO4 | Entered-input scenario |
| Dated FEFO supply feasibility | First-expiry-first-out allocation over dated supply slots, 0–20 packs per product | Feasibility checks only | Inventory page | SO4 | No inventory data; expiry reduction not measured |
| RSI territory context | RSI = NASA POWER rainfall severity proxy, monthly per territory | No significant association with sales; used as context | Territory (`/api/sales/territory-signals`) | SO1/SO2 | Proxy; DII withheld until DOH mapping approval |
| Missing-month estimate (chart only) | Linear interpolation between recorded neighbours, dashed | Never in totals, tables or exports | Overview chart | SO1 | Visual estimate only |

## Tier 3: Validated but not yet on the dashboard

| Model | Formula | Test and result | Missing for integration | SO |
|---|---|---|---|---|
| Day-20 mid-month estimate | F = w·(MTD / s̄₂₀) + (1 − w)·mean_6, w = 0.75; s̄₂₀ = median share delivered by day 20 over the prior 24 months | Pre-registered: 28.8% vs 41.8% WAPE, bias −2.3% (passed) | Sales entered within days of delivery | SO3 |
| Per-family safety stock, 95% | Level = mean_6 + 95th percentile of the last 24 lead-1 errors | 96.2% service (rule 90–98%); median buffer about 2.3× forecast | Verified units and pack sizes; real stock data | SO4 |
| Descriptive extensions D1–D8 (13 Nov) | Counts and ratios: order size, channel mix, category margin, portfolio change, concentration, returns, discounts, within-month timing | Deterministic; reconcile to the source | Dashboard panels (after the other session's work) | SO1 |
| Margin mix/rate decomposition (15 Nov) | ΔGM = Σ Δshareₛ·m̄ₛ (mix) + Σ Δmₛ·w̄ₛ (rate), m̄ and w̄ = two-year averages | Exact identity (asserted); 2019→2025 by family: mix −17.1, rate −4.2 pts | Diagnostics panel | SO1 |
| Sales-change bridge (15 Nov) | Δnet = Δlarge + Δcontinuing + new − lost (+ adjustments), matched months only | Exact identity (asserted); 2025→2026: +₱75.7M = large +51.0, new +36.2, continuing +0.7, lost −12.2 | Diagnostics panel | SO1 |
| Unusual-month flag (15 Nov) | z = (y − median₁₂) / (1.4826·MAD₁₂); flag at abs(z) ≥ 3; cause split by large orders and family deviations | Rule fixed before running; 16 of 101 months flagged; 11 of 15 highs mainly large orders; found the December 2017 data gap | Monthly diagnostics view | SO1 |
| Product survival and 3-in-6 signal (15 Nov) | Survival to year k = share of new families with sales in months 12k+1…12(k+1); signal = sales in ≥ 3 of first 6 months | 23% survive to year 2; signal 52% vs 19%, consistent in 5 of 5 cohorts (registered consistency rule) | Products view | SO2 |
| Large-order profile (15 Nov) | Frequency, size quantiles, within-year permutation test, content shares | Descriptive; timing not supported (p = 0.134) | Forecast readiness panel | SO3/SO4 |
| Large-order chance benchmark (15 Nov) | p = share of months since 2020 with ≥ 1 large order; Brier = mean (p − o)² | Holdout 2024–2026: Brier 0.216 vs 0.25, gap −9 pts (rule ≤ 10): narrow pass, runs low | Readiness panel, as a floor | SO3 |
| Large-order range benchmark (15 Nov) | [Q₁₀, Q₉₀] of the previous 24 monthly totals | Coverage 83% / 73% (rule 70–90%): narrow pass; all misses above | Readiness trade-off table | SO3/SO4 |

## Tier 4: Research or exploratory (shown or recorded, not used for decisions)

| Model | Formula | Result | Status |
|---|---|---|---|
| XGBoost ABC classifier | Gradient-boosted trees on prior-year features | 64.4–64.7% accuracy, A recall 25.5% | Research panel, labelled not approved |
| 4-method blend (routine) | Mean of mean_3, mean_6, median_6, growth-adjusted mean | 37.3% vs 37.8% (exploratory) | Queued re-test R4 |
| Growth-adjusted 6-month mean | mean_6 × clip(1 + 0.5(S₁₂ / S₁₂,prev − 1), 0.7, 1.3) | Bias +0.4% vs −11.9%; WAPE 51.2% vs 49.4% (exploratory) | Queued re-test R5 (budgeting) |
| ETS on routine sales | Holt-Winters additive, seasonal 12 | Tied best on total (61.1% tournament) | Queued re-test R1 |
| 80% ranges on routine sales | F + [Q₁₀, Q₉₀] of last 24 errors | Company-level version 69–71% coverage | Queued re-test R2 |
| TSB on families | p ← p + β(occ − p); z ← z + α(y − z) when occ; F = p·z (α 0.3, β 0.1) | 152.2% vs 132.3% at family level | Queued re-test R3 |
| Volatility-scaled ranges (PD3) | Conformal ranges scaled by recent volatility | 75.7% coverage, 12/15 cells; pre-2026 check failed | Research only |
| Ampoule unit baseline | Simple baselines on BUPIRIGHT ampoule counts | 30–54% WAPE on 4–6 cases | Research only |
| External-variable regression | Sales on lagged DII and rainfall | Joins and issue-time data not approved | Research only |
| Therapeutic category mapping v0 (15 Nov) | Brand → likely generic → category → demand driver, from label name, strength and form | Top 200 families (68.7% of sales), 174 high or medium confidence; AI-inferred, not verified against FDA or the client catalog. v0.1 adds two classifications, corrects one, and adds ATC groups (176 high or medium) | Candidate grouping for planning views |
| Demand profile per product group (15 Nov) | Class by fixed rules: large orders ≥ 50% of sales; else by CV of routine monthly sales (≤ 0.5 steady, ≤ 1.0 uneven, else erratic) | Registered check: forecast-error order held (54.3% < 93.2%); stability failed (7 of 13 kept class, rule 60%) | Description only; on the Products page once the category table exists |

## Tier 5: Waiting for data (a real job exists; it needs inputs MedShield does not yet have)

| Model | Formula | Current result | Job it could do | Needs |
|---|---|---|---|---|
| Hierarchical reconciliation | P = S(SᵀW⁻¹S)⁻¹SᵀW⁻¹ (OLS, WLS) | No change while every level uses mean_6 | Make routine, large-order and family plans add up when they use different methods | New months to test that setup |
| Company-level 80% ranges and 95% safety stock | Error quantiles on the total | 69–71% coverage; 82.2% service | Planning ranges (routine version queued as R2; per-family safety stock already validated) | New months |
| Unit forecasts | mean_6 on recorded quantity | 18% worse than pesos | Purchase planning in units | Verified units and pack sizes |

## Tier 6: Retired (no honest job remains on current data)

| Model | Formula | Result | Why no other job fits |
|---|---|---|---|
| Split total forecast | Routine forecast + trailing large-order mean | 50.8–58.0% vs 49.7% | Large orders cannot be predicted from history; the split itself is already core |
| Day-15 mid-month estimate | As day 20 with w = 0.5 | Bias −5.4%; single retry −9.6%; final | Day 20 does the same job and passed |
| DII and RSI as forecast inputs | Lagged regressors | No association with detrended sales | Their valid job, territory context, is already Tier 2 (RSI); as inputs they need unit data for disease-linked medicines |
| Price-based pack-size inference (14 Nov) | Pack factor = price level / family base price | V1 defect; single retry failed all four checks (e.g. demand CV 2.96 → 3.34) | Price levels also reflect strength, form and buyer; the candidates became a client yes/no sheet |
| Readiness reserve (15 Nov) | Reserve = Q₉₀ of the previous 12 monthly large-order totals | 69.7% holdout coverage vs 70% rule | Its job is served by the trade-off table, with no default amount |
| Calendar timing of large orders (15 Nov) | Variance of calendar-month means vs within-year permutation | p = 0.134 (rule p < 0.05) | No calendar pattern to plan around |
| Disease link at therapeutic-category level (15 Nov) | Spearman on Δlog monthly routine sales vs Δlog DOH cases, lag 0–1, Holm over 64 tests | 0 of 64 supported; best COVID-19 → anticoagulants ρ 0.34 (raw p 0.005, Holm 0.30) | Tested at brand, family and category level with the same result |
| Category seasonality (15 Nov) | Within-year permutation of calendar-month means, Holm over 18 categories | 0 of 18 seasonal | Consistent with the weak seasonality found by STL and seasonal naive |

**DII vs disease-linked medicine units (decision 016, 12 Nov):** the pre-registered test was **not testable**. Linked
medicines appear in 4 territory-months for dengue and 0 for typhoid, leptospirosis and cholera (60 required). Medicines are
recorded by brand, and disease-linked sales go mostly to Government and Hospital channels with no location. It needs generic
names and delivery locations ([test](../disease_units_test_20261112/README.md)).

## Summary

| Tier | Count | Use in the capstone |
|---|---|---|
| 1 Core: operational | 9 | Main results and the system's operational content |
| 1 Core: comparison benchmarks | 4 | Evidence for the main findings (weak seasonality; simple beats complex) |
| 2 Defensible, integrated, limited | 7 | Supporting results with explicit limits |
| 3 Validated, not integrated | 10 | Results plus implementation requirements (8 added 13–15 Nov) |
| 4 Research or exploratory | 11 | Transparency and future work (category mapping and demand profile added) |
| 5 Waiting for data | 3 | Future work with named data requirements |
| 6 Retired | 8 | Negative findings (5 added 14–15 Nov) |

**52 models and methods in total. 30 are reliable, defensible and meaningful in the role they are used for (Tiers 1–3);
20 of them are part of the integrated system or its evaluation (Tiers 1–2).** Benchmarks are core only as comparators:
no benchmark is used to forecast. The remaining 22 are research candidates, waiting for data, or retired. The 10 Tier 3
items now have gateway endpoints and dashboard panels. Verified on 15–16 Nov in two halves: live figures match the offline
results exactly, and an automated browser test (`frontend/e2e/diagnostic-profile-panels.spec.ts`) runs the real dashboard
with mocked gateway responses (panels load on their pages, show the unavailable state on failure and recover, and fit a
phone). They move to Tier 1–2 after one signed-in run of that test against the live gateway.

**Correction, 16 November 2026.** The family ABC–XYZ panel (Tier 1) was being removed from the Products page each time
the page opened, from its release on 11 November until a fix on 16 November: a cleanup step that deletes the reference
markup's sample tables also deleted panels added by the runtime. The endpoint and its figures were correct throughout.
The panel is now protected and covered by the same browser test.

All forecast results are retrospective (months already inspected); prospective accuracy is unmeasured because no sales
after September 2026 are available. No model authorizes procurement.
