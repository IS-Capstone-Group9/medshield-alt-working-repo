# Accepted categories for descriptive reporting — 8 October 2026

The two product-master CSVs now contain 4,561 accepted reporting dispositions:
1,584 supported known categories and 2,977 explicitly Unclassified. They are no
longer category proposals. Unclassified means the reporting bucket is accepted
while the underlying medical/nonmedical category remains unresolved.

| Category | Labels | Records | Net sales (PHP) |
|---|---:|---:|---:|
| medicine | 598 | 8,580 | 283,572,883.58 |
| medical_supply | 646 | 2,667 | 58,968,013.27 |
| medical_equipment | 131 | 310 | 19,835,915.09 |
| non_medical | 209 | 919 | 21,287,340.11 |
| unclassified | 2,977 | 25,252 | 243,282,589.76 |


All 37,728 source records and net sales ₱626,946,741.81 are retained, including
Unclassified sales and signed returns. Category financial totals were independently
recomputed with Decimal from the inherited fact19 label receipt. This is not a
new cloud publication or a measured classification-accuracy benchmark.

## Decisions and actual provenance

The category receipt records Adrian's instruction, recorder
`Codex acting on Adrian instruction`, and actual review timestamp `2026-10-08T09:37:59.914Z`.
It explicitly records no business-release, SKU/unit or forecast approval.
Skin staplers, autoclave tape, blood lancets and nebulizer masks were corrected
to medical supply. The 14 nebulizer-kit labels remain supplies/accessories.
The four Locaine/Eurocaine/Sanoxin labels are accepted as medicine. Ambiguous
mass-only labels, unsupported brand propagation, diagnostic acronyms, mixed
contract labels and unresolved intended-use descriptions remain Unclassified.
Hyclens subtype and EVAPROST presentation conflicts retain their identity limits.

Evidence was assessed per exact alias and category scope. Primary manufacturer
catalogs and government procurement lines can support medicine category without
proving the supplier SKU or historical package actually sold. Drug alternatives
listed in a procurement row are not aliases of the same sellable SKU. A medicine
category is not a statement of current Philippine registration. Historical
research was inherited where stated; it was not all fetched again today.
See [full decisions](assessment.json), [targeted evidence](targeted-evidence.json),
and [category receipt](../../databricks/medshield_project/references/category_acceptance.json).

Retained AMB catalog SHA-256:
`23748228e81b255f819461c2afbec2b4b9205c89d147446444b1576cd6e650d8`.
Retained Quezon City purchase order SHA-256:
`bee3618f1db9075be3a5daaa59c6939f29b10b32e2b8667948629dae7496e797`.
Exact government medicine-brand lines were inspected in text and rendered pages;
ambiguous nutritional/supplement lines were excluded from supplemental matching.
Full source URLs and page references remain in the assessment and receipt.

## Verification and identity

Both saved CSVs are byte-identical: 4,755,483 bytes, 29 columns,
SHA-256 `2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29`. The [original CSV](before.csv) and prior descriptor are archived.
The full-cell check permits only category, category status, evidence, recorder,
timestamp and review-note changes. Every other CSV cell and all noncategory
resolved values remain equal. There are zero approved SKUs, units, item kinds,
forecast decisions and forecast-eligible rows. See [verification](verification.json).

The shared descriptor uses `category_acceptance_only` with exactly seven mutable
fact fields and all 137 remaining fields immutable. Every quantity, price, amount,
source-lineage field, quality flag and demand gate remains immutable. Gold and
gateway validation compare every accepted label to its bound receipt; retaining
financial totals alone is insufficient. A tampered category or quantity fails.
The [fresh read-only capture](../../outputs/catalog_preparation/2026-10-08T09-42-03-926Z/predecessor-receipt.json) confirms predecessor19, 37,728 unique
records, all 55 Silver source fields equal, 29 stable dependencies and two bridge
definitions. It does not validate a replacement fact or rehearse recovery.

Local code verification uses the notebook unittest suite, exact README regeneration,
five backend category/financial contract tests and TypeScript checks for both
publication scripts. Detailed command results are in the final validation receipt.
CSV previews were imported, edited, recalculated and inspected with artifact-tool;
an ISO-date serialization defect was corrected and the full-file validator passed.

## Deploy next

Use the newly generated category-acceptance ZIP and [current operator runbook](../../docs/CATALOG_DEPLOYMENT.md).
Older draft ZIPs contain earlier category proposals and must not be substituted.
The upload set is Gold03, helpers, category receipt, descriptor and exact reference
files; existing 04/05/06 must match the packaged sources. Run 03 → 04 → 05 → 06
after the operator prerequisites. Keep the serving pin19 until exact new-version
warehouse/API/STL validation and applicable release acceptance are recorded.

No cloud upload, notebook execution, release activation or recovery rehearsal was
performed. The inherited Workspace/Jobs access check returned HTTP403; an operator
with suitable access owns those steps. Missing SKU/package/sales-unit evidence,
external joins and model gates remain independent. Future source ingestion requires
a newly reviewed source contract and category review of new aliases; this receipt
is bound to the present dataset and cannot approve unseen labels.

Accountable role: Data Analyst, supported by scoped evidence and publication-contract
reviews. Repository analytics/database/coding/testing/stack guidance was reused;
spreadsheet skill governed CSV authoring and independent file validation. Review
mode: self-review with supporting primary-source findings; cloud execution unverified.
