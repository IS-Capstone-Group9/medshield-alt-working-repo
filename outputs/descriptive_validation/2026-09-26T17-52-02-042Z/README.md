# Descriptive candidate calculation evidence

Collected read-only from Databricks on 27 September 2026 (Asia/Manila).

- [Evidence JSON](evidence.json) and [SHA-256 receipt](evidence.sha256): dataset,
  policy, mapping identities, stable fact Delta version 15, gateway snapshot and
  independent summary reconciliation. This is not a final publication audit.
- Eligible net sales: **₱626,946,741.81**.
- Gross-profit eligible revenue denominator: **₱478,720,670.03**.
- Weighted gross margin on that eligible population: **60.262177%**.
- Ten calendar months have no recorded observations and remain null.
- Negative product totals hold full-population ABC classification; their values
  remain in the financial totals. Product labels are not verified medicine SKUs.
- [STL evidence](stl.json): 72 contiguous monthly observations, January 2020 to
  December 2025; trend + seasonal + residual reconstructs the input with maximum
  absolute error 1.4e-9 PHP. Earlier incomplete segments are disclosed and omitted,
  with no missing sales imputed. This file records the source evidence hash.

Generate a fresh receipt from `backend/` using
`node --import tsx scripts/validate-descriptive.ts`; regenerate STL with
`services/analytics_service/jobs/run_descriptive_stl.py` and the fresh receipt.
See [testing instructions](../../../docs/TESTING.md).

The dataset still uses Gold v5. This evidence does not clear the 2020/2024 source
provenance defect, approve mappings, publish STL to the dashboard, or represent
CEO approval of the final dataset. See the
[acceptance record](../../../docs/DESCRIPTIVE_PUBLICATION_ACCEPTANCE.md) and
[current state](../../../docs/CURRENT_STATE.md).
