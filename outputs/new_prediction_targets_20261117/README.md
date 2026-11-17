# New prediction targets P1, P3, P4 — 17 November 2026

Offline, read-only, retrospective (`run.py`). Rules were fixed in the docstring before the first run (SHA-256 prefix
`f120fc7b9376`, recorded before execution and matched in `results.json`). The first execution stopped at the JSON save
(numpy booleans). The fix changed only serialization; rules and calculations are unchanged. Candidate evidence:
nothing here activates a forecast or authorizes a purchase. The day-20 month-end estimate (target 2) already passed in
`accuracy_round2_20261111` and needs dashboard work only.

## Summary

| Target | Result | Use |
|---|---|---|
| P1 large-order **chance** by segment | Failed for Government and Hospital; Other passes trivially (no large orders in the test period) | Keep company-level floor only |
| P1 large-order **size range**, Government | **Passed** (coverage 77.8% / 78.8%, rule 70–90%) | Candidate readiness range for government tenders |
| P1 budget-cycle (calendar) model | **Not supported** in any segment | Tender timing is not calendar-predictable |
| P3 new-product survival model | **Failed** (AUC 0.66 vs 0.70; over-predicts 31% vs 17% observed) | Show survival rates by early activity as description only |
| P4 late-reorder flag | **Passed** (88% vs 7% lapse), but inflated by long-dormant areas; active-area sensitivity 42% vs 7% | Candidate follow-up list, with caveat |

## P1. Large orders by buyer segment

| Segment | Months with a large order 2020–26 | Chosen | Test Brier (rule < 0.25) | Predicted vs observed | Size coverage dev / test |
|---|---|---|---|---|---|
| Government | 58% | Long-run share | 0.261 | 55% vs 52% | **77.8% / 78.8%: pass** |
| Hospital | 36% | Long-run share | 0.329 | 24% vs 58% | 88.9% / 66.7%: fail |
| Other | 6% | Long-run share | 0.007 | 8% vs 0% | 88.9% / 100%: fail |

- **Government:** large orders come in about half of all months, close to a coin flip, so the chance is not predictable
  beyond that. The **size range** (10th–90th percentile of the last 24 months) is reliable. It is a usable "how much to
  be ready for" estimate.
- **Hospital:** large hospital orders became much more frequent in 2024–2026 (58% of months vs 24% expected). The past
  did not predict this shift.
- **Budget cycle:** the same-calendar-month model was worse than the long-run share everywhere. Government tenders are
  not tied to fixed calendar months in this data.

## P3. New-product survival (1,519 new families: 766 trained on 2020–22, 753 tested on 2023–24)

The model failed. AUC was 0.662 (rule ≥ 0.70) and it predicted 31% survival when 17% was observed. The 2023 cohort
(about twice the usual number of new labels, likely including relabels) made the test period very different from training.

The underlying pattern is still strong and monotone, which makes it useful as a **description**:

| Months sold in first 6 | Families | Still selling in year 2 |
|---|---|---|
| 1 | 1,034 | 16% |
| 2 | 273 | 30% |
| 3 | 118 | 42% |
| 4 | 60 | 57% |
| 5 | 18 | 72% |
| 6 | 16 | 81% |

## P4. Areas late to reorder

At each month end (2022-01 to 2026-08), an area was late if the days since its last order exceeded the 80th percentile of
its usual gaps. Outcome: no order in the next 30 days.

- **Pre-registered result: passed.** Late areas: 88.3% lapsed (393 of 445). Not late: 6.7% (19 of 283). p < 0.001.
- **Caveat:** most late cases are province labels that stopped ordering years ago (Cavite, Laguna, Camarines Sur/Norte:
  1,000+ days). The flag partly says "areas that stopped stay stopped". Province labels largely disappear after about
  2023, which may be a **recording change** (sales booked under GOVERNMENT/HOSPITAL) rather than lost customers. This needs
  client confirmation.
- **Exploratory sensitivity** (not pre-registered; only areas that ordered in the previous 90 days, 11 areas): late
  42.2% vs 6.7%, still about 6× more likely to lapse, but below the 50% bar. No active area was late at 2026-08-31.

## Recommended dashboard use

1. Day-20 month-end estimate on the Forecast page (already passed).
2. Government large-order size range as a readiness amount next to the existing large-order panel.
3. Late-reorder follow-up list (areas active in the last 90 days), labelled as a candidate with the 42% vs 7% evidence.
4. New-product survival table by early activity (description, not a model).

## Limits

There is no customer identity, only area labels and segments derived from them. Possible relabelling affects the 2023
new families and the dormant province labels. The analysis is retrospective, covering months up to 2026-09.
