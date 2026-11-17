# Predictive operation and review

## SO3 one-month sales forecast preflight — 5 November 2026

The active model accuracy priority is the one-month company itemized PHP
forecast. Five underforecast months contribute 42.19% of the absolute error in
the 30-case baseline audit. Investigate which confirmed orders were available
before issuance. The delivery data establishes when sales were recorded.
[Error concentration](../outputs/forecast_error_concentration_20261101/README.md)

From repository root, run the [read-only preflight](../services/analytics_service/company_php_preflight.py):

```powershell
python -B -X utf8 -m services.analytics_service.company_php_preflight --design outputs/company_php_forward_20261031/protocol.json
```

The November 1–3 window has closed. The next window is December 1–3 in
Asia/Manila. It requires controlled November history and a December extraction.
The one-month target is January 2027, two months after the source history ends.
Use `--snapshot <path>` with the output of the
[controlled snapshot adapter](../outputs/company_php_snapshot_20261031/README.md).
The preflight applies the existing writer's scope, history and timing checks.
If the operator confirms a November issue was missed, record it as unissued.
The original complete-cohort rule requires all 12 scheduled issues.

Review any advance evidence separately with `--event-export <csv>` and
`--event-receipt <json>`. Use the existing
[advance-event header](../outputs/surge_signal_investigation_20261101/advance_events.csv)
and `original_itemized_sales_contracts_excluded` scope. The order archive must
cover the target as of the declared cutoff, including cancellations and
reschedules. Use anonymous evidence identifiers, confirmed orders, true
custody/linkage flags and the compatible PHP financial basis. The source
operator supplies an attributable receipt with these fields:

| Field | Value |
|---|---|
| `schema_version`, `status` | `1` and `OPERATOR_VERIFIED_ORDER_ARCHIVE` |
| `scope`, `target_month` | The same sales scope and the calendar month after the cutoff month |
| `cutoff_at`, `verified_at` | Timezone-aware timestamps, with cutoff within a registered issue window and verification at or after cutoff |
| `export_sha256`, `source_receipt_sha256` | Exact CSV byte hash and retained lineage receipt hash |
| `complete_target_scope` | `true` only after the operator verifies target coverage at the cutoff |

An unavailable archive produces an unknown count. A verified complete archive
can report zero confirmed target orders. Future captures and revisions are
excluded at the cutoff. The local checks establish consistency. The operator
retains source completeness, linkage, receipt and timestamp evidence.

The model owner registers a separate comparison when enough verified
origin-time order and outcome evidence is available. Compare the sales-only
methods and the order-informed candidate on the same new months with MAE,
WAPE and signed bias. The existing registered writer remains the route for
issuing the six frozen sales-only methods. Preflight performs local reads and
reports eligibility. [Executed checks](../outputs/so3_one_month_preflight_20261105/verification.json)

## Client understanding and new bounded evidence — 2 November 2026

[Current packet](../outputs/client_model_evidence_20261102/README.md) records
three separate new offline studies and their registered decisions. The fixed
company-PHP empirical interval candidate fails its development score/coverage
guard; mean6 point predictions stay unchanged. The fixed ABC transition learner
has no class-prediction gain over persistence. The fixed unit median lowers MAE
relative to mean6 by 5.36%/4.00% but seasonal naive remains better at both leads;
no unit method is selected. Previously inspected histories are not new holdouts.

Current dashboard explanations use existing source-validating gateway values,
not these local experiment artifacts. Updated [model interpretation](MODEL_EXPLAINER.md)
and [client tasks](CLIENT_ACCEPTANCE_WALKTHROUGH.md#model-understanding-supplement--2-november-2026)
distinguish error, class support and small unit cohorts. Actual client results
and acceptable-use/error limits remain unset until recorded by their owners.
No future issue, new warehouse extraction, source/model pointer, activation,
procurement authority or original-objective acceptance is created here.

## Separate SO2 comparator extension — 2 November 2026

[Declared and executed fixed-recipe extension](../outputs/so2_closeout_20261102/README.md)
adds 2025 and January–September 2026 reports for both original XGBoost recipes,
trained on the original training-label partition through 2024. It is an inspected
retrospective comparison with no reselection, tuning or activation. The original
run remains validation-only for its challengers; do not relabel its missing cells
as extension results. Source/code/environment hashes, same-case baseline
reproduction, saved-model reload and independent metrics are retained. Runtime
integration would require a separate warehouse candidate and gateway binding;
this offline report does not supply dashboard values from local files.

## Consolidated study reporting — 2 November 2026

[Fresh retained-result verification](../outputs/system_first_20261102/models/README.md)
provides a source-hash-bound series/model/stage/lead matrix and an ABC comparison
matrix. Saved company unavailability reasons now agree between table and export.
Predictions are inherited; arithmetic and current isolated consumer checks are
fresh. XGBoost conclusions remain validation-only; later baseline windows are
not held-out challenger results. Substantial forecast errors and unavailable
recipes/regions remain visible. No fitting, runtime model selection, source or
publication change occurred. Current live Gold and authenticated full delivery
remain unverified; model/source owners retain prospective and external-data gates.

## Surge-to-signal handoff — 2 November 2026

[Investigation and comparison handoff](../outputs/surge_signal_investigation_20261101/README.md)
trace five high-error months through signed product,raw buyer/channel,joint and
daily aggregates. Advance inputs remain unavailable in inspected sources;do not
use delivery dates or references as order/customer knowledge. New as-of validation
requires real dated confirmed-order revisions,compatible financial linkage and
custody;an empty event template is not zero demand or evidence of feature benefit.
Current frozen forward design stays unchanged. November2 readiness requires
October successor history and custody;no issue or future score was created.
The newer occurrence research candidate needs a separate reviewed future design
before issuance. Preserve all windows/outcomes and report missed issues honestly.

## Origin-local occurrence calibration — 1 November 2026

[Completed-error calibration evidence](../outputs/occurrence_calibration_20261101/README.md)
fixes the previously selected occurrence base and learns correction only from
completed prior targets. No new calibrator passes the development gain/bias rule.
Later correction improvements are inspected four-case evidence, not a new model
selection or prospective result. Prior raw research choice, runtime mean6 and all
source/model/publication gates remain unchanged. Source/cache/inner cutoff and
current/future actual isolation are independently reconstructed in the packet.

## Elapsed-history initialization and rate exploration — 1 November 2026

[Two registered follow-ups](../outputs/occurrence_rates_20261101/README.md)
preserve prior failed states and test an explicit elapsed-financial-history
initialization before a separately registered rate comparison. One recipe meets
the development gain/bias guard, but its later audit/extension worsen. It remains
exploratory only; runtime mean6 and all release/operational gates stay unchanged.
Repeated selection on inspected history is not untouched confirmation. Financial
empty-set exposure is not certified product availability or physical zero demand.
Exact results, all alternatives, check receipts and no-current-issue boundaries
are retained in the packet; no new data/provider/source approval is inferred.

## Product-occurrence research continuation — 1 November 2026

[Executed TSB/SBA-style financial experiment](../outputs/product_occurrence_20261101/README.md)
adds three fixed positive-PHP occurrence/size recipes with signed negative
corrections. All fail the existing development guard and requested error targets;
mean6 and all runtime/source/model/publication pointers remain unchanged. The
packet records explicit first-positive initialization, full states and its severe
overforecast consequences. Recorded-label financial empty sets are not verified
zero demand or SKU/stockout/obsolescence evidence. All original cases remain;
later windows are inspected retrospective evidence. Source/identity/availability
and prospective gates remain open; no fresh provider read occurred.

## Category alternatives and planning scenarios — 1 November 2026

[Executed alternatives](../outputs/forecast_alternatives_20261101/README.md)
retain the fixed company-PHP target, calendar cases, signed observations and
development-only selection. No category challenger passes the strongest-baseline
and bias guard. The linked packet owns exact metrics, input hashes, unavailable
advance timing evidence and the failed HTTP400 live read. Offline reconstruction
is explicitly research and reconciled to retained Gold, never a runtime fallback
or historical-vintage attestation. The31 scenario rows use entered ±25%
assumptions with null probability coverage and false operational/procurement
approval. September history's October illustration is not a current November
issue. Current forward-snapshot/custody requirements below remain authoritative.
No model/source/default/approval changes; original accuracy targets remain unmet.

## Requested error audit and price-list assessment — 1 November 2026

[Error concentration](../outputs/forecast_error_concentration_20261101/README.md)
reconciles the frozen mean6 error to raw area/channel financial components;
five of30 months explain42.19% of company absolute error. Keep all cases and
signed returns. This diagnosis does not establish causal order timing or select
a model using inspected later periods. [Price-list evidence](../outputs/pricelist_model_readiness_20261101/README.md)
is an identical prior source, with unresolved product/pack identities and as-of
validity. No2026 price/brand feature may be backfilled into earlier origins on
this evidence alone; no source mapping or deployment approval is implied.

[Grouped evaluation](../outputs/grouped_sales_forecast_20261101/README.md)
uses separately origin-local past12/past24 inner-origin baseline selection per
raw label and a fixed half-blend with company mean6. Ninety new predictions and
120 same-cohort controls are retained. All recipes fail the development guard;
mean6 remains selected. Identical linear recipes summed across groups are
algebraic controls,not accuracy gains. Three new development WAPEs are85.26%,
91.97%,75.79%;no low-error target passes. Inspected audit/extension scores cannot
rescue failed selection. No mapping,price feature,model activation or business
approval follows;the next useful dependency is legitimate as-of order information.

## Below10%/5% target attempt — 1 November 2026

[Joint-affine experiment and family-specific feasibility](../outputs/forecast_target_feasibility_20261101/README.md)
records the new registered narrow extension after earlier convex blends were
identified as already tested. All cases/results are retained;no candidate passes
the frozen development gate or requested WAPE targets. Existing mean6 research
selection and all source/model/publication pointers remain unchanged. Hindsight
interval bounds are diagnostic only,never forecast scores or selection inputs.
Later windows were inspected previously and remain retrospective. No real future
issue,new-source query,activation or original-objective acceptance occurred.

## Forward-snapshot export adapter prepared — 31 October 2026

[Source-bound snapshot adapter](../outputs/company_php_snapshot_20261031/README.md) adds an offline pinned-Delta SQL planner and operator-receipt/export converter for the separate company-PHP comparison. It reconciles monthly/whole-window counts and signed financial components, retains source-quality labels, and rejects mixed identities, missing history and changed registered observations. Eight new tests/all19 forward tests pass;287 independent checks and the earlier229 checks pass. Registered forecast code/protocol and paper files are unchanged.

The SQL has not been executed against Databricks in this turn, and operator receipt truth/custody is not independently attested. Available preserved history ends September2026; a controlled October extraction is still needed for November1–3. No real issue, future score, accuracy gain or runtime/source/model/publication change is established. The controlled data/model operator owns that extraction and custody handoff. FINAL QA remains deferred.

## Company-PHP forward comparison registered — 31 October 2026

[Forward comparison tool and runbook](../outputs/company_php_forward_20261031/README.md) implement a separate offline protocol, exclusive grouped issue writer, consistency validator and mature-outcome scorer. Six fixed methods are compared across 12 monthly issues (November2026–October2027). Calendar leads1/3/6 correspond to source-relative leads2/4/7 with previous-month history; they are distinct from earlier historical1/3/6 experiments and the HOSPITAL unit protocol.

11 focused tests and229 independent checks pass;202 pre-existing tracked files are preserved. The actual October31 readiness check finds the issue window closed; no controlled snapshot was checked, real issue created or accuracy measured. November1–3 issuance requires a verified controlled October extraction, while the preserved source ends September. Source receipts/operator verification and local hashes do not independently attest warehouse truth or pre-target creation; independent custody remains an owner responsibility. No runtime/source/model/publication change or activation occurs. One-month/ABC improvement remains unresolved; FINAL QA and paper work remain deferred.

## Signed-component accuracy hypothesis evaluated — 31 October 2026

[Component study](../outputs/component_accuracy_20261031/README.md) executes12 fixed signed-sales recipes/480 points,including90 same-window mean controls. None meets the one-month improvement gate;mean6 remains selected. The best development WAPE58.82% trades against−22.30% bias and worse later errors. Changing only correction windows yields negligible gains. Corrections are0.2956% of positive recorded sales across81 months,but reach25.58% inOctober2020;source negatives remain intact.

8 tests/4697 independent source,prediction,metric/CSV and preservation checks pass. Existing3/6 research,ABC results,frozen/runtime/source/model/publication/score/paper remain unchanged. One-month/ABC accuracy is still unresolved. Analyst/model owner next freezes the tested registry and prepares a distinct company-PHP forward-evaluation contract before new controlled months are used;no future issue/actual created. FINAL QA stays deferred.

## Lagged activity / portfolio features evaluated — 31 October 2026

[Feature experiment](../outputs/accuracy_features_20261031/README.md) executes six one-month activity regressors and six prior-portfolio ABC candidates. None meets the predeclared overall selection guard. Development one-month WAPE68.08% improves on mean6 71.66%,but bias−10.24% fails≤5% and later errors worsen. ABC logistic macroF1 .5414 versus.5367 misses required+.02;higher XGBoost accuracy worsens A recall. Existing selections remain unchanged;prior lead3/6 research is retained separately.

18 tests/86579 independent source,as-of feature,metric/cohort/CSV checks pass over300 forecasts,1014 ABC cases and3175 feature receipts.41/83 validation cases have identical input features with mixed actual classes.81 existing positive-sales/negative-correction monthly components reconcile to the forecast source;component modeling is the next input-ready hypothesis,not an executed gain. No runtime/source/model/publication/score/paper change;FINAL QA deferred.

## Development-only accuracy improvement — 31 October 2026

[Accuracy experiment](../outputs/accuracy_improvement_20261031/README.md) implements ten origin-local error-adaptation recipes and four prior-state/class-balanced XGBoost challengers,registered before fitting. Development-selected bias corrections lower WAPE versus existing selected seasonal-naive references at leads3/6:audit63.97→59.72% and68.92→57.49%;inspected extension48.81→32.65% and53.22→40.27%.One-month/ABC selection is unchanged. Other simple baselines still outperform both new choices on audit;all alternatives/regressions are retained. No untouched-test or overall solved-accuracy claim.

1260 forecast points/126 score groups and848 ABC cases/40 groups reconcile through25121 independent checks;19 focused tests pass. New candidates do not establish the original absolute-bias≤5% promotion gate. Source/frozen selections/runtime/warehouse/model/approval/score/paper are unchanged. FINAL QA remains deferred;analyst/model owner retains one-month/ABC improvement and prospective/stronger-baseline evaluation.

## Model audit and versioned ETS correction — 31 October 2026

[Model repair evidence](../outputs/model_error_repairs_20261031/README.md) checks the user-supplied audit against retained runs and repairs a reproduced ETS numerical defect through new offline `scale_conditioned_ets_v1` recipes: origin-local reversible scaling and failed/missing-convergence rejection. Existing frozen adapters/artifacts/default model selections are unchanged.60 corrected fits converge;720 comparison points reconcile independently. Accuracy changes are mixed,including worse audit results;neither corrected ETS meets the development promotion guard.18 focused tests and4597 independent assertions pass. This is numerical reliability,not a solved forecast-error target.

The PDF mixes unsupported WAPE,small validation cohorts,synthetic external/AHP results and simulated operating outcomes. In particular,ABC100% established accuracy is2/2 validation cases,not held-out performance;forecast error is not stockout/expiry/solver/CR. Source-bound corrections and remaining model/data limitations are in the packet. No fresh warehouse read,source/model/publication switch,runtime change,original-score increase or paper edit. FINAL QA remains deferred.

## Offline prospective unit scoring — 5 November 2026

The [unit study scorer](../services/analytics_service/unit_prospective_score.py)
uses the sealed [protocol](../outputs/unit_prospective_protocol_20261029/protocol.json)
and the matching issue-writer code and Python version. Keep issued files in one
directory using their writer-generated names. The scorer accepts operator-prepared
monthly actuals for the registered BUPIRIGHT HOSPITAL ampoule scope.

Use the first eligible controlled Gold snapshot after the target month closes in
Asia/Manila. The snapshot uses schema version `1`, the protocol's exact `scope`,
`target_month`, the same six `source` lineage fields as the issue snapshot,
and timezone-aware `extracted_at` and `verified_at` timestamps. Include the
`controlled_successor_reconciliation_sha256` for evidence covering each issued
history for that target, the signed decimal-string `ampoules` total,
`source_records`, `unreviewed_source_records`, and `source_data_status` as a list
of quality flags. Use `zero_evidence_sha256` only for an explicitly verified zero
with no source rows. Otherwise set it to null. Leave absent or ineligible months
unpinned. Retain the source receipt and the actual extraction and review evidence.
The scorer checks local content and chronology. The data operator verifies source
completeness and first-eligible-snapshot selection.

From the repository root, with the issue files and operator-verified actual:

```powershell
python -X utf8 -m services.analytics_service.unit_prospective_score --issues <issue-dir> --actuals <actual-dir> pin-actual --snapshot <actual.json>
python -X utf8 -m services.analytics_service.unit_prospective_score --issues <issue-dir> --actuals <actual-dir> score --out <new-report.json>
```

Add `--restatement` to the pin command for a later controlled revision. The
revision links to the first pin's file hash. Each command creates a new file
atomically. The report uses the first pins and retains all 24 issue/lead cases.
It reports paired metrics for all four methods separately by lead, plus explicit
counts for missing, unissued and pending cases. Decimal metrics are stored as
strings at computation precision. Null WAPE and normalized bias indicate a zero
absolute-actual denominator or no paired cases. The annual comparison requires
12 scored cases per lead. Interim results remain descriptive.

[Verification](../outputs/unit_prospective_score_20261105/verification.json)
uses synthetic issue and actual fixtures. The retained source evidence ends in
September 2026. The model owner still needs a verified controlled October
successor to issue in the November window. The first eligible target actual
comes after December close. The workflow is offline research with separate
business and release acceptance.

## Current territorial research and issue readiness — 31 October 2026

[Current read-only evidence](../outputs/wp4_territorial_research_20261031/README.md)
extends supported CALABARZON recorded-PHP research at leads 1/3/6. This result
is offline and unpublished, with no regional-unit, clinical or operational
activation. Other regions fail this registered continuous-history window.

The real clock check at 31 October uses the existing frozen November-first unit
issue design. The actual extractor rejects `Unregistered issue month` before
requesting any issue query. No future clock, issue file or prospective score is
created. The current active source is still its historical predecessor through
September; a November issue requires a new reconciled controlled candidate
through October and retained HOSPITAL-only confirmation. Do not reuse old Delta0,
relabel a channel as territory, backdate a missed issue or request unavailable
operating records again. The later-window actual extraction/issuance/assessment
remains unperformed. Fresh synthetic extraction/issue regressions are separate
from that actual nonissuance observation.

## Controlled unit extraction adapter — 29 October 2026

[Implementation and run boundary](../outputs/unit_gold_adapter_20261029/README.md)
document `services.analytics_service.unit_gold_extraction.extract_from_spark`.
Four SELECTs read predecessor/current compressed receipts and full scoped rows
at pinned Delta0. Receipts, dataset/policy/master/batch identity, history lineage,
source IDs, dates and quantities are checked before the last 12 observed months
are aggregated. Missing months fail, repeated transactions remain separate, and
no old source is substituted on query failure. New snapshot/receipt/reconciliation
and audit evidence files are written to a new local folder; no predictions or
tables are written. Local tests cover synthetic Spark conversion, not live compute.

The adapter supports new immutable controlled candidate pairs with unchanged
historical scoped rows and master; changed history needs a separate reviewed
contract. Query callbacks are a trust boundary, so hashes alone do not attest
live warehouse execution. Retain actual query-audit evidence at execution. No
real extraction or issuance yet. Run only after controlled later history exists
within the registered issue window; October is not assumed available.

## Offline prospective issue writer — 29 October 2026

[Executed implementation and input contract](../outputs/unit_issue_writer_20261029/README.md)
document `services.analytics_service.unit_prospective_issue`. Its issuance CLI
uses the actual clock and requires the registered month, fresh preceding-month
history and a snapshot-bound verification receipt. It preserves all four methods
at both leads in one atomic fail-if-exists local file. Read-only `--validate-issue`
reconciles embedded inputs, lineage, runtime/code identity and recipe predictions.
No scoring, scheduling, serving or warehouse client is installed.

Twelve synthetic test methods pass. Inputs/receipts remain operator-supplied;
these structural/hash checks cannot attest live Gold truth, reporting completeness
or human outcome exposure. A separately verified controlled extractor must supply
the snapshot and receipt; this adapter is now locally tested above. Real issue
execution remains unperformed. Use the matching retained writer/runtime for
subsequent validation. Business limits and operational approval remain unchanged.

## Prospective unit-evaluation design registered — 29 October 2026

[Frozen protocol and planned cases](../outputs/unit_prospective_protocol_20261029/README.md)
define 12 monthly issue windows starting November 2026. Each issue uses only the
preceding month's controlled history and predicts issue-month leads 1/3, which
are source-relative leads 2/4. These labels differ from the prior retrospective
comparison. Preserve timestamps, freshness and both distances; never backdate
or fill a missing issue. Source data currently ends September; the first planned
November issue requires October history not yet accepted here.

The registration is a local sealed design, with no issued prediction or new
actual. The subsequent offline writer/validator implementation above freezes
source/code/value hashes and all four methods before target access and rejects
late/incomplete cohorts. The separate offline scorer above pins actuals and
revisions once controlled outcomes are available. Report all methods. Operating MAE and
WAPE limits remain null and cannot pass business acceptance. A later protocol
change needs a separate version and cannot recycle consumed targets as untouched.

## Fixed-prediction scored-target influence — 29 October 2026

[SO3 consistency evidence](../outputs/forecast_robustness_20261029/FINDINGS.md)
removes each scored target once from the common within-lead comparison while
holding all predictions fixed. This measures sensitivity of the reported MAE
ranking, not retraining, cross-validation or uncertainty. At leads 1 and 3,
seasonal naive remains lowest in 5/6 and 2/4 checks respectively. Keep these
small different cohorts separate. No champion is selected and no operational
forecast is approved. Register the next prospective evaluation, as-of controls,
comparators and acceptance/loss criteria before inspecting later accepted
outcomes; repeated analysis of these same targets is not a new holdout.

## Unit research interpretation and calendar boundary — 29 October 2026

[Checked review enhancement](../outputs/so3_research_review_20261029/README.md)
adds a historical chart and lowest-observed-MAE readout, with common within-lead
cohorts and reconstructed metrics. A chart baseline choice never updates
`selected_method`, `activation_allowed` or operational approval. CSV keeps all
four baselines at the selected lead, source policy and the exact origin/target
bounds. Source observations end September 2026, but the latest scored three-month
origin is June 2026; the artifact supplies no December prediction. A three-month
calendar distance to December does not establish model validity for that issue.
No new training, future forecast, accepted-error policy or publication is added.
Existing intended-use/source/as-of/model/operational gates remain unchanged.


## BUPIRIGHT research comparison connected; approval boundary — 27 October 2026

[Executed connection and approval steps](../outputs/bupiright_research_connection_20261027/README.md)
add Forecast's BUPIRIGHT unit research panel with fixed HOSPITAL channel/ampoule
scope, actual lead-one/three errors, small evaluation, source quality and CSV.
One immutable Gold candidate row was inserted/read back; source/master/model
pointers are unchanged. The authenticated no-filter API validates current Gold,
50 source rows and all 40 predictions/eight error groups; failures show unavailability.
Research display is authorized by the user's request. Operational forecasting is
not approved: the client CEO needs an attributable intended-use/error-limit and
release decision supported by accepted source scope and stronger origin-safe
validation. Unit confirmation is already recorded and must not be requested again.
Academic evidence acceptance, original territorial SO3 and procurement inputs remain
separate. Signed-in visual/responsive review remains unverified; actual technical
checks and the limited retrospective comparison do not grant business release.

## Confirmed BUPIRIGHT recorded-unit baseline candidate — 27 October 2026

[Executed scoped comparison](../outputs/bupiright_lineage_20261027/README.md)
uses Adrian's confirmation of two exact 4 mL labels and one-ampoule/box-of-one
billing. The HOSPITAL channel candidate preserves source provenance/quality and
18 recent contiguous months; it is not verified delivery geography or market
demand. Four frozen baselines produce 40 conditional retrospective predictions
at actual leads one/three. Source-revision availability is not reconstructed;
there is no untouched holdout, selected model, future output or operational
publication. Fourteen tests and separate source/unit/metric reconstruction pass.
Connect only through a separately verified Gold research candidate, keeping all
scope/error labels and existing source/model approval flags. Do not reconfirm the
already supplied unit answer or promote an observed best score automatically.

## Current medicine-unit pilot not selected — 27 October 2026

[Fresh original-source selection screen](../outputs/original_medicine_screen_20261027/README.md)
uses `services.analytics_service.medicine_pilot_screen` and saved SELECT-only
evidence from `backend/scripts/extract-medicine-pilot-screen.ts`. The recorded
no-fit decision binds the current cutoff, screen hash, known unit evidence and
unresolved identity/history/geography. No series reaches the explicit 12/24-month
recent positive-observation screen. This is not a universal ban on intermittent
or bounded research methods; any alternative must freeze its own target and
missingness assumptions instead of silently zero-filling or changing scope.

Reuse the known TRIVASC box confirmation; current Gold reproduces the 165-row
historical inference but not recent history. Do not refit unchanged historical
data as though it supplies a current short-lead target. Company-PHP fixed/rolling
research and historical external context remain separate capabilities. Next work
is evidence-backed current identity/unit/delivery linkage, not another unregistered
model sweep. No printed pack-count multiplier, guessed alias merge or external
geographic join is authorized by this screen; operational publication flags remain.

## Original-source ABC research evaluation — 27 October 2026

[Executed offline comparison](../outputs/original_abc_evaluation_20261027/README.md)
uses `services.analytics_service.abc_evaluation` register/execute, binding the
frozen protocol, saved source, runner and installed versions before fitting.
Two XGBoost challengers fail the validation rule; prior-year ABC persistence
remains selected for bounded research. The later evaluation does not reselect.
Existing results refuse refitting; use the saved-model/metric verifier to inspect
them. Weak A/B recall and missing-history coverage prohibit operational claims.
No warehouse, API/UI, model-pointer or publication change is part of this run.
Observed deterministic ABC remains the dashboard ranking. Stronger identity/
history/catalog evidence precedes any new cold-start experiment; a future research
consumer must verify source and artifact identity rather than treat these local
files as runtime analytical fallback.

## Rolling research candidate and comparison connected — 27 October 2026

[Actual isolated reporting connection](../outputs/rolling_research_connection_20261027/README.md)
adds the evaluated monthly-refresh experiment to a new Databricks research row,
source-bound reader and separate Forecast panel with lead 1/3 controls. Fixed-origin
evidence remains preserved. Use `stage-rolling-research.ts` with the saved rolling
evaluation, a fresh output directory and prepare/apply/verify; exact saved registration/
selection/code/source checks precede insert/readback. `verify-rolling-research.ts`
checks actual candidate/current source and fixed-run preservation.

This is research reporting, with large errors and no operational publication.
No notebook rerun or model refit is required. The next objective-closing work is
SO1 dedicated current-source diagnostics, not repeated company-PHP experiment
tuning. Actual demand/unit/external/urgency and operational acceptance remain open.

## Frozen monthly-refresh experiment executed — 27 October 2026

[Actual rolling run and reconciliation](../outputs/original_rolling_evaluation_20261027/README.md)
complete the previously prepared leads 1/3 experiment. Use
`services.analytics_service.predictive.original_rolling prepare` in a new output
directory with the original protocol, source and fresh Gold confirmation, then
`run`. Registration freezes protocol/source/code/runtime and the exact case matrix;
model selection is saved before audit fits. Shared deterministic fits are reused
only at identical model/origin/source/config, never across changed input.

Mean_6 is retained as the research benchmark. Error and bias remain substantial;
no operational publication follows. The new verifier recomputes every error group,
checks source targets/training digests and selection, and exports provenance-bearing
cases. Original artifacts, dashboard reference and warehouse stay unchanged.
Source owner/error acceptance and later observations remain open; inspected audit
results are retrospective and cannot be reused as an untouched test. Actual scores,
warning details, checks, hashes and reproduction commands live in the packet.

## Error diagnosis and prepared refresh experiment — 27 October 2026

[Executed original-source diagnosis](../outputs/original_forecast_diagnosis_20261027/README.md)
adds fresh Gold sign/count/concentration/date evidence, per-month/lead Decimal
errors, exact comparable-period count/line-value attribution and a checked static
figure. It preserves the existing evaluated run and dashboard. No source cleaning,
outlier deletion, physical-return relabeling, model refit or warehouse write occurs.

The new protocol is prepared only: same 21 configurations, expanding monthly fits,
leads 1 and 3 with separate scores, minimum 36 months, fixed source/seed, and a
development actual cutoff of October 2024 before the earliest2025 lead 3 origin.
Development has 20 targets per lead; 2025 and January–September 2026 have 12 and 9.
Retrospective labels, source-vintage limits, unavailable uncertainty and false
publication flags remain. Implement the runner against the saved case schedule
and freeze selection before audit fits; do not treat preparation as execution or
assume shorter horizons/monthly updates improve accuracy. Verification command
and full protocol identity live in the packet.

## Original-itemized research comparison connected — 27 October 2026

[Actual staging and consumer packet](../outputs/original_research_connection_20261027/README.md)
now records the insert-only Databricks research candidate, exact readback/retry,
original source-bound route and Forecast comparison/export. No notebook rerun is
required. Controlled `backend/scripts/stage-original-research.ts` accepts
`evaluation.json`, an output directory and `--prepare`, `--apply` or `--verify`.
All phases validate the registered bytes/code and current Gold input; apply requires
the saved identical plan. Never replace differing rows or treat reporting as
operational model activation. The large artifact uses the established byte-preserving
SQL helper after Databricks rejected its size as a named parameter.

The original adapter selects this reader without changing the operational pointer
or historical-source selector. The default panel shows the frozen selected benchmark
and 2026 retrospective audit, with 21 models, both audits, no future window and
explicit large-error/contract/filter limitations. Readers recalculate metrics;
warehouse/candidate failures remain unavailable. Real visual QA and actual model/
source/error acceptance remain separate. Financial and model approval remain false.

## Original-itemized recorded PHP evaluation — 27 October 2026

[Executed research packet](../outputs/original_forecast_evaluation_20261027/README.md)
now binds the frozen 21-configuration evaluation to original Gold Delta0, independently
reconciled monthly/annual controls and exact input/code/runtime hashes. Use
`services.analytics_service.predictive.original_research` for exclusive-create
`prepare` then `run` in a new output directory. Use
`services.analytics_service.predictive.verify_original_research` to reconcile the
saved source/targets/training/selection/errors and export comparison CSVs without
refitting. Commands and hashes are retained in the packet.

Model selection is development-only; 2025 and January–September2026 are explicitly
retrospective audits with revised source vintages. Last_value is retained because
no challenger qualifies, not because an absolute operational accuracy standard
passed. No full-history STL features or missing-month imputation enter fitting.
Intervals remain unsupported. Research candidate publication/UI connection is a
separate next engineering step; no live model, warehouse write, forecast approval
or procurement authority is created by this offline result. Earlier corrected-source
runs must not be rebound to this new original-source identity.

## Correction continuation — 25 October 2026

[Executed correction continuation](../outputs/truth_correction_20261025/continuation/README.md) records verified SQL original-evidence intake (Spark notebook not run), fresh corrected Gold,21-configuration retrospective itemized-sales evaluation and corrected SO1 diagnostics. The resumed signed-in session verified corrected source labels, totals, product/area ranks, date/table filters, actual product/area/STL/forecast downloads, trained-research unavailability and planning draft invalidation. Concrete label/export defects were repaired and rechecked. Working Chapters4–5 now integrate corrected evidence; prior text/releases remain preserved. These totals are itemized-product sales, not complete company sales. Full-original disposition reconciliation, runtime model/SO1 publication, formatted whole-paper review and business/model/academic acceptance remain open. Earlier affected findings are historical; no operational approval or capstone completion is inferred.

## Corrected itemized target — 25 October 2026

The [source correction](../outputs/truth_correction_20261025/README.md) excludes
unmatched contract-product replacements from active product reporting. Earlier
stored trained experiments are retained but refused as current research for the
affected datasets. Do not rebind old predictions, errors or model selection to
the correction. Current fixed-origin gateway benchmarks use corrected Gold;
retained trained-model tasks require a new frozen, correction-bound evaluation.
No model pointer or operational approval was changed.

## Current-source candidate visible in the system — 25 October 2026

The [workflow delivery](../outputs/workflow_completion_20261025/README.md)
stages the already evaluated 24 October extension as a separate immutable Gold
candidate and adds Forecast → Current-source financial research. Fifteen frozen
models, identical-case 2025/2026 errors, exact month values and CSV lineage are
available through an authenticated gateway read. The last-value development
selection and its substantial 2026 error remain visible. The twelve future
candidate values have null actuals and no measurable future errors. Original
stored experiments and the operational model pointer are preserved.

This supersedes the earlier *offline-only delivery location* for this specific
artifact; it does not supersede the research-only approval, results, selection
or study period. Candidate persistence is not model publication. Missing or
changed Gold/source/hash evidence makes the view unavailable.

Use `backend/scripts/stage-extension-research.ts` with the registered
`extension-run.json`, exact byte SHA-256, a dedicated output directory and
`--prepare`, then `--apply`, then `--verify`. Preparation checks every registered
artifact hash and current source; apply requires the identical saved plan,
inserts only the `extension_<hash>` row into the existing candidate run table
and verifies exact payload readback. It creates no point/evaluation duplicates
or release-pointer update. Configure only the nonsecret server-side
`DATABRICKS_EXTENSION_RESEARCH_SHA256`; reload the gateway when changing its pin.
Removal of that setting disables this view explicitly, without changing older
research or deleting the retained candidate. Do not substitute a different run
or current source without fresh preparation and verification.

Remaining: any operational forecast activation needs an actual use/error
decision and applicable accepted source/model contract. Original medicine-unit
modeling additionally needs supported SKU/unit/coverage and external methodology
where required. These facts cannot be supplied by a software completion label.

## New-source research training completed — 24 October 2026

[Completed analytics run](../outputs/analytics_completion_20261024/README.md)
records the subsequent explicit user attestation and research-training decision,
fresh reconciled input and actual fifteen-configuration evaluation. Publication
remains false. The new `services.analytics_service.predictive.extension` runner
checks raw input/plan hashes and complete accepted 2020–September 2026 coverage
before any fit. It retains the full 2025 retrospective audit and adds nine
identical January–September 2026 cases from a December 2025 origin. Extension
scores cannot change development selection. The selected last-value benchmark's
extension error is substantial; this does not establish operational accuracy.

Use the [main-folder operating steps](../databricks_updated/ANALYTICS_NEXT_STEPS.md)
for validation/extraction and the new offline CLI. The descriptive receipt now
binds the active source, immutable pin, dashboard predicate/version/hash,
provenance partitions and money/count reconciliation. Missing decisions remain
unknown. Historical unlabelled full-fact receipts require `--legacy-receipt`;
their strict recorded string versions are normalized without changing receipt
bytes or hashes. Current/future months cannot become confirmed zeros before
calendar closure. `prepare_coverage` now describes the actual input range.

The new evaluated artifacts are offline research. Original stored models and
the system pointer remain unchanged. Existing historical publishing commands
below are not a new-source release plan: new-source staging, compatible readers,
app verification and actual publication/data/model review remain separate work.

## 2026 observation update and blocked new-model preparation — 24 October 2026

[Application/evaluation delivery and review packet](../outputs/app_2026_activation_20261024/README.md)
extend the four exploratory financial benchmark comparisons through September 2026.
Their three lead groups retain fixed origins, common populations, null future
values and unverified-completeness/revised-snapshot limitations. Sixty independent
Decimal metric checks pass. Stored research is separately pinned to original
fact 20, so its 21 configurations, original inputs and frozen YoY baselines remain
unchanged while descriptive queries use the isolated v8 release.

Eighty-one company-PHP months from 2020–September 2026 are frozen as a new-source
candidate input. No complete training coverage is inferred: `training_approved`
and `publication_approved` remain false. The actual engine returns blocked before
fitting, with source-review, completeness and training-acceptance blockers. The
linked coverage worksheet is a review template, not an accepted receipt. A data/
coverage owner must provide attributable source-bound decisions under the receipt
requirements below before a new trained candidate can be evaluated or published.
The local descriptive activation grants no model or original-study acceptance.

## Step 3 runner and actual sales-only controls — 20 October 2026

The [executed partial comparison](../outputs/external_revenue_experiment_20261020/README.md)
adds a separate offline module for the fixed Quezon retrospective protocol.
Registration binds candidate/policy/preflight/source/code/runtime before scoring;
inherited hashes are checked before adding current bindings. Null/calendar,
same-case, full-rank and train-only transformations are checked. Per-fold traces
and an exact CSV retain failures and blocked models rather than fabricating scores.

Actual2024 sales-only last-value and calendar controls were evaluated on the
prepared numerical cohort; report owns metrics and final hashes. Lower calendar
absolute error comes with larger positive bias. Both external recipes remain
unfitted: no accepted station/disease/source decisions are inferred from the
execution request. Existing adapters, inputs, mappings, live serving and model
publication remain unchanged. Accepted source eligibility and a newly bound
cohort/registration remain necessary before the augmented comparison can run.
The candidate cohort does not establish an accepted external training set.

## External-policy decision and candidate preflight — 20 October 2026

[Prepared policy and cohort](../outputs/external_research_policy_20261020/README.md)
make the pending target/station/disease/time interpretation reviewable. The
preflight executes data preparation only and reports model_execution_ready=false.
Numerically complete cases cannot override absent external-source acceptance.
Keep the earlier pilot immutable. Any accepted revision needs attributable owner
evidence, versioned source/mapping contracts and a fresh fit registration.
Primary and sensitivity station inputs must have separate model/source-policy
lineage; do not introduce duplicate weather rows into one territory/month.

## Historical external-source seasonality — 20 October 2026

[Delivered seasonal descriptions](../outputs/external_seasonality_20261020/README.md)
show seven complete years for Quezon Dengue and each named station, with monthly
mean/median/range, annual maxima and equal-year annual shares. The PNG/SVG figures
describe historical records; shaded ranges are not prediction intervals. Their
peak timing does not choose an external lag or establish a future sales uplift.

The packet's verifier independently recomputes source statistics and plotted
arrays. No model or source policy changed. A later external comparison retains
the existing mapping/station/report-time prerequisites, an identical
sales/calendar baseline and actual origin-available inputs. Do not use these
local research artifacts as a dashboard fallback or treat the descriptive
2018–2024 subset as a change to the overall2017–2025 study.

## Quezon weather/disease source review — 20 October 2026

[The executed alignment review](../outputs/external_mapping_review_20261020/README.md)
confirms existing monthly source arithmetic/coverage and retains unresolved
station, buyer/external-mapping and report-time limits. The original candidate
protocol remains unfitted. All/Private Quezon values agree under current scope;
that does not verify private ownership. A later geographic-population protocol
must preserve this distinction and bind any changed scope before fitting.

Use the packet's `verify.py` to check retained source hashes, independent
catalogue financial controls and calendar cohorts. Its extraction/audit outputs
reject overwrites. Source-specific historical descriptions are the available
next use. Any later augmented fit needs supported mappings, fixed same-case
evaluation and explicit retrospective/revision timing labels; no unobserved
future rainfall/cases, source replacement or numerical uplift is introduced.

## Adaptive calendar and blend research — 20 October 2026

The [executed eight-recipe experiment](../outputs/adaptive_revenue_experiment_20261020/README.md)
adds missing-aware state-space level/trend, anchored calendar regressions, direct
Huber regression and equal/convex combinations in a separate offline module.
It uses actual 2017/2020 history windows without filling missing targets. 2023
out-of-origin forecasts fit provisional combination weights; 2024 validates
separate annual/monthly choices; refitted2023–2024 weights and choices are written
before 2025 scores. Original models/engine/metrics, source and Step 4 remain intact.

The selected monthly blend improves its monthly last-value baseline, but has
material underforecast bias and is worse than the retained annual reference's
separate score. The selected annual method worsens. An unselected persistent
calendar candidate gives only a small annual retrospective improvement. Current
State/report own exact metrics. No promotion, business acceptance, live monthly
refresh or new 2026 evidence follows. One optimizer failure remains unavailable
under the registered member-eligibility rule; no fallback score is fabricated.

Verify retained evidence locally, without running another grid:

```powershell
.\.venv-predictive\Scripts\python.exe -u -X utf8 outputs/adaptive_revenue_experiment_20261020/verify.py
```

The report supplies actual prepare/run commands. Use a new empty directory and
registration for reproduction; do not overwrite delivered evidence. 2025 remains
already inspected. Monthly refits use calendar-cutoff observations in archived
revised data; historical release timing and timely future accepted actuals are
not established. Keep schedule, actual lead, selected/unselected status, bias and
source vintages explicit in any later paper/client claim.

## Executed annual sector-specific policy — 20 October 2026

[Step 5](../outputs/sector_policy_experiment_20261020/README.md) registers a new
offline module before execution, chooses methods from matched 2023–2024
development cases, freezes the choices, then evaluates already-inspected 2025
from December 2024. The resulting sector policy worsens all registered prefixes
against the retained company last-value reference; no model replacement or
activation is recommended. Original models/results and Step 4 snapshots remain
unchanged. Current State and the packet own exact scores and identities.

Both 2017-start and 2020-start histories are included. The four bounded-memory
benchmarks use only 2022-or-later dependencies on this schedule, so widening the
input changes none of the 576 matched predictions. This is not a test of a
longer-history fitted model. Missing observations remain null; limited Internal
development support triggers a registered fallback rather than a claimed winner.

The packet supplies actual prepare/run commands with a new empty output
directory and code/input/runtime drift guards. Do not rerun into its completed
run directory. To verify delivered evidence without a new experiment:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/sector_policy_experiment_20261020/verify.py
```

The original policy's broader selection schedule is distinct from this new
two-annual-origin control. January–March/January–June prefixes of a December 2024
forecast are distinct from the dashboard's later-origin 3/6-month backtests.
Research execution, numerical verification and business/academic/publication
acceptance remain separate; 2025 remains retrospective and no 2026 actuals are
assumed. Future research needs its own fixed protocol, not re-selection from
this visible audit.

## Preserve input before a new sector-specific policy — 20 October 2026

The [Step 4 snapshot](../outputs/sector_policy_input_freeze_20261020/README.md)
preserves the existing fact-20 sector input, original company input/results and
reference-code bytes separately from future experiment outputs. It is a local
input freeze, not a new model/experiment registration or warehouse backup.
Its actual preservation and overwrite-rejection checks pass. Verify from the root:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 outputs/sector_policy_input_freeze_20261020/freeze_input.py --verify
```

Use the preserved `frozen/sector-input.json` for a separately specified policy.
The existing sector-refresh runner registers its earlier benchmark/schedule
protocol; invoking it again does not register the proposed sector-specific
selection policy. Keep new code, method-selection rules, source/code/runtime
identities, registration and results in a fresh output directory. Development-only
selection, same-case origin/lead comparisons, unavailable months and inspected-2025
limits remain required. This snapshot runs no fitting, selection or evaluation.

## Forecast-use consolidation — 20 October 2026

The [client decision brief](PREDICTIVE_CLIENT_DECISION_BRIEF.md#current-review-recommendation--20-october-2026)
now records the checked schedule/sector findings and current analyst
recommendation: preserve the original company reference and use forecasts for
exploratory outlook/budget discussion with historical errors visible. This is
not a new client acceptance, numerical business threshold or operational
activation. No additional unavailable business data is required to document the
current limits. The [delivery](../outputs/forecast_use_review_20261020/README.md)
also updates working Chapters 4–5 and source-derived Forecast use/error summaries
and CSV context, preserving approved/empty/failure behavior. Offline schedule
scores remain dated study records and are never bundled into runtime measures.

## Existing-data buyer and refresh assessment — 20 October 2026

The [executed sector/schedule packet](../outputs/sector_refresh_evaluation_20261020/README.md)
provides the separately authorized Government/Private investigation and fixed
four-benchmark evaluation using retained fact-20 aggregate evidence. It covers
annual-fixed versus monthly lead-1 schedules on matching target months, exact
calendar leads 1–12, native/common support, sector-sum invariance and complete
3/6/12-month origin windows. Missing values are never zero-filled; the separate
minimal-input benchmark policy does not alter trained-adapter history rules.

This assessment registers the existing formulas before execution and performs
no recipe tuning, model selection or publication. 2023–2024 is development
evidence and already inspected 2025 is retrospective. It does not produce an
untouched test, 2026 accuracy or a supported low-error replacement. No additional
business inputs are assumed available. Follow the packet's actual commands,
verification and measured tradeoffs; keep the original saved forecasts intact.

## Expanded study and settled output contract — 20 October 2026

The current user-confirmed study is **2017–2025**. That reporting scope includes
partial early years; it does not retroactively expand the saved **2020–2025**
company-revenue model/STL input window, change a model selection, or improve a
measured error. Retain the recorded experiment identities, same-case comparisons,
origins/leads, original versus exploratory status and actual error/bias results.
Present historical evaluation separately from stored candidate future projections.
Buyer-scoped retrospective benchmarks are implemented; they do not authorize
unpublished buyer future points or a medicine-unit forecast.

2026 actuals remain pending client confirmation. A requested future window with
no supported published points must stay unavailable. Stored projections are not
actual observations and cannot receive an accuracy score without matching actuals.
If new 2026 data arrives, first preserve the frozen prior predictions and version
the new source. Assess eligible, previously unobserved targets on the same recorded
lead/target definition before any subsequent retraining. Do not tune additional
recipes against already inspected audits to obtain a preferred error percentage.

Next is consolidation of the already-run evaluation and the accepted-use decision,
not another dashboard redesign or automatic model activation. The client can
confirm the latest 2026 coverage and acceptable peso/percentage error for the
intended decision; existing source completeness is already recorded.

## Buyer benchmarks and error interpretation — 19 October 2026

The [buyer-scope delivery](../outputs/predictive_buyer_scope_20261019/README.md)
enables retrospective all-product revenue benchmarks on each existing mapped
buyer subset. This corrects an explicit company-only software restriction;
it does not grant buyer-ownership, quantity, coverage or trained-model approval.
The gateway continues to calculate transparent origin-known naive/mean
benchmarks from pinned Gold inputs. Dashboard requests do not fit Python models.

The screenshot's seasonal-naive error was reproduced and independently
recomputed. It repeats the prior matching calendar-month levels while the
recorded evaluation year has a higher revenue level. That is poor historical
benchmark performance, not a demonstrated WAPE calculation defect or explanation
of the commercial cause. The UI now reports the evaluated period/origin, signed
actual/prediction totals on matching pairs, under/overforecast counts and the
selected benchmark's method. Keep all existing model selections/errors unchanged.

Buyer results can have different support: Government seasonal naive has a
missing origin-known comparison month in the checked source. Use the common-key
comparison table when comparing models; do not rank their different headline
populations as though all use identical observations. Missing months remain
unavailable. An empty Unknown selection clears charts/errors/export and shows
No observations. Future points remain unavailable without their published
contract; PHP evidence remains separate from physical medicine demand.

The separate stored company-PHP research and its frozen selection/evaluation
remain intact. Newly exposed buyer benchmarks do not establish lower errors,
future forecast accuracy, a new champion or operational replenishment.

## 2027 longer-horizon exploratory comparison — 17 October 2026

The [registered run and decision](../outputs/forecast_2027_experiment_20261017/REVIEW.md)
provide an isolated leads13–24 runner, eight fixed recipes, overlapping origin
comparisons, saved selection, explicit warnings and research-only2027 projection.
Use the exact prepare/run commands there with a new empty output directory;
protocol/input/code/runtime changes invalidate the registration. Do not relax
the original12-month contracts or reuse their error as2027 performance.
The frozen seasonal-naive choice has66.85%WAPE on the later-origin2025 diagnostic,
so the analyst recommends retaining research/scenario status. This is not a
formal client threshold or model activation. No Databricks publication occurred.

## Evaluate a bounded error reduction revision

The [registered six-recipe experiment](../outputs/predictive_error_optimization_20261010/README.md)
adds recent medians, a fixed weighted median, seasonal median shrinkage and a
bounded origin-local absolute-loss calibration. These are exploratory methods
on the same company revenue target; they do not establish medicine demand.
The code deliberately supports the retained 2020–2025 window and five original
development origins. Changing that window or protocol requires a reviewed
revision. Register the recipes, source/comparison/code hashes and packages
before execution, using a new empty output directory:

```powershell
.\.venv-predictive\Scripts\python.exe -X utf8 -m services.analytics_service.predictive.robust_error_experiment --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output NEW_ROBUST_DIRECTORY --prepare
.\.venv-predictive\Scripts\python.exe -X utf8 -m services.analytics_service.predictive.robust_error_experiment --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output NEW_ROBUST_DIRECTORY
```

Each outer recipe needs 36 contiguous eligible origin-known months. Calibration
uses only complete inner quarterly origins and next-twelve-month targets known
by the outer origin, with a fixed 0.9–1.1 scalar bound. Retain the small dependent
inner support, learned scalars, traces and warnings. Missing or malformed output
leaves the entire fold unavailable. Do not drop difficult targets, clip signed
values or alter eligibility to improve a score.

Freeze the lowest-MAE complete new development recipe before the audit and
record qualification under the unchanged original gates separately. Retain all
trials and compare MAE/PHP and WAPE/% on identical keys within each cohort.
The earlier development and 2025 audit were already inspected: this supplement
is exploratory and cannot produce an untouched test. Stop after the registered
six recipes; do not reselect from audit rankings or tune additional methods in
response to them. [Current state](CURRENT_STATE.md) records the mixed results.

The original model selection and annual projections remain intact. The new
run does not publish a model, produce 2026 accuracy or supply runtime fallback
values. Client tolerance, later accepted actuals and applicable source/model
acceptance remain separate requirements. See [verification](TESTING.md) and
the [complete same-cohort report](../outputs/predictive_error_optimization_20261010/RESULTS.md).

## Interpret the evaluated results

Use [the predictive explanation](logic/PREDICTIVE_ANALYTICS_EXPLAINER.md) for the
client question, executed model families, temporal validation, formulas and paper
wording. The [recomputed scorecard](../outputs/predictive_explanation_20261010/SCORECARD.md)
provides development-only family representatives, all model rankings, the twelve
2025 retrospective-audit months, over/underforecast amounts and actual calendar
lead mappings. Its [delivery record](../outputs/predictive_explanation_20261010/README.md)
retains numerical verification and source identity. It is a derivation of existing
predictions, not a new fit, model selection or approved release. Current status and
changing counts remain in [current state](CURRENT_STATE.md).

## Review error policy before business acceptance

The [guided error-policy record](OBJECTIVE_EVIDENCE_REGISTER.md#predictive-error-policy--10-october-2026)
defines joint MAE/PHP and WAPE/% reporting with provisional equal absolute-error
weights and explicit direction diagnostics. The
[error-policy packet](../outputs/predictive_error_policy_20261010/README.md)
derives the existing 21 recipes' development and retrospective-audit results
without fitting, reselection or publication. Its numerical QA binds the exact
saved populations and source artifacts.

The maximum cohort MAE and WAPE limits remain null. Capture the client's peso
amount and percentage together with the target, evaluation period, required
actual leads and intended decision before assessing business acceptability.
Both agreed limits must be met on that same cohort; a missing limit is not a
pass. Do not use prior audit errors as automatic limits or treat aggregate error
as each month's maximum. Retained 2026 projections lack actuals and receive no
accuracy assessment. A later cost-based revision needs its own frozen policy;
the original comparison criteria and selection remain intact.

## Read errors in dashboard outputs

The monthly evidence table and its CSV export report absolute error and signed
error in the selected target's units. Signed error is prediction minus actual:
positive is overforecasting and negative is underforecasting. A zero miss remains
zero. A monthly error is scored only for a historical backtest with finite
prediction and actual values whose backtest actual matches the displayed actual.
Missing, mismatched, history-only and future-period pairs remain unavailable with
an explicit reason; they are not replaced with zero.

Historical MAE, RMSE, WAPE and mean signed error use the selected gateway result's
evaluation cohort. The cards identify target units and the CSV retains the
historical evaluation period, protocol and scored count. These summaries can cover
more history than the displayed table. A future row carrying historical summary
columns does not have measured future-period error. Source, model, scope and
publication labels remain attached to each export. This presentation does not
load the offline 21-model scorecard into the live four-benchmark response.

Lower MAE/WAPE is preferable on the same targets and forecast leads. Assess model
usefulness against simple benchmarks and the client's agreed decision-specific
limits; there is no universal WAPE percentage that establishes acceptability.
WAPE is total absolute error divided by total absolute actual sales. For example,
10% means an aggregate absolute miss of ₱10 per ₱100 of absolute actual sales;
it is an illustration, not an approved limit or an accuracy percentage. See
[point forecast evaluation](https://otexts.com/fpp3/accuracy.html) and
[the WAPE definition and limitations](https://robjhyndman.com/hyndsight/wape.html).
The [output verification packet](../outputs/predictive_error_visibility_20261010/README.md)
records presentation checks; it does not establish model performance or client
acceptance. Current business tolerance status remains in [current state](CURRENT_STATE.md).

## Project from the latest annual release

The [annual projection packet](../outputs/predictive_annual_release_20261010/README.md)
uses the retained 21-recipe comparison to fit each recipe once through December
2025 and project January–December 2026. Monthly targets remain monthly even when
actuals are released yearly. This is a final-origin research fit, with inherited
selection and historical metrics; it neither repeats evaluation nor measures
2026 error. [Current state](CURRENT_STATE.md) owns executed counts and results.

Register before fitting, using a new directory for each execution:

```powershell
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive.annual_projection --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output NEW_ANNUAL_DIRECTORY --as-of 2026-10-10 --prepare
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive.annual_projection --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --output NEW_ANNUAL_DIRECTORY --as-of 2026-10-10
```

Use the actual current Manila reference date when reproducing. The run separately
records its actual UTC generation time; `--as-of` does not create a historical
issue date. The present module deliberately accepts this frozen comparison's
January 2020–December 2025 window and leads 1–12. A later source window needs a
new reconciled input and reviewed protocol, rather than silently extending it.
Input/comparison checksums, adapter code, packages, recipes and training values
must match registration. Partial, malformed, nonfinite or nonconverged adapter
results leave the entire recipe unavailable; signed predictions are preserved.

Output status is `annual_projection_research_unpublished`. Actuals and unsupported
80%/95% intervals remain null, and elapsed/current/future target labels reflect
the reference date. The report retains all configurations, prior evaluation
metrics and warnings. This format emits no release draft and is not an accepted
input to the existing warehouse candidate publisher. It is not a gateway fallback.

At the next annual source release, whose date remains unconfirmed, reconcile
the source and period closure, assess retained projections against accepted
actuals, and distinguish elapsed targets from targets future at generation.
Freeze any revised recipes and evaluation protocol before fitting. Preserve
issue dates, prior outputs and the inspected-audit limitation. Data/model
acceptance, business error tolerance, uncertainty and quantity/inventory
contracts remain separate requirements for operational use.

## Research access in the dashboard — 15 October 2026

The Forecast page has a separate stored-research panel backed by authenticated
`/api/sales/predictive-research`. It reads immutable candidate run payloads from
Databricks and verifies artifact/storage identity and the active descriptive
source before showing a comparison. See the [API contract](API.md#stored-predictive-research--15-october-2026).

Use the experiment, development/audit, cumulative lead and detail-model controls
to inspect same-case MAE/PHP, WAPE/%, bias and origin-keyed monthly errors.
Repeated target months from different origins remain separate cases. The CSV
preserves the selected source/run and evaluation scope. A separate evidence-stage
choice shows stored selected-model candidate projections with actual generation
timing and unavailable actual/errors; it does not issue a new forecast.

The stored-projection view also shows the prior-year calendar month, its frozen
recorded PHP baseline and **Forecast YoY change (%)**. This is the forecast's
relative change against a positive eligible prior-year observation. It is not
measured error or observed growth. The baseline comes from the exact immutable
input used by the selected run; the gateway verifies the content digest and
retains its separate storage hash. Missing, zero, negative or ineligible
baselines produce a null percentage and reason; signed raw baseline values are
preserved. Required warehouse/input-integrity failure makes the research panel
unavailable and disables export. No new fit, cutoff, issue date or accuracy
result is created. The projection CSV carries the same fields and provenance.

This read path does not publish a model or replace the approved-release adapter.
Stored candidate absence differs from source/integrity failure, which clears
the panel and disables export. The existing offline six-recipe optimization is
not automatically ingested or served as a local fallback. New experiments need
the controlled candidate-storage contract and applicable verification before
they appear. Research access does not waive operational model/data gates.

## Source review before another model revision

The [10 October continuation packet](../outputs/predictive_readiness_20261010/README.md)
retains the fresh read-only source check, original-to-eligible Net CP bridges,
independent QA and specific source-owner questions. [Current state](CURRENT_STATE.md)
owns its counts and readiness conclusion. No new accepted actuals or verified
origin-available explanatory feature was identified; the existing evaluated
models remain unchanged. Use [the source-owner review](../outputs/predictive_readiness_20261010/SOURCE_OWNER_REVIEW.md)
to bind timing explanations and any corrections to original records before
freezing a revised recipe. The inspected 2025 audit remains retrospective.

## Registered SARIMA and lag-regression extension

The [completed research delivery](../outputs/predictive_completion_20261009/README.md)
retains the original frozen comparison and adds an explicit exploratory suite.
Its model cards, warnings, origin-local folds, predictions, independent QA and
candidate-storage receipts are inspectable. [Current state](CURRENT_STATE.md)
owns the latest results and acceptance status; [study overview](STUDY_OVERVIEW.md)
connects this work to the original objectives.

Register a new experiment directory before fitting, then evaluate without changing
the registered input, code, environment, configurations or criteria:

```powershell
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive.extended_experiment --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --output NEW_EXPERIMENT_DIRECTORY --prepare
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive.extended_experiment --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --output NEW_EXPERIMENT_DIRECTORY
```

The optional suite adds two restrained SARIMA specifications and four regularized
lag recipes, direct and recursive at two fixed penalties. All transformations
fit origin-known training rows. Direct-model training targets end at the origin;
recursive unknown lags use the model's own predictions. The engine also enforces
the cutoff before calling an adapter. Missing observations are not imputed,
signed values are preserved, and SARIMA nonconvergence remains unavailable.

This suite emits `exploratory_evaluated_unpublished`, never an approved release
draft. Since it was designed after the old audit was inspected, later untouched
accepted actuals are needed for promotion. The original command below still
uses the original model grid. The candidate-persistence command accepts both
unpublished forms, verifies all declared artifact hashes and model/calendar
identities, and stores a deterministic hash for either source-identity format.
Data approval does not automatically approve the model. Candidate persistence
does not create reviews, release manifests or pointer writes.

## Current candidate — 9 October 2026

The [Gold-20 evaluation](../outputs/predictive_validation/2026-10-09T13-28-48-501Z/REVIEW.md)
refreshes the source binding and reproduces all 15 existing configurations.
The full input retains 2017–2025; training/evaluation uses the separately
attested contiguous 2020–2025 window. The prior user decision is inherited only
after [exact monthly target/provenance comparison](../outputs/predictive_validation/2026-10-09T13-26-49-490Z/training-inheritance-comparison.json),
with its original attribution and date preserved. It is not new independent
completeness verification or model publication approval.

Current frozen input:
`outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json`.
The offline evaluation and 21 contract tests pass. Last value remains unpublished;
no challenger qualifies, development WAPE is 83.199360%, and the 2025 retrospective
audit WAPE is 37.763644%. Fact identity refresh does not improve these unchanged
targets. No new warehouse persistence or model activation was performed.

Continue with source/order/price composition investigation and a documented
acceptable-error policy. Revised recipes require later untouched accepted actuals;
the already-inspected 2025 audit cannot become a new untouched holdout. Current
sales history ends December 2025, so a current October 2026 12-month view needs
leads 10–21 beyond the existing 1–12 evaluation. Medicine-unit forecasts require
verified SKU/unit inputs, and disease/weather regressors require accepted joins.

`07_predictive_contracts.sql` and `08_predictive_frozen_input.py` are parameterized;
they need no year/version edits solely for this source refresh. Their warehouse
deployment is separate from the completed local model evaluation below.

## Earlier checkpoint — 27 September 2026

Previously evaluated run: `outputs/predictive_validation/2026-09-27T14-30-12-921Z/REVIEW.md`.
The user provided training-only completeness attestation; all 15 configurations
now run, including Prophet 1.4.0 in `.venv-predictive`. Last value is selected but
recommended to remain unpublished due to high errors. Earlier missing-package and
training-blocked statements below describe the initial checkpoint.

Persist complete offline experiment evidence without publication from `backend/`:
`node --import tsx scripts/persist-predictive-candidate.ts PATH_TO_RUN_JSON`.
This verifies artifact hashes, stages all candidates and reads back every payload.
Warehouse experiment IDs are artifact-hash namespaced to avoid colliding with the
later selected-model publication representation. It does not create a review,
approve a release, or change the publication pointer.

The company-month target is eligible recorded `net_sales` (source `net_cost`),
in PHP, including signed returns and all financially eligible item kinds.
Databricks is the analytical source. Local artifacts are offline audit inputs;
the gateway never reads them as fallback data.

## Freeze and reconcile

To prepare an unsigned monthly decision artifact from a frozen input, run
`python -m services.analytics_service.predictive.prepare_coverage --input INPUT.json --output NEW_DIRECTORY`.
It verifies the input hash, writes a review table and leaves every decision unknown.
The extractor rejects malformed, mismatched and contradictory coverage decisions.
The user subsequently attested 2020–2025 completeness in this session; that
training-only decision is retained in `outputs/predictive_validation/coverage-review-v16/`.
It does not constitute independent verification or model publication approval.

From `backend/`:

```powershell
node --dns-result-order=ipv4first --import tsx scripts/extract-predictive-input.ts ../outputs/descriptive_validation/2026-10-09T07-40-39-615Z/evidence.json ../outputs/predictive_validation/2026-10-09T13-26-49-490Z/coverage-review.inherited-training.json
```

Use a new descriptive receipt for a new accepted source. The script verifies its
sidecar SHA-256, reads the exact fact Delta version, reconciles source counts and
monthly/yearly revenue in cents, and writes `input.json`, `input.sha256`,
`reconciliation.json`, `eligibility.json`, and `exclusions.json` under a timestamped
`outputs/predictive_validation/` directory. Independent transaction verification
counts are null when that field is absent in the pinned warehouse version.

The optional second file is a real coverage/acceptance receipt. It must bind
`dataset_id`, integer `fact_delta_version`, `descriptive_receipt_sha256`,
`reviewer`, `reviewed_at`, and `evidence_reference`. It carries explicit
`training_approved` and `publication_approved` decisions and a `periods` mapping
keyed by `YYYY-MM`, with `period_closed`, `coverage_status` (`complete`, `partial`,
or `unknown`) and, only where supported, `confirmed_zero_activity`.
Do not create approval from transaction presence or calendar closure. The current
receipt is still a business-review candidate; absent coverage leaves training blocked.

## Evaluate offline

From the repository root, substituting the generated input path:

```powershell
.\.venv-predictive\Scripts\python.exe -m services.analytics_service.predictive --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --output NEW_MODEL_DIRECTORY
```

The input sidecar checksum is required. The run records input/configuration/code
hashes, package versions, seed, runtime, exact fold populations, predictions,
metrics, model cards and artifact hashes. `--benchmarks-only` excludes challengers.
`--schedule reviewed-schedule.json` allows a reasoned schedule adjustment before
evaluation. Default: training starts January 2020, quarterly development origins
December 2022–December 2023, leads 1–12, and December 2024 origin for a 2025
**retrospective audit**. Coverage gates must pass. Selection uses development
results only and the blueprint's frozen experimental criteria.

Models: last value, seasonal naive, 3/6-month means, two additive seasonal ETS
variants and nine restrained sales-only Prophet configurations. Missing packages
produce unavailable candidates. The current predictive environment executes
statsmodels and Prophet; earlier missing-package statements are historical.
No actual champion is selected when input acceptance is blocked. Five development origins cannot supply the
required 20/40 errors per lead for 80/95% empirical intervals; null bands are expected.

## Warehouse preparation, publication and rollback

1. Deploy `databricks_updated/medshield_project/07_predictive_contracts.sql` through the
   controlled deployment process. This creates candidate tables and coherent
   release views; it does not activate a model.
2. The checked TypeScript deployment path is, from `backend/`:
   `node --import tsx scripts/deploy-predictive-contracts.ts input.json output-directory`.
   It applies additive DDL, persists the checksum-bound candidate input with an
   idempotent MERGE and verifies every stored payload. Alternatively upload the
   frozen artifact to a governed Unity Catalog Volume and run
   `08_predictive_frozen_input.py` with its path and byte SHA-256. It reconciles
   persisted candidate rows. This alternate notebook path is not cloud-verified.
3. An eligible evaluated run emits `release-draft.json`. Review its actual audit,
   selection, scope, completeness and data approval. Only an authorized review
   may change `publication_status` from `candidate` to `approved`. Compute the
   approved payload byte SHA-256 and bind it in a separate model review containing
   `review_id`, `run_id`, `dataset_id`, `artifact_hash`, `reviewer`, `decision`,
   `reviewed_at` and `evidence_reference`.
4. From `backend/`, prepare inspectable SQL without remote writes:
   `node --import tsx scripts/publish-predictive-release.ts approved-payload.json review.json preparation.json --prepare`.
   After review, the same command with `--activate` stages idempotent immutable
   run/point/evaluation/review/manifest rows, checks readback and changes one pointer.
   **Serialize publication jobs**; concurrent publishers are not supported.
5. Roll back by replaying the previous compatible approved payload and its exact
   review through the same validator/publisher. Its source versions stay visible;
   the reader never attaches newer descriptive actuals. The pointer records its
   predecessor. Cloud activation/rollback remains unverified until deployed.

At the initial deployment checkpoint, nine additive DDL statements were executed and 108 candidate input rows were
persisted and fully reconciled in Databricks. `warehouse-receipt.json` records
the DDL/input hashes and an empty model pointer. No training/model approval or
model activation was performed at that checkpoint. This training blocker was
subsequently superseded by user-attested acceptance and the full 15-configuration
evaluation recorded in the blueprint. Model publication remains unapproved.

## Monthly-refresh development experiment

Use the separately registered exploratory protocol; this does not replace the
fixed-origin release evaluation or consume 2025 observations as training targets.
From the root, run with a new output directory:

```powershell
python -m services.analytics_service.predictive.rolling_experiment --input <frozen-input.json> --output <experiment-directory> --prepare
python -m services.analytics_service.predictive.rolling_experiment --input <frozen-input.json> --output <experiment-directory>
```

Registration binds the input hash, code hashes, environment and frozen schedule
before evaluation. January 2023–December 2024 targets are shared across annual
fixed-origin and monthly one-step schedules; each adapter receives only history
through its origin. Incomplete models cannot shrink the complete-model scoring
population. Results include per-year scores and missing predictions. The command
refuses changed registration or replacement of existing result files. It writes
local exploratory evidence only; there is no automatic selection or publication.
Historical source availability remains an assumption because the input is a revised
snapshot. The experiment was proposed after inspecting the old audit; any resulting
new recipe needs a later untouched evaluation.

## Verification

For a frozen error assessment, run
`python -m services.analytics_service.predictive.diagnose --run <run-directory>/run.json --output <diagnosis-directory>`.
Optionally supply `--composition <diagnosis-directory>/composition.json`, produced
from `backend/` with
`node --import tsx scripts/extract-predictive-composition.ts <frozen-input.json> <diagnosis-directory>`.
The extractor reads the pinned fact version and reconciles monthly counts/revenue;
the diagnosis checks hashes and source identity. Composition attribution currently
assumes the selected last-value method. It explains recorded changes, not causation.
The September 27 completed assessment and limitations are in
`outputs/predictive_validation/2026-09-27T14-30-12-921Z/diagnosis/FINDINGS.md`.

From root: `python -m unittest services.tests.test_predictive services.tests.test_forecast_validation`.
From backend: `node --import tsx --test tests/forecast*.test.ts tests/predictiveRelease.test.ts`
and `node node_modules/typescript/bin/tsc --noEmit`.
From frontend: `node node_modules/@playwright/test/cli.js test e2e/forecast-validation.spec.ts --workers=1`
and `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
Live authenticated checks: `node node_modules/@playwright/test/cli.js test e2e/predictive-live.spec.ts --workers=1`.
Do not run a frontend production build while `next dev` owns `.next`.

Fixture checks prove contracts, leakage safeguards and display parity, not model
accuracy or cloud deployment. See the blueprint milestone record and timestamped
predictive evidence directory for actual outcomes and unresolved checks.


## External context and evidence guards — 20 October 2026

The [scoped source/formula audit](../outputs/analytics_external_audit_20261020/README.md) independently recomputes saved scores and retains model selection/windows. External context is available in the existing authenticated regression response even when `status=blocked`; co-observed months are not approved training joins. Private/Quezon is the default revenue pilot. No external fit is activated: station mappings, 2025 official weather and DOH reporting/revision timing remain dependencies. Scores reject nonfinite values; common-key comparisons reject inconsistent actuals; interval calibration rejects contradictory duplicates or mixed-model evidence at one key. Identical repeated calibration points still cannot inflate support. Saved runs are unchanged; no new future accuracy is established.
