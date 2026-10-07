# Version 19: next steps after descriptive processing

Prepared 7 October 2026. Accountable role: Database Engineer, with read-only application alignment review. This is a candidate-review handoff, not business acceptance or production activation.

## Verified checkpoint

- Gold fact: Delta version 19, dataset `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`, policy `sales_restart_gold_v7_independent_catalog`.
- Saved STL: source fact version 19; 72 observed monthly points, January 2020 through December 2025. Its `candidate_not_approved` status is expected.
- [Descriptive validation](../descriptive_validation/2026-10-07T05-51-38-676Z/evidence.json): PASS. Financial totals, missing-period handling, annual seasonality, matching input and component reconstruction checked using candidate pin 19 in an isolated validation shell.
- [Catalog validation](../catalog_validation/2026-10-07T06-01-01-569Z/evidence.json): PASS. Exact preservation versus reviewed fact 16, category partitions and gateway catalog/heatmap checks. 37,728 transactions, 4,561 unresolved product groups and eligible net sales ₱626,946,741.81.
- [Broader publication audit](../publication_readiness/2026-10-07T06-01-15-273Z/README.md): PASS, 72 PASS / 0 FAIL / 0 UNVERIFIED, with evidence SHA-256 `52a800a446517837ae07c2039cdf806517a5b101fe4e64333002c2819074a2e1`. The sequential retry passed. The [first attempt](../publication_readiness/2026-10-07T05-53-03-126Z/README.md) recorded 9 PASS, 0 FAIL and 6 UNVERIFIED due to connection failures and remains as execution history.
- Root `backend/.env` still sets `DATABRICKS_DESCRIPTIVE_FACT_VERSION=17`. No application configuration, services or cloud objects were changed by these checks. The validation shell's candidate pin does not update the application.

## Ordered handoff

1. Completed: version-19 publication, descriptive and catalog validation passed. Preserve the final receipts above. Authenticated browser verification and exact deployed notebook identity remain separate checks.
2. Align the local candidate preview with version 19 by setting `DATABRICKS_DESCRIPTIVE_FACT_VERSION=19` in the matching backend configuration. Inspect which checkout owns any running server, then restart that backend once or start it if stopped. The latest STL output now identifies 19, so the earlier pin 17 will not retrieve those components.
3. Check authenticated dashboard/API metadata, year/date filters, charts and downloads. All checked responses must identify 19 and the same dataset/v7 policy. Run the documented `frontend/e2e/descriptive-live.spec.ts` with expected version 19. This browser verification has not yet been performed for 19.
4. Review the descriptive reporting scope for version-bound business acceptance. Preserve recorded financial-definition approvals, observed historical gaps and estimated-source labels. Local candidate preview alignment is separate from production release approval.
5. Populate `databricks/medshield_project/references/product_master_review.csv` using supporting catalog/invoice/package evidence. Begin with high-selling source labels; record compatible SKU identity, strength/form, sellable package, unit and category separately. Leave unsupported attributes pending. Several approved aliases may map to one compatible SKU; different packages/strengths must remain distinct. Independently verify identity and quantity for adjusted records where approved medical-demand use requires it.
6. Prepare a new catalog publication against the explicitly verified retained baseline, preserving existing sales values and eligibility. Validate before activating that new release. Build classification plus monthly SKU-unit forecasting on the reviewed cohort; validate disease/weather joins separately before using DOH/PAGASA features.

## Predictive notebooks

`07_predictive_contracts.sql` creates forecast storage contracts. `08_predictive_frozen_input.py` requires a reviewed monthly JSON artifact in a Unity Catalog Volume and its checksum. Neither notebook trains or activates a model, and neither establishes product identity. Company-revenue forecasting uses a different target and unit contract from SKU quantity forecasting.

## Remaining limits

The product master is header-only. Source-label descriptive arithmetic can be reviewed, but these checks do not approve medical SKU identities, source completeness, disease/weather joins or procurement decisions. Exact cloud notebook bytes and operator run IDs have not been independently verified.
