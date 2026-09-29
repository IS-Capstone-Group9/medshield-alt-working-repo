# Transformation and Mapping Manifest

## Transformation lineage

The current verifiable sales population follows a source-to-Bronze-to-Silver-to-Gold candidate flow. The Gold fact and all listed aggregate tables carry one dataset ID, one policy version, one area-mapping hash, and one product-master hash.

| Control | Value |
|---|---|
| Dataset ID | `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4` |
| Policy | `sales_restart_gold_v5_2025_allocation_source` |
| Area mapping SHA-256 | `a40f380b50305ebeb9ab1fe21a3d7483750f56598de36b1dea1e85647a3ac949` |
| Product master SHA-256 | `8a34ce4946d2b99f896b1dec9e93dd5865ece8fee5e582c64dc6c5b798cca921` |
| Publication status | Candidate pending business and product-master review |

## Applied interpretation rules

| Boundary | Current treatment | Limitation |
|---|---|---|
| Product identity | Preserve source product labels and derive a product dimension | Labels are not approved canonical SKUs |
| Units | Preserve source quantity | Cross-product quantity comparisons may mix units |
| Revenue | Use persisted `net_cost` as the descriptive sales/revenue measure | Business sign-off on the financial dictionary remains required |
| Income | Use persisted `net_income` as transaction gross margin/profit | Must not be described as company net income |
| Area | Derive area labels through the hashed mapping | External geographic mappings remain pending |
| Missing months | Retain a complete 108-month calendar and flag months without observations | Missing months are not zero demand |
| Medical scope | Publish no approved medical-monthly population | Product master has not approved medical-demand SKUs |
| External signals | Keep the Gold external-input candidate empty | External join gate is not satisfied |

## Historical replacement handling

The 2020 and 2024 sources contain known estimated replacements. The audit reported:

| Year | Source/output records reviewed | Replaced records | Financial preservation |
|---:|---:|---:|---|
| 2020 | 3,987 | 3 | Totals preserved |
| 2024 | 2,944 | 124 | Totals preserved |

These numbers belong to the replacement audit and should not be substituted for the accepted Gold yearly row counts. The replacement procedure preserved audited financial totals, but the Gold provenance labels are defective: the files are marked as original exports and lack the estimated-source flag. Therefore, the candidate remains blocked from publication.

## Area mapping state

The mapping review artifact records 32 observed labels, 35 master labels, and no unmatched labels for its older 37,178-record review population. It also states that existing approvals were inherited rather than revalidated, new mappings are proposals, and no DOH/weather join was validated.

Only the mapping hash is carried forward as current lineage evidence. The older review population must not replace the current 37,728-row Gold count.

## Reconciliation and audit controls

- All current Gold candidate tables listed in the publication receipt point to one dataset ID.
- Monthly, yearly, area-yearly, and related tables were reconciled to the fact candidate by the publication-readiness process.
- Financial reconciliation checked 34,105 rows with 0 mismatches and an aggregate delta of -₱0.06.
- The publication audit passed 68 checks and failed 2 provenance-labeling checks.
- Business acceptance is not recorded.

## Do not infer

The transformed data does not currently establish:

- a business-approved SKU master;
- a business-approved medical/non-medical classification;
- canonical unit conversions across all products;
- a validated sales-to-DOH/PAGASA geographic join;
- causation between disease, rainfall, and sales;
- an approved predictive or prescriptive model;
- achievement of the ≤5% expiry-wastage target.

