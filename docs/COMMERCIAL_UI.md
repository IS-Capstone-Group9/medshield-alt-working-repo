# Commercial workspace — 23 October 2026

Branch: `the_new_medshield_ui`. Push destination: `IS-Capstone-Group9/medshield-alt-working-repo` only.

The Next.js root now serves a React commercial workspace with six modules. The original dashboard remains at `/classic`. Backend code, Supabase authentication, password reset, API authorization, warehouse queries and source contracts are retained. No schema, migration, pipeline or analytical model changes are included.

## Behavior and source boundaries

- The calendar starts at the source's latest recorded month, not the attachment's unsupported September 2026 date. Steppers and 3/6/12/24-month windows request existing sales diagnostics. Monthly/annual charts, buyer and region filters preserve the source financial eligibility and comparison status. Each filter change hides old results until the new scope resolves.
- Sales tables, product ABC ranking and source-row drawers use the gateway. ABC ranks use cumulative positive sales; returns remain in sales totals but are excluded from that ranking denominator. Product exports include the current search. Source-row exports explicitly identify the displayed page.
- Historical breakdown uses the existing source decomposition, with calendar gaps and independent segment breaks. Its scope is explicitly all buyers and full qualifying history. The scrubber uses the available source months, not a fabricated 84-month series. Component reconciliation reports cent precision rather than claiming exact floating-point equality. Unusual movement is not attributed to one-off orders without evidence.
- Forecast windows are calendar views of existing evidence. Changing the anchor never relabels a model's origin or shifts predictions. A requested 24-month/48-month panorama is supported as a calendar, but unsupported forecast cells stay blank. Only source-defined supported intervals are drawn. Historical weighted error, deviation and signed error are not converted into a claimed 91.8% accuracy.
- Forecast scope follows buyer and product filters. Region, sales trailing-period and annual display controls are explicitly sales-only. Therapeutic classes, clinical indications, SKU units, voucher audit claims and production forecast approval are not invented. The current catalog does not establish those requested clinical classifications.
- The purchasing sandbox uses entered physical units, stock, pack size, cost, capacity, budget, lead time and shelf life. It shows feasible whole packs, funding gaps, unmet units, reorder thresholds and projected unused stock. It is not an optimal-order model or an operational procurement instruction. Money constraints use integer cents. Presets (+15%, +25%, -10%) are hypothetical, with an optional 45-day island buffer. Projected new stock is constrained to 5% unused at expiry; existing excess stock is visibly flagged. No orders or remote writes are made.
- CSVs carry classification, filters, scenario multiplier and export time. Missing values remain blank and spreadsheet formula prefixes are escaped. Live failures render unavailable states with retry; test fixtures are confined to tests.

## Implementation

`frontend/components/commercial/` contains the workspace, common SVG/table/dialog elements, forecast and breakdown modules, sandbox, typed helpers and asynchronous request hook. Existing `AuthProvider` and API client remain the authentication boundary. Tailwind is installed through PostCSS with scoped utility prefixes and without preflight, preserving the login and classic styles. The custom workspace stylesheet is scoped under `ms-` classes.

## Verification and run

Use the normal setup commands in `SETUP.md`. Do not build alongside a development server in the same checkout. For an isolated preview, build with `NEXT_PUBLIC_API_BASE_URL=http://localhost:5001`, run the existing gateway with `PORT=5001` and `CORS_ALLOWED_ORIGINS=http://localhost:3001`, then start the frontend on port 3001. Local demo authentication is development-only; use properly configured Supabase settings for the production path.

Checks:

```powershell
cd frontend
npx tsc --noEmit
npx eslint components/commercial app/page.tsx app/classic/page.tsx
npm run build
npx playwright test --config playwright.commercial.config.ts
```

The commercial browser tests expect a running frontend at port 3001 (override `COMMERCIAL_BASE_URL` if needed), built without Supabase browser configuration for their isolated local-session fixtures. They exercise all modules, filter requests, source inspection, source-outage recovery and mobile fit. Helper checks cover calendar rollover, unsupported forecast leads and intervals, supply constraints, and CSV safety. Fixture checks are not live-source or business acceptance evidence.

Live smoke verification on 23 October 2026 loaded the overview through the unchanged gateway and Databricks version 20 with no browser runtime errors. The source's latest recorded month was December 2025. Operational acceptance, BIR receipt audits, approved clinical mappings, future forecast publication and procurement authority remain separate requirements.

Applied repository guidance: frontend standards, coding standards, testing standards, analytics frameworks, UI design rules, security standards, technology stack and GitHub standards. The optional Obsidian connection was unavailable; no vault record was written.
