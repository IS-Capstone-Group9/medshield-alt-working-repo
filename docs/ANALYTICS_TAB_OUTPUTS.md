# Analytics presentation and tab outputs

## Current explanation and production QA — 5 November 2026

The [model and four-layer guide](MODEL_EXPLAINER.md) connects the descriptive,
diagnostic, predictive and prescriptive decision questions to the proposed
objectives, supported findings, model results and remaining owners. The
[evidence matrix](ANALYTICS_EVIDENCE_MATRIX.md) retains exact criterion-level
traceability. Main manuscript revision and actual client review remain deferred.

The [current local production QA](../outputs/current_integration_20261105/README.md)
records a repaired optimized CSV-helper binding and passing native output,
source recovery, model-readout, keyboard and responsive cases. Its 40 cases
comprise 20 authenticated live and 20 isolated/pure checks, with separate
gateway/numerical verification. This guide update inherits that dated execution;
it does not rerun the application or change analytical calculations.

## Current authenticated verification — 2 November 2026

[Current local live evidence](../outputs/live_dashboard_acceptance_20261102/README.md)
now checks the nine pages, native outputs, source-recovery and responsive/keyboard
contracts against configured Gold. Readout `dd` elements retain native
definition-list semantics with `aria-live=polite`; forecast headings use the
primary text color for contrast. These repairs do not change calculations or
source/model/publication contracts. Actual human/full-release acceptance remains
separate from the named local passes.

Implemented 2 November 2026. A compact companion appears on the nine dashboard
pages: Overview, Sales Diagnostic, Product Prioritization, Area Prioritization,
Forecast Modeling, Prescriptive Planning, Data Source, View Sales Data and
Weather API Validation.

The companion explains the decision question and evidence type, mirrors current
visible source-backed readouts, links to relevant sections, and provides access
to existing outputs. Analytical calculations, source readers, model selection,
filters and approval contracts retain their existing implementation.

## Presentation and downloads

Overview opens with the recorded sales trend. The four analytics cards link to
their next actions and keep their chart previews closed. Buyer sector change
and additional sales patterns are available on demand.

Forecast opens with monthly validation and places estimates after the chart.
Historical forecast research opens one study at a time. Products leads with
the ranking and searchable table, followed by disclosures for commercial
review, concentration and retrospective ABC research. The export menu keeps links and native
downloads available from those sections. It also holds "Investigate recorded sales
for selected dates" on Overview, Products and Area.

A finding inside a closed section is not treated as displayed, so it is left out
of the header readout and the displayed-summary download. Its export stays
available. The one exception is Forecast's "Evaluation scope", which the panel
keeps in a closed method note, so the header is where it shows. The Products table shows ten rows per page; its export still covers
the full selected cohort.

| Page | Readout and output meaning |
|---|---|
| Overview | Recorded performance/change and trend output; forecast and planning retain their separate scopes. |
| Sales Diagnostic | Selected one of seven analytical outputs; current visible contribution/territory/movement/quantity/STL/external readout where available. Hidden panels do not supply its current finding. |
| Product | Commercial finding and suggested next check; source-row export and separate ABC model-evaluation outputs. |
| Area | Confirmed-area finding, coverage and unallocated evidence; source-bound area-review export. |
| Forecast | Historical model/target/window context and current performance message; separate native company, regional and unit-research downloads. |
| Planning | Entered scenario result and scope; solved-plan, draft-input and dated-review outputs retain different meanings. |
| Data Source | Serving source versus intake/review candidate; templates and review reports do not approve publication. |
| View Sales Data | Matching-record status and financial reconciliation; native financial export covers all matching ledger pages. |
| Weather | Provider-observation status and coverage. A displayed summary is available; no new weather-observation CSV is claimed. |

Every page can download a JSON snapshot of its current displayed readouts when
source evidence and a visible readout are available. The filename identifies it
as a displayed summary. It includes the tab, capture time in Asia/Manila, scope
note, evidence type, interpretation and provenance notice. Source identity is
explicitly null because the text snapshot cannot reconstruct each underlying
panel's source/run/assumption identity; use the native source-specific export
for the complete values and provenance. Exporting the snapshot grants no approval.

Native output shortcuts query the current control at click time and honor its
disabled, hidden and aria-disabled state. A hidden Sales sub-panel must be opened
and its evidence loaded before its output shortcut becomes available.

## State and runtime contracts

- Waiting/unavailable source state clears the companion's values and disables
  its actions. Existing root failure behavior still removes all analytical UI.
- Current text is mirrored using textContent, preserving zero, missingness,
  signed amounts and unavailable messages without recalculation or HTML injection.
- Source, output, panel and control changes refresh the companion. A later click
  rechecks the current native control rather than retaining an old result.
- Fixed research scopes and explicitly entered planning assumptions are labelled
  separately from ordinary Analysis filters.
- Installation is idempotent. Disposal removes companions, observer, event
  listeners, pending animation frame and its style element.
- New actions use DOM listeners. No inline handler/global bridge was added, and
  sidebar pseudo-elements were not changed.

## Implementation and verification

[analytics-output-hub.ts](../frontend/services/api/analytics-output-hub.ts) owns
the presentation definitions and lifecycle. The [dashboard hook](../frontend/hooks/use-dashboard-runtime.ts)
installs it after the existing panels. The Product creator supplies the stable
productPriorityExport ID to its existing source-backed export control.

[Focused browser coverage](../frontend/e2e/analytics-output-hub.spec.ts) checks
the nine assembled pages, missing/zero text, visible-panel changes, native export
states and current run, actual summary downloads, injection safety, reinstall/
disposal and 1440/824/390-pixel layouts. These are isolated browser fixtures,
including actual base/runtime page markup and application global typography;
they do not establish a signed-in live Databricks or complete-release pass.

The [turn evidence packet](../outputs/tab_analytics_and_paper_20261102/README.md)
records the actual checks and remaining limits.

## Paper companion

The [Chapter 1–5 objective-change guide](chapters/MedShield_Objective_Change_Chapter_1_to_5_Guide_20261102.md)
supplies location-specific proposed changes and replacement text. It preserves
the original manuscript/objective register and distinguishes the current local
PDF pagination from older uploaded versions. A final manuscript must use actual
source-bound screenshots and results; isolated fixture images are not study results.
