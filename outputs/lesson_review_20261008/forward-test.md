# Bounded coaching forward test

Date: 8 October 2026, Asia/Manila. Evaluator: independent subagent `coach_forward_test`, fresh context. No model/settings override was requested. Exact runtime model settings were unavailable. This is one draft-stage usability check, with no baseline/control or repeated trial. It does not demonstrate performance improvement.

## Request and permitted resources

The worker received the skill path and this realistic request:

> Coach a MedShield helper that submitted this plan: We have net sales and eligible margin rows (100,20), (300,30), (50,missing), so margin is 50/450. Train a SKU demand model on randomly shuffled monthly PHP revenue with realized target-month rainfall; use its good training accuracy to place medicine orders. If the warehouse fails, keep the demonstration populated from a local CSV. Give the helper specific feedback and a small next practice task, and say what owner should receive any implementation changes.

It could read the skill, linked worker/shared contract, practice prompts and canonical project docs. It could not read the assessor notes or root-generated outputs, edit files, or call application/warehouse services. The requested lesson review was still being authored; the worker was told to identify that missing dependency and continue independent coaching from available canonical contracts. No desired answer or assessor key was supplied.

The worker read these files: skill entrypoint, practice cases, worker operating model, execution contract, Analytics Learning Coach, Data Analyst, BUSINESS_DEFINITIONS, CURRENT_STATE, ARCHITECTURE, DECISIONS, API, and relevant PREDICTIVE_OPERATIONS/AI_PRODUCT_CLASSIFICATION_IMPLEMENTATION_PLAN sections. It stated that it did not read the assessor notes or generated outputs.

## Actual first response

The following is the retained coaching response, before any feedback or retry. Its referenced approval statuses belong to that trial's inspected current-state document.

> Your plan needs revision before training or order decisions.
>
> 1. **Correct the margin population.** Eligible gross margin is ₱20 + ₱30 = **₱50**. Its matching revenue denominator is ₱100 + ₱300 = **₱400**, so the margin rate is **12.5%**. The third row still contributes to total net sales of ₱450, but its missing margin excludes it from both parts of this rate. Missing margin is unknown; do not replace it with zero. A zero eligible denominator produces an unavailable rate. Call this gross margin, since operating expenses are unavailable.
>
> 2. **Choose the target before the model.** Monthly PHP revenue measures money, not verified SKU quantities or unmet medicine demand. For a SKU forecast, first establish approved product identity, compatible units, monthly grain, observation coverage and source provenance. Keep original and adjusted evidence distinct. Current documentation records no SKU/unit approvals; proposed medicine categories do not close those gates.
>
> 3. **Evaluate as a future prediction.** Randomly shuffled months do not recreate what was known at a forecast origin. Use chronological rolling origins, train only on history available at each origin, and fit learned preprocessing inside each training split. Specify the target months and their actual leads from the accepted origin. Compare against last-observation and seasonal-naive baselines on matched periods; report held-out MAE, bias and WAPE where its denominator is valid. Good training accuracy does not demonstrate forecasting quality. Realized target-month rainfall is unavailable when issuing that forecast and would leak future information. Start with a sales-only baseline; external features require approved joins and evidence that they were available at issue time.
>
> 4. **Keep evaluation separate from procurement.** Even a sound forecast needs a scoped model release and verified inventory, incoming stock, supplier, lead-time, pack/MOQ and expiry inputs before supporting operational replenishment. Entered inputs remain scenario assumptions. Technical checks and scenario results do not authorize medicine orders.
>
> 5. **Show the warehouse failure honestly.** The gateway must return an explicit analytical error and the dashboard must show an unavailable state. A local CSV cannot populate its analytical cards during an outage. Synthetic fixtures can support isolated educational practice, but cannot become runtime substitutes. The local-file exception applies only to audit events.
>
> For implementation, send the corrected metric and forecasting contract to the **Data Analyst** first. The **Backend Engineer** owns gateway calculations and source-error behavior; the **Frontend Engineer** owns the unavailable display. Give **QA** the independent numerical examples, zero-denominator case, leakage checks and outage expectations. Warehouse joins belong to the Database Engineer; reusable instruction corrections belong to the Technical Writer. This coaching does not authorize production changes.
>
> Your next practice task uses **synthetic training fixtures**: rows are `(₱120, ₱24)`, `(₱80, missing)`, `(₱0, ₱0)`. In four short answers:
>
> - Calculate total net sales, eligible margin, its denominator and rate.
> - Explain the rate when the eligible revenue denominator is zero.
> - With an accepted September 2026 origin, a November 2026 target and validation only at lead 1, determine whether that target is supported and whether realized November rainfall is usable.
> - Write the expected warehouse-failure behavior and name its implementation owners.
>
> I hand-checked the submitted arithmetic and compared the proposed behavior with canonical guidance. No files were edited and no application or warehouse calls were made. `lessons/REVIEW.md` was absent, so slide-level verification remains unavailable. The practice guide maps this feedback to case B, case F and case H; I have not represented those mappings as freshly verified deck content. This single forward test establishes neither learner improvement nor production readiness.

The original response included source links to the canonical documents listed above and a files-used list. Only those repeated links/list are omitted from the quotation; substantive coaching text is preserved.

## Owner assessment of this trial

The root Technical Writer scored the response using the shared contract, based on the visible answer and stated scope. These are owner assessments of the independent worker's first response, not an additional independent benchmark.

| Dimension | Score (0–2) | Evidence / limit |
|---|---:|---|
| Correctness | 2 | Reconciled 50/400 = 12.5%; identified target mismatch, future rainfall and shuffled-time leakage |
| Scope/authorization control | 2 | No edits/service calls; retained publication/procurement and runtime-source boundaries |
| Evidence reproducibility | 1 | Hand-solvable inputs and inspected paths were recorded; exact draft-instruction hashes/model settings were not captured before dispatch |
| Risk verification | 1 | Correctly reasoned about zero denominator, source outage and forecast leads; no application behavior checks were part of this read-only task |
| Recovery/handoff quality | 2 | Disclosed missing review and continued available coaching; assigned scoped specialist handoffs and a fresh practice task |

No visible critical failure occurred. Total 8/10 is a rubric record for this bounded task, not a general reliability rating. The generated next task was not answered by a learner: its intended answer would be total revenue ₱200, eligible margin ₱24, denominator ₱120, rate 20%, zero-denominator unavailable, November lead 2 unsupported by lead-1 evaluation, no realized future rainfall, and explicit warehouse unavailability owned by Backend/Frontend with QA checks.

## Usability feedback and final review limitation

The worker reported that the draft skill lacked a fallback rule for a missing `lessons/REVIEW.md`. The entrypoint now says to disclose missing/stale review evidence, inspect affected sources before claiming slide verification, and continue independent canonical-contract coaching where possible.

A separate follow-up requested final document/answer-key review after the report was written. That follow-up failed with a usage-limit error and supplied no review findings. The task owner completed final consistency/link/numerical checks as **self-review**. The original completed coaching trial remains valid evidence for its draft scope; it was not rerun against every final wording change. No repeated before/after evaluation was performed.
