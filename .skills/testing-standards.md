# Testing Standards

## Description
Defines the testing strategy for MedShield. Use this file to decide where a change should be tested, what level of coverage is needed, and what must run in CI. Testing should follow the shape of the risk: logic gets unit coverage, boundaries get integration coverage, and user journeys get end-to-end coverage. For a capstone system, this also means checking that the data and analytics outputs still support the narrative in the paper.

## Workflow
1. Derive tests from the requirement or bug report before coding.
2. Decide the lowest useful test layer first: unit, integration, or end-to-end.
3. Add regression coverage for any behavior that changed.
4. Run targeted tests locally before pushing.
5. Keep the CI path focused on the checks that protect the project most.
6. Verify the test story covers both technical correctness and the business-facing result.

## Rules
- Use the test pyramid: prefer unit tests for logic, integration tests for service boundaries, and end-to-end tests for critical user journeys.
- Do not rely on manual verification for repeatable behavior.
- Keep tests deterministic and isolated from unstable external services where possible.
- Add regression tests for bugs that are fixed.
- Mark or fix flaky tests instead of normalizing them.
- Make sure high-risk changes have coverage at the correct layer.
- If a bug escaped once, the fix should usually come with a test that would have caught it.
- If a dashboard value or report output matters to the user, it should be validated somewhere in the test strategy.

## Scope Guidance
- Unit tests: pure logic, formatting, validation, helpers, and edge cases.
- Integration tests: API contracts, database access, service boundaries, and inter-module behavior.
- End-to-end tests: core dashboard flows, authentication flows, and critical user paths.

## Agent and skill instruction changes

For instruction-only edits, verify role-to-skill routing, local links, ownership and consistency with canonical contracts; do not run application builds solely for Markdown changes. Use `python -X utf8 .agents/scripts/check_skill_routing.py` for routing coverage.

When evaluating behavior, use bounded tasks with independent expected results under the [execution contract's worker evaluation protocol](../.agents/execution-contract.md#evaluating-worker-instruction-changes). Retain first attempts, hints and corrected retries separately. Select failure probes from the actual task, such as a missing skill, inflated join, unsupported forecast lead or unavailable source. Repeated comparable baseline/revised trials are needed for a performance-improvement claim; passing link checks or one fresh worker task establishes only that tested scope.
