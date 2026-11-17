# Named-role trial evidence

- Agent task name: `/root/named_agent_skill_trial`
- Fresh-context fork: `none`
- Model override: none.
- Model/runtime settings: inherited rather than independently logged.
- Trial scope: one isolated, read-only named-role routing example for the Business Analyst. No edits, runtime/network/cloud actions, or reading existing task outputs/assessor notes were authorized for the trial. This record retains the completed first trial; the answer was not rerun or revised.

## Original assignment (verbatim)

Repository C:/Users/Adrian/projects/medshield1/medshield. User request for this isolated read-only trial: 'Call .agents as the Business Analyst. Help frame a feature: add a dashboard proving we reduced medicine wastage by 10% using only historical source-label revenue. We have no verified inventory, expiry, stockout or SKU-unit records. Tell us what can be delivered and what would count as success.' Follow the repository entrypoint/role normally. No edits, runtime/network/cloud actions, or reading existing task outputs/assessor notes. Provide your actual brief, boundaries and owner handoff, plus which guidance you read/applied. This evaluates one named-role routing example, not broad agent improvement.

## Original final answer (verbatim)

As the accountable **Business Analyst**, I would deliver a **historical revenue and evidence-readiness dashboard**. Historical source-label revenue cannot prove medicine wastage, stockouts, or a 10% reduction. Those outcomes remain unmeasured.

The intended user is the planner, supported by an executive reviewer. At a planning review, they should identify revenue concentration and changes, then decide where to investigate operational data. I assume a monthly review cadence. The hypothesis that better planning reduces wastage remains untested; no observed wastage symptom or baseline has been supplied.

The user story is: “As a planner, I want comparable historical revenue by source label, with coverage and provenance, so I can select areas for investigation without assuming stock or expiry conditions.”

Deliverable scope and success checks:

| Requirement | Observable acceptance check | Implementation owner |
|---|---|---|
| Historical net revenue, trends and source-label contribution | Sum revenue-eligible Net CP from one identified Gold population; independently reconcile selected-period totals, table, chart and export to the governed currency precision | Backend Engineer; Data Analyst establishes expected values |
| Comparable historical changes | Use explicit baseline/target periods and matched coverage. Disclose incomplete periods; suppress undefined percentage changes for zero or otherwise unsuitable baselines | Backend Engineer and Frontend Engineer |
| Evidence and limitations | Show source labels, original/adjusted provenance, dataset/policy identity and candidate status. Contract labels remain distinct from verified medicine SKUs | Frontend Engineer |
| Operational outcome status | Show “Medicine wastage reduction: unavailable — verified inventory and expiry outcomes required.” Missing evidence never becomes 0% wastage or a 10% achievement | Frontend Engineer |
| Source failure and release | Required Databricks failure produces an unavailable state. Authenticated API/UI/export checks retain the same identity and scope; publication follows the applicable recorded CEO acceptance | Backend Engineer, QA Engineer and release operator |

A hand-solvable example: comparable revenue changing from ₱100,000 to ₱90,000 is a **10% revenue decrease**. It says nothing about wastage. Likewise, negative net-sales adjustments do not establish physical returns, and a low-revenue source label does not establish dead stock.

Must-have scope is the historical report, reconciliation, comparison rules and visible evidence gaps. Operational wastage KPIs, SKU-unit forecasts, replenishment decisions and a “10% achieved” badge are deferred. No scenario is needed to complete this revenue-only feature. If scenarios are later requested, entered assumptions and simulated benefits must remain explicit.

A defensible future success target needs an agreed medicine-wastage measure, verified SKU/pack/unit identities, lot-level inventory and expiry/write-off records, receipts/issues and reasons, comparable baseline and follow-up cohorts, and documented intervention dates. Finance and inventory owners must define the numerator, denominator and valuation basis; the Data Analyst must establish the evaluation protocol before observing results. Stockout/service outcomes should also be collected to assess whether lower wastage came at the expense of availability.

For a proposed approved wastage measure \(W\), relative reduction is \(100 × (W_0-W_1)/W_0\), with a positive baseline. Hypothetically, a wastage rate falling from 5.0% to 4.5% is a 10% relative reduction and a 0.5 percentage-point decrease. These are examples, not MedShield results. Comparable measurements establish a change; attributing it to MedShield requires a defensible evaluation design. The proposed 10% target also does not silently replace the existing **expiry wastage ≤5%** objective in the [objective register](C:/Users/Adrian/projects/medshield1/medshield/docs/OBJECTIVE_EVIDENCE_REGISTER.md:47).

The next owner is the **Orchestrator**, receiving this scope and acceptance table to sequence engineering and QA. Inventory/procurement/finance own the missing operational evidence; the CEO owns business outcome and release acceptance, while the adviser/panel owns academic scope amendments. Architecture stays within the existing Databricks → gateway → authenticated frontend boundary. This assignment permits **no file edits**; it delivers the brief only. Schema changes, runtime operations and deployment are not part of this trial.

I read and applied:

- `.agents/worker-operating-model.md`, `.agents/execution-contract.md` and `.agents/business-analyst.md`: one accountable owner, evidence-separated claims, testable requirements and explicit handoff.
- [.skills/business-analysis-frameworks.md](C:/Users/Adrian/projects/medshield1/medshield/.skills/business-analysis-frameworks.md): decision brief, assumptions and outcome distinction.
- [.skills/analytics-frameworks.md](C:/Users/Adrian/projects/medshield1/medshield/.skills/analytics-frameworks.md): source/grain/unit/period contract, comparable populations and claim limits.
- [.skills/product-management-frameworks.md](C:/Users/Adrian/projects/medshield1/medshield/.skills/product-management-frameworks.md): historical delivery first; operational proof depends on new evidence.
- [.skills/testing-standards.md](C:/Users/Adrian/projects/medshield1/medshield/.skills/testing-standards.md): reconciliation, semantic and failure checks.
- Relevant canonical sections of `BUSINESS_ANALYSIS.md`, `BUSINESS_DEFINITIONS.md`, `OBJECTIVE_EVIDENCE_REGISTER.md`, `REQUIREMENTS.md`, `CURRENT_STATE.md`, `DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `API.md`, `SECURITY.md` and `TESTING.md`.

The brief is complete by documentary self-review. Feature behavior, live data reconciliation and business impact remain **not verified**. No files changed, tests ran, or runtime/network/cloud actions occurred.
