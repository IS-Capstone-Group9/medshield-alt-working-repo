# Researched product category proposals

Fresh read-only Databricks extraction: fact version 17, retrieved 27 September 2026. The receipt covers 37,728 sales records, 4,561 normalized descriptions and 4,985 original title variants. Exact eligible net sales reconcile to PHP 626,946,741.81.

Open `MedShield researched product categories.xlsx`. The Products sheet has one row per normalized description, ordered by positive sales. It includes categories, subcategories, source URLs, evidence basis, limitations and specific conflicts. The Summary sheet calculates category totals and evidence coverage. The Sources sheet records published findings and limitations. Filter Evidence basis or Specific issues, then enter decisions and supporting documents in the yellow columns. Decisions do not automatically modify these suggestions, the CSV or production data.

`product_master_review.researched.proposed.csv` uses the project's complete product-master schema. Every description has a suggested category or an explicit unresolved classification. It passes `validate_master`. Category and item-kind statuses are proposed or needs_review. Identity, unit and forecast statuses remain needs_review; forecast eligibility is false. Reviewer and review-date fields are blank. There are no invented SKUs or approvals. Windows denied replacing the original CSV, so the researched files use new names. Originals and the `before_research` backup remain available.

Suggested labels map to existing codes: Medicines and vaccines = medicine; Medical supplies = medical_supply; Medical equipment = medical_equipment; Non-medical goods = non_medical; Unclassified = unclassified. Medical equipment services retain a separate service item kind. Non-medical detail groups in the workbook are explanatory, not new production enum values.

Research checked on 27 September 2026 supplements the original rules. There are 69 evidence entries across 65 distinct URLs. Sixty-eight entries match the sales descriptions, and 238 descriptions have references, including 14 that remain unresolved after comparison. Of all 4,561 descriptions, 178 have named-product or brand sources supporting a category, 46 have product-type guidance, 2,916 retain description-only suggestions and 1,421 remain unclassified. The 224 supported category proposals account for PHP 198,010,577.11, approximately 31.6% of eligible net sales. This is not individual documentary verification of every product.

Sources include FDA records, manufacturer catalogs and government hospital lists. Historical, indexed or overseas records support category evidence but do not establish current Philippine registration, authenticity or the exact historical sales presentation. Some direct pages returned 403 after indexed contents had been retrieved; access limitations are recorded where applicable. Same-name inference does not establish a common SKU. Food and dietary supplements are proposed under Non-Medical as a business-taxonomy choice, separate from FDA regulatory classes.

Research changed 96 category suggestions. Examples include Galaxy Tablet S7 from medicine to IT equipment, surgical skin staplers from office stationery to medical supplies, and separately documented Hyclens wound spray, cleanser and gargle categories. Bouffant caps and cotton are no longer treated as medicines merely because of CAP or weight wording. Evaprost strength/route differences and Hyclens concentration/packaging questions are flagged without changing source descriptions.

| Suggested category | Descriptions | Sales records | Net sales (PHP) |
|---|---:|---:|---:|
| Medicines and vaccines | 2,161 | 29,453 | 473,292,323.93 |
| Medical supplies | 631 | 2,618 | 58,493,264.32 |
| Medical equipment | 150 | 377 | 20,795,191.04 |
| Non-medical goods | 198 | 902 | 21,309,137.11 |
| Unclassified | 1,421 | 4,378 | 53,056,825.41 |
| Total | 4,561 | 37,728 | 626,946,741.81 |

Review against invoices, labels and supplier documents. Record the actual review decision and evidence before promoting entries into the authoritative master. The authoritative preparation master and deployment copy were left unchanged, preserving their version-17 receipts. No Databricks data, serving configuration, notebook, package, identity, financial value or approval was changed.

`proposals.json` retains source-record IDs and all original aliases for each master proposal. `summary.json` binds the source receipt hash and release. `refine_research.py` reads frozen before-research proposals and documented evidence inputs to reproduce the researched data. `build.mjs` imports the original workbook, preserves review fields and creates the researched workbook. `classify.py` is the preliminary classifier; running it alone recreates the earlier proposal pass.

Verified: unique normalized descriptions, all 37,728 unique source-record IDs, exact net sales, unchanged raw aliases/product keys/lineage/positive sales/returns/adjustment counts, full master schema, targeted corrections and absence of approvals or SKU assignments. Workbook category and research-coverage formulas reconcile, the formula-error scan found no errors, review fields were preserved and all three sheets were visually inspected.

Receipt SHA-256: `f523ade6e9c6f66e0fa7edc7f78c323b11e2722de248b0a0b92e1b1881ad9517`. Both authoritative and deployment master hashes remain `1361f7629d4dab4f1f6414db32a19e9eea9ab20acb99319d168aecc9fef48088`.
