# Proposed-objective analytics evidence matrix

Reviewed 5 November 2026, Asia/Manila. Initial crosswalk owner is Technical
Writer. Current integration owner is QA Engineer, with frontend repair and
self-review.

This matrix connects each of the 25 proposed SO1–SO5 deliverables to an output,
implementation, verification record, finding and remaining acceptance gate.
The criterion wording comes from the
[2 November proposed scorecard](../outputs/so5_acceptance_20261102/updated-proposed-scorecard.json).
The [objective/evidence register](OBJECTIVE_EVIDENCE_REGISTER.md) owns scope and
acceptance decisions. The matrix IDs identify its proposed deliverables.

The scorecard records 5/5 per objective and 25/25 local delivery credits.
The verification cells below inherit the dates and tested scope of their
linked receipts. The 5 November documentation check verifies the crosswalk,
links, retained evidence hashes and selected numerical findings.
[Initial matrix verification](../outputs/analytics_evidence_matrix_20261105/verification.json)
Current production QA and the updated documentation verification are in E13.

| Analytics layer | Proposed objective | Evidence delivered | Remaining evidence boundary |
|---|---|---|---|
| Descriptive | SO1 and SO2 | Recorded sales, paired margins, matched growth, nine supported delivery labels and descriptive ABC | Source completeness, stable account/SKU identity and human interpretation |
| Diagnostic | SO1, with supporting SO2 investigation | Matched changes, financial contributions and separately fitted area/province STL | Causes and unsupported geography need source evidence |
| Predictive | SO2 and SO3 | Baseline/XGBoost classification, sales forecast tournaments and a confirmed ampoule pilot | Strong future accuracy, admissible external inputs and model activation |
| Prescriptive | SO4 | EOQ/ROP, whole-pack allocation and dated supply scenarios with explicit assumptions | Verified operating inputs and measured expiry/turnover outcomes |
| Dashboard integration | SO5, supporting all four layers | Current local production module navigation, provenance, unavailable states and native exports | Actual-role/user acceptance and any release decision |

## Source identity and verification scope

The integrated source receipt binds original itemized dataset
`e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10`,
fact Delta version 0, policy `original_source_layers_v1_candidate_only`,
and the confirmed delivery mapping. The recorded company scope covers
January 2017–September 2026, with 107 observed months in 117 calendar slots.
Financial targets use recorded itemized PHP and exclude Contracts.
Paired-margin eligibility has its own revenue denominator.
[Source identities](../outputs/so5_acceptance_20261102/live-receipt.json)
[Financial reconciliation](../outputs/system_first_20261102/filters/source-reconciliation.json)

Dashboard analytics follow Gold → authenticated gateway → chart/table/export.
The original ABC and forecast runs have their own frozen populations and
windows. The additional SO2 comparator and November accuracy studies are
offline reports. The BUPIRIGHT pilot uses its confirmed HOSPITAL-channel
ampoule scope. Planning uses explicitly entered assumptions.
[API contracts](API.md) · [Business definitions](BUSINESS_DEFINITIONS.md)

The initial 5 November documentation review found 398 matching files and 13
changed files against the 411-file 2 November checkpoint. Current production QA
then found and repaired a minified CSV-helper binding defect. The checkpoint
comparison now has 397 matching files, 14 changed files and zero missing files.
The added regression is outside the older checkpoint. Current scoped local
integration passed in [E13](../outputs/current_integration_20261105/README.md).
Its final 426-file application/test/configuration snapshot remained unchanged
during verification. Twenty authenticated live and twenty isolated/pure browser
cases passed on a new production frontend. The same-session 146 gateway tests
retain unchanged gateway source. Independent numerical checks passed 11,283
assertions, including 18 native area-history CSVs. These counts describe their
separate scopes and are not model-accuracy or business-acceptance scores.
Historical receipts retain their original source identities and tested scope.

## SO1 — Recorded sales analysis

Proposed objective. To analyze MedShield’s recorded sales performance from
2017 to September 2026 using financial summaries, matched-period year-over-year
comparisons, and STL decomposition where sufficient historical data are
available, to identify sales trends, seasonal patterns, and differences across
supported delivery areas through the Sales Diagnostic module.

Primary layers are descriptive and diagnostic.

| ID and criterion | Implemented output and source path | Dated verification | Supported finding | Remaining gate and next owner |
|---|---|---|---|---|
| SO1.1 — Financial summaries with paired margins | Source-validated sales and paired gross-margin summaries through the [source contract](../backend/src/descriptiveSource.ts) and [dashboard calculations](../backend/src/databricksDashboard.ts) | Recorded pass, 2 Nov. [E01 reconciliation](../outputs/system_first_20261102/filters/source-reconciliation.json) and [E07 integrated receipt](../outputs/so5_acceptance_20261102/independent-verification.json) | Retained totals reconcile to ₱638,015,351.53 net sales. Margin-eligible revenue is ₱566,954,921.92. | G2. Data steward owns completeness and evidence for unsupported identities. |
| SO1.2 — Matched-period YoY and partial-year handling | [Period controls](../frontend/services/api/descriptive-period-runtime.ts) and [delivery comparison](../frontend/services/api/delivery-area-model.ts) use common observed periods | Recorded pass, 2 Nov. [E01](../outputs/system_first_20261102/filters/README.md) and [E03 comparison checks](../outputs/all_area_acceptance_20261102/independent-checks.json) | Jan–Sep 2026 compares with Jan–Sep 2025. Missing observations retain unavailable values. | G3. QA checks affected period flows after later code changes. |
| SO1.3 — All nine supported delivery labels and historical coverage | [Area gateway](../backend/src/deliveryAreaReview.ts) and [nine-area panel](../frontend/services/api/delivery-area-panel.ts) expose observed history and gaps | Recorded pass, 2 Nov. [E03 receipt](../outputs/all_area_acceptance_20261102/verification.json) | All nine exact labels remain visible. Quezon and Batangas have observations through Sep 2026; other labels retain their actual latest observations. | G2. Data steward resolves submission gaps and unallocated labels using dated evidence. |
| SO1.4 — Actually executed eligible area/province STL with weak findings retained | Separately computed [area STL](../services/analytics_service/delivery_area_stl.py), stored candidate and [validated reader](../backend/src/deliveryAreaStl.ts) | Recorded pass, 2 Nov. [E02](../outputs/delivery_area_20261102/independent-checks.json) and [candidate readback](../outputs/delivery_area_20261102/stage-verification.json) | Quezon, Batangas and a replacement Cavite-province segment support fitted windows. Quezon seasonal strength is 0; Batangas is 0.073692. | G2/G4. Analyst limits conclusions to fitted histories; source steward owns additional coverage. |
| SO1.5 — Source/API/chart/table/native-export verification | Authenticated delivery review and STL endpoints connect to the panel and native monthly/component CSVs | Recorded pass, 2 Nov. [E02](../outputs/delivery_area_20261102/verification.json), [E03](../outputs/all_area_acceptance_20261102/verification.json) and [E07](../outputs/so5_acceptance_20261102/verification.json) | Selected financial values and exports reconcile with validated source inputs; source failures clear affected displays. | G3/G6. QA owns current integration; facilitator owns actual client task observation. |

## SO2 — Product and area commercial review

Proposed objective. To identify products and delivery areas that warrant
commercial review using recorded sales, revenue contribution, matched-period
growth, Pareto analysis, and descriptive ABC classification, supported by a
comparative evaluation of baseline and XGBoost ABC classifiers through the
Product and Area Prioritization modules.

Primary layers are descriptive and predictive, with diagnostic comparisons.

| ID and criterion | Implemented output and source path | Dated verification | Supported finding | Remaining gate and next owner |
|---|---|---|---|---|
| SO2.1 — Recorded product and area review | [Product summaries](../frontend/services/api/descriptive-products.ts), [area review](../backend/src/areaPriorityReview.ts) and [priority panel](../frontend/services/api/area-priority-panel.ts) | Recorded pass, 2 Nov. [E01](../outputs/system_first_20261102/filters/README.md) and [E07](../outputs/so5_acceptance_20261102/verification.json) | Exact recorded labels and supported delivery areas provide commercial review lists. | G2. Catalog/source owner owns stable SKU and account identity evidence. |
| SO2.2 — Revenue contribution and matched growth | Source-based product contribution and matched delivery-area financial changes | Recorded pass, 2 Nov. [E02 numerical comparisons](../outputs/delivery_area_20261102/independent-checks.json) and [E07](../outputs/so5_acceptance_20261102/independent-verification.json) | Matched Quezon growth is +45.55%; Batangas is −42.46% for Jan–Sep 2026 versus 2025. | G2/G6. Analyst preserves coverage meaning; client reviews the commercial follow-up. |
| SO2.3 — Pareto and descriptive ABC | Positive eligible contribution classes, before display filtering, through the [descriptive product runtime](../frontend/services/api/descriptive-products-runtime.ts) | Recorded pass, 2 Nov. [E01](../outputs/system_first_20261102/filters/README.md) and [E07 native-output checks](../outputs/so5_acceptance_20261102/README.md) | Historical A/B/C contribution classes describe the selected reporting population. | G2/G6. Analyst and facilitator preserve the distinction between financial contribution and clinical priority. |
| SO2.4 — Executed baseline-versus-XGBoost comparison | Original [ABC reader](../backend/src/abcResearch.ts) and [panel](../frontend/services/api/abc-research-panel.ts); frozen temporal/label evaluation | Recorded pass, 2 Nov. [E04 retained arithmetic](../outputs/system_first_20261102/models/verification.json) and [E07](../outputs/so5_acceptance_20261102/verification.json) | Original 2024 validation retains prior-year ABC under its macro-F1/A-recall rule. | G4. Model owner owns stronger-label evidence, later outcomes and any candidate publication. |
| SO2.5 — Final evaluation scope/held-out challenger reporting closeout | Separate [ABC comparator extension](../services/analytics_service/abc_comparator_extension.py) and [comparison CSV](../outputs/so2_closeout_20261102/model-comparison.csv) | Recorded pass, 2 Nov. [E05 receipt](../outputs/so2_closeout_20261102/verification.json), 21 tests and 8,514 separate numerical checks | Depth-2 XGBoost has higher 2025 accuracy but lower A recall than persistence. Partial-2026 predictions equal persistence. | G4/G7. Model owner reviews any new run publication; writer cites this separately executed retrospective report. |

## SO3 — Forecast evaluation

Proposed objective. To evaluate the forecasting performance of baseline and
selected statistical and machine-learning models on supported sales series and
a documented product-unit pilot using time-ordered historical evaluation, error
metrics, and external variables where valid data are available, and to present
the results and limitations through the Forecast Modeling module.

Primary layer is predictive. Reported error and bias also support diagnosis.

| ID and criterion | Implemented output and source path | Dated verification | Supported finding | Remaining gate and next owner |
|---|---|---|---|---|
| SO3.1 — Supported baseline/statistical/ML historical comparisons | Original company and eligible regional tournaments through [company](../backend/src/tournamentResearch.ts) and [regional](../backend/src/regionalForecastResearch.ts) readers | Recorded pass, 2 Nov. [E04](../outputs/system_first_20261102/models/verification.json) and [E07](../outputs/so5_acceptance_20261102/verification.json) | Eligible methods share cases within each lead. CALABARZON qualifies for the registered regional history; MIMAROPA/Bicol retain explicit gaps. | G4. Model/source owners retain unsupported regional targets and candidate approval. |
| SO3.2 — Time-ordered evaluation and metric reporting | Origin-local forecasts with target/origin/lead, error, bias and support in [model table](../outputs/model_error_comparison_20261105/model-metrics.csv) | Recorded pass, 5 Nov. [E08 receipt](../outputs/model_error_comparison_20261105/verification.json), 25 tests and 17,509 separate checks | Company mean6 one-month WAPE is 71.66%/58.23%/56.53% over 19/7/4 cases. New PHP/ABC candidates fail their development checks. | G4. Model owner retains prospective validity and reviews the large underforecast bias. |
| SO3.3 — Documented product-unit pilot | Confirmed BUPIRIGHT labels, HOSPITAL channel and ampoules through the [unit reader](../backend/src/unitBaselineResearch.ts) and [panel](../frontend/services/api/unit-research-panel.ts) | Recorded pass, 2 Nov. [E04](../outputs/system_first_20261102/models/verification.json), [E10](../outputs/client_model_evidence_20261102/verification.json); retained values rechecked in [E08](../outputs/model_error_comparison_20261105/verification.json) | Seasonal naive has lowest observed MAE of 13.17/9.75 ampoules at leads 1/3 on six/four cases. | G4. Model owner requires later scoped outcomes before generalizing to future demand. |
| SO3.4 — External-feature admissibility and unavailable-model boundaries | [Regional forecast](../frontend/services/api/regional-forecast-research.ts) reports unsupported recipes/coverage; external method workflow retains explicit evidence kinds | Recorded pass for reporting, 2 Nov. [E04](../outputs/system_first_20261102/models/README.md). [E11 external fixture record](../outputs/wp5_external_dii_rsi_ablation_20261030/verification.json) is synthetic method evidence. | The retained tournament exposes unavailable Prophet recipes. Reviewed real external joins and issue-time provider vintages remain pending. | G4. External-source/model owners own admissible real cohorts and any external accuracy claim. |
| SO3.5 — Model matrix, dashboard reporting and bounded findings | Original warehouse-backed [forecast panel](../frontend/services/api/tournament-research.ts), separate latest [offline table](../outputs/model_error_comparison_20261105/model-metrics.csv) and [calendar study](../outputs/so3_calendar_exposure_20261105/README.md) | Recorded pass, 2 Nov for the dashboard in [E07](../outputs/so5_acceptance_20261102/verification.json); 5 Nov offline checks in [E08](../outputs/model_error_comparison_20261105/verification.json) and [E09](../outputs/so3_calendar_exposure_20261105/verification.json) | Latest combined table has 551 score rows. Day/weekday scaling increases one-month WAPE in all three windows. | G3/G4/G7. QA owns affected current consumers; model owner owns future evidence; writer owns latest-results integration. |

## SO4 — Procurement planning scenarios

Proposed objective. To develop and evaluate procurement planning scenarios
using explicitly entered inventory, demand, cost, lead-time, and expiry
assumptions through EOQ, ROP, weighted integer-pack allocation, and dated
supply-feasibility checks, to compare budget use, demand coverage, and potential
expiry exposure through the Prescriptive Planning module.

Primary layer is prescriptive.

| ID and criterion | Implemented output and source path | Dated verification | Supported finding | Remaining gate and next owner |
|---|---|---|---|---|
| SO4.1 — Entered-assumption EOQ/ROP | [Inventory policy](../backend/src/inventoryPolicyScenario.ts) and [planning runtime](../frontend/services/api/prescriptive-planning-runtime.ts) use explicit product-specific assumptions | Recorded pass, 2 Nov. [E06 casebook](../outputs/system_first_20261102/planning/casebook.json) and [parity](../outputs/system_first_20261102/planning/parity.json) | Synthetic example yields 500 units and ROP 294, while its separate budget, supplier and shelf-life screens fail. | G5. Operations validates actual demand, stock, units, costs and lead times before operating use. |
| SO4.2 — Weighted integer-pack allocation | [Weighted planner](../backend/src/weightedPlanning.ts) respects entered budget, capacity, minimums and pack sizes | Recorded pass, 2 Nov. [E06](../outputs/system_first_20261102/planning/README.md), including independent pack-vector enumeration | Feasible allocations satisfy the entered domain. Node-limit results retain their feasible bound and proof status. | G5. Operations owns real weights and inputs; analyst reports solver-domain limits. |
| SO4.3 — Dated supply/expiry feasibility | [Dated review](../backend/src/datedPlanReview.ts) and [selector](../backend/src/datedPlanSelection.ts) apply entered receipt/expiry dates and FEFO conventions | Recorded pass, 2 Nov. [E06](../outputs/system_first_20261102/planning/README.md) | Late deliveries, start-of-expiry timing, reserve and infeasibility have explicit behavior. | G5. Operations owns stock-lot and supplier-date evidence and the outcome horizon. |
| SO4.4 — Budget/coverage/expiry and no-purchase comparisons | Casebook compares entered purchase plans against stock-only supply and exposes shortfall, spend and expiry exposure | Recorded pass, 2 Nov. [E06 casebook](../outputs/system_first_20261102/planning/casebook.json) and [E07 native planning flow](../outputs/so5_acceptance_20261102/README.md) | Changes are modeled under the same assumptions, pack domain and time horizon. | G5/G6. Operations evaluates actual outcomes; client reviews scenario meaning and intended use. |
| SO4.5 — Executed scenario casebook and API/UI/export verification | [44-case book](../outputs/system_first_20261102/planning/casebook.csv), authenticated solve/review/select routes and native outputs | Recorded pass, 2 Nov. [E06 parity](../outputs/system_first_20261102/planning/parity.json) and [E07](../outputs/so5_acceptance_20261102/verification.json) | Casebook reports 190 assertions and 184 separate parity checks; retained focused method suite passed 60 tests. | G3/G5/G6. QA owns current integration; operations/client own real-input review and acceptance. |

## SO5 — Integrated decision-support dashboard

Proposed objective. To integrate sales diagnostics, product prioritization,
area prioritization, forecast evaluation, and prescriptive planning into a
decision-support dashboard that provides filters, source provenance,
data-availability notices, exportable results, and evidence-based review
recommendations to support MedShield’s sales and inventory planning.

All four analytics layers use this delivery boundary.

| ID and criterion | Implemented output and source path | Dated verification | Supported finding | Remaining gate and next owner |
|---|---|---|---|---|
| SO5.1 — Five analytical module integration | Authenticated [gateway routes](../backend/src/server.ts) and [analytics readouts](ANALYTICS_TAB_OUTPUTS.md) connect Sales Diagnostic, Product, Area, Forecast and Planning | Recorded pass, 2 Nov. [E07 receipt](../outputs/so5_acceptance_20261102/verification.json) Fresh current production pass, 5 Nov in [E13](../outputs/current_integration_20261105/final/execution.json). | Integrated checks traversed nine dashboard pages and all five analytical modules. | G3/G6. Current scoped local G3 passed. Facilitator retains actual client understanding and acceptance; QA rechecks later affected changes. |
| SO5.2 — Filters and partial/missing period behavior | [Dynamic period runtime](../frontend/services/api/descriptive-period-runtime.ts), matched periods and independent frozen research scopes | Recorded pass, 2 Nov. [E01](../outputs/system_first_20261102/filters/README.md) and [E07](../outputs/so5_acceptance_20261102/README.md) Fresh current production pass, 5 Nov in [E13](../outputs/current_integration_20261105/final/execution.json). | Study cutoff is Sep 2026; partial-year/missing coverage and independent research periods remain visible. | G3/G6. Current scoped local filter behavior passed. Facilitator retains actual client interpretation; QA rechecks later changes. |
| SO5.3 — Source provenance and availability notices | [Source validator](../backend/src/originalItemizedSource.ts), reader identities and unavailable-state clearing | Recorded pass, 2 Nov in [E07](../outputs/so5_acceptance_20261102/verification.json); later gateway comparison, 5 Nov in [E12](../outputs/gateway_concurrency_20261105/verification.json) Fresh current production pass, 5 Nov in [E13](../outputs/current_integration_20261105/final/execution.json). | Later comparison reports 60 successful live reads, 30 matching numerical pairs and bounded shared source validation. | G3. Current local provenance and simulated availability/recovery passed. Release owner retains target-specific acceptance. |
| SO5.4 — Exportable results and bounded review recommendations | Native outputs and [output hub](../frontend/services/api/analytics-output-hub.ts) retain source, units, coverage and assumption context | Recorded pass, 2 Nov. [E03](../outputs/all_area_acceptance_20261102/verification.json), [E07](../outputs/so5_acceptance_20261102/README.md), [E10 readouts](../outputs/client_model_evidence_20261102/verification.json) Fresh current production pass, 5 Nov in [E13](../outputs/current_integration_20261105/final/execution.json). | Exports support historical commercial review, forecast evaluation and entered-input scenarios. | G3/G6. Current affected native exports passed after the production binding repair. Facilitator retains actual client understanding. |
| SO5.5 — One final whole-dashboard revision/source acceptance closure | [411-file snapshot](../outputs/so5_acceptance_20261102/source-after.json), source/run receipts and common integrated case execution | Recorded pass, 2 Nov. [E07](../outputs/so5_acceptance_20261102/verification.json) reports 18 browser cases, 97 gateway checks and 11,283 independent assertions Fresh current production pass, 5 Nov in [E13](../outputs/current_integration_20261105/final/execution.json). | Completes the dated proposed local delivery checklist. E13 verifies the current 426-file snapshot after the CSV repair; 14 of the older 411 checkpoint files now differ. | G1/G3/G6/G7. Current scoped local G3 passed. Adviser/client/writer retain their acceptance and manuscript actions; QA rechecks later affected changes. |

## Evidence catalog

Counts refer to their own suites and may overlap. Use the linked reports for
commands, failed attempts, recovery, tolerances and original source/code hashes.
The matrix verification receipt pins the inspected report and receipt bytes.

| Record | Execution date and scope | Report | Primary verification |
|---|---|---|---|
| E01 | 2 Nov; retained financial arithmetic, isolated API/browser consumers | [Filters and financial study](../outputs/system_first_20261102/filters/README.md) | [Source reconciliation](../outputs/system_first_20261102/filters/source-reconciliation.json) |
| E02 | 2 Nov; Gold-backed area capture, offline fitted STL, authenticated browser/export | [Delivery-area implementation](../outputs/delivery_area_20261102/README.md) | [Independent comparisons](../outputs/delivery_area_20261102/independent-checks.json) |
| E03 | 2 Nov; all-nine-area authenticated desktop/mobile history and native CSV | [All-area acceptance](../outputs/all_area_acceptance_20261102/README.md) | [Verification](../outputs/all_area_acceptance_20261102/verification.json) |
| E04 | 2 Nov; saved original forecast/classifier arithmetic and isolated consumers | [Original model reporting](../outputs/system_first_20261102/models/README.md) | [Verification](../outputs/system_first_20261102/models/verification.json) |
| E05 | 2 Nov; separately fitted fixed ABC extension on already inspected outcomes | [ABC closeout](../outputs/so2_closeout_20261102/README.md) | [Verification](../outputs/so2_closeout_20261102/verification.json) |
| E06 | 2 Nov; synthetic planning arithmetic, compiled consumers and casebook | [Scenario casebook](../outputs/system_first_20261102/planning/README.md) | [CSV/JSON parity](../outputs/system_first_20261102/planning/parity.json) |
| E07 | 2 Nov; common local authenticated dashboard, Gold readers and isolated gateway tests | [Integrated acceptance](../outputs/so5_acceptance_20261102/README.md) | [Verification](../outputs/so5_acceptance_20261102/verification.json) |
| E08 | 5 Nov; fixed seasonal/ABC-history candidates and saved comparable predictions | [Model comparison](../outputs/model_error_comparison_20261105/README.md) | [Verification](../outputs/model_error_comparison_20261105/verification.json) |
| E09 | 5 Nov; two calendar-scaling candidates on retained monthly PHP | [Calendar comparison](../outputs/so3_calendar_exposure_20261105/README.md) | [Verification](../outputs/so3_calendar_exposure_20261105/verification.json) |
| E10 | 2 Nov; response-derived model explanations, browser checks and separate offline studies | [Client/model evidence](../outputs/client_model_evidence_20261102/README.md) | [Verification](../outputs/client_model_evidence_20261102/verification.json) |
| E11 | 30 Oct; synthetic external-ablation/surge method workflow | [External fixture scope](../outputs/wp5_external_dii_rsi_ablation_20261030/README.md) | [Verification](../outputs/wp5_external_dii_rsi_ablation_20261030/verification.json) |
| E12 | 5 Nov; bounded concurrent live gateway reads and local focused tests | [Gateway comparison](../outputs/gateway_concurrency_20261105/README.md) | [Verification](../outputs/gateway_concurrency_20261105/verification.json) |
| E13 | 5 Nov; current local production artifact, 40 browser cases, same-session 146 gateway tests, 11,283 independent numerical checks and CSV binding repair | [Current integration QA](../outputs/current_integration_20261105/README.md) | [Final runtime execution](../outputs/current_integration_20261105/final/execution.json) |

## Remaining gates and ownership

| Gate | Evidence needed to close it | Owner and next action |
|---|---|---|
| G1 — Proposed objective acceptance | Attributable approval of the proposed wording and intended study scope | Research team/adviser records the scope decision using the [Chapter 1–5 guide](chapters/MedShield_Objective_Change_Chapter_1_to_5_Guide_20261102.md). |
| G2 — Source and identity coverage | Source-linked completeness, missing-submission dispositions and reviewed delivery/SKU/account mappings for the intended claim | Data steward/catalog owner uses the [existing source-review queue](../outputs/all_area_acceptance_20261102/source-review-queue.csv) and reuses recorded scoped confirmations. |
| G3 — Current integrated verification | Scoped local gate passed in E13 against the named 426-file snapshot and source/run identities, including native exports and simulated source failure/recovery | QA owns rechecking subsequent affected changes using the [testing guide](TESTING.md). Release owner retains any separate hosted/clean-checkout acceptance. |
| G4 — Stronger model evidence and publication | Eligible new observations, correctly timed issues, same-case baseline comparison and applicable release review | Model owner retains SO3 priority. The team reports the new sales snapshot and order archive are unavailable. Their [preflight](PREDICTIVE_OPERATIONS.md#so3-one-month-sales-forecast-preflight--5-november-2026) is prepared for a later eligible source. External joins also require reviewed timing and mapping evidence. |
| G5 — Operational scenario inputs and outcomes | Verified stock/lot/pack/supplier/cost/lead/expiry inputs and a defined observed outcome period | Operations validates inputs and measures intended benefits before operating procurement acceptance. |
| G6 — Client understanding and intended use | Attributable task responses and actual acceptance decisions | Facilitator follows the [client walkthrough](CLIENT_ACCEPTANCE_WALKTHROUGH.md). Client-dependent review remains deferred under the user's prior direction. |
| G7 — Manuscript and presentation alignment | Findings use the proposed scope, correct metrics, experiment dates and evidence labels | Writer/research team links the matrix into later manuscript work. The [working chapters](chapters/MedShield_Chapter_4_5_Revised_20261016.md) and [scope guide](chapters/MedShield_Objective_Change_Chapter_1_to_5_Guide_20261102.md) retain their actual integration status. |

Gate closure depends on the intended claim. Descriptive review, comparative
forecast evaluation and assumed-input planning each have a documented proposed
deliverable. Future accuracy and operating benefits need their own observations.
The existing [original-scope assessment](../outputs/objective_progress_20261030/README.md)
remains a separate historical requirement assessment.

## Documentation verification

Acceptance for this matrix is coverage of the exact 25 scorecard criteria,
working local evidence/implementation links, retained receipt consistency,
correctly labelled dates/scopes, reproducible selected figures, and an owner for
every open gate. The [current verification record](../outputs/current_integration_20261105/matrix-verification.json)
binds the current Markdown and inspected sources to this review. The initial
documentation receipt above retains the pre-repair matrix and 13-path drift.
Recheck with `python -X utf8 outputs/current_integration_20261105/verify_matrix.py --out <new-receipt.json>`
from the repository root. The [current verifier](../outputs/current_integration_20261105/verify_matrix.py)
requires a new receipt path and checks the matrix against retained records,
the 14-path checkpoint drift and the current runtime execution result.

Applied guidance includes documentation standards for canonical linking,
analytics frameworks for units/cohorts/claims, business analysis for objective
traceability, technology-stack guidance for runtime boundaries, and testing
standards for inherited versus current verification.
