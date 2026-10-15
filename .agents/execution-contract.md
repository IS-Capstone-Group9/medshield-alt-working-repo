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

## Skill-loading contract

Every role invocation includes its skills, whether the role is selected through `AGENTS.md`, requested by name, read directly from `.agents/<role>.md`, or assigned as supporting work.

1. Read the selected role's **Required skills** section. Open and apply its primary `.skills` file before specialist analysis, implementation or a final recommendation. These may be repository standards Markdown files or a folder's `SKILL.md`; both count as repository skills.
2. Load conditional skills only when their stated task boundary is affected. For assigned code changes, also use [coding](../.skills/coding-standards.md), [testing](../.skills/testing-standards.md) and [technology-stack](../.skills/technology-stack.md) guidance. For authentication, authorization, secrets, sensitive data or exposure use [security](../.skills/security-standards.md); for assigned branch/PR/CI work use [GitHub](../.skills/github-standards.md) guidance. Reading a skill does not authorize extra work or remote actions.
3. Follow affected canonical references and reconcile stale/conflicting skill text against those contracts and higher-priority instructions. A missing required skill is a dependency to recover or report; do not claim it was applied. Continue work that does not depend on it.
4. Record the applied skill paths and their task-specific use in the assignment/handoff. Prior reads may be reused when the content and scope still match; state that reuse rather than claiming a new read. Referencing a path alone is not skill application.
5. Give delegated workers their role, required skill paths, allowed files and acceptance checks. The recipient loads relevant guidance before acting; the owner checks that the handoff applies it. Do not load every role or skill for a narrow assignment.

Example: calling Data Analyst for a margin problem loads `analytics-frameworks.md`, applies its same-population metric contract and zero-denominator behavior, and uses the affected business definitions. Calling the same role to review a weather join also loads `database-standards.md`. The coaching skill applies when learning, lesson review or instruction evaluation is requested.

This is a mandatory repository workflow, not an agent launcher or an application-level skill discovery mechanism.

## Ownership and execution

- Use `assessing -> ready -> executing -> verifying -> done` as task states. `blocked` records a specific dependency or required input; `needs-fix` returns failed verification to the owning role. These are work-record labels, not commands to any scheduler or goal API.
- Move to ready only when the objective, scope, acceptance checks, dependencies, and tools are understood. Move to done only after the requested deliverable exists and required acceptance checks pass. A proposed fix or an unrun test is not completion.
- Inspect current code, working-tree changes, and available commands before modifying files. Discover commands from package scripts, tests, CI, and setup docs; never invent a tool or claim a command ran.
- Implement authorized work through verification. Analysis and design roles hand off implementable decisions; the accountable task owner continues into implementation when the user requested a working result.
- Own only assigned files. Coordinate shared-file edits and contract changes with the accountable owner before dependent work continues. Supporting review does not silently expand write scope.
- In a single-agent session, perform supporting roles sequentially and describe verification as self-review. Do not claim independent review or active workers that do not exist.
- When delegation is authorized, give each worker the objective, inspected context, allowed files, dependencies, acceptance criteria, verification commands, and handoff recipient. Parallelize only independent work; wait for shared contracts before implementing consumers. The owner integrates and checks the combined result.
- Reuse session authorization. Ask for approval only where the action or execution environment actually requires it. Do not bypass permission failures or expose secrets in investigation output.

## Evidence identity and defensible claims

- For consequential checks, bind evidence to the checked code revision and relevant uncommitted changes, execution time/timezone, environment, actual command or manual steps, expected/observed result, and evidence path. Record dataset ID, policy/table versions, model/run ID, or source hash when relevant; mark inapplicable fields rather than inventing identifiers. Never include credentials or sensitive raw records.
- A commit alone does not identify a dirty working tree. Describe the checked diff or reference a retained patch/hash when reproducibility requires it. Use existing receipts and output locations rather than creating duplicate evidence stores for routine tasks.
- Reuse evidence only when the affected code, configuration, data/model identity, and tested scope still match. Record inherited evidence as inherited; it is not a fresh execution. Changes invalidate dependent checks, not automatically every unrelated check.
- Trace consequential claims through requirement/objective -> decision/definition -> implementation -> verification -> evidence -> limitation. For MedShield, use the existing [objective/evidence register](../docs/OBJECTIVE_EVIDENCE_REGISTER.md), [business definitions](../docs/BUSINESS_DEFINITIONS.md), and applicable recorded acceptance decisions. Do not rewrite dated historical assessments as fresh evidence.
- State what was observed, inferred, proposed, or not verified. A fixture pass does not prove live integration; a technical pass does not grant business or academic approval; a scenario does not prove an operational outcome.

## Verification and recovery

- Match checks to risk: documentation links and consistency for instruction edits; focused tests for changed logic; boundary and user-flow checks for integrated behavior. Do not run application builds solely for Markdown edits.
- Record each acceptance criterion as pass, fail, or not verified, with the actual command/manual steps, result, and relevant file or output reference. A passing command must test the intended behavior to count as evidence.
- If a check fails, distinguish an implementation defect from environment failure, repair within scope, and rerun affected checks. Do not keep repeating an unchanged failing command; inspect the cause and change the approach.
- If blocked, record the failed action, evidence, attempted recovery, affected criterion, and exact dependency needed to resume. Continue unblocked work. Never substitute fabricated data, silently weaken a check, or label unverified work done.
- Review the final diff for accidental edits, stale references, and unresolved consumer changes. Report material limitations honestly.
- Choose failure checks from the affected risks: denied access, unavailable dependencies, missing versus zero data, partial periods, mismatched dataset/model versions, incompatible units, duplicate/retried writes, and infeasible planning inputs. Record expected failure behavior before checking it; omit unrelated cases with a short scope reason. Do not disrupt shared/live services to manufacture failures; use isolated fixtures or mocks when appropriate.
- For numerical results, use a documented formula, hand-solvable example, trusted source reconciliation, or separate recomputation as the expected-result basis. Repeating the same implementation is not independent validation. Define comparison tolerances from units/rounding and metric meaning before observing results.

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

```text
Objective and expected example:
Primary role and allowed files:
Skills applied (paths and task-specific use; identify reused reads):
Evidence inspected / assumptions:
Checked code/diff and data/model identity (as applicable):
Acceptance criteria and checks:
Impact / dependencies:
Plan and current state:
Changes delivered:
Verification: criterion | pass/fail/not verified | command or steps | evidence
Review mode: self-review / separate reviewer (identify actual reviewer)
Claim trace and limitations (as applicable):
Remaining issue and next owner/action (or none):
```

## Routing examples

- Broken year filter: Frontend Engineer owns the UI/runtime fix; assess the selected-year behavior and handler bridge, then verify selection, empty data, and regression behavior. Consult Backend Engineer only if the API contract is involved.
- Incorrect KPI: Data Analyst establishes the source, grain, and approved formula; Backend Engineer owns computation changes, BI Specialist owns presentation meaning, and Frontend Engineer owns affected UI. Assign exact files before editing and reconcile source-to-dashboard values before closing.
- Auth defect: Backend Engineer owns the server fix, Security Engineer assesses the trust boundary, and QA Engineer checks allowed and denied cases. Do not count successful login alone as authorization validation.
- Agent instruction update: Technical Writer owns role documents; use Orchestrator responsibilities to check routing and QA responsibilities to validate links, ownership, and completion rules. Markdown inspection is appropriate evidence; runtime reliability needs separate execution trials.
