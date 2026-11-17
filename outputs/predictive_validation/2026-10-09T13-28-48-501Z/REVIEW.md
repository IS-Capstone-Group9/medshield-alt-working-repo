# Gold 20 predictive evaluation — 9 October 2026

The fresh experiment completed all **15 configurations** against Gold fact version
**20**. The selected model remains **last value, an unpublished benchmark candidate**.
The predictions reproduce the previous fact-16 experiment exactly. This establishes
the current source binding and reproducibility; it does not improve forecast accuracy
or approve a model for operational use.

Run: `11648be69f44f87d746b45904acc01a4790bf24d348940941940f01caab7997c`.
Dataset: `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
Policy: `sales_restart_gold_v7_independent_catalog`.

## Source and evaluation scope

- The project covers January 2017–December 2025: **108 calendar months, 98 observed
  months and 10 missing targets**. Missing months remain null rather than zero.
- The evaluated contiguous candidate is January 2020–December 2025, **72 eligible
  company-month observations**. Its completeness is inherited user attestation,
  supported by unchanged source reconciliation, rather than independent verification.
  Earlier disconnected observations remain available for descriptive profiling.
- The target is financially eligible **recorded net sales in PHP**, including signed
  adjustments, at company-month grain. This does not measure medicine-unit demand,
  stock requirements or approved territory demand.
- Five development origins are December 2022, March/June/September/December 2023.
  Each predicts leads 1–12, yielding **60 common development keys per model** and
  targets ending by December 2024. Recipe selection uses development evidence only.
- The December 2024 audit origin predicts January–December 2025, **12 common audit
  keys per model**. Because 2025 was previously inspected, it remains a
  **retrospective audit**, not an untouched final test.
- The candidate future forecast fits through December 2025 and produces January–
  December 2026, leads 1–12. Those 12 points have no actuals or supported intervals.

The [source inheritance comparison](../2026-10-09T13-26-49-490Z/training-inheritance-comparison.json)
binds 108 matching monthly records across target values, source/eligible/excluded
counts, original/adjusted provenance, positive/negative values and last observed
dates. The coverage receipt preserves the prior reviewer, date and period decisions
and records the new binding separately. **Publication approval remains false**.
Adjusted source and estimated product-allocation provenance are retained; accepted
reporting categories do not verify sellable SKU identity or sales units.

## Measured results

Each model has 60 development and 12 audit predictions. Prophet represents nine
frozen configurations, not a configuration chosen from audit results.

| Model | Development WAPE | Audit WAPE | Audit MAE (PHP) |
|---|---:|---:|---:|
| Last value | 83.20% | 37.76% | 5,834,383.00 |
| Seasonal naive | 93.90% | 72.89% | 11,261,458.43 |
| Mean 3 months | 95.13% | 59.63% | 9,212,416.36 |
| Mean 6 months | 93.51% | 68.14% | 10,526,958.88 |
| ETS without trend | 92.74% | 67.97% | 10,501,032.20 |
| ETS damped trend | 100.30% | 67.49% | 10,426,697.23 |
| Prophet configurations | 93.54–94.97% | 72.11–72.61% | 11,140,059.96–11,218,467.03 |

The selected benchmark has audit RMSE **₱6,956,031.72**, signed mean error
**+₱1,295,235.42** and normalized bias **+8.38%**; positive bias means
overforecasting. Development MAE is **₱3,090,470.93** and normalized bias **+1.26%**.
WAPE is `100 × Σ|prediction − actual| / Σ|actual|`; a small signed bias does not
cancel the decision impact of large absolute errors. The smaller audit percentage
does not prove improved reliability: its much larger actual-sales denominator
coexists with a larger peso MAE.

No challenger meets the unchanged experimental development rules: at least 5%
relative WAPE improvement over the best complete benchmark, absolute normalized
bias at most 10%, and no more than 10% MAE/RMSE or critical-horizon deterioration.
These are engineering comparison rules, not an accepted business error tolerance.
There are five development errors per lead and six after including the audit;
the 20/40-error support requirements leave **80% and 95% intervals unavailable**.

## Independent numerical verification

The [numerical verification receipt](numerical-verification.json) independently
recomputes **315 metric groups** from the prediction records using decimal
arithmetic, without importing the predictive scoring implementation. All reported
MAE, RMSE, WAPE, signed bias and normalized bias agree within **₱0.000001** for
money and **0.000000001 percentage points** for rates. The groups cover overall
development/audit, common/scored development cohorts, all 12 development leads and
all five development origins for every model.

Verification also passes for:

- all eight retained artifact hashes and the input byte/semantic hashes;
- **1,092 unique complete prediction records**: 900 development, 180 audit and
  12 future points, with actuals reconciled to the frozen input;
- exact configuration, schedule, thresholds, seed and selection equality with the
  prior final run;
- all six recorded origin-specific training populations and hashes, with targets
  strictly after the respective origin;
- checked adapter source identity and its exclusion of observations after the
  origin; model selection is frozen before audit evaluation;
- exact numerical equality of all 1,092 predictions/actuals with the prior run,
  apart from their new run/source metadata;
- local run status `evaluated_unpublished`, release status `candidate` and false
  data publication approval.

This review does not query the cloud publication pointer, run further model
training or claim a deployment. Origin-local populations and adapter checks do
not prove historical issue-time availability: the source remains a revised
snapshot without availability vintages. Contract tests and live deployment checks
remain separate evidence rather than model-accuracy evidence.

The accountable worker ran the offline job successfully in **41.52 seconds**;
[`evaluation.log`](evaluation.log) retains the completed run ID and status. The
fresh [`contract-tests.log`](contract-tests.log) records **21 passed tests** in
4.213 seconds. These logs were inspected during this supporting review, rather
than represented as another execution by the reviewer.

## Next bounded steps

1. Use this version-bound experiment and its errors as the predictive Chapter 4
   result. Preserve the prior fact-16 experiment as historical evidence.
2. Reconcile the largest GOVERNMENT-labelled movements against original invoice/
   order dates and source preparation records. The [previous diagnosis](../2026-09-27T14-30-12-921Z/diagnosis/FINDINGS.md)
   remains relevant because the targets are unchanged; its accounting contributions
   do not establish contract timing or disease causation. Do not remove large
   observations merely because models miss them.
3. Define acceptable peso error and over/underforecast consequences for the
   financial planning decision. Any changed recipe must be frozen using
   development evidence and evaluated against later untouched accepted actuals.
   Reusing inspected 2025 cannot create a fresh final test.
4. Ingest and validate later 2026 actuals through the controlled sales pipeline,
   with explicit period closure, completeness and source provenance. In October
   2026, a December 2025 origin makes the current month **lead 10**; a 12-month
   October 2026–September 2027 display requires **leads 10–21**. Existing candidate
   outputs support only leads 1–12. Future-year software support cannot substitute
   for current observations or separately validated longer leads.
5. Review the resulting scoped data/model release before warehouse publication.
   Medicine-unit forecasts additionally require SKU/pack/unit and territory
   evidence. Disease/weather models require reviewed mappings, issue-time feature
   availability and incremental evaluation on the same target keys. Revenue
   forecasts cannot supply missing inventory quantities or authorize procurement.

Skills applied: repository analytics frameworks for temporal comparisons and
evidence limits; database standards for source/grain/hash reconciliation; business
analysis frameworks for decision/target boundaries; documentation standards for
an actionable evidence handoff. Canonical definitions and operations remain in
[`BUSINESS_DEFINITIONS.md`](../../../docs/BUSINESS_DEFINITIONS.md) and
[`PREDICTIVE_OPERATIONS.md`](../../../docs/PREDICTIVE_OPERATIONS.md).
