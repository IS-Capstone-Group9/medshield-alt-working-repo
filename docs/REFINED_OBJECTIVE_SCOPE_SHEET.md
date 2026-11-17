# Refined-objective scope sheet — checklist item 0.2

**Status: PROPOSED draft, 6 November 2026.** Prepared for the refined-objective completion checklist (item 0.2). It consolidates existing evidence; it is not adviser-approved (item 0.1 is still open) and assigns no completion percentage. Original objectives and scores remain in force until an attributable amendment is recorded.

## 1. Data identity

| Field | Value (source: [catalog-profile.json](../outputs/local_data_model_validation_20261105/catalog-profile.json)) |
|---|---|
| Dataset | Original itemized sales, **contracts excluded** |
| Dataset ID | `e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10` |
| Batch / policy | `original_fd95b9e3abab028c8e41` / `original_source_layers_v1_candidate_only` |
| Source table | `workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates` (Delta `VERSION AS OF 0`) |
| Receipt SHA-256 | `d69414d3bb72c706bba30f24489074e4677f403277e18c64bb8d2e643b0012dd` |
| Publication status | `CANDIDATE_PENDING_FINANCIAL_RECONCILIATION_AND_RELEASE`; financial, unit and forecast approvals all **false** |

## 2. Periods and coverage

- Records: 40,171 unique IDs (0 duplicate/missing); 39,286 net-eligible.
- Span January 2017 – September 2026: **107 observed of 117 calendar months**. Absent (unavailable, not zero): 2017-05, 06, 07, 08, 10; 2018-01, 02; 2019-10, 11, 12.
- 2026 is a partial year (January–September); year-over-year comparisons use matching observed months only.
- Company coverage is **incomplete/unknown**. No complete geographical coverage is implied. MIMAROPA and Bicol have 56/81 and 38/81 eligible months and are excluded from trained regional forecasts (descriptive histories remain available).

## 3. Financial definitions

- Technically eligible signed net sales: PHP 638,015,351.53 (432 negative-net records, −PHP 1,622,699.58, kept as signed adjustments).
- Gross profit = supported gross profit on margin-eligible rows only: PHP 334,666,271.55 over 36,798 records (91.60% record coverage). It is **gross profit before operating expenses, not net profit**.
- Gross margin = 100 × Σ gross-margin amount ÷ Σ net sales **of the same margin-eligible rows** (59.0287%). Zero/negative denominator → rate unavailable. Source: [SO1 scope packet](../outputs/so1_financial_scope_20261027/README.md); definitions in [BUSINESS_DEFINITIONS.md](BUSINESS_DEFINITIONS.md).

## 4. Supported targets and units

| Target | Unit | Scope limit |
|---|---|---|
| Company sales | PHP | Original itemized, contracts excluded |
| CALABARZON sales | PHP | Only regional series with eligible history |
| Financial ABC class | class label | Fixed label partitions; observed/descriptive |
| BUPIRIGHT 4 mL ampoules, HOSPITAL channel | ampoules | **HOSPITAL-only pilot**; two-label scope; not extended to other products |

General SKU/strength/form/pack/unit fields are absent across the general catalog (5,693 source-label keys); source labels are not approved physical SKUs.

## 5. Included methods

Descriptive financial summaries and matched comparisons; STL decomposition (eligible observed series); Pareto/ABC; product/area priorities; PHP forecasting baselines vs. candidates; baseline vs. XGBoost ABC evaluation; EOQ/ROP, weighted integer-pack allocation and dated feasibility under entered scenario assumptions. Experiment detail: [experiment register](REFINED_OBJECTIVE_EXPERIMENT_REGISTER.md).

## 6. Unavailable inputs (explicit exclusions)

- Verified physical stock, batch/expiry balances, supplier lead times, ordering/holding costs (confirmed unavailable) → planning uses researcher-entered **assumptions** only.
- Stable account IDs and approved SKU/unit/pack mappings (general catalog).
- Reviewed DOH/PAGASA/NASA joins and issue-time provider vintages → no externally informed model is evaluated.
- Prospective outcomes: not assumed mandatory for the historical-evaluation objective.
- 3,343 unreviewed-source records: review queue prepared; no review approval inferred.

## 7. Open gates this sheet does not close

Adviser/panel decision (0.1); business review of source/identity; model acceptance; client acceptance; ethics attachments and orientation certificates (5.4).
