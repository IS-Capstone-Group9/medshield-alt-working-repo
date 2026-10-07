# MedShield Project

MedShield Business Analytics is a historical decision-support capstone for pharmaceutical sales, product and territory prioritization, forecast evaluation, and reviewed planning scenarios.

## Current stack

- Frontend: Next.js, React, TypeScript, and Chart.js in `frontend/`.
- Gateway: Express and TypeScript in `backend/`.
- Analytical system of record: Databricks Unity Catalog.
- Identity and application accounts: Supabase Auth.
- Audit persistence: Supabase when configured; local audit-file fallback applies only to audit events.
- Offline analytics: Python jobs and tests in `services/`; these are not required by the live dashboard.

## Current objective

Provide a traceable dashboard whose displayed analytical values come from Databricks Gold, whose candidate and scenario limitations are visible, and whose outputs can support the capstone without claiming live surveillance or automated procurement.

Read [CURRENT_STATE.md](CURRENT_STATE.md) before using older plans or evidence reports.
