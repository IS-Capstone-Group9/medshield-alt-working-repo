# Coding Standards

## Description
Defines the general code quality bar for the MedShield repository. Use these standards for naming, structure, readability, and maintainability across all languages in the project. The code should read as if the next person may need to change it quickly under pressure, because that is often true. For this capstone, coding standards should protect both the technical delivery and the credibility of the business story.

## Workflow
1. Read the relevant docs and existing code before editing.
2. Make the smallest change that satisfies the requirement.
3. Keep the implementation consistent with local patterns.
4. Review the diff for readability, duplication, and test impact.
5. Update documentation when the code changes behavior or usage.

## Rules
- Use clear, domain-specific names.
- Keep functions and modules small enough to understand without extra context.
- Avoid duplicating logic that can be shared cleanly.
- Prefer explicit data flow over hidden side effects.
- Comment only when the code is not self-evident.
- Keep formatting, linting, and type checks clean.
- Do not commit secrets, placeholder code, or throwaway debug output.
- When a file starts accumulating special cases, step back and simplify the shape instead of adding more branching.

## Capstone Focus
- Preserve terminology that matches the business analysis and paper.
- Keep code changes traceable to a requirement, an architecture decision, or a data need.
- Avoid implementation details that make the dashboard harder to explain in documentation.
