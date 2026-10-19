# API Gateway

## Overview buyer-sector diagnosis — 19 October 2026

Authenticated `GET /api/sales/sector-trend` returns compact daily Gold-derived
financial aggregates for All/Government/Private/Internal/Unknown with a shared
release identity. It uses the existing complete, version-pinned catalog read;
the browser does not receive the catalog's raw records through this endpoint.
Each present day/sector exposes `date`, `period`, nullable `revenue`, `income`,
`margin_revenue_basis`, retained row count and original/adjusted row counts.
Eligible signed amounts are aggregated in integer millionths. Absent groups
are absent, not filled with observed zero. The source remains candidate with
`buyer_mapping_status: proposed_review_pending`; required-source errors remain
explicit. The overview requires the same release as its core data.

Overview buyer selection scopes the right trend, KPI/narrative, coverage, calendar,
margin chart/value table and sector CSV together; the left Overall trend stays All.
As confirmed by the user on 20 October 2026, All Time opens the **2017–2025 study**.
The former History view selector is removed. `study.start` is `2017-01-01`,
`study.end` is `2025-12-31`, and `pending_extension` describes unconfirmed 2026
actuals. No model window is changed by this display metadata. Custom and
last-N date controls remain explicit selected dates. Sector trends use recorded
observations only; no gap interpolation substitutes for absent sector periods.
Net sales and gross profit have independently eligible populations. A month
with eligible profit but unavailable net sales retains its profit; it must not
be dropped or acquire zero sales. Annual values/CSV disclose sales and profit
month counts separately. Historical UI year labels show plain years rather than
classifying the client-provided dataset as `Partial`; counts remain visible and
absent months are not inferred to be zero. Custom boundary years show `selected
dates`; current-year YTD and matched-month Y/Y rules remain. This presentation
change does not modify API values or forecast inputs. Margin still uses its
matching eligible profit/basis.

The contribution table calls existing `GET /api/sales/diagnostics` for the last
selected year's date intersection, compared with the same dates one year
earlier. In the default study view this is January–December 2025 vs 2024.
Common company month pairs are selected before sector grouping, preserving a
reconciled All denominator. Group absence in those observed company periods is
an explicitly labelled accounting zero; it is not zero real demand. Missing
company periods remain unavailable/excluded. Selecting a buyer filters the
displayed/exported rows while an All-sector reference remains labelled.

Diagnostic responses additionally expose `contributions.evidence`: the same
matched financial populations partitioned by original/adjusted source evidence.
This signed partition reconciles before serving and is visible in investigation
details/JSON export. Sector → month → product → raw area inspection retains
dates, filters, financial eligibility and release identity. Generic raw area or
proposed directory entries do not establish individual account linkage.

Both comparison-year margins and the trend rate use the same-record eligible
gross-profit/revenue basis, with missing/nonpositive basis unavailable. The
eligible subset can change between years; a rising reported rate does not
establish improved whole-sector profitability. See [checked findings and
mapping review](../outputs/sector_diagnostic_20261019/FINDINGS.md).

## Buyer-scoped retrospective revenue benchmarks — 19 October 2026

`GET /api/sales/forecast-validation?sector=Government&product=&metric=revenue`
now returns separately computed historical benchmark evidence for each allowed
buyer scope: All, Government, Private, Internal and Unknown. The gateway applies
the same proposed buyer CASE as diagnostic reporting before monthly aggregation.
All retains its existing `company` evaluation series; buyer subsets use
`buyer:<sector>` keys. Source, errors, common comparisons, chart/table and CSV
must describe that selected population. No company result is relabelled as a
buyer result.

Nonempty all-product revenue scopes return `status: exploratory` and the existing
3/6/12-month fixed-origin benchmark views. Empty financial scopes return
`status: empty`, null origin, empty model/view objects and an `empty_reason`
(`no_records_in_selected_buyer_scope` or `no_eligible_net_sales_observations`).
Observed zero remains an observation; missing months are not filled with zero.
Unknown happens to be empty in the checked release, but is not permanently
blocked if later source records support that mapped category.

These responses remain unpublished, with unverified reporting coverage and
proposed buyer mappings disclosed. Product-specific and physical-quantity
evaluation, external features, trained-model publication and operational use
retain their separate evidence requirements. Future benchmark points/bounds
remain null. See the [implemented change and verification](../outputs/predictive_buyer_scope_20261019/README.md).

## Authentication ordering and source failures — 17 October 2026

The [T08 repair](../outputs/auth_http_remediation_20261017/README.md) makes scalar
query validation follow authentication and the required-password-change guard on
protected routes. Missing/invalid sessions return 401, forced-reset sessions 403,
then malformed/repeated/structured scalar filters 400. Public health/login retain
explicit scalar validation. This ordering applies to those query checks; JSON
body parsing, CORS and rate limiting retain their own boundaries.

An absent Databricks configuration now returns 503 with
`DATABRICKS_SOURCE_UNAVAILABLE` before release lookup or cached analytical reads.
A configured release/query failure retains its existing502/503 classification;
the checked configured release failure is502 `DATABRICKS_QUERY_FAILED`. Denied
browser origins return 403 JSON `CORS_ORIGIN_DENIED`, without reflecting the origin
or a stack trace. Allowed OPTIONS still works. None of these errors returns
substitute analytical data. Recovery itself is a server-admin CLI documented in
[the Auth runbook](SUPABASE_AUTH_MIGRATION.md), not a new HTTP endpoint.

## Descriptive remediation contract

`GET /api/sales/sectors` now returns actual `date`, source `area`, eligible
`income`, `margin_revenue_basis`, `positive_sales`, signed `returns_value`,
source-adjustment provenance, and proposed buyer/warehouse geography status.
It does not split Mindoro or manufacture daily observations. Aggregate net revenue
is conserved; a null amount is not an observed zero.
Year, area, product and summary financial measures can be explicit `null` when
their eligible population has no measured amount. Raw ledger amounts, filtered
summary sums and averages preserve the same distinction. Record counts and the
intentional positive-sales/negative-adjustment partitions retain observed zeros.
The dashboard accepts explicit null measures and shows unavailable values;
malformed values still reject the analytical contract.
The legacy `returns_value` field contains signed eligible negative net-sales
adjustments. It does not verify that goods were physically returned.

`GET /api/seasonality/stl` requires authentication. It returns version-matched Gold
STL components and parameters, or HTTP 503 `STL_UNAVAILABLE`. Missing STL does not
remove financial reporting and never triggers a local-file fallback.

Fact-based gateway reads are pinned per process. `data_status.release` and source
metadata identify the fact Delta version and dataset/policy/mapping hashes. Use
`DATABRICKS_DESCRIPTIVE_FACT_VERSION` plus a controlled restart for an explicit
candidate version; approved release activation remains unfinished.

`GET /api/sales/status` also exposes top-level `release` metadata, using the same
process pin as its counts. Its checksum is a status fingerprint, not a substitute
for the dataset, policy, mapping hashes and fact Delta version.

Product ABC uses positive eligible sales with signed returns shown separately;
`abc_policy_status=CANDIDATE_PENDING_CEO_APPROVAL` is mandatory until that policy
is accepted. This is source-label financial analysis, not medical SKU validation.


The canonical gateway is the Express and TypeScript service in `backend/`. All dashboard routes require `Authorization: Bearer <token>` except `GET /api/health` and the authentication entry points.

## Source contract

Dashboard responses come from Databricks Unity Catalog. The gateway does not start the legacy Python analytics services and does not read a checked-in sales snapshot. A failed Databricks query returns a `502` or `503` response with an error code; it never returns mock or local analytical data.

Primary objects:

- `workspace.medshield_gold.sales_restart_fact_candidate`
- `workspace.medshield_gold.vw_dashboard_monthly_sales_candidate`
- `workspace.medshield_gold.vw_dashboard_yearly_sales_candidate`
- `workspace.medshield_gold.vw_dashboard_area_yearly_candidate`
- `workspace.medshield_gold.sales_restart_business_product_yearly_candidate`
- `workspace.medshield_gold.vw_dss_external_signals_candidate`
- `workspace.medshield_gold.vw_weather_nasa_power_monthly_candidate`

Responses identify Databricks as the source and report candidate status where applicable. Buyer, geographic, forecast-baseline, prioritization, and scenario responses may be calculated in the gateway from these Gold inputs; they are not independent data sources.

## Health

`GET /api/health` is public and reports gateway health, authentication mode, `source: "databricks"`, and `dashboard_fallback: false`. It does not prove that the SQL warehouse or every Gold view is reachable.

## Authentication

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/complete-password-reset`

Supabase Auth is the production identity provider. A local-session mode exists for local development when Supabase is intentionally disabled. Neither mode changes the analytical source.

Identity dependency recovery (19 October 2026): token validation and linked-account
GETs each use a five-second attempt timeout and at most three attempts, with
250/500 ms backoff for connection resets/timeouts and HTTP 429/500/502/503/504.
Invalid-token 401/403 responses are denied immediately; other nontransient
errors are not retried. Password/sign-in/reset and other writes are never
automatically replayed by this policy. Each request still validates its current
token and linked active account/role; no stored authorization result is reused.
Exhausted identity reads return `503 AUTHENTICATION_UNAVAILABLE` with the generic
`Authentication service is unavailable` message. Provider outages do not mean
that a valid session has expired, and this code distinguishes identity failure
from warehouse unavailability. The frontend preserves the status, code and
endpoint (without query parameters), hides analytics, and offers a reload retry.

## Core dashboard

Descriptive contract changes (27 September 2026): monthly `revenue` and `income`
may be null. Rows also expose `transaction_count`, `has_sales_activity`,
`missing`, and nullable `margin_revenue_basis`. A calendar slot without a
transaction is not proof of zero sales. The summary's `avg_margin` and ledger
`gross_margin_rate` divide eligible gross profit by revenue from the same
margin-eligible population. Do not recompute these rates from independently
eligible revenue and profit totals. Rates are percentage points, not fractions.

Product ABC uses the full positive eligible sales population before the top-15
limit, with cumulative thresholds 80%/95%. A label crossing a threshold stays in
its starting class; nonpositive contributions or an unsuitable denominator return
`Unclassified`. Signed negative adjustments remain separate in net revenue;
source labels are not verified medical SKUs.
`/api/seasonality` returns observed calendar-month mean revenue with
`observed_month_count` and `method: observed_calendar_month_average_not_stl`.
It excludes absent months from the mean and is not STL decomposition.

- `GET /api/dashboard_status`
- `GET /api/summary`
- `GET /api/monthly?year=2025`
- `GET /api/by_area`
- `GET /api/products?limit=15`
- `GET /api/year_summary`
- `GET /api/seasonality`
- `GET /api/forecasts`
- `GET /api/external_signals`
- `GET /api/inventory_recommendations`
- `GET /api/regional_priorities`
- `GET /api/area_clusters`
- `GET /api/product_priorities`
- `GET /api/allocation_recommendations`
- `GET /api/product_region_matches`
- `GET /api/decision_alerts`
- `GET /api/model_evaluation`

Arrays whose approved Databricks outputs do not exist remain empty. The gateway does not fabricate model results.

For `/api/monthly`, omitting `year` returns all monthly history. A supplied value must be one four-digit year between 1000 and 9999; surrounding whitespace is trimmed. Empty, partial, malformed, repeated, or structured values return `400` with an `error` message before loading analytical data. Filtering matches the complete year followed by `-` in the monthly period. Future years are accepted; a valid year with no data returns `200 []`. Authentication is required before input validation.

## Sales and decision support

- `GET /api/sales/status`
- `GET /api/sales/transactions?year=2025&page=1&page_size=25&quality_status=all&search=`
- `GET /api/sales/summary?year=2025&quality_status=all&search=`
- `GET /api/sales/heatmap`
- `GET /api/sales/sectors`
- `GET /api/sales/forecast-validation?sector=All&product=&metric=revenue`
- `GET /api/sales/external-regression?...`
- `GET /api/sales/planning-shortlist?sector=All&territory=Quezon`
- `POST /api/sales/planning-solve`

The sector response uses derived classification rules traceable to `docs/MAPPED_CLIENT_REFERENCE.md`. Government, Private, Internal, and Unknown describe mapped buyer clusters; they are not source-recorded ownership for every row.

Forecast validation publishes transparent seasonal-naive and last-observation baselines derived from Databricks history. It does not label either model as approved. External regression returns `status: "blocked"` until approved DOH/PAGASA territory-month joins exist. The response also provides `context` for the selected buyer/product and approved sales geography:108 study-month rows(2017–2025), lagged DOH/PAGASA observations, eligible signed net sales, original/adjusted source-row counts, station/mapping/observation status, per-signal source dataset identity and a content checksum. Default pilot is Private/Quezon. `coobserved_months` is descriptive alignment; it is distinct from `join_ready_months` and model-training coverage. Missing values remain null. Quantity context stays unavailable pending unit verification. Supported lags are 1,2,3,6,8,12; provider is PAGASA and disease must be one of the four supplied disease choices. Any required-source failure returns an error and clears the context. No local-file fallback or model fit is started. See the [context audit](../outputs/analytics_external_audit_20261020/README.md).

Planning solve uses a Databricks-ranked historical shortlist plus user-entered demand, stock, reserve, pack, cost, supplier, budget, and horizon assumptions. The result is a scenario and cannot execute procurement.

`POST /api/sales/upload` returns `409 DATABRICKS_INGESTION_REQUIRED`. Sales files must enter through the Databricks pipeline.

### Planning contract (7 October 2026)

`GET /api/sales/planning-shortlist` defaults an omitted or blank scalar `sector`
to `All` and `territory` to `all`. `All` applies no buyer-cluster restriction;
explicit `Unknown` selects only rows left unclassified by the buyer rules.
Recognized sector values are case-sensitive: `All`, `Government`, `Private`,
`Internal`, and `Unknown`.

Sector selection uses one exclusive ordered `CASE`: Government first, Internal
second, Private third, and Unknown otherwise. A government or internal label
cannot also enter Private merely because its proposed area type is a territory.
These are proposed buyer mappings; selecting a territory does not approve its
geographic identity or external-source joins.

Ranking excludes the current open month and every future month in Asia/Manila.
The evidence window covers 12 calendar months ending at the latest observed
closed month in the selected scope. Missing months remain missing. The shortlist
contains the highest-revenue 20% of positive-net-revenue source-label groups,
rounded up and capped at five, with product text breaking revenue ties.
`period_start`, `period_end`, `months_stale`, observed-month counts, and the
shortlist share describe historical evidence. Reported quantities are reference
values and do not establish approved SKU units or forecast demand.

`POST /api/sales/planning-solve` reloads the shortlist for the submitted `scope`.
The body must contain `acknowledged: true`, the matching shortlist `checksum`,
and one item for every current shortlisted product exactly once. Item order may
vary; duplicate, missing, or additional products fail validation. Each item uses
its exact returned `product` text. An empty shortlist cannot produce a scenario.

Required numeric inputs accept finite numbers or nonblank numeric strings within
the bounds below. Missing, null, blank, Boolean, array, and object values are
rejected rather than converted to zero. Explicit zero is permitted where shown.

| Input | Accepted range or values |
|---|---|
| `horizon` | Integer `1`, `3`, `6`, or `12`; describes the entered demand assumption |
| `budget` | PHP 0–1,000,000,000, exactly representable in cents |
| `minimum_pct` | 0–100 percent |
| Item `demand` | Integer 1–1,000,000,000 |
| Item `stock` | Integer 0–1,000,000,000 |
| Item `reserve` | Integer 0 through that item's stock |
| Item `pack` | Integer 1–1,000,000,000 units per assumed order pack |
| Item `pack_cost` | PHP 0.01–1,000,000,000 per assumed pack, exactly representable in cents |
| Item `max_packs` | Integer 0–100,000 |

Budget and pack costs use integer-cent arithmetic. Fractional cents, including
`1e-3`, fail validation; they are not rounded into a different assumption.
Invalid inputs return HTTP 400. Valid scenarios return `scenario_allocation`,
`infeasible`, or `not_solved`. An unmet minimum budget/supplier constraint returns
`infeasible` with no allocation rows. If affordable unmet demand remains after
100,000 additional pack-allocation steps, `not_solved` returns the computation
limit conflict and no rows; it does not expose a partial allocation as completed.

The allocator greedily balances fulfillment under entered constraints. Its
result is for human review and carries no proof of global optimality, verified
inventory, supplier pricing, approved forecast quantities, or purchasing approval.
This scenario horizon is separate from both the existing company PHP forecast
display and the proposed SKU quantity forecast contract below.

## External observations

- `GET /api/weather/effects?provider=PAGASA&year=2024&area=Quezon&grain=monthly`
- `GET /api/weather/effects?provider=nasa_power&year=2025&area=Batangas&grain=monthly`
- `GET /api/weather/effects?provider=open_meteo_era5&year=2024&area=Quezon&grain=monthly`
- `GET /api/weather/effects?provider=open_meteo_era5_seamless&year=2024&area=Palawan&grain=monthly`
- `GET /api/weather/effects?provider=open_meteo_ifs&year=2024&area=Albay&grain=monthly`
- `POST /api/weather/refresh`

PAGASA reads official historical observations from the external-signals Gold view. NASA POWER reads provider-derived historical proxy observations from `workspace.medshield_gold.vw_weather_nasa_power_monthly_candidate`. Both displayed response sets come from Databricks; the browser does not read a weather file or call NASA directly.

NASA refresh accepts validated `start`, `end`, `areas`, and `provider: "nasa_power"` input from an authorized analyst/administrator. The gateway fetches NASA POWER daily observations, aggregates monthly values, upserts `workspace.medshield_silver.weather_nasa_power_monthly_candidate`, and creates/refreshes the Gold view before returning success. PAGASA refreshes run through the Databricks external-source notebooks.

Weather refresh now also accepts `open_meteo_era5`, `open_meteo_era5_seamless` and
`open_meteo_ifs` (the explicit archive model `ecmwf_ifs`). These use the fixed HTTPS
Open-Meteo archive endpoint with Asia/Manila days. Separate provider/model rows
upsert `workspace.medshield_silver.weather_open_meteo_monthly_candidate`; the Gold
reader uses `workspace.medshield_gold.vw_weather_open_meteo_monthly_candidate`.
The first explicitly requested refresh creates these candidate contracts. The
implementation is locally tested; cloud publication/readback has not been run as
part of the 8 October reliability benchmark. An absent new contract returns
`status: "not_refreshed"`; a failed warehouse query returns an explicit error.

All API refreshes require whole closed calendar months from 2017 through the
latest closed Manila month, at most ten years per request. The candidate point
registry covers the 16 provinces of CALABARZON/MIMAROPA/Bicol and retains Metro
Manila for compatibility. Points are not province-wide observations or approved
sales joins. Requests with missing rainfall days fail before data writes; an
incomplete optional monthly mean stays null. NASA no longer accepts partial-month
overwrite or silently averages incomplete optional measurements. Legacy NASA
rows retain their original lineage; these stricter guards do not retroactively
certify earlier refreshes.

Open-Meteo rows preserve expected and per-metric valid days, requested/grid
coordinates, source URL/response hash, timezone, model family and candidate status.
They expose no sales matches, demand uplift, severity or official alerts. ERA5 and
ERA5-Seamless rainfall share ERA5 input; they are not independent votes. NASA's
existing wind is the maximum daily mean; Open-Meteo wind is the maximum of daily
maxima. These fields must not be treated as an equivalent wind comparison.
PAGASA rainfall millimetres are no longer mislabeled as a severity proxy, and
missing rainfall remains null in both historical readers.

Example authorized request body:

```json
{"provider":"open_meteo_era5","start":"2024-01-01","end":"2024-12-31","areas":["Quezon"]}
```

The no-key hosted Open-Meteo endpoint is for noncommercial research; commercial
deployment needs appropriate provider entitlement/configuration. No account,
subscription or commercial credential was created. The offline
[reliability screening](../outputs/weather_reliability_20261008/REPORT.md) is not
a dashboard fallback, operational forecast certification or model approval.

## Databricks administration

- `GET /api/integrations/databricks/status`
- `GET /api/integrations/databricks/external/status`
- `POST /api/integrations/databricks/sync/yearly`

These administrator routes validate the sales/external contracts and may maintain the protected Supabase yearly candidate cache. The live dashboard still reads Databricks directly and does not depend on that cache.

## Audit

- `POST /api/audit`
- `GET /api/audit`

Audit events use Supabase when configured and may fall back to a local audit file. This fallback never supplies dashboard measures.

## Error rules

| Situation | Expected response |
|---|---|
| Missing/invalid bearer token | `401` |
| Role not allowed | `403` |
| Invalid query/body | `400` |
| Browser sales upload | `409 DATABRICKS_INGESTION_REQUIRED` |
| Databricks not configured | `503` |
| Databricks query/contract failure | `502` or contract-specific validation status |
| Unpublished legacy analytical output | Empty array or `503 DATABRICKS_VIEW_REQUIRED`, depending on route |

See [ARCHITECTURE.md](ARCHITECTURE.md) and [CURRENT_STATE.md](CURRENT_STATE.md).


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

The three catalog endpoints accept `category=All|Medical|Non-Medical|Unclassified`.
`/api/products` retains its array response and includes selected denominator,
unresolved coverage and release metadata per result. `/api/sales/sectors` returns
complete detailed rows and coverage. `/api/sales/heatmap` returns stable product
metadata plus daily/monthly rows with separate quantity evidence strata. Bounded
pages and count verification reject truncation. No local catalog output is a fallback.
# Predictive API update — 27 September 2026

## Stored predictive research — 15 October 2026

Authenticated `GET /api/sales/predictive-research` exposes evaluated unpublished
experiments already retained in Databricks Gold. The optional scalar `run_id`
must use the `experiment_<64 lowercase hexadecimal characters>` warehouse
namespace. Unsupported, repeated, structured or blank filters return 400; an
unauthenticated ordinary request returns 401. Storage, integrity or source
failures return 503 with `PREDICTIVE_RESEARCH_UNAVAILABLE`, without raw warehouse
details or a local analytical fallback. Successful absence is an `empty` response.

The `predictive-research.v1` response lists stored experiment identities and
compares a selected source-matched run against the gateway's active descriptive
fact/dataset/policy/catalog/geography identity. The default is the largest
matching configuration grid, then warehouse run ID; this is neither a model
ranking nor a claim that the experiment is newest. Explicit selection does not
change the stored model-selection decision. Raw payload hashes, storage metadata,
scope, calendar leads and point keys are verified before any results are returned.

`cohorts.development.groups` and `cohorts.retrospective_audit.groups` contain
cumulative `3`, `6` and `12` lead groups, their dates, origins, case counts and
distinct target counts. Model metrics use complete expected origin–target–lead
cases. An incomplete model remains visible with its individual coverage and
exclusion reason; it cannot erase the complete models' comparison population.
Point rows retain origin, target, true lead, actual, prediction, signed/absolute
peso errors and explicit unavailable reasons. Zero-denominator WAPE remains null.

`candidate_projections` separately exposes the stored selected-model research
points, genuine generation timestamp, training cutoff and elapsed/current/future
labels **at generation**. Future actuals and measured errors remain null. Missing
generation evidence leaves this view unavailable. This is distinct from approved
`/api/forecasts?schema_version=2` serving and the four dynamically calculated
retrospective benchmarks. Every research response keeps
`publication_approved: false` and `activation_allowed: false`.

The projection points add `prior_year_period`, `prior_year_net_sales_php`,
`prior_year_value_status`, `prior_year_coverage_status`, `forecast_yoy_percent`
and `forecast_yoy_unavailable_reason`. Forecast YoY is
`100 * (prediction - prior_year_net_sales_php) / prior_year_net_sales_php`.
The denominator is the same calendar month twelve months earlier from the
selected run's exact frozen company-PHP input, at or before the model origin.
It must be finite, positive, closed, complete and evaluation-eligible with a
supported value status and no blockers. Zero, negative or ineligible recorded
baselines remain visible while the percentage is null with a reason. A missing
forecast also leaves the percentage null. This derived forecast change is
separate from observed growth and measured forecast error.

`baseline_input_storage_hash` preserves the frozen mart's file/storage identity;
`baseline_input_content_hash` preserves the run's canonical input digest. These
identities need not be equal. The gateway resolves a bounded complete immutable
mart group, validates its manifest and typed/payload fields, and verifies the
reconstructed content digest against the selected run. Ambiguous, incomplete or
inconsistent required source evidence returns the same explicit 503 contract;
there is no substitution from current monthly data or repository files. The CSV
retains the baseline, percentage, statuses, reasons and both hashes.

The endpoint performs no training, file ingestion, warehouse write or pointer
change. Offline experiments not stored under this candidate contract do not
become dashboard results through repository-file access. The Forecast research
panel's CSV retains the selected run/artifact/source identity, stage, lead group,
each origin-keyed point and same-group summary metrics.

`/api/sales/forecast-validation` now exposes retrospective fixed-origin company
revenue benchmarks, exact common evaluation keys, unverified reporting coverage
and unpublished future rows. Unapproved sectors/products/units are blocked.
Repeated, structured and unknown filters return 400 after authentication.

`/api/forecasts` and `/api/model_evaluation` preserve their no-query legacy arrays.
Opt in to the coherent metadata envelope with `schema_version=2`. Accepted scalar
filters: `series_id`, `target`, `scope`, `release_id`, `run_id`, `display_start`
(`YYYY-MM`) and `horizon` (`3`, `6`, `12`). Only `company:net_sales:PHP`, company
scope and net_sales are supported. The default window begins in the current
Asia/Manila month. Response states distinguish published, unpublished, empty and
unsupported; storage/consistency failures return 503. No local fallback or process
cache is used. One manifest supplies actuals, backtests, future points and metrics.
True lead remains distinct from display length. See [operation and release gates](PREDICTIVE_OPERATIONS.md).

The [SKU quantity target contract](AI_PRODUCT_CLASSIFICATION_IMPLEMENTATION_PLAN.md)
is separate preparation. Its proposed versioned channel offers 1/3/6 displayed
months starting with the month after the selected Manila planning month, with
verified SKU/unit scope and explicit target periods. It is not implemented by
the existing company PHP endpoints. Actual model lead is the calendar distance
from the accepted model origin to each target month; a short display window
does not make a stale origin recent. Unsupported leads return unavailable
quantities rather than an unrelated PHP forecast or fabricated units.

## Sales diagnostic drill-down (5 October 2026)

Authenticated `GET /api/sales/diagnostics?start_date=2025-01-01&end_date=2025-12-31`
returns release-bound matched current/prior totals, complete signed month/product/raw-area/sector
contributions, financial eligibility, coverage gaps and explicitly unverified causal status.
The prior range uses the same dates one year earlier with leap-day clamping.
Optional scalar `product_id`, `area`, `sector`, `region`, `territory`, and `category`
filters also apply to transaction and summary endpoints; both date bounds are required together.
Invalid diagnostic filters return 400. See [contract and evidence meaning](DRILLDOWN_DIAGNOSTICS.md).
