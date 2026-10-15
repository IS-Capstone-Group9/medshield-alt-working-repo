# Agent and skill integration

Completed: 8 October 2026, Asia/Manila. Accountable role: Technical Writer. Read-only reviewer: `agent_skill_audit`. Fresh trial workers: `direct_role_skill_trial` and `named_agent_skill_trial`.

## Delivered behavior

Calling `.agents`, a named worker, a role file or a supporting role now includes reading and applying its primary skill and applicable conditional skills before specialist work. [AGENTS.md](../../../AGENTS.md) defines the entry point; the [execution contract](../../../.agents/execution-contract.md#skill-loading-contract) defines loading, conflict handling, delegation and the skills-applied handoff. All 16 role files declare their required skills. Role files own responsibilities, skills own reusable methods, and canonical docs own product contracts.

Reviewed lesson concepts now improve the ordinary worker guidance directly:

- Business framing establishes the decision, evidence, assumptions, baseline, units and measurable outcome before selecting a model or feature.
- Analytical work defines metric populations, comparison periods, diagnostic versus causal claims, forecast origins/leads, available features, preprocessing boundaries and training-based MASE scaling.
- Database work defines grain, join cardinality, provider identity, mapping status and pre/post-join reconciliation. Missing observations remain distinct from measured zero.
- Reporting aligns charts, tables and exports while preserving source and candidate identity, percentage versus percentage-point meanings and explicit analytical unavailability.

Architecture, database, backend and service instructions also resolve stale runtime/store wording: Databricks supplies analytics through the TypeScript gateway; Supabase owns identity and audit; Python analytics jobs remain offline. Reading a skill grants no additional execution or publication authority.

## Acceptance and verification

| Criterion | Result | Evidence |
|---|---|---|
| All existing roles route to valid skills; instruction links and heading targets resolve | Pass: 16 roles, zero errors | [routing.json](routing.json); `python -X utf8 .agents/scripts/check_skill_routing.py` in full mode |
| Missing primary skill and new role without a primary skill are detected | Pass in isolated temporary fixtures | [verification.json](verification.json) |
| Coaching skill schema and instruction whitespace checks | Pass | [verification.json](verification.json); validator and exact commands recorded by [verify_integration.py](verify_integration.py) |
| Direct Data Analyst file call reads and applies skills | Pass within one synthetic task | [First assignment and response](direct-role-trial.md): identified revenue 300 versus inflated 600, preserved weather-provider identities, rejected unsupported causal and procurement claims, specified checks and owners |
| Named Business Analyst call reads and applies skills | Pass within one brief-only task | [First assignment and response](named-role-trial.md): bounded historical revenue reporting, separated unmeasured wastage outcomes, defined prerequisites and acceptance, applied primary and conditional skills |
| Independent review preserves hierarchy, ownership, scope and canonical boundaries | Pass: no blocking findings | `agent_skill_audit` reviewed snapshot-relative changes and ran the full routing check |

The automated integration receipt contains seven passing checks. [Before snapshots](before/) and [their manifest](before-manifest.json) preserve the already-dirty instruction state; current instruction hashes in the routing receipt identify the checked guidance. The baseline lacked the new explicit primary declarations. That structural comparison is not a behavioral baseline.

## First-attempt assessment

Root assessed the retained first responses using the shared execution-contract rubric: 0 failed, 1 partial, 2 met. No hints or corrected retries were used for these trials.

| Dimension | Direct role | Named role | Basis |
|---|---:|---:|---|
| Correctness | 2 | 2 | Direct trial reconciles the synthetic join to 300; named trial separates historical revenue from wastage and correctly distinguishes relative reduction from percentage points |
| Scope and authorization | 2 | 2 | Both remained within their read-only assignments and made no application, network or cloud calls |
| Evidence reproducibility | 1 | 1 | Original assignment/response and instruction hashes retained; inherited model/runtime settings and elapsed/tool-effort measurements were not independently logged |
| Risk verification | 2 | 2 | Read-only reasoning addresses supplied claim failures and specifies observable boundary/edge checks; proposed live behavior is explicitly unverified |
| Recovery and handoff | 2 | 2 | Both identify the required evidence, responsible implementation owners, acceptance and remaining limits |

These assessments establish the two tested routing/application scopes. They are not before/after benchmarks or evidence of a general performance gain. No model weights were trained, app build was needed, or runtime behavior changed. Future compliance still depends on the worker following the instructions; the routing checker validates documentation structure rather than enforcing model behavior.

Applied by the accountable writer: `.skills/documentation-standards.md` for canonical placement and accurate claims; `.skills/analytics-lesson-coaching/SKILL.md` for corrected lesson transfer and bounded first-attempt assessment; `.skills/testing-standards.md` for routing and failure probes; affected analytics, business, database, architecture, backend and frontend standards for consistency. The available `skill-creator` guidance informed scope and schema validation. Earlier lesson-review receipts remain historical.

No required follow-up remains for this instruction update. Future worker assignments should use the Required skills and include their applied paths and task-specific use in the handoff.
