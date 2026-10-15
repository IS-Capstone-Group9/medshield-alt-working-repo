# Database Standards

## Description
Defines database rules for MedShield's Databricks analytical contracts and Supabase identity/audit store. Use it for schema/view design, compatible migrations, grain, join integrity, access and retention. [Database responsibilities](../docs/DATABASE.md), [architecture](../docs/ARCHITECTURE.md) and [decisions](../docs/DECISIONS.md) control the store and publication boundaries.

## Workflow
1. Identify the store, data owner and current schema/views; distinguish Databricks analytics from Supabase identity/audit and historical seed models.
2. Design the schema change with the dashboard and API consumers in mind.
3. Prepare the change through the affected store's documented migration/notebook/publication path and update dependent contracts. Preparation does not authorize remote execution.
4. Check keys, indexes, and query patterns for performance impact.
5. Document the operational effect of the change.
6. Confirm the data model still supports the business questions in the paper.

## Rules
- Use the affected store's documented, versioned structural-change process; do not assume PostgreSQL migrations or indexes apply to Databricks tables.
- Preserve referential integrity and data clarity.
- Choose store-appropriate performance controls from known query patterns; add PostgreSQL indexes only when justified for the affected Supabase query.
- Keep warehouse tables and reporting views aligned with the current dashboard requirements.
- Review any row-level security or access policy implications when data exposure changes.
- Do not make direct ad hoc schema edits that bypass the repo's migration flow.
- Prefer designs that are easy to reason about when someone is debugging a report or a data load.
- Keep the schema aligned with the analytical slices used in the capstone narrative.

## Grain, joins and evidence

Apply Chapter 3's data-contract and lineage concepts before a consequential transformation:

- Declare source/version identity, grain, keys, uniqueness, unit, period/time zone, provider and mapping/approval status.
- Specify join cardinality and unmatched-record treatment before execution. Multiple provider rows at one territory/month must not multiply sales when aggregated.
- Check expected counts and reconcile relevant pre/post-join measures over equivalent eligible populations. A passing uniqueness test alone does not prove measure preservation.
- Distinguish retry duplicates from legitimate repeated source records; content equality alone does not justify discarding transactions.
- Preserve source evidence, missing observations, dispositions, provenance and candidate labels through downstream contracts. Derived buyer labels are not approved territorial join keys.
- Use [analytics frameworks](analytics-frameworks.md) for metric eligibility and calculations. Required Databricks failure produces analytical unavailability; Supabase/seed/local tables are not dashboard substitutes.

## Project Conventions
- Follow [database](../docs/DATABASE.md), [implementation](../docs/IMPLEMENTATION.md) and the affected current Databricks runbook; resolve runbook paths from current guidance rather than copying dated paths.
- Keep dimension and fact relationships explicit.
- Supabase seed/legacy analytical models are local/historical context; they do not supply runtime dashboard measures. Coordinate identity/audit migrations and Databricks publication separately.
