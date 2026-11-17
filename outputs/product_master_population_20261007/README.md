# Product master draft population — 7 October 2026

Completed local preparation for the user's request to populate the product master.
Primary responsibility: Data Analyst; supporting catalog and documentation review.
No cloud writes, product approvals, SKU assignments or forecast activation.

- Both canonical CSV copies contain 4,561 rows with the exact 29-column schema.
- SHA-256: `507fe990defc28f41c13eba4526463bbc960783dd5ad82ef209bb5babf509775`.
- Bytes: 4,710,026; Gold maximum is 5,000,000 bytes and 10,000 rows.
- Fresh read-only fact-version-19 extraction covers 37,728 records. Every label's
  record/adjusted-record counts, eligible net/positive sales, returns, variant
  count, product key and sampled source ID match the retained research proposals.
- Historical category research retains its original version-17 provenance. The
  current version-19 extract verifies label aggregates and sampled IDs; it is not
  a new full source-record export or current product-registration verification.
- Literal proposal coverage: 1,316 strength, 666 concentration, 516 container-size,
  155 packaging-unit, 52 pack-count, 5 contained-unit and 4 bundle clues.
- No category, identity, item-kind, unit or forecast decision is approved. All
  forecast eligibility is false. Unknown physical attributes and reviewer fields
  remain unresolved. The first 442 rows cover 80% of positive sales contribution.

Verification:

- `validation_receipt.json`: saved values, schema, unique/current alias coverage,
  both-copy equality, bounds and conservative resolution all pass.
- Full-row offline simulation uses checksum-verified archived version-17 facts.
  Every existing field except the deliberately populated category proposal status
  remains unchanged; monthly/yearly financial partitions are exactly equal.
- Existing notebook/catalog suite: 60 tests passed in 16.676 seconds.
- `render_readme.py --check`: README matches every notebook cell.
- Independent audit: 26 checks passed, no actionable findings.
- Git whitespace check passed with CR-at-EOL allowed for RFC4180 CSV records.

The header-only originals remain under `before/`. CSVs were authored through
`@oai/artifact-tool`; its verified literal range values were serialized as CSV
because the public API has no CSV-export entry. The application continues to read
its warehouse pin. A new local CSV checksum does not rewrite or approve the
existing fact-19 publication. Preparing a subsequent publication requires current
baseline conservation checks and new dependent receipts, as described in
`docs/PRODUCT_MASTER_REVIEW_GUIDE.md`.
