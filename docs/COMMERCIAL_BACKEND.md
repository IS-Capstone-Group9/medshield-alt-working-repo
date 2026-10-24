# Commercial backend extension

The existing Express gateway, authentication, Databricks routes and Python jobs are retained. The additive implementation lives in `backend/src/commercial/`, separated into validators, controllers, services and repositories. No dashboard request trains a model or uses seed data as analytics.

## HTTP contracts

All routes require the existing authenticated session. Money is serialized as decimal strings. Invalid requests return `application/problem+json`; source failures return an explicit unavailable response, never a fabricated zero.

| Endpoint | Contract |
| --- | --- |
| `GET /api/sales/monthly` | Required `anchor=YYYY-MM`; `window=3M,6M,12M,24M,overall,custom`; custom requires `startDate,endDate`. Optional source category, sector, productId. Reads pinned Databricks Gold diagnostics. |
| `GET /api/forecasts/rolling` | Required anchor, horizonMonths 1–36 (default 24), scenario none/monsoon/typhoon/conservative, confidenceInterval 80/95, leadTimeDays 1–365 (default 60). Reads a source-matching candidate manifest. |
| `GET /api/forecasts/by-category` | Same forecasting parameters plus category, search, page, limit (max 100). |
| `GET /api/forecasts/by-product` | Same parameters plus productId. Only approved granular mappings can be published. Search matches source scope IDs. |
| `POST /api/planning/allocate` | Admin, manager or analyst. Requires anchorPeriod, later targetPeriod, productId UUID, totalAvailableStock, clientPriorityRule HOSPITAL_FIRST; optional hospitalFillTargetPct >=98.5 and maxExpiryLossThresholdPct <=5. Explicit clients provide a sandbox; otherwise verified ledger stock and approved client demand are required. |
| `GET /api/audit/reconciliation` | Admin or manager only. Requires ordered startDate/endDate, at most 5000 receipts per response. Reconciles receipt items, VAT, net payments and verified withholding vouchers per receipt. |

Explicit allocation clients have `clientId`, `category` (HOSPITAL/CLINIC/RETAIL/OTHER), integer `requestedUnits`, and integer `usableUnitsBeforeExpiry`. Duplicate clients and unknown fields are rejected. The solver first reserves each hospital's rounded-up minimum, then fills hospitals and remaining clients in stable ID order. It conserves stock and reports infeasibility; it never decrements stock or places an order. Unused-stock percentage is an expiry proxy, not a measured loss probability. Shortage percentage is reported separately from unknown stockout probability. This is a single-SKU priority optimizer, not a validated network procurement optimizer.

## Evidence boundaries

The supplied 2026 benchmark (3,416 receipts totaling PHP 142,597,413.20; Q4 projection PHP 61,080,000.00) has no verified receipt source in this checkout. `commercial:fixture` generates those exact figures **only as synthetic test data**, with `audited:false`. Runtime sales return `totalAuditedSales`, `receiptCount`, gross sales and delivered units as null where the active Gold contract does not establish them. Therapeutic categories are rejected for historical sales until approved source mappings exist. No revenue-to-unit conversion is invented.

The current commercial UI continues to consume the established dashboard endpoints, including the existing forecast validation contract. These new endpoints are additive backend contracts; creating a candidate does not automatically activate it in the UI or promote it to production.

Forecast fitting is offline additive Holt-Winters with fixed alpha=.25, beta=.05, gamma=.15 and 12-month seasonality. It requires 36–1200 contiguous monthly observations ending at the anchor. It reports a final 12-month holdout MAE against seasonal naive, rather than claiming the model wins. Intervals use origin-local absolute-error quantiles with at least 20/40 observations for 80/95 levels; unsupported bands remain null. They are empirical ranges, not guaranteed calibrated coverage. Missing future leads remain missing; forecasts are never shifted to a different anchor. Decomposition reconciles at cents with an explicit rounding adjustment.

Scenario uplifts are explicit assumptions: +18% antibiotics/respiratory for monsoon, +25% analgesics for typhoon, −12% oncology for conservative. No category is inferred for company totals. Scenario-scaled bands are labeled uncalibrated. Logistics disruption percentages and disease effects are not inferred from this financial model.

The attachment specifies both “two months” and “exactly 60 days.” The implementation uses **60 calendar days before the first day of the target month**, which differs from subtracting two calendar months. Responses state the rule and Manila-based cutoff alert. Procurement activation still requires reviewed lead-time and inventory evidence.

## Offline preparation and deployment

From `backend/`:

```powershell
npm run commercial:forecast -- prepare 2025-12 C:\review\company-candidate.json 2020-01-01
# After reviewing the manifest and creating the candidate table:
npm run commercial:forecast -- publish --reviewed-candidate C:\review\company-candidate.json
```

The optional final prepare argument chooses an explicit training start (default 2017-01-01). Live data has gaps before 2020, so the example deliberately selects the continuous 2020–2025 window. The manifest and API disclose that window; no gaps are imputed. Preparation reads live Databricks inputs and writes a new local manifest without overwriting an existing file. It does not publish. The shared `prepareForecast` function also supports approved product/category observations; the included CLI deliberately prepares company scope only because current therapeutic mappings are not approved. Granular jobs must supply reviewed source identities and mappings, not spread company sales across invented category weights.

Review `databricks/sql/91_commercial_forecast_manifest.sql` for the intended catalog/schema before applying. Publishing is explicit and source-bound; identical runs are idempotent and existing different candidates are never overwritten. Run one publisher at a time. The gateway rejects duplicate source/scope/anchor runs, checksum changes, calendar mismatch and malformed manifests. Candidate publication is not model approval.

The optional PostgreSQL operational ledger is separate from analytical Gold and Supabase identity. Set server-only `OPERATIONS_DATABASE_URL` and apply the reviewed SQL with:

```powershell
npm run commercial:migrate -- --apply
```

`backend/migrations/commercial/001_operations.sql` provides products, clients, lots, receipts/items, payments, withholding vouchers, monthly evidence, forecast preparation records and allocations. It uses numeric money, foreign keys, uniqueness, nonnegative stock checks and deferred receipt balance triggers. Evidence cannot be moved to another receipt. Reconciliation requires source-document identity and audit metadata plus exact recorded item/payment/voucher matching; it does not certify legal tax compliance or choose statutory tax rates.

All operational tables enable row-level security and revoke PUBLIC privileges. After migration, a database administrator must provision a dedicated server read role, grant schema usage/table SELECT and create SELECT policies for that role. Keep write/import privileges in a separate reviewed ledger process. Do not use the migration owner or a browser-accessible service key as the gateway connection. No operational database or remote warehouse migration was applied as part of this change.

For an isolated fixture file:

```powershell
$env:NODE_ENV='test'
npm run commercial:fixture -- C:\review\synthetic-commercial-fixture.json
```

The fixture command does not connect to any database. Do not import its output into production receipts or Gold.

## Verification and turn record — 2026-10-24

Request: retain the backend, implement the attached commercial API/engine specification, and push UI/backend only to the alternate repository under `the_new_medshield_ui`. Git identity was supplied by the user and configured locally.

Workstreams: dashboard and pipeline/data/models. New backend contracts, optional migrations, offline preparation/publication tooling and synthetic QA fixtures were added while preserving existing routes. `npm run build`, `npm run typecheck:scripts`, and `npm run test:commercial` validate the implementation. The complete backend regression run passed 200 tests; the dependency audit reported zero vulnerabilities. The commercial suite covers calendar boundaries, deterministic forecasts, missing evidence, monetary identities, allocation infeasibility, HTTP validation/roles and actual PostgreSQL constraints using isolated PGlite. Docker's PostgreSQL daemon was unavailable; deployment to the intended PostgreSQL service remains unverified. Frontend build/lint and seven commercial UI/model checks are recorded in `COMMERCIAL_UI.md`.

The optional project-memory connection was unavailable; this repository record documents the turn without searching unrelated vaults. Next owners: data/finance reviewers for source receipts and mappings, database administrator for operational deployment, model reviewer for forecast acceptance. Passing tests does not establish the attachment's audited business claims.

Live verification: the monthly endpoint returned HTTP 200 with three source months for October–December 2025. The receipt audit returned OPERATIONS_NOT_CONFIGURED as expected. Explicit 2020–2025 forecast preparation produced 36 local candidate months; holdout MAE was PHP 7,608,449.73 versus seasonal-naive PHP 11,261,458.43. This is one holdout comparison, not production acceptance. The candidate was not published.
