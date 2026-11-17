# Selected sales-source review

Completed 10 October 2026 (Asia/Manila). Accountable supporting role: Data Analyst.
This local audit examines December 2024 and March, April and November 2025 using
the supplied CSVs, original local CSV controls, retained preparation evidence and
fact-20 receipts. It performs no model fitting, source correction, runtime change
or cloud operation. The selected target remains recorded company monthly net
sales in PHP.

The three selected 2025 revenue movements are present in the original local sales
export. Their Net CP totals match the adjusted CSV and eligible fact-20 amounts
to the cent, including every delivery-date × area × DR Net CP group. Product
allocation changes the detail and row counts, but these checks do not attribute
the company revenue movements to allocation, orders, disease or other causes.

## Financial reconciliation

| Period | Original CSV detail rows¹ | Final eligible Gold rows | Original known Net CP | Eligible fact-20 Net CP | Difference |
|---|---:|---:|---:|---:|---:|
| December 2024 | 217 | 197 | ₱20,373,336.01 | ₱16,744,970.51 | −₱3,628,365.50 |
| March 2025 | 239 | 241 | ₱2,612,295.10 | ₱2,612,295.10 | ₱0.00 |
| April 2025 | 196 | 206 | ₱5,670,753.87 | ₱5,670,753.87 | ₱0.00 |
| November 2025 | 419 | 545 | ₱25,076,009.20 | ₱25,076,009.20 | ₱0.00 |

¹ Original detail controls retain uncertain identities and repeated records. They
are not asserted to be eligible analytical transactions. No source row is deleted
by this audit. Existing documented Silver dispositions determine the population
used for comparison with Gold.

December 2024's difference has an exact financial bridge: 17 rows with invalid
transaction identity contain **₱3,621,045.50**, and three possible-duplicate rows
contain **₱7,320.00**. Those 20 rows remain outside Gold. Together with the 197
retained rows, their amounts reconstruct the original **₱20,373,336.01**. The
2024 preparation preserves dates, area, DR labels and all financial columns by
physical row; only product, quantity, unit selling price and unit acquisition
cost change, each on 124 rows across that annual source. This audit explains the
raw-versus-eligible difference, without resolving or deleting the review rows.

All four selected final net-sales populations reconcile exactly with retained
fact-20 composition counts and amounts. Supported gross margin and its matching
sales basis also reconcile to the retained monthly calculation receipt within
₱0.01. Those margin populations are narrower than the independently eligible
revenue populations, particularly for November 2025; raw gross-margin controls
must not be substituted for supported margin.

## Available timing and preparation evidence

The source fields are Area, DR Number, Date Delivered, Product, Qty, CP, Total CP,
Disc, Net CP, TP/UNIT, TOTAL TP, Net Income and %. Date Delivered is a calendar
date, with ISO, day-first modern slash dates and integral Excel serials parsed
under the documented notebook rules. There are no source order, invoice,
booking or correction-effective timestamps, issue-time availability fields, or
stable original line-item keys. A DR label can contain multiple product rows;
DR-based grouping is not proof of a unique order or invoice.

| Period | Supplied delivery dates with eligible sales | Highest-revenue delivery date | Amount on that date | Share of eligible month |
|---|---:|---|---:|---:|
| December 2024 | 17 | 31 December 2024 | ₱12,525,723.05 | 74.80% |
| March 2025 | 12 | 15 March 2025 | ₱806,176.20 | 30.86% |
| April 2025 | 8 | 5 April 2025 | ₱3,379,140.50 | 59.59% |
| November 2025 | 8 | 29 November 2025 | ₱23,263,105.97 | 92.77% |

These concentrations identify dates to review with the source owner. They do not
establish whether transactions reflect large deliveries, batch entry, booking,
correction or another business event. None of the four selected eligible months
contains signed negative Net CP, although adjustments remain preserved in other
periods and in the general audit contract.

Both supplied annual CSVs match the notebook's explicitly reviewed hashes and
are classified **ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE**. The 2024 policy
is `one_to_one_same_year_same_area_nearest_financial_profile`; the 2025 policy is
`contract_parent_replaced_with_existing_product_allocation_v1`. These are
preparation provenance, not independently verified medicine quantities.

The retained 2025 preparation code assigns estimated child products from observed
reference lines or baskets, inherits the parent area, DR and delivery date, and
allocates parent financial amounts. Basket quantities are scaled estimates and
unit prices/costs are recalculated. Its reference selection can use all supplied
years, including 2025; it does not establish origin-available explanatory features.
The original workbook, original CSVs, preparation code, staging parent audit and
2024 replacement audit are available and hash-bound in `findings.json`.

The historical 2025 staging contains **4,570** output rows, while the accepted
replacement contains **4,544** transactions. It remains preparation context;
this audit does not assert a one-to-one final mapping from that staging. The three
2025 cases do have exact original-versus-final Net CP preservation at the
delivery-date/area/DR grouping. Product/SKU identity, quantity and individual
allocated-line authenticity remain unresolved separately from that reconciliation.

## Inputs needed for a stronger explanation

1. The source owner's attributable explanation of the high-value delivery dates,
   original submissions, corrections and period-close completeness.
2. Original order/invoice/booking dates, correction-effective timestamps and stable
   item-line keys where these exist.
3. An exact final 2025 parent-to-child preparation mapping bound to the accepted
   replacement checksum, if a claim about individual allocated records is needed.
4. Historical source vintages or availability timestamps to determine whether a
   proposed explanatory signal was knowable at the forecast origin.
5. Reviewed sellable SKU/pack/unit and account/territory identities before changing
   the target from company revenue to medicine-unit or territory demand.

The retained predictive manifest already labels the source as a retrospective
revised snapshot without historical availability vintages. This audit discovers
no new source-owner explanation or approved origin-available feature that would
justify a new recipe. Keep the current values until supported corrections pass
the governed ingestion and reconciliation process.

The requesting user explicitly answered **“No confirmed explanation yet”** on
10 October 2026. This records an unresolved cause; it supplies no source-owner
explanation, correction or approval.

## Reproduction and handoff

Run from the repository root:

```powershell
& 'C:/Users/Adrian/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -u outputs/predictive_readiness_20261010/source_review/audit_sources.py
```

`findings.json` records source and code SHA-256 values, dataset/fact/policy identity,
explicit populations, timing aggregates, review dispositions, limitations and
**30 passing checks, zero failures**. `findings.sha256` seals its bytes. The audit
reuses only pure canonical notebook parsing and reconciliation definitions, with
independent Decimal aggregation and original-versus-final controls. Counts and
identities compare exactly; money compares within ₱0.01. It preserves source
files and emits aggregate findings without raw DR identifiers or transaction rows.
Retained warehouse receipts are inherited evidence; remote state was not queried
by this script.

Skills applied: `.skills/analytics-frameworks.md` for comparable populations and
bounded diagnostic claims; `.skills/database-standards.md` for lineage, grain and
duplicate treatment; coding/testing/technology-stack standards for executable
local evidence and warehouse boundaries. The global Spreadsheets skill supplies
read-only CSV/source controls and bundled Python analysis. Existing worker and
execution-contract guidance was reused. Next owner: project lead/source owner
for the listed timing/preparation evidence; QA for independent reconciliation.
