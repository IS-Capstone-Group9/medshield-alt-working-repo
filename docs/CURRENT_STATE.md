# MedShield Current State

Last reviewed: 2026-09-25

This is the canonical snapshot of the implemented MedShield system. When a planning document, dated report, generated output, or old walkthrough conflicts with this file, use this file together with [REQUIREMENTS.md](REQUIREMENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), and the current code.

## Product position

MedShield is a historical pharmaceutical sales and decision-support capstone. It supports descriptive analysis, forecast evaluation, product and territory prioritization, and reviewed planning scenarios. It is not a live disease-surveillance service, an official weather-alert service, or an automated procurement system.

## Runtime source of truth

The dashboard runtime has one analytical system of record: **Databricks Unity Catalog**.

```text
Source files and provider observations
  -> Databricks Bronze (immutable source evidence)
  -> Databricks Silver (typed, assessed, accepted/rejected rows)
  -> Databricks Gold (candidate analytical facts and aggregates)
  -> Databricks SQL bridge views
  -> TypeScript API gateway
  -> authenticated Next.js dashboard
```

Supabase provides authentication, application-account linkage, and audit persistence. It does not provide dashboard measures. Files under `data/`, `outputs/`, and `datasources/` are preparation, review, or evidence artifacts; the browser does not use them as fallback analytics.

If Databricks or a required view is unavailable, the API returns an explicit error and the dashboard shows an unavailable state. The runtime does not substitute local, mock, seeded, or Supabase analytical values.

## Implemented stack

| Layer | Current implementation |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Chart.js |
| Gateway | Express and TypeScript in `backend/` |
| Analytics store | Databricks Unity Catalog, primarily `workspace.medshield_gold` |
| Identity | Supabase Auth with server-side account resolution |
| Audit | Supabase when configured, with local audit-file fallback for audit events only |
| Offline analytics | Python jobs and tests under `services/`; not a dashboard runtime dependency |
| Weather refresh | Server-side NASA POWER retrieval, Databricks Silver upsert, then Gold view publication |

## Current data coverage

| Source | Coverage | Current use | Limitation |
|---|---|---|---|
| MedShield sales | 2017-2025 | Descriptive analytics, sales-only forecast baselines, ranking, and scenario evidence | Gold objects remain candidate publications pending owner approval |
| PAGASA | 2017-2024 | Official historical station observations and comparison evidence | 2025 is absent; station-to-territory mappings remain review candidates |
| NASA POWER | Provider-supported historical range requested by the user | Separately labeled weather proxy stored in Databricks | It is not official PAGASA data |
| DOH | 2018-2026 declared | Historical disease context | 2026 is partial; external joins are not forecast-approved |

The current sales restart bridge expects nine yearly rows for 2017-2025 and **37,728 accepted Gold fact transactions** for the checksum-bound 2025 replacement snapshot. That number identifies the current candidate dataset; it is not a permanent business invariant.

## Databricks publication state

The sales and external pipelines currently publish objects whose names end in `_candidate`. API metadata reports `candidate_only: true`.

The latest sales pipeline sequence is:

1. `databricks/sales_restart/01_sales_bronze.py`
2. `databricks/sales_restart/02_sales_silver.py`
3. `databricks/sales_restart/03_sales_gold.py`
4. `databricks/sql/05_sales_restart_system_bridge.sql`

The latest external-source sequence is:

1. `databricks/external_restart/00_external_setup.py`
2. `databricks/external_restart/00_copy_workspace_sources.py`
3. `databricks/external_restart/01_external_bronze.py`
4. `databricks/external_restart/02_external_silver.py`
5. `databricks/external_restart/03_external_gold.py`
6. `databricks/sql/06_external_restart_system_bridge.sql`

`PASS_CANDIDATE` or `PASS_CANDIDATE_ONLY` means the technical checks passed. It does not mean that finance, product-master, geography, weather, disease, or model governance approval has been granted.

## Current dashboard capabilities

Implemented and Databricks-backed:

- annual and monthly sales summaries;
- area and product performance;
- filtered, paginated transaction evidence;
- quantity heatmaps and sales diagnostics;
- buyer-sector and geographic views derived from the controlled client reference and current mapping rules;
- deterministic Pareto/ABC and commercial prioritization views;
- sales-only seasonal-naive and last-observation forecast validation;
- scenario planning that requires user-entered operational assumptions;
- PAGASA historical evidence and NASA POWER proxy observations.

The buyer-sector and geographic classifications are derived mappings. They must remain traceable to [MAPPED_CLIENT_REFERENCE.md](MAPPED_CLIENT_REFERENCE.md) and must not be described as source-recorded ownership where the source did not contain ownership.

## Gates that remain open

- Formal business/finance approval of the Gold financial definitions and candidate publication.
- Canonical SKU/product-master approval, including medical versus non-medical scope.
- Final review of estimated 2025 contract-to-product allocation provenance.
- Final owner approval of buyer-sector and geographic mappings.
- Approval of DOH/PAGASA territory joins for predictive use.
- Publication of trained predictive model outputs with reproducible validation evidence.
- Real inventory, lead-time, ordering-cost, holding-cost, supplier, expiry, and stock-position inputs.

Until those gates close:

- external regression remains blocked;
- forecasts remain baseline evaluation evidence, not approved operational forecasts;
- EOQ, ROP, safety stock, and allocation remain user-reviewed scenarios;
- candidate Gold values must retain candidate/provenance labels.

## Immediate next data step

After Bronze, Silver, Gold, and the bridge complete, produce a data-acceptance record that proves:

1. source rows reconcile to accepted, rejected, duplicate, and explicitly excluded rows;
2. 2025 allocated child rows preserve the source contract totals;
3. contract labels are not presented as canonical SKUs;
4. yearly and monthly totals reconcile from Silver through Gold and the API;
5. unresolved product, area, buyer, weather, and disease mappings are enumerated;
6. dataset hash, pipeline versions, row counts, and reviewer decisions are recorded.

Only after that review should candidate objects be promoted to a stable approved publication contract and used as the frozen input for final descriptive, predictive, and prescriptive evaluation.

## Documentation precedence

Use documents in this order:

1. [CURRENT_STATE.md](CURRENT_STATE.md)
2. [REQUIREMENTS.md](REQUIREMENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md), and [BUSINESS_DEFINITIONS.md](BUSINESS_DEFINITIONS.md)
3. Current Databricks runbooks under `databricks/sales_restart/` and `databricks/external_restart/`
4. Implementation plans and model explainers
5. Dated reports and generated files under `outputs/`

See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for the complete status policy.
