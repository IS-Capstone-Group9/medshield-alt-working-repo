# Architectural Decisions

## 001. Use a TypeScript API gateway

**Decision:** Keep authentication checks, request validation, bounded Databricks queries, caching, NASA POWER refresh orchestration, and response contracts in `backend/`.

**Consequence:** The frontend has one server boundary. Warehouse and provider credentials never enter browser code.

## 002. Use Databricks as the analytical system of record

**Decision:** Serve every dashboard analytical value from Databricks Gold or from a gateway calculation whose inputs came from Databricks Gold.

**Consequence:** Supabase analytical tables, local files, generated outputs, and Python snapshots cannot silently replace a failed warehouse query.

## 003. Keep Supabase for identity and audit

**Decision:** Use Supabase Auth for production sessions and linked application roles. Use Supabase for audit persistence when configured.

**Consequence:** Supabase remains operationally important but is not the source of dashboard KPIs. Local audit fallback is permitted only for audit events.

## 004. Fail closed for analytical data

**Decision:** Return a Databricks error and show an unavailable UI state when a required source cannot be loaded.

**Consequence:** The dashboard does not remain visually populated with stale, mock, seeded, or bundled values during a source outage.

## 005. Publish through candidate gates

**Decision:** Bronze, Silver, Gold, bridge, and API contracts retain dataset IDs, policy versions, quality status, and candidate labels until named approval.

**Consequence:** `PASS_CANDIDATE` proves technical checks only. Business, finance, SKU, geography, external-join, and model approvals remain separate decisions.

## 006. Separate observed, derived, proxy, forecast, and scenario evidence

**Decision:** Preserve visible provenance for contract allocations, buyer/geography mappings, NASA POWER observations, forecast baselines, and planning assumptions.

**Consequence:** The UI and paper can use these outputs without presenting derived evidence as source-recorded fact.

## 007. Keep Python analytics offline until publication

**Decision:** Python jobs under `services/` may prepare and evaluate models, but the dashboard reads only published Databricks contracts.

**Consequence:** Dashboard requests never train models synchronously and do not depend on Flask services.
