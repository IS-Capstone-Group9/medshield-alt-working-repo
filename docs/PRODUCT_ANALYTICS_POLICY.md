# Product analytical routing policy

Prepared and locally verified 17 October 2026. **Proposed offline policy**, not
a replacement for approved business definitions, a deployed Gold contract, an
automatic model selection or a declaration of clinically optimal inventory.
The user requests useful logic for each product; the implementation chooses the
strongest supported interpretation without inventing package or sales units.

Implementation: [pure policy](../services/analytics_service/product_analytics_policy.py),
[offline adapter](../services/analytics_service/jobs/build_product_analytics_policy.py),
[verification and all-product routes](../outputs/product_analytics_policy_20261017/README.md).
The product-master guide and product-review rules remain authoritative for
identity/unit decisions. No dashboard request reads the generated local JSON.

## Decision order for every product

1. **Preserve identity and source evidence.** Keep exact source-label group,
   source reference, recorded values and adjusted-source counts. Keep brand,
   strength, form, container and presentation separate unless independently
   approved as exact aliases. Prices and matching text do not prove an identity.
2. **Keep usable financial reporting.** Approved financial eligibility allows
   recorded net-sales reporting even when the physical unit is unknown. Preserve
   signed adjustments; use the identical margin-eligible rows for gross profit
   and revenue. Operating expenses are absent, so do not report company net
   profit. This policy routes analyses; it does not recompute the source ledger.
3. **Interpret the category.** Medicine reporting does not establish clinical
   need. Supplies represent fulfilled sales, not consumption. Equipment may be
   project-driven. Keep nonmedical revenue separate from medicine forecasting;
   retain Unclassified financial contribution while its category is unresolved.
   An approved service can have defined service counts but not physical stock.
4. **Restrict physical quantity.** Require separately approved sellable identity,
   sales unit, resolved category, physical item kind, forecast suitability and
   historical quantity evidence. A title naming Box remains a clue until the
   historical Qty meaning is supported. No default pack count, automatic
   conversion or cross-product quantity total. A consistent box series can
   remain boxes; conversion requires its own reviewed contract when needed.
5. **Check calendar coverage at each accepted origin.** Require a monthly row
   and approved coverage for every month from the supplied series start through
   origin. Missing/null/nonfinite values remain unknown; no zero fill. Explicit
   observed zero is allowed only with approved coverage. Reject duplicates,
   negative signed quantities needing adjustment review, post-origin values and
   stale series ending before origin. Product lifespan before the series start
   and sales completeness still require owner review; row presence proves neither.
6. **Propose a model comparison only after those checks.** The result is a
   candidate list and reason, never a fitted model or winner. Recompute screening
   features with training data available at each evaluation origin.
7. **Separate geography, external features and action.** Territory requires its
   reviewed mapping, including visible unmapped amounts. Disease/weather joins
   require approved geographic/time keys and features available at issue time.
   Do not infer urgency, therapeutic class, stockouts or expiry from a name.
   Replenishment additionally requires verified inventory, supplier, lead-time,
   expiry and accepted model/planning contracts.

## Proposed model-screening rules

These are explicit conservative engineering heuristics, **not empirically best
thresholds or client-approved limits**. They do not replace retained model/data
acceptance requirements. Changing them requires a new policy version and
development validation before any untouched final test is inspected.

| Supported input pattern | Offline screening output |
|---|---|
| Unknown identity/unit/coverage or unresolved signed quantity | Financial/source-unit descriptive review; no physical model candidates |
| All observed quantities zero | Descriptive observed-zero history; no automatic procurement or positive forecast |
| Fewer than24 complete monthly observations | Short-history review under this proposed policy; no newly routed model comparison |
| At least24 months, under50% explicit zero months | Compare last value, recent means3/6, simple exponential smoothing and damped ETS |
| At least24 months, at least50% explicit zero months, some positive sales | Compare transparent baselines/smoothing with Croston-SBA and TSB candidates |
| At least36 months | Also consider seasonal-naive12, seasonal ETS and seasonal ARIMA; this does not assert seasonality or select a seasonal winner |

Intermittent methods are candidates because they address a different observation
pattern; they are not proven winners for MedShield. Baselines must remain in the
comparison. Source-label PHP forecasting remains a separate target and needs its
own financial monthly series/evaluation; unknown physical units alone do not
invalidate the existing company-PHP research. This adapter does not fit new
product-revenue models either.

## Evaluation and output contract

Specify target, consistent unit, mapped scope, source/version, accepted issue
date/origin, actual calendar leads and period coverage before fitting. Use common
origin/target/lead cases for every candidate. Fit preprocessing within each
training origin. Choose models/tuning on development evidence, freeze decisions,
then evaluate on untouched final cases. The already-inspected2025 company audit
cannot become a new untouched test through relabelling. New annual actuals can
evaluate previously frozen forecasts when available.

Report MAE and RMSE in the actual target unit (PHP only for revenue), WAPE as
`100 × sum(abs(prediction − actual)) / sum(abs(actual))`, and signed bias as
`mean(prediction − actual)` with positive meaning overestimate. When the WAPE
denominator is zero return unavailable, not zero percent. Preserve observed
zero cases in absolute error measures. MAPE is unsuitable as the sole metric
with zero/near-zero months. MASE requires an origin-training-only scale and a
nonzero denominator; compare the actual same-holdout baseline independently.
Report interval coverage only when intervals and matching actuals exist.

If too few evaluable cases, a candidate fails, or its performance does not support
the intended use, retain that limitation and do not publish it automatically.
An asymmetric over/underforecast objective needs a recorded business cost
decision; no fixed direction is universally best. No10% error guarantee is made.
Forecasts of fulfilled sales do not establish unmet demand or stockout reductions.

Every emitted route includes source key/label/category, original financial and
review evidence, permitted/conditional analyses, quantity blockers, optional
series profile and candidate methods, external/planning limitations, review
priority and next action. All routes keep publication/activation false.
Financial review priority sorts positive recorded **net** sales descending with
stable key ties; zero/negative labels remain visible. This is not the positive-
sales denominator used by observed ABC, clinical priority or an ML classifier.

## Data and deployment boundary

The first population run uses the sealed16 October all-product assessment:
archive Gold fact17 plus its bound current preparation master, not a fresh
fact20 extraction. All4,561 archived source-label groups are retained, including
zero/negative groups; this differs from the currently served4,491-label financial
population and must not replace it. The exact category counts/identities and
blocked-route totals live in the generated summary. No automatic alias matching
or archived-to-current key reconciliation was performed.

Before gateway/Gold integration, a data engineer must bind the policy to the
current Gold input contract, verify current keys and approval/evidence fields,
reconcile financial/coverage consumers and test source-unavailable behavior.
Preparation does not grant model publication, category/quantity approval or
permission to replace runtime values with local files. Existing company-PHP
forecasts, UI, warehouse, masters and Supabase remain unchanged by this work.

## Method references

Forecast accuracy must be evaluated on observations excluded from fitting;
rolling-origin comparisons preserve temporal ordering. See the authors'
[forecast accuracy guidance](https://otexts.com/fpp3/accuracy.html) and
[forecasting toolbox/time-series cross-validation](https://otexts.com/fpp3/toolbox.html).
For the motivation for intermittent candidates, see Teunter, Syntetos and Babai,
[Intermittent demand: Linking forecasting to inventory obsolescence](https://doi.org/10.1016/j.ejor.2011.05.018).
These sources motivate evaluation/candidates, not this policy's24/36-month or50%
screening cutoffs or a MedShield performance claim.

## Current-Gold assessment — 17 October 2026

The [fresh readiness packet](../outputs/analytical_readiness_20261017/README.md)
now verifies current fact20 key/count alignment with archive17. It does not make
the archived route output a live adapter: all independent unit/item-kind/forecast
review states and observation/evidence contracts must still be carried explicitly.
Current fact lacks unit_status/item_kind_status/forecast_status. Current financial
cohort4491 and complete review population4561 remain separate, with70 keys having
no eligible financial rows. Product/medical/external approvals remain open;
current-Gold adapter/approval bridge is the next implementation task, not yet
deployed. No model was trained or physical quantity converted by the assessment.
