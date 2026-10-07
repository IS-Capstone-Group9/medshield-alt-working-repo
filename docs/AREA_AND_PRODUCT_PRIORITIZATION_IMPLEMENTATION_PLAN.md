# Area and Product Prioritization Implementation Status

> **Status (2026-09-25):** Core UI/API prioritization features are implemented locally. The underlying Gold dataset, product master, buyer/geographic mappings, and model outputs remain candidate/reviewed evidence as described in [CURRENT_STATE.md](CURRENT_STATE.md).

## Implemented

- Databricks-backed product and area inputs.
- Geographic area ranking separated from buyer-sector/channel filters.
- Government, Private, Internal, and Unknown buyer clusters through controlled mapping rules.
- Regional rollups for CALABARZON, MIMAROPA, Bicol, Other National, and Unknown.
- Explicitly estimated Mindoro 63.2%/36.8% display split.
- Period, buyer, product, and evidence filters.
- Revenue Pareto/ABC candidates and commercial 60/40 MCDA sensitivity.
- Product-priority scenario controls and client-reference views.
- Playwright and Python tests for relevant ranking/mapping behavior.

## Data and governance limits

- Current values come from candidate Gold objects.
- Product medical/non-medical and canonical SKU decisions still need owner approval.
- Buyer ownership/geography is derived where the source did not record it.
- Disease, weather, lead-time, inventory, supplier, and clinical urgency inputs are excluded from the commercial score until validated.
- Scenario labels such as ABC-VEN or allocation do not authorize procurement.

## Remaining work

1. Complete Gold acceptance and stable publication.
2. Record named approval for client, territory, and product mappings.
3. Regenerate all fixed numerical evidence from the 37,728-row current candidate population.
4. Verify the complete authenticated E2E suite against the live Databricks contract.
5. Publish final Chapter 4 screenshots and Chapter 5 interpretation with dataset IDs and limitations.

## Acceptance evidence

- Area and product totals reconcile to the selected fact population.
- Filters recompute scores and charts from the same denominator.
- Actual, mapped, and estimated evidence are visibly distinct.
- Unknown rows remain visible rather than silently imputed.
- Failure of Databricks produces no local or mock ranking.
