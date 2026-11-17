# Documentation Standards

Use this skill for canonical docs, contributor workflows, and repository instruction maintenance.

- Start from the current implementation and affected canonical contracts. Write for the intended reader and include prerequisites, actions, and validation where useful.
- Keep shared workflow in the [execution contract](../.agents/execution-contract.md), role ownership and skill links in `.agents/`, specialist methods in `.skills/`, and project behavior and approvals in `docs/`. Scope new guidance to the task or role that needs it.
- Preserve each role's Required skills and its link to the [skill-loading contract](../.agents/execution-contract.md#skill-loading-contract). Use links to existing guidance and retain the canonical architecture, security, provenance, and approval rules.
- Update superseded current instructions in place. Preserve dated evidence with its source, population, and scope. Follow the [project-memory guide](../docs/PROJECT_MEMORY.md) for compact summaries and evidence links.
- Verify referenced paths, anchors, commands, ownership, and consistency. For instruction edits, apply [testing standards](testing-standards.md#agent-and-skill-instruction-changes) and distinguish a structural check from a behavioral trial or an approval.
- For lesson-derived changes, follow the [coaching skill's source guidance](analytics-lesson-coaching/SKILL.md#source-material) and retain the source and slide references where available.
