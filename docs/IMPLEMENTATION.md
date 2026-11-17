# Chapter 4 - Implementation Baseline

## Value-aware commercial review — 27 October 2026

The review additionally sums eligible net on rows without paired margin support,
preserving signed adjustments and null when no eligible net exists. This amount
is visible beside record coverage and drives margin-gap ordering/export under
the v2 metric policy. [Source-case evidence](../outputs/commercial_case_review_20261027/README.md)
shows why count coverage alone can conceal material missing financial support.
The offline case analyzer preserves fresh source references and accounting
bridges without writing corrections, owner decisions or approvals.

## Product commercial review — 27 October 2026

`product-commercial-review.ts` calculates supported paired finances, retained-record
coverage and exact-date/matched-month changes from existing Gold detail.
`product-commercial-runtime.ts` provides four review focuses, source inspection
and complete queue export within Product Prioritization. The renderer is composed
into the existing dashboard execution closure; it uses event listeners and keeps
the new evidence table during legacy cleanup. There is no added API, local
analytical fallback or model activation. [Verified delivery](../outputs/product_commercial_review_20261027/README.md)
records actual controls, interactions, limits and working-paper traceability.

Current-scope reconciliation: 2026-10-25. Earlier implementation sections retain their stated evidence dates; consult [Current State](CURRENT_STATE.md) for later delivered capabilities.

This document describes the implementation currently present in the workspace. Candidate, derived, proxy, and scenario outputs retain those labels; planned analytical models are not presented as published features.

## 4.1 System overview

- `frontend/`: Next.js App Router, React, TypeScript, Chart.js, dashboard runtime, and Playwright tests.
- `backend/`: Express and TypeScript gateway for authentication, validation, Databricks queries, caching, NASA POWER refresh, and audit routing.
- `databricks_updated_2/`: main Databricks workspace snapshot, sales and external-source Bronze-Silver-Gold pipelines, SQL bridges, and local tests/operating guides. `databricks/` retains legacy files and evidence.
- `supabase/`: identity, role, audit, and earlier schema migrations. Supabase is not the dashboard analytics source.
- `services/`: offline Python data preparation, model experiments, and tests. Flask services are not required by the dashboard runtime.

## 4.2 Runtime architecture

The authenticated frontend calls the gateway. The gateway queries Databricks Gold with server-only credentials and returns typed JSON. Supabase authenticates users and supplies application roles. If Databricks is unavailable, the gateway fails closed and the dashboard displays an unavailable state.

No chart or KPI reads a browser JSON file, local CSV/XLSX, generated output, Python snapshot, seeded Supabase analytical table, or mock value as a runtime fallback.

## 4.3 Sales data implementation

The current working sales history covers 2017–2026, with 2026 observed through September. Select and reconcile the source identity documented in [Current State](CURRENT_STATE.md); historical 2017–2025 snapshots remain distinct:


1. Bronze records source manifests, file hashes, and raw rows.
2. Silver parses yearly layouts, applies quality rules, preserves warnings/rejections, and validates the checksum-bound 2025 allocation replacement.
3. Gold creates transaction facts, dates, areas, products, yearly/monthly aggregates, mapping and quality audits, and allocation provenance.
4. Historical `outputs/workspace_cleanup_20261026/archived/medshield_project/05_sales_restart_system_bridge.sql` defines the stable yearly application view after Gold passes.

The earlier 2017–2025 snapshot had nine yearly rows and 37,728 accepted fact transactions. These are historical, version-bound checks, not expected totals for the current 2026-inclusive source. Validate selected-source year coverage and row counts against its own manifest and reconciliation evidence; do not copy older totals into a new run.

## 4.4 External data implementation

The external restart copies and ingests the supplied DOH and PAGASA files, cleans them independently, publishes candidate context tables, and creates the application bridge through the historical `outputs/workspace_cleanup_20261026/archived/medshield_project/external_restart/06_external_restart_system_bridge.sql`. Those files are archived outside the current focused sales/classification workspace.

- DOH covers the declared 2018-2026 extract; 2026 remains partial and is not a complete-year/live signal.
- PAGASA covers official historical station observations for 2017-2024; no official 2025 PAGASA rows are invented.
- Station-to-territory and disease-to-sales mappings remain review candidates and are not forecast-approved.

The backend also supports NASA POWER. An authorized refresh fetches daily observations server-side, aggregates them monthly, writes the Silver candidate table, and exposes the Gold weather view. The dashboard subsequently reads the Gold view, never NASA directly.

## 4.5 Dashboard and API implementation

The Overview's four primary KPI cards show titles and values only; supporting notes beneath the values are hidden within this row. Metric calculations and the separate publication-status strip are unchanged.

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

The **View Sales Data** ledger groups search, year and quality filters above a
filtered summary. Compact columns wrap product names, retain transaction-evidence
labels and align numeric values to the right. Full Ledger exposes the source and
financial columns. Page size sits beside pagination; native **Source and validation**
details contain source identity, quality counts, metric definitions and reconciliation,
with reconciliation differences visible even when collapsed. **Reset filters** clears
search/year/quality and returns to page one while retaining an investigation's exact
date, dimension and release scope. **Refresh** retries the current selection through
the existing authenticated gateway. Failed loads clear the ledger and summary.

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
