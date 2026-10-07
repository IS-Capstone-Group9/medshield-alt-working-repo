# GitHub Standards

## Description
Defines the repository workflow for branches, commits, pull requests, and GitHub Actions in MedShield. Use this file when deciding how work should be packaged for review and how automation should support that process. Good GitHub hygiene keeps the capstone work reviewable, reproducible, and easy to present.

## Workflow
1. Create a focused branch for the change.
2. Implement the change in small, reviewable commits.
3. Run the relevant tests before opening the pull request.
4. Open a PR with a clear description of the scope and impact.
5. Keep the CI checks green before merge.
6. Treat workflow updates as part of the project’s delivery infrastructure.

## Rules
- Use concise, meaningful commit messages.
- Keep pull requests small enough to review without guesswork.
- Do not merge with failing quality gates unless the change is intentionally exempted and documented.
- Keep workflow files and deployment steps aligned with the repo's actual stack.
- Protect the main branch with the checks the project depends on.
- Treat automation changes with the same seriousness as application code.
- Keep branch, PR, and workflow naming understandable to the broader team.

## Project Conventions
- Use GitHub Actions for automation where the repo already expects it.
- Update PR templates and workflows when the delivery process changes.
- Treat release and deployment logic as code, not manual tribal knowledge.
