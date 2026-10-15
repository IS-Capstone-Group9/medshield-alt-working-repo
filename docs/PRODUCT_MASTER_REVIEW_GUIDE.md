# Review the MedShield product master

Updated 8 October 2026. Product categories are accepted locally for descriptive
reporting under Adrian's instruction: 598 medicine, 646 supplies, 131 equipment,
209 nonmedical and 2,977 Unclassified. Unclassified is an accepted reporting
bucket with unresolved underlying category. The four medicine gaps and 14
nebulizer accessory labels have category decisions; historical SKU/package/unit
details remain pending. See [category evidence and verification](../outputs/category_acceptance_20261008/README.md).

Both copies contain 4,561 rows, 29 columns, 4,755,483 bytes and SHA-256 `2e2e937215da5b7f7726fe1db89025df0f8eb8856815a850e53ede69ad4e5e29`.
Recorder/date identify the actual user-directed category review. There are zero
independent SKU/unit/item-kind/forecast approvals. All other CSV cells are preserved.
No Databricks deployment or version-bound business-release approval was performed.
Rows are ordered by positive-sales contribution; high-contribution unknowns remain
the priority for obtaining original supplier/packaging evidence. Earlier dated
review receipts and packages are historical and retain their original bytes.

## Local documentary evidence found

The 2026 MedShield injectable price list was found in
`C:/Users/Adrian/Capstone-Codes/2026 PRICELIST.pdf`, with two identical Downloads
copies. Its 96 presentation rows provide 265 possible brand-text matches to
historical sales labels. The [20-label review queue](../outputs/catalog_preparation/product_evidence/REVIEW_QUEUE.md)
lists high-contribution candidates, source pages and next actions. These are
proposals only. The printed SKU column describes boxes, not unique product codes;
package quantities and 2026 prices cannot establish historical sales units or
acquisition costs. NORBIT appears under two generic descriptions, demonstrating
why a brand-only join is unsafe. This price-list matching alone did not supply historical SKU/unit approval.

## Files to use

Edit the authoritative [product_master_review.csv](../databricks/medshield_project/references/product_master_review.csv).
After review, copy its exact saved bytes to the
[deployment copy](../databricks/medshield_reference_csv/medshield_reference_csv/product_master_review.csv).
Preserve UTF-8 text and the existing header. Keep separate dated copies of prior
reviews and evidence; do not overwrite historical receipts.

The complete **29-column** schema is:

| Purpose | Columns |
|---|---|
| Source alias and sellable identity | `raw_product`, `canonical_sku`, `canonical_title`, `representative_raw_product` |
| Category decision | `product_category`, `category_status` |
| Identity and item-kind decisions | `identity_status`, `item_kind`, `item_kind_status` |
| Sales unit and forecasting decisions | `unit_of_measure`, `unit_status`, `forecast_eligible`, `forecast_status` |
| Review administration and evidence | `mapping_status`, `evidence_source`, `reviewed_by`, `reviewed_at`, `review_notes` |
| Physical specifications | `brand`, `manufacturer`, `model`, `strength`, `concentration`, `dosage_form`, `container_size`, `packaging_unit`, `pack_count`, `contained_unit`, `bundle_specification` |

Statuses are `proposed`, `needs_review` or `approved`. Categories are `medicine`,
`medical_supply`, `medical_equipment`, `non_medical` or `unclassified`. Item kinds
are `physical_product`, `service` or `unknown`. `forecast_eligible` is the literal
text `true` or `false`.

## Review one product

1. Start with high positive-sales contribution or an identified conflict. Keep
   `raw_product` as the exact source alias; do not replace it with a cleaned name.
   Find its invoice, supplier catalog, product label or packaging record. Research
   references can support an accepted descriptive category when unambiguous;
   historical identity approval still requires evidence that identifies
   the product and presentation actually sold.
2. Verify the identity against supplier SKU or product documents. Fill the stable
   `canonical_sku`, accurate `canonical_title` and `representative_raw_product`
   only when their identity is supported. Record literal brand/manufacturer/model,
   strength, concentration, form, container and bundle details. Missing information
   stays pending. Use `N/A` only after evidence establishes that an attribute does
   not apply; it cannot mean unknown.
3. Review `product_category` and `item_kind` separately. A service can retain
   medical equipment revenue without becoming physical-product demand. A category
   decision alone cannot approve an identity or its quantity unit.
4. Establish the unit used for the historical **sales quantity**, then document
   the sellable package, its positive integer `pack_count` and `contained_unit`.
   A verified box of 50 pieces might use `unit_of_measure=Box`,
   `packaging_unit=Box`, `pack_count=50`, `contained_unit=Piece`. Verify this from
   the sales and packaging evidence. Order quantity, container volume and dosage
   strength do not establish pack count. Do not default to a count of 1, invent
   typical package sizes or convert historical quantities from guesses.
5. Record an identifiable evidence reference in `evidence_source`, the actual
   reviewer in `reviewed_by`, the actual review date in `reviewed_at`, and reasons
   or unresolved questions in `review_notes`. Mark only the separately supported
   decision statuses as `approved`. Existing proposals do not supply a reviewer
   decision. `mapping_status` alone grants no category, identity, unit or forecast
   approval.
6. Leave forecast eligibility false until identity, category, sales unit and
   forecasting suitability have each been approved. An eligible forecast also
   needs accepted observations and subsequent model evaluation/publication. A
   populated or reviewed master does not train a model.

For alias merging, every alias must share the same reviewed sellable identity,
packaging and metadata contract. The representative alias must itself be reviewed
under that SKU. Case/spacing cleanup and similar names cannot establish a match.
Different strength, form, brand, model or package remains separate unless evidence
proves an exact alias. Keep every sales record and its actual price; shared SKU
identity never deletes transactions. See [product review rules](PRODUCT_REVIEW_RULES.md).

For adjusted-source rows, catalog approval does not verify the recorded item or
quantity. Independent transaction verification belongs in
`transaction_evidence_review.csv`, with the exact source-record ID, source-file
SHA-256, scope `product_identity_and_quantity`, evidence, reviewer and date. It
retains the original adjusted provenance. Low-trust and backfill restrictions
remain; annual financial equality does not prove actual SKU-level quantities.

## Validate and prepare publication

The current master retains `RAW:<product_key>` identities, accepted known/Unclassified
reporting categories, no approved SKU/unit and no eligible forecasts. Dashboard
data still comes from its pinned warehouse release until this exact revision is
published and checked. Gold accepts at most 10,000 master rows and 8,000,000 bytes;
the saved master is 4,755,483 bytes. The bounded size increase accommodates recorded
category evidence; it does not relax identity or financial controls.

The [category-only publication contract](../databricks/medshield_project/references/catalog_publication.json)
binds fact19, all 137 immutable fields and 29 dependency versions. Its seven mutable
fields are only category/status/display/scope, category evidence, master checksum
and publication time. Three demand gates whose calculation normally uses scope
are explicitly retained from the predecessor. Gold03, packaging and gateway
validation use the same per-label receipt and fixed allowlist. The fresh read-only
capture verifies all 55 Silver fields against 37,728 unique source records.

No cloud execution or isolated recovery rehearsal was verified. Follow the
[operator deployment runbook](CATALOG_DEPLOYMENT.md). Any subsequent CSV edit
requires a fresh descriptor/package. New source ingestion requires a separately
reviewed source contract and category decisions for new aliases; this receipt
cannot accept unseen labels. Preserve earlier receipts unchanged.

For that prepared publication, upload the CSV as a file to:

```text
/Workspace/medshield/medshield_reference_csv/product_master_review.csv
```

Also upload `catalog_publication.py` beside Gold and the exact
`references/catalog_publication.json` and `references/category_acceptance.json`
under `/Workspace/medshield/medshield_project/references/`.
Keep the unchanged `product_catalog.py` Python workspace file at:

```text
/Workspace/medshield/medshield_project/product_catalog.py
```

The prepared catalog-only sequence is **03 Gold → 04 monthly bridge → 05 system
bridge → 06 STL**. Capture its actual new fact version and all dependent output
versions; do not assume a version number. Repeat publication, descriptive,
catalog and authenticated API/dashboard/export checks against that exact release.
Align the candidate preview app pin and matching STL after successful validation;
production activation requires the applicable version-bound business acceptance.
Existing financial-definition decisions remain in
[descriptive acceptance](DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md).

Publishing this accepted-category revision enables classified descriptive sales
reporting while leaving SKU/unit/forecast decisions pending. Reviewed product evidence
is the work that enables reliable product analytics. Predictive notebooks 07/08
and external DOH/PAGASA joins are separate preparation stages.
