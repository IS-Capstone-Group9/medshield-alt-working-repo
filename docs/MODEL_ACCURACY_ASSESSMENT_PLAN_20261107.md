# Model accuracy assessment plan (7 November 2026)

**Owner:** Data Analyst (accountable). Adrian is the model owner and operator. **Reviewers:** adviser, source steward.
**Purpose:** define one consistent, repeatable way to measure how accurate every MedShield model is, so results are comparable, honest and defensible in the capstone paper.
**Related plans:** `MODEL_ACCURACY_IMPLEMENTATION_PLAN_20261107.md` (how to improve) and `FORECAST_SIGNAL_IMPLEMENTATION_PLAN_20261107.md` (new data). This plan defines how **all** of their results are judged.
**Status:** proposed. Passing an assessment is evidence for model review. It is not business approval and doesn't authorize procurement or activation.

## 1. What gets assessed

| Track | Model(s) | Target | Reference to beat |
|---|---|---|---|
| T1. Company PHP forecast | mean_6 (frozen), mean_3, last_value, seasonal naive, bias-corrected recipes, candidates | Monthly eligible itemized net PHP, contracts excluded, leads 1/3/6 | Best simple baseline per lead: mean_6 at lead 1, seasonal naive at leads 3/6 |
| T2. Area or channel totals | Trailing sum, half-growth, grouped selectors | 3/6/12-month totals (BATANGAS, QUEZON) | Trailing sum |
| T3. Product units | Seasonal naive, unit median, mean_6, pooled seasonal | Verified physical units per product-month | Seasonal naive |
| T4. Prediction intervals | Empirical and conformal intervals | Coverage of T1 and T3 actuals | Nominal coverage (80% / 95%) |
| T5. ABC classification | prior_abc persistence, logistic regression, XGBoost | Next-period A/B/C class per product | prior_abc |
| T6. Signal models | Any model with weather, disease or tender inputs | Same as its base track | The same model without the signal |
| T7. Decision models | EOQ/ROP, MCDA, recommender, anomaly flags | Their own outcomes (service level, hit rate) | A documented rule of thumb |

Each track is scored separately. Results are never pooled across tracks or horizons.

## 2. Metrics per track

| Track | Primary metric | Secondary metrics |
|---|---|---|
| T1, T2 | **WAPE** = Σ\|actual − forecast\| / Σ\|actual\| | MAE (PHP), RMSE, normalized bias = Σ(forecast − actual) / Σ\|actual\|, MASE against seasonal naive |
| T3 | WAPE on units | MAE (units), bias, share of over- and underforecast months, stockout-risk months |
| T4 | Empirical coverage at 80% and 95% | Mean width relative to the actual, Winkler or interval score |
| T5 | Macro-F1 | Class-A recall, class-A precision, confusion matrix, cold-start recall |
| T6 | WAPE change with the signal minus without it | Bias change, high-value and surge-case errors |
| T7 | Service level or fill rate (simulated) | Cost of overforecast vs underforecast, precision and recall of flags |

**Rules:**
- A zero denominator is reported as *undefined*, never as 0% or 100%.
- Always report bias next to WAPE: a low WAPE with large bias isn't acceptable.
- Report subgroup errors for **high-value months** (top quartile of actuals), **surge months** (June–September and DOH-flagged months), and **2025–26** (the coverage-shift period).

## 3. How cases are built

1. **Rolling origin:** at each origin, the model uses only data known at that time: history up to the last closed month, and features published before the issue date. Minimum history is 24 months for T1 and T2.
2. **Lead semantics:** record the issue date, last observable month, target month and calendar lead for every case. Retrospective cases use source-relative leads, while the forward protocol uses calendar leads 1/3/6, which equal source leads 2/4/7. Don't mix the two.
3. **Matched cases:** a model and its reference are scored on **identical** cases. If either is missing a prediction, stop rather than drop the case (`measurement_metrics` enforces this).
4. **Missing and partial months:** absent months stay unknown and are never filled with zeros. Partial months are excluded or flagged.
5. **Overlapping targets:** for multi-month totals, use a block bootstrap with block length equal to the horizon.

## 4. Evidence classes (keep them separate)

| Class | Definition | What it can support |
|---|---|---|
| Development | Retrospective cases used for design or tuning | Choosing candidates only |
| Inspected retrospective | Cases already seen in any earlier study (all 57 T1 lead-1 cases) | Reproduction and diagnosis only |
| Untouched retrospective | Never-inspected historical cases, kept sealed until frozen scoring | A retrospective verdict, if there are at least 12 cases |
| **Prospective** | Forecasts issued in real time, scored after the month closes | **The main verdict** |

Previously inspected months are never relabeled as untouched. T1 currently has 0 untouched retrospective cases, so its verdict must come from prospective issues.

## 5. Assessment protocol (every model, every time)

1. **Register before scoring:** write `registration.json` and its SHA-256, covering:
   - track, target, leads and source identity (dataset id, Delta version, policy, receipt hash)
   - recipes and the tuning budget (at most 8 configurations)
   - reference selection rule
   - folds and minimum case count (12)
   - thresholds
2. **Reproduce the reference** first. For example, mean_6 lead 1 must match WAPE 49.6729% on its 57 cases. Stop if it doesn't match.
3. **Score the candidate once.** The run script refuses to rerun after results exist, so no retuning after seeing outcomes.
4. **Compute uncertainty:** use the paired block bootstrap of the WAPE difference (`block_bootstrap_diff`: 4000 draws, block 3 or the horizon, seed 20261106). For T5, use `cluster_bootstrap_f1_diff`.
5. **Verify independently:** a standard-library script reads only the paired predictions CSV and recomputes the metrics to 1e-9. It also checks cutoffs (origin before target, features published before the issue date), unique cases, denominators and source totals.
6. **Decide:**

| Track | Acceptance rule |
|---|---|
| T1–T3, T6 | **At least 15%** relative WAPE reduction against the frozen reference, **and** absolute normalized bias **of 5% or less**, **and** paired 95% interval **below 0**, on at least 12 prospective or untouched cases |
| T4 | Coverage within ±5 pp of nominal, and width no worse than the current method |
| T5 | Macro-F1 at least 0.02 above prior_abc, with class-A recall not worse |

The verdict wording is fixed: **met / not met / not yet verifiable**. Negative results are kept.

## 6. Data checks before any assessment

- **Sales:** the pinned source reconciles, currently 39,286 eligible rows and ₱638,015,351.53 on original itemized v0. The model's input series must match the live monthly fact to the cent.
- **Joins:** row counts and totals are unchanged by any feature join (cardinality check).
- **External features:** must carry a dated snapshot (vintage), an approved mapping, and a provider or proxy label.
- **Units (T3):** only verified physical units are scored. Recorded quantities without unit approval are excluded.

## 7. Scorecard and reporting

Maintain one scorecard at `outputs/model_scorecard_<date>/` and refresh it monthly after each forward issue matures.

| Column | Example |
|---|---|
| Track, series, lead | T1, company, lead 1 |
| Model and frozen reference | mean_6 vs mean_6 (control) |
| Evidence class, n | inspected retrospective, 57 |
| WAPE, MAE, normalized bias | 49.67%, ₱3.34M, −10.76% |
| Relative reduction and 95% interval | n/a (reference) |
| High-value / surge / 2025–26 WAPE | 42.6% / 45.1% / 41.7% |
| Verdict | not yet verifiable |
| Registration hash, source version | `fae8699e…`, itemized v0 |

**Current baseline row (from the 7 Nov study):** T1 lead 1, mean_6, 57 inspected cases, WAPE 49.67%, bias −10.76%. Leads 3 and 6: 53.67% (n=55) and 63.20% (n=52).

The dashboard may show only gateway-served, source-validated values. Scorecard files are evidence for review, not a runtime source.

## 8. Schedule

| When | Activity |
|---|---|
| Nov 2026 | Build the scorecard from existing evidence (T1–T5 baselines). Register the prospective addenda. Write the shared independent verifier. |
| 1–3 of each month, from Dec 2026 | Issue forward forecasts with a controlled snapshot (`company_php_preflight`) |
| After each month closes | Score matured cases, refresh the scorecard, record missed windows as *unissued* |
| Quarterly | Review drift: bias trend, interval coverage, ABC transition rate. Record any data-scope changes. |
| Nov–Dec 2027 | First adequately sized prospective verdicts (about 12 matured issues per lead) |

## 9. Roles

| Role | Responsibility |
|---|---|
| Data Analyst | Registrations, scoring, scorecard, independent verification |
| Adrian (model owner / operator) | Forward issues, snapshots, approval of addenda |
| Source steward | Source versions, mappings, unit verification |
| Adviser | Agreement on which tracks and leads count toward the objective |

## 10. Code to reuse

- `services/analytics_service/rolling_accuracy.py`: `measurement_cases`, `measurement_metrics`, `measurement_comparison`, `wape`, `norm_bias`, `block_bootstrap_diff`, `conformal_coverage`
- `services/analytics_service/company_php_preflight.py` and `company_php_snapshot.py`: forward issues and controlled snapshots
- `services/analytics_service/abc_rank_policy.py` (`cluster_bootstrap_f1_diff`) and `abc_accuracy_evidence.py`
- `outputs/forecast_accuracy_study_20261107/independent_recheck.py`: template for the shared verifier
