# Source-bound diagnosis before the bounded error experiment

Assessment date: 10 October 2026, Asia/Manila. Supporting role: Data Analyst.
This document records a read-only diagnosis and proposals, not new fits,
prediction rankings, source corrections or model activation. Root owns the new
experiment, result integration and remaining acceptance decisions.

## Target, population and identity

The target remains company monthly eligible recorded net sales in PHP, including
the retained signed adjustments and financially eligible item kinds. It is not
normalized medicine quantity, unconstrained demand or territorial inventory need.
The frozen input covers 2017–2025; this diagnosis uses the same contiguous
January 2020–December 2025 modeling history as the retained experiment.

The five development origins are December 2022 and March, June, September and
December 2023. Each origin has twelve target months, producing **60
origin–target–lead cases across 24 distinct target months**. Cases overlap and
are dependent. The **12-case 2025 retrospective audit** uses December 2024 as
its origin. That audit has already been inspected and is not an untouched final
test. Historical issue-time availability vintages have not been reconstructed.

Source identity is Gold fact Delta version **20**, transformation policy
`sales_restart_gold_v7_independent_catalog`, and dataset
`b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
Training completeness inherits the user's attestation; source completeness is
not independently verified. Publication remains unapproved. The original O3
medicine quantity-by-territory objective and both numerical business error
tolerances remain open.

| Retained source artifact | SHA-256 |
|---|---|
| [Frozen monthly input](../predictive_validation/2026-10-09T13-28-48-501Z/input.json) | `04be4f529101f2117a5045d686158708e2b39d55957a3b119b22a30aa72c63ba` |
| [Financial composition](../predictive_completion_20261009/diagnosis/composition.json) | `a873c9b6d670456e3dbc1c38b03c67ed3607788ebd169b49f3696ab6b8f55dcf` |
| [Original-source review findings](../predictive_readiness_20261010/source_review/findings.json) | `79ac6a13480964f406bd2fa2680e62d69ac9a00e34088e5214987530801ea559` |

These hashes were checked again for this document. No live source was fetched.

## Sensitivity to the origin endpoint

Last value repeats the origin's monthly revenue for all twelve targets. The
table compares that endpoint with the subsequently recorded twelve-month mean.
**The later means and ratios are hindsight diagnostics, unavailable at the
origin and excluded from recipe learning.** They are not replacement forecasts.

| Origin | Endpoint PHP | Subsequent 12-month mean PHP | Endpoint / subsequent mean | Retained last-value WAPE |
|---|---:|---:|---:|---:|
| 2022-12 | 3,625,464.61 | 5,185,747.24 | 0.699 | 66.295732% |
| 2023-03 | 2,344,746.44 | 3,625,797.26 | 0.647 | 55.471544% |
| 2023-06 | 6,910,935.23 | 2,765,647.49 | 2.499 | 150.415246% |
| 2023-09 | 5,029,660.60 | 2,807,215.91 | 1.792 | 90.860778% |
| 2023-12 | 895,750.50 | 4,188,276.66 | 0.214 | 78.612910% |
| 2024-12 — audit | 16,744,970.51 | 15,449,735.09 | 1.084 | 37.763644% |

December 2023 is only **16.07%** of the other eleven months' mean in that year;
December 2024 is **5.496 times** its other-eleven-month mean. A low endpoint can
produce persistent underforecasts, while a high endpoint can produce persistent
overforecasts. June 2023, for example, starts at approximately 2.5 times the mean
of its subsequent targets and has a mean signed error of **+₱4,145,287.74**.
The benchmark's aggregate development WAPE is **83.199360%**, with monthly-case
MAE **₱3,090,470.93**. These are financial errors, not inventory losses.

Endpoint smoothing could reduce sensitivity to a temporary spike or trough.
It could also lag a sustained increase: December 2024's relatively high endpoint
is closer to the subsequently recorded 2025 average than the lower 2024 annual
average would have been. This is an explanatory comparison, not permission to
choose a smoother using 2025 outcomes. Existing three- and six-month means and
seasonal naive already performed worse than last value on the retained common
development keys. A new robust or weighted level is therefore a testable
hypothesis, not an established improvement.

## Variability and concentrated misses

Across the five observations for each calendar month in **2020–2024**, the
population coefficient of variation ranges from **29.86% for June** to **97.13%
for October**; December's is **96.43%**. Five yearly observations per month and
changing annual levels do not establish stable seasonality, disease causality
or a statistically verified regime change.

Recorded annual revenue increases from **₱50,259,319.88 in 2024** to
**₱185,396,821.04 in 2025**, or **268.88%**. The audit spans actual monthly sales
from **₱2,612,295.10** to **₱25,076,009.20** while the forecast stays at
**₱16,744,970.51**. An endpoint close to the annual mean can still miss individual
months materially.

| 2025 target | Signed error PHP: prediction minus actual | Reconciled GOVERNMENT-labelled revenue change PHP: target minus origin |
|---|---:|---:|
| March | +14,132,675.41 | −13,926,770.45 |
| April | +11,074,216.64 | −13,773,584.75 |
| November | −8,331,038.69 | +7,313,039.54 |

These three cases account for **47.9%** of the audit's total absolute error.
The GOVERNMENT-labelled changes account for **98.54%**, **124.38%** and
**87.78%** of the corresponding net changes. April exceeds 100% because other
labels offset the decline, including a **₱2,669,674.40** hospital-labelled
increase. These are reconciled accounting contributions, not proven causes.

The largest development miss is December 2023 → December 2024:
**−₱15,849,220.01**. The three largest development cases account for **21.0%**
of absolute error. Detailed cases and lead bands remain in the
[retained diagnosis](../predictive_completion_20261009/diagnosis/baseline/DIAGNOSIS.md).
WAPE is aggregate absolute error divided by aggregate absolute actual sales;
it is not accuracy or an equal-weight mean of monthly percentage errors.

## Segmentation and unanswered source questions

The composition artifact has **676 raw-area monthly groups across the 72
modeling months**, with **18 mixed raw labels**. GOVERNMENT has a group in
**71 months**, with none recorded for February 2024; its annual revenue share
ranges from **41.07% to 69.23%** during 2020–2025. All composition dimensions
reconcile to the frozen company monthly financial population.

A GOVERNMENT-labelled versus all-other recorded-revenue split could support
exploratory financial decomposition, but it is not a verified buyer/territory
hierarchy. The company input has no segment series. A future segment experiment
would need a separately bound derivation, additive reconciliation, derived-label
status and a rule distinguishing absent groups from missing reporting. It would
not supply verified medicine units. Adjusted product allocations in 2020, 2024
and 2025 further limit interpretation of SKU-level history. **Segmentation is
outside the present bounded experiment.**

The [source-owner review](../predictive_readiness_20261010/SOURCE_OWNER_REVIEW.md)
remains unanswered. Original Net CP controls reconcile the three 2025 case
months and their delivery-date × raw-area × DR groups. December 2024's
**₱3,628,365.50** raw-versus-eligible difference has an explicit bridge to
preserved invalid-identity and possible-duplicate review rows. This diagnosis
does not restore, discard or reinterpret those rows. **92.770368%** of November
2025 revenue is recorded on 29 November; whether that reflects deliveries,
booking conventions or combined entry remains unknown.

Original order, invoice, delivery and booking-date definitions, corrections,
effective dates and final allocation lineage are still required. An explanatory
variable reconstructed after a target month cannot become an origin-known
forecast input. The successful controls do not independently verify source
completeness, dates, SKU allocations or compatible quantities.

## Boundary for the new experiment

Root plans six bounded, registered recipes: five median/weighted/seasonal
variants and a conservative last-value scalar learned only from inner origins
and constrained to **[0.9, 1.1]**. The scalar is a proposed research adjustment,
not an accepted business cost policy. The provisional equal per-peso absolute
error convention does not establish that overforecasting and underforecasting
have equal business costs.

All learned quantities must use history through each outer origin, with
origin-local preprocessing and common target keys. Later target means, the
three selected audit cases and their contribution percentages are diagnostic
evidence only. Selection must use development evidence; the inspected 2025
audit remains retrospective. This document supplies no recipe ranking or result.
The new experiment is exploratory: registration before its fits cannot undo
the earlier inspection of 2025 or create an untouched assessment.

Preserve the recorded target, source eligibility and original benchmarks. Do not
remove large observations, shift dates, fabricate order/weather inputs or tune
against 2025. Any source correction needs supported evidence and the controlled
Databricks pipeline. No model activation, operational replenishment approval,
accepted 2026 actuals or measured 2026 forecast error follows from this work.

## Method and applied guidance

Read-only inline Python with `-B` loaded `target_value_decimal` as `Decimal`,
enumerated the same twelve calendar leads for each origin and recomputed each
endpoint, subsequent mean, signed-error mean and WAPE. Financial sums use the
same eligible population. CV is `100 × population standard deviation / mean`
over five same-calendar-month observations. Financial values are rounded to
cents, diagnostic ratios to three decimals and CV/contribution percentages to
two decimals; retained WAPE values retain six decimals. Composition counts,
annual sums and raw-label contributions were reconciled to the retained source
artifacts. No fitting, training imports or writes to earlier packets occurred.

Applied `.agents/worker-operating-model.md`, `.agents/execution-contract.md`
and `.agents/data-analyst.md`; reused `.skills/analytics-frameworks.md` for
common-population errors, issue-time constraints and causal limits; read and
applied `.skills/database-standards.md` for version-bound lineage, additive
reconciliation, raw-label identity and preserved review dispositions. The next
owner is root/model evaluation; independent QA must verify the new experiment's
metrics and leakage boundary separately.
