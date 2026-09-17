# MedShield Architecture

## Runtime layers

- **Frontend:** Next.js App Router and TypeScript UI in `frontend/`.
- **API gateway:** TypeScript service in `backend/`; it owns authentication, validation, and every dashboard query.
- **System of record:** Databricks Unity Catalog, primarily `workspace.medshield_gold`.
- **Identity and audit:** Supabase Auth and the existing audit store. Supabase does not supply dashboard measures.

## Dashboard flow

1. The authenticated frontend calls the TypeScript gateway.
2. The gateway uses server-only Databricks credentials and SQL Statement Execution APIs.
3. Core descriptive views read the Gold yearly, monthly, area, product, and sales-fact objects.
4. Product quantities, transactions, forecast baselines, planning shortlists, and PAGASA observations also read Databricks Gold.
5. If Databricks or a required Gold object is unavailable, the gateway returns an error and the frontend hides the dashboard behind an explicit unavailable state.

There is no browser JSON, Python snapshot, Supabase analytics, or local-file fallback. The public `sales_data.json` fallback was removed.

## Publication gates

- The current Gold financial views are candidate views, so the UI labels their status and provenance.
- Buyer ownership is not approved in Databricks. Sector views therefore expose only `Unknown`; Government and Private remain empty.
- DOH/PAGASA territory mappings are not approved. The external-regression view returns `blocked` and no coefficients or predictions.
- PAGASA observations remain visible as Databricks evidence, with sales-match fields unavailable until the mapping gate passes.
- Inventory, lead-time, supplier, and approved model outputs must be published to Databricks before their legacy endpoints can be re-enabled.

## Boundary rules

- Never send `DATABRICKS_TOKEN` or the SQL warehouse ID to the browser.
- Keep direct Databricks access in the TypeScript gateway.
- Do not infer missing buyer ownership, geography, inventory, disease joins, or model approval.
- Do not replace a failed Databricks query with local, bundled, or mock values.
- Treat user-entered planning inputs as scenario assumptions; Databricks supplies only the historical shortlist evidence.
