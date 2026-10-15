# Direct role skill trial

Agent task name: `/root/direct_role_skill_trial`.
Fresh-context fork: `none`.
Model override: none.
Model/runtime settings were inherited rather than independently logged.
Trial scope: an isolated one-task routing check, not a performance benchmark; read-only assessment of a synthetic calculation and proposed interpretation using the Data Analyst role and applicable repository guidance. No edits, application/network/cloud calls, existing review-output reads, or answer-key reads occurred during the original trial. This evidence file records the completed first attempt without rerunning or revising it. Root will assess separately.

## Original assignment (verbatim)

Use the role at C:/Users/Adrian/projects/medshield1/medshield/.agents/data-analyst.md for this request: 'Review this synthetic calculation: sales has two source rows for one territory/month, net sales 100 and 200. Weather has two rows for the same territory/month, one PAGASA and one NASA POWER. We joined on territory/month and now report 600 net sales and a single weather value. The manager says the result proves rain caused sales and asks which medicine quantities to buy. Assess the calculation and proposed interpretation, specify a corrected data contract/check, and name the implementation owner.' Read instructions as you normally would for a direct role invocation. No edits, no application/network/cloud calls. Do not read existing review outputs or answer keys. In the handoff report which guidance you actually opened and how it informed the answer. This is an isolated one-task routing check, not a performance benchmark.

## Original final answer (verbatim)

**The reported 600 is wrong.** Assuming both sales rows are eligible, correct net sales are `100 + 200 = 300`. Joining each sales row to both weather providers creates four rows: `100, 100, 200, 200`. The join doubles revenue. Neither deduplicating legitimate sales records nor using `SUM(DISTINCT net_sales)` is a valid repair.

The unspecified single weather value cannot be validated. PAGASA observations and NASA POWER proxy observations must retain separate provider identities. This one territory/month does not establish an association, much less prove that rain caused sales. A causal claim needs a credible study design addressing timing, seasonality and alternative explanations.

**No medicine purchase quantities are supported.** Revenue does not identify verified SKU quantities or unconstrained demand. Purchasing needs reviewed SKU/pack/unit identities, suitable recent quantity evidence and an accepted forecasting contract, plus inventory position, supplier lead times, expiry, costs and service constraints. Entered assumptions can support a labeled planning scenario; they do not authorize procurement.

The proposed corrected contract is:

1. Preserve both source sales records and their identities. Aggregate eligible signed net sales to one row per approved geographic territory/calendar month.
2. Preserve raw weather lineage. Produce at most one assessed monthly record per `(territory, month, provider, variable)` using a documented location mapping and aggregation policy. Record units, monthly statistic, coverage, source version and mapping status.
3. Pivot provider records into separate fields—or attach them as a separate collection—before joining to sales. The final revenue-bearing result must remain one row per territory/month. Do not silently average providers or select an arbitrary value.
4. Use a left join: missing weather retains revenue and produces explicit missing weather/status fields. Preserve candidate labels and approval status.

The acceptance checks should assert:

| Check | Expected result |
|---|---|
| Supplied synthetic case | Two retained sales records; one aggregate/joined sales row; net sales **300**; two distinguishable weather providers |
| Measure preservation | Pre/post-join totals match over identical eligible populations and filters; exact equality for this integer fixture |
| Duplicate assessed weather key | Quality failure before joining; no arbitrary row selection |
| Missing weather/provider | Net sales stays **300**; missing observation remains null, with its status |
| Legitimate equal-valued sales rows | Both remain counted; no value-based deduplication |

**Implementation owner: Database Engineer** for the Databricks Gold/view join and grain correction. Backend Engineer owns any required gateway computation or response change. Data Analyst supplies this calculation contract and reconciliation; QA verifies the acceptance cases.

Manual arithmetic establishes the synthetic defect. Proposed automated checks and live behavior were **not verified**. This read-only assessment is complete; implementation remains a follow-up.

Guidance actually opened and applied:

- [Worker operating model](C:/Users/Adrian/projects/medshield1/medshield/.agents/worker-operating-model.md), [execution contract](C:/Users/Adrian/projects/medshield1/medshield/.agents/execution-contract.md), and [Data Analyst role](C:/Users/Adrian/projects/medshield1/medshield/.agents/data-analyst.md): accountable ownership, hand-solvable verification, bounded claims and implementable handoff.
- [Analytics frameworks](C:/Users/Adrian/projects/medshield1/medshield/.skills/analytics-frameworks.md): metric contract, causal limits and revenue-versus-quantity distinction.
- [Database standards](C:/Users/Adrian/projects/medshield1/medshield/.skills/database-standards.md): grain, provider provenance, cardinality and pre/post-join reconciliation.
- [Business analysis frameworks](C:/Users/Adrian/projects/medshield1/medshield/.skills/business-analysis-frameworks.md): purchasing inputs, constraints and decision ownership.
- [Analytics lesson coaching](C:/Users/Adrian/projects/medshield1/medshield/.skills/analytics-lesson-coaching/SKILL.md): isolated assessment limits; this trial supports no performance-improvement claim.
- [Business definitions](C:/Users/Adrian/projects/medshield1/medshield/docs/BUSINESS_DEFINITIONS.md), relevant sections of [current state](C:/Users/Adrian/projects/medshield1/medshield/docs/CURRENT_STATE.md) and [objective/evidence register](C:/Users/Adrian/projects/medshield1/medshield/docs/OBJECTIVE_EVIDENCE_REGISTER.md), plus [database](C:/Users/Adrian/projects/medshield1/medshield/docs/DATABASE.md), [architecture](C:/Users/Adrian/projects/medshield1/medshield/docs/ARCHITECTURE.md) and [decisions](C:/Users/Adrian/projects/medshield1/medshield/docs/DECISIONS.md): financial meanings, Databricks ownership, separate weather evidence and publication/planning gates.

No files were edited. No application, network or cloud calls were made. I did not open existing review outputs, `lessons/REVIEW.md`, or assessor notes/answer keys.
