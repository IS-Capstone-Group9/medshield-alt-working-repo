# Source-owner questions for the next forecast revision

Prepared 10 October 2026. The requesting user reports **no confirmed explanation**
for the selected sales movements. These are questions for the client/source owner;
the current analysis does not supply a causal explanation or new approval.

## Evidence to review

The supported forecast target is recorded monthly company net sales in PHP.
The reference is December 2024 eligible recorded revenue, ₱16,744,970.51.
The [source audit](source_review/findings.json) preserves input hashes and
aggregate financial reconciliations; [live Gold evidence](source-live-verified.json)
binds the current dataset, policy and fact version 20.

| Case | Eligible net sales PHP | Evidence question |
|---|---:|---|
| December 2024 reference | 16,744,970.51 | Confirm the recorded financial population and retained dispositions. Raw original detail totals ₱20,373,336.01; the ₱3,628,365.50 difference reconciles to 17 invalid-identity review rows and three possible-duplicate review rows outside Gold. |
| March 2025 | 2,612,295.10 | Explain the GOVERNMENT-labelled decline against December. Were large deliveries, invoices or bookings timed differently? |
| April 2025 | 5,670,753.87 | Explain the government decline and hospital increase, including the recording dates of large sales. |
| November 2025 | 25,076,009.20 | Explain why the source records ₱23,263,105.97 on 29 November (92.770368% of the month). Establish whether the date records actual deliveries, combined entry or another source convention. |

The three 2025 monthly Net CP totals and delivery-date × area × DR Net CP groups
match the original CSV control. This is specific to recorded net sales; it does
not establish equivalent cost/margin eligibility, independently verified dates,
original SKU allocations or source completeness. A DR/date/area group is a
delivery-document grouping, not a verified original order identity.

## Record a response for each case

Use these fields alongside the original source evidence. Leave unknown items
explicitly unknown rather than supplying estimates.

- Reviewer and review date:
- Original artifact reference and checksum:
- Original transaction/item-line identifiers:
- Order, invoice, delivery and booking dates, with definitions:
- Original amounts and adjustments/corrections, with effective dates:
- Source preparation/allocation rule and final parent-to-child lineage, if relevant:
- Explanation of the reviewed financial population and any unresolved differences:
- Evidence that the reporting period is closed and complete:
- When any proposed explanatory feature became available to the planner:
- Source-owner explanation and supporting document references:
- Analyst reconciliation result and remaining uncertainty:

Original business dates and source-owner evidence are necessary to support a
timing explanation. A variable reconstructed after the target month cannot be
used as if it were known at an earlier forecast origin. No rows, amounts or dates
have been changed by this review. Any supported correction must pass the
controlled Databricks pipeline and version-bound evaluation.

The source owner supplies the evidence; the Data Analyst verifies the population
and reconciliation; the model evaluator freezes any revised recipe before fresh
testing. Business usefulness and publication retain their separate acceptance
records.
