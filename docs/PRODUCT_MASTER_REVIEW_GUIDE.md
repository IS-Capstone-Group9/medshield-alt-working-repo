# Review the MedShield product master

Prepared 7 October 2026. Status: local review preparation; no cloud deployment,
product approvals or forecast activation.

The master contains 4,561 draft rows, one per normalized product description in
the [current fact-version-19 label receipt](../outputs/product_master_population_20261007/current_labels.json).
Suggested categories retain their [version-17 research provenance](../outputs/product_category_review_20260927/README.md).
Literal descriptions and research links help review; they do not establish the
exact historical product, supplier SKU, packaging or sales unit. All identity,
unit and forecast decisions remain pending, with forecast eligibility false.
Rows are ordered by positive sales contribution. Start with the first 442 rows,
which cover 80% of positive sales; this is a review priority, not an approved
product classification or market-share result.

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
   references can support a category proposal; check that the evidence identifies
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

The current drafts remain `RAW:<product_key>` groups with unclassified displayed
categories, no approved SKU/unit and no eligible forecasts. Populating the local
CSV prepares review; the dashboard continues reading its pinned warehouse release.

Validate the complete schema, unique normalized aliases, supported statuses and
independent approval requirements with the existing catalog helper. Verify that
both local CSV copies have identical bytes. Gold accepts at most 10,000 master
rows and 5 MB; the current 4,561-row draft fits those bounds. Keep the helper and
source/financial conservation checks intact.
The saved draft is 4,746,906 bytes, leaving 253,094 bytes under Gold's 5,000,000-byte
limit. Recheck the saved file size after adding review evidence.

The final 7 October refresh uses `product_review_v3_context_literal_pricing`.
Nine food/cleaning net-mass clues and one specimen-cup marking inference are
corrected without changing research citations or decision statuses. The
[business analytics review](../outputs/business_analytics_review_20261007/REVIEW.md)
records the current checksum, independent review and archived financial/source
conservation. Earlier population receipts describe the earlier saved draft and
must remain unchanged.

Before uploading a new publication, prepare fresh preservation evidence against
captured **fact version 19**. The checked-in Gold03 migration,
`package_catalog.py`, `validate-catalog.ts` and historical
[deployment runbook](CATALOG_DEPLOYMENT.md) still describe baseline 16. Rebind the
complete package consistently, preserve every transaction/source field/financial
value/eligibility flag, and record fresh checksums and receipts. Do not blindly
run the old migration, weaken its assertions or rewrite earlier receipts. Capture
retained recovery evidence for the complete dependent publication.

For that prepared publication, upload the CSV as a file to:

```text
/Workspace/medshield/medshield_reference_csv/product_master_review.csv
```

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

Uploading the current draft would publish review metadata while leaving its
unapproved SKU/category/unit/forecast decisions pending. Reviewed product evidence
is the work that enables reliable product analytics. Predictive notebooks 07/08
and external DOH/PAGASA joins are separate preparation stages.
