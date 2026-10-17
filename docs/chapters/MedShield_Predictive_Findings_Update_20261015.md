# MedShield predictive findings and limitations update

Prepared 15 October 2026, Asia/Manila. Accountable role: Technical Writer, with
separate numerical and claim reviews. This is a research supplement for client
discussion and Chapters 4–5. It adds the later error-reduction results and guided
research decisions to the [10 October predictive draft](MedShield_Predictive_Chapter_4_5_Research_Draft_20261010.md).
The earlier Markdown and Word drafts retain their dated contents; integration
into the complete institutional manuscript remains a separate writing task.

## Client findings

MedShield completed the original comparison of 21 company-revenue forecasting
configurations and a separate experiment with six additional error-reduction
recipes. The results support a reproducible discussion of recorded sales and
forecast errors. They do not yet establish dependable operational forecasts.
The original last-value research reference remains unchanged and unpublished.
The six later trials do not replace that selection. [1, 2]

On the already inspected January–December 2025 audit, the last-value reference
missed by an average **₱5,834,383.00 per month**, with **37.763644% WAPE**. The
unselected calibration trial recorded **₱5,772,569.95 MAE** and **37.363553% WAPE**.
Its improvement was modest. The 12-month median, which won the new development
comparison, deteriorated substantially in the audit. None of these results
achieved the proposed **10% WAPE research goal**. [2, 3]

The user selected both sales-outlook review and revenue-budget discussions as
the intended research use. The client can use the comparison to understand
historical forecast misses and discuss planning assumptions. Measured client
benefits, dependable budget commitments and operational use have not been
established. [3]

## Chapter 4: results

### Target, source and available evidence

The target is monthly company **eligible recorded Net CP/net-sales value in
Philippine pesos**, grouped by the source's **Date Delivered** field. Signed
adjustments and financially eligible item kinds are retained. Revenue is
separate from verified medicine quantities, total market demand, cash
collections and company net profit. [1, 3]

The frozen input is dataset
`b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`,
Gold fact Delta version **20**, policy
`sales_restart_gold_v7_independent_catalog`. The wider source contains 37,728
records over 2017–2025; modeling uses the contiguous **72 months, January
2020–December 2025**. This extends beyond the paper's earlier 2021–2025 window
and requires consistent explanation during full-manuscript integration. [1, 3]

On 15 October, the user reported that MedShield sales files are the only
available evidence and original delivery receipts are unavailable to this study.
Physical delivery events and source completeness were therefore not
independently verified. The inherited training-only completeness attestation is
preserved. Within-source CSV financial reconciliations for March, April and
November 2025 agree with the eligible Net CP controls; this does not establish
independent event authenticity, original SKU quantities or the causes of those
months' movements. December 2024 retains its separate documented exclusions.
Unconfirmed causes remain unknown, and no recorded dates or unusual sales
amounts were changed to improve model scores. [3, 4]

### Evaluation and measures

Five development origins—December 2022 and March, June, September and December
2023—supply 60 origin–target cases for calendar leads 1–12. Those cases cover
24 distinct target months, January 2023–December 2024. The separate audit uses
a December 2024 data cutoff and 12 January–December 2025 targets. The groups
overlap and are not independent samples. Historical source availability at each
issue date remains unverified. [1, 2, 3]

The audit had already been inspected before the later recipes were designed.
The new experiment froze its development choice before calculating its new
audit scores, but this does not restore an untouched final test. Original
experimental criteria and the original selection remain intact. [2]

For matched actuals y and predictions ŷ, let e = ŷ − y. **MAE** is
Σ|e|/n; **WAPE** is 100 × Σ|e|/Σ|y|; **normalized signed bias** is
100 × Σe/Σ|y|. Positive bias means net overforecasting. MAE and WAPE share
the same absolute-error numerator on the same cases. WAPE is an error ratio;
100 minus WAPE is not an accuracy score. Neither measure caps each month's
miss. No matched cases leaves the measures unavailable; a zero absolute-actual
denominator leaves percentage measures unavailable. [3]

### Separate bounded error-reduction experiment

The original 21 configurations comprise four benchmarks, two ETS, nine Prophet,
two SARIMA and four ridge-regression recipes. The six later recipes below are
an additional exploratory experiment. The retained last-value points provide
its common reference; they are not a seventh new recipe. [1, 2]

Table F1. Cumulative leads 1–12 on common cases: 60 development cases and 12
retrospective-audit cases per row. PHP values are MAE; percentages are WAPE.

| Recipe | Development MAE/PHP | Development WAPE/% | 2025 audit MAE/PHP | 2025 audit WAPE/% |
|---|---:|---:|---:|---:|
| Last-value reference | 3,090,470.93 | 83.199360 | 5,834,383.00 | 37.763644 |
| Median 3 months | 3,285,721.75 | 88.455757 | 12,489,155.88 | 80.837346 |
| Median 6 months | 2,880,858.36 | 77.556326 | 12,184,140.75 | 78.863105 |
| Median 12 months | 2,320,959.94 | 62.483157 | 12,657,516.49 | 81.927078 |
| Weighted median 6 months | 3,023,795.65 | 81.404378 | 12,489,155.88 | 80.837346 |
| Seasonal median shrinkage | 2,764,291.00 | 74.418186 | 11,699,027.54 | 75.723159 |
| Bounded last-value calibration | 2,907,027.78 | 78.260840 | 5,772,569.95 | 37.363553 |

The frozen new development winner, median 12, reduced development MAE by
**24.899473%**, but increased audit MAE by **116.946959%**. Its audit normalized
bias was **−81.694163%**, showing substantial net underforecasting. These mixed
results do not support activating the development winner. [2]

Calibration reduced full-audit MAE by **₱61,813.06 per scored month**, a
**1.059462% relative reduction**. WAPE declined by **0.400091 percentage
points**. Its audit normalized bias was **−2.454810%**, compared with
**+8.383545%** for last value. A small net bias can conceal opposing large
misses; the calibration remains an unselected exploratory trial. [2]

### Cumulative forecast leads

The user selected reporting for all cumulative lead groups. Leads are counted
from each historical data cutoff, not from today's date or from the number of
months displayed on a dashboard. [3]

| Group | Development cases / distinct targets | Development target coverage | Audit cases / distinct targets | Audit target coverage |
|---|---:|---|---:|---|
| 1–3 | 15 / 15 | January 2023–March 2024 | 3 / 3 | January–March 2025 |
| 1–6 | 30 / 18 | January 2023–June 2024 | 6 / 6 | January–June 2025 |
| 1–12 | 60 / 24 | January 2023–December 2024 | 12 / 12 | January–December 2025 |

Table F2. Audit lead groups for the research reference, unselected calibration
and new development winner. Cases and distinct counts above apply to each of
the six new recipes and reference.

| Recipe | Leads | n | MAE/PHP | WAPE/% | Normalized bias/% |
|---|---|---:|---:|---:|---:|
| Last-value reference | 1–3 | 3 | 5,946,519.14 | 55.068259 | 55.068259 |
| Last-value reference | 1–6 | 6 | 5,895,422.98 | 47.560869 | 35.088755 |
| Last-value reference | 1–12 | 12 | 5,834,383.00 | 37.763644 | 8.383545 |
| Bounded calibration | 1–3 | 3 | 5,141,101.24 | 47.609616 | 39.561433 |
| Bounded calibration | 1–6 | 6 | 5,213,631.19 | 42.060567 | 21.579880 |
| Bounded calibration | 1–12 | 12 | 5,772,569.95 | 37.363553 | −2.454810 |
| Median 12 months | 1–3 | 3 | 8,114,186.87 | 75.142135 | −73.809177 |
| Median 12 months | 1–6 | 6 | 9,639,298.54 | 77.764296 | −77.183688 |
| Median 12 months | 1–12 | 12 | 12,657,516.49 | 81.927078 | −81.694163 |

Do not add the nested groups or interpret them as separate independent
confirmations. Each group uses its own denominator, so the full-year peso
equivalent of a research goal must not be copied to shorter groups. The
[writing verification record](../../outputs/predictive_findings_20261015/verification.json)
retains recomputed summaries for every recipe in both stages and all three
groups; the complete experiment remains the underlying evidence. [2, 3]

## Chapter 5: discussion, limitations and conclusion

### What the comparison means for the client

The bounded experiment shows that reducing error during development did not
ensure improvement in the inspected audit. More complex or newly optimized
recipes cannot be described as dependable simply because a development score
is lower. The conclusion is specific to these recipes, data and historical
origins, rather than a rejection of any model family. [1, 2]

On 15 October, the user endorsed **10% WAPE as a proposed research goal**. On
the full 2025 cohort only, its cent-rounded monthly MAE equivalent is
**₱1,544,973.51**, using total absolute actuals of **₱185,396,821.04** over 12
targets. This is a project discussion choice, not an industry standard, proven
affordable loss, achieved result or guaranteed attainable score. Actual
business maximum MAE and WAPE remain unset, so business error acceptance remains
**not_assessed_thresholds_missing**. The proposal does not change the frozen
experimental gates. [3]

The provisional 1:1 over/underforecast absolute-loss weights remain a research
convention. Revenue errors do not establish stockout costs, excess inventory,
expiry losses or the relative cost of the two directions. The current evidence
does not justify deliberately raising or lowering the forecasts. [3]

### Limitations to carry into the paper

The sales-only source restriction limits external verification: delivery
receipts are unavailable, source completeness is not independently verified,
and unusual-month explanations remain unconfirmed. Original/adjusted product
provenance and unresolved SKU/unit/territory mappings prevent company PHP
forecasts from becoming verified medicine-unit demand. These limitations do
not justify deleting spikes or shifting recorded dates. [3, 4]

The revised historical snapshot does not reconstruct historical information
vintages. Development folds overlap, the audit is already inspected, and
lead-specific support is sparse. Unsupported uncertainty bands remain
unavailable. Smaller WAPE on one cohort than another does not establish greater
future reliability when actual-sales denominators and coverage differ. [1, 2]

The retained 2026 research projections were generated **10 October 2026** from
a December 2025 data cutoff. January–September had elapsed, October was current
and November–December were future at generation. No accepted 2026 sales
actuals or measured 2026 errors are present. The six later trial recipes did
not generate new 2026 projections. These records are not forecasts issued in
December 2025, and their full-year scoring later would not establish a full
year of prospective accuracy. [2, 5]

No disease/weather increment, verified medicine demand, improved procurement,
reduced expiry or measured business benefit is established by this sales-only
comparison. Operational forecasting, original O3, inventory/supplier/lead-time
and expiry inputs, publication and formal academic acceptance retain their
separate requirements. [1, 3]

### Conclusion and practical next work

MedShield has completed a reproducible company-revenue research comparison
and a bounded error-reduction experiment. It reports peso and percentage
errors together and preserves unsuccessful outcomes. The original last-value
research reference remains unchanged. The new development winner deteriorates
in the inspected audit, and calibration offers only a modest retrospective
improvement. No operational model activation follows from these results. [1, 2]

Use this supplement with the original predictive draft to integrate the later
findings, client-use choices and source limitations into Chapters 4–5. Align
the methodology's modeling period, intended target and evidence labels. The
writing owner must still combine descriptive, system and scenario findings
and apply the institution's numbering/citation requirements to the complete
manuscript. This supplement is not formal manuscript acceptance. [3, 6]

For later confirmation, register candidate identities, issue dates, source
availability, target periods, adequate calendar leads and scoring rules before
inspecting the actuals used for confirmation. Preserve existing projections
and their genuine issue timing. When accepted annual records become available,
reconcile them through the controlled pipeline; distinguish retrospective
scoring from genuine prospective evidence. Source release dates and future
confirmation dates remain unset. [3, 5]

## Local evidence references

1. [Original 21-model research delivery](../../outputs/predictive_completion_20261009/README.md).
2. [Six-recipe experiment and complete results](../../outputs/predictive_error_optimization_20261010/RESULTS.md).
3. [Current client decision brief](../PREDICTIVE_CLIENT_DECISION_BRIEF.md) and [objective/evidence register](../OBJECTIVE_EVIDENCE_REGISTER.md).
4. [Sales-only clarification](../../outputs/predictive_delivery_review_20261015/sales-only-clarification.json) and [retained source findings](../../outputs/predictive_readiness_20261010/source_review/findings.json).
5. [Annual research projections and verification](../../outputs/predictive_annual_release_20261010/README.md).
6. [Paper revision guide](../PAPER_REVISION_GUIDE.md) and [Chapter 4–5 evidence plan](../CHAPTER_4_5_EVIDENCE_PLAN.md).
