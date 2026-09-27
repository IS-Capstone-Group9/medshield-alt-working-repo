# Product catalog and resolution contract

Implementation prepared 27 September 2026; no product approvals or Databricks writes.
The CEO remains the sole business approver. Existing financial and conditional
annual-reconciliation decisions in DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md stand.

## Independent dimensions

| Dimension | Contract |
|---|---|
| Display category | Medical, Non-Medical, Unclassified; only approved category values are displayed as classified. Medical retains medicine, medical_supply and medical_equipment subtypes. |
| Sellable identity | `canonical_sku`, canonical title, brand/manufacturer/model, literal strength/concentration/form/container, package, pack count, contained unit and bundle specification. Identity approval is separate from category. |
| Item kind | physical_product, service, unknown. Medical equipment repair may be a Medical service. Service revenue stays in financial totals; verified services have no physical demand quantity. |
| Transaction evidence | original_source_detail, adjusted_estimated_source, independently_verified_detail with source-record and source-file lineage. File-level adjusted provenance does not assert that each row was individually substituted. |

`databricks/medshield_project/references/product_master_review.csv` is the sole
authoritative preparation master. The copy in `databricks/medshield_reference_csv/medshield_reference_csv/`
is a deployment copy, checked byte-for-byte. Both are header-only. Review proposals
are not master entries. `mapping_status` remains a legacy administrative field and
cannot confer category, identity, unit or forecast approval.

The separate `transaction_evidence_review.csv` is keyed by existing source-record
ID and source-file SHA-256. A verification requires explicit identity-and-quantity
scope, evidence reference, reviewer and date. It cannot be inferred from catalog
approval. It is header-only. Independently verified detail retains the original
adjusted-source flag and records the new supporting lineage. No verification is
supplied or invented by this implementation.

## Resolution and validation

1. Exact normalized reviewed alias is the first matching route. Existing data has
   no populated verified source identifier. Case/spacing normalization is automatic.
2. Approved identity requires a stable SKU, title and stable representative alias,
   reviewed item kind, and explicit attributes (reviewed N/A where inapplicable).
   Physical products require reviewed sellable packaging, pack count and source unit.
3. SKU aliases must share the same identity, packaging and approved metadata contract.
   Duplicate mapping keys, conflicting SKU contracts, missing evidence, or duplicate
   transaction-verification keys fail before joining. Gold asserts one policy row
   per label and exactly one fact per original source record.
4. Formatting rules propose candidates only. Unknown attributes never match as
   wildcards. Preserve decimal points, concentrations, denominator volumes, brands,
   models, gauges, capacity, package counts and bundle contents. `#` alone is not a
   contract detector. CHRISTINE and other descriptors are retained.
5. Verified reporting ID is `SKU:<canonical_sku>`; otherwise it is
   `RAW:<existing product_key>`. Display names never create permanent SKU identities.
   Catalog alias grouping is not transaction deduplication.

Gold catalog policy is `catalog_v1_independent_evidence`; Gold transformation is
`sales_restart_gold_v7_independent_catalog`. Resolution happens after unchanged
Silver reconciliation. The catalog-only migration compares every source record,
financial value and financial eligibility flag with fact version 16 before writing.
The canonical reporting dimension preserves original aliases and raw product keys.

Approved medical demand additionally requires physical item kind, verified identity,
separately approved forecast eligibility and observed/independently verified detail.
Existing low-trust/backfill restrictions remain. The existing medical-supply scope
switch stays false; medical equipment is categorized but not enabled as medicine demand.

## API, quantities and exports

`/api/products`, `/api/sales/sectors`, and `/api/sales/heatmap` accept the case-sensitive
`category=All|Medical|Non-Medical|Unclassified` parameter. Repeated/structured values
are rejected. Metadata and amounts come from the same version-pinned Databricks fact.
Legacy version 16 reports raw stable keys, unknown identity and missing packaging;
it does not read local review files as a substitute.

Products apply category selection before positive-sales ABC/Pareto denominators and
Top-N afterwards. Signed returns remain separate and are included in net revenue.
Company financial totals include all valid categories and services. Unresolved
coverage/revenue and original aliases remain visible. The 442-label review cohort
is neither approved ABC nor verified medical market share.

Heatmap selects one stable product group and separately exposes original-source,
adjusted-source and independently verified quantities. Missing observations stay
null; recorded zero stays zero. No pack conversions are inferred. Unknown source
units are labeled as such, not interpreted as equivalent doses/packs. Sector
financial views do not add incompatible product quantities. Catalog fields,
provenance and pinned release metadata accompany product/heatmap exports.

Databricks reads are bounded pages with deterministic ordering and a complete-record
count check to avoid INLINE byte-limit truncation. A failed or incomplete query
returns unavailable, never local or demonstration data.

## JSON interchange

`product_catalog.interchange` emits `raw_title`, `canonical_title`, `category`,
`packaging_unit`, `canonical_group_id`, `is_duplicate`, and `notes`, plus richer
`internal` fields. The narrow package enum is Piece/Box/Pack/Unknown. For unresolved
rows canonical_title is display cleanup. `is_duplicate` means a reviewed alias
relative to an explicitly stable representative, independent of input order. Never
delete sales records using it. `catalog_interchange.py input.json new-proposals.csv` imports to a new, separate proposal CSV (never overwriting a master). `import_proposals` ignores supplied approval flags,
canonical IDs and duplicate flags and produces unapproved review rows.

## Evidence and remaining decisions

- [Complete local review](../outputs/product_catalog_implementation/2026-09-27T07-51-00-423Z/README.md): 37,728 records, 4,561 labels, 4,985 original titles, 50 formatting families, 442-label priority cohort.
- [Review queue](../outputs/product_catalog_implementation/2026-09-27T07-51-00-423Z/review.json): candidates, reasons, source-record IDs, positive/net/return amounts and proposed attributes.
- [Exact reconciliation](../outputs/product_catalog_implementation/2026-09-27T07-51-00-423Z/reconciliation.json): every source field and financial eligibility unchanged; monthly amounts and category partitions match.

All identities remain unresolved; eligible affected revenue is ₱626,946,741.81.
Obtain product documents and packaging evidence, review fetal/patient monitor
proposals, concentration differences, services, formatting families and high-value
labels. The old nonmedical reference remains a suggestion, not approval or proof
that “monitor” means IT equipment. Supply category, identity, unit, forecast and
transaction evidence separately. Future uploads remain unfinished: DR numbers alone
do not provide stable line-item identity.

See [operator deployment and rollback](CATALOG_DEPLOYMENT.md).


Read-only live verification: [version-16 API/catalog receipt](../outputs/catalog_validation/2026-09-27T08-19-08-947Z/evidence.json).
All 37,728 records and 4,561 stable raw groups reconcile through the API; 98 observed
months retain their amounts. This proves compatibility with the retained release,
not execution of the prepared v7 notebooks. Original/adjusted/verified quantity
strata and transaction lineage are retained in exports.
