# Nebulizer accessory proposal update

Requested 7 October 2026. The 14 nebulizer-kit labels identified by the category
audit now propose `medical_supply` with a respiratory-accessory explanation.
This user-directed classification does not establish exact kit contents or
historical product identity. Category status remains `proposed`.

Independent comparison against the saved before CSV verified exactly 14 changed
rows. Only `product_category` and `review_notes` changed. All other cells,
reviewer/date fields, SKU fields, sales-unit decisions and forecast fields are
unchanged. Both deployment and authoritative copies are byte-identical, contain
4,561 rows and 29 columns, and pass `validate_master`. Forecast eligibility remains
false and all approval dimensions remain pending.

Before SHA-256: `21ba704cb2fb3b39dab214f5e6ac7d3689b17967946889b3f838eb353f1f183c`.
After SHA-256: `52da8dad06920c2f11bf39ee026a796dce98aafe9eab686cf879375e09175b99`.
Saved size: 4,748,992 bytes, within Gold's 5,000,000-byte limit.

`receipt.json` records the affected labels, and `verification.json` records the
independent checks. The earlier publication descriptor is archived as
`catalog_publication.before.json`; previous dated packages must remain unchanged.
A fresh read-only predecessor capture and new package bind the changed bytes.
No uploaded Databricks CSV, table, application pin or approval was changed.

## Four medicine labels still needing review

| Sales label | Data gap |
|---|---|
| LOCAINE 50ML | Container volume is given, but concentration/strength and full presentation are absent. |
| LOCAINE 2% 50ML | The description is more specific, but historical SKU, package contents and the unit counted by sales quantities remain unverified. |
| EUROCAINE | The label lacks strength, dosage form, container size and packaging. |
| SANOXIN-1000 | The numeric suffix has no explicit unit; the link to the catalog's Sanoxin presentation and historical SKU requires confirmation. |

The current injectable catalog provides category-review leads. These gaps do
not establish a defect in the medicines; they limit product identity and quantity
analysis. Keep the medicine rows unchanged until the relevant details are supported.
