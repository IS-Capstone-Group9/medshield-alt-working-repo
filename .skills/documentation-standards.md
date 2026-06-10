# Documentation Standards

## Description
Defines how MedShield documentation should be structured, maintained, and reviewed so the repo stays usable for future work. Documentation should help a reader orient themselves, follow setup steps, understand architecture, and find the current source of truth without needing tribal knowledge. For this capstone, the writing also needs to support the paper by making the business and technical story easy to follow.

## Workflow
1. Start from the canonical docs already in the repository.
2. Update the document that matches the change instead of creating duplicate guidance.
3. Verify that instructions, paths, and commands match the current codebase.
4. Keep the wording direct and easy to follow.
5. Review docs whenever behavior, setup, or architecture changes.
6. Make sure the language is consistent with the business analysis and implementation chapters.

## Rules
- Keep docs aligned with implementation.
- Use a single source of truth for setup, architecture, requirements, and deployment.
- Prefer short sections with direct instructions.
- Include prerequisites, steps, and validation where relevant.
- Remove stale placeholders instead of leaving them behind.
- Write in a way that a contributor can act on immediately.
- Keep terminology consistent across technical and business documents.

## Project Conventions
- The docs directory is canonical for project-level guidance.
- Update setup and implementation docs when the stack or flow changes.
- Keep terminology consistent across all markdown files.
