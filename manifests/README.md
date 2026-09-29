# MedShield Source Manifests

These Markdown manifests describe the transformed and processed datasets that can be verified from the evidence currently available in this repository. They are designed as source documents for Gemini Notebook and as traceability evidence for Chapter 4 and REC review.

## Evidence boundary

- **Verified local sales evidence:** Databricks Gold candidate, Delta version 15, checked on 2026-09-26.
- **Verified local external-source evidence:** DOH and PAGASA cleaning report generated under `external_sources_clean_v1_20260914`.
- **Verified local weather-proxy artifact:** NASA POWER weather signals refreshed on 2026-09-02.
- **Not claimed as verified here:** a newer Delta version 16 state described in `docs/CURRENT_STATE.md`, because its cited 2026-09-27 receipts are not present in this checkout.
- **Publication status:** candidate only; business approval, product-master approval, and external mapping gates remain open.

The manifests contain aggregate facts, lineage, hashes, coverage, and limitations. They intentionally exclude raw transaction rows, client-level records, personal information, and credentials.

## Files

1. [00_MASTER_SOURCE_MANIFEST.md](00_MASTER_SOURCE_MANIFEST.md) — authoritative evidence inventory and precedence.
2. [01_SALES_PROCESSED_DATA_MANIFEST.md](01_SALES_PROCESSED_DATA_MANIFEST.md) — current verifiable Gold sales population, totals, yearly results, and table grains.
3. [02_EXTERNAL_PROCESSED_DATA_MANIFEST.md](02_EXTERNAL_PROCESSED_DATA_MANIFEST.md) — DOH, PAGASA, and NASA POWER coverage and cleaning results.
4. [03_TRANSFORMATION_AND_MAPPING_MANIFEST.md](03_TRANSFORMATION_AND_MAPPING_MANIFEST.md) — transformations, mappings, provenance, and reconciliation controls.
5. [04_ANALYTICAL_READINESS_MANIFEST.md](04_ANALYTICAL_READINESS_MANIFEST.md) — which descriptive, predictive, and prescriptive outputs are supported by current evidence.
6. [05_GEMINI_NOTEBOOK_SOURCE_GUIDE.md](05_GEMINI_NOTEBOOK_SOURCE_GUIDE.md) — recommended upload order and rules for drafting Chapter 4.
7. [06_ACTUAL_TRANSFORMED_AGGREGATES.md](06_ACTUAL_TRANSFORMED_AGGREGATES.md) — actual monthly, area, product, and seasonality aggregate records from the current verifiable receipt.

## Source precedence

When two files disagree, use this order:

1. Existing machine-generated receipt for the exact dataset ID and Delta version.
2. Cleaning report or artifact metadata with a checksum.
3. Current canonical documentation.
4. Older local exports and reports, which are historical only.

Do not merge counts from different dataset IDs, policy versions, Delta versions, or generation dates.

