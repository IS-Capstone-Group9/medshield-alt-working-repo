# Analytical Readiness Manifest

## Current evidence by analytical layer

| Layer | Current verifiable content | Readiness |
|---|---|---|
| Descriptive | Sales totals, yearly summaries, monthly calendar, product-label and area aggregates | Usable as candidate descriptive evidence with stated limitations |
| Diagnostic | Observed comparisons can be investigated, but no causal attribution is established | Interpretation only; evidence-supported associations required |
| Predictive | Current descriptive receipt contains no forecast, external-signal, or model-evaluation rows | Not verified from the current local receipt |
| Prescriptive | Current descriptive receipt contains no inventory, allocation, priority, or recommendation rows | Not verified from the current local receipt |
| External integration | DOH/PAGASA cleaning report exists; approved Gold external-input table has 0 rows | Not join-ready |
| Medical-product analysis | Approved medical-monthly table has 0 rows | Not ready pending product-master approval |

## Descriptive outputs present

- Total sales/revenue (`net_cost`): ₱626,946,741.81.
- Transaction-level gross-margin/profit (`net_income`): ₱288,487,498.72.
- Accepted fact rows: 37,728.
- Calendar coverage: 108 months from 2017-01 through 2025-12.
- Missing-coverage months: 10.
- Yearly summaries: 9.
- Product dimension: 4,561 source labels.
- Area dimension: 22 derived areas.
- Highest aggregate source area reported by the receipt: `GOVERNMENT`.
- Highest aggregate source product label reported by the receipt: `SPEEDA 2.5IU/0.5ML`.

These results are observed outcomes from the processed sales candidate. The area and product labels must be described as source-derived classifications, not final business master data.

## Output families empty in the current descriptive receipt

The following arrays are empty in `outputs/descriptive_validation/2026-09-26T19-02-42-874Z/evidence.json`:

- forecasts;
- external signals;
- inventory recommendations;
- regional priorities;
- area clusters;
- product priorities;
- allocation recommendations;
- product-region matches;
- decision alerts;
- model evaluation.

An empty array means the current receipt does not verify that output. It does not prove that no older experimental artifact exists elsewhere in the repository.

## Chapter 4 use

| Chapter 4 subsection | Evidence that can be used now | Required qualification |
|---|---|---|
| 4.1.1 Data Sources and Coverage | Sales, DOH, PAGASA, and NASA coverage and row counts | Separate present artifacts from report-only outputs |
| 4.1.2 Data Profiling and Quality | Missing months, provenance failures, external cleaning counts | Do not treat missing months as zero demand |
| 4.1.3 Preprocessing and Cleaning | Accepted sales count and external cleaning report | Rejected-record detail must come from the exact matching receipt |
| 4.1.4 Transformation and Standardization | Product labels, financial definitions, areas, replacement audit | State that SKU/unit/medical approvals remain open |
| 4.1.5 Integration and Feature Engineering | Monthly calendar and separate external candidates | Do not claim a validated external join |
| 4.1.6 Analytical Staging | Gold table counts and grains | Publication is still blocked |
| 4.1.7–4.1.8 Model Validation and Selection | No current local evidence | Supply matching predictive receipts before drafting results |
| 4.2.1 Descriptive Analysis | Yearly and aggregate candidate results | Findings need evidence, implication, and limitation |
| 4.2.2 Predictive Analysis | Not currently supported | Do not use older model outputs as current without matching identity |
| 4.2.3 Prescriptive Analysis | Not currently supported | Clearly distinguish future, simulated, and approved recommendations |
| 4.3 Dashboard | Data status and descriptive modules can be documented | User acceptance requires its own evidence |
| 4.4 Summary | Only verified observed descriptive outcomes | Do not claim the ≤5% target was achieved |

## Required evidence before claiming full Chapter 4 readiness

1. The missing version-16 descriptive and publication receipts cited by `docs/CURRENT_STATE.md`, or a regenerated equivalent.
2. Matching predictive model evaluation with dataset identity, split method, baseline comparison, metrics, and uncertainty.
3. Matching prescriptive validation with formulas, constraints, feasibility checks, scenario assumptions, and outcome labels.
4. Approved product/medical master and unit definitions.
5. Approved territory-to-DOH/PAGASA mapping and a reproducible integration receipt.
6. Dashboard screenshots and user-acceptance results tied to the same dataset version.

