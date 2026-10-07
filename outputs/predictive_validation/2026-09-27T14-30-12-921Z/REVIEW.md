# Actual predictive evaluation — 27 September 2026

Decision: retain **last_value as an unpublished benchmark candidate**. Do not
activate operational forecasts on this evidence. This is an engineering
recommendation, not a fabricated business/model review approval.

The user attested that January 2020–December 2025 monthly submissions are complete,
citing the supplied sales data. The acceptance receipt and input manifest retain
that attribution; it is not independent completeness verification. Training was
authorized, publication was not approved. All 108 input months reconcile to
fact version 16; the selected 72-month contiguous training candidate is eligible.

## Frozen evaluation

- Training starts January 2020.
- Five quarterly development origins: December 2022 through December 2023.
- Each origin predicts leads 1–12, yielding 60 identical development keys per model.
- Final retrospective audit: December 2024 origin, January–December 2025, 12 points.
- Recipe selected using development only, before audit. The 2025 audit is explicitly
  retrospective; it is not represented as a pristine untouched holdout.
- Four benchmarks, two ETS variants and nine Prophet configurations all executed.

| Model | Development WAPE | Audit WAPE | Audit MAE (PHP) |
|---|---:|---:|---:|
| Last value | 83.20% | 37.76% | 5,834,383.00 |
| Seasonal naive | 93.90% | 72.89% | 11,261,458.43 |
| Mean 3 months | 95.13% | 59.63% | 9,212,416.36 |
| Mean 6 months | 93.51% | 68.14% | 10,526,958.88 |
| ETS without trend | 92.74% | 67.97% | 10,501,032.20 |
| ETS damped trend | 100.30% | 67.49% | 10,426,697.23 |
| Prophet configurations | 93.54–94.97% | 72.11–72.61% | 11,140,059.96–11,218,467.03 |

The selected benchmark's audit RMSE is PHP 6,956,031.72, signed bias
+PHP 1,295,235.42, normalized bias +8.38%. Its development normalized bias is
+1.26%, but that small signed average does not negate the large absolute errors.
No challenger met the frozen improvement/bias/deterioration rules. The audit did
not change selection. Do not select a Prophet configuration from its audit score.

There are only five development errors per lead, and six after including the audit.
The 20/40 per-lead support rules therefore produce **null 80/95% intervals**.
Candidate future point estimates exist for leads 1–12 but are not published.
The current 12-row display would need leads 9–20; leads 13–20 remain unsupported.

## Artifacts and execution

Final complete run:
`model-run/1a232ddd58100e6e25d2623276dc94d13587664216d831e675df5b5922e890bc/`.
Inspect `run.json`, `evaluations.json`, `predictions.json`, `folds.json`,
`model-cards.json`, `release-draft.json` and `artifact-hashes.json` together.
The earlier run in this directory predates Prophet installation and is superseded.

Environment: Python 3.13.3, Prophet 1.4.0, CmdStanPy 1.3.0, statsmodels 0.14.6,
pandas 2.3.3, NumPy 2.3.5; seed 20260927. `environment-lock.txt` records the resolved
environment. Prophet runs in `.venv-predictive`; pip's large download stalled,
so the official PyPI wheel was downloaded and SHA-256 verified before installation.

Commands run:

```powershell
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive --input outputs/predictive_validation/2026-09-27T14-30-12-921Z/input.json --output outputs/predictive_validation/2026-09-27T14-30-12-921Z/model-run
.\.venv-predictive\Scripts\python.exe -m unittest services.tests.test_predictive_coverage_review services.tests.test_predictive services.tests.test_forecast_validation
```

Python checks: **21 passed**. Gateway checks: **15 passed** using
`node --import tsx --test tests/forecast*.test.ts tests/predictiveCoverage.test.ts tests/databricksLiteral.test.ts tests/predictiveRelease.test.ts`.
Backend `tsc --noEmit` passed. This continuation changed no UI behavior; previous
browser results remain separately recorded rather than claimed as rerun.

The updated frozen input passed Databricks content readback. Initial persistence
caught Spark modifying an apostrophe in the attestation; a byte-preserving SQL
literal encoder repaired this and gained a regression test. The final
`warehouse-receipt.json` proves exact stored content, not model approval.
Candidate persistence **passed**: 1,092 forecast/backtest records and 15 evaluation
records were stored and every payload reconciled. See the final run directory's
`candidate-warehouse-receipt.json`. Warehouse experiment ID is
`experiment_810f4b4065e8dbeeb383e1b661418ae59bfb52dcb90e721162c1987d37a102c8`.
The writer did not move the model-release pointer.

## Next decision

Keep these as review evidence. Investigate the large changes in recorded revenue
and source-policy composition before further modeling. Any revised recipe must
use development evidence, preserve the already-used 2025 audit label, and ideally
be validated against newly accepted later actuals. No model was activated solely
because it was the least inaccurate candidate.
