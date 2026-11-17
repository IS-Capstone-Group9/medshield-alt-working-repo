# API Gateway

## Forecast read sharing and connection recovery — 6 November 2026

Current-source, rolling and tournament research readers share an overlapping read of their identical, pinned original-itemized monthly Gold input. Each reader still validates its own artifact, source identity and scores. The shared promise releases on success or failure; subsequent requests read again. A disconnected first consumer cannot cancel that shared read, and injected executors remain isolated. This is not a retained analytical snapshot or an outage fallback.

The SQL executor retries `UND_ERR_CONNECT_TIMEOUT` once per statement, only for conservatively recognized read-only SQL. The 100 ms retry delay and all attempts remain inside the original operation/admission budget. Mutations, uncertain SQL, connection resets, HTTP errors and response-body failures are not retried. `Server-Timing` includes `connectretry`; timing logs include `connectionRetries`. With `GATEWAY_REQUEST_METRICS=1`, an abandoned request also emits one `gateway_request_aborted` event with route template and counters, never query strings, bodies, SQL or credentials.

From `backend/`, `node --import tsx scripts/inspect-forecast-warehouse.ts` performs GET-only warehouse/history inspection and prints allowlisted configuration and up to 20 recent query metrics. Optional `--explain-monthly` also submits a fixed `EXPLAIN FORMATTED` of the pinned monthly SELECT and retains only operator presence and input/plan hashes. It excludes SQL/plan text, account/query identifiers and credentials; missing metrics stay absent. It does not resize, start or stop a warehouse, execute the underlying SELECT for the plan, rebuild data or publish a source/model. Uses the configured backend environment or `MEDSHIELD_ENV_FILE`.

[Checks and original failed sample](../outputs/improvement_step3_20261106/README.md). Five final direct bursts and five browser loads succeeded on active Forecast routes in that bounded sample. Following the user's continuation of the recommended removal, the obsolete Stored predictive research section is no longer mounted or automatically requested. Its historical renderer remains in explicit fixtures; the authenticated gateway route retains its intentional unavailable contract for older callers. [Removal, plan inspection and current verification](../outputs/improvement_step3_closeout_20261106/README.md). No latency SLA or general outage fix is established.

## HTTP keep-alive idle-close grace — 5 November 2026

The gateway advertises a five-second keep-alive lifetime and waits ten idle
seconds before closing persistent connections. This bounded grace addresses
the reproduced Node 22.14 pooled-read race during large catalog reads.
Explicit `Connection: close` remains honored. Header/request deadlines and
Databricks statement/queue budgets remain unchanged.

`backend/src/httpServer.ts` controls connection lifecycle only. Authentication,
response bodies, source validation and publication gates are unchanged. Build
new gateway processes from the updated source; older compiled servers retain
the previous behavior. Hosted rollout and sustained-load acceptance are separate.

[Diagnosis and checks](../outputs/connection_recovery_20261105/README.md).
[Node HTTP timing reference](https://nodejs.org/download/release/v22.14.0/docs/api/http.html#serverkeepalivetimeout).

## Request timing and Databricks execution limits

The gateway generates an `X-Request-ID` for each request. JSON responses also
include `Server-Timing` entries for elapsed application work, cumulative warehouse
and queue time, statement submissions, and cache events. Parallel work contributes
to cumulative time, so those entries can exceed application elapsed time. Response
body transfer happens after these timings are captured. Approved CORS origins can
read both headers.

Databricks statements share a bounded FIFO queue within each gateway process.
The statement budget starts before admission and covers submission, polling,
response bodies and result chunks. The default budget is 60 seconds. An HTTP
disconnect cancels work owned by that caller when the SQL is a conservatively
recognized read. An explicit caller signal can end other local waits. A known
running read receives a best-effort Databricks cancel request. Unknown statement
IDs and uncertain SQL, including generic `WITH` statements, stay outside automatic
remote cancellation. A cancel receipt acknowledges the request. Remote execution
may take additional time to finish. See the [Databricks cancel contract](https://docs.databricks.com/api/statement-execution/v1/cancel-statement).

Shared snapshot and source-validation promises use their own execution budget.
The query cache detaches a cancelled consumer while other consumers continue to
wait. Cache keys bind the financial scope and resolved query/source identity.
Expired entries are pruned and failed or abandoned loads are excluded. Capacity
and deadline errors follow the route's existing unavailable response contract.
Configuration defaults are listed in [Setup](SETUP.md#gateway-execution-settings).

Overlapping HTTP readers of the pinned original itemized Gold source share a
single active source validation. Each research reader then checks its own
artifact and supporting data. The shared validation can finish if its first
caller disconnects. A completed or failed validation releases the in-flight
entry, so a later reader starts fresh. Explicit offline executors use their
own validation calls.

## Delivery-area diagnostics — 2 November 2026

Authenticated, no-store GET `/api/sales/delivery-area-review` returns validated
area-month PHP/count/paired-margin inputs, first/latest/observed/missing-month
coverage, a replacement Cavite province rollup, common matched January–September
2025/2026 study summaries, and source/mapping/policy identities. Arbitrary
supported years and historical common periods use those same rows in the client.
Query overrides return400; source failure503 `DELIVERY_AREA_UNAVAILABLE`.
Scope remains itemized/all-buyers/contracts-excluded, independent of topbar filters.

Authenticated, no-store GET `/api/sales/delivery-area-stl` reads the separate
immutable Gold area candidate, validates fresh source/calendar/windows/components
and returns full-window strengths and candidate identity. Query overrides400;
failed reads503 `DELIVERY_AREA_STL_UNAVAILABLE`. No local fallback, regional
relabeling or request-time fitting. Existing linked-role authentication applies.
See [exact contracts, matrix and evidence](../outputs/delivery_area_20261102/README.md).

## Optional controlled sales intake — 1 November 2026

Admin/Analyst-only `/api/sales/ingestions` adds a private Databricks Job submission
and candidate review workflow. It never replaces `/api/sales/upload` (still409)
or changes the serving release. Missing configuration returns503
`INGESTION_NOT_CONFIGURED`; no provider call or local analytical fallback follows.

| Method and path | Contract |
|---|---|
| GET `/api/sales/ingestions/configuration` | enabled,max_bytes,policy_version,client_exports; server-only host/token/volume/job never returned |
| GET `/api/sales/ingestions/template` | exact UTF-8 CSV header; no source records |
| POST `/api/sales/ingestions?filename=<name.csv>` | authenticated audited raw `text/csv`,10MiB maximum;202 candidate ID/run ID/QUEUED; rate limit10 per15min; identical account/policy/source bytes retry same candidate |
| GET `/api/sales/ingestions/:id` | 64hex candidate ID; owner or Admin; queued/processing/incomplete/failed or verified NEEDS_REVIEW/READY_FOR_APPROVAL; always candidate-only/unpublished. Adds `stages:[{name,state,counts}]` (bronze/silver/gold, `SUCCEEDED` or `NO_EVIDENCE_YET`) only from hash-chained Job receipts; a tampered, out-of-order or foreign receipt returns 502 `INGESTION_REPORT_INVALID`. A successfully terminated run with no verified report returns `FAILED` with `evidence_missing:true` |
| GET `/api/sales/ingestions/:id/reports/:kind` | `issues` or `classifications`; owner/Admin, valid report identity and exact SHA256/byte match required;409 when not ready |
| POST `/api/sales/ingestions/:id/correction-review` | read-only previous/corrected snapshot reconciliation;4KiB `application/json`,no query;10 reviews/15min; body `{corrected_ingestion_id,period_start,period_end,complete_period_asserted:true}`; dates are inclusive YYYY-MM |
| POST `/api/sales/ingestions/:id/correction-review/revalidate` | authenticated source recheck of the complete saved review object;2MiB JSON,no query;10 checks/15min; verifies local integrity then rereads both candidate sources/reports and recomputes the proposal |

No route approves/publishes a candidate or performs complete-period replacement.
With modern client export intake enabled, the manifest count covers physical
lines, including headers, continuations and the final empty line after a
newline. The verified report reconciles received lines to accepted, rejected
and non-transaction lines. The correction-review API applies to template
submissions. Use the Databricks promotion preview for client export periods.
Correction review validates both owners/source hashes/reports and retains all
previous rows outside the declared months. It returns exact signed record-set
before/removed/added/after controls, observed-month union and deterministic plan
hash; no raw rows, provider writes or signed completeness attestation. Both
sources must have zero rejected rows and identical category-reference hashes.
Unresolved category review remains unapproved. All release flags stay false;
the previous snapshot is not claimed to be the live release. Both periods and
observed-month union are bounded at1,200 months, with explicit failure rather
than truncation. Missing reports return409; invalid review400;size413;type415;
provider/identity failures502. Existing auth/role/disabled-config contracts apply.
Revalidation returns `MATCHES_CURRENT_CANDIDATE_CONTROLS` with the same plan hash,
server `checked_at` and `source_revalidated:true` only when fresh source controls
match. Scope is `intake_candidate_sources_and_correction_controls`; completeness,
serving-release verification,release authorization and publication stay false.
Changed controls return409 `INGESTION_CORRECTION_CHANGED`; invalid saved review400;
other existing source/permission/configuration failures remain explicit. The
gateway uses no-store file reads,no saved totals as fallback and no provider write.
This is neither a source-completeness finding nor a comparison to the live serving
release. The receipt is an editable,point-in-time response,not a signed attestation.
Provider/identity failures are sanitized; gateway role checks are authoritative.
See [setup, fields, corrections and recovery](CONTROLLED_SALES_INTAKE.md).
Local tests do not establish deployed Job/volume permission or live source acceptance.

## Regional PHP forecast research review — 31 October 2026

Authenticated `GET /api/sales/regional-php-research` accepts no query parameters
(400 `INVALID_RESEARCH_SCOPE`). It reads one immutable Gold `regional_php_<hash>`
candidate and freshly validates the existing confirmed-delivery regional Gold
source/mapping. Exact artifact bytes, source identity, 81-month coverage, target
values/quality counts, origin-local seasonal MASE scales, 198 score groups and
three development-only references are reconciled. Missing/duplicate/conflicting
candidate or source returns sanitized 503 `REGIONAL_PHP_RESEARCH_UNAVAILABLE`.
No fitting, local artifact fallback or model activation occurs on a request.

The `regional_php_research_review_v1` response contains three coverage records;
only CALABARZON has the complete Jan 2020–Sep 2026 history and 1,980 retained cases.
MIMAROPA/Bicol expose 56/38 eligible months, missing-month arrays and empty
points/groups/selections, never zero-filled sales. The separate Forecast panel
selects region, window, lead and recipe, independently of Analysis filters.
CSV exports include exact predictions/errors, availability reasons, source and
training quality, source/mapping/artifact identity, and false publication,
activation, financial-release, operational and territorial-unit flags. Reload,
source invalidation and failures clear displayed results and exports.
[Implementation and actual verification](../outputs/wp4_regional_php_ui_20261031/README.md).

## ABC classifier research review — 31 October 2026

Authenticated `GET /api/sales/abc-research` accepts no query parameters (400
`INVALID_RESEARCH_SCOPE`). It selects one immutable `abc_<artifact_sha256>` Gold
candidate, validates exact bytes, original dataset/fact/receipt/key/catalog/
policy/Delta-0 identity, and fresh complete product/year and comparison-month
aggregates against frozen hashes (8,872 and 4,182 groups). It reconciles 1,032
retained cases to 433 protocol members, prior-year cutoffs, source quality,
confusion counts, per-class metrics, 40 cohort groups and validation-only selection.
Missing, duplicate, conflicting or changed source/candidate returns safe 503
`ABC_RESEARCH_UNAVAILABLE`; no local result, new fitting or analytical fallback.

The response `abc_research_review_v1` is financial source-label research, independent
of Analysis filters. Four models have 2024 validation results; only `majority` and
selected `prior_abc` have 2025 test and partial-2026 results. Missing held-out
XGBoost results are not zero performance. An empty evaluated cohort has zero
support and null rates; an unassessed model has unavailable support/rates. Selected
baseline held-out probabilities/calibration remain unavailable. The Product panel
checks identities, cases, metrics and selection, preserves these distinct states,
and exports metrics plus supported evaluated labels with target/feature provenance,
raw validation-only uncalibrated probabilities and false publication/activation/
identity/unit flags. Reload/source change/failure clears prior results and exports.
[Actual staging, handler and native evidence](../outputs/wp6_abc_ui_20261031/README.md).

## Optional shared purchase capacity — 30 October 2026

`POST /api/sales/planning-solve` retains authentication/current-source shortlist
validation. Optional `purchase_capacity_units` is a nonnegative integer (zero is
explicit); `capacity_unit_label` is required and every item must supply the exact
matching `unit_label`. Missing/mixed declarations reject. Labels remain entered
assumptions, not verified conversions. Capacity limits newly purchased units,
excluding existing stock. Weighted and balanced methods both honor it; minimum
service that cannot fit returns infeasible. Omission preserves prior behavior.

Successful responses include `purchase_capacity` (null if absent), entered
units/label, used/remaining units, `evidence_label: Assumed` and
`physical_storage_verified:false`. Unmet reasons identify a next pack that cannot
fit. Expiry screens remain separate. The weighted solver retains its enclosing
budget-relaxation bound while restricting each incumbent/branch by capacity;
exhaustion retains an honest gap. No UI default, verified operating fact or
procurement approval is added. [Execution and limits](../outputs/wp9_capacity_budget_frontier_20261030/README.md).

The planning UI now exposes these blank optional controls and per-product labels.
Input drafts preserve incomplete/zero values; legacy drafts clear new fields.
Results reject a missing/inconsistent requested-capacity response. CSV carries
`capacity_constraint_status` (`applied`, `not_applied`, `unavailable`), shared cap,
unit, used/remaining units and evidence/storage flags. Draft fields remain entered
assumptions, never source conversions. [Compiled parity and native-QA limits](../outputs/wp9_capacity_ui_20261030/README.md).

## PHP lead-1/3/6 tournament review — 30 October 2026

Authenticated `GET /api/sales/tournament-research` accepts no query parameters
(400 `INVALID_RESEARCH_SCOPE`). The fixed itemized/all-buyers/PHP contract reads
one immutable `tournament_<artifact_sha256>` Gold candidate, checks exact bytes,
current original release/receipt/key/policy/Delta-0 identity and all 107 monthly
controls, then validates 1,980 origin/target/lead cases and recomputes 198 score
groups, origin-local seasonal-naive MASE scales and development-only selection.
The response `tournament_research_review_v1` includes 22 recipes, leads 1/3/6,
19 development, seven retrospective-audit and four inspected-extension origins
per lead; unavailable predictions remain null. Target windows differ by lead.
No DM significance, calibrated intervals, future forecasts or operational
selection are supplied. Required-source failure returns safe 503
`TOURNAMENT_RESEARCH_UNAVAILABLE`, with no local/old-source fallback or fitting.

The separate Forecast panel checks identities, calendars, groups and selection
before chart/table/CSV display. Changing lead selects its development reference;
model/window controls remain independent of Analysis filters. Reload, failed
validation and source changes clear stale results and exports. CSV retains
actual/prediction/error, training MASE scale, support, development reference and
source/artifact/registration identities, with false approval/activation flags.
[Staging/readback and consumer evidence](../outputs/wp4_tournament_ui_20261030/README.md)
does not change existing frozen/operational readers or the Decision Board's
unavailable regional-unit forecast domain.

## Sales/external research additions — 30 October 2026

The original itemized source validator accepts a complete bounded post-Delta-0
history only for `SET TBLPROPERTIES`/`COMPUTE STATS` (maximum 25 later commits).
Every analytical query still reads Delta 0 and validates its full receipt,
dataset/policy, keys, row counts, eligibility and signed net. Missing, noncontiguous,
data/schema or unknown histories fail closed. This prevents metadata maintenance
from disabling an unchanged analytical snapshot and does not approve new data.
[Fresh read and rejection evidence](../outputs/wp3_regional_anomaly_ledgers_20261030/README.md).

`GET /api/sales/regional-stl-review` derives `strength_summary` from its validated
Gold component artifact, retaining its source and frozen 36-month rule. Each
summary has full-segment start/end, months, trend/seasonal strengths (0–1 or null),
`evidence_label: Derived`, dataset/policy, D4 and method version. The selected UI
year changes visible components; it does not refit or change full-segment strength.
CSV carries the same full-segment values and source policy.

`GET /api/sales/regional-decision-board` requires authentication and rejects
query filters. Its `regional_decision_board_v2` response composes one validated
financial source, matching STL artifact and independently reconciled recorded
product sales priorities into 18 region/domain rows. Exact source/policy/mapping
identity remains mandatory. The client also accepts historical v1 responses.
Missing or invalid optional product detail remains unavailable; required source failure
returns `503 REGIONAL_DECISION_BOARD_UNAVAILABLE`. The installed panel/export
clears stale results during reload/failure and preserves official unavailability.

Product-priority policy `matched_regional_recorded_product_net_sales_v1` reads
only the pinned itemized Gold fact (`VERSION AS OF 0`) for the latest recorded
year and prior year, and the nine confirmed delivery labels. Complete region/month
record, eligible-record, signed-net and paired-margin controls must reconcile
before ranking. Only months observed in both regional years enter the comparison.
Each region retains signed positive/nonpositive product totals and the five
highest positive current-period normalized source labels; no SKU alias merge,
quantity conversion, clinical score or inventory need is inferred. Missing prior
product records yield null prior/change, never fabricated zero demand.
`target_records`/`base_records` count net-sales-eligible records, and observed
product-month counts remain explicit. JSON `product_priority` retains these
details, source identity, query/aggregate SHA-256 and false approval flags.
Regional `base_unreviewed_records`/`target_unreviewed_records` count all
unreviewed-export records in the matched windows and are visible in the board
explanation; without a matched comparison they remain null.
V2 CSV adds board contract, priority policy and query/aggregate hashes to its
existing columns. [Fresh Gold, compiled/native table/export and independent
checks](../outputs/wp2_regional_product_priority_20261030/README.md) do not grant
financial, unit, clinical, model or procurement approval.

Historical external context includes `official_bulletin.status:
OFFICIAL_LIVE_BULLETIN_UNAVAILABLE`, `available:false`, `official_alert:false`.
The panel and export retain that state independently of historical/proxy values.
No official live bulletin connector, new model publication or Python HTTP
training path is introduced. [Scope, actual checks and open exits](SALES_EXTERNAL_IMPLEMENTATION_STATUS.md).

## Dated finite-domain purchase selection — 29 October 2026

30 October extension: both dated review and selection accept optional snapshot
`purchase_capacity_units` (numeric integer0–1e9) and nonblank
`capacity_unit_label`. The cap requires matching product unit labels and limits
total newly proposed whole-pack units. Existing stock/receipts are excluded;
capacity remains Assumed and `physical_storage_verified:false`. Omission keeps
legacy behavior; null/string/Boolean/fractional caps reject.

Fixed review adds `shared_purchase_capacity` to checked constraints and a shared
conflict if exceeded. Its `purchase_capacity.remaining_units` can be negative for
an infeasible fixed candidate. Selection returns the declared
`purchase_capacity_constraint`, enforces it throughout search and returns checked
`purchase_capacity` with used/remaining units only for a selected result. Both
retain budget, service, supplier and expiry rules. No physical-space conversion
or transfer from the ordinary planning cap occurs. [Gateway evidence and limits](../outputs/wp9_dated_capacity_20261030/README.md).

The dated snapshot template now includes `capacity_help` explaining the optional
root fields; both remain omitted until explicitly entered. Structural import
rejects invalid/orphan/mixed-unit capacity. The UI reconciles the requested cap,
Assumed/storage flags, full-pack row usage and remaining units before retaining
a gateway result. Selection also checks the declared constraint, selected dated
snapshot, receipt quantities/dates and full-plan verification. A fixed capacity
violation appears alongside other conflicts. JSON review exports retain
`purchase_capacity_constraint`, `entered_snapshot` and only validated current
server review/selection records. Input/source changes clear them. [Compiled and
actual signed-in download checks](../outputs/wp9_dated_capacity_ui_20261030/README.md)
are separate from physical-unit approval, full responsive QA and client acceptance.

`POST /api/sales/planning-dated-select` accepts the same authenticated
`{acknowledged:true,snapshot}` as dated fixed-plan review. Every product requires
exactly one proposed arrival/expiry slot and `purchase_constraints.selection_max_packs`
(integer0–20 within supplier/quantity bounds), `selection_weight` (integer0–100).
The prototype's positive whole-pack quantity is validated but replaced by search
counts0 through the explicit maximum. Complete timelines and source binding remain.

The server precomputes individually feasible dated quantity options and searches
up to25,000 combination nodes under shared budget. Primary objective is normalized
entered-weighted fulfillment fractions over positive-demand/positive-weight
products; secondary objective minimizes spend among ties. All products retain
supplier/reserve/minimum/expiry constraints. Dates/suppliers are fixed and not
optimized; no broader-domain optimum or real input verification is inferred.

Policy `dated_finite_pack_selection_v1` returns `DATED_SELECTION_RESULT` with
`proof_status: optimal|feasible_bound`, selected rows/snapshot, exact objective and
upper-bound fraction strings, weighted fulfillment/absolute gap, spend/budget and
`secondary_minimum_spend_proved`. Bounded status does not prove the secondary
optimum, even if primary gap0. `DATED_SELECTION_INFEASIBLE` has proof `infeasible`
and no selected rows. The full selected plan is revalidated before returning it.
Only the server sets its search cap; callers cannot increase it.

Source inputs, procurement and expiry-outcome flags remain false; no snapshot or
approval is persisted. Current-source failure stays explicit, without previous
selection or local analytical fallback. [Domain, proof, examples and actual checks](../outputs/dated_purchase_selection_20261029/README.md).

## Backend dated fixed-plan feasibility — 29 October 2026

`POST /api/sales/planning-dated-review` requires existing planning authentication
and `{acknowledged:true,snapshot}`. It reloads/rechecks the current Databricks
shortlist and independently recomputes entered dated baseline/candidate supply.
Snapshot schema/source/scope/product/date/quantity validation is server-side;
client result/approval flags are ignored. The server action is explicit and sends
the snapshot for calculation only; local import does not automatically submit it.

Snapshot `purchase_budget` is shared. Each product requires a complete daily
timeline and `purchase_constraints`: `units_per_pack` (1–1e9 integer), `pack_cost`
(PHP0.01–1e9, exact cents), `supplier_max_packs` (0–100000 integer),
`maximum_projected_expired_units` (0–1e9 integer) and
`minimum_fulfillment_pct` (0–100). Costs/budget use integer cents, including summed
BigInt arithmetic. Proposed receipts must be whole packs and arrive inside the
horizon. Proposed/snapshot quantity bounds and complete-date rules remain.
Request serialized length is bounded260000 characters in addition to server body
limits and bounded product/array/horizon counts.

Malformed inputs return400; valid fixed plans return
`DATED_FIXED_PLAN_FEASIBLE|DATED_FIXED_PLAN_INFEASIBLE`, conflicts, exact decimal
budget/spend, current checksum/scope and per-product baseline/candidate daily
controls. This is a fixed candidate review, not purchase selection or an optimum.
Expiry limit is absolute projected product units over modeled supply, not the
original wastage percentage. Minimum fulfillment is aggregate horizon coverage,
not daily service assurance. Flags `objective_optimized`, `source_inputs_verified`,
`procurement_execution_approved`, `expiry_outcome_measured` are false.
No data/approval persistence, training or procurement execution occurs. Existing
aggregate planning solve and its optimization proof scopes remain separate.
[Contract, example and actual evidence](../outputs/backend_dated_plan_20261029/README.md).

## Local proposed-lot timeline comparison — 29 October 2026

Operating snapshot products optionally accept `proposed_receipts`, up to five
records with `receipt_id`, positive integer `units`, `expected_on`, `expires_on`.
Nonempty proposals require a complete local daily timeline; totals are bounded
at one billion units per product. Proposed and existing receipt IDs are separated
internally. Date/quantity validation, source binding and stale export handling
remain in force. No new gateway endpoint or solve-body field is introduced.

Local review products append `purchase_comparison` or null. Policy
`same_timeline_proposed_receipts_v1` returns unchanged baseline controls, combined
timeline/deltas, each proposal alone and proposed-lot consumption/expiry/ending/
outside-horizon controls. Individual gains are nonadditive and must not be summed.
Cost/budget/supplier checks, optimization, source verification, purchase approval
and measured expiry flags stay false. No local file supplies dashboard analytical
fallback values or changes gateway purchase allocations.
[Schema, interpretation and actual checks](../outputs/purchase_lot_comparison_20261029/README.md).

## Optional local daily supply timeline — 29 October 2026

The dated operating snapshot review supports per-product optional `horizon_end`
and `demand_calendar: [{date, units}]`, with one explicit integer quantity for
every day from snapshot `as_of` through the end (1–366 days). Missing demand is
rejected, not zero-filled; legacy null/omitted end plus empty/omitted calendar
skips the simulation. No new gateway endpoint or solve-body field is introduced.

Review products append `timeline` or null. A timeline preserves daily and per-lot
FEFO consumption, projected expiry, reserve shortfall, entered expected arrivals,
unmet/ending stock, conservation controls and dated follow-ups. The model removes
expired stock at start of date, assumes same-day expected receipts are released
before consumption, protects reserve and does not carry unmet demand forward.
These explicit scenario conventions do not verify receipt timing or clinical
expiry rules. Future receipts outside the horizon are disclosed/excluded.
The output is local entered-input evidence, not an optimized allocation or actual
expiry measure; procurement/input/model authority flags remain false. Existing
snapshot source-binding and stale export checks remain intact.
[Schema, example, conventions and actual verification](../outputs/supply_timeline_20261029/README.md).

## Local dated operating-input review — 29 October 2026

The Planning client now offers a local JSON snapshot template/import/review-export
bound to current source checksum, buyer/territory scope and exact shortlist.
[File schema and limits](../outputs/operating_snapshot_review_20261029/README.md)
define batch/receipt dates, dispositions, unit labels and explicit quantities.
No new gateway endpoint or server persistence is added. The file never supplies
Gold analytical values, changes planning inputs, starts a model or grants approval.
The client checks batch balance and date/quantity consistency only; source
documents, units, expected arrivals and operating availability remain unverified.
Import/export and stale-source handling are isolated client review behavior;
existing solve/auth contracts remain unchanged.

## Planning lead-time / gross shelf screens — 29 October 2026

`POST /api/sales/planning-solve` optionally accepts item `shelf_life_days` (integer
0–3,650 usable calendar days **after receipt**) and `policy_input_reference`
(string up to 200 characters, no control characters; trimmed when returned).
The six complete EOQ/ROP inputs are required if either new field is entered.
Omitted/blank shelf life returns unknown, while zero is a known zero-capacity
assumption. References are entered trace labels, not verified documents; avoid
personal information and secrets. Neither field grants operational approval.

Row `inventory_policy.feasibility` returns `constant_rate_lead_expiry_screen_v1`,
the reference/status, exact-ceiled lead demand, stock availability/gaps without
receipts and assuming all entered inbound is timely, lead-review wording and
floored gross shelf-demand capacity in units/packs. `eoq_lot_exceeds_gross_shelf_capacity`
is true/false or null when unavailable. Row `expiry_screen` separately compares
actual allocated purchase units with the same gross ceiling: `unavailable`,
`exceeds_gross_capacity`, or `within_gross_capacity_not_verified`. It carries
review text and false `allocation_constrained_by_expiry`/`expiry_outcome_measured`.

Usable availability protects reserve and deducts backorders; the EOQ/ROP inventory
position formula is unchanged. Shelf capacity ignores competing stock, batch
expiry dates and variable demand. These are optimistic post-solve review screens,
not delivery/expiry constraints, predicted wastage, service guarantees or safe
purchase limits. A weighted optimum remains scoped to its entered model without
these new constraints. Existing infeasible/no-row handling is unchanged.
Drafts retain optional shelf/reference strings; legacy imports clear them.
CSV appends 15 fields with unknown values blank and formula-safe reference text.
[Actual checks and limitations](../outputs/inventory_feasibility_20261029/README.md).

## Weighted integer-pack planning — 29 October 2026

`POST /api/sales/planning-solve` adds optional `allocation_method`: `balanced`
(also the default when omitted) or `weighted`. Weighted mode requires integer
`revenue_weight`, `growth_weight`, `outbreak_weight` from 0–100 summing to 100.
Each item requires the corresponding `revenue_score`, `growth_score`,
`outbreak_score` integers 0–100 for criteria with positive weights. A zero-weight
criterion may be omitted/blank and is returned as null, not observed zero risk.
At least one composite product score must be positive. Unknown methods and
invalid active inputs return 400 through the existing authenticated validation.

Weighted mode maximizes priority-weighted per-product fulfillment using integer
packs, budget, supplier caps, reserve and minimum fulfillment. Rows append
`priority` (entered scores, composite and assumption status). Response
`optimization` includes `proof_status: optimal|feasible_bound`, weighted
fulfillment, certified upper bound, absolute gap in percentage points, visited/
maximum nodes and exact numerator/denominator strings. Fixed search cap: 25,000
nodes; the request cannot increase it. A feasible bounded result remains
`scenario_allocation` with an explicitly unproved optimum. Infeasible constraints
still return no rows. Balanced mode keeps the prior greedy behavior and returns
null `optimization`/`priority`.

`assumptions.method` is `mcda_integer_pack_branch_bound_v1` or the existing
`bounded_greedy_fulfillment_v1`; `assumptions.weights` is active weights or null.
No secondary cost optimum or actual revenue/disease/clinical truth is inferred.
Operational/procurement/expiry flags remain false. Draft schema 1 accepts optional
method, weights and score strings, including incomplete drafts; old drafts clear
new fields and restore balanced mode. CSV appends 17 criteria/proof fields.
[Model, proof and actual checks](../outputs/weighted_allocation_20261029/README.md).

## Optional EOQ / reorder-point review — 29 October 2026

`POST /api/sales/planning-solve` retains authentication, current shortlist/checksum
and all existing scenario inputs. Each item may additionally contain the six
fields below. Omit all six or send all six as empty strings to skip the policy;
once any is entered, all six must validate. Explicit zero is required where zero
is intended; missing/blank/null/Boolean values cannot supply it.

| Optional policy field | Complete-policy bounds / meaning |
| --- | --- |
| `annual_demand` | Integer 1–1,000,000,000 product units/year; entered independently of horizon demand |
| `order_cost` | PHP 0.01–1,000,000,000 per order, exact cents |
| `holding_cost` | PHP 0.01–1,000,000,000 per product unit/year, exact cents; not a percentage |
| `lead_days` | Integer 0–3,650 calendar days |
| `on_order` | Integer 0–1,000,000,000 units entered as inbound within lead time |
| `backorders` | Integer 0–1,000,000,000 outstanding units |

Successful allocation rows append `inventory_policy`, null when skipped, otherwise
`policy: classical_eoq_rop_entered_assumptions_v1` and input echoes, continuous EOQ,
cost-minimizing whole-pack model lot, annual ordering/cycle-holding model cost,
integer-ceiled reorder point, entered inventory position, trigger, single-lot
budget/supplier checks and review wording. A triggered point requests human review;
it neither executes an order nor selects the allocation purchase quantity.

The annual-demand model uses 365 days and fixed lead time. Existing `reserve` is
safety stock: reorder point is `ceil(annual_demand × lead_days / 365) + reserve`;
entered position is `stock + on_order − backorders`. Usable stock already includes
reserve, so reserve is not subtracted again in this comparison. This entered
inbound convention is limited to lead-time receipts. Allocation still protects
reserve and does not consume the optional inbound/backorder inputs. Model lot
checks compare one unconstrained lot to total budget and supplier cap; they do
not prove shared feasibility. Ordering/cycle-holding cost excludes acquisition,
reserve holding cost and expiry, and does not prove actual savings.

Optional inputs and results append 19 CSV fields. Existing draft schema 1 accepts
optional policy strings; old drafts load with those fields blank, clearing stale
policy assumptions/results. Draft validation is distinct from solve validation.
All operational-input/procurement/expiry approval flags remain false. Existing
`infeasible`/`not_solved` responses still expose no allocation or policy rows.
[Implementation and checks](../outputs/inventory_policy_scenario_20261029/README.md).

## Unit research consumer-derived consistency — 29 October 2026

`GET /api/sales/unit-baseline-research` keeps its existing authenticated,
source-matched contract. The Forecast client derives paired errors and
fixed-prediction target-omission sensitivity from its validated points; no
new response fields or permissions. [Export/evidence definition](../outputs/forecast_robustness_20261029/README.md):
the comparison CSV retains its first 37 fields and appends 14 diagnostic fields,
including policy, comparator, paired/directional counts, worst miss/targets,
omitted-target MAE range and lowest-MAE count. These are historical diagnostics,
not model selection, new future predictions or activation permission.

## Planning no-purchase comparison — 29 October 2026

Successful `POST /api/sales/planning-solve` responses append row fields
`baseline_fulfilled`, `baseline_unmet`, `baseline_fulfillment_pct`,
`additional_fulfilled`, `additional_fulfillment_pct`,
`purchased_units_not_needed_for_entered_demand`, and `unmet_reasons`.
The baseline covers `min(demand, stock − reserve)` units. Additional coverage is
scenario fulfilled minus baseline fulfilled; pack excess is purchased units minus
additional coverage. Row `additional_fulfillment_pct` expresses the percentage-point
increase using the same product-demand denominator.

Summary fields `baseline_mean_fulfillment_pct`, `additional_mean_fulfillment_pp`
and `allocation_stop_reasons` describe equal-weight product means and either
covered demand, supplier caps or unaffordable next packs. Units are never pooled.
`assumptions.method` is `bounded_greedy_fulfillment_v1`; `comparison_policy` is
`entered_stock_only_no_new_purchases_v1`. `operational_inputs_verified`,
`procurement_execution_approved`, and `expiry_outcome_measured` are false.
The algorithm, fresh-checksum validation, existing fields and infeasible/not-solved
no-allocation behavior are unchanged. This is not LP/MILP or proof of global
optimality. CSV appends comparison/method fields; older responses without them
show comparison unavailable, without substitutions.
[Executed source-to-consumer evidence](../outputs/so4_baseline_review_20261029/README.md).

## Unit research consumer calendar metadata — 29 October 2026

The existing fixed-scope `/api/sales/unit-baseline-research` JSON/warehouse contract
is unchanged. Its consumer validates common origin/target/actual cohorts and
recomputes score groups before rendering a historical comparison chart. The CSV
appends evaluation bounds, source endpoint, original December target/calendar
lead, absence of its prediction, null operational selection and source policy;
existing column positions remain intact. [Evidence](../outputs/so3_research_review_20261029/README.md).


## Family ABC–XYZ (candidate) — 11 November 2026

Authenticated `GET /api/sales/family-abc-xyz` accepts no query parameters (400). It reads the hash-pinned family mapping
row (decision 015; must be Delta version 0 with SHA-256 `8b96ff67…edcf`) and classifies 2025 original itemized Gold net
sales by family: ABC on 80/95% cumulative positive net, XYZ on the coefficient of variation of 12 monthly values. Any
unmapped Gold label, malformed row or changed mapping returns a safe 503. Response: families with class, net, share, months
with sales, CV and a handling suggestion, plus a class grid. `stock_rule_approved: false`, `forecast_approved: false`.

## Routine and large-order sales split — 11 November 2026

Authenticated `GET /api/sales/diagnostic-breakdowns`, `GET /api/sales/descriptive-extensions` and
`GET /api/sales/demand-profile` accept no query parameters (400). All three read pinned original itemized Gold and the
hash-pinned family mapping, reconcile their queries to recorded net, and return 503 with no substitute values on any
failure. `diagnostic-breakdowns` returns the margin mix/rate split, the yearly sales-change bridge, unusual months,
new-product survival, large-order readiness (chance, range, trade-off table with no default amount) and the day-20
estimate, using the registered rules of the 11–15 November studies. `descriptive-extensions` returns yearly counts and
ratios (order size, label mix, category margin, product turnover, concentration, returns, discounts, timing).
`demand-profile` also requires the hash-pinned therapeutic category table (candidate v0.1, created once with
`outputs/category_mapping_20261115/create_category_table.ts`) and returns a description of each product group; its
registered stability check failed, so its classes are not a planning rule. None carries forecast or procurement approval.

Authenticated `GET /api/sales/sales-streams` accepts no query parameters (400). From pinned original itemized Gold
(contracts excluded) it returns, per recorded month, base (documents under ₱500,000 plus rows without a DR) and large
(documents of ₱500,000 or more) net PHP, large-document counts and recorded net. Each month must reconcile to the cent,
or the route returns a safe 503. It also returns a 6-month mean reference for routine sales and retrospective lead-1
WAPE/bias for base and total over recorded months. `forecast_approved: false`; months without records are not filled.
`large_order_patterns` lists, per recorded area/channel label, large documents, share of the last 24 recorded months
with one, median gap, last month and average large-order month; their document total must equal the split's count
(else 503). Labels are not verified buyers; this is descriptive frequency, not a forecast.

## Territory rainfall severity context — 11 November 2026

Authenticated `GET /api/sales/territory-signals` accepts no query parameters (400). It finds the single current
warehouse release from `release_pointer` and returns its join-ready RSI rows (NASA POWER rainfall severity proxy,
decision 012) by territory and month, plus per-territory counts of DII rows withheld while their DOH territory mapping
is pending. Status `territory_signal_context`, `forecast_approved: false`. RSI is planning context only, not demand or
a forecast input. A missing or ambiguous release returns a safe 503 with no substitute values.

## Confirmed delivery-area prioritization — 29 October 2026

Authenticated `GET /api/sales/confirmed-area-priority` accepts no query parameters
(400); year/region selection is performed by its consumer. It returns status
`confirmed_area_priority_review`, the verified regional source contract and 1,032
raw-area/month aggregates. The service reuses the immutable confirmed mapping and
fresh original Gold validator, then requires an exact ordered source-control hash
before assigning the nine confirmed delivery labels; all other labels remain
UNALLOCATED. Values are signed eligible PHP, supported-profit/revenue pairs and
record counts; no accounts or medicine units are inferred. Missing source fails
with safe 503 and no fallback; unauthenticated access is 401. No table/schema or
publication change. [Contract/evidence](../outputs/so2_area_completion_20261029/README.md).


## Regional retrospective STL - 28 October 2026

Authenticated `GET /api/sales/regional-stl-review` accepts no query filters (400).
It validates the immutable Delta-0 decomposition candidate, fresh Gold-backed
regional source/mapping, all calendars, qualifying runs, component reconstruction
and matched change before serving. Required failure is safe 503, with no substitute
components. The existing regional panel loads this independently; finance remains
available if STL fails. Region/year control selects saved components and CSV;
short runs and company/unallocated scopes receive no regional fit. Status is
retrospective diagnostic, with false model/financial/external approvals and no
future predictions. [Identity and verification](../outputs/so1_regional_stl_20261028/README.md).

## SO1 regional financial review - 27 October 2026

Authenticated `GET /api/sales/regional-source-review` accepts no query parameters
(400 on overrides); region/year selection is local to this fixed itemized/all-buyer
consumer. The reader checks active original release/receipt/keys/master, isolated
Delta-0 mapping/hash and all 1,032 current area-month controls before rolling up
confirmed regions and explicit unallocated values. Returns string-six-decimal
money, retained/eligible/support/unreviewed counts, 352 regional month groups,
company/region/area totals, mapping/source identity and limitations. Failures
return safe 503 without substitutes. Contracts, external joins and financial/
model publication remain excluded/unapproved. [Evidence and scope](../outputs/so1_regional_connection_20261027/README.md).

## Unit baseline research — 27 October 2026

Authenticated `GET /api/sales/unit-baseline-research` accepts no query parameters
(400 on filters). It returns the immutable BUPIRIGHT/HOSPITAL channel research
comparison, unit ampoules, research-display authorization, false operational/
activation flags, current source/artifact/confirmation/protocol identities,
coverage, 40 points and eight lead-specific score groups. The reader checks Gold
release/receipt and all current selected rows plus recomputed predictions/scores.
Missing/duplicate/mismatched evidence returns safe 503 with no substitute results;
source-record identifiers are not exposed. This panel's controls are independent
of Analysis filters and prior PHP experiments. [Evidence and limits](../outputs/bupiright_research_connection_20261027/README.md).

## Product margin exposure interpretation — 27 October 2026

Commercial review's frontend model adds `netWithoutMarginSupport`: signed eligible
`revenue` from rows without both supported `income` and `margin_revenue_basis`.
It is zero only when eligible net observations exist and none lack a pair; no
eligible net yields null. The margin-gap queue sorts this amount descending, then
positive sales and reporting key. CSV adds the field and the
`supported_pair_and_matched_months_v2_value_exposure_candidate` policy identifier.
It is not a new server response field or endpoint, nor missing-profit imputation.
Existing authenticated Gold detail/approval boundaries remain unchanged.
[Targeted source audit and full-view checks](../outputs/commercial_case_review_20261027/README.md)
distinguish monetary evidence gaps from record coverage and actual loss.

## Product commercial review consumer — 27 October 2026

The Product Prioritization review uses existing authenticated `/api/sales/sectors`
detail: nullable `revenue`, `income`, `margin_revenue_basis`, `row_count`, exact
`date`, reporting key/category and source status from the checked Gold release.
No new endpoint, response change or local analytical fallback. Frontend sums
paired profit/revenue and supported detail-record counts, preserving unsupported
amounts and unreviewed provenance. Contracts remain excluded by this itemized
source independently of Financial scope. [Calculation/export checks](../outputs/product_commercial_review_20261027/README.md)
bind the existing dataset/table/version/policy/receipt identity and retain false
financial/model approval flags. New controls use closure listeners, not inline handlers.

## SO1 supported profit/margin — 27 October 2026

Original SO1 `months` now includes `gross_profit_php`, `margin_revenue_basis_php`,
`margin_eligible_records`, `margin_pct`, `margin_record_coverage_pct` from a separate
live source-matched Gold query. `financial_summary` sums paired amounts before
division; `financial_yoy` includes only margin-supported months in both years.
No support yields null amounts/rate; a nonpositive basis makes the rate unavailable.
Coverage denominator is retained records. `source.financial` retains table/version,
policy, SQL/row hashes and false approval flags. Every baseline label-month and
full-source controls reconcile. Required financial failure returns existing safe 503
SO1_UNAVAILABLE with no stale/local/partial fallback. Legacy source stays separate.
See [actual scope/source/export checks](../outputs/so1_financial_scope_20261027/README.md).

## SO1 original-source dedicated diagnostics — 27 October 2026

Under original_itemized_v1, authenticated `GET /api/sales/so1` now reads the separate
original-source conditional diagnostic candidate at Delta 0, verifies current source/
receipt/keys, package/row hashes and 1,032 fresh label-month controls. Area/year
remain the only accepted scope fields; Financial scope cannot change this itemized
all-buyers view. Missing/differing data returns safe 503 SO1_UNAVAILABLE, invalid
scope 400 INVALID_SO1_SCOPE. No local/old-source/Python runtime fallback.

Original scopes include company and exact recorded labels, including channels,
without regional/geographic approval. Response scope adds contracts_excluded and
explicit geographic_approval status; `contributions` and `contribution_scope`
provide a signed company-common-month recorded-data bridge with missing label
months and interpretive basis. Company change reconciles across every label.
The existing monthly/YoY/conditional daily contracts remain; CSVs retain source,
candidate and assumption flags. [Actual readback and consumer evidence](../outputs/original_so1_20261027/README.md)
does not establish full objective or geographic acceptance.

## Separate rolling research — 27 October 2026

`GET /api/sales/rolling-source-research` requires authentication and accepts no
query filters (400 INVALID_RESEARCH_SCOPE). It validates original Gold release/
receipt/key/version/monthly history and exact saved rolling candidate bytes,
then recomputes 126 groups before returning `lead_views` 1 and 3. Each view contains
21 models and 441 retrospective cases with true origin/target/lead, matching errors,
scope, source/policy/protocol hashes and false publication/activation/financial
flags. Required-source/candidate failure returns safe 503 ROLLING_RESEARCH_UNAVAILABLE.
No runtime training, local artifact or historical substitute is used.
The fixed current-source endpoint remains separate and unchanged. See
[actual connection and case/export checks](../outputs/rolling_research_connection_20261027/README.md).

## Original-itemized forecast research — 27 October 2026

`GET /api/sales/current-source-research` remains authenticated, takes no query
filters and returns400 `INVALID_RESEARCH_SCOPE` for supplied filters. Under
`original_itemized_v1`, it reads the fixed immutable research row from Databricks,
checks original release/receipt/key/version and fresh monthly input identity,
validates saved targets and recomputes scores before returning 21 model comparisons
and 441 retrospective audit points. Status remains evaluated_unpublished;
publication_approved, activation_allowed and financial_release_approved are false.

Scope explicitly excludes contracts, has unknown complete-company coverage and
is independent of all Analysis filters. `available_stages` contains only
retrospective_extension_2026 and retrospective_audit; no future forecasts or
intervals are supplied. Source includes artifact/input/monthly/receipt hashes,
policy, run ID, fact table and Delta version. Existing legacy source behavior stays
guarded separately. Missing/changed source or candidate returns safe 503
`CURRENT_RESEARCH_UNAVAILABLE`; no local/old-source fallback or runtime training.
See [actual staging, route and UI/export evidence](../outputs/original_research_connection_20261027/README.md).

## Original-itemized STL diagnostic connection — 27 October 2026

`GET /api/seasonality/stl` retains authentication and safe503 `STL_UNAVAILABLE`
on required-source or candidate validation failure. Under original_itemized_v1,
it reads the fixed source-matched candidate Delta0 table, checks active/source/
receipt metadata,202-row/payload hashes, source/method/false approval flags and
fresh107-row Gold monthly digest, then returns81 fitted component rows with segment
bounds,120 calendar rows, explicit coverage, parameters, base release and separate
candidate identity. No Python/training, local file, test fixture or older-source
STL is used as fallback. Other source adapters retain their existing guarded paths.

This endpoint has independent full qualifying history and itemized-only scope.
Financial/date filters do not change its decomposition; a supplied financial_scope
is rejected by the existing endpoint allowlist. Candidate metadata and UI/CSV
retain unapproved forecast/financial publication and retrospective limitations.
Full-segment components are not issue-time forecasting features. See
[actual readback, route and export checks](../outputs/original_stl_connection_20261027/README.md).

## Unified financial scope — 27 October 2026

`GET /api/financial/dashboard?financial_scope=itemized|contracts|combined_unreconciled`
returns `{snapshot,sectors}` together, including financial monthly/yearly/history
totals and daily series at the same pinned original Gold batch. It accepts only
financial_scope; date/year display filters use those observations in the client.
Default is itemized. Invalid/duplicate/non-scalar scope400. Contract-bearing modes
require existing analyst/admin authorization403, checked before analytical reads.

`GET /api/sales/status`, `/api/sales/transactions`, `/api/sales/summary` and
`/api/sales/financial-export` accept the same financial_scope. Ledger and CSV keep
the same year/date/quality predicates and applicable itemized dimensions. Contract-
bearing requests reject product/category/area/buyer/region/territory/search filters400
because allocation is unavailable. Exports contain the complete selected ledger
(up to49,999 rows; larger scopes fail explicitly), record_kind, eligibility, raw and
eligible financial amounts, scope/filter/source/batch/Delta/receipt identity and
unreconciled/unverified/approval status. Responses are not browser-cached.

`release.financial_scope` describes the selected reporting population and source
tables; `release.original_itemized` remains the original itemized partition identity.
Snapshot/in-flight caches are separated by scope; SQL caches include the complete
relation and parameters. Async-local context never changes a global source pin.
Combined review validates both typed Delta0 partitions and their UNION ALL against
the pinned financial count/key/net controls. It does not establish additivity.

Product/area/diagnostic contribution/quantity/model readers remain itemized-only;
other API families reject a supplied financial_scope instead of silently ignoring
it. The UI labels these independent analysis scopes, disables contract buyer
allocation and explicitly identifies the combined financial amounts as unreconciled.
Required-source failures return an error without a local, old or partial fallback.
See [implementation and tests](../outputs/unified_sales_scope_20261027/README.md).

## Main original Gold itemized connection — 27 October 2026

Local main consumers now select `original_itemized_v1` via the server-only
`DATABRICKS_DESCRIPTIVE_ADAPTER`. The reader validates the pinned original Gold
receipt/source and uses a read-only SQL compatibility projection. Existing field
names remain compatible; recorded ledger quantity is flagged unapproved, physical
quantity totals and unsupported unit prices remain null. Category acceptance is
retained independently of SKU/unit/geographic and financial release approval.

Responses expose `release.original_itemized` with dataset/batch/table/Delta/receipt/
source-key identity and independent false approval flags. Old financial approval
is not inherited. Shared CSVs carry the same itemized-only population and flags.
The default main source excludes contracts; the unified financial modes above
extend financial reporting. Separate contract review remains optional.
Main health identifies the nonsecret adapter; protected measures still require auth.

Prior STL/SO1 and stored trained/research results are unavailable until a matching
original-itemized publication contract exists. Fresh financial benchmarks are
recomputed, exploratory and unpublished. Physical heatmap is unavailable without
unit approval; scenario quantities remain unknown. Missing source/read failures
never use the older release or local figures as fallback.
[Actual activation, checks and rollback](../outputs/original_dashboard_20261026/README.md).

## Sales scope and separate contract review — 26 October 2026

The main dashboard defaults to **Itemized sales — contracts excluded**. Its Sales
scope control opens a separate `/contract-review` page for contract summaries;
it does not add amounts to the existing itemized source. The itemized preview
also exposes this control. Changing scope clears incompatible filters/results.

`GET /api/sales/contract-review` and `/api/sales/contract-review/export?view=monthly`
require existing analyst/admin authentication. Only scalar `year` (default `all`)
is supported. Product, category, area and combined-scope filters and non-monthly
exports return 400. The reader verifies the original Gold receipt/reference plus
the immutable contract table's keys/count/net/unavailable itemization/approval
boundaries. It returns recorded contract financial review amounts, not additional
confirmed revenue. No combined financial table supplies this view. Missing or
changed sources return sanitized 503 `CONTRACT_REVIEW_UNAVAILABLE`; no fallback.
CSV and JSON retain source/year/scope and pending financial/unit/forecast status.
See [scope decision and actual checks](../outputs/sales_scope_20261026/README.md).

## Original itemized review preview — 26 October 2026

`GET /api/sales/itemized-preview` reads the typed original Gold itemized candidate
through a dedicated reader; `GET /api/sales/itemized-preview/export?view=monthly`
exports `monthly`, `products` or `records`. Both require current authentication
and analyst/admin access. Optional scalar `year`, `area`, `category` filters
default to `all`; area means the recorded label, not an accepted geographic join.
Unknown parameters, repeated/non-scalar values, invalid categories or years return
400. Exporting an empty selection also returns400.

Every request checks the server-pinned Delta0 receipt/source identity, key/count,
exact eligible net and independent approval flags. Measures come only from the
typed itemized Gold table. Mismatch or warehouse failure returns503
`ITEMIZED_PREVIEW_UNAVAILABLE`, never pinned fallback figures. Responses use
`no-store`; CSVs carry scope/source/filter and eligibility information.
The dedicated `/itemized-preview` page labels contracts excluded, incomplete
company sales and pending financial release. Existing main dashboard/STL/model/
planning bindings stay unchanged. [Actual checks and remaining review](../outputs/itemized_integration_20261026/README.md).

## Original-source integrity correction — 25 October 2026

Affected descriptive datasets now require `DATABRICKS_TRUTH_RELEASE_ID` and
`DATABRICKS_TRUTH_MANIFEST_SHA256`. The warehouse-only reader verifies immutable
manifest/source identity, corrected count/unique-key checksum and scope. Fact
queries use corrected itemized sales; responses include `release.analytical_integrity`.
These are not complete company totals. Missing/mismatched correction fails closed.
Planning checksums include correction identity. Old stored trained research/SO1
is withheld; corrected live exploratory benchmarks remain available. STL reads
the separately recomputed correction-bound payload. See
[actual deployment/limits](../outputs/truth_correction_20261025/README.md).

## SO1 territory baseline — 25 October 2026

`GET /api/sales/so1?area=QUEZON&year=2026` uses existing authentication. Optional
`area` defaults to `COMPANY`, `year` to `all`; other query keys, repeated values,
unavailable years and non-geographic channel selections return 400
`INVALID_SO1_SCOPE`. The view is explicitly All buyers with independent controls;
topbar buyer/date filters do not silently apply to the fixed recorded-sales fits.

The reader selects the server-pinned immutable Gold SO1 candidate at Delta 0,
checks each payload checksum and the complete package identity, source/reference/
financial manifest and reporting population, then reconciles live area-month
counts/eligible revenue before returning data. Missing/mismatched configuration,
source or candidate returns 503 `SO1_UNAVAILABLE`; no offline file fallback.
Response `medshield.so1.view.v1` contains source-bound monthly rows, matching-month
YoY, monthly primary components, conditional daily comparison components summed
to PHP/month, selected-calendar uncertainty counts and full-window sensitivity
metadata. A year selection filters already-fitted components; it does not refit.

No daily actual-sale completeness, forecast skill, original objective acceptance
or business approval is granted. [Actual integration and checks](../outputs/so1_dashboard_20261025/README.md).

## Planning source identity strengthened — 25 October 2026

The planning shortlist `source.checksum` now uses
`source.checksum_version: planning_shortlist_release_scope_window_v1`.
It hashes the dataset/fact/policy/catalog/geography/financial-serving identity,
exact buyer/territory scope, historical start/end and every ranked source row.
Generated timestamps are excluded. Equal totals in a different source release
or evidence window cannot validate an older draft or solve request. The solver
continues to reload the shortlist and compare that checksum; rankings, amounts,
constraints and allocation formulas are unchanged. Empty scopes carry the same
identity contract and cannot solve. Earlier row-only checksums are intentionally
stale; refresh the shortlist and prepare a new draft rather than relabelling an
old draft with a new checksum. Draft schema remains version 1. Browser-valid
nonnegative decimal/exponent text, including `.25` and `1e3`, now round-trips as
entered; the solver retains its numeric/bound/cent validation.
[Fresh warehouse/scenario controls and browser evidence](../outputs/planning_release_integrity_20261025/README.md).

## Current-source research and planning drafts — 25 October 2026

`GET /api/sales/current-source-research` requires the existing authenticated
session and accepts no query parameters. Its fixed company/All-buyers/PHP scope
is independent of topbar filters. The gateway reads one immutable `extension_`
payload from Gold `fact_forecast_run_candidate`, selected by the server-only
`DATABRICKS_EXTENSION_RESEARCH_SHA256` content pin. It validates current fact,
dataset, policy, catalog/geography identity, frozen selection, unique calendar
cases and recomputed audit/extension errors. Missing, duplicate, changed or
unconfigured evidence returns `503 CURRENT_RESEARCH_UNAVAILABLE`; unsupported
query scope returns `400 INVALID_RESEARCH_SCOPE` after authentication. There is
no local artifact fallback or synchronous fitting.

The response has `status: evaluated_unpublished`, `publication_approved: false`,
`activation_allowed: false`, source/run/input hashes, frozen `selection`, all-model
`comparisons`, exact `points` and limitations. Stages remain distinct:
`retrospective_audit` (2025, 12 months, December 2024 origin),
`retrospective_extension_2026` (9 months, December 2025 origin), and selected-model
`future` (October 2026–September 2027, September 2026 origin). Future actuals are
null and future errors unavailable. Extension ranking cannot select a new model.
The old `experiment_` reader/source and operational model pointer remain separate.

Planning draft save/load is a browser file action, not an API persistence or
approval endpoint. Schema 1 stores `unverified_scenario_assumptions`, creation
time, exact shortlist checksum/scope/product keys and entered values, including
blanks and zeros. Imported acknowledgment must be false; matching source/scope
and products are required before any field changes. Import clears result/review
state. Input edits also clear acknowledgment. Files are limited to 100 KB and
are not automatically retained in browser storage or sent to a server. Existing
`planning-solve` still validates the fresh shortlist and every numeric constraint.
[Delivery and evidence](../outputs/workflow_completion_20261025/README.md).

## Historical comparison pilot — 25 October 2026

`GET /api/sales/historical-context` requires the existing authenticated session.
No query parameters are accepted: scope is explicitly Quezon, all buyer groups,
2017-01–2025-12 with same-calendar-month alignment. It returns 108 unique `rows`
with nullable `sales`, `disease`, `tayabas`, `alabat`, `nasa`; per-series unit/
coverage metadata; approved sales `release`; source tables, PAGASA version,
external identities/checksums, NASA retrieval date and context checksum.
`model_fit` and `external_join_approved` stay false. It does not use the separate
regression lag/filter contract. Duplicate/nonfinite/invalid measurements or source
failures produce explicit failure. Nulls are not replaced with zeros. Full
[contract and fresh checks](../outputs/historical_comparison_ui_20261025/README.md).

## NASA historical reader correction — 25 October 2026

NASA weather/sales comparison now uses the shared descriptive `query` resolver
so its fact token resolves to the configured approved financial table and pin.
Direct execution previously sent the unresolved token to Databricks. Missing
required financial input still produces an explicit error. Provider observations
remain NASA POWER monthly grid proxies, not official PAGASA measurements.
Response status `live` describes a live warehouse read; it does not mean the
observation is current weather. Refresh accepts only complete closed months.
[Fresh observed range and checks](../outputs/external_readiness_20261025/README.md)
record actual persisted recency separately from gateway connectivity.

## Scoped financial publication — 25 October 2026

The descriptive release may include `financial_publication`, read from a
checksum-pinned Databricks manifest and approved serving fact, both Delta 0.
Its scope is `descriptive_company_financial_history_and_source_label_commercial_reporting`;
it carries publication ID, manifest hash, serving table/version, reviewer/date,
population hash, limitations and excluded approvals. The original `source_table`,
provenance and mixed-evidence `candidate_only` flag remain intact. Descriptive
fact calculations use the approved serving table when configured; unrelated
research and external contracts do not inherit approval. Missing/mismatched
manifest, source, population or serving counts fail without candidate fallback.
See [execution and remaining live-UI limits](../outputs/sales_publication_20261025/README.md).

## Current-source monthly STL — 24 October 2026

The optional STL reader now derives its table from the validated active fact's
schema. Isolated v8 rows additionally bind source table, exact reporting-population
hash/version, independent reference identities and required diagnostic parameters.
The [current candidate and readback](../outputs/paper_analytics_closure_20261024/README.md)
contain monthly company-PHP components through September 2026. Mismatched/absent
components still return explicit unavailability; legacy components are not
substituted. This diagnostic does not change model selection/publication or
establish the original paper's daily territory medicine-demand result.

## 2026 descriptive release and independent research binding — 24 October 2026

[Implemented local activation and checks](../outputs/app_2026_activation_20261024/README.md)
add explicit descriptive schema/version/dataset/policy selection and a complete
source-batch publication-audit guard. All descriptive fact reads resolve to one
immutable release. v8 uses independent catalog metadata and keeps unreviewed
source evidence separate. Sector-trend `observations` supplies actual recorded
bounds and review status; original `study` metadata remains2017–2025. Daily
aggregates add `unreviewed_source_rows`; heatmap quantities add
`unreviewed_quantity`. Chart/CSV recorded-data scope is separate from study scope.

Financial retrospective evaluation now uses the active descriptive source, with
calendar closure, common-case and revised-snapshot limitations. Stored research
uses an independent original fact pin and exposes
`source.binding=original_research_release`; its datasets, frozen baselines,
cutoffs and21 model configurations are preserved. Source changes do not retrain
or rebind models. Approved future-forecast serving retains its separate contract.
The prepared2026 training input remains blocked pending real coverage/training
acceptance. Required analytical errors still produce unavailable states.

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
buyer scope: All, Government, Private, Internal and Unknown. As of 25 October 2026, `sector` also accepts a comma-separated union, for example `sector=Private,Internal`. Values are allowlisted, deduplicated and returned in Government/Private/Internal/Unknown order; selecting all four or All normalizes to All. Invalid/empty list members are rejected. The gateway filters the union before monthly aggregation and computes benchmarks on that combined series; it never sums separate forecast errors. The checkbox UI keeps chart/table/export scope aligned and clears stale evidence while loading. Other sector-filter endpoints retain their documented contracts. The gateway applies
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

## Surge preparedness, readiness, model register and acceptance survey — 17 November 2026

All require an authenticated session. Analytical endpoints read pinned Gold only and return `503` with an explicit code on
failure. No substitute values are returned.

| Method and path | Returns | Errors |
|---|---|---|
| `GET /api/sales/surge-preparedness` | Observed DOH/PAGASA risk calendar, retrospective alert results, and the planner-chosen +20/40/60% buffer scenario per exposed category (peso base from Gold routine sales). Reads the hash-pinned table `reference_surge_preparedness_d9874878ecca4f49_candidate` at Delta version 0. Decision 017: inform planning, never forecasts. | `400 INVALID_SURGE_PREPAREDNESS_SCOPE` (any query); `503 SURGE_PREPAREDNESS_UNAVAILABLE` |
| `GET /api/sales/readiness` | Day-20 month-end estimate track (last 12 months; 0.75 × pace + 0.25 × mean_6) with WAPE vs mean_6, and the government large-order readiness range (P10–P90 of the last 24 months) for the next month. | `400 INVALID_READINESS_SCOPE`; `503 READINESS_UNAVAILABLE` |
| `GET /api/models/register` | Tested-model register (status kept/failed/waiting/benchmark, result, use, evidence path), mirrored from `docs/MODEL_REGISTER.md`. Evidence metadata, not analytical measures. | — |
| `GET /api/acceptance/survey/questions` | System Usability Scale items, three usefulness items and roles. | — |
| `POST /api/acceptance/survey` | Body `{sus: int[10] 1–5, usefulness: int[3] 1–5, role, comment?}`. Stored as audit event `CLIENT_ACCEPTANCE_SURVEY`; returns `201 {saved, sus_score}`. | `400 INVALID_SURVEY`; `503 SURVEY_NOT_SAVED` |
| `GET /api/acceptance/survey/summary` | Admin/manager only: responses, mean and median SUS, count at or above 68, usefulness means, role counts and recent comments. | `403`; `503 SURVEY_SUMMARY_UNAVAILABLE` |

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

## Current-source revenue baseline estimates — 25 October 2026

Authenticated `/api/sales/forecast-validation` adds a separate
`views[3|6|12].models[model].candidate_estimates` array for supported financial
scopes. These gateway arithmetic scenarios use the same pinned Gold observations
as the retrospective benchmarks: last observed value, matching prior-year month,
and complete three/six-calendar-month means. They do not train or activate a model.
Each point retains origin, actual calendar lead, method,
`evidence_role: unpublished_baseline_estimate`, `publication_approved: false`
and `activation_allowed: false`. Actuals and intervals stay null. Missing required
inputs or leads beyond twelve months produce null estimates with reasons; targets
at/before the latest observation are excluded. Missing values never become zero.

The default dashboard window is three months from the current Manila month:
October–December 2026 with the current September 2026 origin. Last observed value
is the initial baseline; all four methods remain selectable. The estimate table,
chart and CSV agree. The CSV retains method, unpublished flags and Gold
dataset/version/policy alongside the source checksum. Required-source failure
clears the estimates and export. The existing `forecast` arrays and approved
`/api/forecasts` publication path remain unchanged and unavailable when unpublished.

Stored research keeps its original release and evaluation history. Its obsolete
candidate projections are hidden and cannot be exported when the current-source
origin is newer than the stored cutoff, or current coverage is unavailable.
No old projections are relabelled as newly trained estimates. See the
[implementation and verification](../outputs/q4_estimates_20261024/README.md).

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
