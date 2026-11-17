# Family-level rerun, 11 November 2026

Offline, read-only, **retrospective** (every month already inspected). Original itemized sales, contracts excluded,
2020-01 to 2026-09. Grouping: candidate family mapping v1 (3,507 families, not approved). Rules are in the `run.py` docstring,
fixed before running (registration SHA-256 `bbfd7a076ba9…`; mapping hash in `results.json`). Each test ran at label and
family grain with identical rules.

| Test | Label grain | Family grain | Registered rule |
|---|---|---|---|
| ABC–XYZ: A-X value kept next year | 52% mean (4 years with A-X; 30–89%) | **82%** (all 5 years; 63–109%) | **Met**: ≥50% and better than labels |
| TSB vs mean_6, intermittent items, lead 1 | TSB 183.7% WAPE, +77% bias; mean_6 133.7% | TSB 152.2%, +18% bias; mean_6 132.3%, +1.8% bias | Not met at either grain |
| Safety stock, prior-year A items, 95% | 97.7% service, median buffer 228% of forecast | 96.2% service, median buffer 230% | Met at both grains (90–98%) |

## Readings

- **Families fix ABC–XYZ.** Steady high-value families keep most of their value year to year and the class is usable for
  stock policy. Label churn was the problem, not the method.
- **TSB still loses**, though families cut its overforecast from +77% to +18%. mean_6 at family level is nearly unbiased
  (+1.8%). Keep mean_6 for intermittent items.
- **Per-item 95% safety stock reaches its service target**, unlike the company-level test (82%), but the median buffer is
  about 2.3× the forecast. It works, but it is expensive. The buffer should be set per class (tight for A-X, review for
  A-Z) and confirmed against real stock and unit costs.

## Status

Candidate evidence only. No model, class or stock rule is activated. Approving the family mapping and having unit-level
data for the A-X families are the next gates.
