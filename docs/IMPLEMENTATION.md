# Chapter 4 - Implementation Baseline

Last reviewed: 2026-09-25

This document describes the implementation currently present in the workspace. Candidate, derived, proxy, and scenario outputs retain those labels; planned analytical models are not presented as published features.

## 4.1 System overview

- `frontend/`: Next.js App Router, React, TypeScript, Chart.js, dashboard runtime, and Playwright tests.
- `backend/`: Express and TypeScript gateway for authentication, validation, Databricks queries, caching, NASA POWER refresh, and audit routing.
- `databricks/`: sales and external-source Bronze-Silver-Gold pipelines, SQL bridge views, tests, and operating guides.
- `supabase/`: identity, role, audit, and earlier schema migrations. Supabase is not the dashboard analytics source.
- `services/`: offline Python data preparation, model experiments, and tests. Flask services are not required by the dashboard runtime.

## 4.2 Runtime architecture

The authenticated frontend calls the gateway. The gateway queries Databricks Gold with server-only credentials and returns typed JSON. Supabase authenticates users and supplies application roles. If Databricks is unavailable, the gateway fails closed and the dashboard displays an unavailable state.

No chart or KPI reads a browser JSON file, local CSV/XLSX, generated output, Python snapshot, seeded Supabase analytical table, or mock value as a runtime fallback.

## 4.3 Sales data implementation

The current sales restart processes source files for 2017-2025:

1. Bronze records source manifests, file hashes, and raw rows.
2. Silver parses yearly layouts, applies quality rules, preserves warnings/rejections, and validates the checksum-bound 2025 allocation replacement.
3. Gold creates transaction facts, dates, areas, products, yearly/monthly aggregates, mapping and quality audits, and allocation provenance.
4. `databricks/sql/05_sales_restart_system_bridge.sql` creates the stable yearly application view after Gold passes.

For the current candidate snapshot, the bridge expects nine yearly rows and 37,728 accepted fact transactions. The figure is version-bound and must change only through a reconciled rerun.

## 4.4 External data implementation

The external restart copies and ingests the supplied DOH and PAGASA files, cleans them independently, publishes candidate context tables, and creates the application bridge through `databricks/sql/06_external_restart_system_bridge.sql`.

- DOH covers the declared 2018-2026 extract; 2026 remains partial and is not a complete-year/live signal.
- PAGASA covers official historical station observations for 2017-2024; no official 2025 PAGASA rows are invented.
- Station-to-territory and disease-to-sales mappings remain review candidates and are not forecast-approved.

The backend also supports NASA POWER. An authorized refresh fetches daily observations server-side, aggregates them monthly, writes the Silver candidate table, and exposes the Gold weather view. The dashboard subsequently reads the Gold view, never NASA directly.

## 4.5 Dashboard and API implementation

The current gateway supports:

- summary, yearly, monthly, area, product, seasonality, and transaction views;
- filtered pagination and data-quality evidence;
- quantity heatmaps and sales diagnostics;
- derived buyer-sector/channel and geographic prioritization views;
- deterministic Pareto/ABC and commercial MCDA interactions;
- sales-only seasonal-naive and last-observation forecast validation;
- blocked external-regression responses while join gates remain open;
- historical planning shortlists and user-entered allocation scenarios;
- PAGASA and NASA POWER validation views;
- Databricks sales/external integration status.

Buyer and geographic classifications are derived from controlled mapping rules and `docs/MAPPED_CLIENT_REFERENCE.md`. They are not source-recorded fields for every transaction and require owner review.

## 4.6 Authentication and audit

Production authentication uses Supabase Auth. The gateway resolves username/email, validates sessions, enforces role checks, and supports required password reset. Local session authentication can be enabled for development without changing the analytical source.

Audit events use Supabase when configured and can fall back to a local audit file. Analytical responses never use that fallback.

## 4.7 Analytical publication status

Current Gold objects remain `_candidate` and API metadata reports `candidate_only: true`. Implemented baseline and scenario logic does not constitute approval of:

- canonical SKU/medical scope;
- finance definitions or totals;
- buyer/geographic mappings;
- DOH/PAGASA predictive joins;
- Prophet/XGBoost or another champion model;
- inventory, lead-time, supplier, cost, expiry, or procurement facts.

The next implementation milestone is a signed data-acceptance record followed by stable approved Gold views. Final descriptive evidence, predictive evaluation, and prescriptive scenarios should use that frozen publication.

## 4.8 Evidence rules for Chapters 4 and 5

Use screenshots and metrics from a named dataset ID and run date. Label each output as observed, derived mapping, estimated allocation, proxy, baseline forecast, or scenario. Dated files under `outputs/` remain evidence for their original populations and must be regenerated before they are used as current results.

See [CURRENT_STATE.md](CURRENT_STATE.md), [API.md](API.md), and [CHAPTER_4_5_EVIDENCE_PLAN.md](CHAPTER_4_5_EVIDENCE_PLAN.md).
