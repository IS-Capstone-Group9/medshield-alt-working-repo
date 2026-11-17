# Scenario assumptions and reviewed derivations

30 October 2026 · Candidate research policy `sales_external_scenario_v1_candidate_only`.

The [machine-readable register](../config/planning_assumptions.json) records A1–A9
from the [implementation plan](IMPLEMENTATION_PLAN_SALES_EXTERNAL_DATA.md), with
their exact base values, sensitivity ranges and units. These are **Assumed**
research settings, not company observations, regulatory requirements or approved
procurement policy. They never prefill the dashboard's entered planning inputs.
`python -c "from services.analytics_service.planning_assumptions import load_register; load_register()"`
validates the register. Offline callers must retain its policy and source hash.

| ID | Base | Sensitivity | Meaning and limitation |
|---|---|---|---|
| A1 | 25% annually | 15, 20, 25, 30, 35% | Holding-cost fraction of reviewed acquisition cost; no measured company holding cost. |
| A2 | ₱1,500/order | ₱500, 1,000, 1,500, 3,000, 5,000 | Assumed administration cost; no verified distributor cost estimate. |
| A3 | 14 days | 7, 10, 14, 21, 30 | Assumed mean supplier lead time. |
| A4 | 3 days | 0, 2, 3, 5, 7 | Assumed lead-time standard deviation. |
| A5 | 95% | 90, 95, 98, 99% | Assumed cycle-service probability; derive z from the standard normal quantile. |
| A6 | 365 and 730 days | 180, 365, 540, 730, 1,095 | Assumed remaining shelf life on receipt; no batch observation. |
| A7 | One mean-demand month | 0.5, 1, 1.5, 2 months | Simulated opening stock; report six-month burn-in separately. |
| A8 | 100% | 70, 85, 100, 115, 130% | Budget relative to scoped monthly recorded acquisition value; this is not purchase-order spend. |
| A9 | 100% | 75, 100, 125% | Capacity relative to presentation-scoped p95 throughput; not measured warehouse space. |

The plan names Silver, Pyke and Thomas, *Inventory and Production Management in
Supply Chains*, fourth edition (CRC Press, 2017), as a general inventory-method
reference. The numeric ranges above are researcher scenarios; this implementation
does not establish that the book supports these specific Philippine values. The
plan's WHO/FDA and regional lead-time rationales are **not verified citations**.
Before manuscript submission the researcher must supply supporting primary
references or retain the explicit researcher-assumption wording. No regulatory
or literature-backed acceptance is claimed here.

30 October citation check: the [publisher listing](https://www.routledge.com/Inventory-and-Production-Management-in-Supply-Chains/Pyke-Thomas-Silver/p/book/9781032179322)
confirms the fourth-edition title/authors and 2017 copyright in its indexed
metadata; direct retrieval returned 403, so chapter/range support was not checked.
[WHO TRS 1025 (2020), Annex 8 §5.1, pp194–195](https://cdn.who.int/media/docs/default-source/medicines/who-technical-report-series-who-expert-committee-on-specifications-for-pharmaceutical-preparations/trs1025-annex8.pdf?sfvrsn=dfb3eca3_2)
describes context-specific remaining shelf-life assessment. It does not validate
the A6 day grid as company facts or a universal rule. No primary support was
established for the plan's 95% WHO service-level, Philippine supplier lead-time,
or FDA shelf-life rationales. A1–A9 remain unchanged researcher scenarios.
[Source-check receipt and limits](../outputs/wp9_dated_capacity_ui_20261030/citation-review.md).

| ID | Derived contract | Acceptance dependency |
|---|---|---|
| D1 | Reviewed sellable presentation, unit and pack | Literal text is a proposal; never pool incompatible recorded Qty. |
| D2 | Unique exact reference or reviewed account alias | No DR-as-account inference or unreviewed fuzzy match; repeated ledger rows remain repeated. |
| D3 | Verified Medical product with clinical disease link | Category approval does not establish therapeutic or disease mapping. |
| D4 | Reviewed delivery territory, separate from channel/business line | Generic HOSPITAL/GOVERNMENT labels stay unallocated. |

Outputs bind `dataset_id`, `policy_version`, source/code SHA-256, `evidence_label`
and applicable `assumption_ids`. A scenario result is Derived from Assumed inputs;
Monte Carlo outcomes are Simulated, predictions Forecast, and gridded weather
Proxy. Observed ledger data is fulfilled recorded sales, not unconstrained demand.
Neither low sales nor no sale proves a stockout or a physical stock balance.

Changes require a new policy version and rerun of affected checks. Source/catalog
owners review D1–D4; the researcher owns A1–A9 and sensitivity reporting; the
client/adviser own business/academic acceptance. See [business definitions](BUSINESS_DEFINITIONS.md)
and [current state](CURRENT_STATE.md). No missing operating input becomes zero.
