# Agent Execution Contract

Use this contract with the selected role. For a small fix, a brief plan and completion note are enough. Keep larger records in the existing chat, tracker, or evidence location.

## Assess and demonstrate understanding

Before editing, inspect the implementation, working tree, running tasks, and relevant project memory. Establish the current and expected outcome, evidence and assumptions, assigned files or components, dependencies, and numbered observable acceptance criteria. Define the plan and the check for each criterion.

Review affected business, architecture, data, analytics, security, operational, and QA impacts. Mark material exclusions briefly. For changed behavior, give an expected example and a relevant failure case. Resolve discoverable facts first and proceed with reasonable reversible assumptions. Ask only when an unknown materially affects correctness, scope, or authorization, and continue independent work.

## Skill-loading contract

1. For each primary or supporting role used, open its **Required skills**. Read and apply its primary repository skill before specialist work. Standards in `.skills/*.md` and packaged `SKILL.md` files both qualify.
2. Load conditional skills for affected boundaries only. For code changes, also apply [coding](../.skills/coding-standards.md), [testing](../.skills/testing-standards.md), and [technology stack](../.skills/technology-stack.md). Apply [security](../.skills/security-standards.md) for trust boundaries or sensitive data and [GitHub](../.skills/github-standards.md) for assigned branch, PR, or CI work.
3. Follow affected canonical guidance. Report a missing required skill and continue work independent of it. Reuse prior reads when their content and scope still apply. Record each applied skill path, its contribution, and any reused read in the handoff.

Open the needed sections of long references and expand the read when a dependency, failure case, or gate requires it. For shared memory, follow [scoped reading and worker briefs](../docs/PROJECT_MEMORY.md#scoped-reading-and-worker-briefs).

## Ownership and execution

- Move through `assessing → ready → executing → verifying → done`. Ready requires scope, criteria, dependencies, and a verification plan. Failed checks return to the owner as `needs-fix`. Record the dependency and recovery steps when `blocked`.
- Use one accountable owner. Apply supporting roles in the same turn for tightly coupled work. Delegate when authorized and a parallel task or independent check adds material value. Role files describe responsibilities. Workers are launched through available collaboration tools.
- Give each worker an outcome, scoped context and links, role and required skills, allowed files/actions, dependencies, criteria and checks, and a handoff recipient. Use scoped worker context when supported. Parallelize independent scopes, assign shared changes to one writer, and settle contracts before dependent edits. The accountable owner integrates, verifies the combined result, and records the turn.
- Implement the smallest maintainable change for authorized work. Preserve unrelated edits, reuse existing patterns, discover commands from the repository, and respect runtime and authorization boundaries. Update affected canonical guidance when behavior or operations change. An analysis-only request calls for findings and evidence.
- Label sequential review by the implementer as self-review. Name a separate reviewer only if one participated.

## Evidence identity and defensible claims

- Bind consequential results to the checked revision and relevant dirty diff, time and timezone, environment, actual command or steps, expected and observed result, and evidence location. Include applicable dataset, source hash, policy/table version, or model/run identifiers. Exclude secrets and sensitive raw records.
- Reuse prior evidence only while its code, configuration, data/model identity, and scope match. Label it inherited and rerun affected checks when those inputs change. Resolve current scope and status from current evidence and the latest user direction.
- Trace consequential claims through requirement, definition or decision, implementation, verification, and limitation. Use the [objective/evidence register](../docs/OBJECTIVE_EVIDENCE_REGISTER.md), [business definitions](../docs/BUSINESS_DEFINITIONS.md), and recorded acceptance decisions where applicable.
- Label observed, inferred, proposed, and unverified results distinctly. A fixture pass establishes fixture behavior. Live integration, business or academic acceptance, publication approval, and operational outcomes each require their own evidence.

## Verification and recovery

- Match checks to risk. Check links and routing for instruction edits, focused tests for logic, and boundary and user-flow behavior for integrated changes. Use application builds for applicable product checks.
- Record each criterion as pass, fail, or not verified with the command or manual steps and evidence. For numerical results, use a hand-worked example, trusted reconciliation, or separate calculation and set tolerances from units or rounding.
- Probe relevant failure modes such as denied access, unavailable sources, missing versus zero data, incompatible periods/units/versions, retries, and infeasible scenarios. Define expected behavior before checking and use isolated fixtures where live probes could disrupt shared services.
- Diagnose implementation versus environment failures. Fix within scope and rerun affected checks. For blockers, record the attempted action, evidence, recovery, affected criterion, and dependency needed to resume.
- Review the final diff and affected consumers. Finish only when the requested deliverable exists and required checks pass. Report unverified checks, open acceptance gates, and the next action and owner.

## Evaluating worker instruction changes

Instruction inspection proves document consistency, not better runtime performance. When evaluating worker reliability, use bounded, reproducible tasks in isolated fixtures/checkouts with known acceptance criteria; do not require a benchmark for every ordinary task.

| Representative task | Required behavior / failure probe |
|---|---|
| Documentation correction | Fix the assigned stale guidance, resolve local links, preserve unrelated edits, and avoid unnecessary application builds. |
| Year-filter defect | Verify selected-period outputs and partial/missing years across affected UI/API/export contracts. |
| Margin calculation defect | Reconcile the same eligible population and handle a zero denominator without inventing a rate. |
| Authentication or warehouse failure | Deny unauthorized access or show analytical unavailability; do not expose secrets or substitute mock live values. |
| Interrupted or invalid verification | Distinguish environment failure from product defect, retain failed evidence, and resume only the affected checks after recovery. |

- For a before/after comparison, hold the task snapshot, inputs, model/settings, tools, and acceptance rubric constant as far as possible; record differences and repeat trials before generalizing.
- Score each dimension as 0 (failed), 1 (partial), or 2 (met): correctness, scope/authorization control, evidence reproducibility, risk verification, and recovery/handoff quality. A fabricated pass, secret exposure, unauthorized mutation, or silent weakening of required criteria fails the trial regardless of total score.
- Record results in the existing task/evidence location: instruction revision, trial conditions, dimension scores with evidence, unresolved failures, and elapsed time/tool effort as secondary observations. Do not optimize speed at the expense of correctness or infer improvement from one successful run.
- Use recurring failures to revise the smallest relevant instruction or test. Add roles or gates only when the observed failure requires them; evaluation itself does not launch agents or authorize external actions.

## Assignment and handoff record

Use only the applicable fields. Keep assignment and verification evidence together when practical.

```text
Objective and expected behavior:
Owner, allowed files/actions, dependencies, handoff recipient:
Skills applied and how they informed the work:
Relevant evidence, assumptions, and acceptance criteria:
Plan and current state:
Delivered changes and checked revision/diff/data identity:
Verification by criterion (pass/fail/not verified, command or steps, evidence):
Review mode, limitations, and open gates:
Next action and owner:
```

## Routing examples

- Broken year filter: Frontend Engineer owns the UI/runtime fix and checks selection, empty data, and the handler bridge. Add Backend Engineering when the API contract is affected.
- Incorrect KPI: Data Analyst establishes source, grain, and approved formula. Assign computation and presentation to the affected owners and reconcile the source through to the dashboard.
- Authentication defect: Backend Engineer owns the server fix with Security and QA support for allowed and denied cases.
- Agent instruction update: Technical Writer owns the change with QA support for links and routing. Use execution trials for behavioral performance claims.
