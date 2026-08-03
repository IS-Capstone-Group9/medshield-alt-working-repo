# System QA Review

## Scope

Review date: 2026-06-28

This review covers the MedShield backend gateway, Python services, Supabase schema alignment, agent operating instructions, and dashboard UI information density.

## Findings and Actions

| Area | Finding | Action Taken | Residual Risk |
|---|---|---|---|
| Backend/API | Product endpoint accepted invalid `limit` values at the gateway and silently defaulted. | Added integer/range validation in the TypeScript gateway and Python product service. | Other query params should receive the same validation pattern as endpoints expand. |
| Frontend/API | API base URL could produce double slashes when `NEXT_PUBLIC_API_BASE_URL` ended with `/`. | Normalized `API_BASE_URL` by trimming the trailing slash. | Keep this pattern in future API helpers. |
| UI density | Sales transaction view showed the full 13-column ledger by default, increasing cognitive load. | Added Compact vs Full Ledger detail mode. Compact is the default and keeps evidence available on demand. | Full ledger remains dense by design for audit/reconciliation use. |
| UI density | Overview lacked a short decision-first guide before detailed charts/status panels. | Added a Decision Focus panel with primary signal, review signal, and guardrail. | Longer embedded legacy dashboard code should eventually be replaced with typed React components. |
| Weather validation UI | Weather validation opened daily rows by default, creating a noisy table. | Defaulted validation to monthly aggregate while keeping daily rows available. | Provider refresh still depends on external network availability. |
| Schema | Current migration direction aligns to namespaced MedShield schemas and public API views. | No schema migration was required for this pass. | Apply `007_namespaced_schema_alignment.sql` in target Supabase before relying on namespaced tables in shared environments. |
| Agents/process | `AGENTS.md` and worker files provide enough sequencing and QA guidance. | Followed orchestrator, frontend, backend, database, security, and QA guidance for this pass. | Keep role files current when ownership or quality gates change. |
| Build quality | Frontend build warns about Supabase middleware importing code that uses a Node API under Edge runtime. | Documented as a QA finding; not changed in this pass. | Review middleware runtime or Supabase SSR usage before production deployment. |

## Verification Evidence

- `backend`: `npm run build` passed.
- `frontend`: `npm run build` passed with the existing Supabase Edge-runtime warning.
- `services`: `python -m unittest services.tests.test_data_pipeline` passed 11 tests.
- `services`: `python -m compileall services backend` passed syntax compilation.
- Gateway health: `GET /api/health` returned `status: ok`.
- Auth smoke test: local admin login returned a bearer token.
- Dashboard API smoke test: authenticated `GET /api/summary` returned revenue data.
- Product validation smoke test: authenticated `GET /api/products?limit=3` returned 3 rows; `limit=abc` returned HTTP 400.
- Frontend smoke test: `http://127.0.0.1:3001` returned HTTP 200 with `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5001`.

## Recommendation

The next highest-value cleanup is to replace the embedded legacy dashboard markup/script with typed React components page by page. That would reduce bundle warnings, make UI behavior testable, and prevent future information-overload fixes from relying on string patching.