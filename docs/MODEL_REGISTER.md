# Model register

Status of every model assessed for MedShield, as of 12 November 2026. **Every model marked In use passed its
pre-registered rule; failed models are retired, not retuned.** All results are retrospective (months already inspected),
so none is future accuracy, business approval or a procurement basis. Prospective accuracy is unmeasured: the
forward-test windows for November and December 2026 lack new sales data
([runbook](../outputs/forward_test_december_2026/README.md)).

Standard win rule for forecasts: 90% block-bootstrap interval of the paired error difference below zero, absolute
normalized bias of 5% or less, and the gain present in both halves of the cases.

## In use

| Model | Purpose | Result against its rule | Where | Evidence |
|---|---|---|---|---|
| 6-month mean (mean_6) | Reference sales forecast | No challenger beat it (more than 15 tested); lead-1 WAPE 49.7%, routine sales 36.7% | Forecast page | [scorecard](../outputs/model_scorecard_20261107/README.md), [D3](../outputs/large_document_split_20261111/README.md) |
| Family ABC–XYZ (mapping v1.1) | Product classes and handling suggestions | A-X value kept 82% vs 60% for random groupings; passed | Products page (candidate, decision 015) | [family rerun](../outputs/family_rerun_20261111/README.md) |
| Per-family safety stock at 95% | Method check for stock buffers | 96.2% service (rule 90–98%); median buffer about 2.3× forecast | Not on dashboard; needs unit data | [family rerun](../outputs/family_rerun_20261111/README.md) |
| Day-20 mid-month estimate | Estimate of the current month's total | 28.8% vs 41.8% WAPE, bias −2.3%; passed | Not on dashboard; needs timely sales entry | [round 2](../outputs/accuracy_round2_20261111/README.md) |
| Large-order frequency | Stock and cash readiness, not prediction | Brier 5.8–9.5% better than all-history; narrow pass, amounts unpredictable | Forecast page | [patterns](../outputs/large_order_patterns_20261111/README.md) |

Note, 16 November 2026: the family ABC–XYZ panel was being removed from the Products page whenever the page opened, from
11 November until a fix on 16 November (a page cleanup step deleted runtime panels along with sample tables). Its
endpoint and figures were correct throughout; a browser test now covers it.

## Comparison benchmarks (in use, as comparators only)

These failed as forecasters, but their job in the evaluation is to be compared against. Each supports only the claim
listed; none is used to forecast. Evidence: [accuracy table](../outputs/model_accuracy_table_20261106/README.md).

| Benchmark | Result | Claim it supports |
|---|---|---|
| Seasonal naive | 68.6% WAPE vs 49.7% for mean_6 | Seasonality is too weak to forecast from |
| Last value, 12-month mean, 6-month median, simple combinations, routine-sales alternatives | None beat mean_6 under the win rule | The reference was not cherry-picked |
| SARIMA | 63.3–76.9% WAPE | Classical seasonal models do not beat a simple average here |
| Ridge, HistGBDT | 77.3–85.2% WAPE, the highest | Machine learning needs more history than 81 months |
| Large-order chance (long-run share since 2020; added 15 Nov) | Holdout 2024–2026: Brier 0.216 vs 0.25 coin flip; predicted 61% vs 70% observed; narrow pass | A floor for the chance of a large order next month ([profile](../outputs/large_order_profile_20261115/README.md)) |
| Large-order range (10th–90th percentile of last 24 months; added 15 Nov) | Coverage 83% (2021–2023) and 73% (2024–2026), rule 70–90%; all 15 misses above the range | A floor for next month's large-order value ([profile](../outputs/large_order_profile_20261115/README.md)) |
| Government large-order range (P1, 17 Nov) | Coverage 77.8% (2021–23) and 78.8% (2024–26), rule 70–90%; passed | Readiness amount for government tenders ([new targets](../outputs/new_prediction_targets_20261117/README.md)) |
| Late-reorder flag per area (P4, 17 Nov) | Late areas lapsed 88% vs 7%; passed, inflated by dormant labels; active-area exploratory 42% vs 7% | Candidate sales follow-up list ([new targets](../outputs/new_prediction_targets_20261117/README.md)) |

## Diagnostic rules (descriptive, no forecast claim; added 15 November 2026)

| Rule | Result | Claim it supports |
|---|---|---|
| Margin mix/rate split and yearly sales-change bridge | Exact accounting identities; family mix −17.1 pts of the −21.3 pt margin fall (2019–2025) | Why margin fell and where growth came from ([breakdowns](../outputs/diagnostic_breakdowns_20261115/README.md)) |
| Unusual-month flag (robust z ≥ 3 against the previous 12 recorded months) | 16 of 101 months flagged; 11 of 15 high months mainly large orders; December 2017 data gap | Which past months were unusual and why; not an alert ([unusual months](../outputs/unusual_months_20261115/README.md)) |
| Demand profile per product group (planning classes; 15 Nov) | Forecast error rises across classes as expected (uneven 54.3% < erratic 93.2%), but only 7 of 13 groups kept their class (53.8% vs 60% rule): failed as a planning guide | Describes how each product group behaves; half of recent sales sit in groups driven by large orders ([profile](../outputs/demand_profile_20261115/README.md)) |
| New-product early signal (sold in ≥ 3 of first 6 months) | Year-2 survival 52% vs 19%, same direction in 5 of 5 cohorts | Early repeat sales mark products more likely to last; not a calibrated forecast ([survival](../outputs/product_survival_20261115/README.md)) |

## Waiting for data

| Model | Result so far | Needs |
|---|---|---|
| Hierarchical reconciliation | No change while every level uses mean_6 | New months with different methods per level |
| Company-level 80% prediction ranges | 69–71% coverage (rule 75–85%) | New months (routine version queued as R2) |
| Unit (quantity) forecasts | 18% worse than pesos | Verified units and pack sizes |
| TSB for intermittent products | Worse than mean_6 at label and family level | New months (family version queued as R3) |

## Retired

| Model | Result | Evidence |
|---|---|---|
| Split forecast (routine plus large orders) for the total | Total not better than mean_6 at leads 1/3/6; the split itself is in use | [D3](../outputs/large_document_split_20261111/README.md) |
| Day-15 mid-month estimate | Bias −5.4%; one registered retry made it −9.6%; final | [round 2](../outputs/accuracy_round2_20261111/README.md) |
| DII and RSI as forecast inputs | No significant association with sales; RSI is used as territory context | [signal analysis](../outputs/signal_analysis_20261110/README.md) |
| Large-order readiness reserve (90th percentile of last 12 months; 15 Nov) | 69.7% coverage on 2024–2026 vs 70% rule; kept only as a user-chosen trade-off table, no default amount | [readiness](../outputs/readiness_sizing_20261115/README.md) |
| Disease link at therapeutic-category level (15 Nov) | 9 DOH diseases, 64 pre-registered tests, 0 supported after Holm (best COVID-19 → anticoagulants ρ 0.34, raw p 0.005); no category seasonal (0 of 18); sensitivity rerun with corrected mapping v0.1 unchanged (0 of 64, 0 of 19) | [category test](../outputs/category_disease_test_20261115/README.md) |
| Calendar timing of large orders (15 Nov) | Within-year permutation test p = 0.134 (rule p < 0.05) | [profile](../outputs/large_order_profile_20261115/README.md) |
| Weather-regime 80% ranges, W1 (17 Nov) | 66.1% coverage (55.2% / 75.8% by half) vs 75–85% rule; baseline 67.7% | [weather tests](../outputs/weather_prediction_tests_20261117/README.md) |
| Typhoon delivery-disruption flag, W2 (17 Nov) | 25 TY/STY events: median activity ratio 1.03, p = 0.43 (rule p < 0.05) | [weather tests](../outputs/weather_prediction_tests_20261117/README.md) |
| Large-order chance by segment and budget-cycle model, P1 (17 Nov) | Government Brier 0.261, Hospital 0.329 (rule < 0.25); calendar model worse than long-run share in all segments | [new targets](../outputs/new_prediction_targets_20261117/README.md) |
| New-product survival model, P3 (17 Nov) | AUC 0.662 (rule ≥ 0.70); predicted 31% vs 17% observed on 2023–24 cohorts | [new targets](../outputs/new_prediction_targets_20261117/README.md) |

**DII vs disease-linked medicine units** (decision 016): not testable. 4 territory-months with linked units for dengue,
0 for the other diseases (60 required). Needs generic names for brand labels and delivery locations for Government and
Hospital orders. [Test](../outputs/disease_units_test_20261112/README.md).

## Queued for re-test (registered 12 November 2026)

Retired models with a stated reason to expect a different result on unseen months. Plans are frozen; each runs once at
least 12 months after September 2026 are loaded ([queue](../outputs/retest_queue_20261112/README.md)). Status today: pending.

| Model | Change from the failed test | Pass rule |
|---|---|---|
| ETS | Fitted to routine sales instead of the total | Standard win rule vs mean_6 |
| 80% prediction ranges | Built on routine sales instead of the total | Coverage 75–85% |
| TSB | Approved families, discontinued families dropped | Standard win rule vs mean_6 |
| 4-method blend, routine sales (addendum R4) | New candidate from the exploratory search: 37.3% vs 37.8% | Standard win rule vs mean_6 |
| Growth-adjusted 6-month mean for budgeting (addendum R5) | New candidate: bias +0.4% vs −11.9% at 51.2% vs 49.4% error | Bias within ±5% and error at most 3 points above mean_6 |

R4 and R5 come from an [exploratory search](../outputs/exploration_20261112/report.html) on inspected months, where each
method choice used only errors known at the forecast date. Exploratory figures are not evidence; only the queued test on
new months can confirm them.

## Research only (shown on the dashboard, labelled "not approved")

| Model | Status |
|---|---|
| ABC classifiers (XGBoost, logistic) | Barely above the majority floor; prior-year class stays the baseline |
| Volatility-scaled ranges (PD3) | Met coverage narrowly; pre-2026 check failed; not activated |
| Unit baseline (BUPIRIGHT ampoules) | Too few cases to rank |
| External-variable regression | Joins and issue-time data not approved |

## Rules for changing this register

A retired model may get one new pre-registered attempt with a stated reason, and the outcome is final. Promotion to an
operational forecast or stock rule needs prospective evidence and business approval, neither of which exists today.
