# MedShield Current State

## Descriptive remediation — 27 September 2026

Current local implementation is ahead of the live warehouse. Publication is still
blocked; no CEO approval has been added. The replacement canonical notebook tree
is `databricks/medshield_project`; staged deletions of older paths were preserved.

- Restored the reference contract, notebook regression suite and generated runbook.
  Bronze/Gold v6 now validate original versus adjusted 2020/2024 hashes and reject
  unreviewed replacements. These notebook changes are **not deployed**.
- The gateway pins all fact-based descriptive reads to one Delta version per
  process. Set `DATABRICKS_DESCRIPTIVE_FACT_VERSION` for explicit activation/rollback.
  This does not replace the still-pending approved active-publication manifest.
- Sales detail now uses actual transaction dates, eligible gross profit and its
  matching revenue denominator. Monthly-to-daily division, historical-margin area
  profit and empty-scope all-history fallback were removed.
- Geographic values use warehouse mapping status. Proposed buyer grouping is
  labeled pending CEO review. Gateway Mindoro apportionment was removed; no counts
  or source units are invented. Legacy geographic approval is not a new CEO decision.
- Positive-sales ABC with separate signed returns is implemented as a **candidate
  pending CEO approval**, as requested by the user. Net revenue retains returns.
  Unknown revenue is disclosed outside the eligible contribution denominator.
  Product provenance appears in the table/export; source labels remain unverified SKUs.
- `06_sales_stl.py` prepares a version-bound Gold candidate. `/api/seasonality/stl`
  and the Sales Diagnostics panel consume warehouse components only. Until the
  notebook runs against the corrected fact version the panel is unavailable.
  Calendar-month averages remain a separate method.
- Narrow-screen filters/KPI labels wrap; a 375px viewport now passes the overflow
  check. This is not a full accessibility certification.
- Future ingestion remains unfinished. The user confirmed the client has a DR
  number but no stable line ID. Do not enable automatic line-key merge. A complete
  source-period replacement contract and deployed durable workflow remain required.

Latest restored collector run: `outputs/publication_readiness/2026-09-26T18-36-04-060Z`:
68 PASS, 2 FAIL, 0 UNVERIFIED. Both failures are the live 2020/2024 provenance defect.
Evidence SHA-256: `684a0f94952132977518ef1ee25248bb00d25adb53bb02591144d723b90a77f6`.
This is a failed baseline, not a publication receipt. Further local edits after
collection require a new final receipt after deployment.

Cloud dependency: the configured token lacks Workspace and Jobs scopes (403).
An authorized operator must apply the tested notebook package and rerun it.
See `databricks/medshield_project/GUIDE.md`. Verified medical mappings, buyer scope,
returns-policy approval and final release acceptance remain separate gates.


Last reviewed: 2026-09-27

## Descriptive calculation remediation — 27 September 2026

The local gateway and dashboard now preserve unavailable monthly measures,
separate gap estimates from observed KPI/YoY values, and calculate gross margin
using revenue from the same margin-eligible transactions. The snapshot calendar
uses the observed minimum/maximum years rather than a fixed 2017–2025 contract.
Annual YoY compares only overlapping observed months. Historical partial-date
requests cannot consume whole boundary-month aggregates as if they were exact.

The active product renderer is `descriptive-products-runtime.ts`. It replaces
the legacy hard-coded clinical/VEN and surge-score screen with observed
source-label sales, revenue-ranked cohorts, 80/95% cumulative ABC candidates,
and revenue/coverage charts. Negative aggregate product revenue is retained in
totals and holds ABC/Pareto percentages for the affected scope pending a returns
policy. The old `product-prioritization-runtime.ts` demonstration module was removed.
No clinical categories, inventory buffers, or product-region recommendations
are approved by these changes.

Live calculation evidence is saved in
[`outputs/descriptive_validation/2026-09-26T17-52-02-042Z/evidence.json`](../outputs/descriptive_validation/2026-09-26T17-52-02-042Z/evidence.json).
The receipt pins fact Delta version 15, Gold v5 policy, dataset identity and
mapping hashes, and verifies the fact version did not change during collection.
Eligible net sales reconcile to **₱626,946,741.81**; the margin denominator is
**₱478,720,670.03**, yielding **60.262177%** on margin-eligible rows.
Ten historical months have no observations; they remain null, not zero.

An offline STL evidence job now reconstructs the contiguous 2020–2025 revenue
series into trend, seasonal and residual components without filling gaps.
This is an inspectable artifact, **not a published dashboard STL feature**.
`/api/seasonality` explicitly returns an observed calendar-month average, not STL.
The notebook deployment/provenance correction, approved product identities,
negative-revenue ABC policy, geographic review and final CEO release decision
remain gates. Descriptive analytics is improved and testable as a candidate;
it is not yet a fully approved FR4 release.

## Publication readiness review — 27 September 2026

The live Gold audit now matches the repaired area master checksum
`a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949`.
The mapping is technically applied; legacy approvals and proposed mappings
still need the client CEO's decision. The product master remains header-only.

Publication is blocked by an additional provenance defect: the live 2020 and
2024 file hashes match prepared product-label replacements, but their source
status is `ORIGINAL_SOURCE_EXPORT`. Corrected local Bronze recognizes the exact
original/replacement hashes. Local Gold v6 rejects stale provenance before
writing and preserves adjusted-source labeling. These corrections have not
been deployed; the observed warehouse still uses Gold v5. Do not mistake the
initial internal-reconciliation pass for complete publication readiness.

Use [Descriptive Publication Acceptance](DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md)
for evidence, remaining gates, the CEO review record, and the deployment
sequence. Run `node --import tsx scripts/publication-readiness.ts` from
`backend/` for a new read-only, version-bound evidence receipt. Databricks
remains the sole analytical runtime source; receipts are offline audit artifacts.

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

1. `databricks/medshield_project/01_sales_bronze.py`
2. `databricks/medshield_project/02_sales_silver.py`
3. `databricks/medshield_project/03_sales_gold.py`
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

The executive overview shows publication and review status for unavailable predictive and operational evidence. It does not display a synthetic disease/weather threat score, fixed Prophet forecast or confidence interval, or fabricated disease/stock-out alerts. Its main revenue KPI totals observed sales only; gap estimates and combined totals are listed separately. Overview chart estimates use dashed lines and explicit legend labels, with observed source coverage disclosed in the subtitle. Historical sales continue to load from the gateway; the help text describes baseline validation and reviewed planning scenarios.

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
3. Current Databricks runbooks under `databricks/medshield_project/` and `databricks/external_restart/`
4. Implementation plans and model explainers
5. Dated reports and generated files under `outputs/`

See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for the complete status policy.
