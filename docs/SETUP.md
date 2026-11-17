# MedShield Project Setup

## Local load and image verification — 5 November 2026

Compose now forwards the source adapter, query concurrency, CORS and seven optional analytical selectors. Resolve the explicitly selected profile with `docker compose --env-file backend/.env config --quiet`; the bare root profile still requires a validated fact pin. Optional selectors do not grant publication approval. Both build contexts now exclude local environment files and generated artifacts. Browser-public settings are build-time inputs; the tested QA image uses the loopback API address. Use the actual approved origin/API settings for a hosted image.

Local image checks passed. [Current scope and limits](CURRENT_STATE.md#local-load-and-image-verification--5-november-2026) and [image/configuration receipts](../outputs/load_release_review_20261105/README.md) own the results. Docker Desktop remains running; named QA containers were removed and images retained.

## HTTP connection lifecycle — 5 November 2026

Gateway startup uses `createGatewayHttpServer`: advertised keep-alive is five
seconds, with a bounded ten-second idle-close timeout. Explicit close requests
remain supported; request/header and warehouse budgets are unchanged. Build
from the updated source before starting a gateway process. Existing compiled
artifacts retain their original behavior. No hosted deployment is implied.

[HTTP contract](API.md#http-keep-alive-idle-close-grace--5-november-2026)
and [verification](../outputs/connection_recovery_20261105/README.md).

## Catalog paging and shared validation — 5 November 2026

The verified original-source profile uses `DATABRICKS_QUERY_CONCURRENCY=6`
in the gateway environment. The generic unset default remains 3; the example
environment and this workspace’s local gateway setting explicitly use 6. This
changes process admission only, not warehouse size. Retain the 30-second queue
limit and 60-second statement budget. Re-measure under target multi-user load.

The sectors catalog reads at most four ordered pages concurrently (2,000 records per page), rather than
submitting its entire page list to statement admission. Active pages drain before
a failed load is evicted; partial catalogs are not returned. The existing source
record-count reconciliation is unchanged. HTTP and gateway-owned background
readers share overlapping original itemized source validation, including when
the background reader has no caller cancellation signal. Validation results are
not retained by this in-flight sharing after completion. Custom executors remain
isolated. Queue/statement time budgets, source pins and publication gates are unchanged.

## Gateway execution settings

Set these positive integer values in the backend environment before gateway
startup. Defaults apply when values are absent or invalid.

| Setting | Default | Controls |
|---|---:|---|
| `DATABRICKS_QUERY_CONCURRENCY` | 3 | Active statement operations per process |
| `DATABRICKS_QUERY_MAX_QUEUED` | 100 | Waiting statement operations per process |
| `DATABRICKS_QUERY_QUEUE_TIMEOUT_MS` | 30000 | Queue wait limit, subject to the statement budget |
| `DATABRICKS_QUERY_CACHE_TTL_MS` | 60000 | Descriptive query result retention |
| `DATABRICKS_QUERY_CACHE_MAX_ENTRIES` | 256 | Cached results per process |
| `DATABRICKS_QUERY_CACHE_MAX_BYTES` | 33554432 | Serialized key and result byte budget |
| `DATABRICKS_QUERY_CACHE_MAX_PENDING` | 128 | Distinct pending descriptive queries |

Set `GATEWAY_REQUEST_METRICS=1` to emit one timing event per completed HTTP
request. Events contain the generated request ID, method, route template,
status, elapsed time and counters. Keep tokens, SQL, request bodies and query
strings out of timing logs. [API timing details](API.md#request-timing-and-databricks-execution-limits)
describe the response headers and cancellation ownership.

## Main original itemized source — 27 October 2026

The ignored local gateway profile and `.env.example` select
`DATABRICKS_DESCRIPTIVE_ADAPTER=original_itemized_v1`. Normal backend startup
validates the immutable original Gold receipt/source. Existing source/financial/
truth settings are preserved for rollback; no browser environment copy is used.
Refresh the main dashboard after the owned gateway restart. Contracts stay in
their separate review scope. Technical candidate labels and independent unit,
mapping, financial and model gates remain.

To restore the preceding local source, remove only this adapter selector and
restart the gateway; leave warehouse objects and prior pins intact. No rebuild,
upload or repeated Databricks ingestion is needed. [Actual connection and limits](../outputs/original_dashboard_20261026/README.md).

## SO1 Sales Diagnostics candidate — 25 October 2026

The local backend's ignored environment has the nonsecret server-only
`DATABRICKS_SO1_SHA256` pin selecting the checked immutable SO1 Gold package.
No `NEXT_PUBLIC_` copy is needed. Normal gateway startup loads this setting;
the existing watcher reloaded the changed modules during integration. Missing
or incorrect pin disables the view explicitly. Remove the pin to disable this
separate capability; it does not change sales facts or existing STL/research.

Refresh the local dashboard, open **Sales Diagnostic → Territory baseline**,
then use its territory/year selectors. This view covers All buyers independently
of topbar filters. [Staging/checks and actual limits](../outputs/so1_dashboard_20261025/README.md).

## Optional current-source research candidate — 25 October 2026

The locally configured backend now has the nonsecret
`DATABRICKS_EXTENSION_RESEARCH_SHA256` pin for the checked current-source research
candidate. Keep it server-side; do not use a `NEXT_PUBLIC_` variable. It is an
artifact checksum, not a credential or operational-model approval. A missing
pin explicitly disables this separate view. Candidate preparation/staging and
safe deactivation are documented in [predictive operations](PREDICTIVE_OPERATIONS.md#current-source-candidate-visible-in-the-system--25-october-2026).
Refresh the dashboard to load the new Forecast panel and Planning draft controls.

## Next.js workspace and request entry — 17 October 2026

For Windows local editor detection, this machine uses the ignored
`frontend/.env.development.local` setting `REACT_EDITOR=code`, after verifying
VS Code is installed. This avoids Next's WMIC process-discovery path without
requiring deprecated Windows components. Keep this optional editor choice
machine-local; do not copy credentials or impose a nonexistent editor on other
machines. User explicitly authorized server startup/restart for the17 October
chart/editor repair; that scoped authorization takes precedence over the
general server-control preference below.

Frontend configuration explicitly binds Turbopack and standalone file tracing
to the frontend directory. Root/backend/frontend lockfiles remain intact;
independent packages do not need a lockfile deleted to suppress root guessing.
The Next16 request entry is `frontend/proxy.ts`, with the same matcher and
unchanged `lib/supabase/middleware.ts` session helper. Lint and Docker copy the
proxy entry. These convention/config changes do not alter analytical sources
or grant authentication access. User controls server startup/restart; an agent
does not automatically start servers for verification. Do not build alongside
`next dev`; read-only checks against an already-running server are permitted.

## Architecture

MedShield runs a Next.js frontend and a TypeScript/Express gateway. Supabase owns production authentication and account roles. Databricks Unity Catalog is the sole runtime analytical source. Python analytics code is optional for offline jobs and tests.

## Prerequisites

The checked frontend uses Next16 and React19; Node22 meets the >=20.9 runtime
floor and remains the `.nvmrc`/Docker major. Frontend installs use pinned npm11.21.1
(Node ^20.17 or >=22.9) to avoid npm10's shared optional-dependency tree bug;
the checked Node22.14 meets both floors. CI and Docker use the same installer.
Use the frozen lockfiles and commands below. Run `npm run lint` separately before the frontend build;
it uses flat `eslint.config.mjs`. The [dependency record](../outputs/dependency_remediation_20261016/README.md)
documents checked versions, open development-tool constraints and exact tests.

- Node.js and npm supported by the checked-in lockfiles.
- Access to the MedShield Supabase project for production authentication, or intentional local auth for development.
- A Databricks workspace, running SQL warehouse, HTTPS workspace origin, scoped token, and access to the required candidate views.
- Python only when running offline analytics jobs or tests.

## Environment files

Copy `.env.example` to an ignored `.env`, or use `backend/.env` for backend-only values. The backend loads `backend/.env` before the repository `.env`.

| Variable | Required for | Guidance |
|---|---|---|
| `PORT` | Gateway | Defaults to `5000` |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | Usually `http://localhost:5000` |
| `USE_SUPABASE` | Authentication | `true` for production Auth; `false` only for intentional local development |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Auth | Browser-safe project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser Auth | Browser-safe publishable key |
| `SUPABASE_URL` | Gateway Auth/audit | Server project URL |
| `SUPABASE_ANON_KEY` | Gateway Auth | Publishable/anon key used for token validation |
| `SUPABASE_SECRET_KEY` | Account administration/audit | Preferred modern server secret; never expose to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy server operations | Optional alternative; server-only |
| `DATABRICKS_HOST` | Analytics | Workspace origin such as `https://dbc-...cloud.databricks.com`; remove `/browse/...` and `?o=...` |
| `DATABRICKS_TOKEN` | Analytics | Server-only scoped token |
| `DATABRICKS_SQL_WAREHOUSE_ID` | Analytics | SQL warehouse ID, not the warehouse display name |
| `DATABRICKS_CATALOG` | Analytics | Defaults to `workspace` |
| `DATABRICKS_SCHEMA` | Analytics | Defaults to `medshield_gold` |
| `DATABRICKS_DESCRIPTIVE_SCHEMA` | Descriptive release | Defaults to `medshield_gold`; the verified 2026 local profile uses `medshield_gold_source_20261022` |
| `DATABRICKS_DESCRIPTIVE_FACT_VERSION` | Descriptive release | Explicit immutable Delta pin; the 2026 local profile uses `0` |
| `DATABRICKS_DESCRIPTIVE_DATASET_ID` | Source-batch release | Required exact dataset hash for an isolated schema |
| `DATABRICKS_DESCRIPTIVE_POLICY_VERSION` | Source-batch release | Required v8 policy for the isolated source-rebuild contract |
| `DATABRICKS_RESEARCH_FACT_VERSION` | Stored research | Independent original fact pin; the current research profile retains `20` |
| `DATABRICKS_QUERY_CACHE_TTL_MS` | Performance | Optional positive cache lifetime; default is 60 seconds |
| `DATABRICKS_QUERY_CONCURRENCY` | Performance | Optional positive query limit; default is 3 |
| `NASA_POWER_DAILY_URL` | NASA refresh | Optional official HTTPS daily-point URL only; custom hosts and redirects are rejected |
| `MEDSHIELD_ENV_FILE` | Gateway | Optional explicit environment-file path |

Do not place Databricks or Supabase server secrets in `NEXT_PUBLIC_*` variables.

See the [2026 local activation and rollback record](../outputs/app_2026_activation_20261024/README.md)
for the nonsecret source profile. An isolated descriptive source requires its
complete matching publication audit; incomplete settings fail rather than falling
back. Restart the gateway after changing a pin and reload the browser. Source
selection does not approve data/model publication or retrain stored experiments.

## Install

```powershell
cd backend
npm ci

cd ..\frontend
npm exec --yes --package=npm@11.21.1 -- npm ci
```

## Run locally

Terminal 1:

```powershell
cd backend
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000`. The gateway health endpoint is `http://localhost:5000/api/health`.

Do not run `npm run build` in the frontend while the same checkout has `next dev` running because both use `.next`.

## Databricks preparation

Use `databricks_updated_2/` as the main local Databricks folder. Its flat
`medshield_project_csv/` and `medshield_reference_csv/` folders match the supplied
workspace export; notebooks and external pipelines live in `medshield_project/`.
The old `databricks_updated/` and `databricks/` folders retain historical files and evidence.
Remote `/Workspace/medshield/` paths remain unchanged. Consult the
[current workspace guide](../databricks_updated_2/README.md) for missing files and
local-only tooling; this repository update does not upload or execute anything.

Start with [the current workspace run order](../databricks_updated_2/README.md). Copied 01–03 retain the adjusted-batch contract and must not run on restored originals; the full-original/contract financial refresh still needs reconciliation and a reviewed publication path.
Prepare and verify matching source-bound downstream contracts before running
04/05 bridges or 06 STL. The exported downstream notebooks retain historical
targets and are not an automatic continuation of the completed 2026 intake.
Validate the intended candidate before changing the gateway's explicit release
binding. A completed unchanged candidate does not need another rebuild.

For DOH/PAGASA, follow the external-source instructions in the
[project guide](../databricks_updated_2/medshield_project/GUIDE.md). The matching
historical bridge is retained at `outputs/workspace_cleanup_20261026/archived/medshield_project/external_restart/06_external_restart_system_bridge.sql`; external processing is outside the current workspace task.

The successful technical status remains candidate-only. Complete the acceptance checks in [CURRENT_STATE.md](CURRENT_STATE.md) before promotion.

## Supabase setup

Use [SUPABASE_AUTH_MIGRATION.md](SUPABASE_AUTH_MIGRATION.md) for production account migration. Apply migrations in `supabase/migrations/` in numeric order only when creating or upgrading the target project. The latest migrations include account/Auth linkage, RLS, candidate cache permissions, and approved financial semantics.

Older Supabase analytical tables and `supabase/seed.sql` do not supply live dashboard values.

## Docker

```powershell
docker compose build
docker compose up
```

Docker starts the frontend and gateway only. It still requires usable Supabase/Databricks configuration for authenticated live analytics.

## Validate

```powershell
cd backend
npm run build
npm run databricks:check:dashboard

cd ..\frontend
npm run build
```

The Databricks validation command requires live credentials and a running warehouse. Use [TESTING.md](TESTING.md) for the complete checks.
