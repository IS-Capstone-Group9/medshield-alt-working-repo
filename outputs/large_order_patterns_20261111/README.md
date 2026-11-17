# Large-order pattern check, 11 November 2026

Offline, read-only, **retrospective**. Original itemized sales (contracts excluded, ₱638,015,351.53), 107 recorded months.
Large order = delivery document of ₱500,000 or more. The design and pass rule are in the `check.py` docstring. One label-matching
bug crashed the first run before any result was produced; it was fixed with the design unchanged.

## Why this exists

The client cannot share its order or tender list because it is commercially sensitive. This uses only past records to
describe how often large orders arrive, by recorded channel or area label (not verified buyers).

## Live pattern (gateway, current pinned Gold)

All 267 large documents reconcile to the split. Government: 154 documents, ₱143M, in 71% of the last 24 recorded months.
Hospital: 93 documents, ₱98M, 71%. Six other labels have 1–10 documents and none in the last 24 recorded months.

## Retrospective check (82 origins per label)

| Label | Large-order month rate | Brier, trailing 24 | Brier, all history | Improvement | Amount WAPE, trailing 24 / 6 |
|---|---|---|---|---|---|
| Government | 49.5% | 0.266 | 0.283 | 5.8% (rule met narrowly) | 94.7% / 89.4% |
| Hospital | 40.2% | 0.219 | 0.242 | 9.5% (met) | 93.3% / 84.3% |

A constant 50% guess scores 0.25. Government's trailing frequency is slightly worse than that, and Hospital's is slightly better.
**The frequency is a weak guide to whether a large order comes next month, and amounts are not predictable.** The dashboard
therefore presents it as "how often", for stock and cash readiness, never as a prediction or buyer commitment.
