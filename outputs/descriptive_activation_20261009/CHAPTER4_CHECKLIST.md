# Finish descriptive analytics and Chapter 4

Prepared 9 October 2026; current reporting scope corrected to **2017–2025** following the user's confirmation. This is a collection/review checklist. It does not itself establish authenticated walkthrough or final business/academic acceptance. Use [Current state](../../docs/CURRENT_STATE.md) for the active runtime and latest acceptance results.

## Establish one reporting scope

1. Use **January 1, 2017–December 31, 2025** for the current project and Chapter 4 packet. Earlier 2021–2025 findings are a historical subset; keep their period label and use the full-history packet for current project totals. This scope correction records the user's instruction, not a new adviser/panel or business release approval.
2. Use the validated **fact 20** candidate and matching bridges/STL. Keep candidate publication status visible until the permitted release is recorded.
3. Report company/source-label **PHP sales and gross margin**, with accepted reporting categories. Describe quantities in their recorded source units; do not claim verified sellable SKU or medicine demand.
4. Retain Unclassified, negative adjustments, unavailable observations, adjusted 2025 evidence and unallocated geography. Show partial/unequal coverage when making comparisons.

The full scope contains **108 calendar months and 98 months with sales observations**. The ten unknown months are May–August and October 2017, January–February 2018, and October–December 2019. Do not convert these gaps to zero or use optional gap estimates as observed financial results. The 72-month company-revenue STL covers January 2020–December 2025 separately.

Use the corrected [2017–2025 findings](full_history_2017_2025/STUDY_FINDINGS.md) and [financial summary](full_history_2017_2025/study_financial_summary.csv) for the current Chapter 4 packet. The earlier findings and CSV in this parent folder remain the historical 2021–2025 subset.

The inherited passing evidence for this candidate is:

| Receipt | What it establishes | Limit |
|---|---|---|
| [Gold/category receipt](../catalog_validation/2026-10-09T07-10-50-843Z/evidence.json) | Exact category decisions and immutable fact-field preservation against predecessor 19 | Gateway calculation check used a temporary pin; not browser acceptance |
| [Descriptive/STL receipt](../descriptive_validation/2026-10-09T07-16-46-191Z/evidence.json) | Financial reconciliation, missing-month meaning, matching STL inputs/components | Read-only calculation evidence; not release approval |
| [Readiness receipt](../publication_readiness/2026-10-09T07-20-05-882Z/README.md) | Stable persisted publication and dependency checks | Does not prove source completeness, SKU identity or usability |

Dataset: `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
Policy: `sales_restart_gold_v7_independent_catalog`.
Source: `workspace.medshield_gold.sales_restart_fact_candidate`, Delta 20.
Product-master SHA-256: `2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29`.

## Collect the results packet

For each retained figure, save the screenshot, its exact-value table or available CSV, selected period/category/region/cohort, metric units, release metadata and one matching verification receipt. Keep credentials and auth tokens out of the packet. Check figures against the same selected population. The fixed 2017–2025 scope currently matches the loaded history; verify the period metadata rather than assuming All Time will retain the same bounds after new years are ingested. A full-history total cannot validate a narrower year, category, region or cohort selection.

| Business question | Screenshot/table to collect | Finding to write and check |
|---|---|---|
| How did recorded sales change? | Overview annual/monthly trend and calendar for the study period | Identify high/low recorded periods, give amounts and observed coverage. Unknown months are not zero; historical growth is not a forecast. |
| What gross profit did those sales support? | Overview or Sales Diagnostics gross-profit detail and weighted-margin detail | State gross margin amount before operating expenses, margin-eligible sales basis and rate. Do not divide supported profit by a broader revenue population. |
| How did comparable periods differ? | Sales Diagnostics Y/Y matched-period detail | Give paired-period count and both totals before growth. Separate unmatched/partial periods and gap estimates; do not invent causes. |
| Which names and categories contributed sales? | Product Prioritization with period/category/cohort visible; **Export selected rows** CSV | Explain positive-sales rank, separate negative adjustments and crossing-inclusive ABC. CSV covers the selected cohort; the chart shows at most ten names. Use source-label counts, not verified SKU counts. |
| Where were sales allocated? | Area Prioritization regional and buyer-type bars plus mapping/coverage detail | Reconcile mapped and unallocated amounts. State derived buyer-group basis and limits. Commercial score rank is distinct from the highest-sales region. |
| What monthly pattern appears in company sales? | Sales Diagnostics STL trend/seasonal/residual views; **Export STL components** CSV | Label its **January 2020–December 2025, 72-month company PHP-revenue scope** separately from the paper filter. Verify observed = trend + seasonal + residual. It does not establish disease causality or SKU/territory decomposition. |
| How much uncertainty remains? | Coverage, product catalog status and adjusted-source evidence details | Report missing/unsupported evidence explicitly and its known financial effect. Equal annual finance does not verify an estimated allocation's item mix. |

Accepted 2017–2025 reporting dispositions in the fact-20 category receipt are **598 medicine, 646 medical supply, 131 medical equipment, 209 non-medical and 2,977 Unclassified source labels**. These total 4,561 labels across the loaded history. The full-scope financial receipt reconciles **₱626,946,741.81 eligible net sales**, **₱288,487,498.72 supported gross margin amount**, and a **₱478,720,670.03 margin-eligible sales basis**, giving **60.26% weighted gross margin**. Margin uses that same eligible population, not all independently eligible net sales. Category disposition counts are source-label catalog counts; revenue eligibility, narrower periods and selected cohorts can use different populations. Unclassified is an accepted reporting category with unresolved underlying identity, not an invented medicine classification. ABC class Unclassified is a separate concept for names without positive-sales contribution.

## Write a defensible interpretation

Use one short paragraph per result: business question → selected population and observed result → comparison/coverage → limitation → bounded next action. For example, a large positive-sales contribution supports catalog review and commercial attention. It does not, by itself, authorize a quantity order, prove clinical priority or explain a disease surge.

Label the adjusted 2025 source as allocation/estimated evidence. Distinguish its file-level provenance from optional dashboard gap estimates. When no observation exists, retain unavailable status. Preserve source-label aliases and unit uncertainty instead of asserting every label is a unique sellable product.

## Close the descriptive milestone

- [x] The [authenticated full-history check](full-history.json) passed for the 2017–2025 preset, financial API/dashboard values, category exports and exact label search at fact 20. Earlier passing null/zero fixtures remain inherited evidence for unchanged measurement handling; this test does not itself re-execute every failure-state fixture.
- [ ] Product/category/cohort filters and label search preserve exact values; empty selections and warehouse failures have truthful unavailable states.
- [ ] Chapter 4 screenshots/tables use the explicit 2017–2025 project scope and reconcile to their saved evidence; narrower comparisons and historical 2021–2025 subsets retain their own labels.
- [ ] The client reviews the version-bound packet and records the permitted source-label/company financial reporting scope, unresolved exclusions/mapping coverage and final release decision in [Publication acceptance](../../docs/DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md).
- [ ] The paper's scope and Chapter 4 state 2017–2025. Any required adviser/panel acceptance for changes from earlier promised scope, daily/territorial decomposition or other original objectives is recorded separately; see [Objective/evidence register](../../docs/OBJECTIVE_EVIDENCE_REGISTER.md). The user's scope confirmation does not supply that academic acceptance.

Forecast activation, disease/weather joins and operational inventory/procurement approval are separate milestones. Completing this reporting packet can finish the agreed descriptive scope without claiming those capabilities have been accepted.

Documentation verification: local paths, validator/export names and inherited receipt identities were checked against repository files. No cloud query, service start or browser check was performed to prepare this checklist. Skills applied: documentation standards for canonical guidance, technology stack for warehouse/gateway boundaries, testing standards for evidence limits, and analytics frameworks for populations and claims.
