# Model accuracy implementation plan (7 November 2026)

**Owner:** Data Analyst (accountable). Adrian is the model owner and operator. **Reviewers:** adviser, source steward.
**Status:** proposed. Results are research candidates only. They don't authorize procurement, activation or publication; those go through MedShield's existing approval gates.
**Companion plan:** `docs/FORECAST_SIGNAL_IMPLEMENTATION_PLAN_20261107.md` (new data sources). This plan improves accuracy using the models and data **already available**, then adds new signals only where they earn their place.

## 1. What our evidence already says

| Finding | Evidence | Implication |
|---|---|---|
| Seasonality does **not** help the company PHP forecast one month ahead | Seasonal naive WAPE 68.6% vs mean_6 49.7% (57 cases). The seasonal-index challenger C1 failed (−0.16%). `outputs/forecast_accuracy_study_20261107` | Keep lead 1 on recent-level methods |
| Seasonality **does** help at leads 3 and 6 | Seasonal naive is the selected reference at leads 3/6. Bias-corrected seasonal recipes lowered audit WAPE from 63.97% to 59.72% (lead 3) and from 68.92% to 57.49% (lead 6). `outputs/accuracy_improvement_20261031` | This is the most promising path to the 15% target |
| Seasonality **does** help product units | BUPIRIGHT 4 mL HOSPITAL seasonal naive WAPE 31.6% (lead 1) and 30.0% (lead 3). It beats the unit median at both leads. `docs/PREDICTIVE_OPERATIONS.md` (2 Nov) | Use seasonal methods for product units |
| Complex models lose on short, shifting series | 21-model WP4 tournament: simple baselines win. ETS repairs gave mixed results. Grouped selectors failed. XGBoost loses on ABC. | Prefer simple, robust and combined methods over heavier models |
| Errors come from purchase timing and a coverage change in 2025–26 | Top 10 cases carry 48% of error. 2025–26 bias is about −27%. Lag-1 autocorrelation is about −0.07. | Bias correction and break handling help. Dated tender data is the long-term fix. |

**Core idea:** don't look for one champion model. Route each series and horizon to the method family that wins there, combine where methods disagree, correct drift, and test everything the same fair way.

## 2. Workstreams in priority order

### M1. Horizon-specific model routing (highest near-term value)

Use the method family that wins for each horizon and series. Selection always uses only data known at the origin.

| Series | Lead 1 | Lead 3 | Lead 6 |
|---|---|---|---|
| Company PHP | mean_6 (frozen). Challenger: mean_6/last_value blend | Seasonal naive plus origin-local bias correction | Seasonal naive plus bias correction |
| Product units (verified) | Seasonal naive | Seasonal naive | Seasonal naive, shrunk to the category profile |
| Area or channel totals | mean_6 | Trailing sum, as at present | Trailing sum |

**Tasks:**
1. Re-freeze the bias-corrected seasonal recipes from `accuracy_improvement_20261031` exactly as they were developed. Don't retune them.
2. Register them for leads 3/6 in a **new prospective addendum** to `outputs/company_php_forward_20261031/protocol.json`, leaving the original protocol unchanged.
3. Issue them alongside the baselines from the 1–3 Dec 2026 window onward.

**Expected effect:** development evidence shows a 7–17% relative reduction at leads 3/6. This is the most realistic place to reach the 15% target, and it needs prospective confirmation.

### M2. Seasonality done properly (gated by seasonal strength)

Seasonal methods help only where a series really is seasonal. Each origin measures that strength from its own history.

1. **Seasonal-strength gate:** at each origin, compute STL seasonal strength F_s = max(0, 1 − Var(remainder) / Var(seasonal + remainder)) on history only. Use the seasonal method only when F_s ≥ a threshold fixed in the registration (default 0.4). Otherwise use the level method. No STL fitted on the full history ever enters features.
2. **Pooled seasonal profiles for short product series:** estimate month-of-year indices at the category level, then shrink each product toward its category: weight n/(n + k), with k fixed in the registration. This fixes the noisy 12-month lag of seasonal naive on 18–36-month product histories.
3. **Disease-season products:** tag the products linked to the dengue and rainy season (IV fluids, antipyretics, antimicrobials) through the existing category review. Test the seasonal profile for those tagged products separately. Use DOH signals only after they pass readiness (companion plan WS3).
4. **Robust seasonal estimates:** use medians of same-month ratios rather than means, and winsorize single large documents, so one tender doesn't become "seasonality."

**Code to reuse:** `services/analytics_service/rolling_accuracy.py` (`forecast`, `rolling_cases`, `block_bootstrap_diff`) and the STL jobs (`services.analytics_service.jobs.test_descriptive_stl`, `outputs/area_stl_verification_20261102`).

### M3. Forecast combination

Combinations reduce variance when methods disagree, as mean_6 and seasonal naive do at leads 3/6.

1. Equal-weight mean_6 + seasonal naive at leads 3/6. A fixed weight is cheap and robust.
2. Inverse-error weights from the last 12 completed inner origins, capped at 0.2–0.8 per method.
3. Don't stack learned meta-models: the case counts are too small.

### M4. Drift and level-shift handling

These address the 2025–26 underforecast (bias about −27%).

1. **Origin-local bias correction:** apply `bias_mean_6` and the 12/24-month corrections already in `rolling_accuracy.py`. Use them only when at least 6 completed errors exist.
2. **Break detection:** when the last 3 months sit outside the trailing-12 range (a CUSUM or simple rule fixed in the registration), switch from mean_6 to mean_3 or last_value until 6 months pass.
3. **Coverage-aware flags:** don't let coverage changes (absent months, new sales channels) be learned as demand. Mark them as data-scope events in the case ledger.

### M5. Prediction intervals (separate track)

1. Use split-conformal intervals per horizon from completed origin-local errors (`conformal_coverage` in `rolling_accuracy.py`). Scale them to the recent level.
2. Report coverage at 80% and 95%, plus interval width. Accept only if coverage is within ±5 pp on prospective cases.

### M6. ABC classification (separate track)

1. Keep `prior_abc` persistence as the reference.
2. Next hypothesis: a hybrid that uses persistence for established products and a category-prior rule for cold-start products. A+B recall was 0.00 for cold-start products in WP6.
3. Score it with macro-F1 and class-A recall, using `cluster_bootstrap_f1_diff`.

### M7. New information signals (from the companion plan)

Add tenders and orders first, then disease, then weather, but only after each passes the readiness checklist. Score the routed model from M1–M4 with and without the signal on identical cases.

## 3. How every experiment is run (same rules)

1. **Register first:** before fitting, write `registration.json` and its SHA-256, covering recipes, thresholds, folds, the tuning budget (at most 8 configurations) and the minimum number of cases.
2. **Tune by origin:** parameters are chosen only from inner errors whose target is on or before the origin.
3. **Test on new months:** development uses the retrospective cases. The verdict uses **prospective** issues under the forward protocol. Previously inspected months are never relabeled as untouched.
4. **Acceptance per series and horizon:**
   - Relative WAPE reduction of at least 15% against that horizon's frozen reference.
   - Absolute normalized bias of 5% or less.
   - Paired 95% block-bootstrap interval for the WAPE difference below 0.
   - At least 12 matured cases.
   - Verdict reported as met, not met, or not yet verifiable.
5. **Verify independently:** a standard-library recheck reads the paired predictions CSV. Negative results are kept.

## 4. Timeline

| When | Milestone |
|---|---|
| Nov 2026 | Re-freeze the lead 3/6 recipes (M1) and the combination (M3). Register the prospective addendum. Implement the seasonal-strength gate and pooled profiles (M2) on development cases. |
| 1–3 Dec 2026 | First prospective issue: baselines plus registered candidates for leads 1/3/6 and the unit pilot |
| Dec 2026 – Jan 2027 | Development studies for M2 (units and categories), M4 (break rule), M5 (conformal) and M6 (cold-start ABC). Each registers before fitting. |
| Feb 2027 onward | Monthly issues. Lead 3/6 outcomes start maturing in Mar and Jun 2027. |
| Nov–Dec 2027 | About 12 matured issues per horizon, enough for the first adequately sized verdicts |

## 5. Expected impact (honest)

| Area | Expected effect | Confidence |
|---|---|---|
| Company leads 3/6 (M1 + M3 + M4) | Possibly at least 15% lower WAPE; development showed 7–17% | Moderate. Needs prospective proof. |
| Product units (M2) | Gains over seasonal naive likely on short series through pooling | Moderate |
| Company lead 1 | Small gains at most from blends and break rules. A big gain needs dated tender or order data. | Low without new data |
| Intervals and ABC | Better calibration and cold-start recall, not lower point error | Moderate |

## 6. Decisions needed

1. **Adrian (model owner):** approve the prospective addendum for the leads 3/6 and unit candidates before 1 Dec 2026.
2. **Adviser:** agree that leads 3/6 and product units count toward the objective, alongside company lead 1.
3. **Source steward:** approve the disease-season product tags (M2.3).
