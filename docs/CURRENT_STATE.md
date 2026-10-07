# MedShield Current State

## Current local descriptive candidate — 3 October 2026

The frontend now adds calendar-month sales averages, yearly observed-month coverage,
adjacent full-month sales change, ABC sales versus source-label shares, and buyer
ownership sales. Charts use responsive heights, compact axes, full-name tooltips
and expandable calculation notes. These are descriptive candidate views; their
addition does not approve the dataset, ABC policy, forecast or procurement actions.
See [descriptive view definitions](DESCRIPTIVE_ANALYTICS_LOGIC.md) and
[chart verification commands](TESTING.md).

Read-only warehouse checks identify fact Delta **17**, Gold policy
`sales_restart_gold_v7_independent_catalog`, and matching 72-month STL. The local
backend now explicitly pins version 17; authenticated preview endpoints, charts
and downloads have been checked against that identity. Publication checks pass
72/72 and catalog financial/eligibility reconciliation passes. Dataset ID remains
`b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.

The [candidate evidence and recovery package](../outputs/candidate_release_20261003/README.md)
binds table versions, bridge definitions, local bytes and validation receipts.
No warehouse writes or notebook reruns were needed. Workspace notebook bytes and
operator run IDs remain unverified by this SQL-based check. The package prepares
recovery of the current candidate; a complete historical version-16 rollback is
not verified, and restoring only the old application pin would mismatch STL.

This is **ready for candidate review**, not approved publication. CEO release
acceptance, reviewed product/geographic coverage and production rollback remain
separate gates. Estimated allocations remain estimates, and unresolved product
labels do not become verified medical SKUs. Earlier dated records below describe
the preceding candidate and are retained as history.

## Previous descriptive candidate — 27 September 2026

The operator has deployed and run notebooks 01–06. Read-only post-deployment
validation confirms Gold policy `sales_restart_gold_v6_reviewed_source_provenance`
and fact Delta version **16**, dataset
`b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
The earlier 2020/2024 provenance deployment blocker is resolved for this version.
Estimated product attribution remains explicit; equal annual finances do not prove
actual SKU identity or quantities.

- Latest publication audit: [70 PASS, 0 FAIL, 0 UNVERIFIED](../outputs/publication_readiness/2026-09-27T06-49-46-520Z/README.md).
  Receipt SHA-256: `181516182e62f9081c2acfa4ef01e6b7209dc1f0b320be6ee010936e5a929ad2`.
- [Calculation and STL receipt](../outputs/descriptive_validation/2026-09-27T06-41-37-034Z/evidence.json)
  verifies eligible net sales **₱626,946,741.81**, gross margin **60.262177%** on
  **₱478,720,670.03** margin-eligible revenue, and 72 STL months (2020–2025).
  Ten missing historical months stay unknown, not zero. STL excludes short/gapped
  history and is independent of the dashboard date filter.
- Databricks remains the sole analytical runtime source. Local audit receipts are
  not dashboard fallbacks. `DATABRICKS_DESCRIPTIVE_FACT_VERSION=16` pins this local
  candidate gateway; restart after changing it. No CEO release approval is inferred.
- Descriptive screens cover observed revenue/profit, matched-coverage YoY,
  source-label positive-sales ABC with separate returns, geographic/buyer summaries,
  source-unit quantity trends, and warehouse STL trend/seasonal/residual components.
- Remediation corrects repeated/structured API filters, four-digit future-year
  validation, yearly quantity and margin grouping, exact-date exclusions, captions,
  provenance display, and exports. Unapproved buyer grouping and estimated source
  allocation limitations remain visible.

### Remaining release boundaries

The candidate is available for business review, not an approved production release.
The CEO remains the sole business approver. Financial definitions and conditional
annual reconciliation decisions already recorded are preserved. Final release of
this exact dataset, positive-sales ABC policy, buyer/geographic scope and permitted
source-label outputs still require the applicable scoped acceptance.
There are no verified medical master entries; do not claim standardized medicine
demand, clinical recommendations, or automated inventory decisions. Future client
upload/replacement workflow remains unfinished (DR number only; no stable line ID).
External DOH/PAGASA inputs are not required for these descriptive sales measures.
See [the acceptance record](DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md).

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

The analytical output design now leads Overview with observed sales, complete observed gross profit, bounded-period matched growth and observed-month coverage. Publication status is a compact strip. Sales Diagnostics has keyboard-accessible Sales Trend, Growth, Quantities and Seasonality panels sharing the existing filters; STL retains its independent history scope. Products shows the ranking beside ABC counts and shares, with commercial columns before expandable catalog evidence. Areas leads with mapped/unmapped revenue and distinguishes revenue coverage from actual source-row coverage. Forecast and Planning expose derived takeaways, evidence status and assumptions before results. Unsolved planning KPIs remain “Not solved,” expiry remains unavailable, and allocations are explicitly scenarios for review. No dataset, mapping approval, model publication or purchase action is implied by this presentation pass. See [design verification](../outputs/analytical-output-design-20261003/README.md).

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


## Catalog implementation prepared — 27 September 2026

[Product catalog contract](PRODUCT_CATALOG.md) defines independent category,
sellable identity, item kind and transaction evidence. Local deterministic rules,
Gold enrichment, stable-ID API/UI grouping, category filters and provenance-aware
quantity/export handling are implemented. The complete version-16 review includes
37,728 records and 4,561 labels; all remain unresolved because no approved master
entries were supplied. Category approval cannot approve SKU, quantity conversion,
forecasting or observed medical demand. Adjusted provenance remains file-level.

The [operator runbook](CATALOG_DEPLOYMENT.md) specifies catalog-only 03 → 04 → 05 →
06 → publication-readiness → descriptive/catalog validation, version-bound activation
and rollback. This is local preparation: no Databricks writes, release activation
or additional CEO decisions occurred. Databricks remains the sole analytical source.
# Predictive delivery checkpoint — 27 September 2026

Latest: training proceeded on explicit user-attested 2020–2025 completeness.
All 15 configurations evaluated; last value remains the development-selected
candidate, with 83.20% development and 37.76% retrospective-audit WAPE. Recommendation
is to remain unpublished; uncertainty support is insufficient. See
`outputs/predictive_validation/2026-09-27T14-30-12-921Z/REVIEW.md`.
The original blocked checkpoint below is retained for chronology.

P0 evidence repairs and local P1–P4 implementation are present. A fresh read-only
version-16 extraction reconciled 37,728 records and 108 calendar months to the
descriptive receipt; missing months remain explicit. Evidence is under
`outputs/predictive_validation/2026-09-27T08-56-19-553Z/`. The real offline run is
blocked because training acceptance/reporting completeness is absent, so no actual
ETS/Prophet scores or selected production method are claimed. Warehouse contracts
and 108 candidate input rows are deployed and reconciled. Model publication
tooling is prepared; no model release is activated. See
[operations and gates](PREDICTIVE_OPERATIONS.md) and the blueprint milestone record.

## Drill-down and QA remediation checkpoint — 5 October 2026

Local source implementation adds **Sales Diagnostics → Change investigation**,
observed chart/table selection, reconciled signed month/product/raw-area/buyer
contributions, exact filtered transaction lineage, and an exported unverified
root-cause evidence review. Authentication/audit, deferred retry, future-year
provenance, cookie sessions and legacy historical-date safeguards are repaired;
the three stale isolated browser expectations are updated with their financial
and missing-data invariants retained. See [behavior and operational limits](DRILLDOWN_DIAGNOSTICS.md)
and [executed checks](../outputs/remediation-drilldown-20261005/README.md).

This is local implementation and verification, not cloud publication. The audit
migration file is prepared but not applied; live diagnostic SQL
remains unverified while the configured warehouse is not RUNNING. Sales
contributions do not establish disease, stockout, contract or pricing causes.
