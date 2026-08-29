# MedShield P1-P14 Remediation Status

Date: 2026-08-29
Branch: `medshield_ui_kei2`

This report maps implementation evidence to the MedShield DSS Master Checklist.
Automated evidence does not replace the named business, finance, pharmacy,
security, or dataset reviewer approvals.

## Current Gate

The system is not certified for operational decision support. P1 has a
reproducible publication candidate, but publication remains blocked by the
six-row raw-audit discrepancy, year-grade approval, P2 financial mapping, and
formal reviewer approval.

## Checklist Status

| Phase | Status | Evidence and current blocker |
|---|---|---|
| P0 - Unsafe behavior | Implemented, verification continuing | Unsupported live, official-source, procurement-execution, and champion claims were removed or changed to demo/historical/scenario wording. Fallback provenance is visible. |
| P1 - Certified dataset | Candidate built; blocked | `sales_2017_2025_v1` reads all nine files together. It reconciles 44,954 extracted rows into 40,320 accepted and 4,634 rejected rows. The checklist audit count is 44,948, leaving six rows for owner disposition. |
| P2 - Financial integrity | Evidence built; blocked | The workbook-supported candidate mapping matches 69.99% overall, but year performance varies materially. 2019 matches only 0.07%; 2025 matches 100%. Finance approval and year-specific header repair are required. |
| P3 - Master data | Candidates built; blocked | 4,696 unique products were found. Five match the template and none are approved. Seven approved territories cover 49.54% of candidate rows. Unapproved products cannot enter SKU forecasts. |
| P4 - Analytical marts | Blocked by P2 and P3 | Existing marts are provisional. Certified marts must wait for approved financial semantics and product/area mappings. |
| P5 - Descriptive analytics | Partial | Dynamic 2017-2025 year filters are implemented. Descriptive outputs must be regenerated after P2-P4 gates pass. |
| P6 - Predictive analytics | Partial and blocked | Seasonal naive remains the benchmark. The external-regressor GBR was changed to `challenger_rejected`. Forecast rebuilding waits for certified marts. |
| P7 - Disease/weather | Source files present; validation pending | DOH 2021-2025 and PAGASA 2021-2024 files exist locally. Provenance, geography, coverage, leakage, and model-lift validation remain required. |
| P8 - Prescriptive support | Scenario-safe; operational inputs absent | EOQ, ROP, inventory, and procurement outputs are review-only scenarios. Current stock, purchase orders, lead time, expiry, MOQ, capacity, and budget data remain unavailable. |
| P9 - Dashboard usability | Partial | Persistent source banner, load timestamp, fallback/demo state, dynamic years, and scenario labels are implemented. Dataset version publication and full empty/stale/error coverage remain. |
| P10 - Architecture/API | Partial | `/api/dashboard_status` exposes source provenance and fallback mode. Published-output enforcement and a certified single source of truth remain blocked. |
| P11 - Security/governance | Open | Shared demo credentials, complete RBAC, durable audit governance, retention, backup, and authorization testing remain. |
| P12 - Analytical QA | In progress | Certification, financial reconciliation, and master-data gating have unit tests. Full browser tests require a Playwright browser installation; release-blocking analytical QA is not complete. |
| P13 - Outcome measurement | Open | No approved operational recommendations exist yet, so acceptance, override, fill-rate, stockout, expiry, and Forecast Value Added capture are not implemented. |
| P14 - Documentation alignment | In progress | This report records failed models, scenario status, evidence, and blockers. Paper and defense materials still require alignment after the final certified run. |

## P1 Evidence

- Dataset ID: `sales_2017_2025_v1`
- Extracted rows: 44,954
- Accepted rows: 40,320
- Rejected rows: 4,634
- Valid rows: 34,460
- Warning rows: 5,860
- Duplicate occurrences: 133 total; 68 occur among accepted rows
- Publication candidate rows after the excluded-2017 gate: 38,273
- Source totals classified: 9
- Reconciliation summaries classified: 2
- Orphan product rows classified: 1
- 2017 `#REF!` product rows quarantined: 3,807
- 2018-dated rows originating in the 2019 file: 4,857
- 2018 accepted month gaps: January and February
- Trust grades: 2017 `excluded`; 2018-2025 `usable_with_limitations`

Evidence files:

- `data/medshield/certification/sales_2017_2025_v1_manifest.json`
- `data/medshield/certification/sales_2017_2025_v1_reconciliation.json`
- Generated audit candidate: `sales_2017_2025_v1_candidate.json.gz` (ignored; reproducible)

## P2 Evidence

| Mapping candidate | Matching rows | Match rate |
|---|---:|---:|
| `total_trade_price - net_cost` | 1,345 | 3.51% |
| `net_cost - total_trade_price` | 26,788 | 69.99% |

The stronger mapping suggests that source `NET CP` behaves like net contract
sales value and source `TOTAL TP` behaves like transfer-price cost for many
rows. This interpretation is proposed, not approved, because mappings differ
across years and 11,485 candidate rows still have workbook-margin mismatches.

Evidence file:

- `data/medshield/certification/sales_2017_2025_v1_financial_reconciliation.json`

## P3 Evidence

- Unique products: 4,696
- Products matched to mapping template: 5
- Approved products: 0
- Forecast-eligible products: 0
- Unique area values: 19
- Mapped area values: 15
- Approved territories: 7
- Approved-area transaction coverage: 49.54%

Evidence file:

- `data/medshield/certification/sales_2017_2025_v1_master_data_coverage.json`
- Generated product and area master candidates (ignored; reproducible)

## Next Gate Actions

1. Explain and disposition the six-row difference from the 44,948 checklist audit count.
2. Approve whether the 4,857 carry-over rows belong to 2018 analytical history.
3. Repair year-specific financial headers, beginning with 2019, 2018, and 2023.
4. Approve high-volume product aliases and classifications, then territory/customer/business-line mappings.
5. Regenerate P4 marts only from approved P1-P3 inputs.
6. Rebuild P5-P6 analytics from those marts.
7. Validate the retained DOH/PAGASA files for P7 before allowing external regressors.
