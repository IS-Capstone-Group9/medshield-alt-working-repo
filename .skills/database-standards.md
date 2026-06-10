# Database Standards

## Description
Defines the database rules for the MedShield Supabase PostgreSQL warehouse. Use this file for schema design, migrations, indexing, data integrity, and backup awareness. Database work should preserve the reporting model rather than accidentally breaking it. A change is not complete until the schema, its relationships, and its downstream consumers still make sense together. In capstone terms, the database should support clean reporting on sales, territory, product, and seasonality data.

## Workflow
1. Review the current schema, seed data, and warehouse views.
2. Design the schema change with the dashboard and API consumers in mind.
3. Apply the change through a migration and update any dependent views or seed data.
4. Check keys, indexes, and query patterns for performance impact.
5. Document the operational effect of the change.
6. Confirm the data model still supports the business questions in the paper.

## Rules
- Use migrations for all structural changes.
- Preserve referential integrity and data clarity.
- Add indexes only when they support known or likely query paths.
- Keep warehouse tables and reporting views aligned with the current dashboard requirements.
- Review any row-level security or access policy implications when data exposure changes.
- Do not make direct ad hoc schema edits that bypass the repo's migration flow.
- Prefer designs that are easy to reason about when someone is debugging a report or a data load.
- Keep the schema aligned with the analytical slices used in the capstone narrative.

## Project Conventions
- Follow the schema direction in `docs/DATABASE.md` and `docs/IMPLEMENTATION.md`.
- Keep dimension and fact relationships explicit.
- Treat seed data as part of the documented local setup path.
