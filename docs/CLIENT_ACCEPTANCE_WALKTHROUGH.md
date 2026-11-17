# MedShield client acceptance walkthrough

**Operator execution, 29 October 2026:** [A1–A6 engineering self-review passed](../outputs/client_acceptance_20261029/operator/README.md)
in the named signed-in Admin selections, with nine actual CSVs checked. This
supplements preparation; client outcomes remain not_run until an actual client
review is recorded. Original scores and release/operational gates are unchanged.

Prepared 29 October 2026. This is a review procedure, not a completed client test
or an approval request. Use the working dashboard and the evidence linked below.
The available-data implementation can be reviewed while original requirements
remain open. [Current source/gates](CURRENT_STATE.md) and the
[objective register](OBJECTIVE_EVIDENCE_REGISTER.md) take precedence.

## Before the review

Identify the reviewer first. A developer/researcher can record a project review;
actual client acceptance requires an attributable MedShield client representative.
Do not infer that role from an Admin login or from “continue.” Use one task at a
time, let the reviewer explain the result before offering help, and record any
explanation or hint provided. A correct answer after coaching is assisted
understanding, not an unaided usability result. The short questions below are
facilitator prompts, not completed answers or numerical acceptance thresholds.

Use an existing authorized account. Record its role, review date and displayed
source identity; do not record credentials. The retained technical browser checks
used Admin, so other-role acceptance must be demonstrated separately.

Open **Data Source → Current source evidence**. The checked original itemized
candidate uses dataset `e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10`,
fact Delta0 and policy `original_source_layers_v1_candidate_only`. Source ends
September 2026. A different release requires matching evidence; older figures
must not be forced to pass. Do not rerun Bronze/Silver/Gold for this walkthrough.

Set financial scope to **Exclude Contracts** for the following tasks. Product,
area, diagnostic and model analyses remain itemized-only regardless of the
financial scope control. Each panel's local dates, year, region or channel are
the authoritative selection for that panel; changing Analysis filters does not
necessarily change those independent panels. Missing observations remain unknown.

Allow about 30 minutes for the six tasks. The reviewer should explain the result
in their own words and retain the relevant CSV/screenshot or defect reference.
Record outcomes in the [prepared review form](../outputs/client_acceptance_20261029/review-record.json).
Every client result starts **not_run**. A generic “approved” must not silently
activate a financial release, forecast, procurement order or amended objective.

## Tasks and observable results

On **Overview**, start with the sales metrics and trend. Expand **More sales
patterns and coverage** for the calendar, monthly averages, observed months,
and gross margin trend. The **Exports and links** menu also jumps to that section.
Expand **Sales change by buyer sector** for the sector comparison. On
**Products**, the ranking and searchable product table come before
the **Commercial review** disclosure. Expand **Historical forecast research** on Forecast,
then open the study you want to inspect.

| Task | What the reviewer does | Expected behavior and decision question | Evidence already checked |
|---|---|---|---|
| A1 · SO1 Sales Diagnostics | Open **Territory baseline**, then the confirmed regional review; select CALABARZON and 2026. Expand **Compare regional totals and export data**, download **Export regional findings**, then compare MIMAROPA/Bicol. | CALABARZON compares the same nine recorded months; the retained snapshot is +2.21%. Other regions' 2026 comparison is unavailable with the last recorded month explained, not zero sales. Can the reviewer distinguish recorded change from complete regional demand? | [Regional findings](../outputs/so1_regional_completion_20261029/FINDINGS.md); [actual final UI/CSV review](../outputs/live_browser_completion_20261029/README.md). |
| A2 · SO2 Product Prioritization | In **Commercial review**, choose Medical and January–September 2026. Review contributors, declines, negative supported profit and margin gaps; export the selected review and inspect a source product. | Date/category/focus and supported-profit basis agree between table, CSV and inspected evidence. Unavailable costs do not become zero. Can the reviewer identify a sales-review lead without interpreting it as stock on hand, clinical priority or a purchase order? | [Actual product tasks and nine CSVs](../outputs/so2_client_review_20261029/README.md). |
| A3 · SO2 Area Prioritization | Select 2026 and All confirmed regions; inspect ranking, **Matching-month growth and cost support**, and **Unallocated labels and evidence limits**; use **Export area findings**. | Confirmed delivery labels, observed area-net ABC and unallocated labels remain distinct. A missing regional period is unavailable. Can the reviewer explain which places are supported by the records and which remain unassigned? | [Area implementation/findings](../outputs/so2_area_completion_20261029/README.md); [actual selected scopes/exports](../outputs/live_browser_completion_20261029/README.md). |
| A4 · SO3 Forecast Modeling | Expand **Historical forecast research**, then find **BUPIRIGHT unit research · HOSPITAL channel**. Review both leads, errors, calendar bounds and recorded-versus-baseline chart. Open **How consistent was the comparison?** and export the review. | HOSPITAL stays a channel and units stay ampoules. Lowest observed MAEs are 13.17 (six lead-one targets) and 9.75 (four lead-three targets). Seasonal naive stays lowest in 5/6 and 2/4 checks omitting one scored month. These reuse fixed predictions; they are not new forecasts or confidence intervals. Leads have different cohorts; chart choice does not approve a model. This artifact supplies no December prediction. Can the reviewer explain the error, sample sensitivity and research status? | [Research results](../outputs/so3_research_review_20261029/README.md); [actual chart controls/exports](../outputs/live_browser_completion_20261029/README.md); [verified consistency panel and downloads](../outputs/forecast_robustness_20261029/README.md). |
| A5 · SO4 Prescriptive Planning | Use All/all, horizon3, minimum0. Enter the explicitly synthetic example below, review assumptions, calculate and inspect **What do the scenario purchases add?**; export CSV. Then try budget0/minimum100. | Checked example spends ₱24 of ₱25, with mean fulfillment 23.20%→33.07% (+9.87 percentage points); ₱1 cannot afford another pack. Units stay product-specific. Infeasible constraints show no allocation/export. Can the reviewer explain the stock-only baseline, remaining gaps and pack excess without treating them as verified replenishment or expiry benefit? | [Calculations, actual table/CSV and infeasible state](../outputs/so4_baseline_review_20261029/README.md). |
| A6 · SO5 Draft and source workflow | Save an incomplete input draft containing a blank and zero. Change entries and load it; inspect cleared results/acknowledgment, review again and calculate. Open Data Source and explain who validates candidates and release decisions. | Blanks/zeros survive. Loading clears calculated outputs and requires review; invalid or mismatched files leave existing inputs intact. CSV sales ingestion remains controlled in Databricks; JSON drafts are not sales uploads. Can the reviewer resume a scenario and explain why pipeline PASS does not authorize publication? | [Actual draft/rejection/recovery and keyboard module checks](../outputs/so5_workflow_review_20261029/README.md). |

### Synthetic example for A5

This is a calculation demonstration, not MedShield inventory or supplier data.
Use the exact current five-label All/all shortlist; stop this example if it
differs. Budget ₱25, horizon3, minimum0. For each product: usable stock6,
reserve2, units per pack4, supplier maximum20 packs.

| Product | Entered horizon demand | Entered cost per pack (₱) |
|---|---:|---:|
| SPEEDA | 10 | 5 |
| SHARJVAX | 15 | 6 |
| SEROALBUMIN | 20 | 7 |
| SHARJVAX 1500IU/0.7ML | 25 | 8 |
| MONOWEL 1G IV | 30 | 9 |

Use **Save input draft** to retain only assumptions. A draft has no approval or
calculated allocation. A different release/checksum is a new evidence context;
do not edit old identity fields to bypass rejection.

### Optional capacity follow-up for A5–A6 — 30 October 2026

Keep the original A5 example uncapped. For a separate explicitly synthetic
capacity task, use All/all, horizon 1, budget ₱100, minimum 0, balanced allocation;
enter demand 4, stock 0, reserve 0, pack 2, cost ₱1/pack and supplier maximum 2 packs
for each of the same five labels. Declare every unit as `synthetic QA units`;
this label is a test assumption, not a medicine-unit mapping. Enter shared cap 6
and the same common label. The displayed/CSV purchased total is 6 units, spend ₱3,
and mean fulfillment 30%. Cap 0 must preserve zero purchases. A blank cap omits
the constraint. Save/load the actual draft and verify restored fields, cleared
results/export and unchecked acknowledgment.

For dated review, download the current source-bound snapshot template. Use its
same five labels and `synthetic QA units`, stock/reserve 0, no batches/expected
receipts, today's snapshot/end date, explicit demand 4 today, and one proposed
receipt of 2 units today expiring 2099-01-01 per product. Enter budget 100, cap 6,
matching capacity label, pack 2/cost 1/supplier maximum 2, expiry maximum 0, minimum 0,
selection maximum 2/weight 100. Fixed review reports 10/6 units and remaining −4;
selection reports 6/6, remaining 0, spend ₱3 and weighted fulfillment 30%. Test cap 0,
omission, incompatible unit rejection and recovery. Input/source changes must
clear the dated review/export. These values are QA examples only.

[Dated and ordinary capacity engineering evidence](../outputs/wp9_dated_capacity_ui_20261030/README.md)
contains actual signed-in downloads and independent checks. It does not supply
client responses. The facilitator asks the reviewer to explain full packs,
explicit zero, incompatible units and why a scenario does not approve purchasing.

### Model understanding supplement — 2 November 2026

The Forecast/Product research panels now explain the current target, unit,
baseline error and permitted review action. This supplement checks understanding
of **all three** model families using the actual current gateway values. New
offline experiments in the [model evidence packet](../outputs/client_model_evidence_20261102/README.md)
are separate from the frozen dashboard runs. Do not expect the new offline ABC
or unit candidate to appear in the old dashboard artifact.

Use the [model-understanding record](../outputs/client_model_evidence_20261102/client-understanding-review.json)
alongside A1–A6. Identify an attributable reviewer and role, actual date,
viewport/device, panel selections and displayed source/run identity. Leave
responses, timing, rubric scores and decisions empty until observed. Let the
reviewer answer in their own words before giving corrective explanations.

| Task | Ask the reviewer | Observable understanding |
|---|---|---|
| M1 · Monthly sales | Open the company tournament readout. What is being forecast, what does the current WAPE/bias say, and does changing the main Analysis period change this frozen experiment? | Separates PHP sales from units; treats WAPE as aggregate error and bias as direction; identifies the displayed lead/cohort/period and independent experiment scope. Does not compute an accuracy percentage as 100−WAPE. |
| M2 · Product priorities | Open ABC research and its plain-language details. What do macro-F1 and A recall tell you that overall accuracy does not? Is an observed ABC chart the same as predicting next year's class? | Distinguishes observed contribution from predicted class; checks A support/misses and the selected history cohort; does not infer clinical urgency, verified SKU identity or calibrated individual confidence. |
| M3 · Physical units | Select both leads and a method in BUPIRIGHT unit research. What is the unit, how many targets were scored, and is the lowest historical error enough to order stock? | Identifies ampoules, confirmed product scope and HOSPITAL channel; reads six/four target counts and lead-specific errors; explains that a small retrospective comparison supplies neither a future forecast nor procurement approval. |
| M4 · Missing evidence | Use a browser-only simulated unavailable-source case under QA supervision, then restore it. What does the unavailable state mean? | Distinguishes unknown from observed zero, sees old readouts/exports clear and real-source recovery. Never disrupt the warehouse to demonstrate this task. |

Score each applicable dimension only after observing the answer: 0 incorrect,
1 partial/assisted, 2 correct unassisted. Dimensions are target/unit, evaluation
scope, error meaning and safe decision/next action. Record the actual assistance
and any critical interpretation mistake. All applicable dimensions need 2 and
no critical mistake for this task rubric to pass; a later coached retry is
recorded separately from the first attempt. Missing/unrun answers stay null,
not zero or passed. This is a local comprehension rubric, not a validated
psychometric score, SUS replacement or automatic formal acceptance.

Record business tolerances separately: named intended decision and allowable
sales error/bias, minimum A recall/review capacity, and allowable unit error per
lead. The prepared record leaves these unset. Clients/model owners choose them
before prospective acceptance; engineering must not infer them from a favorable
historical result or invent unavailable stock/supplier data.

### SUS administration preparation

After tasks, administer the complete ten-item SUS using a fixed instrument and
record its version/language; do not omit or paraphrase items during a session.
Record participant attribution/role, context, task assistance and ten actual
responses on the 1–5 agreement scale. Leave absent responses and the score null;
do not score an incomplete form. For item responses x1…x10, calculate
`2.5 × [Σodd(xi − 1) + Σeven(5 − xi)]`. Report the 0–100 score as a scale value,
not a percentage. The plan's 68 target is a declared project review target,
not automatic client acceptance. [Brooke (2013), author-posted full text](https://www.researchgate.net/publication/285811057_SUS_a_retrospective)
explains scoring and interpretation; the original journal links returned 404
during the 30 October source check.

[Prepared capacity/SUS supplement](../outputs/wp9_dated_capacity_ui_20261030/review-preparation.json)
has no participant, responses, score or acceptance. Keep it separate from the
canonical client review record. Researcher/facilitator conducts the session;
client/adviser records their own decisions.

## Record the review

### Ask in plain language

| Task | Reviewer question |
|---|---|
| A1 | What does this regional sales total cover, and what sales or places could still be missing? |
| A2 | Which product would you investigate first, what evidence supports that choice, and what must you know before buying stock? |
| A3 | Which delivery areas are supported by these records, and what does “unallocated” mean? |
| A4 | Does the lowest historical error mean this method is ready to order medicine? Explain using the scored months and consistency check. |
| A5 | What changes when you enter different stock or budget assumptions, and which inputs are examples rather than verified company facts? |
| A6 | What is saved in a planning draft, and who still needs to validate new sales data or approve a release? |

The facilitator checks responses against each task's evidence/limits above.
Keep the reviewer's own interpretation and any help given. If the reviewer
cannot explain a limitation, record the confusion and request a wording or
workflow change instead of silently supplying an accepted result. Record task
time only if actually measured; do not infer satisfaction, time saved or user
success from the earlier engineering walkthrough.

The prospective protocol, offline writer and Gold adapter are separate
engineering preparation. Their local tests do not produce a future forecast in
the dashboard or replace A4's research-status question. See [current state](CURRENT_STATE.md)
for live-execution and source-dependent work. The client can review the supported
screens now without waiting for October data or the annual prospective study.

For each task, record reviewer/role/date, selections, what was understood, result,
and evidence or a defect. Allowed client results are `not_run`,
`accepted_with_scope`, `changes_requested`, or `not_applicable_with_reason`.
Accepting a screen's bounded available-data use does not complete its original
objective. A defect needs expected/observed behavior, source identity and owner;
fix and rerun the affected task before marking its result accepted.

The form records **client review only**. Finance/source owners retain financial
release decisions; model/business owners retain intended use and error-policy
acceptance; procurement owners retain operating decisions; adviser/panel retains
academic scope acceptance. No service reads this form to enable publication.
Do not send review records or business CSVs outside the authorized project.

## Original requirements still open

| Objective | What this walkthrough cannot establish |
|---|---|
| SO1 | Complete territorial history/completeness, source-supported attribution for unresolved labels, accepted forecasting scope. |
| SO2 | Complete stable account/SKU linkage, stocked slow movers and all original predictive/operational criteria. |
| SO3 | Supported territorial future medicine demand, origin-known external regressors/urgency targets and operational model acceptance. |
| SO4 | Verified inventory position/units/suppliers/lead times/expiry and measured expiry/turnover outcomes. |
| SO5 | Accepted ingestion retry/correction/publication, official live Signal-2 and evaluated collaborative filtering. |

The [objective/evidence register](OBJECTIVE_EVIDENCE_REGISTER.md) owns current
dated clause scores; this walkthrough does not duplicate changing totals or
change them. They are not software test pass rates. No whole original objective
is accepted complete. Historical weather context is not an official current warning, and
commercial ranking is not collaborative filtering.

After the walkthrough, engineering fixes reproducible defects; client reviews
bounded findings; input owners address the named factual gaps. Adviser/client
scope decisions require their own explicit record. There is no new operational
approval in preparing or opening this guide.
