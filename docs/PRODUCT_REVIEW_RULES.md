# Product identity and pricing review rules

Prepared 3 October 2026. Accountable role: Data Analyst. This improves local
preparation and review rules. Gold remains the analytical source of truth and
business approval remains with the CEO. The recorded financial definitions and
conditional annual-reconciliation decisions continue to apply.

## Current preparation update — 7 October 2026

Current local extraction uses `product_review_v3_context_literal_pricing`.
`proposal_attributes` accepts an optional proposed business-category context,
which helps interpret literal units without approving the category or identity.
Food/cleaning gram weights and weights under a nonmedical proposal become
container/net-mass clues. Genuine medicine gram-strength clues and supplement
milligram clues remain proposals. `SPECIMEN CUP WITH CALIBRATION` requires review
of container markings and does not imply a calibration service. Explicit equipment
calibration/cleaning service wording remains separately reviewable.

The [complete business analytics assessment](../outputs/business_analytics_review_20261007/REVIEW.md)
covers all 4,561 current-version-19 labels. It corrects nine literal attribute rows
and one context warning, preserving category research and all approval dimensions.
`DENGUE 1G/1GM` and nebulizer accessory kits still require documentary evidence;
their titles cannot establish medicine strength or a complete machine identity.
The full-row quantity/date and source-conservation checks use archived version 17,
while fresh version 19 checks validate label aggregates and descriptive finance.
The evidence scanned below remains the dated version-17 record, not a fresh
version-19 transaction export.

## Decision

Keep every sales transaction and its actual reported selling price. Resolve a
product using its physical identity and sellable packaging, independently of its
price. Different Box, Piece, pack contents, strength, form, capacity, gauge,
brand or model require distinct identities unless documentary evidence establishes
an exact alias for the same sellable product. Uncertain labels retain their
existing `RAW:<product_key>` groups until reviewed evidence supports a SKU.

Bulk purchases and negotiated prices can exist under one reviewed SKU. Different
prices alone cannot establish either pricing reason. Transaction quantity remains
the quantity delivered in the source unit; it never sets the package count.

## Evidence scanned

Read-only Databricks extraction covered every record in
`workspace.medshield_gold.sales_restart_fact_candidate VERSION AS OF 17`.

| Measure | Full dataset, 2017–2025 |
|---|---:|
| Source records / unique source-record IDs | 37,728 / 37,728 |
| Current reporting groups | 4,561 |
| Original title variants processed | 4,985 |
| Groups with multiple recorded CP values in positive original-source candidate rows | 1,609 |
| Groups with multiple recorded CP values across all source strata | 2,240 |
| Missing / recorded-zero / negative CP records | 835 / 2 / 29 |
| Missing quantity records | 11 |
| Adjusted-source records | 11,355 |
| Validated unit-price comparison records | 0 |

The two variation counts cover multiple years. Inflation, effective dates, source
units, transcription differences and pricing agreements remain possible causes.
They do not prove a bulk discount, customer negotiation, or identical physical
products within an unresolved group. `positive_original_cp_context` records each
price's dates, year counts and literal quantity range; `yearly_price_counts`
also reports variation within each year.

All current identities remain unresolved. Missing sellable packaging cannot be
filled by assuming Piece, Box size, or a typical manufacturer's presentation.
DR numbers identify documents; the fact does not provide a verified customer
account identifier. Geographic labels cannot substitute for that identifier.

The current 2020, 2024 and 2025 source files are marked adjusted at file level.
Their recorded prices remain in the adjusted stratum; zero original-source price
candidates in those years means excluded from that stratum, not no sales. The
annual financial totals can still reconcile under the recorded acceptance policy.
Independent identity/quantity evidence alone cannot establish actual unit pricing.

For example, `KN95 FACEMASK (PIECE)` contains multiple reported CP values, while
`KN95 FACE MASK (BOX)` is a separate current group. The two `KN95 FACEMASK -
CHRISTINE` records report CP 90 and 900. Preserve both records and the descriptor;
investigate packaging and invoice evidence before interpreting that difference.

Dataset ID:
`b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`.
Gold policy: `sales_restart_gold_v7_independent_catalog`.
Publication status: `CANDIDATE_PENDING_BUSINESS_AND_PRODUCT_MASTER_REVIEW`.
The extraction receipt contains the mapping, transaction-evidence and deployed
helper hashes, pinned version, SQL pages and warehouse financial aggregates.

The completed [scan and reconciliation report](../outputs/product_sales_rules/2026-10-02T21-00-51-469Z/sealed-review/README.md)
describes the generated artifacts. Its [summary](../outputs/product_sales_rules/2026-10-02T21-00-51-469Z/sealed-review/summary.json)
and [checksum receipt](../outputs/product_sales_rules/2026-10-02T21-00-51-469Z/sealed-review/receipt.json)
bind the evidence to this dataset version and preparation policy.

## Rules and acceptance examples

| Rule | Required behavior | Example / acceptance |
|---|---|---|
| Preserve source evidence | Retain source-record ID, raw title, document number, date, recorded measures, eligibility and provenance. Enrichment adds diagnostics in a separate object. | 37,728 extracted records remain 37,728; every extracted source field equals its input. |
| Keep complete numeric literals | Recognize commas, decimals and explicit capacity fractions without truncating tokens. | `100,000 IU` stays `100,000 IU`; `2,000ML` stays `2,000ML`; `1/2CC` stays `1/2CC`. |
| Separate concentration and container | Parse the complete ratio before identifying capacity. Support IU, combination numerators and spaces around `/`. | `250MG/5ML 60ML` has concentration `250MG/5ML` and capacity `60ML`; the denominator never becomes the container. |
| Preserve specifications | Capture gauges, sizes, model/rating tokens and dimensions as literal review clues. Avoid mass or pack-count claims from those clues. | Cannula `20G` is a gauge clue; `1.1X32MM` is a dimension; `KN95` is retained. |
| Require explicit packaging | Propose supported unit synonyms, outer package, contents and counts only from literal packaging syntax. Unknown fields stay unknown. | `50 PAIRS/BOX` proposes Box/50/Pair; `BOX` alone has unknown count; order quantity 100 does not imply a 100-piece box. |
| Keep bundles/options unresolved | Preserve explicit bundle descriptions and flag conflicting sizes, assortment or options. | `SET 10X500ML` is a bundle proposal; `ASSORTED` cannot be split into guessed products, quantities or revenue. |
| Separate review dimensions | Category, identity, item kind, source unit, forecasting and transaction verification require their existing independent evidence gates. | A medical title suggestion cannot approve a SKU or pharmaceutical forecast. Every new parser result is `needs_review`. |
| Keep pricing on transactions | Retain CP, discount, gross and net values. Group only on the existing reporting identity. | Same reviewed Piece sold at ₱20 and ₱15 retains two sales rows under one SKU. Box 50, Box 100 and Piece remain distinct. |
| Distinguish CP and net unit price | Compute recorded net revenue ÷ recorded positive quantity only for an eligible, reviewed sellable unit. Label the derived value separately. | Quantity 100, CP ₱15, gross ₱1,500, discount ₱100 and net ₱1,400 retain CP ₱15; derived net unit price is ₱14. |
| Diagnose formulas without replacement | Use exact-decimal arithmetic and Silver's ₱0.02 tolerance. Preserve recorded values and existing eligibility flags. | Flag quantity × CP versus gross, and gross − discount versus net, without changing CP or applying discount twice. |
| Preserve missing, zero and returns | Missing stays null; observed zero stays zero. Signed returns stay in eligible net revenue and their separate return view. | A missing CP does not become free goods. Zero discount is an ordinary observation. Return/credit candidates are excluded from positive price comparisons. |
| Separate adjusted and observed evidence | Publish recorded CP frequencies in separate original/adjusted strata. Estimated allocations, low-trust source rows and historical backfills cannot establish validated unit pricing. | Annual financial reconciliation does not verify per-product prices or quantities. Identity-and-quantity verification alone does not verify CP or negotiation. |
| Do not infer customers or pricing reasons | Report `unknown` pricing reason and unavailable customer-price analysis until reliable independent evidence exists. | DR, quantity/price correlation, territory and identical prices cannot identify a customer or prove a bulk-price agreement. |

Title clues such as `ROLL BY` on a wheeled device and `85% ENERGY SAVINGS` on an LED
are flagged as specifications rather than package or concentration evidence.
“FREE” remains in powder-free, mercury-free and source product names. Arbitrary
numbers, brands and descriptors are preserved. These rules propose review facts;
they do not assert regulatory status, ingredient equivalence or medical suitability.

## Implementation boundary and tools

- `backend/scripts/profile-product-sales.ts`: read-only SQL Statement Execution
  through the existing Databricks gateway. Pages are bounded and ordered by unique
  source-record ID; every query is pinned to one Delta version. Count/group checks,
  start/end version checks and extraction SHA-256 must pass.
- `databricks/medshield_project/product_review_rules.py`: pure preparation parser,
  current policy `product_review_v3_context_literal_pricing`. No warehouse operations
  or approvals. The sealed 3 October scan retains its original
  `product_review_v2_literal_pricing` evidence and is not regenerated by this update.
- `databricks/medshield_project/review_product_sales.py`: Python exact-decimal
  diagnostics, full group/alias review, per-record findings, financial reconciliation
  and output checksum receipt. Output directory must be new.
- `databricks/medshield_project/review_catalog.py`: uses the improved preparation
  parser while retaining the existing authoritative resolution and approval gates.
- `product_catalog.py` and notebooks 01–06 are unchanged by this preparation step.
  The deployed helper SHA-256 remains unchanged. Gold resolution does not use
  these new preparation proposals.

SQL profiling uses the existing authorized warehouse identity: warehouse query
permission plus SELECT and namespace access for the fact, and access to its Delta
history. Local processing needs Python and repository access. Workspace notebook
edit, job deployment, table-write and CEO approval permissions are not needed for
this read-only preparation step.

Reproduce from PowerShell at the repository root:

```powershell
Push-Location backend
node --import tsx scripts/profile-product-sales.ts
Pop-Location
python databricks/medshield_project/review_product_sales.py --facts <new-extract>/facts.json --output <new-review-directory>
python -m unittest discover -s databricks/medshield_project/tests
```

Use the collector's printed path; never silently select an old local extraction
when Databricks is unavailable. These artifacts are audit/preparation files and
the dashboard cannot read them as a substitute source.

## Verification and handoff

The full review verifies 98 observed warehouse months, exact monthly/annual
financial partitions, source-record/group counts and all extracted source fields.
Warnings identify affected observations; they do not invalidate unrelated eligible
financial reporting. No source amounts, eligibility flags or master entries change.
Tests cover actual malformed proposals, returns, discounts, unknown units,
conservation and future-data cases. This proves preparation logic, not publication
approval or verified medical demand.

Final checks: 60 pipeline/catalog/pricing tests passed; the collector passed its
TypeScript check. Independent review verified input/output/code checksums, every
record and alias, all 98 warehouse months, price contexts and unchanged financial
partitions. The [verification record](../outputs/product_sales_rules/2026-10-02T21-00-51-469Z/verification.md)
records these checks.

For activation, review the queue by positive financial contribution and exception
severity. Obtain invoices/product catalogs, pack/unit details, manufacturer/model
information and relevant pricing agreements. Record independently supported
category/identity/unit decisions in `references/product_master_review.csv`; record
transaction identity/quantity verification in its separate existing evidence file.
Customer-price analysis additionally needs a reliable account key and dated pricing
evidence. Preserve the already recorded financial decisions.

An authorized operator then prepares a newly checksum-bound deployment using
[CATALOG_DEPLOYMENT.md](CATALOG_DEPLOYMENT.md), reruns required candidate stages,
and repeats source-to-warehouse/API/export reconciliation and publication checks.
The CEO reviews the resulting specific dataset receipt and outstanding business
scope. Retain the preceding release and evidence for rollback. Do not overwrite
the current candidate or record approvals through an automatic parser.

Related contracts: [PRODUCT_CATALOG.md](PRODUCT_CATALOG.md),
[BUSINESS_DEFINITIONS.md](BUSINESS_DEFINITIONS.md),
[DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md](DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md).
