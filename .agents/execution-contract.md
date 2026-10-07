# Agent Execution Contract

Every role applies this contract alongside its specialist guidance. Scale the record to the task: a short plan and completion note are enough for a small fix. Keep longer records in the task conversation or an existing project tracker, without creating duplicate planning documents.

## Assess and demonstrate understanding

Before editing, establish:

- Objective: who needs what outcome, and the current versus expected behavior.
- Evidence: inspected files, relevant decisions, reproduction or source observations. Label assumptions separately; do not present inferred behavior as observed.
- Acceptance: numbered, observable criteria and how each will be checked.
- Ownership: one primary role, exact file/component scope, supporting responsibilities, and dependencies.
- Impact: business, architecture, data/analytics, security, operations, and QA; mark unaffected areas not applicable with a short reason.
- Readiness: required inputs, available tools, permissions, runtime state, and planned verification.

Explain one concrete expected example and a relevant failure or edge case for behavior changes. Resolve discoverable facts from the repository first. For reversible details, state a reasonable assumption and proceed. Ask only when missing information materially changes correctness, scope, or authorization; continue independent work while waiting.

## Ownership and execution

- Use `assessing -> ready -> executing -> verifying -> done` as task states. `blocked` records a specific dependency or required input; `needs-fix` returns failed verification to the owning role. These are work-record labels, not commands to any scheduler or goal API.
- Move to ready only when the objective, scope, acceptance checks, dependencies, and tools are understood. Move to done only after the requested deliverable exists and required acceptance checks pass. A proposed fix or an unrun test is not completion.
- Inspect current code, working-tree changes, and available commands before modifying files. Discover commands from package scripts, tests, CI, and setup docs; never invent a tool or claim a command ran.
- Implement authorized work through verification. Analysis and design roles hand off implementable decisions; the accountable task owner continues into implementation when the user requested a working result.
- Own only assigned files. Coordinate shared-file edits and contract changes with the accountable owner before dependent work continues. Supporting review does not silently expand write scope.
- In a single-agent session, perform supporting roles sequentially and describe verification as self-review. Do not claim independent review or active workers that do not exist.
- When delegation is authorized, give each worker the objective, inspected context, allowed files, dependencies, acceptance criteria, verification commands, and handoff recipient. Parallelize only independent work; wait for shared contracts before implementing consumers. The owner integrates and checks the combined result.
- Reuse session authorization. Ask for approval only where the action or execution environment actually requires it. Do not bypass permission failures or expose secrets in investigation output.

## Verification and recovery

- Match checks to risk: documentation links and consistency for instruction edits; focused tests for changed logic; boundary and user-flow checks for integrated behavior. Do not run application builds solely for Markdown edits.
- Record each acceptance criterion as pass, fail, or not verified, with the actual command/manual steps, result, and relevant file or output reference. A passing command must test the intended behavior to count as evidence.
- If a check fails, distinguish an implementation defect from environment failure, repair within scope, and rerun affected checks. Do not keep repeating an unchanged failing command; inspect the cause and change the approach.
- If blocked, record the failed action, evidence, attempted recovery, affected criterion, and exact dependency needed to resume. Continue unblocked work. Never substitute fabricated data, silently weaken a check, or label unverified work done.
- Review the final diff for accidental edits, stale references, and unresolved consumer changes. Report material limitations honestly.

## Assignment and handoff record

```text
Objective and expected example:
Primary role and allowed files:
Evidence inspected / assumptions:
Acceptance criteria and checks:
Impact / dependencies:
Plan and current state:
Changes delivered:
Verification: criterion | pass/fail/not verified | command or steps | evidence
Remaining issue and next owner/action (or none):
```

## Routing examples

- Broken year filter: Frontend Engineer owns the UI/runtime fix; assess the selected-year behavior and handler bridge, then verify selection, empty data, and regression behavior. Consult Backend Engineer only if the API contract is involved.
- Incorrect KPI: Data Analyst establishes the source, grain, and approved formula; Backend Engineer owns computation changes, BI Specialist owns presentation meaning, and Frontend Engineer owns affected UI. Assign exact files before editing and reconcile source-to-dashboard values before closing.
- Auth defect: Backend Engineer owns the server fix, Security Engineer assesses the trust boundary, and QA Engineer checks allowed and denied cases. Do not count successful login alone as authorization validation.
- Agent instruction update: Technical Writer owns role documents; use Orchestrator responsibilities to check routing and QA responsibilities to validate links, ownership, and completion rules. Markdown inspection is appropriate evidence; runtime reliability needs separate execution trials.
