# MedShield Capstone Completion Workflow

Reviewed: **15 October 2026, Asia/Manila**. This guide connects system delivery to the paper using current repository evidence. It replaces the older generic phase checklist in this file; dated experiments, original paper objectives and actual decisions retain their own authority.

## Source authority

| Source | Owns |
|---|---|
| [Objective/evidence register](OBJECTIVE_EVIDENCE_REGISTER.md) | Original O1–O5, AC-O1–AC-O5, exact gaps and attributed business/academic decisions |
| [Current State](CURRENT_STATE.md) | Dated implementation, source/model identity, readiness and open gates |
| [Requirements](REQUIREMENTS.md), [business definitions](BUSINESS_DEFINITIONS.md) | Functional commitments and metric/data meaning |
| [Architecture](ARCHITECTURE.md), [decisions](DECISIONS.md), [API](API.md), [database](DATABASE.md), [security](SECURITY.md) | Runtime boundaries, contracts and access responsibilities |
| [Latest post-defense Chapters 1–3](../references/CapstonePaper_1.pdf), PDF pp11–12 | User confirmed latest source on 16 October; bytes match the supplied post-defense PDF. Original objectives remain unchanged and traceable until fulfilled or explicitly amended |
| [Supplied Chapters 4–5 draft](../references/chapters/GROUP%209_MedShield_CP2_Chapter%204_5.pdf) and [revised working text](chapters/MedShield_Chapter_4_5_Revised_20261016.md) | Preserved source and complete section-by-section revision; older PRIVATE_SUMMER reference is no longer the latest-source label |
| [Paper revision guide](PAPER_REVISION_GUIDE.md), [Chapter 3 guide](CHAPTER_3_METHODOLOGY_GUIDE.md), [Chapter 4/5 plan](CHAPTER_4_5_EVIDENCE_PLAN.md) | Writing corrections and evidence assembly; newer scoped entries supersede older generic status rows |

[Detailed remaining-work checklist](REMAINING_WORK_DETAILED_CHECKLIST.md) remains a work inventory. Check its items against the dated sources before treating them as missing or complete. Obsidian is the linked working view described in [project memory](PROJECT_MEMORY.md); it is not another approval register.

## One delivery loop

**North Star → original objective → agreed definition/data contract → system or analytical deliverable → actual verification → manuscript claim/figure/table → applicable review.**

1. Select one bounded outcome and one accountable role using `.agents`; read its required skills. Review current diff, running tasks and relevant source contracts.
2. Record exact files, dependencies and numbered observable acceptance checks. One active outcome per owner; independent work may proceed in parallel.
3. Implement the smallest maintainable change, following the existing architecture.
4. Run the relevant checks and bind results to the checked source/revision, dataset/policy/table or model/run identity.
5. Update affected canonical facts, graph/export evidence and manuscript text. Complete the per-turn memory record and next-owner handoff.
6. Close only the assigned outcome after its checks pass. Keep original-objective, business-publication, operational and academic acceptance separate.

Use `assessing → ready → executing → verifying → done`, with `needs-fix` for failed verification and `blocked` for a named dependency. Track implementation, verification, paper integration and actual acceptance as separate dimensions. A captured prompt or completed discussion cannot close a task.

## Immediate completion sequence

| Order | Owner / deliverable | Exit evidence |
|---|---|---|
| 1. Reconcile scope | Business Analyst prepares original-versus-implemented O1–O5 packet | Every original criterion, actual capability, exact gap, feasible implementation or proposed amendment, evidence and decision owner represented |
| 2. Assemble working paper | Technical Writer uses the relevant supplied paper and repository inserts | Named working source, recorded baseline/source manifest, complete chapter structure and explicit unresolved claims; no extra user file is a prerequisite for preparation |
| 3. Assemble Chapter 4 evidence | Analyst plus implementation owners | Source-bound data-quality, descriptive, dashboard/export, predictive and bounded scenario evidence; inherited checks labelled |
| 4. Repair system findings | Assigned engineering/Security/Database owners | Re-check the current disposition of the [10 October QA findings](../outputs/system_qa_20261010/QA_REPORT.md), repair affected dependencies/migrations/validator/recovery contracts, then retain actual scoped checks |
| 5. Demonstrate integration | Orchestrator and QA | Same-release authenticated workflows, filters/exports, unavailable/recovery and audit behavior with pinned identities and residual risks |
| 6. Resolve retained objective gaps | Assigned data/catalog/model/inventory owners | Applicable AC-O1–AC-O5 evidence or an actual academic amendment; dependent activation remains gated |
| 7. Finish complete manuscript | Technical Writer and document QA | Integrated chapters, institutional numbering/citations, cross-reference review, complete rendered Word/PDF and inspection of every page |
| 8. Record formal decisions | Project lead, CEO, adviser/panel | Actual client usefulness and academic scope/review decisions, correction log and accountable next actions |

Scope packet, manuscript assembly and evidence preparation can proceed in parallel. A proposed scope amendment can be drafted without waiting for its approval; it remains proposed until the actual decision. Production hosting is a separate release matter and need not delay bounded research writing.

## Map the objectives without replacing them

| Original objective | Existing evidence to carry forward | Main remaining difference |
|---|---|---|
| O1: regional performance, YoY, STL | Company historical financial reporting and company monthly STL | Original study/territory/unit/decomposition scope and same-release acceptance |
| O2: territory/account/SKU priority, Pareto and XGBoost ABC | Source-label Pareto, observed deterministic ABC and mapped-area rankings | Approved sellable/account identities and future classification if retained |
| O3: territorial medicine demand, DII/RSI and urgency | Company monthly recorded net-sales/PHP research comparisons | Quantity/territory target, true calendar leads, origin-safe external joins, urgency truth and reviewed publication |
| O4: EOQ/ROP/weighted allocation, expiry wastage ≤5% | Entered commercial planning scenarios | Operational inputs, agreed method and measured outcome evidence |
| O5: five governed modules, CSV workflow, official alerts and matching | Module areas, controlled ingestion, gateway reporting and exports | Complete submission/retry/correction/publication, current acceptance and evaluated official-warning/matching scope |

These are summaries. The register owns exact contracts. Company-PHP forecasts do not fulfill medicine-quantity O3; scenarios do not prove reduced wastage. Current 2017–2025 reporting, original 2021–2025 study scope and 2020–2025 STL/modeling subsets need explicit explanation. No defensible whole-capstone percentage is defined.

## Paper assembly from existing files

No inspected canonical record designates a complete current editable manuscript. Use the current supplied PDF as the manuscript reference, preserve original commitments, and assemble a named working source from relevant repository materials rather than selecting an older Word file by editability alone.

Use the [10 October predictive Markdown draft](chapters/MedShield_Predictive_Chapter_4_5_Research_Draft_20261010.md), matching [Word insert](chapters/MedShield_Predictive_Chapter_4_5_Research_Draft_20261010.docx) and [verification packet](../outputs/predictive_chapters_20261010/README.md) together with the [15 October findings supplement](chapters/MedShield_Predictive_Findings_Update_20261015.md) and its [receipt](../outputs/predictive_findings_20261015/verification.json). These are bounded inserts, not a complete accepted manuscript. Existing system/earlier chapter Word drafts require reconciliation with current logic before reuse.

- Chapters 1–2: problem, original objectives, study scope, selected methods and literature; label proposed amendments and future work.
- Chapter 3: CRISP-DM/SEMMA, pipeline/architecture, metric populations, target/grain, temporal evaluation, provenance, scenario assumptions and governance.
- Chapter 4: data quality, descriptive findings, system behavior, executed QA, predictive comparisons and tested scenarios. Use the [descriptive checklist](../outputs/descriptive_activation_20261009/CHAPTER4_CHECKLIST.md).
- Chapter 5: answer each objective at its supported scope, explain measured results and limits, and distinguish recommendations from demonstrated outcomes.
- Complete paper: merge chapters, reconcile captions/tables/citations and inspect the complete rendered artifacts. Formal review is a separate step.

## Evidence and current constraints

Every consequential claim/figure/table needs objective, manuscript location, supported claim, evidence type, period/population/unit/coverage, source identity, actual check/date/result, limitation and next owner. Link existing receipts instead of copying changing metrics into multiple trackers. Label observed, derived, proxy, forecast and scenario evidence.

The 15 October findings-writing step is complete within its documented scope. Full manuscript integration, Word/PDF formatting and formal review remain open. Preserve the original versus later trials, development versus retrospective audit, supported cumulative leads and genuine future projection timing. The proposed research error goal is unachieved and separate from unset business limits.

Sales files are the only available source evidence reported by the user. `Date Delivered` is the recorded basis; original receipts are unavailable. Research writing proceeds with unverified physical events, independent completeness, original SKU quantities and unusual-month causes disclosed. Do not keep asking for unavailable receipts.

Runtime remains controlled sources → Databricks Bronze/Silver/Gold → serving bridges → Express/TypeScript gateway → authenticated Next.js dashboard. Supabase owns identity/roles/audit. Offline predictive evaluation uses frozen reconciled analytical inputs; serving requires governed publication. Required analytical failures return explicit unavailable states. The sales upload endpoint returns HTTP 409; use controlled Databricks ingestion.

External mapping/as-of/model gates, SKU/pack/unit identity and inventory/supplier/lead-time/expiry inputs remain required for their dependent claims. Retain original/adjusted source provenance; allocation reconciliation is not proof of original SKU demand. Follow current architecture/API entries for historical weather providers and publication state. Official live warnings, procurement execution and measured inventory benefit require their own evidence and decisions.
