# CLAUDE.md

Guidance for Claude Code in this repository. [AGENTS.md](AGENTS.md) is the full operating contract (roles in `.agents/`, standards in `.skills/`); this file is the quick orientation. Where they differ, AGENTS.md and the canonical docs win.

## What this is

MedShield is an enterprise Decision-Support System for pharmaceutical distribution and inventory planning under seasonal disease surges in the Philippines (CALABARZON / MIMAROPA / Bicol). It is a capstone workspace, so code, evidence packets, and paper drafts live side by side.

## Layout

| Path | Role |
|---|---|
| `frontend/` | Next.js 16 (App Router) + React 19 + TypeScript dashboard. Playwright e2e in `frontend/e2e/`. |
| `backend/` | Express + TypeScript API gateway (CommonJS). Tests in `backend/tests/*.test.ts`. |
| `services/` | Offline Python analytics and model jobs (`analytics_service/`, `product_service/`) plus `services/tests/`. Never a dashboard runtime source. |
| `databricks_updated_2/` | Main local Databricks folder. `databricks_updated/` and `databricks/` are historical and evidence only. Remote `/Workspace/medshield/` paths are unchanged. |
| `supabase/` | SQL migrations/seeds for auth, linked roles, and audit only. |
| `docs/` | Canonical documentation (start with `CURRENT_STATE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `API.md`, `DATABASE.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `DOCUMENTATION_INDEX.md`). |
| `outputs/`, `output/` | Generated QA reports, model outputs, and dated evidence packets. Do not treat these as runtime sources. |
| `data/medshield/raw/` | Canonical raw sales and external files. `processed/` is never a dashboard fallback. |
| `.agents/`, `.skills/`, `.codex/` | Role definitions, standards, and the Obsidian project-memory config. |

## Runtime architecture

Sales files, DOH, PAGASA, and NASA POWER data go to Databricks Bronze, then Silver, then Gold. SQL bridge views expose stable shapes. The Express gateway queries Databricks with server-only credentials, and the Next.js frontend calls only the gateway. Supabase provides auth, linked roles, and audit persistence, and no analytical measures.

Key backend modules in `backend/src/`:
- `server.ts` and `httpServer.ts`: gateway entry and HTTP lifecycle (keep-alive 5 s, idle-close 10 s).
- `databricks*.ts`: SQL Statement Execution, a queue with concurrency/timeout/cache settings, and literal escaping.
- `*Research.ts`, `*Publication.ts`, `*Evidence.ts`, `*Review.ts`: hash-bound research candidates and publication gates.
- `requestContext.ts`, `sessionAuth.ts`, `supabaseIdentity.ts`, `localAuth.ts`: request metrics and auth.

Frontend dashboard: `frontend/lib/medshieldReference.ts` holds `MEDSHIELD_STYLE`, `MEDSHIELD_MARKUP`, and `MEDSHIELD_SCRIPT`. `frontend/services/api/dashboard-engine.ts` compiles and runs the script with `new Function(script)()`. Many sibling files in `frontend/services/api/` add panels, runtimes, and enhancements.

## Commands

Run from the directory shown. Node 22 (`.nvmrc`).

```bash
# Backend (backend/)
npm ci
npm run dev                                   # tsx watch src/server.ts
npm run build                                 # tsc
node --import tsx --test tests/*.test.ts      # full gateway suite (CI)
node --import tsx --test --test-concurrency=1 tests/<file>.test.ts   # focused/serial

# Frontend (frontend/)
npm ci
npm run dev        # next dev
npm run lint
npm run build      # next build --webpack
npx playwright test e2e/<spec>.ts             # baseURL http://localhost:3000
node e2e/dashboard-script-bindings.cjs        # run from the repo root; checks the CSV helper binding

# Python (repo root)
python scripts/restore_test_fixtures.py       # run before the Python/backend suites
python -m unittest discover -s services/tests -v
python -m unittest discover -s databricks_updated/medshield_project/tests -v
python -m unittest services.analytics_service.jobs.test_descriptive_stl -v

# Compose
docker compose --env-file .env.example config --quiet
```

CI (`.github/workflows/ci.yml`) runs backend build and tests, frontend lint and build, Python tests, and Docker builds. Copy `.env.example` to `.env` for local setup. Never print or commit secrets.

## Rules that are easy to violate

1. **Process safety:** Check running tasks and the working tree before editing. Never run `npm run build` while `next dev` is running, because it corrupts `.next`. The working tree usually holds many unrelated uncommitted changes, so preserve them.
2. **Inline handlers:** Any `onclick` in `MEDSHIELD_MARKUP` must be listed in `DASHBOARD_GLOBAL_HANDLERS` in `dashboard-engine.ts` and bridged to `window` in the execution closure.
3. **Unicode:** Use real characters (`₱ ± – —`) in generated code and markup. Never write `₱`-style escapes as literal text.
4. **Production-minified helpers:** Optimization can rename a function's `toString()` output, so explicitly bind helpers referenced by generated script code.
5. **Sidebar:** `.nav-item` needs `position: relative !important; overflow: hidden;`. Don't add bare `[data-tooltip]` to `.nav-item` without suppressing its pseudo-elements.
6. **Topbar filters:** `topbarYearSelect` is for a single year, and `yoyBaseYearSelect` / `yoyTargetYearSelect` are for Y/Y. Support arbitrary years from 2017 onward.
7. **No analytical fallbacks:** If Databricks or a Gold object fails, return an explicit error and show an unavailable state. Never substitute bundled, mock, seeded, local-file, Python-snapshot, or Supabase analytical data. Only audit logging may fall back locally.
8. **Secrets:** Databricks credentials and Supabase server secrets stay in the gateway. Never put them in browser code or `NEXT_PUBLIC_*`.
9. **Sales ingestion:** `POST /api/sales/upload` returns `409 DATABRICKS_INGESTION_REQUIRED`. New sales data goes through the Databricks pipeline (see `databricks_updated_2/README.md` and `docs/API.md`).
10. **Evidence gates:** `PASS_CANDIDATE` and passing checks are not business approval. Preserve dataset identity, policy versions, quality status, provenance, and candidate labels. Keep observed, derived, proxy, forecast, and scenario evidence distinct. Candidate results never authorize procurement.
11. **Python:** Python jobs run offline. Dashboard requests never start Flask or train models.
12. **Disease and weather logic (decision 017):** DOH/PAGASA/NASA POWER data inform planning (risk calendar, indicator, buffer scenario) and never drive forecasts; mean_6 stays the reference. Only a new pre-registered challenger that beats mean_6 on held-out months can change this.

## Gateway tuning

`DATABRICKS_QUERY_CONCURRENCY` defaults to 3 (the local verified profile uses 6). Related settings are `DATABRICKS_QUERY_MAX_QUEUED`, `DATABRICKS_QUERY_QUEUE_TIMEOUT_MS`, and `DATABRICKS_QUERY_CACHE_*`. `GATEWAY_REQUEST_METRICS=1` emits per-request timing. See `docs/SETUP.md` and `docs/API.md`.

## Workflow expectations (from AGENTS.md)

- Pick one accountable role from `.agents/` (start with `worker-operating-model.md` and `execution-contract.md`) and read its required skills before specialist work.
- Plan before implementing: goals, architecture, database, security, and analytics impact.
- Read the relevant canonical docs before editing. Put changing versions and validation counts in `docs/CURRENT_STATE.md` rather than duplicating them elsewhere.
- Project memory (`docs/PROJECT_MEMORY.md`, `.codex/obsidian-memory.local.json`) requires a dated turn record per user turn when the vault is configured. Memory is context, not authority.
- Never infer completion from discussion or an unrun test. Report failures faithfully.
