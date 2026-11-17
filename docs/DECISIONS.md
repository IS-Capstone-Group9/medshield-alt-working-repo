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

## 008. Consolidate current local Databricks work in databricks_updated_2

**Decision (26 October 2026, Adrian):** Use `databricks_updated_2/` for current
workspace source, sales/reference files, releases and local checks. Retain
`databricks_updated/` and `databricks/` as historical evidence. Remote
`/Workspace/medshield/` destinations remain unchanged.

**Consequence:** Local preparation tools resolve the new workspace; immutable
historical receipt paths keep their evidence identities. Transfer does not make
historical adjusted 01–03 suitable for restored originals, execute a pipeline,
activate categories or publish contract-inclusive finance. See the
[current run order](../databricks_updated_2/README.md) and
[migration evidence](../outputs/workspace_migration_20261026/README.md).

## 009. Unify financial scope while preserving evidence grain

**Decision (27 October 2026, Adrian authorized implementation):** The main financial
dashboard offers Exclude Contracts by default, Contracts Only and Include Contracts
— unreconciled. Use validated immutable Gold partitions and an explicit per-request
scope for eligible financial KPIs, trends, ledger and exports. Keep itemized product,
area, diagnostic contribution, unit and model contracts independent.

**Consequence:** Scope caches and responses cannot mix users/populations; unsupported
contract dimensions fail explicitly. The combined value is a recorded arithmetic
sum with unverified economic additivity. UI authorization does not establish no
overlap or financial release approval. Separate review pages remain optional.
See [actual implementation and evidence](../outputs/unified_sales_scope_20261027/README.md).

## 010. Stage uploads, then promote a versioned warehouse release

**Decision (7 November 2026, Adrian chose these options while planning the Databricks
upload pipeline):** (1) An uploaded CSV is processed Bronze → Silver → Gold, one Job task
per stage, into the isolated `<catalog>.medshield_intake` schema and stays candidate-only.
It reaches the analytical warehouse only through a separate, explicitly approved
promotion that writes a NEW versioned release in `<catalog>.medshield_warehouse`.
(2) Promotion **replaces only the declared months** and keeps every other month; it never
appends two snapshots. (3) The upload accepts the client export layouts used by the
2017–2026 files as well as the eight-column template.

**Consequence:** Existing original/historical Gold objects and the gateway pins are not
overwritten. Promotion needs every product in the approved category reference, the
current base release, the exact plan hash from a read-only `plan` run, and an explicit
acknowledgement of any plan warnings. **Amended 7 November 2026** after a replay showed no real
file could meet the original `READY_FOR_APPROVAL` and zero-rejected rule: held rows, recorded
`unclassified` rows and months shrinking over 20% are now hash-bound warnings, not silent
passes or dead ends. A declared month with existing rows and none in the file is refused. A created release
is not business, financial, SKU/unit or model approval, and the dashboard gateway does not
read the release schema until a separate reviewed integration changes that. Source
completeness of a replaced period remains a data-owner attestation.
See [staged pipeline](CONTROLLED_SALES_INTAKE.md#staged-pipeline-and-versioned-promotion).

## 011. Show primary dashboard evidence first

Keep the question, decision limits and primary output visible on entry.
Use native disclosures for supporting charts and research. Keep evidence
status next to the applicable result and retain access to source exports.
Use the existing gateway data, publication gates and planning acknowledgement.
See [dashboard output contracts](ANALYTICS_TAB_OUTPUTS.md).

## 012. Accept the remaining dashboard reading targets

Accept the measured results of the dashboard simplification without further
trimming. Six pages stay above the per-page 50% word cut, charts start at 789px
on Sales and 696px on Products, and View Sales Data's first KPI starts at 658px.
Further cuts would risk evidence labels or remove controls. The user accepted
this on 7 November 2026. See the
[verification packet](../outputs/ui_simplification_20261107/README.md).

## 011. Original itemized is the official sales fact; the warehouse seed is itemized only

**Decision (7 November 2026, Adrian):** The pinned original itemized Gold table (Delta version 0) is the official
sales fact. The warehouse history seed holds itemized rows only. Contract rows stay in their separate table.

**Consequence:** Release `5df98130b9ec13ef` holds the 39,286 technically eligible rows, ₱638,015,351.53 net. The other 885
rows stay held, not zero-filled. Contract overlap remains unverified, so contract value is not added to this fact. Other
sales fact tables remain in the workspace as history and are not retired or deleted by this decision. This names a technical
source of record; it is not financial release, SKU/unit or model approval, and dashboard reads did not change.
See the [audit](../outputs/warehouse_audit_20261107/README.md).

## 012. RSI from NASA POWER, approved PAGASA stations, and DII from PSA population

**Decision (10 November 2026, Adrian):** RSI is the NASA POWER `rainfall_severity_proxy`, labeled as a proxy (2021–2025).
PAGASA stations approved per territory: Batangas Ambulong, Cavite Sangley Point, Camarines Norte Daet, Quezon Tayabas
(Alabat not used). Camarines Sur, Laguna and Marinduque have no station and rely on NASA POWER. DII is reported DOH cases
per 100,000 people, using PSA census counts (OpenSTAT table 0211A6DAPG0: 2015, 2020, 2024) interpolated to mid-year,
with 2025–2026 extrapolated; each year carries its basis.

**Consequence:** Warehouse table `territory_signal_monthly_v2` (release `5df98130b9ec13ef`) marks approved-station weather
and RSI rows join-ready. DOH disease and DII rows keep their pending territory status. The source audit tables are not
rewritten. This approves inputs for analysis, not a forecast model or business decision.

## 013. Dashboard stays on pinned Gold; the warehouse serves analysis

**Decision (10 November 2026, Adrian):** The dashboard keeps reading pinned original itemized Gold (Delta version 0) through
`originalItemizedFactSql`. The warehouse release serves the marts, year-over-year, seasonality, territory signals, DII and RSI.

**Reason:** The release holds only the 39,286 net-eligible itemized lines. The dashboard also needs the other 885 lines,
separate gross/cost eligibility flags, quality rule codes, and contract rows for the scope switch (decision 009).
Switching now would change counts and gross/cost totals and break that switch. The release reconciles to Gold to the
centavo, so dashboard numbers are the same either way.

**Revisit when:** a full-fidelity release exists (all 40,171 lines with eligibility flags and quality codes, plus a separate
contracts fact) and an adapter shows identical page totals before and after.

## 014. Dashboard reads exact warehouse copies of pinned Gold (supersedes 013)

**Decision (10 November 2026, Adrian):** With `DATABRICKS_ITEMIZED_SOURCE=warehouse` and `DATABRICKS_WAREHOUSE_RELEASE_ID`,
the gateway reads `release_<id>_gold_itemized_v0` and `release_<id>_gold_contracts_v0` instead of the original Gold tables.
These are exact copies of pinned Gold Delta version 0 stored with release `5df98130b9ec13ef`. The default stays `gold`.

**Safeguards:** before serving, the gateway proves each copy equals pinned Gold (row count, distinct keys, eligible net and
row-hash sum) and fails closed with no fallback if not. On 10 November 2026, both copies were identical row for row
(0 differing rows), and 18 dashboard-style aggregates (3 contract scopes x 6 cuts) matched exactly in both modes.
Only the source tables change; every projection, eligibility rule and contract scope is unchanged.

**Limit and guard:** the copies represent the seeded history. The gateway also refuses to serve when the configured release
is not the current release, so a later promotion makes the dashboard unavailable until copies are refreshed, never silently stale.

**Endpoint check (10 November 2026):** two isolated gateways (gold and warehouse, local test sessions) returned identical
responses on 17 of 18 dashboard endpoint calls, including all three contract scopes; the only difference was `so1`
`source.sql_sha256`, a hash of the SQL text, which correctly reflects the new table name. A repeat gold run was identical.
The sector-trend query gained `ORDER BY` because its checksum depended on arbitrary row order.

## 015. Product family mapping v1.1 as a candidate for family ABC–XYZ

**Decision (11 November 2026, Adrian):** approve family mapping v1.1 as a *candidate* (brand-line definition: all strengths,
sizes and forms of one brand or product type) for the Products page ABC–XYZ view. Validation: a pre-registered random-grouping
check passed (81.9% A-X value kept vs 60.2% for size-matched random groupings) and an AI-assisted spot check (v1 46/48,
v1.1 48/48 on the sample). It is **not** expert-validated: catalog owner confirmation and generic names remain open.

**Consequence:** the mapping is stored as one hash-pinned row (`reference_product_family_8b96ff67b9134688_candidate`,
SHA-256 `8b96ff67…edcf`); `GET /api/sales/family-abc-xyz` classifies 2025 Gold sales by family and returns 503 if the row
is missing, changed or a Gold label is unmapped. Handling notes are suggestions; no stock rule, forecast or procurement
approval follows. Gold, the product master and existing models are unchanged.

## 016. DOH territory mapping approved for analysis

**Decision (12 November 2026, Adrian):** the DOH disease rows in `territory_signal_monthly_v2` (release
`5df98130b9ec13ef`) and the derived DII (reported cases per 100,000, PSA mid-year population) are approved for
**analysis use**, matching the scope of decision 012 for weather.

**Consequence:** DII may be used in offline, pre-registered analysis. It does not approve a forecast input, a dashboard
display, or any business decision; the source audit tables are not rewritten. Disease-to-medicine links used in tests are
stated assumptions for adviser confirmation, not clinical findings.

## 017. Disease and weather inform planning; forecasts stay on mean_6

**Decision (17 November 2026, Adrian):** disease (DOH) and weather (PAGASA, NASA POWER) data **inform planning** (when
to prepare and what a seasonal buffer would cost). They **do not drive forecasts**. The 6-month mean (mean_6) remains the
reference forecast.

**Basis:** the link was tested and not supported at brand/family level, therapeutic-category level
(`outputs/category_disease_test_20261115`, 0 of 64 after Holm), territory level (`outputs/signal_analysis_20261110`) and as
surge alerts (`outputs/surge_preparedness_20261117`, 0 usable of 8; the diarrhoeal pass is trend-confounded). Weather was also tested, pre-registered, as a driver of forecast uncertainty (W1) and of delivery disruption (W2); both failed (`outputs/weather_prediction_tests_20261117`). Likely
reason: most demand comes from hospitals and government programmes that order on budget and tender cycles.

**Consequence:** disease and weather feed the risk calendar, the "this month" risk indicator and the planner-chosen buffer
scenario (`GET /api/sales/surge-preparedness`, table `reference_surge_preparedness_d9874878ecca4f49_candidate`). Do not
add them as forecast inputs, adjust forecasts with them, or describe the system as disease- or weather-driven forecasting.
Use "disease- and weather-informed planning". A weather or disease model may replace this only if a new **pre-registered**
challenger beats mean_6 under the standard win rule on held-out months; exploratory or post-hoc results do not qualify.
