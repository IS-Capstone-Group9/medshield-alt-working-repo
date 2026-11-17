# Refined-objective experiment register — checklist item 3.1

**Status: PROPOSED draft, 6 November 2026.** Names the experiments proposed for reporting under SO2/SO3. Every row is a **historical, retrospective evaluation**, not operational forecast approval, and all outcome windows have already been inspected. Not adviser-approved. Scope: [scope sheet](REFINED_OBJECTIVE_SCOPE_SHEET.md).

Windows for PHP forecasts: development 19 / audit 7 / inspected extension 4 cases per lead. Metrics: WAPE = error ÷ total absolute actuals (percentage, **not** percent correct); MAE in ampoules for the unit pilot; ABC accuracy/macro-F1/A-recall as fractions.

## Included

| ID | Target / unit | Leads | Baselines | Candidates | Reported result | Evidence |
|---|---|---|---|---|---|---|
| E1 | Company PHP | 1, 3, 6 | mean_3, mean_6, seasonal_naive, last value | frozen tournament choice; recent level + seasonal effect; seasonal drift | Dev WAPE 71.66% / 103.15% / 101.46% (frozen choice); no candidate passed the development guard | [validation](../outputs/local_data_model_validation_20261105/README.md), [comparison](../outputs/model_error_comparison_20261105/README.md) |
| E2 | CALABARZON PHP | 1, 3, 6 | mean_3, mean_6, seasonal_naive | frozen choice (incl. ridge_direct_a10); recent level + seasonal effect | Dev WAPE 22.19% / 21.43% / 21.93%; no candidate passed the guard | same |
| E3 | Financial ABC class | label partitions: validation 2024, test 2025, partial 2026 | prior-year class (prior_abc); majority class | three-year balanced logistic; two fixed XGBoost recipes (depth variants, fit on labels through 2024) | prior_abc retained: validation accuracy 60.24%, macro-F1 0.537, A detected 6/11; XGBoost does not displace it | [XGBoost extension](../outputs/so2_closeout_20261102/README.md) |
| E4 | BUPIRIGHT 4 mL ampoules, HOSPITAL (units) | 1, 3 | last_value, mean_3, mean_6, seasonal_naive_12 | recent level + seasonal effect | seasonal_naive_12 lowest MAE (13.17 at lead 1, 6 cases; 9.75 at lead 3, 4 cases); candidate worse | comparison packet above |
| E5 | STL decomposition | monthly | n/a (descriptive) | eligible observed series only | Weak/no stable seasonality for company, Quezon, Batangas, Cavite Province | [seasonality audit](../outputs/objective_model_assessment_20261106/README.md) |

## Excluded or unavailable (documented, not reported as results)

| Scope | Reason |
|---|---|
| MIMAROPA, Bicol PHP | 56/81 and 38/81 eligible months; no defensible complete window |
| External-variable models (DOH/PAGASA/NASA, surge) | Reviewed joins and issue-time vintages pending; fixture metrics show workflow behaviour only |
| Territory-wide medicine-unit forecasts | No verified item/pack mappings or scoped quantity history |
| Prospective issuances | Not required for the historical objective; never backdated |
| Further model variants (grouped, component, occurrence, feature studies) | Registered studies retained in `outputs/` as supplementary negative findings; **not** required for reporting |

## Validity controls (checked in retained evidence)

Time-ordered origins; scalers/coefficients fit on training windows only; origin-only seasonal scales; common-case comparison tables; independent recomputation (29,876 checks on 5 Nov). Results do not establish future accuracy, and no selected model's advantage over seasonal naive is distinguishable from noise in case-level bootstrap (6 Nov assessment).

## Open items before this register is final

Adviser confirmation of which rows are reported (0.1); item 3.2 sign-off by model lead + QA; resolve whether the Prophet run (24 Oct only) is reported or excluded.

## Registered development extension — 6 November 2026 (PD0 / bounded PD2)

Separate from the proposed E1–E5 reporting set: [PD0 measurement and PD2 packet](../outputs/improvement_step4_20261106/README.md) freezes input/implementation hashes before scoring one fixed growth-adjusted trailing-total recipe for BATANGAS and QUEZON at 6/12-month horizons. All outcomes were already inspected. No estimator was fitted or model activated; none of the four cells passed its registered rule, so references stay unchanged. A lower point WAPE in one cell is not an accepted accuracy improvement.

Twenty-one helper/registration tests and 1,336 separate Decimal/window/metric/bootstrap checks passed under self-review. The [target decision packet](../outputs/improvement_step4_20261106/TARGET_DECISION.md) separates the existing itemized default from unreviewed all-recorded sensitivity. Fresh all-recorded case scoring is not verified because its controlled monthly inputs were not retained. [Running programme ledger](../outputs/improvement_step4_20261106/experiment_ledger.json) counts one new recipe and four evaluated cells; it does not claim a complete count of all historical experiments. No adviser inclusion, D1/D2/D3 decision, source correction or publication approval is inferred.

## Registered development extension — 6 November 2026 (PD3)

One pre-registered volatility-scaled interval method was evaluated on the same 15 series/lead definitions with frozen point references. [PD3 packet](../outputs/volatility_intervals_20261106/README.md): primary aggregate guard passes narrowly (75.7081% mean coverage, 12/15 cells in band), but pre-2026 sensitivity fails (11/15). Relative widths increase; company lead 6 and two other lead-6 cells remain undercovered. No uniform or prospective calibration, point-accuracy improvement, runtime activation, adviser inclusion or publication approval is claimed. All outcomes were already inspected; stop after this one attempt.

Twenty-nine tests and 5,593 separate Decimal checks pass under same-agent self-review. [Latest cumulative programme ledger](../outputs/volatility_intervals_20261106/experiment_ledger.json) carries forward the earlier immutable snapshot: two new recipes, 19 cell evaluations, zero point-estimator fits. PD2's four cell decisions and PD3's single aggregate study decision have different denominators and are not interchangeable model wins. Base-series/all-recorded extensions remain input/target-gated. Original 12.5/33 = 37.9% and proposed delivery-credit/adviser statuses are unchanged.
