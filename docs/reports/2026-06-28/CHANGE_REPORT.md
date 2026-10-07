# Change Report - 2026-06-28

## Scope

This report documents the MedShield repository changes made on 2026-06-28 for instruction cleanup, backend/frontend connectivity, schema review, UI information-density reduction, and system QA.

## Business Goal

Make the capstone dashboard easier to understand and safer to demonstrate by ensuring the frontend and backend connect correctly, API inputs are validated, schema direction is documented, and dense dashboard views are presented progressively.

## Changes Completed

### Agent and Skill Documentation

- Cleaned mojibake/encoding artifacts in `AGENTS.md` by replacing display-sensitive punctuation with ASCII-safe punctuation.
- Cleaned `.skills/technology-stack.md` by replacing the display-sensitive apostrophe in `paper's`.

### Backend and Service Connectivity

- Added gateway validation for `/api/products?limit=` so invalid limits return HTTP 400 instead of silently defaulting.
- Added matching validation in the Python product service.
- Verified local gateway health and authenticated dashboard API access.

### Frontend Connectivity

- Normalized `NEXT_PUBLIC_API_BASE_URL` handling in `frontend/lib/api.ts` by trimming trailing slashes.
- Verified the frontend can run against the rebuilt backend gateway.

### UI and Information Architecture

- Added a decision-focus panel to the dashboard overview so users see the main interpretation path first.
- Added a Compact vs Full Ledger control to the cleaned sales transaction view.
- Set the sales ledger to Compact by default to reduce overload while preserving audit detail on demand.
- Set weather validation to monthly aggregate by default, with daily API rows still available.
- Replaced dense separator characters in runtime UI status text with ASCII pipes for consistent display.

### Schema Review

- Reviewed the documented schema direction and migration inventory.
- No new schema migration was added because `supabase/migrations/007_namespaced_schema_alignment.sql` already covers the namespaced schema alignment path.
- Recommendation: apply migration `007` in the target Supabase environment before relying on namespaced tables in shared deployment.

### QA Review

- Added `docs/SYSTEM_QA_REVIEW.md` with findings across backend/API, frontend/API, UI density, schema, agents/process, and build quality.

## Verification Evidence

- `backend`: `npm run build` passed.
- `frontend`: `npm run build` passed.
- `services`: `python -m unittest services.tests.test_data_pipeline` passed 11 tests.
- Local backend smoke test on port `5001` passed:
  - Login using local admin succeeded.
  - Authenticated `/api/summary` returned revenue data.
  - Authenticated `/api/products?limit=3` returned 3 rows.
  - Authenticated `/api/products?limit=abc` returned HTTP 400.
- Local frontend smoke test on port `3001` returned HTTP 200 and was configured with `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001`.

## Remaining Risks

- The dashboard still depends on embedded legacy markup/script patched at runtime. This works, but it makes future UI QA harder than typed React components.
- The frontend build previously surfaced an existing Supabase Edge-runtime warning in the broader worktree. Final build passed, but middleware/runtime behavior should still be reviewed before production deployment.
- The worktree contains many pre-existing modified and untracked files outside this change report. They were not reverted.

## Recommended Next Step

Replace the embedded dashboard markup and script with typed React components page by page, starting with the Overview and Cleaned Sales Transactions views. This will make the UI easier to test, reduce bundle complexity, and make future information-density improvements safer.