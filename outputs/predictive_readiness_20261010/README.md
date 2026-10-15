# Predictive continuation assessment — 10 October 2026

Accountable role: Data Analyst. Guidance applied: repository worker operating
model and execution contract; Data Analyst role; analytics frameworks, testing
standards and database standards. A second analyst independently reviewed the
next modeling step. The follow-up includes an executed read-only Gold check,
a local source audit and independent numerical QA. No new models, warehouse
writes or publication decisions occurred today.

## Decision and supported target

Continue predictive research on **recorded company monthly net sales in PHP**.
The existing comparison already evaluates 21 configurations: four benchmarks,
two ETS, nine Prophet, two SARIMA and four ridge recipes. The original medicine
quantity/territory forecast requires reviewed SKU, pack, unit and geography
identities and remains a separate evidence requirement.

The [9 October delivery](../predictive_completion_20261009/README.md) retains
the model results, independent QA and candidate-storage receipts. Last value
remains selected; no challenger qualifies under the frozen development rules.
Its retrospective 2025 WAPE is **37.76%** and monthly MAE is **₱5,834,383.00**.
WAPE is total absolute error divided by total actual sales; it is not an equal
weight average of monthly percentage errors. Development WAPE is **83.20%**.
These measured errors are research evidence, not business acceptance.

## Executed continuation

The [source audit](source_review/REPORT.md) passes 30 checks. March, April and
November 2025 original Net CP totals and delivery-date × area × DR Net CP groups
match the adjusted source and eligible fact-20 revenue exactly. This conclusion
is specific to recorded net sales; it does not assert equivalent original cost,
margin, SKU or quantity populations.

December 2024's raw-versus-eligible revenue difference of **₱3,628,365.50** has an
exact bridge: 17 invalid-identity review rows worth ₱3,621,045.50 and three
possible-duplicate review rows worth ₱7,320.00. These review records remain
preserved outside Gold; this work changes no dispositions. In November 2025,
**92.770368%** of eligible monthly sales is recorded on **29 November**, a
specific source-owner timing question rather than a confirmed explanation.

[Independent QA](qa/verification.json) passes **302 checks** using a standalone
Decimal/CSV/date parser, without canonical notebook, model or cloud imports.
It reconstructs the nine-file dataset identity, checks all nine annual counts,
observed months and net-sales totals, and independently reproduces the four
case populations, margins and original-control bridges. The historical 2025
preparation stage has 4,570 rows versus 4,544 final records; an exact final
allocated-line mapping remains unresolved.

The requesting user reports **no confirmed explanation yet** for the selected
movements. No new accepted actuals or verified origin-available explanatory
feature has emerged. The [source-owner review form](SOURCE_OWNER_REVIEW.md)
records the specific questions and required evidence. Continue the existing
company-revenue research scope and retain the evaluated model results while
these dependencies are resolved.

The [local input inventory](input_inventory/REPORT.md) profiles 19 selected CSVs,
two identical workbook copies and two legacy sales snapshots, with zero file-read
failures. The file labelled as a 2026 demand forecast contains twelve model
predictions, not actual net sales; its exact generating run and approval are
unbound. Disease records dated 2026 are external evidence, not sales actuals.
The inventory preserves unparsed/out-of-range dates and distinguishes the
bounded profile from the broader filename census. Its source hashes remain
unchanged; it supplies no new verified origin-available predictor.

## Verified input readiness

The retained input binds to Gold fact version **20**, policy
`sales_restart_gold_v7_independent_catalog`, and dataset
`b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
It has 108 calendar rows for 2017–2025; the last actual period is December 2025.
Training eligibility inherits the user's completeness attestation for 2020–2025;
source completeness is not independently verified. The manifest explicitly
sets `training_approved=true` and `publication_approved=false`.

The input SHA-256 is
`04be4f529101f2117a5045d686158708e2b39d55957a3b119b22a30aa72c63ba`.
The current engine, model adapters and extended-experiment code hashes still
match the retained completion receipt (inherited code check from the preceding
readiness assessment). The [fresh read-only Gold check](source-live-verified.json)
confirms fact 20 and the same dataset/policy, 37,728 source records, 98 observed
months, latest recorded date 31 December 2025 and zero 2026-or-later records.
All four cases reconcile exactly to the frozen input for revenue, source count,
eligibility and adjusted provenance. The source version stays stable through
the check and the model release pointer remains empty. No new completeness or
publication decision is inferred. The initial `source-live.json` remains as a
superseded field-name-classification attempt; its numerical results were unchanged.

## Source review cases for the next revision

The [fact-20 diagnosis](../predictive_completion_20261009/diagnosis/baseline/DIAGNOSIS.md)
reconciles financial contributions. These three months account for **47.9%** of
the baseline's 2025 absolute error. The origin is December 2024; its recorded
sales and the baseline prediction are ₱16,744,970.51.

| Target month | Recorded actual PHP | Forecast error PHP, prediction minus actual | Source review focus |
|---|---:|---:|---|
| March 2025 | 2,612,295.10 | +14,132,675.41 | Large GOVERNMENT-labelled decline; invoice, delivery and booking dates; large-order timing and corrections. |
| April 2025 | 5,670,753.87 | +11,074,216.64 | GOVERNMENT-labelled decline with offsetting hospital sales; verify timing and preparation rules. |
| November 2025 | 25,076,009.20 | −8,331,038.69 | Large GOVERNMENT-labelled increase; order timing and adjusted allocation preparation. |

For each case, retain the original source artifact and checksum, source-owner
explanation, transaction identifiers, invoice/order/delivery/booking dates where
available, corrections and their effective dates, and the preparation/allocation
rule. Reconcile original amounts to the eligible Gold financial population;
document unresolved differences. Record whether a reviewed explanatory feature
would have been available at the forecast origin. Raw labels and accounting
contributions do not establish customer identity or causality. Preserve current
values and provenance until supported corrections pass the controlled pipeline.

The [earlier source-review packet](../predictive_validation/2026-09-27T14-30-12-921Z/diagnosis/SOURCE_REVIEW.md)
provides the detailed cases; it is historical evidence. Today's prioritization
uses the fact-20 diagnosis above.

## Modeling sequence

1. Complete the source review and identify a specific, origin-available signal or
   corrected target that justifies changing the recipe. Source review can proceed
   without setting a business error tolerance.
2. Ingest and reconcile any later actual sales through the controlled Databricks
   pipeline; retain period-close, completeness, identity and provenance evidence.
   A file named as a 2026 forecast does not supply accepted 2026 actuals.
3. Freeze the revised target, source cutoff, model recipes and evaluation protocol
   before fitting. Keep benchmarks and development-based selection. The already
   inspected 2025 audit remains retrospective; use later untouched accepted
   actuals for a fresh assessment.
4. Evaluate the requested calendar horizon with its true leads. From a December
   2025 origin, October 2026–September 2027 requires leads 10–21; existing evidence
   supports only leads 1–12. Unsupported leads remain unavailable. Recent accepted
   actuals or a separately evaluated longer-horizon protocol can address this.
5. Report error in pesos, WAPE, bias and lead bands. Obtain the business decision
   on usefulness and acceptable over/underforecasting before operational release.
   This means deciding how much error is tolerable for the intended planning
   decision; it is not permission to change the observed test scores.

The [earlier monthly-refresh experiment](../predictive_validation/2026-09-27T14-30-12-921Z/monthly-experiment/RESULTS.md)
already found 14 of 15 configurations worse and seasonal naive unchanged on the
same 24 development target months. Its best monthly benchmark WAPE was 69.41%,
versus 60.08% under annual fixed origins. Those scores use a different evaluation
population from the 60-key comparison above. An automatic expanded-grid rerun
does not currently have a new input or cadence hypothesis to test.

Candidate results remain unpublished. Prediction intervals lack the required
per-lead support. Operational inventory decisions additionally require verified
inventory, supplier, lead-time and expiry inputs. The [whole study overview](../../docs/STUDY_OVERVIEW.md)
maps the implemented evidence and remaining original objectives.

## Applied guidance and verification boundary

`.skills/analytics-frameworks.md` informed same-population diagnostic contributions
and origin-available feature requirements; `.skills/database-standards.md` informed
source identity, lineage and duplicate-review treatment. `.skills/coding-standards.md`,
`.skills/testing-standards.md` and `.skills/technology-stack.md` informed the bounded
offline audit scripts; `.skills/security-standards.md` kept credentials in the
gateway and results aggregate-only. `.skills/business-analysis-frameworks.md`
informed the source-owner handoff and separate usefulness gate.
The global Spreadsheets skill supplied read-only source controls and bundled
Python analysis. No application behavior changed, so no application build or
additional model regression run was needed for this source-review continuation.
