# Analytics Jobs

## Sales/external candidate jobs — 30 October 2026

See the [execution status](../../../docs/SALES_EXTERNAL_IMPLEMENTATION_STATUS.md)
for actual completed checks and remaining package gates. All jobs run offline
from the repository root with `python -m services.analytics_service.jobs.<name>`;
use `--help` for exact arguments. They do not supply runtime analytical fallbacks.

| Job | Inputs / output |
|---|---|
| `run_territorial_forecast` | Fresh source-validated regional capture → register, then execute eligible regional PHP lead-1/3/6 comparisons, coverage and actual-clock prospective gate record; no territorial-unit inference or runtime activation. See [evidence](../../../outputs/wp4_territorial_research_20261031/README.md). |
| `run_regional_summary` | Retained regional Gold capture → annual/coverage/strength CSVs and figures. Frozen 36-month STL rule retained. |
| `report_priority_readiness` | Retained assessed SO2 capture → signed financial ABC and explicit unavailable XYZ/account readiness. |
| `report_forecast_metrics` | Source, registration and retained forecasts → origin-local MASE and paired monthly DM; no fit or reselection. |
| `run_sales_external_tournament` | Register then execute a separate 22-recipe lead-1/3/6 retrospective study; existing frozen protocols/operational pointer unchanged. |
| `run_external_surge_evaluation` | Explicit reviewed unit/clinical/geographic cohort → same-case external ablations and validation-threshold surge evaluation. Fixture and real research statuses are separate. |
| `run_solver_parity` | Five synthetic proof cases → actual gateway TypeScript, SciPy and PuLP/HiGHS comparison against exact enumeration. |
| `run_milp_frontier_and_hand_checks` | Same-unit budget/capacity scenarios → actual gateway weighted/balanced methods, SciPy/PuLP models and enumeration. Synthetic input or hash-checked BUPIRIGHT mode; assumed inventory/throughput is not operating fact. |
| `report_abc_evaluation` | Frozen retained cases → per-class/cohort and validation-only reliability reports; no refit. |
| `build_account_and_abc_xyz_review` | Explicit assessed records and reviewed alias map → noninflating account/ABC-XYZ candidate review. |
| `run_diagnostic_drivers` | Bound matched-period unit cohorts, fitted residual segments and scoped monthly external cohorts → exploratory diagnostic JSON. |
| `report_residual_anomalies` | Retained validated components → robust residual flags; DR, PVM and external-cohort gaps remain explicit. |
| `report_unit_pvm` | Retained source plus exact BUPIRIGHT unit confirmation → matched April–September 2025/2026 signed accounting bridge and source ledger; no company-wide or causal claim. |
| `report_anomaly_ledgers` | Fresh read-only pinned Gold capture plus hash-matched residual report → signed monthly controls, top five exact area/DR groups and full ledger; no customer merge or causal claim. |
| `run_eoq_rop_sensitivity` | Explicit scenario inputs and opt-in register grids → scenario JSON/CSV, source/code/register hashes. |
| `run_inventory_simulation` | Complete unit-reviewed monthly history (or explicit synthetic fixture), policies and A1–A7 → simulated Monte Carlo JSON/CSV. No default company inputs. |
| `run_ahp_mcda_sensitivity` | Explicit twelve-month/common-month financial criteria, reviewed disease linkage, DII scale and AHP matrix → normalized rankings and 31 sensitivity probes; separate synthetic and declared-reviewed modes. `--readiness-source` keeps unbound actual company criteria unavailable. No weight/clinical/operational approval. |
| `run_unit_planning_pilot` | Exact retained BUPIRIGHT source/user confirmation → fixed 12-month training/six-month retrospective simulation and 2,500 EOQ/ROP scenarios. No territorial, inventory-burn-in or approved forecast/DII claim. |
| `plot_unit_planning_pilot` | Executed pilot/sensitivity tables → static scenario figures retaining short-window and assumed-input wording. |
| `report_unit_forecast_consequences` | Frozen unit-baseline protocol/candidate → all-method lead-1/3 error translations using fixed training-only daily rate/acquisition value; no selected method or measured loss. |
| `evaluate_early_warning_signals` | Explicit origin-aligned signal/event records → retrospective confusion metrics; fixed next-month horizon, no official live warning. |

`python -m services.analytics_service.external_indices --help` exposes the separate
DII/RSI helper; `python -m services.analytics_service.collaborative_recommender --help`
exposes reviewed-account temporal recommendation evaluation. Actual known release
dates can delay availability; modeled publication lag does not verify historical
vintages. Scenario register values never automatically populate dashboard fields.

## Executed SO1 monthly primary / daily sensitivity — 25 October 2026

`run_so1_policy.py` implements monthly recorded-sales baseline, conditional daily
calendar/annual STL and a frozen hypothetical missed-sales stress. Original
nulls, signed values, source/mapping identity and adjusted provenance remain
intact; unknown whole months and ineligible-only days split fitting. The
[executed packet](../../../outputs/so1_policy_execution_20261025/README.md)
owns parameters, scope, actual fits, comparisons, paper insert and checks.
It is offline evidence, never a runtime fallback or model-publication decision.

`extract-so1-baseline.ts` now defaults to available 2017–2026 history. Pass
`--original-window` for the original 2021–2025 extraction consumed by the older
`run_so1_baseline.py`; that job intentionally rejects full-history receipts.
Use a new extraction directory to preserve existing checksum-bound receipts.

## Original SO1 baseline — 25 October 2026

`run_so1_baseline.py` consumes the checksum-bound read-only extraction from
`backend/scripts/extract-so1-baseline.ts`. It reconciles the original 2021–2025
daily/area aggregates to independent monthly/yearly controls, preserves unknown
dates and mapping evidence, and computes matched-month exact-label YoY plus
monthly STL only on adequate contiguous history. It produces offline evidence,
never runtime values, geographic approval or daily zero filling. See the
[executed results, commands and COO dependencies](../../../outputs/so1_completion_20261025/README.md).
Original daily territorial STL and forecast linkage remain open; financial
scope approval does not approve medicine units or delivery attribution.

## Paper-model evidence boundary — 24 October 2026

The [direct paper review](../../../outputs/paper_analytics_closure_20261024/PAPER_REQUIREMENTS.md)
distinguishes current financial research from the original medicine/territory,
DII/RSI, ABC-classifier and urgency requirements. Historical jobs in this folder
are not evidence of completing those tasks. In particular,
`evaluate_prophet_xgboost.py` uses simulated rainfall and preprocessing across the
full series before its split; do not run it to claim accepted external-regressor
or leakage-safe forecast skill. Its XGBRegressor is not an ABC classifier.
Current evaluated company-PHP research uses the source-bound offline package in
`services/analytics_service/predictive/`; its actual limits remain explicit.

## Dataset Certification Candidate

Run:

```powershell
python -m services.analytics_service.jobs.certify_sales_dataset
```

This reads all nine yearly CSV files together so cross-file duplicates and the
2018-dated rows inside the 2019 source are evaluated without replacing either
source. It writes a versioned manifest, reconciliation report, and ignored
compressed audit candidate under `data/medshield/certification/`. The output is
blocked from publication until P2 financial reconciliation and formal reviewer
approval are complete.

Then run the P2 financial comparison:

```powershell
python -m services.analytics_service.jobs.reconcile_financial_metrics
```

This compares both plausible source-column mappings against workbook
`net_income`, emits row-level financial-quality flags, and keeps dashboard
financial publication blocked until the business/finance owner approves the
field semantics and mismatch disposition.

Build the P3 master-data candidates and coverage report:

```powershell
python -m services.analytics_service.jobs.build_master_data_candidates
```

Only explicitly approved mappings can enable product forecasting or territory
weather joins. Proposed, needs-review, and unmapped values remain blocked.

This folder contains repeatable local jobs for the MedShield model computation workflow.

## Descriptive Analytics

Current dashboard and Chapter 4 reporting use Databricks Gold through the TypeScript gateway. Validate the chosen fact release from the repository root with configured server-side Databricks credentials:

```powershell
Push-Location backend
$env:DATABRICKS_DESCRIPTIVE_FACT_VERSION = '20'
node --dns-result-order=ipv4first --import tsx scripts/validate-descriptive.ts
node --dns-result-order=ipv4first --import tsx scripts/publication-readiness.ts
Pop-Location
```

Fact 20 is the 9 October 2026 validated candidate, not an instruction to choose an unvalidated future version. Consult [Current state](../../../docs/CURRENT_STATE.md) for the selected release. The validators are read-only and write receipts under `outputs/descriptive_validation/` and `outputs/publication_readiness/`. They do not activate a saved backend configuration, establish authenticated dashboard acceptance, or grant business approval.

Notebook [06_sales_stl.py](../../../databricks_updated/medshield_project/06_sales_stl.py) publishes the company monthly PHP-revenue decomposition after Gold and the bridges. Its candidate components must match the selected fact identity. This is historical decomposition, not a forecast or verified SKU-demand output.

The legacy `run_descriptive.py` job and its `outputs/descriptive_analytics_YYYYMMDD/` files remain historical local preparation artifacts. [9 October QA](../../../outputs/system_qa_20261009/QA_REPORT.md) identified mismatched ABC contribution thresholds, margin populations and missing-month semantics. **Do not use that job for current publication or Chapter 4 results until repaired and independently reconciled to Gold.** Existing offline files never supply dashboard measures.

Use [Descriptive analytics logic](../../../docs/DESCRIPTIVE_ANALYTICS_LOGIC.md) for metric/reporting rules and [Testing](../../../docs/TESTING.md) for authenticated API, chart and export acceptance. The current project and Chapter 4 reporting scope is **2017–2025**, confirmed by the user on 9 October 2026. Earlier 2021–2025 packets are historical subset results. Keep the 108 calendar months, 98 months with sales observations and ten unknown months visible; label the separate 72-month 2020–2025 company STL scope. Project-scope confirmation does not record business or academic release approval. Accepted reporting categories include Unclassified and do not approve sellable identity, normalized units, clinical priority, forecasts or procurement.

## Model Computation Start

Before running model computation for pharmaceutical demand, build the provisional medical-demand split:

```powershell
python services\analytics_service\jobs\build_medical_demand_dataset.py
```

This writes:

- `data/medshield/processed/sales_transactions_medical_demand.json.gz`,
- `data/medshield/processed/sales_transactions_non_medical_excluded.json.gz`,
- `outputs/medical_demand_cleaning_YYYYMMDD/medical_demand_cleaning_report.json`.

The split excludes likely non-medical business items from pharmaceutical model inputs while preserving a reconciliation and exclusion audit.

Run:

```powershell
python services\analytics_service\jobs\run_model_computation_start.py
```

Outputs are written to:

```text
outputs/model_computation_start_20260623/
```

The current job performs the feasible sales-only computation steps:

- data contract validation,
- monthly demand marts,
- ABC/Pareto rankings,
- seasonal indices,
- year-over-year growth,
- seasonal naive baseline forecast,
- local DSS-style forecast, priority, and evaluation output files.

When `sales_transactions_medical_demand.json.gz` exists, this job uses it as the model input. Otherwise it falls back to the full adjusted sales dataset and reports the contamination limitation.

The job intentionally blocks or downgrades DOH, PAGASA, weather-adjusted, XGBoost, and real inventory optimization outputs until their required inputs are present and approved.
