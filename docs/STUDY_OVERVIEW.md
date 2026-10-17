# MedShield study overview

## Current descriptive/predictive completion boundary — 17 October 2026

The [completion card](../outputs/analytics_finish_20261017/README.md) maps the
implemented descriptive, diagnostic and21-configuration company-PHP research
methods to fresh source/API/browser/export checks, measured historical error and
remaining original objectives. It supersedes older configuration availability
summaries for this bounded runtime scope. Original objective acceptance remains
governed by the objective/evidence register; research workflow completion does
not establish medicine-demand forecasting or operational approval. Supabase
supports Auth/roles/audit; Databricks remains the analytical source. Release/
backup work is separate from presenting the supported analytical results.

Evidence reviewed: **9 October 2026, Asia/Manila**. This overview explains the
study, its implemented capabilities and its remaining evidence requirements.
[Current state](CURRENT_STATE.md) owns changing release identities and readiness;
the [objective/evidence register](OBJECTIVE_EVIDENCE_REGISTER.md) preserves the
original academic commitments. Dated earlier assessments remain historical.

## Study purpose and business problem

**Paper source clarification — 16 October 2026:** the user-confirmed latest post-defense Chapters 1–3 is byte-identical to [CapstonePaper_1.pdf](../references/CapstonePaper_1.pdf). The previous `PRIVATE_SUMMER` reference below identifies the manuscript used by the dated 9 October overview, not the latest source after this clarification. See the [paper revision guide](PAPER_REVISION_GUIDE.md) and [complete revised Chapters 4–5](chapters/MedShield_Chapter_4_5_Revised_20261016.md) for the current writing handoff.

MedShield is an enterprise decision-support capstone for pharmaceutical
distribution and inventory planning in the Philippines, focused on
**CALABARZON, MIMAROPA and Bicol**. Its central question is how historical sales,
product and territory patterns can improve planning visibility and support
inventory decisions under seasonal disease and weather conditions.

The business needs to understand what sold, where revenue and gross margin came
from, which products or areas deserve review, how uncertain future sales are,
and what a constrained planning scenario would imply. Sales records, contract
labels, product aliases and mixed geographic/customer labels require cleaning
and interpretation before they can answer those questions consistently.

The original general objective is an integrated descriptive, predictive and
prescriptive DSS by December 2026 to improve demand visibility and reduce
expiry-driven wastage. The implemented system supplies historical evidence,
forecast comparisons and planning scenarios. Demonstrating reduced wastage,
stockouts or procurement cost requires additional operational measurements.

The main users are analysts who validate data and evaluate models; planners
who compare priorities and enter assumptions; executives and reviewers who
interpret results and provenance; and administrators who manage access and
integration. The CEO owns client business acceptance; adviser/panel acceptance
is a separate academic decision. See [business analysis](BUSINESS_ANALYSIS.md).

The [manuscript inspected for the 9 October overview](../references/PRIVATE_SUMMER_CAPSTONE_2%20-%20GROUP9_ISB.pdf)
proposes **CRISP-DM + SEMMA**: business/data understanding, preparation, modeling,
evaluation and deployment, with sampling, exploration, modification and assessment
inside the modeling work. The implemented evidence follows that progression through
source profiling, governed transformation, time-ordered experiments and reviewed
publication. Naming a methodology does not establish deployment or outcome success.

## Original objectives and current fulfillment

These are summaries of the five original paper objectives indexed in the
[objective/evidence register](OBJECTIVE_EVIDENCE_REGISTER.md#original-objectives-mapped-to-execution).
They preserve the original promises rather than replacing them with narrower
implemented features.

| Original objective | Current supported result | Remaining difference |
|---|---|---|
| **O1:** Analyze 2021–2025 regional sales performance, territory YoY and STL across the three regions. | Reconciled historical financial reports, matched-period comparisons and monthly company-revenue STL. Current project reporting now covers 2017–2025. | Verified territorial/unit scope, the promised daily territorial decomposition or accepted amendment, and final release/scope acceptance. |
| **O2:** Prioritize territories/accounts and SKUs using volume, revenue, growth, Pareto and XGBoost ABC/slow-mover analysis. | Source-label Pareto and deterministic observed ABC, mapped-area reporting and commercial priority sensitivity. | Reviewed SKU/pack/unit and account identities, approved mappings, supported slow-mover interpretation, and evaluated future ABC classification or accepted amendment. |
| **O3:** Forecast territorial pharmaceutical demand from December 2026 onward using Prophet, disease/rainfall indicators and XGBoost urgency. | Time-ordered company net-sales/PHP benchmark, ETS and Prophet evaluation with measured errors. | Verified SKU/territory quantity targets, current accepted history or supported longer leads, origin-safe external joins, defined urgency labels and scoped model release. |
| **O4:** Apply EOQ, ROP and weighted allocation to inventory planning, with expiry wastage at or below 5%. | Commercial scoring and entered feasible/infeasible allocation scenarios. | Inventory/expiry/supplier/cost inputs, the agreed optimization objective and measured outcome evidence. The 5% value remains a target. |
| **O5:** Deliver five governed DSS modules with CSV validation, Signal-2 alerts and collaborative product-region matching. | Dashboard module areas, controlled historical ingestion, authenticated reporting and exports. | Complete client submission/retry/correction/publication flow, evaluated matching, and an official warning source or accepted scenario scope. |

Descriptive technical delivery is the strongest completed local candidate
milestone. No current evidence closes every criterion of any full original
objective. This is an acceptance statement, not a claim of zero engineering
progress. The user confirmed 2017–2025 as the current project reporting scope;
any manuscript amendment to the original scope still needs its academic record.

## Data and measurement scope

The current historical sales population covers **January 2017–December 2025**:
**37,728 Gold source records, 108 calendar months and 98 observed months**.
Ten months have no observations: May–August and October 2017,
January–February 2018, and October–December 2019. Missing observations remain
unknown; they are not zero sales. Activity in every month of a later year does
not independently establish source completeness.

Financial definitions follow the recorded client decisions:

- **Net CP / `net_cost`:** net sales revenue.
- **Total TP / `total_trade_price`:** acquisition cost.
- **Workbook `net_income`:** supported transaction gross margin/profit.
- **Weighted margin:** eligible gross margin divided by net sales from those
  same margin-eligible records.

Operating expenses are absent, so company net profit is unavailable. Recorded
quantities describe fulfilled sales in source units; they do not establish total
market demand or comparable medicine units. Category acceptance does not approve
sellable identity, pack size or unit conversion. Contract-name rows and adjusted
allocations retain estimated provenance, including adjusted 2020/2024/2025 source
evidence. Reconciled totals do not independently verify allocated product mix.
See [business definitions](BUSINESS_DEFINITIONS.md).

External sources have distinct scopes. Supplied PAGASA history covers 2017–2024;
official 2025 observations are absent. DOH files declare 2018–2026, with partial
2026 observations; sales overlap ends in 2025. NASA POWER and prepared Open-Meteo
archive alternatives are provider-derived weather proxies. Approved geographic
mapping and feature availability at forecast issue time are required before
using these sources as regressors. Partial disease data and historical proxies
do not supply live official alerts.

## System architecture and data workflow

The [architecture](ARCHITECTURE.md) and [decisions](DECISIONS.md) define the
following boundaries:

1. Controlled Databricks ingestion preserves source files, hashes and lineage in
   **Bronze**. **Silver** parses and assesses records with acceptance, warning
   and rejection evidence. **Gold** creates candidate facts, aggregates and
   stable application bridge views.
2. The **Express/TypeScript gateway** authenticates requests, queries bounded
   Gold contracts and owns caching and provider refresh orchestration.
3. The **Next.js/React/TypeScript dashboard** presents filtered charts, tables,
   provenance, investigation views and exports through that gateway.
4. **Supabase Auth and application tables** provide production identity, linked
   roles and audit persistence. They do not provide dashboard measures.
5. **Offline Python jobs** prepare and evaluate analytical methods. Dashboard
   requests do not synchronously train models or start Python services.

The sales path is governed Databricks publication. `POST /api/sales/upload`
currently returns `409 DATABRICKS_INGESTION_REQUIRED`; a complete client upload
workflow cannot be claimed from a visible upload control. Required analytical
source failure produces an explicit unavailable state. Repository snapshots,
seeds, mock data and Supabase analytical tables never replace missing Gold values.
Credentials remain server-side. Detailed contracts are in [database](DATABASE.md),
[API](API.md), [security](SECURITY.md) and the
[Databricks project guide](../databricks/medshield_project/README.md).

Current screens include Overview, Sales Diagnostics, Product Prioritization,
Area Prioritization, Forecast Modeling, Prescriptive Planning, Data Upload,
View Sales Data and Weather API Validation. Screen availability and accepted
end-to-end capability are separate evidence.

## Four analytical layers

| Layer | Study question | Implemented method and interpretation |
|---|---|---|
| **Descriptive** | What happened? | Financial summaries, coverage-aware trends, matched-period YoY, source-label/category contribution, Pareto/ABC and monthly company STL. |
| **Diagnostic** | Where did a change or error arise? | Signed contribution analysis, period comparisons, source/eligibility drill-down and forecast-error decomposition. These localize movements; they do not prove a disease, weather or contract cause. |
| **Predictive** | What future value can be estimated, with what error? | Sales-only benchmarks and fitted ETS/Prophet challengers evaluated on common time-ordered keys. Current target is company net sales in PHP. |
| **Prescriptive** | What would a reviewed planning choice imply? | Commercial score sensitivity and allocation scenarios using entered demand, stock, pack, budget and supplier-limit assumptions. |

Observed ABC is calculated directly from positive sales contribution; reproducing
current classes with ML adds no necessary prediction. Future ABC or urgency ML
requires a reviewed forward target and temporal evaluation. The active allocation
algorithm is bounded greedy and reports infeasible or unsolved cases; it is not
proof of globally optimal MCDA-weighted procurement. EOQ, ROP, safety stock and
expiry targets require separate verified inputs and validation.

## Descriptive findings for the full project period

The [full-history findings](../outputs/descriptive_activation_20261009/full_history_2017_2025/STUDY_FINDINGS.md)
bind the following results to Gold fact **20** and authenticated exports:

| Measure, 2017–2025 | Result |
|---|---:|
| Eligible signed net sales | **₱626,946,741.81** |
| Supported gross margin amount | **₱288,487,498.72** |
| Matching margin-eligible sales basis | **₱478,720,670.03** |
| Weighted margin over that supported basis | **60.26%** |
| Financially eligible source-label reporting groups | **4,491** |
| Medical / Non-Medical / Unclassified sales shares | **57.80% / 3.40% / 38.80%** |

The margin-eligible basis covers **76.36%** of eligible net sales. The 60.26% rate
therefore describes that supported population. Accepted catalog reporting
dispositions cover **4,561 labels**, including medicine, medical supply, medical
equipment, non-medical and explicit Unclassified. The smaller export population
has different financial eligibility; neither count is a verified SKU count.

Candidate ABC assigns **442 A labels, 932 B labels, 3,097 C labels and 20 labels
without positive contribution**. Their positive-sales shares are 80.02%, 14.99%
and 4.99% for A/B/C. Negative financial adjustments of **₱1,622,699.58** are kept
separate from the **₱628,569,441.39** positive-sales denominator. They do not
establish physical returns.

Recorded 2025 net sales are **₱185,396,821.04**, or **29.57%** of project net sales.
The adjusted source retains allocation limitations; the large increase over 2024
cannot establish disease-driven demand or verified product/territory growth.
Early annual comparisons must disclose their missing months. Published STL uses
the separate contiguous **January 2020–December 2025, 72-month** company-revenue
series. It describes trend, seasonality and residuals without establishing
territorial decomposition or disease causation.

## Predictive models and evaluation evidence

The [Gold-20 frozen evaluation](../outputs/predictive_validation/2026-10-09T13-28-48-501Z/REVIEW.md)
reproduces **15 configurations**: last value, seasonal naive, recent three- and
six-month means, two ETS specifications and nine Prophet configurations.
Training/evaluation uses the separately user-attested contiguous **2020–2025**
window. The fact-20 rebind exactly matches the earlier target/count/provenance
records; it preserves the original training-only attestation and does not grant
publication approval.

Five development origins from December 2022 through December 2023 each predict
leads 1–12, providing 60 common development predictions per model with targets
ending by December 2024. Selection uses development evidence. December 2024
predicts twelve 2025 months for a **retrospective audit**: that year was already
inspected and is not an untouched final test. Each fit uses only history through
its origin; the revised source snapshot lacks historical availability vintages.

| Model family | Development WAPE | 2025 retrospective-audit WAPE |
|---|---:|---:|
| Last value | **83.20%** | **37.76%** |
| Seasonal naive | 93.90% | 72.89% |
| Recent means, 3/6 months | 95.13% / 93.51% | 59.63% / 68.14% |
| ETS, no trend / damped trend | 92.74% / 100.30% | 67.97% / 67.49% |
| Nine Prophet configurations | 93.54–94.97% | 72.11–72.61% |

Last value remains the unpublished development-selected benchmark. Its audit
**MAE is ₱5,834,383.00**, **RMSE ₱6,956,031.72** and normalized signed bias
**+8.38%**, meaning overforecasting on average. No challenger qualifies under the
frozen development rules. Lower audit WAPE coexists with larger peso error
because actual sales are larger; it does not prove a reliable planning model.
Independent metric recomputation and 21 contract tests support calculation and
protocol correctness, separately from predictive usefulness.

A [separate exploratory extension](../outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/RESULTS.md)
completed **21 configurations**, adding two SARIMA and four direct/recursive
regularized lag-regression models on the same schedule. No challenger qualifies.
The best new SARIMA has **87.88% development / 63.38% audit WAPE**; the four
regression variants have **106.55–120.21% / 69.81–73.32%** respectively. The
[independent verification](../outputs/predictive_completion_20261009/qa/extended-verification.json)
reconciles 441 metric groups. Designed after the audit was inspected, this
extension cannot supply a new untouched test or model approval.

The [delivery record](../outputs/predictive_completion_20261009/README.md) confirms
all 21 evaluations and 1,524 predictions were retained as Databricks candidates;
the publication pointer remains empty and unchanged.

Only five development errors exist per lead, below the existing interval support
rules, so uncertainty bands remain unavailable. History ends in December 2025.
In October 2026, the current month is **lead 10**, and a twelve-month current view
needs **leads 10–21**, beyond the existing 1–12 experiment. Software support for
future dates does not supply newer actuals or longer-lead validation. Model
publication, medicine-unit forecasting and external-regressor acceptance remain
separate in [predictive operations](PREDICTIVE_OPERATIONS.md).

## Defensible paper conclusions and completion work

**Chapter 4** can report the implemented architecture, controlled ingestion,
financial definitions, category/source-label treatment, reconciled descriptive
results, monthly STL, investigation workflow, actual model comparisons and tested
planning scenarios. Figures, tables and exports should retain selected period,
source/version identity and observed/derived/estimated/proxy/forecast/scenario
status. Retain failed attempts and distinguish fixture tests from authenticated
integration checks. See [testing](TESTING.md) and the
[Chapter 4 checklist](../outputs/descriptive_activation_20261009/CHAPTER4_CHECKLIST.md).

**Chapter 5** can conclude that MedShield supplies a traceable historical evidence
base and transparent evaluation, while the current models have material errors
and the data does not yet support the original operational demand/expiry claims.
Required follow-up includes reviewed SKU/pack/unit and territory/account evidence;
later accepted actuals and an agreed error policy; disease/weather mapping and
issue-time availability; inventory, supplier, lead-time and expiry feeds; measured
outcomes; and final business/academic acceptance. Revised recipes need later
untouched evaluation rather than relabeling inspected 2025.

Do not claim achieved expiry reduction, optimal procurement, calibrated official
alerts, verified clinical demand or approved current 2026 forecasts. Proposed
scope revisions remain proposals until recorded acceptance. The
[paper revision guide](PAPER_REVISION_GUIDE.md) maps individual method promises
and manuscript corrections without silently removing them.

Documentation method: Technical Writer guidance and repository documentation,
technology-stack, analytics-frameworks, testing and security skills informed
source reconciliation, metric wording, temporal evidence limits and architecture
boundaries. This document consolidates inspected evidence; it does not represent
a fresh rerun of the cited application or model suites.
